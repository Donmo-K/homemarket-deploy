import json
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse
from django.views import View
from .models import Conversation, Message


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
            active_conv = conv_list[0]

        context['active_conversation'] = active_conv

        if active_conv:
            messages_qs = active_conv.messages.select_related('sender').order_by('created')

            # Marquer comme lus
            messages_qs.filter(is_read=False).exclude(sender=user).update(is_read=True)

            msgs = list(messages_qs)
            for msg in msgs:
                msg.created_date = msg.created.strftime("%B %d, %Y")
            context['active_messages'] = msgs
            context['last_message_id'] = msgs[-1].id if msgs else ''

            # Propriété liée
            from properties.models import Property
            from .models import Visit
            visit = Visit.objects.filter(
                user=user,
                property__owner=active_conv.other_participant
            ).select_related(
                'property', 'property__location'
            ).prefetch_related(
                'property__images', 'property__features'
            ).first()
            context['active_property'] = visit.property if visit else None

        return context

import re

def contains_contact_info(text):
    """Détecte numéros, emails, réseaux sociaux dans un message"""
    patterns = [
        r'\b6\d{8}\b',                                    # numéros camerounais (6XXXXXXXX)
        r'\b\d{8,}\b',                                    # tout numéro 8+ chiffres
        r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]+', # emails
        r'(whatsapp|telegram|instagram|facebook|twitter|tiktok|snapchat)',
        r'(appelle|appeler|contacte|joindre|rejoindre|appel)',
        r'(http|https|www\.)',                             # liens
        r'(\+237|\+\d{10,})',                              # indicatifs téléphoniques
    ]
    for pattern in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


class SendMessageView(LoginRequiredMixin, View):
    login_url = '/users/login/'

    def post(self, request):
        data = json.loads(request.body)
        conv_id = data.get('conversation_id')
        content = data.get('content', '').strip()

        if not conv_id or not content:
            return JsonResponse({'error': 'Invalid data'}, status=400)

        # ✅ Bloquer les infos de contact
        if contains_contact_info(content):
            return JsonResponse({
                'status': 'blocked',
                'error': '🚫 Partager des coordonnées personnelles est interdit. Pour contacter le vendeur directement, effectuez un paiement via Home Market.'
            }, status=403)

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
            try:
                last_msg = Message.objects.get(id=last_id)
                msgs = msgs.filter(created__gt=last_msg.created)
            except Message.DoesNotExist:
                pass

        msgs = msgs.order_by('created')
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