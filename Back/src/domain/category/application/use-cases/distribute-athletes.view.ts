import { DistributionRejectionReason } from '../services/category-distribution.service';

export type DistributeAthletesAllocationItem = {
  categoryId: number;
  categoryName: string;
  belt: string;
  athletes: { id: number; fullName: string }[];
};

export type DistributeAthletesRejectionItem = {
  athleteId: number;
  fullName: string;
  belt: string;
  reason: DistributionRejectionReason;
  detail: string;
};

export type DistributeAthletesView = {
  competitionId: number;
  summary: {
    totalEligible: number;
    totalAllocated: number;
    totalRejected: number;
  };
  allocations: DistributeAthletesAllocationItem[];
  rejected: DistributeAthletesRejectionItem[];
};
