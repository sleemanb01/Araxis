import { create } from 'zustand';
import { Job, JobStatus, CreateJobPayload } from '../types/job';
import * as jobService from '../services/jobService';

interface JobStore {
  jobs: Job[];
  loading: boolean;
  activeFilter: JobStatus | 'all';
  _unsub: (() => void) | null;

  init: () => Promise<void>;
  teardown: () => void;

  setFilter: (filter: JobStatus | 'all') => void;
  addJob: (payload: CreateJobPayload) => Promise<void>;
  updateJobStatus: (id: string, status: JobStatus) => Promise<void>;
  addNote: (id: string, note: string) => Promise<void>;
  addPhoto: (id: string, uri: string) => Promise<void>;

  getJobById: (id: string) => Job | undefined;
  getFilteredJobs: (filter?: JobStatus | 'all') => Job[];
  getMyJobs: (techId: string) => Job[];
  getPoolJobs: () => Job[];
}

export const useJobStore = create<JobStore>((set, get) => ({
  jobs: [],
  loading: true,
  activeFilter: 'all',
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

  setFilter: (filter) => set({ activeFilter: filter }),

  // Writes go to Firestore; the realtime listener updates local state.
  addJob: (payload) => jobService.createJob(payload),
  updateJobStatus: (id, status) => jobService.updateJobStatus(id, status),
  addNote: (id, note) => jobService.addJobNote(id, note),
  addPhoto: (id, uri) => jobService.addJobPhoto(id, uri),

  getJobById: (id) => get().jobs.find((j) => j.id === id),

  getFilteredJobs: (filter) => {
    const f = filter ?? get().activeFilter;
    return f === 'all' ? get().jobs : get().jobs.filter((j) => j.status === f);
  },

  getMyJobs: (techId) => get().jobs.filter((j) => j.assignedTo === techId),

  getPoolJobs: () => get().jobs.filter((j) => j.assignedTo === null),
}));
