from django.contrib import admin
from .models import Service


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'date', 'start_time', 'location', 'created_at')
    list_filter = ('date', 'created_at')
    search_fields = ('name', 'location', 'description')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Service Information', {
            'fields': ('name', 'date', 'start_time', 'location', 'description')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
