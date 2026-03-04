from django.views.generic import TemplateView
from properties.models import Property
from users.models import User
from django.db.models import Count
from django.views.generic import TemplateView
from properties.models import Property
from users.models import User
from django.views.generic import ListView
from django.db.models import Count

class HomeView(TemplateView):
    template_name = 'home/home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Correction ici : utilise le numéro du statut (adapte 1 selon tes choices)
        context['featured_properties'] = Property.objects.filter(status=1).order_by('-created')[:3]
        context['latest_properties'] = Property.objects.order_by('-created')[:3]
        context['popular_locations'] = Property.objects.values('location').annotate(count=Count('id')).order_by('-count')[:6]
        context['total_properties'] = Property.objects.count()
        context['total_users'] = User.objects.count()
        context['current_year'] = 2026
        
        return context


class PropertySearchView(ListView):
    template_name = 'home/property_Search_and_listing.html'
    model = Property
    context_object_name = 'properties'
    paginate_by = 12  # 12 annonces par page

    def get_queryset(self):
        queryset = Property.objects.all().order_by('-created')
        
        # Filtres simples (tu peux les améliorer)
        location = self.request.GET.get('location')
        min_price = self.request.GET.get('min_price')
        max_price = self.request.GET.get('max_price')
        bedrooms = self.request.GET.get('bedrooms')
        property_type = self.request.GET.getlist('property_type')  # multiple checkboxes

        if location:
            queryset = queryset.filter(location__icontains=location)
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        if bedrooms:
            queryset = queryset.filter(bedrooms__gte=bedrooms)
        if property_type:
            queryset = queryset.filter(property_type__in=property_type)

        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['total_properties'] = Property.objects.count()
        context['total_users'] = User.objects.count()
        context['location'] = self.request.GET.get('location', '')
        return context

class PropertyDetailView(TemplateView):
    template_name = 'home/property_detail.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # On récupère l'annonce par ID (adapte selon ton URL)
        # Exemple : path('property/<int:pk>/', PropertyDetailView.as_view(), name='property_detail')
        try:
            context['property'] = Property.objects.get(pk=self.kwargs.get('pk'))
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


class MessageView(TemplateView):
    template_name = 'home/message.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # À remplacer plus tard par tes vrais messages
        context['messages'] = []  # ou Message.objects.filter(user=request.user)
        return context


class PaymentMethodView(TemplateView):
    template_name = 'home/payement_method.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Liste statique pour l'instant (tu pourras la rendre dynamique plus tard)
        context['methods'] = ['Mobile Money', 'Carte bancaire', 'PayPal', 'Virement bancaire']
        return context


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