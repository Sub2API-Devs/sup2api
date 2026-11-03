/**
 * services/claudeGateway/accessControl.ts
 *
 * 2.1.316 新增：Claude 网关访问控制
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (2)
 * attribution: placement 2
 */
import { parseIp, ipInRanges, _H } from "./ssrfGuard.js";

/**
 * 从受信代理的 X-Forwarded-For 中自右向左找第一个非受信地址作为客户端 IP；格式错误时返回 badHop。
 */
//@ chunk-1ny7cxrt.js:1336831-1337177 placement
function resolveClientIp(e, t, n) {
  if (!e || n.length === 0) return { clientIp: e };
  let o = parseIp(e);
  if (!o || !ipInRanges(o, n)) return { clientIp: e };
  if (!t) return { clientIp: e };
  let filtered = t
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (let s = filtered.length - 1; s >= 0; s--) {
    let a = filtered[s],
      l = parseIp(_H(a));
    if (!l) return { clientIp: e, badHop: a.slice(0, 100) };
    if (!ipInRanges(l, n)) return { clientIp: l.toString() };
  }
  return { clientIp: e };
}
//@ chunk-1ny7cxrt.js:1337177-1337260 placement
function Nu(e, t) {
  if (!e || t.length === 0) return !1;
  let n = parseIp(e);
  return n !== null && ipInRanges(n, t);
}

export { Nu, resolveClientIp };
