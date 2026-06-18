/**
 * Job service — placeholder implementations.
 * Replace each function body with real API calls (Firebase / Supabase / REST)
 * when the backend is ready. Signatures and return types stay the same.
 */

import { Job, CreateJobPayload, UpdateJobStatusPayload } from '../types/job';

export async function fetchJobs(): Promise<Job[]> {
  // TODO: GET /api/jobs  or  firestore.collection('jobs').get()
  throw new Error('fetchJobs: not yet connected to backend');
}

export async function fetchJobById(id: string): Promise<Job> {
  // TODO: GET /api/jobs/:id
  throw new Error(`fetchJobById(${id}): not yet connected to backend`);
}

export async function createJob(payload: CreateJobPayload): Promise<Job> {
  // TODO: POST /api/jobs
  throw new Error('createJob: not yet connected to backend');
}

export async function updateJobStatus(payload: UpdateJobStatusPayload): Promise<Job> {
  // TODO: PATCH /api/jobs/:id  { status }
  throw new Error('updateJobStatus: not yet connected to backend');
}

export async function addJobNote(id: string, note: string): Promise<void> {
  // TODO: POST /api/jobs/:id/notes
  throw new Error('addJobNote: not yet connected to backend');
}

export async function uploadJobPhoto(id: string, localUri: string): Promise<string> {
  // TODO: upload to Firebase Storage / Supabase Storage, return remote URL
  throw new Error('uploadJobPhoto: not yet connected to backend');
}
