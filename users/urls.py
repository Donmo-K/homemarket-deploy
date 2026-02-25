from django.urls import path
from .views.auth_view import RegisterView, LoginView, VerificationView, SellerVerificationView, LogoutView, SellerDashboardView
from .views.dashboard_views import (
    BuyerDashboardView,
    BuyerProfileView,
    BuyerSavedPropertyView,
    BuyerBookingView,
    SellerProfileView,
    SellerKYCView
)

app_name = "users" 

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('verify-otp/', VerificationView.as_view(), name='verify_otp'),
    path('seller-verification/', SellerVerificationView.as_view(), name='seller_verification'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('seller/dashboard/', SellerDashboardView.as_view(), name='seller_dashboard'),
    path('seller/profile/', SellerProfileView.as_view(), name='seller_profile'),
    path('seller/kyc/', SellerKYCView.as_view(), name='seller_kyc'),
    path('buyer/dashboard/', BuyerDashboardView.as_view(), name='buyer_dashboard'),
    path('buyer/profile/', BuyerProfileView.as_view(), name='buyer_profile'),
    path('buyer/saved-properties/', BuyerSavedPropertyView.as_view(), name='buyer_saved_properties'),
    path('buyer/bookings/', BuyerBookingView.as_view(), name='buyer_bookings'),
]
