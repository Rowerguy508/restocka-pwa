# Restocka PWA

Lightweight mobile-first inventory management PWA for restaurants (Santo Domingo market).

## 🌐 Live URL

**https://restocka-pwa.vercel.app**

## 📱 Features

| Feature | Status | Notes |
|---------|--------|-------|
| Login/Logout | ✅ | Supabase Auth |
| Branch/Pedir selection | ✅ | Modal picker |
| Product grid view | ✅ | 21 products loaded |
| Stock adjustment (±1) | ✅ | Upsert to DB |
| Low stock alerts | ✅ | Red highlight |
| Reorder suggestions | ✅ | Click to open order modal |
| Order modal | ✅ | Quantity + notes input |
| Orders history tab | ✅ | Reads from localStorage |
| Offline mode | ✅ | IndexedDB queue for writes |

## 🔐 Credentials (QA Demo)

```
Email: fiveguys@restocka-qa.com
Password: QA_fiveguys_2026!
Organization: Five Guys Anacaona
```

## 🏗️ Architecture

```
restocka-pwa/
├── src/
│   ├── main.js          # Core app logic
│   ├── utils/
│   │   ├── supabase.js # Supabase client
│   │   └── offlineQueue.js
│   └── styles/
│       └── main.css
├── index.html
├── sw.js              # Service Worker
├── manifest.json
└── vercel.json       # SPA rewrites
```

## 🛠️ Tech Stack

- **Frontend:** Vanilla JS + Vite
- **Backend:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Offline:** Service Worker + IndexedDB

## 🔌 Supabase Schema

```sql
-- Main tables used:
products       (id, name, category, unit, ...)
inventory     (product_id, location_id, on_hand, safety_min, ...)
locations     (id, name, ...)
stock_levels   (location_id, product_id, quantity) -- joined view
```

## 📦 Deployment

```bash
npm run build
vercel deploy --prod
```

## 🔗 Related Repos

| Repo | Description |
|------|------------|
| [Restocka](https://github.com/Rowerguy508/Restocka) | Full SaaS backend (restocka.app) |
| [restocka-phase1](https://github.com/Rowerguy508/restocka-phase1) | DB migrations / API patterns |
| [restocka-v2](https://github.com/Rowerguy508/restocka-v2) | Lovable UI prototype |

> ⚠️ **Note:** This is a lightweight PWA demo. The main Restocka app (restocka.app) has the full feature set including multi-user roles, WhatsApp notifications, and supplier management.

## 📄 License

MIT