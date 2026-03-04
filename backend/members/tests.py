from django.test import TestCase
from .models import Member
import base64
from rest_framework.test import APIRequestFactory
from .views import MemberViewSet


class QRCodeDataTests(TestCase):
    def test_qr_code_data_generated(self):
        # creating a member should automatically generate base64 QR data
        m = Member.objects.create(full_name="Test User")
        self.assertIsNotNone(m.qr_code_data)
        # ensure it's valid PNG base64
        decoded = base64.b64decode(m.qr_code_data)
        self.assertTrue(decoded.startswith(b"\x89PNG"))

    def test_qr_code_api_returns_base64(self):
        m = Member.objects.create(full_name="API User")
        self.assertTrue(m.qr_code_data)

        # use API client so URL routing matches actual endpoints
        from rest_framework.test import APIClient
        client = APIClient()
        response = client.get(f'/api/members/{m.pk}/qr_code/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('qr_code_base64', response.data)

