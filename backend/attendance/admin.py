from django.contrib import admin
from .models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('member', 'service', 'status', 'check_in_time', 'created_at')
    list_filter = ('status', 'service__date', 'created_at')
    search_fields = ('member__full_name', 'member__member_id', 'service__name')
    readonly_fields = ('check_in_time', 'created_at')
    fieldsets = (
        ('Attendance Information', {
            'fields': ('member', 'service', 'status', 'notes')
        }),
        ('Check-in', {
            'fields': ('check_in_time',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
