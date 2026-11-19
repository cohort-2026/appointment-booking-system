import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';

// In-memory PostgreSQL only: never reads DATABASE_URL or touches Neon.
const migrations = new URL('../prisma/migrations/', import.meta.url);
const names = (await readdir(migrations)).filter(n => /^\d/.test(n)).sort();
const foundation = names.filter(n => n.startsWith('20261118'));
const baseline = names.filter(n => !foundation.includes(n));
async function apply(db, list) {
  for (const name of list) await db.exec(await readFile(new URL(`${name}/migration.sql`, migrations), 'utf8'));
}
async function seed(db, invalidDuration = false) {
  await db.exec(`
    INSERT INTO "User" (id,email,"passwordHash","firstName","updatedAt") VALUES
      ('customer','customer@test.invalid','unused','Customer',now()),
      ('provider-user','provider@test.invalid','unused','Provider',now()),
      ('owner','owner@test.invalid','unused','Owner',now());
    INSERT INTO "SoleProvider" (id,"userId","displayName","updatedAt") VALUES ('sole','provider-user','Sole',now());
    INSERT INTO "Business" (id,"ownerUserId",name,"updatedAt") VALUES ('business','owner','Business',now());
    INSERT INTO "Service" (id,"soleProviderId",name,"durationMinutes","expectedPrice","updatedAt") VALUES
      ('priced','sole','Known price',${invalidDuration ? 0 : 120},123.45,now()),
      ('unknown','sole','Unknown price',45,NULL,now());
    INSERT INTO "Appointment" (id,"customerId","serviceId","soleProviderId","scheduledStart",status,"noShow","updatedAt") VALUES
      ('a','customer','priced','sole','2026-11-19 07:00','CONFIRMED',false,now()),
      ('b','customer','unknown','sole','2026-11-20 07:00','CANCELLED',false,now()),
      ('legacy-no-show','customer','unknown','sole','2026-11-01 07:00','CONFIRMED',true,now());
  `);
}

