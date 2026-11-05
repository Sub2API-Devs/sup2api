/**
 * components/messages/AssistantTextMessage.tsx
 *
 * 助手文本：Markdown 渲染；特殊错误文本（余额不足、API 超时、过载、prompt too long 等）映射为友好提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/AssistantTextMessage.tsx
 * pieces: chunk-wjygkcr4.js (12)
 * attribution: placement 11, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { use, suspenseTypeExport } from "../../../vendor/react/cjs/react.production.js";
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
import { stripPromptXMLTags, isEmptyMessageText, NO_RESPONSE_REQUESTED } from "../../utils/messages.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import { shouldShowNotice } from "../SlashCommandLink.js";
import { API_REQUEST_ABORTED_MESSAGE } from "../../services/compact/compact.js";
import { interruptedRow, buildApiErrorRow } from "./CompactBoundaryMessage.js";
import { NoticeRowMessage } from "./teamMemSaved.js";
import { isRateLimitText } from "../../services/api/usage.js";
import { RateLimitMessage } from "./RateLimitMessage.js";
import { env } from "../../utils/env.js";
import { renderModelName, renderUsageCreditsOnlyModelName } from "../../utils/model/modelDisplay.js";
import { getDefaultSonnetModel, isFableFamilyOrPinnedModel } from "../../utils/model/model.js";
import { RejectedToolUseMessage } from "./UserToolResultMessage/RejectedToolUseMessage.js";
import { isClaudeAiOriginLink } from "../../services/oauth/oauthErrors.js";
import { safeVerificationUrl } from "../../services/api/verificationRequired.js";
import { NoSelect } from "../../ink/components/Input.js";
import { BLACK_CIRCLE } from "../../constants/figures.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";
import { useMainLoopModel } from "../../hooks/useMainLoopModel.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { LinkifiedText as LinkifiedText_2 } from "../LinkifiedText.js";
import { CtrlOToExpand } from "../CtrlOToExpand.js";
import { isQuizzicalShoreModel } from "../../utils/messages/mappers.js";
import { renderWithForceUpdate } from "../../hooks/useForceRender.js";
import { SUMMARY_TAG } from "../../constants/xml.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wjygkcr4.js:55363-55419 placement
function hasRemoteAutocompactState(state) {
  return state.remoteAutocompactState !== undefined;
}
//@ chunk-wjygkcr4.js:55419-55457 placement
var API_ERROR_NOTICE_TEXTS; // deferred: uses AUTH_REQUIRED_MESSAGE (../../services/api/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-wjygkcr4.js:55419", () => {
  API_ERROR_NOTICE_TEXTS = new Set([
    INVALID_API_KEY_MESSAGE,
    DISABLED_ORG_API_KEY_MESSAGE,
    DISABLED_ORG_API_KEY_WITH_SUBSCRIPTION_MESSAGE,
    GATEWAY_UPSTREAM_AUTH_ERROR_MESSAGE,
    TOKEN_REVOKED_MESSAGE,
  ]);
});
//@ chunk-wjygkcr4.js:55457-55642 placement
function KeychainUnlockHint() {
  let $ = useMemoCache(1);
  if (!use(isPlainTextStorageAvailable())) {
    return null;
  }
  let fallbackText;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    fallbackText = jsxProd_default(Text, {
      dimColor: true,
      children: "\xB7 Run in another terminal: security unlock-keychain",
    });
    $[0] = fallbackText;
  } else fallbackText = $[0];
  return fallbackText;
}
//@ chunk-wjygkcr4.js:55642-56155 placement
/**
 * 上下文用尽提示（/compact 或 /clear，自动压缩关闭时提示开启）。
 */
