# 🎓 ADVENTIFY - Revised Certification Platform Roles & Permissions

**Document:** Multi-Purpose Certification Platform Architecture  
**Date:** April 2, 2026  
**Version:** 2.0 - REVISED  
**Scope:** Baptism Certificates, Youth Honors, Recognition Certificates, and beyond

---

## 📖 Platform Overview

ADVENTIFY is a **multi-purpose certification platform** for the Seventh-day Adventist Church that handles:

✅ **Baptism Certificates** - Religious milestones  
✅ **Youth Honors Certificates** - Achievement recognition  
✅ **Service Recognition Certificates** - Ministry acknowledgment  
✅ **Achievement Certificates** - Skills and competency  
✅ **Custom Certificates** - Department-specific certifications  

**Key Principle:** 
- **Church Pastors** are the **ONLY** role that can approve and generate certificates
- **Church Clerks** prepare and submit certificate requests
- **All higher levels** are **read-only observers** with reporting authority

---

## 🏢 Organizational Hierarchy (Top-Down)

```
GENERAL_CONFERENCE (Level 6)
    ↓ Creates and manages
DIVISION (Level 5)
    ↓ Creates and manages
UNION (Level 4)
    ↓ Creates and manages
CONFERENCE (Level 3)
    ↓ Creates and manages
CHURCH (Operational Level)
    ↓ Contains
PASTOR (Level 2) ← ONLY role that approves certificates
CLERK (Level 1) ← Prepares certificate requests
MEMBER (Level 0) ← Receives and manages certificates
```

---

## 🔐 7-Tier Role System with Revised Permissions

### LEVEL 6: GENERAL_CONFERENCE_ADMIN

**Scope:** Global - Entire system  
**Primary Role:** System administrator and global overseer

#### Allowed Operations

**Organizational Management**
✅ Create divisions  
✅ Edit division details  
✅ Delete divisions  
✅ View all divisions  
✅ View all divisions' data and statistics  

**User Management**
✅ Create Division Admins  
✅ Create Union Admins  
✅ Create Conference Admins  
✅ Create Church Pastors  
✅ Create Church Clerks  
✅ Create Members  
✅ Edit any user's information  
✅ Assign users to organizational levels  
✅ Deactivate/reactivate users  
✅ Reset user passwords  

**Reporting & Analytics (READ-ONLY)**
✅ Global dashboard with worldwide statistics  
✅ Total certificates issued (all types)  
✅ Pending certificates (all churches)  
✅ Approved certificates breakdown  
✅ Certificate type breakdown  
✅ Monthly trends (global)  
✅ Church-by-church reports  
✅ Division-wise statistics  
✅ Certificates by type and date range  
✅ Export analytics data  

**Audit & Compliance**
✅ View complete audit logs (all users, all actions)  
✅ Filter audit logs by action, user, entity, date  
✅ View sensitive data access logs  
✅ Generate compliance reports  
✅ Archive old records  
✅ Compliance verification  

**System Administration**
✅ Manage system settings  
✅ Configure certificate signing key  
✅ Setup SMTP for emails  
✅ Manage digital wallet integrations  
✅ Database maintenance  
✅ View system health logs  
✅ Configure backup policies  
✅ Manage certificate templates (system-wide)  

**❌ CANNOT DO**
❌ Approve or generate certificates (PASTOR ONLY)  
❌ Delete certificates (read-only)  
❌ Edit approved certificates  
❌ Create person records at church level  
❌ Create baptism/certificate requests  
❌ Edit certificate content after approval  

---

### LEVEL 5: DIVISION_ADMIN

**Scope:** Division-level - One division  
**Primary Role:** Division manager and division-level overseer

#### Allowed Operations

**Organizational Management (Within Division)**
✅ View all unions in division  
✅ Create unions under division  
✅ Edit union details  
✅ Delete unions  
✅ View all conferences in division  
✅ View all churches in division  

