# Kashio Admin Dashboard

Admin dashboard for the Kashio delivery system. MVP scope: **Parcels (courier)** and **Riders** management. Customer Management, Revenue and Settings are stubbed as "coming soon".

Built with **Next.js 14 (App Router)**, **TypeScript**, and **Tailwind CSS**. Themed to match the Kashio green brand with a dark sidebar.

## Getting Started

```bash
cd admin-dashboard
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to the login page.

> Auth is a placeholder right now: the **Login** button takes you straight to
> the dashboard. Wire it to a real API in the next step.

## Pages

- `/login` — split login card; left side uses `public/login-hero.svg`
- `/dashboard` — overview: 3 stat cards + Active Orders table
- `/dashboard/parcels` — Parcel Management (orders/courier table)
- `/dashboard/riders` — Riders Management (rider cards)
- `/dashboard/customers` — coming soon
- `/dashboard/revenue` — coming soon
- `/dashboard/settings` — coming soon

## Structure

```
public/login-hero.svg        Login illustration
src/
  app/
    login/page.tsx
    dashboard/
      layout.tsx             Dark shell + sidebar
      page.tsx               Overview
      parcels/page.tsx
      riders/page.tsx
      customers|revenue|settings/page.tsx
  components/                Sidebar, Topbar, StatusBadge, ComingSoon
  lib/mock-data.ts           Placeholder orders & riders
```

## Theme

- Brand green, dark sidebar, and status colors live in `tailwind.config.ts`
  (`brand`, `accent`, `shell`, `sidebar`).
- Table images use emoji placeholders; swap for real assets later.

## Next steps (suggested)

- Real authentication
- Backend / API + database for orders and riders
- Functional create/assign flows (New Parcel, Add Rider, Assign Rider)
- Rider live tracking
