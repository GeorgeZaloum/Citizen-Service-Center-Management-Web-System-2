// In-memory data of the mock server, kept in sessionStorage so a page reload keeps the
// session and the changes. It mirrors the backend seeds (seed_data, seed_local_data).
import type { AccountStatus, CenterSettings, DepartmentStatus, Role } from "@/api/contracts";

export const DEMO_PASSWORD = "Demo-Pass1";

export interface MockUser {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: Role;
  status: AccountStatus;
  job_title: string | null;
  department_id: number | null;
  national_id: string | null;
  password: string;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
}

export interface MockDepartment {
  id: number;
  name: string;
  authority: string;
  description: string;
  status: DepartmentStatus;
  created_at: string;
  /** Requests arrive in Sprint 3; one demo department has some, to show the archive path. */
  request_count: number;
}

export interface MockState {
  users: MockUser[];
  departments: MockDepartment[];
  centerSettings: CenterSettings;
  sessionUserId: number | null;
  csrfToken: string | null;
  nextUserId: number;
  nextDepartmentId: number;
}

const STORAGE_KEY = "csc.mock-db.v1";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function createSeedState(): MockState {
  const departments: MockDepartment[] = [
    {
      id: 1,
      name: "البلدية",
      authority: "مديرية البلدية",
      description: "عقود الإيجار ورخص البناء والخدمات المحلية.",
      status: "ACTIVE",
      created_at: daysAgo(60),
      request_count: 0,
    },
    {
      id: 2,
      name: "المرور",
      authority: "مديرية النقل والمرور",
      description: "تسجيل المركبات ورخص القيادة.",
      status: "ACTIVE",
      created_at: daysAgo(60),
      request_count: 0,
    },
    {
      id: 3,
      name: "السجل المدني",
      authority: "مديرية الشؤون المدنية",
      description: "قيود الأحوال المدنية والبيانات العائلية.",
      status: "ACTIVE",
      created_at: daysAgo(60),
      request_count: 0,
    },
    {
      id: 4,
      name: "الشؤون الاجتماعية",
      authority: "مديرية الشؤون الاجتماعية",
      description: "قسم تجريبي موقوف بلا حسابات، يمكن حذفه.",
      status: "SUSPENDED",
      created_at: daysAgo(20),
      request_count: 0,
    },
    {
      id: 5,
      name: "الأملاك العامة",
      authority: "مديرية الأملاك",
      description: "قسم تجريبي موقوف مرتبط بطلبات، يُؤرشف بدل حذفه.",
      status: "SUSPENDED",
      created_at: daysAgo(30),
      request_count: 3,
    },
    {
      id: 6,
      name: "الخدمات الفنية",
      authority: "مديرية الخدمات الفنية",
      description: "قسم جديد لم يُعيَّن له مدير بعد.",
      status: "ACTIVE",
      created_at: daysAgo(2),
      request_count: 0,
    },
  ];

  let id = 0;
  const user = (
    data: Partial<MockUser> & Pick<MockUser, "full_name" | "email" | "phone" | "role">,
  ): MockUser => ({
    id: ++id,
    status: "ACTIVE",
    job_title: null,
    department_id: null,
    national_id: null,
    password: DEMO_PASSWORD,
    failed_attempts: 0,
    locked_until: null,
    created_at: daysAgo(50 - id),
    ...data,
  });

  const users: MockUser[] = [
    user({ full_name: "مدير النظام", email: "admin@csc.local", phone: "0900000000", role: "SYSTEM_ADMIN" }),
    user({
      full_name: "سامر الحلبي",
      email: "manager.municipality@demo.csc",
      phone: "0911000001",
      role: "DEPT_MANAGER",
      department_id: 1,
      job_title: "مدير قسم البلدية",
    }),
    user({
      full_name: "ريم العلي",
      email: "manager.traffic@demo.csc",
      phone: "0911000002",
      role: "DEPT_MANAGER",
      department_id: 2,
      job_title: "مديرة قسم المرور",
    }),
    user({
      full_name: "خالد الشامي",
      email: "manager.civil-registry@demo.csc",
      phone: "0911000003",
      role: "DEPT_MANAGER",
      department_id: 3,
    }),
    user({
      full_name: "لينا حداد",
      email: "employee1.municipality@demo.csc",
      phone: "0933000001",
      role: "EMPLOYEE",
      department_id: 1,
      job_title: "موظفة عقود",
    }),
    user({
      full_name: "عمر الخطيب",
      email: "employee2.municipality@demo.csc",
      phone: "0933000002",
      role: "EMPLOYEE",
      department_id: 1,
      job_title: "موظف رخص",
    }),
    user({
      full_name: "نور الدين قاسم",
      email: "employee3.municipality@demo.csc",
      phone: "0933000003",
      role: "EMPLOYEE",
      department_id: 1,
      status: "DISABLED",
    }),
    user({
      full_name: "هبة الأحمد",
      email: "employee1.traffic@demo.csc",
      phone: "0933000004",
      role: "EMPLOYEE",
      department_id: 2,
      job_title: "موظفة تسجيل",
    }),
    user({
      full_name: "يوسف درويش",
      email: "employee2.traffic@demo.csc",
      phone: "0933000005",
      role: "EMPLOYEE",
      department_id: 2,
    }),
    user({
      full_name: "مايا السيد",
      email: "employee1.civil-registry@demo.csc",
      phone: "0933000006",
      role: "EMPLOYEE",
      department_id: 3,
    }),
    user({
      full_name: "أحمد المصري",
      email: "citizen1@demo.csc",
      phone: "0944000001",
      role: "CITIZEN",
      national_id: "01234567891",
    }),
    user({
      full_name: "سلمى يوسف",
      email: "citizen2@demo.csc",
      phone: "0944000002",
      role: "CITIZEN",
      national_id: "01234567892",
    }),
  ];

  return {
    users,
    departments,
    centerSettings: {
      name: "مركز خدمات المواطنين",
      address: "دمشق، ساحة المحافظة، بناء الخدمات العامة",
      contact_phones: "011 2222222 - 011 3333333",
      work_start: "08:00:00",
      work_end: "15:00:00",
    },
    sessionUserId: null,
    csrfToken: null,
    nextUserId: id + 1,
    nextDepartmentId: departments.length + 1,
  };
}

function load(): MockState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MockState;
  } catch {
    // Unreadable or unavailable storage: start from the seed.
  }
  return createSeedState();
}

export const db: { state: MockState } = { state: load() };

export function persist(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db.state));
  } catch {
    // Storage unavailable: the data lives for this page only.
  }
}

/** Back to the seed (tests, and a fresh demo). */
export function resetMockDb(): void {
  db.state = createSeedState();
  uploadedImages.clear();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** ID card images uploaded at registration in this page (never persisted). */
export const uploadedImages = new Map<string, Blob>();
