/**
 * utils/errorStackSanitize.ts
 *
 * 2.1.316 新增：错误栈的遥测安全化（只保留 CLI/SDK 自身帧、node_modules 包名）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sycgf9xs.js (24)
 * attribution: placement 23, layout 1
 */
import { homedir, homedir as homedir_2 } from "os";
import { UserResourceUpdateMessage } from "../components/messages/UserResourceUpdateMessage.js";

//@ chunk-sycgf9xs.js:838-861 placement
function kQt(e) {
  return;
}
//@ chunk-sycgf9xs.js:861-883 placement
var tDn = "<user-code>";
//@ chunk-sycgf9xs.js:883-929 placement
function nt() {
  try {
    return homedir();
  } catch {
    return "";
  }
}
//@ chunk-sycgf9xs.js:929-1036 placement
var CLI = "cli",
  _e = new Set(["cli.js", CLI, "sdk.mjs", "browser-sdk.js", "agentSdk.js"]),
  Ee = /^chunk-[0-9a-z]+\.js$/;
//@ chunk-sycgf9xs.js:1036-1090 placement
function Se(e) {
  return e[0] === "/" && Ee.test(e.slice(1));
}
//@ chunk-sycgf9xs.js:1090-1150 placement
function Te(e) {
  return Se(e) || (e[0] === "/" && _e.has(e.slice(1)));
}
//@ chunk-sycgf9xs.js:1150-1188 placement
function UOi(e) {
  return Se(e) ? "/" + CLI : e;
}
//@ chunk-sycgf9xs.js:1188-1260 layout
var rt = /^(?:\/(?:\$bunfs|~BUN)|\/?[A-Za-z]:[\\/](?:\$bunfs|~BUN))[\\/]/;
//@ chunk-sycgf9xs.js:1260-1336 placement = formatUri (1)
function formatUri_2(uri) {
  let n = uri.startsWith("file://") ? uri.slice(7) : uri;
  return rt.test(n);
}
//@ chunk-sycgf9xs.js:1535-1563 placement
var st = ["src/", "packages/"];
/**
 * 取路径的文件名部分（支持 / 与 \）。
 */
//@ chunk-sycgf9xs.js:1563-1663 placement
function getBaseName(e) {
  let max = Math.max(e.lastIndexOf("/"), e.lastIndexOf("\\"));
  return max === -1 ? e : e.slice(max + 1);
}
//@ chunk-sycgf9xs.js:1663-1733 placement
function DSr(e) {
  return Te(e.file) || st.some((n) => e.file.startsWith(n));
}
//@ chunk-sycgf9xs.js:1733-1880 placement
var RUNTIME_FRAME_PREFIXES = ["node:", "bun:", "internal:"],
  IGNORED_FRAME_PACKAGES = new Set([
    "native",
    "unknown",
    "ws",
    "undici",
    "node-fetch",
    "isomorphic-fetch",
    "vercel_fetch",
    "utf-8-validate",
  ]);
//@ chunk-sycgf9xs.js:1880-1943 placement
function xe(e) {
  return IGNORED_FRAME_PACKAGES.has(e) || RUNTIME_FRAME_PREFIXES.some((n) => e.startsWith(n));
}
//@ chunk-sycgf9xs.js:1943-1977 placement
function Iys(e) {
  return xe(e.file);
}
/**
 * 判断错误栈是否只有外部帧（首个有效帧为未知或 node_modules）。
 */
