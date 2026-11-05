/**
 * services/claudeGateway/accessControl.ts
 *
 * 2.1.316 新增：Claude 网关访问控制
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (2)
 * attribution: placement 2
 */
import { parseIp, ipInRanges, extractIpFromHost } from "./ssrfGuard.js";

//@ chunk-1hnjmk23.js:1337794-1338140 placement
/**
 * 从受信代理的 X-Forwarded-For 中自右向左找第一个非受信地址作为客户端 IP；格式错误时返回 badHop。
 */
function resolveClientIp(text, forwardedFor, ranges) {
  if (!text || ranges.length === 0)
    return {
      clientIp: text,
    };
  let addressIp = parseIp(text);
  if (!addressIp || !ipInRanges(addressIp, ranges))
    return {
      clientIp: text,
    };
  if (!forwardedFor)
    return {
      clientIp: text,
    };
  let filtered = forwardedFor
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  for (let j = filtered.length - 1; j >= 0; j--) {
    let hopValue = filtered[j];
    let hopIp = parseIp(extractIpFromHost(hopValue));
    if (!hopIp)
      return {
        clientIp: text,
        badHop: hopValue.slice(0, 100),
      };
    if (!ipInRanges(hopIp, ranges))
      return {
        clientIp: hopIp.toString(),
      };
  }
  return {
    clientIp: text,
  };
}
//@ chunk-1hnjmk23.js:1338140-1338223 placement
/**
 * 判断解析后的 IP 是否落在给定的 CIDR/地址范围内（地址为空或范围为空时返回 false）。
 */
function isIpInRanges(ip, ranges) {
  if (!ip || ranges.length === 0) return false;
  let parsedIp = parseIp(ip);
  return parsedIp !== null && ipInRanges(parsedIp, ranges);
}
export { isIpInRanges, resolveClientIp };