function ContextLimitHint() {
  let $ = useMemoCache(6);
  let upgradeMessage;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    upgradeMessage = getUpgradeMessage("warning");
    $[0] = upgradeMessage;
  } else upgradeMessage = $[0];
  let upgradeText = upgradeMessage;
  let slashHint = isEnvTruthy(process.env.DISABLE_COMPACT)
    ? "/clear to continue"
    : "/compact or /clear to continue";
  let appState = useAppState(hasRemoteAutocompactState);
  let messageResponseValue = useMessageResponseValue();
  let compactOffNotice =
    !appState && !messageResponseValue && isAutoCompactTurnedOffByUser()
      ? " \xB7 auto-compact is off \xB7 /config to turn it on"
      : "";
  const height = compactOffNotice || upgradeText ? undefined : 1;
  let children;
  if ($[1] !== compactOffNotice) {
    children = jsxProd_default_2(Text, {
      color: "error",
      children: [
        "Context limit reached \xB7 ",
        slashHint,
        compactOffNotice,
        upgradeText ? ` \xB7 ${upgradeText}` : "",
      ],
    });
    $[1] = compactOffNotice;
    $[2] = children;
  } else children = $[2];
  let responseElement;
  if ($[3] !== height || $[4] !== children) {
    responseElement = jsxProd_default(MessageResponse, {
      height,
      children,
    });
    $[3] = height;
    $[4] = children;
    $[5] = responseElement;
  } else responseElement = $[5];
  return responseElement;
}
//@ chunk-wjygkcr4.js:56155-56397 placement
function InvalidApiKeyMessage() {
  let $ = useMemoCache(2);
  let errorText;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    errorText = jsxProd_default(Text, {
      color: "error",
      children: INVALID_API_KEY_ERROR_MESSAGE,
    });
    $[0] = errorText;
  } else errorText = $[0];
  let messageElement;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    messageElement = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          errorText,
          jsxProd_default(suspenseTypeExport, {
            fallback: null,
            children: jsxProd_default(KeychainUnlockHint, {}),
          }),
        ],
      }),
    });
    $[1] = messageElement;
  } else messageElement = $[1];
  return messageElement;
}
//@ chunk-wjygkcr4.js:56397-56898 placement
/**
 * 助手文本块（带首条回复圆点），并向无障碍层报告内容。
 */
function AssistantTextBlock(props) {
  let $ = useMemoCache(8);
  let { text } = props.param;
  let { shouldShowDot, messageId } = props;
  let renderInput;
  let renderDeps;
  if ($[0] !== messageId || $[1] !== shouldShowDot || $[2] !== text) {
    renderInput = () => ({
      requestId: messageId,
      props: {
        text: stripPromptXMLTags(text),
        isFirstOfReply: shouldShowDot,
      },
    });
    renderDeps = [text, shouldShowDot, messageId];
    $[0] = messageId;
    $[1] = shouldShowDot;
    $[2] = text;
    $[3] = renderInput;
    $[4] = renderDeps;
  } else {
    renderInput = $[3];
    renderDeps = $[4];
  }
  let renderInputHandle = actionKeysNamespace.useRenderInput("AssistantMessage", renderInput, renderDeps);
  let text_2 = renderInputHandle.props.text;
  let renderHook;
  if ($[5] !== text_2 || $[6] !== props) {
    renderHook = (args) =>
      jsxProd_default(AssistantTextMessage, {
        ...props,
        param:
          args.props.text === text_2
            ? props.param
            : {
                ...props.param,
                text: args.props.text,
              },
        shouldShowDot: args.props.isFirstOfReply,
      });
    $[5] = text_2;
    $[6] = props;
    $[7] = renderHook;
  } else renderHook = $[7];
  return actionKeysNamespace.useRenderHook(renderInputHandle, renderHook);
}
//@ chunk-wjygkcr4.js:56898-60643 fingerprint (2.1.88 match: AssistantTextMessage, 0.412)
/**
 * 助手文本：空文本/占位不渲染；识别 API 错误文本（余额不足、API_TIMEOUT_MS 超时、Opus 高需求、prompt too long、未登录等）显示为错误提示；否则 Markdown 渲染，前面加 ● 圆点（shouldShowDot）。
 */
