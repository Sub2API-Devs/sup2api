/**
 * components/AgentProgressLine.tsx
 *
 * 子代理进度行（树形 ├/└）：agent 类型、描述、工具数、token、"Running in the background"/"Done"。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/AgentProgressLine.tsx
 * pieces: chunk-ah34pb7m.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { TagTabs } from "./TagTabs.js";
import { formatNumber } from "../utils/format.js";
import { TreeConnectorsRow } from "./design-system/TreeConnectors.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ah34pb7m.js:36053-36057 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:36053", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:36057-37715 fingerprint = AgentProgressLine (0.716)
function AgentProgressLine(props) {
  let $ = useMemoCache(32);
  let {
    agentType,
    description,
    name,
    descriptionColor,
    taskDescription,
    toolUseCount,
    tokens,
    color,
    isLast,
    isResolved,
    isAsync,
    lastToolInfo,
    hideType,
  } = props;
  let isAsync_2 = isAsync === undefined ? false : isAsync;
  let hideType_2 = hideType === undefined ? false : hideType;
  let isBackgrounded = isAsync_2 && isResolved;
  let t3;
  if ($[0] !== isBackgrounded || $[1] !== isResolved || $[2] !== lastToolInfo || $[3] !== taskDescription) {
    t3 = () => {
      if (!isResolved) {
        return lastToolInfo || "Initializing\u2026";
      }
      if (isBackgrounded) {
        return taskDescription ?? "Running in the background";
      }
      return "Done";
    };
    $[0] = isBackgrounded;
    $[1] = isResolved;
    $[2] = lastToolInfo;
    $[3] = taskDescription;
    $[4] = t3;
  } else t3 = $[4];
  let getStatusText = t3;
  const treeChar = isLast ? "last" : "branch";
  let connectors;
  if ($[5] !== treeChar) {
    connectors = [treeChar];
    $[5] = treeChar;
    $[6] = connectors;
  } else connectors = $[6];
  const dimColor = !isResolved;
  let t6;
  if (
    $[7] !== agentType ||
    $[8] !== color ||
    $[9] !== description ||
    $[10] !== descriptionColor ||
    $[11] !== hideType_2 ||
    $[12] !== name
  ) {
    t6 = hideType_2
      ? jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: name ?? description ?? agentType,
            }),
            name &&
              description &&
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [": ", description],
              }),
          ],
        })
      : jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(TagTabs, {
              color,
              bold: true,
              children: agentType,
            }),
            description &&
              jsxProd_default_2(Fragment, {
                children: [
                  " (",
                  jsxProd_default(TagTabs, {
                    color: descriptionColor,
                    children: description,
                  }),
                  ")",
                ],
              }),
          ],
        });
    $[7] = agentType;
    $[8] = color;
    $[9] = description;
    $[10] = descriptionColor;
    $[11] = hideType_2;
    $[12] = name;
    $[13] = t6;
  } else t6 = $[13];
  let t7;
  if ($[14] !== isBackgrounded || $[15] !== tokens || $[16] !== toolUseCount) {
    t7 =
      !isBackgrounded &&
      jsxProd_default_2(Fragment, {
        children: [
          " \xB7 ",
          toolUseCount,
          " tool ",
          toolUseCount === 1 ? "use" : "uses",
          tokens !== null &&
            jsxProd_default_2(Fragment, {
              children: [" \xB7 ", formatNumber(tokens), " tokens"],
            }),
        ],
      });
    $[14] = isBackgrounded;
    $[15] = tokens;
    $[16] = toolUseCount;
    $[17] = t7;
  } else t7 = $[17];
  let children;
  if ($[18] !== dimColor || $[19] !== t6 || $[20] !== t7) {
    children = jsxProd_default_2(Text, {
      dimColor,
      children: [t6, t7],
    });
    $[18] = dimColor;
    $[19] = t6;
    $[20] = t7;
    $[21] = children;
  } else children = $[21];
  let headerRow;
  if ($[22] !== connectors || $[23] !== children) {
    headerRow = jsxProd_default(TreeConnectorsRow, {
      connectors,
      children,
    });
    $[22] = connectors;
    $[23] = children;
    $[24] = headerRow;
  } else headerRow = $[24];
  let statusRow;
  if ($[25] !== getStatusText || $[26] !== isBackgrounded || $[27] !== isLast) {
    statusRow =
      !isBackgrounded &&
      jsxProd_default(TreeConnectorsRow, {
        connectors: [isLast ? "space" : "pipe"],
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: ["\u23BF  ", getStatusText()],
        }),
      });
    $[25] = getStatusText;
    $[26] = isBackgrounded;
    $[27] = isLast;
    $[28] = statusRow;
  } else statusRow = $[28];
  let t11;
  if ($[29] !== headerRow || $[30] !== statusRow) {
    t11 = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingLeft: 3,
      children: [headerRow, statusRow],
    });
    $[29] = headerRow;
    $[30] = statusRow;
    $[31] = t11;
  } else t11 = $[31];
  return t11;
}
export { AgentProgressLine };
