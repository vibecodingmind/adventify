# 🔐 ADVENTIFY - Complete Roles & Permissions Analysis

**Document:** User Roles and Feature Matrix  
**Date:** April 2, 2026  
**Version:** 1.0.0

---

## 📊 Role Hierarchy Overview

```
GENERAL_CONFERENCE_ADMIN (Level 6) ⬇️
         ↓
    DIVISION_ADMIN (Level 5) ⬇️
         ↓
     UNION_ADMIN (Level 4) ⬇️
         ↓
  CONFERENCE_ADMIN (Level 3) ⬇️
         ↓
    CHURCH_PASTOR (Level 2) ⬇️
         ↓
    CHURCH_CLERK (Level 1) ⬇️
         ↓
         MEMBER (Level 0)
```

**Principle:** Higher roles have all permissions of lower roles, plus additional authority

---

## 🏆 LEVEL 6: GENERAL CONFERENCE ADMIN

### Scope
- **Global access** to entire church organization
- Can manage all divisions, unions, conferences, and churches
- Complete system-wide authority

### Features & Permissions

#### Church Hierarchy Management
✅ View all divisions globally  
✅ Create new divisions  
✅ Edit division details  
✅ Delete divisions  
✅ View all unions globally  
✅ Create unions under any division  
✅ Edit union details  
✅ Delete unions  
✅ View all conferences globally  
✅ Create conferences under any union  
✅ Edit conference details  
✅ Delete conferences  
✅ View all churches globally  
✅ Create churches under any conference  
✅ Edit church details  
✅ Delete churches  
✅ Update church branding (colors, logos)

#### Person Management
✅ Create persons across entire system  
✅ Edit any person's information  
✅ View person demographic data  
✅ Assign persons to churches globally  
✅ Search all persons  
✅ Identify and manage duplicate persons  
✅ Delete person records (with audit trail)

#### Baptism Records
✅ Create baptism records globally  
✅ View ALL baptism records (pending, approved, rejected)  
✅ Approve baptism records  
✅ Reject baptism records  
✅ Add notes and documentation  
✅ Filter by status, church, date range  
✅ Search by person ID or name  
✅ Perform batch operations  
✅ Export data

#### Certificate Management
✅ Generate certificates for any person  
✅ Select from all 3 certificate templates  
✅ Download certificates (PDF)  
✅ Email certificates  
✅ Revoke certificates with reason  
✅ View certificate audit trail  
✅ Create custom certificate templates  
✅ Edit system templates  
✅ Delete templates  
✅ Batch certificate generation

#### User Management
✅ Create users at any role level  
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
✅ View user activity logs

#### Analytics & Reporting
✅ Global dashboard with worldwide statistics  
✅ Total baptisms (all churches)  
✅ Pending approvals (all conferences)  
✅ Approved baptisms (all churches)  
✅ Monthly trends (global)  
✅ Growth percentage tracking  
✅ Church-by-church breakdown  
✅ Division-wise statistics  
✅ Custom date range reports  
✅ Export analytics data

#### Audit & Compliance
✅ View complete audit logs (all users, all actions)  
✅ Filter audit logs by action, user, entity  
✅ View sensitive data access logs  
✅ Generate compliance reports  
✅ Archive old records  
✅ Data retention management

#### System Administration
✅ Manage system settings  
✅ Configure certificate signing key  
✅ Setup SMTP for emails  
✅ Manage digital wallet integrations  
✅ Database maintenance  
✅ View system health logs  
✅ Configure backup policies

### Restrictions
❌ Cannot delete own user account  
❌ Cannot reduce own role level  
❌ Limited by audit logging (all actions tracked)

---

## 🌍 LEVEL 5: DIVISION ADMIN

### Scope
- **Division-level access** to one division
- Can manage all unions, conferences, churches under their division
- Authority over all baptism records in division

### Features & Permissions

#### Church Hierarchy Management (Within Division)
✅ View all unions in their division  
✅ Create unions under their division  
✅ Edit union details  
✅ Delete unions  
✅ View all conferences in their division  
✅ Create conferences  
✅ Edit conference details  
✅ Delete conferences  
✅ View all churches in their division  
✅ Create churches  
✅ Edit church details  
✅ Delete churches  
✅ Update church branding

