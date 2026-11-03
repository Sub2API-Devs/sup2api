/**
 * commands/advisor.ts
 *
 * /advisor 命令对象（让 Claude 在关键节点咨询更强模型）及其交互/无头实现入口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/advisor.ts
 * pieces: chunk-e6aww6q8.js (1), chunk-tx2s9zpa.js (8)
 * attribution: fingerprint 2, sole-consumer 4, placement 2, layout 1
 */
import { j, P, Oo } from "../../vendor/react/cjs/react.production.js";
import { renderModelLabel } from "./model/model.js";
import { logEvent } from "../services/analytics/index.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import { useMainLoopModel } from "../hooks/useMainLoopModel.js";
import {
  getValidAdvisorAliases,
  isValidAdvisorModel,
  baseModelSupportsAdvisor,
  setAdvisorModelCommand,
  canUseAsAdvisor,
  isAdvisorPendingConsent,
  getAdvisorCreditsRequiredMessage,
  isAdvisorToolEnabled,
} from "../utils/advisor.js";
import { Yn } from "../utils/stripAnsi.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { ModelSelector } from "../components/agents/ModelSelector.js";
import { LearnMoreLink } from "../components/LearnMoreLink.js";
import { Dialog } from "../components/design-system/Dialog.js";
import { yN } from "../utils/promptSubmissionOrigin.js";
import { parseUserSpecifiedModel } from "../utils/model/modelDisplay.js";
import { validateModel } from "../utils/model/validateModel.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";

//@ chunk-tx2s9zpa.js:14076-14080 sole-consumer
j();
//@ chunk-tx2s9zpa.js:14080-14119 sole-consumer = getExperimentAdvisorModels (1)
function getExperimentAdvisorModels(he) {
  return he.advisorModel;
}
//@ chunk-tx2s9zpa.js:14119-14162 sole-consumer
function pe(Y) {
  return { label: renderModelLabel(Y), value: Y };
}
//@ chunk-tx2s9zpa.js:14162-14211 sole-consumer
function fe() {
  logEvent("tengu_advisor_dialog_shown", {});
}
//@ chunk-tx2s9zpa.js:14211-14264 placement
var ADVISOR_BLOG_URL = "https://claude.com/blog/the-advisor-strategy";
/**
 * AdvisorPicker：旧版名 ThinkbackMenu 配错：内容是 advisor 模型选择。
 */
//@ chunk-tx2s9zpa.js:14264-16453 placement = ThinkbackMenu (0.215)
function AdvisorPicker(t0) {
  let i = w(38),
    { onDone: onDone, storageV5: storageV5, conversation: conversation } = t0,
    t = useAppState(getExperimentAdvisorModels),
    l = useMainLoopModel(),
    v = useSetAppState(),
    c,
    p,
    V;
  if (i[0] !== t) {
    let T = getValidAdvisorAliases();
    let C = t?.toLowerCase();
    p = C ? T.find((value) => C.includes(value)) : void 0;
    c = t && !p && isValidAdvisorModel(t) ? { label: Yn(renderModelLabel(t)), value: t } : void 0;
    const mapped = T.map(pe);
    let h;
    if (i[4] !== c) ((h = c ? [c] : []), (i[4] = c), (i[5] = h));
    else h = i[5];
    let g;
    if (i[6] === MEMO_CACHE_SENTINEL) ((g = { label: "No advisor", value: "off" }), (i[6] = g));
    else g = i[6];
    V = [...mapped, ...h, g];
    ((i[0] = t), (i[1] = c), (i[2] = p), (i[3] = V));
  } else ((c = i[1]), (p = i[2]), (V = i[3]));
  let X = V,
    y;
  if (i[7] !== t || i[8] !== c?.value || i[9] !== p)
    ((y = t && isValidAdvisorModel(t) ? (c?.value ?? p ?? "off") : "off"),
      (i[7] = t),
      (i[8] = c?.value),
      (i[9] = p),
      (i[10] = y));
  else y = i[10];
  let O = y,
    h;
  if (i[11] === MEMO_CACHE_SENTINEL) ((h = []), (i[11] = h));
  else h = i[11];
  P(fe, h);
  let g;
  if (i[12] !== onDone) ((g = () => onDone(void 0, { display: "skip" })), (i[12] = onDone), (i[13] = g));
  else g = i[13];
  let z;
  if (i[14] === MEMO_CACHE_SENTINEL)
    ((z = e(Text, {
      children:
        "When Claude needs stronger judgment \u2014 a complex decision, an ambiguous failure, a problem it's circling without progress \u2014 it escalates to the advisor model for guidance, then resumes. The advisor runs server-side and uses additional tokens.",
    })),
      (i[14] = z));
  else z = i[14];
  let D;
  if (i[15] !== l)
    ((D =
      !baseModelSupportsAdvisor(l) &&
      r(Text, {
        color: "warning",
        children: ["The current main model (", Yn(renderModelLabel(l)), ") does not support the advisor."],
      })),
      (i[15] = l),
      (i[16] = D));
  else D = i[16];
  let M;
  if (i[17] !== l || i[18] !== conversation || i[19] !== onDone || i[20] !== v || i[21] !== storageV5)
    ((M = (ve) => onDone(setAdvisorModelCommand(ve, l, v, storageV5, void 0, void 0, conversation()))),
      (i[17] = l),
      (i[18] = conversation),
      (i[19] = onDone),
      (i[20] = v),
      (i[21] = storageV5),
      (i[22] = M));
  else M = i[22];
  let b;
  if (i[23] !== onDone) ((b = () => onDone(void 0, { display: "skip" })), (i[23] = onDone), (i[24] = b));
  else b = i[24];
  let k;
  if (i[25] !== O || i[26] !== X || i[27] !== M || i[28] !== b)
    ((k = e(ModelSelector, { options: X, defaultValue: O, defaultFocusValue: O, onChange: M, onCancel: b })),
      (i[25] = O),
      (i[26] = X),
      (i[27] = M),
      (i[28] = b),
      (i[29] = k));
  else k = i[29];
  let H, K;
  if (i[30] === MEMO_CACHE_SENTINEL)
    ((H = r(Text, {
      children: [
        e(Text, { color: "suggestion", children: "Recommended setup: " }),
        e(Text, {
          children:
            "Sonnet as the main model with Opus as the advisor. For certain workloads this gives near-Opus performance with reduced token usage.",
        }),
      ],
    })),
      (K = e(LearnMoreLink, { url: ADVISOR_BLOG_URL })),
      (i[30] = H),
      (i[31] = K));
  else ((H = i[30]), (K = i[31]));
  let L;
  if (i[32] !== D || i[33] !== k)
    ((L = r(Box, { flexDirection: "column", gap: 1, children: [z, D, k, H, K] })),
      (i[32] = D),
      (i[33] = k),
      (i[34] = L));
  else L = i[34];
  let Q;
  if (i[35] !== L || i[36] !== g)
    ((Q = e(Dialog, { title: "Advisor (experimental)", onCancel: g, children: L })),
      (i[35] = L),
      (i[36] = g),
      (i[37] = Q));
  else Q = i[37];
  return Q;
}
/**
 * 挂载后异步应用所选的 advisor 模型并回调结果，不渲染内容。
 */
