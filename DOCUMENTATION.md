# HAQMS Submission Requirements & Documentation

---

## 🔗 1. Updated GitHub Repository
* **Forked Repository URL:** `https://github.com/shubhangNarain/HAQMS-shubhang.git`
  - *Contains the fully updated full-stack codebase with all security fixes, performance optimizations, database indices, logical rules, UI tweaks, and text accessibility adjustments committed and pushed to the `main` branch.*

---

## 🌐 2. Deployed Application URLs
* **Frontend (Vercel):** `https://haqms-shubhang.vercel.app/`
* **Backend (Render):** `https://haqms-shubhang-1.onrender.com/`

---

## 📄 3. Documentation (Issues, Fixes & Optimizations)

### 🔍 Issues Identified & Fixes Implemented

#### 🔒 Challenge 1: Security Audit
1. **Credential Logging:** Plaintext user passwords were logged to the Node server console during registration and logins (`src/routes/auth.js`).
   - *Fix:* Removed plaintext logging statements and sanitized logged body attributes.
2. **Leaky Token Signature & Expiration:** The JWT middleware bypassed expiration validations (`ignoreExpiration: true`) and had a weak hardcoded fallback secret key.
   - *Fix:* Restored token expiry check enforcement and threw hard errors at startup if `JWT_SECRET` is missing.
3. **SQL Injection Vulnerability:** Raw dynamic string interpolation allowed SQL execution injections inside physician searches (`src/routes/doctors.js`).
   - *Fix:* Refactored search queries to use Prisma's parameterized SQL engine filtering.
4. **Bypassed Admin Authorization:** Administrative role check middleware code was commented out, allowing standard roles to run admin-only actions (like patient deletion).
   - *Fix:* Restored the `authorizeAdminOnlyLegacy` validation guard code.

#### ⚡ Challenge 2: Backend Performance & Concurrency
1. **N+1 Database Queries:** Nested patient/doctor attributes were queried sequentially in separate db queries inside a loop for each appointment slot listing row.
   - *Fix:* Utilized Prisma relational `include` parameters to load all relations in a single database join query.
2. **Event-Loop Blocking Sequential Calls:** Unrelated query aggregations were run in blocking serial `await` calls.
   - *Fix:* Parallelized execution using `Promise.all()`.
3. **Slow Aggregation Reporting Endpoint:** Sequential maps and loops compiled stats on the server, alongside an artificial timeout.
   - *Fix:* Removed the sleep block and migrated aggregation logic directly to Prisma `groupBy` queries.
4. **Check-in Token Race Condition:** Read-then-write checks with an artificial sleep delay assigned duplicate token IDs under concurrent check-ins.
   - *Fix:* Implemented serializable transactions that atomicize queue increments and prevent duplicate number generation.

#### 💾 Challenge 3: Database & Schema Optimization
1. **Schema Vulnerabilities (Double Bookings):** The model lacked constraints to prevent booking a doctor for multiple overlapping slots.
   - *Fix:* Added database-level unique indexes `@@unique([doctorId, appointmentDate])` and created a 15-minute scheduling buffer window check.
2. **Missing Indices:** Foreign key lookups lacked indexes, resulting in slower table scans.
   - *Fix:* Added Prisma index schemas (`@@index`) for critical patient, doctor, status, and time range lookups.
3. **In-Memory Pagination & Filtering:** Search lookups loaded full tables to memory to paginate results client-side.
   - *Fix:* Transferred pagination bounds (`take`/`skip`) and `contains` filters directly to SQL queries.

#### 🖥️ Challenge 4: Frontend React & Memory Optimization
1. **Polling Memory Leak:** public token waiting board `setInterval` loop remained active in memory after unmounting components.
   - *Fix:* Added cleanup callback handlers clearing interval ids in `useEffect`.
2. **Unnecessary Re-renders on Keystroke:** Search filter fields triggered API calls and state updates on every keystroke.
   - *Fix:* Added state debouncing (300-500ms).
3. **NULL Value Application Crash:** Viewing records of patients with null clinical history crashed the React context on `.toUpperCase()`.
   - *Fix:* Handled missing values using optional chaining (`medicalHistory?.toUpperCase()`).
