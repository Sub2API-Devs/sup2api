/**
 * components/messages/AssistantTextMessage.tsx
 *
 * 助手文本：Markdown 渲染；特殊错误文本（余额不足、API 超时、过载、prompt too long 等）映射为友好提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/AssistantTextMessage.tsx
 * pieces: chunk-ah34pb7m.js (12)
 * attribution: placement 11, fingerprint 1
 */
import {
  INVALID_API_KEY_MESSAGE,
  DISABLED_ORG_API_KEY_MESSAGE,
  DISABLED_ORG_API_KEY_WITH_SUBSCRIPTION_MESSAGE,
  GATEWAY_UPSTREAM_AUTH_ERROR_MESSAGE,
  TOKEN_REVOKED_MESSAGE,
  INVALID_API_KEY_ERROR_MESSAGE,
  PROMPT_TOO_LONG_ERROR_MESSAGE,
  CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE,
  REQUEST_TIMED_OUT_MESSAGE,
  OPUS_HIGH_LOAD_MESSAGE,
  FABLE_HIGH_LOAD_MESSAGE,
  TUo,
  EUo,
  startsWithApiErrorPrefix,
  API_ERROR_MESSAGE_PREFIX,
  API_ERROR_CONST_1000,
} from "../../services/api/errors.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Qr, fo } from "../../../vendor/react/cjs/react.production.js";
import { eus } from "../../utils/secureStorage/plainTextStorage.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { getUpgradeMessage } from "../../utils/model/contextWindowUpgradeCheck.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { useAppState } from "../../state/AppState.js";
import { Hmt, MessageResponse } from "../MessageResponse.js";
import { isAutoCompactTurnedOffByUser } from "../../services/compact/compactSettings.js";
import { stripPromptXMLTags, isEmptyMessageText, API_REQUEST_ABORTED_MESSAGE } from "../../utils/messages.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import { shouldShowNotice } from "../SlashCommandLink.js";
import { Lr, buildApiErrorRow } from "./CompactBoundaryMessage.js";
import { NoticeRowMessage } from "./teamMemSaved.js";
import { isRateLimitText } from "../../services/api/usage.js";
import { RateLimitMessage } from "./RateLimitMessage.js";
import { NO_RESPONSE_REQUESTED } from "../../constants/messages.js";
import { env } from "../../utils/env.js";
import { renderModelName, renderUsageCreditsOnlyModelName } from "../../utils/model/modelDisplay.js";
import { getDefaultSonnetModel, isFableFamilyOrPinnedModel } from "../../utils/model/model.js";
import { RejectedToolUseMessage } from "./UserToolResultMessage/RejectedToolUseMessage.js";
import { isClaudeAiOriginLink } from "../../services/oauth/oauthErrors.js";
import { safeVerificationUrl } from "../../services/api/verificationRequired.js";
import { NoSelect } from "../../ink/components/Input.js";
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";
import { useMainLoopModel } from "../../hooks/useMainLoopModel.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { LinkifiedText as LinkifiedText_2 } from "../LinkifiedText.js";
import { CtrlOToExpand } from "../CtrlOToExpand.js";
import { gLr } from "../../utils/messages/mappers.js";
import { renderWithForceUpdate } from "../../hooks/useForceRender.js";
import { SUMMARY_TAG } from "../../constants/xml.js";

//@ chunk-ah34pb7m.js:54747-54803 placement
function ME(b) {
  return b.remoteAutocompactState !== void 0;
}
//@ chunk-ah34pb7m.js:54803-54841 placement
var Sy = new Set([
  INVALID_API_KEY_MESSAGE,
  DISABLED_ORG_API_KEY_MESSAGE,
  DISABLED_ORG_API_KEY_WITH_SUBSCRIPTION_MESSAGE,
  GATEWAY_UPSTREAM_AUTH_ERROR_MESSAGE,
  TOKEN_REVOKED_MESSAGE,
]);
//@ chunk-ah34pb7m.js:54841-55026 placement
function KeychainUnlockHint() {
  let d = w(1);
  if (!Qr(eus())) {
    return null;
  }
  let c;
  if (d[0] === MEMO_CACHE_SENTINEL)
    ((c = e(Text, { dimColor: !0, children: "\xB7 Run in another terminal: security unlock-keychain" })),
      (d[0] = c));
  else c = d[0];
  return c;
}
/**
 * 上下文用尽提示（/compact 或 /clear，自动压缩关闭时提示开启）。
 */
