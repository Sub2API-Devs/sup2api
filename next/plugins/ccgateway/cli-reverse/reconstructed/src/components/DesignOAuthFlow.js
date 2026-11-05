/**
 * components/DesignOAuthFlow.tsx
 *
 * 2.1.316 新增：Claude Design 的 OAuth 授权界面与 /design login
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f94bkgbg.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
import { OAuthService } from "../services/oauth/index.js";
import {
  DESIGN_LOGIN_CLOSING_NOTICE,
  DESIGN_CLOSING_SUPPORT_URL,
} from "../tools/DesignSyncTool/DesignSyncTool.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useCopyUrl, CopiedUrlHint, CopyUrlFallbackHint } from "./CopyUrlHint.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import {
  isDesignOAuthConfigured,
  designOAuthClientId,
  refreshDesignToken,
  writeDesignOAuth,
  readDesignOAuth,
} from "../services/oauth/designOAuth.js";
import { getOauthConfig, DESIGN_OAUTH_SCOPES } from "../constants/oauth.js";
import { isBrowserUnavailable } from "../utils/browser.js";
import { revokeOAuthToken } from "../services/oauth/client.js";
import { AuthCodeRefusedError } from "../services/oauth/auth-code-listener.js";
import { logError } from "../utils/log.js";
import { errorMessage } from "../utils/errors.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../ink/components/Text.js";
import { OAuthStatusMessage } from "./ConsoleOAuthFlow.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { FocusColumn } from "./design-system/FocusColumn.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-f94bkgbg.js:15480-15484 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-f94bkgbg.js:15480", () => {
  init_react_production();
});
//@ chunk-f94bkgbg.js:15484-15512 placement
function createOAuthService() {
  return new OAuthService();
}
//@ chunk-f94bkgbg.js:15512-15540 placement
function runCleanup(cleanup) {
  return cleanup();
}
//@ chunk-f94bkgbg.js:15540-15568 placement
function runCleanup_2(cleanup) {
  return cleanup();
}
//@ chunk-f94bkgbg.js:15568-15667 placement
var PASTE_CODE_PROMPT_3 = "Paste code here if prompted > ";
var DESIGN_AUTH_SUCCESS_TEXT = `Design-system access authorized.
${DESIGN_LOGIN_CLOSING_NOTICE} Details: ${DESIGN_CLOSING_SUPPORT_URL}`;
//@ chunk-f94bkgbg.js:15667-21223 placement
/**
 * Claude Design 的 OAuth 授权流程界面（浏览器授权、手动粘贴 code、保存到安全存储）。
 */
