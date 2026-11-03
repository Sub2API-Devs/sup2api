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
  hasInvalidCredentialPrefix,
  isNoGatewayHint,
  startsWithApiErrorPrefix,
  API_ERROR_MESSAGE_PREFIX,
  API_ERROR_CONST_1000,
} from "../../services/api/errors.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Qr, fo } from "../../../vendor/react/cjs/react.production.js";
import { isPlainTextStorageAvailable } from "../../utils/secureStorage/plainTextStorage.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { getUpgradeMessage } from "../../utils/model/contextWindowUpgradeCheck.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { useAppState } from "../../state/AppState.js";
import { useMessageResponseValue, MessageResponse } from "../MessageResponse.js";
import { isAutoCompactTurnedOffByUser } from "../../services/compact/compactSettings.js";
import { stripPromptXMLTags, isEmptyMessageText, API_REQUEST_ABORTED_MESSAGE } from "../../utils/messages.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import { shouldShowNotice } from "../SlashCommandLink.js";
import { interruptedRow, buildApiErrorRow } from "./CompactBoundaryMessage.js";
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
import { isQuizzicalShoreModel } from "../../utils/messages/mappers.js";
import { renderWithForceUpdate } from "../../hooks/useForceRender.js";
import { SUMMARY_TAG } from "../../constants/xml.js";

//@ chunk-ah34pb7m.js:54747-54803 placement
function hasRemoteAutocompactState(b) {
  return b.remoteAutocompactState !== undefined;
}
//@ chunk-ah34pb7m.js:54803-54841 placement
var API_ERROR_NOTICE_TEXTS = new Set([
  INVALID_API_KEY_MESSAGE,
  DISABLED_ORG_API_KEY_MESSAGE,
  DISABLED_ORG_API_KEY_WITH_SUBSCRIPTION_MESSAGE,
  GATEWAY_UPSTREAM_AUTH_ERROR_MESSAGE,
  TOKEN_REVOKED_MESSAGE,
]);
//@ chunk-ah34pb7m.js:54841-55026 placement
function KeychainUnlockHint() {
  let d = w(1);
  if (!Qr(isPlainTextStorageAvailable())) {
    return null;
  }
  let c;
  if (d[0] === MEMO_CACHE_SENTINEL) {
    c = jsxProd_default(Text, {
      dimColor: true,
      children: "\xB7 Run in another terminal: security unlock-keychain",
    });
    d[0] = c;
  } else c = d[0];
  return c;
}
//@ chunk-ah34pb7m.js:55026-55539 placement
/**
 * 上下文用尽提示（/compact 或 /clear，自动压缩关闭时提示开启）。
 */
function ContextLimitHint() {
  let m = w(6);
  let d;
  if (m[0] === MEMO_CACHE_SENTINEL) {
    d = getUpgradeMessage("warning");
    m[0] = d;
  } else d = m[0];
  let c = d;
  let g = isEnvTruthy(process.env.DISABLE_COMPACT) ? "/clear to continue" : "/compact or /clear to continue";
  let appState = useAppState(hasRemoteAutocompactState);
  let messageResponseValue = useMessageResponseValue();
  let M =
    !appState && !messageResponseValue && isAutoCompactTurnedOffByUser()
      ? " \xB7 auto-compact is off \xB7 /config to turn it on"
      : "";
  const height = M || c ? undefined : 1;
  let children;
  if (m[1] !== M) {
    children = jsxProd_default_2(Text, {
      color: "error",
      children: ["Context limit reached \xB7 ", g, M, c ? ` \xB7 ${c}` : ""],
    });
    m[1] = M;
    m[2] = children;
  } else children = m[2];
  let k;
  if (m[3] !== height || m[4] !== children) {
    k = jsxProd_default(MessageResponse, {
      height,
      children,
    });
    m[3] = height;
    m[4] = children;
    m[5] = k;
  } else k = m[5];
  return k;
}
//@ chunk-ah34pb7m.js:55539-55781 placement
function InvalidApiKeyMessage() {
  let m = w(2);
  let d;
  if (m[0] === MEMO_CACHE_SENTINEL) {
    d = jsxProd_default(Text, {
      color: "error",
      children: INVALID_API_KEY_ERROR_MESSAGE,
    });
    m[0] = d;
  } else d = m[0];
  let c;
  if (m[1] === MEMO_CACHE_SENTINEL) {
    c = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          d,
          jsxProd_default(fo, {
            fallback: null,
            children: jsxProd_default(KeychainUnlockHint, {}),
          }),
        ],
      }),
    });
    m[1] = c;
  } else c = m[1];
  return c;
}
//@ chunk-ah34pb7m.js:55781-56282 placement
/**
 * 助手文本块（带首条回复圆点），并向无障碍层报告内容。
 */
