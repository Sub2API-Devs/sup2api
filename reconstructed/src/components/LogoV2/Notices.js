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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { Fy, dh, j, Q, yt } from "../../../vendor/react/cjs/react.production.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isAnthropicAuthEnabled, getClaudeAIOAuthTokens } from "../../utils/auth.js";
import { useMainLoopModel_2 } from "../../hooks/useMainLoopModel.js";
import { getModelSourceAnnotation, renderModelSetting } from "../../utils/model/modelDisplay.js";
import { MIGRATIONS } from "../../hooks/notifs/useModelMigrationNotifications.js";
import { uiSignals } from "../../state/uiSignals.js";
import { isMainLoopBusy } from "./ModelSuccessorNotice.js";

/**
 * 启动提示的通用外框：提示正文 + 可选命令（"· /cmd"）。
 */
//@ chunk-ag5x7vhf.js:74596-75065 placement
function InfoNotice(m) {
  let T = w(9),
    { children: children, command: command } = m,
    k;
  if (T[0] !== children) ((k = noticeText(children)), (T[0] = children), (T[1] = k));
  else k = T[1];
  let _ = k,
    I,
    D;
  if (T[2] !== command || T[3] !== _)
    ((I = () => ({ requestId: `notice:${_}`, props: { text: _, command: command ?? null } })),
      (D = [_, command]),
      (T[2] = command),
      (T[3] = _),
      (T[4] = I),
      (T[5] = D));
  else ((I = T[4]), (D = T[5]));
  let useRenderInput = actionKeysNamespace.useRenderInput("InfoNotice", I, D),
    L;
  if (T[6] !== children || T[7] !== _)
    ((L = (V) =>
      e(NoticeLine, {
        command: V.props.command ?? void 0,
        children: V.props.text === _ ? children : V.props.text,
      })),
      (T[6] = children),
      (T[7] = _),
      (T[8] = L));
  else L = T[8];
  return actionKeysNamespace.useRenderHook(useRenderInput, L);
}
//@ chunk-ag5x7vhf.js:75065-75264 placement
function NoticeLine(m) {
  let k = w(3),
    { children: children, command: command } = m;
  const T = command ? ` \xB7 ${command}` : "";
  let _;
  if (k[0] !== children || k[1] !== T)
    ((_ = e(Box, { children: r(Text, { dimColor: !0, children: [children, T] }) })),
      (k[0] = children),
      (k[1] = T),
      (k[2] = _));
  else _ = k[2];
  return _;
}
//@ chunk-ag5x7vhf.js:75264-75413 placement
function noticeText(m) {
  let h = "";
  return (
    Fy.forEach(m, (x) => {
      if (typeof x === "string" || typeof x === "number") h += String(x);
      else if (dh(x)) h += noticeText(x.props.children);
    }),
    h
  );
}
//@ chunk-ag5x7vhf.js:75413-75437 placement
var Ib = 86400000,
  kb = 3 * Ib;
/**
 * 第一方 OAuth 令牌即将过期（3 天内）时返回提示文本，否则 null。
 */
//@ chunk-ag5x7vhf.js:75437-75737 placement
function oauthExpiryWarning() {
  if (getAPIProvider() !== "firstParty" || !isAnthropicAuthEnabled()) return null;
  let m = getClaudeAIOAuthTokens();
  if (!m || typeof m.refreshTokenExpiresAt !== "number") return null;
  let refreshTokenExpiresAt = m.refreshTokenExpiresAt;
  if (typeof m.expiresAt === "number" && m.expiresAt > refreshTokenExpiresAt + kb) return null;
  let x = refreshTokenExpiresAt - Date.now();
  if (x > kb || x <= 0) return null;
  return { daysLeft: Math.ceil(x / Ib) };
}
//@ chunk-ag5x7vhf.js:75737-75741 placement
j();
/**
 * 启动提示 "Using <模型>"，附带模型来源说明和/或 (auto-updated)；两者都没有时不显示。
 */
//@ chunk-ag5x7vhf.js:75741-75936 placement
function ModelSourceNotice() {
  let m = useMainLoopModel_2(),
    h = Q(getModelSourceAnnotation, [m]),
    x = MIGRATIONS();
  if (!h && !x) return null;
  let T = h && x ? `${h.slice(0, -1)}, auto-updated)` : x ? " (auto-updated)" : h;
  return r(InfoNotice, { command: "/model", children: ["Using ", renderModelSetting(m), T] });
}
//@ chunk-ag5x7vhf.js:75936-75940 placement
j();
//@ chunk-ag5x7vhf.js:75940-76009 placement
function setMainLoopBusy(m) {
  uiSignals.mainLoopBusy.setState((h) => (h.busy === m ? h : { busy: m }));
}
//@ chunk-ag5x7vhf.js:76009-76067 placement
function useMainLoopBusy() {
  return yt(uiSignals.mainLoopBusy.subscribe, isMainLoopBusy, isMainLoopBusy);
}

export { ModelSourceNotice, InfoNotice, oauthExpiryWarning, useMainLoopBusy, setMainLoopBusy };
