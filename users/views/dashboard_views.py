from django.views.generic import TemplateView

class BuyerDashboardView(TemplateView):
    template_name = 'buyer/user_dahsboard.html'

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
