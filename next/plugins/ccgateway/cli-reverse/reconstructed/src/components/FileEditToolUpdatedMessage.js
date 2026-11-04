/**
 * components/FileEditToolUpdatedMessage.tsx
 *
 * 文件编辑成功结果："Added N lines, removed M lines" + 结构化 diff（condensed 模式只显示统计）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FileEditToolUpdatedMessage.tsx
 * pieces: chunk-dcmhvw5a.js (1), chunk-vnfdjr3f.js (5)
 * attribution: fingerprint 2, file-local 2, callgraph-fingerprint 1, layout 1
 */
import { countCharInString } from "../utils/stringUtils.js";
import { count } from "../utils/collections.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { MessageResponse } from "./MessageResponse.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { CtrlOToExpand } from "./CtrlOToExpand.js";
import { StructuredDiffList } from "./StructuredDiffList.js";

//@ chunk-dcmhvw5a.js:383995-384090 fingerprint (2.1.88 match: _temp4, 0.685)
function editSizeOf(script) {
  return {
    bytes: Buffer.byteLength(script, "utf8"),
    lines:
      countCharInString(
        script,
        `
`,
      ) +
      (script.endsWith(`
`)
        ? 0
        : 1),
  };
}
//@ chunk-vnfdjr3f.js:2341-2381 file-local
function isAddedLine(__0) {
  return __0.startsWith("+");
}
//@ chunk-vnfdjr3f.js:2381-2421 callgraph-fingerprint (2.1.88 match: _temp2, 1)
function addAddedLines(acc, hunk) {
  return acc + count(hunk.lines, isAddedLine);
}
//@ chunk-vnfdjr3f.js:2421-2463 file-local
function isRemovedLine(line) {
  return line.startsWith("-");
}
//@ chunk-vnfdjr3f.js:2463-2507 layout
function addRemovedLines(acc, hunk) {
  return acc + count(hunk.lines, isRemovedLine);
}
//@ chunk-vnfdjr3f.js:2507-3881 fingerprint (2.1.88 match: FileEditToolUpdatedMessage, 0.834)
/**
 * 编辑成功消息："Added N lines, removed M lines"，非 condensed 时下方显示 StructuredDiffList。
 */
function FileEditToolUpdatedMessage(props) {
  let $ = useMemoCache(25);
  let { filePath, structuredPatch, firstLine, fileContent, style, verbose, previewHint, collapsed } = props;
  let { columns } = useTerminalSize();
  let numAdditions = structuredPatch.reduce(addAddedLines, 0);
  let numRemovals = structuredPatch.reduce(addRemovedLines, 0);
  let t1;
  if ($[0] !== numAdditions) {
    t1 =
      numAdditions > 0
        ? jsxProd_default_2(Fragment, {
            children: [
              "Added ",
              jsxProd_default(Text, {
                bold: true,
                children: numAdditions,
              }),
              " ",
              numAdditions > 1 ? "lines" : "line",
            ],
          })
        : null;
    $[0] = numAdditions;
    $[1] = t1;
  } else t1 = $[1];
  const t2 = numAdditions > 0 && numRemovals > 0 ? ", " : null;
  let t3;
  if ($[2] !== numAdditions || $[3] !== numRemovals) {
    t3 =
      numRemovals > 0
        ? jsxProd_default_2(Fragment, {
            children: [
              numAdditions === 0 ? "R" : "r",
              "emoved ",
              jsxProd_default(Text, {
                bold: true,
                children: numRemovals,
              }),
              " ",
              numRemovals > 1 ? "lines" : "line",
            ],
          })
        : null;
    $[2] = numAdditions;
    $[3] = numRemovals;
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if ($[5] !== t1 || $[6] !== t2 || $[7] !== t3) {
    t4 = jsxProd_default_2(Text, {
      children: [t1, t2, t3],
    });
    $[5] = t1;
    $[6] = t2;
    $[7] = t3;
    $[8] = t4;
  } else t4 = $[8];
  let text = t4;
  if (previewHint) {
    if (style !== "condensed" && !verbose) {
      let t5;
      if ($[9] !== previewHint) {
        t5 = jsxProd_default(MessageResponse, {
          children: jsxProd_default(Text, {
            dimColor: true,
            children: previewHint,
          }),
        });
        $[9] = previewHint;
        $[10] = t5;
      } else t5 = $[10];
      return t5;
    }
  } else if (style === "condensed" && !verbose) {
    return text;
  } else if (collapsed && !verbose && numAdditions + numRemovals > 0) {
    let expandHint;
    if ($[11] === MEMO_CACHE_SENTINEL) {
      expandHint = jsxProd_default(CtrlOToExpand, {});
      $[11] = expandHint;
    } else expandHint = $[11];
    let collapsedElement;
    if ($[12] !== text) {
      collapsedElement = jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Text, {
          children: [text, " ", expandHint],
        }),
      });
      $[12] = text;
      $[13] = collapsedElement;
    } else collapsedElement = $[13];
    return collapsedElement;
  }
  let summaryElement;
  if ($[14] !== text) {
    summaryElement = jsxProd_default(Text, {
      children: text,
    });
    $[14] = text;
    $[15] = summaryElement;
  } else summaryElement = $[15];
  const width = columns - 12;
  let t7;
  if (
    $[16] !== fileContent ||
    $[17] !== filePath ||
    $[18] !== firstLine ||
    $[19] !== structuredPatch ||
    $[20] !== width
  ) {
    t7 = jsxProd_default(StructuredDiffList, {
      hunks: structuredPatch,
      dim: false,
      width,
      filePath,
      firstLine,
      fileContent,
    });
    $[16] = fileContent;
    $[17] = filePath;
    $[18] = firstLine;
    $[19] = structuredPatch;
    $[20] = width;
    $[21] = t7;
  } else t7 = $[21];
  let t8;
  if ($[22] !== summaryElement || $[23] !== t7) {
    t8 = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [summaryElement, t7],
      }),
    });
    $[22] = summaryElement;
    $[23] = t7;
    $[24] = t8;
  } else t8 = $[24];
  return t8;
}
export { editSizeOf, FileEditToolUpdatedMessage };
