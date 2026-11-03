/**
 * commands/install-github-app/OAuthFlowStep.tsx
 *
 * 并入已有模块：OAuth 授权步骤
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/OAuthFlowStep.tsx
 * pieces: chunk-4r7nqnx2.js (1), chunk-4v9zy7gn.js (3)
 * attribution: fingerprint 2, placement 1, layout 1
 */
import { j, y, R, P, ce } from "../../../vendor/react/cjs/react.production.js";
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
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FocusColumn } from "../../components/design-system/FocusColumn.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { OAuthStatusPanel } from "./OptionalActionsSetupStep.js";

//@ chunk-4v9zy7gn.js:34294-34298 placement
j();
//@ chunk-4v9zy7gn.js:34298-34338 layout = PASTE_HERE_MSG (1)
var PASTE_HERE_MSG_2 = "Paste code here if prompted > ";
//@ chunk-4v9zy7gn.js:34338-37793 fingerprint = OAuthFlowStep (0.659)
function OAuthFlowStep({ onSuccess: onSuccess, onCancel: onCancel }) {
  let [p, f] = y({ state: "starting" }),
    [C] = y(() => new OAuthService()),
    [u, o] = y(""),
    [v, A] = y(0),
    [g, _] = y(!1),
    {
      copiedVia: copiedVia,
      copy: copy,
      reset: reset,
    } = useCopyUrl(p.state === "waiting_for_login" ? p.url : null),
    T = useClock(),
    timersRef = R(new Set()),
    urlCopiedTimerRef = R(new AbortController());
  P(() => {
    let F = urlCopiedTimerRef.current;
    return () => F.abort();
  }, []);
  let terminalSize = useTerminalSize(),
    textInputColumns = Math.max(50, terminalSize.columns - PASTE_HERE_MSG_2.length - 4);
  function handleKeyDown(F) {
    if (p.state !== "error") return;
    if ((F.preventDefault(), F.key === "return" && p.toRetry))
      (o(""), A(0), f({ state: "about_to_retry", nextState: p.toRetry }));
    else onCancel();
  }
  async function handleSubmitCode(value, url) {
    if (!value.trim()) {
      (o(""), A(0));
      return;
    }
    try {
      let [D, Y] = value.split("#");
      if (!D || !Y) {
        f({
          state: "error",
          message: "Invalid code. Please make sure the full code was copied",
          toRetry: { state: "waiting_for_login", url: url },
        });
        return;
      }
      (logEvent("tengu_oauth_manual_entry", {}),
        C.handleManualAuthCodeInput({ authorizationCode: D, state: Y }));
    } catch (err) {
      (logError(err),
        f({ state: "error", message: errorMessage(err), toRetry: { state: "waiting_for_login", url: url } }));
    }
  }
  let startOAuth = ce(async () => {
    (timersRef.current.forEach((timer) => timer()), timersRef.current.clear());
    let F = validateForceLoginMethod(!0);
    if (!F.valid) {
      f({
        state: "error",
        message: `${F.message} This step creates a long-lived Claude.ai subscription token, which this policy does not permit \u2014 use an API key instead.`,
      });
      return;
    }
    try {
      let result = await C.startOAuthFlow(
        async (url_0) => {
          if ((reset(), _(!1), f({ state: "waiting_for_login", url: url_0 }), isBrowserUnavailable())) _(!0);
          else timersRef.current.add(T.setTimeout(() => _(!0), 3000));
        },
        { loginWithClaudeAi: !0, inferenceOnly: !0, expiresIn: LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS },
      );
      f({ state: "processing" });
      let D = await mintApiKeyIfAllowed({ accessToken: result.accessToken, minted: result });
      if (!D.ok) throw new OrgConfigLoginRefusedError(D.message, D.evaluation);
      if (urlCopiedTimerRef.current.signal.aborted) {
        await describeWithheldMint(result, "withheld mint");
        return;
      }
      timersRef.current.add(
        T.setTimeout(() => {
          (f({ state: "success", token: result.accessToken }),
            timersRef.current.add(T.setTimeout(() => onSuccess(result.accessToken), 1000)));
        }, 100),
      );
    } catch (err_0) {
      let D = errorMessage(err_0),
        Y = err_0 instanceof OrgConfigLoginRefusedError && err_0.evaluation.decision.verdict === "refused";
      (f({
        state: "error",
        message: D,
        ...(err_0 instanceof OrgConfigLoginRefusedError && { verbatim: !0 }),
        ...(!Y && { toRetry: { state: "starting" } }),
      }),
        logForDebugging(`OAuth flow failed in install-github-app: ${D}`, { level: "error" }),
        logEvent("tengu_oauth_error", { ...errorTelemetryFields(err_0) }));
    }
  }, [T, C, onSuccess, reset]);
  return (
    P(() => {
      if (p.state === "starting") startOAuth();
    }, [p.state, startOAuth]),
    useTimeout(
      () => {
        if (p.state === "about_to_retry") (_(p.nextState.state === "waiting_for_login"), f(p.nextState));
      },
      p.state === "about_to_retry" ? 500 : null,
    ),
    P(() => {
      if (/^c+$/.test(u) && p.state === "waiting_for_login" && g) (o(""), copy(p.url));
    }, [u, p, g, copy]),
    P(() => {
      let timers = timersRef.current;
      return () => {
        (C.cleanup(), timers.forEach((timer_2) => timer_2()), timers.clear());
      };
    }, [C]),
    r(FocusColumn, {
      gap: 1,
      onKeyDown: handleKeyDown,
      children: [
        p.state === "starting" &&
          r(Box, {
            flexDirection: "column",
            gap: 1,
            paddingBottom: 1,
            children: [
              e(Text, { bold: !0, children: "Create Authentication Token" }),
              e(Text, { dimColor: !0, children: "Creating a long-lived token for GitHub Actions" }),
            ],
          }),
        p.state !== "success" &&
          p.state !== "starting" &&
          p.state !== "processing" &&
          r(
            Box,
            {
              flexDirection: "column",
              gap: 1,
              paddingBottom: 1,
              children: [
                e(Text, { bold: !0, children: "Create Authentication Token" }),
                e(Text, { dimColor: !0, children: "Creating a long-lived token for GitHub Actions" }),
              ],
            },
            "header",
          ),
        p.state === "waiting_for_login" &&
          g &&
          r(
            Box,
            {
              flexDirection: "column",
              gap: 1,
              paddingBottom: 1,
              children: [
                r(Box, {
                  flexDirection: "column",
                  paddingX: 1,
                  children: [
                    r(Box, {
                      children: [
                        r(Text, {
                          dimColor: !0,
                          children: ["Browser didn't open? Use the url below to sign in", " "],
                        }),
                        e(CopiedUrlHint, { via: copiedVia }),
                      ],
                    }),
                    e(CopyUrlFallbackHint, { via: copiedVia }),
                  ],
                }),
                e(Link, {
                  url: p.url,
                  assumeSupport: !0,
                  children: e(Text, { dimColor: !0, children: p.url }),
                }),
              ],
            },
            "urlToCopy",
          ),
        e(Box, {
          paddingLeft: 1,
          flexDirection: "column",
          gap: 1,
          children: e(OAuthStatusPanel, {
            oauthStatus: p,
            showPastePrompt: g,
            pastedCode: u,
            setPastedCode: o,
            cursorOffset: v,
            setCursorOffset: A,
            textInputColumns: textInputColumns,
            onSubmitCode: handleSubmitCode,
          }),
        }),
      ],
    })
  );
}
//@ chunk-4r7nqnx2.js:5057-5096 fingerprint = PASTE_HERE_MSG (1)
var PASTE_HERE_MSG = "Paste code here if prompted > ";

export { PASTE_HERE_MSG, PASTE_HERE_MSG_2, OAuthFlowStep };
