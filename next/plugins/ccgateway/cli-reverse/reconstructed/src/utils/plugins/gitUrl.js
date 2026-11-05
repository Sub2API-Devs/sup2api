/**
 * utils/plugins/gitUrl.ts
 *
 * 2.1.316 新增：插件 git URL 解析
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-d2msvdm6.js (5)
 * attribution: placement 5
 */
import { REDACTED_URL, redactUrlQuery, COLON_RE } from "../redaction/urlRedaction.js";
import { printableLabel, printableName } from "../printableName.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { describeUrlScheme } from "../resultError.js";
import { hasBackslashInUrlAuthority } from "../git/githubUrl.js";
import { hasDotSegmentAlias } from "../pathClassification.js";
import { isUntrustedLinkPath } from "../pathResolution.js";

//@ chunk-d2msvdm6.js:901-1225 placement
/**
 * 支持的 git URL 形式说明与 scp/主机名正则。
 */
var SUPPORTED_GIT_URL_FORMS =
  "https, http, ssh (also written git+ssh or ssh+git), user@host:path, or a local file:// address with no host. git:// isn't supported because it isn't encrypted.";
var SCP_LIKE_GIT_URL_RE = /^(?!-)[A-Za-z0-9._-]+@(?:(?!-)[A-Za-z0-9._-]+|\[[0-9A-Fa-f:.]+\]):(?!\/\/)/;
var GIT_HOST_RE = /^(?:(?!-)[A-Za-z0-9._-]+|\[[0-9A-Fa-f:.]+\])$/;
var GIT_USER_RE = /^(?!-)[A-Za-z0-9._-]+$/;
//@ chunk-d2msvdm6.js:1225-1295 placement
function printableUrlLabel(url) {
  if (url === REDACTED_URL) return url;
  return printableLabel(printableName(url, 200)) || "\u201C\u201D";
}
//@ chunk-d2msvdm6.js:1295-4793 placement
/**
 * 校验并解析插件 git URL（拒绝控制字符、不安全协议等）。
 */
