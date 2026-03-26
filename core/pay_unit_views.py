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

# 🔑 Clés PayUnit — remplacez par les vôtres
PAYUNIT_API_USER     = "TON_API_USER"
PAYUNIT_API_PASSWORD = "TON_API_PASSWORD"
PAYUNIT_API_KEY      = "TON_API_KEY"


# ===============================
# 💳 CRÉER PAIEMENT PAYUNIT
# ===============================
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

        # 🔹 Config PayUnit
        token = base64.b64encode(
            f"{PAYUNIT_API_USER}:{PAYUNIT_API_PASSWORD}".encode()
        ).decode()

        headers = {
            "Authorization": f"Basic {token}",
            "x-api-key": PAYUNIT_API_KEY,
            "Content-Type": "application/json",
            "mode": "test",
        }

        data = {
            "client_name": f"{user.first_name} {user.last_name}",
            "client_email": user.email,
            "client_phone_number": getattr(user, 'phone_number', None) or "677000000",
            "currency": "XAF",
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

        response = requests.post(
            "https://gateway.payunit.net/api/gateway/invoice/create",
            json=data,
            headers=headers,
        )
        res = response.json()

        if "data" in res:
            payment.payunit_transaction_id = res["data"].get("transaction_id", "")
            payment.payment_url = res["data"].get("payment_url", "")
            payment.save()
            return redirect(payment.payment_url)

        # Échec API — on annule
        transaction.delete()
        payment.delete()
        messages.error(request, "Erreur lors du paiement. Veuillez réessayer.")
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

                buyer    = payment.transaction.buyer
                prop     = payment.property

                if prop:
                    # Récupérer ou créer la conversation entre acheteur et vendeur
                    conv = self._get_or_create_conversation(buyer, prop.owner)

                    if payment.payment_type == "RENT":
                        # ✅ LOCATION : envoyer le contact du propriétaire
                        contact = getattr(prop.owner, 'phone_number', 'Non renseigné')
                        Message.objects.create(
                            conversation=conv,
                            sender=prop.owner,
                            content=(
                                f"Bonjour {buyer.first_name} ! Suite à votre paiement pour "
                                f"« {prop.title} », voici mon contact : {contact}. "
                                f"Je reste disponible pour tout renseignement."
                            ),
                        )

                    elif payment.payment_type == "BUY":
                        # ✅ ACHAT : ouvrir la conversation pour planifier la visite
                        Message.objects.create(
                            conversation=conv,
                            sender=prop.owner,
                            content=(
                                f"Bonjour {buyer.first_name} ! Votre demande d'achat pour "
                                f"« {prop.title} » est bien reçue. "
                                f"Nous allons planifier une visite ensemble."
                            ),
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

    def _get_or_create_conversation(self, user1, user2):
        """Récupère ou crée une conversation entre deux utilisateurs."""
        convs = Conversation.objects.filter(
            participants=user1
        ).filter(participants=user2)

        if convs.exists():
            return convs.first()

        conv = Conversation.objects.create()
        conv.participants.add(user1, user2)
        return conv