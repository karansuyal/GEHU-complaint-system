# GEHU Bhimtal — Complaint Portal (Frontend)

React (Vite) + Tailwind frontend for the campus complaint management system.
Built to talk to a FastAPI backend (see `/backend` once built) via `VITE_API_URL`.

## Setup

```bash
npm install
cp .env.example .env   # edit VITE_API_URL to point at your backend
npm run dev
```

## Structure

```
src/
  api/client.js          # Axios instance + endpoint helpers (JWT auto-attached)
  context/AuthContext.jsx # Login/register/logout, session persisted in localStorage
  utils/pushNotifications.js  # Service worker registration + Web Push subscribe/unsubscribe
  components/
    Navbar.jsx
    ProtectedRoute.jsx    # Role-gated routing (student / warden / admin)
    StatusBadge.jsx
    ComplaintCard.jsx
    NotificationBell.jsx  # Unread badge + dropdown, polls every 20s
    PresenceBadge.jsx     # "N staff online" — heartbeats every 25s, shown to students
    PushSetup.jsx          # Mounted once logged in; requests permission + subscribes
  pages/
    Login.jsx / Register.jsx
    StudentDashboard.jsx  # Student's own complaints, filterable by status
    NewComplaint.jsx      # Complaint form — ragging category auto-forces
                           # anonymous + backend routes it straight to admin,
                           # bypassing the warden
    ComplaintDetail.jsx   # Status timeline + comment thread
    WardenDashboard.jsx   # Assigned complaints, inline status update
    AdminDashboard.jsx    # Campus-wide stats, trend/category charts (recharts),
                           # escalation alerts, recent list
public/
  sw.js                   # Service worker: shows push notifications, handles clicks
```

## Push notifications

Set `VITE_VAPID_PUBLIC_KEY` in `.env` to the same public key you generated on
the backend (see backend README). If it's left blank, the frontend asks the
backend for it at `/notifications/push/vapid-public-key` instead — so this
works even without a `.env` edit, as long as the backend has keys configured.
If push isn't configured anywhere, everything still works via in-app
notifications (the bell) and polling; push is additive, not required.

## Roles

- **student** — files complaints, tracks own status, sees the "staff online" badge
- **warden** — sees complaints assigned to their category/block, updates status
- **admin** — campus-wide view, analytics (trend + category charts), and the
  only role that sees ragging/anonymous complaints

## Next step: backend

This frontend expects a FastAPI backend at `VITE_API_URL` exposing the routes
listed in `src/api/client.js` (`/auth/*`, `/complaints/*`, `/analytics/*`,
`/notifications/*`, `/presence/*`). JWT is expected as
`{ access_token, user: { id, name, email, role, campus } }` from
`/auth/login` and `/auth/register`.
