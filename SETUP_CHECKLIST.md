# ✅ Setup & Configuration Checklist

## Pre-Installation Checklist

- [ ] Python 3.8+ installed (`python --version`)
- [ ] Node.js 16+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Git installed and initialized (`git status`)
- [ ] PostgreSQL installed (optional, for production)
- [ ] Text editor/IDE ready (VS Code, PyCharm, etc.)
- [ ] Terminal/Command prompt ready

---

## Backend Setup Checklist

### Step 1: Virtual Environment
- [ ] Navigate to backend directory: `cd backend`
- [ ] Create venv: `python -m venv venv`
- [ ] Activate venv:
  - [ ] Windows: `.\venv\Scripts\activate`
  - [ ] macOS/Linux: `source venv/bin/activate`
- [ ] Verify (should show `(venv)` in terminal)

### Step 2: Dependencies
- [ ] Install requirements: `pip install -r requirements.txt`
- [ ] Verify installation: `pip list` (should show Django, DRF, etc.)

### Step 3: Environment Configuration
- [ ] Copy template: `cp .env.example .env` (or `copy` on Windows)
- [ ] Edit `.env` with your settings:
  - [ ] Set `SECRET_KEY` (keep safe!)
  - [ ] Set `DEBUG=True` (development)
  - [ ] Set `ALLOWED_HOSTS=localhost,127.0.0.1`
  - [ ] Set database config
  - [ ] Set CORS origins

### Step 4: Database Setup
- [ ] Run migrations: `python manage.py migrate`
- [ ] Check for errors (should say "OK" for all apps)
- [ ] Verify database exists (`ls` and see `db.sqlite3`)

### Step 5: Admin Account
- [ ] Create superuser: `python manage.py createsuperuser`
- [ ] Enter username (e.g., `admin`)
- [ ] Enter email (e.g., `admin@church.local`)
- [ ] Enter password (use strong password)
- [ ] Confirm password

### Step 6: Start Server
- [ ] Run: `python manage.py runserver`
- [ ] Check output for "Starting development server at http://127.0.0.1:8000/"
- [ ] Leave terminal open (keep server running)

### Step 7: Verify Backend
- [ ] Open browser: http://localhost:8000
- [ ] Check admin panel: http://localhost:8000/admin
- [ ] Login with superuser credentials
- [ ] See Members, Services, Attendance in admin

---

## Frontend Setup Checklist

### Step 1: Dependencies
- [ ] Navigate to frontend: `cd frontend` (in new terminal!)
- [ ] Install dependencies: `npm install`
- [ ] Wait for installation to complete (2-5 minutes)
- [ ] Verify: `npm list` shows all packages

### Step 2: Environment Configuration
- [ ] Copy template: `cp .env.example .env` (or `copy` on Windows)
- [ ] Edit `.env`:
  - [ ] Set `VITE_API_URL=http://localhost:8000/api`
  - [ ] Save file

### Step 3: Start Development Server
- [ ] Run: `npm run dev`
- [ ] Wait for "Local: http://localhost:5173/"
- [ ] Leave terminal open (keep server running)

### Step 4: Verify Frontend
- [ ] Open browser: http://localhost:5173
- [ ] See Church Attendance homepage
- [ ] Check navigation menu works
- [ ] Click on different pages (Members, Services, Scanner, Reports)

---

## Post-Setup Checklist

### Create Test Data
- [ ] Go to http://localhost:8000/admin
- [ ] Log in with superuser credentials
- [ ] Click "Add Member"
  - [ ] Enter full name
  - [ ] Enter phone (optional)
  - [ ] Enter email (optional)
  - [ ] Enter department (e.g., "Worship Team")
  - [ ] Click Save
  - [ ] Verify QR code generated
- [ ] Create 5-10 test members

### Create a Service
- [ ] Go to http://localhost:8000/admin
- [ ] Click "Add Service"
  - [ ] Enter name (e.g., "Sunday Morning Service")
  - [ ] Select today's date
  - [ ] Enter time (e.g., 09:00)
  - [ ] Enter location (e.g., "Main Hall")
  - [ ] Enter description (optional)
  - [ ] Click Save

### Test the Scanner
- [ ] Go to http://localhost:5173/scanner
- [ ] Select service from dropdown
- [ ] Try manual check-in:
  - [ ] Get member ID from admin panel
  - [ ] Enter member ID in input
  - [ ] Click "Check In"
  - [ ] See success message
- [ ] Test camera (optional):
  - [ ] Click "Start Camera"
  - [ ] Grant camera permission if prompted
  - [ ] Should see video stream

