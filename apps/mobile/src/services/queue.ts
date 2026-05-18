/**
 * Cola offline-first para fichajes y pings.
 * Cualquier acción que requiera servidor pasa primero por esta cola.
 */

import { Q } from '@nozbe/watermelondb';
import { database } from '../db';
import type { AttendanceCheckPayload } from '@siracontrol/shared';

export type QueueStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export async function queueAttendanceCheck(
  payload: AttendanceCheckPayload
): Promise<void> {
  await database.write(async () => {
    await database.get('attendance_queue').create((record: any) => {
      record.clientId = payload.clientId;
      record.payload = JSON.stringify(payload);
      record.status = 'pending';
      record.attempts = 0;
      record.createdAt = new Date();
    });
  });
}

export async function queuePing(payload: object): Promise<void> {
  await database.write(async () => {
    await database.get('ping_queue').create((record: any) => {
      record.payload = JSON.stringify(payload);
      record.status = 'pending';
      record.createdAt = new Date();
    });
  });
}

export async function getPendingCount(): Promise<number> {
  const collection = database.get('attendance_queue');
  return collection.query(Q.where('status', 'pending')).fetchCount();
}

export async function getPendingChecks() {
  const collection = database.get('attendance_queue');
  return collection
    .query(Q.where('status', 'pending'), Q.sortBy('created_at', Q.asc))
    .fetch();
}

export async function getPendingPings() {
  const collection = database.get('ping_queue');
  return collection
    .query(Q.where('status', 'pending'), Q.sortBy('created_at', Q.asc))
    .fetch();
}

export async function markCheckSynced(clientId: string): Promise<void> {
  const collection = database.get('attendance_queue');
  const records = await collection.query(Q.where('client_id', clientId)).fetch();
  await database.write(async () => {
    for (const record of records) {
      await record.update((r: any) => {
        r.status = 'synced';
        r.syncedAt = new Date();
      });
    }
  });
}

export async function markCheckFailed(
  clientId: string,
  errorMessage: string
): Promise<void> {
  const collection = database.get('attendance_queue');
  const records = await collection.query(Q.where('client_id', clientId)).fetch();
  await database.write(async () => {
    for (const record of records) {
      await record.update((r: any) => {
        r.attempts = ((r as any).attempts ?? 0) + 1;
        r.lastError = errorMessage;
        if (r.attempts >= 5) r.status = 'failed';
      });
    }
  });
}

export async function deletePing(id: string): Promise<void> {
  const collection = database.get('ping_queue');
  const record = await collection.find(id);
  await database.write(async () => {
    await record.markAsDeleted();
  });
}

export async function pruneOldRecords(): Promise<void> {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const collection = database.get('attendance_queue');
  const old = await collection
    .query(Q.where('status', 'synced'), Q.where('synced_at', Q.lt(sevenDaysAgo)))
    .fetch();
  await database.write(async () => {
    for (const record of old) await record.markAsDeleted();
  });
}
