# Deployment Guide

## Production Deployment

This guide covers deploying the Church Attendance System to production.

## Prerequisites

- Ubuntu 20.04 or similar Linux server
- PostgreSQL database
- Nginx web server
- Node.js for the existing Vite frontend and the separate Next.js app

> **Python dependencies** such as `gunicorn`, `whitenoise`, `psycopg2-binary` and `dj-database-url` are installed via `pip install -r requirements.txt` (see section 3).

## Tenant-aware SaaS deployment (Ubuntu, PostgreSQL, Nginx)

Use this deployment path for the multi-tenant product. The older Backend and
Frontend sections below describe the original single-frontend setup; do not
combine their Nginx sites with the configuration here.

### DNS, TLS, and application origins

1. Create an `A`/`AAAA` record for the base domain and a wildcard record
   (`*.example.com`) pointing at the server. Restrict public ingress to SSH,
   HTTP, and HTTPS; bind PostgreSQL, Gunicorn, and Next.js to local interfaces.
2. Issue a certificate covering both `example.com` and `*.example.com`.
   Public-CA wildcard certificates require DNS-01 validation. Use your DNS
   provider's Certbot plugin with renewal credentials restricted to the
   required zone. Manual DNS challenges require manual renewal and are not an
   unattended production setup.
3. Copy `deploy/nginx/church-attendance.conf.example` to
   `/etc/nginx/sites-available/church-attendance`, replace `example.com` and
   the app paths, and enable it only after the certificate files exist. Run
   `sudo nginx -t` before reloading Nginx.

The example routes `/api/` and `/admin/` to Gunicorn, `/static/` to collected
Django assets, and all other paths (including `/checkin/<token>`) to Next.js.
The app listens only on `127.0.0.1:3000`; Gunicorn uses a Unix socket. The
Nginx `Host` header is passed through so tenant subdomains and registered
custom domains can be resolved by Django. Self-check-in QR URLs include the
tenant slug for the shared base-host setup. Offline attempts are not queued or
reported as successful; the member must retry after connectivity returns.

Create the production environment file at the repository root because Django
loads `PROJECT_ROOT/.env` (not `backend/.env`):

```bash
cd /srv/church-attendance
cp backend/.env.example .env
chmod 600 .env
```

Use values appropriate for the real deployment; do not copy example
credentials:

```env
DEBUG=False
SECRET_KEY=<generated-secret>
ALLOWED_HOSTS=example.com,.example.com
DB_ENGINE=django.db.backends.postgresql
DB_NAME=church_db
DB_USER=church_user
DB_PASSWORD=<database-secret>
DB_HOST=127.0.0.1
DB_PORT=5432
TENANT_BASE_DOMAIN=example.com
TENANT_DEFAULT_SLUG=default
TENANT_ALLOW_DEFAULT_CONTEXT=False
FRONTEND_URL=https://example.com
PUBLIC_APP_URL=https://example.com
VITE_API_URL=/api/
NEXT_PUBLIC_API_URL=/api
CORS_ALLOWED_ORIGINS=https://example.com
CSRF_TRUSTED_ORIGINS=https://example.com,https://*.example.com
TRUST_PROXY_SSL_HEADER=True
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=0
```

`NEXT_PUBLIC_API_URL` is embedded in the Next.js build; set it before building.
Only enable `TRUST_PROXY_SSL_HEADER` when Nginx is the trusted ingress and the
application ports/socket are not directly reachable from untrusted networks.
After confirming HTTPS and renewal, set HSTS deliberately; enable
`SECURE_HSTS_INCLUDE_SUBDOMAINS` or preload only after every covered host is
permanently HTTPS. Add every custom domain to Django `ALLOWED_HOSTS`, register
it on the corresponding tenant, and provision its own certificate; custom
domain certificate provisioning is not automated by this repository.

### Start the applications

```bash
cd /srv/church-attendance/backend
python3 -m venv venv
venv/bin/pip install -r requirements-prod.txt
venv/bin/python manage.py check
venv/bin/python manage.py migrate
venv/bin/python manage.py collectstatic --noinput

cd /srv/church-attendance/web
npm ci
npm run typecheck
npm run build
```

