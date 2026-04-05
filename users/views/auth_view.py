from django.shortcuts import render, redirect
from django.views import View
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from users.models import User, SellerVerification
from global_data.enum import UserType
from global_data.email import EmailUtil
import random
import string
import os
from django.conf import settings
from django.views.generic import TemplateView
from datetime import timedelta
from core.models import Visit, Message, Transaction
from django.utils import timezone
from properties.models import Property, Listing, PropertyImage
from django.db.models import Sum, Count
from users.models import SellerVerification
        
from django.http import JsonResponse

def generate_code(length=6):
    return ''.join(random.choices(string.digits, k=length))

class RegisterView(View):
    template_name = 'home/register.html'

    def get(self, request):
        if request.user.is_authenticated:
            return redirect('/')
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
            return redirect('/')
        return render(request, self.template_name)

    def post(self, request):
        email = request.POST.get('email')
        password = request.POST.get('password')

        user = authenticate(request, email=email, password=password)
        if user is not None:
            if not user.is_active:
                messages.error(request, "Account is not active. Please verify your email.")
                request.session['verification_email'] = email
                return redirect('users:verify_otp')

            login(request, user)

            # ✅ SELLER
            if user.user_type == UserType.SELLER:
                verification = SellerVerification.objects.filter(user=user).first()
                if not verification:
                    # Pas encore soumis ses documents → KYC
                    messages.warning(request, "Please submit your verification documents.")
                    return redirect('users:seller_kyc')
                # Déjà soumis → home
                return redirect('core:home')

            # ✅ ADMIN
            if user.user_type == UserType.ADMIN or user.is_staff or user.is_superuser:
                return redirect('core:home')

            # ✅ BUYER
            return redirect('core:home')

        else:
            messages.error(request, "Invalid email or password")
            return redirect('users:login')
        
class VerificationView(View):
    template_name = 'auth/verify_otp.html'

    def get(self, request):
        # Si pas d'email en session → retour inscription
        if 'verification_email' not in request.session:
            messages.error(request, "Session expirée ou invalide. Veuillez vous inscrire à nouveau.")
            return redirect('users:register')

        return render(request, self.template_name)

    def post(self, request):
        code_entered = request.POST.get('code')
        email = request.session.get('verification_email')
        real_code = request.session.get('verification_code')

        # Sécurité : code vide ou session expirée
        if not real_code or not code_entered:
            messages.error(request, "Code invalide ou session expirée.")
            return redirect('users:verify_otp')

        # Comparaison propre (strip + str)
        if str(code_entered).strip() == str(real_code).strip():
            try:
                user = User.objects.get(email=email)

                # Activation du compte
                user.is_active = True
                user.save()

                # Messages de succès
                messages.success(request, "Votre compte a été vérifié avec succès ! Veuillez vous connecter.")

                return redirect('users:login')

            except User.DoesNotExist:
                messages.error(request, "Utilisateur introuvable. Veuillez réessayer l'inscription.")
                return redirect('users:register')

        else:
            # Code incorrect → message + retour OTP
            messages.error(request, "Le code saisi est incorrect. Veuillez réessayer.")
            return render(request, self.template_name)


