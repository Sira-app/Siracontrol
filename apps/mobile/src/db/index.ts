/**
 * Base de datos local SQLite vía WatermelonDB.
 * Permite que la app funcione 100% offline.
 *
 * Modelos:
 * - AttendanceQueue: cola de fichajes pendientes de sincronizar
 * - PingQueue: cola de ubicaciones GPS pendientes
 * - LocalProfile: caché del perfil del usuario
 * - LocalLocations: caché de ubicaciones de trabajo
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';
import { appSchema, tableSchema } from '@nozbe/watermelondb';

const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'attendance_queue',
      columns: [
        { name: 'client_id', type: 'string', isIndexed: true },
        { name: 'payload', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'attempts', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'ping_queue',
      columns: [
        { name: 'payload', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'local_profile',
      columns: [
        { name: 'profile_id', type: 'string' },
        { name: 'data', type: 'string' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'local_work_locations',
      columns: [
        { name: 'location_id', type: 'string', isIndexed: true },
        { name: 'data', type: 'string' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});

export class AttendanceQueueRecord extends Model {
  static table = 'attendance_queue';

  @field('client_id') clientId!: string;
  @field('payload') payload!: string;
  @field('status') status!: string;
  @field('attempts') attempts!: number;
  @field('last_error') lastError?: string;
  @date('created_at') createdAt!: Date;
  @date('synced_at') syncedAt?: Date;
}

export class PingQueueRecord extends Model {
  static table = 'ping_queue';

  @field('payload') payload!: string;
  @field('status') status!: string;
  @date('created_at') createdAt!: Date;
}

export class LocalProfileRecord extends Model {
  static table = 'local_profile';

  @field('profile_id') profileId!: string;
  @field('data') data!: string;
  @date('updated_at') updatedAt!: Date;
}

export class LocalWorkLocationRecord extends Model {
  static table = 'local_work_locations';

  @field('location_id') locationId!: string;
  @field('data') data!: string;
  @date('updated_at') updatedAt!: Date;
}

const adapter = new SQLiteAdapter({
  schema,
  jsi: true,
  onSetUpError: (error) => {
    console.error('Error inicializando base de datos local:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    AttendanceQueueRecord,
    PingQueueRecord,
    LocalProfileRecord,
    LocalWorkLocationRecord,
  ],
});
