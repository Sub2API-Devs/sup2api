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
import { isAbsolute, isAbsolute as isAbsolute_2, resolve, resolve as resolve_2 } from "path";
import { Qn } from "./pathClassification.js";
import { getCwd } from "./cwd.js";
import { toSafeFileUrl } from "../services/mcp/xaa.js";
import { ves } from "./pathSanitize.js";

//@ chunk-6vnxsn99.js:72708-73149 placement
function fileUrlToPath(e) {
  let matches = /^file:/i.test(e);
  if (!matches) {
    if (!(e.startsWith("/") && !Qn(e))) return e;
  }
  let r = matches ? e.slice(5) : e;
  if (r.startsWith("//")) {
    if (((r = r.slice(2)), r === "localhost")) r = "/";
    else if (r.startsWith("localhost/")) r = r.slice(9);
  }
  let search = r.search(/[#?]/),
    s = search === -1 ? "" : r.slice(search),
    a = search === -1 ? r : r.slice(0, search);
  if (a === "") return null;
  try {
    a = decodeURIComponent(a);
  } catch {}
  a = Po(a);
  let u = isAbsolute_2(a) ? a : resolve_2(getCwd(), a),
    h = toSafeFileUrl(u);
  if (h === null) return null;
  let p = h + s;
  return ves(p) ? null : p;
}
//@ chunk-6vnxsn99.js:73149-73248 placement
function Po(e, n = isAbsolute_2) {
  if (/^\/[A-Za-z]:(?=[\\/]|$)/.test(e) && n(e.slice(1))) return e.slice(1);
  return e;
}

export { fileUrlToPath };
