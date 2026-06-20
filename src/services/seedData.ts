import { Job } from '../types/job';
import { InventoryItem } from '../types/inventory';
import { Customer } from '../types/customer';
import { Appointment } from '../types/appointment';

/**
 * Seed data used to populate Firestore on first run (dev convenience).
 * Once the backend has real data this can be removed.
 */

export const SEED_JOBS: Omit<Job, 'id'>[] = [
  {
    customerName: 'דוד כהן',
    address: 'רחוב הרצל 12, תל אביב',
    phone: '050-1234567',
    description: 'תיקון מזגן — יחידה חיצונית לא עובדת',
    status: 'awaiting',
    assignedTo: null,
    createdAt: new Date().toISOString(),
    scheduledAt: null,
    notes: [],
    photos: [],
  },
  {
    customerName: 'שרה לוי',
    address: 'שדרות בן גוריון 45, חיפה',
    phone: '052-9876543',
    description: 'התקנת מזגן חדש — 3 יחידות',
    status: 'scheduled',
    assignedTo: 'tech_1',
    createdAt: new Date().toISOString(),
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    notes: [],
    photos: [],
  },
  {
    customerName: 'משה אברהם',
    address: 'רחוב ויצמן 7, ירושלים',
    phone: '054-5551234',
    description: 'בדיקת מערכת מיזוג — תחזוקה שנתית',
    status: 'en_route',
    assignedTo: 'tech_1',
    createdAt: new Date().toISOString(),
    scheduledAt: new Date().toISOString(),
    notes: [],
    photos: [],
  },
  {
    customerName: 'רחל גולדברג',
    address: 'הנשיא 3, באר שבע',
    phone: '058-7774321',
    description: 'רעש חריג מיחידה פנימית',
    status: 'in_progress',
    assignedTo: 'tech_1',
    createdAt: new Date().toISOString(),
    scheduledAt: new Date().toISOString(),
    notes: ['הגעתי ללקוח, בדיקה ראשונית בוצעה'],
    photos: [],
  },
  {
    customerName: 'יוסף מזרחי',
    address: 'אלנבי 22, רמת גן',
    phone: '050-3332211',
    description: 'החלפת פילטרים',
    status: 'completed',
    assignedTo: 'tech_1',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    scheduledAt: new Date(Date.now() - 86400000).toISOString(),
    notes: ['הפילטרים הוחלפו, המערכת תקינה'],
    photos: [],
  },
];

export const SEED_INVENTORY: Omit<InventoryItem, 'id'>[] = [
  { barcode: '7290000000001', name: 'פילטר אוויר 12"',   quantity: 8,  location: 'warehouse', category: 'פילטרים' },
  { barcode: '7290000000002', name: 'גז פריאון R410A',    quantity: 3,  location: 'warehouse', category: 'גז'      },
  { barcode: '7290000000003', name: 'שלט אוניברסלי',      quantity: 12, location: 'warehouse', category: 'אביזרים' },
  { barcode: '7290000000004', name: 'חיבור נחושת 1/4"',   quantity: 50, location: 'vehicle',   category: 'אביזרים' },
  { barcode: '7290000000005', name: 'תרמוסטט דיגיטלי',    quantity: 5,  location: 'vehicle',   category: 'חשמל'    },
];

// createdAt + createdBy are stamped at seed time by customerService.
export const SEED_CUSTOMERS: Omit<Customer, 'id' | 'createdAt' | 'createdBy'>[] = [
  {
    name: 'דוד כהן',
    phone: '050-1234567',
    address: 'רחוב הרצל 12, תל אביב',
    userId: null,
  },
  {
    name: 'שרה לוי',
    phone: '052-9876543',
    address: 'שדרות בן גוריון 45, חיפה',
    notes: 'לקוחה קבועה — 3 יחידות בבית',
    userId: null,
  },
  {
    name: 'משה אברהם',
    phone: '054-5551234',
    address: 'רחוב ויצמן 7, ירושלים',
    userId: null,
  },
];

// status defaults to 'scheduled'; createdAt + createdBy stamped at seed time.
// jobId/customerId left null to avoid resolving auto-generated IDs at seed time.
export const SEED_APPOINTMENTS: Omit<
  Appointment,
  'id' | 'createdAt' | 'createdBy' | 'status'
>[] = [
  {
    jobId: null,
    customerId: null,
    technicianId: 'tech_1',
    title: 'תיאום התקנת מזגן — שרה לוי',
    startAt: new Date(Date.now() + 86400000).toISOString(),
    endAt: new Date(Date.now() + 86400000 + 3600000).toISOString(),
  },
  {
    jobId: null,
    customerId: null,
    technicianId: 'tech_1',
    title: 'תחזוקה שנתית — משה אברהם',
    startAt: new Date(Date.now() + 7200000).toISOString(),
    endAt: new Date(Date.now() + 7200000 + 3600000).toISOString(),
  },
];