**User Management (Within Division)**
✅ Create Union Admins (for their division)  
✅ Create Conference Admins  
✅ Create Church Pastors  
✅ Create Church Clerks  
✅ Create Members  
✅ Edit users in division  
✅ Assign to organizational levels  
✅ Deactivate/reactivate users  
✅ Reset passwords  

**Reporting & Analytics (READ-ONLY)**
✅ Division-level dashboard  
✅ Total certificates in division  
✅ Pending certificates in division  
✅ Approved certificates breakdown  
✅ Monthly trends (division)  
✅ Union-wise breakdown  
✅ Church-specific statistics  
✅ Certificate type breakdown  
✅ Export division data  

**❌ CANNOT DO**
❌ Approve or generate certificates (PASTOR ONLY)  
❌ Create certificate requests  
❌ Edit or delete certificates  
❌ Create divisions  
❌ Access data from other divisions  
❌ Create person records  
❌ Manage users outside division  

---

### LEVEL 4: UNION_ADMIN

**Scope:** Union-level - One union  
**Primary Role:** Union manager and union-level overseer

#### Allowed Operations

**Organizational Management (Within Union)**
✅ View all conferences in union  
✅ Create conferences under union  
✅ Edit conference details  
✅ Delete conferences  
✅ View all churches in union  

**User Management (Within Union)**
✅ Create Conference Admins  
✅ Create Church Pastors  
✅ Create Church Clerks  
✅ Create Members  
✅ Edit users in union  
✅ Deactivate/reactivate users  
✅ Reset passwords  

**Reporting & Analytics (READ-ONLY)**
✅ Union-level dashboard  
✅ Total certificates in union  
✅ Pending certificates  
✅ Approved certificates  
✅ Conference-wise breakdown  
✅ Monthly trends  
✅ Church list with certificate counts  
✅ Certificate type analysis  
✅ Export union data  

**❌ CANNOT DO**
❌ Approve or generate certificates (PASTOR ONLY)  
❌ Create certificate requests  
❌ Edit or delete certificates  
❌ Create unions  
❌ Access data from other unions  
❌ Create person records  
❌ Manage users outside union  

---

### LEVEL 3: CONFERENCE_ADMIN

**Scope:** Conference-level - One conference  
**Primary Role:** Conference manager and conference-level overseer

#### Allowed Operations

**Organizational Management (Within Conference)**
✅ View all churches in conference  
✅ Create churches under conference  
✅ Edit church details  
✅ Delete churches  
✅ Update church branding  

**User Management (Within Conference)**
✅ Create Church Pastors  
✅ Create Church Clerks  
✅ Create Members  
✅ Edit users in conference  
✅ Deactivate/reactivate users  
✅ Reset passwords  

**Reporting & Analytics (READ-ONLY)**
✅ Conference-level dashboard  
✅ Total certificates in conference  
✅ Pending certificates  
✅ Approved certificates  
✅ Church-wise breakdown  
✅ Monthly trends (conference)  
✅ Certificate type breakdown  
✅ Pastor approval rates  
✅ Export conference data  

**❌ CANNOT DO**
❌ Approve or generate certificates (PASTOR ONLY)  
❌ Create certificate requests  
❌ Edit or delete certificates  
❌ Create conferences or unions  
❌ Access data from other conferences  
❌ Create person records  
❌ Manage users outside conference  
❌ Edit or approve certificate requests  

---

### LEVEL 2: CHURCH_PASTOR ⭐ KEY ROLE FOR CERTIFICATES

**Scope:** Church-level - Their church  
**Primary Role:** Certificate approval and generation authority (ONLY role that can do this)

#### Allowed Operations - CERTIFICATE AUTHORITY

**🎓 Certificate Approval & Generation (EXCLUSIVE)**
✅ **View pending certificate requests** from church clerks  
✅ **Approve certificate requests** (change status to APPROVED)  
✅ **Reject certificate requests** (with reason) (change status to REJECTED)  
✅ **Generate certificates** from approved requests  
✅ **Select certificate type:**
  - Baptism Certificates
  - Youth Honors
  - Service Recognition
  - Achievement Certificates
  - Custom department certificates
