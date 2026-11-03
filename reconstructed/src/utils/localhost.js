/**
 * utils/localhost.ts
 *
 * localhost 判定（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z85fjzh5.js (2)
 * attribution: placement 2
 */

//@ chunk-z85fjzh5.js:191-288 placement
var o = new Set(["localhost", "::1", "[::1]"]),
  n = /^127(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
//@ chunk-z85fjzh5.js:288-330 placement
function pw(t) {
  return o.has(t) || n.test(t);
}

export { pw };
