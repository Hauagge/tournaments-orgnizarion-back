import { describe, expect, it } from 'vitest';
import { makeUser } from '../../../test/factories';
import { InMemoryAuthRepository } from '../../../test/repositories/in-memory';
import { ValidationError } from '../../shared/errors/validation.error';
import { ZodValidationPipe } from '../../core/pipe/zod-validation.pipe';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { ListUsersSchema } from './dto/list-users.dto';
import { UserController } from './user.controller';
import { AuthenticatedUser } from '../../core/auth/infra/types/authenticated-user.type';

describe('ListUsersSchema (GET /users query validation)', () => {
  const pipe = new ZodValidationPipe(ListUsersSchema);

  it('rejects a request with no search term instead of dumping the whole roster', () => {
    // Este é o teste de regressão do bug de vazamento: antes, sem `search`,
    // o endpoint devolvia todos os usuários do sistema.
    expect(() => pipe.transform({}, {} as never)).toThrow(ValidationError);
  });

  it('rejects a blank search term', () => {
    expect(() => pipe.transform({ search: '   ' }, {} as never)).toThrow(
      ValidationError,
    );
  });

  it('applies default page/limit and clamps an oversized limit to the hard max', () => {
    const parsed = pipe.transform({ search: 'foo' }, {} as never);
    expect(parsed).toEqual({ search: 'foo', page: 1, limit: 20 });

    const clamped = pipe.transform(
      { search: 'foo', limit: '9999' },
      {} as never,
    );
    expect(clamped.limit).toBe(50);
  });

  it('coerces page and limit from query string values', () => {
    const parsed = pipe.transform(
      { search: 'foo', page: '3', limit: '10' },
      {} as never,
    );
    expect(parsed).toEqual({ search: 'foo', page: 3, limit: 10 });
  });
});

describe('UserController.list', () => {
  const currentUser = { id: 1, role: 'STAFF' } as unknown as AuthenticatedUser;

  it('still returns matching users for a STAFF caller supplying a search term', async () => {
    const repository = new InMemoryAuthRepository([
      makeUser({ id: 1, username: 'gabriel' }),
      makeUser({ id: 2, username: 'giovana' }),
      makeUser({ id: 3, username: 'someone-else' }),
    ]);
    const useCase = new ListUsersUseCase(repository);
    const controller = new UserController(useCase);

    const response = await controller.list(currentUser, {
      search: 'g',
      page: 1,
      limit: 20,
    });

    expect(response.error).toBeNull();
    expect(response.data?.map((user) => user.username)).toEqual([
      'gabriel',
      'giovana',
    ]);
  });

  it('caps results at the requested limit and offsets by page', async () => {
    const seeded = Array.from({ length: 60 }, (_, index) =>
      makeUser({
        id: index + 1,
        username: `matching-user-${String(index).padStart(2, '0')}`,
      }),
    );
    const repository = new InMemoryAuthRepository(seeded);
    const useCase = new ListUsersUseCase(repository);
    const controller = new UserController(useCase);

    const firstPage = await controller.list(currentUser, {
      search: 'matching',
      page: 1,
      limit: 20,
    });
    const firstPageData = firstPage.data ?? [];
    expect(firstPageData).toHaveLength(20);
    expect(firstPageData[0].username).toBe('matching-user-00');
    expect(firstPageData[19].username).toBe('matching-user-19');

    const secondPage = await controller.list(currentUser, {
      search: 'matching',
      page: 2,
      limit: 20,
    });
    const secondPageData = secondPage.data ?? [];
    expect(secondPageData).toHaveLength(20);
    expect(secondPageData[0].username).toBe('matching-user-20');

    // Nenhuma sobreposicao entre paginas.
    const firstIds = new Set(firstPageData.map((user) => user.id));
    const secondIds = new Set(secondPageData.map((user) => user.id));
    expect([...firstIds].some((id) => secondIds.has(id))).toBe(false);
  });
});
