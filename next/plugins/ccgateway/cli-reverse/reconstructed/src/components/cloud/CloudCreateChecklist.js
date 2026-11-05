/**
 * components/cloud/CloudCreateChecklist.tsx
 *
 * 2.1.316 新增：云会话创建进度清单（容器准备、克隆、安装脚本、启动 CC），可取消，期间可先打字；云会话创建期间可先输入消息的提示行等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-v9yftdr9.js (12)
 * attribution: placement 10, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import {
  earlyInputFieldText,
  isEarlyInputSeeded,
  markEarlyInputFieldQueued,
  openEarlyInputField,
  isEarlyInputFieldQueued,
  editEarlyInputField,
  noteEarlyInputFieldKey,
} from "../../utils/earlyInput.js";
import { stripInvisibleChars_2 } from "../../utils/invisibleChars.js";
import { TRUNCATE_THRESHOLD_CHARS } from "../PromptInput/inputPaste.js";
import { skipInvisibleCharsNotice } from "../../utils/promptTextSanitize.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PromptInputModeIndicator } from "../PromptInput/PromptInputModeIndicator.js";
import { Box, Text } from "../../ink/components/Text.js";
import { TextInput } from "../TextInput.js";
import { setupStepLabel, createSetupProgress } from "../../services/cloudSessions/setupProgress.js";
import { BootstrapStatusLine } from "../RemoteBootstrapProgress.js";
import { useInterval } from "../../ink/components/Input.js";
import { uploadProgressPhase, cloudCreateTitle, teleportProgressRow } from "../TeleportProgress.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { logEvent } from "../../services/analytics/index.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";

//@ chunk-v9yftdr9.js:15463-15467 placement
init_react_production();
//@ chunk-v9yftdr9.js:15467-15615 layout
function queueEarlyInputFieldText() {
  let fieldText = earlyInputFieldText();
  let stripped = stripInvisibleChars_2(fieldText);
  if (
    isEarlyInputSeeded() ||
    fieldText.length > TRUNCATE_THRESHOLD_CHARS ||
    stripped.removedTotal > 0 ||
    skipInvisibleCharsNotice(
      stripped.text,
      {
        ...stripped,
        textLength: fieldText.length,
      },
      "prompt",
    )
  )
    return false;
  markEarlyInputFieldQueued();
  return true;
}
//@ chunk-v9yftdr9.js:15615-15619 placement
init_react_production();
//@ chunk-v9yftdr9.js:15619-15631 placement
var CHECKLIST_WIDTH_RESERVE = 2;
var MAX_CHECKLIST_VISIBLE_LINES = 6;
//@ chunk-v9yftdr9.js:15631-15734 placement (2.1.88 match: _temp18, 1)
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
//@ chunk-v9yftdr9.js:15734-16420 placement
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
//@ chunk-v9yftdr9.js:16420-16452 placement
function nowMs() {
  return Date.now();
}
//@ chunk-v9yftdr9.js:16452-16489 placement
function initialSetupStep(step) {
  return setupStepLabel(step, "new");
}
//@ chunk-v9yftdr9.js:16489-16550 placement
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
//@ chunk-v9yftdr9.js:16550-16561 layout
var cloudHomeFrameModule = null;
//@ chunk-v9yftdr9.js:16561-19444 placement
/**
 * 云会话创建进度清单（容器准备、克隆、安装脚本、启动 CC），可取消，期间可先打字。
 */