//@ chunk-ah34pb7m.js:55026-55539 placement
function ContextLimitHint() {
  let m = w(6),
    d;
  if (m[0] === MEMO_CACHE_SENTINEL) ((d = getUpgradeMessage("warning")), (m[0] = d));
  else d = m[0];
  let c = d,
    g = isEnvTruthy(process.env.DISABLE_COMPACT) ? "/clear to continue" : "/compact or /clear to continue",
    f = useAppState(ME),
    h = Hmt(),
    M =
      !f && !h && isAutoCompactTurnedOffByUser()
        ? " \xB7 auto-compact is off \xB7 /config to turn it on"
        : "";
  const T = M || c ? void 0 : 1;
  let x;
  if (m[1] !== M)
    ((x = r(Text, {
      color: "error",
      children: ["Context limit reached \xB7 ", g, M, c ? ` \xB7 ${c}` : ""],
    })),
      (m[1] = M),
      (m[2] = x));
  else x = m[2];
  let k;
  if (m[3] !== T || m[4] !== x)
    ((k = e(MessageResponse, { height: T, children: x })), (m[3] = T), (m[4] = x), (m[5] = k));
  else k = m[5];
  return k;
}
//@ chunk-ah34pb7m.js:55539-55781 placement
function InvalidApiKeyMessage() {
  let m = w(2),
    d;
  if (m[0] === MEMO_CACHE_SENTINEL)
    ((d = e(Text, { color: "error", children: INVALID_API_KEY_ERROR_MESSAGE })), (m[0] = d));
  else d = m[0];
  let c;
  if (m[1] === MEMO_CACHE_SENTINEL)
    ((c = e(MessageResponse, {
      children: r(Box, {
        flexDirection: "column",
        children: [d, e(fo, { fallback: null, children: e(KeychainUnlockHint, {}) })],
      }),
    })),
      (m[1] = c));
  else c = m[1];
  return c;
}
/**
 * 助手文本块（带首条回复圆点），并向无障碍层报告内容。
 */
//@ chunk-ah34pb7m.js:55781-56282 placement
function AssistantTextBlock(m) {
  let f = w(8),
    { text: text } = m.param,
    { shouldShowDot: shouldShowDot, messageId: messageId } = m,
    h,
    M;
  if (f[0] !== messageId || f[1] !== shouldShowDot || f[2] !== text)
    ((h = () => ({
      requestId: messageId,
      props: { text: stripPromptXMLTags(text), isFirstOfReply: shouldShowDot },
    })),
      (M = [text, shouldShowDot, messageId]),
      (f[0] = messageId),
      (f[1] = shouldShowDot),
      (f[2] = text),
      (f[3] = h),
      (f[4] = M));
  else ((h = f[3]), (M = f[4]));
  let useRenderInput = actionKeysNamespace.useRenderInput("AssistantMessage", h, M),
    text_2 = useRenderInput.props.text,
    k;
  if (f[5] !== text_2 || f[6] !== m)
    ((k = (b) =>
      e(AssistantTextMessage, {
        ...m,
        param: b.props.text === text_2 ? m.param : { ...m.param, text: b.props.text },
        shouldShowDot: b.props.isFirstOfReply,
      })),
      (f[5] = text_2),
      (f[6] = m),
      (f[7] = k));
  else k = f[7];
  return actionKeysNamespace.useRenderHook(useRenderInput, k);
}
/**
 * 助手文本：空文本/占位不渲染；识别 API 错误文本（余额不足、API_TIMEOUT_MS 超时、Opus 高需求、prompt too long、未登录等）显示为错误提示；否则 Markdown 渲染，前面加 ● 圆点（shouldShowDot）。
 */
