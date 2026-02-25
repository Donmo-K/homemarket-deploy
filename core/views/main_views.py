from django.views.generic import TemplateView

class HomeView(TemplateView):
    template_name = 'home/home.html'

class PropertySearchView(TemplateView):
    template_name = 'home/property_Search_and_listing.html'

class PropertyDetailView(TemplateView):
    template_name = 'home/property_detail.html'

class CheckoutView(TemplateView):
    template_name = 'home/checkout.html'

class MessageView(TemplateView):
    template_name = 'home/message.html'

class PaymentMethodView(TemplateView):
    template_name = 'home/payement_method.html'