function parsePluginGitUrl(rawUrl) {
  if (/[\u0000-\u001f\u007f]/.test(rawUrl))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid git URL: ${printableUrlLabel(redactUrlQuery(rawUrl))} \u2014 control characters are not allowed`,
      "git URL contains control characters",
    );
  if (rawUrl.includes("%00"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid git URL: ${printableUrlLabel(redactUrlQuery(rawUrl))} \u2014 "%00" in a git address means different things to different versions of git, so it is not allowed. Remove it.`,
      "git URL contains %00",
    );
  if (describeUrlScheme(rawUrl))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid git URL: ${printableUrlLabel(redactUrlQuery(rawUrl))} \u2014 git can read a square bracket (also written %5B or %5D) as marking a server name or where a local path starts, so it could connect to a different server or open a different folder than this address names. In a server address, brackets may only surround an IPv6 address, as in git@[2001:db8::1]:repo.git. Remove them, or rename the folder whose name has them.`,
      "git URL has a square bracket that git could read as the host",
    );
  if (SCP_LIKE_GIT_URL_RE.test(rawUrl)) {
    if (!rawUrl.includes("://")) return rawUrl;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid git URL: an address written as user@host:path can't contain "://", because git then reads the text before "://" as a protocol name, as in https://. Remove the "://".`,
      "scp-like git URL contains ://",
    );
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid git URL: ${printableUrlLabel(redactUrlQuery(rawUrl))} (it could not be read as a URL). Supported: ${SUPPORTED_GIT_URL_FORMS}`,
      "Invalid git URL",
    );
  }
  if (!["https:", "http:", "ssh:", "file:", "git+ssh:", "ssh+git:"].includes(parsedUrl.protocol)) {
    let redacted = redactUrlQuery(rawUrl);
    let lower = rawUrl.slice(0, rawUrl.indexOf(":") + 1).toLowerCase();
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      redacted === rawUrl
        ? `Invalid git URL protocol: ${printableLabel(printableName(parsedUrl.protocol, 40))}. Supported: ${SUPPORTED_GIT_URL_FORMS}`
        : lower !== "" && redacted.toLowerCase().startsWith(lower)
          ? `Invalid git URL: ${printableUrlLabel(redacted)}. Supported: ${SUPPORTED_GIT_URL_FORMS}`
          : `Invalid git URL. Supported: ${SUPPORTED_GIT_URL_FORMS}`,
      "Invalid git URL protocol",
    );
  }
  if (
    (parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:") &&
    hasBackslashInUrlAuthority(rawUrl)
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid git URL: ${printableUrlLabel(redactUrlQuery(rawUrl))} \u2014 a backslash before the first "/" can make git connect to a different server than this address names. Remove it, or write it as %5C if it is part of a user name.`,
      "git URL has a backslash in its authority",
    );
  if (["ssh:", "git+ssh:", "ssh+git:"].includes(parsedUrl.protocol)) {
    let authority = /^[a-z][a-z0-9+.-]*:\/\/([^/]*)/i.exec(rawUrl)?.[1] ?? "";
    let index = authority.lastIndexOf("@");
    let userPart = index === -1 ? undefined : authority.slice(0, index);
    let hostPart = index === -1 ? authority : authority.slice(index + 1);
    let host = /^(.*?)(?::([0-9]{1,5}))?$/.exec(hostPart)?.[1] ?? hostPart;
    if (
      /[?#]/.test(rawUrl) ||
      !GIT_HOST_RE.test(host) ||
      (userPart !== undefined && !GIT_USER_RE.test(userPart))
    ) {
      let match = /^[\u0000-\u0020]*[a-z][a-z0-9+.-]*:(?:\/\/)?([^/?#]*)/i.exec(rawUrl);
      let authorityText = match?.[1] ?? "";
      let prefixLength = (match?.[0].length ?? 0) - authorityText.length;
      let sliced = authorityText.slice(0, Math.max(0, authorityText.lastIndexOf("@")));
      let colonIndex = sliced.search(COLON_RE);
      let maskedUrl =
        colonIndex !== -1
          ? rawUrl.slice(0, prefixLength) +
            `${sliced.slice(0, colonIndex)}:***` +
            rawUrl.slice(prefixLength + sliced.length)
          : rawUrl;
      let hasSlashes = match?.[0].includes("//") === true;
      let looksLikeHostWithPort = hasSlashes && authorityText !== "" && !/:(?!\d+$)|%3a/i.test(authorityText);
      let strayAtSign =
        (rawUrl.includes("@") && !authorityText.includes("@") && !looksLikeHostWithPort) ||
        (authorityText.includes("@") && rawUrl.includes("@", prefixLength + authorityText.length));
      let shownUrl =
        /%40/i.test(rawUrl) || redactUrlQuery(rawUrl) === REDACTED_URL
          ? REDACTED_URL
          : strayAtSign || !hasSlashes
            ? redactUrlQuery(rawUrl)
            : maskedUrl.replace(/[?#][\s\S]*$/, (queryFragment) => `${queryFragment[0]}***`);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Invalid ssh git URL: the host must be a hostname or bracketed IPv6 literal (optionally :port), the user a plain name, and the URL may not carry ? or # (${printableUrlLabel(shownUrl)})`,
        "ssh git URL host or user has disallowed characters",
      );
    }
  }
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(rawUrl))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid git URL: ${printableUrlLabel(redactUrlQuery(rawUrl))} \u2014 a scheme URL must be spelled scheme://\u2026`,
      "git URL scheme without //",
    );
  if (
    parsedUrl.protocol === "file:" &&
    (hasDotSegmentAlias(decodeFileUrlPath(rawUrl)) ||
      parsedUrl.host !== "" ||
      /^file:\/\/[^/\\]/i.test(rawUrl) ||
      /^file:[\\/]*[\\]/i.test(rawUrl) ||
      isUntrustedLinkPath(decodeUrlPathname(parsedUrl)))
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Refusing git URL ${printableUrlLabel(redactUrlQuery(rawUrl))}: a file: URL must name a local path (no host, no network-shaped path).${/^file:\/\/[a-z]:/i.test(rawUrl) ? " A drive letter such as C: counts as a local path only on Windows." : ""}`,
      "file git URL names a host or network path",
    );
  return rawUrl;
}
//@ chunk-d2msvdm6.js:4793-4912 placement
function decodeFileUrlPath(url) {
  try {
    return decodeURIComponent(url.replace(/^file:\/\//i, ""));
  } catch {
    return "/../malformed-percent-encoding";
  }
}
//@ chunk-d2msvdm6.js:4912-5013 placement
function decodeUrlPathname(url) {
  try {
    return decodeURIComponent(url.pathname);
  } catch {
    return "//malformed-percent-encoding/";
  }
}
export { parsePluginGitUrl };