### Test Reports
- [ ] Go to http://localhost:5173/reports
- [ ] Select service from left panel
- [ ] Should see:
  - [ ] Service name and date
  - [ ] Statistics (Present, Absent, Late)
  - [ ] Attendance table with members

### Test Member Management
- [ ] Go to http://localhost:5173/members
- [ ] Should see all members as cards
- [ ] Each card shows:
  - [ ] Member name
  - [ ] Member ID
  - [ ] QR code image
  - [ ] Contact info
- [ ] Click "Add New Member"
- [ ] Fill form and create member
- [ ] Verify member appears in list with new QR code

### Test Service Management
- [ ] Go to http://localhost:5173/services
- [ ] Should see all services as cards
- [ ] Click "Add New Service"
- [ ] Create a new service
- [ ] Verify it appears in list

---

## Database Configuration Checklist

### Using SQLite (Default - Development Only)
- [ ] Already configured in settings.py
- [ ] Migrations applied
- [ ] `db.sqlite3` file exists
- [ ] No additional setup needed

### Switching to PostgreSQL (Production)

#### Install PostgreSQL
- [ ] Download PostgreSQL from postgresql.org
- [ ] Install following instructions
- [ ] Verify: `psql --version`

#### Create Database
- [ ] Open psql terminal: `psql -U postgres`
- [ ] Create database: `CREATE DATABASE church_db;`
- [ ] Create user: `CREATE USER church_user WITH PASSWORD 'secure_password';`
- [ ] Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE church_db TO church_user;`
- [ ] Exit: `\q`

#### Update .env
- [ ] Change `DB_ENGINE` to `django.db.backends.postgresql`
- [ ] Set `DB_NAME=church_db`
- [ ] Set `DB_USER=church_user`
- [ ] Set `DB_PASSWORD=secure_password`
- [ ] Set `DB_HOST=localhost`
- [ ] Set `DB_PORT=5432`

#### Migrate to PostgreSQL
- [ ] Install psycopg2: `pip install psycopg2-binary`
- [ ] Run migrations: `python manage.py migrate`
- [ ] Create superuser: `python manage.py createsuperuser`

---

## Environment Variables Checklist

### Backend .env Must Have
- [ ] `SECRET_KEY` - Set to random string
- [ ] `DEBUG` - Set to `True` or `False`
- [ ] `ALLOWED_HOSTS` - List your domains
- [ ] `CORS_ALLOWED_ORIGINS` - List frontend URL

### Frontend .env Must Have
- [ ] `VITE_API_URL` - Points to backend API

### Optional (Production)
- [ ] Database credentials (if using PostgreSQL)
- [ ] Email configuration
- [ ] Slack webhook URL
- [ ] Cloud storage keys

---

## Common Setup Issues Checklist

### Python/Virtual Environment Issues
- [ ] Python path correct?
  - [ ] Try: `python3 --version`
  - [ ] Or: `py --version` (Windows)
- [ ] Venv activated?
  - [ ] Should see `(venv)` in terminal
  - [ ] Try deactivating: `deactivate`
  - [ ] Re-activate and try again
- [ ] Dependencies installed?
  - [ ] Try: `pip install -r requirements.txt` again
  - [ ] Try: `pip install --upgrade pip`

### Django Issues
- [ ] Port already in use?
  - [ ] Try: `python manage.py runserver 8001`
- [ ] Migrations failed?
  - [ ] Try: `python manage.py showmigrations`
  - [ ] Try: `python manage.py migrate --fake-initial`
- [ ] Superuser creation failed?
  - [ ] Try again with different username
  - [ ] Check email format

### Frontend Issues
- [ ] Port already in use?
  - [ ] Find process: `lsof -i :5173`
  - [ ] Or try: `npm run dev -- --port 5174`
- [ ] Dependencies not installed?
  - [ ] Try: `npm install` again
  - [ ] Try: `npm cache clean --force`
  - [ ] Try: `rm -rf node_modules && npm install`
- [ ] CORS errors?
  - [ ] Check backend CORS_ALLOWED_ORIGINS
  - [ ] Restart backend server
  - [ ] Check browser console for exact error

### API Connection Issues
- [ ] Backend not running?
  - [ ] Open new terminal
  - [ ] Navigate to backend
  - [ ] Run: `python manage.py runserver`
- [ ] Wrong API URL?
  - [ ] Check frontend .env
  - [ ] Should match backend URL
  - [ ] Restart frontend dev server
- [ ] CORS blocking requests?
  - [ ] Check backend .env
  - [ ] Update CORS_ALLOWED_ORIGINS
  - [ ] Restart backend

---

## Performance Checklist

### Backend Optimization
- [ ] Debug mode off in production: `DEBUG=False`
- [ ] Static files collected: `python manage.py collectstatic`
- [ ] Database indexed for main queries
- [ ] Caching configured (for production)
- [ ] Logging configured appropriately

### Frontend Optimization
- [ ] Production build created: `npm run build`
- [ ] Bundle size reasonable: `npm run build` shows sizes
- [ ] Images optimized
- [ ] Unnecessary re-renders minimized
- [ ] API calls debounced/throttled

---

## Security Checklist

### Before Production
- [ ] Change `DEBUG=False`
- [ ] Generate new `SECRET_KEY` (don't use default)
- [ ] Change default admin username (not "admin")
- [ ] Change default admin password (strong password)
- [ ] Enable HTTPS/SSL certificate
- [ ] Restrict ALLOWED_HOSTS
- [ ] Restrict CORS origins
- [ ] Review environment variables
- [ ] No secrets in code (use .env)
- [ ] Database backups configured

### Ongoing Security
- [ ] Keep dependencies updated
- [ ] Monitor error logs for vulnerabilities
- [ ] Review access logs regularly
- [ ] Update Django/packages when security releases come out
- [ ] Use strong passwords everywhere
- [ ] Enable two-factor authentication (if available)

---

## Deployment Checklist

### Before Deploying to Production
- [ ] All tests passing
- [ ] All features tested locally
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Database backup strategy in place
- [ ] SSL certificate obtained
- [ ] Server prepared (Ubuntu/Docker)
- [ ] Monitoring tools configured
- [ ] Rollback plan documented

### Deployment Steps
- [ ] See DEPLOYMENT.md for full checklist
- [ ] Clone repository to server
- [ ] Setup Python environment
- [ ] Install dependencies
- [ ] Configure .env for production
- [ ] Run migrations
- [ ] Collect static files
- [ ] Setup Gunicorn + Nginx
- [ ] Setup SSL certificate
- [ ] Start services
- [ ] Verify everything works
- [ ] Monitor for errors

---

## Testing Checklist

### Functionality Tests
- [ ] Can create member
  - [ ] QR code generates
  - [ ] Member ID is unique
- [ ] Can create service
  - [ ] Date and time saved correctly
- [ ] Can check in member
  - [ ] Manual entry works
  - [ ] Camera scanning works (if available)
  - [ ] Duplicate check-in prevented
- [ ] Can view attendance report
  - [ ] Statistics correct
  - [ ] Table displays properly

### UI/UX Tests
- [ ] Navigation works
- [ ] Forms validate input
- [ ] Error messages display
- [ ] Success messages display
- [ ] Mobile responsive
- [ ] Loading states show

### API Tests
- [ ] All endpoints accessible
- [ ] Correct status codes returned
- [ ] Error responses formatted correctly
- [ ] CORS headers present
- [ ] Rate limiting works (if configured)

---

## Daily Usage Checklist

### Before Service
- [ ] Service created in admin/system
- [ ] Member QR codes printed and available
- [ ] Scanner device charged and ready
- [ ] Camera tested and working
- [ ] Manual entry as backup ready

### During Service
- [ ] Scanner positioned correctly
- [ ] Members checking in one by one
- [ ] Success messages showing
- [ ] No technical issues

### After Service
- [ ] Review attendance report
- [ ] Note any absent members
- [ ] Archive attendance record
- [ ] Plan follow-up if needed

---

## Maintenance Checklist

### Weekly
- [ ] Check error logs
- [ ] Verify all services running
- [ ] Test core functionality
- [ ] Check backup status

### Monthly
- [ ] Update packages (pip, npm)
- [ ] Review database size
- [ ] Check security updates
- [ ] Analyze attendance trends

### Quarterly
- [ ] Major dependency updates
- [ ] Performance optimization review
- [ ] Security audit
- [ ] User feedback review

### Annually
- [ ] Infrastructure review
- [ ] Capacity planning
- [ ] Feature planning
- [ ] Complete security audit

---

## Final Verification

- [ ] Backend running: http://localhost:8000 ✅
- [ ] Frontend running: http://localhost:5173 ✅
- [ ] Admin panel accessible ✅
- [ ] Can create members ✅
- [ ] Can create services ✅
- [ ] Can check in members ✅
- [ ] Can view reports ✅
- [ ] All documentation read ✅

---

## 🎉 Setup Complete!

If all checks are done, your Church Attendance System is ready to use!

**Next Steps:**
1. Create sample data
2. Test with real members
3. Customize for your church
4. Deploy when ready

---

**Need Help?**
- Check QUICKSTART.md for common issues
- Check README.md for full documentation
- Check API_DOCUMENTATION.md for API details
- Check DEPLOYMENT.md for deployment steps

---

**Last Updated**: January 30, 2026  
**Status**: Ready for Use ✅
