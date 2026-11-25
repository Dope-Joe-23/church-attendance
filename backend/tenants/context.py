from contextlib import contextmanager
from contextvars import ContextVar, Token
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import Tenant


_current_tenant: ContextVar['Tenant | None'] = ContextVar('current_tenant', default=None)


def current_tenant() -> 'Tenant | None':
    return _current_tenant.get()


def set_current_tenant(tenant: 'Tenant | None') -> Token:
    return _current_tenant.set(tenant)


def reset_current_tenant(token: Token) -> None:
    _current_tenant.reset(token)


@contextmanager
def tenant_context(tenant: 'Tenant'):
    token = set_current_tenant(tenant)
    try:
        yield
    finally:
        reset_current_tenant(token)


class TenantContextError(RuntimeError):
    """Raised when tenant-owned data is accessed without a resolved tenant."""


def tenant_for_data_access() -> 'Tenant':
    tenant = current_tenant()
    if tenant is not None:
        return tenant

    from django.conf import settings
    from .models import Tenant

    if getattr(settings, 'TENANT_ALLOW_DEFAULT_CONTEXT', settings.DEBUG):
        default_slug = getattr(settings, 'TENANT_DEFAULT_SLUG', 'default')
        tenant = Tenant._base_manager.filter(slug=default_slug).first()
        if tenant is not None:
            return tenant

    raise TenantContextError(
        'Tenant-owned data requires an active tenant context. '
        'Use an explicit tenant context for background jobs or all_tenants '
        'for deliberate cross-tenant administration.'
    )
