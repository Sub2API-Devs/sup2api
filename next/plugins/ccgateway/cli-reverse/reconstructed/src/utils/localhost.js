/**
 * utils/localhost.ts
 *
 * localhost 判定（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z3d4231c.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-z3d4231c.js:191-288 placement
var LOCALHOST_NAMES = new Set(["localhost", "::1", "[::1]"]);
var LOOPBACK_IPV4_RE = /^127(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
//@ chunk-z3d4231c.js:288-330 placement
/**
 * 判断主机名是否为 localhost/回环 IPv4。
 */
function isLoopbackHost(hostname) {
  return LOCALHOST_NAMES.has(hostname) || LOOPBACK_IPV4_RE.test(hostname);
}
export { isLoopbackHost };
