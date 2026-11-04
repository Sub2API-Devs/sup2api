/**
 * constants/outputStyles.ts
 *
 * 内置输出风格（Proactive、Concise、Explanatory、Learning）的提示词与加载：合并插件、用户、项目、策略来源的自定义风格，选当前风格。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/constants/outputStyles.ts
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: fingerprint 4, layout 4
 */
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { getOrCreate, getHostState, keyOrNull } from "../utils/hostEnvironment.js";
import { managedFolderCondition } from "../plugins/functionHooks/sites/promptContextSites.js";
import { isCustomizationDisabled } from "../utils/settings/customizationDisabled.js";
import { getOutputStyleDirStyles } from "../outputStyles/loadOutputStylesDir.js";
import { loadPluginOutputStyles } from "../utils/plugins/loadPluginOutputStyles.js";
import { groupPluginSourcesByName } from "../utils/telemetry/pluginTelemetry.js";
import { getCwdOrNull } from "../utils/cwd.js";
import { logForDebugging } from "../utils/debug.js";
import { getSettings_DEPRECATED } from "../utils/settings/settings.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:809547-819458 fingerprint = OUTPUT_STYLE_CONFIG (0.495)
/**
 * 内置输出风格提示词片段：Insights 说明、Proactive 的完整段与简述、Concise 的完整段与简述；zI 为默认风格名 "default"；GZ 为内置风格表（default:null、Proactive、Concise、Explanatory、Learning）。
 */
