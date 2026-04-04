import uuid
from django.db import models
from django_extensions.db.models import TimeStampedModel, ActivatorModel
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from global_data.enum import PaymentMethod, TransactionStatus


class HomeMarketBase(TimeStampedModel, ActivatorModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True

# Communication
class Conversation(HomeMarketBase):
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='conversations')
    
    def __str__(self):
        return f"Conversation {self.id}"

class Message(HomeMarketBase):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"Message from {self.sender} in {self.conversation}"

# Interaction
class Favorite(HomeMarketBase):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favorites')
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE, related_name='favorited_by')
    
    class Meta:
        unique_together = ('user', 'property')

    def __str__(self):
        return f"{self.user} -> {self.property}"

class Review(HomeMarketBase):
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews_given')
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE, related_name='reviews', null=True, blank=True)
    rating = models.PositiveIntegerField(help_text="1-5 rating")
    comment = models.TextField()
    
    def __str__(self):
        return f"Review by {self.reviewer} ({self.rating}/5)"

class Rating(HomeMarketBase):
    """Optional separate rating model if needed, otherwise Review covers it."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ratings_given')
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE, related_name='ratings')
    score = models.PositiveIntegerField()

# Transactions
class Transaction(HomeMarketBase):
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='purchases')
    listing = models.ForeignKey('properties.Listing', on_delete=models.PROTECT, related_name='transactions', null=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=TransactionStatus.choices, default=TransactionStatus.PENDING)
    
    def __str__(self):
        return f"Transaction {self.id} - {self.status}"
class Payment(HomeMarketBase):

    PAYMENT_TYPE = (
        ("RENT", "Location"),
        ("BUY", "Achat"),
    )

    STATUS = (
        ("PENDING", "En attente"),
        ("SUCCESS", "Réussi"),
        ("CONFIRMED", "Confirmé"),
        ("FAILED", "Échoué"),
    )

    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.CASCADE,
        related_name='payments'
    )

    property = models.ForeignKey(
        "properties.Property",
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices
    )

    # ✅ AJOUT DU DEFAULT (IMPORTANT)
    payment_type = models.CharField(
        max_length=10,
        choices=PAYMENT_TYPE,
        default="RENT"
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    reference = models.CharField(
        max_length=100,
        unique=True
    )

    # ✅ corrigé (pas de conflit)
    payunit_transaction_id = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS,
        default="PENDING"
    )

    payment_url = models.URLField(
        max_length=500,
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.reference} - {self.status}"

class Offer(HomeMarketBase):
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='offers')
    listing = models.ForeignKey('properties.Listing', on_delete=models.CASCADE, related_name='offers')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    message = models.TextField(blank=True)
    accepted = models.BooleanField(default=False)
    rejected = models.BooleanField(default=False)
    
    def __str__(self):
        return f"Offer {self.amount} by {self.buyer}"

class Visit(HomeMarketBase):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='visits')
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE, related_name='visits')
    date = models.DateTimeField()
    confirmed = models.BooleanField(default=False)
    
    def __str__(self):
        return f"Visit to {self.property} by {self.user} on {self.date}"

# Safety
class Notification(HomeMarketBase):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    
    def __str__(self):
        return f"Notification for {self.recipient}: {self.title}"

class Report(HomeMarketBase):
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reports_filed')
    reported_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    reported_property = models.ForeignKey('properties.Property', on_delete=models.CASCADE, null=True, blank=True)
    reason = models.TextField()
    
    def __str__(self):
        return f"Report by {self.reporter}"
    
# ================================================================
# model du contrat de vente/location, lié à une transaction et un listing, avec les montants et les parties impliquées
# ================================================================

class Contract(HomeMarketBase):

    CONTRACT_TYPE = (
        ("RENT", "Contrat de Location"),
        ("BUY",  "Contrat de Vente"),
    )

    STATUS = (
        ("DRAFT",    "Brouillon"),
        ("ACTIVE",   "Actif"),
        ("EXPIRED",  "Expiré"),
        ("CANCELLED","Annulé"),
    )

    # Numéro unique lisible
    contract_number = models.CharField(max_length=30, unique=True, blank=True)

    contract_type = models.CharField(max_length=10, choices=CONTRACT_TYPE)

    # Parties
    buyer  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='contracts_as_buyer')
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='contracts_as_seller')

    # Bien et transaction
    property    = models.ForeignKey('properties.Property', on_delete=models.PROTECT, related_name='contracts')
    transaction = models.OneToOneField(Transaction, on_delete=models.PROTECT, related_name='contract', null=True, blank=True)

    # Montants
    amount     = models.DecimalField(max_digits=12, decimal_places=2)
    commission = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    status = models.CharField(max_length=20, choices=STATUS, default="ACTIVE")

    # Dates
    signed_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.contract_number:
            import datetime
            prefix = "LOC" if self.contract_type == "RENT" else "VTE"
            self.contract_number = f"HM-{prefix}-{datetime.datetime.now().strftime('%Y%m%d')}-{str(self.id)[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Contrat {self.contract_number} — {self.get_contract_type_display()}"

    class Meta:
        ordering = ['-created']    
