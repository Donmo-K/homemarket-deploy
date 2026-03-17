import uuid
from django.db import models
from django_extensions.db.models import TimeStampedModel, ActivatorModel
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from global_data.enum import PaymentMethod, TransactionStatus


from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse
from django.views import View
from django.utils import timezone
from core.models import Conversation, Message
import json

class HomeMarketBase(TimeStampedModel, ActivatorModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True

# Communication
class Conversation(HomeMarketBase):
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='conversations')
    
    def __str__(self):
        return f"Conversation {self.id}"

class MessageView(LoginRequiredMixin, TemplateView):
    template_name = 'home/message.html'
    login_url = '/users/login/'
 
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
 
        # Toutes les conversations de l'utilisateur
        conversations = Conversation.objects.filter(
            participants=user
        ).prefetch_related('participants', 'messages').order_by('-modified')
 
        # Enrichir chaque conversation
        conv_list = []
        for conv in conversations:
            other = conv.participants.exclude(id=user.id).first()
            last_msg = conv.messages.order_by('-created').first()
            unread = conv.messages.filter(is_read=False).exclude(sender=user).count()
            conv.other_participant = other
            conv.last_message = last_msg.content if last_msg else ''
            conv.last_message_time = last_msg.created if last_msg else conv.created
            conv.unread_count = unread
            conv_list.append(conv)
 
        context['conversations'] = conv_list
 
        # Conversation active (depuis ?conv=<id>)
        conv_id = self.request.GET.get('conv')
        active_conv = None
        if conv_id:
            try:
                active_conv = Conversation.objects.get(id=conv_id, participants=user)
                active_conv.other_participant = active_conv.participants.exclude(id=user.id).first()
            except Conversation.DoesNotExist:
                pass
        elif conv_list:
            # Ouvrir la première conversation par défaut
            active_conv = conv_list[0]
 
        context['active_conversation'] = active_conv
 
        if active_conv:
            messages_qs = active_conv.messages.select_related('sender').order_by('created')
 
            # Marquer comme lus les messages reçus
            messages_qs.filter(is_read=False).exclude(sender=user).update(is_read=True)
 
            # Ajouter date pour le regroupement par jour
            msgs = list(messages_qs)
            for msg in msgs:
                msg.created_date = msg.created.strftime("%B %d, %Y")
            context['active_messages'] = msgs
            context['last_message_id'] = msgs[-1].id if msgs else ''
 
            # Propriété liée (première propriété mentionnée dans la conv si possible)
            # On cherche dans les visites ou offres liées à l'autre participant
            from properties.models import Property
            from core.models import Visit
            visit = Visit.objects.filter(
                user=user,
                property__owner=active_conv.other_participant
            ).select_related('property', 'property__location').prefetch_related('property__images', 'property__features').first()
            context['active_property'] = visit.property if visit else None
 
        return context
 
 
class SendMessageView(LoginRequiredMixin, View):
    login_url = '/users/login/'
 
    def post(self, request):
        data = json.loads(request.body)
        conv_id = data.get('conversation_id')
        content = data.get('content', '').strip()
 
        if not conv_id or not content:
            return JsonResponse({'error': 'Invalid data'}, status=400)
 
        try:
            conv = Conversation.objects.get(id=conv_id, participants=request.user)
        except Conversation.DoesNotExist:
            return JsonResponse({'error': 'Conversation not found'}, status=404)
 
        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            content=content
        )
        return JsonResponse({
            'status': 'ok',
            'message': {
                'id': str(msg.id),
                'content': msg.content,
                'time': msg.created.strftime("%H:%M"),
            }
        })
 
 
class PollMessagesView(LoginRequiredMixin, View):
    login_url = '/users/login/'
 
    def get(self, request):
        conv_id = request.GET.get('conv')
        last_id = request.GET.get('last', '')
 
        if not conv_id:
            return JsonResponse({'messages': []})
 
        try:
            conv = Conversation.objects.get(id=conv_id, participants=request.user)
        except Conversation.DoesNotExist:
            return JsonResponse({'messages': []})
 
        msgs = conv.messages.exclude(sender=request.user).select_related('sender')
        if last_id:
            # Ne retourner que les messages après le dernier connu
            try:
                last_msg = Message.objects.get(id=last_id)
                msgs = msgs.filter(created__gt=last_msg.created)
            except Message.DoesNotExist:
                pass
 
        msgs = msgs.order_by('created')
 
        # Marquer comme lus
        msgs.filter(is_read=False).update(is_read=True)
 
        return JsonResponse({
            'messages': [
                {
                    'id': str(m.id),
                    'content': m.content,
                    'time': m.created.strftime("%H:%M"),
                    'sender_initial': m.sender.first_name[0] if m.sender.first_name else '?',
                }
                for m in msgs
            ]
        })
 

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
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='payments')
    method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return f"Payment {self.reference} ({self.amount})"

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
