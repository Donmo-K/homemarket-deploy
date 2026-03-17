import json
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse
from django.views import View
from django.utils import timezone
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
            from .models import Visit
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
