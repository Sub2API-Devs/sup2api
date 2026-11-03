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
import { isAbsolute, sep } from "path";
import { homedir } from "os";
import { w } from "../../vendor/react/compiler-runtime.js";
import { Se } from "../../vendor/react/cjs/react.production.js";
import { diffDialogSlot, isAbsoluteForPlatform, filePathToUrl } from "../hooks/useWorkspaceDiff.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link } from "../ink/components/Text.js";
import { HIDDEN_PATH_PLACEHOLDER } from "../utils/file.js";
import { truncatePathMiddle } from "../utils/format.js";
import { toSafeFileUrl } from "../services/mcp/xaa.js";
import { hasControlChars } from "../services/policyLimits/complianceTaints.js";

//@ chunk-qwh6zcf0.js:8508-8990 callgraph-witnessed = FilePathLink (0.654)
function FilePathLink(props) {
  let $ = w(9);
  let { filePath, children } = props;
  let s = Se(diffDialogSlot);
  let i = children ?? filePath;
  if (filePathToLink(filePath) || (typeof i === "string" && filePathToLink(i))) {
    let u;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      u = jsxProd_default(Text, {
        dimColor: true,
        children: HIDDEN_PATH_PLACEHOLDER,
      });
      $[0] = u;
    } else u = $[0];
    return u;
  }
  let u;
  if ($[1] !== s || $[2] !== i) {
    u = s !== null && typeof i === "string" ? truncatePathMiddle(i, s) : i;
    $[1] = s;
    $[2] = i;
    $[3] = u;
  } else u = $[3];
  let children_2 = u;
  let D;
  if ($[4] !== filePath) {
    D = isAbsoluteForPlatform(filePath) ? toSafeFileUrl(filePath) : null;
    $[4] = filePath;
    $[5] = D;
  } else D = $[5];
  let k = D;
  let M;
  if ($[6] !== children_2 || $[7] !== k) {
    M =
      k === null
        ? jsxProd_default(Text, {
            children: children_2,
          })
        : jsxProd_default(Link, {
            url: k,
            children: children_2,
          });
    $[6] = children_2;
    $[7] = k;
    $[8] = M;
  } else M = $[8];
  return M;
}
//@ chunk-qwh6zcf0.js:8990-9043 sole-consumer
function filePathToLink(t) {
  let r = expandHomePath(t);
  return isAbsolute(r) ? filePathToUrl(r) : hasControlChars(r);
}
//@ chunk-qwh6zcf0.js:9043-9127 sole-consumer
function expandHomePath(t) {
  if (t === "~") return homedir();
  return t.startsWith("~" + sep) ? homedir() + t.slice(1) : t;
}
export { FilePathLink };