//@ chunk-sycgf9xs.js:1977-2110 placement
function isStackOnlyExternal(e) {
  let found = e.find((r) => !Iys(r));
  if (found === void 0) return e.length >= ye;
  return found.file === tDn || found.file.startsWith("node_modules/");
}
//@ chunk-sycgf9xs.js:2110-2192 placement
function jOi(e) {
  return Te(e.file) && (e.function == null || e.function === "<anonymous>");
}
//@ chunk-sycgf9xs.js:2192-2496 placement
function shortenNodeModulesPath(e) {
  let parts = e.split(/[/\\]/),
    r = -1;
  for (let c = parts.length - 1; c >= 0; c--)
    if (parts[c] === "node_modules") {
      r = c;
      break;
    }
  if (r === -1 || r >= parts.length - 1) return null;
  let o = parts[r + 1],
    s;
  if (o.startsWith("@")) {
    if (r + 2 >= parts.length) return null;
    s = `${o}/${parts[r + 2]}`;
  } else s = o;
  let at = parts.at(-1);
  if (!at) return null;
  return `node_modules/${s}/${at}`;
}
//@ chunk-sycgf9xs.js:2496-2695 placement
function sanitizeFramePath(e) {
  let n = UserResourceUpdateMessage(e),
    r = getBaseName(n),
    o = shortenNodeModulesPath(n);
  if (
    (_e.has(r) && (o === null || o.startsWith("node_modules/@anthropic-ai/"))) ||
    (formatUri_2(e) && Ee.test(r))
  )
    return "/" + r;
  let s = null;
  if (s) return s;
  if (xe(n)) return n;
  return tDn;
}
//@ chunk-sycgf9xs.js:2695-3141 placement
function sanitizeStackFrame(e) {
  let trimmed = e.trim();
  if (!trimmed.startsWith("at ")) return null;
  let sliced = trimmed.slice(3),
    index = sliced.indexOf(" ("),
    s,
    u;
  if (index !== -1 && sliced.endsWith(")"))
    ((s = sliced.slice(0, index).trim()), (u = sliced.slice(index + 2, -1)));
  else u = sliced.trim();
  if (s) {
    if (
      ((s = s.replace(/^async\s+/, "").replace(/^new\s+/, "")),
      (s = s.replace(/\s*\[as\s+[^\]]+\]$/, "")),
      !s)
    )
      s = void 0;
  }
  let match = u.match(/^(.*):(\d+):(\d+)$/);
  if (!match) return null;
  let [, d, g, f] = match,
    m = sanitizeFramePath(d);
  return { file: m, line: Number(g), column: Number(f), function: m === tDn && s ? tDn : s };
}
//@ chunk-sycgf9xs.js:3141-3151 placement
var ye = 50;
/**
 * 把错误栈逐帧清理为遥测安全格式，最多保留指定帧数。
 */
//@ chunk-sycgf9xs.js:3151-3272 placement
function getSanitizedStackFrames(e, n = ye) {
  let r = [];
  for (let o of stripStackHeader(e).split(`
`)) {
    let s = sanitizeStackFrame(o);
    if (s) {
      if ((r.push(s), r.length >= n)) break;
    }
  }
  return r;
}
/**
 * 去掉错误栈开头的消息部分，只保留帧。
 */
//@ chunk-sycgf9xs.js:3272-3420 placement
function stripStackHeader(e) {
  let n = typeof e.stack === "string" ? e.stack : "",
    r = typeof e.message === "string" ? e.message : "",
    o = formatErrorForTelemetry(n, e.name, r);
  return o === -1 ? n : n.slice(o + 1);
}
//@ chunk-sycgf9xs.js:3420-3842 placement
function formatErrorForTelemetry(e, n, r) {
  let o = (u) =>
    u !== "" &&
    e.startsWith(`${u}
`);
  if (r !== "") {
    let u = typeof n === "string" && n !== "" ? `${n}: ${r}` : "";
    if (u !== "" && o(u)) return u.length;
    let c = `: ${r}`,
      index = e.indexOf(`${c}
`);
    return index > 0 &&
      !e.slice(0, index).includes(`
`)
      ? index + c.length
      : n === "" && o(r)
        ? r.length
        : -1;
  }
  let s =
    n === void 0
      ? "Error"
      : typeof n === "string"
        ? n
        : typeof n === "number" || typeof n === "boolean" || typeof n === "bigint" || n === null
          ? String(n)
          : "";
  return o(s) ? s.length : -1;
}

export {
  stripStackHeader,
  formatUri_2,
  getBaseName,
  nt,
  jOi,
  UOi,
  getSanitizedStackFrames,
  isStackOnlyExternal,
  DSr,
  kQt,
  Iys,
  tDn,
};
