from django.shortcuts import render, redirect
from django.views import View
from django.contrib.auth import login, authenticate
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from users.models import User, SellerVerification
from global_data.enum import UserType
from global_data.email import EmailUtil
import random
import string
import os
from django.conf import settings
from django.contrib.auth import logout
from django.views.generic import TemplateView


def generate_code(length=6):
    return ''.join(random.choices(string.digits, k=length))


class RegisterView(View):
    template_name = 'home/register.html'
    
    def get(self, request):
        if request.user.is_authenticated:
            return redirect('home')
        return render(request, self.template_name)
    
    def post(self, request):
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        email = request.POST.get('email')
        phone_number = request.POST.get('phone_number')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')
        user_type = request.POST.get('user_type')
        
        if password != confirm_password:
            messages.error(request, "Passwords do not match")
            return redirect('users:register')
            
        if User.objects.filter(email=email).exists():
            messages.error(request, "Email already exists")
            return redirect('users:register')
            
        user = User.objects.create_user(
            username=email, 
            email=email, 
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number
        )
        user.is_active = False
        
        if user_type == UserType.SELLER:
            user.user_type = UserType.SELLER
        else:
            user.user_type = UserType.BUYER
            
        user.save()
        
        verification_code = generate_code()
        request.session['verification_email'] = email
        request.session['verification_code'] = verification_code
        
        email_util = EmailUtil()
        logo_path = os.path.join(settings.STATIC_ROOT, 'images/logo/logo.webp')
        if not os.path.exists(logo_path):
            logo_path = os.path.join(settings.BASE_DIR, 'static/images/logo/logo.webp')

        email_util.send_email_with_template(
            template='email/verification_code.html',
            context={'code': verification_code, 'first_name': first_name},
            receivers=[email],
            subject='Verify your HomeMarket Account',
            inline_images={'logo_img': logo_path}
        )
        
        return redirect('users:verify_otp')


class LoginView(View):
    template_name = 'home/login.html'
    
    def get(self, request):
        if request.user.is_authenticated:
          return redirect('home')
        return render(request, self.template_name)
        
    def post(self, request):
        email = request.POST.get('email')
        password = request.POST.get('password')
        
        user = authenticate(request, username=email, password=password)
        
        if user is not None:
            if not user.is_active:
                messages.error(request, "Account is not active. Please verify your email.")
                request.session['verification_email'] = email
                return redirect('users:verify_otp')

            login(request, user)

            # 🔥 Redirection vendeur non vérifié
            if user.user_type == UserType.SELLER:
                verification = SellerVerification.objects.filter(user=user).first()
                if not verification or not verification.is_verified:
                    return redirect('users:seller_verification')

            if user.user_type == UserType.SELLER:
                verification = SellerVerification.objects.filter(user=user, is_verified=True).first()
    
                if verification:
                    return redirect('users:seller_dashboard')
                else:
                    return redirect('users:seller_verification')

            return redirect('home')


class VerificationView(View):
    template_name = 'auth/verify_otp.html'
    
    def get(self, request):
        if 'verification_email' not in request.session:
            return redirect('users:register')
        return render(request, self.template_name)
        
    def post(self, request):
        code_entered = request.POST.get('code')
        email = request.session.get('verification_email')
        real_code = request.session.get('verification_code')
        
        if code_entered == real_code:
            try:
                user = User.objects.get(email=email)
                user.is_active = True
                user.save()
                
                del request.session['verification_email']
                del request.session['verification_code']
                
                login(request, user)

                # 🔥 Même logique après activation
                if user.user_type == UserType.SELLER:
                    verification = SellerVerification.objects.filter(user=user).first()
                    if not verification or not verification.is_verified:
                        return redirect('users:seller_verification')

                return redirect('home')

            except User.DoesNotExist:
                messages.error(request, "User not found")
                return redirect('users:register')
        else:
            messages.error(request, "Invalid verification code")
            return redirect('users:verify_otp')
class SellerVerificationView(View):
    template_name = "auth/seller_verification.html"

    def get(self, request):
        if request.user.user_type != UserType.SELLER:
            messages.error(request, "Access denied. Only sellers allowed.")
            return redirect("home")

        verification, created = SellerVerification.objects.get_or_create(user=request.user)

        if verification.is_verified:
            messages.info(request, "Your account is already verified.")
            return redirect("home")

        if not created and not verification.is_verified:
            messages.info(request, "Your documents are under review.")
            return redirect("home")

        return render(request, self.template_name, {
            "verification": verification,
            "title": "Vérification de votre compte vendeur"
        })

    def post(self, request):
        if request.user.user_type != UserType.SELLER:
            messages.error(request, "Access denied.")
            return redirect("home")

        verification, created = SellerVerification.objects.get_or_create(user=request.user)

        if verification.is_verified:
            messages.info(request, "Your account is already verified.")
            return redirect("home")

        if not created and not verification.is_verified:
            messages.info(request, "Your documents are under review.")
            return redirect("home")

        # Check au moins un fichier
        if not any(request.FILES.get(f) for f in ["id_card_front", "id_card_back", "business_license"]):
            messages.error(request, "Veuillez soumettre au moins un document.")
            return render(request, self.template_name, {"verification": verification})

        verification.id_card_front = request.FILES.get("id_card_front")
        verification.id_card_back = request.FILES.get("id_card_back")
        verification.business_license = request.FILES.get("business_license")
        verification.is_verified = False
        verification.save()

        messages.success(request, "Documents submitted. Awaiting admin validation.")
        return redirect("home")  # ou "users:seller_dashboard"
    
class LogoutView(View):
    def get(self, request):
        logout(request)
        return redirect('users:login')

class SellerDashboardView(TemplateView):
    template_name = "seller/dashboard.html"

    def dispatch(self, request, *args, **kwargs):
        # Vérifier que c'est un vendeur
        if request.user.user_type != UserType.SELLER:
            messages.error(request, "Access denied. Sellers only.")
            return redirect('home')

        return super().dispatch(request, *args, **kwargs)