//@ chunk-tx2s9zpa.js:16453-16878 layout
function AdvisorChoiceApplier(u) {
  let i = w(10),
    { choice: choice, onDone: onDone, storageV5: storageV5, conversation: conversation } = u,
    l = useSetAppState(),
    v = useMainLoopModel(),
    c;
  if (
    i[0] !== v ||
    i[1] !== choice ||
    i[2] !== conversation ||
    i[3] !== onDone ||
    i[4] !== l ||
    i[5] !== storageV5
  )
    ((c = () => {
      onDone(setAdvisorModelCommand(choice, v, l, storageV5, void 0, void 0, conversation()));
    }),
      (i[0] = v),
      (i[1] = choice),
      (i[2] = conversation),
      (i[3] = onDone),
      (i[4] = l),
      (i[5] = storageV5),
      (i[6] = c));
  else c = i[6];
  let p = Oo(c),
    V;
  if (i[7] !== p)
    ((V = () => {
      let T = setTimeout(p, 0);
      return () => clearTimeout(T);
    }),
      (i[7] = p),
      (i[8] = V));
  else V = i[8];
  let C;
  if (i[9] === MEMO_CACHE_SENTINEL) ((C = []), (i[9] = C));
  else C = i[9];
  return (P(V, C), null);
}
/**
 * /advisor 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-tx2s9zpa.js:16878-17428 fingerprint = call (0.417)
var call = async (onDone, context, args) => {
  let arg = args.trim().toLowerCase();
  if (!arg)
    return e(AdvisorPicker, {
      onDone: onDone,
      storageV5: context.storageV5,
      conversation: () => yN(context),
    });
  if (arg === "off" || arg === "unset")
    return e(AdvisorChoiceApplier, {
      choice: "off",
      onDone: onDone,
      storageV5: context.storageV5,
      conversation: () => yN(context),
    });
  let baseModel = parseUserSpecifiedModel(arg),
    l = await validateModel(baseModel, { credentials: context.credentials });
  if (!l.valid) return (onDone(`Invalid advisor model: ${l.error}`), null);
  if (!canUseAsAdvisor(baseModel))
    return (
      onDone(
        isAdvisorPendingConsent(baseModel)
          ? getAdvisorCreditsRequiredMessage(baseModel)
          : `${arg} cannot be used as an advisor. Valid options: ${[...getValidAdvisorAliases(), "off"].join(", ")}`,
      ),
      null
    );
  return e(AdvisorChoiceApplier, {
    choice: arg,
    onDone: onDone,
    storageV5: context.storageV5,
    conversation: () => yN(context),
  });
};
/**
 * /advisor 命令对象（local-jsx）；描述：Let Claude consult a stronger model at key moments；isEnabled: ()=>MA()；isHidden: {return!MA()}；实现 chunk-tx2s9zpa.js 的 Ne。
 */
//@ chunk-e6aww6q8.js:2035084-2035684 fingerprint = advisor (0.505)
var advisorCommand = {
    type: "local-jsx",
    name: "advisor",
    description: "Let Claude consult a stronger model at key moments",
    requires: { ink: !0 },
    thinClientDispatch: "control-request",
    immediate: (args, presentation) => args.trim() !== "" || presentation === "fullscreen",
    get argumentHint() {
      return `[${[...getValidAdvisorAliases(), "off"].join("|")}]`;
    },
    isEnabled: () => isAdvisorToolEnabled(),
    get isHidden() {
      return !isAdvisorToolEnabled();
    },
  },
  advisorNonInteractiveCommand = {
    type: "local",
    name: "advisor",
    supportsNonInteractive: !0,
    description: "Let Claude consult a stronger model at key moments",
    get argumentHint() {
      return `[${[...getValidAdvisorAliases(), "off"].join("|")}]`;
    },
    isEnabled: () => getIsNonInteractiveSession() && isAdvisorToolEnabled(),
    get isHidden() {
      return !getIsNonInteractiveSession() || !isAdvisorToolEnabled();
    },
    load: () => import("./chunk-vhac946c.js"),
  };

export { advisorCommand, advisorNonInteractiveCommand };
