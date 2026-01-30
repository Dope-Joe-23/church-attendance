from django.apps import AppConfig


class MembersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'members'
    
    def ready(self):
        """Import signals when app is ready"""
        import members.models  # This triggers the signal registration
