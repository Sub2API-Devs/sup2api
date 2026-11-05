/**
 * components/FilePathLink.tsx
 *
 * 文件路径超链接（file:// OSC 8）组件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FilePathLink.tsx
 * pieces: chunk-e2r2f340.js (3)
 * attribution: callgraph-witnessed 1, sole-consumer 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute, sep } from "path";
import { homedir } from "os";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useContext } from "../../vendor/react/cjs/react.production.js";
import { diffDialogSlot, isAbsoluteForPlatform, filePathToUrl } from "../hooks/useWorkspaceDiff.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link } from "../ink/components/Text.js";
import { HIDDEN_PATH_PLACEHOLDER } from "../utils/file.js";
import { truncatePathMiddle } from "../utils/format.js";
import { toSafeFileUrl } from "../services/mcp/xaa.js";
import { hasControlChars } from "../services/policyLimits/complianceTaints.js";

//@ chunk-e2r2f340.js:8508-8990 callgraph-witnessed (2.1.88 match: FilePathLink, 0.655)
function FilePathLink(props) {
  let $ = useMemoCache(9);
  let { filePath, children } = props;
  let slot = useContext(diffDialogSlot);
  let label = children ?? filePath;
  if (filePathToLink(filePath) || (typeof label === "string" && filePathToLink(label))) {
    let hiddenPlaceholder;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      hiddenPlaceholder = jsxProd_default(Text, {
        dimColor: true,
        children: HIDDEN_PATH_PLACEHOLDER,
      });
      $[0] = hiddenPlaceholder;
    } else hiddenPlaceholder = $[0];
    return hiddenPlaceholder;
  }
  let displayLabelCached;
  if ($[1] !== slot || $[2] !== label) {
    displayLabelCached = slot !== null && typeof label === "string" ? truncatePathMiddle(label, slot) : label;
    $[1] = slot;
    $[2] = label;
    $[3] = displayLabelCached;
  } else displayLabelCached = $[3];
  let children_2 = displayLabelCached;
  let safeUrl;
  if ($[4] !== filePath) {
    safeUrl = isAbsoluteForPlatform(filePath) ? toSafeFileUrl(filePath) : null;
    $[4] = filePath;
    $[5] = safeUrl;
  } else safeUrl = $[5];
  let linkUrl = safeUrl;
  let element;
  if ($[6] !== children_2 || $[7] !== linkUrl) {
    element =
      linkUrl === null
        ? jsxProd_default(Text, {
            children: children_2,
          })
        : jsxProd_default(Link, {
            url: linkUrl,
            children: children_2,
          });
    $[6] = children_2;
    $[7] = linkUrl;
    $[8] = element;
  } else element = $[8];
  return element;
}
//@ chunk-e2r2f340.js:8990-9043 sole-consumer
function filePathToLink(path) {
  let expandedPath = expandHomePath(path);
  return isAbsolute(expandedPath) ? filePathToUrl(expandedPath) : hasControlChars(expandedPath);
}
//@ chunk-e2r2f340.js:9043-9127 sole-consumer
function expandHomePath(path) {
  if (path === "~") return homedir();
  return path.startsWith("~" + sep) ? homedir() + path.slice(1) : path;
}
export { FilePathLink };
