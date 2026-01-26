from django.urls import path
from .views.auth_view import RegisterView, LoginView, VerificationView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('verify-otp/', VerificationView.as_view(), name='verify_otp'),
]
