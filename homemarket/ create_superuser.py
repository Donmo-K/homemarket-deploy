import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'homemarket.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

try:
    if not User.objects.filter(email='admin@homemarket.com').exists():
        user = User(
            email='admin@homemarket.com',
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        user.set_password('Admin2026')
        user.save()
        print("Superuser créé !")
    else:
        print("Superuser existe déjà.")
except Exception as e:
    print(f"Erreur: {e}")