✅ **Select certificate template** (3+ designs)  
✅ **Download PDF certificates**  
✅ **Email certificates to recipients**  
✅ **Print certificates**  
✅ **Add to digital wallet** (Apple/Google)  
✅ **View certificate history**  
✅ **View certificate verification link**  
✅ **Revoke certificates** (with documented reason)  
✅ **Add certificate notes** (for record keeping)  
✅ **Batch approve certificates**  
✅ **Batch generate certificates**  
✅ **View certificate statistics** (church-level)  

---

**Person & Baptism Management**
✅ View all persons in their church  
✅ Create persons for their church  
✅ Edit person information  
✅ Search persons  
✅ View person baptism status  
✅ Manage duplicate persons (in church)  

**Viewing & Verification (READ-ONLY)**
✅ View public verification pages  
✅ Share certificates  
✅ QR code functionality  
✅ Check certificate status  
✅ View certificate details  

**Analytics (CHURCH-LEVEL)**
✅ Church dashboard  
✅ Total certificates issued  
✅ Pending approvals count  
✅ This month's certificates  
✅ Monthly trends  
✅ Certificate type breakdown  

**User Management**
✅ View church clerk details  
✅ View member information  

**❌ CANNOT DO**
❌ Create other pastors  
❌ Create users with higher roles  
❌ Edit approved certificates  
❌ Create certificates without request  
❌ Delete person records  
❌ Access other churches' data  
❌ Create churches or edit church details  
❌ View audit logs  
❌ Create unions/conferences/divisions  
❌ Export data  

---

### LEVEL 1: CHURCH_CLERK ⭐ KEY ROLE FOR SUBMISSIONS

**Scope:** Church-level - Their church  
**Primary Role:** Certificate request preparation and person/baptism record creation

#### Allowed Operations

**🎓 Certificate Request Management**
✅ **Create certificate requests** (submit to pastor)  
✅ **Select certificate type:**
  - Baptism Certificates
  - Youth Honors
  - Service Recognition
  - Achievement Certificates
  - Custom certificates
✅ **Fill certificate details:**
  - Recipient name
  - Achievement/event date
  - Achievement/event description
  - Additional notes
✅ **Assign certificate template** (choose design)  
✅ **Submit for pastor approval**  
✅ **View request status** (pending, approved, rejected)  
✅ **View approval feedback** (if rejected)  
✅ **View rejection reasons**  
✅ **Edit draft requests** (before submission)  
✅ **Resubmit rejected requests**  
✅ **Add notes to requests**  
✅ **View submitted certificates** (when approved and generated)  

**Person Records Management (PRIMARY)**
✅ **Create persons for church**  
✅ **Add demographic information:**
  - Full name
  - Date of birth
  - Gender
  - Email
  - Phone
  - Address
✅ **Edit person details**  
✅ **Assign persons to church**  
✅ **Search persons**  
✅ **Maintain person database**  
✅ **Track Person ID (PID)**  
✅ **Manage duplicate persons** (in church)  

**Baptism Records (if applicable)**
✅ **Create baptism records**  
✅ **Record baptism details:**
  - Baptism date
  - Baptism location
  - Pastor name
  - Witness names
  - Notes
✅ **View records in church**  
✅ **Edit draft records**  
✅ **Submit for pastor review**  
✅ **View record status**  

**Certificate Assistance**
✅ View certificate status  
✅ See which requests have certificates  
✅ View certificate details  
✅ Assist with certificate requests  
✅ Print certificates (when available)  

**Analytics (LIMITED)**
✅ View church dashboard  
✅ See pending requests  
✅ View church statistics  
✅ See certificate counts  

**❌ CANNOT DO**
❌ **Approve certificates** (PASTOR ONLY)  
❌ **Reject certificates** (PASTOR ONLY)  
❌ **Generate certificates** (PASTOR ONLY)  
❌ **Download PDFs directly**  
❌ **Email certificates**  
❌ **Create users**  
❌ **Create pastors**  
❌ **Delete records**  
❌ **Edit approved records**  
❌ **Access other churches**  
❌ **View audit logs**  
❌ **Export data**  
❌ **Override pastor decisions**  

