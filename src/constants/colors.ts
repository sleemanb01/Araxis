import { JobStatus } from '../types/job';

export const StatusColors: Record<JobStatus, string> = {
  awaiting:    '#EF4444', // Red
  scheduled:   '#8B5CF6', // Purple — a date is set
  en_route:    '#F97316', // Orange
  in_progress: '#3B82F6', // Blue
  completed:   '#22C55E', // Green
};

export const StatusLabelsHe: Record<JobStatus, string> = {
  awaiting:    'ממתין לתיאום',
  scheduled:   'נקבע תאריך',
  en_route:    'בדרך',
  in_progress: 'בביצוע',
  completed:   'הושלם',
};

export const Colors = {
  background: '#F8F9FA',
  surface:    '#FFFFFF',
  border:     '#E5E7EB',
  textPrimary:   '#111827',
  textSecondary: '#6B7280',
  primary:    '#2563EB',
  danger:     '#EF4444',
  success:    '#22C55E',
  tabBar:     '#FFFFFF',
  tabBarActive:   '#2563EB',
  tabBarInactive: '#9CA3AF',
};
