/**
 * components/DesignOAuthFlow.tsx
 *
 * 2.1.316 新增：Claude Design 的 OAuth 授权界面与 /design login
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zkzpd9ky.js (8)
 * attribution: placement 8
 */
import { init_react_production, y, R, P } from "../../vendor/react/cjs/react.production.js";
import { OAuthService } from "../services/oauth/index.js";
import {
  DESIGN_LOGIN_CLOSING_NOTICE,
  DESIGN_CLOSING_SUPPORT_URL,
} from "../tools/DesignSyncTool/DesignSyncTool.js";
import { w } from "../../vendor/react/compiler-runtime.js";
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

//@ chunk-zkzpd9ky.js:14331-14335 placement
init_react_production();
//@ chunk-zkzpd9ky.js:14335-14363 placement
function createOAuthService() {
  return new OAuthService();
}
//@ chunk-zkzpd9ky.js:14363-14391 placement
function runCleanup(_e) {
  return _e();
}
//@ chunk-zkzpd9ky.js:14391-14419 placement
function runCleanup_2(Oe) {
  return Oe();
}
//@ chunk-zkzpd9ky.js:14419-14518 placement
var PASTE_CODE_PROMPT_3 = "Paste code here if prompted > ";
var DESIGN_AUTH_SUCCESS_TEXT = `Design-system access authorized.
${DESIGN_LOGIN_CLOSING_NOTICE} Details: ${DESIGN_CLOSING_SUPPORT_URL}`;
//@ chunk-zkzpd9ky.js:14518-20079 placement
/**
 * Claude Design 的 OAuth 授权流程界面（浏览器授权、手动粘贴 code、保存到安全存储）。
 */
