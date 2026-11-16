-- ============================================================
-- EduManage - Supabase Database Setup (complete, corrected)
--
-- Run this whole file in the Supabase SQL Editor on a fresh project.
-- If the editor errors with "syntax error at end of input", your paste
-- was truncated - run it one section at a time instead.
-- ============================================================


-- ============================================================
-- TABLES
-- ============================================================

-- Extends Supabase's auth.users with a name and a role
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student records. profile_id links a student to a login account
-- (nullable, because a student record can exist before they get a login).
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  roll_number TEXT NOT NULL UNIQUE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);


-- ============================================================
-- HELPER FUNCTIONS
--
-- Both are SECURITY DEFINER with an explicit search_path. The
-- explicit search_path matters twice over: without it the function
-- may fail to find public.profiles when called from a trigger on
-- auth.users, and leaving it unset in a SECURITY DEFINER function
-- is a known privilege-escalation risk.
-- ============================================================

-- The role of whoever is making the current request
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $func$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$func$;

-- The student record belonging to whoever is making the current request.
-- SECURITY DEFINER here avoids RLS recursion: the students policies call
-- this function, so it must not itself be subject to those policies.
CREATE OR REPLACE FUNCTION public.my_student_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $func$
  SELECT id FROM public.students WHERE profile_id = auth.uid() LIMIT 1;
$func$;


-- ============================================================
-- TRIGGER: create a profile whenever an auth user is created
--
-- Normalizes role to lowercase and falls back to 'student' for
-- anything unrecognized, so a stray 'Teacher' in user metadata
-- can't violate the role CHECK constraint and fail the signup.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  wanted_role TEXT;
BEGIN
  wanted_role := lower(COALESCE(NEW.raw_user_meta_data->>'role', 'student'));

  IF wanted_role NOT IN ('admin', 'teacher', 'student') THEN
    wanted_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    wanted_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- ROW LEVEL SECURITY
--
-- The UI hiding data is not a security boundary. These policies are.
-- A student who opens the browser console and queries the API directly
-- must still only be able to reach their own rows.
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;


-- ---------- PROFILES ----------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_my_role() = 'admin');

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Needed so an admin can create teacher/student logins on someone else's behalf
CREATE POLICY "Admin can update all profiles" ON public.profiles
  FOR UPDATE USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Admin can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Admin can delete profiles" ON public.profiles
  FOR DELETE USING (public.get_my_role() = 'admin');


-- ---------- STUDENTS ----------
DROP POLICY IF EXISTS "Anyone logged in can view students" ON public.students;
DROP POLICY IF EXISTS "Admin can manage students" ON public.students;
DROP POLICY IF EXISTS "Admin manages students" ON public.students;
DROP POLICY IF EXISTS "Teachers view students" ON public.students;
DROP POLICY IF EXISTS "Students view own record" ON public.students;

CREATE POLICY "Admin manages students" ON public.students
  FOR ALL USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Teachers view students" ON public.students
  FOR SELECT USING (public.get_my_role() = 'teacher');

CREATE POLICY "Students view own record" ON public.students
  FOR SELECT USING (profile_id = auth.uid());


-- ---------- GRADES ----------
DROP POLICY IF EXISTS "Anyone logged in can view grades" ON public.grades;
DROP POLICY IF EXISTS "Teachers and admin can insert grades" ON public.grades;
DROP POLICY IF EXISTS "Teachers and admin can update grades" ON public.grades;
DROP POLICY IF EXISTS "Teachers and admin can delete grades" ON public.grades;
DROP POLICY IF EXISTS "Staff view all grades" ON public.grades;
DROP POLICY IF EXISTS "Students view own grades" ON public.grades;
DROP POLICY IF EXISTS "Staff insert grades" ON public.grades;
DROP POLICY IF EXISTS "Staff update grades" ON public.grades;
DROP POLICY IF EXISTS "Staff delete grades" ON public.grades;

CREATE POLICY "Staff view all grades" ON public.grades
  FOR SELECT USING (public.get_my_role() IN ('admin', 'teacher'));

CREATE POLICY "Students view own grades" ON public.grades
  FOR SELECT USING (student_id = public.my_student_id());

CREATE POLICY "Staff insert grades" ON public.grades
  FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'teacher'));

CREATE POLICY "Staff update grades" ON public.grades
  FOR UPDATE USING (public.get_my_role() IN ('admin', 'teacher'));

CREATE POLICY "Staff delete grades" ON public.grades
  FOR DELETE USING (public.get_my_role() IN ('admin', 'teacher'));


-- ---------- ATTENDANCE ----------
DROP POLICY IF EXISTS "Anyone logged in can view attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers and admin can insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers and admin can update attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers and admin can delete attendance" ON public.attendance;
DROP POLICY IF EXISTS "Staff view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Students view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Staff insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Staff update attendance" ON public.attendance;
DROP POLICY IF EXISTS "Staff delete attendance" ON public.attendance;

CREATE POLICY "Staff view all attendance" ON public.attendance
  FOR SELECT USING (public.get_my_role() IN ('admin', 'teacher'));

CREATE POLICY "Students view own attendance" ON public.attendance
  FOR SELECT USING (student_id = public.my_student_id());

CREATE POLICY "Staff insert attendance" ON public.attendance
  FOR INSERT WITH CHECK (public.get_my_role() IN ('admin', 'teacher'));

CREATE POLICY "Staff update attendance" ON public.attendance
  FOR UPDATE USING (public.get_my_role() IN ('admin', 'teacher'));

CREATE POLICY "Staff delete attendance" ON public.attendance
  FOR DELETE USING (public.get_my_role() IN ('admin', 'teacher'));


-- ============================================================
-- CREATING YOUR FIRST ADMIN
--
-- The app has no sign-up page by design: admins create all accounts.
-- So the very first admin has to be made by hand.
--
-- 1. Supabase Dashboard > Authentication > Users > Add user
--    Tick "Auto Confirm User".
-- 2. Turn OFF Authentication > Sign In / Providers > Email >
--    "Confirm email", or accounts you create in-app can't log in
--    and you'll hit the email rate limit.
-- 3. Run the UPDATE below with that user's email.
-- ============================================================

-- UPDATE public.profiles
-- SET role = 'admin', full_name = 'Admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
