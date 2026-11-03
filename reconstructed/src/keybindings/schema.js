/**
 * keybindings/schema.ts
 *
 * 已有模块；g2 补充放置一个声明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/schema.ts
 * pieces: chunk-6qssfmzs.js (12)
 * attribution: placement 5, fingerprint 3, layout 4
 */
import { NON_REBINDABLE } from "./reservedShortcuts.js";
import { normalizeKeyForComparison } from "./parser.js";
import { DEFAULT_BINDINGS } from "./defaultBindings.js";
import { xr } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, U, pe, o, Ue, zg, A } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-6qssfmzs.js:9545-9551 placement
var l;
/**
 * 判断动作是否绑定在不可重新绑定的按键上。
 */
//@ chunk-6qssfmzs.js:9551-9738 placement
function isNonRebindableAction(e) {
  if (!l) {
    let r = new Set(NON_REBINDABLE.map((i) => normalizeKeyForComparison(i.key))),
      s = new Set();
    for (let i of DEFAULT_BINDINGS)
      for (let [a, t] of Object.entries(i.bindings))
        if (t !== null && r.has(normalizeKeyForComparison(a))) s.add(t);
    l = s;
  }
  return l.has(e);
}
/**
 * 已弃用的快捷键动作名及其对应的新动作名。
 */
//@ chunk-6qssfmzs.js:9738-10113 placement
var DEPRECATED_ACTIONS = [
    "messageSelector:up",
    "messageSelector:down",
    "messageSelector:top",
    "messageSelector:bottom",
    "messageSelector:select",
    "diff:viewDetails",
  ],
  DEPRECATED_ACTION_REPLACEMENTS = {
    "messageSelector:up": "select:previous",
    "messageSelector:down": "select:next",
    "messageSelector:top": "select:first",
    "messageSelector:bottom": "select:last",
    "messageSelector:select": "select:accept",
    "diff:viewDetails": "select:accept",
  };
//@ chunk-6qssfmzs.js:10113-10155 placement
function Sos(e) {
  return DEPRECATED_ACTIONS.some((r) => r === e);
}
/**
 * 把用户快捷键配置中的弃用动作名迁移为新动作名。
 */
//@ chunk-6qssfmzs.js:10155-10265 placement
function migrateDeprecatedActions(e) {
  return e.map((r) => ({
    context: r.context,
    bindings: xr(r.bindings, (s) => (s !== null && Sos(s) ? DEPRECATED_ACTION_REPLACEMENTS[s] : s)),
  }));
}
/**
 * 29 个快捷键上下文：Global、Chat、Autocomplete、Confirmation、Help、ProactivityMenu、Transcript、HistorySearch、Task、ThemePicker、Settings、Tabs、Attachments、Footer、AbovePrompt、AbovePromptInput、AbovePromptSelect、Pane、PaneField、MessageSelector、DiffDialog、DiffPanel、FeedbackSurvey、ModelPicker、EffortSlider、Select、Plugin、Scroll、Agents。
 */
//@ chunk-6qssfmzs.js:10265-10649 fingerprint = KEYBINDING_CONTEXTS (0.752)
var KEYBINDING_CONTEXTS = [
    "Global",
    "Chat",
    "Autocomplete",
    "Confirmation",
    "Help",
    "ProactivityMenu",
    "Transcript",
    "HistorySearch",
    "Task",
    "ThemePicker",
    "Settings",
    "Tabs",
    "Attachments",
    "Footer",
    "AbovePrompt",
    "AbovePromptInput",
    "AbovePromptSelect",
    "Pane",
    "PaneField",
    "MessageSelector",
    "DiffDialog",
    "DiffPanel",
    "FeedbackSurvey",
    "ModelPicker",
    "EffortSlider",
    "Select",
    "Plugin",
    "Scroll",
    "Agents",
  ],
  KEYBINDING_CONTEXT_SET = new Set(KEYBINDING_CONTEXTS);
//@ chunk-6qssfmzs.js:10649-10681 layout
function isKeybindingContext(e) {
  return KEYBINDING_CONTEXT_SET.has(e);
}
/**
 * 各上下文的说明文字（给 schema 和文档用）与全部合法动作名列表。
 */
