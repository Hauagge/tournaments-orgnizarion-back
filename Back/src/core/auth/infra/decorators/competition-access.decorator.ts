import { SetMetadata } from '@nestjs/common';

export type CompetitionAccessResolver =
  | { type: 'competition'; param: string }
  | { type: 'category'; param: string }
  | { type: 'keyGroup'; param: string }
  | { type: 'fight'; param: string }
  | { type: 'area'; param: string };

export const COMPETITION_ACCESS_KEY = 'competitionAccessResolver';

export const CompetitionAccess = (resolver: CompetitionAccessResolver) =>
  SetMetadata(COMPETITION_ACCESS_KEY, resolver);
