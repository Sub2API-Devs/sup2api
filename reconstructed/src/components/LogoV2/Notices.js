/**
 * components/LogoV2/Notices.tsx
 *
 * 2.1.316 新增：启动提示通用外框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (10)
 * attribution: placement 10
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import {
  Fy,
  isValidElement_default,
  init_react_production,
  Q,
  yt,
} from "../../../vendor/react/cjs/react.production.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isAnthropicAuthEnabled, getClaudeAIOAuthTokens } from "../../utils/auth.js";
import { useMainLoopModel_2 } from "../../hooks/useMainLoopModel.js";
import { getModelSourceAnnotation, renderModelSetting } from "../../utils/model/modelDisplay.js";
import { MIGRATIONS } from "../../hooks/notifs/useModelMigrationNotifications.js";
import { uiSignals } from "../../state/uiSignals.js";
import { isMainLoopBusy } from "./ModelSuccessorNotice.js";

//@ chunk-ag5x7vhf.js:74596-75065 placement
/**
 * 启动提示的通用外框：提示正文 + 可选命令（"· /cmd"）。
 */
function InfoNotice(props) {
  let T = w(9);
  let { children, command } = props;
  let k;
  if (T[0] !== children) {
    k = noticeText(children);
    T[0] = children;
    T[1] = k;
  } else k = T[1];
  let _ = k;
  let I;
  let D;
  if (T[2] !== command || T[3] !== _) {
    I = () => ({
      requestId: `notice:${_}`,
      props: {
        text: _,
        command: command ?? null,
      },
    });
    D = [_, command];
    T[2] = command;
    T[3] = _;
    T[4] = I;
    T[5] = D;
  } else {
    I = T[4];
    D = T[5];
  }
  let A = actionKeysNamespace.useRenderInput("InfoNotice", I, D);
  let L;
  if (T[6] !== children || T[7] !== _) {
    L = (V) =>
      jsxProd_default(NoticeLine, {
        command: V.props.command ?? undefined,
        children: V.props.text === _ ? children : V.props.text,
      });
    T[6] = children;
    T[7] = _;
    T[8] = L;
  } else L = T[8];
  return actionKeysNamespace.useRenderHook(A, L);
}
//@ chunk-ag5x7vhf.js:75065-75264 placement
function NoticeLine(props) {
  let k = w(3);
  let { children, command } = props;
  const T = command ? ` \xB7 ${command}` : "";
  let _;
  if (k[0] !== children || k[1] !== T) {
    _ = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [children, T],
      }),
    });
    k[0] = children;
    k[1] = T;
    k[2] = _;
  } else _ = k[2];
  return _;
}
//@ chunk-ag5x7vhf.js:75264-75413 placement
function noticeText(children) {
  let h = "";
  Fy.forEach(children, (x) => {
    if (typeof x === "string" || typeof x === "number") h += String(x);
    else if (isValidElement_default(x)) h += noticeText(x.props.children);
  });
  return h;
}
//@ chunk-ag5x7vhf.js:75413-75437 placement
var ONE_DAY_MS = 86400000;
var TOKEN_EXPIRY_WINDOW_MS = 3 * ONE_DAY_MS;
//@ chunk-ag5x7vhf.js:75437-75737 placement
/**
 * 第一方 OAuth 令牌即将过期（3 天内）时返回提示文本，否则 null。
 */
function oauthExpiryWarning() {
  if (getAPIProvider() !== "firstParty" || !isAnthropicAuthEnabled()) return null;
  let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
  if (!claudeAIOAuthTokens || typeof claudeAIOAuthTokens.refreshTokenExpiresAt !== "number") return null;
  let refreshTokenExpiresAt = claudeAIOAuthTokens.refreshTokenExpiresAt;
  if (
    typeof claudeAIOAuthTokens.expiresAt === "number" &&
    claudeAIOAuthTokens.expiresAt > refreshTokenExpiresAt + TOKEN_EXPIRY_WINDOW_MS
  )
    return null;
  let x = refreshTokenExpiresAt - Date.now();
  if (x > TOKEN_EXPIRY_WINDOW_MS || x <= 0) return null;
  return {
    daysLeft: Math.ceil(x / ONE_DAY_MS),
  };
}
//@ chunk-ag5x7vhf.js:75737-75741 placement
init_react_production();
//@ chunk-ag5x7vhf.js:75741-75936 placement
/**
 * 启动提示 "Using <模型>"，附带模型来源说明和/或 (auto-updated)；两者都没有时不显示。
 */
function ModelSourceNotice() {
  let mainLoopModel = useMainLoopModel_2();
  let h = Q(getModelSourceAnnotation, [mainLoopModel]);
  let x = MIGRATIONS();
  if (!h && !x) return null;
  let T = h && x ? `${h.slice(0, -1)}, auto-updated)` : x ? " (auto-updated)" : h;
  return jsxProd_default_2(InfoNotice, {
    command: "/model",
    children: ["Using ", renderModelSetting(mainLoopModel), T],
  });
}
//@ chunk-ag5x7vhf.js:75936-75940 placement
init_react_production();
//@ chunk-ag5x7vhf.js:75940-76009 placement
function setMainLoopBusy(isMainLoopBusy) {
  uiSignals.mainLoopBusy.setState((h) =>
    h.busy === isMainLoopBusy
      ? h
      : {
          busy: isMainLoopBusy,
        },
  );
}
//@ chunk-ag5x7vhf.js:76009-76067 placement
function useMainLoopBusy() {
  return yt(uiSignals.mainLoopBusy.subscribe, isMainLoopBusy, isMainLoopBusy);
}
export { ModelSourceNotice, InfoNotice, oauthExpiryWarning, useMainLoopBusy, setMainLoopBusy };