//@ chunk-ah34pb7m.js:56282-60026 fingerprint = AssistantTextMessage (0.412)
function AssistantTextMessage(t0) {
  let $ = w(55),
    {
      param: t1,
      addMargin: addMargin,
      shouldShowDot: shouldShowDot,
      verbose: verbose,
      isApiError: isApiError,
      isSessionFailureNotice: isSessionFailureNotice,
      apiErrorKind: apiErrorKind,
      onOpenRateLimitOptions: onOpenRateLimitOptions,
      onRateLimitAutoQueueContinue: onRateLimitAutoQueueContinue,
    } = t0,
    { text: text } = t1,
    E = isSessionFailureNotice === void 0 ? !1 : isSessionFailureNotice,
    B = Hmt(),
    L = shouldShowNotice(verbose) && !B;
  if (isEmptyMessageText(text)) {
    return null;
  }
  if (L && text === API_REQUEST_ABORTED_MESSAGE) {
    let W;
    if ($[0] === MEMO_CACHE_SENTINEL) ((W = Lr({ isBySendNow: !1 })), ($[0] = W));
    else W = $[0];
    let U;
    if ($[1] !== addMargin || $[2] !== W)
      ((U = e(NoticeRowMessage, { row: W, addMargin: addMargin })),
        ($[1] = addMargin),
        ($[2] = W),
        ($[3] = U));
    else U = $[3];
    return U;
  }
  if (L && Sy.has(text)) {
    let W;
    if ($[4] !== text) ((W = buildApiErrorRow(text)), ($[4] = text), ($[5] = W));
    else W = $[5];
    let U;
    if ($[6] !== addMargin || $[7] !== W)
      ((U = e(NoticeRowMessage, { row: W, addMargin: addMargin })),
        ($[6] = addMargin),
        ($[7] = W),
        ($[8] = U));
    else U = $[8];
    return U;
  }
  if (isRateLimitText(text)) {
    let W;
    if ($[9] !== onOpenRateLimitOptions || $[10] !== onRateLimitAutoQueueContinue || $[11] !== text)
      ((W = e(RateLimitMessage, {
        text: text,
        onOpenRateLimitOptions: onOpenRateLimitOptions,
        onRateLimitAutoQueueContinue: onRateLimitAutoQueueContinue,
      })),
        ($[9] = onOpenRateLimitOptions),
        ($[10] = onRateLimitAutoQueueContinue),
        ($[11] = text),
        ($[12] = W));
    else W = $[12];
    return W;
  }
  switch (text) {
    case NO_RESPONSE_REQUESTED: {
      return null;
    }
    case PROMPT_TOO_LONG_ERROR_MESSAGE: {
      let W;
      if ($[13] === MEMO_CACHE_SENTINEL) ((W = e(ContextLimitHint, {})), ($[13] = W));
      else W = $[13];
      return W;
    }
    case CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE: {
      let W;
      if ($[14] === MEMO_CACHE_SENTINEL)
        ((W = e(MessageResponse, {
          height: 1,
          children: e(Text, {
            color: "error",
            children: "Credit balance too low \xB7 Add funds: https://platform.claude.com/settings/billing",
          }),
        })),
          ($[14] = W));
      else W = $[14];
      return W;
    }
    case INVALID_API_KEY_ERROR_MESSAGE: {
      let W;
      if ($[15] === MEMO_CACHE_SENTINEL) ((W = e(InvalidApiKeyMessage, {})), ($[15] = W));
      else W = $[15];
      return W;
    }
    case INVALID_API_KEY_MESSAGE: {
      let W;
      if ($[16] === MEMO_CACHE_SENTINEL)
        ((W = e(MessageResponse, {
          height: 1,
          children: e(Text, { color: "error", children: INVALID_API_KEY_MESSAGE }),
        })),
          ($[16] = W));
      else W = $[16];
      return W;
    }
    case DISABLED_ORG_API_KEY_MESSAGE:
    case DISABLED_ORG_API_KEY_WITH_SUBSCRIPTION_MESSAGE:
    case GATEWAY_UPSTREAM_AUTH_ERROR_MESSAGE: {
      let W;
      if ($[17] !== text)
        ((W = e(MessageResponse, { children: e(Text, { color: "error", children: text }) })),
          ($[17] = text),
          ($[18] = W));
      else W = $[18];
      return W;
    }
    case TOKEN_REVOKED_MESSAGE: {
      let W;
      if ($[19] === MEMO_CACHE_SENTINEL)
        ((W = e(MessageResponse, {
          height: 1,
          children: e(Text, { color: "error", children: TOKEN_REVOKED_MESSAGE }),
        })),
          ($[19] = W));
      else W = $[19];
      return W;
    }
    case REQUEST_TIMED_OUT_MESSAGE: {
      let W;
      if ($[20] === MEMO_CACHE_SENTINEL)
        ((W = e(MessageResponse, {
          height: 1,
          children: r(Text, {
            color: "error",
            children: [
              REQUEST_TIMED_OUT_MESSAGE,
              (env.API_TIMEOUT_MS ?? 0) > 0 &&
                r(Fragment, {
                  children: [" (API_TIMEOUT_MS=", env.API_TIMEOUT_MS, "ms, try increasing it)"],
                }),
            ],
          }),
        })),
          ($[20] = W));
      else W = $[20];
      return W;
    }
    case OPUS_HIGH_LOAD_MESSAGE: {
      let W;
      if ($[21] === MEMO_CACHE_SENTINEL)
        ((W = e(Text, { color: "error", children: "We are experiencing high demand for Opus 4." })),
          ($[21] = W));
      else W = $[21];
      let U;
      if ($[22] === MEMO_CACHE_SENTINEL)
        ((U = e(MessageResponse, {
          children: r(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              W,
              r(Text, {
                children: [
                  "To continue immediately, use /model to switch to",
                  " ",
                  renderModelName(getDefaultSonnetModel()),
                  " and continue coding.",
                ],
              }),
            ],
          }),
        })),
          ($[22] = U));
      else U = $[22];
      return U;
    }
    case FABLE_HIGH_LOAD_MESSAGE: {
      let W;
      if ($[23] === MEMO_CACHE_SENTINEL) ((W = e(HighDemandNotice, {})), ($[23] = W));
      else W = $[23];
      return W;
    }
    case API_REQUEST_ABORTED_MESSAGE: {
      let W;
      if ($[24] === MEMO_CACHE_SENTINEL) ((W = e(RejectedToolUseMessage, {})), ($[24] = W));
      else W = $[24];
      return W;
    }
    default: {
      if (text.startsWith(`${PROMPT_TOO_LONG_ERROR_MESSAGE} \xB7 `)) {
        let W;
        if ($[25] === MEMO_CACHE_SENTINEL) ((W = getUpgradeMessage("warning")), ($[25] = W));
        else W = $[25];
        let K = W;
        let U;
        if ($[26] !== text)
          ((U = e(MessageResponse, {
            children: r(Text, {
              color: "error",
              children: [text, " \xB7 /clear to start fresh", K ? ` \xB7 ${K}` : ""],
            }),
          })),
            ($[26] = text),
            ($[27] = U));
        else U = $[27];
        return U;
      }
      if (TUo(text) || (isApiError && EUo(text))) {
        if (L) {
          let W;
          if ($[28] !== text) ((W = buildApiErrorRow(text)), ($[28] = text), ($[29] = W));
          else W = $[29];
          let U;
          if ($[30] !== addMargin || $[31] !== W)
            ((U = e(NoticeRowMessage, { row: W, addMargin: addMargin })),
              ($[30] = addMargin),
              ($[31] = W),
              ($[32] = U));
          else U = $[32];
          return U;
        }
        let W;
        if ($[33] !== text)
          ((W = e(MessageResponse, { children: e(Text, { color: "error", children: text }) })),
            ($[33] = text),
            ($[34] = W));
        else W = $[34];
        return W;
      }
      if (isApiError || startsWithApiErrorPrefix(text) || isClaudeAiOriginLink(text)) {
        if (L) {
          let W;
          if ($[35] !== E || $[36] !== text)
            ((W = buildApiErrorRow(text, { whole: E })), ($[35] = E), ($[36] = text), ($[37] = W));
          else W = $[37];
          let U;
          if ($[38] !== addMargin || $[39] !== W)
            ((U = e(NoticeRowMessage, { row: W, addMargin: addMargin })),
              ($[38] = addMargin),
              ($[39] = W),
              ($[40] = U));
          else U = $[40];
          return U;
        }
        const W = E ? Oy : apiErrorKind === "verification_required" ? safeVerificationUrl : void 0;
        let U;
        if ($[41] !== addMargin || $[42] !== E || $[43] !== W || $[44] !== text || $[45] !== verbose)
          ((U = e(AssistantErrorText, {
            text: text,
            verbose: verbose,
            whole: E,
            addMargin: addMargin,
            linkHref: W,
          })),
            ($[41] = addMargin),
            ($[42] = E),
            ($[43] = W),
            ($[44] = text),
            ($[45] = verbose),
            ($[46] = U));
        else U = $[46];
        return U;
      }
      const W = addMargin ? 1 : 0;
      let U;
      if ($[47] !== shouldShowDot)
        ((U =
          shouldShowDot &&
          e(NoSelect, {
            fromLeftEdge: !0,
            minWidth: 2,
            children: e(Text, { "aria-label": "claude:", color: "text", children: BLACK_CIRCLE }),
          })),
          ($[47] = shouldShowDot),
          ($[48] = U));
      else U = $[48];
      let V;
      if ($[49] !== text)
        ((V = e(Box, {
          flexDirection: "column",
          children: e(MarkdownText_2, { capProseWidth: !0, children: text }),
        })),
          ($[49] = text),
          ($[50] = V));
      else V = $[50];
      let Y;
      if ($[51] !== W || $[52] !== U || $[53] !== V)
        ((Y = r(Box, {
          alignItems: "flex-start",
          flexDirection: "row",
          marginTop: W,
          width: "100%",
          children: [U, V],
        })),
          ($[51] = W),
          ($[52] = U),
          ($[53] = V),
          ($[54] = Y));
      else Y = $[54];
      return Y;
    }
  }
}
/**
 * 某模型（如 Fable）高负载时的提示，建议 /model 切换。
 */
