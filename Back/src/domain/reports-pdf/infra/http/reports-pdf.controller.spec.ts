import {
  ExecutionContext,
  ForbiddenException,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompetitionAccessGuard } from '@/core/auth/infra/guards/competition-access.guard';
import { AuthenticatedUser } from '@/core/auth/infra/types/authenticated-user.type';
import { AuthRole } from '@/domain/auth/auth-role.enum';
import { CompetitionAccessRole } from '@/domain/auth/competition-access-role.enum';
import { InMemoryAuthRepository } from '../../../../../test/repositories/in-memory/in-memory-auth.repository';
import { makeUser } from '../../../../../test/factories/user.factory';
import { ExportBracketsReportPdfUseCase } from '../../application/use-cases/export-brackets-report-pdf.use-case';
import { ExportFightsByAreaPdfUseCase } from '../../application/use-cases/export-fights-by-area-pdf.use-case';
import { ExportCompetitionResultsPdfUseCase } from '../../application/use-cases/export-competition-results-pdf.use-case';
import { ReportsPdfController } from './reports-pdf.controller';

const makeCurrentUser = (
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser => ({
  sub: 42,
  username: 'operador.mesa',
  role: AuthRole.DESK,
  academyId: null,
  competitionIds: [1],
  exp: Date.now() + 60_000,
  ...overrides,
});

describe('ReportsPdfController', () => {
  const exportBracketsReportPdfUseCase = {
    execute: vi.fn(),
  } as unknown as ExportBracketsReportPdfUseCase;
  const exportFightsByAreaPdfUseCase = {
    execute: vi.fn(),
  } as unknown as ExportFightsByAreaPdfUseCase;
  const exportCompetitionResultsPdfUseCase = {
    execute: vi.fn(),
  } as unknown as ExportCompetitionResultsPdfUseCase;

  const controller = new ReportsPdfController(
    exportBracketsReportPdfUseCase,
    exportFightsByAreaPdfUseCase,
    exportCompetitionResultsPdfUseCase,
  );

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return results pdf stream with proper headers', async () => {
    vi.mocked(exportCompetitionResultsPdfUseCase.execute).mockResolvedValue({
      buffer: Buffer.from('pdf'),
      fileName: 'copa-central-resultados.pdf',
    });

    const result = await controller.exportResults({ id: 1 });

    expect(exportCompetitionResultsPdfUseCase.execute).toHaveBeenCalledWith(1);
    expect(result).toBeInstanceOf(StreamableFile);
    expect(result.getHeaders()).toMatchObject({
      type: 'application/pdf',
      disposition: 'inline; filename="copa-central-resultados.pdf"',
    });
  });

  it('should return fights-by-area pdf stream with proper headers', async () => {
    vi.mocked(exportFightsByAreaPdfUseCase.execute).mockResolvedValue({
      buffer: Buffer.from('pdf'),
      fileName: 'copa-central-fights-by-area.pdf',
    });

    const result = await controller.exportFightsByArea({ id: 1 });

    expect(result).toBeInstanceOf(StreamableFile);
    expect(result.getHeaders()).toMatchObject({
      type: 'application/pdf',
      disposition: 'inline; filename="copa-central-fights-by-area.pdf"',
    });
  });
});

describe('CompetitionAccessGuard protecting ReportsPdfController', () => {
  const reflector = new Reflector();
  let userCompetitionRepository: InMemoryAuthRepository;
  let guard: CompetitionAccessGuard;

  beforeEach(() => {
    userCompetitionRepository = new InMemoryAuthRepository([
      makeUser({ id: 42, username: 'operador.mesa' }),
    ]);
    guard = new CompetitionAccessGuard(reflector, userCompetitionRepository);
  });

  const buildContext = (
    handler: (...args: never[]) => unknown,
    request: { params: Record<string, string>; user?: AuthenticatedUser },
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => ReportsPdfController,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  it('blocks the request when there is no authenticated user', async () => {
    const context = buildContext(
      ReportsPdfController.prototype.exportBrackets,
      {
        params: { id: '1' },
        user: undefined,
      },
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks the request when the authenticated user has no link with the competition', async () => {
    const context = buildContext(
      ReportsPdfController.prototype.exportBrackets,
      {
        params: { id: '1' },
        user: makeCurrentUser({ sub: 42 }),
      },
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks exportFightsByArea for a user without access to a different competition', async () => {
    await userCompetitionRepository.grantAccess({
      userId: 42,
      competitionId: 1,
      role: CompetitionAccessRole.MEMBER,
    });

    const context = buildContext(
      ReportsPdfController.prototype.exportFightsByArea,
      {
        params: { id: '2' },
        user: makeCurrentUser({ sub: 42 }),
      },
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows the request when the authenticated user is linked to the competition', async () => {
    await userCompetitionRepository.grantAccess({
      userId: 42,
      competitionId: 1,
      role: CompetitionAccessRole.MEMBER,
    });

    const context = buildContext(
      ReportsPdfController.prototype.exportBrackets,
      {
        params: { id: '1' },
        user: makeCurrentUser({ sub: 42 }),
      },
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
