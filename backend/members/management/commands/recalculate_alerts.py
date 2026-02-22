from django.core.management.base import BaseCommand
from members.utils import recalculate_member_alerts


class Command(BaseCommand):
    help = 'Recalculate all member alerts based on actual attendance data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear-all',
            action='store_true',
            help='Clear all existing alerts before recalculating',
        )

    def handle(self, *args, **options):
        if options['clear_all']:
            from members.models import MemberAlert
            count = MemberAlert.objects.filter(is_resolved=False).count()
            MemberAlert.objects.filter(is_resolved=False).delete()
            self.stdout.write(self.style.SUCCESS(f'Cleared {count} unresolved alerts'))

        self.stdout.write('Recalculating member alerts...')
        summary = recalculate_member_alerts()
        
        self.stdout.write(self.style.SUCCESS('\nAlert Recalculation Summary:'))
        self.stdout.write(f"  Members processed: {summary['members_processed']}")
        self.stdout.write(f"  Early warning alerts created: {summary['early_warning_created']}")
        self.stdout.write(f"  At risk alerts created: {summary['at_risk_created']}")
        self.stdout.write(f"  Critical alerts created: {summary['critical_created']}")
        self.stdout.write(f"  Total alerts created: {summary['alerts_created']}")
