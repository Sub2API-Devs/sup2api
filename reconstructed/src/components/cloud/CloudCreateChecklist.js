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
import { j, y } from "../../../vendor/react/cjs/react.production.js";
import { Yn } from "../../utils/stripAnsi.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PromptInputModeIndicator } from "../PromptInput/PromptInputModeIndicator.js";
import { Box, Text } from "../../ink/components/Text.js";
import { TextInput } from "../TextInput.js";
import { setupStepLabel, createSetupProgress } from "../../services/cloudSessions/setupProgress.js";
import { BootstrapStatusLine } from "../RemoteBootstrapProgress.js";
import { useInterval } from "../../ink/components/Input.js";
import { openEarlyInputField, editEarlyInputField, noteEarlyInputFieldKey } from "../../utils/earlyInput.js";
import { uploadProgressPhase, cloudCreateTitle, Vfo } from "../TeleportProgress.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { logEvent } from "../../services/analytics/index.js";
import { Byline } from "../design-system/Byline.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";

//@ chunk-fr4xjkmb.js:14268-14272 placement
j();
//@ chunk-fr4xjkmb.js:14272-14276 placement
j();
//@ chunk-fr4xjkmb.js:14276-14288 placement
var q = 2,
  E = 6;
//@ chunk-fr4xjkmb.js:14288-14391 placement = _temp18 (1)
function sanitizePromptLine(C) {
  return Yn(C)
    .replace(
      /\r\n|\r/g,
      `
`,
    )
    .replaceAll("\t", "    ")
    .replace(/[^\P{Cc}\n]/gu, "");
}
/**
 * 云会话创建期间可先输入消息的提示行。
 */
//@ chunk-fr4xjkmb.js:14391-15077 placement
function CloudPromptLine(C) {
  let h = w(8),
    { text: text, onChange: onChange, onKey: onKey, onReturn: onReturn } = C,
    { columns: columns } = useTerminalSize(),
    [m, l] = y(text.length),
    o;
  if (h[0] === MEMO_CACHE_SENTINEL)
    ((o = e(PromptInputModeIndicator, { mode: "prompt", isLoading: !1 })), (h[0] = o));
  else o = h[0];
  const max = Math.max(1, columns - q);
  let R;
  if (h[1] !== m || h[2] !== onChange || h[3] !== onKey || h[4] !== onReturn || h[5] !== max || h[6] !== text)
    ((R = r(Box, {
      flexDirection: "row",
      marginTop: 1,
      children: [
        o,
        e(TextInput, {
          value: text,
          onChange: onChange,
          onKeyDownBefore: onKey,
          inputFilter: sanitizePromptLine,
          onSubmit: onReturn,
          clearOnSubmit: !1,
          multiline: !0,
          disableCtrlCClear: !0,
          disableEscapeDoublePress: !0,
          placeholder: "Type your message while the session is set up",
          focus: !0,
          showCursor: !0,
          columns: max,
          maxVisibleLines: E,
          cursorOffset: m,
          onChangeCursorOffset: l,
        }),
      ],
    })),
      (h[1] = m),
      (h[2] = onChange),
      (h[3] = onKey),
      (h[4] = onReturn),
      (h[5] = max),
      (h[6] = text),
      (h[7] = R));
  else R = h[7];
  return R;
}
//@ chunk-fr4xjkmb.js:15077-15109 placement
function Le() {
  return Date.now();
}
//@ chunk-fr4xjkmb.js:15109-15146 placement
function Oe(Ke) {
  return setupStepLabel(Ke, "new");
}
//@ chunk-fr4xjkmb.js:15146-15207 placement
function Ne(ie) {
  return e(BootstrapStatusLine, { status: "pending", label: ie }, ie);
}
/**
 * 云会话创建进度清单（容器准备、克隆、安装脚本、启动 CC），可取消，期间可先打字。
 */
