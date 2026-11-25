from asgiref.sync import iscoroutinefunction, sync_to_async
from django.conf import settings
from django.http import JsonResponse
from django.http.request import split_domain_port
from django.utils.decorators import sync_and_async_middleware

from .context import reset_current_tenant, set_current_tenant
from .models import Tenant


def _host_tenant(request):
    hostname, _ = split_domain_port(request.get_host())
    hostname = hostname.lower().rstrip('.')

    tenant = Tenant.objects.filter(custom_domain__iexact=hostname).first()
    if tenant:
        return tenant, True

    subdomain = None
    if hostname.endswith('.localhost'):
        subdomain = hostname[:-len('.localhost')]
    else:
        base_domain = getattr(settings, 'TENANT_BASE_DOMAIN', '').lower().strip('.')
        if base_domain and hostname.endswith(f'.{base_domain}'):
            subdomain = hostname[:-(len(base_domain) + 1)]

    if subdomain and '.' not in subdomain:
        tenant = Tenant.objects.filter(subdomain__iexact=subdomain).first()
        if tenant:
            return tenant, True
        return Tenant.objects.filter(slug__iexact=subdomain).first(), True
    return None, False


def _resolve_tenant(request):
    impersonated_slug = request.GET.get('impersonate_tenant')
    if impersonated_slug is not None:
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated or not user.is_superuser:
            return None, JsonResponse(
                {'detail': 'Tenant impersonation requires an authenticated platform administrator.'},
                status=403,
            )
        tenant = Tenant.objects.filter(slug__iexact=impersonated_slug.strip()).first()
        if tenant:
            return tenant, None
        return None, JsonResponse({'detail': 'Tenant not found'}, status=404)

    tenant, host_requested_tenant = _host_tenant(request)
    if tenant:
        return tenant, None

    if host_requested_tenant:
        return None, JsonResponse({'detail': 'Tenant not found'}, status=404)

    header_slug = request.headers.get('X-Tenant-Slug', '').strip()
    if header_slug:
        tenant = Tenant.objects.filter(slug__iexact=header_slug).first()
        if tenant:
            return tenant, None
        return None, JsonResponse({'detail': 'Tenant not found'}, status=404)

    query_slug = (
        request.GET.get('tenant', '').strip()
        if request.path_info == '/api/public/checkin/'
        else ''
    )
    if query_slug:
        tenant = Tenant.objects.filter(slug__iexact=query_slug).first()
        if tenant:
            return tenant, None
        return None, JsonResponse({'detail': 'Tenant not found'}, status=404)

    default_slug = getattr(settings, 'TENANT_DEFAULT_SLUG', 'default')
    if default_slug:
        tenant = Tenant.objects.filter(slug__iexact=default_slug).first()
        if tenant:
            return tenant, None

    return None, JsonResponse({'detail': 'Tenant not found'}, status=404)


@sync_and_async_middleware
def tenant_resolution_middleware(get_response):
    if iscoroutinefunction(get_response):
        async def middleware(request):
            if request.path_info == '/api/health/':
                return await get_response(request)
            tenant, error_response = await sync_to_async(
                _resolve_tenant,
                thread_sensitive=True,
            )(request)
            if error_response:
                return error_response

            request.tenant = tenant
            token = set_current_tenant(tenant)
            try:
                return await get_response(request)
            finally:
                reset_current_tenant(token)

    else:
        def middleware(request):
            if request.path_info == '/api/health/':
                return get_response(request)
            tenant, error_response = _resolve_tenant(request)
            if error_response:
                return error_response

            request.tenant = tenant
            token = set_current_tenant(tenant)
            try:
                return get_response(request)
            finally:
                reset_current_tenant(token)

    return middleware
