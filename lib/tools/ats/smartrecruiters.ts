import { arr, rec, str } from "./normalize";
import type { Adapter, Posting, Workplace } from "./types";

export const smartrecruiters: Adapter = {
  // limit=100 is the API maximum; the adapter caps at 200 total anyway.
  apiUrl: (slug) => `https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100`,
  boardUrl: (slug) => `https://careers.smartrecruiters.com/${slug}`,
  parse(body, slug) {
    const b = rec(body);
    // An unknown slug returns 200 with totalFound 0, indistinguishable from a real board with no openings.
    // ponytail: treat 0 as "not found"; both outcomes stay uncertain upstream, never a warning.
    if (!(typeof b.totalFound === "number" && b.totalFound > 0)) return null;
    const postings: Posting[] = [];
    for (const j of arr(b.content).map(rec)) {
      const id = str(j.id);
      const title = str(j.name);
      if (!id || !title) continue;
      const loc = rec(j.location);
      const workplace: Workplace | undefined = loc.remote === true ? "remote" : loc.hybrid === true ? "hybrid" : loc.remote === false ? "onsite" : undefined;
      postings.push({
        id,
        title,
        url: `https://jobs.smartrecruiters.com/${slug}/${id}`,
        ...(str(j.refNumber) ? { reqId: str(j.refNumber) } : {}),
        ...(str(loc.fullLocation) ? { location: str(loc.fullLocation) } : {}),
        ...(workplace ? { workplace } : {}),
        ...(str(rec(j.typeOfEmployment).label) ? { employmentType: str(rec(j.typeOfEmployment).label) } : {}),
        ...(str(rec(j.department).label) ? { department: str(rec(j.department).label) } : {}),
        ...(str(j.releasedDate) ? { updatedAt: str(j.releasedDate) } : {}),
      });
    }
    return { companyName: str(rec(rec(arr(b.content)[0]).company).name), postings };
  },
};
