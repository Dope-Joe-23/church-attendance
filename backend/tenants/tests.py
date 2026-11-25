from django.core.management import call_command
from django.test import TestCase

from members.models import Member
from services.models import Service
from attendance.models import Attendance
from tenants.models import Tenant


class TenantBackfillCommandTests(TestCase):
    def test_create_tenant_from_existing_creates_and_backfills(self):
        member = Member.objects.create(member_id='M-1001', full_name='Test Member')
        service = Service.objects.create(name='Sunday Service', start_time='09:00:00')
        Attendance.objects.create(member=member, service=service, status='present')

        call_command('create_tenant_from_existing', slug='new-church', name='New Church')

        new_tenant = Tenant.objects.get(slug='new-church')
        self.assertEqual(new_tenant.name, 'New Church')
        self.assertEqual(Member.all_tenants.filter(tenant=new_tenant).count(), 1)
        self.assertEqual(Service.all_tenants.filter(tenant=new_tenant).count(), 1)
        self.assertEqual(Attendance.all_tenants.filter(tenant=new_tenant).count(), 1)
