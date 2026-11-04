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
import {
  getValidAdvisorAliases,
  isAdvisorToolEnabled,
  isValidAdvisorModel,
  baseModelSupportsAdvisor,
  setAdvisorModelCommand,
  canUseAsAdvisor,
  isAdvisorPendingConsent,
  getAdvisorCreditsRequiredMessage,
} from "../utils/advisor.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";
import { init_react_production, useEffect, useEffectEvent } from "../../vendor/react/cjs/react.production.js";
import { renderModelLabel } from "./model/model.js";
import { logEvent } from "../services/analytics/index.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import { useMainLoopModel } from "../hooks/useMainLoopModel.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

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
  load: () => import("./advisor/call.lazy.js"),
};
//@ chunk-tx2s9zpa.js:14076-14080 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tx2s9zpa.js:14076", () => {
  init_react_production();
});
//@ chunk-tx2s9zpa.js:14080-14119 sole-consumer = getExperimentAdvisorModels (1)
function getExperimentAdvisorModels(model) {
  return model.advisorModel;
}
//@ chunk-tx2s9zpa.js:14119-14162 sole-consumer
function advisorModelOption(model) {
  return {
    label: renderModelLabel(model),
    value: model,
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
  let $ = useMemoCache(38);
  let { onDone, storageV5, conversation } = props;
  let appState = useAppState(getExperimentAdvisorModels);
  let mainLoopModel = useMainLoopModel();
  let setAppState = useSetAppState();
  let content;
  let statusLine;
  let optionList;
  if ($[0] !== appState) {
    let validAdvisorAliases = getValidAdvisorAliases();
    let lower = appState?.toLowerCase();
    statusLine = lower ? validAdvisorAliases.find((value) => lower.includes(value)) : undefined;
    content =
      appState && !statusLine && isValidAdvisorModel(appState)
        ? {
            label: stripAnsi(renderModelLabel(appState)),
            value: appState,
          }
        : undefined;
    const mapped = validAdvisorAliases.map(advisorModelOption);
    let models;
    if ($[4] !== content) {
      models = content ? [content] : [];
      $[4] = content;
      $[5] = models;
    } else models = $[5];
    let selected;
    if ($[6] === MEMO_CACHE_SENTINEL) {
      selected = {
        label: "No advisor",
        value: "off",
      };
      $[6] = selected;
    } else selected = $[6];
    optionList = [...mapped, ...models, selected];
    $[0] = appState;
    $[1] = content;
    $[2] = statusLine;
    $[3] = optionList;
  } else {
    content = $[1];
    statusLine = $[2];
    optionList = $[3];
  }
  let options = optionList;
  let initial;
  if ($[7] !== appState || $[8] !== content?.value || $[9] !== statusLine) {
    initial = appState && isValidAdvisorModel(appState) ? (content?.value ?? statusLine ?? "off") : "off";
    $[7] = appState;
    $[8] = content?.value;
    $[9] = statusLine;
    $[10] = initial;
  } else initial = $[10];
  let selection = initial;
  let footer;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    footer = [];
    $[11] = footer;
  } else footer = $[11];
  useEffect(logAdvisorDialogShown, footer);
  let onCancel;
  if ($[12] !== onDone) {
    onCancel = () =>
      onDone(undefined, {
        display: "skip",
      });
    $[12] = onDone;
    $[13] = onCancel;
  } else onCancel = $[13];
  let rows;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    rows = jsxProd_default(Text, {
      children:
        "When Claude needs stronger judgment \u2014 a complex decision, an ambiguous failure, a problem it's circling without progress \u2014 it escalates to the advisor model for guidance, then resumes. The advisor runs server-side and uses additional tokens.",
    });
    $[14] = rows;
  } else rows = $[14];
  let box;
  if ($[15] !== mainLoopModel) {
    box =
      !baseModelSupportsAdvisor(mainLoopModel) &&
      jsxProd_default_2(Text, {
        color: "warning",
        children: [
          "The current main model (",
          stripAnsi(renderModelLabel(mainLoopModel)),
          ") does not support the advisor.",
        ],
      });
    $[15] = mainLoopModel;
    $[16] = box;
  } else box = $[16];
  let onChange;
  if (
    $[17] !== mainLoopModel ||
    $[18] !== conversation ||
    $[19] !== onDone ||
    $[20] !== setAppState ||
    $[21] !== storageV5
  ) {
    onChange = (choice) =>
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
    $[17] = mainLoopModel;
    $[18] = conversation;
    $[19] = onDone;
    $[20] = setAppState;
    $[21] = storageV5;
    $[22] = onChange;
  } else onChange = $[22];
  let onCancel_2;
  if ($[23] !== onDone) {
    onCancel_2 = () =>
      onDone(undefined, {
        display: "skip",
      });
    $[23] = onDone;
    $[24] = onCancel_2;
  } else onCancel_2 = $[24];
  let validated;
  if ($[25] !== selection || $[26] !== options || $[27] !== onChange || $[28] !== onCancel_2) {
    validated = jsxProd_default(ModelSelector, {
      options,
      defaultValue: selection,
      defaultFocusValue: selection,
      onChange,
      onCancel: onCancel_2,
    });
    $[25] = selection;
    $[26] = options;
    $[27] = onChange;
    $[28] = onCancel_2;
    $[29] = validated;
  } else validated = $[29];
  let left;
  let right;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    left = jsxProd_default_2(Text, {
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
    right = jsxProd_default(LearnMoreLink, {
      url: ADVISOR_BLOG_URL,
    });
    $[30] = left;
    $[31] = right;
  } else {
    left = $[30];
    right = $[31];
  }
  let children;
  if ($[32] !== box || $[33] !== validated) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [rows, box, validated, left, right],
    });
    $[32] = box;
    $[33] = validated;
    $[34] = children;
  } else children = $[34];
  let saved;
  if ($[35] !== children || $[36] !== onCancel) {
    saved = jsxProd_default(Dialog, {
      title: "Advisor (experimental)",
      onCancel,
      children,
    });
    $[35] = children;
    $[36] = onCancel;
    $[37] = saved;
  } else saved = $[37];
  return saved;
}
//@ chunk-tx2s9zpa.js:16453-16878 layout
/**
 * 挂载后异步应用所选的 advisor 模型并回调结果，不渲染内容。
 */
