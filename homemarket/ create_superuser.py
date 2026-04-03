import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'homemarket.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

if not User.objects.filter(email='admin@homemarket.com').exists():
    User.objects.create_superuser(
        username='admin',
        email='admin@homemarket.com',
        password='Admin2026'
    )
    print("Superuser créé !")
else:
    print("Superuser existe déjà.")