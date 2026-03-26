from django.views.generic import TemplateView, View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from django.shortcuts import redirect, render
from django.db.models import Sum
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required

from core.models import Favorite, Visit, Message, Transaction
from properties.models import Listing, Property  # ✅ CORRECTION ICI
from global_data.enum import TransactionStatus, ListingStatus
from django.shortcuts import get_object_or_404
from core.models import  Visit
from properties.models import Property



class BuyerDashboardView(LoginRequiredMixin, TemplateView):
    template_name = 'buyer/user_dashboard.html'
    login_url = '/users/login/'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        
        context['total_saved'] = Favorite.objects.filter(user=user).count()
        
        visits_qs = Visit.objects.filter(user=user).select_related(
            'property', 'property__location'
        ).prefetch_related('property__images').order_by('-modified')
        context['total_visits'] = visits_qs.count()
        context['recent_visits'] = visits_qs[:5]
        
        context['total_committed'] = Transaction.objects.filter(
            buyer=user,
            status=TransactionStatus.PENDING
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        context['unread_messages'] = Message.objects.filter(
            conversation__participants=user,
            is_read=False
        ).exclude(sender=user).count()
        
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


class BuyerSavedPropertyView(LoginRequiredMixin, View):
    def get(self, request):
        favorites = (
            Favorite.objects
            .filter(user=request.user)
            .select_related(
                'property',
                'property__location',
                'property__category',
            )
            .prefetch_related('property__images')
            .order_by('-created')
        )
        context = {
            'favorites': favorites,
            'total_favorites': favorites.count(),
        }
        return render(request, 'buyer/saved.html', context)


class BookPropertyView(View):
    def post(self, request, property_id):
        property = get_object_or_404(Property, id=property_id)

        Booking.objects.create(
            user=request.user,
            property=property,
            status='PENDING'
        )

        return JsonResponse({'status': 'success'})


class SellerProfileView(TemplateView):
    template_name = 'buyer/seller_profile.html'
    
class BuyerBookingView(TemplateView):
    template_name = 'home/buyer_booking.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['visits'] = Visit.objects.filter(user=self.request.user)
        return context    


class SellerKYCView(TemplateView):
    template_name = 'home/seller_kyc.html'


class SellerListingView(LoginRequiredMixin, TemplateView):
    template_name = 'home/seller/seller_listing.html'
    login_url = '/users/login/'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        context['listings'] = Listing.objects.filter(
            property__owner=user
        ).select_related(
            'property', 'property__location'
        ).prefetch_related(
            'property__images'
        ).order_by('-created')
        return context


class SellerWalletView(LoginRequiredMixin, TemplateView):
    template_name = 'home/seller/seller_wallet.html'
    login_url = '/users/login/'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        transactions = Transaction.objects.filter(
            listing__property__owner=user
        ).order_by('-created')
        context['transactions'] = transactions
        context['total_revenue'] = transactions.filter(
            status=TransactionStatus.COMPLETED
        ).aggregate(total=Sum('amount'))['total'] or 0
        context['pending_revenue'] = transactions.filter(
            status=TransactionStatus.PENDING
        ).aggregate(total=Sum('amount'))['total'] or 0
        context['total_transactions'] = transactions.count()
        return context


# ✅ ADMIN
class AdminPendingPropertiesView(LoginRequiredMixin, TemplateView):
    template_name = 'home/admin/pending_properties.html'
    login_url = '/users/login/'

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_superuser and not request.user.is_staff:
            messages.error(request, "Accès refusé.")
            return redirect('core:home')
        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['pending_properties'] = Property.objects.filter(
            status='PENDING'
        ).order_by('-created')
        return context


class ApprovePropertyView(LoginRequiredMixin, View):
    login_url = '/users/login/'

    def post(self, request, property_id):
        if not request.user.is_superuser and not request.user.is_staff:
            messages.error(request, "Accès refusé.")
            return redirect('core:home')
        try:
            property = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            messages.error(request, "Propriété introuvable.")
            return redirect('users:admin_pending_properties')

        property.status = 'APPROVED'
        property.save()

        Listing.objects.get_or_create(
            property=property,
            defaults={
                'agent': property.owner,
                'price': property.price,
                'status': ListingStatus.ACTIVE,
            }
        )
        messages.success(request, f"'{property.title}' est maintenant approuvée.")
        return redirect('users:admin_pending_properties')


class RejectPropertyView(LoginRequiredMixin, View):
    login_url = '/users/login/'

    def post(self, request, property_id):
        if not request.user.is_superuser and not request.user.is_staff:
            messages.error(request, "Accès refusé.")
            return redirect('core:home')
        try:
            property = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            messages.error(request, "Propriété introuvable.")
            return redirect('users:admin_pending_properties')

        property.status = 'REJECTED'
        property.save()

        messages.error(request, f"'{property.title}' a été rejetée.")
        return redirect('users:admin_pending_properties')


class RemoveFavoriteView(LoginRequiredMixin, View):
    def post(self, request, property_id):
        Favorite.objects.filter(user=request.user, property_id=property_id).delete()
        return redirect('users:buyer_saved_properties')


# ✅ TOGGLE FAVORITE (AJAX)
@login_required
@require_POST
def toggle_favorite(request, property_id):
    prop = Property.objects.get(id=property_id)

    favorite, created = Favorite.objects.get_or_create(
        user=request.user,
        property=prop
    )

    if not created:
        favorite.delete()
        return JsonResponse({'status': 'removed'})
    else:
        return JsonResponse({'status': 'added'})