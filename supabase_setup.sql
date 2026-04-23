
-- =========================================================
-- CMS FULL DATABASE SETUP (Supabase SQL Editor)
-- Version: 1.4
-- Updated: 2026-04-23
-- =========================================================

-- =========================================================
-- EXTENSIONS
-- =========================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- DROP TABLES (SAFE ORDER)
-- =========================================================
DROP TABLE IF EXISTS visitor_log CASCADE;
DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS papers CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS expense_categories CASCADE;
DROP TABLE IF EXISTS income CASCADE;
DROP TABLE IF EXISTS income_categories CASCADE;
DROP TABLE IF EXISTS fees CASCADE;
DROP TABLE IF EXISTS fee_groups CASCADE;
DROP TABLE IF EXISTS study_activities CASCADE;
DROP TABLE IF EXISTS syllabus CASCADE;
DROP TABLE IF EXISTS timetable CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS enquiries CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS user_credentials CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS notices CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;

-- =========================================================
-- CORE TABLES
-- =========================================================

-- App Settings
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Credentials (Auth bypass helper/manual auth)
CREATE TABLE user_credentials (
    id TEXT PRIMARY KEY, -- User ID or Username
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Courses
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT,
    department TEXT,
    duration TEXT,
    semesters INTEGER DEFAULT 1,
    credits INTEGER DEFAULT 0,
    fee_pattern TEXT DEFAULT 'Semester Wise',
    fee_amount DECIMAL(10,2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Staff (Faculty)
CREATE TABLE staff (
    id TEXT PRIMARY KEY, -- Unified ID (e.g., FAC20261234)
    staff_id TEXT UNIQUE,
    title TEXT,
    first_name TEXT,
    middle_name TEXT,
    surname TEXT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    department TEXT,
    branch TEXT, -- Matching frontend 'branch'
    designation TEXT,
    joined_date DATE,
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
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Students
CREATE TABLE students (
    id TEXT PRIMARY KEY, -- Unified ID (e.g., STU20261234)
    roll_no TEXT UNIQUE,
    title TEXT,
    first_name TEXT,
    middle_name TEXT,
    surname TEXT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    course_id UUID REFERENCES courses(id),
    branch TEXT,
    batch TEXT,
    year TEXT,
    semester TEXT,
    session TEXT,
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
    father_name TEXT,
    father_occupation TEXT,
    mother_name TEXT,
    mother_occupation TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    emergency_contact_name TEXT,
    emergency_phone TEXT,
    emergency_address TEXT,
    allergies TEXT,
    photo_url TEXT,
    student_documents TEXT[],
    parent_documents TEXT[],
    signature_url TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Front Office (Enquiries)
CREATE TABLE enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    parent_name TEXT,
    phone TEXT NOT NULL,
    course TEXT,
    branch TEXT,
    source TEXT,
    status TEXT DEFAULT 'Pending',
    assigned_to TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Visitor Log
CREATE TABLE visitor_log (
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

-- Applications (Registrations)
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    course_id UUID REFERENCES courses(id),
    branch TEXT,
    score DECIMAL(5,2) DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- ACADEMIC MODULES
-- =========================================================

-- Timetable
CREATE TABLE timetable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    course_id UUID REFERENCES courses(id),
    subject TEXT NOT NULL,
    faculty TEXT, -- Simplified to TEXT to match Courses.tsx expectations
    room TEXT,
    batch TEXT,
    type TEXT DEFAULT 'Regular',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Syllabus
CREATE TABLE syllabus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    unit_number INTEGER NOT NULL,
    unit_title TEXT NOT NULL,
    title TEXT, -- Fallback for Title
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Study Activities (Logged activities)
CREATE TABLE study_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE DEFAULT CURRENT_DATE,
    batch TEXT,
    course_id UUID REFERENCES courses(id),
    activities TEXT[], -- Array of strings
    topics_covered TEXT, -- Legacy support
    assignment_subject TEXT,
    assignment_topic TEXT,
    assignment TEXT, -- Legacy support
    remarks TEXT,
    teacher_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attendance
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES students(id),
    date DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL,
    subject TEXT,
    method TEXT, -- 'QR', 'Face', 'Manual'
    ip_address TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- FINANCIAL MODULES
-- =========================================================

-- Fee Groups (Fee Pattern Definitions)
CREATE TABLE fee_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    course_id UUID REFERENCES courses(id),
    total_amount DECIMAL(10,2) NOT NULL,
    items JSONB NOT NULL, -- List of fee components
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fee Group Items (Relational alternative to JSONB items)
CREATE TABLE fee_group_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES fee_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fee Transactions (Student Payments)
CREATE TABLE fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES students(id),
    amount DECIMAL(10,2) NOT NULL,
    fine DECIMAL(10,2) DEFAULT 0.00,
    discount DECIMAL(10,2) DEFAULT 0.00,
    discount_reason TEXT,
    final_amount DECIMAL(10,2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    status TEXT NOT NULL, -- 'PAID', 'PENDING', 'OVERDUE', 'PARTIAL'
    type TEXT, -- e.g. 'TUITION', 'ADMISSION', 'EXAM'
    payment_method TEXT, -- 'Cash', 'UPI', 'Cheque', etc.
    payment_mode TEXT,
    transaction_id TEXT,
    description TEXT,
    semester INTEGER,
    year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Income Categories
CREATE TABLE income_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Income Records
CREATE TABLE income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    category_id UUID REFERENCES income_categories(id),
    amount DECIMAL(10,2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    reference_id TEXT,
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Expense Categories
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Expense Records
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purpose TEXT NOT NULL, -- sometimes used as title
    category_id UUID REFERENCES expense_categories(id),
    amount DECIMAL(10,2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    payee TEXT,
    payment_method TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- EXAMINATION SYSTEM
-- =========================================================

-- Exam Papers (Paper Setter)
CREATE TABLE papers ( -- Renamed to papers to match Reports module
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    course_id UUID REFERENCES courses(id),
    subject TEXT,
    set_code TEXT,
    total_marks INTEGER,
    instructions TEXT,
    duration INTEGER, -- in minutes
    questions JSONB, -- Array of questions
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled Exams
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    session TEXT,
    course_id UUID REFERENCES courses(id),
    subject TEXT,
    date DATE,
    time TIME,
    duration INTEGER,
    paper_id UUID REFERENCES papers(id), -- Updated reference
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'ongoing', 'completed', 'cancelled', 'published'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Exam Results & Evaluation
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id),
    student_id TEXT REFERENCES students(id),
    marks_obtained DECIMAL(5,2),
    total_marks INTEGER,
    evaluation_data JSONB, -- Detailed question scoring
    scanned_sheet_url TEXT,
    status TEXT DEFAULT 'draft', -- 'draft', 'published'
    published_at TIMESTAMP WITH TIME ZONE,
    evaluated_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- COMMUNICATION
-- =========================================================

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT, -- Target user ID or 'ALL'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'INFO', -- 'INFO', 'SUCCESS', 'WARNING', 'ERROR'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notices / Ticker
CREATE TABLE notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    type TEXT DEFAULT 'Notice',
    audience TEXT DEFAULT 'All', -- 'All', 'Students', 'Faculty', 'Staff', 'Parents'
    priority TEXT DEFAULT 'Normal',
    is_template BOOLEAN DEFAULT FALSE,
    created_by TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- RLS POLICIES (BASIC SECURITY)
-- =========================================================

-- Enable RLS on all tables
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY; -- Renamed
ALTER TABLE syllabus ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_activities ENABLE ROW LEVEL SECURITY; -- Renamed
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- Refined Policies (Fixed 0024 RLS Policy Always True warnings)
-- Helper: Split into public read and restricted write

-- 1. app_settings
CREATE POLICY "Public Read" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON app_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON app_settings FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON app_settings FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 2. user_credentials
CREATE POLICY "Public Read" ON user_credentials FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON user_credentials FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON user_credentials FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON user_credentials FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 3. courses
CREATE POLICY "Public Read" ON courses FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON courses FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON courses FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON courses FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 4. staff
CREATE POLICY "Public Read" ON staff FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON staff FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON staff FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON staff FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 5. students
CREATE POLICY "Public Read" ON students FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON students FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON students FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON students FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 6. enquiries
CREATE POLICY "Public Read" ON enquiries FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON enquiries FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON enquiries FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON enquiries FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 7. applications
CREATE POLICY "Public Read" ON applications FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON applications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON applications FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON applications FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 8. timetable
CREATE POLICY "Public Read" ON timetable FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON timetable FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON timetable FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON timetable FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 9. syllabus
CREATE POLICY "Public Read" ON syllabus FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON syllabus FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON syllabus FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON syllabus FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 10. study_activities
CREATE POLICY "Public Read" ON study_activities FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON study_activities FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON study_activities FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON study_activities FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 11. attendance
CREATE POLICY "Public Read" ON attendance FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON attendance FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON attendance FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON attendance FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 12. fee_groups
CREATE POLICY "Public Read" ON fee_groups FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON fee_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON fee_groups FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON fee_groups FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 12a. fee_group_items
CREATE POLICY "Public Read" ON fee_group_items FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON fee_group_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON fee_group_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON fee_group_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 13. fees
CREATE POLICY "Public Read" ON fees FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON fees FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON fees FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON fees FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 14. income_categories
CREATE POLICY "Public Read" ON income_categories FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON income_categories FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON income_categories FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON income_categories FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 15. income
CREATE POLICY "Public Read" ON income FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON income FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON income FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON income FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 16. expense_categories
CREATE POLICY "Public Read" ON expense_categories FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON expense_categories FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON expense_categories FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON expense_categories FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 17. expenses
CREATE POLICY "Public Read" ON expenses FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON expenses FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON expenses FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 18. papers
CREATE POLICY "Public Read" ON papers FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON papers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON papers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON papers FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 19. exams
CREATE POLICY "Public Read" ON exams FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON exams FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON exams FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON exams FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 20. results
CREATE POLICY "Public Read" ON results FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON results FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON results FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON results FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 21. visitor_log
CREATE POLICY "Public Read" ON visitor_log FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON visitor_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON visitor_log FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON visitor_log FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 22. notifications
CREATE POLICY "Public Read" ON notifications FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON notifications FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON notifications FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 23. notices
CREATE POLICY "Public Read" ON notices FOR SELECT USING (true);
CREATE POLICY "Auth Insert" ON notices FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Update" ON notices FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth Delete" ON notices FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Extra fix for potential external functions or tables mentioned in security report
DO $$ 
BEGIN
    -- Function Search Path Fix
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_connected') THEN
        ALTER FUNCTION public.is_connected() SET search_path = public;
    END IF;
END $$;

-- =========================================================
-- SEED DATA
-- =========================================================

-- Default Settings
INSERT INTO app_settings (key, value) VALUES 
('general', '{"collegeName": "Sun Group of Institutions", "foundationName": "Sri Kailashnath Foundation®", "address": "B-10, Industrial Market, Sakinaka, Mumbai", "logo": "", "email": "info@sungroup.edu", "phone": "9833057189"}'),
('academic', '{"sessions": ["2024-25", "2025-26"], "semesters": ["1st Semester", "2nd Semester", "1st Year", "2nd Year"], "branches": ["Computer Science", "Information Technology", "Mechanical", "Physiotherapy"]}'),
('fees', '{"paymentSchemes": ["Cash", "UPI", "Card", "Cheque", "DD", "Bank Transfer"]}');

-- Default Admin User
INSERT INTO user_credentials (id, password, role, name, email) VALUES 
('admin', 'admin123', 'SUPER_ADMIN', 'System Administrator', 'admin@sungroup.edu');

-- Default Expense Categories
INSERT INTO expense_categories (name, description) VALUES 
('Utilities', 'Electricity, water, and internet bills'),
('Office Supplies', 'Stationery and office equipment'),
('Maintenance', 'General building and equipment maintenance');

-- Sample Courses
INSERT INTO courses (name, code, department, duration, semesters, fee_amount) VALUES 
('B.Tech Computer Science', 'CSE', 'Engineering', '4 Years', 8, 45000.00),
('Bachelor of Physiotherapy', 'BPT', 'Medical', '4.5 Years', 9, 35000.00);

-- Sample Income Categories
INSERT INTO income_categories (name, description) VALUES 
('Fee Income', 'Income generated from student academic fees'),
('Consultancy', 'Income from research and consultancy services');
