# EduManage

A student data management system with three roles — admin, teacher, and student — each seeing only what they should. Built with React and Supabase, deployed on Vercel.

## What each role can do

**Admin**
- Add, edit, and delete students
- Create teacher accounts
- Assign students to teachers
- Issue student logins
- View all grades and attendance across the institution

**Teacher**
- View their assigned students
- Record and edit grades
- Mark attendance (present / absent / late)

**Student**
- View their own profile, grades, and attendance rate

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4 |
| Routing | React Router v6 |
| Auth & database | Supabase (PostgreSQL) |
| Hosting | Vercel |

## Security model

Permissions are enforced in the database, not the interface. Every table has row-level security, so a student who bypasses the UI and queries the API directly still only reaches their own rows — the same for a teacher and students they aren't assigned.

Three `SECURITY DEFINER` helper functions back the policies:

- `get_my_role()` — the requesting user's role
- `my_student_id()` — the student record belonging to the requesting user
- `is_my_student(uuid)` — whether a student is assigned to the requesting teacher

They bypass RLS deliberately. A policy on `students` that needed to read `students` would recurse on itself.

## Database schema

```
profiles          id → auth.users, full_name, role
students          id, full_name, roll_number (unique), profile_id → profiles
teacher_students  teacher_id → profiles, student_id → students
grades            student_id → students, teacher_id → profiles, subject, score
attendance        student_id → students, teacher_id → profiles, date, status
```

`profiles.id` is also the auth user id, so `auth.uid()` works directly in policies without a join. `attendance` is unique on `(student_id, date)` — one mark per student per day, upserted to change.

## Setup

**1. Install**

```bash
git clone https://github.com/md-sajid-khan136/edumanage.git
cd edumanage
npm install
```

**2. Create a Supabase project** at [supabase.com](https://supabase.com), then run `supabase-setup.sql` in the SQL Editor. It's idempotent — safe to re-run.

**3. Turn off email confirmation**

Authentication → Sign In / Providers → Email → uncheck **Confirm email** → Save.

Required. Admins create accounts on others' behalf, so nobody is there to click a confirmation link, and leaving it on also trips Supabase's email rate limit.

**4. Add environment variables**

Create `.env` in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**5. Create the first admin**

There's no public sign-up page by design, so the first admin is made by hand:

- Authentication → Users → Add user, with **Auto Confirm User** ticked
- Then in the SQL Editor:

```sql
UPDATE public.profiles
SET role = 'admin', full_name = 'Admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
```

**6. Run**

```bash
npm run dev
```

## Project structure

```
src/
  lib/
    supabase.js        shared client
    accountClient.js   non-persisting client for admin-created accounts
  context/
    AuthContext.jsx    session + profile, exposes useAuth()
  components/
    ProtectedRoute.jsx role gate, redirects to the right dashboard
    Sidebar.jsx        role-aware navigation
  pages/
    Login.jsx
    admin/             dashboard, students, teachers, assignments, grades, attendance
    teacher/           dashboard, students, grades, attendance
    student/           dashboard, grades, attendance
```

### Why `accountClient.js` exists

`supabase.auth.signUp()` signs you in as the newly created account. When an admin creates a teacher or student login, that would replace the admin's own session. `accountClient.js` returns a client with `persistSession: false`, so signups don't touch the stored session and the admin stays logged in.

### Why teacher pages have no filtering code

They query `students` with no `where` clause. RLS already restricts the result to assigned students, so filtering in the frontend would be redundant — and a second place to get it wrong.

## Known limitations

- **Deleting a teacher leaves their login active.** It removes the `profiles` row but not the Supabase Auth user, who can still sign in and land on a dashboard with no profile. Deleting auth users needs the service-role key, which can't be exposed to a browser — it requires an Edge Function.
- **No password reset.** A forgotten password means an admin issues a new login. Supabase's reset flow needs SMTP configured.
- **Passwords display in plain text** in the create-login dialogs. Deliberate, so an admin can read credentials out while setting an account up.
- **Email confirmation must stay off** for in-app account creation to work.

## Deploying

Vercel auto-detects Vite. Add both environment variables in the project settings before the first deploy, or the build succeeds and the app loads to a blank page.

`vercel.json` rewrites all paths to `index.html`. Without it, loading `/admin/students` directly returns a 404, since Vercel looks for a file at that path instead of letting React Router handle it.
