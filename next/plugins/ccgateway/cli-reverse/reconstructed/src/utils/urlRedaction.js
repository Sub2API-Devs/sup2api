/**
 * utils/urlRedaction.ts
 *
 * 2.1.316 新增：把 URL 里的用户信息、查询里的密钥等敏感片段替换掉的脱敏函数。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-r8hfaqgy.js (1)
 * attribution: placement 1
 */
import {
  anySegmentTokenLike,
  looksRandomToken,
  SEPARATOR_SPLIT_RE,
  isEncodedUrl,
  hasEmbeddedSecret,
  safeDecodeURIComponent,
  userinfoAtIndex,
  looksLikeUrlWithScheme,
  HEADER_SEPARATOR_RE,
  redactUnlessSafe,
} from "../services/mcp/auth.js";
import { countCharInString } from "./stringUtils.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";

//@ chunk-r8hfaqgy.js:4135-5542 placement
/**
 * 脱敏 URL 用于日志：用户名/密码替换为 REDACTED，查询参数与片段中名称看似秘密的键值、令牌形状的值替换为 REDACTED；无法解析时返回 [unparseable url]。
 */
function redactUrlSecrets(url) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return "[unparseable url]";
  }
  let isRelativeUrl = parsedUrl.host === "" && !parsedUrl.href.startsWith(`${parsedUrl.protocol}//`);
  if (parsedUrl.username !== "") parsedUrl.username = "REDACTED";
  if (parsedUrl.password !== "") parsedUrl.password = "REDACTED";
  let redactPair = (pair) => {
    let index = pair.indexOf("=");
    if (index === -1 || /^=*$/.test(pair.slice(index + 1)))
      return anySegmentTokenLike(pair) ? "REDACTED" : pair;
    let segment = pair.slice(0, index);
    return `${anySegmentTokenLike(segment) || (anySegmentTokenLike(pair) && looksRandomToken(segment)) ? "REDACTED" : segment}=REDACTED`;
  };
  let redactSeparated = (segment) =>
    segment
      .split(SEPARATOR_SPLIT_RE)
      .map((part, partIndex) => (partIndex % 2 === 1 ? part : redactPair(part)))
      .join("");
  let redactPathSegment = (segment) => {
    let redacted = redactSeparated(segment);
    if (isEncodedUrl(redacted) || hasEmbeddedSecret(redacted)) return "REDACTED";
    let decoded = redacted;
    for (let idx = 0; idx < 3; idx++) {
      let nextDecoded = safeDecodeURIComponent(decoded);
      if (nextDecoded === decoded) break;
      if (
        redactSeparated(nextDecoded) !== nextDecoded ||
        userinfoAtIndex(nextDecoded) !== -1 ||
        hasEmbeddedSecret(nextDecoded)
      )
        return "REDACTED";
      decoded = nextDecoded;
    }
    return redacted;
  };
  let pathForUserinfo = `${isRelativeUrl ? parsedUrl.protocol : ""}${parsedUrl.pathname}`;
  let userinfoIndex = userinfoAtIndex(pathForUserinfo);
  let redactedPath;
  if (looksLikeUrlWithScheme(parsedUrl.pathname, true)) {
    let index = parsedUrl.pathname.indexOf("/");
    let schemePrefix = `${parsedUrl.protocol}${index === -1 ? parsedUrl.pathname : parsedUrl.pathname.slice(0, index)}`;
    redactedPath =
      isRelativeUrl && userinfoAtIndex(schemePrefix) !== -1
        ? "REDACTED"
        : `${isRelativeUrl ? parsedUrl.protocol : ""}${parsedUrl.pathname.startsWith("/") ? "/" : ""}REDACTED`;
  } else {
    let mapped = parsedUrl.pathname.split("/").map(redactPathSegment);
    if (isRelativeUrl) mapped[0] = `${parsedUrl.protocol}${mapped[0] ?? ""}`;
    if (userinfoIndex !== -1) {
      let slashCountBefore = (index) => countCharInString(pathForUserinfo.slice(0, index), "/");
      let schemeSlashCount = slashCountBefore(pathForUserinfo.indexOf(":"));
      let userinfoSegmentIndex = slashCountBefore(userinfoIndex);
      let userinfoSegment = mapped[userinfoSegmentIndex] ?? "";
      let atSuffix = userinfoSegment.includes("@")
        ? userinfoSegment.slice(userinfoSegment.lastIndexOf("@"))
        : "";
      mapped.splice(schemeSlashCount, userinfoSegmentIndex - schemeSlashCount + 1, `REDACTED${atSuffix}`);
    }
    redactedPath = mapped.join("/");
  }
  if (!isRelativeUrl) {
    parsedUrl.pathname = redactedPath;
    if (HEADER_SEPARATOR_RE.test(parsedUrl.hostname)) parsedUrl.hostname = "REDACTED";
  }
  let paramNames = normalizeCaseForComparison_2(parsedUrl.searchParams.keys());
  let emptyParamNames = new Set(
    [...parsedUrl.searchParams.entries()].filter(([, value]) => value === "").map(([name]) => name),
  );
  let uRLSearchParams = new URLSearchParams();
  for (let paramName of paramNames)
    uRLSearchParams.append(redactUnlessSafe(paramName, !emptyParamNames.has(paramName)), "REDACTED");
  parsedUrl.search = uRLSearchParams.toString();
  parsedUrl.hash = "";
  return isRelativeUrl ? `${redactedPath}${parsedUrl.search}` : parsedUrl.href;
}
export { redactUrlSecrets };
