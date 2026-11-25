from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from members.models import Member
from tenants.context import (
    TenantContextError,
    reset_current_tenant,
    set_current_tenant,
    tenant_context,
)
from tenants.models import Tenant, TenantMembership


class TenantScopedManagerTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.default_tenant = Tenant.objects.get(slug='default')
        cls.other_tenant = Tenant.objects.create(name='Other Church', slug='other-church')
        cls.other_tenant_admin = User.objects.create_user(
            username='other-admin',
            password='test-password',
        )
        TenantMembership.objects.create(
            tenant=cls.other_tenant,
            user=cls.other_tenant_admin,
            role=TenantMembership.ROLE_ADMIN,
        )
        cls.other_tenant_viewer = User.objects.create_user(
            username='other-viewer',
            password='test-password',
        )
        TenantMembership.objects.create(
            tenant=cls.other_tenant,
            user=cls.other_tenant_viewer,
            role=TenantMembership.ROLE_VIEWER,
        )
        with tenant_context(cls.default_tenant):
            cls.default_member = Member.objects.create(
                full_name='Default member',
                member_id='DEFAULT-1',
            )
        with tenant_context(cls.other_tenant):
            cls.other_member = Member.objects.create(
                full_name='Other member',
                member_id='OTHER-1',
            )

    def test_default_manager_only_returns_current_tenant_rows(self):
        with tenant_context(self.other_tenant):
            self.assertEqual(
                list(Member.objects.values_list('member_id', flat=True)),
                ['OTHER-1'],
            )
            with self.assertRaises(Member.DoesNotExist):
                Member.objects.get(pk=self.default_member.pk)

    def test_save_rejects_writes_to_another_tenant(self):
        member = Member.all_tenants.get(pk=self.default_member.pk)
        member.full_name = 'Cross-tenant update'

        with tenant_context(self.other_tenant):
            with self.assertRaises(ValidationError):
                member.save()

        member.refresh_from_db()
        self.assertEqual(member.full_name, 'Default member')

    def test_member_ids_are_unique_per_tenant(self):
        with tenant_context(self.other_tenant):
            duplicate = Member.objects.create(
                full_name='Other member with same ID',
                member_id='DEFAULT-1',
            )

        self.assertEqual(duplicate.member_id, self.default_member.member_id)

    def test_members_api_only_returns_the_selected_tenant(self):
        client = APIClient()
        client.force_authenticate(user=self.other_tenant_admin)

        response = client.get(
            '/api/members/',
            HTTP_X_TENANT_SLUG=self.other_tenant.slug,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [member['member_id'] for member in response.data['results']],
            ['OTHER-1'],
        )

    def test_members_api_hides_foreign_tenant_detail(self):
        client = APIClient()
        client.force_authenticate(user=self.other_tenant_admin)

        response = client.get(
            f'/api/members/{self.default_member.pk}/',
            HTTP_X_TENANT_SLUG=self.other_tenant.slug,
        )

        self.assertEqual(response.status_code, 404)

    def test_viewer_can_read_but_cannot_write(self):
        client = APIClient()
        client.force_authenticate(user=self.other_tenant_viewer)

        list_response = client.get(
            '/api/members/',
            HTTP_X_TENANT_SLUG=self.other_tenant.slug,
        )
        create_response = client.post(
            '/api/members/',
            {'full_name': 'Viewer-created member'},
            format='json',
            HTTP_X_TENANT_SLUG=self.other_tenant.slug,
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(create_response.status_code, 403)

    def test_viewer_cannot_read_tenant_invitation_codes(self):
        client = APIClient()
        client.force_authenticate(user=self.other_tenant_viewer)

        response = client.get(
            '/api/members/invitations/',
            HTTP_X_TENANT_SLUG=self.other_tenant.slug,
        )

        self.assertEqual(response.status_code, 403)

    def test_member_csv_preview_and_import_are_tenant_scoped(self):
        client = APIClient()
        client.force_authenticate(user=self.other_tenant_admin)
        csv_content = (
            'member_id,full_name,email,phone,is_visitor\n'
            'OTHER-2,Imported Member,imported@gmail.com,1234567890,false\n'
        ).encode()

        preview = client.post(
            '/api/members/import-preview/',
            {'file': SimpleUploadedFile('members.csv', csv_content, content_type='text/csv')},
            format='multipart',
            HTTP_X_TENANT_SLUG=self.other_tenant.slug,
        )
        self.assertEqual(preview.status_code, 200, preview.data)
        self.assertEqual(preview.data['valid_count'], 1)
        self.assertEqual(Member.all_tenants.filter(tenant=self.other_tenant).count(), 1)

        imported = client.post(
            '/api/members/import-csv/',
            {'file': SimpleUploadedFile('members.csv', csv_content, content_type='text/csv')},
            format='multipart',
            HTTP_X_TENANT_SLUG=self.other_tenant.slug,
        )
        self.assertEqual(imported.status_code, 201, imported.data)
        self.assertEqual(imported.data['imported_count'], 1)
        self.assertEqual(Member.all_tenants.filter(tenant=self.other_tenant).count(), 2)
        self.assertEqual(Member.all_tenants.filter(tenant=self.default_tenant).count(), 1)

    def test_member_csv_import_rejects_all_rows_before_writing_if_any_are_invalid(self):
        client = APIClient()
        client.force_authenticate(user=self.other_tenant_admin)
        csv_content = (
            'member_id,full_name,email,phone,is_visitor\n'
            'OTHER-2,Valid Member,valid@gmail.com,1234567890,false\n'
            'OTHER-3,Invalid Member,not-an-email,1234567890,false\n'
        ).encode()

        response = client.post(
            '/api/members/import-csv/',
            {'file': SimpleUploadedFile('members.csv', csv_content, content_type='text/csv')},
            format='multipart',
            HTTP_X_TENANT_SLUG=self.other_tenant.slug,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Member.all_tenants.filter(tenant=self.other_tenant).count(), 1)

    def test_member_csv_export_only_contains_selected_tenant(self):
        client = APIClient()
        client.force_authenticate(user=self.other_tenant_admin)

        response = client.get(
            '/api/members/export-csv/',
            HTTP_X_TENANT_SLUG=self.other_tenant.slug,
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('OTHER-1', response.content.decode())
        self.assertNotIn('DEFAULT-1', response.content.decode())

    @override_settings(TENANT_ALLOW_DEFAULT_CONTEXT=False)
    def test_default_manager_requires_tenant_context_in_production_mode(self):
        token = set_current_tenant(None)
        try:
            with self.assertRaises(TenantContextError):
                Member.objects.count()
            self.assertEqual(Member.all_tenants.count(), 2)
        finally:
            reset_current_tenant(token)