function AssistantTextMessage(props) {
  let $ = useMemoCache(55);
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
  let sessionFailureNotice = isSessionFailureNotice === undefined ? false : isSessionFailureNotice;
  let messageResponseValue = useMessageResponseValue();
  let showNotice = shouldShowNotice(verbose) && !messageResponseValue;
  if (isEmptyMessageText(text)) {
    return null;
  }
  if (showNotice && text === API_REQUEST_ABORTED_MESSAGE) {
    let row;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      row = interruptedRow({
        isBySendNow: false,
      });
      $[0] = row;
    } else row = $[0];
    let noticeRowElement;
    if ($[1] !== addMargin || $[2] !== row) {
      noticeRowElement = jsxProd_default(NoticeRowMessage, {
        row,
        addMargin,
      });
      $[1] = addMargin;
      $[2] = row;
      $[3] = noticeRowElement;
    } else noticeRowElement = $[3];
    return noticeRowElement;
  }
  if (showNotice && API_ERROR_NOTICE_TEXTS.has(text)) {
    let row;
    if ($[4] !== text) {
      row = buildApiErrorRow(text);
      $[4] = text;
      $[5] = row;
    } else row = $[5];
    let errorTextElement;
    if ($[6] !== addMargin || $[7] !== row) {
      errorTextElement = jsxProd_default(NoticeRowMessage, {
        row,
        addMargin,
      });
      $[6] = addMargin;
      $[7] = row;
      $[8] = errorTextElement;
    } else errorTextElement = $[8];
    return errorTextElement;
  }
  if (isRateLimitText(text)) {
    let rateLimitMessageElement;
    if ($[9] !== onOpenRateLimitOptions || $[10] !== onRateLimitAutoQueueContinue || $[11] !== text) {
      rateLimitMessageElement = jsxProd_default(RateLimitMessage, {
        text,
        onOpenRateLimitOptions,
        onRateLimitAutoQueueContinue,
      });
      $[9] = onOpenRateLimitOptions;
      $[10] = onRateLimitAutoQueueContinue;
      $[11] = text;
      $[12] = rateLimitMessageElement;
    } else rateLimitMessageElement = $[12];
    return rateLimitMessageElement;
  }
  switch (text) {
    case NO_RESPONSE_REQUESTED: {
      return null;
    }
    case PROMPT_TOO_LONG_ERROR_MESSAGE: {
      let contextLimitHintElement;
      if ($[13] === MEMO_CACHE_SENTINEL) {
        contextLimitHintElement = jsxProd_default(ContextLimitHint, {});
        $[13] = contextLimitHintElement;
      } else contextLimitHintElement = $[13];
      return contextLimitHintElement;
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
      let highDemandNoticeElement;
      if ($[23] === MEMO_CACHE_SENTINEL) {
        highDemandNoticeElement = jsxProd_default(HighDemandNotice, {});
        $[23] = highDemandNoticeElement;
      } else highDemandNoticeElement = $[23];
      return highDemandNoticeElement;
    }
    case API_REQUEST_ABORTED_MESSAGE: {
      let rejectedToolUseMessageElement;
      if ($[24] === MEMO_CACHE_SENTINEL) {
        rejectedToolUseMessageElement = jsxProd_default(RejectedToolUseMessage, {});
        $[24] = rejectedToolUseMessageElement;
      } else rejectedToolUseMessageElement = $[24];
      return rejectedToolUseMessageElement;
    }
    default: {
      if (text.startsWith(`${PROMPT_TOO_LONG_ERROR_MESSAGE} \xB7 `)) {
        let hintElement;
        if ($[25] === MEMO_CACHE_SENTINEL) {
          hintElement = getUpgradeMessage("warning");
          $[25] = hintElement;
        } else hintElement = $[25];
        let statusElement = hintElement;
        let containerElement;
        if ($[26] !== text) {
          containerElement = jsxProd_default(MessageResponse, {
            children: jsxProd_default_2(Text, {
              color: "error",
              children: [text, " \xB7 /clear to start fresh", statusElement ? ` \xB7 ${statusElement}` : ""],
            }),
          });
          $[26] = text;
          $[27] = containerElement;
        } else containerElement = $[27];
        return containerElement;
      }
      if (hasInvalidCredentialPrefix(text) || (isApiError && isNoGatewayHint(text))) {
        if (showNotice) {
          let row;
          if ($[28] !== text) {
            row = buildApiErrorRow(text);
            $[28] = text;
            $[29] = row;
          } else row = $[29];
          let rowElement;
          if ($[30] !== addMargin || $[31] !== row) {
            rowElement = jsxProd_default(NoticeRowMessage, {
              row,
              addMargin,
            });
            $[30] = addMargin;
            $[31] = row;
            $[32] = rowElement;
          } else rowElement = $[32];
          return rowElement;
        }
        let columnElement;
        if ($[33] !== text) {
          columnElement = jsxProd_default(MessageResponse, {
            children: jsxProd_default(Text, {
              color: "error",
              children: text,
            }),
          });
          $[33] = text;
          $[34] = columnElement;
        } else columnElement = $[34];
        return columnElement;
      }
      if (isApiError || startsWithApiErrorPrefix(text) || isClaudeAiOriginLink(text)) {
        if (showNotice) {
          let row;
          if ($[35] !== sessionFailureNotice || $[36] !== text) {
            row = buildApiErrorRow(text, {
              whole: sessionFailureNotice,
            });
            $[35] = sessionFailureNotice;
            $[36] = text;
            $[37] = row;
          } else row = $[37];
          let dialogElement;
          if ($[38] !== addMargin || $[39] !== row) {
            dialogElement = jsxProd_default(NoticeRowMessage, {
              row,
              addMargin,
            });
            $[38] = addMargin;
            $[39] = row;
            $[40] = dialogElement;
          } else dialogElement = $[40];
          return dialogElement;
        }
        const linkHref = sessionFailureNotice
          ? noopLinkHref
          : apiErrorKind === "verification_required"
            ? safeVerificationUrl
            : undefined;
        let assistantErrorTextElement;
        if (
          $[41] !== addMargin ||
          $[42] !== sessionFailureNotice ||
          $[43] !== linkHref ||
          $[44] !== text ||
          $[45] !== verbose
        ) {
          assistantErrorTextElement = jsxProd_default(AssistantErrorText, {
            text,
            verbose,
            whole: sessionFailureNotice,
            addMargin,
            linkHref,
          });
          $[41] = addMargin;
          $[42] = sessionFailureNotice;
          $[43] = linkHref;
          $[44] = text;
          $[45] = verbose;
          $[46] = assistantErrorTextElement;
        } else assistantErrorTextElement = $[46];
        return assistantErrorTextElement;
      }
      const marginTop = addMargin ? 1 : 0;
      let noticeElement;
      if ($[47] !== shouldShowDot) {
        noticeElement =
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
        $[48] = noticeElement;
      } else noticeElement = $[48];
      let boxElement;
      if ($[49] !== text) {
        boxElement = jsxProd_default(Box, {
          flexDirection: "column",
          children: jsxProd_default(MarkdownText_2, {
            capProseWidth: true,
            children: text,
          }),
        });
        $[49] = text;
        $[50] = boxElement;
      } else boxElement = $[50];
      let t7;
      if ($[51] !== marginTop || $[52] !== noticeElement || $[53] !== boxElement) {
        t7 = jsxProd_default_2(Box, {
          alignItems: "flex-start",
          flexDirection: "row",
          marginTop,
          width: "100%",
          children: [noticeElement, boxElement],
        });
        $[51] = marginTop;
        $[52] = noticeElement;
        $[53] = boxElement;
        $[54] = t7;
      } else t7 = $[54];
      return t7;
    }
  }
}
//@ chunk-wjygkcr4.js:60643-61132 placement
/**
 * 某模型（如 Fable）高负载时的提示，建议 /model 切换。
 */
