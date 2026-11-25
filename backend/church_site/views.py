from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .defaults import default_site_content
from .models import ChurchSiteContent
from .serializers import ChurchSiteContentSerializer


def get_site_content():
    site, _ = ChurchSiteContent.objects.get_or_create(
        pk=1,
        defaults={
            'draft_content': default_site_content(),
            'published_content': default_site_content(),
        },
    )
    return site


class PublicChurchSiteView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        site = get_site_content()
        return Response({
            'content': site.published_content,
            'published_at': site.published_at,
        })


class ChurchSiteEditorView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        site = get_site_content()
        return Response({
            'draft': site.draft_content,
            'published': site.published_content,
            'published_at': site.published_at,
            'updated_at': site.updated_at,
        })

    def put(self, request):
        serializer = ChurchSiteContentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        site = get_site_content()
        site.draft_content = serializer.validated_data
        site.save(update_fields=['draft_content', 'updated_at'])
        return Response({
            'draft': site.draft_content,
            'published_at': site.published_at,
            'updated_at': site.updated_at,
        })


class PublishChurchSiteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        get_site_content()
        with transaction.atomic():
            site = ChurchSiteContent.objects.select_for_update().get(pk=1)
            site.published_content = site.draft_content
            site.published_at = timezone.now()
            site.save(update_fields=['published_content', 'published_at', 'updated_at'])
        return Response({
            'published': site.published_content,
            'published_at': site.published_at,
        }, status=status.HTTP_200_OK)
