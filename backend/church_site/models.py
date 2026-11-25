from django.db import models

from .defaults import default_site_content


class ChurchSiteContent(models.Model):
    draft_content = models.JSONField(default=default_site_content)
    published_content = models.JSONField(default=default_site_content)
    published_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'church website content'
        verbose_name_plural = 'church website content'

    def __str__(self):
        return 'Church website content'
