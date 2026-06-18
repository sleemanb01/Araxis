import { create } from 'zustand';
import { Job, JobStatus, CreateJobPayload } from '../types/job';

const DUMMY_JOBS: Job[] = [
  {
    id: '1',
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
    id: '2',
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
    id: '3',
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
    id: '4',
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
    id: '5',
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

interface JobStore {
  jobs: Job[];
  activeFilter: JobStatus | 'all';

  setFilter: (filter: JobStatus | 'all') => void;
  addJob: (payload: CreateJobPayload) => void;
  updateJobStatus: (id: string, status: JobStatus) => void;
  addNote: (id: string, note: string) => void;
  addPhoto: (id: string, uri: string) => void;

  getJobById: (id: string) => Job | undefined;
  getFilteredJobs: (filter?: JobStatus | 'all') => Job[];
  getMyJobs: (techId: string) => Job[];
  getPoolJobs: () => Job[];
}

export const useJobStore = create<JobStore>((set, get) => ({
  jobs: DUMMY_JOBS,
  activeFilter: 'all',

  setFilter: (filter) => set({ activeFilter: filter }),

  addJob: (payload) =>
    set((state) => ({
      jobs: [
        ...state.jobs,
        {
          ...payload,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          notes: [],
          photos: [],
        },
      ],
    })),

  updateJobStatus: (id, status) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, status } : j)),
    })),

  addNote: (id, note) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, notes: [...j.notes, note] } : j
      ),
    })),

  addPhoto: (id, uri) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, photos: [...j.photos, uri] } : j
      ),
    })),

  getJobById: (id) => get().jobs.find((j) => j.id === id),

  getFilteredJobs: (filter) => {
    const f = filter ?? get().activeFilter;
    return f === 'all' ? get().jobs : get().jobs.filter((j) => j.status === f);
  },

  getMyJobs: (techId) => get().jobs.filter((j) => j.assignedTo === techId),

  getPoolJobs: () => get().jobs.filter((j) => j.assignedTo === null),
}));