function DesignOAuthFlow(props) {
  let h = w(59);
  let { onDone, hadExistingCredential } = props;
  let F;
  if (h[0] === MEMO_CACHE_SENTINEL) {
    F = {
      state: "starting",
    };
    h[0] = F;
  } else F = h[0];
  let [o, f] = y(F);
  let [p] = y(createOAuthService);
  let [C, k] = y("");
  let [g, u] = y(0);
  let [m, K] = y(false);
  let { copiedVia, copy, reset } = useCopyUrl(o.state === "waiting_for_login" ? o.url : null);
  let clock = useClock();
  let zt;
  if (h[1] === MEMO_CACHE_SENTINEL) {
    zt = new Set();
    h[1] = zt;
  } else zt = h[1];
  let L = R(zt);
  let H = R(false);
  let terminalSize = useTerminalSize();
  let textInputColumns = Math.max(50, terminalSize.columns - PASTE_CODE_PROMPT_3.length - 4);
  let Tt;
  if (h[2] !== o.state || h[3] !== o.toRetry || h[4] !== onDone) {
    Tt = function tt(event) {
      if (o.state === "success") {
        event.preventDefault();
        onDone(DESIGN_AUTH_SUCCESS_TEXT);
        return;
      }
      if (o.state !== "error") {
        if (
          event.key === "escape" ||
          ((event.ctrl || event.meta) && (event.key === "c" || event.key === "d"))
        ) {
          event.preventDefault();
          H.current = true;
          onDone("Design login cancelled.");
        }
        return;
      }
      event.preventDefault();
      if (event.key === "return" && o.toRetry) {
        k("");
        u(0);
        f({
          state: "about_to_retry",
          nextState: o.toRetry,
        });
      } else {
        H.current = true;
        onDone("Design login cancelled.");
      }
    };
    h[2] = o.state;
    h[3] = o.toRetry;
    h[4] = onDone;
    h[5] = Tt;
  } else Tt = h[5];
  let onKeyDown = Tt;
  let Ut;
  if (h[6] !== p) {
    Ut = function et(Bt, Et) {
      if (!Bt.trim()) {
        k("");
        u(0);
        return;
      }
      let [Ft, Kt] = Bt.split("#");
      if (!Ft || !Kt) {
        f({
          state: "error",
          message: "Invalid code. Please make sure the full code was copied",
          toRetry: {
            state: "waiting_for_login",
            url: Et,
          },
        });
        logForDebugging(`Design login: invalid pasted code for ${Et}`);
        return;
      }
      logEvent("tengu_design_oauth_manual_entry", {});
      p.handleManualAuthCodeInput({
        authorizationCode: Ft,
        state: Kt,
      });
    };
    h[6] = p;
    h[7] = Ut;
  } else Ut = h[7];
  let onSubmitCode = Ut;
  let $t;
  if (h[8] !== clock || h[9] !== p || h[10] !== onDone || h[11] !== reset) {
    $t = async () => {
      L.current.forEach(runCleanup);
      L.current.clear();
      if (!isDesignOAuthConfigured()) {
        f({
          state: "error",
          message:
            "The Claude Design OAuth client is not configured in this build. Set CLAUDE_CODE_DESIGN_OAUTH_CLIENT_ID to the registered client id, or update to a build with the registered client.",
        });
        return;
      }
      try {
        let oauthConfig = getOauthConfig();
        let yt = designOAuthClientId();
        let wt = await p.startOAuthFlow(
          async (url) => {
            reset();
            K(false);
            f({
              state: "waiting_for_login",
              url,
            });
            if (isBrowserUnavailable()) K(true);
            else L.current.add(clock.setTimeout(() => K(true), 3000));
          },
          {
            loginWithClaudeAi: true,
            oauthClient: {
              clientId: yt,
              scopes: DESIGN_OAUTH_SCOPES,
            },
            skipProfileFetch: true,
            successRedirectUrl: oauthConfig.CLAUDEAI_SUCCESS_URL,
          },
        );
        if (H.current) {
          if (wt.refreshToken) await revokeOAuthToken(wt.refreshToken, yt);
          return;
        }
        f({
          state: "processing",
        });
        let I = await refreshDesignToken(wt, yt);
        if (!I.ok) {
          f({
            state: "error",
            message: I.message,
            toRetry: {
              state: "starting",
            },
          });
          return;
        }
        if (H.current) {
          await revokeOAuthToken(I.slot.refreshToken, I.slot.clientId);
          return;
        }
        let Lt = await writeDesignOAuth(I.slot);
        if (!Lt.success) {
          await revokeOAuthToken(I.slot.refreshToken, I.slot.clientId);
          f({
            state: "error",
            message: Lt.warning ?? "Could not save the design credential to secure storage.",
            toRetry: {
              state: "starting",
            },
          });
          return;
        }
        logEvent("tengu_design_oauth_login_success", {});
        f({
          state: "success",
        });
        L.current.add(clock.setTimeout(() => onDone(DESIGN_AUTH_SUCCESS_TEXT), 1500));
      } catch (error) {
        let ot = error;
        if (ot instanceof AuthCodeRefusedError)
          logForDebugging(`Design login failed: ${ot.message}`, {
            level: "error",
          });
        else logError(ot);
        logEvent("tengu_design_oauth_login_error", {});
        f({
          state: "error",
          message: errorMessage(ot),
          toRetry: {
            state: "starting",
          },
        });
      }
    };
    h[8] = clock;
    h[9] = p;
    h[10] = onDone;
    h[11] = reset;
    h[12] = $t;
  } else $t = h[12];
  let rt = $t;
  let st;
  let Nt;
  if (h[13] !== o.state || h[14] !== rt) {
    st = () => {
      if (o.state === "starting") rt();
    };
    Nt = [o.state, rt];
    h[13] = o.state;
    h[14] = rt;
    h[15] = st;
    h[16] = Nt;
  } else {
    st = h[15];
    Nt = h[16];
  }
  P(st, Nt);
  let Vt;
  if (h[17] !== o.nextState || h[18] !== o.state) {
    Vt = () => {
      if (o.state === "about_to_retry") {
        K(o.nextState.state === "waiting_for_login");
        f(o.nextState);
      }
    };
    h[17] = o.nextState;
    h[18] = o.state;
    h[19] = Vt;
  } else Vt = h[19];
  useTimeout(Vt, o.state === "about_to_retry" ? 500 : null);
  let jt;
  if (h[20] !== copy || h[21] !== o.state || h[22] !== o.url || h[23] !== C || h[24] !== m) {
    jt = () => {
      if (/^c+$/.test(C) && o.state === "waiting_for_login" && m) {
        k("");
        copy(o.url);
      }
    };
    h[20] = copy;
    h[21] = o.state;
    h[22] = o.url;
    h[23] = C;
    h[24] = m;
    h[25] = jt;
  } else jt = h[25];
  let Xt;
  if (h[26] !== copy || h[27] !== o || h[28] !== C || h[29] !== m) {
    Xt = [C, o, m, copy];
    h[26] = copy;
    h[27] = o;
    h[28] = C;
    h[29] = m;
    h[30] = Xt;
  } else Xt = h[30];
  P(jt, Xt);
  let Jt;
  let Wt;
  if (h[31] !== p) {
    Jt = () => {
      let qt = L.current;
      return () => {
        p.cleanup();
        qt.forEach(runCleanup_2);
        qt.clear();
      };
    };
    Wt = [p];
    h[31] = p;
    h[32] = Jt;
    h[33] = Wt;
  } else {
    Jt = h[32];
    Wt = h[33];
  }
  P(Jt, Wt);
  let at;
  if (h[34] !== hadExistingCredential || h[35] !== o.state) {
    at =
      o.state !== "success" &&
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
    h[34] = hadExistingCredential;
    h[35] = o.state;
    h[36] = at;
  } else at = h[36];
  let it;
  if (h[37] !== o.state || h[38] !== o.url || h[39] !== m || h[40] !== copiedVia) {
    it =
      o.state === "waiting_for_login" &&
      m &&
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
            url: o.url,
            assumeSupport: true,
            children: jsxProd_default(Text, {
              dimColor: true,
              children: o.url,
            }),
          }),
        ],
      });
    h[37] = o.state;
    h[38] = o.url;
    h[39] = m;
    h[40] = copiedVia;
    h[41] = it;
  } else it = h[41];
  let ut;
  if (
    h[42] !== g ||
    h[43] !== onSubmitCode ||
    h[44] !== o ||
    h[45] !== C ||
    h[46] !== m ||
    h[47] !== textInputColumns
  ) {
    ut = jsxProd_default(OAuthStatusMessage, {
      oauthStatus: o,
      showPastePrompt: m,
      pastedCode: C,
      setPastedCode: k,
      cursorOffset: g,
      setCursorOffset: u,
      textInputColumns,
      onSubmitCode,
    });
    h[42] = g;
    h[43] = onSubmitCode;
    h[44] = o;
    h[45] = C;
    h[46] = m;
    h[47] = textInputColumns;
    h[48] = ut;
  } else ut = h[48];
  let ct;
  if (h[49] !== o.state) {
    ct =
      o.state !== "success" &&
      o.state !== "error" &&
      jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
        }),
      });
    h[49] = o.state;
    h[50] = ct;
  } else ct = h[50];
  let lt;
  if (h[51] !== ut || h[52] !== ct) {
    lt = jsxProd_default_2(Box, {
      paddingLeft: 1,
      flexDirection: "column",
      gap: 1,
      children: [ut, ct],
    });
    h[51] = ut;
    h[52] = ct;
    h[53] = lt;
  } else lt = h[53];
  let Mt;
  if (h[54] !== onKeyDown || h[55] !== at || h[56] !== it || h[57] !== lt) {
    Mt = jsxProd_default_2(FocusColumn, {
      gap: 1,
      onKeyDown,
      children: [at, it, lt],
    });
    h[54] = onKeyDown;
    h[55] = at;
    h[56] = it;
    h[57] = lt;
    h[58] = Mt;
  } else Mt = h[58];
  return Mt;
}
//@ chunk-zkzpd9ky.js:21845-21983 placement
function DesignOAuthWarning() {
  let E = w(1);
  let c;
  if (E[0] === MEMO_CACHE_SENTINEL) {
    c = jsxProd_default_2(Text, {
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
    E[0] = c;
  } else c = E[0];
  return c;
}
//@ chunk-zkzpd9ky.js:21983-22085 placement
/**
 * /design-login 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function runDesignLogin(onDone) {
  let hadExistingCredential = (await readDesignOAuth()) !== null;
  return jsxProd_default(DesignOAuthFlow, {
    onDone: (D) => onDone(D),
    hadExistingCredential,
  });
}
export { PASTE_CODE_PROMPT_3, DesignOAuthWarning };