function HighDemandNotice() {
  let $ = useMemoCache(7);
  let mainLoopModel = useMainLoopModel();
  let modelLabel;
  if ($[0] !== mainLoopModel) {
    modelLabel = isFableFamilyOrPinnedModel(mainLoopModel)
      ? renderUsageCreditsOnlyModelName(mainLoopModel)
      : "Fable";
    $[0] = mainLoopModel;
    $[1] = modelLabel;
  } else modelLabel = $[1];
  let demandText;
  if ($[2] !== modelLabel) {
    demandText = jsxProd_default_2(Text, {
      color: "error",
      children: ["We are experiencing high demand for", " ", modelLabel, "."],
    });
    $[2] = modelLabel;
    $[3] = demandText;
  } else demandText = $[3];
  let modelLine;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    modelLine = jsxProd_default_2(Text, {
      children: [
        "To continue immediately, use /model to switch to",
        " ",
        renderModelName(getDefaultSonnetModel()),
        " and continue coding.",
      ],
    });
    $[4] = modelLine;
  } else modelLine = $[4];
  let noticeElement;
  if ($[5] !== demandText) {
    noticeElement = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [demandText, modelLine],
      }),
    });
    $[5] = demandText;
    $[6] = noticeElement;
  } else noticeElement = $[6];
  return noticeElement;
}
//@ chunk-wjygkcr4.js:61132-61153 placement
function noopLinkHref() {
  return;
}
//@ chunk-wjygkcr4.js:61153-62401 placement
/**
 * 助手错误文本（API 错误、请稍后重试），可折叠显示。
 */
