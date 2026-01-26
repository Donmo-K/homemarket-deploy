from django.contrib.auth.models import AbstractUser
from django.db import models
from core.models import HomeMarketBase
from global_data.enum import UserType
from django.utils.translation import gettext_lazy as _

class User(AbstractUser, HomeMarketBase):
    user_type = models.CharField(max_length=10, choices=UserType.choices, default=UserType.BUYER)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return self.username

class Profile(HomeMarketBase):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    
    def __str__(self):
        return f"Profile of {self.user.username}"

class Buyer(User):
    class Meta:
        proxy = True
        verbose_name = _('Buyer')
        verbose_name_plural = _('Buyers')

class Seller(User):
    class Meta:
        proxy = True
        verbose_name = _('Seller')
        verbose_name_plural = _('Sellers')

class Administrator(User):
    class Meta:
        proxy = True
        verbose_name = _('Administrator')
        verbose_name_plural = _('Administrators')