function AssistantTextBlock(props) {
  let f = w(8);
  let { text } = props.param;
  let { shouldShowDot, messageId } = props;
  let h;
  let M;
  if (f[0] !== messageId || f[1] !== shouldShowDot || f[2] !== text) {
    h = () => ({
      requestId: messageId,
      props: {
        text: stripPromptXMLTags(text),
        isFirstOfReply: shouldShowDot,
      },
    });
    M = [text, shouldShowDot, messageId];
    f[0] = messageId;
    f[1] = shouldShowDot;
    f[2] = text;
    f[3] = h;
    f[4] = M;
  } else {
    h = f[3];
    M = f[4];
  }
  let T = actionKeysNamespace.useRenderInput("AssistantMessage", h, M);
  let text_2 = T.props.text;
  let k;
  if (f[5] !== text_2 || f[6] !== props) {
    k = (b) =>
      jsxProd_default(AssistantTextMessage, {
        ...props,
        param:
          b.props.text === text_2
            ? props.param
            : {
                ...props.param,
                text: b.props.text,
              },
        shouldShowDot: b.props.isFirstOfReply,
      });
    f[5] = text_2;
    f[6] = props;
    f[7] = k;
  } else k = f[7];
  return actionKeysNamespace.useRenderHook(T, k);
}
//@ chunk-ah34pb7m.js:56282-60026 fingerprint = AssistantTextMessage (0.412)
/**
 * 助手文本：空文本/占位不渲染；识别 API 错误文本（余额不足、API_TIMEOUT_MS 超时、Opus 高需求、prompt too long、未登录等）显示为错误提示；否则 Markdown 渲染，前面加 ● 圆点（shouldShowDot）。
 */
