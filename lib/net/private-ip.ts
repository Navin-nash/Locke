/** Returns true when the address must not be fetched (SSRF guard). */
export function isBlockedIpAddress(address: string): boolean {
  const normalized = address.trim().toLowerCase();

  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") {
    return true;
  }

  if (normalized.includes(":")) {
    return isBlockedIpv6(normalized);
  }

  return isBlockedIpv4(normalized);
}

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }

  const [a, b] = parts;
  if (a === 10) {
    return true;
  }
  if (a === 127) {
    return true;
  }
  if (a === 0) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }

  return false;
}

function isBlockedIpv6(ip: string): boolean {
  if (ip.startsWith("fe80:")) {
    return true;
  }
  if (ip.startsWith("fc") || ip.startsWith("fd")) {
    return true;
  }
  if (ip.startsWith("::ffff:")) {
    const mapped = ip.slice("::ffff:".length);
    if (!mapped.includes(":")) {
      return isBlockedIpv4(mapped);
    }
  }
  return false;
}

const IPV4_LITERAL =
  /^(?:\d{1,3}\.){3}\d{1,3}$/;

export function isIpLiteralHost(host: string): boolean {
  const h = host.replace(/^\[/, "").replace(/\]$/, "");
  return IPV4_LITERAL.test(h) || h.includes(":");
}
