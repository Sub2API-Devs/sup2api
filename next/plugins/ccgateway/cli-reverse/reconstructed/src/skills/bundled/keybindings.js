/**
 * skills/bundled/keybindings.ts
 *
 * keybindings-help 内置 skill：生成快捷键上下文/动作/保留键表与 keybindings.json 示例。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/keybindings.ts
 * pieces: chunk-ne2890fx.js (9), chunk-z0x4zh5m.js (1)
 * attribution: fingerprint 8, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  KEYBINDING_CONTEXTS,
  KEYBINDING_CONTEXT_DESCRIPTIONS,
  KEYBINDING_ACTIONS,
  TEMPLATE_EXCLUDED_CONTEXTS,
} from "../../keybindings/schema.js";
import { DEFAULT_BINDINGS } from "../../keybindings/defaultBindings.js";
import { isEffortHintFlagOn } from "../../utils/effort.js";
import { NON_REBINDABLE, TERMINAL_RESERVED, MACOS_RESERVED } from "../../keybindings/reservedShortcuts.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { registerBundledSkill } from "../bundledSkills.js";
import {
  isKeybindingCustomizationEnabled,
  keybindingsState,
  loadKeybindingsSyncWithWarnings,
} from "../../keybindings/loadUserBindings.js";
import { getActionDisplayText } from "../../keybindings/match.js";
import { cycleModeBindingName } from "../../keybindings/cycleModeBinding.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ne2890fx.js:174076-174172 fingerprint (2.1.88 match: generateContextsTable, 1)
function generateContextsTable() {
  return markdownTable(
    ["Context", "Description"],
    KEYBINDING_CONTEXTS.filter(isDocumentedContext).map((ctx) => [
      `\`${ctx}\``,
      KEYBINDING_CONTEXT_DESCRIPTIONS[ctx],
    ]),
  );
}
//@ chunk-ne2890fx.js:174172-174501 fingerprint (2.1.88 match: generateActionsTable, 1)
function generateActionsTable() {
  let actionInfo = {};
  for (let block of DEFAULT_BINDINGS)
    for (let [key, action] of Object.entries(block.bindings))
      if (action) {
        if (!actionInfo[action])
          actionInfo[action] = {
            keys: [],
            context: block.context,
          };
        actionInfo[action].keys.push(key);
      }
  return markdownTable(
    ["Action", "Default Key(s)", "Context"],
    KEYBINDING_ACTIONS.filter(isDocumentedAction).map((action) => {
      let info = actionInfo[action];
      let keys = info ? info.keys.map((k) => `\`${k}\``).join(", ") : "(none)";
      let context = info ? info.context : inferContextFromAction(action);
      return [`\`${action}\``, keys, context];
    }),
  );
}
//@ chunk-ne2890fx.js:174501-174991 layout
function isDocumentedAction(action) {
  if (action === "chat:cycleProactivity" || action.startsWith("proactivityMenu:")) return false;
  if (action === "chat:attentionUp" || action === "chat:attentionDown") return false;
  if (action === "chat:increaseEffort" || action === "chat:decreaseEffort") return isEffortHintFlagOn();
  if (action === "strip:tabNext" || action === "strip:tabPrevious" || action === "strip:viewAll")
    return false;
  if (action.startsWith("strip:")) return false;
  if (action === "plugin:cycleMarketplace") return true;
  if (action === "agents:setGroup") return false;
  if (action.startsWith("feedbackSurvey:") || action === "effortSlider:adaptive") return false;
  return true;
}
//@ chunk-ne2890fx.js:174991-175063 layout
function isDocumentedContext(contextName) {
  if (contextName === "ProactivityMenu") return false;
  return !TEMPLATE_EXCLUDED_CONTEXTS.includes(contextName);
}
//@ chunk-ne2890fx.js:175063-175560 fingerprint (2.1.88 match: inferContextFromAction, 0.92)
function inferContextFromAction(action) {
  let prefix = action.split(":")[0];
  return (
    {
      app: "Global",
      history: "Global or Chat",
      chat: "Chat",
      autocomplete: "Autocomplete",
      confirm: "Confirmation",
      tabs: "Tabs",
      transcript: "Transcript",
      historySearch: "HistorySearch",
      task: "Task",
      theme: "ThemePicker",
      help: "Help",
      attachments: "Attachments",
      footer: "Footer",
      abovePrompt: "Chat, AbovePrompt, AbovePromptInput, AbovePromptSelect or Pane",
      pane: "Pane",
      diff: "DiffDialog",
      modelPicker: "ModelPicker",
      select: "Select",
      permission: "Confirmation",
      ...{},
    }[prefix ?? ""] ?? "Unknown"
  );
}
//@ chunk-ne2890fx.js:175560-175990 fingerprint (2.1.88 match: generateReservedShortcuts, 1)
function generateReservedShortcuts() {
  let lines = [];
  lines.push("### Non-rebindable (errors)");
  for (let entry of NON_REBINDABLE) lines.push(`- \`${entry.key}\` \u2014 ${entry.reason}`);
  lines.push("");
  lines.push("### Terminal reserved (errors/warnings)");
  for (let entry of TERMINAL_RESERVED)
    lines.push(
      `- \`${entry.key}\` \u2014 ${entry.reason} (${entry.severity === "error" ? "will not work" : "may conflict"})`,
    );
  lines.push("");
  lines.push("### macOS reserved (errors)");
  for (let entry of MACOS_RESERVED) lines.push(`- \`${entry.key}\` \u2014 ${entry.reason}`);
  return lines.join(`
`);
}
//@ chunk-ne2890fx.js:175990-181009 fingerprint (2.1.88 match: SECTION_DOCTOR, 0.46)
/**
 * keybindings-help 提示词所用的示例 keybindings.json、解绑/改绑/组合键示例与各段说明文本。
 */