---

### LEVEL 0: MEMBER

**Scope:** Personal - Own certificate(s) only  
**Primary Role:** Certificate recipient and verification

#### Allowed Operations

**Certificate Access & Management**
✅ **Download own certificates** (PDF)  
✅ **View certificate details**  
✅ **Share certificate link**  
✅ **Add to digital wallet** (Apple/Google)  
✅ **View public verification page**  
✅ **QR code scanning**  
✅ **View certificate status**  
✅ **View certificate authenticity**  

**Personal Information**
✅ View own person record  
✅ View own achievements/recognitions  
✅ View own certificate history  

**Public Verification (ANYONE)**
✅ Access public verification page  
✅ Share certificate with others  
✅ View verification status  
✅ QR code functionality  
✅ View certificate authenticity badges  

**❌ CANNOT DO**
❌ Create any records  
❌ Approve anything  
❌ Generate certificates  
❌ Create person records  
❌ Access other members' data  
❌ Edit certificates  
❌ Revoke certificates  
❌ Access admin features  
❌ View audit logs  
❌ Create or manage users  

---

## 📋 Revised Feature Permission Matrix

| Feature | GC Admin | Div Admin | Union Admin | Conf Admin | Pastor | Clerk | Member |
|---------|:--------:|:---------:|:-----------:|:----------:|:------:|:-----:|:------:|
| Create Division | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create Union | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create Conference | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Church | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Person | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Create Certificate Request** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Approve Certificate Request** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Reject Certificate Request** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Generate Certificate** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Revoke Certificate** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Create User | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit User | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Reports** | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| **Export Data** | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Download Certificate | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Email Certificate | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Public Verification | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legend:**  
✅ = Full Permission  
⚠️ = Limited Permission  
❌ = No Permission

---

## 🔄 Certificate Workflow (Simplified)

```
CLERK CREATES REQUEST
        ↓
   (Selects certificate type)
   (Fills recipient details)
   (Chooses template)
        ↓
   SUBMITTED TO PASTOR
        ↓
   [PENDING STATUS]
        ↓
   PASTOR REVIEWS
        ↓
   Approves? ──NO──→ [REJECTED] (with reason)
        ↓               ↓
       YES         Clerk views feedback
        ↓          Resubmits if needed
   [APPROVED]
        ↓
   PASTOR GENERATES
        ↓
   PDF Created + QR Code
        ↓
   PASTOR EMAILS to MEMBER
        ↓
   MEMBER RECEIVES
        ↓
   Member downloads/shares
   Member adds to wallet
   Member uses for verification
```

---

## 📚 Certificate Types Supported

### 1. **Baptism Certificates**
- Religious milestone
- Includes baptism date, pastor name, church
- BCN (Baptism Certificate Number)
- QR code linking to verification

### 2. **Youth Honors Certificates**
- Achievement recognition
- Includes honor name, achievement description
- Date of achievement
- Issuing organization

### 3. **Service Recognition Certificates**
- Ministry service acknowledgment
- Includes service type, duration, leadership
- Recognition level
- Church/conference details

### 4. **Achievement Certificates**
- Skills and competency verification
- Includes skill/competency name
- Achievement level
- Completion date

### 5. **Custom Department Certificates**
- Custom for any SDA department
- Evangelism, Health, Education, Sabbath School, etc.
- Flexible fields
- Department-specific templates

### 6. **Future Certificate Types**
- Employee awards
- Training completion
- Mission work recognition
- Leadership development
- Professional certifications

---

## 🎨 Certificate Templates (3+ Designs)

All templates available for all certificate types:

### **Template 1: Minimalist Modern**
- Landscape (11" × 8.5")
- Clean contemporary design
- Deep blue color scheme
- QR code integrated
- Perfect for digital distribution

### **Template 2: Traditional Elegant**
- Portrait (8.5" × 11")
- Classic ornate borders
- Gold accents
- Formal church aesthetic
- Ideal for printing and framing