//@ chunk-fr4xjkmb.js:15207-17271 placement
function CloudCreateChecklist(C) {
  let o = w(40),
    {
      state: state,
      cancelling: cancelling,
      onCancel: onCancel,
      hasPromptLine: hasPromptLine,
      isQuestionWaiting: isQuestionWaiting,
    } = C,
    { columns: columns } = useTerminalSize(),
    [l, h] = y(Le),
    x;
  if (o[0] === MEMO_CACHE_SENTINEL) ((x = () => h(Date.now())), (o[0] = x));
  else x = o[0];
  useInterval(x, 1000);
  let R;
  if (o[1] !== hasPromptLine)
    ((R = () => (hasPromptLine ? openEarlyInputField() : "")), (o[1] = hasPromptLine), (o[2] = R));
  else R = o[2];
  let [d, ke] = y(R),
    [g, Z] = y(!1),
    ee;
  if (o[3] !== state) ((ee = uploadProgressPhase(state)), (o[3] = state), (o[4] = ee));
  else ee = o[4];
  let u = ee === "created",
    v;
  if (o[5] !== onCancel || o[6] !== d)
    ((v = () => (d === "" ? onCancel() : !1)), (o[5] = onCancel), (o[6] = d), (o[7] = v));
  else v = o[7];
  let te;
  if (o[8] !== onCancel || o[9] !== v)
    ((te = { "app:interrupt": onCancel, "app:exit": v }), (o[8] = onCancel), (o[9] = v), (o[10] = te));
  else te = o[10];
  let De = te;
  const B = !u;
  let oe;
  if (o[11] !== B) ((oe = { context: "Global", isActive: B }), (o[11] = B), (o[12] = oe));
  else oe = o[12];
  MessageActionsKeybindings(De, oe);
  let ne;
  if (o[13] === MEMO_CACHE_SENTINEL)
    ((ne = createSetupProgress(0, { wake: !1 }).steps.map(Oe)), (o[13] = ne));
  else ne = o[13];
  let We = ne,
    T;
  if (o[14] !== state) ((T = cloudCreateTitle(state)), (o[14] = state), (o[15] = T));
  else T = o[15];
  let L;
  if (o[16] !== T) ((L = e(Text, { bold: !0, children: T })), (o[16] = T), (o[17] = L));
  else L = o[17];
  let O;
  if (o[18] !== columns || o[19] !== l || o[20] !== state)
    ((O = state.steps.map((step) =>
      e(ChecklistStep, { step: step, state: state, now: l, columns: columns }, step.id),
    )),
      (o[18] = columns),
      (o[19] = l),
      (o[20] = state),
      (o[21] = O));
  else O = o[21];
  let N;
  if (o[22] !== u) ((N = !u && We.map(Ne)), (o[22] = u), (o[23] = N));
  else N = o[23];
  let k;
  if (o[24] !== hasPromptLine || o[25] !== d || o[26] !== g)
    ((k =
      hasPromptLine &&
      e(CloudPromptLine, {
        text: d,
        onChange: (re) => {
          (ke(re), editEarlyInputField(re), Z(!1));
        },
        onKey: noteEarlyInputFieldKey,
        onReturn: () => {
          if (!g) (logEvent("tengu_cloud_create_prompt_return_ignored", {}), Z(!0));
        },
      })),
      (o[24] = hasPromptLine),
      (o[25] = d),
      (o[26] = g),
      (o[27] = k));
  else k = o[27];
  let D;
  if (
    o[28] !== cancelling ||
    o[29] !== u ||
    o[30] !== hasPromptLine ||
    o[31] !== isQuestionWaiting ||
    o[32] !== g
  )
    ((D =
      !u &&
      e(Box, {
        marginTop: 1,
        children: e(Text, {
          dimColor: !0,
          children: r(Byline, {
            children: [
              e(Text, {
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
              e(ConfigurableShortcutHint, {
                action: "app:interrupt",
                context: "Global",
                fallback: "ctrl+c",
                description: cancelling ? "quit now" : "cancel",
              }),
            ],
          }),
        }),
      })),
      (o[28] = cancelling),
      (o[29] = u),
      (o[30] = hasPromptLine),
      (o[31] = isQuestionWaiting),
      (o[32] = g),
      (o[33] = D));
  else D = o[33];
  let ae;
  if (o[34] !== L || o[35] !== O || o[36] !== N || o[37] !== k || o[38] !== D)
    ((ae = r(Box, { flexDirection: "column", marginTop: 1, children: [L, O, N, k, D] })),
      (o[34] = L),
      (o[35] = O),
      (o[36] = N),
      (o[37] = k),
      (o[38] = D),
      (o[39] = ae));
  else ae = o[39];
  return ae;
}
/**
 * 清单中的一个步骤行（状态、注释、详情）。
 */
//@ chunk-fr4xjkmb.js:17271-17719 placement
function ChecklistStep(C) {
  let f = w(10),
    { step: step, state: state, now: now, columns: columns } = C,
    m;
  if (f[0] !== now || f[1] !== state || f[2] !== step)
    ((m = Vfo(step, state, now)), (f[0] = now), (f[1] = state), (f[2] = step), (f[3] = m));
  else m = f[3];
  let l = m,
    h;
  if (
    f[4] !== columns ||
    f[5] !== step.status ||
    f[6] !== l.annotation ||
    f[7] !== l.detail ||
    f[8] !== l.label
  )
    ((h = e(BootstrapStatusLine, {
      status: step.status,
      label: l.label,
      annotation: l.annotation,
      detail: l.detail,
      columns: columns,
      detailOverflow: "wrap",
    })),
      (f[4] = columns),
      (f[5] = step.status),
      (f[6] = l.annotation),
      (f[7] = l.detail),
      (f[8] = l.label),
      (f[9] = h));
  else h = f[9];
  return h;
}