Run Gunicorn and Next.js under separate systemd services with an unprivileged
application user. Configure Gunicorn's socket at
`/run/church-attendance/gunicorn.sock` (create the runtime directory with
systemd `RuntimeDirectory=church-attendance`) and Next.js on
`127.0.0.1:3000`. Set the repository root as the working directory or otherwise
make the root `.env` available to Django. Start/reload Nginx only after both
services and their health checks succeed.

Before launch, configure external Stripe keys/prices, email delivery, DNS,
certificate renewal, backup storage, alert delivery, and restore testing.
These are deployment-specific integrations and are not provisioned by this
repository.

### Health checks, backups, and recovery

The unauthenticated `GET /api/health/` endpoint checks database connectivity
and returns HTTP 503 if the database is unavailable. Use it for an external
uptime probe:

```bash
curl --fail --show-error https://example.com/api/health/
```

Monitor the health endpoint, Gunicorn/Next.js systemd units, Nginx error logs,
PostgreSQL availability and disk space, Celery/Redis queue health, and
certificate renewal. Send alerts to an operator-managed destination; no
monitoring provider or alert credentials are configured here.

Make encrypted, off-host PostgreSQL backups. Keep encryption credentials
separate from the server and database credentials. For example, create a
restricted local custom-format dump before sending it to an approved encrypted
offsite target:

```bash
sudo install -d -o postgres -g postgres -m 700 /var/backups/church-attendance
sudo -u postgres pg_dump --format=custom --no-owner \
  --file="/var/backups/church-attendance/church_$(date +%Y%m%d_%H%M%S).dump" \
  church_db
```

Set and document retention in the offsite backup system. Test restores
regularly using a disposable database, never the live database:

```bash
sudo -u postgres createdb church_restore_check
sudo -u postgres pg_restore --exit-on-error --clean --if-exists \
  --dbname=church_restore_check /path/to/verified-backup.dump
```

Verify the restored schema and representative tenant counts, then remove only
the named test database after the restore check. Back up local uploaded media
separately; a database dump does not contain those file bytes. If Cloudinary
is configured, confirm its retention/recovery policy independently.

Take and verify a backup before applying production migrations. Deploy code,
run reviewed migrations, collect static files, restart services, and verify
`/api/health/` and a tenant-scoped sign-in/check-in. Prefer a forward fix over
blindly reversing a migration after tenant data has been written. Keep the
previous application release available for code rollback, but restore a
database only under an explicit recovery procedure.


## Backend Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3-pip python3-venv postgresql postgresql-contrib nginx nodejs npm git

# Create app user
sudo useradd -m -s /bin/bash churchapp
sudo su - churchapp
```

### 2. Clone Repository

```bash
git clone <your-repo-url> Church_Attendance
cd Church_Attendance/backend
```

### 3. Setup Python Environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn psycopg2-binary
```

### 4. Configure Environment

Create `.env` for production:

```bash
cp .env.example .env
```

Edit `.env`:
```env
SECRET_KEY=your-very-secure-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# PostgreSQL Configuration
DB_ENGINE=django.db.backends.postgresql
DB_NAME=church_db
DB_USER=church_user
DB_PASSWORD=strong_password_here
DB_HOST=localhost
DB_PORT=5432

CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 5. Setup PostgreSQL Database

```bash
sudo su - postgres
psql

CREATE DATABASE church_db;
CREATE USER church_user WITH PASSWORD 'strong_password_here';
ALTER ROLE church_user SET client_encoding TO 'utf8';
ALTER ROLE church_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE church_user SET default_transaction_deferrable TO on;
ALTER ROLE church_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE church_db TO church_user;
\q
```

### 6. Run Migrations

```bash
cd ~/Church_Attendance/backend
python manage.py makemigrations
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

### 7. Configure Gunicorn

Create `/etc/systemd/system/church-gunicorn.service`:

```ini
[Unit]
Description=Church Attendance Django Application
After=network.target

[Service]
Type=notify
User=churchapp
Group=www-data
WorkingDirectory=/home/churchapp/Church_Attendance/backend
Environment="PATH=/home/churchapp/Church_Attendance/backend/venv/bin"
ExecStart=/home/churchapp/Church_Attendance/backend/venv/bin/gunicorn \
    --workers 4 \
    --worker-class sync \
    --bind unix:/run/gunicorn.sock \
    --timeout 120 \
    church_config.wsgi:application

[Install]
WantedBy=multi-user.target
```

