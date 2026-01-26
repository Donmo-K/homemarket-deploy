from django.shortcuts import render, redirect
from django.views import View
from django.contrib.auth import login, authenticate
from django.contrib import messages
from django.utils import timezone
from users.models import User
from global_data.enum import UserType
from global_data.email import EmailUtil
import random
import string
from django.contrib.sites.shortcuts import get_current_site
import os
from django.conf import settings

def generate_code(length=6):
    return ''.join(random.choices(string.digits, k=length))

class RegisterView(View):
    template_name = 'auth/register.html'
    
    def get(self, request):
        if request.user.is_authenticated:
            return redirect('home')
        return render(request, self.template_name)
    
    def post(self, request):
        email = request.POST.get('email')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')
        user_type = request.POST.get('user_type')
        
        if password != confirm_password:
            messages.error(request, "Passwords do not match")
            return redirect('register')
            
        if User.objects.filter(email=email).exists():
            messages.error(request, "Email already exists")
            return redirect('register')
            
        user = User.objects.create_user(username=email, email=email, password=password)
        user.is_active = False # Require verification
        if user_type == UserType.SELLER:
            user.user_type = UserType.SELLER
        else:
            user.user_type = UserType.BUYER
        user.save()
        
        # Save verification code in session (simple OTP mechanism for now, or could use a model)
        # For simplicity and statelessness, let's use a temporary session store or a dedicated model.
        # Given the request, I'll store it in the session for this flow.
        verification_code = generate_code()
        request.session['verification_email'] = email
        request.session['verification_code'] = verification_code
        
        # Send Email
        email_util = EmailUtil()
        logo_path = os.path.join(settings.STATIC_ROOT, 'images/logo/logo.webp')
        # Ensure static root exists or use direct path if static not collected in dev
        if not os.path.exists(logo_path):
             logo_path = os.path.join(settings.BASE_DIR, 'static/images/logo/logo.webp')

        email_util.send_email_with_template(
            template='email/verification_code.html',
            context={'code': verification_code},
            receivers=[email],
            subject='Verify your HomeMarket Account',
            inline_images={'logo_img': logo_path}
        )
        
        return redirect('verify_otp')

class LoginView(View):
    template_name = 'auth/login.html'
    
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
                # Logic to resend code could go here
                return redirect('login')
            login(request, user)
            return redirect('home')
        else:
            messages.error(request, "Invalid email or password")
            return redirect('login')

class VerificationView(View):
    template_name = 'auth/verify_otp.html'
    
    def get(self, request):
        if 'verification_email' not in request.session:
             return redirect('register')
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
                
                # Cleanup session
                del request.session['verification_email']
                del request.session['verification_code']
                
                login(request, user)
                return redirect('home')
            except User.DoesNotExist:
                messages.error(request, "User not found")
                return redirect('register')
        else:
            messages.error(request, "Invalid verification code")
            return redirect('verify_otp')
