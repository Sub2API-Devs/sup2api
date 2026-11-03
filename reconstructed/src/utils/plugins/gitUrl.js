/**
 * utils/plugins/gitUrl.ts
 *
 * 2.1.316 新增：插件 git URL 解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9qwbw2qr.js (5)
 * attribution: placement 5
 */
import { REDACTED_URL, redactUrlQuery, ZDn } from "../redaction/urlRedaction.js";
import { printableLabel, printableName } from "../printableName.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { describeUrlScheme } from "../resultError.js";
import { hasBackslashInUrlAuthority } from "../git/githubUrl.js";
import { $j } from "../pathClassification.js";
import { ck } from "../pathResolution.js";

/**
 * 支持的 git URL 形式说明与 scp/主机名正则。
 */
//@ chunk-9qwbw2qr.js:901-1225 placement
var SUPPORTED_GIT_URL_FORMS =
    "https, http, ssh (also written git+ssh or ssh+git), user@host:path, or a local file:// address with no host. git:// isn't supported because it isn't encrypted.",
  SCP_LIKE_GIT_URL_RE = /^(?!-)[A-Za-z0-9._-]+@(?:(?!-)[A-Za-z0-9._-]+|\[[0-9A-Fa-f:.]+\]):(?!\/\/)/,
  GIT_HOST_RE = /^(?:(?!-)[A-Za-z0-9._-]+|\[[0-9A-Fa-f:.]+\])$/,
  GIT_USER_RE = /^(?!-)[A-Za-z0-9._-]+$/;
//@ chunk-9qwbw2qr.js:1225-1295 placement
function D(e) {
  if (e === REDACTED_URL) return e;
  return printableLabel(printableName(e, 200)) || "\u201C\u201D";
}
/**
 * 校验并解析插件 git URL（拒绝控制字符、不安全协议等）。
 */
//@ chunk-9qwbw2qr.js:1295-4793 placement
function parsePluginGitUrl(e) {
  if (/[\u0000-\u001f\u007f]/.test(e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid git URL: ${D(redactUrlQuery(e))} \u2014 control characters are not allowed`,
      "git URL contains control characters",
    );
  if (e.includes("%00"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid git URL: ${D(redactUrlQuery(e))} \u2014 "%00" in a git address means different things to different versions of git, so it is not allowed. Remove it.`,
      "git URL contains %00",
    );
  if (describeUrlScheme(e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid git URL: ${D(redactUrlQuery(e))} \u2014 git can read a square bracket (also written %5B or %5D) as marking a server name or where a local path starts, so it could connect to a different server or open a different folder than this address names. In a server address, brackets may only surround an IPv6 address, as in git@[2001:db8::1]:repo.git. Remove them, or rename the folder whose name has them.`,
      "git URL has a square bracket that git could read as the host",
    );
  if (SCP_LIKE_GIT_URL_RE.test(e)) {
    if (!e.includes("://")) return e;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid git URL: an address written as user@host:path can't contain "://", because git then reads the text before "://" as a protocol name, as in https://. Remove the "://".`,
      "scp-like git URL contains ://",
    );
  }
  let i;
  try {
    i = new URL(e);
  } catch {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid git URL: ${D(redactUrlQuery(e))} (it could not be read as a URL). Supported: ${SUPPORTED_GIT_URL_FORMS}`,
      "Invalid git URL",
    );
  }
  if (!["https:", "http:", "ssh:", "file:", "git+ssh:", "ssh+git:"].includes(i.protocol)) {
    let r = redactUrlQuery(e),
      lower = e.slice(0, e.indexOf(":") + 1).toLowerCase();
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      r === e
        ? `Invalid git URL protocol: ${printableLabel(printableName(i.protocol, 40))}. Supported: ${SUPPORTED_GIT_URL_FORMS}`
        : lower !== "" && r.toLowerCase().startsWith(lower)
          ? `Invalid git URL: ${D(r)}. Supported: ${SUPPORTED_GIT_URL_FORMS}`
          : `Invalid git URL. Supported: ${SUPPORTED_GIT_URL_FORMS}`,
      "Invalid git URL protocol",
    );
  }
  if ((i.protocol === "https:" || i.protocol === "http:") && hasBackslashInUrlAuthority(e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid git URL: ${D(redactUrlQuery(e))} \u2014 a backslash before the first "/" can make git connect to a different server than this address names. Remove it, or write it as %5C if it is part of a user name.`,
      "git URL has a backslash in its authority",
    );
  if (["ssh:", "git+ssh:", "ssh+git:"].includes(i.protocol)) {
    let r = /^[a-z][a-z0-9+.-]*:\/\/([^/]*)/i.exec(e)?.[1] ?? "",
      index = r.lastIndexOf("@"),
      s = index === -1 ? void 0 : r.slice(0, index),
      y = index === -1 ? r : r.slice(index + 1),
      h = /^(.*?)(?::([0-9]{1,5}))?$/.exec(y)?.[1] ?? y;
    if (/[?#]/.test(e) || !GIT_HOST_RE.test(h) || (s !== void 0 && !GIT_USER_RE.test(s))) {
      let match = /^[\u0000-\u0020]*[a-z][a-z0-9+.-]*:(?:\/\/)?([^/?#]*)/i.exec(e),
        w = match?.[1] ?? "",
        v = (match?.[0].length ?? 0) - w.length,
        sliced = w.slice(0, Math.max(0, w.lastIndexOf("@"))),
        search = sliced.search(ZDn),
        Y = search !== -1 ? e.slice(0, v) + `${sliced.slice(0, search)}:***` + e.slice(v + sliced.length) : e,
        x = match?.[0].includes("//") === !0,
        K = x && w !== "" && !/:(?!\d+$)|%3a/i.test(w),
        j = (e.includes("@") && !w.includes("@") && !K) || (w.includes("@") && e.includes("@", v + w.length)),
        W =
          /%40/i.test(e) || redactUrlQuery(e) === REDACTED_URL
            ? REDACTED_URL
            : j || !x
              ? redactUrlQuery(e)
              : Y.replace(/[?#][\s\S]*$/, (H) => `${H[0]}***`);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Invalid ssh git URL: the host must be a hostname or bracketed IPv6 literal (optionally :port), the user a plain name, and the URL may not carry ? or # (${D(W)})`,
        "ssh git URL host or user has disallowed characters",
      );
    }
  }
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid git URL: ${D(redactUrlQuery(e))} \u2014 a scheme URL must be spelled scheme://\u2026`,
      "git URL scheme without //",
    );
  if (
    i.protocol === "file:" &&
    ($j(decodeFileUrlPath(e)) ||
      i.host !== "" ||
      /^file:\/\/[^/\\]/i.test(e) ||
      /^file:[\\/]*[\\]/i.test(e) ||
      ck(decodeUrlPathname(i)))
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Refusing git URL ${D(redactUrlQuery(e))}: a file: URL must name a local path (no host, no network-shaped path).${/^file:\/\/[a-z]:/i.test(e) ? " A drive letter such as C: counts as a local path only on Windows." : ""}`,
      "file git URL names a host or network path",
    );
  return e;
}
//@ chunk-9qwbw2qr.js:4793-4912 placement
function decodeFileUrlPath(e) {
  try {
    return decodeURIComponent(e.replace(/^file:\/\//i, ""));
  } catch {
    return "/../malformed-percent-encoding";
  }
}
//@ chunk-9qwbw2qr.js:4912-5013 placement
function decodeUrlPathname(e) {
  try {
    return decodeURIComponent(e.pathname);
  } catch {
    return "//malformed-percent-encoding/";
  }
}

export { parsePluginGitUrl };