function AssistantTextMessage(props) {
  let $ = w(55);
  let {
    param,
    addMargin,
    shouldShowDot,
    verbose,
    isApiError,
    isSessionFailureNotice,
    apiErrorKind,
    onOpenRateLimitOptions,
    onRateLimitAutoQueueContinue,
  } = props;
  let { text } = param;
  let E = isSessionFailureNotice === undefined ? false : isSessionFailureNotice;
  let messageResponseValue = useMessageResponseValue();
  let L = shouldShowNotice(verbose) && !messageResponseValue;
  if (isEmptyMessageText(text)) {
    return null;
  }
  if (L && text === API_REQUEST_ABORTED_MESSAGE) {
    let row;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      row = interruptedRow({
        isBySendNow: false,
      });
      $[0] = row;
    } else row = $[0];
    let U;
    if ($[1] !== addMargin || $[2] !== row) {
      U = jsxProd_default(NoticeRowMessage, {
        row,
        addMargin,
      });
      $[1] = addMargin;
      $[2] = row;
      $[3] = U;
    } else U = $[3];
    return U;
  }
  if (L && API_ERROR_NOTICE_TEXTS.has(text)) {
    let row;
    if ($[4] !== text) {
      row = buildApiErrorRow(text);
      $[4] = text;
      $[5] = row;
    } else row = $[5];
    let U;
    if ($[6] !== addMargin || $[7] !== row) {
      U = jsxProd_default(NoticeRowMessage, {
        row,
        addMargin,
      });
      $[6] = addMargin;
      $[7] = row;
      $[8] = U;
    } else U = $[8];
    return U;
  }
  if (isRateLimitText(text)) {
    let W;
    if ($[9] !== onOpenRateLimitOptions || $[10] !== onRateLimitAutoQueueContinue || $[11] !== text) {
      W = jsxProd_default(RateLimitMessage, {
        text,
        onOpenRateLimitOptions,
        onRateLimitAutoQueueContinue,
      });
      $[9] = onOpenRateLimitOptions;
      $[10] = onRateLimitAutoQueueContinue;
      $[11] = text;
      $[12] = W;
    } else W = $[12];
    return W;
  }
  switch (text) {
    case NO_RESPONSE_REQUESTED: {
      return null;
    }
    case PROMPT_TOO_LONG_ERROR_MESSAGE: {
      let W;
      if ($[13] === MEMO_CACHE_SENTINEL) {
        W = jsxProd_default(ContextLimitHint, {});
        $[13] = W;
      } else W = $[13];
      return W;
    }
    case CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE: {
      let t2;
      if ($[14] === MEMO_CACHE_SENTINEL) {
        t2 = jsxProd_default(MessageResponse, {
          height: 1,
          children: jsxProd_default(Text, {
            color: "error",
            children: "Credit balance too low \xB7 Add funds: https://platform.claude.com/settings/billing",
          }),
        });
        $[14] = t2;
      } else t2 = $[14];
      return t2;
    }
    case INVALID_API_KEY_ERROR_MESSAGE: {
      let t2;
      if ($[15] === MEMO_CACHE_SENTINEL) {
        t2 = jsxProd_default(InvalidApiKeyMessage, {});
        $[15] = t2;
      } else t2 = $[15];
      return t2;
    }
    case INVALID_API_KEY_MESSAGE: {
      let t2;
      if ($[16] === MEMO_CACHE_SENTINEL) {
        t2 = jsxProd_default(MessageResponse, {
          height: 1,
          children: jsxProd_default(Text, {
            color: "error",
            children: INVALID_API_KEY_MESSAGE,
          }),
        });
        $[16] = t2;
      } else t2 = $[16];
      return t2;
    }
    case DISABLED_ORG_API_KEY_MESSAGE:
    case DISABLED_ORG_API_KEY_WITH_SUBSCRIPTION_MESSAGE:
    case GATEWAY_UPSTREAM_AUTH_ERROR_MESSAGE: {
      let t2;
      if ($[17] !== text) {
        t2 = jsxProd_default(MessageResponse, {
          children: jsxProd_default(Text, {
            color: "error",
            children: text,
          }),
        });
        $[17] = text;
        $[18] = t2;
      } else t2 = $[18];
      return t2;
    }
    case TOKEN_REVOKED_MESSAGE: {
      let t2;
      if ($[19] === MEMO_CACHE_SENTINEL) {
        t2 = jsxProd_default(MessageResponse, {
          height: 1,
          children: jsxProd_default(Text, {
            color: "error",
            children: TOKEN_REVOKED_MESSAGE,
          }),
        });
        $[19] = t2;
      } else t2 = $[19];
      return t2;
    }
    case REQUEST_TIMED_OUT_MESSAGE: {
      let t2;
      if ($[20] === MEMO_CACHE_SENTINEL) {
        t2 = jsxProd_default(MessageResponse, {
          height: 1,
          children: jsxProd_default_2(Text, {
            color: "error",
            children: [
              REQUEST_TIMED_OUT_MESSAGE,
              (env.API_TIMEOUT_MS ?? 0) > 0 &&
                jsxProd_default_2(Fragment, {
                  children: [" (API_TIMEOUT_MS=", env.API_TIMEOUT_MS, "ms, try increasing it)"],
                }),
            ],
          }),
        });
        $[20] = t2;
      } else t2 = $[20];
      return t2;
    }
    case OPUS_HIGH_LOAD_MESSAGE: {
      let t2;
      if ($[21] === MEMO_CACHE_SENTINEL) {
        t2 = jsxProd_default(Text, {
          color: "error",
          children: "We are experiencing high demand for Opus 4.",
        });
        $[21] = t2;
      } else t2 = $[21];
      let t3;
      if ($[22] === MEMO_CACHE_SENTINEL) {
        t3 = jsxProd_default(MessageResponse, {
          children: jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              t2,
              jsxProd_default_2(Text, {
                children: [
                  "To continue immediately, use /model to switch to",
                  " ",
                  renderModelName(getDefaultSonnetModel()),
                  " and continue coding.",
                ],
              }),
            ],
          }),
        });
        $[22] = t3;
      } else t3 = $[22];
      return t3;
    }
    case FABLE_HIGH_LOAD_MESSAGE: {
      let W;
      if ($[23] === MEMO_CACHE_SENTINEL) {
        W = jsxProd_default(HighDemandNotice, {});
        $[23] = W;
      } else W = $[23];
      return W;
    }
    case API_REQUEST_ABORTED_MESSAGE: {
      let W;
      if ($[24] === MEMO_CACHE_SENTINEL) {
        W = jsxProd_default(RejectedToolUseMessage, {});
        $[24] = W;
      } else W = $[24];
      return W;
    }
    default: {
      if (text.startsWith(`${PROMPT_TOO_LONG_ERROR_MESSAGE} \xB7 `)) {
        let W;
        if ($[25] === MEMO_CACHE_SENTINEL) {
          W = getUpgradeMessage("warning");
          $[25] = W;
        } else W = $[25];
        let K = W;
        let U;
        if ($[26] !== text) {
          U = jsxProd_default(MessageResponse, {
            children: jsxProd_default_2(Text, {
              color: "error",
              children: [text, " \xB7 /clear to start fresh", K ? ` \xB7 ${K}` : ""],
            }),
          });
          $[26] = text;
          $[27] = U;
        } else U = $[27];
        return U;
      }
      if (hasInvalidCredentialPrefix(text) || (isApiError && isNoGatewayHint(text))) {
        if (L) {
          let row;
          if ($[28] !== text) {
            row = buildApiErrorRow(text);
            $[28] = text;
            $[29] = row;
          } else row = $[29];
          let U;
          if ($[30] !== addMargin || $[31] !== row) {
            U = jsxProd_default(NoticeRowMessage, {
              row,
              addMargin,
            });
            $[30] = addMargin;
            $[31] = row;
            $[32] = U;
          } else U = $[32];
          return U;
        }
        let W;
        if ($[33] !== text) {
          W = jsxProd_default(MessageResponse, {
            children: jsxProd_default(Text, {
              color: "error",
              children: text,
            }),
          });
          $[33] = text;
          $[34] = W;
        } else W = $[34];
        return W;
      }
      if (isApiError || startsWithApiErrorPrefix(text) || isClaudeAiOriginLink(text)) {
        if (L) {
          let row;
          if ($[35] !== E || $[36] !== text) {
            row = buildApiErrorRow(text, {
              whole: E,
            });
            $[35] = E;
            $[36] = text;
            $[37] = row;
          } else row = $[37];
          let U;
          if ($[38] !== addMargin || $[39] !== row) {
            U = jsxProd_default(NoticeRowMessage, {
              row,
              addMargin,
            });
            $[38] = addMargin;
            $[39] = row;
            $[40] = U;
          } else U = $[40];
          return U;
        }
        const linkHref = E
          ? noopLinkHref
          : apiErrorKind === "verification_required"
            ? safeVerificationUrl
            : undefined;
        let U;
        if ($[41] !== addMargin || $[42] !== E || $[43] !== linkHref || $[44] !== text || $[45] !== verbose) {
          U = jsxProd_default(AssistantErrorText, {
            text,
            verbose,
            whole: E,
            addMargin,
            linkHref,
          });
          $[41] = addMargin;
          $[42] = E;
          $[43] = linkHref;
          $[44] = text;
          $[45] = verbose;
          $[46] = U;
        } else U = $[46];
        return U;
      }
      const marginTop = addMargin ? 1 : 0;
      let U;
      if ($[47] !== shouldShowDot) {
        U =
          shouldShowDot &&
          jsxProd_default(NoSelect, {
            fromLeftEdge: true,
            minWidth: 2,
            children: jsxProd_default(Text, {
              "aria-label": "claude:",
              color: "text",
              children: BLACK_CIRCLE,
            }),
          });
        $[47] = shouldShowDot;
        $[48] = U;
      } else U = $[48];
      let V;
      if ($[49] !== text) {
        V = jsxProd_default(Box, {
          flexDirection: "column",
          children: jsxProd_default(MarkdownText_2, {
            capProseWidth: true,
            children: text,
          }),
        });
        $[49] = text;
        $[50] = V;
      } else V = $[50];
      let t7;
      if ($[51] !== marginTop || $[52] !== U || $[53] !== V) {
        t7 = jsxProd_default_2(Box, {
          alignItems: "flex-start",
          flexDirection: "row",
          marginTop,
          width: "100%",
          children: [U, V],
        });
        $[51] = marginTop;
        $[52] = U;
        $[53] = V;
        $[54] = t7;
      } else t7 = $[54];
      return t7;
    }
  }
}
//@ chunk-ah34pb7m.js:60026-60515 placement
/**
 * 某模型（如 Fable）高负载时的提示，建议 /model 切换。
 */
