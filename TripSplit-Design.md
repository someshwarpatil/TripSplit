# TripSplit — Design Spec

> A modern, minimal group-travel expense-splitting web app. Mobile-first, real-time, dark-mode-aware.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict)
- **Styling:** Tailwind CSS 4 with CSS custom properties for theming (light + dark)
- **Icons:** `lucide-react`
- **Toasts:** `sonner`
- **Charts:** Pure SVG donut (no chart library)
- **QR Codes:** `qrcode.react`
- **Exports:** `jspdf` + `jspdf-autotable`
- **Backend:** Firebase (Auth + Firestore) — all data live via `onSnapshot`
- **State:** React Context for auth; Firestore subscriptions drive everything else
- **Hosting:** Vercel

---

## Design System

### Palette (coral-forward, dark-mode aware via CSS vars)

| Token | Light | Dark |
|---|---|---|
| `--color-primary` | `#E63946` | `#E63946` |
| `--color-primary-hover` | `#C1121F` | `#F87171` |
| `--color-primary-light` | `#FFF0F1` | `rgba(230,57,70,0.15)` |
| `--color-bg` | `#FAFAFA` | `#0F0F14` |
| `--color-surface` | `#FFFFFF` | `#1A1A22` |
| `--color-surface-hover` | `#F5F5F7` | `#23232E` |
| `--color-text` | `#1A1A2E` | `#F5F5F7` |
| `--color-text-secondary` | `#6B7280` | `#9CA3AF` |
| `--color-border` | `#E5E7EB` | `#2A2A35` |
| `--color-border-strong` | `#D1D5DB` | `#3A3A48` |
| `--color-input-bg` | `#FFFFFF` | `#23232E` |
| `--color-success` | `#10B981` | `#34D399` |
| `--color-error` | `#EF4444` | `#F87171` |

### Category Colors

Food `#E63946` • Transport `#457B9D` • Stay `#2A9D8F` • Activities `#E9C46A` • Shopping `#F4A261` • Other `#9CA3AF`

### Visual Language

- Rounded corners: `rounded-xl` (cards, inputs, modals), `rounded-full` (avatars, FAB)
- Soft shadows, no heavy borders — rely on surface elevation
- Generous whitespace; mobile-first single column, constrained max-w-3xl on trip detail
- Smooth transitions on hover/active; 95% scale on press for tactile feedback
- iOS safe-area support on fixed bottom elements (`env(safe-area-inset-bottom)`)
- Inter / system font stack

---

## Core Features

### 1. Authentication
- Google Sign-In + Email/Password
- On first login, create `users/{uid}` doc: `displayName`, `email`, `photoURL`, `upiId?`, `createdAt`
- Protected routes redirect to `/login`

### 2. Dashboard (`/dashboard`)
- Grid of trip cards: name, destination, date range, member avatars, total spend, **user's net balance**
- Prominent "Create Trip" CTA + secondary "Join Trip"
- Empty state with friendly illustration + CTA

### 3. Create Trip (`/trips/new`)
- Form: name, destination, start/end dates, currency (INR default for Indian users)
- Creator becomes admin; 6-char alphanumeric invite code auto-generated
- Redirect to `/trips/[tripId]`

### 4. Trip Detail (`/trips/[tripId]`)

**Header**
- Name, destination, date range, invite code pill (click-to-copy), member avatar stack (+N overflow)
- Actions: Export (dropdown: CSV/PDF), Settings (admin only)

**Summary Row (3 cards)**
- Total Spend, Your Spend, Your Balance (colored green/red)

**Category Donut Chart**
- SVG donut breaking down spend by category; legend with % and amount

**Tabs**

- **Expenses** — searchable list with:
  - Search bar (description match)
  - Horizontal chip filter for categories + payer filter
  - Each row: category icon, description, amount, payer avatar, date, location pin, split-type badge
  - Click → detail modal with full split breakdown
- **Balances** — pairwise settlements:
  - "Add Advance" banner for admin (see §8)
  - List of "X → Y amount" cards, sorted by amount
  - "Pay UPI" deep link button if payee has `upiId`
  - "Settle" button → records settlement
  - Contribution Breakdown: per-member paid vs fair share with progress bar + "gets back / owes" label
- **Members** — avatars, total spent per member, admin badge, remove-member (admin only), QR code modal for invite link

**Floating Action Button** — "+" in bottom-right for new expense (coral, shadow)

**Activity Feed (below tabs)** — reverse-chronological log of actions