//@ chunk-ah34pb7m.js:60026-60515 placement
function HighDemandNotice() {
  let d = w(7),
    m = useMainLoopModel(),
    c;
  if (d[0] !== m)
    ((c = isFableFamilyOrPinnedModel(m) ? renderUsageCreditsOnlyModelName(m) : "Fable"),
      (d[0] = m),
      (d[1] = c));
  else c = d[1];
  let g;
  if (d[2] !== c)
    ((g = r(Text, { color: "error", children: ["We are experiencing high demand for", " ", c, "."] })),
      (d[2] = c),
      (d[3] = g));
  else g = d[3];
  let f;
  if (d[4] === MEMO_CACHE_SENTINEL)
    ((f = r(Text, {
      children: [
        "To continue immediately, use /model to switch to",
        " ",
        renderModelName(getDefaultSonnetModel()),
        " and continue coding.",
      ],
    })),
      (d[4] = f));
  else f = d[4];
  let h;
  if (d[5] !== g)
    ((h = e(MessageResponse, { children: r(Box, { flexDirection: "column", gap: 1, children: [g, f] }) })),
      (d[5] = g),
      (d[6] = h));
  else h = d[6];
  return h;
}
//@ chunk-ah34pb7m.js:60515-60536 placement
function Oy() {
  return;
}
/**
 * 助手错误文本（API 错误、请稍后重试），可折叠显示。
 */
