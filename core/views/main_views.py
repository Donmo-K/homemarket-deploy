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
from decimal import Decimal


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

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['location'] = self.request.GET.get('location', '')
        context['type_filter'] = self.request.GET.get('type', '')
        context['min_price'] = self.request.GET.get('min_price', '')
        context['max_price'] = self.request.GET.get('max_price', '')
        context['bedrooms'] = self.request.GET.get('bedrooms', '')
        context['property_type'] = self.request.GET.get('property_type', '')
        return context

    def get_queryset(self):
        queryset = Property.objects.filter(
            status='APPROVED'
        ).select_related('location').prefetch_related('images').order_by('-created')

        location      = self.request.GET.get('location', '').strip()
        min_price     = self.request.GET.get('min_price')
        max_price     = self.request.GET.get('max_price')
        bedrooms      = self.request.GET.get('bedrooms')
        property_type = self.request.GET.get('property_type')
        type_filter   = self.request.GET.get('type')

        if location:
            queryset = queryset.filter(
                Q(location__city__icontains=location) |
                Q(location__address__icontains=location) |
                Q(location__country__icontains=location)
            )

        # ✅ Mapping buy/rent → FOR_SALE/FOR_RENT
        if type_filter:
            type_mapping = {
                'buy': 'FOR_SALE',
                'rent': 'FOR_RENT',
            }
            mapped = type_mapping.get(type_filter)
            if mapped:
                queryset = queryset.filter(listing_type=mapped)

        elif property_type:
            queryset = queryset.filter(category__slug=property_type.lower())

        if min_price:
            try:
                queryset = queryset.filter(price__gte=float(min_price))
            except ValueError:
                pass

        if max_price:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
            except ValueError:
                pass

        if bedrooms:
            try:
                queryset = queryset.filter(bedrooms__gte=int(bedrooms))
            except ValueError:
                pass

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
                commission   = int(property_obj.price * Decimal('0.05'))
                owner_amount = property_obj.price - commission
        context.update({
            'property':     property_obj,
            'payment_type': payment_type,
            'amount':       amount,
            'commission':   commission,
            'owner_amount': owner_amount,
        })
        return context

    # PayUnit payment is handled by CreatePayunitPaymentView in pay_unit_views.py
    def post(self, request, *args, **kwargs):
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