import { z } from "zod";

import {
  buildLockeUserAgent,
  safeFetch,
  type SafeFetchDeps,
} from "../net/safe-fetch";

import { readLockeFaultsFromEnv, shouldInjectFault } from "./faults";
import { toolErr, toolOk, type ToolResult, withRetry } from "./result";

const MAX_TEXT = 4000;
const MAX_LINKS = 50;
const FETCH_TIMEOUT_MS = 8000;

export const fetchPageInputSchema = z.object({
  url: z.string().url(),
});

export const fetchPageOutputSchema = z.object({
  finalUrl: z.string().url(),
  status: z.number().int(),
  redirectChain: z.array(
    z.object({
      url: z.string().url(),
      status: z.number().int(),
    }),
  ),
  title: z.string(),
  text: z.string().max(MAX_TEXT),
  links: z.array(
    z.object({
      href: z.string().url(),
      text: z.string(),
    }),
  ),
  contentType: z.string(),
});

export type FetchPageData = z.infer<typeof fetchPageOutputSchema>;

const ALLOWED_CONTENT_TYPES = [
  "text/html",
  "application/json",
  "text/plain",
];

function normalizeContentType(header: string | null): string {
  if (!header) {
    return "application/octet-stream";
  }
  return header.split(";")[0]?.trim().toLowerCase() ?? header;
}

function isAllowedContentType(contentType: string): boolean {
  return ALLOWED_CONTENT_TYPES.some((allowed) => contentType.startsWith(allowed));
}

function decodeBody(body: Uint8Array, charset?: string): string {
  const encoding = charset?.toLowerCase() ?? "utf-8";
  try {
    return new TextDecoder(encoding).decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}

function charsetFromContentType(contentType: string): string | undefined {
  const match = /charset=([^;]+)/i.exec(contentType);
  return match?.[1]?.trim();
}

function stripHtmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const text = withoutScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

function extractTitle(html: string): string {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match?.[1]) {
    return "";
  }
  return match[1].replace(/\s+/g, " ").trim();
}

function extractLinks(html: string, baseUrl: string): { href: string; text: string }[] {
  const links: { href: string; text: string }[] = [];
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = anchorRegex.exec(html);
  while (match && links.length < MAX_LINKS) {
    const rawHref = match[1]?.trim();
    const inner = match[2] ?? "";
    if (rawHref) {
      try {
        const href = new URL(rawHref, baseUrl).toString();
        const text = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        links.push({ href, text: text.slice(0, 200) });
      } catch {
        // skip invalid href
      }
    }
    match = anchorRegex.exec(html);
  }
  return links;
}

function looksJsOnlyShell(html: string, text: string): boolean {
  if (text.length >= 200) {
    return false;
  }
  const scriptBytes = (html.match(/<script/gi) ?? []).length;
  const hasRoot = /id=["']root["']|id=["']__next["']/i.test(html);
  return scriptBytes >= 2 && hasRoot && text.length < 80;
}

export type FetchPageOptions = {
  appUrl?: string;
  deps?: Partial<SafeFetchDeps>;
  faults?: ReturnType<typeof readLockeFaultsFromEnv>;
};

async function fetchPageOnce(
  url: string,
  options: FetchPageOptions,
): Promise<ToolResult<FetchPageData>> {
  const faults = options.faults ?? readLockeFaultsFromEnv();
  if (shouldInjectFault(faults, "careers", "blocked")) {
    return toolErr("blocked", "Fault injection: careers blocked", false);
  }

  const appUrl = options.appUrl ?? process.env.APP_URL ?? "http://localhost:3000";
  const userAgent = buildLockeUserAgent(appUrl);

  const fetched = await safeFetch(url, {
    timeoutMs: FETCH_TIMEOUT_MS,
    userAgent,
    deps: options.deps,
  });

  if (!fetched.ok) {
    const kind = fetched.error.kind === "http" ? "http" : fetched.error.kind;
    return toolErr(kind, fetched.error.message, fetched.error.retryable);
  }

  const { data } = fetched;
  const rawContentType = data.headers.get("content-type");
  const contentType = normalizeContentType(rawContentType);
  if (!isAllowedContentType(contentType)) {
    return toolErr("blocked", "Content type is not allowed", false);
  }

  const raw = decodeBody(data.body, charsetFromContentType(rawContentType ?? ""));

  let title = "";
  let text = "";
  let links: { href: string; text: string }[] = [];

  if (contentType.startsWith("text/html")) {
    title = extractTitle(raw);
    text = stripHtmlToText(raw).slice(0, MAX_TEXT);
    links = extractLinks(raw, data.finalUrl);
    if (looksJsOnlyShell(raw, text)) {
      return toolErr("blocked", "Page requires JavaScript to render", false);
    }
  } else if (contentType.startsWith("application/json")) {
    text = raw.slice(0, MAX_TEXT);
    title = "JSON";
  } else {
    text = raw.slice(0, MAX_TEXT);
    title = "";
  }

  if (data.status === 404) {
    return toolErr("not_found", "Page not found", false);
  }

  if (data.status >= 400) {
    return toolErr(
      "http",
      `HTTP ${data.status}`,
      data.status >= 500 || data.status === 429,
    );
  }

  return toolOk({
    finalUrl: data.finalUrl,
    status: data.status,
    redirectChain: data.redirectChain,
    title,
    text,
    links,
    contentType,
  });
}

/** Fetches a page through the SSRF-safe client (SPEC §7). */
export async function fetchPage(
  input: z.infer<typeof fetchPageInputSchema>,
  options: FetchPageOptions = {},
): Promise<ToolResult<FetchPageData>> {
  const parsed = fetchPageInputSchema.safeParse(input);
  if (!parsed.success) {
    return toolErr("invalid_input", parsed.error.message, false);
  }

  return withRetry(() => fetchPageOnce(parsed.data.url, options), (result) => {
    if (result.ok) {
      return undefined;
    }
    return {};
  });
}
