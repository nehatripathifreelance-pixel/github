-- SQL Setup Script for School Management System
-- Run this in your Supabase SQL Editor

-- 1. Enquiries Table (Front Office)
CREATE TABLE IF NOT EXISTS enquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  parent_name TEXT,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Admissions Table
CREATE TABLE IF NOT EXISTS applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  course_id UUID REFERENCES courses(id),
  branch TEXT,
  score FLOAT DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Students Table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY, -- Using Custom ID like STU2026...
  title TEXT,
  first_name TEXT,
  middle_name TEXT,
  surname TEXT,
  name TEXT,
  roll_no TEXT,
  session TEXT,
  course_id UUID REFERENCES courses(id),
  branch TEXT,
  batch TEXT,
  year TEXT,
  semester TEXT,
  phone TEXT,
  email TEXT,
  blood_group TEXT,
  religion TEXT,
  caste TEXT,
  category TEXT,
  residential_address TEXT,
  state TEXT,
  pincode TEXT,
  permanent_address TEXT,
  permanent_state TEXT,
  permanent_pincode TEXT,
  transport_mode TEXT DEFAULT 'Private/Self',
  is_hosteller BOOLEAN DEFAULT false,
  photo_url TEXT,
  father_name TEXT,
  father_occupation TEXT,
  mother_name TEXT,
  mother_occupation TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  emergency_contact_name TEXT,
  emergency_phone TEXT,
  allergies TEXT,
  emergency_address TEXT,
  student_documents TEXT[],
  parent_documents TEXT[],
  signature_url TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Staff Table (Faculty)
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY, -- Using Custom ID like FAC2026...
  title TEXT,
  first_name TEXT,
  middle_name TEXT,
  surname TEXT,
  name TEXT NOT NULL,
  branch TEXT,
  batch TEXT,
  joining_year TEXT,
  phone TEXT,
  email TEXT UNIQUE,
  blood_group TEXT,
  religion TEXT,
  caste TEXT,
  category TEXT,
  address TEXT,
  state TEXT,
  pincode TEXT,
  permanent_address TEXT,
  permanent_state TEXT,
  permanent_pincode TEXT,
  transport_mode TEXT DEFAULT 'Private/Self',
  photo_url TEXT,
  father_name TEXT,
  mother_name TEXT,
  parent_phone TEXT,
  emergency_name TEXT,
  emergency_phone TEXT,
  bank_name TEXT,
  ifsc_code TEXT,
  account_number TEXT,
  bank_branch TEXT,
  role TEXT DEFAULT 'FACULTY',
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Visitor Log
CREATE TABLE IF NOT EXISTS visitor_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_no TEXT UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    purpose TEXT,
    person_to_meet TEXT,
    in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    out_time TIMESTAMP WITH TIME ZONE,
    photo_url TEXT,
    id_proof_type TEXT,
    id_proof_number TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Notices Table (Broadcast)
CREATE TABLE IF NOT EXISTS notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  audience TEXT DEFAULT 'All',
  priority TEXT DEFAULT 'Normal',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. User Credentials for Login
CREATE TABLE IF NOT EXISTS user_credentials (
  id TEXT PRIMARY KEY, -- login id
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert sample courses if not exists
INSERT INTO courses (name, code, duration) VALUES 
('B.Tech Computer Science', 'CS101', '4 Years'),
('Bachelor of Physiotherapy', 'BPT202', '4.5 Years'),
('Bachelor of Arts', 'BA303', '3 Years')
ON CONFLICT DO NOTHING;

-- Security Rules (RLS) - Basic Enable
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

-- Creating policies (Public SELECT, Authenticated modifications)
CREATE POLICY "Public Select" ON enquiries FOR SELECT USING (true);
CREATE POLICY "Authenticated Insert" ON enquiries FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update" ON enquiries FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete" ON enquiries FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Public Select" ON applications FOR SELECT USING (true);
CREATE POLICY "Authenticated Insert" ON applications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update" ON applications FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete" ON applications FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Public Select" ON students FOR SELECT USING (true);
CREATE POLICY "Authenticated Insert" ON students FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update" ON students FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete" ON students FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Public Select" ON staff FOR SELECT USING (true);
CREATE POLICY "Authenticated Insert" ON staff FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update" ON staff FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete" ON staff FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Public Select" ON notices FOR SELECT USING (true);
CREATE POLICY "Authenticated Insert" ON notices FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update" ON notices FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete" ON notices FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Public Select" ON user_credentials FOR SELECT USING (true);
CREATE POLICY "Authenticated Insert" ON user_credentials FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update" ON user_credentials FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete" ON user_credentials FOR DELETE USING (auth.role() = 'authenticated');

-- Explicit fix for tables mentioned in security report (if they exist)
DO $$ 
BEGIN
    -- Fix for fee_group_items
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fee_group_items') THEN
        ALTER TABLE public.fee_group_items ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow all access" ON public.fee_group_items;
        DROP POLICY IF EXISTS "Modify Authenticated" ON public.fee_group_items;
        CREATE POLICY "Select Public" ON public.fee_group_items FOR SELECT USING (true);
        CREATE POLICY "Modify Authenticated" ON public.fee_group_items FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
    END IF;

    -- Fix for papers
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'papers') THEN
        ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow all access" ON public.papers;
        DROP POLICY IF EXISTS "Modify Authenticated" ON public.papers;
        CREATE POLICY "Select Public" ON public.papers FOR SELECT USING (true);
        CREATE POLICY "Modify Authenticated" ON public.papers FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

