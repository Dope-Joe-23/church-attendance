from django.db import models
from django.core.exceptions import ValidationError
from django.conf import settings

from .context import current_tenant, tenant_for_data_access


class TenantManager(models.Manager):
    def get_queryset(self):
        tenant = current_tenant()
        if tenant is not None:
            return super().get_queryset().filter(tenant=tenant)
        if getattr(settings, 'TENANT_ALLOW_DEFAULT_CONTEXT', settings.DEBUG):
            return super().get_queryset().filter(
                tenant__slug=getattr(settings, 'TENANT_DEFAULT_SLUG', 'default')
            )
        from .context import TenantContextError

        raise TenantContextError('Tenant-owned queries require a tenant context.')


class MemberTenantManager(models.Manager):
    def get_queryset(self):
        tenant = current_tenant()
        if tenant is not None:
            return super().get_queryset().filter(member__tenant=tenant)
        if getattr(settings, 'TENANT_ALLOW_DEFAULT_CONTEXT', settings.DEBUG):
            return super().get_queryset().filter(
                member__tenant__slug=getattr(settings, 'TENANT_DEFAULT_SLUG', 'default')
            )
        from .context import TenantContextError

        raise TenantContextError('Tenant-owned queries require a tenant context.')


class TenantOwnedModel(models.Model):
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.PROTECT,
        related_name='%(class)ss',
    )

    objects = TenantManager()
    all_tenants = models.Manager()

    class Meta:
        abstract = True
        base_manager_name = 'all_tenants'
        default_manager_name = 'objects'

    def save(self, *args, **kwargs):
        if not self.tenant_id:
            self.tenant = tenant_for_data_access()
        elif self.tenant_id != tenant_for_data_access().pk:
            raise ValidationError('Tenant-owned data cannot be written outside its tenant context.')
        super().save(*args, **kwargs)


class Tenant(models.Model):
    """Represents a church/tenant that owns the application data."""

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('trial', 'Trial'),
    ]

    PLAN_CHOICES = [
        ('starter', 'Starter'),
        ('growth', 'Growth'),
        ('pro', 'Pro'),
    ]

    SUBSCRIPTION_STATUS_CHOICES = [
        ('trialing', 'Trialing'),
        ('active', 'Active'),
        ('past_due', 'Past due'),
        ('canceled', 'Canceled'),
        ('unpaid', 'Unpaid'),
        ('incomplete', 'Incomplete'),
        ('incomplete_expired', 'Incomplete expired'),
        ('paused', 'Paused'),
    ]

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True)
    subdomain = models.CharField(max_length=100, blank=True, null=True, unique=True)
    custom_domain = models.CharField(max_length=255, blank=True, null=True, unique=True)
    timezone = models.CharField(max_length=64, default='UTC')
    locale = models.CharField(max_length=10, default='en')
    plan = models.CharField(max_length=50, choices=PLAN_CHOICES, default='starter')
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    subscription_status = models.CharField(
        max_length=30,
        choices=SUBSCRIPTION_STATUS_CHOICES,
        default='trialing',
    )
    trial_ends_at = models.DateTimeField(blank=True, null=True)
    subscription_period_ends_at = models.DateTimeField(blank=True, null=True)
    cancel_at_period_end = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class TenantMembership(models.Model):
    """Associates an application user with a tenant and grants a tenant role."""

    ROLE_OWNER = 'owner'
    ROLE_ADMIN = 'admin'
    ROLE_MANAGER = 'manager'
    ROLE_VIEWER = 'viewer'
    ROLE_CHOICES = [
        (ROLE_OWNER, 'Owner'),
        (ROLE_ADMIN, 'Administrator'),
        (ROLE_MANAGER, 'Manager'),
        (ROLE_VIEWER, 'Viewer'),
    ]

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tenant_memberships',
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_VIEWER)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'user'],
                name='unique_user_membership_per_tenant',
            ),
        ]

    def __str__(self):
        return f'{self.user} - {self.tenant} ({self.role})'


class StripeWebhookEvent(models.Model):
    """Records processed Stripe events to make webhook handling idempotent."""

    event_id = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=100)
    received_at = models.DateTimeField(auto_now_add=True)
