import 'dotenv/config';
import { Client } from 'pg';

type CompetitionMode = 'KEYS' | 'ABSOLUTE_GP' | string;

type FightRow = {
  id: number;
  competitionId: number;
  competitionName: string;
  mode: CompetitionMode;
  categoryId: number | null;
  keyGroupId: number | null;
  roundNumber: number;
  orderIndex: number;
  athleteAId: number | null;
  athleteBId: number | null;
  winnerAthleteId: number | null;
  loserAthleteId: number | null;
  nextFightId: number | null;
  nextFightSlot: 'A' | 'B' | null;
  createdAt: Date;
  updatedAt: Date;
  status: string;
};

type RepairPlan = {
  fightId: number;
  athleteAId: number;
  athleteBId: number;
  source: 'KEYS_LEGACY' | 'ABSOLUTE_GP_LEGACY';
  confidence: 'high';
  reason: string;
};

type SkipItem = {
  scope: string;
  mode: CompetitionMode;
  competitionId: number;
  fightIds: number[];
  reason: string;
};

type Options = {
  apply: boolean;
  competitionId?: number;
  fightId?: number;
};

function parseArgs(argv: string[]): Options {
  const options: Options = {
    apply: false,
  };

  for (const arg of argv) {
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }

    if (arg.startsWith('--competition=')) {
      options.competitionId = Number(arg.split('=')[1]);
      continue;
    }

    if (arg.startsWith('--fight=')) {
      options.fightId = Number(arg.split('=')[1]);
    }
  }

  if (options.competitionId !== undefined && !Number.isInteger(options.competitionId)) {
    throw new Error(`Invalid competition id: ${options.competitionId}`);
  }

  if (options.fightId !== undefined && !Number.isInteger(options.fightId)) {
    throw new Error(`Invalid fight id: ${options.fightId}`);
  }

  return options;
}

