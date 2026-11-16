-- ============================================================
-- EduManage - Complete Supabase Setup
--
-- Safe to run on a fresh project OR an existing one: every
-- statement is idempotent (IF NOT EXISTS / DROP IF EXISTS /
-- CREATE OR REPLACE), so re-running it just converges the
-- database to this state.
--
-- If the SQL Editor says "syntax error at end of input", your
-- paste was truncated. Run it one SECTION at a time instead.
-- ============================================================


-- ============================================================
-- SECTION 1 - TABLES
-- ============================================================

-- Extends Supabase's auth.users with a display name and a role
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student records. profile_id is nullable because a student record
-- can exist before an admin gives that student a login.
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  roll_number TEXT NOT NULL UNIQUE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Which students each teacher is responsible for
CREATE TABLE IF NOT EXISTS teacher_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, student_id)
);

CREATE TABLE IF NOT EXISTS grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- UNIQUE(student_id, date) means one attendance mark per student
-- per day; the app upserts on that pair to change a mark.
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
-- SECTION 2 - HELPER FUNCTIONS
--
-- All three are SECURITY DEFINER with an explicit search_path.
-- That matters twice over: without it a function may fail to
-- find public.profiles when called from a trigger on auth.users,
-- and an unset search_path in a SECURITY DEFINER function is a
-- known privilege-escalation risk.
--
-- They are also what keeps the RLS policies below from recursing:
-- a policy on students that needs to read students would deadlock
-- on itself, so these functions bypass RLS deliberately.
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

-- The student record belonging to whoever is making the request
CREATE OR REPLACE FUNCTION public.my_student_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $func$
  SELECT id FROM public.students WHERE profile_id = auth.uid() LIMIT 1;
$func$;

-- Is the given student assigned to the teacher making the request?
CREATE OR REPLACE FUNCTION public.is_my_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $func$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_students
    WHERE teacher_id = auth.uid() AND student_id = p_student_id
  );
$func$;


-- ============================================================
-- SECTION 3 - TRIGGER: profile row for every new auth user
--
-- Normalizes role to lowercase and falls back to 'student' for
-- anything unrecognized. Without that, a stray 'Teacher' in user
-- metadata violates the role CHECK constraint, the trigger raises,
-- and the whole signup fails with an opaque "Database error".
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
-- SECTION 4 - ENABLE RLS + PROFILES POLICIES
--
-- The UI hiding data is not a security boundary; these policies
-- are. A student who opens the browser console and queries the
-- API directly must still only reach their own rows.
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

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

-- Lets an admin create teacher/student logins on someone else's behalf
CREATE POLICY "Admin can update all profiles" ON public.profiles
  FOR UPDATE USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Admin can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Admin can delete profiles" ON public.profiles
  FOR DELETE USING (public.get_my_role() = 'admin');


-- ============================================================
-- SECTION 5 - STUDENTS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Anyone logged in can view students" ON public.students;
DROP POLICY IF EXISTS "Admin can manage students" ON public.students;
DROP POLICY IF EXISTS "Admin manages students" ON public.students;
DROP POLICY IF EXISTS "Teachers view students" ON public.students;
DROP POLICY IF EXISTS "Teachers view assigned students" ON public.students;
DROP POLICY IF EXISTS "Students view own record" ON public.students;

CREATE POLICY "Admin manages students" ON public.students
  FOR ALL USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Teachers view assigned students" ON public.students
  FOR SELECT USING (
    public.get_my_role() = 'teacher' AND public.is_my_student(id)
  );

CREATE POLICY "Students view own record" ON public.students
  FOR SELECT USING (profile_id = auth.uid());


-- ============================================================
-- SECTION 6 - TEACHER_STUDENTS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Admin manages assignments" ON public.teacher_students;
DROP POLICY IF EXISTS "Teachers view own assignments" ON public.teacher_students;

CREATE POLICY "Admin manages assignments" ON public.teacher_students
  FOR ALL USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Teachers view own assignments" ON public.teacher_students
  FOR SELECT USING (teacher_id = auth.uid());


