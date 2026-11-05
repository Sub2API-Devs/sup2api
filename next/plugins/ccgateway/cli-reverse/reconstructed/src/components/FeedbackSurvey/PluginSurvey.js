/**
 * components/FeedbackSurvey/PluginSurvey.tsx
 *
 * 2.1.316 新增。插件发起的调查。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { formatActivityLabel, MAX_RECENT_ACTIVITY } from "../../utils/pluginActivity.js";

//@ chunk-czq1j3j2.js:1042349-1042563 placement
var MAX_LISTED_FEATURES = 3;
var TRIGGER_DESCRIPTIONS = {
  skill: "You've used its skills recently",
  command: "You've used its commands recently",
  subagent: "You've used its agents recently",
  mcp: "You've used its MCP tools recently",
  hook: "Its hooks ran recently",
};
//@ chunk-czq1j3j2.js:1042563-1043192 placement
function PluginSurveyQuestion(props) {
  let $ = useMemoCache(12);
  let { subject } = props;
  if (!subject) {
    let optionalQuestionText;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      optionalQuestionText = jsxProd_default(Text, {
        bold: true,
        children: "How helpful has this plugin been? (optional)",
      });
      $[0] = optionalQuestionText;
    } else optionalQuestionText = $[0];
    return optionalQuestionText;
  }
  let pluginLabel;
  if ($[1] !== subject.name) {
    pluginLabel = formatActivityLabel(subject.name, 0);
    $[1] = subject.name;
    $[2] = pluginLabel;
  } else pluginLabel = $[2];
  const children = `How helpful has the ${pluginLabel} plugin been? (optional)`;
  let questionText;
  if ($[3] !== children) {
    questionText = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[3] = children;
    $[4] = questionText;
  } else questionText = $[4];
  let children_2;
  if ($[5] !== subject) {
    children_2 = describePluginUsage(subject);
    $[5] = subject;
    $[6] = children_2;
  } else children_2 = $[6];
  let usageText;
  if ($[7] !== children_2) {
    usageText = jsxProd_default(Text, {
      dimColor: true,
      children: children_2,
    });
    $[7] = children_2;
    $[8] = usageText;
  } else usageText = $[8];
  let questionElement;
  if ($[9] !== questionText || $[10] !== usageText) {
    questionElement = jsxProd_default_2(Text, {
      children: [
        questionText,
        `
`,
        usageText,
      ],
    });
    $[9] = questionText;
    $[10] = usageText;
    $[11] = questionElement;
  } else questionElement = $[11];
  return questionElement;
}
//@ chunk-czq1j3j2.js:1043192-1043436 placement
function describePluginUsage(subject) {
  let features = subject.features;
  if (features.length === 0) return TRIGGER_DESCRIPTIONS[subject.trigger];
  let mapped = features
    .slice(-MAX_LISTED_FEATURES)
    .reverse()
    .map((feature) => `the ${feature}`);
  let hiddenCount = features.length - mapped.length;
  let suffix =
    features.length >= MAX_RECENT_ACTIVITY ? ", and more" : hiddenCount > 0 ? `, +${hiddenCount} more` : "";
  return `Used this session: ${mapped.join(", ")}${suffix}`;
}
//@ chunk-czq1j3j2.js:1043436-1043781 placement
/**
 * 判断调查状态是否处于活动中（非 closed/open/被动卡片态）；同一声明的 eot 为各调查的优先顺序与被动卡片状态。
 */
var isActiveSurveyState = (state, passiveCard) =>
  state !== "closed" && state !== "open" && state !== passiveCard;
var SURVEY_PRIORITY = [
  {
    survey: "postCompact",
    passiveCard: "open",
  },
  {
    survey: "longContext",
    passiveCard: "open",
  },
  {
    survey: "plugin",
    passiveCard: "open",
  },
  {
    survey: "memory",
    passiveCard: "open",
  },
  {
    survey: "feedback",
    passiveCard: "open",
  },
  {
    survey: "orgSurvey",
    passiveCard: "open",
  },
  {
    survey: "frustration",
    passiveCard: "transcript_prompt",
  },
];
//@ chunk-czq1j3j2.js:1043781-1043922 placement
/**
 * 按优先顺序选出当前该显示的调查：先找活动中的，再找未关闭的，没有返回 null。
 */
function pickActiveSurvey(states) {
  for (let { survey, passiveCard } of SURVEY_PRIORITY)
    if (isActiveSurveyState(states[survey], passiveCard)) return survey;
  for (let { survey } of SURVEY_PRIORITY) if (states[survey] !== "closed") return survey;
  return null;
}
export { pickActiveSurvey, PluginSurveyQuestion };
