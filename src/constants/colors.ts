import { ServiceCallStatus } from '../types/serviceCall';

export const CallStatusColors: Record<ServiceCallStatus, string> = {
  pending:   '#F59E0B', // Amber — scheduled, not started
  active:    '#3B82F6', // Blue  — crew on site
  completed: '#22C55E', // Green — done
};

export const CallStatusLabelsHe: Record<ServiceCallStatus, string> = {
  pending:   'ממתין',
  active:    'בביצוע',
  completed: 'הושלם',
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