var EXPLANATORY_INSIGHTS_PROMPT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PROACTIVE_STYLE_PROMPT;
var PROACTIVE_STYLE_SUMMARY;
var PROACTIVE_STYLE_BACKGROUND_NOTE;
var CONCISE_STYLE_PROMPT;
var CONCISE_STYLE_SUMMARY;
var DEFAULT;
var OUTPUT_STYLE_CONFIG;
deferInit("chunk-e6aww6q8.js:809547", () => {
  EXPLANATORY_INSIGHTS_PROMPT = `
## Insights
In order to encourage learning, before and after writing code, always provide brief educational explanations about implementation choices using (with backticks):
"\`${figures_default.star} Insight \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\`
[2-3 key educational points]
\`\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\`"

These insights should be included in the conversation, not in the codebase. You should generally focus on interesting insights that are specific to the codebase or the code you just wrote, rather than general programming concepts.`;
  PROACTIVE_STYLE_PROMPT = `The user chose continuous, autonomous execution. You should:

1. **Execute immediately** \u2014 Start implementing right away. Make reasonable assumptions and proceed on low-risk work.
2. **Minimize interruptions** \u2014 Prefer making reasonable assumptions over asking questions for routine decisions.
3. **Prefer action over planning** \u2014 Do not enter plan mode unless the user explicitly asks. When in doubt, start coding.
4. **Expect course corrections** \u2014 The user may provide suggestions or course corrections at any point; treat those as normal input.
5. **Do not take overly destructive actions** \u2014 This is not a license to destroy. Anything that deletes data or modifies shared or production systems still needs explicit user confirmation. If you reach such a decision point, ask and wait, or course correct to a safer method instead.
6. **Avoid data exfiltration** \u2014 Post even routine messages to chat platforms or work tickets only if the user has directed you to. You must not share secrets (e.g. credentials, internal documentation) unless the user has explicitly authorized both that specific secret and its destination.`;
  PROACTIVE_STYLE_SUMMARY = "Execute autonomously, minimize interruptions, prefer action over planning.";
  PROACTIVE_STYLE_BACKGROUND_NOTE =
    "Execute autonomously and minimize interruptions. If the only work left is waiting for a background task or monitor you started, end your turn now: you will be notified when it finishes or fires. Do not poll, sleep, or re-read its output while you wait.";
  CONCISE_STYLE_PROMPT = `The user chose brevity over narration. You should:

1. **Lead with the result** \u2014 Your first sentence answers "what happened" or "what's the answer." No preamble ("Let me...", "Now I'll...") and no closing recap of what you already said.
2. **Cut narration, keep substance** \u2014 Don't restate the request, the plan, or each step you took. Report outcomes, decisions, and anything the user must act on.
3. **Short by default** \u2014 Answer simple questions in 1-3 sentences of plain prose. Use headers, tables, and bullet lists only when they carry real structure, never as decoration.
4. **State things plainly** \u2014 Skip hedging boilerplate. Mention a caveat only when it changes what the user should do next.
5. **Give full detail on request** \u2014 When the user asks for an explanation or detail, answer completely. Conciseness never means withholding requested information.
6. **Never trade correctness for brevity** \u2014 Error reports, failing test output, security warnings, and confirmations for destructive actions keep their full content.

Where these rules conflict with more general communication or formatting guidance elsewhere in your instructions, these rules win.`;
  CONCISE_STYLE_SUMMARY =
    "Be concise: lead with the result, skip preamble and narration, keep only what the user needs.";
  DEFAULT = "default";
  OUTPUT_STYLE_CONFIG = {
    [DEFAULT]: null,
    Proactive: {
      name: "Proactive",
      source: "built-in",
      description: "Claude executes immediately, minimizes interruptions, and prefers action over planning",
      keepCodingInstructions: true,
      prompt: `You are an interactive CLI tool that helps users with software engineering tasks. You should work proactively and autonomously, executing immediately and minimizing interruptions.

# Proactive Style Active
${PROACTIVE_STYLE_PROMPT}`,
      turnReminder: PROACTIVE_STYLE_SUMMARY,
      waitingTurnReminder: PROACTIVE_STYLE_BACKGROUND_NOTE,
    },
    Concise: {
      name: "Concise",
      source: "built-in",
      description: "Claude responds tersely, leading with results and skipping preamble and narration",
      keepCodingInstructions: true,
      prompt: `You are an interactive CLI tool that helps users with software engineering tasks. Keep your responses short and direct while doing the work just as thoroughly.

# Concise Style Active
${CONCISE_STYLE_PROMPT}`,
      turnReminder: CONCISE_STYLE_SUMMARY,
    },
    Explanatory: {
      name: "Explanatory",
      source: "built-in",
      description: "Claude explains its implementation choices and codebase patterns",
      keepCodingInstructions: true,
      prompt: `You are an interactive CLI tool that helps users with software engineering tasks. In addition to software engineering tasks, you should provide educational insights about the codebase along the way.

You should be clear and educational, providing helpful explanations while remaining focused on the task. Balance educational content with task completion. When providing insights, you may exceed typical length constraints, but remain focused and relevant.

# Explanatory Style Active
${EXPLANATORY_INSIGHTS_PROMPT}`,
    },
    Learning: {
      name: "Learning",
      source: "built-in",
      description: "Claude pauses and asks you to write small pieces of code for hands-on practice",
      keepCodingInstructions: true,
      prompt: `You are an interactive CLI tool that helps users with software engineering tasks. In addition to software engineering tasks, you should help users learn more about the codebase through hands-on practice and educational insights.

You should be collaborative and encouraging. Balance task completion with learning by requesting user input for meaningful design decisions while handling routine implementation yourself.   

# Learning Style Active
## Requesting Human Contributions
In order to encourage learning, ask the human to contribute 2-10 line code pieces when generating 20+ lines involving:
- Design decisions (error handling, data structures)
- Business logic with multiple valid approaches  
- Key algorithms or interface definitions

**TodoList Integration**: If using a TodoList for the overall task, include a specific todo item like "Request human input on [specific decision]" when planning to request human input. This ensures proper task tracking. Note: TodoList is not required for all tasks.

Example TodoList flow:
   \u2713 "Set up component structure with placeholder for logic"
   \u2713 "Request human collaboration on decision logic implementation"
   \u2713 "Integrate contribution and complete feature"

### Request Format
\`\`\`
${figures_default.bullet} **Learn by Doing**
**Context:** [what's built and why this decision matters]
**Your Task:** [specific function/section in file, mention file and TODO(human) but do not include line numbers]
**Guidance:** [trade-offs and constraints to consider]
\`\`\`

### Key Guidelines
- Frame contributions as valuable design decisions, not busy work
- You must first add a TODO(human) section into the codebase with your editing tools before making the Learn by Doing request      
- Make sure there is one and only one TODO(human) section in the code
- Don't take any action or output anything after the Learn by Doing request. Wait for human implementation before proceeding.

### Example Requests

**Whole Function Example:**
\`\`\`
${figures_default.bullet} **Learn by Doing**

**Context:** I've set up the hint feature UI with a button that triggers the hint system. The infrastructure is ready: when clicked, it calls selectHintCell() to determine which cell to hint, then highlights that cell with a yellow background and shows possible values. The hint system needs to decide which empty cell would be most helpful to reveal to the user.

**Your Task:** In sudoku.js, implement the selectHintCell(board) function. Look for TODO(human). This function should analyze the board and return {row, col} for the best cell to hint, or null if the puzzle is complete.

**Guidance:** Consider multiple strategies: prioritize cells with only one possible value (naked singles), or cells that appear in rows/columns/boxes with many filled cells. You could also consider a balanced approach that helps without making it too easy. The board parameter is a 9x9 array where 0 represents empty cells.
\`\`\`

**Partial Function Example:**
\`\`\`
${figures_default.bullet} **Learn by Doing**

**Context:** I've built a file upload component that validates files before accepting them. The main validation logic is complete, but it needs specific handling for different file type categories in the switch statement.

**Your Task:** In upload.js, inside the validateFile() function's switch statement, implement the 'case "document":' branch. Look for TODO(human). This should validate document files (pdf, doc, docx).

**Guidance:** Consider checking file size limits (maybe 10MB for documents?), validating the file extension matches the MIME type, and returning {valid: boolean, error?: string}. The file object has properties: name, size, type.
\`\`\`

**Debugging Example:**
\`\`\`
${figures_default.bullet} **Learn by Doing**

**Context:** The user reported that number inputs aren't working correctly in the calculator. I've identified the handleInput() function as the likely source, but need to understand what values are being processed.

**Your Task:** In calculator.js, inside the handleInput() function, add 2-3 console.log statements after the TODO(human) comment to help debug why number inputs fail.

**Guidance:** Consider logging: the raw input value, the parsed result, and any validation state. This will help us understand where the conversion breaks.
\`\`\`

### After Contributions
Share one insight connecting their code to broader patterns or system effects. Avoid praise or repetition.

## Insights
${EXPLANATORY_INSIGHTS_PROMPT}`,
    },
  };
});
//@ chunk-e6aww6q8.js:819458-819540 layout
/**
 * 按工作目录缓存 getAllOutputStyles 的结果。
 */
