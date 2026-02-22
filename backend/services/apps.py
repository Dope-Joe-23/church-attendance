from django.apps import AppConfig


class ServicesConfig(AppConfig):
    name = 'services'
    default_auto_field = 'django.db.models.BigAutoField'
    
    def ready(self):
        """Import signals when app is ready"""
        import services.models  # This triggers the signal registration
