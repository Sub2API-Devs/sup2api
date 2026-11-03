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
import { j } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { r, Fragment, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { TagTabs } from "./TagTabs.js";
import { formatNumber } from "../utils/format.js";
import { TreeConnectorsRow } from "./design-system/TreeConnectors.js";

//@ chunk-ah34pb7m.js:36053-36057 placement
j();
//@ chunk-ah34pb7m.js:36057-37715 fingerprint = AgentProgressLine (0.716)
function AgentProgressLine(t0) {
  let $ = w(32),
    {
      agentType: agentType,
      description: description,
      name: name,
      descriptionColor: descriptionColor,
      taskDescription: taskDescription,
      toolUseCount: toolUseCount,
      tokens: tokens,
      color: color,
      isLast: isLast,
      isResolved: isResolved,
      isAsync: t1,
      lastToolInfo: lastToolInfo,
      hideType: t2,
    } = t0,
    N = t1 === void 0 ? !1 : t1,
    W = t2 === void 0 ? !1 : t2,
    isBackgrounded = N && isResolved,
    V;
  if ($[0] !== isBackgrounded || $[1] !== isResolved || $[2] !== lastToolInfo || $[3] !== taskDescription)
    ((V = () => {
      if (!isResolved) {
        return lastToolInfo || "Initializing\u2026";
      }
      if (isBackgrounded) {
        return taskDescription ?? "Running in the background";
      }
      return "Done";
    }),
      ($[0] = isBackgrounded),
      ($[1] = isResolved),
      ($[2] = lastToolInfo),
      ($[3] = taskDescription),
      ($[4] = V));
  else V = $[4];
  let getStatusText = V;
  const X = isLast ? "last" : "branch";
  let z;
  if ($[5] !== X) ((z = [X]), ($[5] = X), ($[6] = z));
  else z = $[6];
  const t5 = !isResolved;
  let le;
  if (
    $[7] !== agentType ||
    $[8] !== color ||
    $[9] !== description ||
    $[10] !== descriptionColor ||
    $[11] !== W ||
    $[12] !== name
  )
    ((le = W
      ? r(Fragment, {
          children: [
            e(Text, { bold: !0, children: name ?? description ?? agentType }),
            name && description && r(Text, { dimColor: !0, children: [": ", description] }),
          ],
        })
      : r(Fragment, {
          children: [
            e(TagTabs, { color: color, bold: !0, children: agentType }),
            description &&
              r(Fragment, {
                children: [" (", e(TagTabs, { color: descriptionColor, children: description }), ")"],
              }),
          ],
        })),
      ($[7] = agentType),
      ($[8] = color),
      ($[9] = description),
      ($[10] = descriptionColor),
      ($[11] = W),
      ($[12] = name),
      ($[13] = le));
  else le = $[13];
  let ge;
  if ($[14] !== isBackgrounded || $[15] !== tokens || $[16] !== toolUseCount)
    ((ge =
      !isBackgrounded &&
      r(Fragment, {
        children: [
          " \xB7 ",
          toolUseCount,
          " tool ",
          toolUseCount === 1 ? "use" : "uses",
          tokens !== null && r(Fragment, { children: [" \xB7 ", formatNumber(tokens), " tokens"] }),
        ],
      })),
      ($[14] = isBackgrounded),
      ($[15] = tokens),
      ($[16] = toolUseCount),
      ($[17] = ge));
  else ge = $[17];
  let ae;
  if ($[18] !== t5 || $[19] !== le || $[20] !== ge)
    ((ae = r(Text, { dimColor: t5, children: [le, ge] })),
      ($[18] = t5),
      ($[19] = le),
      ($[20] = ge),
      ($[21] = ae));
  else ae = $[21];
  let pe;
  if ($[22] !== z || $[23] !== ae)
    ((pe = e(TreeConnectorsRow, { connectors: z, children: ae })), ($[22] = z), ($[23] = ae), ($[24] = pe));
  else pe = $[24];
  let te;
  if ($[25] !== getStatusText || $[26] !== isBackgrounded || $[27] !== isLast)
    ((te =
      !isBackgrounded &&
      e(TreeConnectorsRow, {
        connectors: [isLast ? "space" : "pipe"],
        children: r(Text, { dimColor: !0, children: ["\u23BF  ", getStatusText()] }),
      })),
      ($[25] = getStatusText),
      ($[26] = isBackgrounded),
      ($[27] = isLast),
      ($[28] = te));
  else te = $[28];
  let de;
  if ($[29] !== pe || $[30] !== te)
    ((de = r(Box, { flexDirection: "column", paddingLeft: 3, children: [pe, te] })),
      ($[29] = pe),
      ($[30] = te),
      ($[31] = de));
  else de = $[31];
  return de;
}

export { AgentProgressLine };
