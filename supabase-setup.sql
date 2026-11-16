-- ============================================================
-- EduManage - Supabase Database Setup
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- 1. PROFILES TABLE
-- Extends Supabase auth.users with role and name info
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STUDENTS TABLE
-- Core student records (linked to a profile for student login)
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  roll_number TEXT NOT NULL UNIQUE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. GRADES TABLE
CREATE TABLE IF NOT EXISTS grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ATTENDANCE TABLE
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
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admin can view all profiles" ON profiles FOR SELECT USING (get_my_role() = 'admin');
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admin can insert profiles" ON profiles FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "Admin can delete profiles" ON profiles FOR DELETE USING (get_my_role() = 'admin');

-- STUDENTS policies
CREATE POLICY "Anyone logged in can view students" ON students FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can manage students" ON students FOR ALL USING (get_my_role() = 'admin');

-- GRADES policies
CREATE POLICY "Anyone logged in can view grades" ON grades FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Teachers and admin can insert grades" ON grades FOR INSERT WITH CHECK (get_my_role() IN ('teacher', 'admin'));
CREATE POLICY "Teachers and admin can update grades" ON grades FOR UPDATE USING (get_my_role() IN ('teacher', 'admin'));
CREATE POLICY "Teachers and admin can delete grades" ON grades FOR DELETE USING (get_my_role() IN ('teacher', 'admin'));

-- ATTENDANCE policies
CREATE POLICY "Anyone logged in can view attendance" ON attendance FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Teachers and admin can insert attendance" ON attendance FOR INSERT WITH CHECK (get_my_role() IN ('teacher', 'admin'));
CREATE POLICY "Teachers and admin can update attendance" ON attendance FOR UPDATE USING (get_my_role() IN ('teacher', 'admin'));
CREATE POLICY "Teachers and admin can delete attendance" ON attendance FOR DELETE USING (get_my_role() IN ('teacher', 'admin'));

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- CREATE YOUR ADMIN ACCOUNT
-- After running this script, go to Supabase Dashboard >
-- Authentication > Users and manually create a user.
-- Then run this to make them admin (replace the email):
-- ============================================================

-- UPDATE profiles
-- SET role = 'admin', full_name = 'Admin User'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'your-admin@email.com');
