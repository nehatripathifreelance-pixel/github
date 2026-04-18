-- =========================================================
-- CMS FULL DATABASE SETUP (Supabase SQL Editor)
-- Version: 1.3
-- Updated: 2026-04-18
-- =========================================================

-- =========================================================
-- EXTENSIONS
-- =========================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- DROP TABLES (SAFE ORDER)
-- =========================================================
DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS exam_questions CASCADE;
DROP TABLE IF EXISTS exam_papers CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS income CASCADE;
DROP TABLE IF EXISTS expense_categories CASCADE;
DROP TABLE IF EXISTS income_categories CASCADE;
DROP TABLE IF EXISTS fees CASCADE;
DROP TABLE IF EXISTS fee_groups CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS enquiries CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS user_credentials CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS syllabus CASCADE;
DROP TABLE IF EXISTS timetable CASCADE;
DROP TABLE IF EXISTS study_activities CASCADE;

-- =========================================================
-- 1. APP SETTINGS
-- =========================================================
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 2. USER CREDENTIALS
-- =========================================================
CREATE TABLE user_credentials (
    id TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 3. COURSES
-- =========================================================
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT,
    department TEXT,
    duration TEXT,
    semesters INTEGER DEFAULT 0,
    credits INTEGER DEFAULT 0,
    description TEXT,
    fee_amount DECIMAL(10,2) DEFAULT 0,
    fee_pattern TEXT DEFAULT 'ANNUAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 4. STUDENTS
-- =========================================================
CREATE TABLE students (
    id TEXT PRIMARY KEY,
    roll_no TEXT UNIQUE,
    title TEXT,
    name TEXT NOT NULL,
    first_name TEXT,
    middle_name TEXT,
    surname TEXT,
    email TEXT,
    phone TEXT,
    course_id UUID REFERENCES courses(id),
    session TEXT,
    section TEXT,
    status TEXT DEFAULT 'Active',
    branch TEXT,
    year TEXT,
    batch TEXT,
    semester TEXT,
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
    transport_mode TEXT,
    vehicle_number TEXT,
    route_name TEXT,
    is_hosteller BOOLEAN DEFAULT FALSE,
    hostel_name TEXT,
    room_number TEXT,
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
    student_documents JSONB,
    parent_documents JSONB,
    signature_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 5. STAFF (FACULTY)
-- =========================================================
CREATE TABLE staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    first_name TEXT,
    middle_name TEXT,
    surname TEXT,
    email TEXT,
    phone TEXT,
    designation TEXT,
    role TEXT DEFAULT 'FACULTY',
    status TEXT DEFAULT 'Active',
    branch TEXT,
    batch TEXT,
    joining_year TEXT,
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
    transport_mode TEXT,
    vehicle_number TEXT,
    route_name TEXT,
    photo_url TEXT,
    father_name TEXT,
    father_occupation TEXT,
    mother_name TEXT,
    mother_occupation TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    emergency_contact_name TEXT,
    emergency_phone TEXT,
    bank_name TEXT,
    ifsc_code TEXT,
    account_number TEXT,
    branch_name TEXT,
    allergies TEXT,
    emergency_address TEXT,
    staff_documents JSONB,
    nominee_documents JSONB,
    signature_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 6. ENQUIRIES & APPLICATIONS
-- =========================================================
CREATE TABLE enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    parent_name TEXT,
    phone TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    name TEXT, -- Fallback
    email TEXT,
    phone TEXT NOT NULL,
    course_id UUID REFERENCES courses(id),
    branch TEXT,
    score TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 7. FEES
-- =========================================================
CREATE TABLE fee_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    course_id UUID REFERENCES courses(id),
    total_amount DECIMAL(10,2),
    items JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES students(id),
    amount DECIMAL(10,2),
    fine DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    discount_reason TEXT,
    final_amount DECIMAL(10,2),
    paid_amount DECIMAL(10,2),
    status TEXT DEFAULT 'PENDING',
    date DATE,
    description TEXT,
    due_date DATE,
    payment_mode TEXT,
    payment_method TEXT,
    transaction_id TEXT,
    semester INTEGER, -- Critical Fix (Turn 26 Log)
    year INTEGER,     -- Critical Fix (Turn 26 Log)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 8. INCOME / EXPENSE
-- =========================================================
CREATE TABLE income_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE,
    description TEXT
);

CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE,
    description TEXT
);

CREATE TABLE income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES income_categories(id),
    amount DECIMAL(10,2),
    date DATE,
    payment_method TEXT,
    description TEXT,
    source TEXT,
    reference_id TEXT
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES expense_categories(id),
    amount DECIMAL(10,2),
    date DATE,
    payment_method TEXT,
    description TEXT
);

-- =========================================================
-- 9. ATTENDANCE
-- =========================================================
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES students(id),
    date DATE,
    status TEXT,
    course_id UUID REFERENCES courses(id),
    time TEXT,
    ip_address TEXT,
    location TEXT,
    branch TEXT,
    batch TEXT,
    year TEXT,
    semester TEXT,
    section TEXT,
    method TEXT DEFAULT 'MANUAL',
    UNIQUE(student_id, date)
);

