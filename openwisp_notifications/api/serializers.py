from django.urls import reverse
from openwisp_notifications.swapper import load_model
from openwisp_notifications.utils import _get_absolute_url
from rest_framework import serializers

Notification = load_model('Notification')


class ContentTypeField(serializers.Field):
    def to_representation(self, obj):
        return obj.model


class NotificationSerializer(serializers.ModelSerializer):
    target_object_url = serializers.SerializerMethodField()
    actor_content_type = ContentTypeField(read_only=True)
    target_content_type = ContentTypeField(read_only=True)
    action_object_content_type = ContentTypeField(read_only=True)

    class Meta:
        model = Notification
        exclude = ['description', 'deleted', 'public']
        extra_fields = ['message', 'email_subject', 'target_object_url']

    def get_field_names(self, declared_fields, info):
        model_fields = super().get_field_names(declared_fields, info)
        return model_fields + self.Meta.extra_fields

    def get_target_object_url(self, obj):
        url = reverse(
            f'admin:{Notification._meta.app_label}_{Notification._meta.model_name}_change',
            args=(obj.id,),
        )
        return _get_absolute_url(url)


class NotificationListSerializer(NotificationSerializer):
    class Meta(NotificationSerializer.Meta):
        fields = ['id', 'message', 'unread', 'target_object_url', 'email_subject']
        exclude = None
