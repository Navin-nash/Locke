import { arr, rec, str } from "./normalize";
import type { Adapter, Posting } from "./types";

/**
 * Verified 2026-10-10 against live accounts (unofficial endpoint, not in Workable's public docs):
 * - `GET apply.workable.com/api/v1/widget/accounts/{slug}` returns 200 `{ name, description, jobs[] }` for any
 *   existing account, including accounts with `jobs: []` (e.g. `dataiku`). An unknown slug returns 404 "Not Found".
 *   So 404 means exists:false, and 200 with no jobs means exists:true with no postings.
 * - The widget only exposes `telecommuting` (boolean), so workplace is "remote" or unknown; never inferred as onsite.
 * - Not every real account is exposed (`remote-com` 404s on both the widget and the v3 jobs endpoint), so a 404 here
 *   is "not located", never evidence the company is fake.
 */
export const workable: Adapter = {
  apiUrl: (slug) => `https://apply.workable.com/api/v1/widget/accounts/${slug}`,
  boardUrl: (slug) => `https://apply.workable.com/${slug}/`,
  parse(body) {
    const b = rec(body);
    const postings: Posting[] = [];
    for (const j of arr(b.jobs).map(rec)) {
      const id = str(j.shortcode);
      const title = str(j.title);
      const url = str(j.url);
      if (!id || !title || !url) continue;
      const location = [str(j.city), str(j.country)].filter(Boolean).join(", ");
      postings.push({
        id,
        title,
        url,
        ...(str(j.code) ? { reqId: str(j.code) } : {}),
        ...(location ? { location } : {}),
        ...(j.telecommuting === true ? { workplace: "remote" as const } : {}),
        ...(str(j.employment_type) ? { employmentType: str(j.employment_type) } : {}),
        ...(str(j.department) ? { department: str(j.department) } : {}),
        ...(str(j.published_on) ? { updatedAt: str(j.published_on) } : {}),
      });
    }
    return { companyName: str(b.name), postings };
  },
};