test('entire migration history builds a fresh database matching the Prisma model', async () => {
  const db = new PGlite();
  const expected = new PGlite();
  try {
    await apply(db, names);
    const require = createRequire(import.meta.url);
    const sql = execFileSync(process.execPath, [require.resolve('prisma/build/index.js'),
      'migrate', 'diff', '--from-empty', '--to-schema', 'prisma/schema.prisma', '--script'],
      { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
    assert.ok(sql.includes('CREATE TABLE'), 'Prisma must return actual expected DDL');
    await expected.exec(sql);
    // Existing migration 20261105130000 deliberately requires this array;
    // Prisma's generated DDL permits NULL arrays. Preserve the stricter legacy
    // constraint and account for exactly this known baseline difference.
    await expected.exec('ALTER TABLE "StaffInvitation" ALTER COLUMN "serviceIds" SET NOT NULL');
    const columns = `SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,
      character_maximum_length,numeric_precision,numeric_scale
      FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`;
    // Compare by name because ALTER TABLE expansion appends columns in a different order.
    const sort = rows => rows.sort((a,b) => `${a.table_name}.${a.column_name}`.localeCompare(`${b.table_name}.${b.column_name}`));
    assert.deepEqual(sort((await db.query(columns)).rows), sort((await expected.query(columns)).rows));
    const indexes = `SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY indexname`;
    assert.deepEqual((await db.query(indexes)).rows, (await expected.query(indexes)).rows);
    const keys = `SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint
      WHERE connamespace='public'::regnamespace AND contype IN ('f','p','u') ORDER BY conname`;
    assert.deepEqual((await db.query(keys)).rows, (await expected.query(keys)).rows);
  } finally { await db.close(); await expected.close(); }
});

test('populated upgrade preserves records, backfills snapshots, and leaves unmanaged data intact', async () => {
  const db = new PGlite();
  try {
    await apply(db, baseline);
    await seed(db);
    await db.exec(`CREATE TABLE playing_with_neon (id serial PRIMARY KEY, name text NOT NULL, value real);
      INSERT INTO playing_with_neon(name) VALUES ('keep me');`);
    await apply(db, foundation);
    const { rows } = await db.query(`SELECT id,"scheduledEnd"::text,"priceAtBooking"::text,
      "bufferAfterMinutesAtBooking","cancelledAt","cancelledBy","rescheduleCount","manageTokenHash","reminderSentAt"
      FROM "Appointment" ORDER BY id`);
    assert.equal(rows.length, 3);
    assert.equal(rows[0].scheduledEnd, '2026-11-19 09:00:00');
    assert.equal(rows[0].priceAtBooking, '123.45');
    assert.equal(rows[1].priceAtBooking, null);
    assert.equal(rows[1].cancelledAt, null); // Do not invent past actor/time metadata.
    assert.equal(rows[1].cancelledBy, null);
    assert.ok(rows.every(a => a.bufferAfterMinutesAtBooking === 0 && a.rescheduleCount === 0 && a.manageTokenHash === null && a.reminderSentAt === null));
    for (const table of ['Business','SoleProvider']) {
      const { rows: [provider] } = await db.query(`SELECT "timeZone","cancellationCutoffHours" FROM "${table}"`);
      assert.deepEqual(provider, { timeZone: 'Africa/Johannesburg', cancellationCutoffHours: 24 });
    }
    assert.equal((await db.query(`SELECT name FROM playing_with_neon`)).rows[0].name, 'keep me');
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM "AppointmentEvent"`)).rows[0].n, 0);
    assert.equal((await db.query(`SELECT "noShow" FROM "Appointment" WHERE id='legacy-no-show'`)).rows[0].noShow, true);
    await db.exec(`UPDATE "Service" SET "durationMinutes"=30,"expectedPrice"=999,"bufferAfterMinutes"=20 WHERE id='priced'`);
    assert.equal((await db.query(`SELECT "scheduledEnd"::text AS ending,"priceAtBooking"::text AS price FROM "Appointment" WHERE id='a'`)).rows[0].ending, '2026-11-19 09:00:00');
    assert.equal((await db.query(`SELECT "priceAtBooking"::text AS price FROM "Appointment" WHERE id='a'`)).rows[0].price, '123.45');
    // Old application writes remain possible during expansion.
    await db.exec(`INSERT INTO "Appointment" (id,"customerId","serviceId","scheduledStart","updatedAt") VALUES ('old-writer','customer','priced','2026-11-25 07:00',now())`);
    assert.equal((await db.query(`SELECT "scheduledEnd" FROM "Appointment" WHERE id='old-writer'`)).rows[0].scheduledEnd, null);
    await assert.rejects(db.exec(`UPDATE "Appointment" SET "customerNotes"=repeat('x',501) WHERE id='a'`));
    await assert.rejects(db.exec(`UPDATE "Service" SET "bufferAfterMinutes"=-1 WHERE id='priced'`));
    await assert.rejects(db.exec(`UPDATE "Business" SET "cancellationCutoffHours"=-1`));
    await assert.rejects(db.exec(`UPDATE "Appointment" SET "scheduledEnd"="scheduledStart" WHERE id='a'`));
    // Event, appointment change and outbox can roll back as one transaction.
    await db.exec(`BEGIN;
      UPDATE "Appointment" SET status='CANCELLED' WHERE id='a';
      INSERT INTO "AppointmentEvent" (id,"appointmentId",type,actor,"actorUserId","oldStatus","newStatus","newScheduledStart","newScheduledEnd")
        VALUES ('evt','a','CANCELLED','CUSTOMER','customer','CONFIRMED','CANCELLED','2026-11-19 07:00','2026-11-19 09:00');
      ROLLBACK;`);
    assert.equal((await db.query(`SELECT status FROM "Appointment" WHERE id='a'`)).rows[0].status, 'CONFIRMED');
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM "AppointmentEvent"`)).rows[0].n, 0);
    await db.exec(`INSERT INTO "OutboxMessage" (id,"appointmentId",kind,recipient,"deduplicationKey","scheduledStart","updatedAt")
      VALUES ('msg','a','REMINDER','customer@test.invalid','reminder:a:2026-11-19:customer','2026-11-19 07:00',now())`);
    await assert.rejects(db.exec(`INSERT INTO "OutboxMessage" (id,"appointmentId",kind,recipient,"deduplicationKey","scheduledStart","updatedAt")
      VALUES ('duplicate','a','REMINDER','customer@test.invalid','reminder:a:2026-11-19:customer','2026-11-19 07:00',now())`));
    await db.exec(`UPDATE "Appointment" SET "manageTokenHash"=repeat('a',64) WHERE id='a'`);
    await assert.rejects(db.exec(`UPDATE "Appointment" SET "manageTokenHash"=repeat('a',64) WHERE id='b'`));
  } finally { await db.close(); }
});

test('invalid legacy duration stops the upgrade atomically without inventing an end', async () => {
  const db = new PGlite();
  try {
    await apply(db, baseline);
    await seed(db, true);
    await assert.rejects(apply(db, [foundation[0]]), /repair non-positive service durations/);
    await db.exec('ROLLBACK');
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM "Appointment"`)).rows[0].n, 3);
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_name='Appointment' AND column_name='scheduledEnd'`)).rows[0].n, 0);
  } finally { await db.close(); }
});
