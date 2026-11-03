/**
 * components/permissions/WorkerPendingPermission.tsx
 *
 * 队友等待领导批准权限时的占位显示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/WorkerPendingPermission.tsx
 * pieces: chunk-18hwfzwa.js (2), chunk-cckztz9w.js (1)
 * attribution: placement 2, fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { toInkColor } from "../../utils/ink.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getTeamName, getAgentName, getTeammateColor } from "../../utils/teammate.js";
import { Spinner } from "../Spinner.js";
import { ShutdownRequestDisplay } from "../messages/ShutdownMessage.js";
import { taskDescriptionSuffix } from "../../tasks/endedByModel.js";

//@ chunk-18hwfzwa.js:431571-431972 placement
function LabeledRow(props) {
  let $ = w(8);
  let { name: x, color } = props;
  let ee;
  if ($[0] !== color) {
    ee = toInkColor(color);
    $[0] = color;
    $[1] = ee;
  } else ee = $[1];
  let color_2 = ee;
  const Re = `@${x}`;
  let Be;
  if ($[2] !== x) {
    Be = jsxProd_default_2(Text, {
      bold: true,
      children: ["@", x],
    });
    $[2] = x;
    $[3] = Be;
  } else Be = $[3];
  let He;
  if ($[4] !== color_2 || $[5] !== Re || $[6] !== Be) {
    He = jsxProd_default(Box, {
      flexDirection: "row",
      gap: 1,
      children: jsxProd_default_2(Text, {
        "aria-label": Re,
        color: color_2,
        children: [BLACK_CIRCLE, " ", Be],
      }),
    });
    $[4] = color_2;
    $[5] = Re;
    $[6] = Be;
    $[7] = He;
  } else He = $[7];
  return He;
}
//@ chunk-18hwfzwa.js:431972-433138 placement
function WorkerPendingPermission(props) {
  let $ = w(15);
  let { toolName, description } = props;
  let ee;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    ee = getTeamName();
    $[0] = ee;
  } else ee = $[0];
  let ke = ee;
  let Re;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    Re = getAgentName();
    $[1] = Re;
  } else Re = $[1];
  let Be = Re;
  let He;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    He = getTeammateColor();
    $[2] = He;
  } else He = $[2];
  let We = He;
  let ze;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    ze = jsxProd_default_2(Box, {
      children: [
        jsxProd_default(Spinner, {}),
        jsxProd_default_2(Text, {
          bold: true,
          color: "warning",
          children: [" ", "Waiting for team lead approval"],
        }),
      ],
    });
    $[3] = ze;
  } else ze = $[3];
  let Xe;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    Xe =
      Be &&
      We &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(LabeledRow, {
          name: Be,
          color: We,
        }),
      });
    $[4] = Xe;
  } else Xe = $[4];
  let rt;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    rt = jsxProd_default(Text, {
      dimColor: true,
      children: "Tool: ",
    });
    $[5] = rt;
  } else rt = $[5];
  let kt;
  if ($[6] !== toolName) {
    kt = jsxProd_default_2(Box, {
      children: [
        rt,
        jsxProd_default(Text, {
          children: toolName,
        }),
      ],
    });
    $[6] = toolName;
    $[7] = kt;
  } else kt = $[7];
  let At;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    At = jsxProd_default(Text, {
      dimColor: true,
      children: "Action: ",
    });
    $[8] = At;
  } else At = $[8];
  let It;
  if ($[9] !== description) {
    It = jsxProd_default_2(Box, {
      children: [
        At,
        jsxProd_default(Text, {
          children: description,
        }),
      ],
    });
    $[9] = description;
    $[10] = It;
  } else It = $[10];
  let Ot;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    Ot =
      ke &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Permission request sent to team ", '"', ke, '"', " leader"],
        }),
      });
    $[11] = Ot;
  } else Ot = $[11];
  let Et;
  if ($[12] !== kt || $[13] !== It) {
    Et = jsxProd_default_2(ShutdownRequestDisplay, {
      color: "warning",
      children: [
        ze,
        jsxProd_default_2(Box, {
          flexDirection: "column",
          marginTop: 1,
          children: [Xe, kt, It, Ot],
        }),
      ],
    });
    $[12] = kt;
    $[13] = It;
    $[14] = Et;
  } else Et = $[14];
  return Et;
}
//@ chunk-cckztz9w.js:4446-4688 fingerprint = WorkerPendingPermission (0.586)
function WorkerPendingPermission_2(t0) {
  if (!t0.ended) return null;
  let t = taskDescriptionSuffix();
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
      t !== "" &&
        jsxProd_default(Text, {
          color: "subtle",
          children: t,
        }),
    ],
  });
}
export { WorkerPendingPermission };
