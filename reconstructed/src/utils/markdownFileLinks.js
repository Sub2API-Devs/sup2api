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
function fileUrlToPath(e) {
  let matches = /^file:/i.test(e);
  if (!matches) {
    if (!(e.startsWith("/") && !isUncOrDevicePath(e))) return e;
  }
  let r = matches ? e.slice(5) : e;
  if (r.startsWith("//")) {
    r = r.slice(2);
    if (r === "localhost") r = "/";
    else if (r.startsWith("localhost/")) r = r.slice(9);
  }
  let o = r.search(/[#?]/);
  let s = o === -1 ? "" : r.slice(o);
  let a = o === -1 ? r : r.slice(0, o);
  if (a === "") return null;
  try {
    a = decodeURIComponent(a);
  } catch {}
  a = stripLeadingSlashBeforeDrive(a);
  let u = isAbsolute(a) ? a : resolve(getCwd(), a);
  let safeFileUrl = toSafeFileUrl(u);
  if (safeFileUrl === null) return null;
  let p = safeFileUrl + s;
  return isUnsafeFileUrl(p) ? null : p;
}
//@ chunk-6vnxsn99.js:73149-73248 placement
function stripLeadingSlashBeforeDrive(e, n = isAbsolute) {
  if (/^\/[A-Za-z]:(?=[\\/]|$)/.test(e) && n(e.slice(1))) return e.slice(1);
  return e;
}
export { fileUrlToPath };