### **Template 3: Digital-Native Modern**
- Card format (9" × 5.06")
- Modern card layout
- Wallet integration ready
- Interactive elements
- Optimized for screens

### **Future Templates**
- Department-specific designs
- Color-customizable templates
- Custom logo integration
- Multi-language support

---

## 🔒 Data Visibility & Access Rules

### GENERAL_CONFERENCE_ADMIN
- ✅ Sees ALL certificate data globally
- ✅ Can view all pending, approved, rejected certificates
- ✅ Full analytics across all levels
- ✅ Cannot modify or approve certificates

### DIVISION_ADMIN
- ✅ Sees only division's certificates
- ✅ Can view all churches' certificates in division
- ✅ Division-level analytics
- ✅ Cannot modify, approve, or generate certificates
- ❌ Cannot see other divisions' data

### UNION_ADMIN
- ✅ Sees only union's certificates
- ✅ Can view all churches' certificates in union
- ✅ Union-level analytics
- ✅ Cannot modify, approve, or generate certificates
- ❌ Cannot see other unions' data

### CONFERENCE_ADMIN
- ✅ Sees only conference's certificates
- ✅ Can view all churches' certificates in conference
- ✅ Conference-level analytics
- ✅ Cannot modify, approve, or generate certificates
- ❌ Cannot see other conferences' data

### CHURCH_PASTOR
- ✅ Sees only their church's certificates
- ✅ Can approve/reject requests
- ✅ Can generate certificates
- ✅ Can view all request statuses
- ✅ Can revoke certificates
- ❌ Cannot see other churches' data

### CHURCH_CLERK
- ✅ Sees only their church's certificates
- ✅ Can view request status
- ✅ Can create new requests
- ✅ Can see pending, approved, generated certificates
- ❌ Cannot approve, reject, or generate
- ❌ Cannot revoke certificates
- ❌ Cannot see other churches' data

### MEMBER
- ✅ Sees only own certificates
- ✅ Can download own certificates
- ✅ Can share own certificates publicly
- ✅ Can verify own certificates
- ❌ Cannot see other members' certificates
- ❌ Cannot create or approve anything

---

## 🔐 Key Security Features

### 1. **Role-Based Access Control**
- ✅ 7 distinct roles with clear permissions
- ✅ No role can exceed their organizational scope
- ✅ Role hierarchy prevents escalation
- ✅ Each role manages users below them

### 2. **Organizational Scope Enforcement**
- ✅ Church Pastor sees only their church
- ✅ Conference Admin sees only their conference's churches
- ✅ Union Admin sees only their union's conferences/churches
- ✅ Division Admin sees only their division's data
- ✅ Implemented at API query level

### 3. **Certificate Approval Workflow**
- ✅ Cannot skip approval steps
- ✅ Clerk requests → Pastor approves
- ✅ Rejection includes reason
- ✅ Clerk can resubmit after rejection
- ✅ Cannot generate without approval

### 4. **Audit Trail**
- ✅ Every action logged (user, action, timestamp)
- ✅ Certificate approval logged
- ✅ Certificate generation logged
- ✅ Certificate revocation logged with reason
- ✅ All changes trackable

### 5. **Data Integrity**
- ✅ Digital signatures on certificates
- ✅ QR codes link to verification
- ✅ Certificate data cannot be edited after generation
- ✅ Revocation tracked and logged
- ✅ Complete audit trail maintained

---

## 📊 Analytics & Reporting

### GENERAL_CONFERENCE_ADMIN Reports
- Global certificate dashboard
- Certificates by type (baptism, honors, recognition, etc.)
- Total certificates issued globally
- Pending certificates count
- Approved vs rejected rates
- Monthly trends (worldwide)
- Division breakdown
- Growth analysis

### DIVISION_ADMIN Reports
- Division certificate dashboard
- Certificates by union
- Certificates by conference
- Certificate type breakdown
- Monthly trends (division)
- Pending/approved/rejected counts

### UNION_ADMIN Reports
- Union certificate dashboard
- Certificates by conference
- Certificates by church
- Certificate type breakdown
- Monthly trends (union)
- Approval/rejection rates

