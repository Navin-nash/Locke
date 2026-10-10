import { toolErr, toolOk, type ToolResult } from "../domain-result";
import { getWithRetry, type GetDeps } from "../json-get";
import { ashby } from "./ashby";
import { greenhouse } from "./greenhouse";
import { lever } from "./lever";
import { smartrecruiters } from "./smartrecruiters";
import { AtsLookupInput, type Adapter, type AtsLookupData, type AtsProvider } from "./types";
import { workable } from "./workable";


const ADAPTERS: Record<AtsProvider, Adapter> = { greenhouse, lever, ashby, smartrecruiters, workable };
const MAX_POSTINGS = 200;

/** A 404 means exists:false (ok:true). Timeouts, 5xx, and parse failures are errors, never "does not exist". */
export async function atsLookup(
  input: { provider: AtsProvider; slug: string },
  deps: GetDeps = {},
): Promise<ToolResult<AtsLookupData>> {
  const parsed = AtsLookupInput.safeParse(input);
  if (!parsed.success) return toolErr("invalid_input", "provider or slug is not valid", false);
  const { provider, slug } = parsed.data;
  const adapter = ADAPTERS[provider];
  const boardUrl = adapter.boardUrl(slug);
  const missing = toolOk<AtsLookupData>({ exists: false, boardUrl, postings: [] });

  const res = await getWithRetry(adapter.apiUrl(slug), { timeoutMs: 6000, headers: { accept: "application/json" }, ...deps });
  if (!res.ok) return res;
  if (res.data.status === 404) return missing;
  if (res.data.status !== 200) return toolErr("http", `${provider} returned ${res.data.status}`, false);

  let body: unknown;
  try {
    body = JSON.parse(res.data.text);
  } catch {
    return toolErr("parse", `${provider} response was not valid JSON`, false);
  }
  const out = adapter.parse(body, slug);
  if (!out) return missing;
  return toolOk({
    exists: true,
    boardUrl,
    ...(out.companyName ? { companyName: out.companyName } : {}),
    postings: out.postings.slice(0, MAX_POSTINGS),
  });
}
