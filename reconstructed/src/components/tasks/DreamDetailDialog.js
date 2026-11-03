/**
 * components/tasks/DreamDetailDialog.tsx
 *
 * "Memory consolidation"（dream）后台任务详情。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/DreamDetailDialog.tsx
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: file-local 1, fingerprint 2, layout 1
 */
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useElapsedTicker, useConfirmationKeys } from "../ConfirmationPrompt.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { Dialog } from "../design-system/Dialog.js";
import { TaskDetailFooterHints } from "./taskStatusUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-18hwfzwa.js:700976-701013 file-local
function hasTurnText(t) {
  return t.text !== "";
}
//@ chunk-18hwfzwa.js:701013-701228 fingerprint = _temp2 (1)
function renderDreamTurn(turn, i) {
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "column",
      children: [
        jsxProd_default(Text, {
          wrap: "wrap",
          children: turn.text,
        }),
        turn.toolUseCount > 0 &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: ["  ", "(", turn.toolUseCount, " ", plural(turn.toolUseCount, "tool"), ")"],
          }),
      ],
    },
    i,
  );
}
//@ chunk-18hwfzwa.js:701228-701238 layout
var MAX_VISIBLE_TURNS = 6;
//@ chunk-18hwfzwa.js:701238-704222 fingerprint = DreamDetailDialog (0.639)
/**
 * 记忆整理（dream）任务详情：涉及的会话与文件数、当前步骤与工具活动。
 */
