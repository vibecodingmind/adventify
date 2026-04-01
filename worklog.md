# ADVENTIFY - Global Baptism Certificate Platform

## Project Overview
Building a comprehensive fullstack application for the Seventh-day Adventist Church to manage baptism certificates globally.

## Development Log

---
## Task ID: 1 - main-agent
### Work Task
Initial project setup and database schema creation

### Work Summary
Starting development of ADVENTIFY platform. Creating complete Prisma schema with church hierarchy models.

---
## Task ID: 5-a
### Work Task
Build audit logs API endpoint and connect the existing audit logs frontend page to real data.

### Work Summary
1. **Created `/src/app/api/audit-logs/route.ts`** — GET endpoint that:
   - Requires CONFERENCE_ADMIN+ role via `requireRole()` from `@/lib/auth`
   - Supports query params: `userId`, `entity`, `action`, `page`, `limit`
   - Validates entity and action filter values against allowed enums
   - Caps limit at 100 to prevent excessive queries
   - Calls `getAuditLogs()` from `@/lib/audit` with proper offset calculation
   - Returns `{ success: true, data: { logs, total, page, totalPages } }`
   - Handles Unauthorized/Forbidden/500 errors with appropriate HTTP status codes

2. **Updated `/src/app/(admin)/audit-logs/page.tsx`** — Complete rewrite:
   - Connected `fetchLogs()` to real `/api/audit-logs` endpoint with query params
   - Added pagination state (`page`, `totalPages`, `total`) with shadcn/ui `Pagination` component
   - Implemented smart page number rendering with ellipsis for large page counts
   - Added skeleton loading state (`TableSkeleton`) matching table layout during fetch
   - Added error state with retry button
   - Filter changes reset pagination to page 1
   - Added "Clear filters" link when any filter is active
   - Enhanced badge styling with border colors for both action and entity badges
   - Smart details formatting that parses JSON and shows meaningful excerpts
   - Sticky table header with backdrop blur for scrollable table (max-h-[600px])
   - Shows "Deleted user" for logs where the user relation is null
   - Displays total count in the header area
   - Pagination footer shows "Showing X–Y of Z" summary

### Stage Summary
- Audit logs API is functional at `/api/audit-logs` with filtering (action, entity, userId) and pagination
- Audit logs page displays real data with proper loading skeletons, error handling, and full pagination controls
- ESLint passes with zero errors

---
## Task ID: 5-b
### Work Task
Build Users Management API (list, update, delete) and rewrite the Users Management frontend page.

### Work Summary

1. **Created `/src/app/api/users/route.ts`** — GET endpoint for listing users:
   - Requires CONFERENCE_ADMIN+ role via `requireRole()` from `@/lib/auth`
   - Supports query params: `search` (by name/email), `role` (filter by Role enum), `status` (active/inactive), `page`, `limit`
   - Implements `buildScopeFilter()` that builds hierarchical Prisma WHERE clauses based on user role:
     - GC Admin: sees all users (no filter)
     - Division Admin: sees users in their division (direct, via union, conference, or church chain)
     - Union Admin: sees users in their union (direct, via conference or church chain)
     - Conference Admin: sees users in their conference (direct or via church)
   - Returns paginated `{ success: true, data: { users, total, page, totalPages } }`
   - User select includes: id, email, fullName, role, isActive, lastLoginAt, createdAt + division/union/conference/church relations
   - Handles Unauthorized/Forbidden/500 errors with appropriate HTTP status codes

2. **Created `/src/app/api/users/[id]/route.ts`** — GET, PATCH, DELETE endpoints:
   - **GET**: Fetch single user by ID with full scope relations (CONFERENCE_ADMIN+ required)
   - **PATCH**: Update user fields (isActive, role, fullName, phone, scope assignments)
     - Validates with Zod schema
     - Uses `canManageRole()` from `@/types` to prevent modifying users with higher or equal role
     - Role change also validated against `canManageRole()`
     - Creates audit log with full change details
   - **DELETE**: Soft-delete (deactivate) user
     - Cannot deactivate self
     - Uses `canManageRole()` permission check
     - Creates audit log with DELETE action
   - All endpoints require CONFERENCE_ADMIN+ auth and handle errors properly

