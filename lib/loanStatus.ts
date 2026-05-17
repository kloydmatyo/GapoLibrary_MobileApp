import Colors from '@/constants/colors';

export type LoanDisplayStatus =
  | 'overdue'
  | 'active'
  | 'pending_pickup'
  | 'returned'
  | 'expired';

export function normalizeLoanStatus(
  status: string,
  dueDate?: string,
): LoanDisplayStatus {
  if (status === 'returned') return 'returned';
  if (status === 'expired') return 'expired';
  if (status === 'pending_pickup') return 'pending_pickup';
  if (status === 'overdue') return 'overdue';
  if (status === 'active' && dueDate && new Date(dueDate) < new Date()) {
    return 'overdue';
  }
  if (status === 'active') return 'active';
  return 'active';
}

export function statusBorderColor(status: LoanDisplayStatus): string {
  switch (status) {
    case 'overdue':
      return Colors.error;
    case 'active':
    case 'pending_pickup':
      return Colors.accent;
    case 'returned':
    case 'expired':
      return Colors.statusReturned;
    default:
      return Colors.border;
  }
}
