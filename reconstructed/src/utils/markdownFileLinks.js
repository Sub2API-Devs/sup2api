/**
 * utils/markdownFileLinks.ts
 *
 * 2.1.316 新增：markdown 文件链接转路径。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6vnxsn99.js (2)
 * attribution: placement 2
 */
import { isAbsolute, resolve } from "path";
import { isUncOrDevicePath } from "./pathClassification.js";
import { getCwd } from "./cwd.js";
import { toSafeFileUrl } from "../services/mcp/xaa.js";
import { isUnsafeFileUrl } from "./pathSanitize.js";

//@ chunk-6vnxsn99.js:72708-73149 placement
function fileUrlToPath(url) {
  let matches = /^file:/i.test(url);
  if (!matches) {
    if (!(url.startsWith("/") && !isUncOrDevicePath(url))) return url;
  }
  let remainder = matches ? url.slice(5) : url;
  if (remainder.startsWith("//")) {
    remainder = remainder.slice(2);
    if (remainder === "localhost") remainder = "/";
    else if (remainder.startsWith("localhost/")) remainder = remainder.slice(9);
  }
  let queryIndex = remainder.search(/[#?]/);
  let suffix = queryIndex === -1 ? "" : remainder.slice(queryIndex);
  let decodedPath = queryIndex === -1 ? remainder : remainder.slice(0, queryIndex);
  if (decodedPath === "") return null;
  try {
    decodedPath = decodeURIComponent(decodedPath);
  } catch {}
  decodedPath = stripLeadingSlashBeforeDrive(decodedPath);
  let absolutePath = isAbsolute(decodedPath) ? decodedPath : resolve(getCwd(), decodedPath);
  let safeFileUrl = toSafeFileUrl(absolutePath);
  if (safeFileUrl === null) return null;
  let resultUrl = safeFileUrl + suffix;
  return isUnsafeFileUrl(resultUrl) ? null : resultUrl;
}
//@ chunk-6vnxsn99.js:73149-73248 placement
function stripLeadingSlashBeforeDrive(path, isAbsolutePath = isAbsolute) {
  if (/^\/[A-Za-z]:(?=[\\/]|$)/.test(path) && isAbsolutePath(path.slice(1))) return path.slice(1);
  return path;
}
export { fileUrlToPath };
