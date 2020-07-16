from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from notifications.settings import CONFIG_DEFAULTS

CONFIG_DEFAULTS.update({'USE_JSONFIELD': True})

OPENWISP_NOTIFICATION_EMAIL_TEMPLATE = getattr(
    settings,
    'OPENWISP_NOTIFICATION_EMAIL_TEMPLATE',
    'openwisp_notifications/email_template.html',
)

OPENWISP_NOTIFICATION_EMAIL_LOGO = getattr(
    settings,
    'OPENWISP_NOTIFICATION_EMAIL_LOGO',
    'https://raw.githubusercontent.com/openwisp/openwisp-notifications/master/openwisp_notifications/'
    'static/openwisp_notifications/images/openwisp-logo.png',
)

OPENWISP_NOTIFICATION_HTML_EMAIL = getattr(
    settings, 'OPENWISP_NOTIFICATION_HTML_EMAIL', True
)

OPENWISP_NOTIFICATION_HOST = getattr(settings, 'OPENWISP_NOTIFICATION_HOST', None)
OPENWISP_NOTIFICATION_SOUND = getattr(settings, 'OPENWISP_NOTIFICATION_SOUND', None)

# Check if CORS is configured
if OPENWISP_NOTIFICATION_HOST:
    if not (
        'corsheaders' in settings.INSTALLED_APPS
        and 'corsheaders.middleware.CorsMiddleware' in settings.MIDDLEWARE
    ):
        raise ImproperlyConfigured(
            'Configure "django-cors-headers" for using "OPENWISP_NOTIFICATION_HOST" setting.'
        )


def get_config():
    user_config = getattr(settings, 'OPENWISP_NOTIFICATIONS_CONFIG', {})
    config = CONFIG_DEFAULTS.copy()
    config.update(user_config)
    return config
