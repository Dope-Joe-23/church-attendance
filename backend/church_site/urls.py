from django.urls import path

from .views import (
    ChurchSiteEditorView,
    PublishChurchSiteView,
    PublicChurchSiteView,
)

urlpatterns = [
    path('public/', PublicChurchSiteView.as_view(), name='public-church-site'),
    path('editor/', ChurchSiteEditorView.as_view(), name='church-site-editor'),
    path('editor/publish/', PublishChurchSiteView.as_view(), name='publish-church-site'),
]