//@ chunk-ah34pb7m.js:60536-61780 placement
function AssistantErrorText(m) {
  let k = w(26),
    { text: text, verbose: verbose, whole: whole, addMargin: addMargin, linkHref: linkHref } = m,
    { columns: columns } = useTerminalSize(),
    T = Hmt();
  const x =
    text === API_ERROR_MESSAGE_PREFIX
      ? `${API_ERROR_MESSAGE_PREFIX}: Please wait a moment and try again.`
      : text;
  let b, E;
  if (k[0] !== x || k[1] !== verbose || k[2] !== whole) {
    let trimmed = x.trim();
    E = !verbose && !whole && trimmed.length > API_ERROR_CONST_1000;
    b = E ? truncateToLength(trimmed, API_ERROR_CONST_1000) + "\u2026" : trimmed;
    ((k[0] = x), (k[1] = verbose), (k[2] = whole), (k[3] = b), (k[4] = E));
  } else ((b = k[3]), (E = k[4]));
  let L = b;
  if (T) {
    let N;
    if (k[5] !== linkHref || k[6] !== L)
      ((N = e(LinkifiedText_2, { color: "warning", linkHref: linkHref, children: L })),
        (k[5] = linkHref),
        (k[6] = L),
        (k[7] = N));
    else N = k[7];
    let W;
    if (k[8] !== E) ((W = E && e(CtrlOToExpand, {})), (k[8] = E), (k[9] = W));
    else W = k[9];
    let U;
    if (k[10] !== N || k[11] !== W)
      ((U = r(Box, { flexDirection: "column", children: [N, W] })), (k[10] = N), (k[11] = W), (k[12] = U));
    else U = k[12];
    return U;
  }
  const N = addMargin ? 1 : 0;
  let W;
  if (k[13] === MEMO_CACHE_SENTINEL)
    ((W = e(Box, {
      minWidth: 2,
      children: e(Text, { "aria-label": "error:", color: "warning", children: BLACK_CIRCLE }),
    })),
      (k[13] = W));
  else W = k[13];
  const U = columns - 10;
  let K;
  if (k[14] !== linkHref || k[15] !== L)
    ((K = e(LinkifiedText_2, { color: "warning", linkHref: linkHref, children: L })),
      (k[14] = linkHref),
      (k[15] = L),
      (k[16] = K));
  else K = k[16];
  let V;
  if (k[17] !== E) ((V = E && e(CtrlOToExpand, {})), (k[17] = E), (k[18] = V));
  else V = k[18];
  let Y;
  if (k[19] !== U || k[20] !== K || k[21] !== V)
    ((Y = r(Box, { flexDirection: "column", width: U, children: [K, V] })),
      (k[19] = U),
      (k[20] = K),
      (k[21] = V),
      (k[22] = Y));
  else Y = k[22];
  let X;
  if (k[23] !== N || k[24] !== Y)
    ((X = r(Box, { flexDirection: "row", marginTop: N, width: "100%", children: [W, Y] })),
      (k[23] = N),
      (k[24] = Y),
      (k[25] = X));
  else X = k[25];
  return X;
}
/**
 * 思考内容块的显示。
 */