function HighDemandNotice() {
  let d = w(7);
  let mainLoopModel = useMainLoopModel();
  let c;
  if (d[0] !== mainLoopModel) {
    c = isFableFamilyOrPinnedModel(mainLoopModel) ? renderUsageCreditsOnlyModelName(mainLoopModel) : "Fable";
    d[0] = mainLoopModel;
    d[1] = c;
  } else c = d[1];
  let g;
  if (d[2] !== c) {
    g = jsxProd_default_2(Text, {
      color: "error",
      children: ["We are experiencing high demand for", " ", c, "."],
    });
    d[2] = c;
    d[3] = g;
  } else g = d[3];
  let f;
  if (d[4] === MEMO_CACHE_SENTINEL) {
    f = jsxProd_default_2(Text, {
      children: [
        "To continue immediately, use /model to switch to",
        " ",
        renderModelName(getDefaultSonnetModel()),
        " and continue coding.",
      ],
    });
    d[4] = f;
  } else f = d[4];
  let h;
  if (d[5] !== g) {
    h = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [g, f],
      }),
    });
    d[5] = g;
    d[6] = h;
  } else h = d[6];
  return h;
}
//@ chunk-ah34pb7m.js:60515-60536 placement
function noopLinkHref() {
  return;
}
//@ chunk-ah34pb7m.js:60536-61780 placement
/**
 * 助手错误文本（API 错误、请稍后重试），可折叠显示。
 */
