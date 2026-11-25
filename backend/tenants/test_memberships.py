from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from tenants.models import Tenant, TenantMembership


class TenantMembershipAdminTests(APITestCase):
    url = '/api/tenant/memberships/'

    def setUp(self):
        self.tenant = Tenant.objects.get(slug='default')
        self.owner = self.create_member('owner', TenantMembership.ROLE_OWNER)
        self.admin = self.create_member('admin', TenantMembership.ROLE_ADMIN)
        self.manager = self.create_member('manager', TenantMembership.ROLE_MANAGER)
        self.viewer = self.create_member('viewer', TenantMembership.ROLE_VIEWER)

    def create_member(self, username, role):
        user = User.objects.create_user(username=username)
        membership = TenantMembership.objects.create(
            tenant=self.tenant,
            user=user,
            role=role,
        )
        return membership

    def authenticate(self, membership):
        self.client.force_authenticate(user=membership.user)

    def test_owner_lists_only_current_tenant_memberships(self):
        other_tenant = Tenant.objects.create(name='Other church', slug='other-church')
        other_user = User.objects.create_user(username='other-tenant-user')
        TenantMembership.objects.create(tenant=other_tenant, user=other_user)
        self.authenticate(self.owner)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['current_role'], TenantMembership.ROLE_OWNER)
        self.assertEqual(
            {member['username'] for member in response.data['members']},
            {'owner', 'admin', 'manager', 'viewer'},
        )

    def test_owner_can_change_member_role(self):
        self.authenticate(self.owner)

        response = self.client.patch(
            f'{self.url}{self.manager.pk}/',
            {'role': TenantMembership.ROLE_VIEWER},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.manager.refresh_from_db()
        self.assertEqual(self.manager.role, TenantMembership.ROLE_VIEWER)

    def test_admin_can_manage_regular_member_but_not_admin(self):
        self.authenticate(self.admin)

        response = self.client.patch(
            f'{self.url}{self.manager.pk}/',
            {'is_active': False},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        protected_response = self.client.patch(
            f'{self.url}{self.owner.pk}/',
            {'is_active': False},
            format='json',
        )
        self.assertEqual(protected_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_cannot_assign_owner_role(self):
        self.authenticate(self.admin)

        for role in (TenantMembership.ROLE_OWNER, TenantMembership.ROLE_ADMIN):
            response = self.client.patch(
                f'{self.url}{self.manager.pk}/',
                {'role': role},
                format='json',
            )
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_last_active_owner_cannot_be_deactivated(self):
        self.admin.delete()
        self.authenticate(self.owner)

        response = self.client.patch(
            f'{self.url}{self.owner.pk}/',
            {'is_active': False},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.owner.refresh_from_db()
        self.assertTrue(self.owner.is_active)

    def test_member_cannot_deactivate_their_own_membership(self):
        self.authenticate(self.owner)

        response = self.client.patch(
            f'{self.url}{self.owner.pk}/',
            {'is_active': False},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
