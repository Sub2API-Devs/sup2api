/**
 * components/tasks/ShellDetailDialog.tsx
 *
 * 后台 shell/monitor 任务详情：输出尾部、运行时间、停止。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/ShellDetailDialog.tsx
 * pieces: chunk-czq1j3j2.js (5)
 * attribution: placement 1, fingerprint 4
 */
import {
  init_react_production,
  useState,
  useDeferredValue,
  suspenseTypeExport,
  use,
} from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  Fragment,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { tailOutputOfTask } from "../../utils/task/diskOutput.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useInterval } from "../../ink/components/Input.js";
import { useElapsedTicker, useConfirmationKeys } from "../ConfirmationPrompt.js";
import { truncateToWidth, formatFileSize } from "../../utils/format.js";
import { TaskDetailFooterHints } from "./taskStatusUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { FlexDirectionRow } from "../design-system/Table.js";
import { Dialog } from "../design-system/Dialog.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { HintText } from "../design-system/HintText.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:712892-712896 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:712892", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:742628-742697 fingerprint (2.1.88 match: _temp2, 1)
function renderOutputLine(line_0, i_1) {
  return jsxProd_default(
    Text,
    {
      wrap: "truncate-end",
      children: line_0,
    },
    i_1,
  );
}
//@ chunk-czq1j3j2.js:742697-742833 fingerprint (2.1.88 match: getTaskOutput, 1)
async function getTaskOutput(shell) {
  try {
    let result = await tailOutputOfTask(shell.id);
    return {
      content: result.content,
      bytesTotal: result.bytesTotal,
    };
  } catch {
    return {
      content: "",
      bytesTotal: 0,
    };
  }
}
//@ chunk-czq1j3j2.js:742833-745761 fingerprint (2.1.88 match: ShellDetailDialog, 0.63)
/**
 * 后台 shell / monitor 详情：命令、运行时长、输出尾部（截断行数），可停止。
 */
