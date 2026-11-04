/**
 * keybindings/defaultBindings.ts
 *
 * 默认快捷键表（按上下文分块，含平台差异）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/defaultBindings.ts
 * pieces: chunk-6qssfmzs.js (1)
 * attribution: fingerprint 1
 */
import { getPlatform } from "../utils/platform.js";
import { alwaysTrue } from "../utils/slowOperations.js";
import { satisfies } from "../utils/semver.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-6qssfmzs.js:420-7531 fingerprint (2.1.88 match: DEFAULT_BINDINGS, 0.661)
/**
 * 默认绑定表（按上下文分块）。平台差异：Windows/WSL 图片粘贴用 alt+v（WSL 额外保留 ctrl+v），其余 ctrl+v；Windows 上运行时（Bun≥1.2.23 或 Node 22.17+/24.2+）支持 shift+tab 才用它切换模式，否则用 meta+m。完整表见手册。
 */
var platform; // deferred: uses getPlatform (../utils/platform.js) of its import cycle while loading; runs once the cycle is complete
var isWindowsLike;
var IMAGE_PASTE_KEY;
var supportsShiftTab;
var CYCLE_MODE_KEY;
var DEFAULT_BINDINGS;
deferInit("chunk-6qssfmzs.js:420", () => {
  platform = getPlatform();
  isWindowsLike = platform === "windows" || platform === "wsl";
  IMAGE_PASTE_KEY = isWindowsLike ? "alt+v" : "ctrl+v";
  supportsShiftTab =
    platform !== "windows" ||
    (alwaysTrue()
      ? satisfies("1.4.4", ">=1.2.23")
      : satisfies(process.versions.node, ">=22.17.0 <23.0.0 || >=24.2.0"));
  CYCLE_MODE_KEY = supportsShiftTab ? "shift+tab" : "meta+m";
  DEFAULT_BINDINGS = [
    {
      context: "Global",
      bindings: {
        "ctrl+c": "app:interrupt",
        "ctrl+d": "app:exit",
        "ctrl+t": "app:toggleTodos",
        "ctrl+o": "app:toggleTranscript",
        "ctrl+shift+b": "app:toggleBrief",
        "ctrl+r": "history:search",
        "ctrl+up": "app:diffFileListUp",
        "ctrl+down": "app:diffFileListDown",
        "meta+up": "app:diffFileListUp",
        "meta+down": "app:diffFileListDown",
        ...{},
        ...{
          "ctrl+]": "app:openArtifact",
        },
        ...{},
        ...{},
      },
    },
    {
      context: "DiffPanel",
      bindings: {
        "ctrl+x b": "app:cycleDiffBase",
      },
    },
    {
      context: "FeedbackSurvey",
      bindings: {
        "ctrl+x 1": "feedbackSurvey:bad",
        "ctrl+x 2": "feedbackSurvey:fine",
        "ctrl+x 3": "feedbackSurvey:good",
      },
    },
    {
      context: "Chat",
      bindings: {
        escape: "chat:cancel",
        "ctrl+l": "chat:clearInput",
        "cmd+k": "chat:clearScreen",
        "ctrl+x ctrl+k": "chat:killAgents",
        ...{
          [CYCLE_MODE_KEY]: "chat:cycleMode",
        },
        ...{},
        "meta+p": "chat:modelPicker",
        ...{
          "shift+up": "chat:increaseEffort",
          "shift+down": "chat:decreaseEffort",
        },
        "meta+o": "chat:fastMode",
        "ctrl+y": "chat:defaultToNewerModel",
        "meta+t": "chat:thinkingToggle",
        "meta+w": "chat:workflowKeywordToggle",
        enter: "chat:submit",
        "ctrl+x enter": "chat:queueSubmit",
        "ctrl+x ctrl+s": "chat:sendNow",
        "ctrl+enter": "chat:sendNow",
        "ctrl+j": "chat:newline",
        up: "history:previous",
        down: "history:next",
        "ctrl+_": "chat:undo",
        "ctrl+-": "chat:undo",
        "ctrl+shift+-": "chat:undo",
        "ctrl+shift+_": "chat:undo",
        "ctrl+x ctrl+e": "chat:externalEditor",
        "ctrl+x ctrl+a": "abovePrompt:toggle",
        "ctrl+x tab": "abovePrompt:focus",
        "ctrl+g": "chat:externalEditor",
        "ctrl+s": "chat:stash",
        [IMAGE_PASTE_KEY]: "chat:imagePaste",
        ...(platform === "wsl" && {
          "ctrl+v": "chat:imagePaste",
        }),
        space: "voice:pushToTalk",
      },
    },
    {
      context: "Autocomplete",
      bindings: {
        tab: "autocomplete:accept",
        escape: "autocomplete:dismiss",
        up: "autocomplete:previous",
        down: "autocomplete:next",
      },
    },
    {
      context: "Settings",
      bindings: {
        escape: "confirm:no",
        up: "select:previous",
        down: "select:next",
        k: "select:previous",
        j: "select:next",
        "ctrl+p": "select:previous",
        "ctrl+n": "select:next",
        home: "select:first",
        end: "select:last",
        pageup: "select:pageUp",
        pagedown: "select:pageDown",
        space: "select:accept",
        enter: "select:accept",
        "/": "settings:search",
        r: "settings:retry",
        d: "settings:periodDay",
        w: "settings:periodWeek",
        f: "settings:fixUsage",
        t: "settings:sortByTokens",
        "ctrl+u": "scroll:halfPageUp",
        "ctrl+d": "scroll:halfPageDown",
      },
    },
    {
      context: "Confirmation",
      bindings: {
        enter: "confirm:yes",
        escape: "confirm:no",
        up: "confirm:previous",
        down: "confirm:next",
        tab: "confirm:nextField",
        space: "confirm:toggle",
        [CYCLE_MODE_KEY]: "confirm:cycleMode",
      },
    },
    {
      context: "Tabs",
      bindings: {
        tab: "tabs:next",
        "shift+tab": "tabs:previous",
        right: "tabs:next",
        left: "tabs:previous",
      },
    },
    {
      context: "Transcript",
      bindings: {
        "ctrl+e": "transcript:toggleShowAll",
        "ctrl+c": "transcript:exit",
        escape: "transcript:exit",
        q: "transcript:exit",
        "ctrl+u": "scroll:halfPageUp",
        "ctrl+d": "scroll:halfPageDown",
        "ctrl+b": "scroll:fullPageUp",
        "ctrl+f": "scroll:fullPageDown",
        "ctrl+n": "scroll:lineDown",
        "ctrl+p": "scroll:lineUp",
        g: "scroll:top",
        "shift+g": "scroll:bottom",
        j: "scroll:lineDown",
        k: "scroll:lineUp",
        space: "scroll:fullPageDown",
        b: "scroll:fullPageUp",
        up: "scroll:lineUp",
        down: "scroll:lineDown",
        home: "scroll:top",
        end: "scroll:bottom",
      },
    },
    {
      context: "HistorySearch",
      bindings: {
        "ctrl+r": "historySearch:next",
        escape: "historySearch:accept",
        tab: "historySearch:accept",
        "ctrl+c": "historySearch:cancel",
        enter: "historySearch:execute",
        "ctrl+s": "historySearch:cycleScope",
      },
    },
    {
      context: "Task",
      bindings: {
        "ctrl+x ctrl+b": "task:background",
        "ctrl+b": "task:background",
      },
    },
    {
      context: "ThemePicker",
      bindings: {
        "ctrl+t": "theme:toggleSyntaxHighlighting",
        "ctrl+e": "theme:editCustom",
      },
    },
    {
      context: "Scroll",
      bindings: {
        pageup: "scroll:pageUp",
        pagedown: "scroll:pageDown",
        wheelup: "scroll:lineUp",
        wheeldown: "scroll:lineDown",
        "ctrl+home": "scroll:top",
        "ctrl+end": "scroll:bottom",
        "ctrl+shift+c": "selection:copy",
        "cmd+c": "selection:copy",
        "shift+left": "selection:extendLeft",
        "shift+right": "selection:extendRight",
        "shift+up": "selection:extendUp",
        "shift+down": "selection:extendDown",
        "shift+home": "selection:extendLineStart",
        "shift+end": "selection:extendLineEnd",
      },
    },
    {
      context: "Help",
      bindings: {
        escape: "help:dismiss",
      },
    },
    ...[],
    {
      context: "Attachments",
      bindings: {
        right: "attachments:next",
        left: "attachments:previous",
        backspace: "attachments:remove",
        delete: "attachments:remove",
        down: "attachments:exit",
        escape: "attachments:exit",
      },
    },
    {
      context: "Footer",
      bindings: {
        up: "footer:up",
        "ctrl+p": "footer:up",
        down: "footer:down",
        "ctrl+n": "footer:down",
        right: "footer:next",
        left: "footer:previous",
        enter: "footer:openSelected",
        escape: "footer:clearSelection",
        x: "footer:close",
        ...{},
      },
    },
    {
      context: "AbovePrompt",
      bindings: {
        tab: "abovePrompt:next",
        right: "abovePrompt:next",
        "shift+tab": "abovePrompt:previous",
        left: "abovePrompt:previous",
        enter: "abovePrompt:press",
        space: "abovePrompt:press",
        escape: "abovePrompt:leave",
        up: "pane:scrollUp",
        down: "pane:scrollDown",
        pageup: "pane:pageUp",
        pagedown: "pane:pageDown",
        home: "pane:top",
        end: "pane:bottom",
      },
    },
    {
      context: "AbovePromptInput",
      bindings: {
        tab: "abovePrompt:next",
        "shift+tab": "abovePrompt:previous",
        enter: "abovePrompt:press",
        escape: "abovePrompt:leave",
      },
    },
    {
      context: "AbovePromptSelect",
      bindings: {
        tab: "abovePrompt:next",
        "shift+tab": "abovePrompt:previous",
        down: "abovePrompt:highlightNext",
        up: "abovePrompt:highlightPrevious",
        enter: "abovePrompt:press",
        escape: "abovePrompt:leave",
      },
    },
    {
      context: "Pane",
      bindings: {
        tab: "abovePrompt:next",
        "shift+tab": "abovePrompt:previous",
        enter: "abovePrompt:press",
        escape: "abovePrompt:leave",
        up: "pane:scrollUp",
        down: "pane:scrollDown",
        pageup: "pane:pageUp",
        pagedown: "pane:pageDown",
        home: "pane:top",
        end: "pane:bottom",
        "ctrl+x left": "pane:grow",
        "ctrl+x up": "pane:grow",
        "ctrl+x right": "pane:shrink",
        "ctrl+x down": "pane:shrink",
        "ctrl+x x": "pane:close",
      },
    },
    {
      context: "PaneField",
      bindings: {
        "ctrl+x x": "pane:close",
      },
    },
    {
      context: "DiffDialog",
      bindings: {
        escape: "diff:dismiss",
        left: "diff:previousSource",
        right: "diff:nextSource",
        up: "diff:previousFile",
        down: "diff:nextFile",
        j: "diff:nextFile",
        k: "diff:previousFile",
        pageup: "scroll:pageUp",
        pagedown: "scroll:pageDown",
        space: "scroll:fullPageDown",
        "shift+space": "scroll:fullPageUp",
        b: "scroll:fullPageUp",
        g: "scroll:top",
        "shift+g": "scroll:bottom",
        home: "scroll:top",
        end: "scroll:bottom",
      },
    },
    {
      context: "ModelPicker",
      bindings: {
        left: "modelPicker:decreaseEffort",
        right: "modelPicker:increaseEffort",
        s: "modelPicker:thisSessionOnly",
      },
    },
    {
      context: "EffortSlider",
      bindings: {
        left: "effortSlider:decreaseEffort",
        right: "effortSlider:increaseEffort",
        tab: "effortSlider:toggleUltracode",
        s: "effortSlider:thisSessionOnly",
        ...false,
      },
    },
    {
      context: "Select",
      bindings: {
        up: "select:previous",
        down: "select:next",
        j: "select:next",
        k: "select:previous",
        "ctrl+n": "select:next",
        "ctrl+p": "select:previous",
        pageup: "select:pageUp",
        pagedown: "select:pageDown",
        home: "select:first",
        end: "select:last",
        enter: "select:accept",
        escape: "select:cancel",
      },
    },
    {
      context: "Plugin",
      bindings: {
        space: "plugin:toggle",
        i: "plugin:install",
        f: "plugin:favorite",
        ...{
          "ctrl+s": "plugin:cycleMarketplace",
        },
      },
    },
    {
      context: "Agents",
      bindings: {
        "ctrl+s": "agents:switchView",
        "ctrl+t": "agents:togglePin",
        "ctrl+f": "agents:find",
        "ctrl+r": "agents:rename",
        "ctrl+up": "agents:previousGroup",
        "meta+up": "agents:previousGroup",
        "ctrl+down": "agents:nextGroup",
        "meta+down": "agents:nextGroup",
        ...{},
      },
    },
  ];
});
export { DEFAULT_BINDINGS };
