export type DistributionFile = {
  id: string;
  name: string;
  type: string;
  size: string;
  sizeBytes: number;
};

export type DistributionTarget = {
  id: string;
  name: string;
  description: string;
};

export type DistributionComputer = DistributionTarget & {
  roomId: string | null;
  ipAddress: string | null;
  status: string;
};

export type DistributionSnapshot = {
  files: DistributionFile[];
  computers: DistributionComputer[];
  rooms: DistributionTarget[];
};