function groupBy<T, K>(items: T[], getKey: (item: T) => K): Map<K, T[]> {
  const grouped = new Map<K, T[]>();

  for (const item of items) {
    const key = getKey(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return grouped;
}

function sortFights(fights: FightRow[]): FightRow[] {
  return fights
    .slice()
    .sort(
      (left, right) =>
        left.orderIndex - right.orderIndex ||
        left.roundNumber - right.roundNumber ||
        left.id - right.id,
    );
}

function legacyKeysPairs(memberIds: number[], fightCount: number) {
  if (memberIds.length === 2 && fightCount === 1) {
    return [[memberIds[0], memberIds[1]]];
  }

  if (memberIds.length === 3 && fightCount === 3) {
    return [
      [memberIds[0], memberIds[1]],
      [memberIds[0], memberIds[2]],
      [memberIds[1], memberIds[2]],
    ];
  }

  if (memberIds.length === 4 && fightCount === 2) {
    return [
      [memberIds[0], memberIds[3]],
      [memberIds[1], memberIds[2]],
    ];
  }

  return null;
}

function legacyAbsoluteGpPairs(athleteIds: number[], fightCount: number) {
  if (athleteIds.length === 2 && fightCount === 3) {
    return [
      [athleteIds[0], athleteIds[1]],
      [athleteIds[0], athleteIds[1]],
      [athleteIds[0], athleteIds[1]],
    ];
  }

  if (athleteIds.length === 3 && fightCount === 3) {
    return [
      [athleteIds[0], athleteIds[1]],
      [athleteIds[0], athleteIds[2]],
      [athleteIds[1], athleteIds[2]],
    ];
  }

  if (athleteIds.length >= 4 && fightCount === Math.floor(athleteIds.length / 2)) {
    const pairs: Array<[number, number]> = [];

    for (let index = 0; index < athleteIds.length - 1; index += 2) {
      pairs.push([athleteIds[index], athleteIds[index + 1]]);
    }

    return pairs;
  }

  return null;
}

function isWinnerCompatible(
  fight: FightRow,
  athleteAId: number,
  athleteBId: number,
) {
  const allowed = new Set([athleteAId, athleteBId]);

  if (fight.winnerAthleteId !== null && !allowed.has(fight.winnerAthleteId)) {
    return false;
  }

  if (fight.loserAthleteId !== null && !allowed.has(fight.loserAthleteId)) {
    return false;
  }

  return true;
}

async function loadAffectedFights(client: Client, options: Options) {
  const params: Array<number> = [];
  const where: string[] = ['(f.athlete_a_id IS NULL OR f.athlete_b_id IS NULL)'];

  if (options.competitionId !== undefined) {
    params.push(options.competitionId);
    where.push(`f.competition_id = $${params.length}`);
  }

  if (options.fightId !== undefined) {
    params.push(options.fightId);
    where.push(`f.id = $${params.length}`);
  }

  const result = await client.query<FightRow>(
    `
      SELECT
        f.id AS "id",
        f.competition_id AS "competitionId",
        c.name AS "competitionName",
        c.mode AS "mode",
        f.category_id AS "categoryId",
        f.key_group_id AS "keyGroupId",
        f.round_number AS "roundNumber",
        f.order_index AS "orderIndex",
        f.athlete_a_id AS "athleteAId",
        f.athlete_b_id AS "athleteBId",
        f.winner_athlete_id AS "winnerAthleteId",
        f.loser_athlete_id AS "loserAthleteId",
        f.next_fight_id AS "nextFightId",
        f.next_fight_slot AS "nextFightSlot",
        f.created_at AS "createdAt",
        f.updated_at AS "updatedAt",
        f.status AS "status"
      FROM fights f
      INNER JOIN competitions c
        ON c.id = f.competition_id
      WHERE ${where.join(' AND ')}
      ORDER BY f.competition_id, f.key_group_id NULLS LAST, f.category_id NULLS LAST, f.order_index, f.id
    `,
    params,
  );

  return result.rows;
}

async function buildKeysPlans(client: Client, fights: FightRow[]) {
  const plans: RepairPlan[] = [];
  const skipped: SkipItem[] = [];
  const keysFights = fights.filter((fight) => fight.mode === 'KEYS');
  const keyGroupIds = Array.from(
    new Set(
      keysFights
        .map((fight) => fight.keyGroupId)
        .filter((keyGroupId): keyGroupId is number => keyGroupId !== null),
    ),
  );

  if (!keyGroupIds.length) {
    return { plans, skipped };
  }

  const result = await client.query<{
    keyGroupId: number;
    athleteId: number;
  }>(
    `
      SELECT
        key_group_id AS "keyGroupId",
        athlete_id AS "athleteId"
      FROM key_group_members
      WHERE key_group_id = ANY($1::int[])
      ORDER BY key_group_id, created_at, id
    `,
    [keyGroupIds],
  );

  const memberIdsByGroupId = new Map<number, number[]>();

  for (const row of result.rows) {
    memberIdsByGroupId.set(row.keyGroupId, [
      ...(memberIdsByGroupId.get(row.keyGroupId) ?? []),
      row.athleteId,
    ]);
  }

  const fightsByGroup = groupBy(
    keysFights.filter(
      (fight): fight is FightRow & { keyGroupId: number } => fight.keyGroupId !== null,
    ),
    (fight) => fight.keyGroupId,
  );

  for (const [keyGroupId, groupFights] of fightsByGroup.entries()) {
    const memberIds = memberIdsByGroupId.get(keyGroupId) ?? [];
    const sortedFights = sortFights(groupFights);
    const pairs = legacyKeysPairs(memberIds, sortedFights.length);

    if (!pairs) {
      skipped.push({
        scope: `key_group:${keyGroupId}`,
        mode: 'KEYS',
        competitionId: groupFights[0].competitionId,
        fightIds: sortedFights.map((fight) => fight.id),
        reason: `unsupported legacy shape: members=${memberIds.length}, fights=${sortedFights.length}`,
      });
      continue;
    }

    const inconsistentFight = sortedFights.find((fight, index) => {
      const pair = pairs[index];
      return !isWinnerCompatible(fight, pair[0], pair[1]);
    });

    if (inconsistentFight) {
      skipped.push({
        scope: `key_group:${keyGroupId}`,
        mode: 'KEYS',
        competitionId: inconsistentFight.competitionId,
        fightIds: sortedFights.map((fight) => fight.id),
        reason: `winner/loser data is incompatible with reconstructed pair for fight ${inconsistentFight.id}`,
      });
      continue;
    }

    sortedFights.forEach((fight, index) => {
      const pair = pairs[index];

      if (fight.athleteAId === pair[0] && fight.athleteBId === pair[1]) {
        return;
      }

      plans.push({
        fightId: fight.id,
        athleteAId: pair[0],
        athleteBId: pair[1],
        source: 'KEYS_LEGACY',
        confidence: 'high',
        reason: `reconstructed from key_group_members using legacy KEYS generation for group ${keyGroupId}`,
      });
    });
  }

  return { plans, skipped };
}

async function buildAbsoluteGpPlans(client: Client, fights: FightRow[]) {
  const plans: RepairPlan[] = [];
  const skipped: SkipItem[] = [];
  const absoluteGpFights = fights.filter((fight) => fight.mode === 'ABSOLUTE_GP');
  const categoryIds = Array.from(
    new Set(
      absoluteGpFights
        .map((fight) => fight.categoryId)
        .filter((categoryId): categoryId is number => categoryId !== null),
    ),
  );

  const categoryAthletesByCategoryId = new Map<number, number[]>();

  if (categoryIds.length) {
    const categoryAthletes = await client.query<{
      categoryId: number;
      athleteId: number;
    }>(
      `
        SELECT
          ca.category_id AS "categoryId",
          ca.athlete_id AS "athleteId"
        FROM category_athletes ca
        INNER JOIN athletes a
          ON a.id = ca.athlete_id
        WHERE ca.category_id = ANY($1::int[])
        ORDER BY ca.category_id, a.full_name, a.id
      `,
      [categoryIds],
    );

    for (const row of categoryAthletes.rows) {
      categoryAthletesByCategoryId.set(row.categoryId, [
        ...(categoryAthletesByCategoryId.get(row.categoryId) ?? []),
        row.athleteId,
      ]);
    }
  }

  const grouped = groupBy(
    absoluteGpFights,
    (fight) => `${fight.competitionId}:${fight.categoryId ?? 'null'}`,
  );

  for (const [scopeKey, scopedFights] of grouped.entries()) {
    const sortedFights = sortFights(scopedFights);
    const sample = sortedFights[0];

    if (sample.categoryId === null) {
      skipped.push({
        scope: scopeKey,
        mode: 'ABSOLUTE_GP',
        competitionId: sample.competitionId,
        fightIds: sortedFights.map((fight) => fight.id),
        reason:
          'category_id is null; there is no deterministic athlete source to rebuild this ABSOLUTE_GP batch safely',
      });
      continue;
    }

    const athleteIds = categoryAthletesByCategoryId.get(sample.categoryId) ?? [];
    const pairs = legacyAbsoluteGpPairs(athleteIds, sortedFights.length);

    if (!pairs) {
      skipped.push({
        scope: scopeKey,
        mode: 'ABSOLUTE_GP',
        competitionId: sample.competitionId,
        fightIds: sortedFights.map((fight) => fight.id),
        reason: `unsupported legacy shape: categoryAthletes=${athleteIds.length}, fights=${sortedFights.length}`,
      });
      continue;
    }

    const inconsistentFight = sortedFights.find((fight, index) => {
      const pair = pairs[index];
      return !isWinnerCompatible(fight, pair[0], pair[1]);
    });

    if (inconsistentFight) {
      skipped.push({
        scope: scopeKey,
        mode: 'ABSOLUTE_GP',
        competitionId: inconsistentFight.competitionId,
        fightIds: sortedFights.map((fight) => fight.id),
        reason: `winner/loser data is incompatible with reconstructed pair for fight ${inconsistentFight.id}`,
      });
      continue;
    }

    sortedFights.forEach((fight, index) => {
      const pair = pairs[index];

      if (fight.athleteAId === pair[0] && fight.athleteBId === pair[1]) {
        return;
      }

      plans.push({
        fightId: fight.id,
        athleteAId: pair[0],
        athleteBId: pair[1],
        source: 'ABSOLUTE_GP_LEGACY',
        confidence: 'high',
        reason: `reconstructed from category_athletes using legacy ABSOLUTE_GP generation for category ${sample.categoryId}`,
      });
    });
  }

  return { plans, skipped };
}

async function applyPlans(client: Client, plans: RepairPlan[]) {
  await client.query('BEGIN');

  try {
    for (const plan of plans) {
      await client.query(
        `
          UPDATE fights
          SET athlete_a_id = $1,
              athlete_b_id = $2,
              updated_at = NOW()
          WHERE id = $3
            AND (athlete_a_id IS NULL OR athlete_b_id IS NULL)
        `,
        [plan.athleteAId, plan.athleteBId, plan.fightId],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

function printHistoryNotes() {
  console.log('Historical notes');
  console.log('- FightEntity accepted only non-null athlete ids before commit 859fb98.');
  console.log('- Legacy KEYS generation for 4 athletes created only 2 fights: seed1 vs seed4, seed2 vs seed3.');
  console.log('- Legacy ABSOLUTE_GP generation used:');
  console.log('  2 athletes -> best of three (3 fights with the same pair)');
  console.log('  3 athletes -> round robin (3 fights)');
  console.log('  4+ athletes -> initial pairing only, in sorted athlete order');
  console.log('');
}

function printSummary(
  fights: FightRow[],
  plans: RepairPlan[],
  skipped: SkipItem[],
  options: Options,
) {
  const affectedCompetitions = Array.from(
    new Set(fights.map((fight) => `${fight.competitionId}:${fight.competitionName}:${fight.mode}`)),
  );

  console.log('Diagnosis');
  console.log(`- affected fights loaded: ${fights.length}`);
  console.log(`- competitions affected in selection: ${affectedCompetitions.length}`);
  console.log(`- repair plans built: ${plans.length}`);
  console.log(`- skipped scopes: ${skipped.length}`);
  console.log(`- mode: ${options.apply ? 'apply' : 'dry-run'}`);
  console.log('');

  if (plans.length) {
    console.log('Planned updates');

    for (const plan of plans.slice(0, 20)) {
      console.log(
        `- fight ${plan.fightId}: athlete_a_id=${plan.athleteAId}, athlete_b_id=${plan.athleteBId} [${plan.source}]`,
      );
    }

    if (plans.length > 20) {
      console.log(`- ... ${plans.length - 20} more planned updates omitted`);
    }

    console.log('');
  }

  if (skipped.length) {
    console.log('Skipped scopes');

    for (const item of skipped) {
      console.log(
        `- ${item.scope} (competition ${item.competitionId}, fights ${item.fightIds.join(', ')}): ${item.reason}`,
      );
    }

    console.log('');
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: false,
  });

  await client.connect();

  try {
    const fights = await loadAffectedFights(client, options);
    const keysResult = await buildKeysPlans(client, fights);
    const absoluteGpResult = await buildAbsoluteGpPlans(client, fights);
    const plans = [...keysResult.plans, ...absoluteGpResult.plans].sort(
      (left, right) => left.fightId - right.fightId,
    );
    const skipped = [...keysResult.skipped, ...absoluteGpResult.skipped];

    printHistoryNotes();
    printSummary(fights, plans, skipped, options);

    if (!options.apply) {
      console.log('No changes applied. Re-run with --apply to persist the repair.');
      return;
    }

    await applyPlans(client, plans);
    console.log(`Applied ${plans.length} updates successfully.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