function DreamDetailDialog(props) {
  let $ = w(59);
  let { task, onDone, onBack, onKill } = props;
  let elapsedTime = useElapsedTicker(task.startTime, task.status === "running", 1000, 0, task.endTime);
  const onKill_2 = task.status === "running" ? onKill : undefined;
  let He;
  if ($[0] !== onBack || $[1] !== onDone || $[2] !== onKill_2) {
    He = {
      onClose: onDone,
      onBack,
      onKill: onKill_2,
    };
    $[0] = onBack;
    $[1] = onDone;
    $[2] = onKill_2;
    $[3] = He;
  } else He = $[3];
  let handleKeyDown = useConfirmationKeys(He);
  let ze;
  let Xe;
  let rt;
  let color;
  let inputGuide;
  let onKeyDown;
  let flexDirection;
  let gap;
  let Dt;
  let Lt;
  let title;
  let subtitle;
  let onCancel;
  if (
    $[4] !== elapsedTime ||
    $[5] !== handleKeyDown ||
    $[6] !== onBack ||
    $[7] !== onDone ||
    $[8] !== onKill ||
    $[9] !== task.filesTouched.length ||
    $[10] !== task.sessionsReviewing ||
    $[11] !== task.status ||
    $[12] !== task.turns
  ) {
    let visibleTurns = task.turns.filter(hasTurnText);
    let shown = visibleTurns.slice(-MAX_VISIBLE_TURNS);
    let hidden = visibleTurns.length - shown.length;
    rt = FocusColumn;
    onKeyDown = handleKeyDown;
    Xe = Dialog;
    title = "Memory consolidation";
    const sessionsReviewing = task.sessionsReviewing;
    let t18;
    if ($[26] !== task.sessionsReviewing) {
      t18 = plural(task.sessionsReviewing, "session");
      $[26] = task.sessionsReviewing;
      $[27] = t18;
    } else t18 = $[27];
    let t19;
    if ($[28] !== task.filesTouched.length) {
      t19 =
        task.filesTouched.length > 0 &&
        jsxProd_default_2(Fragment, {
          children: [
            " ",
            "\xB7 ",
            task.filesTouched.length,
            " ",
            plural(task.filesTouched.length, "file"),
            " touched",
          ],
        });
      $[28] = task.filesTouched.length;
      $[29] = t19;
    } else t19 = $[29];
    if ($[30] !== elapsedTime || $[31] !== t18 || $[32] !== t19 || $[33] !== task.sessionsReviewing) {
      subtitle = jsxProd_default_2(Text, {
        dimColor: true,
        children: [elapsedTime, " \xB7 reviewing ", sessionsReviewing, " ", t18, t19],
      });
      $[30] = elapsedTime;
      $[31] = t18;
      $[32] = t19;
      $[33] = task.sessionsReviewing;
      $[34] = subtitle;
    } else subtitle = $[34];
    onCancel = onDone;
    color = "background";
    const showBack = !!onBack;
    const showStop = task.status === "running" && !!onKill;
    if ($[35] !== showBack || $[36] !== showStop) {
      inputGuide = jsxProd_default(TaskDetailFooterHints, {
        showBack,
        showStop,
      });
      $[35] = showBack;
      $[36] = showStop;
      $[37] = inputGuide;
    } else inputGuide = $[37];
    ze = Box;
    flexDirection = "column";
    gap = 1;
    let t20;
    if ($[38] === MEMO_CACHE_SENTINEL) {
      t20 = jsxProd_default(Text, {
        bold: true,
        children: "Status:",
      });
      $[38] = t20;
    } else t20 = $[38];
    if ($[39] !== task.status) {
      Dt = jsxProd_default_2(Text, {
        children: [
          t20,
          " ",
          task.status === "running"
            ? jsxProd_default(Text, {
                color: "background",
                children: "running",
              })
            : task.status === "completed"
              ? jsxProd_default(Text, {
                  color: "success",
                  children: task.status,
                })
              : jsxProd_default(Text, {
                  color: "error",
                  children: task.status,
                }),
        ],
      });
      $[39] = task.status;
      $[40] = Dt;
    } else Dt = $[40];
    Lt =
      shown.length === 0
        ? jsxProd_default(Text, {
            dimColor: true,
            children: task.status === "running" ? "Starting\u2026" : "(no text output)",
          })
        : jsxProd_default_2(Fragment, {
            children: [
              hidden > 0 &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["(", hidden, " earlier ", plural(hidden, "turn"), ")"],
                }),
              shown.map(renderDreamTurn),
            ],
          });
    $[4] = elapsedTime;
    $[5] = handleKeyDown;
    $[6] = onBack;
    $[7] = onDone;
    $[8] = onKill;
    $[9] = task.filesTouched.length;
    $[10] = task.sessionsReviewing;
    $[11] = task.status;
    $[12] = task.turns;
    $[13] = ze;
    $[14] = Xe;
    $[15] = rt;
    $[16] = color;
    $[17] = inputGuide;
    $[18] = onKeyDown;
    $[19] = flexDirection;
    $[20] = gap;
    $[21] = Dt;
    $[22] = Lt;
    $[23] = title;
    $[24] = subtitle;
    $[25] = onCancel;
  } else {
    ze = $[13];
    Xe = $[14];
    rt = $[15];
    color = $[16];
    inputGuide = $[17];
    onKeyDown = $[18];
    flexDirection = $[19];
    gap = $[20];
    Dt = $[21];
    Lt = $[22];
    title = $[23];
    subtitle = $[24];
    onCancel = $[25];
  }
  let children;
  if ($[41] !== ze || $[42] !== flexDirection || $[43] !== gap || $[44] !== Dt || $[45] !== Lt) {
    children = jsxProd_default_2(ze, {
      flexDirection,
      gap,
      children: [Dt, Lt],
    });
    $[41] = ze;
    $[42] = flexDirection;
    $[43] = gap;
    $[44] = Dt;
    $[45] = Lt;
    $[46] = children;
  } else children = $[46];
  let children_2;
  if (
    $[47] !== Xe ||
    $[48] !== color ||
    $[49] !== inputGuide ||
    $[50] !== children ||
    $[51] !== title ||
    $[52] !== subtitle ||
    $[53] !== onCancel
  ) {
    children_2 = jsxProd_default(Xe, {
      title,
      subtitle,
      onCancel,
      color,
      inputGuide,
      children,
    });
    $[47] = Xe;
    $[48] = color;
    $[49] = inputGuide;
    $[50] = children;
    $[51] = title;
    $[52] = subtitle;
    $[53] = onCancel;
    $[54] = children_2;
  } else children_2 = $[54];
  let Ao;
  if ($[55] !== rt || $[56] !== onKeyDown || $[57] !== children_2) {
    Ao = jsxProd_default(rt, {
      onKeyDown,
      children: children_2,
    });
    $[55] = rt;
    $[56] = onKeyDown;
    $[57] = children_2;
    $[58] = Ao;
  } else Ao = $[58];
  return Ao;
}
export { DreamDetailDialog };