var EXAMPLE_KEYBINDINGS_FILE; // deferred: uses jsonStringify (../../utils/slowOperations.js) of its import cycle while loading; runs once the cycle is complete
var EXAMPLE_UNBIND;
var EXAMPLE_REBIND;
var EXAMPLE_CHORD;
var joined;
var joined_2;
var joined_3;
var joined_4;
var joined_5;
var joined_6;
var joined_7;
var joined_8;
deferInit("chunk-ne2890fx.js:175990", () => {
  EXAMPLE_KEYBINDINGS_FILE = {
    $schema: "https://www.schemastore.org/claude-code-keybindings.json",
    $docs: "https://code.claude.com/docs/en/keybindings",
    bindings: [
      {
        context: "Chat",
        bindings: {
          "ctrl+e": "chat:externalEditor",
        },
      },
    ],
  };
  EXAMPLE_UNBIND = {
    context: "Chat",
    bindings: {
      "ctrl+s": null,
    },
  };
  EXAMPLE_REBIND = {
    context: "Chat",
    bindings: {
      "ctrl+g": null,
      "ctrl+e": "chat:externalEditor",
    },
  };
  EXAMPLE_CHORD = {
    context: "Global",
    bindings: {
      "ctrl+k ctrl+t": "app:toggleTodos",
    },
  };
  joined = [
    "# Keybindings Skill",
    "",
    "Create or modify `~/.claude/keybindings.json` to customize keyboard shortcuts.",
    "",
    "## CRITICAL: Read Before Write",
    "",
    "**Always read `~/.claude/keybindings.json` first** (it may not exist yet). Merge changes with existing bindings \u2014 never replace the entire file.",
    "",
    "- Use **Edit** tool for modifications to existing files",
    "- Use **Write** tool only if the file does not exist yet",
  ].join(`
`);
  joined_2 = [
    "## File Format",
    "",
    "```json",
    jsonStringify(EXAMPLE_KEYBINDINGS_FILE, null, 2),
    "```",
    "",
    "Always include the `$schema` and `$docs` fields.",
  ].join(`
`);
  joined_3 = [
    "## Keystroke Syntax",
    "",
    "**Modifiers** (combine with `+`):",
    "- `ctrl` (alias: `control`)",
    "- `alt` (aliases: `opt`, `option`) \u2014 note: `alt` and `meta` are identical in terminals",
    "- `shift`",
    "- `meta` \u2014 same key as `alt` in terminals (Option key on macOS)",
    "- `cmd` (aliases: `command`, `super`, `win`) \u2014 Command key on macOS, Windows key on Windows, Super key on Linux; not the same as `meta`. Most terminals never send it (only ones that report the Super modifier, such as through the Kitty keyboard protocol or xterm `modifyOtherKeys`), so prefer `ctrl` for bindings that should work everywhere",
    "",
    "**Special keys**: `escape`/`esc`, `enter`/`return`, `tab`, `space`, `backspace`, `delete`, `up`, `down`, `left`, `right`",
    "",
    "**Chords**: Space-separated keystrokes, e.g. `ctrl+k ctrl+s` (3-second timeout between keystrokes)",
    "",
    "**Examples**: `ctrl+shift+p`, `alt+enter`, `ctrl+k ctrl+n`",
  ].join(`
`);
  joined_4 = [
    "## Unbinding Default Shortcuts",
    "",
    "Set a key to `null` to remove its default binding:",
    "",
    "```json",
    jsonStringify(EXAMPLE_UNBIND, null, 2),
    "```",
  ].join(`
`);
  joined_5 = [
    "## How User Bindings Interact with Defaults",
    "",
    "- User bindings are **additive** \u2014 they are appended after the default bindings",
    "- To **move** a binding to a different key: unbind the old key (`null`) AND add the new binding",
    "- A context only needs to appear in the user's file if they want to change something in that context",
  ].join(`
`);
  joined_6 = [
    "## Common Patterns",
    "",
    "### Rebind a key",
    "To change the external editor shortcut from `ctrl+g` to `ctrl+e`:",
    "```json",
    jsonStringify(EXAMPLE_REBIND, null, 2),
    "```",
    "",
    "### Add a chord binding",
    "```json",
    jsonStringify(EXAMPLE_CHORD, null, 2),
    "```",
  ].join(`
`);
  joined_7 = [
    "## Behavioral Rules",
    "",
    "1. Only include contexts the user wants to change (minimal overrides)",
    "2. Validate that actions and contexts are from the known lists below",
    "3. Warn the user proactively if they choose a key that conflicts with reserved shortcuts or common tools like tmux (`ctrl+b`) and screen (`ctrl+a`)",
    "4. When adding a new binding for an existing action, the new binding is additive (existing default still works unless explicitly unbound)",
    "5. To fully replace a default binding, unbind the old key AND add the new one",
  ].join(`
`);
  joined_8 = [
    "## Validation",
    "",
    "Claude Code validates `~/.claude/keybindings.json` when it loads; warnings go to the debug log. After editing the file, re-check it against the rules below and fix anything that matches.",
    "",
    "### Common Issues and Fixes",
    "",
    markdownTable(
      ["Issue", "Cause", "Fix"],
      [
        [
          '`keybindings.json must have a "bindings" array`',
          "Missing wrapper object",
          'Wrap bindings in `{ "bindings": [...] }`',
        ],
        [
          '`"bindings" must be an array`',
          "`bindings` is not an array",
          'Set `"bindings"` to an array: `[{ context: ..., bindings: ... }]`',
        ],
        [
          '`Unknown context "X"`',
          "Typo or invalid context name",
          "Use exact context names from the Available Contexts table",
        ],
        [
          '`"X" is not a modifier, so "Y" ... applies to "Z" instead`',
          "Error: `X` comes before the key in `Y` but is not a modifier (a typo such as `ctl` for `ctrl`, or two keys joined with `+` instead of a space), so it is dropped and the binding applies to `Z`",
          "Correct the modifier using the Keystroke Syntax list (the message suggests the corrected keystroke when it can), or put a space between the keystrokes of a chord",
        ],
        [
          '`Duplicate key "X" in Y bindings`',
          "Same key defined twice in one context",
          "Remove the duplicate; JSON uses only the last value",
        ],
        [
          '`"X" may not work: ...`',
          "Key conflicts with terminal/OS reserved shortcut",
          "Choose a different key (see Reserved Shortcuts section)",
        ],
        [
          '`Invalid action for "X"`',
          "Action value is not a string or null",
          'Actions must be strings like `"app:help"` or `null` to unbind',
        ],
      ],
    ),
    "",
    "### Example validation warnings (debug log)",
    "",
    "```",
    "[keybindings] Found 2 validation issue(s)",
    '[keybindings] [error] Unknown context "chat" \u2014 Valid contexts: Global, Chat, Autocomplete, ...',
    '[keybindings] [warning] "ctrl+c" may not work: Terminal interrupt (SIGINT)',
    "```",
    "",
    "**Errors** prevent bindings from working and must be fixed. **Warnings** indicate potential conflicts but the binding may still work.",
  ].join(`
`);
});
//@ chunk-ne2890fx.js:181009-181598 fingerprint (2.1.88 match: registerKeybindingsSkill, 1)
/**
 * 注册 keybindings-help 内置 skill（只供模型调用）：生成上下文表、动作表、保留快捷键清单和 ~/.claude/keybindings.json 示例；isKeybindingCustomizationEnabled 门控。
 */
