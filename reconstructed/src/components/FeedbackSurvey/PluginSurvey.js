/**
 * components/FeedbackSurvey/PluginSurvey.tsx
 *
 * 2.1.316 新增。插件发起的调查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: placement 5
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { formatActivityLabel, MAX_RECENT_ACTIVITY } from "../../utils/pluginActivity.js";

//@ chunk-18hwfzwa.js:1008312-1008526 placement
var MAX_LISTED_FEATURES = 3;
var TRIGGER_DESCRIPTIONS = {
  skill: "You've used its skills recently",
  command: "You've used its commands recently",
  subagent: "You've used its agents recently",
  mcp: "You've used its MCP tools recently",
  hook: "Its hooks ran recently",
};
//@ chunk-18hwfzwa.js:1008526-1009155 placement
function PluginSurveyQuestion(props) {
  let $ = w(12);
  let { subject } = props;
  if (!subject) {
    let L;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      L = jsxProd_default(Text, {
        bold: true,
        children: "How helpful has this plugin been? (optional)",
      });
      $[0] = L;
    } else L = $[0];
    return L;
  }
  let L;
  if ($[1] !== subject.name) {
    L = formatActivityLabel(subject.name, 0);
    $[1] = subject.name;
    $[2] = L;
  } else L = $[2];
  const children = `How helpful has the ${L} plugin been? (optional)`;
  let ke;
  if ($[3] !== children) {
    ke = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[3] = children;
    $[4] = ke;
  } else ke = $[4];
  let children_2;
  if ($[5] !== subject) {
    children_2 = describePluginUsage(subject);
    $[5] = subject;
    $[6] = children_2;
  } else children_2 = $[6];
  let Be;
  if ($[7] !== children_2) {
    Be = jsxProd_default(Text, {
      dimColor: true,
      children: children_2,
    });
    $[7] = children_2;
    $[8] = Be;
  } else Be = $[8];
  let He;
  if ($[9] !== ke || $[10] !== Be) {
    He = jsxProd_default_2(Text, {
      children: [
        ke,
        `
`,
        Be,
      ],
    });
    $[9] = ke;
    $[10] = Be;
    $[11] = He;
  } else He = $[11];
  return He;
}
//@ chunk-18hwfzwa.js:1009155-1009399 placement
function describePluginUsage(subject) {
  let features = subject.features;
  if (features.length === 0) return TRIGGER_DESCRIPTIONS[subject.trigger];
  let mapped = features
    .slice(-MAX_LISTED_FEATURES)
    .reverse()
    .map((feature) => `the ${feature}`);
  let L = features.length - mapped.length;
  let ee = features.length >= MAX_RECENT_ACTIVITY ? ", and more" : L > 0 ? `, +${L} more` : "";
  return `Used this session: ${mapped.join(", ")}${ee}`;
}
//@ chunk-18hwfzwa.js:1009399-1009744 placement
/**
 * 判断调查状态是否处于活动中（非 closed/open/被动卡片态）；同一声明的 eot 为各调查的优先顺序与被动卡片状态。
 */
var isActiveSurveyState = (h, passiveCard) => h !== "closed" && h !== "open" && h !== passiveCard;
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
//@ chunk-18hwfzwa.js:1009744-1009885 placement
/**
 * 按优先顺序选出当前该显示的调查：先找活动中的，再找未关闭的，没有返回 null。
 */
function pickActiveSurvey(h) {
  for (let { survey, passiveCard } of SURVEY_PRIORITY)
    if (isActiveSurveyState(h[survey], passiveCard)) return survey;
  for (let { survey } of SURVEY_PRIORITY) if (h[survey] !== "closed") return survey;
  return null;
}
export { pickActiveSurvey, PluginSurveyQuestion };
