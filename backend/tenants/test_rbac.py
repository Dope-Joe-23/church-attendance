from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from members.models import InvitationCode
from tenants.context import tenant_context
from tenants.models import Tenant, TenantMembership


class TenantInvitationRoleTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.default_tenant = Tenant.objects.get(slug='default')
        cls.other_tenant = Tenant.objects.create(
            name='Other Church',
            slug='other-church',
        )
        cls.admin = User.objects.create_user(
            username='church-admin',
            password='test-password',
        )
        TenantMembership.objects.create(
            tenant=cls.other_tenant,
            user=cls.admin,
            role=TenantMembership.ROLE_ADMIN,
        )
        with tenant_context(cls.other_tenant):
            cls.invitation = InvitationCode.objects.create(
                code='other-tenant-invite',
                created_by=cls.admin,
                expires_at=timezone.now() + timedelta(days=1),
                role=TenantMembership.ROLE_VIEWER,
            )

    def test_invitation_is_not_visible_from_another_tenant(self):
        with tenant_context(self.default_tenant):
            self.assertFalse(
                InvitationCode.objects.filter(code=self.invitation.code).exists()
            )

    def test_signup_uses_invitation_tenant_and_role(self):
        client = APIClient()

        response = client.post(
            '/api/auth/register/',
            {
                'username': 'new-church-user',
                'email': 'new-church-user@gmail.com',
                'password': 'Strong-password-123!',
                'password_confirm': 'Strong-password-123!',
                'invitation_code': self.invitation.code,
            },
            format='json',
            HTTP_X_TENANT_SLUG=self.other_tenant.slug,
        )

        self.assertEqual(response.status_code, 201, response.data)
        membership = TenantMembership.objects.get(
            tenant=self.other_tenant,
            user__username='new-church-user',
        )
        self.assertEqual(membership.role, TenantMembership.ROLE_VIEWER)
        self.assertFalse(
            TenantMembership.objects.filter(
                tenant=self.default_tenant,
                user=membership.user,
            ).exists()
        )

    def test_invitation_cannot_be_redeemed_from_another_tenant(self):
        response = APIClient().post(
            '/api/auth/register/',
            {
                'username': 'wrong-tenant-user',
                'email': 'wrong-tenant-user@gmail.com',
                'password': 'Strong-password-123!',
                'password_confirm': 'Strong-password-123!',
                'invitation_code': self.invitation.code,
            },
            format='json',
            HTTP_X_TENANT_SLUG=self.default_tenant.slug,
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username='wrong-tenant-user').exists())

    def test_tenant_admin_cannot_create_administrator_invitation(self):
        client = APIClient()
        client.force_authenticate(user=self.admin)
        expires_at = (timezone.now() + timedelta(days=1)).isoformat()

        response = client.post(
            '/api/members/invitations/',
            {'expires_at': expires_at, 'role': TenantMembership.ROLE_ADMIN},
            format='json',
            HTTP_X_TENANT_SLUG=self.other_tenant.slug,
        )
        bulk_response = client.post(
            '/api/members/invitations/generate_bulk/',
            {
                'count': 1,
                'expires_at': expires_at,
                'role': TenantMembership.ROLE_ADMIN,
            },
            format='json',
            HTTP_X_TENANT_SLUG=self.other_tenant.slug,
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(bulk_response.status_code, 403)
