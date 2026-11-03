/**
 * components/ValidationErrorsList.tsx
 *
 * 设置/配置校验错误列表：按文件与路径组织成树显示，并给出修复建议。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ValidationErrorsList.tsx
 * pieces: chunk-s3fw2t2g.js (2), chunk-td6byj4s.js (6)
 * attribution: affinity 1, fingerprint 4, file-local 1, layout 2
 */
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { TreeConnectors } from "./design-system/TreeConnectors.js";
import { Text, Box } from "../ink/components/Text.js";
import { LearnMoreLink } from "./LearnMoreLink.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { ql } from "../utils/stringUtils.js";
import { createHyperlink } from "../utils/hyperlink.js";
import { OSC8_PREFIX } from "../ink/screen.js";

//@ chunk-td6byj4s.js:13677-13770 fingerprint = _temp (1)
function te(acc, error) {
  let file = error.file || "(file not specified)";
  if (!acc[file]) acc[file] = [];
  return (acc[file].push(error), acc);
}
//@ chunk-td6byj4s.js:13770-13890 file-local
function compareByPath(a, b) {
  if (!a.path && b.path) {
    return -1;
  }
  if (a.path && !b.path) {
    return 1;
  }
  return (a.path || "").localeCompare(b.path || "");
}
//@ chunk-td6byj4s.js:13890-14052 layout = createYogaLayoutNode (1)
function renderErrorNode(k, F) {
  let C = buildNestedTree(k);
  return e(
    TreeConnectors.Node,
    {
      children: C
        ? r(Text, { children: [C, ": ", e(Text, { dimColor: !0, children: k.message })] })
        : e(Text, { dimColor: !0, children: k.message }),
    },
    F,
  );
}
//@ chunk-td6byj4s.js:14052-14255 fingerprint = _temp3 (1)
function renderSuggestionPair(pair, index) {
  return r(
    Box,
    {
      flexDirection: "column",
      marginBottom: 1,
      children: [
        pair.suggestion && e(Text, { dimColor: !0, wrap: "wrap", children: pair.suggestion }),
        pair.docLink && e(LearnMoreLink, { url: pair.docLink }),
      ],
    },
    `suggestion-pair-${index}`,
  );
}
/**
 * 校验错误列表：按文件分组、按路径排序，以树形显示错误，并汇总去重后的修复建议与文档链接。
 */
//@ chunk-td6byj4s.js:14255-15007 layout
function ValidationErrorsList(o) {
  let $ = w(8),
    { errors: errors } = o;
  if (errors.length === 0) {
    return null;
  }
  let Container, direction, fileGroups;
  if ($[0] !== errors) {
    let reduced = errors.reduce(te, {});
    let sorted = Object.keys(reduced).sort();
    Container = Box;
    direction = "column";
    fileGroups = sorted.map((file) => {
      let fileErrors = reduced[file] || [];
      fileErrors.sort(compareByPath);
      let suggestions = new Map();
      return (
        fileErrors.forEach((error) => {
          if (error.suggestion || error.docLink) {
            let suggestionKey = `${error.suggestion || ""}|${error.docLink || ""}`;
            if (!suggestions.has(suggestionKey))
              suggestions.set(suggestionKey, { suggestion: error.suggestion, docLink: error.docLink });
          }
        }),
        r(
          Box,
          {
            flexDirection: "column",
            children: [
              e(Text, { children: ql(file) }),
              e(TreeConnectors, { variant: "tree", children: fileErrors.map(renderErrorNode) }),
              suggestions.size > 0 &&
                e(Box, {
                  flexDirection: "column",
                  marginTop: 1,
                  children: Array.from(suggestions.values()).map(renderSuggestionPair),
                }),
            ],
          },
          file,
        )
      );
    });
    (($[0] = errors), ($[1] = Container), ($[2] = direction), ($[3] = fileGroups));
  } else ((Container = $[1]), (direction = $[2]), (fileGroups = $[3]));
  let content;
  if ($[4] !== Container || $[5] !== direction || $[6] !== fileGroups)
    ((content = e(Container, { flexDirection: direction, children: fileGroups })),
      ($[4] = Container),
      ($[5] = direction),
      ($[6] = fileGroups),
      ($[7] = content));
  else content = $[7];
  return content;
}
//@ chunk-td6byj4s.js:15007-15306 fingerprint = buildNestedTree (0.35)
function buildNestedTree(errors) {
  if (!errors.path) return null;
  let pathParts = errors.path.split("."),
    part = pathParts[pathParts.length - 1];
  if (
    errors.invalidValue !== null &&
    errors.invalidValue !== void 0 &&
    part !== void 0 &&
    !isNaN(parseInt(part, 10))
  ) {
    let l =
      typeof errors.invalidValue === "string" ? `"${errors.invalidValue}"` : String(errors.invalidValue);
    return [...pathParts.slice(0, -1), l].join(".");
  }
  return errors.path;
}
//@ chunk-s3fw2t2g.js:1056-1104 affinity
var A = /https?:\/\/[^\s"'<>\\\x00-\x1f]+/g,
  C = 1e5;
//@ chunk-s3fw2t2g.js:1104-1296 fingerprint = ValidationErrorsList (0.308)
function ValidationErrorsList_2(r, t) {
  if (r.length > C) return r;
  let s = (o) => o.replace(A, (file_0) => createHyperlink(file_0, void 0, { themeName: t }));
  if (!r.includes(OSC8_PREFIX)) return s(r);
  return r
    .split(
      `
`,
    )
    .map((error_0) => (error_0.includes(OSC8_PREFIX) ? error_0 : s(error_0))).join(`
`);
}

export { ValidationErrorsList_2, ValidationErrorsList };
