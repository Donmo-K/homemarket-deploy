from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from core.models import HomeMarketBase
from global_data.enum import UserType
from django.utils.translation import gettext_lazy as _

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('user_type', UserType.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser, HomeMarketBase):

    username = None  # 🔥 On supprime complètement username

    email = models.EmailField(_('email address'), unique=True)
    user_type = models.CharField(max_length=10, choices=UserType.choices, default=UserType.BUYER)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email

class Profile(HomeMarketBase):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    
    def __str__(self):
        return f"Profile of {self.user}"
class SellerVerification(models.Model):

    STATUS_CHOICES = (
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    id_card_front = models.ImageField(upload_to="verification/")
    id_card_back = models.ImageField(upload_to="verification/")
    business_license = models.ImageField(upload_to="verification/", blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING"
    )

    created_at = models.DateTimeField(auto_now_add=True)


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
