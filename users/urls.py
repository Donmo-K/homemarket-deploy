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
from .views.property_views import (
    AddPropertyStep1View,
    AddPropertyStep2View,
    AddPropertyStep3View,
    AddPropertyStep4View,
    AddPropertyStep5View,
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
    # Add Property - multi-step wizard
    path('seller/add-property/', AddPropertyStep1View.as_view(), name='add_property_step1'),
    path('seller/add-property/pricing/', AddPropertyStep2View.as_view(), name='add_property_step2'),
    path('seller/add-property/location/', AddPropertyStep3View.as_view(), name='add_property_step3'),
    path('seller/add-property/media/', AddPropertyStep4View.as_view(), name='add_property_step4'),
    path('seller/add-property/review/', AddPropertyStep5View.as_view(), name='add_property_step5'),
    path('buyer/dashboard/', BuyerDashboardView.as_view(), name='buyer_dashboard'),
    path('buyer/profile/', BuyerProfileView.as_view(), name='buyer_profile'),
    path('buyer/saved-properties/', BuyerSavedPropertyView.as_view(), name='buyer_saved_properties'),
    path('buyer/bookings/', BuyerBookingView.as_view(), name='buyer_bookings'),
]