//@ chunk-6qssfmzs.js:10681-15653 fingerprint = KEYBINDING_ACTIONS (0.473)
var KEYBINDING_CONTEXT_DESCRIPTIONS = {
    Global: "Active everywhere, regardless of focus",
    Chat: "When the chat input is focused",
    Autocomplete: "When autocomplete menu is visible",
    Confirmation: "When a confirmation/permission dialog is shown",
    Help: "When the help overlay is open",
    ProactivityMenu: "When the proactivity dialog is open",
    Transcript: "When viewing the transcript",
    HistorySearch: "When searching command history (ctrl+r)",
    Task: "When a task/agent is running in the foreground",
    ThemePicker: "When the theme picker is open",
    Settings: "When the settings menu is open",
    Tabs: "When tab navigation is active",
    Attachments: "When navigating image attachments in a select dialog",
    Footer: "When footer indicators are focused",
    AbovePrompt: "When a plugin's panel above the prompt, or a button in it, has keyboard focus",
    AbovePromptInput: "When a plugin's input field above the prompt has keyboard focus",
    AbovePromptSelect: "When a plugin's select above the prompt has keyboard focus",
    Pane: "When a plugin's pane has keyboard focus",
    PaneField: "When an input field or select in a plugin's pane has keyboard focus",
    MessageSelector: "When the message selector (rewind) is open",
    DiffDialog: "When the diff dialog is open",
    DiffPanel: "When the diff sidebar panel is open",
    FeedbackSurvey: "When the session feedback survey has been typed over",
    ModelPicker: "When the model picker is open",
    EffortSlider: "When the effort slider is open",
    Select: "When a select/list component is focused",
    Plugin: "When the plugin dialog is open",
    Scroll: "When a scrollable view is focused (fullscreen layout)",
    Agents: "When the agents view (`claude agents`) is open",
  },
  KEYBINDING_ACTIONS = [
    "app:interrupt",
    "app:exit",
    "app:toggleTodos",
    "app:toggleTranscript",
    "app:toggleBrief",
    "app:toggleReplTab",
    "app:toggleDiffNoiseFilter",
    "app:diffFileListUp",
    "app:diffFileListDown",
    "app:toggleDiffPreSession",
    "app:cycleDiffBase",
    "app:toggleTerminal",
    "app:redraw",
    "app:openArtifact",
    "strip:jump1",
    "strip:jump2",
    "strip:jump3",
    "strip:jump4",
    "strip:jump5",
    "strip:jump6",
    "strip:jump7",
    "strip:jump8",
    "strip:jump9",
    "strip:next",
    "strip:previous",
    "strip:tabNext",
    "strip:tabPrevious",
    "strip:viewAll",
    "strip:toggle",
    "strip:new",
    "history:search",
    "history:previous",
    "history:next",
    "chat:cancel",
    "chat:killAgents",
    "chat:cycleMode",
    "chat:cycleProactivity",
    "chat:attentionUp",
    "chat:attentionDown",
    "chat:modelPicker",
    "chat:increaseEffort",
    "chat:decreaseEffort",
    "chat:fastMode",
    "chat:defaultToNewerModel",
    "chat:thinkingToggle",
    "chat:workflowKeywordToggle",
    "chat:submit",
    "chat:queueSubmit",
    "chat:sendNow",
    "chat:newline",
    "chat:undo",
    "chat:externalEditor",
    "chat:stash",
    "chat:imagePaste",
    "chat:clearInput",
    "chat:clearScreen",
    "autocomplete:accept",
    "autocomplete:dismiss",
    "autocomplete:previous",
    "autocomplete:next",
    "confirm:yes",
    "confirm:no",
    "confirm:previous",
    "confirm:next",
    "confirm:nextField",
    "confirm:previousField",
    "confirm:cycleMode",
    "confirm:toggle",
    "tabs:next",
    "tabs:previous",
    "transcript:toggleShowAll",
    "transcript:exit",
    "historySearch:next",
    "historySearch:accept",
    "historySearch:cancel",
    "historySearch:execute",
    "historySearch:cycleScope",
    "task:background",
    "theme:toggleSyntaxHighlighting",
    "theme:editCustom",
    "help:dismiss",
    "proactivityMenu:previousMode",
    "proactivityMenu:nextMode",
    "attachments:next",
    "attachments:previous",
    "attachments:remove",
    "attachments:exit",
    "footer:up",
    "footer:down",
    "footer:next",
    "footer:previous",
    "footer:openSelected",
    "footer:clearSelection",
    "footer:close",
    "footer:dismiss",
    "abovePrompt:toggle",
    "abovePrompt:focus",
    "abovePrompt:next",
    "abovePrompt:previous",
    "abovePrompt:press",
    "abovePrompt:leave",
    "abovePrompt:highlightNext",
    "abovePrompt:highlightPrevious",
    "pane:scrollUp",
    "pane:scrollDown",
    "pane:pageUp",
    "pane:pageDown",
    "pane:top",
    "pane:bottom",
    "pane:grow",
    "pane:shrink",
    "pane:close",
    "pane:next",
    "pane:previous",
    "diff:dismiss",
    "diff:previousSource",
    "diff:nextSource",
    "diff:back",
    "diff:previousFile",
    "diff:nextFile",
    "feedbackSurvey:bad",
    "feedbackSurvey:fine",
    "feedbackSurvey:good",
    "modelPicker:decreaseEffort",
    "modelPicker:increaseEffort",
    "modelPicker:thisSessionOnly",
    "effortSlider:decreaseEffort",
    "effortSlider:increaseEffort",
    "effortSlider:toggleUltracode",
    "effortSlider:thisSessionOnly",
    "effortSlider:adaptive",
    "select:next",
    "select:previous",
    "select:pageUp",
    "select:pageDown",
    "select:first",
    "select:last",
    "select:accept",
    "select:cancel",
    "plugin:toggle",
    "plugin:install",
    "plugin:favorite",
    "plugin:cycleMarketplace",
    "permission:toggleDebug",
    "settings:search",
    "settings:retry",
    "settings:periodDay",
    "settings:periodWeek",
    "settings:fixUsage",
    "settings:sortByTokens",
    "voice:pushToTalk",
    "scroll:pageUp",
    "scroll:pageDown",
    "scroll:lineUp",
    "scroll:lineDown",
    "scroll:top",
    "scroll:bottom",
    "scroll:halfPageUp",
    "scroll:halfPageDown",
    "scroll:fullPageUp",
    "scroll:fullPageDown",
    "selection:copy",
    "selection:clear",
    "selection:extendLeft",
    "selection:extendRight",
    "selection:extendUp",
    "selection:extendDown",
    "selection:extendLineStart",
    "selection:extendLineEnd",
    "agents:switchView",
    "agents:togglePin",
    "agents:find",
    "agents:nextGroup",
    "agents:previousGroup",
    "agents:rename",
    "agents:setGroup",
  ];
