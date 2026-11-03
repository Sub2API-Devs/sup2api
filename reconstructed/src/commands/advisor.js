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
import { init_react_production, P, Oo } from "../../vendor/react/cjs/react.production.js";
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
import { stripAnsi } from "../utils/stripAnsi.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { ModelSelector } from "../components/agents/ModelSelector.js";
import { LearnMoreLink } from "../components/LearnMoreLink.js";
import { Dialog } from "../components/design-system/Dialog.js";
import { submittedMessages } from "../utils/promptSubmissionOrigin.js";
import { parseUserSpecifiedModel } from "../utils/model/modelDisplay.js";
import { validateModel } from "../utils/model/validateModel.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";

//@ chunk-tx2s9zpa.js:14076-14080 sole-consumer
init_react_production();
//@ chunk-tx2s9zpa.js:14080-14119 sole-consumer = getExperimentAdvisorModels (1)
function getExperimentAdvisorModels(he) {
  return he.advisorModel;
}
//@ chunk-tx2s9zpa.js:14119-14162 sole-consumer
function advisorModelOption(Y) {
  return {
    label: renderModelLabel(Y),
    value: Y,
  };
}
//@ chunk-tx2s9zpa.js:14162-14211 sole-consumer
function logAdvisorDialogShown() {
  logEvent("tengu_advisor_dialog_shown", {});
}
//@ chunk-tx2s9zpa.js:14211-14264 placement
var ADVISOR_BLOG_URL = "https://claude.com/blog/the-advisor-strategy";
//@ chunk-tx2s9zpa.js:14264-16453 placement = ThinkbackMenu (0.215)
/**
 * AdvisorPicker：旧版名 ThinkbackMenu 配错：内容是 advisor 模型选择。
 */
function AdvisorPicker(props) {
  let i = w(38);
  let { onDone, storageV5, conversation } = props;
  let appState = useAppState(getExperimentAdvisorModels);
  let mainLoopModel = useMainLoopModel();
  let setAppState = useSetAppState();
  let c;
  let p;
  let V;
  if (i[0] !== appState) {
    let validAdvisorAliases = getValidAdvisorAliases();
    let lower = appState?.toLowerCase();
    p = lower ? validAdvisorAliases.find((value) => lower.includes(value)) : undefined;
    c =
      appState && !p && isValidAdvisorModel(appState)
        ? {
            label: stripAnsi(renderModelLabel(appState)),
            value: appState,
          }
        : undefined;
    const mapped = validAdvisorAliases.map(advisorModelOption);
    let h;
    if (i[4] !== c) {
      h = c ? [c] : [];
      i[4] = c;
      i[5] = h;
    } else h = i[5];
    let g;
    if (i[6] === MEMO_CACHE_SENTINEL) {
      g = {
        label: "No advisor",
        value: "off",
      };
      i[6] = g;
    } else g = i[6];
    V = [...mapped, ...h, g];
    i[0] = appState;
    i[1] = c;
    i[2] = p;
    i[3] = V;
  } else {
    c = i[1];
    p = i[2];
    V = i[3];
  }
  let options = V;
  let y;
  if (i[7] !== appState || i[8] !== c?.value || i[9] !== p) {
    y = appState && isValidAdvisorModel(appState) ? (c?.value ?? p ?? "off") : "off";
    i[7] = appState;
    i[8] = c?.value;
    i[9] = p;
    i[10] = y;
  } else y = i[10];
  let O = y;
  let h;
  if (i[11] === MEMO_CACHE_SENTINEL) {
    h = [];
    i[11] = h;
  } else h = i[11];
  P(logAdvisorDialogShown, h);
  let onCancel;
  if (i[12] !== onDone) {
    onCancel = () =>
      onDone(undefined, {
        display: "skip",
      });
    i[12] = onDone;
    i[13] = onCancel;
  } else onCancel = i[13];
  let z;
  if (i[14] === MEMO_CACHE_SENTINEL) {
    z = jsxProd_default(Text, {
      children:
        "When Claude needs stronger judgment \u2014 a complex decision, an ambiguous failure, a problem it's circling without progress \u2014 it escalates to the advisor model for guidance, then resumes. The advisor runs server-side and uses additional tokens.",
    });
    i[14] = z;
  } else z = i[14];
  let D;
  if (i[15] !== mainLoopModel) {
    D =
      !baseModelSupportsAdvisor(mainLoopModel) &&
      jsxProd_default_2(Text, {
        color: "warning",
        children: [
          "The current main model (",
          stripAnsi(renderModelLabel(mainLoopModel)),
          ") does not support the advisor.",
        ],
      });
    i[15] = mainLoopModel;
    i[16] = D;
  } else D = i[16];
  let onChange;
  if (
    i[17] !== mainLoopModel ||
    i[18] !== conversation ||
    i[19] !== onDone ||
    i[20] !== setAppState ||
    i[21] !== storageV5
  ) {
    onChange = (ve) =>
      onDone(
        setAdvisorModelCommand(
          ve,
          mainLoopModel,
          setAppState,
          storageV5,
          undefined,
          undefined,
          conversation(),
        ),
      );
    i[17] = mainLoopModel;
    i[18] = conversation;
    i[19] = onDone;
    i[20] = setAppState;
    i[21] = storageV5;
    i[22] = onChange;
  } else onChange = i[22];
  let onCancel_2;
  if (i[23] !== onDone) {
    onCancel_2 = () =>
      onDone(undefined, {
        display: "skip",
      });
    i[23] = onDone;
    i[24] = onCancel_2;
  } else onCancel_2 = i[24];
  let k;
  if (i[25] !== O || i[26] !== options || i[27] !== onChange || i[28] !== onCancel_2) {
    k = jsxProd_default(ModelSelector, {
      options,
      defaultValue: O,
      defaultFocusValue: O,
      onChange,
      onCancel: onCancel_2,
    });
    i[25] = O;
    i[26] = options;
    i[27] = onChange;
    i[28] = onCancel_2;
    i[29] = k;
  } else k = i[29];
  let H;
  let K;
  if (i[30] === MEMO_CACHE_SENTINEL) {
    H = jsxProd_default_2(Text, {
      children: [
        jsxProd_default(Text, {
          color: "suggestion",
          children: "Recommended setup: ",
        }),
        jsxProd_default(Text, {
          children:
            "Sonnet as the main model with Opus as the advisor. For certain workloads this gives near-Opus performance with reduced token usage.",
        }),
      ],
    });
    K = jsxProd_default(LearnMoreLink, {
      url: ADVISOR_BLOG_URL,
    });
    i[30] = H;
    i[31] = K;
  } else {
    H = i[30];
    K = i[31];
  }
  let children;
  if (i[32] !== D || i[33] !== k) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [z, D, k, H, K],
    });
    i[32] = D;
    i[33] = k;
    i[34] = children;
  } else children = i[34];
  let Q;
  if (i[35] !== children || i[36] !== onCancel) {
    Q = jsxProd_default(Dialog, {
      title: "Advisor (experimental)",
      onCancel,
      children,
    });
    i[35] = children;
    i[36] = onCancel;
    i[37] = Q;
  } else Q = i[37];
  return Q;
}
//@ chunk-tx2s9zpa.js:16453-16878 layout
/**
 * 挂载后异步应用所选的 advisor 模型并回调结果，不渲染内容。
 */
