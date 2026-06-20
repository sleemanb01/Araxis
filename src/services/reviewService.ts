/**
 * Reviews — stored per provider at  users/{providerId}/reviews/{reviewId}.
 * The average rating is computed client-side from the review list, so no
 * cross-user writes to the provider doc (and no Cloud Function) are needed.
 */

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
} from '@react-native-firebase/firestore';
import { db } from './firebase';
import { Review, CreateReviewPayload, RatingSummary } from '../types/review';

function reviewsCol(providerId: string) {
  return collection(db, 'users', providerId, 'reviews');
}

function toReview(snap: { id: string; data: () => any }): Review {
  const d = snap.data();
  return {
    id: snap.id,
    customerId: d.customerId ?? '',
    customerName: d.customerName ?? 'לקוח',
    rating: typeof d.rating === 'number' ? d.rating : 0,
    comment: d.comment ?? '',
    createdAt: d.createdAt ?? new Date().toISOString(),
  };
}

export function subscribeToReviews(
  providerId: string,
  onChange: (reviews: Review[]) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    query(reviewsCol(providerId), orderBy('createdAt', 'desc')),
    (snap) => onChange(snap.docs.map(toReview)),
    (err) => {
      console.warn('[reviews] listener error:', err);
      onError?.(err as Error);
    }
  );
}

export async function addReview(
  providerId: string,
  payload: CreateReviewPayload
): Promise<void> {
  await addDoc(reviewsCol(providerId), {
    ...payload,
    createdAt: new Date().toISOString(),
  });
}

export function summarize(reviews: Review[]): RatingSummary {
  if (reviews.length === 0) return { avg: 0, count: 0 };
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return { avg: sum / reviews.length, count: reviews.length };
}
