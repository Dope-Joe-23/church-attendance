from django.contrib import admin
from .models import Member, MemberAlert, ContactLog


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ('member_id', 'full_name', 'email', 'attendance_status', 'consecutive_absences', 'engagement_score', 'created_at')
    list_filter = ('department', 'attendance_status', 'created_at')
    search_fields = ('member_id', 'full_name', 'email', 'phone')
    readonly_fields = ('member_id', 'qr_code_image', 'created_at', 'updated_at', 'consecutive_absences', 'last_attendance_date', 'engagement_score')
    fieldsets = (
        ('Member Information', {
            'fields': ('member_id', 'full_name', 'phone', 'email', 'department', 'group', 'is_visitor')
        }),
        ('QR Code', {
            'fields': ('qr_code_image',)
        }),
        ('Attendance & Engagement', {
            'fields': ('consecutive_absences', 'last_attendance_date', 'attendance_status', 'engagement_score', 'last_contact_date', 'pastoral_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(MemberAlert)
class MemberAlertAdmin(admin.ModelAdmin):
    list_display = ('member', 'alert_level', 'is_resolved', 'created_at')
    list_filter = ('alert_level', 'is_resolved', 'created_at')
    search_fields = ('member__full_name', 'member__member_id')
    readonly_fields = ('created_at', 'resolved_at')
    fieldsets = (
        ('Alert Information', {
            'fields': ('member', 'alert_level', 'reason')
        }),
        ('Resolution', {
            'fields': ('is_resolved', 'resolved_at', 'resolution_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(ContactLog)
class ContactLogAdmin(admin.ModelAdmin):
    list_display = ('member', 'contact_method', 'contact_date', 'follow_up_needed', 'contacted_by')
    list_filter = ('contact_method', 'follow_up_needed', 'contact_date')
    search_fields = ('member__full_name', 'member__member_id', 'contacted_by')
    readonly_fields = ('contact_date',)
    fieldsets = (
        ('Contact Information', {
            'fields': ('member', 'contact_method', 'contacted_by', 'contact_date')
        }),
        ('Message', {
            'fields': ('message_sent', 'response_received')
        }),
        ('Follow-up', {
            'fields': ('follow_up_needed', 'follow_up_date')
        }),
    )
