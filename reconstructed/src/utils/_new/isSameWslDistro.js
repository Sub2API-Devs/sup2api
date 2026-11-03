/**
 * utils/_new/isSameWslDistro.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-j0y6ypnr.js (1)
 * attribution: sole-consumer-new 1
 */

/**
 * 判断 \\wsl$ 或 \\wsl.localhost 路径是否属于给定发行版（非 WSL 路径视为匹配）。
 */
//@ chunk-j0y6ypnr.js:846-953 sole-consumer-new
function isSameWslDistro(t, r) {
  let match = t.match(/^\\\\wsl(?:\.localhost|\$)\\([^\\]+)(.*)$/);
  if (match) return match[1] === r;
  return !0;
}

export { isSameWslDistro };
