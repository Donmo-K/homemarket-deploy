from pathlib import Path
from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
SECRET_KEY = config('SECRET_KEY', default='django-insecure-key-for-dev')
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')

# Application definition
INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    'cloudinary_storage',  
    'cloudinary',       
    
    # Third party
    'django_extensions',
    
    # Local apps
    'core',
    'users',
    'properties',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'homemarket.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'homemarket.wsgi.application'

# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

import dj_database_url
import os

DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600,
    )
}

ALLOWED_HOSTS = ['*']



# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'  # ← ajoute ici

# Media files

MEDIA_ROOT = BASE_DIR / 'media'
MEDIA_URL = '/media/'

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': config('CLOUDINARY_CLOUD_NAME', default='dr4qmbhqx'),
    'API_KEY': config('CLOUDINARY_API_KEY', default='357633785845279'),
    'API_SECRET': config('CLOUDINARY_API_SECRET', default='Oo2Yj3kRHhlzwXhS4jbTj2irEN8'),
}
DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'




# Email
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=465, cast=int)
EMAIL_USE_TLS = False
EMAIL_USE_SSL = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_TIMEOUT = 10  

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'users.User'


LOGIN_URL = '/auth/login/'
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/'

# Jazzmin Settings
JAZZMIN_SETTINGS = {
    "site_title": "Home Market Admin",
    "site_header": "Home Market",
    "site_brand": "Home Market",
    "site_logo": "images/logo/logo.webp",
    "login_logo": "/static/images/logo/logo.webp",
    "login_logo_dark": None,
    "site_logo_classes": "img-fluid",
    "site_icon": "images/logo/logo.webp",
    "welcome_sign": "Welcome back to Home Market Admin",
    "copyright": "Home Market Ltd",
    "search_model": ["users.User", "properties.Property"],
    "user_avatar": None,
    "topmenu_links": [
        {"name": "Home", "url": "admin:index", "permissions": ["auth.view_user"]},
        {"model": "users.User"},
        {"name": "View Site", "url": "/", "new_window": True},
    ],
    "show_sidebar": True,
    "navigation_expanded": True,
    "hide_apps": [],
    "hide_models": [],
    "order_with_respect_to": ["users", "properties", "core"],
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user",
        "auth.Group": "fas fa-users",
        "users.User": "fas fa-user-tie",
        "properties.Property": "fas fa-home",
        "properties.Category": "fas fa-list",
        "properties.PropertyCategory": "fas fa-tags",
        "properties.PropertyFeature": "fas fa-star",
        "properties.Listing": "fas fa-clipboard-list",
        "core.Transaction": "fas fa-exchange-alt",
        "core.Payment": "fas fa-money-bill-wave",
        "core.Message": "fas fa-comment-dots",
        "core.Conversation": "fas fa-comments",
        "core.Review": "fas fa-star-half-alt",
        "core.Visit": "fas fa-calendar-check",
    },
    "default_icon_parents": "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",
    "related_modal_active": True,
    "custom_css": "css/custom_admin.css",
    "custom_js": None,
    "use_google_fonts_cdn": True,
    "show_ui_builder": False,
    "changeform_format": "horizontal_tabs",
}

PAYUNIT_API_KEY = config("PAYUNIT_API_KEY", default="sand_TU0ujsTNSyuBlEhDQBnbiSNM6jifgV")
PAYUNIT_BASE_URL = config("PAYUNIT_BASE_URL", default="https://gateway.payunit.net")
PAYUNIT_USERNAME = config("PAYUNIT_USERNAME", default="1e39f9b4-74d1-4ac9-9224-ce778a8ff544")
PAYUNIT_PASSWORD = config("PAYUNIT_PASSWORD", default="c5b8607b-7783-4ee8-86e7-4ea5f75617f7")
PAYUNIT_MODE = config("PAYUNIT_MODE", default="sandbox")
NGROK_URL = "https://unbeauteous-osculant-sheba.ngrok-free.dev"
CSRF_TRUSTED_ORIGINS = ["https://unbeauteous-osculant-sheba.ngrok-free.dev", "https://web-production-e6d90.up.railway.app",]

ALLOWED_HOSTS = ['*', "unbeauteous-osculant-sheba.ngrok-free.dev"]

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'core': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
