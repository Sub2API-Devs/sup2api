/**
 * commands/loops/loops.tsx
 *
 * 2.1.316 新增：/loops 界面：列出与管理会话的定时 cron 与 Stop 钩子循环
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-143xysab.js (7)
 * attribution: placement 7
 */
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Byline } from "../../components/design-system/Byline.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Text, Box } from "../../ink/components/Text.js";
import { TextInput } from "../../components/TextInput.js";
import { HintText } from "../../components/design-system/HintText.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { parseCronExpression, cronToHuman } from "../../utils/cron.js";
import { logEvent } from "../../services/analytics/index.js";
import { listAllCronTasks, removeCronTasks, addCronTask } from "../../utils/cronTasks.js";
import { getSessionStopPromptHooks, clearSessionGoal, setSessionGoal } from "../goal/goal.js";
import { getSessionId, setScheduledTasksEnabled } from "../../bootstrap/state.js";
import { withCronCarryAttachment } from "../../services/daemon/sessionCron.js";
import { runWithWorkload } from "../../utils/workloadContext.js";

//@ chunk-143xysab.js:14958-14962 placement
init_react_production();
//@ chunk-143xysab.js:14962-15019 placement
function toggleLoopMode(loopId) {
  return loopId === "interval" ? "text" : "interval";
}
//@ chunk-143xysab.js:15019-15219 placement
function renderLoopItem(loop) {
  switch (loop.kind) {
    case "cron": {
      return jsxProd_default(
        OrderedListWithItem.Item,
        {
          label: loop.prompt,
          meta: [loop.human, loop.id],
        },
        loop.id,
      );
    }
    case "stophook": {
      return jsxProd_default(
        OrderedListWithItem.Item,
        {
          label: loop.condition,
          meta: ["stop-hook"],
        },
        loop.id,
      );
    }
    default: {
      return loop;
    }
  }
}
//@ chunk-143xysab.js:15219-20653 placement
/**
 * /loops 界面：列出会话的定时 cron 与 Stop 钩子循环，支持新建（every 间隔/until 条件）和删除。
 */
