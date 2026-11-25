from django.urls import path

from .views import (
    CreateBillingPortalSessionView,
    CreateCheckoutSessionView,
    StripeWebhookView,
    TenantBillingOverviewView,
)

urlpatterns = [
    path('overview/', TenantBillingOverviewView.as_view(), name='billing-overview'),
    path('checkout-session/', CreateCheckoutSessionView.as_view(), name='billing-checkout-session'),
    path('portal-session/', CreateBillingPortalSessionView.as_view(), name='billing-portal-session'),
    path('webhook/', StripeWebhookView.as_view(), name='billing-stripe-webhook'),
]
