# ADVENTIFY - Global Baptism Certificate Platform

<div align="center">
  <img src="public/logo.svg" alt="ADVENTIFY Logo" width="120" height="120">
  
  **Global Baptism Certificate Platform for the Seventh-day Adventist Church**
</div>

---

## 📖 Overview

ADVENTIFY is a comprehensive web application designed specifically for the Seventh-day Adventist Church to manage baptism certificates globally. It follows the church's organizational hierarchy from General Conference down to local churches, providing role-based access control and certificate management at every level.

## ✨ Features

### 🏗️ Church Hierarchy Management
- **General Conference** → **Division** → **Union** → **Conference** → **Local Church**
- Complete CRUD operations for each hierarchy level
- Interactive tree-view visualization
- Role-based visibility and permissions

### 🔐 Authentication & Authorization
- JWT-based authentication with HTTP-only cookies
- 6 role levels with hierarchical permissions:
  - General Conference Admin (Global access)
  - Division Admin (Division scope)
  - Union Admin (Union scope)
  - Conference Admin (Conference scope, approval authority)
  - Church Admin (Church scope, creates records)
  - Member (View own certificate only)

### 👤 Person Management
- Unique Person ID (PID) generation
- Demographic information tracking
- Church association
- Baptism status tracking

### 📜 Baptism Records
- Create and manage baptism records
- Approval workflow (pending → approved/rejected)
- Pastor and witness information
- Church and date tracking

### 📜 Certificate Generation
- Unique Baptism Certificate Number (BCN)
  - Format: `DIV-UNI-CON-CH-YEAR-SERIAL`
  - Example: `EUD-UKU-SEC-001-2024-000001`
- Professional PDF certificate generation
- QR code with verification link
- Download and print functionality

### ✅ Public Verification
- Certificate verification endpoint: `/verify/[bcn]`
- QR code scanning support
- Displays certificate authenticity and details

### 📊 Analytics Dashboard
- Role-specific statistics
- Monthly baptism trends
- Church breakdown reports
- Growth percentage tracking

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Database**: Prisma ORM (SQLite dev / PostgreSQL production)
- **Authentication**: Custom JWT implementation
- **PDF Generation**: jsPDF
- **QR Codes**: qrcode library
- **Validation**: Zod schemas
- **State Management**: Zustand

## 📁 Project Structure

```
src/
├── app/
│   ├── (admin)/           # Protected admin routes
│   │   ├── layout.tsx     # Sidebar layout
│   │   ├── page.tsx       # Dashboard
│   │   ├── hierarchy/     # Church hierarchy management
│   │   ├── persons/       # Person records
│   │   ├── baptism-records/ # Baptism management
│   │   ├── certificates/  # Certificate management
│   │   ├── users/         # User management
│   │   └── audit-logs/    # Activity logs
│   ├── (auth)/
│   │   └── login/         # Authentication
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── divisions/     # Division CRUD
│   │   ├── unions/        # Union CRUD
│   │   ├── conferences/   # Conference CRUD
│   │   ├── churches/      # Church CRUD
│   │   ├── persons/       # Person CRUD
│   │   ├── baptism-records/ # Baptism record management
│   │   ├── certificates/  # Certificate generation
│   │   ├── verify/        # Public verification
│   │   ├── analytics/     # Dashboard stats
│   │   └── seed/          # Demo data seeding
│   ├── verify/            # Public verification page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── auth.ts            # Authentication utilities
│   ├── password.ts        # Password hashing
│   ├── jwt.ts             # JWT utilities
│   ├── certificate.ts     # PDF & QR generation
│   ├── audit.ts           # Audit logging
│   └── db.ts              # Database client
├── store/
│   └── index.ts           # Zustand stores
├── types/
│   └── index.ts           # TypeScript types
└── hooks/                 # React hooks
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm, yarn, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/adventify.git
cd adventify

# Install dependencies
npm install
# or
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npm run db:push

# Seed demo data (optional)
curl -X POST http://localhost:3000/api/seed

# Start development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL="file:./db/custom.db"
JWT_SECRET="your-secret-key-here"
NODE_ENV="development"
```

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| General Conference Admin | gc.admin@adventify.org | Password123 |
| Division Admin | eud.admin@adventify.org | Password123 |
| Union Admin | buc.admin@adventify.org | Password123 |
| Conference Admin | sec.admin@adventify.org | Password123 |
| Church Admin | church.admin@adventify.org | Password123 |

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create new user (admin only)
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Hierarchy
- `GET/POST /api/divisions` - List/create divisions
- `GET/POST /api/unions` - List/create unions
- `GET/POST /api/conferences` - List/create conferences
- `GET/POST /api/churches` - List/create churches

### Records
- `GET/POST /api/persons` - List/create persons
- `GET/POST /api/baptism-records` - List/create baptism records
- `POST /api/baptism-records/[id]/approve` - Approve record
- `POST /api/baptism-records/[id]/reject` - Reject record

### Certificates
- `GET/POST /api/certificates` - List/generate certificates
- `GET /api/verify/[bcn]` - Public verification

### Analytics
- `GET /api/analytics` - Dashboard statistics

## 🗄️ Database Schema

```prisma
model User {
  id, email, passwordHash, fullName, role
  divisionId?, unionId?, conferenceId?, churchId?
}

model Division {
  id, code, name, headquarters
  unions[]
}

model Union {
  id, code, name, divisionId
  conferences[]
}

model Conference {
  id, code, name, unionId
  churches[]
}

model Church {
  id, code, name, conferenceId
  persons[], baptismRecords[]
}

model Person {
  id, pid, fullName, dateOfBirth?
  baptismRecord?
}

model BaptismRecord {
  id, personId, churchId, baptismDate
  pastorName, status (PENDING/APPROVED/REJECTED)
  certificate?
}

model Certificate {
  id, bcn, baptismRecordId
  pdfData, qrCodeData, verificationUrl
}

model AuditLog {
  id, userId, action, entity, details
}
```

## 📱 Screenshots

The application features:
- Modern responsive design
- Mobile-friendly navigation
- Professional certificate PDFs with QR codes
- Interactive hierarchy tree view
- Real-time dashboard analytics

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token expiration
- HTTP-only cookies
- Role-based access control
- Scope-based data filtering
- Input validation with Zod
- Audit logging for all actions

## 🌐 Production Deployment

### Vercel (Frontend)
```bash
vercel deploy
```

### Database (Supabase/Railway/AWS RDS)
1. Create PostgreSQL database
2. Update `DATABASE_URL` environment variable
3. Run `prisma migrate deploy`

### Environment Variables (Production)
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="strong-random-secret"
NODE_ENV="production"
```

## 📄 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

<div align="center">
  <p>Built with ❤️ for the Seventh-day Adventist Church</p>
  <p>© 2024 ADVENTIFY. All rights reserved.</p>
</div>

