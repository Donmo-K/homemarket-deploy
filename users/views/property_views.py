from django.views.generic import TemplateView, View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect, render
from django.contrib import messages
from properties.models import Property, PropertyCategory, PropertyFeature, PropertyImage, Listing
from global_data.enum import PropertyType, ListingStatus


class AddPropertyStep1View(LoginRequiredMixin, View):
    template_name = 'home/add_property/basic_info.html'
    login_url = '/users/login/'

    def get(self, request):
        draft = request.session.get('add_property_draft', {})
        return render(request, self.template_name, {
            'categories': PropertyCategory.objects.all(),
            'property_types': PropertyType.choices,
            'draft': draft,
        })

    def post(self, request):
        draft = request.session.get('add_property_draft', {})
        draft['title'] = request.POST.get('title', '')
        draft['description'] = request.POST.get('description', '')
        draft['property_type'] = request.POST.get('property_type', '')
        draft['category_id'] = request.POST.get('category', '')

        if not draft['title'] or not draft['property_type'] or not draft['category_id']:
            messages.error(request, "Veuillez remplir tous les champs obligatoires.")
            return render(request, self.template_name, {
                'categories': PropertyCategory.objects.all(),
                'property_types': PropertyType.choices,
                'draft': draft,
            })

        request.session['add_property_draft'] = draft
        return redirect('users:add_property_step2')


class AddPropertyStep2View(LoginRequiredMixin, View):
    template_name = 'home/add_property/pricing_and_detail.html'
    login_url = '/users/login/'

    def get(self, request):
        draft = request.session.get('add_property_draft', {})
        return render(request, self.template_name, {'draft': draft})

    def post(self, request):
        draft = request.session.get('add_property_draft', {})
        draft['price'] = request.POST.get('price', '')
        draft['area_sqm'] = request.POST.get('area_sqm', '')
        draft['bedrooms'] = request.POST.get('bedrooms', '3')
        draft['bathrooms'] = request.POST.get('bathrooms', '2')
        draft['year_built'] = request.POST.get('year_built', '')
        draft['lot_size'] = request.POST.get('lot_size', '')
        draft['features'] = request.POST.getlist('features')

        if not draft['price']:
            messages.error(request, "Veuillez entrer un prix.")
            return render(request, self.template_name, {'draft': draft})

        request.session['add_property_draft'] = draft
        return redirect('users:add_property_step3')


class AddPropertyStep3View(LoginRequiredMixin, View):
    template_name = 'home/add_property/location.html'
    login_url = '/users/login/'

    def get(self, request):
        draft = request.session.get('add_property_draft', {})
        return render(request, self.template_name, {'draft': draft})

    def post(self, request):
        draft = request.session.get('add_property_draft', {})
        draft['address'] = request.POST.get('address', '')
        draft['city'] = request.POST.get('city', '')
        draft['state'] = request.POST.get('state', '')
        draft['zip_code'] = request.POST.get('zip_code', '')

        if not draft['city']:
            messages.error(request, "Veuillez entrer une ville.")
            return render(request, self.template_name, {'draft': draft})

        request.session['add_property_draft'] = draft
        return redirect('users:add_property_step4')


class AddPropertyStep4View(LoginRequiredMixin, View):
    template_name = 'home/add_property/media_upload.html'
    login_url = '/users/login/'

    def get(self, request):
        draft = request.session.get('add_property_draft', {})
        return render(request, self.template_name, {'draft': draft})

    def post(self, request):
        draft = request.session.get('add_property_draft', {})

        if not draft.get('title') or not draft.get('price'):
            messages.error(request, "Données manquantes. Veuillez recommencer depuis l'étape 1.")
            return redirect('users:add_property_step1')

        try:
            property = Property.objects.create(
                owner=request.user,
                title=draft.get('title'),
                description=draft.get('description', ''),
                property_type=draft.get('property_type'),
                category_id=draft.get('category_id'),
                price=draft.get('price'),
                bedrooms=draft.get('bedrooms', 0),
                bathrooms=draft.get('bathrooms', 0),
                area_sqm=draft.get('area_sqm') or None,
                status='PENDING',
            )

            # ✅ Features ignorées pour l'instant
            # feature_ids = draft.get('features', [])
            # if feature_ids:
            #     property.features.set(feature_ids)

            images = request.FILES.getlist('images')
            for i, image in enumerate(images):
                PropertyImage.objects.create(
                    property=property,
                    image=image,
                    is_main=(i == 0),
                )

            request.session['current_property_id'] = str(property.id)
            messages.success(request, "Propriété sauvegardée ! Vérifiez les détails avant de publier.")
            return redirect('users:add_property_step5')

        except Exception as e:
            print("❌ ERREUR :", str(e))
            import traceback
            traceback.print_exc()
            messages.error(request, f"Erreur lors de la sauvegarde : {str(e)}")
            return render(request, self.template_name, {'draft': draft})


class AddPropertyStep5View(LoginRequiredMixin, TemplateView):
    
    template_name = 'home/add_property/review_and_publish.html'
    login_url = '/users/login/'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        property_id = self.request.session.get('current_property_id')
        if property_id:
            property = Property.objects.filter(
                id=property_id,
                owner=self.request.user,
                status='PENDING'
            ).first()
            if property:
                context['main_image'] = property.images.filter(is_main=True).first()
        else:
            property = None
        context['property'] = property
        context['draft'] = self.request.session.get('add_property_draft', {})
        return context

class PublishPropertyView(LoginRequiredMixin, View):
    login_url = '/users/login/'

    def post(self, request, *args, **kwargs):
        property_id = request.POST.get('property_id')
        agree = request.POST.get('agree')

        if not agree:
            messages.error(request, "Vous devez accepter les conditions pour publier l'annonce.")
            return redirect('users:add_property_step5')

        try:
            property = Property.objects.get(id=property_id, owner=request.user)
        except Property.DoesNotExist:
            messages.error(request, "Annonce introuvable ou ne vous appartient pas.")
            return redirect('users:add_property_step5')

        property.status = 'PENDING'
        property.save()

        request.session.pop('add_property_draft', None)
        request.session.pop('current_property_id', None)

        messages.success(request, "Votre annonce a été soumise et sera visible après validation par un administrateur.")
        return redirect('users:seller_dashboard')