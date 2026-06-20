import { create } from 'zustand';
import { Appointment, CreateAppointmentPayload } from '../types/appointment';
import * as appointmentService from '../services/appointmentService';

interface CalendarStore {
  appointments: Appointment[];
  loading: boolean;
  _unsub: (() => void) | null;

  init: () => Promise<void>;
  teardown: () => void;

  add: (payload: CreateAppointmentPayload) => Promise<void>;
  update: (id: string, patch: Partial<Appointment>) => Promise<void>;
  cancel: (id: string) => Promise<void>;

  getForDay: (dateISO: string) => Appointment[];
  getUpcoming: () => Appointment[];
}

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  appointments: [],
  loading: true,
  _unsub: null,

  init: async () => {
    if (get()._unsub) return;
    set({ loading: true });
    try {
      await appointmentService.seedAppointmentsIfEmpty();
    } catch (e) {
      console.warn('[appointments] seed skipped:', e);
    }
    const unsub = appointmentService.subscribeToAppointments(
      (appointments) => set({ appointments, loading: false }),
      () => set({ loading: false })
    );
    set({ _unsub: unsub });
  },

  teardown: () => {
    get()._unsub?.();
    set({ _unsub: null, appointments: [], loading: true });
  },

  // Writes go to Firestore; the realtime listener updates local state.
  add: (payload) => appointmentService.createAppointment(payload),
  update: (id, patch) => appointmentService.updateAppointment(id, patch),
  cancel: (id) => appointmentService.cancelAppointment(id),

  // Appointments arrive already sorted by startAt from the subscription.
  getForDay: (dateISO) =>
    get().appointments.filter((a) => sameDay(a.startAt, dateISO)),

  getUpcoming: () => {
    const now = Date.now();
    return get().appointments.filter(
      (a) => a.status === 'scheduled' && new Date(a.startAt).getTime() >= now
    );
  },
}));
