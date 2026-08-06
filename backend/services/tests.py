from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Service


class ServiceCheckinQRTests(APITestCase):
    """Admin endpoints: GET /services/{id}/checkin_qr/ and POST rotate_checkin_token"""

    def setUp(self):
        self.user = User.objects.create_user(username='admin', password='testpass123')
        self.client.force_authenticate(user=self.user)
        self.service = Service.objects.create(
            name='Midweek Service',
            date=timezone.now().date(),
            start_time='18:00:00',
            end_time='20:00:00',
        )

    def test_checkin_qr_requires_authentication(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get(f'/api/services/{self.service.id}/checkin_qr/')
        # DRF returns 401 (NotAuthenticated) when JWT/Session auth is configured
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_checkin_qr_returns_url_and_image(self):
        resp = self.client.get(f'/api/services/{self.service.id}/checkin_qr/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('checkin_url', resp.data)
        self.assertIn('qr_code_image', resp.data)
        self.assertIn('qr_code_base64', resp.data)
        self.assertTrue(resp.data['checkin_url'].startswith('http'))

    def test_get_checkin_qr_generates_token_lazily(self):
        self.assertIsNone(self.service.checkin_token)
        self.client.get(f'/api/services/{self.service.id}/checkin_qr/')
        self.service.refresh_from_db()
        self.assertIsNotNone(self.service.checkin_token)

    def test_checkin_url_contains_token(self):
        resp = self.client.get(f'/api/services/{self.service.id}/checkin_qr/')
        self.service.refresh_from_db()
        self.assertIn(self.service.checkin_token, resp.data['checkin_url'])

    def test_rotate_checkin_token_invalidates_old_qr(self):
        first = self.client.get(f'/api/services/{self.service.id}/checkin_qr/').data
        self.service.refresh_from_db()
        old_token = self.service.checkin_token

        resp = self.client.post(f'/api/services/{self.service.id}/rotate_checkin_token/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.service.refresh_from_db()
        self.assertNotEqual(old_token, self.service.checkin_token)
        self.assertNotEqual(first['checkin_url'], resp.data['checkin_url'])
        self.assertIn('checkin_url', resp.data)

    def test_recurring_template_has_no_checkin_qr(self):
        parent = Service.objects.create(
            name='Weekly Template',
            date=None,
            start_time='09:00:00',
            is_recurring=True,
            recurrence_pattern='weekly',
        )
        resp = self.client.get(f'/api/services/{parent.id}/checkin_qr/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
