from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from properties.models import PropertyCategory, PropertyFeature
from global_data.enum import PropertyType


class AddPropertyStep1View(LoginRequiredMixin, TemplateView):
    """Step 1: Basic Info"""
    template_name = 'home/add_property/basic_info.html'
    login_url = '/users/login/'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['categories'] = PropertyCategory.objects.all()
        context['property_types'] = PropertyType.choices
        return context


class AddPropertyStep2View(LoginRequiredMixin, TemplateView):
    """Step 2: Pricing & Details"""
    template_name = 'home/add_property/pricing_and_detail.html'
    login_url = '/users/login/'


class AddPropertyStep3View(LoginRequiredMixin, TemplateView):
    """Step 3: Location"""
    template_name = 'home/add_property/location.html'
    login_url = '/users/login/'


class AddPropertyStep4View(LoginRequiredMixin, TemplateView):
    """Step 4: Media Upload"""
    template_name = 'home/add_property/media_upload.html'
    login_url = '/users/login/'


class AddPropertyStep5View(LoginRequiredMixin, TemplateView):
    """Step 5: Review & Publish"""
    template_name = 'home/add_property/review_and_publish.html'
    login_url = '/users/login/'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['draft'] = self.request.session.get('add_property_draft', {})
        return context
