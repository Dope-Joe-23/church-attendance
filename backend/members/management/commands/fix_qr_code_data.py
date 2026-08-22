import base64
import logging
from django.core.management.base import BaseCommand
from members.models import Member

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        'Find and fix corrupt qr_code_data records that cause '
        'UTF-8 decode errors on Python 3.14 / psycopg3'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show corrupt records without fixing them',
        )
        parser.add_argument(
            '--regenerate',
            action='store_true',
            help='Regenerate QR codes for members with corrupt or missing data',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        regenerate = options['regenerate']

        self.stdout.write('Scanning all members for qr_code_data issues...\n')

        # We must read each member individually to find corrupt data
        # Can't use bulk queries because the crash happens at the DB cursor level
        total = Member.objects.count()
        corrupt = []
        invalid = []
        empty = []
        valid = 0

        for i, member in enumerate(Member.objects.iterator(chunk_size=50), 1):
            if i % 100 == 0:
                self.stdout.write(f'  Processed {i}/{total} members...\n')

            try:
                # Force load qr_code_data by accessing it
                data = member.qr_code_data

                if not data:
                    empty.append(member)
                    continue

                # Try to decode the base64 data
                try:
                    decoded = base64.b64decode(data)
                    # Check it's valid PNG (starts with PNG magic bytes)
                    if decoded[:4] == b'\x89PNG':
                        valid += 1
                    else:
                        invalid.append((member, 'Not a valid PNG image'))
                except Exception as e:
                    corrupt.append((member, str(e)))

            except Exception as e:
                # The member itself couldn't be loaded — skip it
                # This member's row is what's causing the crash
                corrupt.append((member, f'DB load error: {e}'))

        # Report findings
        self.stdout.write(self.style.SUCCESS(
            f'\nScan complete: {total} members checked\n'
        ))
        self.stdout.write(f'  Valid QR codes: {valid}\n')
        self.stdout.write(f'  Empty/null QR codes: {len(empty)}\n')
        self.stdout.write(f'  Invalid QR data: {len(invalid)}\n')
        self.stdout.write(f'  Corrupt/crashing: {len(corrupt)}\n')

        if invalid:
            self.stdout.write(self.style.WARNING('\nInvalid QR data:\n'))
            for member, reason in invalid:
                self.stdout.write(f'  - {member.full_name} ({member.member_id}): {reason}\n')

        if corrupt:
            self.stdout.write(self.style.ERROR('\nCorrupt/crashing records:\n'))
            for member, reason in corrupt:
                self.stdout.write(f'  - {member.full_name} ({member.member_id}): {reason}\n')

        # Fix corrupt records
        if (corrupt or invalid) and not dry_run:
            self.stdout.write(self.style.WARNING('\nFixing corrupt records...\n'))
            fixed = 0

            for member, reason in corrupt + invalid:
                try:
                    # Clear the corrupt data
                    Member.objects.filter(pk=member.pk).update(qr_code_data='')
                    self.stdout.write(
                        f'  Cleared qr_code_data for {member.full_name} ({member.member_id})\n'
                    )
                    fixed += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f'  Failed to fix {member.member_id}: {e}\n'
                        )
                    )

            self.stdout.write(self.style.SUCCESS(f'Fixed {fixed} records\n'))

        # Regenerate QR codes if requested
        if regenerate and not dry_run:
            self.stdout.write(self.style.WARNING('\nRegenerating QR codes...\n'))
            # Members with empty qr_code_data after cleanup
            members_to_fix = Member.objects.filter(qr_code_data='').exclude(is_visitor=True)
            self.stdout.write(f'  {members_to_fix.count()} members need QR code regeneration\n')

            regenerated = 0
            for member in members_to_fix.iterator(chunk_size=50):
                try:
                    member.save()  # Triggers QR code generation in the save() override
                    regenerated += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f'  Failed to regenerate for {member.member_id}: {e}\n'
                        )
                    )

            self.stdout.write(self.style.SUCCESS(f'Regenerated {regenerated} QR codes\n'))

        if dry_run:
            self.stdout.write(self.style.WARNING(
                '\nDry run — no changes made. Run without --dry-run to fix.\n'
            ))
