/**
 * components/TokenWarning.tsx
 *
 * 上下文用量告警：显示 "% context used / % until auto-compact" 或 "Context low"。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TokenWarning.tsx
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: sole-consumer 1, affinity 1, fingerprint 2
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { useAppState } from "../state/AppState.js";
import { calculateTokenWarningState } from "../services/compact/autoCompact.js";
import { getModelContextInfo } from "../utils/model/modelContextInfo.js";
import { SN } from "./StatusNotices.js";
import { isAutoCompactEnabled } from "../services/compact/compactSettings.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getUpgradeMessage } from "../utils/model/contextWindowUpgradeCheck.js";
import { abe, effectiveContextWindow } from "../services/compact/autoCompactWindow.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { Ansi } from "../ink/components/AnsiText.js";

//@ chunk-18hwfzwa.js:784345-784390 sole-consumer
function selectAutoCompactWindow(oo) {
  return oo.autoCompactWindow;
}
//@ chunk-18hwfzwa.js:784390-784440 affinity
function selectRemoteAutocompactState(Xt) {
  return Xt.remoteAutocompactState;
}
//@ chunk-18hwfzwa.js:784440-785667 fingerprint = TokenWarning (0.715)
function TokenWarning(t0) {
  let $ = w(17),
    { tokenUsage: tokenUsage, model: model } = t0,
    autoCompactWindow = useAppState(selectAutoCompactWindow),
    remoteAutocompactState = useAppState(selectRemoteAutocompactState),
    Re;
  if ($[0] !== autoCompactWindow || $[1] !== model || $[2] !== remoteAutocompactState || $[3] !== tokenUsage)
    ((Re = calculateTokenWarningState(
      tokenUsage,
      getModelContextInfo(model),
      autoCompactWindow,
      remoteAutocompactState,
    )),
      ($[0] = autoCompactWindow),
      ($[1] = model),
      ($[2] = remoteAutocompactState),
      ($[3] = tokenUsage),
      ($[4] = Re));
  else Re = $[4];
  let Be = Re,
    suppressWarning = SN();
  if (Be.level === "ok" || suppressWarning) {
    return null;
  }
  let pctLeft = Be.pctLeft,
    ze = remoteAutocompactState ? remoteAutocompactState.enabled : isAutoCompactEnabled(),
    Xe;
  if ($[5] === MEMO_CACHE_SENTINEL) ((Xe = getUpgradeMessage("warning")), ($[5] = Xe));
  else Xe = $[5];
  let rt = Xe,
    kt = pctLeft,
    At = remoteAutocompactState
      ? !remoteAutocompactState.enforced
      : !abe(getModelContextInfo(model), autoCompactWindow);
  if (At) {
    let It;
    if ($[6] !== autoCompactWindow || $[7] !== model || $[8] !== remoteAutocompactState)
      ((It = remoteAutocompactState
        ? remoteAutocompactState.effectiveWindow
        : effectiveContextWindow(getModelContextInfo(model), autoCompactWindow)),
        ($[6] = autoCompactWindow),
        ($[7] = model),
        ($[8] = remoteAutocompactState),
        ($[9] = It));
    else It = $[9];
    let Ot = It;
    let Et;
    if ($[10] !== Ot || $[11] !== tokenUsage)
      ((Et = Math.round(((Ot - tokenUsage) / Ot) * 100)), ($[10] = Ot), ($[11] = tokenUsage), ($[12] = Et));
    else Et = $[12];
    kt = Math.max(0, Et);
  }
  let Dt = At ? `${100 - kt}% context used` : `${kt}% until auto-compact`;
  if (ze) {
    const It = rt ? `${Dt} \xB7 ${rt}` : Dt;
    let Et;
    if ($[13] !== It)
      ((Et = e(Text, { dimColor: !0, wrap: "truncate", children: It })), ($[13] = It), ($[14] = Et));
    else Et = $[14];
    return Et;
  }
  let Lt = remoteAutocompactState !== void 0 || isEnvTruthy(process.env.DISABLE_COMPACT);
  const It = rt
    ? `Context low (${pctLeft}% remaining) \xB7 ${rt}`
    : Lt
      ? `Context low (${pctLeft}% remaining)`
      : `Context low (${pctLeft}% remaining) \xB7 Run /compact to compact & continue`;
  let Et;
  if ($[15] !== It)
    ((Et = e(Text, { color: "error", wrap: "truncate", children: It })), ($[15] = It), ($[16] = Et));
  else Et = $[16];
  return Et;
}
//@ chunk-18hwfzwa.js:802616-802710 fingerprint = CollapseLabel (0.376)
function CollapseLabel(Xe, rt) {
  return e(Text, { dimColor: !0, wrap: "truncate", children: e(Ansi, { children: Xe }) }, rt);
}

export { TokenWarning, CollapseLabel };
