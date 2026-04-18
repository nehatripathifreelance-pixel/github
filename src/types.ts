export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'COLLEGE_ADMIN' 
  | 'FACULTY' 
  | 'STUDENT' 
  | 'PARENT' 
  | 'PRINCIPAL' 
  | 'ACCOUNTANT' 
  | 'LIBRARIAN' 
  | 'STAFF';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  collegeId?: string;
  avatar?: string;
}

export interface College {
  id: string;
  name: string;
  location: string;
  branches: number;
  students: number;
  faculty: number;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  duration: string;
}

export interface Paper {
  id: string;
  courseId: string;
  subject: string;
  title: string;
  type: 'MCQ' | 'DESCRIPTIVE' | 'MIXED';
  questions: number;
  duration: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface Exam {
  id: string;
  title: string;
  courseId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  subjectId: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  amount: number;
  dueDate: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  type: 'ADMISSION' | 'TUITION' | 'EXAM' | 'LIBRARY';
}
