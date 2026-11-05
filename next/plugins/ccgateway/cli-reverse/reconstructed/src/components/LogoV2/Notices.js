/**
 * components/LogoV2/Notices.tsx
 *
 * 2.1.316 新增：启动提示通用外框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gdkqhwa0.js (3), chunk-hnxhr3bs.js (8)
 * attribution: placement 10, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getAPIProvider } from "../../utils/model/providers.js";
import { isAnthropicAuthEnabled, getClaudeAIOAuthTokens } from "../../utils/auth.js";
import { isPlausibleRefreshTokenExpiry } from "../../utils/auth/managedHelpers.js";
import {
  init_react_production,
  useContext,
  childrenExport,
  isValidElement_default,
  useMemo,
  useSyncExternalStore,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { slashCommandLinkContext } from "../SlashCommandLink.js";
import { Text, Box } from "../../ink/components/Text.js";
import { PROPORTION } from "../../constants/figures.js";
import { useMainLoopModel_2 } from "../../hooks/useMainLoopModel.js";
import { getModelSourceAnnotation, renderModelSetting } from "../../utils/model/modelDisplay.js";
import { MIGRATIONS } from "../../hooks/notifs/useModelMigrationNotifications.js";
import { uiSignals } from "../../state/uiSignals.js";
import { isMainLoopBusy } from "./ModelSuccessorNotice.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-gdkqhwa0.js:270-291 placement
var ONE_DAY_MS = 86400000;
var TOKEN_EXPIRY_WINDOW_MS = 3 * ONE_DAY_MS;
//@ chunk-gdkqhwa0.js:291-533 layout
function refreshTokenExpiryNotice() {
  if (getAPIProvider() !== "firstParty" || !isAnthropicAuthEnabled()) return null;
  let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
  if (
    !claudeAIOAuthTokens?.refreshToken ||
    !isPlausibleRefreshTokenExpiry(claudeAIOAuthTokens.refreshTokenExpiresAt)
  )
    return null;
  let refreshTokenExpiresAt = claudeAIOAuthTokens.refreshTokenExpiresAt;
  if (
    typeof claudeAIOAuthTokens.expiresAt === "number" &&
    claudeAIOAuthTokens.expiresAt > refreshTokenExpiresAt + TOKEN_EXPIRY_WINDOW_MS
  )
    return null;
  return new Date(refreshTokenExpiresAt);
}
//@ chunk-gdkqhwa0.js:533-670 placement
/**
 * 第一方 OAuth 令牌即将过期（3 天内）时返回提示文本，否则 null。
 */
function oauthExpiryWarning() {
  let expiry = refreshTokenExpiryNotice();
  if (expiry === null) return null;
  let msLeft = expiry.getTime() - Date.now();
  if (msLeft > TOKEN_EXPIRY_WINDOW_MS || msLeft <= 0) return null;
  return {
    daysLeft: Math.ceil(msLeft / ONE_DAY_MS),
  };
}
//@ chunk-hnxhr3bs.js:74149-74153 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:74149", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:74153-74622 placement
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
//@ chunk-hnxhr3bs.js:74622-75062 placement (2.1.88 match: _temp, 0.345)
function NoticeLine(props) {
  let $ = useMemoCache(10);
  let { children, command } = props;
  let hasProportion = useContext(slashCommandLinkContext);
  const marginLeft = hasProportion ? -2 : 0;
  let proportion;
  if ($[0] !== hasProportion) {
    proportion =
      hasProportion &&
      jsxProd_default_2(Text, {
        "aria-hidden": true,
        children: [PROPORTION, " "],
      });
    $[0] = hasProportion;
    $[1] = proportion;
  } else proportion = $[1];
  const commandSuffix = command ? ` \xB7 ${command}` : "";
  let children_2;
  if ($[2] !== children || $[3] !== hasProportion || $[4] !== proportion || $[5] !== commandSuffix) {
    children_2 = jsxProd_default_2(Text, {
      dimColor: true,
      italic: hasProportion,
      children: [proportion, children, commandSuffix],
    });
    $[2] = children;
    $[3] = hasProportion;
    $[4] = proportion;
    $[5] = commandSuffix;
    $[6] = children_2;
  } else children_2 = $[6];
  let line;
  if ($[7] !== marginLeft || $[8] !== children_2) {
    line = jsxProd_default(Box, {
      marginLeft,
      children: children_2,
    });
    $[7] = marginLeft;
    $[8] = children_2;
    $[9] = line;
  } else line = $[9];
  return line;
}
//@ chunk-hnxhr3bs.js:75062-75211 placement
function noticeText(children) {
  let text = "";
  childrenExport.forEach(children, (child) => {
    if (typeof child === "string" || typeof child === "number") text += String(child);
    else if (isValidElement_default(child)) text += noticeText(child.props.children);
  });
  return text;
}
//@ chunk-hnxhr3bs.js:75211-75215 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:75211", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:75215-75410 placement
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
//@ chunk-hnxhr3bs.js:75414-75483 placement
function setMainLoopBusy(isMainLoopBusy) {
  uiSignals.mainLoopBusy.setState((state) =>
    state.busy === isMainLoopBusy
      ? state
      : {
          busy: isMainLoopBusy,
        },
  );
}
//@ chunk-hnxhr3bs.js:75483-75541 placement
function useMainLoopBusy() {
  return useSyncExternalStore(uiSignals.mainLoopBusy.subscribe, isMainLoopBusy, isMainLoopBusy);
}
export {
  refreshTokenExpiryNotice,
  ModelSourceNotice,
  InfoNotice,
  oauthExpiryWarning,
  useMainLoopBusy,
  setMainLoopBusy,
};
