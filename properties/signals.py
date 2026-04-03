from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Property, Listing
from core.models import Notification

@receiver(post_save, sender=Property)
def notify_seller_on_property_status(sender, instance, created, **kwargs):
    if not created:
        if instance.status == 'APPROVED':
            # ✅ Crée le Listing si pas encore existant
            if not instance.listings.exists():
                Listing.objects.create(
                    property=instance,
                    price=instance.price,
                    status='ACTIVE',
                )
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