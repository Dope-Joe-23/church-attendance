from django.core.management.base import BaseCommand, CommandError
from members.utils import recalculate_member_alerts
from tenants.context import tenant_context
from tenants.models import Tenant


class Command(BaseCommand):
    help = 'Recalculate all member alerts based on actual attendance data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant-slug',
            help='Recalculate alerts for one tenant; defaults to all tenants.',
        )
        parser.add_argument(
            '--clear-all',
            action='store_true',
            help='Clear all existing alerts before recalculating',
        )

    def handle(self, *args, **options):
        if options['tenant_slug']:
            tenants = Tenant._base_manager.filter(slug=options['tenant_slug'])
            if not tenants.exists():
                raise CommandError(f"Tenant '{options['tenant_slug']}' was not found.")
        else:
            tenants = Tenant._base_manager.all()

        aggregate = {}
        cleared = 0
        self.stdout.write('Recalculating member alerts...')
        for tenant in tenants.iterator():
            with tenant_context(tenant):
                if options['clear_all']:
                    from members.models import MemberAlert
                    unresolved = MemberAlert.objects.filter(is_resolved=False)
                    cleared += unresolved.count()
                    unresolved.delete()
                summary = recalculate_member_alerts()
            for key, value in summary.items():
                if isinstance(value, (int, float)):
                    aggregate[key] = aggregate.get(key, 0) + value

        if options['clear_all']:
            self.stdout.write(self.style.SUCCESS(f'Cleared {cleared} unresolved alerts'))
        self.stdout.write(self.style.SUCCESS('\nAlert Recalculation Summary:'))
        self.stdout.write(f"  Members processed: {aggregate.get('members_processed', 0)}")
        self.stdout.write(f"  Early warning alerts created: {aggregate.get('early_warning_created', 0)}")
        self.stdout.write(f"  At risk alerts created: {aggregate.get('at_risk_created', 0)}")
        self.stdout.write(f"  Critical alerts created: {aggregate.get('critical_created', 0)}")
        self.stdout.write(f"  Total alerts created: {aggregate.get('alerts_created', 0)}")
