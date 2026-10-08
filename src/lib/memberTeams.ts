import type { PoolClient } from 'pg';

export function getSelectedTeamNames(teamNames: unknown, legacyTeamName?: unknown): string[] {
  const submitted = Array.isArray(teamNames)
    ? teamNames
    : typeof legacyTeamName === 'string'
      ? [legacyTeamName]
      : [];

  return [...new Set(
    submitted
      .filter((name): name is string => typeof name === 'string')
      .map((name) => name.trim())
      .filter(Boolean)
  )];
}

export async function resolveTeamIds(client: PoolClient, teamNames: string[]): Promise<number[] | null> {
  if (!teamNames.length) return [];

  const result = await client.query('SELECT id, name FROM teams WHERE name = ANY($1::varchar[])', [teamNames]);
  const idByName = new Map(result.rows.map((team: { id: number; name: string }) => [team.name, team.id]));
  const ids = teamNames.map((name) => idByName.get(name));

  return ids.every((id): id is number => typeof id === 'number') ? ids : null;
}

export async function replaceUserTeams(client: PoolClient, userId: number, teamIds: number[]): Promise<void> {
  await client.query('DELETE FROM user_teams WHERE user_id = $1', [userId]);
  for (const teamId of teamIds) {
    await client.query(
      'INSERT INTO user_teams (user_id, team_id) VALUES ($1, $2) ON CONFLICT (user_id, team_id) DO NOTHING',
      [userId, teamId]
    );
  }
}
