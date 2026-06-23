import { create } from 'zustand';
import { Job, JobStatus, CreateJobPayload } from '../types/job';
import * as jobService from '../services/jobService';

interface JobStore {
  jobs: Job[];
  loading: boolean;
  _unsub: (() => void) | null;

  init: () => Promise<void>;
  teardown: () => void;

  addJob: (payload: CreateJobPayload) => Promise<void>;
  updateJobStatus: (id: string, status: JobStatus) => Promise<void>;
  completeJob: (id: string) => Promise<void>;
  setPaidAmount: (id: string, paidAmount: number, price: number | null) => Promise<void>;
  assignWithDate: (id: string, techId: string, dateISO: string) => Promise<void>;
  unassignJob: (id: string) => Promise<void>;
  setPrice: (id: string, price: number | null) => Promise<void>;
  confirmByCustomer: (id: string) => Promise<void>;
  addNote: (id: string, note: string) => Promise<void>;
  addPhoto: (id: string, uri: string) => Promise<void>;

  getJobById: (id: string) => Job | undefined;
  getPoolJobs: () => Job[];
  getMyRequests: (customerId: string) => Job[];
}

export const useJobStore = create<JobStore>((set, get) => ({
  jobs: [],
  loading: true,
  _unsub: null,

  init: async () => {
    if (get()._unsub) return; // already subscribed
    set({ loading: true });
    try {
      await jobService.seedJobsIfEmpty();
    } catch (e) {
      console.warn('[jobs] seed skipped:', e);
    }
    const unsub = jobService.subscribeToJobs(
      (jobs) => set({ jobs, loading: false }),
      () => set({ loading: false })
    );
    set({ _unsub: unsub });
  },

  teardown: () => {
    get()._unsub?.();
    set({ _unsub: null, jobs: [], loading: true });
  },

  // Writes go to Firestore; the realtime listener updates local state.
  addJob: (payload) => jobService.createJob(payload),
  updateJobStatus: (id, status) => jobService.updateJobStatus(id, status),
  completeJob: (id) => jobService.completeJob(id),
  setPaidAmount: (id, paidAmount, price) => jobService.setPaidAmount(id, paidAmount, price),
  assignWithDate: (id, techId, dateISO) => jobService.assignWithDate(id, techId, dateISO),
  unassignJob: (id) => jobService.unassignJob(id),
  setPrice: (id, price) => jobService.setJobPrice(id, price),
  confirmByCustomer: (id) => jobService.confirmJobByCustomer(id),
  addNote: (id, note) => jobService.addJobNote(id, note),
  addPhoto: (id, uri) => jobService.addJobPhoto(id, uri),

  getJobById: (id) => get().jobs.find((j) => j.id === id),
  getPoolJobs: () => get().jobs.filter((j) => j.assignedTo === null),
  getMyRequests: (customerId) => get().jobs.filter((j) => j.customerId === customerId),
}));
