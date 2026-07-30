export type Leader = {
  type: "user";
  communityId: string;
  name: string;
};

export type CoolRow = {
  type: "cool";
  code: string;
  name: string;
  campusCode: string;
  campusName: string;
  leaders: Leader[];
  status: "active" | "inactive" | string;
};

export type CoolsResponse = {
  code: number;
  status: string;
  message: string;
  data: CoolRow[];
  metadata?: { totalRows?: number };
};