❌ Cannot create divisions  
❌ Cannot access unions from other divisions  
❌ Cannot create unions in other divisions

#### Person Management (Within Division)
✅ Create persons in their division  
✅ View all persons in division  
✅ Edit person information  
✅ Assign to churches in division  
✅ Search persons  
✅ Manage duplicates

❌ Cannot create persons in other divisions  
❌ Cannot access person data outside division

#### Baptism Records (Within Division)
✅ View all baptism records in division  
✅ Approve baptism records  
✅ Reject baptism records  
✅ View pending, approved, rejected  
✅ Filter and search  
✅ Batch operations  
✅ Export data from division

❌ Cannot approve records from other divisions  
❌ Cannot view records outside division scope

#### Certificate Management (Within Division)
✅ Generate certificates for persons in division  
✅ Select from 3 templates  
✅ Download PDFs  
✅ Email certificates  
✅ Revoke certificates  
✅ Create custom templates for division  
✅ Edit division templates  
✅ Batch generation

❌ Cannot generate for other divisions  
❌ Cannot edit system-wide templates

#### User Management (Within Division)
✅ Create Union Admins  
✅ Create Conference Admins  
✅ Create Church Pastors  
✅ Create Church Clerks  
✅ Create Members  
✅ Edit users in division  
✅ Assign to organizational levels  
✅ Deactivate/reactivate users  
✅ Reset passwords

❌ Cannot create other Division Admins  
❌ Cannot manage users outside division  
❌ Cannot promote to Division Admin level

#### Analytics & Reporting (Division Scope)
✅ Division-level dashboard  
✅ Total baptisms in division  
✅ Pending approvals in division  
✅ Monthly trends  
✅ Union-wise breakdown  
✅ Church-specific statistics  
✅ Custom date ranges  
✅ Export data

❌ Cannot see data from other divisions

#### Audit & Compliance (Division Scope)
✅ View audit logs for division  
✅ Filter by user, action, entity  
✅ Generate division compliance reports  
✅ Archive division records

❌ Cannot access logs from other divisions

---

## 🏛️ LEVEL 4: UNION ADMIN

### Scope
- **Union-level access** to one union
- Can manage all conferences and churches under their union
- Authority over baptism records in union

### Features & Permissions

#### Church Hierarchy Management (Within Union)
✅ View all conferences in their union  
✅ Create conferences  
✅ Edit conference details  
✅ Delete conferences  
✅ View all churches in union  
✅ Create churches  
✅ Edit church details  
✅ Delete churches  
✅ Update church branding

❌ Cannot create divisions or unions  
❌ Cannot access conferences from other unions  
❌ Cannot edit parent union

#### Person Management (Within Union)
✅ Create persons in union  
✅ View all persons in union  
✅ Edit person information  
✅ Assign to churches  
✅ Search and filter  
✅ Manage duplicates

❌ Cannot access persons outside union  
❌ Cannot create in other unions

#### Baptism Records (Within Union)
✅ View all baptism records in union  
✅ Approve records  
✅ Reject records  
✅ Filter by status, church, date  
✅ Search  
✅ Batch operations  
✅ Export data

❌ Cannot approve records outside union  
❌ Cannot view other unions' records

#### Certificate Management (Within Union)
✅ Generate certificates for union persons  
✅ Choose from templates  
✅ Download PDFs  
✅ Email certificates  
✅ Revoke certificates  
✅ Create union-specific templates  
✅ Batch generation

❌ Cannot access templates from other unions

#### User Management (Within Union)
✅ Create Conference Admins  
✅ Create Church Pastors  
✅ Create Church Clerks  
✅ Create Members  
✅ Edit users in union  
✅ Deactivate/reactivate  
✅ Reset passwords

❌ Cannot create Union Admins  
❌ Cannot manage users outside union  
❌ Cannot create Division Admins

#### Analytics & Reporting (Union Scope)
✅ Union-level dashboard  
✅ Total baptisms  
✅ Pending approvals  
✅ Conference-wise breakdown  
✅ Monthly trends  
✅ Growth metrics  
✅ Export data

❌ Cannot see other unions' data

#### Audit & Compliance (Union Scope)
✅ Union audit logs  
✅ Filter by user, action  
✅ Generate reports  
✅ Archive records