Enable and start Gunicorn:

```bash
sudo systemctl daemon-reload
sudo systemctl enable church-gunicorn
sudo systemctl start church-gunicorn
sudo systemctl status church-gunicorn
```

### 8. Configure Nginx

Create `/etc/nginx/sites-available/church`:

```nginx
upstream church_app {
    server unix:/run/gunicorn.sock fail_timeout=0;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 100M;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json;

    location /static/ {
        alias /home/churchapp/Church_Attendance/backend/staticfiles/;
        expires 30d;
    }

    location /media/ {
        alias /home/churchapp/Church_Attendance/backend/media/;
        expires 7d;
    }

    location / {
        proxy_pass http://church_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}
```

Enable Nginx site:

```bash
sudo ln -s /etc/nginx/sites-available/church /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9. Setup SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

## Frontend Deployment

### 1. Build Frontend

```bash
cd ~/Church_Attendance/frontend
npm install
npm run build
```

### 2. Serve Frontend

Create `/etc/nginx/sites-available/church-frontend`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    root /home/churchapp/Church_Attendance/frontend/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css text/javascript application/json;

    # Handle SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://church_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Docker Deployment

## Cloud Platform Deployment

### Using Render for Backend

1. **Connect repository**: Log in to [Render](https://render.com) and create a new Web Service pointing at your GitHub repository (`church-attendance`).
2. **Service Settings**:
   - **Name**: `church-backend` (or similar)
   - **Region**: pick nearest region.
   - **Environment**: `Python 3` (choose 3.11+ or match local env).
   - **Build Command**: `pip install -r backend/requirements.txt && python backend/manage.py collectstatic --noinput`
   - **Start Command**: `gunicorn church_config.wsgi:application --bind 0.0.0.0:$PORT`
   - **Instance Type**: select based on traffic; start with `Free` or `Starter`.
   - **Auto-Deploy**: enable automatic deploys from `main`/`master` or desired branch.

3. **Environment Variables**:
   Render allows you to set env vars in the dashboard. Add the contents of your `.env` or at least the following:
   ```
   DEBUG=False
   SECRET_KEY=<your secret>
   ALLOWED_HOSTS=<your-render-service>.onrender.com
   DB_ENGINE=django.db.backends.postgresql
   DB_NAME=<value>
   DB_USER=<value>
   DB_PASSWORD=<value>
   DB_HOST=<your-postgres-addon-host>
   DB_PORT=<your-postgres-addon-port>
   CORS_ALLOWED_ORIGINS=https://<your-front-end>.vercel.app
   FRONTEND_URL=https://<your-front-end>.vercel.app   # REQUIRED — used to build the self check-in QR links members scan; if unset it defaults to http://localhost:5173 and printed QRs will point at localhost!
   CELERY_BROKER_URL=redis://<render-redis-host>:6379/0   # if using Redis
   ```
   Render also offers Postgres and Redis as managed add-ons—provision those and wire the connection strings into the environment variables.

4. **Database**:
   - Create the database via the Render Postgres add-on or external provider.
   - After the service is deployed, run migrations using Render's shell or by adding a one‑off deploy script:
     ```bash
     render shell service/church-backend   # opens a shell
     python manage.py migrate
     python manage.py createsuperuser
     ```

5. **Static & Media Files**:
   - `collectstatic` runs during build. Static files will be served by Gunicorn, which is acceptable for low traffic.
   - For media uploads, use an external storage service like AWS S3; configure `DEFAULT_FILE_STORAGE` accordingly.

6. **Scaling & Logs**:
   - Monitor logs from the Render dashboard under the service’s **Logs** tab.
   - Scale instances or add workers as needed.

### Deploying Frontend on Vercel

1. **Connect repository**: Go to [Vercel](https://vercel.com) and import the `frontend` directory of the same repo.
   - Choose the `frontend` subdirectory as the project root during setup.

2. **Project Settings**:
   - **Framework Preset**: Select `Vite` or `Other` and set build command to `npm run build` and output directory to `dist`.
   - **Install Command**: `npm ci` (or `npm install`).
   - **Development Command**: `npm run dev` (for previews).

3. **Environment Variables**:
   - Add any necessary variables (e.g. API base URL) under **Settings → Environment Variables**.
     Example:
     ```text
     VITE_API_URL=https://<your-backend-service>.onrender.com/api/
     ```
   Vite exposes variables prefixed with `VITE_`.

4. **Automatic Deploys**: Enable deployments from the `main` (or primary) branch; each push will trigger a build.

5. **Custom Domain**:
   - Add your custom domain in Vercel settings and follow instructions to configure DNS.
   - Configure CNAME pointing to `cname.vercel-dns.com`.

6. **Routing & Redirects**:
   - If you need custom rewrites (for example redirecting `/api` to backend), add a `vercel.json` file in `frontend`:
     ```json
     {
       "rewrites": [
         { "source": "/api/(.*)", "destination": "https://<your-backend-service>.onrender.com/api/$1" }
       ]
     }
     ```
   - For SPA routing, Vercel will serve `index.html` by default, so no extra config is needed.

7. **Preview Environments**: Each pull request creates a unique preview deployment automatically.

### Notes
- You can protect sensitive settings using secrets on both platforms.
- The above steps assume the backend’s API root is `/api/`; adjust if different.
- Since Render handles HTTPS termination, update `ALLOWED_HOSTS` accordingly.

---

(Original on‑premises/pure‑server instructions remain above for self‑hosted deployments.)

### Build Docker Images

**Backend Dockerfile:**

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

RUN python manage.py collectstatic --noinput

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "church_config.wsgi:application"]
```