function registerKeybindingsSkill() {
  registerBundledSkill({
    name: "keybindings-help",
    description:
      'Use when the user wants to customize keyboard shortcuts, rebind keys, add chord bindings, or modify ~/.claude/keybindings.json. Examples: "rebind ctrl+s", "add a chord shortcut", "change the submit key", "customize keybindings".',
    allowedTools: ["Read"],
    userInvocable: false,
    isEnabled: isKeybindingCustomizationEnabled,
    async getPromptForCommand(args) {
      let contextsTable = generateContextsTable();
      let actionsTable = generateActionsTable();
      let reservedShortcuts = generateReservedShortcuts();
      let sections = [
        joined,
        joined_2,
        joined_3,
        joined_4,
        joined_5,
        joined_6,
        joined_7,
        joined_8,
        `## Reserved Shortcuts

${reservedShortcuts}`,
        `## Available Contexts

${contextsTable}`,
        `## Available Actions

${actionsTable}`,
      ];
      if (args)
        sections.push(`## User Request

${args}`);
      return [
        {
          type: "text",
          text: sections.join(`

`),
        },
      ];
    },
  });
}
//@ chunk-ne2890fx.js:181598-181740 fingerprint (2.1.88 match: markdownTable, 1)
function markdownTable(headers, rows) {
  let separator = headers.map(() => "---");
  return [
    `| ${headers.join(" | ")} |`,
    `| ${separator.join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join(`
`);
}
//@ chunk-z0x4zh5m.js:23717-23784 fingerprint (2.1.88 match: UNBIND_EXAMPLE, 0.6)
function UNBIND_EXAMPLE() {
  let bindings = keybindingsState.bindings ?? loadKeybindingsSyncWithWarnings();
  return getActionDisplayText(cycleModeBindingName(bindings), "Chat", bindings);
}
export { UNBIND_EXAMPLE, registerKeybindingsSkill };
