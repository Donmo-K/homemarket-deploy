from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Property, Listing
from global_data.enum import ListingStatus

@receiver(post_save, sender=Property)
def create_listing_on_approval(sender, instance, **kwargs):
    if instance.status == 'APPROVED':
        Listing.objects.get_or_create(
            property=instance,
            defaults={
                'agent': instance.owner,
                'price': instance.price,
                'status': ListingStatus.ACTIVE,
            }
        )