/**
 * components/cloud/CloudCreateChecklist.tsx
 *
 * 2.1.316 新增：云会话创建进度清单（容器准备、克隆、安装脚本、启动 CC），可取消，期间可先打字；云会话创建期间可先输入消息的提示行等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fr4xjkmb.js (10)
 * attribution: placement 10
 */
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PromptInputModeIndicator } from "../PromptInput/PromptInputModeIndicator.js";
import { Box, Text } from "../../ink/components/Text.js";
import { TextInput } from "../TextInput.js";
import { setupStepLabel, createSetupProgress } from "../../services/cloudSessions/setupProgress.js";
import { BootstrapStatusLine } from "../RemoteBootstrapProgress.js";
import { useInterval } from "../../ink/components/Input.js";
import { openEarlyInputField, editEarlyInputField, noteEarlyInputFieldKey } from "../../utils/earlyInput.js";
import { uploadProgressPhase, cloudCreateTitle, teleportProgressRow } from "../TeleportProgress.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { logEvent } from "../../services/analytics/index.js";
import { Byline } from "../design-system/Byline.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";

//@ chunk-fr4xjkmb.js:14268-14272 placement
init_react_production();
//@ chunk-fr4xjkmb.js:14272-14276 placement
init_react_production();
//@ chunk-fr4xjkmb.js:14276-14288 placement
var CHECKLIST_WIDTH_RESERVE = 2;
var MAX_CHECKLIST_VISIBLE_LINES = 6;
//@ chunk-fr4xjkmb.js:14288-14391 placement = _temp18 (1)
function sanitizePromptLine(line) {
  return stripAnsi(line)
    .replace(
      /\r\n|\r/g,
      `
`,
    )
    .replaceAll("\t", "    ")
    .replace(/[^\P{Cc}\n]/gu, "");
}
//@ chunk-fr4xjkmb.js:14391-15077 placement
/**
 * 云会话创建期间可先输入消息的提示行。
 */
function CloudPromptLine(props) {
  let $ = useMemoCache(8);
  let { text, onChange, onKey, onReturn } = props;
  let { columns } = useTerminalSize();
  let [cursorOffset, setCursorOffset] = useState(text.length);
  let modeIndicator;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    modeIndicator = jsxProd_default(PromptInputModeIndicator, {
      mode: "prompt",
      isLoading: false,
    });
    $[0] = modeIndicator;
  } else modeIndicator = $[0];
  const columns_2 = Math.max(1, columns - CHECKLIST_WIDTH_RESERVE);
  let row;
  if (
    $[1] !== cursorOffset ||
    $[2] !== onChange ||
    $[3] !== onKey ||
    $[4] !== onReturn ||
    $[5] !== columns_2 ||
    $[6] !== text
  ) {
    row = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginTop: 1,
      children: [
        modeIndicator,
        jsxProd_default(TextInput, {
          value: text,
          onChange,
          onKeyDownBefore: onKey,
          inputFilter: sanitizePromptLine,
          onSubmit: onReturn,
          clearOnSubmit: false,
          multiline: true,
          disableCtrlCClear: true,
          disableEscapeDoublePress: true,
          placeholder: "Type your message while the session is set up",
          focus: true,
          showCursor: true,
          columns: columns_2,
          maxVisibleLines: MAX_CHECKLIST_VISIBLE_LINES,
          cursorOffset,
          onChangeCursorOffset: setCursorOffset,
        }),
      ],
    });
    $[1] = cursorOffset;
    $[2] = onChange;
    $[3] = onKey;
    $[4] = onReturn;
    $[5] = columns_2;
    $[6] = text;
    $[7] = row;
  } else row = $[7];
  return row;
}
//@ chunk-fr4xjkmb.js:15077-15109 placement
function nowMs() {
  return Date.now();
}
//@ chunk-fr4xjkmb.js:15109-15146 placement
function initialSetupStep(step) {
  return setupStepLabel(step, "new");
}
//@ chunk-fr4xjkmb.js:15146-15207 placement
function pendingStepLine(step) {
  return jsxProd_default(
    BootstrapStatusLine,
    {
      status: "pending",
      label: step,
    },
    step,
  );
}
//@ chunk-fr4xjkmb.js:15207-17271 placement
/**
 * 云会话创建进度清单（容器准备、克隆、安装脚本、启动 CC），可取消，期间可先打字。
 */
