/**
 * components/messages/UserPromptMessage.tsx
 *
 * 普通用户提示回显（userMessageBackground 背景，brief 模式特殊处理）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserPromptMessage.tsx
 * pieces: chunk-ah34pb7m.js (15)
 * attribution: placement 14, fingerprint 1
 */
import { j, qt, Se } from "../../../vendor/react/cjs/react.production.js";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { QAr, splitLongTextForCollapse } from "./UserMessageSite.js";
import { parsePastedRefs, formatImageRef } from "../../history.js";
import { isImagePlaceholder } from "../../commands.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { isHumanInitiatedMessage } from "../../utils/messagePredicates.js";
import { shortUuid } from "../../utils/transcriptDiagnostics.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { parseWrappedPluginPrompt, Edo } from "../../utils/messages/pluginPrompts.js";
import { CW } from "../../utils/messages/nonUserMessages.js";
import { useAppState } from "../../state/AppState.js";
import { a9 } from "../../utils/formatBriefTimestamp.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text, Box } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { toSafeFileUrl } from "../../services/mcp/xaa.js";
import { getUserMsgOptIn } from "../../bootstrap/state.js";
import { isVirtualPancakeEnabled } from "../../utils/permissions/permissionSetup.js";
import { expandPastedContent } from "../../utils/pastedContent.js";
import { v0e } from "../../utils/userTurnTags.js";
import { logError } from "../../utils/log.js";
import { CollapsibleText } from "./CollapsedLines.js";
import { HighlightedThinkingText } from "./HighlightedThinkingText.js";

//@ chunk-ah34pb7m.js:113172-113176 placement
j();
/**
 * 是否显示子代理历史（CLAUDE_CODE_SUBAGENT_HISTORY 或开关 tengu_rustling_crescent）。
 */
//@ chunk-ah34pb7m.js:113176-113262 placement
function isSubagentHistoryEnabled() {
  return (
    env.CLAUDE_CODE_SUBAGENT_HISTORY ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_rustling_crescent", !1)
  );
}
/**
 * 人工输入的提示里，返回图片占位符的 id 集合（非人工来源返回空集）。
 */
//@ chunk-ah34pb7m.js:113262-113398 placement
function getImagePlaceholderIds(m, d) {
  if ((d !== void 0 && d.kind !== "human") || !QAr(m)) return new Set();
  return new Set(
    parsePastedRefs(m)
      .filter((c) => isImagePlaceholder(c.match))
      .map((c) => c.id),
  );
}
//@ chunk-ah34pb7m.js:113398-113402 placement
j();
//@ chunk-ah34pb7m.js:113402-113446 placement
var PLACEHOLDER = "placeholder",
  Mk = "-c1a0-4de0-8e00-";
//@ chunk-ah34pb7m.js:113446-113521 placement
function Iho(m) {
  return `${m.toString(16).padStart(8, "0")}${Mk}000000000000`;
}
//@ chunk-ah34pb7m.js:113521-113559 placement
function yk(m) {
  return m.slice(8) === Mk;
}
/**
 * 跟踪粘贴基线与挂起状态。
 */
