# TripSplit — Claude Code Prompt

> A modern, minimal trip expense-splitting web app.

---

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), React 18+, TypeScript, Tailwind CSS
- **Backend/DB:** Firebase (Auth, Firestore, Hosting)
- **State Management:** React Context or Zustand
- **Icons:** Lucide React

---

## Design System

- **Theme:** Light red / coral palette
  - Primary: `#E63946` (vibrant red)
  - Primary Light: `#FFF0F1` (soft blush background)
  - Primary Hover: `#C1121F`
  - Accent: `#FFB4A2` (warm peach for cards/highlights)
  - Background: `#FAFAFA`
  - Surface: `#FFFFFF`
  - Text Primary: `#1A1A2E`
  - Text Secondary: `#6B7280`
  - Success: `#10B981`, Error: `#EF4444`
- **Style:** Minimal, clean, lots of whitespace, rounded corners (xl), subtle shadows, smooth transitions. Mobile-first responsive. Use Inter or system font stack. No clutter.

---

## Core Features

### 1. Authentication (Firebase Auth)

- Google Sign-In and Email/Password sign-up/login
- Protected routes — redirect to login if unauthenticated
- User profile stored in Firestore (`users` collection): `uid`, `displayName`, `email`, `photoURL`, `createdAt`

### 2. Dashboard (`/dashboard`)

- Shows all trips the user is part of (as admin or member)
- Each trip card shows: trip name, destination, date range, member count, total spent, user's net balance (owes or is owed)
- "Create New Trip" prominent CTA button
- Empty state illustration/message when no trips exist

### 3. Create Trip (`/trips/new`)

- Form fields: Trip Name, Destination (optional), Start Date, End Date, Currency (dropdown, default USD)
- Creator is automatically the **admin**
- On creation, generate a **unique invite code** (6-char alphanumeric) stored in Firestore
- Redirect to trip detail page after creation

### 4. Trip Detail Page (`/trips/[tripId]`)

- **Header:** Trip name, destination, dates, invite code with copy button, member avatars
- **Summary Cards Row:**
  - Total Trip Spend
  - Your Total Spend
  - Your Balance (green if owed, red if you owe)
- **Tabs:**
  - **Expenses Tab:** List of all expenses, sorted newest first. Each shows: description, amount, paid by (avatar + name), date, split type. Click to view detail/edit.
  - **Balances Tab:** Shows simplified "who owes whom" settlement list (use a minimization algorithm to reduce number of transactions). Visual bars showing each person's contribution vs fair share.
  - **Members Tab:** List of members with their total spend. Admin can remove members. Show invite code + share button here too.
- **Floating Action Button:** "Add Expense" (bottom-right, primary red)

### 5. Add/Edit Expense (`/trips/[tripId]/expenses/new`)

- Fields: Description, Amount, Paid By (dropdown of members, default to current user), Date (default today)
- **Split Type:**
  - Equal (default) — split evenly among all members
  - Custom — manually assign amounts to each person
  - Percentage — assign percentage to each person
- Only the expense creator or trip admin can edit/delete an expense
- Real-time Firestore updates so all members see changes instantly

### 6. Join Trip (`/join`)

- Input field for invite code
- Validates code, shows trip preview (name, destination, member count)
- "Join Trip" button adds user to trip's members array
- Also support deep link: `/join/[inviteCode]`

### 7. Settlement / Balance Calculation

- Implement a **debt simplification algorithm:**
  1. Calculate each person's net balance (total paid minus fair share of all expenses they're part of)
  2. Use a greedy algorithm to minimize number of transactions
  3. Display as: "Alice owes Bob $25.00", "Charlie owes Alice $12.50"
- Show a "Settle Up" button that marks a debt as settled (records a settlement transaction)

### 8. Admin Features

- Only trip admin can:
  - Edit trip details (name, dates, destination)
  - Remove members from trip
  - Delete the trip entirely (with confirmation modal)
  - Regenerate invite code
- Admin badge shown next to admin's name in members list

### 9. Real-time Updates

- Use Firestore `onSnapshot` listeners for:
  - Expenses list
  - Members list
  - Trip details
- All connected users see changes live without refresh

### 10. Notifications / Activity Feed (Simple)

- Activity log on trip detail page showing recent actions: "Alice added 'Dinner at Luigi's' — $85.00", "Bob joined the trip", "Charlie settled up with Alice"
- Stored as subcollection under trip

---

## Firestore Data Model

```
users/{uid}
  displayName, email, photoURL, createdAt

trips/{tripId}
  name, destination, startDate, endDate, currency
  adminUid, inviteCode, createdAt
  memberUids: [uid1, uid2, ...]

trips/{tripId}/expenses/{expenseId}
  description, amount, paidByUid, date, createdByUid
  splitType: "equal" | "custom" | "percentage"
  splits: { uid1: amount1, uid2: amount2, ... }
  createdAt, updatedAt

trips/{tripId}/activities/{activityId}
  type: "expense_added" | "member_joined" | "settled_up" | ...
  actorUid, description, metadata, createdAt

trips/{tripId}/settlements/{settlementId}
  fromUid, toUid, amount, createdAt
```

---

## Pages / Routes

```
/                    → Landing page (hero, features, CTA to sign up)
/login               → Login page
/signup              → Signup page
/dashboard           → User's trips dashboard
/trips/new           → Create trip form
/trips/[tripId]      → Trip detail (tabs: expenses, balances, members)
/trips/[tripId]/expenses/new    → Add expense
/trips/[tripId]/expenses/[id]   → Edit expense
/trips/[tripId]/settings        → Trip settings (admin only)
/join                → Join trip by code
/join/[inviteCode]   → Direct join link
/profile             → User profile/settings
```

---

## UI/UX Details

- All modals use a clean overlay with slide-up animation on mobile
- Toast notifications for success/error actions (use sonner or react-hot-toast)
- Skeleton loaders while data is fetching
- Confirmation dialogs for destructive actions (delete expense, remove member, delete trip)
- Avatar circles with initials fallback when no photo
- Currency formatting based on trip currency
- Responsive: single column on mobile, multi-column on desktop
- Smooth page transitions

---

## Project Structure

```
src/
  app/               → Next.js app router pages
  components/
    ui/              → Reusable UI (Button, Card, Modal, Input, Avatar, Badge, Tabs)
    layout/          → Navbar, Sidebar, Footer
    trip/            → Trip-specific components
    expense/         → Expense-specific components
  lib/
    firebase.ts      → Firebase config & initialization
    auth.ts          → Auth helpers
    firestore.ts     → Firestore CRUD helpers
  hooks/             → Custom hooks (useAuth, useTrip, useExpenses)
  utils/             → Balance calculation, formatters, helpers
  types/             → TypeScript interfaces
  context/           → Auth context provider
```

---

## Priority Order for Building

1. Firebase setup + Auth (Google + Email)
2. Dashboard + Create Trip
3. Trip Detail page with Expenses tab
4. Add/Edit Expense with equal split
5. Balance calculation + Balances tab
6. Invite code + Join Trip flow
7. Members tab + Admin features
8. Custom/Percentage splits
9. Settlement tracking
10. Activity feed
11. Polish, animations, edge cases

**Build this step by step. Start with step 1 and proceed through each. Ensure each feature works before moving on. Use TypeScript strictly. Write clean, well-organized code. Make it production-quality.**
