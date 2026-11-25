from urllib.parse import urlparse

from rest_framework import serializers


class StrictSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        if isinstance(data, dict):
            unexpected = set(data) - set(self.fields)
            if unexpected:
                raise serializers.ValidationError({
                    'detail': f'Unexpected fields: {", ".join(sorted(unexpected))}.'
                })
        return super().to_internal_value(data)


class SafeURLField(serializers.URLField):
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        if value and urlparse(value).scheme not in {'http', 'https'}:
            raise serializers.ValidationError('Use an HTTP or HTTPS URL.')
        return value


class AnnouncementSerializer(StrictSerializer):
    title = serializers.CharField(max_length=140)
    body = serializers.CharField(max_length=1200)
    date = serializers.CharField(max_length=80, allow_blank=True)


class ProgramSerializer(StrictSerializer):
    title = serializers.CharField(max_length=140)
    date = serializers.CharField(max_length=80, allow_blank=True)
    time = serializers.CharField(max_length=80, allow_blank=True)
    location = serializers.CharField(max_length=180, allow_blank=True)
    description = serializers.CharField(max_length=1200, allow_blank=True)


class ShopItemSerializer(StrictSerializer):
    name = serializers.CharField(max_length=120)
    description = serializers.CharField(max_length=500, allow_blank=True)
    image_url = SafeURLField(max_length=500, allow_blank=True)
    url = SafeURLField(max_length=500, allow_blank=True)


class ChurchSiteContentSerializer(StrictSerializer):
    church_name = serializers.CharField(max_length=120)
    tagline = serializers.CharField(max_length=180, allow_blank=True)
    location = serializers.CharField(max_length=180, allow_blank=True)
    logo_url = SafeURLField(max_length=500, allow_blank=True)
    hero_title = serializers.CharField(max_length=180)
    hero_body = serializers.CharField(max_length=1200, allow_blank=True)
    hero_image_url = SafeURLField(max_length=500, allow_blank=True)
    history = serializers.CharField(max_length=6000, allow_blank=True)
    statement_of_faith = serializers.CharField(max_length=6000, allow_blank=True)
    announcements = serializers.ListField(
        child=AnnouncementSerializer(),
        max_length=20,
    )
    programs = serializers.ListField(
        child=ProgramSerializer(),
        max_length=20,
    )
    shop_url = SafeURLField(max_length=500, allow_blank=True)
    shop_intro = serializers.CharField(max_length=600, allow_blank=True)
    shop_items = serializers.ListField(
        child=ShopItemSerializer(),
        max_length=20,
    )
    address = serializers.CharField(max_length=300, allow_blank=True)
    contact_email = serializers.EmailField(max_length=254, allow_blank=True)
    contact_phone = serializers.CharField(max_length=60, allow_blank=True)
    facebook_url = SafeURLField(max_length=500, allow_blank=True)
    youtube_url = SafeURLField(max_length=500, allow_blank=True)
    primary_color = serializers.RegexField(r'^#[0-9a-fA-F]{6}$')
    accent_color = serializers.RegexField(r'^#[0-9a-fA-F]{6}$')