### 5. Add/Edit Expense (`/trips/[tripId]/expenses/new` and `.../[expenseId]`)
- Fields: description, amount, **category** (6 options with colored chips), paid by, date, location (optional name)
- Split types:
  - **Equal** — auto divides across all members
  - **Custom** — enter each member's amount; must sum to total
  - **Percentage** — enter %; must sum to 100%
- Only creator or admin can edit/delete

### 6. Join Trip
- `/join` — enter invite code → validates → shows trip preview → confirm to join
- `/join/[inviteCode]` — deep link shortcut
- QR codes scannable from Members tab (white-bg container for dark-mode scannability)

### 7. Balance Engine (`src/utils/balance.ts`)

Two models, both pure functions, both tested against same data:

**Net Balance** (`calculateBalances`)
- Per-member signed running total. Payer of expense +amount, splits -share. Settlements move balance between `fromUid` and `toUid`. Advances increase member balance / decrease admin balance.
- Used for the "Your Balance" and "gets back / owes" summary.

**Pairwise Debts** (`computePairwiseDebts`) — the settlement list
- Tracks each unordered pair independently in a `Map<"from|to", amount>`.
- `addPair(from, to, amount)` canonicalizes direction (if both exist, nets them; prunes near-zero pairs).
- Inputs:
  1. Advances → `addPair(adminUid, memberUid, amount)` (admin owes member)
  2. Expenses → each non-payer → `addPair(uid, payer, share)`
  3. Settlements → `addPair(toUid, fromUid, amount)` (reduces the settled direction)
- **Why not greedy simplify:** a greedy matcher (debtor-to-creditor across the whole graph) can route an advance's credit to reduce a member's debt to someone who never received it — wrong. Pairwise isolation keeps advances between member↔admin only.

### 8. Advances (admin-only)
- Admin records cash the member gave upfront (e.g., "Pratibha handed ₹5000 toward the pool")
- Stored in `trips/{tripId}/advances` subcollection
- Effect:
  - Net balance: member +amount, admin −amount
  - Pairwise: admin→member debt, which then nets against the member's share of admin-paid expenses
- Never leaks across pairs — member's debt to a non-admin payer is untouched

### 9. Settlement Tracking
- "Settle" button on any pairwise debt writes to `trips/{tripId}/settlements`
- Confirmation modal shows from/to/amount before committing

### 10. Real-time Updates
- `subscribeToTrip`, `subscribeToExpenses`, `subscribeToSettlements`, `subscribeToAdvances`, `subscribeToActivities` all use Firestore `onSnapshot`
- Every mutation also writes to `activities` subcollection for the feed

### 11. Exports (CSV + PDF)
- `exportCSV(trip, expenses, settlements, members, advances)` — per-member split columns, summary, advances, pairwise settlements
- `exportPDF(...)` — styled tables via `jspdf-autotable`, coral header rows, footer page numbers, "Generated by TripSplit"
- Both use `computePairwiseDebts` for the settlement section

### 12. Admin Settings (`/trips/[tripId]/settings`)
- Edit name/dates/destination
- Regenerate invite code
- Delete trip (confirm modal)
- Non-admins redirected away

### 13. Profile (`/profile`)
- Edit displayName, photo (from Google auth)
- **UPI ID** field — when set, surfaces "Pay UPI" deep links on the Balances tab for anyone who owes this user

### 14. Offline Support
- `OfflineContext` + `OfflineBanner` detects `navigator.onLine`
- Banner across top when offline; Firestore handles the write queue

---

## Firestore Data Model

```
users/{uid}
  displayName, email, photoURL, upiId?, createdAt

trips/{tripId}
  name, destination, startDate, endDate, currency
  adminUid, inviteCode, createdAt
  memberUids: [uid, ...]

trips/{tripId}/expenses/{expenseId}
  description, amount, category, paidByUid, date, createdByUid
  splitType: "equal" | "custom" | "percentage"
  splits: { uid: amount, ... }
  location?: { name: string }
  createdAt, updatedAt

trips/{tripId}/settlements/{settlementId}
  fromUid, toUid, amount, createdAt

trips/{tripId}/advances/{advanceId}
  memberUid, amount, note?, addedByUid, createdAt

trips/{tripId}/activities/{activityId}
  type, actorUid, description, createdAt
```

---

## Security Rules (key invariants)