function AssistantErrorText(props) {
  let k = w(26);
  let { text, verbose, whole, addMargin, linkHref } = props;
  let { columns } = useTerminalSize();
  let messageResponseValue = useMessageResponseValue();
  const x =
    text === API_ERROR_MESSAGE_PREFIX
      ? `${API_ERROR_MESSAGE_PREFIX}: Please wait a moment and try again.`
      : text;
  let b;
  let E;
  if (k[0] !== x || k[1] !== verbose || k[2] !== whole) {
    let trimmed = x.trim();
    E = !verbose && !whole && trimmed.length > API_ERROR_CONST_1000;
    b = E ? truncateToLength(trimmed, API_ERROR_CONST_1000) + "\u2026" : trimmed;
    k[0] = x;
    k[1] = verbose;
    k[2] = whole;
    k[3] = b;
    k[4] = E;
  } else {
    b = k[3];
    E = k[4];
  }
  let children = b;
  if (messageResponseValue) {
    let N;
    if (k[5] !== linkHref || k[6] !== children) {
      N = jsxProd_default(LinkifiedText_2, {
        color: "warning",
        linkHref,
        children,
      });
      k[5] = linkHref;
      k[6] = children;
      k[7] = N;
    } else N = k[7];
    let W;
    if (k[8] !== E) {
      W = E && jsxProd_default(CtrlOToExpand, {});
      k[8] = E;
      k[9] = W;
    } else W = k[9];
    let U;
    if (k[10] !== N || k[11] !== W) {
      U = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [N, W],
      });
      k[10] = N;
      k[11] = W;
      k[12] = U;
    } else U = k[12];
    return U;
  }
  const marginTop = addMargin ? 1 : 0;
  let W;
  if (k[13] === MEMO_CACHE_SENTINEL) {
    W = jsxProd_default(Box, {
      minWidth: 2,
      children: jsxProd_default(Text, {
        "aria-label": "error:",
        color: "warning",
        children: BLACK_CIRCLE,
      }),
    });
    k[13] = W;
  } else W = k[13];
  const width = columns - 10;
  let K;
  if (k[14] !== linkHref || k[15] !== children) {
    K = jsxProd_default(LinkifiedText_2, {
      color: "warning",
      linkHref,
      children,
    });
    k[14] = linkHref;
    k[15] = children;
    k[16] = K;
  } else K = k[16];
  let V;
  if (k[17] !== E) {
    V = E && jsxProd_default(CtrlOToExpand, {});
    k[17] = E;
    k[18] = V;
  } else V = k[18];
  let Y;
  if (k[19] !== width || k[20] !== K || k[21] !== V) {
    Y = jsxProd_default_2(Box, {
      flexDirection: "column",
      width,
      children: [K, V],
    });
    k[19] = width;
    k[20] = K;
    k[21] = V;
    k[22] = Y;
  } else Y = k[22];
  let X;
  if (k[23] !== marginTop || k[24] !== Y) {
    X = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginTop,
      width: "100%",
      children: [W, Y],
    });
    k[23] = marginTop;
    k[24] = Y;
    k[25] = X;
  } else X = k[25];
  return X;
}
//@ chunk-ah34pb7m.js:61780-62408 placement
/**
 * 思考内容块的显示。
 */
