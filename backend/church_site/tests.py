from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from .defaults import default_site_content
from .models import ChurchSiteContent


class ChurchSiteContentApiTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='site-admin',
            password='test-password',
            is_staff=True,
        )
        self.viewer = User.objects.create_user(username='site-viewer', password='test-password')
        ChurchSiteContent.objects.all().delete()

    def client_for(self, user=None):
        client = APIClient()
        if user:
            client.force_authenticate(user=user)
        return client

    def test_public_page_reads_only_published_content(self):
        client = self.client_for()
        response = client.get('/api/site/public/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['content'], default_site_content())

    def test_admin_can_save_draft_without_changing_published_content(self):
        client = self.client_for(self.admin)
        draft = default_site_content()
        draft['hero_title'] = 'A new welcome'

        response = client.put(
            '/api/site/editor/',
            draft,
            format='json',
        )
        public_response = self.client_for().get('/api/site/public/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['draft']['hero_title'], 'A new welcome')
        self.assertEqual(public_response.data['content'], default_site_content())

    def test_admin_can_publish_saved_draft(self):
        client = self.client_for(self.admin)
        draft = default_site_content()
        draft['hero_title'] = 'Published welcome'
        client.put(
            '/api/site/editor/',
            draft,
            format='json',
        )

        response = client.post(
            '/api/site/editor/publish/',
            {},
            format='json',
        )
        public_response = self.client_for().get('/api/site/public/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(public_response.data['content']['hero_title'], 'Published welcome')

    def test_viewer_cannot_edit_the_church_website(self):
        response = self.client_for(self.viewer).get(
            '/api/site/editor/',
        )

        self.assertEqual(response.status_code, 403)

    def test_invalid_theme_color_is_rejected(self):
        draft = default_site_content()
        draft['primary_color'] = 'purple'

        response = self.client_for(self.admin).put(
            '/api/site/editor/',
            draft,
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('primary_color', response.data)