### CONFERENCE_ADMIN Reports
- Conference certificate dashboard
- Certificates by church
- Church-wise statistics
- Certificate type breakdown
- Monthly trends (conference)
- Pastor approval rates

### CHURCH_PASTOR Reports
- Church certificate dashboard
- Total certificates issued
- Pending requests
- This month's certificates
- Certificate type breakdown
- Monthly trends (church)

### CHURCH_CLERK Reports
- Pending requests
- Submitted requests
- Approved requests
- Generated certificates
- Request status overview

---

## 🚀 Implementation Architecture

### Database Models

```prisma
model CertificateType {
  id          String @id @default(cuid())
  name        String // Baptism, Youth Honors, etc.
  code        String @unique
  description String?
  category    String // Religious, Academic, Service, etc.
}

model CertificateRequest {
  id                  String   @id @default(cuid())
  clerksId           String
  churchId           String
  certificateTypeId  String
  templateId         String?
  recipientId        String   // Person ID
  recipientName      String
  achievementDate    DateTime
  achievementDesc    String
  status             RequestStatus // DRAFT, SUBMITTED, APPROVED, REJECTED, GENERATED
  approvedBy         String?       // Pastor ID
  approvedAt         DateTime?
  rejectionReason    String?
  generatedAt        DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  
  // Relations
  clerk              User              @relation(fields: [clerksId], references: [id])
  church             Church            @relation(fields: [churchId], references: [id])
  certificateType    CertificateType   @relation(fields: [certificateTypeId], references: [id])
  template           CertificateTemplate? @relation(fields: [templateId], references: [id])
  recipient          Person            @relation(fields: [recipientId], references: [id])
  approver           User?             @relation(fields: [approvedBy], references: [id])
  certificate        Certificate?
}

model Certificate {
  id                String @id @default(cuid())
  bcn               String @unique // Baptism Certificate Number (universal ID)
  requestId         String @unique
  certificateTypeId String
  pdfData           String? // Base64 PDF
  qrCodeData        String?
  verificationUrl   String
  digitalSignature  String?
  isRevoked         Boolean @default(false)
  revokedAt         DateTime?
  revokedBy         String?
  revocationReason  String?
  emailedAt         DateTime?
  downloadedAt      DateTime?
  addedToWalletAt   DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  request           CertificateRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  certificateType   CertificateType   @relation(fields: [certificateTypeId], references: [id])
}

enum RequestStatus {
  DRAFT           // Clerk is editing
  SUBMITTED       // Clerk submitted, waiting for pastor
  APPROVED        // Pastor approved
  REJECTED        // Pastor rejected with reason
  GENERATED       // Certificate created
  DELIVERED       // Emailed to recipient
  REVOKED         // Certificate revoked
}
```

---

## 🎯 Workflow Examples

### Scenario 1: Youth Honors Certificate
1. **CLERK** creates certificate request (Youth Honors type)
2. **CLERK** fills: recipient name, honor type, achievement date
3. **CLERK** selects template (Minimalist Modern)
4. **CLERK** submits to pastor
5. **PASTOR** reviews request (sees submitted status)
6. **PASTOR** approves request
7. **PASTOR** generates certificate
8. **PASTOR** emails PDF to recipient
9. **MEMBER** downloads certificate
10. **MEMBER** adds to Apple Wallet
11. **MEMBER** shares link with family
12. **ANYONE** can verify via public link

### Scenario 2: Service Recognition
1. **CLERK** creates request (Service Recognition type)
2. **CLERK** records: service type, duration, leadership level
3. **CLERK** submits to pastor
4. **PASTOR** approves
5. **PASTOR** generates
6. **PASTOR** emails
7. **MEMBER** receives and shares

### Scenario 3: Division Reviewing Reports
1. **DIVISION_ADMIN** accesses dashboard
2. **DIVISION_ADMIN** sees all certificates in division
3. **DIVISION_ADMIN** views by certificate type
4. **DIVISION_ADMIN** sees pending/approved/rejected counts
5. **DIVISION_ADMIN** views union-wise breakdown
6. **DIVISION_ADMIN** exports report
7. **DIVISION_ADMIN** sends report to GC
8. **DIVISION_ADMIN** cannot approve/generate certificates