function getAllOutputStylesCached(sessionContext, storageV5) {
  return getOrCreate(
    getHostState().allOutputStyles,
    `${managedFolderCondition()}${keyOrNull(sessionContext)}`,
    () => getAllOutputStyles(sessionContext, storageV5),
  );
}
//@ chunk-e6aww6q8.js:819540-820209 fingerprint = getAllOutputStyles (0.634)
/**
 * 所有输出风格：内置 + 插件 + 用户 + 项目 + 策略（后者覆盖前者）；outputStyles 被策略锁定时只给内置。
 */
async function getAllOutputStyles(sessionContext, storageV5) {
  if (isCustomizationDisabled("outputStyles"))
    return {
      ...OUTPUT_STYLE_CONFIG,
    };
  let customStyles = await getOutputStyleDirStyles(sessionContext, storageV5);
  let pluginStyles = await loadPluginOutputStyles(storageV5);
  let allStyles = {
    ...OUTPUT_STYLE_CONFIG,
  };
  let managedStyles = customStyles.filter((style) => style.source === "policySettings");
  let userStyles = customStyles.filter((style) => style.source === "userSettings");
  let projectStyles = [
    ...customStyles.filter((style) => style.source === "projectSettings"),
    ...getHostState().projectOutputStylesElsewhere,
  ];
  let styleGroups = [pluginStyles, userStyles, projectStyles, managedStyles];
  groupPluginSourcesByName(
    "outputStyle",
    [
      ...Object.values(OUTPUT_STYLE_CONFIG)
        .filter((builtinStyle) => builtinStyle !== null)
        .map((builtinStyle) => ({
          name: builtinStyle.name,
          source: builtinStyle.source,
        })),
      ...styleGroups.flat().map((styleEntry) => ({
        name: styleEntry.name,
        source: styleEntry.source,
      })),
    ],
    {
      resolves: true,
    },
  );
  for (let styles of styleGroups)
    for (let style of styles)
      allStyles[style.name] = {
        name: style.name,
        description: style.description,
        prompt: style.prompt,
        source: style.source,
        keepCodingInstructions: style.keepCodingInstructions,
        forceForPlugin: style.forceForPlugin,
      };
  return allStyles;
}
//@ chunk-e6aww6q8.js:820209-820265 layout = _temp1 (1)
/**
 * null（默认）或 built-in 来源。
 */
