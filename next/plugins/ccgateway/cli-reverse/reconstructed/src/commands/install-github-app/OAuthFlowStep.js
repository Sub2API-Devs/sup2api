/**
 * commands/install-github-app/OAuthFlowStep.tsx
 *
 * 并入已有模块：OAuth 授权步骤
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/OAuthFlowStep.tsx
 * pieces: chunk-2xbvbqx2.js (3)
 * attribution: placement 1, fingerprint 2
 */
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "../../../vendor/react/cjs/react.production.js";
import { OAuthService } from "../../services/oauth/index.js";
import { useCopyUrl, CopiedUrlHint, CopyUrlFallbackHint } from "../../components/CopyUrlHint.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { validateForceLoginMethod } from "../../utils/auth.js";
import { isBrowserUnavailable } from "../../utils/browser.js";
import { LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS } from "../../constants/oauth.js";
import {
  mintApiKeyIfAllowed,
  OrgConfigLoginRefusedError,
  describeWithheldMint,
} from "../../services/oauth/refusedSignIn.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorTelemetryFields } from "../../utils/accessibility/screenReader.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FocusColumn } from "../../components/design-system/FocusColumn.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { OAuthStatusPanel } from "./OptionalActionsSetupStep.js";

//@ chunk-2xbvbqx2.js:35337-35341 placement
init_react_production();
//@ chunk-2xbvbqx2.js:35341-35381 fingerprint (2.1.88 match: PASTE_HERE_MSG, 1)
var PASTE_HERE_MSG = "Paste code here if prompted > ";
//@ chunk-2xbvbqx2.js:35381-38836 fingerprint (2.1.88 match: OAuthFlowStep, 0.66)
function OAuthFlowStep({ onSuccess, onCancel }) {
  let [oauthStatus, setOAuthStatus] = useState({
    state: "starting",
  });
  let [oauthService] = useState(() => new OAuthService());
  let [pastedCode, setPastedCode] = useState("");
  let [tick, setTick] = useState(0);
  let [showPastePrompt, setShowPastePrompt] = useState(false);
  let {
    copiedVia,
    copy: urlCopied,
    reset,
  } = useCopyUrl(oauthStatus.state === "waiting_for_login" ? oauthStatus.url : null);
  let clock = useClock();
  let timersRef = useRef(new Set());
  let urlCopiedTimerRef = useRef(new AbortController());
  useEffect(() => {
    let copiedTimer = urlCopiedTimerRef.current;
    return () => copiedTimer.abort();
  }, []);
  let terminalSize = useTerminalSize();
  let textInputColumns = Math.max(50, terminalSize.columns - PASTE_HERE_MSG.length - 4);
  function handleKeyDown(e) {
    if (oauthStatus.state !== "error") return;
    e.preventDefault();
    if (e.key === "return" && oauthStatus.toRetry) {
      setPastedCode("");
      setTick(0);
      setOAuthStatus({
        state: "about_to_retry",
        nextState: oauthStatus.toRetry,
      });
    } else onCancel();
  }
  async function handleSubmitCode(value, url) {
    if (!value.trim()) {
      setPastedCode("");
      setTick(0);
      return;
    }
    try {
      let [authorizationCode, state] = value.split("#");
      if (!authorizationCode || !state) {
        setOAuthStatus({
          state: "error",
          message: "Invalid code. Please make sure the full code was copied",
          toRetry: {
            state: "waiting_for_login",
            url,
          },
        });
        return;
      }
      logEvent("tengu_oauth_manual_entry", {});
      oauthService.handleManualAuthCodeInput({
        authorizationCode,
        state,
      });
    } catch (err) {
      logError(err);
      setOAuthStatus({
        state: "error",
        message: errorMessage(err),
        toRetry: {
          state: "waiting_for_login",
          url,
        },
      });
    }
  }
  let startOAuth = useCallback(async () => {
    timersRef.current.forEach((timer) => timer());
    timersRef.current.clear();
    let validation = validateForceLoginMethod(true);
    if (!validation.valid) {
      setOAuthStatus({
        state: "error",
        message: `${validation.message} This step creates a long-lived Claude.ai subscription token, which this policy does not permit \u2014 use an API key instead.`,
      });
      return;
    }
    try {
      let result = await oauthService.startOAuthFlow(
        async (url) => {
          reset();
          setShowPastePrompt(false);
          setOAuthStatus({
            state: "waiting_for_login",
            url,
          });
          if (isBrowserUnavailable()) setShowPastePrompt(true);
          else timersRef.current.add(clock.setTimeout(() => setShowPastePrompt(true), 3000));
        },
        {
          loginWithClaudeAi: true,
          inferenceOnly: true,
          expiresIn: LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS,
        },
      );
      setOAuthStatus({
        state: "processing",
      });
      let minted = await mintApiKeyIfAllowed({
        accessToken: result.accessToken,
        minted: result,
      });
      if (!minted.ok) throw new OrgConfigLoginRefusedError(minted.message, minted.evaluation);
      if (urlCopiedTimerRef.current.signal.aborted) {
        await describeWithheldMint(result, "withheld mint");
        return;
      }
      timersRef.current.add(
        clock.setTimeout(() => {
          setOAuthStatus({
            state: "success",
            token: result.accessToken,
          });
          timersRef.current.add(clock.setTimeout(() => onSuccess(result.accessToken), 1000));
        }, 100),
      );
    } catch (err_0) {
      let errorMessage_2 = errorMessage(err_0);
      let isOrgRefused =
        err_0 instanceof OrgConfigLoginRefusedError && err_0.evaluation.decision.verdict === "refused";
      setOAuthStatus({
        state: "error",
        message: errorMessage_2,
        ...(err_0 instanceof OrgConfigLoginRefusedError && {
          verbatim: true,
        }),
        ...(!isOrgRefused && {
          toRetry: {
            state: "starting",
          },
        }),
      });
      logForDebugging(`OAuth flow failed in install-github-app: ${errorMessage_2}`, {
        level: "error",
      });
      logEvent("tengu_oauth_error", {
        ...errorTelemetryFields(err_0),
      });
    }
  }, [clock, oauthService, onSuccess, reset]);
  useEffect(() => {
    if (oauthStatus.state === "starting") startOAuth();
  }, [oauthStatus.state, startOAuth]);
  useTimeout(
    () => {
      if (oauthStatus.state === "about_to_retry") {
        setShowPastePrompt(oauthStatus.nextState.state === "waiting_for_login");
        setOAuthStatus(oauthStatus.nextState);
      }
    },
    oauthStatus.state === "about_to_retry" ? 500 : null,
  );
  useEffect(() => {
    if (/^c+$/.test(pastedCode) && oauthStatus.state === "waiting_for_login" && showPastePrompt) {
      setPastedCode("");
      urlCopied(oauthStatus.url);
    }
  }, [pastedCode, oauthStatus, showPastePrompt, urlCopied]);
  useEffect(() => {
    let timers = timersRef.current;
    return () => {
      oauthService.cleanup();
      timers.forEach((timer) => timer());
      timers.clear();
    };
  }, [oauthService]);
  return jsxProd_default_2(FocusColumn, {
    gap: 1,
    onKeyDown: handleKeyDown,
    children: [
      oauthStatus.state === "starting" &&
        jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          paddingBottom: 1,
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: "Create Authentication Token",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: "Creating a long-lived token for GitHub Actions",
            }),
          ],
        }),
      oauthStatus.state !== "success" &&
        oauthStatus.state !== "starting" &&
        oauthStatus.state !== "processing" &&
        jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            gap: 1,
            paddingBottom: 1,
            children: [
              jsxProd_default(Text, {
                bold: true,
                children: "Create Authentication Token",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: "Creating a long-lived token for GitHub Actions",
              }),
            ],
          },
          "header",
        ),
      oauthStatus.state === "waiting_for_login" &&
        showPastePrompt &&
        jsxProd_default_2(
          Box,
          {
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
                url: oauthStatus.url,
                assumeSupport: true,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: oauthStatus.url,
                }),
              }),
            ],
          },
          "urlToCopy",
        ),
      jsxProd_default(Box, {
        paddingLeft: 1,
        flexDirection: "column",
        gap: 1,
        children: jsxProd_default(OAuthStatusPanel, {
          oauthStatus,
          showPastePrompt,
          pastedCode,
          setPastedCode,
          cursorOffset: tick,
          setCursorOffset: setTick,
          textInputColumns,
          onSubmitCode: handleSubmitCode,
        }),
      }),
    ],
  });
}
export { PASTE_HERE_MSG, OAuthFlowStep };
