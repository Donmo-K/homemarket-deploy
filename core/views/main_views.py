from django.views.generic import TemplateView
from properties.models import Property
from users.models import User
from django.db.models import Count
from django.views.generic import TemplateView
from properties.models import Property
from users.models import User
from django.views.generic import ListView
from django.db.models import Count
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404
from django.conf import settings
import requests


class HomeView(TemplateView):
    template_name = 'home/home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['featured_properties'] = Property.objects.filter(
            status='APPROVED'
        ).order_by('-created')[:3]
        context['latest_properties'] = Property.objects.filter(
            status='APPROVED'
        ).order_by('-created')[:3]
        context['popular_locations'] = Property.objects.filter(
            status='APPROVED'
        ).values('location').annotate(count=Count('id')).order_by('-count')[:6]
        context['total_properties'] = Property.objects.filter(status='APPROVED').count()
        context['total_users'] = User.objects.count()
        context['current_year'] = 2026
        return context

class PropertySearchView(ListView):
    template_name = 'home/property_Search_and_listing.html'
    model = Property
    context_object_name = 'properties'
    paginate_by = 12

    def get_queryset(self):
        queryset = Property.objects.filter(status='APPROVED').order_by('-created')

        location = self.request.GET.get('location')
        min_price = self.request.GET.get('min_price')
        max_price = self.request.GET.get('max_price')
        bedrooms = self.request.GET.get('bedrooms')
        property_type = self.request.GET.getlist('property_type')
        type_filter = self.request.GET.get('type')

        # ✅ PRIORITÉ AU BOUTON BUY / RENT
        if type_filter:
            queryset = queryset.filter(property_type=type_filter)

        # ✅ SINON utiliser les filtres checkbox
        elif property_type:
            queryset = queryset.filter(property_type__in=property_type)

        if location:
            queryset = queryset.filter(location__icontains=location)
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        if bedrooms:
            queryset = queryset.filter(bedrooms__gte=bedrooms)

        return queryset
    
class PropertyDetailView(TemplateView):
    template_name = 'home/property_detail.html'
 
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        try:
            context['property'] = Property.objects.select_related(
                'owner',
                'location',
                'category',
            ).prefetch_related(
                'images',
                'features',
                'reviews__reviewer',
                'listings',
            ).get(pk=self.kwargs.get('pk'))
        except Property.DoesNotExist:
            context['property'] = None
        return context


class CheckoutView(TemplateView):
    template_name = 'home/checkout.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Exemple simple (tu pourras récupérer depuis session ou URL plus tard)
        context['amount'] = 5000  # prix fixe pour l'instant
        context['property'] = Property.objects.first()  # ou depuis session/panier
        return context


class PaymentMethodView(LoginRequiredMixin, TemplateView):
    template_name = 'home/payement_method.html'
    login_url = '/users/login/'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        property_id  = self.request.GET.get('prop')
        payment_type = self.request.GET.get('type', 'BUY')

        property_obj = None
        if property_id:
            try:
                property_obj = Property.objects.select_related(
                    'location'
                ).prefetch_related('images').get(
                    id=property_id,
                    status='APPROVED'
                )
            except Property.DoesNotExist:
                property_obj = None

        # Logique prix
        amount       = 0
        commission   = 0
        owner_amount = 0

        if property_obj:
            if payment_type == "RENT":
                amount = 5000  # prix fixe pour voir le contact
            else:
                amount       = property_obj.price
                commission   = int(property_obj.price * 0.05)
                owner_amount = property_obj.price - commission

        context.update({
            'property':     property_obj,
            'payment_type': payment_type,
            'amount':       amount,
            'commission':   commission,
            'owner_amount': owner_amount,
        })
        return context

    # 🔥 GESTION DU PAIEMENT PAYUNIT
    def post(self, request, *args, **kwargs):
        property_id  = request.GET.get('prop')
        payment_type = request.GET.get('type', 'BUY')

        property = Property.objects.get(id=property_id)

        # 🔥 LOGIQUE MONTANT
        if payment_type == "RENT":
            amount = 5000
        else:
            amount = property.price

        url = "https://gateway.payunit.net/api/gateway/initialize"

        payload = {
            "amount": str(amount),
            "currency": "XAF",
            "transaction_id": f"HM-{property.id}-{request.user.id}",
            "return_url": "http://127.0.0.1:8000/payment/success/",
            "notify_url": "http://127.0.0.1:8000/payment/notify/",
            "description": f"{payment_type} - {property.title}",
        }

        headers = {
            "x-api-key": settings.PAYUNIT_API_KEY,
            "x-api-username": settings.PAYUNIT_USERNAME,
            "x-api-password": settings.PAYUNIT_PASSWORD,
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(url, json=payload, headers=headers)
            data = response.json()

            if "payment_url" in data:
                return redirect(data["payment_url"])

        except Exception as e:
            print("Erreur paiement:", e)

        return redirect("core:search")


class AboutView(TemplateView):
    template_name = 'home/about.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Stats dynamiques
        context['stats'] = {
            'users': User.objects.count(),
            'properties': Property.objects.count(),
        }
        # À compléter avec tes membres d'équipe si besoin
        context['team_members'] = []
        return context


class ExplorePropertyView(TemplateView):
    template_name = 'home/explore_property.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Exemple : 9 annonces récentes
        context['properties'] = Property.objects.order_by('-created')[:9]
        # Catégories dynamiques (si tu as un modèle Category)
        # context['categories'] = Category.objects.all()
        context['categories'] = []  # placeholder
        return context


class InvestmentOpportunityView(TemplateView):
    template_name = 'home/investesment_opportunity.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Exemple : 6 annonces avec prix élevé (ou autre critère existant)
        context['opportunities'] = Property.objects.order_by('-price')[:6]
        return context