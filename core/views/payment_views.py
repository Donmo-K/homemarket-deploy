import json
import logging
import uuid
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404, redirect, render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.urls import reverse

from properties.models import Property
from core.models import Payment, Transaction, Conversation, Message, Contract, Notification
from core.services.payunit_service import PayUnitService
from global_data.enum import TransactionStatus, PaymentMethod

logger = logging.getLogger(__name__)


@login_required
def initiate_payment(request, property_id, payment_type):
    property_obj = get_object_or_404(Property, id=property_id)
    amount = int(property_obj.price if payment_type == "BUY" else 5000)

    # ✅ Toujours créer un nouveau paiement avec un ID unique
    listing = property_obj.listings.filter(status="ACTIVE").first()

    transaction_obj = Transaction.objects.create(
        buyer=request.user,
        listing=listing,
        amount=amount,
        status=TransactionStatus.PENDING,
    )

    payment_obj = Payment.objects.create(
        transaction=transaction_obj,
        property=property_obj,
        method=PaymentMethod.MOBILE_MONEY,
        payment_type=payment_type,
        amount=amount,
        reference=f"PAY-{uuid.uuid4().hex[:8].upper()}",
        status="PENDING",
    )

    base_url = request.build_absolute_uri("/").rstrip("/")
    if not base_url.startswith("https://") and "localhost" not in base_url:
        base_url = base_url.replace("http://", "https://")

    return_url = f"{base_url}{reverse('core:payment_return')}?ref={payment_obj.reference}"
    notify_url = f"{base_url}{reverse('core:payment_webhook')}"

    res = PayUnitService.initialize_payment(
        amount=amount,
        transaction_id=payment_obj.reference,
        return_url=return_url,
        notify_url=notify_url,
        description=f"{'Achat' if payment_type == 'BUY' else 'Location'} - {property_obj.title}"
    )

    if res.get("status") == "SUCCESS" and "data" in res:
        data = res["data"]
        payment_url = data.get("transaction_url") or data.get("link") or data.get("t_url")
        payunit_tid = data.get("transaction_id") or data.get("t_id") or data.get("id")

        if payment_url:
            with db_transaction.atomic():
                payment_obj.payment_url = payment_url
                payment_obj.payunit_transaction_id = payunit_tid
                payment_obj.save()
            return redirect(payment_url)

    error_msg = res.get("message", "Erreur lors de l'initialisation du paiement.")
    logger.error(f"PayUnit init failure for {payment_obj.reference}: {error_msg}")
    messages.error(request, f"Paiement indisponible : {error_msg}")
    return redirect("core:property_detail", pk=property_id)


@login_required
def payment_return(request):
    reference = request.GET.get('ref')
    payment = get_object_or_404(Payment, reference=reference, transaction__buyer=request.user)

    verification = PayUnitService.verify_payment(payment.reference)
    if verification:
        api_status = verification.get("transaction_status") or verification.get("status")
        if api_status and api_status.upper() in ["SUCCESS", "SUCCESSFUL"]:
            if payment.status != "SUCCESS":
                process_successful_payment(payment)

    return render(request, "home/payment_status.html", {
        "payment": payment,
        "property": payment.property,
        "payment_type": payment.payment_type
    })


@csrf_exempt
def payment_webhook(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        logger.info(f"PayUnit Webhook received body: {request.body[:500]}")
        data = json.loads(request.body)
        logger.info(f"PayUnit Webhook parsed data: {data}")

        transaction_id = data.get("transaction_id") or data.get("t_id") or data.get("reference")

        if not transaction_id:
            logger.error("PayUnit Webhook: Missing transaction_id")
            return JsonResponse({"error": "Missing transaction_id"}, status=400)

        actual_status = data.get("status") or data.get("transaction_status")

        verification = PayUnitService.verify_payment(transaction_id)
        if verification:
            actual_status = verification.get("transaction_status") or verification.get("status") or actual_status

        logger.info(f"PayUnit Webhook: transaction={transaction_id}, status={actual_status}")

        try:
            payment = Payment.objects.select_related(
                'transaction', 'transaction__buyer', 'property', 'property__owner'
            ).get(reference=transaction_id)

            if actual_status and actual_status.upper() in ["SUCCESS", "SUCCESSFUL"]:
                if payment.status != "SUCCESS":
                    process_successful_payment(payment)
            else:
                payment.status = "FAILED"
                payment.transaction.status = TransactionStatus.FAILED
                payment.save()
                payment.transaction.save()

            return JsonResponse({"status": "ok"})

        except Payment.DoesNotExist:
            logger.error(f"PayUnit Webhook: Payment not found for {transaction_id}")
            return JsonResponse({"error": "Payment not found"}, status=404)

    except Exception as e:
        logger.exception(f"PayUnit Webhook error: {str(e)}")
        return JsonResponse({"error": "Internal error"}, status=500)


def process_successful_payment(payment):
    with db_transaction.atomic():
        payment.status = "SUCCESS"
        payment.transaction.status = TransactionStatus.COMPLETED
        payment.save()
        payment.transaction.save()

        buyer = payment.transaction.buyer
        prop = payment.property
        seller = prop.owner

        conv = Conversation.objects.filter(participants=buyer).filter(participants=seller).first()
        if not conv:
            conv = Conversation.objects.create()
            conv.participants.add(buyer, seller)

        if payment.payment_type == "RENT":
            contact = getattr(seller, 'phone_number', 'indisponible')
            content = (f"Bonjour {buyer.first_name}! Votre paiement pour « {prop.title} » est confirmé. "
                       f"Voici mon contact pour la suite : {contact}.")
        else:
            content = (f"Félicitations {buyer.first_name}! Votre demande d'achat pour « {prop.title} » "
                       f"a été validée avec succès. Nous allons planifier une visite finale.")

        Message.objects.create(conversation=conv, sender=seller, content=content)

        commission = int(payment.amount * 0.05)
        contract = Contract.objects.create(
            contract_type=payment.payment_type,
            buyer=buyer,
            seller=seller,
            property=prop,
            transaction=payment.transaction,
            amount=payment.amount,
            commission=commission,
            status="ACTIVE"
        )

        Notification.objects.create(
            recipient=buyer,
            title="Paiement Confirmé ✅",
            message=f"Votre contrat N° {contract.contract_number} est prêt dans votre dashboard."
        )
        Notification.objects.create(
            recipient=seller,
            title="Nouveau Contrat 📄",
            message=f"Un nouveau contrat a été généré pour « {prop.title} »."
        )