function LoopsManager(props) {
  let $ = useMemoCache(88);
  let { loops, onDelete, onCreate, onCancel } = props;
  let [viewMode, setViewMode] = useState("list");
  let [cursor, setCursor] = useState(0);
  let [selectedLoopId, setSelectedLoopId] = useState();
  let [endMode, setEndMode] = useState("every");
  let [interval, setIntervalValue] = useState("10m");
  let [countField, setCountField] = useState(3);
  let [prompt, setPrompt] = useState("");
  let [untilCount, setUntilCount] = useState(0);
  let [unit, setUnit] = useState(endMode === "every" ? "interval" : "text");
  let { columns } = useTerminalSize();
  let isSelected;
  if ($[0] !== selectedLoopId) {
    isSelected = (loop) => loop.id === selectedLoopId;
    $[0] = selectedLoopId;
    $[1] = isSelected;
  } else isSelected = $[1];
  let index = loops.findIndex(isSelected);
  let body;
  if ($[2] !== endMode || $[3] !== onCancel || $[4] !== viewMode) {
    body = (event) => {
      if (viewMode !== "list") {
        return;
      }
      if (event.key === "escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key === "n") {
        event.preventDefault();
        setViewMode("create");
        setUnit(endMode === "every" ? "interval" : "text");
      }
    };
    $[2] = endMode;
    $[3] = onCancel;
    $[4] = viewMode;
    $[5] = body;
  } else body = $[5];
  let bodyRows = body;
  let footer;
  if ($[6] !== endMode) {
    footer = () => {
      let otherEndMode = endMode === "every" ? "until" : "every";
      setEndMode(otherEndMode);
      setUnit(otherEndMode === "every" ? "interval" : "text");
    };
    $[6] = endMode;
    $[7] = footer;
  } else footer = $[7];
  let footerRows = footer;
  let header;
  if (
    $[8] !== unit ||
    $[9] !== interval ||
    $[10] !== countField ||
    $[11] !== endMode ||
    $[12] !== prompt.length ||
    $[13] !== untilCount ||
    $[14] !== footerRows ||
    $[15] !== viewMode
  ) {
    header = (event) => {
      if (viewMode !== "create") {
        return;
      }
      if (event.key === "escape") {
        event.preventDefault();
        setViewMode("list");
        return;
      }
      if (event.key === "tab") {
        event.preventDefault();
        footerRows();
        return;
      }
      let unitValue = unit === "interval" ? countField : untilCount;
      let fieldLength = unit === "interval" ? interval.length : prompt.length;
      if ((event.key === "left" && unitValue === 0) || (event.key === "right" && unitValue >= fieldLength)) {
        event.preventDefault();
        footerRows();
        return;
      }
      if (endMode === "every" && (event.key === "down" || event.key === "up")) {
        event.preventDefault();
        setUnit(toggleLoopMode);
      }
    };
    $[8] = unit;
    $[9] = interval;
    $[10] = countField;
    $[11] = endMode;
    $[12] = prompt.length;
    $[13] = untilCount;
    $[14] = footerRows;
    $[15] = viewMode;
    $[16] = header;
  } else header = $[16];
  let headerRows = header;
  let handleKeyDown;
  if ($[17] !== interval || $[18] !== endMode || $[19] !== onCreate || $[20] !== prompt) {
    handleKeyDown = function handleKeyDown() {
      let trimmed = prompt.trim();
      if (endMode === "every") {
        if (!interval.trim() || !trimmed) {
          return;
        }
        onCreate({
          kind: "cron",
          interval: interval.trim(),
          prompt: trimmed,
        });
      } else {
        if (!trimmed) {
          return;
        }
        onCreate({
          kind: "stophook",
          condition: trimmed,
        });
      }
    };
    $[17] = interval;
    $[18] = endMode;
    $[19] = onCreate;
    $[20] = prompt;
    $[21] = handleKeyDown;
  } else handleKeyDown = $[21];
  let onSubmit = handleKeyDown;
  let listHint;
  if ($[22] !== loops.length) {
    listHint =
      loops.length > 0 &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: ["up", "down"],
        action: "select",
      });
    $[22] = loops.length;
    $[23] = listHint;
  } else listHint = $[23];
  let event;
  if ($[24] !== loops.length) {
    event =
      loops.length > 0 &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "d",
        action: "delete",
      });
    $[24] = loops.length;
    $[25] = event;
  } else event = $[25];
  let key;
  let char;
  if ($[26] === MEMO_CACHE_SENTINEL) {
    key = jsxProd_default(KeyboardShortcutHint, {
      chord: "n",
      action: "add",
    });
    char = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "close",
    });
    $[26] = key;
    $[27] = char;
  } else {
    key = $[26];
    char = $[27];
  }
  let promptInput;
  if ($[28] !== listHint || $[29] !== event) {
    promptInput = jsxProd_default_2(Byline, {
      children: [listHint, event, key, char],
    });
    $[28] = listHint;
    $[29] = event;
    $[30] = promptInput;
  } else promptInput = $[30];
  let promptRows = promptInput;
  let tabHint;
  if ($[31] === MEMO_CACHE_SENTINEL) {
    tabHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "tab",
      action: "switch mode",
    });
    $[31] = tabHint;
  } else tabHint = $[31];
  let intervalRow;
  if ($[32] !== endMode) {
    intervalRow =
      endMode === "every" &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: ["up", "down"],
        action: "next field",
      });
    $[32] = endMode;
    $[33] = intervalRow;
  } else intervalRow = $[33];
  let left;
  let right;
  if ($[34] === MEMO_CACHE_SENTINEL) {
    left = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action: "create",
    });
    right = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "back",
    });
    $[34] = left;
    $[35] = right;
  } else {
    left = $[34];
    right = $[35];
  }
  let countRow;
  if ($[36] !== intervalRow) {
    countRow = jsxProd_default_2(Byline, {
      children: [tabHint, intervalRow, left, right],
    });
    $[36] = intervalRow;
    $[37] = countRow;
  } else countRow = $[37];
  let countRows = countRow;
  const dimColor = endMode !== "every";
  const endRadio = endMode === "every" ? figures_default.radioOn : figures_default.radioOff;
  let untilRow;
  if ($[38] !== dimColor || $[39] !== endRadio) {
    untilRow = jsxProd_default_2(Text, {
      dimColor,
      children: [endRadio, " every"],
    });
    $[38] = dimColor;
    $[39] = endRadio;
    $[40] = untilRow;
  } else untilRow = $[40];
  let untilValue;
  if ($[41] === MEMO_CACHE_SENTINEL) {
    untilValue = jsxProd_default(Text, {
      dimColor: true,
      children: "  ",
    });
    $[41] = untilValue;
  } else untilValue = $[41];
  const dimColor_2 = endMode !== "until";
  const radioGlyph = endMode === "until" ? figures_default.radioOn : figures_default.radioOff;
  let promptLabel;
  if ($[42] !== dimColor_2 || $[43] !== radioGlyph) {
    promptLabel = jsxProd_default_2(Text, {
      dimColor: dimColor_2,
      children: [radioGlyph, " until"],
    });
    $[42] = dimColor_2;
    $[43] = radioGlyph;
    $[44] = promptLabel;
  } else promptLabel = $[44];
  let submitHint;
  if ($[45] !== untilRow || $[46] !== promptLabel) {
    submitHint = jsxProd_default_2(Text, {
      children: [untilRow, untilValue, promptLabel],
    });
    $[45] = untilRow;
    $[46] = promptLabel;
    $[47] = submitHint;
  } else submitHint = $[47];
  let errorLine;
  if ($[48] !== unit || $[49] !== interval || $[50] !== countField || $[51] !== endMode) {
    errorLine =
      endMode === "every" &&
      jsxProd_default_2(Box, {
        flexDirection: "row",
        gap: 1,
        marginTop: 1,
        children: [
          jsxProd_default(Text, {
            dimColor: unit !== "interval",
            children: "Interval >",
          }),
          jsxProd_default(TextInput, {
            value: interval,
            onChange: setIntervalValue,
            onSubmit: () => setUnit("text"),
            focus: unit === "interval",
            showCursor: unit === "interval",
            multiline: false,
            columns: 12,
            cursorOffset: countField,
            onChangeCursorOffset: setCountField,
            placeholder: "10m",
            disableEscapeDoublePress: true,
          }),
        ],
      });
    $[48] = unit;
    $[49] = interval;
    $[50] = countField;
    $[51] = endMode;
    $[52] = errorLine;
  } else errorLine = $[52];
  const dimColor_3 = endMode === "every" && unit !== "text";
  const children = endMode === "every" ? "Prompt   >" : "Condition>";
  let hint;
  if ($[53] !== dimColor_3 || $[54] !== children) {
    hint = jsxProd_default(Text, {
      dimColor: dimColor_3,
      children,
    });
    $[53] = dimColor_3;
    $[54] = children;
    $[55] = hint;
  } else hint = $[55];
  const focus = endMode === "until" || unit === "text";
  const showCursor = endMode === "until" || unit === "text";
  const columns_2 = columns - 16;
  const placeholder = endMode === "every" ? "e.g. /babysit-prs" : "e.g. tests pass and PR is merged";
  let listRows;
  if (
    $[56] !== onSubmit ||
    $[57] !== focus ||
    $[58] !== showCursor ||
    $[59] !== columns_2 ||
    $[60] !== placeholder ||
    $[61] !== prompt ||
    $[62] !== untilCount
  ) {
    listRows = jsxProd_default(TextInput, {
      value: prompt,
      onChange: setPrompt,
      onSubmit,
      focus,
      showCursor,
      multiline: false,
      columns: columns_2,
      cursorOffset: untilCount,
      onChangeCursorOffset: setUntilCount,
      placeholder,
      disableEscapeDoublePress: true,
    });
    $[56] = onSubmit;
    $[57] = focus;
    $[58] = showCursor;
    $[59] = columns_2;
    $[60] = placeholder;
    $[61] = prompt;
    $[62] = untilCount;
    $[63] = listRows;
  } else listRows = $[63];
  let listHeader;
  if ($[64] !== hint || $[65] !== listRows) {
    listHeader = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      marginTop: 1,
      children: [hint, listRows],
    });
    $[64] = hint;
    $[65] = listRows;
    $[66] = listHeader;
  } else listHeader = $[66];
  let listBody;
  if ($[67] !== submitHint || $[68] !== errorLine || $[69] !== listHeader) {
    listBody = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [submitHint, errorLine, listHeader],
    });
    $[67] = submitHint;
    $[68] = errorLine;
    $[69] = listHeader;
    $[70] = listBody;
  } else listBody = $[70];
  let listBodyRows = listBody;
  let listFooter;
  if ($[71] !== cursor || $[72] !== index || $[73] !== loops || $[74] !== onDelete) {
    listFooter = jsxProd_default(Box, {
      flexDirection: "column",
      children:
        loops.length === 0
          ? jsxProd_default(HintText, {
              children: "No active loops",
            })
          : jsxProd_default(OrderedListWithItem, {
              defaultFocusIndex: index < 0 ? cursor : index,
              onFocus: (value) => {
                setCursor(value);
                setSelectedLoopId(loops[value]?.id);
              },
              onRowKeyDown: (event, index) => {
                let loop = loops[index];
                if (event.key === "d" && loop) {
                  event.preventDefault();
                  onDelete(loop);
                }
              },
              children: loops.map(renderLoopItem),
            }),
    });
    $[71] = cursor;
    $[72] = index;
    $[73] = loops;
    $[74] = onDelete;
    $[75] = listFooter;
  } else listFooter = $[75];
  let listFooterRows = listFooter;
  const onKeyDown = viewMode === "list" ? bodyRows : headerRows;
  const title = viewMode === "list" ? "Loops" : "New loop";
  const subtitle = viewMode === "list" ? "Recurring crons and stop-hooks active for this session" : undefined;
  let onCancel_2;
  if ($[76] !== onCancel || $[77] !== viewMode) {
    onCancel_2 = viewMode === "list" ? onCancel : () => setViewMode("list");
    $[76] = onCancel;
    $[77] = viewMode;
    $[78] = onCancel_2;
  } else onCancel_2 = $[78];
  const inputGuide = viewMode === "list" ? promptRows : countRows;
  const children_2 = viewMode === "list" ? listFooterRows : listBodyRows;
  let children_3;
  if (
    $[79] !== title ||
    $[80] !== subtitle ||
    $[81] !== onCancel_2 ||
    $[82] !== inputGuide ||
    $[83] !== children_2
  ) {
    children_3 = jsxProd_default(Dialog, {
      title,
      subtitle,
      color: "permission",
      onCancel: onCancel_2,
      isCancelActive: false,
      inputGuide,
      children: children_2,
    });
    $[79] = title;
    $[80] = subtitle;
    $[81] = onCancel_2;
    $[82] = inputGuide;
    $[83] = children_2;
    $[84] = children_3;
  } else children_3 = $[84];
  let panelFooter;
  if ($[85] !== onKeyDown || $[86] !== children_3) {
    panelFooter = jsxProd_default(Box, {
      flexDirection: "column",
      tabIndex: 0,
      autoFocus: true,
      onKeyDown,
      children: children_3,
    });
    $[85] = onKeyDown;
    $[86] = children_3;
    $[87] = panelFooter;
  } else panelFooter = $[87];
  return panelFooter;
}
//@ chunk-143xysab.js:20653-20679 placement
var LOOP_INTERVAL_PATTERN = /^(\d+)([smhd])$/i;
//@ chunk-143xysab.js:20679-21082 placement
function intervalToCron(interval) {
  let match = interval.match(LOOP_INTERVAL_PATTERN);
  if (!match) return null;
  let count = parseInt(match[1], 10);
  if (count < 1) return null;
  let unit;
  switch (match[2].toLowerCase()) {
    case "s":
      unit = `*/${Math.max(1, Math.ceil(count / 60))} * * * *`;
      break;
    case "m":
      unit = count <= 59 ? `*/${count} * * * *` : `0 */${Math.round(count / 60)} * * *`;
      break;
    case "h":
      if (count > 23) return null;
      unit = `0 */${count} * * *`;
      break;
    case "d":
      if (count > 31) return null;
      unit = `0 0 */${count} * *`;
      break;
    default:
      return null;
  }
  return parseCronExpression(unit) ? unit : null;
}
//@ chunk-143xysab.js:21082-22145 placement
/**
 * /loops 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var runLoopsCommand = async (onDone, context) => {
  logEvent("tengu_loops_command", {});
  let cronTasks = await listAllCronTasks();
  let sessionStopPromptHooks = getSessionStopPromptHooks(context.sessionHooksRegistry, getSessionId());
  let loops = [
    ...cronTasks.map((task) => ({
      kind: "cron",
      id: task.id,
      cron: task.cron,
      human: cronToHuman(task.cron),
      prompt: task.prompt,
    })),
    ...sessionStopPromptHooks.map((sessionStopPromptHook, hook) => ({
      kind: "stophook",
      id: `stophook-${hook}`,
      condition: sessionStopPromptHook.prompt,
    })),
  ];
  async function deleteLoop(loop) {
    if (loop.kind === "cron") {
      try {
        await removeCronTasks([loop.id]);
        context.applyMessageOp({
          type: "update",
          updater: withCronCarryAttachment,
        });
        onDone(`Loop ${loop.id} deleted`, {
          display: "system",
        });
      } catch (error) {
        onDone(`Failed to delete loop ${loop.id}: ${error}`, {
          display: "system",
        });
      }
      return;
    }
    let cleared = clearSessionGoal(context);
    onDone(cleared === null ? "Stop hook not found" : "Stop hook cleared", {
      display: "system",
    });
  }
  async function createLoop(loop) {
    if (loop.kind === "cron") {
      let cron = intervalToCron(loop.interval);
      if (!cron) {
        onDone(`Invalid interval: ${loop.interval}`, {
          display: "system",
        });
        return;
      }
      let taskId = await runWithWorkload(undefined, () => addCronTask(cron, loop.prompt, true, false));
      setScheduledTasksEnabled(true);
      context.applyMessageOp({
        type: "update",
        updater: withCronCarryAttachment,
      });
      onDone(`Loop ${taskId} created (${cronToHuman(cron)})`, {
        display: "system",
      });
      return;
    }
    let goal = setSessionGoal(loop.condition, context, "loops_dialog");
    onDone(goal ?? "Stop hook set", {
      display: "system",
    });
  }
  return jsxProd_default(LoopsManager, {
    loops,
    onDelete: (loop) => void deleteLoop(loop),
    onCreate: (loop) => void createLoop(loop),
    onCancel: () =>
      onDone("", {
        display: "skip",
      }),
  });
};
export { runLoopsCommand };