❌ Cannot see other unions' logs

---

## 📍 LEVEL 3: CONFERENCE ADMIN

### Scope
- **Conference-level access** to one conference
- Can manage all churches under their conference
- Authority over baptism records in conference

### Features & Permissions

#### Church Hierarchy Management (Within Conference)
✅ View all churches in their conference  
✅ Create churches  
✅ Edit church details  
✅ Delete churches  
✅ Update church branding  
✅ View conference details

❌ Cannot create conferences or unions  
❌ Cannot edit parent conference  
❌ Cannot access churches from other conferences

#### Person Management (Within Conference)
✅ Create persons in conference  
✅ View all persons in conference  
✅ Edit person information  
✅ Assign to churches  
✅ Search  
✅ Manage duplicates

❌ Cannot access persons outside conference

#### Baptism Records (Within Conference)
✅ View all baptism records  
✅ **Approve records** (key responsibility)  
✅ **Reject records** (with reasoning)  
✅ Filter by status, church, date  
✅ Search  
✅ Batch operations  
✅ Add notes

❌ Cannot approve records outside conference

#### Certificate Management (Within Conference)
✅ Generate certificates  
✅ Choose templates  
✅ Download PDFs  
✅ Email certificates  
✅ Revoke certificates  
✅ **Approve certificate before issuance**  
✅ Batch generation

❌ Cannot access certificates outside conference

#### User Management (Within Conference)
✅ Create Church Pastors  
✅ Create Church Clerks  
✅ Create Members  
✅ Edit users in conference  
✅ Deactivate/reactivate users  
✅ Reset passwords

❌ Cannot create Union Admins or higher  
❌ Cannot manage users outside conference

#### Analytics & Reporting (Conference Scope)
✅ Conference dashboard  
✅ Total baptisms  
✅ Pending approvals  
✅ Church-wise breakdown  
✅ Monthly trends  
✅ Export data

❌ Cannot see other conferences' data

#### Audit & Compliance
✅ Conference audit logs  
✅ Filter logs  
✅ Generate reports

---

## ⛪ LEVEL 2: CHURCH PASTOR

### Scope
- **Church-level access** to their church
- Can approve baptism records at church level
- Primary certificate issuer for church

### Features & Permissions

#### Church Operations
✅ View their church details  
✅ View church branding  
✅ Access church-specific dashboard  
✅ View pastor profile

❌ Cannot edit church details  
❌ Cannot create/delete churches  
❌ Cannot access other churches

#### Person Management (Their Church)
✅ Create persons for their church  
✅ View all persons in their church  
✅ Edit person information  
✅ Search persons  
✅ View baptism status  
✅ Manage duplicates (in church)

❌ Cannot access persons from other churches

#### Baptism Records (Their Church)
✅ Create baptism records for their church  
✅ **View all records in church**  
✅ **Approve baptism records** (primary role)  
✅ **Reject records** (with reason)  
✅ View baptism details  
✅ Add notes  
✅ Search records  
✅ View status (pending, approved, rejected)

❌ Cannot approve records from other churches  
❌ Cannot delete records (audit trail required)  
❌ Cannot override approvals

#### Certificate Management (Their Church)
✅ **Generate certificates for approved baptisms**  
✅ Choose from 3 templates  
✅ Download PDF certificates  
✅ Email certificates to recipients  
✅ Print certificates  
✅ Add to digital wallet  
✅ Share verification links  
✅ View certificate history  
✅ Request certificate reissuance

⚠️ Limited revocation rights (must have cause)

❌ Cannot revoke certificates without reason  
❌ Cannot create/edit templates  
❌ Cannot delete certificates

#### User Management (Their Church)
✅ View church clerk details  
✅ View member information  
✅ Contact members/clerks

❌ Cannot create users  
❌ Cannot edit user roles  
❌ Cannot deactivate users  
❌ Cannot manage access

#### Analytics & Reporting (Church Scope)
✅ Church dashboard  
✅ Total baptisms in church  
✅ Pending approvals  
✅ This month's baptisms  
✅ Monthly trends  
✅ View statistics

❌ Cannot export data  
❌ Cannot see other churches