function CloudCreateChecklist(props) {
  let $ = useMemoCache(40);
  let { state, cancelling, onCancel, hasPromptLine, isQuestionWaiting } = props;
  let { columns } = useTerminalSize();
  let [now, setNow] = useState(nowMs);
  let tickNow;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    tickNow = () => setNow(Date.now());
    $[0] = tickNow;
  } else tickNow = $[0];
  useInterval(tickNow, 1000);
  let initialPrompt;
  if ($[1] !== hasPromptLine) {
    initialPrompt = () => (hasPromptLine ? openEarlyInputField() : "");
    $[1] = hasPromptLine;
    $[2] = initialPrompt;
  } else initialPrompt = $[2];
  let [earlyInput, setEarlyInput] = useState(initialPrompt);
  let [isSending, setIsSending] = useState(false);
  let uploadPhase;
  if ($[3] !== state) {
    uploadPhase = uploadProgressPhase(state);
    $[3] = state;
    $[4] = uploadPhase;
  } else uploadPhase = $[4];
  let isCreated = uploadPhase === "created";
  let exitHandler;
  if ($[5] !== onCancel || $[6] !== earlyInput) {
    exitHandler = () => (earlyInput === "" ? onCancel() : false);
    $[5] = onCancel;
    $[6] = earlyInput;
    $[7] = exitHandler;
  } else exitHandler = $[7];
  let keymap;
  if ($[8] !== onCancel || $[9] !== exitHandler) {
    keymap = {
      "app:interrupt": onCancel,
      "app:exit": exitHandler,
    };
    $[8] = onCancel;
    $[9] = exitHandler;
    $[10] = keymap;
  } else keymap = $[10];
  let globalKeymap = keymap;
  const isActive = !isCreated;
  let keymapContext;
  if ($[11] !== isActive) {
    keymapContext = {
      context: "Global",
      isActive,
    };
    $[11] = isActive;
    $[12] = keymapContext;
  } else keymapContext = $[12];
  MessageActionsKeybindings(globalKeymap, keymapContext);
  let statusView;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    statusView = createSetupProgress(0, {
      wake: false,
    }).steps.map(initialSetupStep);
    $[13] = statusView;
  } else statusView = $[13];
  let stepRows = statusView;
  let children;
  if ($[14] !== state) {
    children = cloudCreateTitle(state);
    $[14] = state;
    $[15] = children;
  } else children = $[15];
  let progressRows;
  if ($[16] !== children) {
    progressRows = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[16] = children;
    $[17] = progressRows;
  } else progressRows = $[17];
  let promptRow;
  if ($[18] !== columns || $[19] !== now || $[20] !== state) {
    promptRow = state.steps.map((step) =>
      jsxProd_default(
        ChecklistStep,
        {
          step,
          state,
          now,
          columns,
        },
        step.id,
      ),
    );
    $[18] = columns;
    $[19] = now;
    $[20] = state;
    $[21] = promptRow;
  } else promptRow = $[21];
  let hintText;
  if ($[22] !== isCreated) {
    hintText = !isCreated && stepRows.map(pendingStepLine);
    $[22] = isCreated;
    $[23] = hintText;
  } else hintText = $[23];
  let layout;
  if ($[24] !== hasPromptLine || $[25] !== earlyInput || $[26] !== isSending) {
    layout =
      hasPromptLine &&
      jsxProd_default(CloudPromptLine, {
        text: earlyInput,
        onChange: (buffer) => {
          setEarlyInput(buffer);
          editEarlyInputField(buffer);
          setIsSending(false);
        },
        onKey: noteEarlyInputFieldKey,
        onReturn: () => {
          if (!isSending) {
            logEvent("tengu_cloud_create_prompt_return_ignored", {});
            setIsSending(true);
          }
        },
      });
    $[24] = hasPromptLine;
    $[25] = earlyInput;
    $[26] = isSending;
    $[27] = layout;
  } else layout = $[27];
  let pendingRow;
  if (
    $[28] !== cancelling ||
    $[29] !== isCreated ||
    $[30] !== hasPromptLine ||
    $[31] !== isQuestionWaiting ||
    $[32] !== isSending
  ) {
    pendingRow =
      !isCreated &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: jsxProd_default_2(Byline, {
            children: [
              jsxProd_default(Text, {
                children: cancelling
                  ? "Cancelling\u2026"
                  : !hasPromptLine
                    ? "Typing is paused until the prompt opens"
                    : isQuestionWaiting
                      ? "A question is waiting. Pause typing to see it"
                      : isSending
                        ? "Not sent. You can send your message once the session opens"
                        : "You can send your message once the session opens",
              }),
              jsxProd_default(ConfigurableShortcutHint, {
                action: "app:interrupt",
                context: "Global",
                fallback: "ctrl+c",
                description: cancelling ? "quit now" : "cancel",
              }),
            ],
          }),
        }),
      });
    $[28] = cancelling;
    $[29] = isCreated;
    $[30] = hasPromptLine;
    $[31] = isQuestionWaiting;
    $[32] = isSending;
    $[33] = pendingRow;
  } else pendingRow = $[33];
  let inner;
  if (
    $[34] !== progressRows ||
    $[35] !== promptRow ||
    $[36] !== hintText ||
    $[37] !== layout ||
    $[38] !== pendingRow
  ) {
    inner = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [progressRows, promptRow, hintText, layout, pendingRow],
    });
    $[34] = progressRows;
    $[35] = promptRow;
    $[36] = hintText;
    $[37] = layout;
    $[38] = pendingRow;
    $[39] = inner;
  } else inner = $[39];
  return inner;
}
//@ chunk-fr4xjkmb.js:17271-17719 placement
/**
 * 清单中的一个步骤行（状态、注释、详情）。
 */
function ChecklistStep(props) {
  let $ = useMemoCache(10);
  let { step, state, now, columns } = props;
  let progress;
  if ($[0] !== now || $[1] !== state || $[2] !== step) {
    progress = teleportProgressRow(step, state, now);
    $[0] = now;
    $[1] = state;
    $[2] = step;
    $[3] = progress;
  } else progress = $[3];
  let rowInfo = progress;
  let statusLine;
  if (
    $[4] !== columns ||
    $[5] !== step.status ||
    $[6] !== rowInfo.annotation ||
    $[7] !== rowInfo.detail ||
    $[8] !== rowInfo.label
  ) {
    statusLine = jsxProd_default(BootstrapStatusLine, {
      status: step.status,
      label: rowInfo.label,
      annotation: rowInfo.annotation,
      detail: rowInfo.detail,
      columns,
      detailOverflow: "wrap",
    });
    $[4] = columns;
    $[5] = step.status;
    $[6] = rowInfo.annotation;
    $[7] = rowInfo.detail;
    $[8] = rowInfo.label;
    $[9] = statusLine;
  } else statusLine = $[9];
  return statusLine;
}
export { CloudCreateChecklist };