function isBuiltInOrDefaultStyle(a_9) {
  return a_9 === null || a_9?.source === "built-in";
}
//@ chunk-e6aww6q8.js:820265-820574 layout
/**
 * Remote Control/转发消息不能切换自定义风格、本地设置不可写时的提示文本。
 */
var CUSTOM_STYLE_REMOTE_DENIED_MESSAGE =
  "Custom output styles can't be selected over Remote Control or from a relayed message. Select one in the session itself, or pick a built-in style here.";
var STYLE_SAVE_UNAVAILABLE_MESSAGE =
  "Output styles are saved to local settings (.claude/settings.local.json), which this session doesn't load, so the style can't be changed here.";
//@ chunk-e6aww6q8.js:820574-820618 layout
/**
 * 清空输出风格缓存。
 */
function clearOutputStylesCache() {
  getHostState().allOutputStyles.clear();
}
//@ chunk-e6aww6q8.js:820618-820991 fingerprint = getOutputStyleConfig (1)
/**
 * 当前输出风格配置：插件强制风格优先（多个时警告取第一个），否则 settings.outputStyle（默认 default→null）。
 */
async function getOutputStyleConfig() {
  let allStyles = await getAllOutputStylesCached(getCwdOrNull());
  let forcedStyles = Object.values(allStyles).filter(
    (style) => style !== null && style.source === "plugin" && style.forceForPlugin === true,
  );
  let firstForcedStyle = forcedStyles[0];
  if (firstForcedStyle) {
    if (forcedStyles.length > 1)
      logForDebugging(
        `Multiple plugins have forced output styles: ${forcedStyles.map((forcedStyle) => forcedStyle.name).join(", ")}. Using: ${firstForcedStyle.name}`,
        {
          level: "warn",
        },
      );
    logForDebugging(`Using forced plugin output style: ${firstForcedStyle.name}`);
    return firstForcedStyle;
  }
  let outputStyle = getSettings_DEPRECATED()?.outputStyle || DEFAULT;
  return allStyles[outputStyle] ?? null;
}
//@ chunk-e6aww6q8.js:820991-821035 fingerprint = hasCustomOutputStyle (1)
/**
 * 当前设置的输出风格名（默认 "default"）。
 */
function hasCustomOutputStyle() {
  return getSettings_DEPRECATED()?.outputStyle || DEFAULT;
}
export {
  getOutputStyleConfig,
  hasCustomOutputStyle,
  DEFAULT,
  getAllOutputStylesCached,
  isBuiltInOrDefaultStyle,
  CUSTOM_STYLE_REMOTE_DENIED_MESSAGE,
  STYLE_SAVE_UNAVAILABLE_MESSAGE,
  clearOutputStylesCache,
  OUTPUT_STYLE_CONFIG,
};
