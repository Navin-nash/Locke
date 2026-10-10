import { parse } from "tldts";
import { z } from "zod";
import { toolErr, toolOk, type ToolResult } from "./domain-result";
import { getWithRetry, type GetDeps } from "./json-get";

export const RdapInput = z.object({ domain: z.string().min(1).max(253) });

export type RdapData = {
  registrableDomain: string;
  registered: boolean;
  createdAt?: string;
  ageDays?: number;
  registrar?: string;
};

const RdapBody = z.object({
  events: z.array(z.object({ eventAction: z.string(), eventDate: z.string() })).optional(),
  entities: z
    .array(z.object({ roles: z.array(z.string()).optional(), vcardArray: z.tuple([z.string(), z.array(z.array(z.unknown()))]).optional() }))
    .optional(),
});

const registrarName = (body: z.infer<typeof RdapBody>): string | undefined => {
  const ent = body.entities?.find((e) => e.roles?.includes("registrar"));
  const fn = ent?.vcardArray?.[1].find((p) => p[0] === "fn");
  return typeof fn?.[3] === "string" ? fn[3] : undefined;
};

/** A failure here is never suspicious on its own (SPEC §7): it returns an error, not registered:false. */
export async function rdapDomain(
  input: z.infer<typeof RdapInput>,
  deps: GetDeps & { now?: () => Date } = {},
): Promise<ToolResult<RdapData>> {
  const parsed = RdapInput.safeParse(input);
  const registrableDomain = parsed.success ? parse(parsed.data.domain.trim().toLowerCase()).domain : null;
  if (!registrableDomain) return toolErr("invalid_input", "domain is not valid", false);

  const res = await getWithRetry(`https://rdap.org/domain/${registrableDomain}`, {
    timeoutMs: 5000,
    headers: { accept: "application/rdap+json" },
    ...deps,
  });
  if (!res.ok) return res;
  if (res.data.status === 404) return toolOk({ registrableDomain, registered: false });
  if (res.data.status !== 200) return toolErr("http", `RDAP returned ${res.data.status}`, false);

  let body: z.infer<typeof RdapBody>;
  try {
    body = RdapBody.parse(JSON.parse(res.data.text));
  } catch {
    return toolErr("parse", "RDAP response was not valid JSON", false);
  }
  const createdAt = body.events?.find((e) => e.eventAction === "registration")?.eventDate;
  const created = createdAt ? Date.parse(createdAt) : NaN;
  const now = (deps.now ?? (() => new Date()))();
  return toolOk({
    registrableDomain,
    registered: true,
    ...(createdAt && !Number.isNaN(created) ? { createdAt, ageDays: Math.floor((now.getTime() - created) / 86_400_000) } : {}),
    ...(registrarName(body) ? { registrar: registrarName(body) } : {}),
  });
}
