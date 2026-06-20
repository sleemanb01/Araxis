export interface Review {
  id: string;
  customerId: string;   // uid of the reviewer
  customerName: string; // denormalized for display
  rating: number;       // 1-5
  comment: string;
  createdAt: string;    // ISO
}

export type CreateReviewPayload = Omit<Review, 'id' | 'createdAt'>;

export interface RatingSummary {
  avg: number;   // 0 when no reviews
  count: number;
}
