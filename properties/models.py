from django.db import models
from core.models import HomeMarketBase
from django.conf import settings
from global_data.enum import ListingStatus, PropertyType
from django.utils.text import slugify

class PropertyCategory(HomeMarketBase):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "Property Categories"

class PropertyFeature(HomeMarketBase):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=100, blank=True, null=True) # CSS class or path

    def __str__(self):
        return self.name

class Property(HomeMarketBase):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='properties')
    category = models.ForeignKey(PropertyCategory, on_delete=models.PROTECT, related_name='properties')
    features = models.ManyToManyField(PropertyFeature, blank=True, related_name='properties')
    property_type = models.CharField(max_length=20, choices=PropertyType.choices)
    title = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=12, decimal_places=2, help_text="Base price or estimated value")
    bedrooms = models.PositiveIntegerField(default=0)
    bathrooms = models.PositiveIntegerField(default=0)
    area_sqm = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    
    def __str__(self):
        return self.title
    
    class Meta:
        verbose_name_plural = "Properties"

class PropertyLocation(HomeMarketBase):
    property = models.OneToOneField(Property, on_delete=models.CASCADE, related_name='location')
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.city}, {self.country}"

class PropertyImage(HomeMarketBase):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='properties/')
    is_main = models.BooleanField(default=False)
    
    def __str__(self):
        return f"Image for {self.property.title}"

class Listing(HomeMarketBase):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='listings')
    agent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='listings', null=True, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=ListingStatus.choices, default=ListingStatus.ACTIVE)
    
    def __str__(self):
        return f"Listing: {self.property.title} ({self.status})"

class ListingStatusModel(HomeMarketBase): 
    # User listed 'ListingStatus' as a model? 
    # Usually it's a choice field, but if they want a history or config, it's a model.
    # I used choices in Enum. I'll stick to that unless user insists.
    # The list "ListingStatus" under "Property & Listings" usually implies an Enum or State model.
    # I'll stick to the Enum on Listing for now.
    pass
