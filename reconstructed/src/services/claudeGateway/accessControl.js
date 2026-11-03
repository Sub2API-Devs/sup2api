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
import { parseIp, ipInRanges, extractIpFromHost } from "./ssrfGuard.js";

//@ chunk-1ny7cxrt.js:1336831-1337177 placement
/**
 * 从受信代理的 X-Forwarded-For 中自右向左找第一个非受信地址作为客户端 IP；格式错误时返回 badHop。
 */
function resolveClientIp(address, t, cidrList) {
  if (!address || cidrList.length === 0)
    return {
      clientIp: address,
    };
  let o = parseIp(address);
  if (!o || !ipInRanges(o, cidrList))
    return {
      clientIp: address,
    };
  if (!t)
    return {
      clientIp: address,
    };
  let filtered = t
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (let j = filtered.length - 1; j >= 0; j--) {
    let a = filtered[j];
    let l = parseIp(extractIpFromHost(a));
    if (!l)
      return {
        clientIp: address,
        badHop: a.slice(0, 100),
      };
    if (!ipInRanges(l, cidrList))
      return {
        clientIp: l.toString(),
      };
  }
  return {
    clientIp: address,
  };
}
//@ chunk-1ny7cxrt.js:1337177-1337260 placement
/**
 * 判断解析后的 IP 是否落在给定的 CIDR/地址范围内（地址为空或范围为空时返回 false）。
 */
function isIpInRanges(e, cidrList) {
  if (!e || cidrList.length === 0) return false;
  let n = parseIp(e);
  return n !== null && ipInRanges(n, cidrList);
}
export { isIpInRanges, resolveClientIp };
