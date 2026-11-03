/**
 * components/SessionHeader.tsx
 *
 * 2.1.316 新增。会话标题头。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: placement 8
 */
import { getModelBadgeParts } from "../utils/ultraplan/keyword.js";
import { Oy } from "./PromptInput/footerGates.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { SentryErrorBoundary } from "./SentryErrorBoundary.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { Box, Text } from "../ink/components/Text.js";
import { NoticeLine } from "./SlashCommandLink.js";
import { useMainLoopModel_2 } from "../hooks/useMainLoopModel.js";
import { parseUserSpecifiedModel, renderModelSetting } from "../utils/model/modelDisplay.js";
import { useAppState } from "../state/AppState.js";
import { selectIsBriefOnly2, selectUltracode2, selectFastMode } from "../screens/repl/ReplScreenFrame.js";
import { dg } from "../context/QueuedMessageContext.js";
import { isEffortIndicatorShown } from "./EffortIndicator.js";
import { AccountMemoryMarker } from "./PromptInput/PromptInputFooter.js";
import { P7 } from "./LogoV2/LogoV2.js";
import { eTn, effortValueToString, isUltracodeActive } from "../utils/effort.js";
import { NCn } from "../utils/fastMode.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { isDebugMode } from "../utils/debug.js";
import { Ffe } from "../utils/messageQueueManager.js";
import { isTaskNotificationCommand } from "./PromptInput/PromptInputQueuedCommands.js";
import { useCommandQueue } from "./Messages.js";
import { count } from "../utils/collections.js";

//@ chunk-18hwfzwa.js:1442667-1442762 placement
function $Uo(h) {
  return [h.compliance, h.debug ? "Debug" : void 0, ...h.modes].filter((x) => x !== void 0);
}
//@ chunk-18hwfzwa.js:1442762-1442821 placement
function Qbt(h) {
  return [...getModelBadgeParts(h), ...$Uo(h)].join(" \xB7 ");
}
//@ chunk-18hwfzwa.js:1442821-1442880 placement
function iee() {
  return Oy() ? e(SentryErrorBoundary, { children: e(SessionHeaderLine, {}) }) : null;
}
//@ chunk-18hwfzwa.js:1442880-1443110 placement
function SessionHeaderLine() {
  let $ = w(4);
  const h = useSessionHeaderInfo();
  let D;
  if ($[0] !== h) ((D = Qbt(h)), ($[0] = h), ($[1] = D));
  else D = $[1];
  let L;
  if ($[2] !== D)
    ((L = e(Box, {
      marginTop: 1,
      children: e(NoticeLine, { state: "settled", tone: "dim", linkify: !1, text: D }),
    })),
      ($[2] = D),
      ($[3] = L));
  else L = $[3];
  return L;
}
/**
 * 汇总会话标题头信息：模型显示名、effort、ultracode、快速模式、合规标识（HIPAA/zdr）、调试模式与账号记忆标记。
 */
//@ chunk-18hwfzwa.js:1443110-1443782 placement
function useSessionHeaderInfo() {
  let $ = w(13),
    model = useMainLoopModel_2(),
    parsedModel = parseUserSpecifiedModel(model),
    briefOnly = useAppState(selectIsBriefOnly2),
    effortSetting = dg(),
    effort = isEffortIndicatorShown(effortSetting, parsedModel, briefOnly),
    ultracodeState = useAppState(selectUltracode2),
    modeMarkers = AccountMemoryMarker(),
    fastModeState = useAppState(selectFastMode),
    isHipaa = P7("hipaa"),
    isZdr = P7("zdr"),
    modelLabel;
  if ($[0] !== model) ((modelLabel = renderModelSetting(model)), ($[0] = model), ($[1] = modelLabel));
  else modelLabel = $[1];
  const effortLabel =
      effort === void 0 ? void 0 : (eTn(effortSetting, parsedModel) ?? effortValueToString(effort)),
    ultra = !briefOnly && isUltracodeActive(ultracodeState, parsedModel);
  let fastMode;
  if ($[2] !== fastModeState || $[3] !== model)
    ((fastMode = NCn(fastModeState, !1, model)), ($[2] = fastModeState), ($[3] = model), ($[4] = fastMode));
  else fastMode = $[4];
  const compliance = isHipaa ? "HIPAA" : isZdr ? "zdr" : void 0;
  let debug;
  if ($[5] === MEMO_CACHE_SENTINEL) ((debug = isDebugMode()), ($[5] = debug));
  else debug = $[5];
  let info;
  if (
    $[6] !== modeMarkers ||
    $[7] !== modelLabel ||
    $[8] !== effortLabel ||
    $[9] !== ultra ||
    $[10] !== fastMode ||
    $[11] !== compliance
  )
    ((info = {
      model: modelLabel,
      effort: effortLabel,
      ultra: ultra,
      fastMode: fastMode,
      compliance: compliance,
      debug: debug,
      modes: modeMarkers,
    }),
      ($[6] = modeMarkers),
      ($[7] = modelLabel),
      ($[8] = effortLabel),
      ($[9] = ultra),
      ($[10] = fastMode),
      ($[11] = compliance),
      ($[12] = info));
  else info = $[12];
  return info;
}
//@ chunk-18hwfzwa.js:1443782-1443829 placement = _temp2 (1)
function aWo(s_0) {
  return !!s_0.viewingAgentTaskId;
}
//@ chunk-18hwfzwa.js:1443829-1443921 placement = processQueuedCommands (0.792)
function processQueuedCommands_2(queuedCommands) {
  return (
    queuedCommands.mode === "task-notification" &&
    queuedCommands.taskId !== void 0 &&
    Ffe(queuedCommands) &&
    !isTaskNotificationCommand(queuedCommands)
  );
}
/**
 * 面板打开期间有排队的后台任务更新时，显示"N background task updates waiting"。
 */
//@ chunk-18hwfzwa.js:1443921-1444271 placement
function PendingTaskUpdatesNote() {
  let $ = w(4),
    h = useAppState(aWo),
    x = useCommandQueue(),
    L;
  if ($[0] !== x) ((L = count(x, processQueuedCommands_2)), ($[0] = x), ($[1] = L));
  else L = $[1];
  let ee = L;
  if (h || ee === 0) {
    return null;
  }
  const ke = ee === 1 ? "Background task update" : `${ee} background task updates`;
  let Re;
  if ($[2] !== ke)
    ((Re = r(Text, {
      dimColor: !0,
      wrap: "truncate",
      children: [ke, " ", "waiting while this panel is open"],
    })),
      ($[2] = ke),
      ($[3] = Re));
  else Re = $[3];
  return Re;
}

export { PendingTaskUpdatesNote, iee };
