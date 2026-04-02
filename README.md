# ADVENTIFY - Church Verification Platform

## Overview

Adventify is a digital verification system that enables churches to instantly issue and deliver official certificates and introduction letters to members worldwide. Perfect for baptism certificates, visa support letters, character references, and more.

## Features

### Certificates
- Baptism certificates
- Youth honors and service awards
- Special recognitions and accomplishments
- Ordinations and leadership roles
- Custom church-specific certificates

### Introduction Letters
- Visa application support
- Bank account opening verification
- Employment verification
- Character references
- Church membership proof
- Custom verification letters

### Security & Trust
- Digital signatures (HMAC-SHA256)
- Unique ID numbers (non-duplicable)
- QR code verification for instant authenticity checks
- One-year validity periods
- Complete audit trail
- Instant revocation capability

### Simple Workflow
1. **Church Clerk** - Creates request with member details
2. **Church Pastor** - Reviews and approves with one click
3. **System** - Generates signed digital document
4. **Member** - Receives PDF instantly, ready to use
5. **Institutions** - Verify by scanning QR code (no church call needed)

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL (production) or SQLite (development)

### Installation

```bash
# Clone the repository
git clone https://github.com/vibecodingmind/adventify.git
cd adventify

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Set up database
npx prisma migrate dev --name init
npx prisma db seed

# Start development server
npm run dev
```

Visit `http://localhost:3000` to start using Adventify.

## Usage

### For Church Members
1. Navigate to the Verify page (`/verify`)
2. Enter certificate or letter ID
3. Scan or view the verification details
4. Download the document for use at embassies, banks, employers

### For Church Clerks
1. Go to Clerk Dashboard (`/dashboard/clerk`)
2. Click "Create New Request"
3. Fill in member details and document type
4. Submit for pastor approval
5. Member receives document when approved

### For Church Pastors
1. Go to Pastor Dashboard (`/dashboard/pastor`)
2. Review pending requests
3. Approve or reject with one click
4. System automatically generates and sends to member
5. View approval history anytime

### For Church Leadership
1. Access Admin Dashboard (`/dashboard/admin`)
2. View real-time reports by organizational level
3. Monitor document issuance and usage
4. Track system activity and compliance

## Project Structure

```
adventify/
├── app/
│   ├── api/               # API routes
│   │   ├── certificates/  # Certificate endpoints
│   │   ├── requests/      # Request management
│   │   └── demo-requests/ # Demo functionality
│   ├── dashboard/         # Dashboard pages
│   │   ├── clerk/         # Clerk interface
│   │   ├── pastor/        # Pastor interface
│   │   └── admin/         # Admin interface
│   ├── verify/            # Public verification page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── lib/
│   ├── certificate-templates.ts    # Template definitions
│   ├── certificate-generation.ts   # PDF generation
│   └── utils.ts                    # Utility functions
├── components/            # Reusable components
├── types/                 # TypeScript types
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed data
├── public/                # Static assets
├── .env.example           # Environment template
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── next.config.js         # Next.js config
```

## Database Schema

### Key Models

- **User** - Church members, clerks, pastors, admins
- **Church** - Local churches and administrative units
- **CertificateRequest** - Request workflow (DRAFT → SUBMITTED → APPROVED → GENERATED → DELIVERED)
- **CertificateType** - Defines available certificate types
- **Certificate** - Issued certificates with digital signatures
- **IntroductionLetter** - Issued introduction letters
- **LetterTemplate** - Customizable letter templates
- **AuditLog** - Complete action history
- **LetterVerificationLog** - Tracking for QR code verifications

## API Endpoints

### Public Endpoints
- `GET /api/verify/:id` - Verify certificate/letter by ID (no auth required)
- `GET /api/verify/qr/:token` - Verify via QR code token

### Clerk Endpoints
- `POST /api/requests` - Create new request
- `GET /api/requests` - List requests
- `PUT /api/requests/:id` - Update request

### Pastor Endpoints
- `GET /api/requests/pending` - List pending approvals
- `POST /api/requests/:id/approve` - Approve request
- `POST /api/requests/:id/reject` - Reject request

### Admin Endpoints
- `GET /api/analytics` - System analytics
- `GET /api/reports` - Generate reports
- `GET /api/audit-log` - View action history

## Security

- **Authentication**: Role-based access control (RBAC)
- **Encryption**: TLS 1.3 for all data in transit
- **Digital Signatures**: HMAC-SHA256 for certificate verification
- **Data Privacy**: Member information protected, audit trail maintained
- **Compliance**: GDPR-compliant data handling and retention

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost/adventify"

# JWT Authentication
JWT_SECRET="your-secret-key-here"

# API Configuration
NEXT_PUBLIC_API_URL="https://api.adventify.com"

# QR Code Security
QR_CODE_SECRET="your-qr-secret-here"
```

## Development

### Running Tests
```bash
npm run test
```

### Building for Production
```bash
npm run build
npm run start
```

### Linting
```bash
npm run lint
```

## Deployment

### AWS Deployment
1. Create EC2 instances with Node.js
2. Set up PostgreSQL RDS
3. Configure CloudFront CDN
4. Set up Application Load Balancer
5. Deploy with PM2 process manager

### DigitalOcean Deployment
1. Create Droplet with Node.js
2. Set up PostgreSQL database
3. Configure Nginx reverse proxy
4. Deploy with PM2 or Docker

### Self-Hosted Deployment
1. Install Node.js and PostgreSQL
2. Clone repository
3. Configure environment variables
4. Run migrations
5. Start with PM2: `pm2 start "npm start" --name adventify`

## Support

For support, documentation, or feature requests:
- Email: support@adventify.com
- Documentation: https://docs.adventify.com
- GitHub Issues: https://github.com/vibecodingmind/adventify/issues

## License

© 2026 Adventify. All rights reserved.

## Roadmap

- [ ] Multi-language support
- [ ] Mobile app (iOS/Android)
- [ ] Advanced analytics dashboard
- [ ] Integration with church management systems
- [ ] Blockchain-based certificate verification
- [ ] Automated document generation templates
- [ ] SMS/Email notifications
- [ ] Document archival and retrieval

## Contributors

Built with ❤️ for the Seventh-day Adventist Church community.
