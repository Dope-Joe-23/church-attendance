# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Python 3.8+
- Node.js 16+
- Git

### Step 1: Backend Setup (Terminal 1)

```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser  # Create admin user
python manage.py runserver
```

✅ Backend running at http://localhost:8000

### Step 2: Frontend Setup (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

✅ Frontend running at http://localhost:5173

### Step 3: Access the Application

**Frontend**: http://localhost:5173
**Admin Panel**: http://localhost:8000/admin

## 📋 First Steps

1. **Create Admin Account**
   - Go to http://localhost:8000/admin
   - Create members with the provided form

2. **Create a Service**
   - Go to http://localhost:5173/services
   - Click "Add New Service"
   - Fill in service details (name, date, time)

3. **Add Members**
   - Go to http://localhost:5173/members
   - Click "Add New Member"
   - Member QR codes are auto-generated

4. **Start Scanning**
   - Go to http://localhost:5173/scanner
   - Select a service
   - Start camera and scan QR codes
   - Or enter member ID manually

5. **View Reports**
   - Go to http://localhost:5173/reports
   - Select a service to view attendance

## 🔧 Configuration

### Backend (.env)
```env
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api
```

## 📱 API Testing

### Check-in Member

```bash
curl -X POST http://localhost:8000/api/attendance/checkin/ \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "ABC123",
    "service_id": 1
  }'
```

### Get Service Attendance

```bash
curl http://localhost:8000/api/attendance/by_service/?service_id=1
```

## 🐛 Troubleshooting

**Camera not working?**
- Ensure HTTPS in production
- Check browser permissions
- Try manual entry instead

**CORS error?**
- Check CORS_ALLOWED_ORIGINS in .env
- Restart backend server

**Database error?**
- Run `python manage.py migrate`
- Check db.sqlite3 permissions

## 📚 More Information

See [README.md](./README.md) for complete documentation.
