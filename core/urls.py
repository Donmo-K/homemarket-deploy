from django.urls import path
from .views import (
    HomeView,
    PropertySearchView,
    PropertyDetailView,
    CheckoutView,
    MessageView,
    PaymentMethodView,
    AboutView,
    ExplorePropertyView,
    InvestmentOpportunityView
)

app_name = 'core'

urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('search/', PropertySearchView.as_view(), name='search'),
    path('property-detail/', PropertyDetailView.as_view(), name='property_detail'),
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('messages/', MessageView.as_view(), name='messages'),
    path('payment-method/', PaymentMethodView.as_view(), name='payment_method'),
    path('about/', AboutView.as_view(), name='about'),
    path('explore/', ExplorePropertyView.as_view(), name='explore'),
    path('investment/', InvestmentOpportunityView.as_view(), name='investment'),
]
