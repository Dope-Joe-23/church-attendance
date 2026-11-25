from unittest.mock import patch
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from tenants.models import StripeWebhookEvent, Tenant, TenantMembership


@override_settings(
    DEBUG=False,
    PUBLIC_APP_URL='https://app.example.test',
    STRIPE_SECRET_KEY='sk_test_not_a_real_key',
    STRIPE_WEBHOOK_SECRET='whsec_test_not_a_real_secret',
    STRIPE_PRICE_IDS={
        'starter': 'price_starter',
        'growth': 'price_growth',
        'pro': 'price_pro',
    },
)
class TenantBillingTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            name='Billing Church',
            slug='billing-church',
            status='trial',
            subscription_status='trialing',
        )
        self.owner = User.objects.create_user(
            username='billing-owner',
            email='owner@example.com',
            password='test-password',
        )
        TenantMembership.objects.create(
            tenant=self.tenant,
            user=self.owner,
            role=TenantMembership.ROLE_OWNER,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)

    def test_checkout_creates_a_customer_and_returns_hosted_url(self):
        with (
            patch(
                'tenants.views.stripe.Customer.create',
                return_value=type('Customer', (), {'id': 'cus_test_1'})(),
            ) as create_customer,
            patch(
                'tenants.views.stripe.checkout.Session.create',
                return_value=type('Session', (), {'url': 'https://checkout.example.test/session'})(),
            ) as create_session,
        ):
            response = self.client.post(
                '/api/billing/checkout-session/',
                {'plan': 'growth'},
                format='json',
                HTTP_X_TENANT_SLUG=self.tenant.slug,
            )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['url'], 'https://checkout.example.test/session')
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.stripe_customer_id, 'cus_test_1')
        create_customer.assert_called_once()
        self.assertEqual(
            create_session.call_args.kwargs['line_items'],
            [{'price': 'price_growth', 'quantity': 1}],
        )

    def test_checkout_is_unavailable_without_configured_price(self):
        with override_settings(STRIPE_PRICE_IDS={'starter': '', 'growth': '', 'pro': ''}):
            response = self.client.post(
                '/api/billing/checkout-session/',
                {'plan': 'growth'},
                format='json',
                HTTP_X_TENANT_SLUG=self.tenant.slug,
            )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data['detail'], 'Billing is not configured for this plan.')

    def test_signup_creates_trial_tenant_and_owner_membership(self):
        response = APIClient().post(
            '/api/auth/signup/',
            {
                'church_name': 'New Hope Church',
                'username': 'new-hope-owner',
                'email': 'new-hope-owner@example.com',
                'password': 'A-very-strong-unique-password-824!',
                'password_confirm': 'A-very-strong-unique-password-824!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201, response.data)
        tenant = Tenant.objects.get(slug='new-hope-church')
        self.assertEqual(tenant.status, 'trial')
        self.assertEqual(tenant.plan, 'starter')
        self.assertIsNotNone(tenant.trial_ends_at)
        membership = TenantMembership.objects.get(tenant=tenant)
        self.assertEqual(membership.role, TenantMembership.ROLE_OWNER)
        self.assertEqual(response.data['tokens']['access'] != '', True)

    def test_stripe_webhook_updates_subscription_and_deduplicates(self):
        event = {
            'id': 'evt_subscription_1',
            'type': 'customer.subscription.updated',
            'data': {
                'object': {
                    'id': 'sub_test_1',
                    'customer': 'cus_test_1',
                    'status': 'active',
                    'current_period_end': 1_800_000_000,
                    'trial_end': None,
                    'cancel_at_period_end': False,
                    'metadata': {
                        'tenant_id': str(self.tenant.pk),
                        'plan': 'pro',
                    },
                },
            },
        }
        with patch('tenants.views.stripe.Webhook.construct_event', return_value=event):
            first = self.client.generic(
                'POST',
                '/api/billing/webhook/',
                data=b'{}',
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='valid-signature',
            )
            second = self.client.generic(
                'POST',
                '/api/billing/webhook/',
                data=b'{}',
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='valid-signature',
            )

        self.assertEqual(first.status_code, 200)
        self.assertFalse(first.data['duplicate'])
        self.assertTrue(second.data['duplicate'])
        self.assertEqual(StripeWebhookEvent.objects.count(), 1)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.status, 'active')
        self.assertEqual(self.tenant.plan, 'pro')
        self.assertEqual(self.tenant.stripe_subscription_id, 'sub_test_1')

    def test_webhook_rejects_missing_signature(self):
        response = self.client.generic(
            'POST',
            '/api/billing/webhook/',
            data=b'{}',
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)

    def test_expired_trial_loses_business_access_but_keeps_billing_access(self):
        self.tenant.trial_ends_at = timezone.now() - timedelta(days=1)
        self.tenant.save(update_fields=['trial_ends_at'])

        business_response = self.client.get(
            '/api/members/',
            HTTP_X_TENANT_SLUG=self.tenant.slug,
        )
        billing_response = self.client.get(
            '/api/billing/overview/',
            HTTP_X_TENANT_SLUG=self.tenant.slug,
        )

        self.assertEqual(business_response.status_code, 403)
        self.assertEqual(billing_response.status_code, 200)