//@ chunk-6qssfmzs.js:15653-15695 layout
var TEMPLATE_EXCLUDED_CONTEXTS = ["FeedbackSurvey"],
  KEYBINDING_ACTION_SET = new Set(KEYBINDING_ACTIONS);
//@ chunk-6qssfmzs.js:15695-15727 layout
function isKeybindingAction(e) {
  return KEYBINDING_ACTION_SET.has(e);
}
/**
 * 合法动作名或 command:* 。
 */
//@ chunk-6qssfmzs.js:15727-15785 layout
function isValidBindingAction(e) {
  return KEYBINDING_ACTION_SET.has(e) || e.startsWith("command:");
}
/**
 * keybindings.json 的 zod schema（用于生成 JSON Schema）：块 = {context: 上下文枚举, bindings: 按键串 → 动作枚举 | command:名字 | null}；文件 = {$schema?, $docs?, bindings: 块数组}。
 */
//@ chunk-6qssfmzs.js:15785-16682 fingerprint = KeybindingBlockSchema (0.694)
var KeybindingBlockSchema = DoctorLazy(() =>
    u({
      context: U(KEYBINDING_CONTEXTS).describe(
        "UI context where these bindings apply. Global bindings work everywhere.",
      ),
      bindings: pe(
        o().describe('Keystroke pattern (e.g., "ctrl+k", "shift+tab")'),
        Ue([
          U([...KEYBINDING_ACTIONS, ...DEPRECATED_ACTIONS]),
          o()
            .regex(/^command:[a-zA-Z0-9:\-_]+$/)
            .describe(
              'Command binding (e.g., "command:help", "command:compact"). Executes the slash command as if typed.',
            ),
          zg().describe("Set to null to unbind a default shortcut"),
        ]).describe("Action to trigger, command to invoke, or null to unbind"),
      ).describe("Map of keystroke patterns to actions"),
    }).describe("A block of keybindings for a specific context"),
  ),
  KeybindingsSchema = DoctorLazy(() =>
    u({
      $schema: o().optional().describe("JSON Schema URL for editor validation"),
      $docs: o().optional().describe("Documentation URL"),
      bindings: A(KeybindingBlockSchema()).describe("Array of keybinding blocks by context"),
    }).describe("Claude Code keybindings configuration. Customize keyboard shortcuts by context."),
  );

export {
  TEMPLATE_EXCLUDED_CONTEXTS,
  isKeybindingAction,
  isNonRebindableAction,
  KEYBINDING_CONTEXTS,
  KEYBINDING_CONTEXT_DESCRIPTIONS,
  KEYBINDING_ACTIONS,
  migrateDeprecatedActions,
  isValidBindingAction,
  Sos,
  isKeybindingContext,
};
