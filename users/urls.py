from django.urls import path
from .views.auth_view import (
    RegisterView, LoginView, VerificationView,
    SellerVerificationView, LogoutView, SellerDashboardView
)
from .views.dashboard_views import (
    BuyerDashboardView, BuyerProfileView,
    BuyerSavedPropertyView, BuyerBookingView,
    SellerProfileView, SellerKYCView,
    SellerListingView, SellerWalletView,
    AdminPendingPropertiesView, ApprovePropertyView, RejectPropertyView, RemoveFavoriteView,
    toggle_favorite,
)
from .views.property_views import (
    AddPropertyStep1View, AddPropertyStep2View,
    AddPropertyStep3View, AddPropertyStep4View,
    AddPropertyStep5View, PublishPropertyView
)

app_name = "users"

urlpatterns = [
    # Authentification
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('verify-otp/', VerificationView.as_view(), name='verify_otp'),
    path('seller-verification/', SellerVerificationView.as_view(), name='seller_verification'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # Dashboards
    path('buyer/dashboard/', BuyerDashboardView.as_view(), name='buyer_dashboard'),
    path('seller/dashboard/', SellerDashboardView.as_view(), name='seller_dashboard'),

    # Acheteur
    path('buyer/profile/', BuyerProfileView.as_view(), name='buyer_profile'),
    path('buyer/saved-properties/', BuyerSavedPropertyView.as_view(), name='buyer_saved_properties'),
    path('buyer/bookings/', BuyerBookingView.as_view(), name='buyer_bookings'),
    path('buyer/favorites/remove/<uuid:property_id>/', RemoveFavoriteView.as_view(), name='remove_favorite'),
    path('toggle-favorite/<uuid:property_id>/', toggle_favorite, name='toggle_favorite'),

    # Vendeur
    path('seller/profile/', SellerProfileView.as_view(), name='seller_profile'),
    path('seller/kyc/', SellerKYCView.as_view(), name='seller_kyc'),
    path('seller/listings/', SellerListingView.as_view(), name='seller_listings'),
    path('seller/wallet/', SellerWalletView.as_view(), name='seller_wallet'),

    # Ajout de propriété
    path('add-property/step1/', AddPropertyStep1View.as_view(), name='add_property_step1'),
    path('add-property/step2/', AddPropertyStep2View.as_view(), name='add_property_step2'),
    path('add-property/step3/', AddPropertyStep3View.as_view(), name='add_property_step3'),
    path('add-property/step4/', AddPropertyStep4View.as_view(), name='add_property_step4'),
    path('add-property/step5/', AddPropertyStep5View.as_view(), name='add_property_step5'),
    path('add-property/publish/', PublishPropertyView.as_view(), name='publish_property'),

    # ✅ Admin — modération des propriétés
    path('admin/properties/pending/', AdminPendingPropertiesView.as_view(), name='admin_pending_properties'),
    path('admin/properties/<int:property_id>/approve/', ApprovePropertyView.as_view(), name='approve_property'),
    path('admin/properties/<int:property_id>/reject/', RejectPropertyView.as_view(), name='reject_property'),
]