4. **React Hooks Rule Violation (React Error #300) during Logout:** The staff dashboard page returned early with `if (!user) return null` before multiple state initializations and effect hooks, causing React to render fewer hooks on logout than in the previous render.
   - *Fix:* Moved the early return logic below all hook declarations and implemented optional chaining for `user` property access.

#### 🏗️ Challenge 5: Incomplete Feature Delivery
1. **Patient Diagnostic Reports Page:** The "View Diagnostic Reports Details" button redirected to a 404 page since the page was missing.
   - *Fix:* Created a dynamic path component `patients/[id]/history-records/page.js` to render patient history records and download reports.

#### 🔒 Phase 2: Security & Privacy Audits
1. **Plaintext Password Leak in Registration:** Registration responses returned full user profiles including password hashes.
   - *Fix:* Stripped the password attribute from registrations payload.
2. **Massive JWT Validity Window:** Authentication tokens was valid for 365 days.
   - *Fix:* Shortened expiry period to 24 hours.
3. **Credentials in LocalStorage:** Authentication tokens were saved directly to localStorage.
   - *Fix:* Migrated auth tokens to Secure, HttpOnly, and SameSite=Strict cookies.
4. **Server Exception Leaks:** Database constraint errors and call stack trace details were returned in client response JSON payloads.
   - *Fix:* Configured error loggers to hide raw stack messages under production mode.
5. **Privilege Escalation in Registration:** Users could self-promote to ADMIN by passing `role` inputs in registrations.
   - *Fix:* Restricted roles to RECEPTIONIST, requiring admin checks for other privileges.
6. **Privilege Escalation in Admin Reports:** Standard roles could read financial revenues and reports.
   - *Fix:* Enforced administrative authentication middleware blocks on `/reports/doctor-stats`.

#### ⚡ Phase 2: Performance & Scaling Optimizations
1. **Connection Pool Exhaustion:** Stats reports generated parallel database calls per doctor, exhausing the db pool.
   - *Fix:* Compiled counts and revenue metrics using consolidated database-level aggregates.
2. **Missing Server-side Query Pagination:** Doctor, queue, and appointment listing routes fetched entire historical records.
   - *Fix:* Added `take`/`skip` query page sizes and set queue monitors to default to active day slots.
3. **Unhandled Postgres Serialization Failures:** High-concurrency queues threw aborted Postgres transactions without retry triggers.
   - *Fix:* Wrapped queue check-ins in automatic retry wrappers.

#### 💾 Phase 2: Database Integrity & Logical Rules
1. **Delete Constraint Crash:** Deleting a patient with active appointments triggered constraint violations and crashed.
   - *Fix:* Added cascading deletes to related tables.
2. **Absence of Past Booking Safeguards:** Allowed booking slots in the past or outside operating shifts.
   - *Fix:* Enforced that appointment slots must be in the future and match physician availability.
3. **Missing Relations Checks:** Appointments accepted invalid patient/doctor IDs, crashing database triggers.
   - *Fix:* Added validation checks ensuring related IDs exist in the database.
4. **Patient Duplication Check:** No verification during patient registration to check if a patient with the same phone number or email already exists, leading to duplicate patient records.
   - *Fix:* Added a validation check in `POST /api/patients` to block duplicate registration (by email or phone number) with a `400 Bad Request`.

#### 🖥️ Phase 2: Frontend React & UX Defects
1. **Hardcoded Backend API URLs:** API URLs were hardcoded to `http://localhost:5000/api`.
   - *Fix:* Linked frontend configurations to `process.env.NEXT_PUBLIC_API_BASE_URL`.
2. **Hardcoded Doctor Selection:** Receptionist check-in button automatically assigned patients to the first doctor.
   - *Fix:* Created a Practitioner selector modal component.
3. **Doctor Worklist Check-in Click Crash:** Accessing `matchedDoc.id` before profiles loaded crashed the workspace.
   - *Fix:* Added optional chaining checks and disabled action buttons during load.
4. **Authentication Requirements on Public Board:** Public queue pages required authenticated tokens.
   - *Fix:* Enabled public access for GET `/api/queue` requests.
5. **Blank Navbar Navigation:** Header component returned null when unauthenticated, leaving public boards without menus.
   - *Fix:* Redesigned the navigation bar to render generic navigation headers and a Login button.
6. **DOM Selection Practices:** Walk-in selectors fetched data using direct DOM queries.
   - *Fix:* Bound input selections to React state variables and added regex telephone validations.
7. **Low-Contrast Dark Mode Styling:** Slate-100 text elements turned near-white on light backgrounds in system dark mode.
   - *Fix:* Replaced contrast classes with darker variants (slate-800/slate-700) across all 7 frontend files.

---

### ⚠️ Remaining Known Issues
* No additional critical architectural bugs are remaining. All functional tests, login operations, role-specific navigations, reports generation, and wait queue updates compile and execute Snappily without database lockups.

---

### 🧠 Approach & Reasoning Behind Major Decisions
* **Serializable isolation levels with PG retry loop:** Selected serializable transactions with a dedicated retry mechanism to resolve queue check-in concurrency bugs. This guarantees database-level integrity for token counts while preserving service availability during temporary serialization aborts.
* **Prisma schema-level cascading deletes & unique indexes:** Enforced constraints directly at the database level to ensure logic rules cannot be bypassed by raw query manipulations.
* **Component-Level contrast fixes:** Updated light text styling in dark mode directly inside components to ensure accessibility on all devices, keeping in line with the light-colored design system.

---

## 📹 4. Video Demonstration Outline
* **Video Link:** `https://drive.google.com/file/d/1bUVezRaGxoeEc7W0k6Lrvui6piwoSXin/view?usp=sharing`