from django.contrib.auth.models import AnonymousUser, User
from django.http import HttpResponse
from django.test import RequestFactory, TestCase, override_settings

from tenants.context import current_tenant
from tenants.middleware import tenant_resolution_middleware
from tenants.models import Tenant


@override_settings(ALLOWED_HOSTS=[
    'testserver',
    'church.localhost',
    'unknown.localhost',
    'custom.example.com',
])
class TenantResolutionMiddlewareTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.default_tenant = Tenant.objects.get(slug='default')
        self.church = Tenant.objects.create(
            name='Church',
            slug='church',
            subdomain='church',
        )
        self.custom_domain_tenant = Tenant.objects.create(
            name='Custom Domain Church',
            slug='custom-domain-church',
            custom_domain='custom.example.com',
        )

    def get_response(self, request):
        self.assertEqual(request.tenant, current_tenant())
        return HttpResponse('ok')

    def test_resolves_tenant_from_subdomain(self):
        request = self.factory.get('/', HTTP_HOST='church.localhost')
        request.user = AnonymousUser()

        response = tenant_resolution_middleware(self.get_response)(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(request.tenant, self.church)
        self.assertIsNone(current_tenant())

    def test_resolves_tenant_from_custom_domain(self):
        request = self.factory.get('/', HTTP_HOST='custom.example.com')
        request.user = AnonymousUser()

        response = tenant_resolution_middleware(self.get_response)(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(request.tenant, self.custom_domain_tenant)

    def test_resolves_tenant_from_api_header(self):
        request = self.factory.get('/', HTTP_HOST='testserver', HTTP_X_TENANT_SLUG='church')
        request.user = AnonymousUser()

        response = tenant_resolution_middleware(self.get_response)(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(request.tenant, self.church)

    def test_resolves_tenant_from_query_parameter(self):
        request = self.factory.get(
            '/api/public/checkin/?tenant=church',
            HTTP_HOST='testserver',
        )
        request.user = AnonymousUser()

        response = tenant_resolution_middleware(self.get_response)(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(request.tenant, self.church)

    def test_tenant_query_parameter_does_not_select_other_api_tenants(self):
        request = self.factory.get('/api/members/?tenant=church', HTTP_HOST='testserver')
        request.user = AnonymousUser()

        response = tenant_resolution_middleware(self.get_response)(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(request.tenant, self.default_tenant)

    async def test_async_request_keeps_tenant_context_during_response(self):
        request = self.factory.get('/', HTTP_HOST='church.localhost')
        request.user = AnonymousUser()

        async def get_async_response(async_request):
            self.assertEqual(async_request.tenant, self.church)
            self.assertEqual(current_tenant(), self.church)
            return HttpResponse('ok')

        response = await tenant_resolution_middleware(get_async_response)(request)

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(current_tenant())

    def test_unknown_tenant_returns_not_found(self):
        request = self.factory.get('/', HTTP_HOST='unknown.localhost')
        request.user = AnonymousUser()

        response = tenant_resolution_middleware(self.get_response)(request)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.content, b'{"detail": "Tenant not found"}')

    def test_base_host_uses_configured_default_tenant(self):
        request = self.factory.get('/', HTTP_HOST='testserver')
        request.user = AnonymousUser()

        response = tenant_resolution_middleware(self.get_response)(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(request.tenant, self.default_tenant)

    def test_impersonation_requires_platform_superuser(self):
        request = self.factory.get('/?impersonate_tenant=church', HTTP_HOST='testserver')
        request.user = User.objects.create_user(username='regular-user')

        response = tenant_resolution_middleware(self.get_response)(request)

        self.assertEqual(response.status_code, 403)
