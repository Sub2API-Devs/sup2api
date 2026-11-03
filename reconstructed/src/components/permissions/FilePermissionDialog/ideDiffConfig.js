/**
 * components/permissions/FilePermissionDialog/ideDiffConfig.ts
 *
 * IDE diff 配置：单个编辑的 diff 描述。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/FilePermissionDialog/ideDiffConfig.ts
 * pieces: chunk-s67vc0kc.js (2)
 * attribution: placement 1, fingerprint 1
 */

//@ chunk-s67vc0kc.js:1066-1196 placement = UNDERLINE_STYLES (0.497)
function quoteKind(e) {
  if (e === "'" || (e >= "\u2018" && e <= "\u201B")) return "single";
  if (e === '"' || (e >= "\u201C" && e <= "\u201E")) return "double";
  return null;
}
//@ chunk-s67vc0kc.js:1196-1510 fingerprint = createSingleEditDiffConfig (0.38)
function createSingleEditDiffConfig(e) {
  let t = "";
  let n = null;
  for (let idx = 0; idx < e.length; idx++) {
    let a = e[idx];
    if (a === "`") {
      if (n === "single") t += "``";
      else if (idx + 1 < e.length) {
        t += a + e[idx + 1];
        idx++;
      } else t += a;
      continue;
    }
    let s = quoteKind(a);
    if (n === null) {
      if (s !== null) {
        n = s;
        continue;
      }
      t += a;
    } else if (s === n) {
      if (idx + 1 < e.length && quoteKind(e[idx + 1]) === s) {
        t += e[idx + 1];
        idx++;
        continue;
      }
      n = null;
    } else t += a;
  }
  return t;
}
export { createSingleEditDiffConfig };
