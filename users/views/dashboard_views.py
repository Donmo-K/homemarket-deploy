from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin

class BuyerDashboardView(LoginRequiredMixin, TemplateView):
    template_name = 'home/buyer_dashboard.html'

class BuyerProfileView(LoginRequiredMixin, TemplateView):
    template_name = 'home/buyer_profile.html'

class BuyerSavedPropertyView(LoginRequiredMixin, TemplateView):
    template_name = 'home/buyer_saved_property.html'

class BuyerBookingView(LoginRequiredMixin, TemplateView):
    template_name = 'home/buyer_booking.html'

class SellerProfileView(LoginRequiredMixin, TemplateView):
    template_name = 'home/seller_profile.html'

class SellerKYCView(LoginRequiredMixin, TemplateView):
    template_name = 'home/seller_kyc.html'
