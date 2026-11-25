from rest_framework.permissions import SAFE_METHODS, BasePermission
from django.utils import timezone

from .models import TenantMembership


class TenantRolePermission(BasePermission):
    """Require an active tenant membership and apply role-aware write access."""

    message = 'You do not have permission to access this tenant.'

    def has_permission(self, request, view):
        action = getattr(view, 'action', None)
        if action == 'validate':
            return request.method == 'POST'

        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True

        tenant = getattr(request, 'tenant', None)
        if tenant is None:
            return False

        membership = TenantMembership.objects.filter(
            tenant=tenant,
            user=user,
            is_active=True,
        ).first()
        if membership is None:
            return False
        if tenant.status == 'inactive':
            return False
        if (
            tenant.status == 'trial'
            and tenant.trial_ends_at is not None
            and tenant.trial_ends_at <= timezone.now()
        ):
            return False

        if getattr(view, 'tenant_admin_only', False):
            return membership.role in {
                TenantMembership.ROLE_OWNER,
                TenantMembership.ROLE_ADMIN,
            }

        if request.method in SAFE_METHODS:
            return True

        return membership.role in {
            TenantMembership.ROLE_OWNER,
            TenantMembership.ROLE_ADMIN,
            TenantMembership.ROLE_MANAGER,
        }


class TenantAdminPermission(TenantRolePermission):
    """Restrict tenant administration actions to tenant owners and admins."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True

        tenant = getattr(request, 'tenant', None)
        if tenant is None:
            return False

        return TenantMembership.objects.filter(
            tenant=tenant,
            user=user,
            is_active=True,
            role__in=[
                TenantMembership.ROLE_OWNER,
                TenantMembership.ROLE_ADMIN,
            ],
        ).exists()
