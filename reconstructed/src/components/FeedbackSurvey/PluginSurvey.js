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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { Cet, fFo } from "../../utils/pluginActivity.js";

//@ chunk-18hwfzwa.js:1008312-1008526 placement
var MAX_LISTED_FEATURES = 3,
  TRIGGER_DESCRIPTIONS = {
    skill: "You've used its skills recently",
    command: "You've used its commands recently",
    subagent: "You've used its agents recently",
    mcp: "You've used its MCP tools recently",
    hook: "Its hooks ran recently",
  };
//@ chunk-18hwfzwa.js:1008526-1009155 placement
function PluginSurveyQuestion(h) {
  let $ = w(12),
    { subject: subject } = h;
  if (!subject) {
    let L;
    if ($[0] === MEMO_CACHE_SENTINEL)
      ((L = e(Text, { bold: !0, children: "How helpful has this plugin been? (optional)" })), ($[0] = L));
    else L = $[0];
    return L;
  }
  let L;
  if ($[1] !== subject.name) ((L = Cet(subject.name, 0)), ($[1] = subject.name), ($[2] = L));
  else L = $[2];
  const ee = `How helpful has the ${L} plugin been? (optional)`;
  let ke;
  if ($[3] !== ee) ((ke = e(Text, { bold: !0, children: ee })), ($[3] = ee), ($[4] = ke));
  else ke = $[4];
  let Re;
  if ($[5] !== subject) ((Re = describePluginUsage(subject)), ($[5] = subject), ($[6] = Re));
  else Re = $[6];
  let Be;
  if ($[7] !== Re) ((Be = e(Text, { dimColor: !0, children: Re })), ($[7] = Re), ($[8] = Be));
  else Be = $[8];
  let He;
  if ($[9] !== ke || $[10] !== Be)
    ((He = r(Text, {
      children: [
        ke,
        `
`,
        Be,
      ],
    })),
      ($[9] = ke),
      ($[10] = Be),
      ($[11] = He));
  else He = $[11];
  return He;
}
//@ chunk-18hwfzwa.js:1009155-1009399 placement
function describePluginUsage(h) {
  let features = h.features;
  if (features.length === 0) return TRIGGER_DESCRIPTIONS[h.trigger];
  let mapped = features
      .slice(-MAX_LISTED_FEATURES)
      .reverse()
      .map((ke) => `the ${ke}`),
    L = features.length - mapped.length,
    ee = features.length >= fFo ? ", and more" : L > 0 ? `, +${L} more` : "";
  return `Used this session: ${mapped.join(", ")}${ee}`;
}
/**
 * 判断调查状态是否处于活动中（非 closed/open/被动卡片态）；同一声明的 eot 为各调查的优先顺序与被动卡片状态。
 */
//@ chunk-18hwfzwa.js:1009399-1009744 placement
var isActiveSurveyState = (h, x) => h !== "closed" && h !== "open" && h !== x,
  SURVEY_PRIORITY = [
    { survey: "postCompact", passiveCard: "open" },
    { survey: "longContext", passiveCard: "open" },
    { survey: "plugin", passiveCard: "open" },
    { survey: "memory", passiveCard: "open" },
    { survey: "feedback", passiveCard: "open" },
    { survey: "orgSurvey", passiveCard: "open" },
    { survey: "frustration", passiveCard: "transcript_prompt" },
  ];
/**
 * 按优先顺序选出当前该显示的调查：先找活动中的，再找未关闭的，没有返回 null。
 */
//@ chunk-18hwfzwa.js:1009744-1009885 placement
function pickActiveSurvey(h) {
  for (let { survey: survey, passiveCard: passiveCard } of SURVEY_PRIORITY)
    if (isActiveSurveyState(h[survey], passiveCard)) return survey;
  for (let { survey: survey } of SURVEY_PRIORITY) if (h[survey] !== "closed") return survey;
  return null;
}

export { pickActiveSurvey, PluginSurveyQuestion };
