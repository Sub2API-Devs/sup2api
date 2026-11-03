/**
 * components/FilePathLink.tsx
 *
 * 文件路径超链接（file:// OSC 8）组件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FilePathLink.tsx
 * pieces: chunk-qwh6zcf0.js (3)
 * attribution: callgraph-witnessed 1, sole-consumer 2
 */
import { isAbsolute, isAbsolute as isAbsolute_2, sep, sep as sep_2 } from "path";
import { homedir } from "os";
import { w } from "../../vendor/react/compiler-runtime.js";
import { Se } from "../../vendor/react/cjs/react.production.js";
import { vFn, L, ztn } from "../hooks/useWorkspaceDiff.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link } from "../ink/components/Text.js";
import { HIDDEN_PATH_PLACEHOLDER } from "../utils/file.js";
import { truncatePathMiddle } from "../utils/format.js";
import { toSafeFileUrl } from "../services/mcp/xaa.js";
import { hasControlChars } from "../services/policyLimits/complianceTaints.js";

//@ chunk-qwh6zcf0.js:8508-8990 callgraph-witnessed = FilePathLink (0.654)
function FilePathLink(t0) {
  let $ = w(9),
    { filePath: filePath, children: children } = t0,
    s = Se(vFn),
    i = children ?? filePath;
  if (E(filePath) || (typeof i === "string" && E(i))) {
    let u;
    if ($[0] === MEMO_CACHE_SENTINEL)
      ((u = e(Text, { dimColor: !0, children: HIDDEN_PATH_PLACEHOLDER })), ($[0] = u));
    else u = $[0];
    return u;
  }
  let u;
  if ($[1] !== s || $[2] !== i)
    ((u = s !== null && typeof i === "string" ? truncatePathMiddle(i, s) : i),
      ($[1] = s),
      ($[2] = i),
      ($[3] = u));
  else u = $[3];
  let p = u,
    D;
  if ($[4] !== filePath) ((D = L(filePath) ? toSafeFileUrl(filePath) : null), ($[4] = filePath), ($[5] = D));
  else D = $[5];
  let k = D,
    M;
  if ($[6] !== p || $[7] !== k)
    ((M = k === null ? e(Text, { children: p }) : e(Link, { url: k, children: p })),
      ($[6] = p),
      ($[7] = k),
      ($[8] = M));
  else M = $[8];
  return M;
}
//@ chunk-qwh6zcf0.js:8990-9043 sole-consumer
function E(t) {
  let r = Fe(t);
  return isAbsolute(r) ? ztn(r) : hasControlChars(r);
}
//@ chunk-qwh6zcf0.js:9043-9127 sole-consumer
function Fe(t) {
  if (t === "~") return homedir();
  return t.startsWith("~" + sep_2) ? homedir() + t.slice(1) : t;
}

export { FilePathLink };