//@ chunk-ah34pb7m.js:113559-113969 placement
class PasteTracker {
  #o = 0;
  #e = !1;
  #t = "";
  get baseline() {
    return this.#o;
  }
  get pending() {
    return this.#e;
  }
  start(m, d) {
    ((this.#o = m), (this.#e = !0), (this.#t = d));
  }
  stop() {
    ((this.#e = !1), (this.#t = ""));
  }
  track(m, d) {
    if (d.length < this.#o) return ((this.#o = 0), (this.#e = !1), (this.#t = ""), !0);
    if (d.length > m.length && this.#e) {
      let c = d.length - m.length;
      if (
        (m.length === 0 || d[0] === m[0] ? d.slice(-c) : d.slice(0, c)).some((f) =>
          isHumanInitiatedMessage(f, this.#t),
        )
      )
        this.#e = !1;
      else this.#o = d.length;
    }
    return !1;
  }
}
//@ chunk-ah34pb7m.js:113969-113986 placement
var Ptn = qt(null);
//@ chunk-ah34pb7m.js:113986-114195 placement
function usePromptAwaitingModel(m) {
  let d = Se(Ptn),
    c = shortUuid({ uuid: m }),
    g = useStoreSelector(
      d === "every" ? null : d,
      (f) =>
        c !== void 0 &&
        (yk(c)
          ? f.placeholderWaitedInQueue
          : f.promptsAwaitingModel.size > 0 && f.promptsAwaitingModel.has(c)),
    );
  return d === "every" || g === !0;
}
//@ chunk-ah34pb7m.js:114195-114373 placement
function getViewedAgentLabel(ge) {
  let ae = ge.viewingAgentTaskId ? ge.tasks[ge.viewingAgentTaskId] : void 0;
  return ae?.type !== "local_agent" || !isSubagentHistoryEnabled()
    ? null
    : ae.parentAgentId === void 0
      ? "main"
      : "another agent";
}
//@ chunk-ah34pb7m.js:114373-114411 placement
function dN(Pe) {
  return Pe.isBriefOnly;
}
//@ chunk-ah34pb7m.js:114411-114456 placement = _temp2 (1)
function selectViewingAgentTaskId(s_0) {
  return s_0.viewingAgentTaskId;
}
/**
 * 用户提示消息（插件提示词来源、展开）。
 */
//@ chunk-ah34pb7m.js:114456-115862 placement
function UserPromptText(m) {
  let T = w(28),
    { messageId: messageId, origin: origin, pluginPrompt: pluginPrompt, isExpanded: isExpanded } = m,
    text = m.param.text,
    M = origin?.kind === "plugin" ? origin.name : void 0,
    x;
  if (T[0] !== pluginPrompt || T[1] !== text)
    ((x = parseWrappedPluginPrompt(text, pluginPrompt)), (T[0] = pluginPrompt), (T[1] = text), (T[2] = x));
  else x = T[2];
  let k = x,
    b;
  if (T[3] !== M || T[4] !== k || T[5] !== text)
    ((b = k !== void 0 && M !== void 0 && k.label === CW(M) ? k.text : text),
      (T[3] = M),
      (T[4] = k),
      (T[5] = text),
      (T[6] = b));
  else b = T[6];
  let E = b,
    B = useAppState(getViewedAgentLabel),
    L = m.followsSpeakerLabel || m.followsInboundLabel,
    N;
  if (T[7] !== B || T[8] !== L || T[9] !== origin)
    ((N =
      origin?.kind === "plugin"
        ? Edo(CW(origin.name))
        : origin?.kind === "coordinator" && B !== null && !L
          ? origin.plugin === void 0
            ? `From ${B}`
            : `From the ${CW(origin.plugin)} plugin`
          : void 0),
      (T[7] = B),
      (T[8] = L),
      (T[9] = origin),
      (T[10] = N));
  else N = T[10];
  let W = N,
    U;
  if (T[11] !== m || T[12] !== text || T[13] !== W)
    ((U = (K) =>
      e(UserPromptMessage, {
        ...m,
        addMargin: W === void 0 && m.addMargin,
        param: K === text ? m.param : { ...m.param, text: K },
      })),
      (T[11] = m),
      (T[12] = text),
      (T[13] = W),
      (T[14] = U));
  else U = T[14];
  let V;
  if (T[15] !== isExpanded || T[16] !== messageId || T[17] !== origin || T[18] !== U || T[19] !== E)
    ((V = { messageId: messageId, stored: origin, text: E, isExpanded: isExpanded, draw: U }),
      (T[15] = isExpanded),
      (T[16] = messageId),
      (T[17] = origin),
      (T[18] = U),
      (T[19] = E),
      (T[20] = V));
  else V = T[20];
  let useUserMessageSite = a9.useUserMessageSite(V);
  if (W === void 0) {
    return useUserMessageSite;
  }
  const X = m.addMargin && !L ? 1 : 0;
  let z;
  if (T[21] === MEMO_CACHE_SENTINEL)
    ((z = r(Text, { "aria-hidden": !0, children: [re.pointerSmall, " "] })), (T[21] = z));
  else z = T[21];
  let ee;
  if (T[22] !== W) ((ee = r(Text, { dimColor: !0, children: [z, W] })), (T[22] = W), (T[23] = ee));
  else ee = T[23];
  let le;
  if (T[24] !== useUserMessageSite || T[25] !== X || T[26] !== ee)
    ((le = r(Box, { flexDirection: "column", marginTop: X, children: [ee, useUserMessageSite] })),
      (T[24] = useUserMessageSite),
      (T[25] = X),
      (T[26] = ee),
      (T[27] = le));
  else le = T[27];
  return le;
}
//@ chunk-ah34pb7m.js:115862-117725 fingerprint = UserPromptMessage (0.706)
function UserPromptMessage(m) {
  let $ = w(33),
    {
      addMargin: addMargin,
      param: param,
      isTranscriptMode: isTranscriptMode,
      timestamp: timestamp,
      messageId: messageId,
      origin: origin,
      followsSpeakerLabel: followsSpeakerLabel,
      followsInboundLabel: followsInboundLabel,
    } = m,
    { text: text } = param,
    b = followsSpeakerLabel === void 0 ? !1 : followsSpeakerLabel,
    E = followsInboundLabel === void 0 ? !1 : followsInboundLabel,
    B = usePromptAwaitingModel(messageId),
    N;
  if ($[0] !== b || $[1] !== origin || $[2] !== text)
    ((N = b && text ? [...getImagePlaceholderIds(text, origin)] : []),
      ($[0] = b),
      ($[1] = origin),
      ($[2] = text),
      ($[3] = N));
  else N = $[3];
  let W = N,
    U;
  if ($[4] !== W)
    ((U = (K) => W.map((V) => K.storedImagePaths.get(V) ?? "").join("\x00")), ($[4] = W), ($[5] = U));
  else U = $[5];
  let Y = useAppState(U),
    X;
  if ($[6] !== W || $[7] !== Y) {
    let z = new Map();
    let parts = Y.split("\x00");
    X =
      (W.forEach((le, ge) => {
        let ae = parts[ge];
        let pe = ae ? toSafeFileUrl(ae) : null;
        if (pe !== null) z.set(formatImageRef(le), pe);
      }),
      z.size > 0 ? z : void 0);
    (($[6] = W), ($[7] = Y), ($[8] = X));
  } else X = $[8];
  let te = X,
    isBriefOnly = useAppState(dN),
    viewingAgentTaskId = useAppState(selectViewingAgentTaskId),
    CLAUDE_CODE_BRIEF = env.CLAUDE_CODE_BRIEF,
    se;
  if ($[9] !== isBriefOnly || $[10] !== isTranscriptMode || $[11] !== viewingAgentTaskId)
    ((se =
      getUserMsgOptIn() &&
      (CLAUDE_CODE_BRIEF || getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_brief", !1)) &&
      isBriefOnly &&
      !isTranscriptMode &&
      !viewingAgentTaskId),
      ($[9] = isBriefOnly),
      ($[10] = isTranscriptMode),
      ($[11] = viewingAgentTaskId),
      ($[12] = se));
  else se = $[12];
  let ye = se,
    Te;
  if ($[13] !== text)
    ((Te = isVirtualPancakeEnabled() ? expandPastedContent(text, v0e()) : text),
      ($[13] = text),
      ($[14] = Te));
  else Te = $[14];
  let Me;
  if ($[15] !== Te) ((Me = splitLongTextForCollapse(Te)), ($[15] = Te), ($[16] = Me));
  else Me = $[16];
  let be = Me;
  if (!text) {
    return (logError(Error("No content found in user prompt message")), null);
  }
  if (E) {
    let ve;
    if ($[17] !== text) ((ve = e(CollapsibleText, { text: text })), ($[17] = text), ($[18] = ve));
    else ve = $[18];
    return ve;
  }
  if (b) {
    let ve;
    if ($[19] !== B || $[20] !== be || $[21] !== te)
      ((ve = e(Box, {
        flexDirection: "column",
        flexGrow: 1,
        backgroundColor: "userMessageBackground",
        children: e(HighlightedThinkingText, { text: be, bodyOnly: !0, awaitingModel: B, markLinks: te }),
      })),
        ($[19] = B),
        ($[20] = be),
        ($[21] = te),
        ($[22] = ve));
    else ve = $[22];
    return ve;
  }
  const ve = addMargin ? 1 : 0,
    Ue = ye ? void 0 : "userMessageBackground",
    we = ye ? 0 : 1,
    $e = ye ? timestamp : void 0;
  let De;
  if ($[23] !== B || $[24] !== be || $[25] !== $e || $[26] !== ye)
    ((De = e(HighlightedThinkingText, { text: be, useBriefLayout: ye, timestamp: $e, awaitingModel: B })),
      ($[23] = B),
      ($[24] = be),
      ($[25] = $e),
      ($[26] = ye),
      ($[27] = De));
  else De = $[27];
  let xe;
  if ($[28] !== ve || $[29] !== Ue || $[30] !== we || $[31] !== De)
    ((xe = e(Box, {
      flexDirection: "column",
      marginTop: ve,
      backgroundColor: Ue,
      paddingRight: we,
      children: De,
    })),
      ($[28] = ve),
      ($[29] = Ue),
      ($[30] = we),
      ($[31] = De),
      ($[32] = xe));
  else xe = $[32];
  return xe;
}

export {
  isSubagentHistoryEnabled,
  Iho,
  PasteTracker,
  Ptn,
  PLACEHOLDER,
  UserPromptText,
  getImagePlaceholderIds,
};