function AdvisorChoiceApplier(props) {
  let i = w(10);
  let { choice, onDone, storageV5, conversation } = props;
  let setAppState = useSetAppState();
  let mainLoopModel = useMainLoopModel();
  let c;
  if (
    i[0] !== mainLoopModel ||
    i[1] !== choice ||
    i[2] !== conversation ||
    i[3] !== onDone ||
    i[4] !== setAppState ||
    i[5] !== storageV5
  ) {
    c = () => {
      onDone(
        setAdvisorModelCommand(
          choice,
          mainLoopModel,
          setAppState,
          storageV5,
          undefined,
          undefined,
          conversation(),
        ),
      );
    };
    i[0] = mainLoopModel;
    i[1] = choice;
    i[2] = conversation;
    i[3] = onDone;
    i[4] = setAppState;
    i[5] = storageV5;
    i[6] = c;
  } else c = i[6];
  let p = Oo(c);
  let V;
  if (i[7] !== p) {
    V = () => {
      let timer = setTimeout(p, 0);
      return () => clearTimeout(timer);
    };
    i[7] = p;
    i[8] = V;
  } else V = i[8];
  let C;
  if (i[9] === MEMO_CACHE_SENTINEL) {
    C = [];
    i[9] = C;
  } else C = i[9];
  P(V, C);
  return null;
}
//@ chunk-tx2s9zpa.js:16878-17428 fingerprint = call (0.417)
/**
 * /advisor 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async (onDone, context, args) => {
  let arg = args.trim().toLowerCase();
  if (!arg)
    return jsxProd_default(AdvisorPicker, {
      onDone,
      storageV5: context.storageV5,
      conversation: () => submittedMessages(context),
    });
  if (arg === "off" || arg === "unset")
    return jsxProd_default(AdvisorChoiceApplier, {
      choice: "off",
      onDone,
      storageV5: context.storageV5,
      conversation: () => submittedMessages(context),
    });
  let baseModel = parseUserSpecifiedModel(arg);
  let l = await validateModel(baseModel, {
    credentials: context.credentials,
  });
  if (!l.valid) {
    onDone(`Invalid advisor model: ${l.error}`);
    return null;
  }
  if (!canUseAsAdvisor(baseModel)) {
    onDone(
      isAdvisorPendingConsent(baseModel)
        ? getAdvisorCreditsRequiredMessage(baseModel)
        : `${arg} cannot be used as an advisor. Valid options: ${[...getValidAdvisorAliases(), "off"].join(", ")}`,
    );
    return null;
  }
  return jsxProd_default(AdvisorChoiceApplier, {
    choice: arg,
    onDone,
    storageV5: context.storageV5,
    conversation: () => submittedMessages(context),
  });
};
//@ chunk-e6aww6q8.js:2035084-2035684 fingerprint = advisor (0.505)
/**
 * /advisor 命令对象（local-jsx）；描述：Let Claude consult a stronger model at key moments；isEnabled: ()=>MA()；isHidden: {return!MA()}；实现 chunk-tx2s9zpa.js 的 Ne。
 */
var advisorCommand = {
  type: "local-jsx",
  name: "advisor",
  description: "Let Claude consult a stronger model at key moments",
  requires: {
    ink: true,
  },
  thinClientDispatch: "control-request",
  immediate: (args, presentation) => args.trim() !== "" || presentation === "fullscreen",
  get argumentHint() {
    return `[${[...getValidAdvisorAliases(), "off"].join("|")}]`;
  },
  isEnabled: () => isAdvisorToolEnabled(),
  get isHidden() {
    return !isAdvisorToolEnabled();
  },
};
var advisorNonInteractiveCommand = {
  type: "local",
  name: "advisor",
  supportsNonInteractive: true,
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
