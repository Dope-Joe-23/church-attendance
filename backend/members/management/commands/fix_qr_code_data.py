from django.core.management.base import BaseCommand
from django.db import connection


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

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        # Step 1: Count affected rows (safe — doesn't read qr_code_data content)
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) FROM members_member WHERE qr_code_data IS NOT NULL AND qr_code_data != ''"
            )
            affected = cursor.fetchone()[0]

        self.stdout.write(f'{affected} members have qr_code_data that needs clearing\n')

        if affected == 0:
            self.stdout.write(self.style.SUCCESS('Nothing to fix!\n'))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING('Dry run — no changes made\n'))
            return

        # Step 2: Clear ALL qr_code_data using raw SQL (never reads the content)
        # This avoids the UTF-8 decode crash entirely
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE members_member SET qr_code_data = '' WHERE qr_code_data IS NOT NULL AND qr_code_data != ''"
            )
            cleared = cursor.rowcount

        self.stdout.write(self.style.SUCCESS(f'Cleared qr_code_data for {cleared} members\n'))

        # Step 3: Regenerate QR codes for all non-visitor members
        from members.models import Member

        self.stdout.write('Regenerating QR codes...\n')
        members = Member.objects.filter(
            qr_code_data='', is_visitor=False
        ).exclude(member_id='')

        regenerated = 0
        failed = 0
        for member in members.iterator(chunk_size=50):
            try:
                member.save()  # Triggers QR code generation in save() override
                regenerated += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  Failed: {member.member_id} — {e}\n')
                )
                failed += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done! Regenerated {regenerated} QR codes'
            + (f' ({failed} failed)' if failed else '')
            + '\n'
        ))
