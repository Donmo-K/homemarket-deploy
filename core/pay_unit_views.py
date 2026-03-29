import requests
import base64
import json

from django.shortcuts import redirect, render, get_object_or_404
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages

from properties.models import Property
from core.models import Payment, Transaction, Conversation, Message
from global_data.enum import TransactionStatus
from django.conf import settings




# ===============================
# 💳 CRÉER PAIEMENT PAYUNIT
# ===============================  # ✅ AJOUT

class CreatePayunitPaymentView(LoginRequiredMixin, View):
    login_url = '/users/login/'

    def get(self, request, property_id, payment_type):
        property_obj = get_object_or_404(Property, id=property_id, status='APPROVED')
        user = request.user

        # Empêcher le propriétaire de payer son propre bien
        if property_obj.owner == user:
            messages.error(request, "Vous ne pouvez pas payer pour votre propre bien.")
            return redirect('core:property_detail', pk=property_id)

        # 🔹 Créer la transaction
        transaction = Transaction.objects.create(
            buyer=user,
            listing=property_obj.listings.filter(status='ACTIVE').first(),
            amount=property_obj.price,
            status=TransactionStatus.PENDING,
        )

        # 🔹 Créer le paiement
        payment = Payment.objects.create(
            transaction=transaction,
            property=property_obj,
            method="MOBILE_MONEY",
            payment_type=payment_type,
            amount=property_obj.price,
            reference=f"PAY-{transaction.id}",
        )

                    # 🔹 Headers PayUnit corrigés
        import base64

        PAYUNIT_USERNAME = "votre_username_payunit"  # ← à remplir
        PAYUNIT_PASSWORD = "votre_password_payunit"  # ← à remplir

        token = base64.b64encode(
            f"{PAYUNIT_USERNAME}:{PAYUNIT_PASSWORD}".encode()
        ).decode()

        headers = {
            "Authorization": f"Basic {token}",
            "x-api-key": settings.PAYUNIT_API_KEY,
            "Content-Type": "application/json",
            "mode": "test",
        }

            # 🔹 Data PayUnit (CORRIGÉ)
        data = {
        "client_name": f"{user.first_name} {user.last_name}",
        "client_email": user.email,
        "client_phone_number": getattr(user, 'phone_number', None) or "237677000000",
        "currency": "XAF",
        
        "total_amount": float(property_obj.price),  # ✅ ICI
        
        "items": [{
            "name": property_obj.title,
            "amount": float(property_obj.price),
            "quantity": 1,
        }],

        "callback_url": request.build_absolute_uri(
            f"/payment/return/?ref={payment.reference}&type={payment_type}&prop={property_id}"
        ),
        "notify_url": request.build_absolute_uri("/payment/webhook/"),
    }

        # 🔹 Requête PayUnit (CORRIGÉ)
        response = requests.post(
            f"{settings.PAYUNIT_BASE_URL}/api/gateway/invoice/create",
            json=data,
            headers=headers,
        )

        print("Status code:", response.status_code)
        print("Response text:", response.text)

        try:
            res = response.json()
        except Exception as e:
            print("Erreur JSON:", e)
            messages.error(request, "Erreur de connexion au service de paiement.")
            return redirect('core:property_detail', pk=property_id)

        if "data" in res:
            payment.payunit_transaction_id = res["data"].get("transaction_id", "")
            payment.payment_url = res["data"].get("payment_url", "")
            payment.save()

            return redirect(payment.payment_url)

        messages.error(request, f"Erreur PayUnit : {res.get('message', 'Inconnue')}")
        return redirect('core:property_detail', pk=property_id)


# ===============================
# 🔙 RETOUR APRÈS PAIEMENT
# ===============================
class PaymentReturnView(LoginRequiredMixin, View):
    login_url = '/users/login/'

    def get(self, request):
        ref          = request.GET.get('ref')
        payment_type = request.GET.get('type')
        property_id  = request.GET.get('prop')

        try:
            payment = Payment.objects.select_related(
                'transaction', 'transaction__buyer'
            ).get(reference=ref, transaction__buyer=request.user)
        except Payment.DoesNotExist:
            messages.error(request, "Paiement introuvable.")
            return redirect('core:home')

        property_obj = get_object_or_404(Property, id=property_id)

        return render(request, 'home/payment_return.html', {
            'payment': payment,
            'property': property_obj,
            'payment_type': payment_type,
        })


# ===============================
# 🔔 WEBHOOK PAYUNIT
# ===============================
@method_decorator(csrf_exempt, name='dispatch')
class PaymentWebhookView(View):

    def post(self, request):
        try:
            data           = json.loads(request.body)
            transaction_id = data.get("transaction_id")
            status         = data.get("status")
    
            payment = Payment.objects.select_related(
                'transaction', 'transaction__buyer', 'property'
            ).get(payunit_transaction_id=transaction_id)
    
            if status == "SUCCESS":
                payment.status = "SUCCESS"
                payment.transaction.status = TransactionStatus.COMPLETED
                payment.transaction.save()
    
                buyer = payment.transaction.buyer
                prop  = payment.property
    
                if prop:
                    conv = self._get_or_create_conversation(buyer, prop.owner)
    
                    if payment.payment_type == "RENT":
                        contact = getattr(prop.owner, 'phone_number', 'Non renseigné')
                        Message.objects.create(
                            conversation=conv,
                            sender=prop.owner,
                            content=(
                                f"Bonjour {buyer.first_name} ! Suite à votre paiement pour "
                                f"« {prop.title} », voici mon contact : {contact}."
                            ),
                        )
    
                    elif payment.payment_type == "BUY":
                        Message.objects.create(
                            conversation=conv,
                            sender=prop.owner,
                            content=(
                                f"Bonjour {buyer.first_name} ! Votre demande d'achat pour "
                                f"« {prop.title} » est bien reçue. Nous allons planifier une visite."
                            ),
                        )
    
                    # ✅ GÉNÉRER LE CONTRAT AUTOMATIQUEMENT
                    from core.models import Contract
                    commission = int(payment.amount * 0.05)
    
                    contract = Contract.objects.create(
                        contract_type = payment.payment_type,
                        buyer         = buyer,
                        seller        = prop.owner,
                        property      = prop,
                        transaction   = payment.transaction,
                        amount        = payment.amount,
                        commission    = commission,
                        status        = "ACTIVE",
                    )
    
                    # Notifier les deux parties
                    from core.models import Notification
                    Notification.objects.create(
                        recipient = buyer,
                        title     = "Contrat disponible",
                        message   = f"Votre contrat N° {contract.contract_number} est disponible. Téléchargez-le depuis votre dashboard.",
                    )
                    Notification.objects.create(
                        recipient = prop.owner,
                        title     = "Nouveau contrat signé",
                        message   = f"Un contrat N° {contract.contract_number} a été établi pour votre bien « {prop.title} ».",
                    )
    
            else:
                payment.status = "FAILED"
                payment.transaction.status = TransactionStatus.FAILED
                payment.transaction.save()
    
            payment.save()
    
        except Payment.DoesNotExist:
            pass
        except Exception as e:
            print(f"Webhook error: {e}")
    
        return JsonResponse({"status": "ok"})

