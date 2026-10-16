import pool from '@/lib/db';

let schemaReady: Promise<void> | null = null;

export function ensureContractCollaboratorSchema() {
  if (!schemaReady) {
    schemaReady = pool.query(`
      ALTER TABLE contracts
        ADD COLUMN IF NOT EXISTS collaborator_id integer,
        ADD COLUMN IF NOT EXISTS collaborator_name varchar(255),
        ADD COLUMN IF NOT EXISTS collaborator_phone varchar(50)
    `).then(() => undefined).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }

  return schemaReady;
}
