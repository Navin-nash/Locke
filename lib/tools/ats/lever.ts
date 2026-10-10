import { arr, rec, str, workplaceOf } from "./normalize";
import type { Adapter, Compensation, Posting } from "./types";

const salary = (v: unknown): Compensation | undefined => {
  const s = rec(v);
  const min = typeof s.min === "number" ? s.min : undefined;
  const max = typeof s.max === "number" ? s.max : undefined;
  if (min === undefined && max === undefined) return undefined;
  const currency = str(s.currency);
  return { summary: `${min ?? ""}-${max ?? ""} ${currency ?? ""}`.trim(), ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}), ...(currency ? { currency } : {}) };
};

export const lever: Adapter = {
  apiUrl: (slug) => `https://api.lever.co/v0/postings/${slug}?mode=json`,
  boardUrl: (slug) => `https://jobs.lever.co/${slug}`,
  parse(body) {
    const postings: Posting[] = [];
    for (const j of arr(body).map(rec)) {
      const id = str(j.id);
      const title = str(j.text);
      const url = str(j.hostedUrl);
      if (!id || !title || !url) continue;
      const cat = rec(j.categories);
      const comp = salary(j.salaryRange);
      postings.push({
        id,
        title,
        url,
        ...(str(cat.location) ? { location: str(cat.location) } : {}),
        ...(workplaceOf(j.workplaceType) ? { workplace: workplaceOf(j.workplaceType) } : {}),
        ...(str(cat.commitment) ? { employmentType: str(cat.commitment) } : {}),
        ...(str(cat.team) ? { department: str(cat.team) } : {}),
        ...(comp ? { compensation: comp } : {}),
        ...(typeof j.createdAt === "number" ? { updatedAt: new Date(j.createdAt).toISOString() } : {}),
      });
    }
    return { postings };
  },
};