#### Viewing & Verification
✅ View public verification pages  
✅ Share certificates  
✅ QR code functionality  
✅ View certificate details  
✅ Check certificate status

❌ Cannot modify verification data  
❌ Cannot see private audit logs

---

## 📋 LEVEL 1: CHURCH CLERK

### Scope
- **Church data entry and record-keeping** for their church
- Cannot approve records (CHURCH_PASTOR only)
- Cannot generate certificates (CHURCH_PASTOR+ only)

### Features & Permissions

#### Church Access
✅ View their church details  
✅ View church dashboard  
✅ View church information  
✅ Access records system

❌ Cannot edit church details  
❌ Cannot access other churches

#### Person Management (Their Church)
✅ **Create persons for church** (main responsibility)  
✅ **Add demographic information**  
✅ View all persons  
✅ Edit person details  
✅ Assign persons to church  
✅ Search persons  
✅ Maintain person database  
✅ Track PID (Person ID)

#### Baptism Records (Their Church)
✅ **Create baptism records** (primary responsibility)  
✅ **Record baptism details:**
  - Baptism date
  - Baptism location
  - Pastor name
  - Witness names
  - Notes and documentation
✅ View records in church  
✅ Edit own records (if not approved)  
✅ Search records  
✅ View record status  
✅ **Submit for pastor approval**  
✅ Add notes/comments  
✅ View approval status

❌ **Cannot approve records** (Pastor only)  
❌ **Cannot reject records** (Pastor only)  
❌ Cannot change approved records  
❌ Cannot delete records  
❌ Cannot approve baptism status

#### Certificate Assistance
✅ View certificate status  
✅ See which records have certificates  
✅ Print certificates (when available)  
✅ View certificate details  
✅ Assist with certificate requests

❌ **Cannot generate certificates**  
❌ **Cannot download PDFs directly**  
❌ **Cannot email certificates**  
❌ Cannot edit certificates  
❌ Cannot revoke certificates

#### Analytics & Reporting
✅ View church dashboard  
✅ See pending records  
✅ View church statistics  
✅ See monthly counts

❌ Cannot export data  
❌ Cannot see trends/analytics

#### Limited Actions
✅ Create record drafts  
✅ Edit draft records  
✅ Submit records for approval  
✅ View approval feedback  
✅ View rejection reasons

❌ Cannot override decisions  
❌ Cannot assign roles  
❌ Cannot manage users

---

## 👥 LEVEL 0: MEMBER

### Scope
- **View-only access** to own records
- Cannot create or manage any records

### Features & Permissions

#### Personal Records
✅ View own person record  
✅ View own baptism record (if exists)  
✅ View own certificate (if generated)  
✅ View personal information

❌ Cannot edit own record  
❌ Cannot create records

#### Certificate Access
✅ **Download own certificate PDF**  
✅ **View certificate details**  
✅ **Share certificate link**  
✅ **Add to digital wallet** (Apple/Google)  
✅ **View public verification page**  
✅ **QR code scanning**  
✅ View certificate status

❌ Cannot generate certificates  
❌ Cannot revoke certificates  
❌ Cannot access other members' certificates

#### Public Verification
✅ Access public verification page  
✅ Share certificate with others  
✅ View verification status  
✅ QR code functionality  
✅ View certificate authenticity

❌ Cannot modify verification data  
❌ Cannot see audit logs

#### No Administrative Access
❌ Cannot create any records  
❌ Cannot approve anything  
❌ Cannot manage users  
❌ Cannot access analytics  
❌ Cannot modify data  
❌ Cannot view other members' data

---

## 📋 Feature Permission Matrix

| Feature | GC Admin | Div Admin | Union Admin | Conf Admin | Pastor | Clerk | Member |
|---------|:--------:|:---------:|:-----------:|:----------:|:------:|:-----:|:------:|
| Create Division | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create Union | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create Conference | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Church | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Person | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create Baptism | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve Baptism | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Generate Certificate | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Revoke Certificate | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| Create User | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit User | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Analytics | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| Export Data | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Records | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Download Certificate | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Email Certificate | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Public Verification | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legend:** ✅ = Full Access, ⚠️ = Limited Access, ❌ = No Access

---

## 🔒 Data Visibility Rules

