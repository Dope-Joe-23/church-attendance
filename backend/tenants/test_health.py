from unittest.mock import patch

from django.db import OperationalError
from rest_framework import status
from rest_framework.test import APITestCase


class HealthCheckTests(APITestCase):
    def test_database_connection_is_reported_healthy(self):
        response = self.client.get('/api/health/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'status': 'ok', 'database': 'ok'})

    @patch('church_config.views.connection.cursor', side_effect=OperationalError)
    def test_database_outage_is_reported_unavailable(self, _cursor):
        response = self.client.get('/api/health/')

        self.assertEqual(
            response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
        self.assertEqual(
            response.data,
            {'status': 'unavailable', 'database': 'unavailable'},
        )
