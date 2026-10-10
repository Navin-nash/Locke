import { z } from "zod";

export const AtsProvider = z.enum(["greenhouse", "lever", "ashby", "smartrecruiters", "workable"]);
export type AtsProvider = z.infer<typeof AtsProvider>;

/** Slugs go into a URL path, so reject anything that could escape it. */
export const AtsSlug = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/);

export const AtsLookupInput = z.object({ provider: AtsProvider, slug: AtsSlug });

export type Workplace = "remote" | "hybrid" | "onsite";

export type Compensation = { summary: string; min?: number; max?: number; currency?: string };

/** SPEC §7 posting shape, plus `reqId` (additive: needed for the exact reqId match). */
export type Posting = {
  id: string;
  title: string;
  reqId?: string;
  location?: string;
  workplace?: Workplace;
  employmentType?: string;
  department?: string;
  compensation?: Compensation;
  url: string;
  updatedAt?: string;
};

export type AtsLookupData = {
  exists: boolean;
  boardUrl: string;
  companyName?: string;
  website?: string;
  postings: Posting[];
};

/** One provider: how to call it and how to turn its JSON into normalized postings. */
export type Adapter = {
  apiUrl: (slug: string) => string;
  boardUrl: (slug: string) => string;
  /** Returns null when the body shows the board does not exist (for providers that 200 on unknown slugs). */
  parse: (body: unknown, slug: string) => { companyName?: string; postings: Posting[] } | null;
};
