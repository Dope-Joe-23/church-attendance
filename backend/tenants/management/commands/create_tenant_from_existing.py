from django.core.management.base import BaseCommand
from django.db import transaction

from tenants.models import Tenant
from members.models import Member
from services.models import Service
from attendance.models import Attendance


class Command(BaseCommand):
    help = 'Create a tenant for the existing church data and backfill all records.'

    def add_arguments(self, parser):
        parser.add_argument('--slug', required=True)
        parser.add_argument('--name', required=True)
        parser.add_argument('--subdomain', default=None)
        parser.add_argument('--custom-domain', default=None)

    def handle(self, *args, **options):
        slug = options['slug']
        name = options['name']
        subdomain = options.get('subdomain')
        custom_domain = options.get('custom_domain')

        with transaction.atomic():
            tenant, created = Tenant.objects.get_or_create(
                slug=slug,
                defaults={
                    'name': name,
                    'subdomain': subdomain,
                    'custom_domain': custom_domain,
                    'status': 'active',
                    'plan': 'starter',
                },
            )

            if not created:
                if subdomain:
                    tenant.subdomain = subdomain
                if custom_domain:
                    tenant.custom_domain = custom_domain
                tenant.name = name
                tenant.save(update_fields=['name', 'subdomain', 'custom_domain'])

            source_tenant = Tenant._base_manager.filter(slug='default').exclude(
                pk=tenant.pk
            ).first()
            members_updated = Member.all_tenants.filter(tenant__isnull=True).update(tenant=tenant)
            services_updated = Service.all_tenants.filter(tenant__isnull=True).update(tenant=tenant)
            attendances_updated = Attendance.all_tenants.filter(tenant__isnull=True).update(tenant=tenant)

            if source_tenant:
                members_updated += Member.all_tenants.filter(
                    tenant=source_tenant
                ).update(tenant=tenant)
                services_updated += Service.all_tenants.filter(
                    tenant=source_tenant
                ).update(tenant=tenant)
                attendances_updated += Attendance.all_tenants.filter(
                    tenant=source_tenant
                ).update(tenant=tenant)
                source_tenant.delete()

            count = members_updated + services_updated + attendances_updated

        self.stdout.write(
            self.style.SUCCESS(
                f'Created tenant {tenant.name} ({tenant.slug}) and backfilled {count} records.'
            )
        )