//@ chunk-ah34pb7m.js:61780-62408 placement
function AssistantThinkingBlock(m) {
  let T = w(12),
    {
      param: param,
      model: model,
      addMargin: addMargin,
      shouldShowDot: shouldShowDot,
      messageId: messageId,
    } = m,
    { thinking: thinking } = param,
    x;
  if (T[0] !== thinking) ((x = thinking.trim()), (T[0] = thinking), (T[1] = x));
  else x = T[1];
  let k = x,
    b,
    E;
  if (T[2] !== messageId || T[3] !== shouldShowDot || T[4] !== k)
    ((b = () => ({
      requestId: messageId,
      props: { text: stripPromptXMLTags(k), isFirstOfReply: shouldShowDot, isSummary: !0 },
    })),
      (E = [k, shouldShowDot, messageId]),
      (T[2] = messageId),
      (T[3] = shouldShowDot),
      (T[4] = k),
      (T[5] = b),
      (T[6] = E));
  else ((b = T[5]), (E = T[6]));
  let useRenderInput = actionKeysNamespace.useRenderInput("AssistantMessage", b, E),
    text = useRenderInput.props.text,
    N;
  if (T[7] !== addMargin || T[8] !== text || T[9] !== model || T[10] !== k)
    ((N = (W) =>
      e(AssistantTextWithModel, {
        text: W.props.text === text ? k : W.props.text,
        model: model,
        addMargin: addMargin,
        shouldShowDot: W.props.isFirstOfReply,
      })),
      (T[7] = addMargin),
      (T[8] = text),
      (T[9] = model),
      (T[10] = k),
      (T[11] = N));
  else N = T[11];
  return actionKeysNamespace.useRenderHook(useRenderInput, N);
}
/**
 * 带模型标识的助手文本显示（空文本不渲染）。
 */
//@ chunk-ah34pb7m.js:62408-63074 placement
function AssistantTextWithModel(m) {
  let h = w(11),
    { text: text, model: model, addMargin: addMargin, shouldShowDot: shouldShowDot } = m,
    M;
  if (h[0] !== model) ((M = () => gLr(model)), (h[0] = model), (h[1] = M));
  else M = h[1];
  let T = renderWithForceUpdate(M);
  if (text.trim() === "") {
    return null;
  }
  const x = addMargin ? 1 : 0;
  let k;
  if (h[2] !== shouldShowDot)
    ((k =
      shouldShowDot &&
      e(NoSelect, {
        fromLeftEdge: !0,
        minWidth: 2,
        children: e(Text, { "aria-label": "claude:", color: "text", children: BLACK_CIRCLE }),
      })),
      (h[2] = shouldShowDot),
      (h[3] = k));
  else k = h[3];
  const b = T ? void 0 : SUMMARY_TAG;
  let E;
  if (h[4] !== b || h[5] !== text)
    ((E = e(Box, {
      flexDirection: "column",
      flexGrow: 1,
      children: e(MarkdownText_2, { hint: b, capProseWidth: !0, children: text }),
    })),
      (h[4] = b),
      (h[5] = text),
      (h[6] = E));
  else E = h[6];
  let B;
  if (h[7] !== x || h[8] !== k || h[9] !== E)
    ((B = r(Box, { flexDirection: "row", marginTop: x, width: "100%", children: [k, E] })),
      (h[7] = x),
      (h[8] = k),
      (h[9] = E),
      (h[10] = B));
  else B = h[10];
  return B;
}

export { AssistantTextBlock, AssistantThinkingBlock };
