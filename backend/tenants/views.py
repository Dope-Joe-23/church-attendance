import logging
from datetime import datetime, timedelta, timezone as datetime_timezone
from urllib.parse import urlparse

import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import StripeWebhookEvent, Tenant, TenantMembership
from .permissions import TenantAdminPermission, TenantRolePermission

logger = logging.getLogger(__name__)
User = get_user_model()


class TenantSignupView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'tenant_signup'

    def post(self, request):
        tenant_name = str(request.data.get('church_name', '')).strip()
        username = str(request.data.get('username', '')).strip()
        email = str(request.data.get('email', '')).strip().lower()
        password = request.data.get('password', '')
        password_confirm = request.data.get('password_confirm', '')
        requested_slug = str(request.data.get('slug', '')).strip()
        first_name = str(request.data.get('first_name', '')).strip()
        last_name = str(request.data.get('last_name', '')).strip()

        if not all((tenant_name, username, email, password, password_confirm)):
            return Response(
                {'detail': 'Church name, username, email, password, and password confirmation are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if password != password_confirm:
            return Response(
                {'password_confirm': ['Passwords do not match.']},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_email(email)
            validate_password(
                password,
                user=User(username=username, email=email),
            )
        except ValidationError as exc:
            return Response(
                {'detail': exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {'username': ['This username is already in use.']},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {'email': ['This email address is already registered.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tenant_slug = slugify(requested_slug or tenant_name)
        if not tenant_slug or len(tenant_slug) > 100:
            return Response(
                {'slug': ['Enter a valid tenant name or slug of at most 100 characters.']},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Tenant._base_manager.filter(slug__iexact=tenant_slug).exists():
            return Response(
                {'slug': ['This tenant slug is already in use.']},
                status=status.HTTP_409_CONFLICT,
            )

        trial_days = max(1, settings.TENANT_TRIAL_DAYS)
        trial_ends_at = timezone.now() + timedelta(days=trial_days)
        try:
            with transaction.atomic():
                tenant = Tenant._base_manager.create(
                    name=tenant_name,
                    slug=tenant_slug,
                    subdomain=tenant_slug,
                    status='trial',
                    plan='starter',
                    subscription_status='trialing',
                    trial_ends_at=trial_ends_at,
                )
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    is_active=True,
                )
                TenantMembership.objects.create(
                    tenant=tenant,
                    user=user,
                    role=TenantMembership.ROLE_OWNER,
                )
        except IntegrityError:
            logger.info('Tenant signup conflict for slug %s', tenant_slug)
            return Response(
                {'detail': 'The tenant slug or account details were just claimed. Please retry with different details.'},
                status=status.HTTP_409_CONFLICT,
            )

        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'tenant': {
                    'id': tenant.pk,
                    'name': tenant.name,
                    'slug': tenant.slug,
                    'status': tenant.status,
                    'plan': tenant.plan,
                    'trial_ends_at': tenant.trial_ends_at,
                },
                'user': {
                    'id': user.pk,
                    'username': user.username,
                    'email': user.email,
                    'role': TenantMembership.ROLE_OWNER,
                },
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class CreateCheckoutSessionView(APIView):
    permission_classes = [TenantAdminPermission]

    def post(self, request):
        tenant = request.tenant
        plan = str(request.data.get('plan', '')).strip().lower()
        if plan not in dict(Tenant.PLAN_CHOICES):
            return Response(
                {'detail': 'Select a valid subscription plan.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        price_id = settings.STRIPE_PRICE_IDS.get(plan)
        if not settings.STRIPE_SECRET_KEY or not price_id:
            return Response(
                {'detail': 'Billing is not configured for this plan.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        app_url = settings.PUBLIC_APP_URL
        if not settings.DEBUG and urlparse(app_url).scheme != 'https':
            logger.error('PUBLIC_APP_URL must use HTTPS outside development.')
            return Response(
                {'detail': 'Billing is not configured for a secure application URL.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if not request.user.email:
            return Response(
                {'detail': 'Add an email address to your account before starting checkout.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            tenant = Tenant._base_manager.get(pk=tenant.pk)
            customer_id = tenant.stripe_customer_id
            if not customer_id:
                customer = stripe.Customer.create(
                    email=request.user.email,
                    name=tenant.name,
                    metadata={'tenant_id': str(tenant.pk)},
                    idempotency_key=f'tenant-customer-{tenant.pk}',
                )
                customer_id = customer.id
                tenant.stripe_customer_id = customer_id
                tenant.save(update_fields=['stripe_customer_id'])

            session = stripe.checkout.Session.create(
                mode='subscription',
                customer=customer_id,
                line_items=[{'price': price_id, 'quantity': 1}],
                client_reference_id=str(tenant.pk),
                metadata={'tenant_id': str(tenant.pk), 'plan': plan},
                subscription_data={
                    'metadata': {'tenant_id': str(tenant.pk), 'plan': plan},
                },
                success_url=f'{app_url}/billing?checkout=success',
                cancel_url=f'{app_url}/billing?checkout=cancelled',
            )
            if not session.url:
                logger.error('Stripe returned a checkout session without a URL for tenant %s', tenant.pk)
                return Response(
                    {'detail': 'Unable to start checkout. Please try again later.'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
        except stripe.StripeError:
            logger.exception('Stripe checkout session creation failed for tenant %s', tenant.pk)
            return Response(
                {'detail': 'Unable to start checkout. Please try again later.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({'url': session.url}, status=status.HTTP_200_OK)


class TenantBillingOverviewView(APIView):
    permission_classes = [TenantAdminPermission]

    def get(self, request):
        tenant = request.tenant
        return Response({
            'tenant': {
                'name': tenant.name,
                'slug': tenant.slug,
                'plan': tenant.plan,
                'status': tenant.status,
                'subscription_status': tenant.subscription_status,
                'trial_ends_at': tenant.trial_ends_at,
                'subscription_period_ends_at': tenant.subscription_period_ends_at,
                'cancel_at_period_end': tenant.cancel_at_period_end,
            },
            'plans': [
                {
                    'id': plan_id,
                    'name': label,
                    'checkout_available': bool(settings.STRIPE_SECRET_KEY and settings.STRIPE_PRICE_IDS.get(plan_id)),
                }
                for plan_id, label in Tenant.PLAN_CHOICES
            ],
            'portal_available': bool(
                settings.STRIPE_SECRET_KEY and tenant.stripe_customer_id
            ),
        })


class CreateBillingPortalSessionView(APIView):
    permission_classes = [TenantAdminPermission]

    def post(self, request):
        tenant = request.tenant
        if not settings.STRIPE_SECRET_KEY or not tenant.stripe_customer_id:
            return Response(
                {'detail': 'A billing customer is not configured for this tenant.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        app_url = settings.PUBLIC_APP_URL
        if not settings.DEBUG and urlparse(app_url).scheme != 'https':
            return Response(
                {'detail': 'Billing is not configured for a secure application URL.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            session = stripe.billing_portal.Session.create(
                customer=tenant.stripe_customer_id,
                return_url=f'{app_url}/billing',
            )
        except stripe.StripeError:
            logger.exception('Stripe billing portal creation failed for tenant %s', tenant.pk)
            return Response(
                {'detail': 'Unable to open billing settings. Please try again later.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if not session.url:
            return Response(
                {'detail': 'Unable to open billing settings. Please try again later.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({'url': session.url})


def _stripe_value(obj, key, default=None):
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _stripe_id(value):
    return value if isinstance(value, str) else _stripe_value(value, 'id')


def _tenant_for_stripe_object(obj):
    metadata = _stripe_value(obj, 'metadata', {}) or {}
    tenant_id = _stripe_value(metadata, 'tenant_id')
    if tenant_id:
        tenant = Tenant._base_manager.filter(pk=tenant_id).first()
        if tenant:
            return tenant

    subscription_id = _stripe_id(_stripe_value(obj, 'subscription'))
    if not subscription_id:
        subscription_id = _stripe_id(_stripe_value(obj, 'id'))
    customer_id = _stripe_id(_stripe_value(obj, 'customer'))
    tenants = Tenant._base_manager.all()
    if subscription_id:
        tenant = tenants.filter(stripe_subscription_id=subscription_id).first()
        if tenant:
            return tenant
    if customer_id:
        return tenants.filter(stripe_customer_id=customer_id).first()
    return None


def _timestamp(value):
    if value is None:
        return None
    return datetime.fromtimestamp(int(value), tz=datetime_timezone.utc)


def _apply_stripe_event(event):
    event_type = _stripe_value(event, 'type', '')
    data = _stripe_value(event, 'data', {}) or {}
    obj = _stripe_value(data, 'object', {}) or {}
    tenant = _tenant_for_stripe_object(obj)
    if tenant is None:
        logger.warning('Ignoring Stripe event %s without a matching tenant.', event_type)
        return

    update_fields = set()
    if event_type == 'checkout.session.completed':
        tenant.stripe_customer_id = _stripe_id(_stripe_value(obj, 'customer'))
        tenant.stripe_subscription_id = _stripe_id(_stripe_value(obj, 'subscription'))
        metadata = _stripe_value(obj, 'metadata', {}) or {}
        plan = _stripe_value(metadata, 'plan')
        if plan in dict(Tenant.PLAN_CHOICES):
            tenant.plan = plan
            update_fields.add('plan')
        if _stripe_value(obj, 'payment_status') == 'paid':
            tenant.status = 'active'
            tenant.subscription_status = 'active'
            update_fields.update({'status', 'subscription_status'})
        update_fields.update({'stripe_customer_id', 'stripe_subscription_id'})
    elif event_type in {'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'}:
        subscription_status = (
            'canceled'
            if event_type == 'customer.subscription.deleted'
            else _stripe_value(obj, 'status', 'incomplete')
        )
        if subscription_status not in dict(Tenant.SUBSCRIPTION_STATUS_CHOICES):
            subscription_status = 'incomplete'

        tenant.subscription_status = subscription_status
        tenant.stripe_customer_id = _stripe_id(_stripe_value(obj, 'customer'))
        tenant.stripe_subscription_id = _stripe_id(_stripe_value(obj, 'id'))
        period_end = _timestamp(_stripe_value(obj, 'current_period_end'))
        trial_end = _timestamp(_stripe_value(obj, 'trial_end'))
        tenant.subscription_period_ends_at = period_end
        tenant.trial_ends_at = trial_end
        tenant.cancel_at_period_end = bool(_stripe_value(obj, 'cancel_at_period_end', False))

        metadata = _stripe_value(obj, 'metadata', {}) or {}
        plan = _stripe_value(metadata, 'plan')
        if plan in dict(Tenant.PLAN_CHOICES):
            tenant.plan = plan
            update_fields.add('plan')

        if subscription_status == 'trialing':
            tenant.status = 'trial'
        elif subscription_status in {'active', 'past_due'}:
            tenant.status = 'active'
        else:
            tenant.status = 'inactive'
        update_fields.update({
            'subscription_status',
            'stripe_customer_id',
            'stripe_subscription_id',
            'subscription_period_ends_at',
            'trial_ends_at',
            'cancel_at_period_end',
            'status',
        })
    elif event_type in {'invoice.payment_failed', 'invoice.paid'}:
        if event_type == 'invoice.payment_failed':
            tenant.subscription_status = 'past_due'
        else:
            tenant.subscription_status = 'active'
            tenant.status = 'active'
            update_fields.add('status')
        update_fields.add('subscription_status')

    if update_fields:
        tenant.save(update_fields=sorted(update_fields))


class StripeWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        if not settings.STRIPE_WEBHOOK_SECRET:
            return Response(
                {'detail': 'Stripe webhooks are not configured.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        signature = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        if not signature:
            return Response(
                {'detail': 'Missing Stripe signature.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            event = stripe.Webhook.construct_event(
                request.body,
                signature,
                settings.STRIPE_WEBHOOK_SECRET,
            )
        except (ValueError, stripe.SignatureVerificationError):
            return Response(
                {'detail': 'Invalid Stripe webhook signature or payload.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event_id = _stripe_value(event, 'id')
        event_type = _stripe_value(event, 'type', '')
        if not event_id:
            return Response(
                {'detail': 'Stripe event ID is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            _, created = StripeWebhookEvent.objects.get_or_create(
                event_id=event_id,
                defaults={'event_type': event_type},
            )
            if created:
                _apply_stripe_event(event)

        return Response(
            {'received': True, 'duplicate': not created},
            status=status.HTTP_200_OK,
        )


class TenantMembershipListView(APIView):
    permission_classes = [TenantRolePermission]
    tenant_admin_only = True

    def get(self, request):
        memberships = TenantMembership.objects.filter(
            tenant=request.tenant,
        ).select_related('user').order_by('user__username')
        current_membership = memberships.filter(user=request.user).first()
        return Response({
            'current_role': (
                current_membership.role
                if current_membership
                else TenantMembership.ROLE_OWNER
            ),
            'current_membership_id': (
                current_membership.pk if current_membership else None
            ),
            'members': [
                self._serialize_membership(membership)
                for membership in memberships
            ],
        })

    @staticmethod
    def _serialize_membership(membership):
        user = membership.user
        return {
            'id': membership.pk,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': membership.role,
            'is_active': membership.is_active,
            'created_at': membership.created_at,
        }


class TenantMembershipDetailView(APIView):
    permission_classes = [TenantRolePermission]
    tenant_admin_only = True
    mutable_fields = {'role', 'is_active'}

    def patch(self, request, pk):
        changes = request.data
        if not isinstance(changes, dict) or not changes:
            return Response(
                {'detail': 'Provide a role and/or is_active value.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        unexpected_fields = set(changes) - self.mutable_fields
        if unexpected_fields:
            return Response(
                {'detail': 'Only role and is_active can be updated.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if 'role' in changes and (
            not isinstance(changes['role'], str)
            or changes['role'] not in dict(TenantMembership.ROLE_CHOICES)
        ):
            return Response(
                {'role': 'Select a valid tenant role.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if 'is_active' in changes and not isinstance(changes['is_active'], bool):
            return Response(
                {'is_active': 'This field must be a boolean.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            tenant = Tenant._base_manager.select_for_update().get(pk=request.tenant.pk)
            membership = get_object_or_404(
                TenantMembership.objects.select_related('user'),
                pk=pk,
                tenant=tenant,
            )
            actor_membership = TenantMembership.objects.filter(
                tenant=tenant,
                user=request.user,
                is_active=True,
            ).first()
            actor_is_owner = bool(
                request.user.is_superuser
                or (
                    actor_membership
                    and actor_membership.role == TenantMembership.ROLE_OWNER
                )
            )

            if (
                membership.role in {TenantMembership.ROLE_OWNER, TenantMembership.ROLE_ADMIN}
                and not actor_is_owner
            ):
                return Response(
                    {'detail': 'Only a tenant owner can manage owner or administrator access.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if (
                changes.get('role') in {
                    TenantMembership.ROLE_OWNER,
                    TenantMembership.ROLE_ADMIN,
                }
                and not actor_is_owner
            ):
                return Response(
                    {'detail': 'Only a tenant owner can assign owner or administrator roles.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if (
                membership.user_id == request.user.id
                and changes.get('is_active') is False
            ):
                return Response(
                    {'detail': 'You cannot deactivate your own tenant membership.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            will_remove_owner = membership.role == TenantMembership.ROLE_OWNER and (
                changes.get('role', membership.role) != TenantMembership.ROLE_OWNER
                or changes.get('is_active', membership.is_active) is False
            )
            if will_remove_owner and not TenantMembership.objects.filter(
                tenant=tenant,
                role=TenantMembership.ROLE_OWNER,
                is_active=True,
            ).exclude(pk=membership.pk).exists():
                return Response(
                    {'detail': 'A tenant must retain at least one active owner.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if 'role' in changes:
                membership.role = changes['role']
            if 'is_active' in changes:
                membership.is_active = changes['is_active']
            membership.save(update_fields=['role', 'is_active'])

        return Response(TenantMembershipListView._serialize_membership(membership))
