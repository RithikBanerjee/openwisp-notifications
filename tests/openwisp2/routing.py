from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from openwisp_notifications.websockets import routing as ws_routing

application = ProtocolTypeRouter(
    {'websocket': AuthMiddlewareStack(URLRouter(ws_routing.websocket_urlpatterns))}
)
