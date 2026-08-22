import 'dotenv/config';
import { Client } from 'pg';

type FightCandidateRow = {
  id: number;
  competitionId: number;
  categoryId: number | null;
  keyGroupId: number | null;
  athleteAId: number | null;
  athleteBId: number | null;
  winnerAthleteId: number;
  loserAthleteId: number | null;
  status: string;
};

type RepairPlan = {
  fightId: number;
  winnerAthleteId: number;
  loserAthleteId: number;
  reason: string;
};

type SkipItem = {
  fightId: number;
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

async function loadCandidates(client: Client, options: Options) {
  const params: number[] = [];
  const where = ['winner_athlete_id IS NOT NULL'];

  if (options.competitionId !== undefined) {
    params.push(options.competitionId);
    where.push(`competition_id = $${params.length}`);
  }

  if (options.fightId !== undefined) {
    params.push(options.fightId);
    where.push(`id = $${params.length}`);
  }

  const result = await client.query<FightCandidateRow>(
    `
      SELECT
        id AS "id",
        competition_id AS "competitionId",
        category_id AS "categoryId",
        key_group_id AS "keyGroupId",
        athlete_a_id AS "athleteAId",
        athlete_b_id AS "athleteBId",
        winner_athlete_id AS "winnerAthleteId",
        loser_athlete_id AS "loserAthleteId",
        status AS "status"
      FROM fights
      WHERE ${where.join(' AND ')}
      ORDER BY competition_id, id
    `,
    params,
  );

  return result.rows;
}

function buildPlans(fights: FightCandidateRow[]) {
  const plans: RepairPlan[] = [];
  const skipped: SkipItem[] = [];

  for (const fight of fights) {
    if (fight.loserAthleteId !== null) {
      continue;
    }

    if (fight.athleteAId === null || fight.athleteBId === null) {
      skipped.push({
        fightId: fight.id,
        reason: 'athlete_a_id or athlete_b_id is null',
      });
      continue;
    }

    if (fight.athleteAId === fight.athleteBId) {
      skipped.push({
        fightId: fight.id,
        reason: 'athlete_a_id and athlete_b_id are identical',
      });
      continue;
    }

    if (fight.winnerAthleteId === fight.athleteAId) {
      plans.push({
        fightId: fight.id,
        winnerAthleteId: fight.winnerAthleteId,
        loserAthleteId: fight.athleteBId,
        reason: 'winner matches athlete_a_id; loser inferred as athlete_b_id',
      });
      continue;
    }

    if (fight.winnerAthleteId === fight.athleteBId) {
      plans.push({
        fightId: fight.id,
        winnerAthleteId: fight.winnerAthleteId,
        loserAthleteId: fight.athleteAId,
        reason: 'winner matches athlete_b_id; loser inferred as athlete_a_id',
      });
      continue;
    }

    skipped.push({
      fightId: fight.id,
      reason: 'winner_athlete_id does not match athlete_a_id or athlete_b_id',
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
          SET loser_athlete_id = $1,
              updated_at = NOW()
          WHERE id = $2
            AND winner_athlete_id = $3
            AND loser_athlete_id IS NULL
        `,
        [plan.loserAthleteId, plan.fightId, plan.winnerAthleteId],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

function printSummary(
  fights: FightCandidateRow[],
  plans: RepairPlan[],
  skipped: SkipItem[],
  options: Options,
) {
  console.log('Diagnosis');
  console.log(`- fights with winner_athlete_id loaded: ${fights.length}`);
  console.log(`- repairs planned: ${plans.length}`);
  console.log(`- skipped fights: ${skipped.length}`);
  console.log(`- mode: ${options.apply ? 'apply' : 'dry-run'}`);
  console.log('');

  if (plans.length) {
    console.log('Planned updates');

    for (const plan of plans.slice(0, 20)) {
      console.log(
        `- fight ${plan.fightId}: winner=${plan.winnerAthleteId}, loser=${plan.loserAthleteId}`,
      );
    }

    if (plans.length > 20) {
      console.log(`- ... ${plans.length - 20} more planned updates omitted`);
    }

    console.log('');
  }

  if (skipped.length) {
    console.log('Skipped fights');

    for (const item of skipped.slice(0, 20)) {
      console.log(`- fight ${item.fightId}: ${item.reason}`);
    }

    if (skipped.length > 20) {
      console.log(`- ... ${skipped.length - 20} more skipped fights omitted`);
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
    const fights = await loadCandidates(client, options);
    const { plans, skipped } = buildPlans(fights);

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
