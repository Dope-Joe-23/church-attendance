from django.contrib import admin
from .models import Member


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ('member_id', 'full_name', 'email', 'department', 'created_at')
    list_filter = ('department', 'created_at')
    search_fields = ('member_id', 'full_name', 'email', 'phone')
    readonly_fields = ('member_id', 'qr_code_image', 'created_at', 'updated_at')
    fieldsets = (
        ('Member Information', {
            'fields': ('member_id', 'full_name', 'phone', 'email', 'department')
        }),
        ('QR Code', {
            'fields': ('qr_code_image',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