function CloudCreateChecklist(props) {
  let $ = useMemoCache(51);
  let { state, cancelling, onCancel, hasPromptLine, isQuestionWaiting, home } = props;
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
  if ($[3] !== hasPromptLine) {
    uploadPhase = () => hasPromptLine && isEarlyInputFieldQueued();
    $[3] = hasPromptLine;
    $[4] = uploadPhase;
  } else uploadPhase = $[4];
  let [promptText, setPromptText] = useState(uploadPhase);
  let isCreated;
  if ($[5] !== state) {
    isCreated = uploadProgressPhase(state);
    $[5] = state;
    $[6] = isCreated;
  } else isCreated = $[6];
  let isCreated_2 = isCreated === "created";
  let exitHandler;
  if ($[7] !== onCancel || $[8] !== earlyInput) {
    exitHandler = () => (earlyInput === "" ? onCancel() : false);
    $[7] = onCancel;
    $[8] = earlyInput;
    $[9] = exitHandler;
  } else exitHandler = $[9];
  let keymap;
  if ($[10] !== onCancel || $[11] !== exitHandler) {
    keymap = {
      "app:interrupt": onCancel,
      "app:exit": exitHandler,
    };
    $[10] = onCancel;
    $[11] = exitHandler;
    $[12] = keymap;
  } else keymap = $[12];
  let globalKeymap = keymap;
  const isActive = !isCreated_2;
  let keymapContext;
  if ($[13] !== isActive) {
    keymapContext = {
      context: "Global",
      isActive,
    };
    $[13] = isActive;
    $[14] = keymapContext;
  } else keymapContext = $[14];
  MessageActionsKeybindings(globalKeymap, keymapContext);
  let statusView;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    statusView = createSetupProgress(0, {
      wake: false,
    }).steps.map(initialSetupStep);
    $[15] = statusView;
  } else statusView = $[15];
  let stepRows = statusView;
  let wakeSteps = cancelling
    ? "Cancelling\u2026"
    : !hasPromptLine
      ? "Typing is paused until the prompt opens"
      : isQuestionWaiting
        ? "A question is waiting. Pause typing to see it"
        : promptText
          ? "Your message will be sent once the session opens"
          : isSending
            ? "Not sent. You can send your message once the session opens"
            : null;
  let children;
  if ($[16] !== state) {
    children = cloudCreateTitle(state);
    $[16] = state;
    $[17] = children;
  } else children = $[17];
  let statusTitle;
  if ($[18] !== children) {
    statusTitle = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[18] = children;
    $[19] = statusTitle;
  } else statusTitle = $[19];
  let stepRowElements;
  if ($[20] !== columns || $[21] !== now || $[22] !== state) {
    stepRowElements = state.steps.map((step) =>
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
    $[20] = columns;
    $[21] = now;
    $[22] = state;
    $[23] = stepRowElements;
  } else stepRowElements = $[23];
  let wakeRows;
  if ($[24] !== isCreated_2) {
    wakeRows = !isCreated_2 && stepRows.map(pendingStepLine);
    $[24] = isCreated_2;
    $[25] = wakeRows;
  } else wakeRows = $[25];
  let bodyBox;
  if ($[26] !== statusTitle || $[27] !== stepRowElements || $[28] !== wakeRows) {
    bodyBox = jsxProd_default_2(Fragment, {
      children: [statusTitle, stepRowElements, wakeRows],
    });
    $[26] = statusTitle;
    $[27] = stepRowElements;
    $[28] = wakeRows;
    $[29] = bodyBox;
  } else bodyBox = $[29];
  let promptField = bodyBox;
  let warnBox;
  if ($[30] !== hasPromptLine || $[31] !== earlyInput || $[32] !== isSending) {
    warnBox =
      hasPromptLine &&
      jsxProd_default(CloudPromptLine, {
        text: earlyInput,
        onChange: (buffer) => {
          setEarlyInput(buffer);
          editEarlyInputField(buffer);
          setIsSending(false);
          setPromptText(false);
        },
        onKey: noteEarlyInputFieldKey,
        onReturn: () => {
          let queuedReturn = isEarlyInputFieldQueued();
          if (queueEarlyInputFieldText()) {
            setPromptText(true);
            if (!queuedReturn) logEvent("tengu_cloud_create_prompt_queued", {});
            return;
          }
          if (!isSending) {
            logEvent("tengu_cloud_create_prompt_return_ignored", {});
            setIsSending(true);
          }
        },
      });
    $[30] = hasPromptLine;
    $[31] = earlyInput;
    $[32] = isSending;
    $[33] = warnBox;
  } else warnBox = $[33];
  let hintRow;
  if ($[34] !== cancelling || $[35] !== isCreated_2 || $[36] !== wakeSteps) {
    hintRow =
      !isCreated_2 &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: jsxProd_default_2(Byline, {
            children: [
              wakeSteps === null
                ? jsxProd_default(KeyboardShortcutHint, {
                    chord: "enter",
                    action: "send your message once the session opens",
                  })
                : jsxProd_default(Text, {
                    children: wakeSteps,
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
    $[34] = cancelling;
    $[35] = isCreated_2;
    $[36] = wakeSteps;
    $[37] = hintRow;
  } else hintRow = $[37];
  let contentChildren;
  if ($[38] !== warnBox || $[39] !== hintRow) {
    contentChildren = jsxProd_default_2(Fragment, {
      children: [warnBox, hintRow],
    });
    $[38] = warnBox;
    $[39] = hintRow;
    $[40] = contentChildren;
  } else contentChildren = $[40];
  let content = contentChildren;
  if (cloudHomeFrameModule !== null && home !== undefined) {
    let footer;
    if ($[41] !== content) {
      footer = jsxProd_default(Box, {
        flexDirection: "column",
        marginBottom: 1,
        flexShrink: 0,
        children: content,
      });
      $[41] = content;
      $[42] = footer;
    } else footer = $[42];
    let footerRow;
    if ($[43] !== home.showRoster || $[44] !== home.tabs || $[45] !== promptField || $[46] !== footer) {
      footerRow = jsxProd_default(cloudHomeFrameModule.CloudHomeFrame, {
        tabs: home.tabs,
        sessionId: undefined,
        offersNew: false,
        showRoster: home.showRoster,
        onMainScreen: true,
        footer,
        children: promptField,
      });
      $[43] = home.showRoster;
      $[44] = home.tabs;
      $[45] = promptField;
      $[46] = footer;
      $[47] = footerRow;
    } else footerRow = $[47];
    return footerRow;
  }
  let framed;
  if ($[48] !== content || $[49] !== promptField) {
    framed = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [promptField, content],
    });
    $[48] = content;
    $[49] = promptField;
    $[50] = framed;
  } else framed = $[50];
  return framed;
}
//@ chunk-v9yftdr9.js:19444-19892 placement
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
