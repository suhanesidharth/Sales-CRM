# Flux CRM - Product Requirements Document

## Original Problem Statement
Build a comprehensive Sales Lead Management CRM with:
- Organization vs Lead separation (one org can have multiple leads)
- Lead lifecycle tracking with custom stages
- Revenue simulation (₹ INR currency)
- Server/data load estimation (15MB per scan)
- Player-wise sales flows
- Geography tracking with Indian states map
- Document tracking with custom names
- Admin team management with role-based access

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts + React Simple Maps
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT-based with role system

## User Personas
1. **Admin** - Full access, manages team members, roles
2. **Manager** - Can create/edit all data, cannot manage team
3. **User** - Standard CRUD on leads and organizations
4. **Viewer** - Read-only access

## Core Requirements (All Implemented ✅)
- [x] Organization management with Indian states
- [x] Lead lifecycle with 6 default stages + custom stages
- [x] Milestone-based tracking (Gantt-ready data structure)
- [x] Revenue simulation (offered_price, agreed_price, monthly/annual revenue)
- [x] Server data load estimation (daily/monthly GB based on 15MB/scan)
- [x] Player-wise sales flows (Hospital, NGO, Govt, Corporate)
- [x] Geography tracking with India map visualization
- [x] Document tracking with NDA, MOU, Pilot Agreement, Contract + custom types
- [x] Admin team management with role-based access
- [x] INR (₹) currency formatting throughout

## What's Been Implemented (Dec 2024)

### Backend APIs
- JWT auth with first-user-admin pattern
- Organization CRUD with Indian states
- Lead CRUD with revenue/data load calculations
- Custom organization types
- Custom lead stages
- Milestones and Documents CRUD
- Lead notes/updates (daily/weekly tracking)
- Sales flow configuration
- Team management (admin-only)
- Dashboard analytics with INR metrics
- Geography analytics for map visualization

### Frontend Pages
- Dashboard with INR stats, revenue metrics, data load
- Organizations with Indian state dropdown and type filtering
- Leads with pipeline/kanban view and custom stages
- Lead detail with pricing, milestones, documents, updates
- Geography page with India map
- Sales Flow configuration
- Team Management (admin only)

## Next Tasks / Backlog
1. Export leads/organizations to CSV
2. Email notifications for stage changes
3. Gantt chart visualization for milestones
4. Advanced filtering (date range, multi-select)
5. Activity audit log
6. Password change functionality
