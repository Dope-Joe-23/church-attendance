# Deployment Guide

## Production Deployment

This guide covers deploying the Church Attendance System to production.

## Prerequisites

- Ubuntu 20.04 or similar Linux server
- PostgreSQL database
- Nginx web server
- Gunicorn for Django
- Node.js for frontend build

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
