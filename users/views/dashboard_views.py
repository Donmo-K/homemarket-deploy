from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Sum
from core.models import Favorite, Visit, Message, Transaction
from properties.models import Listing
from global_data.enum import TransactionStatus, ListingStatus


class BuyerDashboardView(LoginRequiredMixin, TemplateView):
    template_name = 'buyer/user_dashboard.html'
    login_url = '/users/login/'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user

        # Saved properties count
        context['total_saved'] = Favorite.objects.filter(user=user).count()

        # Visits
        visits_qs = Visit.objects.filter(user=user).select_related(
            'property', 'property__location'
        ).prefetch_related('property__images').order_by('-modified')
        context['total_visits'] = visits_qs.count()
        context['recent_visits'] = visits_qs[:5]

        # Total committed (transactions pending)
        context['total_committed'] = Transaction.objects.filter(
            buyer=user,
            status=TransactionStatus.PENDING
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Unread messages
        context['unread_messages'] = Message.objects.filter(
            conversation__participants=user,
            is_read=False
        ).exclude(sender=user).count()

        # Recommended listings (actives, excluant ceux déjà vus)
        visited_property_ids = visits_qs.values_list('property_id', flat=True)
        context['recommended_listings'] = Listing.objects.filter(
            status=ListingStatus.ACTIVE
        ).exclude(
            property_id__in=visited_property_ids
        ).select_related(
            'property', 'property__location'
        ).prefetch_related('property__images')[:6]

        return context

class BuyerProfileView(TemplateView):
    template_name = 'buyer/my_booking.html'

class BuyerSavedPropertyView(TemplateView):
    template_name = 'buyer/saved.html'

class BuyerBookingView(TemplateView):
    template_name = 'home/buyer_booking.html'

class SellerProfileView(TemplateView):
    template_name = 'buyer/seller_profile.html'

class SellerKYCView(TemplateView):
    template_name = 'home/seller_kyc.html'