function AssistantErrorText(props) {
  let $ = useMemoCache(26);
  let { text, verbose, whole, addMargin, linkHref } = props;
  let { columns } = useTerminalSize();
  let messageResponseValue = useMessageResponseValue();
  const displayText =
    text === API_ERROR_MESSAGE_PREFIX
      ? `${API_ERROR_MESSAGE_PREFIX}: Please wait a moment and try again.`
      : text;
  let truncatedText;
  let isTruncated;
  if ($[0] !== displayText || $[1] !== verbose || $[2] !== whole) {
    let trimmed = displayText.trim();
    isTruncated = !verbose && !whole && trimmed.length > API_ERROR_CONST_1000;
    truncatedText = isTruncated ? truncateToLength(trimmed, API_ERROR_CONST_1000) + "\u2026" : trimmed;
    $[0] = displayText;
    $[1] = verbose;
    $[2] = whole;
    $[3] = truncatedText;
    $[4] = isTruncated;
  } else {
    truncatedText = $[3];
    isTruncated = $[4];
  }
  let children = truncatedText;
  if (messageResponseValue) {
    let prefixText;
    if ($[5] !== linkHref || $[6] !== children) {
      prefixText = jsxProd_default(LinkifiedText_2, {
        color: "warning",
        linkHref,
        children,
      });
      $[5] = linkHref;
      $[6] = children;
      $[7] = prefixText;
    } else prefixText = $[7];
    let headerElement;
    if ($[8] !== isTruncated) {
      headerElement = isTruncated && jsxProd_default(CtrlOToExpand, {});
      $[8] = isTruncated;
      $[9] = headerElement;
    } else headerElement = $[9];
    let bodyElement;
    if ($[10] !== prefixText || $[11] !== headerElement) {
      bodyElement = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [prefixText, headerElement],
      });
      $[10] = prefixText;
      $[11] = headerElement;
      $[12] = bodyElement;
    } else bodyElement = $[12];
    return bodyElement;
  }
  const marginTop = addMargin ? 1 : 0;
  let hintText;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    hintText = jsxProd_default(Box, {
      minWidth: 2,
      children: jsxProd_default(Text, {
        "aria-label": "error:",
        color: "warning",
        children: BLACK_CIRCLE,
      }),
    });
    $[13] = hintText;
  } else hintText = $[13];
  const width = columns - 10;
  let linkElement;
  if ($[14] !== linkHref || $[15] !== children) {
    linkElement = jsxProd_default(LinkifiedText_2, {
      color: "warning",
      linkHref,
      children,
    });
    $[14] = linkHref;
    $[15] = children;
    $[16] = linkElement;
  } else linkElement = $[16];
  let containerElement;
  if ($[17] !== isTruncated) {
    containerElement = isTruncated && jsxProd_default(CtrlOToExpand, {});
    $[17] = isTruncated;
    $[18] = containerElement;
  } else containerElement = $[18];
  let rowElement;
  if ($[19] !== width || $[20] !== linkElement || $[21] !== containerElement) {
    rowElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      width,
      children: [linkElement, containerElement],
    });
    $[19] = width;
    $[20] = linkElement;
    $[21] = containerElement;
    $[22] = rowElement;
  } else rowElement = $[22];
  let outerElement;
  if ($[23] !== marginTop || $[24] !== rowElement) {
    outerElement = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginTop,
      width: "100%",
      children: [hintText, rowElement],
    });
    $[23] = marginTop;
    $[24] = rowElement;
    $[25] = outerElement;
  } else outerElement = $[25];
  return outerElement;
}
//@ chunk-wjygkcr4.js:62401-63029 placement
/**
 * 思考内容块的显示。
 */
