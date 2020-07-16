from openwisp_notifications import settings as app_settings


def notification_api_settings(request):
    return {
        'OPENWISP_NOTIFICATION_HOST': app_settings.OPENWISP_NOTIFICATION_HOST,
        'OPENWISP_NOTIFICATION_SOUND': app_settings.OPENWISP_NOTIFICATION_SOUND,
    }