### GENERAL_CONFERENCE_ADMIN
- Sees ALL data across entire system
- No data restrictions

### DIVISION_ADMIN
- Sees only data from their assigned division
- Cannot see data from other divisions
- Can see all unions, conferences, churches within division
- Can see all persons and baptism records in division

### UNION_ADMIN
- Sees only data from their assigned union
- Cannot see data from other unions
- Can see all conferences and churches within union
- Can see all persons and baptism records in union

### CONFERENCE_ADMIN
- Sees only data from their assigned conference
- Cannot see data from other conferences
- Can see all churches within conference
- Can see all persons and baptism records in conference

### CHURCH_PASTOR
- Sees only data from their assigned church
- Cannot see data from other churches
- Can see all persons and records in their church

### CHURCH_CLERK
- Sees only data from their assigned church
- Cannot see data from other churches
- Limited to creating/editing persons and baptism records

### MEMBER
- Sees only own person record and certificate
- Cannot see other members' data
- Can access public verification with certificate BCN

---

## 🔐 Approval Workflow

```
BAPTISM CREATED (by Pastor or Clerk)
          ↓
   [PENDING STATUS]
          ↓
   Church Pastor Reviews
          ↓
     Approves? → NO → [REJECTED] (with reason)
          ↓
        YES
          ↓
   [APPROVED STATUS]
          ↓
   Pastor Generates Certificate
          ↓
   Certificate Created + Emailed
          ↓
   Member Can Download/Share
          ↓
   Public Verification Available
```

---

## 🚫 Critical Restrictions

### What NO role can do
- Delete their own account
- Manage users with equal or higher role
- Access data outside organizational scope
- Bypass audit logging
- Modify system settings (except GC Admin)
- Override approval workflows

### Pastor-specific restrictions
- Cannot directly delete baptism records
- Cannot edit approved baptism records
- Can only revoke certificates with documented reason
- Cannot create other pastors

### Clerk-specific restrictions
- Cannot approve baptism records
- Cannot generate certificates
- Cannot create users
- Cannot delete any records
- Cannot edit pastor/admin records

---

## 📊 Access Control Implementation

### Scope Filtering
Every API route checks:
1. **Authentication:** Is user logged in?
2. **Authorization:** Does user have required role?
3. **Scope:** Does user have access to this entity?

```typescript
// Example from baptism-records/route.ts
if (session.role === Role.CHURCH_CLERK || session.role === Role.CHURCH_PASTOR) {
  where.churchId = session.churchId;
} else if (session.role === Role.CONFERENCE_ADMIN) {
  const churches = await db.church.findMany({
    where: { conferenceId: session.conferenceId },
    select: { id: true },
  });
  where.churchId = { in: churches.map(c => c.id) };
}
```

### Role Hierarchy Function
```typescript
export const ROLE_HIERARCHY: Record<Role, number> = {
  GENERAL_CONFERENCE_ADMIN: 6,
  DIVISION_ADMIN: 5,
  UNION_ADMIN: 4,
  CONFERENCE_ADMIN: 3,
  CHURCH_PASTOR: 2,
  CHURCH_CLERK: 1,
  MEMBER: 0,
};
```

---

## 🎯 Real-World Scenarios

### Scenario 1: Creating and Approving a Baptism
1. **CHURCH_CLERK** creates person record
2. **CHURCH_CLERK** creates baptism record (PENDING)
3. **CHURCH_PASTOR** views pending records
4. **CHURCH_PASTOR** approves baptism → Status: APPROVED
5. **CHURCH_PASTOR** generates certificate
6. **MEMBER** downloads certificate
7. **MEMBER** shares via public verification link

### Scenario 2: Division Admin Overseeing Conference
1. **DIVISION_ADMIN** views all unions in division
2. **DIVISION_ADMIN** can see all conferences in those unions
3. **DIVISION_ADMIN** can see all baptism records
4. **DIVISION_ADMIN** can approve/reject if needed
5. **UNION_ADMIN** cannot see from other unions
6. **CONFERENCE_ADMIN** cannot see from other conferences

### Scenario 3: General Conference Reporting
1. **GC_ADMIN** accesses global dashboard
2. **GC_ADMIN** generates worldwide baptism report
3. **GC_ADMIN** sees all 7 divisions' data
4. **GC_ADMIN** can drill down to any church
5. **GC_ADMIN** can identify trends and patterns
6. Other admins cannot see this data