- `users/{uid}`: read by any auth'd user; write only by self
- `trips/{tripId}`: read only if `uid in memberUids`; update if admin or member; delete admin-only
- `expenses`: create by any member; update/delete by creator or admin
- `settlements`: create/read by any member
- `advances`: **create/delete admin-only**, read by any member
- `activities`: create/read by any member

---

## Routes

```
/                              Landing (hero, CTA)
/login                         Email + Google
/signup                        Email + Google
/dashboard                     All user's trips
/profile                       Edit profile + UPI
/trips/new                     Create trip form
/trips/[tripId]                Detail (tabs + FAB + activity)
/trips/[tripId]/settings       Admin-only
/trips/[tripId]/expenses/new   Add expense
/trips/[tripId]/expenses/[id]  Edit expense
/join                          Enter invite code
/join/[inviteCode]             Deep link join
```

---

## Project Structure

```
src/
  app/                         App Router pages (one folder per route)
  components/
    ui/                        Button, Card, Input, Modal, Avatar, Badge, Tabs, Skeleton
    layout/                    Navbar, OfflineBanner
    trip/                      ExpensesTab, BalancesTab, MembersTab,
                               CategoryChart, ExpenseDetailModal,
                               QRCodeModal, ActivityFeed
  lib/
    firebase.ts                Lazy-init Firebase app/auth/db
    firestore.ts               All CRUD + subscription helpers
  hooks/
    useTrip, useExpenses, useSettlements,
    useAdvances, useActivities, useMembers
  utils/
    balance.ts                 calculateBalances, computePairwiseDebts, simplifyDebts,
                               calculateEqualSplit, getUserBalance, getUserTotalSpend, getTotalSpend
    categories.ts              EXPENSE_CATEGORIES, getCategoryMeta
    export.ts                  exportCSV, exportPDF
    format.ts                  formatCurrency, formatDate, formatDateRange
  types/index.ts               Trip, Expense, Settlement, Advance, Activity,
                               ExpenseCategory, DebtSimplified
  context/
    AuthContext.tsx            Firebase auth state
    OfflineContext.tsx         navigator.onLine watcher
```

---

## UI/UX Conventions

- **Modals:** centered overlay, scale-in on desktop, slide-up on mobile; click-outside + ESC to close
- **Skeleton loaders** on first render of each subscription
- **Confirmation** for every destructive action (delete expense, remove member, delete trip, settle debt)
- **Avatars** show `photoURL` with initial fallback; 2px primary ring when stacked
- **Currency** follows trip's currency setting; `Intl.NumberFormat` with locale-aware formatting
- **Empty states** are friendly, not error-y: "No expenses yet — tap + to add one"
- **Accessibility:** semantic buttons, focus rings via `focus:ring-2 focus:ring-[var(--color-primary)]`, 44px min tap targets on mobile
- **No loading spinners on buttons** — use `loading` prop that disables + shows subdued state

---

## Notable Non-Obvious Decisions

1. **Pairwise debts over greedy simplification.** We deliberately do not use `simplifyDebts` for the settlement UI. It's kept around for historical/comparison but every consumer uses `computePairwiseDebts`. See §7 for why.
2. **Advances are their own subcollection**, not settlements. A settlement-shaped advance would be routable by simplification. The separate collection also keeps admin-only write rules clean.
3. **CSS variables for theming** rather than Tailwind's `dark:` variant — lets one CSS var swap every consumer at once, and third-party components (like the category donut) can read them too.
4. **QR code wrapped in white background** even in dark mode — scanner cameras need the contrast.
5. **Lazy Firebase init** (`getDb()`, `getAuth()` accessors) to keep Next.js server bundles small.
6. **`memberUids.join(',')`** as the `useEffect` dep in `useMembers` — arrays aren't value-equal, stringifying avoids refetch loops.

---

## Priority Build Order (if rebuilding from scratch)

1. Firebase + Auth + Protected routes
2. Dashboard + Create Trip + Join flow
3. Trip Detail shell with real-time Expenses list
4. Add/Edit Expense with equal split
5. `calculateBalances` + Your Balance summary
6. `computePairwiseDebts` + Balances tab with Settle
7. Members tab + Admin gates + Settings page
8. Custom/Percentage splits
9. Activity feed
10. Expense categories + search/filter + donut chart
11. Advances (subcollection + admin rules + UI in Balances)
12. CSV + PDF export
13. QR invite + UPI deep links + Profile
14. Offline banner + dark-mode polish

Build incrementally; validate each step's data model end-to-end before moving on.