-- =========================================================
-- 10. EXAMS
-- =========================================================

-- PAPERS
CREATE TABLE exam_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    course_id UUID REFERENCES courses(id),
    subject TEXT,
    total_marks INTEGER,
    duration INTEGER,
    questions JSONB -- Questions Storage Fix (Turn 26 Log)
);

-- EXAMS
CREATE TABLE exams (
    id TEXT PRIMARY KEY,
    title TEXT,
    session TEXT,
    course TEXT,
    course_id UUID REFERENCES courses(id),
    subject TEXT,
    date DATE,
    time TEXT,
    duration INTEGER,
    status TEXT DEFAULT 'Scheduled',
    students_count INTEGER DEFAULT 0,
    paper_id UUID REFERENCES exam_papers(id),
    results_status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RESULTS
CREATE TABLE results (
    id TEXT PRIMARY KEY,
    exam_id TEXT REFERENCES exams(id),
    student_id TEXT REFERENCES students(id),
    student_name TEXT,
    marks DECIMAL(5,2),
    total_marks INTEGER,
    status TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    answers JSONB,
    scanned_sheet_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 11. ACADEMICS
-- =========================================================
CREATE TABLE syllabus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    unit_number INTEGER,
    title TEXT,
    description TEXT,
    unit_title TEXT
);

CREATE TABLE timetable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    day TEXT,
    subject TEXT,
    start_time TEXT,
    end_time TEXT,
    faculty TEXT,
    room TEXT
);

CREATE TABLE study_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    teacher_id TEXT,
    batch TEXT,
    date DATE,
    activities JSONB,
    assignment_subject TEXT,
    assignment_topic TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- HELPER FUNCTIONS
-- =========================================================
CREATE OR REPLACE FUNCTION is_connected() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.role() = 'authenticated' OR auth.role() = 'anon');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- RLS POLICIES
-- =========================================================
DO $$ 
DECLARE 
  t text;
  tables text[] := ARRAY[
    'app_settings', 'user_credentials', 'students', 'staff', 'courses',
    'enquiries', 'applications', 'fee_groups', 'fees', 'income', 'expenses',
    'income_categories', 'expense_categories', 'attendance',
    'exam_papers', 'exams', 'results', 'syllabus', 'timetable', 'study_activities'
  ];
BEGIN
  FOR t IN SELECT unnest(tables) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    -- Basic "allow all for connected" policy for simplicity in development
    EXECUTE format('DROP POLICY IF EXISTS "select_%I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "select_%I" ON %I FOR SELECT USING (true)', t, t);
    
    EXECUTE format('DROP POLICY IF EXISTS "insert_%I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "insert_%I" ON %I FOR INSERT WITH CHECK (is_connected())', t, t);
    
    EXECUTE format('DROP POLICY IF EXISTS "update_%I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "update_%I" ON %I FOR UPDATE USING (is_connected())', t, t);
    
    EXECUTE format('DROP POLICY IF EXISTS "delete_%I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "delete_%I" ON %I FOR DELETE USING (is_connected())', t, t);
  END LOOP;
END $$;

-- =========================================================
-- SEED DATA
-- =========================================================

-- Courses
INSERT INTO courses (name, code, department, duration, semesters, fee_amount) VALUES
('B.Tech Computer Science', 'BTCS', 'Engineering', '4 Years', 8, 120000),
('B.Tech IT', 'BTIT', 'Engineering', '4 Years', 8, 115000),
('B.Tech Mechanical', 'BTME', 'Engineering', '4 Years', 8, 110000),
('B.Tech Civil', 'BTCE', 'Engineering', '4 Years', 8, 110000),
('Bachelor of Physiotherapy', 'BPT', 'Medical', '4.5 Years', 9, 95000)
ON CONFLICT DO NOTHING;

-- App Settings (Academic Config)
INSERT INTO app_settings (key, value) VALUES
('academic', '{
  "sessions": ["23-24", "24-25", "25-26"],
  "branches": ["Computer Science", "IT", "Mechanical", "Civil", "Electronics", "Physiotherapy", "Biology", "Medicine", "Science"],
  "batches": ["Morning", "Evening", "Weekend"],
  "religions": ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Others"],
  "castes": ["General", "OBC", "SC", "ST", "EWS"],
  "categories": ["Regular", "Lateral", "Merit", "Management"],
  "semesters": ["1", "2", "3", "4", "5", "6", "7", "8"]
}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Categories
INSERT INTO income_categories (name, description) VALUES
('Fees', 'Student tuition and other fees'),
('Donation', 'Voluntary contributions'),
('Grant', 'Government or institutional grants'),
('Other', 'Miscellaneous income')
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (name, description) VALUES
('Salary', 'Staff salary and wages'),
('Maintenance', 'Building and equipment maintenance'),
('Utility', 'Electricity, water, and internet bills'),
('Events', 'College events and fests'),
('Others', 'Miscellaneous expenses')
ON CONFLICT DO NOTHING;

-- Admin User
INSERT INTO user_credentials (id, password, role, name, email) VALUES
('admin', 'admin123', 'SUPER_ADMIN', 'Super Admin', 'admin@cms.com')
ON CONFLICT (id) DO NOTHING;