---

## 📝 Audit Trail

Every action is logged:
- User performing action
- Action type (CREATE, UPDATE, DELETE, APPROVE, REVOKE)
- Entity affected
- Changes made
- Timestamp
- IP address (if available)
- User agent

### Viewable By
- **GC Admin:** All logs
- **Division Admin:** Division logs only
- **Union Admin:** Union logs only
- **Conference Admin:** Conference logs only
- **Pastor/Clerk:** None (cannot view logs)
- **Member:** None

---

## 🔄 Role Transition Examples

### Path to System Administrator
```
MEMBER (Level 0)
   ↓
CHURCH_CLERK (Level 1) - Data entry specialist
   ↓
CHURCH_PASTOR (Level 2) - Approval authority
   ↓
CONFERENCE_ADMIN (Level 3) - Regional manager
   ↓
UNION_ADMIN (Level 4) - Multi-conference oversight
   ↓
DIVISION_ADMIN (Level 5) - Continental authority
   ↓
GENERAL_CONFERENCE_ADMIN (Level 6) - Global authority
```

---

## 💡 Best Practices

### For GENERAL_CONFERENCE_ADMIN
- Use sparingly - only trusted individuals
- Monitor audit logs regularly
- Delegate to Division Admins when possible
- Maintain separation of duties

### For DIVISION_ADMIN
- Empower Union Admins in your division
- Review conference-level statistics
- Ensure consistent processes
- Support Union Admins

### For UNION_ADMIN
- Empower Conference Admins
- Monitor baptism trends
- Ensure quality in baptism records
- Support Conference Admins

### For CONFERENCE_ADMIN
- Review and approve baptism records promptly
- Ensure pastoral oversight
- Support Church Pastors
- Monitor local statistics

### For CHURCH_PASTOR
- Approve baptism records thoroughly
- Generate certificates upon approval
- Ensure pastoral oversight
- Train church clerks
- Maintain good record quality

### For CHURCH_CLERK
- Create accurate person records
- Record complete baptism information
- Follow standardized procedures
- Request approval from pastor
- Maintain data quality

### For MEMBER
- Download your certificate
- Share verification link safely
- Keep certificate secure
- Use digital wallet when available

---

## 🚀 Permission Changes & Updates

To change user role:
1. **Only higher-role users can** manage lower-role users
2. **Audit log** is created automatically
3. **User loses access** to previous scope immediately
4. **New access level** is granted immediately
5. **No manual cleanup** needed (system enforces new scope)

---

## 📞 Common Questions

**Q: Can a Church Clerk approve baptisms?**  
A: No. Only Church Pastor and above (Level 2+) can approve.

**Q: Can a Union Admin see other unions?**  
A: No. Each admin can only see their assigned organizational unit.

**Q: Can a Member create records?**  
A: No. Members are read-only users who can only download their certificates.

**Q: Who can revoke certificates?**  
A: Church Pastor, Conference Admin, Union Admin, Division Admin, and GC Admin.

**Q: Can a Division Admin create Churches directly?**  
A: No. They must create through Union → Conference → Church hierarchy.

**Q: What happens to data when a user is deleted?**  
A: Data is never deleted. User is deactivated, and all records remain in audit log.

---

## 🎓 Summary

ADVENTIFY implements a **7-tier role-based access control system** that mirrors the Seventh-day Adventist Church's organizational structure. Each role has carefully defined permissions that:

1. **Maintain hierarchy** - Higher roles have all permissions of lower roles
2. **Limit scope** - Each role only sees their organizational unit's data
3. **Enable workflow** - Baptism creation → approval → certificate generation
4. **Ensure accountability** - Complete audit trail of all actions
5. **Support collaboration** - Clear responsibilities at each level

The system ensures that:
- Data is secure and properly scoped
- Workflows are followed (approval before certification)
- Accountability is maintained (audit logs)
- The church hierarchy is respected
- Each role has appropriate authority for their level

---

*Document created: April 2, 2026*  
*ADVENTIFY - Global Baptism Certificate Platform*  
*For Seventh-day Adventist Church*
