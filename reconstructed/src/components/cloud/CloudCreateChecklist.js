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
import { init_react_production, y } from "../../../vendor/react/cjs/react.production.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
function sanitizePromptLine(C) {
  return stripAnsi(C)
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
  let h = w(8);
  let { text, onChange, onKey, onReturn } = props;
  let { columns } = useTerminalSize();
  let [m, l] = y(text.length);
  let o;
  if (h[0] === MEMO_CACHE_SENTINEL) {
    o = jsxProd_default(PromptInputModeIndicator, {
      mode: "prompt",
      isLoading: false,
    });
    h[0] = o;
  } else o = h[0];
  const columns_2 = Math.max(1, columns - CHECKLIST_WIDTH_RESERVE);
  let R;
  if (
    h[1] !== m ||
    h[2] !== onChange ||
    h[3] !== onKey ||
    h[4] !== onReturn ||
    h[5] !== columns_2 ||
    h[6] !== text
  ) {
    R = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginTop: 1,
      children: [
        o,
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
          cursorOffset: m,
          onChangeCursorOffset: l,
        }),
      ],
    });
    h[1] = m;
    h[2] = onChange;
    h[3] = onKey;
    h[4] = onReturn;
    h[5] = columns_2;
    h[6] = text;
    h[7] = R;
  } else R = h[7];
  return R;
}
//@ chunk-fr4xjkmb.js:15077-15109 placement
function nowMs() {
  return Date.now();
}
//@ chunk-fr4xjkmb.js:15109-15146 placement
function initialSetupStep(Ke) {
  return setupStepLabel(Ke, "new");
}
//@ chunk-fr4xjkmb.js:15146-15207 placement
function pendingStepLine(ie) {
  return jsxProd_default(
    BootstrapStatusLine,
    {
      status: "pending",
      label: ie,
    },
    ie,
  );
}
//@ chunk-fr4xjkmb.js:15207-17271 placement
/**
 * 云会话创建进度清单（容器准备、克隆、安装脚本、启动 CC），可取消，期间可先打字。
 */
function CloudCreateChecklist(props) {
  let o = w(40);
  let { state, cancelling, onCancel, hasPromptLine, isQuestionWaiting } = props;
  let { columns } = useTerminalSize();
  let [l, h] = y(nowMs);
  let x;
  if (o[0] === MEMO_CACHE_SENTINEL) {
    x = () => h(Date.now());
    o[0] = x;
  } else x = o[0];
  useInterval(x, 1000);
  let R;
  if (o[1] !== hasPromptLine) {
    R = () => (hasPromptLine ? openEarlyInputField() : "");
    o[1] = hasPromptLine;
    o[2] = R;
  } else R = o[2];
  let [d, ke] = y(R);
  let [g, Z] = y(false);
  let ee;
  if (o[3] !== state) {
    ee = uploadProgressPhase(state);
    o[3] = state;
    o[4] = ee;
  } else ee = o[4];
  let u = ee === "created";
  let v;
  if (o[5] !== onCancel || o[6] !== d) {
    v = () => (d === "" ? onCancel() : false);
    o[5] = onCancel;
    o[6] = d;
    o[7] = v;
  } else v = o[7];
  let te;
  if (o[8] !== onCancel || o[9] !== v) {
    te = {
      "app:interrupt": onCancel,
      "app:exit": v,
    };
    o[8] = onCancel;
    o[9] = v;
    o[10] = te;
  } else te = o[10];
  let De = te;
  const isActive = !u;
  let oe;
  if (o[11] !== isActive) {
    oe = {
      context: "Global",
      isActive,
    };
    o[11] = isActive;
    o[12] = oe;
  } else oe = o[12];
  MessageActionsKeybindings(De, oe);
  let ne;
  if (o[13] === MEMO_CACHE_SENTINEL) {
    ne = createSetupProgress(0, {
      wake: false,
    }).steps.map(initialSetupStep);
    o[13] = ne;
  } else ne = o[13];
  let We = ne;
  let children;
  if (o[14] !== state) {
    children = cloudCreateTitle(state);
    o[14] = state;
    o[15] = children;
  } else children = o[15];
  let L;
  if (o[16] !== children) {
    L = jsxProd_default(Text, {
      bold: true,
      children,
    });
    o[16] = children;
    o[17] = L;
  } else L = o[17];
  let O;
  if (o[18] !== columns || o[19] !== l || o[20] !== state) {
    O = state.steps.map((step) =>
      jsxProd_default(
        ChecklistStep,
        {
          step,
          state,
          now: l,
          columns,
        },
        step.id,
      ),
    );
    o[18] = columns;
    o[19] = l;
    o[20] = state;
    o[21] = O;
  } else O = o[21];
  let N;
  if (o[22] !== u) {
    N = !u && We.map(pendingStepLine);
    o[22] = u;
    o[23] = N;
  } else N = o[23];
  let k;
  if (o[24] !== hasPromptLine || o[25] !== d || o[26] !== g) {
    k =
      hasPromptLine &&
      jsxProd_default(CloudPromptLine, {
        text: d,
        onChange: (buffer) => {
          ke(buffer);
          editEarlyInputField(buffer);
          Z(false);
        },
        onKey: noteEarlyInputFieldKey,
        onReturn: () => {
          if (!g) {
            logEvent("tengu_cloud_create_prompt_return_ignored", {});
            Z(true);
          }
        },
      });
    o[24] = hasPromptLine;
    o[25] = d;
    o[26] = g;
    o[27] = k;
  } else k = o[27];
  let D;
  if (
    o[28] !== cancelling ||
    o[29] !== u ||
    o[30] !== hasPromptLine ||
    o[31] !== isQuestionWaiting ||
    o[32] !== g
  ) {
    D =
      !u &&
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
                      : g
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
    o[28] = cancelling;
    o[29] = u;
    o[30] = hasPromptLine;
    o[31] = isQuestionWaiting;
    o[32] = g;
    o[33] = D;
  } else D = o[33];
  let ae;
  if (o[34] !== L || o[35] !== O || o[36] !== N || o[37] !== k || o[38] !== D) {
    ae = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [L, O, N, k, D],
    });
    o[34] = L;
    o[35] = O;
    o[36] = N;
    o[37] = k;
    o[38] = D;
    o[39] = ae;
  } else ae = o[39];
  return ae;
}
//@ chunk-fr4xjkmb.js:17271-17719 placement
/**
 * 清单中的一个步骤行（状态、注释、详情）。
 */
function ChecklistStep(props) {
  let f = w(10);
  let { step, state, now, columns } = props;
  let m;
  if (f[0] !== now || f[1] !== state || f[2] !== step) {
    m = teleportProgressRow(step, state, now);
    f[0] = now;
    f[1] = state;
    f[2] = step;
    f[3] = m;
  } else m = f[3];
  let l = m;
  let h;
  if (
    f[4] !== columns ||
    f[5] !== step.status ||
    f[6] !== l.annotation ||
    f[7] !== l.detail ||
    f[8] !== l.label
  ) {
    h = jsxProd_default(BootstrapStatusLine, {
      status: step.status,
      label: l.label,
      annotation: l.annotation,
      detail: l.detail,
      columns,
      detailOverflow: "wrap",
    });
    f[4] = columns;
    f[5] = step.status;
    f[6] = l.annotation;
    f[7] = l.detail;
    f[8] = l.label;
    f[9] = h;
  } else h = f[9];
  return h;
}