function AdvisorChoiceApplier(props) {
  let $ = useMemoCache(10);
  let { choice, onDone, storageV5, conversation } = props;
  let setAppState = useSetAppState();
  let mainLoopModel = useMainLoopModel();
  let state;
  if (
    $[0] !== mainLoopModel ||
    $[1] !== choice ||
    $[2] !== conversation ||
    $[3] !== onDone ||
    $[4] !== setAppState ||
    $[5] !== storageV5
  ) {
    state = () => {
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
    $[0] = mainLoopModel;
    $[1] = choice;
    $[2] = conversation;
    $[3] = onDone;
    $[4] = setAppState;
    $[5] = storageV5;
    $[6] = state;
  } else state = $[6];
  let unusedPicker = useEffectEvent(state);
  let choiceState;
  if ($[7] !== unusedPicker) {
    choiceState = () => {
      let timer = setTimeout(unusedPicker, 0);
      return () => clearTimeout(timer);
    };
    $[7] = unusedPicker;
    $[8] = choiceState;
  } else choiceState = $[8];
  let selected;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    selected = [];
    $[9] = selected;
  } else selected = $[9];
  useEffect(choiceState, selected);
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
  let validated = await validateModel(baseModel, {
    credentials: context.credentials,
  });
  if (!validated.valid) {
    onDone(`Invalid advisor model: ${validated.error}`);
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
export { advisorCommand, advisorNonInteractiveCommand, call };
