/**
 * plugins/bundled/diffPane/constants.ts
 *
 * 2.1.316 新增：diff 面板常量：测试文件/生成文件判定等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wyqg6m3h.js (30)
 * attribution: placement 30
 */
import { baseNameOf } from "./diffSources.js";
import {
  GENERATED_SUFFIXES,
  GENERATED_FILENAMES,
  GENERATED_DIRECTORIES,
  GENERATED_FILENAME_PATTERNS,
} from "../../../utils/generatedFiles.js";

//@ chunk-wyqg6m3h.js:26852-26891 placement
var rootedPathOf = (e) => `/${e.replace(/^\/+/, "")}`;
//@ chunk-wyqg6m3h.js:26891-27044 placement
function isGeneratedFile(e) {
  let lower = baseNameOf(e).toLowerCase();
  let r = rootedPathOf(e);
  let any = GENERATED_SUFFIXES.some((n) => lower.endsWith(n));
  return (
    GENERATED_FILENAMES.has(lower) ||
    any ||
    GENERATED_DIRECTORIES.some((n) => r.includes(n)) ||
    GENERATED_FILENAME_PATTERNS.some((n) => n.test(lower))
  );
}
//@ chunk-wyqg6m3h.js:27044-27180 placement
var TEST_DIRECTORIES = [
  "/test/",
  "/tests/",
  "/spec/",
  "/specs/",
  "/__tests__/",
  "/__mocks__/",
  "/__snapshots__/",
  "/__fixtures__/",
  "/fixtures/",
  "/testdata/",
];
//@ chunk-wyqg6m3h.js:27180-27289 placement
var TEST_FILENAME_PATTERNS = Object.freeze([
  /\.test\.[a-z]+$/i,
  /\.spec\.[a-z]+$/i,
  /_test\.[a-z]+$/i,
  /_spec\.[a-z]+$/i,
  /\.snap$/i,
]);
//@ chunk-wyqg6m3h.js:27289-27384 placement
function isTestFile(e) {
  let o = baseNameOf(e);
  let r = rootedPathOf(e);
  return TEST_DIRECTORIES.some((s) => r.includes(s)) || TEST_FILENAME_PATTERNS.some((s) => s.test(o));
}
//@ chunk-wyqg6m3h.js:27384-27409 placement
var isNoiseFile = (path) => isTestFile(path) || isGeneratedFile(path);
//@ chunk-wyqg6m3h.js:27409-27468 placement
var COMMAND_DESCRIPTION = "Toggle the diff panel showing uncommitted changes";
//@ chunk-wyqg6m3h.js:27468-27482 placement
var COMMAND_NAME = "diff";
//@ chunk-wyqg6m3h.js:27482-27506 placement
var baseStoreKeyOf = (toplevel) => `base:${toplevel}`;
//@ chunk-wyqg6m3h.js:27506-27520 placement
var STORE_OPEN_KEY = "open";
//@ chunk-wyqg6m3h.js:27520-27534 placement
var PANE_ID = "diff";
//@ chunk-wyqg6m3h.js:27534-27548 placement
var PANE_TITLE = "Diff";
//@ chunk-wyqg6m3h.js:27548-27581 placement
var PLUGIN_NAMES = ["diff", "cc-plugin-diff"];
//@ chunk-wyqg6m3h.js:27581-27666 placement
var AWAITS_SURFACE_TEXT = "Nothing here can draw the diff panel yet; it opens as soon as something can";
//@ chunk-wyqg6m3h.js:27666-27706 placement
var BUILTIN_HOLDS_PATTERN = /refused: it is the built-in \//;
//@ chunk-wyqg6m3h.js:27706-27799 placement
var GIT_UNANSWERED_TEXT =
  "The diff panel couldn't read git state \u2014 git didn't answer; run /diff " + "again";
//@ chunk-wyqg6m3h.js:27799-27842 placement
var MORE_BELOW_TEXT = "more below (opt+\u2193 to scroll)";
//@ chunk-wyqg6m3h.js:27842-27942 placement
var NOT_IN_REPOSITORY_TEXT =
  "The diff panel shows git changes \u2014 the current directory isn't in a " + "git repository";
//@ chunk-wyqg6m3h.js:27942-27973 placement
var DIALOG_DISMISSED_TEXT = "Diff dialog dismissed";
//@ chunk-wyqg6m3h.js:27973-28000 placement
var PANEL_HIDDEN_TEXT = "Diff panel hidden";
//@ chunk-wyqg6m3h.js:28000-28026 placement
var PANEL_SHOWN_TEXT = "Diff panel shown";
//@ chunk-wyqg6m3h.js:28026-28115 placement
var registerFailedTextOf = (e) =>
  `could not register /diff: ${e}; the diff panel is unavailable this session`;
//@ chunk-wyqg6m3h.js:28115-28192 placement
var RESIZE_TERMINAL_TEXT = "Resize your terminal to at least 110 columns to show the diff panel";
//@ chunk-wyqg6m3h.js:28192-28287 placement
var untrackedWithheldTextOf = (e) =>
  `Untracked files unavailable (${e.words.lister} could not list them); not counted`;
//@ chunk-wyqg6m3h.js:28287-28319 placement
var COMMAND_SPEC = {
  name: COMMAND_NAME,
  description: COMMAND_DESCRIPTION,
};
//@ chunk-wyqg6m3h.js:28319-28379 placement
var isRecord = (e) => typeof e === "object" && e !== null && !Array.isArray(e);
//@ chunk-wyqg6m3h.js:28379-28418 placement = CODE_EDITING_TOOLS (1)
var CODE_EDITING_TOOLS = ["Edit", "Write", "NotebookEdit"];
//@ chunk-wyqg6m3h.js:28418-28495 placement
function mayHaveWritten(e) {
  let o = e;
  return o === undefined || (o.deny === undefined && o.isReadOnly !== true);
}
//@ chunk-wyqg6m3h.js:28495-28524 placement
var SHELL_TOOLS = ["Bash", "PowerShell"];
//@ chunk-wyqg6m3h.js:28524-28543 placement = TODO_WRITE_TOOL_NAME (1)
/**
 * "TodoWrite"（另一块中的副本）。
 */
var TODO_TOOL = "TodoWrite";
export {
  TODO_TOOL,
  isRecord,
  STORE_OPEN_KEY,
  PANE_ID,
  AWAITS_SURFACE_TEXT,
  BUILTIN_HOLDS_PATTERN,
  COMMAND_DESCRIPTION,
  COMMAND_NAME,
  COMMAND_SPEC,
  DIALOG_DISMISSED_TEXT,
  CODE_EDITING_TOOLS,
  GIT_UNANSWERED_TEXT,
  MORE_BELOW_TEXT,
  NOT_IN_REPOSITORY_TEXT,
  PANEL_HIDDEN_TEXT,
  PANEL_SHOWN_TEXT,
  PANE_TITLE,
  PLUGIN_NAMES,
  RESIZE_TERMINAL_TEXT,
  SHELL_TOOLS,
  TEST_DIRECTORIES,
  TEST_FILENAME_PATTERNS,
  baseStoreKeyOf,
  isGeneratedFile,
  isNoiseFile,
  isTestFile,
  mayHaveWritten,
  registerFailedTextOf,
  rootedPathOf,
  untrackedWithheldTextOf,
};