function ShellDetailDialog(props) {
  let $ = useMemoCache(47);
  let { shell, onDone, onKillShell, onBack } = props;
  let { columns } = useTerminalSize();
  let t1;
  if ($[0] !== shell) {
    t1 = () => getTaskOutput(shell);
    $[0] = shell;
    $[1] = t1;
  } else t1 = $[1];
  let [outputPromise, setOutputPromise] = useState(t1);
  let deferredOutputPromise = useDeferredValue(outputPromise);
  let refreshOutput;
  if ($[2] !== shell) {
    refreshOutput = () => setOutputPromise(getTaskOutput(shell));
    $[2] = shell;
    $[3] = refreshOutput;
  } else refreshOutput = $[3];
  useInterval(refreshOutput, shell.status === "running" ? 1000 : null);
  let elapsedTicker = useElapsedTicker(
    shell.startTime,
    shell.status === "running",
    1000,
    shell.totalPausedMs ?? 0,
    shell.endTime,
  );
  let t4;
  if ($[4] !== onDone) {
    t4 = () =>
      onDone("Shell details dismissed", {
        display: "system",
      });
    $[4] = onDone;
    $[5] = t4;
  } else t4 = $[5];
  let handleClose = t4;
  const onKill = shell.status === "running" ? onKillShell : undefined;
  let confirmationHandlers;
  if ($[6] !== handleClose || $[7] !== onBack || $[8] !== onKill) {
    confirmationHandlers = {
      onClose: handleClose,
      onBack,
      onKill,
    };
    $[6] = handleClose;
    $[7] = onBack;
    $[8] = onKill;
    $[9] = confirmationHandlers;
  } else confirmationHandlers = $[9];
  let handleKeyDown = useConfirmationKeys(confirmationHandlers);
  let isMonitor = shell.kind === "monitor";
  let t8;
  if ($[10] !== shell.command) {
    t8 = truncateToWidth(shell.command, 280);
    $[10] = shell.command;
    $[11] = t8;
  } else t8 = $[11];
  let displayCommand = t8;
  const title = isMonitor ? "Monitor details" : "Shell details";
  const showBack = !!onBack;
  const showStop = shell.status === "running" && !!onKillShell;
  let inputGuide;
  if ($[12] !== showBack || $[13] !== showStop) {
    inputGuide = jsxProd_default(TaskDetailFooterHints, {
      showBack,
      showStop,
    });
    $[12] = showBack;
    $[13] = showStop;
    $[14] = inputGuide;
  } else inputGuide = $[14];
  let columns_2;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    columns_2 = [
      {
        bold: true,
      },
      {
        width: {
          ratio: 1,
        },
      },
    ];
    $[15] = columns_2;
  } else columns_2 = $[15];
  const forceWidth = columns - 6;
  let t11;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    t11 = jsxProd_default(Fragment, {
      children: "Status:",
    });
    $[16] = t11;
  } else t11 = $[16];
  let t12;
  if ($[17] !== shell.result || $[18] !== shell.status) {
    t12 = jsxProd_default_2(FlexDirectionRow.Row, {
      children: [
        t11,
        shell.status === "running"
          ? jsxProd_default_2(Text, {
              color: "background",
              children: [
                shell.status,
                shell.result?.code !== undefined && ` (exit code: ${shell.result.code})`,
              ],
            })
          : shell.status === "completed"
            ? jsxProd_default_2(Text, {
                color: "success",
                children: [
                  shell.status,
                  shell.result?.code !== undefined && ` (exit code: ${shell.result.code})`,
                ],
              })
            : jsxProd_default_2(Text, {
                color: "error",
                children: [
                  shell.status,
                  shell.result?.code !== undefined && ` (exit code: ${shell.result.code})`,
                ],
              }),
      ],
    });
    $[17] = shell.result;
    $[18] = shell.status;
    $[19] = t12;
  } else t12 = $[19];
  let runtimeLabel;
  if ($[20] === MEMO_CACHE_SENTINEL) {
    runtimeLabel = jsxProd_default(Fragment, {
      children: "Runtime:",
    });
    $[20] = runtimeLabel;
  } else runtimeLabel = $[20];
  let runtimeRow;
  if ($[21] !== elapsedTicker) {
    runtimeRow = jsxProd_default_2(FlexDirectionRow.Row, {
      children: [runtimeLabel, elapsedTicker],
    });
    $[21] = elapsedTicker;
    $[22] = runtimeRow;
  } else runtimeRow = $[22];
  const children = isMonitor ? "Script:" : "Command:";
  let t19;
  if ($[23] !== children) {
    t19 = jsxProd_default(Fragment, {
      children,
    });
    $[23] = children;
    $[24] = t19;
  } else t19 = $[24];
  let t20;
  if ($[25] !== displayCommand || $[26] !== t19) {
    t20 = jsxProd_default_2(FlexDirectionRow.Row, {
      children: [t19, displayCommand],
    });
    $[25] = displayCommand;
    $[26] = t19;
    $[27] = t20;
  } else t20 = $[27];
  let t21;
  if ($[28] !== forceWidth || $[29] !== t12 || $[30] !== runtimeRow || $[31] !== t20) {
    t21 = jsxProd_default_2(FlexDirectionRow, {
      columns: columns_2,
      forceWidth,
      children: [t12, runtimeRow, t20],
    });
    $[28] = forceWidth;
    $[29] = t12;
    $[30] = runtimeRow;
    $[31] = t20;
    $[32] = t21;
  } else t21 = $[32];
  let t22;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    t22 = jsxProd_default(Text, {
      bold: true,
      children: "Output:",
    });
    $[33] = t22;
  } else t22 = $[33];
  let fallback;
  if ($[34] === MEMO_CACHE_SENTINEL) {
    fallback = jsxProd_default(Text, {
      dimColor: true,
      children: "Loading output\u2026",
    });
    $[34] = fallback;
  } else fallback = $[34];
  let t24;
  if ($[35] !== columns || $[36] !== deferredOutputPromise) {
    t24 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        t22,
        jsxProd_default(suspenseTypeExport, {
          fallback,
          children: jsxProd_default(ShellOutputContent, {
            outputPromise: deferredOutputPromise,
            columns,
          }),
        }),
      ],
    });
    $[35] = columns;
    $[36] = deferredOutputPromise;
    $[37] = t24;
  } else t24 = $[37];
  let children_2;
  if ($[38] !== handleClose || $[39] !== inputGuide || $[40] !== t21 || $[41] !== t24 || $[42] !== title) {
    children_2 = jsxProd_default_2(Dialog, {
      title,
      onCancel: handleClose,
      color: "background",
      inputGuide,
      children: [t21, t24],
    });
    $[38] = handleClose;
    $[39] = inputGuide;
    $[40] = t21;
    $[41] = t24;
    $[42] = title;
    $[43] = children_2;
  } else children_2 = $[43];
  let t26;
  if ($[44] !== handleKeyDown || $[45] !== children_2) {
    t26 = jsxProd_default(FocusColumn, {
      onKeyDown: handleKeyDown,
      children: children_2,
    });
    $[44] = handleKeyDown;
    $[45] = children_2;
    $[46] = t26;
  } else t26 = $[46];
  return t26;
}
//@ chunk-czq1j3j2.js:745761-746961 fingerprint (2.1.88 match: ShellOutputContent, 0.835)
function ShellOutputContent(props) {
  let $ = useMemoCache(19);
  let { outputPromise, columns } = props;
  let { content, bytesTotal } = use(outputPromise);
  if (!content) {
    let t1;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      t1 = jsxProd_default(HintText, {
        children: "No output available",
      });
      $[0] = t1;
    } else t1 = $[0];
    return t1;
  }
  let isIncomplete;
  let rendered;
  if ($[1] !== bytesTotal || $[2] !== content) {
    let starts = [];
    let pos = content.length;
    for (let i = 0; i < 10 && pos > 0; i++) {
      let prev = content.lastIndexOf(
        `
`,
        pos - 1,
      );
      starts.push(prev + 1);
      pos = prev;
    }
    starts.reverse();
    isIncomplete = bytesTotal > content.length;
    rendered = [];
    for (let i_0 = 0; i_0 < starts.length; i_0++) {
      let start = starts[i_0];
      let end = i_0 < starts.length - 1 ? starts[i_0 + 1] - 1 : content.length;
      let line = content.slice(start, end);
      if (line) rendered.push(line);
    }
    $[1] = bytesTotal;
    $[2] = content;
    $[3] = isIncomplete;
    $[4] = rendered;
  } else {
    isIncomplete = $[3];
    rendered = $[4];
  }
  const maxWidth = columns - 6;
  let children;
  if ($[5] !== rendered) {
    children = rendered.map(renderOutputLine);
    $[5] = rendered;
    $[6] = children;
  } else children = $[6];
  let t3;
  if ($[7] !== maxWidth || $[8] !== children) {
    t3 = jsxProd_default(Box, {
      borderStyle: "round",
      paddingX: 1,
      flexDirection: "column",
      height: 12,
      maxWidth,
      children,
    });
    $[7] = maxWidth;
    $[8] = children;
    $[9] = t3;
  } else t3 = $[9];
  const t4 = `Showing ${rendered.length} lines`;
  let t5;
  if ($[10] !== bytesTotal || $[11] !== isIncomplete) {
    t5 = isIncomplete ? ` of ${formatFileSize(bytesTotal)}` : "";
    $[10] = bytesTotal;
    $[11] = isIncomplete;
    $[12] = t5;
  } else t5 = $[12];
  let t6;
  if ($[13] !== t4 || $[14] !== t5) {
    t6 = jsxProd_default_2(Text, {
      dimColor: true,
      italic: true,
      children: [t4, t5],
    });
    $[13] = t4;
    $[14] = t5;
    $[15] = t6;
  } else t6 = $[15];
  let t7;
  if ($[16] !== t3 || $[17] !== t6) {
    t7 = jsxProd_default_2(Fragment, {
      children: [t3, t6],
    });
    $[16] = t3;
    $[17] = t6;
    $[18] = t7;
  } else t7 = $[18];
  return t7;
}
export { ShellDetailDialog };