-- ============================================================
-- SECTION 7 - GRADES POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Anyone logged in can view grades" ON public.grades;
DROP POLICY IF EXISTS "Teachers and admin can insert grades" ON public.grades;
DROP POLICY IF EXISTS "Teachers and admin can update grades" ON public.grades;
DROP POLICY IF EXISTS "Teachers and admin can delete grades" ON public.grades;
DROP POLICY IF EXISTS "Staff view all grades" ON public.grades;
DROP POLICY IF EXISTS "Staff insert grades" ON public.grades;
DROP POLICY IF EXISTS "Staff update grades" ON public.grades;
DROP POLICY IF EXISTS "Staff delete grades" ON public.grades;
DROP POLICY IF EXISTS "Students view own grades" ON public.grades;
DROP POLICY IF EXISTS "Admin all grades" ON public.grades;
DROP POLICY IF EXISTS "Teachers view assigned grades" ON public.grades;
DROP POLICY IF EXISTS "Teachers insert assigned grades" ON public.grades;
DROP POLICY IF EXISTS "Teachers update assigned grades" ON public.grades;
DROP POLICY IF EXISTS "Teachers delete assigned grades" ON public.grades;

CREATE POLICY "Admin all grades" ON public.grades
  FOR ALL USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Students view own grades" ON public.grades
  FOR SELECT USING (student_id = public.my_student_id());

CREATE POLICY "Teachers view assigned grades" ON public.grades
  FOR SELECT USING (public.get_my_role() = 'teacher' AND public.is_my_student(student_id));

CREATE POLICY "Teachers insert assigned grades" ON public.grades
  FOR INSERT WITH CHECK (public.get_my_role() = 'teacher' AND public.is_my_student(student_id));

CREATE POLICY "Teachers update assigned grades" ON public.grades
  FOR UPDATE USING (public.get_my_role() = 'teacher' AND public.is_my_student(student_id));

CREATE POLICY "Teachers delete assigned grades" ON public.grades
  FOR DELETE USING (public.get_my_role() = 'teacher' AND public.is_my_student(student_id));


-- ============================================================
-- SECTION 8 - ATTENDANCE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Anyone logged in can view attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers and admin can insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers and admin can update attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers and admin can delete attendance" ON public.attendance;
DROP POLICY IF EXISTS "Staff view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Staff insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Staff update attendance" ON public.attendance;
DROP POLICY IF EXISTS "Staff delete attendance" ON public.attendance;
DROP POLICY IF EXISTS "Students view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admin all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers view assigned attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers insert assigned attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers update assigned attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers delete assigned attendance" ON public.attendance;

CREATE POLICY "Admin all attendance" ON public.attendance
  FOR ALL USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Students view own attendance" ON public.attendance
  FOR SELECT USING (student_id = public.my_student_id());

CREATE POLICY "Teachers view assigned attendance" ON public.attendance
  FOR SELECT USING (public.get_my_role() = 'teacher' AND public.is_my_student(student_id));

CREATE POLICY "Teachers insert assigned attendance" ON public.attendance
  FOR INSERT WITH CHECK (public.get_my_role() = 'teacher' AND public.is_my_student(student_id));

CREATE POLICY "Teachers update assigned attendance" ON public.attendance
  FOR UPDATE USING (public.get_my_role() = 'teacher' AND public.is_my_student(student_id));

CREATE POLICY "Teachers delete assigned attendance" ON public.attendance
  FOR DELETE USING (public.get_my_role() = 'teacher' AND public.is_my_student(student_id));


-- ============================================================
-- SECTION 9 - FIRST ADMIN (manual, one time)
--
-- The app has no public sign-up page by design: admins create
-- every account. So the first admin has to be made by hand.
--
-- 1. Supabase Dashboard > Authentication > Users > Add user,
--    with "Auto Confirm User" ticked.
-- 2. Turn OFF Authentication > Sign In / Providers > Email >
--    "Confirm email" (and Save). Otherwise accounts created from
--    inside the app can never log in, and you will hit the
--    built-in email rate limit.
-- 3. Uncomment the UPDATE below, set the email, run it.
-- ============================================================

-- UPDATE public.profiles
-- SET role = 'admin', full_name = 'Admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'you@example.com');


-- ============================================================
-- USEFUL CHECKS
-- ============================================================

-- Every account and its role
-- SELECT u.email, p.full_name, p.role
-- FROM auth.users u
-- LEFT JOIN public.profiles p ON p.id = u.id
-- ORDER BY u.created_at;

-- Who is assigned to whom
-- SELECT t.full_name AS teacher, s.full_name AS student, s.roll_number
-- FROM public.teacher_students ts
-- JOIN public.profiles t ON t.id = ts.teacher_id
-- JOIN public.students s ON s.id = ts.student_id
-- ORDER BY t.full_name, s.full_name;

-- Which students have a login
-- SELECT full_name, roll_number,
--        CASE WHEN profile_id IS NULL THEN 'no login' ELSE 'can sign in' END AS login
-- FROM public.students ORDER BY full_name;