---

## 🚫 Critical Restrictions

### What NO role can do:
- Delete their own account
- Manage users with equal or higher role
- Access data outside their scope
- Bypass approval workflows
- Modify system settings (except GC Admin)

### What ONLY PASTOR can do:
- Approve certificate requests
- Reject certificate requests
- Generate certificates
- Revoke certificates
- Email certificates

### What ONLY CLERK can do:
- Create certificate requests
- Create person records
- Submit requests to pastor

### What HIGHER LEVELS CANNOT do:
- Conference Admin cannot approve certificates
- Union Admin cannot approve certificates
- Division Admin cannot approve certificates
- GC Admin cannot approve certificates
- These are READ-ONLY at higher levels

---

## 📈 Scalability for Future Departments

ADVENTIFY is designed to support ANY certification need:

**Currently:**
- Baptism Certificates ✅
- Youth Honors ✅
- Service Recognition ✅

**Future Additions:**
- Sabbath School Department certificates
- Health & Wellness certifications
- Evangelism recognition
- Leadership training certifications
- Professional development
- Volunteer service awards
- Employee recognition
- Educational achievement
- Mission work certificates
- Specialized training completion

**Expandable By:**
- Adding new CertificateType records
- Creating type-specific templates
- Defining custom fields per type
- Multiple template options per type
- Department-specific workflows

---

## 🔑 Key Differences from Original Analysis

**BEFORE:** All roles could approve certificates  
**NOW:** Only PASTOR can approve/generate

**BEFORE:** Clerk could do limited approval  
**NOW:** Clerk can ONLY create requests

**BEFORE:** Higher admins had mixed powers  
**NOW:** Higher admins are READ-ONLY reporting

**BEFORE:** Approval at multiple levels  
**NOW:** Single approval point (PASTOR)

**BEFORE:** Limited certificate types  
**NOW:** Multi-purpose certification platform

---

## 💡 Benefits of This Architecture

✅ **Simple Approval Process** - One decision point (Pastor)  
✅ **Separation of Duties** - Clerk requests, Pastor approves  
✅ **Clear Accountability** - Pastor is responsible for quality  
✅ **Organizational Visibility** - All levels can see results  
✅ **No Data Modification** - Only viewing at higher levels  
✅ **Scalable to Any Certificate Type** - Extensible design  
✅ **Secure** - Limited permissions, clear workflows  
✅ **Audit Trail** - Complete tracking of all actions  
✅ **Multi-Department Ready** - Not just baptism  
✅ **Future-Proof** - Can add new types easily  

---

## 📞 Implementation Checklist

- [ ] Update database schema (RequestStatus enum)
- [ ] Create CertificateRequest model
- [ ] Create CertificateType model
- [ ] Update CertificateTemplate for multiple types
- [ ] Create request submission API
- [ ] Create approval/rejection API
- [ ] Update generation to use requests
- [ ] Create clerk UI for request creation
- [ ] Create pastor UI for approval/rejection
- [ ] Add analytics filtering by type
- [ ] Update reporting to show by type
- [ ] Add digital wallet integration
- [ ] Implement audit logging
- [ ] Create public verification
- [ ] Test complete workflow
- [ ] Train clerks and pastors

---

## 🎓 Summary

ADVENTIFY is now a **multi-purpose certification platform** where:

1. **CHURCH_CLERK** creates requests
2. **CHURCH_PASTOR** approves and generates
3. **Higher levels** view reports only
4. **Multiple certificate types** supported
5. **Expandable** for future departments
6. **Secure** with clear workflows
7. **Scalable** to entire SDA system

This architecture allows the platform to grow beyond baptism certificates to serve all SDA certification needs across every department.

---

*Document created: April 2, 2026*  
*ADVENTIFY - Multi-Purpose Certification Platform*  
*For Seventh-day Adventist Church*
