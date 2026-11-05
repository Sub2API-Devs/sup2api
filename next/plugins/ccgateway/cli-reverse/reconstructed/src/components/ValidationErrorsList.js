/**
 * components/ValidationErrorsList.tsx
 *
 * 设置/配置校验错误列表：按文件与路径组织成树显示，并给出修复建议。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ValidationErrorsList.tsx
 * pieces: chunk-27bnjej4.js (5), chunk-9a7hrf78.js (2)
 * attribution: fingerprint 4, file-local 1, layout 1, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHyperlink } from "../utils/hyperlink.js";
import { OSC8_PREFIX } from "../ink/screen.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { LearnMoreLink } from "./LearnMoreLink.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { cleanForDisplay } from "../utils/stringUtils.js";
import { TreeConnectors } from "./design-system/TreeConnectors.js";
import { renderErrorNode } from "../ink/layout/yoga.js";

//@ chunk-9a7hrf78.js:1056-1104 affinity
var URL_RE = /https?:\/\/[^\s"'<>\\\x00-\x1f]+/g;
var MAX_VALIDATION_TEXT = 1e5;
//@ chunk-9a7hrf78.js:1104-1296 fingerprint (2.1.88 match: ValidationErrorsList, 0.308)
function ValidationErrorsList_2(text, themeName) {
  if (text.length > MAX_VALIDATION_TEXT) return text;
  let linkify = (segment) =>
    segment.replace(URL_RE, (file_0) =>
      createHyperlink(file_0, undefined, {
        themeName,
      }),
    );
  if (!text.includes(OSC8_PREFIX)) return linkify(text);
  return text
    .split(
      `
`,
    )
    .map((error_0) => (error_0.includes(OSC8_PREFIX) ? error_0 : linkify(error_0))).join(`
`);
}
//@ chunk-27bnjej4.js:14825-14918 fingerprint (2.1.88 match: _temp, 1)
function groupErrorsByFile(acc, error) {
  let file = error.file || "(file not specified)";
  if (!acc[file]) acc[file] = [];
  acc[file].push(error);
  return acc;
}
//@ chunk-27bnjej4.js:14918-15038 file-local
function compareByPath(a, b) {
  if (!a.path && b.path) {
    return -1;
  }
  if (a.path && !b.path) {
    return 1;
  }
  return (a.path || "").localeCompare(b.path || "");
}
//@ chunk-27bnjej4.js:15200-15403 fingerprint (2.1.88 match: _temp3, 1)
function renderSuggestionPair(pair, index) {
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "column",
      marginBottom: 1,
      children: [
        pair.suggestion &&
          jsxProd_default(Text, {
            dimColor: true,
            wrap: "wrap",
            children: pair.suggestion,
          }),
        pair.docLink &&
          jsxProd_default(LearnMoreLink, {
            url: pair.docLink,
          }),
      ],
    },
    `suggestion-pair-${index}`,
  );
}
//@ chunk-27bnjej4.js:15403-16155 layout
/**
 * 校验错误列表：按文件分组、按路径排序，以树形显示错误，并汇总去重后的修复建议与文档链接。
 */
function ValidationErrorsList(props) {
  let $ = useMemoCache(8);
  let { errors } = props;
  if (errors.length === 0) {
    return null;
  }
  let Container;
  let direction;
  let fileGroups;
  if ($[0] !== errors) {
    let errorsByFile = errors.reduce(groupErrorsByFile, {});
    let sortedFiles = Object.keys(errorsByFile).sort();
    Container = Box;
    direction = "column";
    fileGroups = sortedFiles.map((file) => {
      let fileErrors = errorsByFile[file] || [];
      fileErrors.sort(compareByPath);
      let suggestions = new Map();
      fileErrors.forEach((error) => {
        if (error.suggestion || error.docLink) {
          let suggestionKey = `${error.suggestion || ""}|${error.docLink || ""}`;
          if (!suggestions.has(suggestionKey))
            suggestions.set(suggestionKey, {
              suggestion: error.suggestion,
              docLink: error.docLink,
            });
        }
      });
      return jsxProd_default_2(
        Box,
        {
          flexDirection: "column",
          children: [
            jsxProd_default(Text, {
              children: cleanForDisplay(file),
            }),
            jsxProd_default(TreeConnectors, {
              variant: "tree",
              children: fileErrors.map(renderErrorNode),
            }),
            suggestions.size > 0 &&
              jsxProd_default(Box, {
                flexDirection: "column",
                marginTop: 1,
                children: Array.from(suggestions.values()).map(renderSuggestionPair),
              }),
          ],
        },
        file,
      );
    });
    $[0] = errors;
    $[1] = Container;
    $[2] = direction;
    $[3] = fileGroups;
  } else {
    Container = $[1];
    direction = $[2];
    fileGroups = $[3];
  }
  let content;
  if ($[4] !== Container || $[5] !== direction || $[6] !== fileGroups) {
    content = jsxProd_default(Container, {
      flexDirection: direction,
      children: fileGroups,
    });
    $[4] = Container;
    $[5] = direction;
    $[6] = fileGroups;
    $[7] = content;
  } else content = $[7];
  return content;
}
//@ chunk-27bnjej4.js:16155-16454 fingerprint (2.1.88 match: buildNestedTree, 0.35)
function buildNestedTree(errors) {
  if (!errors.path) return null;
  let pathParts = errors.path.split(".");
  let part = pathParts[pathParts.length - 1];
  if (
    errors.invalidValue !== null &&
    errors.invalidValue !== undefined &&
    part !== undefined &&
    !isNaN(parseInt(part, 10))
  ) {
    let valueLabel =
      typeof errors.invalidValue === "string" ? `"${errors.invalidValue}"` : String(errors.invalidValue);
    return [...pathParts.slice(0, -1), valueLabel].join(".");
  }
  return errors.path;
}
export { buildNestedTree, ValidationErrorsList, ValidationErrorsList_2 };
