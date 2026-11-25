from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from members.models import Member
from tenants.context import tenant_context
from tenants.models import Tenant


class Command(BaseCommand):
    help = (
        'Clear all qr_code_data from the database (it contains corrupt '
        'data that crashes Python 3.14 / psycopg3) and regenerate fresh QR codes.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show how many records would be affected without changing anything',
        )
        parser.add_argument(
            '--tenant-slug',
            help='Limit the repair to one tenant; defaults to all tenants.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        tenant_slug = options.get('tenant_slug')
        if tenant_slug:
            tenants = Tenant._base_manager.filter(slug=tenant_slug)
            if not tenants.exists():
                raise CommandError(f"Tenant '{tenant_slug}' was not found.")
        else:
            tenants = Tenant._base_manager.all()

        affected_total = 0
        cleared_total = 0
        regenerated = 0
        failed = 0

        for tenant in tenants.iterator():
            with tenant_context(tenant):
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT COUNT(*) FROM members_member "
                        "WHERE tenant_id = %s AND qr_code_data IS NOT NULL "
                        "AND qr_code_data != ''",
                        [tenant.pk],
                    )
                    affected = cursor.fetchone()[0]
                affected_total += affected

                if dry_run or not affected:
                    continue

                with connection.cursor() as cursor:
                    cursor.execute(
                        "UPDATE members_member SET qr_code_data = '' "
                        "WHERE tenant_id = %s AND qr_code_data IS NOT NULL "
                        "AND qr_code_data != ''",
                        [tenant.pk],
                    )
                    cleared_total += cursor.rowcount

                members = Member.objects.filter(
                    qr_code_data='',
                    is_visitor=False,
                ).exclude(member_id='')
                for member in members.iterator(chunk_size=50):
                    try:
                        member.save()
                        regenerated += 1
                    except Exception as error:
                        self.stderr.write(
                            self.style.ERROR(
                                f'Failed: {member.member_id} ({tenant.slug}): {error}'
                            )
                        )
                        failed += 1

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'Dry run — {affected_total} members across selected tenants '
                    'would be repaired; no changes made.'
                )
            )
            return

        self.stdout.write(
            f'Cleared QR data for {cleared_total} members; '
            f'regenerated {regenerated} codes.'
        )
        if failed:
            raise CommandError(f'QR regeneration failed for {failed} member(s).')
        if not affected_total:
            self.stdout.write(self.style.SUCCESS('Nothing to fix.'))
