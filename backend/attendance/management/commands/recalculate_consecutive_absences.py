from django.core.management.base import BaseCommand, CommandError
from members.models import Member
from attendance.models import Attendance
from tenants.context import tenant_context
from tenants.models import Tenant


class Command(BaseCommand):
    help = 'Recalculate consecutive absences for all members based on attendance records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant-slug',
            help='Limit recalculation to one tenant; defaults to all tenants.',
        )
        parser.add_argument(
            '--member-id',
            type=int,
            help='Recalculate for a specific member ID',
        )

    def handle(self, *args, **options):
        member_id = options.get('member_id')
        tenant_slug = options.get('tenant_slug')

        if member_id:
            try:
                member = Member.all_tenants.select_related('tenant').get(id=member_id)
            except Member.DoesNotExist:
                raise CommandError(f'Member with ID {member_id} was not found.')
            if tenant_slug and member.tenant.slug != tenant_slug:
                raise CommandError(
                    f'Member with ID {member_id} does not belong to tenant {tenant_slug}.'
                )
            with tenant_context(member.tenant):
                self.recalculate_member(member)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Recalculated consecutive absences for {member.full_name}'
                    )
                )
        else:
            if tenant_slug:
                tenants = Tenant._base_manager.filter(slug=tenant_slug)
                if not tenants.exists():
                    raise CommandError(f"Tenant '{tenant_slug}' was not found.")
            else:
                tenants = Tenant._base_manager.all()

            total = 0
            for tenant in tenants.iterator():
                with tenant_context(tenant):
                    members = Member.objects.all()
                    count = members.count()
                    self.stdout.write(
                        f'Recalculating consecutive absences for {count} members '
                        f'in {tenant.slug}...'
                    )
                    for member in members:
                        self.recalculate_member(member)
                    total += count

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully recalculated consecutive absences for {total} members'
                )
            )

    def recalculate_member(self, member):
        """Calculate consecutive absences from attendance records and update member"""
        # Get all attendance records for this member, ordered by service date (descending)
        attendances = Attendance.objects.filter(
            member_id=member.id
        ).select_related('service').order_by('-service__date', '-created_at')
        
        # Calculate consecutive absences from most recent services
        consecutive = 0
        for attendance in attendances:
            if attendance.status == 'absent':
                consecutive += 1
            else:
                break
        
        # Update the member's consecutive absences
        if member.consecutive_absences != consecutive:
            old_value = member.consecutive_absences
            member.consecutive_absences = consecutive
            member.save(update_fields=['consecutive_absences'])
            self.stdout.write(
                f'  {member.full_name}: {old_value} → {consecutive}'
            )