class SellerVerificationView(LoginRequiredMixin, View):
    template_name = "home/seller_kyc.html"
    login_url = '/users/login/'

    def get(self, request):
        # ✅ Admin → rediriger vers dashboard directement
        if request.user.is_superuser or request.user.is_staff:
            return redirect('users:seller_dashboard')

        if request.user.user_type != UserType.SELLER:
            messages.error(request, "Access denied. Only sellers allowed.")
            return redirect("/")

        verification, created = SellerVerification.objects.get_or_create(user=request.user)
        return render(request, self.template_name, {
            "verification": verification,
            "title": "Vérification de votre compte vendeur"
        })

    def post(self, request):
        # ✅ Admin → pas besoin de vérification
        if request.user.is_superuser or request.user.is_staff:
            return JsonResponse({'status': 'error', 'message': 'Admins do not need verification.'})

        if request.user.user_type != UserType.SELLER:
            return JsonResponse({'status': 'error', 'message': 'Access denied.'}, status=403)

        verification, created = SellerVerification.objects.get_or_create(user=request.user)

        if verification.is_verified:
            return JsonResponse({'status': 'error', 'message': 'Already verified.'})

        if not any(request.FILES.get(f) for f in ["id_card_front", "id_card_back", "business_license"]):
            return JsonResponse({'status': 'error', 'message': 'Veuillez soumettre au moins un document.'})

        if request.FILES.get("id_card_front"):
            verification.id_card_front = request.FILES["id_card_front"]
        if request.FILES.get("id_card_back"):
            verification.id_card_back = request.FILES["id_card_back"]
        if request.FILES.get("business_license"):
            verification.business_license = request.FILES["business_license"]
        if request.FILES.get("selfie"):
            verification.selfie = request.FILES["selfie"]

        verification.is_verified = False
        verification.save()

        return JsonResponse({'status': 'ok'})

class LogoutView(View):
    def get(self, request):
        logout(request)
        return redirect('users:login')

class SellerDashboardView(LoginRequiredMixin, TemplateView):
    template_name = "home/seller/dashboard.html"
    login_url = '/users/login/'  # ← redirection login si non connecté

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.error(request, "Veuillez vous connecter d'abord.")
            return redirect(self.login_url)

        # Autoriser : admins + vendeurs
        if request.user.is_superuser or request.user.is_staff or request.user.user_type == UserType.SELLER:
            return super().dispatch(request, *args, **kwargs)

        # Tous les autres (buyers, etc.) → redirection
        messages.error(request, "Accès réservé aux vendeurs et administrateurs.")
        return redirect('core:home')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        context['verification'] = SellerVerification.objects.filter(user=user).first()
        
    
        # Stats seller (ou admin qui voit tout)
        if user.is_superuser or user.is_staff:
            # Admin voit les stats globales ou filtrées
            properties = Property.objects.all()
            listings = Listing.objects.all()
        else:
            # Vendeur normal voit seulement ses données
            properties = Property.objects.filter(owner=user)
            listings = Listing.objects.filter(property__owner=user)

        context['total_listings'] = listings.count()
        context['total_views'] = Visit.objects.filter(property__in=properties).count()
        context['total_sales'] = Transaction.objects.filter(
            listing__in=listings,
            status='COMPLETED'  # adapte selon ton enum
        ).count()
        context['total_revenue'] = Transaction.objects.filter(
            listing__in=listings,
            status='COMPLETED'
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Pourcentages (valeurs exemples - tu peux les calculer vraiment plus tard)
        context['new_listings_percent'] = 12
        context['views_percent'] = 18
        context['sales_percent'] = 5
        context['revenue_change_percent'] = -2

        # Graphique simple (6 derniers mois)
        months = []
        for i in range(5, -1, -1):
            month_date = timezone.now() - timedelta(days=30 * i)
            month_name = month_date.strftime("%b")
            # Valeurs simulées (remplace par vraies stats si tu veux)
            months.append({
                'name': month_name,
                'height': random.randint(10, 32),
                'hover_height': random.randint(15, 36),
            })
        context['sales_data'] = months

        # Dernières inquiries via les conversations
from core.models import Conversation
conversations = Conversation.objects.filter(
    participants=user
).prefetch_related('participants', 'messages').order_by('-modified')[:5]

inquiries = []
for conv in conversations:
    other = conv.participants.exclude(id=user.id).first()
    last_msg = conv.messages.order_by('-created').first()
    if other and last_msg:
        inquiries.append({
            'buyer': other,
            'property': None,
            'created': last_msg.created,
            'message': last_msg.content,
        })
context['recent_inquiries'] = inquiries