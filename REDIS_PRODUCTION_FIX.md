# Production Redis Connection Fix

## Problem
The application was failing on production (Render) when deleting services because:
1. Redis was not available/running (`Error 111 connecting to localhost:6379. Connection refused`)
2. The service deletion signal tried to queue a Celery task to recalculate alerts
3. Celery's `.delay()` call failed immediately, causing the entire DELETE request to crash with a 500 error

## Solution Implemented

### 1. Graceful Error Handling in Signal Handler
**File:** `backend/services/models.py`

The `recalculate_alerts_on_service_delete` signal handler now:
- Attempts to queue the async task via Celery
- If it fails due to connection errors (Redis unavailable):
  - **Production:** Logs a warning and gracefully continues (the delete succeeds)
  - **Development/Testing:** Can fall back to synchronous execution if `CELERY_ALWAYS_EAGER=True`
- Never blocks the DELETE request on connection failures

### 2. Enhanced Celery Configuration
**File:** `backend/church_config/settings.py`

New settings:
```python
CELERY_ALWAYS_EAGER = os.getenv('CELERY_ALWAYS_EAGER', 'False')  # For testing
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = 'True'
CELERY_BROKER_CONNECTION_RETRY = True
CELERY_BROKER_CONNECTION_MAX_RETRIES = 10
```

## Deployment Recommendations

### For Render (or any production deployment):

1. **Setup Redis Service:**
   ```
   # Option A: Add Redis addon in Render dashboard
   # Option B: Configure external Redis provider
   # Option C: Use PostgreSQL as broker (less ideal for performance)
   ```

2. **Set Environment Variables:**
   ```env
   # Point to actual Redis instance
   CELERY_BROKER_URL=redis://<host>:<port>/<db>
   CELERY_RESULT_BACKEND=redis://<host>:<port>/<db>
   
   # Optional: Enable eager mode (not recommended for production)
   # CELERY_ALWAYS_EAGER=False  # Default, use async tasks
   ```

3. **Verify in Production:**
   - Delete a service - should succeed even if Redis is briefly unavailable
   - Check logs for warnings about Celery connection failures
   - Once Redis is available, alerts will be recalculated on next opportunity

### For Development/Testing:

1. **With Redis running locally:**
   ```bash
   # Start Redis
   redis-server
   
   # Run Django dev server
   python manage.py runserver
   ```

2. **Without Redis (testing mode):**
   ```bash
   # Set environment variable
   export CELERY_ALWAYS_EAGER=True
   
   # Tasks execute synchronously (slower but works without Redis)
   python manage.py runserver
   ```

## Technical Details

### Error Detection
The handler detects connection errors by checking:
- `'connection refused'` in error message
- `'error 111'` in error message  
- `'operational'` errors from Kombu
- `'cannot connect'` in error message

### Fallback Behavior
- **Connection Error (Redis unavailable):** Delete succeeds, alert recalculation skipped
- **Other Errors (CELERY_ALWAYS_EAGER=True):** Attempts synchronous execution
- **Production Default:** Silently degrades, logs warning, continues

## Testing the Fix

```bash
# Test in production-like mode (without Redis):
CELERY_ALWAYS_EAGER=False python manage.py shell

# Delete a service
from services.models import Service
Service.objects.first().delete()  # Should succeed even if Redis is down

# Check logs - should see graceful warning
```

## Monitoring

Watch for these log messages:
```
WARNING: Failed to queue alert recalculation after service deletion (OperationalError)...
INFO: Celery/Redis unavailable. Skipping alert recalculation...
```

When Redis becomes available:
```
INFO: Service deleted: Sunday Service. Queuing async alert recalculation...
INFO: Alert recalculation task queued successfully
```

## Related Files
- [services/models.py](backend/services/models.py#L60-L105) - Signal handler with error handling
- [church_config/settings.py](backend/church_config/settings.py#L269-L283) - Celery configuration
- [services/tasks.py](backend/services/tasks.py#L136-L158) - Async task definition
