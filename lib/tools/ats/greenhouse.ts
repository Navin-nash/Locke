import { arr, rec, remoteFromLocation, str } from "./normalize";
import type { Adapter, Posting } from "./types";

export const greenhouse: Adapter = {
  apiUrl: (slug) => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
  boardUrl: (slug) => `https://job-boards.greenhouse.io/${slug}`,
  parse(body) {
    const jobs = arr(rec(body).jobs);
    const postings: Posting[] = [];
    for (const j of jobs.map(rec)) {
      const id = j.id === undefined ? undefined : String(j.id);
      const title = str(j.title);
      const url = str(j.absolute_url);
      if (!id || !title || !url) continue;
      const location = str(rec(j.location).name);
      postings.push({
        id,
        title,
        url,
        ...(str(j.requisition_id) ? { reqId: str(j.requisition_id) } : {}),
        ...(location ? { location } : {}),
        ...(remoteFromLocation(location) ? { workplace: remoteFromLocation(location) } : {}),
        ...(str(j.updated_at) ? { updatedAt: str(j.updated_at) } : {}),
      });
    }
    return { companyName: str(rec(jobs[0]).company_name), postings };
  },
};