function AssistantThinkingBlock(props) {
  let $ = useMemoCache(12);
  let { param, model, addMargin, shouldShowDot, messageId } = props;
  let { thinking } = param;
  let trimmedThinking;
  if ($[0] !== thinking) {
    trimmedThinking = thinking.trim();
    $[0] = thinking;
    $[1] = trimmedThinking;
  } else trimmedThinking = $[1];
  let thinkingText = trimmedThinking;
  let renderInput;
  let renderDeps;
  if ($[2] !== messageId || $[3] !== shouldShowDot || $[4] !== thinkingText) {
    renderInput = () => ({
      requestId: messageId,
      props: {
        text: stripPromptXMLTags(thinkingText),
        isFirstOfReply: shouldShowDot,
        isSummary: true,
      },
    });
    renderDeps = [thinkingText, shouldShowDot, messageId];
    $[2] = messageId;
    $[3] = shouldShowDot;
    $[4] = thinkingText;
    $[5] = renderInput;
    $[6] = renderDeps;
  } else {
    renderInput = $[5];
    renderDeps = $[6];
  }
  let renderInputHandle = actionKeysNamespace.useRenderInput("AssistantMessage", renderInput, renderDeps);
  let text = renderInputHandle.props.text;
  let renderHook;
  if ($[7] !== addMargin || $[8] !== text || $[9] !== model || $[10] !== thinkingText) {
    renderHook = (args) =>
      jsxProd_default(AssistantTextWithModel, {
        text: args.props.text === text ? thinkingText : args.props.text,
        model,
        addMargin,
        shouldShowDot: args.props.isFirstOfReply,
      });
    $[7] = addMargin;
    $[8] = text;
    $[9] = model;
    $[10] = thinkingText;
    $[11] = renderHook;
  } else renderHook = $[11];
  return actionKeysNamespace.useRenderHook(renderInputHandle, renderHook);
}
//@ chunk-wjygkcr4.js:63029-63695 placement
/**
 * 带模型标识的助手文本显示（空文本不渲染）。
 */
function AssistantTextWithModel(props) {
  let $ = useMemoCache(11);
  let { text, model, addMargin, shouldShowDot } = props;
  let isQuizzicalShores;
  if ($[0] !== model) {
    isQuizzicalShores = () => isQuizzicalShoreModel(model);
    $[0] = model;
    $[1] = isQuizzicalShores;
  } else isQuizzicalShores = $[1];
  let modelNotice = renderWithForceUpdate(isQuizzicalShores);
  if (text.trim() === "") {
    return null;
  }
  const marginTop = addMargin ? 1 : 0;
  let dotElement;
  if ($[2] !== shouldShowDot) {
    dotElement =
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
    $[2] = shouldShowDot;
    $[3] = dotElement;
  } else dotElement = $[3];
  const hint = modelNotice ? undefined : SUMMARY_TAG;
  let columnBox;
  if ($[4] !== hint || $[5] !== text) {
    columnBox = jsxProd_default(Box, {
      flexDirection: "column",
      flexGrow: 1,
      children: jsxProd_default(MarkdownText_2, {
        hint,
        capProseWidth: true,
        children: text,
      }),
    });
    $[4] = hint;
    $[5] = text;
    $[6] = columnBox;
  } else columnBox = $[6];
  let rowBox;
  if ($[7] !== marginTop || $[8] !== dotElement || $[9] !== columnBox) {
    rowBox = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginTop,
      width: "100%",
      children: [dotElement, columnBox],
    });
    $[7] = marginTop;
    $[8] = dotElement;
    $[9] = columnBox;
    $[10] = rowBox;
  } else rowBox = $[10];
  return rowBox;
}
export { AssistantTextBlock, AssistantThinkingBlock };
