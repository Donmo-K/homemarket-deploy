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

        # ✅ CORRECTION ICI
        user = authenticate(request, email=email, password=password)

        if user is not None:
            if not user.is_active:
                messages.error(request, "Account is not active. Please verify your email.")
                request.session['verification_email'] = email
                return redirect('users:verify_otp')

            login(request, user)

            # 🔥 SELLER LOGIC
            if user.user_type == UserType.SELLER:
                verification = SellerVerification.objects.filter(user=user).first()
                if not verification or not verification.is_verified:
                    return redirect('users:seller_verification')
                return redirect('users:seller_dashboard')

            # ✅ BUYER
            return redirect('/')

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

                # Connexion automatique
                login(request, user)

                # Nettoyage session OTP (important pour sécurité)
                request.session.pop('verification_email', None)
                request.session.pop('verification_code', None)

                # Messages de succès
                messages.success(request, "Votre compte a été vérifié avec succès ! Bienvenue.")

                # 🎯 REDIRECTION INTELLIGENTE SELON LE TYPE D'UTILISATEUR
                if user.user_type == UserType.SELLER:
                    # Vérifie si le vendeur a déjà un dossier et s'il est approuvé
                    verification = SellerVerification.objects.filter(user=user).first()
                    if verification and verification.is_verified:
                        return redirect('users:seller_dashboard')  # ← dashboard vendeur
                    else:
                        return redirect('users:seller_verification')  # ← page soumission dossier
                else:
                    return redirect('home')  # ← page d'accueil pour buyer

            except User.DoesNotExist:
                messages.error(request, "Utilisateur introuvable. Veuillez réessayer l'inscription.")
                return redirect('users:register')

        else:
            # Code incorrect → message + retour OTP
            messages.error(request, "Le code saisi est incorrect. Veuillez réessayer.")
            return render(request, self.template_name)
class SellerVerificationView(LoginRequiredMixin, View):
    template_name = "auth/seller_verification.html"

    def get(self, request):
        if request.user.user_type != UserType.SELLER:
            messages.error(request, "Access denied. Only sellers allowed.")
            return redirect("/")

        verification, created = SellerVerification.objects.get_or_create(user=request.user)

        if verification.is_verified:
            messages.info(request, "Your account is already verified.")
            return redirect("/")

        if not created and not verification.is_verified:
            messages.info(request, "Your documents are under review.")
            return redirect("/")

        return render(request, self.template_name, {
            "verification": verification,
            "title": "Vérification de votre compte vendeur"
        })

    def post(self, request):
        if request.user.user_type != UserType.SELLER:
            messages.error(request, "Access denied.")
            return redirect("/")

        verification, created = SellerVerification.objects.get_or_create(user=request.user)

        if verification.is_verified:
            messages.info(request, "Your account is already verified.")
            return redirect("/")

        if not created and not verification.is_verified:
            messages.info(request, "Your documents are under review.")
            return redirect("/")

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
        return redirect("/")  # ou "users:seller_dashboard"

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

        # Dernières inquiries (messages sur les propriétés)
        context['recent_inquiries'] = Message.objects.filter(
            conversation__participants=user,
            created__gte=timezone.now() - timedelta(days=30)
        ).order_by('-created')[:5]

        return context