function AssistantThinkingBlock(props) {
  let T = w(12);
  let { param, model, addMargin, shouldShowDot, messageId } = props;
  let { thinking } = param;
  let x;
  if (T[0] !== thinking) {
    x = thinking.trim();
    T[0] = thinking;
    T[1] = x;
  } else x = T[1];
  let k = x;
  let b;
  let E;
  if (T[2] !== messageId || T[3] !== shouldShowDot || T[4] !== k) {
    b = () => ({
      requestId: messageId,
      props: {
        text: stripPromptXMLTags(k),
        isFirstOfReply: shouldShowDot,
        isSummary: true,
      },
    });
    E = [k, shouldShowDot, messageId];
    T[2] = messageId;
    T[3] = shouldShowDot;
    T[4] = k;
    T[5] = b;
    T[6] = E;
  } else {
    b = T[5];
    E = T[6];
  }
  let B = actionKeysNamespace.useRenderInput("AssistantMessage", b, E);
  let text = B.props.text;
  let N;
  if (T[7] !== addMargin || T[8] !== text || T[9] !== model || T[10] !== k) {
    N = (W) =>
      jsxProd_default(AssistantTextWithModel, {
        text: W.props.text === text ? k : W.props.text,
        model,
        addMargin,
        shouldShowDot: W.props.isFirstOfReply,
      });
    T[7] = addMargin;
    T[8] = text;
    T[9] = model;
    T[10] = k;
    T[11] = N;
  } else N = T[11];
  return actionKeysNamespace.useRenderHook(B, N);
}
//@ chunk-ah34pb7m.js:62408-63074 placement
/**
 * 带模型标识的助手文本显示（空文本不渲染）。
 */
function AssistantTextWithModel(props) {
  let h = w(11);
  let { text, model, addMargin, shouldShowDot } = props;
  let M;
  if (h[0] !== model) {
    M = () => isQuizzicalShoreModel(model);
    h[0] = model;
    h[1] = M;
  } else M = h[1];
  let T = renderWithForceUpdate(M);
  if (text.trim() === "") {
    return null;
  }
  const marginTop = addMargin ? 1 : 0;
  let k;
  if (h[2] !== shouldShowDot) {
    k =
      shouldShowDot &&
      jsxProd_default(NoSelect, {
        fromLeftEdge: true,
        minWidth: 2,
        children: jsxProd_default(Text, {
          "aria-label": "claude:",
          color: "text",
          children: BLACK_CIRCLE,
        }),
      });
    h[2] = shouldShowDot;
    h[3] = k;
  } else k = h[3];
  const hint = T ? undefined : SUMMARY_TAG;
  let E;
  if (h[4] !== hint || h[5] !== text) {
    E = jsxProd_default(Box, {
      flexDirection: "column",
      flexGrow: 1,
      children: jsxProd_default(MarkdownText_2, {
        hint,
        capProseWidth: true,
        children: text,
      }),
    });
    h[4] = hint;
    h[5] = text;
    h[6] = E;
  } else E = h[6];
  let B;
  if (h[7] !== marginTop || h[8] !== k || h[9] !== E) {
    B = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginTop,
      width: "100%",
      children: [k, E],
    });
    h[7] = marginTop;
    h[8] = k;
    h[9] = E;
    h[10] = B;
  } else B = h[10];
  return B;
}
export { AssistantTextBlock, AssistantThinkingBlock };