**Frontend Dockerfile:**

```dockerfile
FROM node:16-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: church_db
      POSTGRES_USER: church_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      - DB_ENGINE=django.db.backends.postgresql
      - DB_NAME=church_db
      - DB_USER=church_user
      - DB_PASSWORD=secure_password
      - DB_HOST=db
      - DEBUG=False
      - SECRET_KEY=your-secret-key
    depends_on:
      - db
    ports:
      - "8000:8000"
    volumes:
      - ./backend/media:/app/media
      - ./backend/staticfiles:/app/staticfiles

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:
```

Run with Docker Compose:

```bash
docker-compose up -d
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

## Monitoring & Maintenance

### Log Monitoring

```bash
# Django logs
sudo journalctl -u church-gunicorn -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Backup Database

```bash
# Daily backup
pg_dump church_db > backup_$(date +%Y%m%d).sql

# Automated backup (crontab)
0 2 * * * pg_dump church_db > /backups/church_$(date +\%Y\%m\%d).sql
```

### Update Application

```bash
cd ~/Church_Attendance
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart church-gunicorn

# Frontend
cd ../frontend
npm install
npm run build
sudo systemctl restart nginx
```

## Performance Optimization

### Caching

```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}
```

### Database Optimization

```sql
-- Create indexes for frequently queried fields
CREATE INDEX idx_member_id ON members_member(member_id);
CREATE INDEX idx_service_date ON services_service(date);
CREATE INDEX idx_attendance_service ON attendance_attendance(service_id);
```

### Frontend Optimization

```javascript
// Vite configuration
export default {
  build: {
    minify: 'terser',
    sourcemap: false,
  },
}
```

## Security Checklist

- [ ] Set `DEBUG=False` in production
- [ ] Use strong `SECRET_KEY`
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Enable database backups
- [ ] Configure rate limiting
- [ ] Use environment variables for secrets
- [ ] Implement authentication for admin
- [ ] Setup monitoring and alerts

## Troubleshooting

### 502 Bad Gateway

```bash
sudo systemctl status church-gunicorn
sudo journalctl -u church-gunicorn -n 50
```

### Database Connection Error

```bash
sudo -u postgres psql
\c church_db
\dt  # List tables
```

### Static Files Not Loading

```bash
cd backend
python manage.py collectstatic --clear --noinput
sudo chown -R churchapp:www-data staticfiles/
```

## Support

For deployment issues:
1. Check logs: `sudo journalctl -u church-gunicorn`
2. Verify database connection
3. Check Nginx configuration: `sudo nginx -t`
4. Review environment variables in `.env`
