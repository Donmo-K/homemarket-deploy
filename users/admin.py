from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Profile, SellerVerification

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'user_type', 'is_staff', 'is_active')
    list_filter = ('user_type', 'is_staff', 'is_superuser', 'is_active')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'phone_number', 'address')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
        ('User Role', {'fields': ('user_type',)}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password', 'user_type'),
        }),
    )
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)

@admin.register(SellerVerification)
class SellerVerificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'is_verified', 'created_at')
    list_filter = ('status', 'is_verified')
    search_fields = ('user__email',)
    actions = ['approve_verification', 'reject_verification']

    def save_model(self, request, obj, form, change):
        # ✅ Synchronise is_verified avec status automatiquement
        if obj.status == 'APPROVED':
            obj.is_verified = True
        else:
            obj.is_verified = False
        super().save_model(request, obj, form, change)

    def approve_verification(self, request, queryset):
        queryset.update(status='APPROVED', is_verified=True)
    approve_verification.short_description = "✅ Approve selected verifications"

    def reject_verification(self, request, queryset):
        queryset.update(status='REJECTED', is_verified=False)
    reject_verification.short_description = "❌ Reject selected verifications"