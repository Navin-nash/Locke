import { arr, rec, remoteFromLocation, str, workplaceOf } from "./normalize";
import type { Adapter, Compensation, Posting } from "./types";

const compensation = (v: unknown): Compensation | undefined => {
  const c = rec(v);
  const summary = str(c.scrapeableCompensationSalarySummary) ?? str(c.compensationTierSummary);
  if (!summary) return undefined;
  const salary = arr(c.summaryComponents)
    .map(rec)
    .find((x) => x.compensationType === "Salary");
  const min = typeof salary?.minValue === "number" ? salary.minValue : undefined;
  const max = typeof salary?.maxValue === "number" ? salary.maxValue : undefined;
  const currency = str(salary?.currencyCode);
  return { summary, ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}), ...(currency ? { currency } : {}) };
};

export const ashby: Adapter = {
  apiUrl: (slug) => `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`,
  boardUrl: (slug) => `https://jobs.ashbyhq.com/${slug}`,
  parse(body) {
    const postings: Posting[] = [];
    for (const j of arr(rec(body).jobs).map(rec)) {
      if (j.isListed === false) continue;
      const id = str(j.id);
      const title = str(j.title);
      const url = str(j.jobUrl);
      if (!id || !title || !url) continue;
      const location = str(j.location);
      const workplace = workplaceOf(j.workplaceType) ?? remoteFromLocation(location);
      const comp = compensation(j.compensation);
      postings.push({
        id,
        title,
        url,
        ...(location ? { location } : {}),
        ...(workplace ? { workplace } : {}),
        ...(str(j.employmentType) ? { employmentType: str(j.employmentType) } : {}),
        ...(str(j.department) ? { department: str(j.department) } : {}),
        ...(comp ? { compensation: comp } : {}),
        ...(str(j.publishedAt) ? { updatedAt: str(j.publishedAt) } : {}),
      });
    }
    return { postings };
  },
};