3. **Rewrote `/src/app/(admin)/users/page.tsx`** — Full Users Management page:
   - **Search**: Text input with search icon, searches by name/email via query param, form submit triggers search
   - **Filters**: Role dropdown (all Roles), Status dropdown (active/inactive), Clear filters button
   - **Table**: Responsive with horizontal scroll, displays user avatar initial, name + email, role badge (color-coded per role with Shield icon), scope path (division › union › conference › church), status badge (green/red), last login (relative time), and actions dropdown
   - **Pagination**: Full pagination with ellipsis, Previous/Next buttons, "Showing X–Y of Z" footer
   - **Loading state**: TableSkeleton component with 8 rows matching table column layout
   - **Empty state**: Centered message with Users icon and "Clear filters" link
   - **Create User dialog**: Full form with fullName, email, password, role selector (only shows roles below current user's level), cascading scope assignment (division → union → conference → church) that depends on selected role, form validation with error messages
   - **Activate/Deactivate**: Dropdown menu per user row with Activate/Deactivate options, AlertDialog confirmation before toggling, calls PATCH API, visual feedback via toast
   - **Permission awareness**: Actions menu only shown for users the current user can manage (canManageUser check), role creation options limited to roles below current user's level
   - ESLint passes with zero errors

### Stage Summary
- Users List API is functional at `/api/users` with search, role filter, status filter, pagination, and role-based scope filtering
- User Update/Delete API is functional at `/api/users/[id]` with PATCH (toggle active, change role, update scope) and DELETE (soft-delete)
- Users Management page displays real data with full search, filtering, pagination, create user dialog, and activate/deactivate functionality
- All operations are audit-logged and permission-checked

---
## Task ID: 5-c
### Work Task
Create UPDATE/DELETE API endpoints for Persons, Baptism Records, and Hierarchy entities (Divisions, Unions, Conferences, Churches). Update frontend pages (Persons, Baptism Records, Hierarchy) to support Edit/Delete functionality.

### Work Summary

#### API Endpoints Created

1. **`/src/app/api/persons/[id]/route.ts`** — GET, PATCH, DELETE:
   - **GET**: Fetch single person with church and baptism record relations
   - **PATCH**: Update person fields (fullName, dateOfBirth, gender, email, phone, address, city, country, churchId, notes)
     - CHURCH_ADMIN+ required via `canPerformAction('UPDATE_PERSON')`
     - Church admin scoped to their own church; Conference admin scoped to their conference
     - Validates church existence when changing churchId
     - Audit logged with PID and change details
   - **DELETE**: Delete person
     - CONFERENCE_ADMIN+ required via `canPerformAction('DELETE_PERSON')`
     - Conference admin scoped to their conference
     - Cannot delete person linked to a user account
     - Warning if person has linked baptism record (still allowed for CONFERENCE_ADMIN+)
     - Audit logged

2. **`/src/app/api/baptism-records/[id]/route.ts`** — GET, PATCH, DELETE:
   - **GET**: Fetch single baptism record with person, church, and certificate relations
   - **PATCH**: Update baptism record fields (baptismDate, baptismLocation, pastorName, pastorTitle, witnessName, notes)
     - CHURCH_ADMIN+ required; only PENDING records can be edited
     - Church admin scoped to their church; Conference admin scoped to their conference
     - Audit logged
   - **DELETE**: Delete baptism record
     - CONFERENCE_ADMIN+ required; cannot delete if certificate exists
     - Conference admin scoped to their conference
     - Audit logged

3. **`/src/app/api/divisions/[id]/route.ts`** — PATCH, DELETE:
   - **PATCH**: GC Admin only; validates code uniqueness on change; audit logged
   - **DELETE**: GC Admin only; cascade check (unions, conferences, churches, persons); audit logged

4. **`/src/app/api/unions/[id]/route.ts`** — PATCH, DELETE:
   - **PATCH**: Division Admin+; scope-checked for division admin; validates code uniqueness; audit logged
   - **DELETE**: GC Admin only (PERMISSIONS.DELETE_UNION); cascade check with counts; audit logged

5. **`/src/app/api/conferences/[id]/route.ts`** — PATCH, DELETE:
   - **PATCH**: Union Admin+; scope-checked; validates code uniqueness; audit logged
   - **DELETE**: Division Admin+; cascade check with person/church counts; audit logged

6. **`/src/app/api/churches/[id]/route.ts`** — PATCH, DELETE:
   - **PATCH**: Conference Admin+; scope-checked per role level; validates code+conference uniqueness; audit logged
   - **DELETE**: Union Admin+; cascade check for persons, baptism records, and linked user accounts; audit logged

#### Frontend Pages Updated

1. **`/src/app/(admin)/persons/page.tsx`** — Full rewrite with Edit/Delete:
   - **Edit**: Pencil icon button per row opens edit dialog with pre-filled form (all person fields)
     - Permission-gated: CHURCH_ADMIN+ can edit, respects church/conference scope
     - Church selection available for non-CHURCH_ADMIN roles with "No church" option
     - Success/error toast feedback
   - **Delete**: Trash icon button opens AlertDialog confirmation
     - Permission-gated: CONFERENCE_ADMIN+ can delete
     - Shows warning about linked baptism records
     - Disables delete button if certificate exists
   - Added Notes field to both create and edit forms
   - Added address field to forms
   - Added Textarea component import for notes
   - Added AlertDialog component import for delete confirmation
   - Responsive table with horizontal scroll via `overflow-x-auto`

2. **`/src/app/(admin)/baptism-records/page.tsx`** — Full rewrite with Edit/Delete:
   - **Edit**: Pencil icon on PENDING records opens edit dialog (baptismDate, baptismLocation, pastorName, pastorTitle, witnessName, notes)
     - Only PENDING records are editable
     - All authenticated non-MEMBER users can edit (scoped on backend)
     - Success/error toast feedback
   - **Delete**: Trash icon opens AlertDialog confirmation
     - CONFERENCE_ADMIN+ can delete; records with certificates cannot be deleted
     - Shows certificate-linked warning and disables button accordingly
   - Compact icon-based action buttons (edit, delete, approve, reject, generate)

3. **`/src/app/(admin)/hierarchy/page.tsx`** — Full rewrite with Edit/Delete for all entity types:
   - **Edit**: Edit button on each hierarchy node (division, union, conference, church)
     - Opens generic edit dialog with code, name, headquarters/description fields
     - Permission-gated per entity type (GC Admin for divisions, Division Admin+ for unions, etc.)
     - Church edit dialog shows Address and Location fields instead of headquarters/description
   - **Delete**: Delete button on each node with AlertDialog confirmation
     - Shows cascade warning with child entity counts
     - Disables delete if children exist
     - Permission-gated per entity type
   - Action buttons use `e.stopPropagation()` to prevent collapsible toggle
   - Description fields added to all create/edit dialogs

### Stage Summary
- 6 new API route files created with PATCH/DELETE endpoints for all entities
- 3 frontend pages fully updated with edit dialogs, delete confirmations, and toast feedback
- All endpoints follow existing patterns: Zod validation, scope-based permissions, audit logging, proper error handling
- ESLint passes with zero errors
- All operations use the PERMISSIONS constant and `canPerformAction()` for consistent authorization

---
## Task ID: 6 - main-agent
### Work Task
Fix critical errors, install dependencies, fix middleware, polish UI, verify all flows

### Work Summary

1. **Fixed missing `nanoid` dependency** — Installed `nanoid` and `@types/nanoid` packages
2. **Fixed broken middleware** — Replaced `next-auth/middleware` (which was incompatible with custom JWT auth) with lightweight cookie-based middleware using Web Crypto API
3. **Fixed unused `use` import** in admin layout
4. **Updated root layout metadata** — Changed from generic "Z.ai Code Scaffold" to proper "Adventify - Global Baptism Certificate Platform" branding
5. **Simplified middleware approach** — Edge Runtime middleware now just checks cookie existence for page routes and lets API routes handle their own auth (via `requireAuth()`)
6. **Verified all API endpoints** — Tested login, analytics, users, persons, baptism records, certificates, audit logs, verify endpoints
7. **Verified certificate generation** — Generated certificate with BCN `EUD-BUC-SEC-001-2024-000001` successfully
8. **Verified all page routes** — All 9 routes return 200 status: /, /login, /verify, /hierarchy, /persons, /baptism-records, /certificates, /users, /audit-logs

### Stage Summary
- All critical build errors resolved
- Database seeded with 2 divisions, 3 unions, 4 conferences, 6 churches, 5 users, 5 persons, 5 baptism records
- All APIs functional and verified
- All pages compile and render without errors
- ESLint passes with zero errors

---
## Task ID: 7 - frontend-agent
### Work Task
Replace the plain text input Country field on the Persons page with a searchable combobox dropdown showing flag emojis.

### Work Summary

1. **Created `/src/lib/countries.ts`** — Comprehensive country data module:
   - Exports `Country` interface with `{ code: string, name: string, flag: string }`
   - Contains ~195 world countries with ISO 2-letter codes, English names, and flag emojis
   - Defines `popularCountryCodes` array (20 countries: US, GB, CA, AU, NG, KE, ZA, BR, IN, PH, DE, FR, JP, KR, MX, AR, CO, GH, TZ, UG) shown at the top
   - Remaining countries ordered alphabetically
   - Exports `getCountryByName(name)` helper for case-insensitive lookup
   - Exports `getOrderedCountries()` to build the final ordered list
   - Exports `COUNTRIES` as the pre-built ordered constant

2. **Created `/src/components/country-combobox.tsx`** — Reusable searchable country dropdown:
   - Uses shadcn/ui `Popover` + `Command` components (`cmdk` under the hood)
   - `CountryCombobox` component accepts `value` (current country name string) and `onChange` callback
   - Trigger button shows selected country with flag emoji, or "Select country..." placeholder
   - `ChevronsUpDown` icon on the right side of trigger
   - `CommandInput` with search icon for filtering
   - `CommandList` with `CommandEmpty` ("No country found.") and `CommandGroup`
   - Each `CommandItem` shows a `Check` icon (visible only when selected), flag emoji, and country name
   - `value` prop is matched against country names via `getCountryByName()`
   - Max scrollable height of 280px for the dropdown
   - Popover width matches trigger width via `--radix-popover-trigger-width`

3. **Updated `/src/app/(admin)/persons/page.tsx`** — Replaced country Input in both dialogs:
   - Added `CountryCombobox` import
   - **Create dialog**: Replaced `<Input {...createForm.register('country')} />` with `<CountryCombobox value={createForm.watch('country') || ''} onChange={(v) => createForm.setValue('country', v)} />`
   - **Edit dialog**: Replaced `<Input {...editForm.register('country')} />` with `<CountryCombobox value={editForm.watch('country') || ''} onChange={(v) => editForm.setValue('country', v)} />`
   - Edit dialog correctly pre-populates the country field from stored person data via `editForm.reset()` in `openEditDialog()`
   - Gender field remains as a regular `Select` component (unchanged)
   - No API routes or other pages modified

### Stage Summary
- Country field on Persons page is now a searchable combobox with ~195 countries and flag emojis
- Popular countries (20 Adventist-heavy nations) appear at the top of the dropdown
- Works in both Create and Edit dialogs with proper pre-population
- ESLint passes with zero errors

