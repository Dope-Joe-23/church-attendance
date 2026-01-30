# Church Attendance Tracking System

A modern full-stack application for managing church member attendance with QR code scanning capabilities.

## Features

- ✨ **QR Code Generation**: Automatic QR code generation for each member
- 📱 **Attendance Scanner**: Real-time attendance tracking using QR code scanning or manual entry
- 👥 **Member Management**: Complete member profile management with contact information
- ⛪ **Service Management**: Organize and manage church services and events
- 📊 **Attendance Reports**: Detailed analytics and attendance statistics
- 🎨 **Modern UI**: Responsive design with intuitive user interface
- 🔐 **Admin Dashboard**: Comprehensive backend administration panel
- 🚀 **RESTful API**: Well-structured API endpoints for scalability

## Project Structure

```
Church_Attendance/
├── backend/
│   ├── church_config/          # Django project configuration
│   ├── members/                # Members app
│   ├── services/               # Services app
│   ├── attendance/             # Attendance app
│   ├── media/                  # QR code images
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API client and endpoints
│   │   ├── context/           # Zustand stores
│   │   ├── styles/            # CSS files
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── .env
│   ├── .env.example
│   └── vite.config.js
│
└── README.md

```

## Technology Stack

### Backend
- **Framework**: Django 6.0.1
- **API**: Django REST Framework 3.14.0
- **Database**: PostgreSQL (or SQLite for development)
- **QR Code**: qrcode 7.4.2, Pillow 10.1.0
- **CORS**: django-cors-headers 4.3.1
- **Environment**: python-dotenv 1.0.0

### Frontend
- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.2.4
- **Routing**: React Router DOM 7.0.0
- **HTTP Client**: Axios 1.7.0
- **State Management**: Zustand 4.5.0
- **Styling**: CSS3 (with custom design system)

## Prerequisites

- Python 3.8+
- Node.js 16+ and npm
- PostgreSQL 12+ (optional, for production)
- Git

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Church_Attendance
```

### 2. Backend Setup

#### Create and Activate Virtual Environment

**Windows:**
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
```

**macOS/Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

#### Install Dependencies

```bash
pip install -r requirements.txt
```

#### Configure Environment Variables

Copy `.env.example` to `.env` and update with your configuration:

```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
# Django Configuration
SECRET_KEY=your-secret-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (SQLite for development)
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3

# For PostgreSQL (uncomment to use):
# DB_ENGINE=django.db.backends.postgresql
# DB_NAME=church_db
# DB_USER=postgres
# DB_PASSWORD=your_password
# DB_HOST=localhost
# DB_PORT=5432

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8000
```

#### Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

#### Create Superuser (Admin Account)

```bash
python manage.py createsuperuser
```

#### Start Backend Server

```bash
python manage.py runserver
```

The backend will be available at `http://localhost:8000`

Access Django Admin at `http://localhost:8000/admin`

### 3. Frontend Setup

#### Install Dependencies

```bash
cd ../frontend
npm install
```

#### Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

The default configuration points to `http://localhost:8000/api`

#### Start Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Members
- `GET /api/members/` - List all members
- `POST /api/members/` - Create new member
- `GET /api/members/{id}/` - Get member details
- `PUT /api/members/{id}/` - Update member
- `DELETE /api/members/{id}/` - Delete member
- `GET /api/members/by_member_id/?member_id=ABC123` - Get member by ID
- `GET /api/members/{id}/qr_code/` - Get member's QR code

### Services
- `GET /api/services/` - List all services
- `POST /api/services/` - Create new service
- `GET /api/services/{id}/` - Get service details
- `PUT /api/services/{id}/` - Update service
- `DELETE /api/services/{id}/` - Delete service

### Attendance
- `GET /api/attendance/` - List all attendance records
- `POST /api/attendance/` - Create attendance record
- `GET /api/attendance/{id}/` - Get attendance details
- `POST /api/attendance/checkin/` - Check-in member via QR code
- `GET /api/attendance/by_service/?service_id=1` - Get attendance for a service

### Check-in Request Example

