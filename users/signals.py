from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from .models import SellerVerification
from core.models import Notification

@receiver(post_save, sender=SellerVerification)
def notify_seller_on_verification(sender, instance, created, **kwargs):
    if not created:
        if instance.status == 'APPROVED' and instance.is_verified:
            # ✅ Notification en base
            Notification.objects.get_or_create(
                recipient=instance.user,
                title="Compte vérifié ✅",
                defaults={
                    'message': "Félicitations ! Votre compte vendeur a été approuvé. Vous pouvez maintenant publier vos biens sur Home Market."
                }
            )
            # ✅ Email
            send_mail(
                subject="✅ Compte vendeur approuvé — Home Market",
                message=f"""
Bonjour {instance.user.get_full_name() or instance.user.email},

Félicitations ! Votre compte vendeur sur Home Market a été approuvé par notre équipe.

Vous pouvez dès maintenant publier vos biens immobiliers et les rendre visibles à des milliers d'acheteurs.

Connectez-vous ici : http://127.0.0.1:8000/users/login/

Cordialement,
L'équipe Home Market
📍 Banengo, Bafoussam — Cameroun
📞 +237 654 25 29 90
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[instance.user.email],
                fail_silently=False,
            )

        elif instance.status == 'REJECTED':
            # ✅ Notification en base
            Notification.objects.create(
                recipient=instance.user,
                title="Vérification refusée ❌",
                message="Votre demande de vérification a été refusée. Veuillez soumettre à nouveau vos documents."
            )
            # ✅ Email
            send_mail(
                subject="❌ Vérification refusée — Home Market",
                message=f"""
Bonjour {instance.user.get_full_name() or instance.user.email},

Nous avons examiné vos documents et malheureusement votre demande de vérification a été refusée.

Raisons possibles :
- Documents illisibles ou expirés
- Informations non conformes

Veuillez soumettre à nouveau vos documents ici :
http://127.0.0.1:8000/users/seller/kyc/

Pour toute question, contactez-nous :
📞 +237 654 25 29 90
📧 homemarket952@gmail.com

Cordialement,
L'équipe Home Market
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[instance.user.email],
                fail_silently=False,
            )