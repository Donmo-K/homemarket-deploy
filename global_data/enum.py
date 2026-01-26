from django.db import models
from django.utils.translation import gettext_lazy as _

class UserType(models.TextChoices):
    BUYER = 'BUYER', _('Buyer')
    SELLER = 'SELLER', _('Seller')
    ADMIN = 'ADMIN', _('Administrator')

class ListingStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', _('Active')
    SOLD = 'SOLD', _('Sold')
    PENDING = 'PENDING', _('Pending')
    INACTIVE = 'INACTIVE', _('Inactive')

class PropertyType(models.TextChoices):
    APARTMENT = 'APARTMENT', _('Apartment')
    HOUSE = 'HOUSE', _('House')
    COMMERCIAL = 'COMMERCIAL', _('Commercial')
    LAND = 'LAND', _('Land')

class PaymentMethod(models.TextChoices):
    CASH = 'CASH', _('Cash')
    CARD = 'CARD', _('Card')
    TRANSFER = 'TRANSFER', _('Transfer')
    MOBILE_MONEY = 'MOBILE_MONEY', _('Mobile Money')

class TransactionStatus(models.TextChoices):
    PENDING = 'PENDING', _('Pending')
    COMPLETED = 'COMPLETED', _('Completed')
    FAILED = 'FAILED', _('Failed')
    CANCELLED = 'CANCELLED', _('Cancelled')