function DesignOAuthFlow(props) {
  let $ = useMemoCache(59);
  let { onDone, hadExistingCredential } = props;
  let initialStatus;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    initialStatus = {
      state: "starting",
    };
    $[0] = initialStatus;
  } else initialStatus = $[0];
  let [status, setStatus] = useState(initialStatus);
  let [oauthService] = useState(createOAuthService);
  let [pastedCode, setPastedCode] = useState("");
  let [cursorOffset, setCursorOffset] = useState(0);
  let [submitting, setSubmitting] = useState(false);
  let { copiedVia, copy, reset } = useCopyUrl(status.state === "waiting_for_login" ? status.url : null);
  let clock = useClock();
  let emptyTimerSet;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    emptyTimerSet = new Set();
    $[1] = emptyTimerSet;
  } else emptyTimerSet = $[1];
  let timersRef = useRef(emptyTimerSet);
  let cancelledRef = useRef(false);
  let terminalSize = useTerminalSize();
  let textInputColumns = Math.max(50, terminalSize.columns - PASTE_CODE_PROMPT_3.length - 4);
  let keyHandlerCached;
  if ($[2] !== status.state || $[3] !== status.toRetry || $[4] !== onDone) {
    keyHandlerCached = function handleKeyDown(event) {
      if (status.state === "success") {
        event.preventDefault();
        onDone(DESIGN_AUTH_SUCCESS_TEXT);
        return;
      }
      if (status.state !== "error") {
        if (
          event.key === "escape" ||
          ((event.ctrl || event.meta) && (event.key === "c" || event.key === "d"))
        ) {
          event.preventDefault();
          cancelledRef.current = true;
          onDone("Design login cancelled.");
        }
        return;
      }
      event.preventDefault();
      if (event.key === "return" && status.toRetry) {
        setPastedCode("");
        setCursorOffset(0);
        setStatus({
          state: "about_to_retry",
          nextState: status.toRetry,
        });
      } else {
        cancelledRef.current = true;
        onDone("Design login cancelled.");
      }
    };
    $[2] = status.state;
    $[3] = status.toRetry;
    $[4] = onDone;
    $[5] = keyHandlerCached;
  } else keyHandlerCached = $[5];
  let onKeyDown = keyHandlerCached;
  let submitCodeCached;
  if ($[6] !== oauthService) {
    submitCodeCached = function handleSubmitCode(value, url) {
      if (!value.trim()) {
        setPastedCode("");
        setCursorOffset(0);
        return;
      }
      let [authorizationCode, state] = value.split("#");
      if (!authorizationCode || !state) {
        setStatus({
          state: "error",
          message: "Invalid code. Please make sure the full code was copied",
          toRetry: {
            state: "waiting_for_login",
            url,
          },
        });
        logForDebugging(`Design login: invalid pasted code for ${url}`);
        return;
      }
      logEvent("tengu_design_oauth_manual_entry", {});
      oauthService.handleManualAuthCodeInput({
        authorizationCode,
        state,
      });
    };
    $[6] = oauthService;
    $[7] = submitCodeCached;
  } else submitCodeCached = $[7];
  let onSubmitCode = submitCodeCached;
  let startFlowCached;
  if ($[8] !== clock || $[9] !== oauthService || $[10] !== onDone || $[11] !== reset) {
    startFlowCached = async () => {
      timersRef.current.forEach(runCleanup);
      timersRef.current.clear();
      if (!isDesignOAuthConfigured()) {
        setStatus({
          state: "error",
          message:
            "The Claude Design OAuth client is not configured in this build. Set CLAUDE_CODE_DESIGN_OAUTH_CLIENT_ID to the registered client id, or update to a build with the registered client.",
        });
        return;
      }
      try {
        let oauthConfig = getOauthConfig();
        let clientId = designOAuthClientId();
        let tokens = await oauthService.startOAuthFlow(
          async (url) => {
            reset();
            setSubmitting(false);
            setStatus({
              state: "waiting_for_login",
              url,
            });
            if (isBrowserUnavailable()) setSubmitting(true);
            else timersRef.current.add(clock.setTimeout(() => setSubmitting(true), 3000));
          },
          {
            loginWithClaudeAi: true,
            oauthClient: {
              clientId,
              scopes: DESIGN_OAUTH_SCOPES,
            },
            skipProfileFetch: true,
            successRedirectUrl: oauthConfig.CLAUDEAI_SUCCESS_URL,
          },
        );
        if (cancelledRef.current) {
          if (tokens.refreshToken) await revokeOAuthToken(tokens.refreshToken, clientId);
          return;
        }
        setStatus({
          state: "processing",
        });
        let refreshResult = await refreshDesignToken(tokens, clientId);
        if (!refreshResult.ok) {
          setStatus({
            state: "error",
            message: refreshResult.message,
            toRetry: {
              state: "starting",
            },
          });
          return;
        }
        if (cancelledRef.current) {
          await revokeOAuthToken(refreshResult.slot.refreshToken, refreshResult.slot.clientId);
          return;
        }
        let writeResult = await writeDesignOAuth(refreshResult.slot);
        if (!writeResult.success) {
          await revokeOAuthToken(refreshResult.slot.refreshToken, refreshResult.slot.clientId);
          setStatus({
            state: "error",
            message: writeResult.warning ?? "Could not save the design credential to secure storage.",
            toRetry: {
              state: "starting",
            },
          });
          return;
        }
        logEvent("tengu_design_oauth_login_success", {});
        setStatus({
          state: "success",
        });
        timersRef.current.add(clock.setTimeout(() => onDone(DESIGN_AUTH_SUCCESS_TEXT), 1500));
      } catch (error) {
        let caughtError = error;
        if (caughtError instanceof AuthCodeRefusedError)
          logForDebugging(`Design login failed: ${caughtError.message}`, {
            level: "error",
          });
        else logError(caughtError);
        logEvent("tengu_design_oauth_login_error", {});
        setStatus({
          state: "error",
          message: errorMessage(caughtError),
          toRetry: {
            state: "starting",
          },
        });
      }
    };
    $[8] = clock;
    $[9] = oauthService;
    $[10] = onDone;
    $[11] = reset;
    $[12] = startFlowCached;
  } else startFlowCached = $[12];
  let startFlow = startFlowCached;
  let startEffect;
  let startDeps;
  if ($[13] !== status.state || $[14] !== startFlow) {
    startEffect = () => {
      if (status.state === "starting") startFlow();
    };
    startDeps = [status.state, startFlow];
    $[13] = status.state;
    $[14] = startFlow;
    $[15] = startEffect;
    $[16] = startDeps;
  } else {
    startEffect = $[15];
    startDeps = $[16];
  }
  useEffect(startEffect, startDeps);
  let retryTimeout;
  if ($[17] !== status.nextState || $[18] !== status.state) {
    retryTimeout = () => {
      if (status.state === "about_to_retry") {
        setSubmitting(status.nextState.state === "waiting_for_login");
        setStatus(status.nextState);
      }
    };
    $[17] = status.nextState;
    $[18] = status.state;
    $[19] = retryTimeout;
  } else retryTimeout = $[19];
  useTimeout(retryTimeout, status.state === "about_to_retry" ? 500 : null);
  let copyOnConcede;
  if (
    $[20] !== copy ||
    $[21] !== status.state ||
    $[22] !== status.url ||
    $[23] !== pastedCode ||
    $[24] !== submitting
  ) {
    copyOnConcede = () => {
      if (/^c+$/.test(pastedCode) && status.state === "waiting_for_login" && submitting) {
        setPastedCode("");
        copy(status.url);
      }
    };
    $[20] = copy;
    $[21] = status.state;
    $[22] = status.url;
    $[23] = pastedCode;
    $[24] = submitting;
    $[25] = copyOnConcede;
  } else copyOnConcede = $[25];
  let copyEffectDeps;
  if ($[26] !== copy || $[27] !== status || $[28] !== pastedCode || $[29] !== submitting) {
    copyEffectDeps = [pastedCode, status, submitting, copy];
    $[26] = copy;
    $[27] = status;
    $[28] = pastedCode;
    $[29] = submitting;
    $[30] = copyEffectDeps;
  } else copyEffectDeps = $[30];
  useEffect(copyOnConcede, copyEffectDeps);
  let cleanupEffect;
  let cleanupDeps;
  if ($[31] !== oauthService) {
    cleanupEffect = () => {
      let timers = timersRef.current;
      return () => {
        oauthService.cleanup();
        timers.forEach(runCleanup_2);
        timers.clear();
      };
    };
    cleanupDeps = [oauthService];
    $[31] = oauthService;
    $[32] = cleanupEffect;
    $[33] = cleanupDeps;
  } else {
    cleanupEffect = $[32];
    cleanupDeps = $[33];
  }
  useEffect(cleanupEffect, cleanupDeps);
  let introElement;
  if ($[34] !== hadExistingCredential || $[35] !== status.state) {
    introElement =
      status.state !== "success" &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        paddingBottom: 1,
        children: [
          jsxProd_default(Text, {
            bold: true,
            children: "Design login",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children:
              "Authorize design-system access (read and write your organization's claude.ai/design projects) with your claude.ai account. This is separate from this session's authentication and changes nothing else.",
          }),
          hadExistingCredential &&
            jsxProd_default(Text, {
              dimColor: true,
              children: "A design credential is already stored \u2014 completing this flow replaces it.",
            }),
          jsxProd_default(DesignOAuthWarning, {}),
        ],
      });
    $[34] = hadExistingCredential;
    $[35] = status.state;
    $[36] = introElement;
  } else introElement = $[36];
  let urlFallbackElement;
  if ($[37] !== status.state || $[38] !== status.url || $[39] !== submitting || $[40] !== copiedVia) {
    urlFallbackElement =
      status.state === "waiting_for_login" &&
      submitting &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        paddingBottom: 1,
        children: [
          jsxProd_default_2(Box, {
            flexDirection: "column",
            paddingX: 1,
            children: [
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: ["Browser didn't open? Use the url below to sign in", " "],
                  }),
                  jsxProd_default(CopiedUrlHint, {
                    via: copiedVia,
                  }),
                ],
              }),
              jsxProd_default(CopyUrlFallbackHint, {
                via: copiedVia,
              }),
            ],
          }),
          jsxProd_default(Link, {
            url: status.url,
            assumeSupport: true,
            children: jsxProd_default(Text, {
              dimColor: true,
              children: status.url,
            }),
          }),
        ],
      });
    $[37] = status.state;
    $[38] = status.url;
    $[39] = submitting;
    $[40] = copiedVia;
    $[41] = urlFallbackElement;
  } else urlFallbackElement = $[41];
  let statusElement;
  if (
    $[42] !== cursorOffset ||
    $[43] !== onSubmitCode ||
    $[44] !== status ||
    $[45] !== pastedCode ||
    $[46] !== submitting ||
    $[47] !== textInputColumns
  ) {
    statusElement = jsxProd_default(OAuthStatusMessage, {
      oauthStatus: status,
      showPastePrompt: submitting,
      pastedCode,
      setPastedCode,
      cursorOffset,
      setCursorOffset,
      textInputColumns,
      onSubmitCode,
    });
    $[42] = cursorOffset;
    $[43] = onSubmitCode;
    $[44] = status;
    $[45] = pastedCode;
    $[46] = submitting;
    $[47] = textInputColumns;
    $[48] = statusElement;
  } else statusElement = $[48];
  let cancelHint;
  if ($[49] !== status.state) {
    cancelHint =
      status.state !== "success" &&
      status.state !== "error" &&
      jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
        }),
      });
    $[49] = status.state;
    $[50] = cancelHint;
  } else cancelHint = $[50];
  let bodyElement;
  if ($[51] !== statusElement || $[52] !== cancelHint) {
    bodyElement = jsxProd_default_2(Box, {
      paddingLeft: 1,
      flexDirection: "column",
      gap: 1,
      children: [statusElement, cancelHint],
    });
    $[51] = statusElement;
    $[52] = cancelHint;
    $[53] = bodyElement;
  } else bodyElement = $[53];
  let flowElement;
  if (
    $[54] !== onKeyDown ||
    $[55] !== introElement ||
    $[56] !== urlFallbackElement ||
    $[57] !== bodyElement
  ) {
    flowElement = jsxProd_default_2(FocusColumn, {
      gap: 1,
      onKeyDown,
      children: [introElement, urlFallbackElement, bodyElement],
    });
    $[54] = onKeyDown;
    $[55] = introElement;
    $[56] = urlFallbackElement;
    $[57] = bodyElement;
    $[58] = flowElement;
  } else flowElement = $[58];
  return flowElement;
}
//@ chunk-f94bkgbg.js:22990-23128 placement
function DesignOAuthWarning() {
  let $ = useMemoCache(1);
  let warning;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    warning = jsxProd_default_2(Text, {
      color: "warning",
      children: [
        DESIGN_LOGIN_CLOSING_NOTICE,
        " Details:",
        " ",
        jsxProd_default(Link, {
          url: DESIGN_CLOSING_SUPPORT_URL,
        }),
      ],
    });
    $[0] = warning;
  } else warning = $[0];
  return warning;
}
//@ chunk-f94bkgbg.js:23128-23230 placement
/**
 * /design-login 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function runDesignLogin(onDone) {
  let hadExistingCredential = (await readDesignOAuth()) !== null;
  return jsxProd_default(DesignOAuthFlow, {
    onDone: (result) => onDone(result),
    hadExistingCredential,
  });
}
export { PASTE_CODE_PROMPT_3, DesignOAuthWarning, DesignOAuthFlow, runDesignLogin };
