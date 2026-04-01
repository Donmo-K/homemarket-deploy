from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Property
from core.models import Notification

@receiver(post_save, sender=Property)
def notify_seller_on_property_status(sender, instance, created, **kwargs):
    if not created:  # seulement lors d'une mise à jour
        if instance.status == 'APPROVED':
            Notification.objects.create(
                recipient=instance.owner,
                title="Bien approuvé ✅",
                message=f"Votre bien « {instance.title} » a été approuvé par l'administrateur et est maintenant visible sur Home Market."
            )
        elif instance.status == 'REJECTED':
            Notification.objects.create(
                recipient=instance.owner,
                title="Bien refusé ❌",
                message=f"Votre bien « {instance.title} » a été refusé par l'administrateur. Veuillez le modifier et le soumettre à nouveau."
            )