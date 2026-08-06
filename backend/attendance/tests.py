from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from members.models import Member
from services.models import Service


def make_service(**overrides):
    now = timezone.localtime()
    defaults = {
        'name': 'Sunday Service',
        'date': now.date(),
        'start_time': now.replace(microsecond=0).time(),
        'end_time': (now + timedelta(hours=1)).replace(microsecond=0).time(),
    }
    defaults.update(overrides)
    return Service.objects.create(**defaults)


class PublicCheckInInfoTests(APITestCase):
    """GET /api/public/checkin/?token=..."""

    def setUp(self):
        self.service = make_service()
        self.token = self.service.get_or_create_checkin_token()

    def test_valid_token_returns_service_info(self):
        resp = self.client.get(f'/api/public/checkin/?token={self.token}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['valid'])
        self.assertEqual(resp.data['service']['name'], 'Sunday Service')
        self.assertIn('checkin_open', resp.data)
        self.assertIn('church_name', resp.data)

    def test_invalid_token_rejected(self):
        resp = self.client.get('/api/public/checkin/?token=not-a-real-token')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(resp.data['valid'])

    def test_missing_token_rejected(self):
        resp = self.client.get('/api/public/checkin/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_recurring_template_rejected(self):
        parent = Service.objects.create(
            name='Weekly Template',
            date=None,
            start_time='09:00:00',
            is_recurring=True,
            recurrence_pattern='weekly',
        )
        token = parent.get_or_create_checkin_token()
        resp = self.client.get(f'/api/public/checkin/?token={token}')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_info_with_member_id_returns_confirmation(self):
        Member.objects.create(
            member_id='WIS-2026-0001',
            full_name='Test Member',
            is_visitor=False,
        )
        resp = self.client.get(f'/api/public/checkin/?token={self.token}&member_id=0001')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['member_match']['full_name'], 'Test Member')
        self.assertEqual(resp.data['member_match']['member_id'], 'WIS-2026-0001')

    def test_get_info_with_member_id_no_match(self):
        resp = self.client.get(f'/api/public/checkin/?token={self.token}&member_id=9999')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('error', resp.data['member_match'])

    def test_get_info_without_member_id_has_no_match(self):
        resp = self.client.get(f'/api/public/checkin/?token={self.token}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNone(resp.data['member_match'])


class PublicCheckInSubmitTests(APITestCase):
    """POST /api/public/checkin/"""

    def setUp(self):
        self.member = Member.objects.create(
            member_id='WIS-2026-0001',
            full_name='Test Member',
            is_visitor=False,
        )
        self.service = make_service()
        self.token = self.service.get_or_create_checkin_token()

    def test_checkin_success_creates_attendance(self):
        resp = self.client.post(
            '/api/public/checkin/',
            {'token': self.token, 'member_id': 'WIS-2026-0001'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data['success'])
        self.member.refresh_from_db()
        self.assertEqual(self.member.consecutive_absences, 0)
        self.assertEqual(self.member.last_attendance_date, timezone.now().date())

    def test_checkin_duplicate_not_created_twice(self):
        self.client.post(
            '/api/public/checkin/',
            {'token': self.token, 'member_id': 'WIS-2026-0001'},
            format='json',
        )
        resp = self.client.post(
            '/api/public/checkin/',
            {'token': self.token, 'member_id': 'WIS-2026-0001'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data['success'])
        self.assertIn('already checked in', resp.data['message'])

    def test_checkin_member_not_found(self):
        resp = self.client.post(
            '/api/public/checkin/',
            {'token': self.token, 'member_id': 'DOES-NOT-EXIST'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_checkin_missing_member_id(self):
        resp = self.client.post(
            '/api/public/checkin/',
            {'token': self.token, 'member_id': ''},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_checkin_visitor_blocked(self):
        visitor = Member.objects.create(
            member_id='VISITOR-1',
            full_name='Visitor',
            is_visitor=True,
        )
        resp = self.client.post(
            '/api/public/checkin/',
            {'token': self.token, 'member_id': 'VISITOR-1'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('visitor', resp.data['message'].lower())

    def test_checkin_window_closed(self):
        # Service happened two days ago — outside the grace window
        self.service.date = timezone.now().date() - timedelta(days=2)
        self.service.save()
        resp = self.client.post(
            '/api/public/checkin/',
            {'token': self.token, 'member_id': 'WIS-2026-0001'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('checkin_message', resp.data)

    def test_checkin_after_attendance_taken_blocked(self):
        # Simulate staff having marked attendance (manual/auto)
        from attendance.models import Attendance

        Attendance.objects.create(
            member=self.member,
            service=self.service,
            status='present',
            marked_by='manual',
        )
        resp = self.client.post(
            '/api/public/checkin/',
            {'token': self.token, 'member_id': 'WIS-2026-0001'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Attendance for this service has been taken', resp.data['message'])

    def test_checkin_by_last_four_digits(self):
        """Members can type only the last 4 digits of their ID (e.g. 0001)."""
        resp = self.client.post(
            '/api/public/checkin/',
            {'token': self.token, 'member_id': '0001'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data['success'])
        self.assertEqual(resp.data['member_name'], 'Test Member')

    def test_checkin_by_full_id_still_works(self):
        """Entering the full ID keeps working alongside the 4-digit shortcut."""
        resp = self.client.post(
            '/api/public/checkin/',
            {'token': self.token, 'member_id': 'wis-2026-0001'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data['success'])

    def test_checkin_by_last_four_collision_rejected(self):
        """When two members share the same last-4 digits, ask for the full ID."""
        from members.models import Member

        Member.objects.create(
            member_id='WIS-2025-0001',
            full_name='Other Member',
            is_visitor=False,
        )
        resp = self.client.post(
            '/api/public/checkin/',
            {'token': self.token, 'member_id': '0001'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Multiple members', resp.data['error'])

    def test_checkin_by_last_four_no_match(self):
        resp = self.client.post(
            '/api/public/checkin/',
            {'token': self.token, 'member_id': '9999'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
