/**
 * components/permissions/WorkerPendingPermission.tsx
 *
 * 队友等待领导批准权限时的占位显示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/WorkerPendingPermission.tsx
 * pieces: chunk-czq1j3j2.js (2), chunk-qq0rce8p.js (1)
 * attribution: placement 2, fingerprint 1
 */
import { taskDescriptionSuffix } from "../../tasks/endedByModel.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { toInkColor } from "../../utils/ink.js";
import { BLACK_CIRCLE } from "../../constants/figures.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getTeamName, getAgentName, getTeammateColor } from "../../utils/teammate.js";
import { Spinner } from "../Spinner.js";
import { ShutdownRequestDisplay } from "../messages/ShutdownMessage.js";

//@ chunk-qq0rce8p.js:4782-5024 fingerprint (2.1.88 match: WorkerPendingPermission, 0.588)
function WorkerPendingPermission_2(t0) {
  if (!t0.ended) return null;
  let taskSuffix = taskDescriptionSuffix();
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    borderStyle: "round",
    borderColor: "subtle",
    paddingX: 1,
    marginTop: 1,
    children: [
      jsxProd_default(Text, {
        color: "text",
        children: t0.message,
      }),
      taskSuffix !== "" &&
        jsxProd_default(Text, {
          color: "subtle",
          children: taskSuffix,
        }),
    ],
  });
}
//@ chunk-czq1j3j2.js:456403-456804 placement
function LabeledRow(props) {
  let $ = useMemoCache(8);
  let { name, color } = props;
  let inkColor;
  if ($[0] !== color) {
    inkColor = toInkColor(color);
    $[0] = color;
    $[1] = inkColor;
  } else inkColor = $[1];
  let color_2 = inkColor;
  const ariaLabel = `@${name}`;
  let nameElement;
  if ($[2] !== name) {
    nameElement = jsxProd_default_2(Text, {
      bold: true,
      children: ["@", name],
    });
    $[2] = name;
    $[3] = nameElement;
  } else nameElement = $[3];
  let badgeElement;
  if ($[4] !== color_2 || $[5] !== ariaLabel || $[6] !== nameElement) {
    badgeElement = jsxProd_default(Box, {
      flexDirection: "row",
      gap: 1,
      children: jsxProd_default_2(Text, {
        "aria-label": ariaLabel,
        color: color_2,
        children: [BLACK_CIRCLE, " ", nameElement],
      }),
    });
    $[4] = color_2;
    $[5] = ariaLabel;
    $[6] = nameElement;
    $[7] = badgeElement;
  } else badgeElement = $[7];
  return badgeElement;
}
//@ chunk-czq1j3j2.js:456804-457970 placement
function WorkerPendingPermission(props) {
  let $ = useMemoCache(15);
  let { toolName, description } = props;
  let teamName;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    teamName = getTeamName();
    $[0] = teamName;
  } else teamName = $[0];
  let teamNameValue = teamName;
  let agentName;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    agentName = getAgentName();
    $[1] = agentName;
  } else agentName = $[1];
  let agentNameValue = agentName;
  let teammateColor;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    teammateColor = getTeammateColor();
    $[2] = teammateColor;
  } else teammateColor = $[2];
  let teammateColorValue = teammateColor;
  let waitingElement;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    waitingElement = jsxProd_default_2(Box, {
      children: [
        jsxProd_default(Spinner, {}),
        jsxProd_default_2(Text, {
          bold: true,
          color: "warning",
          children: [" ", "Waiting for team lead approval"],
        }),
      ],
    });
    $[3] = waitingElement;
  } else waitingElement = $[3];
  let agentRow;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    agentRow =
      agentNameValue &&
      teammateColorValue &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(LabeledRow, {
          name: agentNameValue,
          color: teammateColorValue,
        }),
      });
    $[4] = agentRow;
  } else agentRow = $[4];
  let toolLabel;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    toolLabel = jsxProd_default(Text, {
      dimColor: true,
      children: "Tool: ",
    });
    $[5] = toolLabel;
  } else toolLabel = $[5];
  let toolRow;
  if ($[6] !== toolName) {
    toolRow = jsxProd_default_2(Box, {
      children: [
        toolLabel,
        jsxProd_default(Text, {
          children: toolName,
        }),
      ],
    });
    $[6] = toolName;
    $[7] = toolRow;
  } else toolRow = $[7];
  let actionLabel;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    actionLabel = jsxProd_default(Text, {
      dimColor: true,
      children: "Action: ",
    });
    $[8] = actionLabel;
  } else actionLabel = $[8];
  let actionRow;
  if ($[9] !== description) {
    actionRow = jsxProd_default_2(Box, {
      children: [
        actionLabel,
        jsxProd_default(Text, {
          children: description,
        }),
      ],
    });
    $[9] = description;
    $[10] = actionRow;
  } else actionRow = $[10];
  let teamNote;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    teamNote =
      teamNameValue &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Permission request sent to team ", '"', teamNameValue, '"', " leader"],
        }),
      });
    $[11] = teamNote;
  } else teamNote = $[11];
  let displayElement;
  if ($[12] !== toolRow || $[13] !== actionRow) {
    displayElement = jsxProd_default_2(ShutdownRequestDisplay, {
      color: "warning",
      children: [
        waitingElement,
        jsxProd_default_2(Box, {
          flexDirection: "column",
          marginTop: 1,
          children: [agentRow, toolRow, actionRow, teamNote],
        }),
      ],
    });
    $[12] = toolRow;
    $[13] = actionRow;
    $[14] = displayElement;
  } else displayElement = $[14];
  return displayElement;
}
export { WorkerPendingPermission, WorkerPendingPermission_2 };
