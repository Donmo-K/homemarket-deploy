# Dans core/urls.py — remplacez votre fichier par ceci :

from django.urls import path
from .views import (
    HomeView,
    PropertySearchView,
    PropertyDetailView,
    CheckoutView,
    PaymentMethodView,
    AboutView,
    ExplorePropertyView,
    InvestmentOpportunityView,
)
from .message_views import MessageView, SendMessageView, PollMessagesView
from .pay_unit_views import (
    CreatePayunitPaymentView,
    PaymentReturnView,
    PaymentWebhookView,
)


app_name = 'core'

urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('search/', PropertySearchView.as_view(), name='search'),
    path('property/<uuid:pk>/', PropertyDetailView.as_view(), name='property_detail'),
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('messages/', MessageView.as_view(), name='message'),
    path('messages/send/', SendMessageView.as_view(), name='send_message'),
    path('messages/poll/', PollMessagesView.as_view(), name='poll_messages'),
    path('payment-method/', PaymentMethodView.as_view(), name='payment_method'),
    path('about/', AboutView.as_view(), name='about'),
    path('explore/', ExplorePropertyView.as_view(), name='explore'),
    path('investment/', InvestmentOpportunityView.as_view(), name='investment'),
   
path("pay/<uuid:property_id>/<str:payment_type>/", CreatePayunitPaymentView.as_view(), name="pay"),
path("payment/return/", PaymentReturnView.as_view(), name="payment_return"),
path("payment/webhook/", PaymentWebhookView.as_view(), name="webhook"),

]