```bash
POST /api/attendance/checkin/
Content-Type: application/json

{
    "member_id": "ABC123",
    "service_id": 1
}
```

### Check-in Response

```json
{
    "success": true,
    "message": "John Doe checked in successfully",
    "attendance": {
        "id": 1,
        "member": 1,
        "service": 1,
        "check_in_time": "2025-01-30T17:30:45.123456Z",
        "status": "present"
    }
}
```

## Features Overview

### Home Page
- Overview of the application
- Key features and benefits

### Members Management
- View all members
- Add new members (auto-generates QR code)
- Edit member information
- Delete members
- View QR codes for each member

### Services Management
- View all church services
- Create new services
- Edit service details
- Delete services
- Track services by date and time

### Attendance Scanner
- Select a service
- Scan QR codes using device camera
- Manual check-in by entering member ID
- Real-time success/failure feedback
- Check-in counter

### Attendance Reports
- View detailed attendance records for each service
- Statistics: Total Present, Absent, Late
- Member attendance history
- Filter by service and date

### Admin Dashboard
- Full Django admin interface
- Manage members, services, and attendance
- Advanced filtering and search
- Bulk operations

## Database Models

### Member
- `id` - Primary key
- `member_id` - Unique identifier (auto-generated)
- `full_name` - Member's name
- `phone` - Contact phone number
- `email` - Email address
- `department` - Church department/ministry
- `qr_code_image` - Generated QR code image
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Service
- `id` - Primary key
- `name` - Service name
- `date` - Service date
- `start_time` - Service start time
- `location` - Service location (optional)
- `description` - Service description (optional)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Attendance
- `id` - Primary key
- `member` - Foreign key to Member
- `service` - Foreign key to Service
- `check_in_time` - When member checked in
- `status` - Attendance status (present, absent, late)
- `notes` - Additional notes (optional)
- `created_at` - Creation timestamp

## Running Tests

### Backend Tests

```bash
cd backend
python manage.py test
```

### Frontend Tests

```bash
cd frontend
npm run test
```

## Building for Production

### Backend

```bash
cd backend
# Collect static files
python manage.py collectstatic --noinput

# Create a production settings file
# Update SECRET_KEY, DEBUG=False, ALLOWED_HOSTS
# Configure PostgreSQL database
```

### Frontend

```bash
cd frontend
npm run build
```

## Docker Deployment (Optional)

### Backend Dockerfile

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "church_config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### Frontend Dockerfile

```dockerfile
FROM node:16-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Configuration

### Database Configuration

**SQLite (Development - Default)**
```env
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3
```

**PostgreSQL (Production)**
```env
DB_ENGINE=django.db.backends.postgresql
DB_NAME=church_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

To switch to PostgreSQL:
1. Install PostgreSQL
2. Create a database: `createdb church_db`
3. Update `.env` with PostgreSQL credentials
4. Run migrations: `python manage.py migrate`

## Troubleshooting

### CORS Errors
- Ensure `CORS_ALLOWED_ORIGINS` in backend `.env` includes your frontend URL
- Check that frontend `.env` has correct `VITE_API_URL`

### Camera Access Denied
- Ensure HTTPS is used in production
- Grant camera permissions in browser settings
- Check browser security policies

### QR Code Not Generating
- Ensure Pillow and qrcode packages are installed
- Check media folder permissions
- Verify `MEDIA_ROOT` directory exists

### Database Connection Error
- Verify PostgreSQL is running (if using PostgreSQL)
- Check DATABASE credentials in `.env`
- Ensure database exists and user has permissions

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m 'Add your feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Submit a pull request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include error messages and screenshots

## Future Enhancements

- [ ] SMS/Email notifications for attendance reminders
- [ ] Mobile app for members
- [ ] Advanced analytics and reporting
- [ ] Integration with payment systems
- [ ] Event calendar with syncing
- [ ] Multi-language support
- [ ] Real-time attendance dashboard
- [ ] Bulk member import/export

## Authors

- Development Team

## Changelog

### Version 1.0.0 (Initial Release)
- Core attendance tracking system
- QR code generation and scanning
- Member and service management
- Attendance reporting
- Admin dashboard
