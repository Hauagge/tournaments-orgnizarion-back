import { describe, expect, it } from 'vitest';
import { FightEntity } from '../../domain/entities/fight.entity';
import { FightStatus } from '../../domain/value-objects/fight-status.enum';
import { CategoryPodiumService } from './category-podium.service';

type FightOverrides = Partial<Parameters<typeof FightEntity.restore>[0]>;

function fight(overrides: FightOverrides = {}) {
  return FightEntity.restore({
    id: 1,
    competitionId: 1,
    categoryId: 7,
    keyGroupId: null,
    round: 1,
    order: 1,
    areaId: null,
    areaName: null,
    status: FightStatus.FINISHED,
    athleteAId: 10,
    athleteBId: 20,
    winnerId: 10,
    loserId: 20,
    winType: 'POINTS',
    startedAt: null,
    finishedAt: null,
    ...overrides,
  });
}

describe('CategoryPodiumService', () => {
  const service = new CategoryPodiumService();

  it('medals every athlete on a five-athlete gold/silver draw', () => {
    // 5 atletas: 2 lutas de abertura, o 5o entra direto na Ouro.
    // Ouro (3 atletas) rende 1o/2o/3o e Prata (2 atletas) rende 1o/2o = 5 medalhas.
    const podiums = service.resolveAll([
      fight({ id: 1, round: 1, order: 1, athleteAId: 1, athleteBId: 2, winnerId: 1, loserId: 2, nextFightId: 3, nextFightSlot: 'A', loserNextFightId: 5, loserNextFightSlot: 'A' }),
      fight({ id: 2, round: 1, order: 2, athleteAId: 3, athleteBId: 4, winnerId: 3, loserId: 4, nextFightId: 3, nextFightSlot: 'B', loserNextFightId: 5, loserNextFightSlot: 'B' }),
      // Ouro: 1 e 3 se enfrentam; o 5o esperava na final
      fight({ id: 3, round: 2, order: 3, athleteAId: 1, athleteBId: 3, winnerId: 1, loserId: 3, nextFightId: 4, nextFightSlot: 'B' }),
      fight({ id: 4, round: 3, order: 4, athleteAId: 5, athleteBId: 1, winnerId: 5, loserId: 1 }),
      // Prata: os dois perdedores da abertura
      fight({ id: 5, round: 2, order: 5, athleteAId: 2, athleteBId: 4, winnerId: 2, loserId: 4 }),
    ]);

    const medalhas = new Set(
      [
        podiums.main.firstAthleteId,
        podiums.main.secondAthleteId,
        ...podiums.main.thirdAthleteIds,
        podiums.secondary?.firstAthleteId,
        podiums.secondary?.secondAthleteId,
        ...(podiums.secondary?.thirdAthleteIds ?? []),
      ].filter((athleteId): athleteId is number => athleteId != null),
    );

    expect(medalhas).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(podiums.main.firstAthleteId).toBe(5);
    expect(podiums.secondary?.firstAthleteId).toBe(2);
  });

  it('resolves the podium of a four-athlete bracket', () => {
    const podium = service.resolve([
      fight({ id: 1, round: 1, order: 1, athleteAId: 10, athleteBId: 20, winnerId: 10, loserId: 20, nextFightId: 3, nextFightSlot: 'A', loserNextFightId: 4, loserNextFightSlot: 'A' }),
      fight({ id: 2, round: 1, order: 2, athleteAId: 30, athleteBId: 40, winnerId: 30, loserId: 40, nextFightId: 3, nextFightSlot: 'B', loserNextFightId: 4, loserNextFightSlot: 'B' }),
      fight({ id: 3, round: 2, order: 3, athleteAId: 10, athleteBId: 30, winnerId: 10, loserId: 30 }),
      fight({ id: 4, round: 2, order: 4, athleteAId: 20, athleteBId: 40, winnerId: 40, loserId: 20 }),
    ]);

    expect(podium).toEqual({
      firstAthleteId: 10,
      secondAthleteId: 30,
      thirdAthleteIds: [40],
      decided: true,
    });
  });

  it('takes the gold series podium and ignores the silver one', () => {
    // Ouro e Prata terminam na mesma rodada, cada uma com final e 3o lugar.
    const podium = service.resolve([
      fight({ id: 1, round: 1, order: 1, athleteAId: 10, athleteBId: 20, winnerId: 10, loserId: 20, nextFightId: 2, nextFightSlot: 'A', loserNextFightId: 5, loserNextFightSlot: 'A' }),
      fight({ id: 9, round: 1, order: 2, athleteAId: 30, athleteBId: 40, winnerId: 30, loserId: 40, nextFightId: 2, nextFightSlot: 'B', loserNextFightId: 5, loserNextFightSlot: 'B' }),
      // Serie Ouro: semis 2 e 3 -> final 4, perdedores -> 3o lugar 8
      fight({ id: 2, round: 2, order: 3, athleteAId: 10, athleteBId: 30, winnerId: 10, loserId: 30, nextFightId: 4, nextFightSlot: 'A', loserNextFightId: 8, loserNextFightSlot: 'A' }),
      fight({ id: 3, round: 2, order: 4, athleteAId: 50, athleteBId: 60, winnerId: 50, loserId: 60, nextFightId: 4, nextFightSlot: 'B', loserNextFightId: 8, loserNextFightSlot: 'B' }),
      fight({ id: 4, round: 3, order: 5, athleteAId: 10, athleteBId: 50, winnerId: 10, loserId: 50 }),
      fight({ id: 8, round: 3, order: 6, athleteAId: 30, athleteBId: 60, winnerId: 60, loserId: 30 }),
      // Serie Prata, com final e 3o proprios — nao entra no podio da categoria
      fight({ id: 5, round: 2, order: 7, athleteAId: 20, athleteBId: 40, winnerId: 20, loserId: 40, nextFightId: 7, nextFightSlot: 'A', loserNextFightId: 6, loserNextFightSlot: 'A' }),
      fight({ id: 10, round: 2, order: 8, athleteAId: 70, athleteBId: 80, winnerId: 70, loserId: 80, nextFightId: 7, nextFightSlot: 'B', loserNextFightId: 6, loserNextFightSlot: 'B' }),
      fight({ id: 7, round: 3, order: 9, athleteAId: 20, athleteBId: 70, winnerId: 20, loserId: 70 }),
      fight({ id: 6, round: 3, order: 10, athleteAId: 40, athleteBId: 80, winnerId: 80, loserId: 40 }),
    ]);

    expect(podium.firstAthleteId).toBe(10);
    expect(podium.secondAthleteId).toBe(50);
    expect(podium.thirdAthleteIds).toEqual([60]);
  });

  it('awards two thirds when the bracket has no bronze fight', () => {
    // Regulamento item 9: de 6 atletas em diante os dois perdedores de
    // semifinal sao terceiros, sem luta entre eles.
    const podium = service.resolve([
      fight({ id: 1, round: 1, order: 1, athleteAId: 10, athleteBId: 20, winnerId: 10, loserId: 20, nextFightId: 3, nextFightSlot: 'A' }),
      fight({ id: 2, round: 1, order: 2, athleteAId: 30, athleteBId: 40, winnerId: 30, loserId: 40, nextFightId: 3, nextFightSlot: 'B' }),
      fight({ id: 3, round: 2, order: 3, athleteAId: 10, athleteBId: 30, winnerId: 10, loserId: 30 }),
    ]);

    expect(podium.firstAthleteId).toBe(10);
    expect(podium.secondAthleteId).toBe(30);
    expect(podium.thirdAthleteIds.sort()).toEqual([20, 40]);
  });

  it('does not hand the silver champion a bronze medal in the gold series', () => {
    // Chave de 6 no formato Ouro/Prata: a luta de abertura alimenta a final do
    // Ouro (pelo vencedor) e a final da Prata (pelo perdedor). Se a final da
    // Prata for confundida com uma disputa de terceiro, o campeao da Prata
    // aparece tambem como 3o do Ouro.
    const podiums = service.resolveAll([
      // abertura: vencedor -> final do Ouro, perdedor -> final da Prata
      fight({ id: 1, round: 1, order: 1, athleteAId: 1, athleteBId: 2, winnerId: 1, loserId: 2, nextFightId: 5, nextFightSlot: 'A', loserNextFightId: 7, loserNextFightSlot: 'A' }),
      fight({ id: 2, round: 1, order: 2, athleteAId: 3, athleteBId: 4, winnerId: 3, loserId: 4, nextFightId: 4, nextFightSlot: 'A', loserNextFightId: 6, loserNextFightSlot: 'A' }),
      fight({ id: 3, round: 1, order: 3, athleteAId: 5, athleteBId: 6, winnerId: 5, loserId: 6, nextFightId: 4, nextFightSlot: 'B', loserNextFightId: 6, loserNextFightSlot: 'B' }),
      // Ouro
      fight({ id: 4, round: 2, order: 4, athleteAId: 3, athleteBId: 5, winnerId: 3, loserId: 5, nextFightId: 5, nextFightSlot: 'B' }),
      fight({ id: 5, round: 3, order: 5, athleteAId: 1, athleteBId: 3, winnerId: 1, loserId: 3 }),
      // Prata
      fight({ id: 6, round: 2, order: 6, athleteAId: 4, athleteBId: 6, winnerId: 4, loserId: 6, nextFightId: 7, nextFightSlot: 'B' }),
      fight({ id: 7, round: 3, order: 7, athleteAId: 2, athleteBId: 4, winnerId: 2, loserId: 4 }),
    ]);

    expect(podiums.main.firstAthleteId).toBe(1);
    expect(podiums.main.secondAthleteId).toBe(3);
    // 5 perdeu a semifinal do Ouro e foi eliminado ali; 2 desceu para a Prata.
    expect(podiums.main.thirdAthleteIds).toEqual([5]);
    expect(podiums.secondary?.firstAthleteId).toBe(2);
    expect(podiums.main.thirdAthleteIds).not.toContain(2);
  });

  it('exposes the silver series podium separately on gold/silver', () => {
    const podiums = service.resolveAll([
      fight({ id: 1, round: 1, order: 1, athleteAId: 10, athleteBId: 20, winnerId: 10, loserId: 20, nextFightId: 2, nextFightSlot: 'A', loserNextFightId: 5, loserNextFightSlot: 'A' }),
      fight({ id: 9, round: 1, order: 2, athleteAId: 30, athleteBId: 40, winnerId: 30, loserId: 40, nextFightId: 2, nextFightSlot: 'B', loserNextFightId: 5, loserNextFightSlot: 'B' }),
      fight({ id: 2, round: 2, order: 3, athleteAId: 10, athleteBId: 30, winnerId: 10, loserId: 30, nextFightId: 4, nextFightSlot: 'A', loserNextFightId: 8, loserNextFightSlot: 'A' }),
      fight({ id: 3, round: 2, order: 4, athleteAId: 50, athleteBId: 60, winnerId: 50, loserId: 60, nextFightId: 4, nextFightSlot: 'B', loserNextFightId: 8, loserNextFightSlot: 'B' }),
      fight({ id: 4, round: 3, order: 5, athleteAId: 10, athleteBId: 50, winnerId: 10, loserId: 50 }),
      fight({ id: 8, round: 3, order: 6, athleteAId: 30, athleteBId: 60, winnerId: 60, loserId: 30 }),
      fight({ id: 5, round: 2, order: 7, athleteAId: 20, athleteBId: 40, winnerId: 20, loserId: 40, nextFightId: 7, nextFightSlot: 'A', loserNextFightId: 6, loserNextFightSlot: 'A' }),
      fight({ id: 10, round: 2, order: 8, athleteAId: 70, athleteBId: 80, winnerId: 70, loserId: 80, nextFightId: 7, nextFightSlot: 'B', loserNextFightId: 6, loserNextFightSlot: 'B' }),
      fight({ id: 7, round: 3, order: 9, athleteAId: 20, athleteBId: 70, winnerId: 20, loserId: 70 }),
      fight({ id: 6, round: 3, order: 10, athleteAId: 40, athleteBId: 80, winnerId: 80, loserId: 40 }),
    ]);

    expect(podiums.main.firstAthleteId).toBe(10);
    expect(podiums.secondary).not.toBeNull();
    expect(podiums.secondary?.firstAthleteId).toBe(20);
    expect(podiums.secondary?.secondAthleteId).toBe(70);
    expect(podiums.secondary?.thirdAthleteIds).toEqual([80]);
  });

  it('does not invent a silver series on a bracket that only has a bronze fight', () => {
    // 4 atletas: a luta de bronze tambem e alimentada por perdedor, mas ja e o
    // 3o lugar — nao pode virar uma "serie secundaria".
    const podiums = service.resolveAll([
      fight({ id: 1, round: 1, order: 1, athleteAId: 10, athleteBId: 20, winnerId: 10, loserId: 20, nextFightId: 3, nextFightSlot: 'A', loserNextFightId: 4, loserNextFightSlot: 'A' }),
      fight({ id: 2, round: 1, order: 2, athleteAId: 30, athleteBId: 40, winnerId: 30, loserId: 40, nextFightId: 3, nextFightSlot: 'B', loserNextFightId: 4, loserNextFightSlot: 'B' }),
      fight({ id: 3, round: 2, order: 3, athleteAId: 10, athleteBId: 30, winnerId: 10, loserId: 30 }),
      fight({ id: 4, round: 2, order: 4, athleteAId: 20, athleteBId: 40, winnerId: 40, loserId: 20 }),
    ]);

    expect(podiums.main.thirdAthleteIds).toEqual([40]);
    expect(podiums.secondary).toBeNull();
  });

  it('does not treat the three-athlete repechage as a silver series', () => {
    // A repescagem tambem nasce de um perdedor, mas o vencedor dela volta para
    // a final — logo pertence a chave principal.
    const podiums = service.resolveAll([
      fight({ id: 1, round: 1, order: 1, athleteAId: 10, athleteBId: 20, winnerId: 10, loserId: 20, nextFightId: 3, nextFightSlot: 'A', loserNextFightId: 2, loserNextFightSlot: 'A' }),
      fight({ id: 2, round: 2, order: 2, athleteAId: 20, athleteBId: 30, winnerId: 20, loserId: 30, nextFightId: 3, nextFightSlot: 'B' }),
      fight({ id: 3, round: 3, order: 3, athleteAId: 10, athleteBId: 20, winnerId: 10, loserId: 20 }),
    ]);

    expect(podiums.secondary).toBeNull();
  });

  it('uses the repechage loser as third on the three-athlete playoff', () => {
    const podium = service.resolve([
      fight({ id: 1, round: 1, order: 1, athleteAId: 10, athleteBId: 20, winnerId: 10, loserId: 20, nextFightId: 3, nextFightSlot: 'A', loserNextFightId: 2, loserNextFightSlot: 'A' }),
      fight({ id: 2, round: 2, order: 2, athleteAId: 20, athleteBId: 30, winnerId: 20, loserId: 30, nextFightId: 3, nextFightSlot: 'B' }),
      fight({ id: 3, round: 3, order: 3, athleteAId: 10, athleteBId: 20, winnerId: 10, loserId: 20 }),
    ]);

    expect(podium).toEqual({
      firstAthleteId: 10,
      secondAthleteId: 20,
      thirdAthleteIds: [30],
      decided: true,
    });
  });

  it('ranks a best of three by wins, without a third place', () => {
    const podium = service.resolve([
      fight({ id: 1, round: 1, order: 1, winnerId: 10, loserId: 20 }),
      fight({ id: 2, round: 1, order: 2, winnerId: 20, loserId: 10 }),
      fight({ id: 3, round: 1, order: 3, winnerId: 10, loserId: 20 }),
    ]);

    expect(podium.firstAthleteId).toBe(10);
    expect(podium.secondAthleteId).toBe(20);
    expect(podium.thirdAthleteIds).toEqual([]);
  });

  it('reports the podium as undecided while a fight is still open', () => {
    const podium = service.resolve([
      fight({ id: 1, round: 1, order: 1, nextFightId: 2, nextFightSlot: 'A' }),
      fight({ id: 2, round: 2, order: 2, status: FightStatus.PENDING, winnerId: null, loserId: null }),
    ]);

    expect(podium.decided).toBe(false);
  });
});
