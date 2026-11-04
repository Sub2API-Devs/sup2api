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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import {
  childrenExport,
  isValidElement_default,
  init_react_production,
  useMemo,
  useSyncExternalStore,
} from "../../../vendor/react/cjs/react.production.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isAnthropicAuthEnabled, getClaudeAIOAuthTokens } from "../../utils/auth.js";
import { useMainLoopModel_2 } from "../../hooks/useMainLoopModel.js";
import { getModelSourceAnnotation, renderModelSetting } from "../../utils/model/modelDisplay.js";
import { MIGRATIONS } from "../../hooks/notifs/useModelMigrationNotifications.js";
import { uiSignals } from "../../state/uiSignals.js";
import { isMainLoopBusy } from "./ModelSuccessorNotice.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ag5x7vhf.js:74596-75065 placement
/**
 * 启动提示的通用外框：提示正文 + 可选命令（"· /cmd"）。
 */
function InfoNotice(props) {
  let $ = useMemoCache(9);
  let { children, command } = props;
  let text;
  if ($[0] !== children) {
    text = noticeText(children);
    $[0] = children;
    $[1] = text;
  } else text = $[1];
  let text_2 = text;
  let compute;
  let deps;
  if ($[2] !== command || $[3] !== text_2) {
    compute = () => ({
      requestId: `notice:${text_2}`,
      props: {
        text: text_2,
        command: command ?? null,
      },
    });
    deps = [text_2, command];
    $[2] = command;
    $[3] = text_2;
    $[4] = compute;
    $[5] = deps;
  } else {
    compute = $[4];
    deps = $[5];
  }
  let actionKeys = actionKeysNamespace.useRenderInput("InfoNotice", compute, deps);
  let renderNotice;
  if ($[6] !== children || $[7] !== text_2) {
    renderNotice = (state) =>
      jsxProd_default(NoticeLine, {
        command: state.props.command ?? undefined,
        children: state.props.text === text_2 ? children : state.props.text,
      });
    $[6] = children;
    $[7] = text_2;
    $[8] = renderNotice;
  } else renderNotice = $[8];
  return actionKeysNamespace.useRenderHook(actionKeys, renderNotice);
}
//@ chunk-ag5x7vhf.js:75065-75264 placement
function NoticeLine(props) {
  let $ = useMemoCache(3);
  let { children, command } = props;
  const commandSuffix = command ? ` \xB7 ${command}` : "";
  let line;
  if ($[0] !== children || $[1] !== commandSuffix) {
    line = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [children, commandSuffix],
      }),
    });
    $[0] = children;
    $[1] = commandSuffix;
    $[2] = line;
  } else line = $[2];
  return line;
}
//@ chunk-ag5x7vhf.js:75264-75413 placement
function noticeText(children) {
  let text = "";
  childrenExport.forEach(children, (child) => {
    if (typeof child === "string" || typeof child === "number") text += String(child);
    else if (isValidElement_default(child)) text += noticeText(child.props.children);
  });
  return text;
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
  let msLeft = refreshTokenExpiresAt - Date.now();
  if (msLeft > TOKEN_EXPIRY_WINDOW_MS || msLeft <= 0) return null;
  return {
    daysLeft: Math.ceil(msLeft / ONE_DAY_MS),
  };
}
//@ chunk-ag5x7vhf.js:75737-75741 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:75737", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:75741-75936 placement
/**
 * 启动提示 "Using <模型>"，附带模型来源说明和/或 (auto-updated)；两者都没有时不显示。
 */
function ModelSourceNotice() {
  let mainLoopModel = useMainLoopModel_2();
  let annotation = useMemo(getModelSourceAnnotation, [mainLoopModel]);
  let migrationNotice = MIGRATIONS();
  if (!annotation && !migrationNotice) return null;
  let suffix =
    annotation && migrationNotice
      ? `${annotation.slice(0, -1)}, auto-updated)`
      : migrationNotice
        ? " (auto-updated)"
        : annotation;
  return jsxProd_default_2(InfoNotice, {
    command: "/model",
    children: ["Using ", renderModelSetting(mainLoopModel), suffix],
  });
}
//@ chunk-ag5x7vhf.js:75936-75940 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:75936", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:75940-76009 placement
function setMainLoopBusy(isMainLoopBusy) {
  uiSignals.mainLoopBusy.setState((state) =>
    state.busy === isMainLoopBusy
      ? state
      : {
          busy: isMainLoopBusy,
        },
  );
}
//@ chunk-ag5x7vhf.js:76009-76067 placement
function useMainLoopBusy() {
  return useSyncExternalStore(uiSignals.mainLoopBusy.subscribe, isMainLoopBusy, isMainLoopBusy);
}
export { ModelSourceNotice, InfoNotice, oauthExpiryWarning, useMainLoopBusy, setMainLoopBusy };
