/**
 * General business expenses (collection: "expenses"). Financial managers only.
 * Modular RN Firebase API.
 */
import { collection, doc, addDoc, deleteDoc, onSnapshot } from '@react-native-firebase/firestore';
import { db } from './firebase';
import { assertWritable } from './demoMode';
import { Expense } from '../types/expense';

const EXPENSES = 'expenses';

/** Realtime expenses list, newest first. */
export function subscribeToExpenses(
  onChange: (expenses: Expense[]) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    collection(db, EXPENSES),
    (snap) => {
      const list = snap.docs.map((d) => {
        const e = d.data() as any;
        return { id: d.id, name: e.name ?? '', amount: e.amount ?? 0, createdAt: e.createdAt ?? '' } as Expense;
      });
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onChange(list);
    },
    (err) => {
      console.warn('[expenses] listener error:', err);
      onError?.(err as Error);
    }
  );
}

export async function addExpense(name: string, amount: number): Promise<void> {
  assertWritable();
  await addDoc(collection(db, EXPENSES), { name, amount, createdAt: new Date().toISOString() });
}

export async function deleteExpense(id: string): Promise<void> {
  assertWritable();
  await deleteDoc(doc(db, EXPENSES, id));
}
