---
Task ID: 1
Agent: Main Agent
Task: Implement Church Clerk/Pastor approval workflow for baptism certificates

Work Log:
- Analyzed existing codebase: Prisma schema, auth system, API routes, frontend pages
- Added CHURCH_CLERK and CHURCH_PASTOR roles to Prisma schema (8 roles total now)
- Updated role hierarchy: MEMBER(0) < CLERK(1) < PASTOR(2) < CHURCH_ADMIN(3) < CONFERENCE(4) < UNION(5) < DIVISION(6) < GC_ADMIN(7)
- Updated PERMISSIONS matrix: CLERK can create persons/records, PASTOR can approve/reject
- Fixed login API to return full user data (churchId, divisionId, unionId, conferenceId + relations)
- Updated all scope filters in persons, baptism-records, certificates GET endpoints
- Updated all permission checks in POST/PATCH endpoints for church-level roles
- Updated approve/reject API routes to allow CHURCH_PASTOR for their church
- Added seed users: church.clerk@adventify.org and church.pastor@adventify.org
- Updated frontend: layout navigation, persons page, baptism-records page, users page, login page
- Added role badge colors: Pastor=blue, Clerk=amber
- Fixed TypeScript errors for all new Role types
- Build verified: `next build` passes successfully

Stage Summary:
- 17 files changed, 144 insertions, 71 deletions
- Key artifacts: Updated schema, auth, APIs, seed data, all frontend pages
- Commit: f71f0eb "feat: add church clerk and pastor roles with approval workflow"
- Note: Git remote not configured in this environment - user needs to push manually
