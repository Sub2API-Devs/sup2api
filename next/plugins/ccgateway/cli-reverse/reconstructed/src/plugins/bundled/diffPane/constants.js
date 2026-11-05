/**
 * plugins/bundled/diffPane/constants.ts
 *
 * 2.1.316 新增：diff 面板常量：测试文件/生成文件判定等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c7hntn0y.js (30)
 * attribution: placement 30
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { baseNameOf } from "./diffSources.js";
import {
  GENERATED_SUFFIXES,
  GENERATED_FILENAMES,
  GENERATED_DIRECTORIES,
  GENERATED_FILENAME_PATTERNS,
} from "../../../utils/generatedFiles.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-c7hntn0y.js:27216-27255 placement
var rootedPathOf = (path) => `/${path.replace(/^\/+/, "")}`;
//@ chunk-c7hntn0y.js:27255-27408 placement
function isGeneratedFile(path) {
  let lower = baseNameOf(path).toLowerCase();
  let rootedPath = rootedPathOf(path);
  let any = GENERATED_SUFFIXES.some((suffix) => lower.endsWith(suffix));
  return (
    GENERATED_FILENAMES.has(lower) ||
    any ||
    GENERATED_DIRECTORIES.some((dir) => rootedPath.includes(dir)) ||
    GENERATED_FILENAME_PATTERNS.some((pattern) => pattern.test(lower))
  );
}
//@ chunk-c7hntn0y.js:27408-27544 placement
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
//@ chunk-c7hntn0y.js:27544-27653 placement
var TEST_FILENAME_PATTERNS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c7hntn0y.js:27544", () => {
  TEST_FILENAME_PATTERNS = Object.freeze([
    /\.test\.[a-z]+$/i,
    /\.spec\.[a-z]+$/i,
    /_test\.[a-z]+$/i,
    /_spec\.[a-z]+$/i,
    /\.snap$/i,
  ]);
});
//@ chunk-c7hntn0y.js:27653-27748 placement
function isTestFile(path) {
  let fileName = baseNameOf(path);
  let rootedPath = rootedPathOf(path);
  return (
    TEST_DIRECTORIES.some((dir) => rootedPath.includes(dir)) ||
    TEST_FILENAME_PATTERNS.some((pattern) => pattern.test(fileName))
  );
}
//@ chunk-c7hntn0y.js:27748-27773 placement
var isNoiseFile = (path) => isTestFile(path) || isGeneratedFile(path);
//@ chunk-c7hntn0y.js:27773-27832 placement
var COMMAND_DESCRIPTION = "Toggle the diff panel showing uncommitted changes";
//@ chunk-c7hntn0y.js:27832-27846 placement (2.1.88 match: getStagedFiles, 0.454)
var COMMAND_NAME = "diff";
//@ chunk-c7hntn0y.js:27846-27870 placement
var baseStoreKeyOf = (toplevel) => `base:${toplevel}`;
//@ chunk-c7hntn0y.js:27870-27884 placement
var STORE_OPEN_KEY = "open";
//@ chunk-c7hntn0y.js:27884-27898 placement
var PANE_ID = "diff";
//@ chunk-c7hntn0y.js:27898-27912 placement
var PANE_TITLE = "Diff";
//@ chunk-c7hntn0y.js:27912-27945 placement
var PLUGIN_NAMES = ["diff", "cc-plugin-diff"];
//@ chunk-c7hntn0y.js:27945-28030 placement
var AWAITS_SURFACE_TEXT = "Nothing here can draw the diff panel yet; it opens as soon as something can";
//@ chunk-c7hntn0y.js:28030-28070 placement
var BUILTIN_HOLDS_PATTERN = /refused: it is the built-in \//;
//@ chunk-c7hntn0y.js:28070-28163 placement
var GIT_UNANSWERED_TEXT =
  "The diff panel couldn't read git state \u2014 git didn't answer; run /diff " + "again";
//@ chunk-c7hntn0y.js:28163-28206 placement
var MORE_BELOW_TEXT = "more below (opt+\u2193 to scroll)";
//@ chunk-c7hntn0y.js:28206-28306 placement
var NOT_IN_REPOSITORY_TEXT =
  "The diff panel shows git changes \u2014 the current directory isn't in a " + "git repository";
//@ chunk-c7hntn0y.js:28306-28337 placement
var DIALOG_DISMISSED_TEXT = "Diff dialog dismissed";
//@ chunk-c7hntn0y.js:28337-28364 placement
var PANEL_HIDDEN_TEXT = "Diff panel hidden";
//@ chunk-c7hntn0y.js:28364-28390 placement
var PANEL_SHOWN_TEXT = "Diff panel shown";
//@ chunk-c7hntn0y.js:28390-28479 placement
var registerFailedTextOf = (error) =>
  `could not register /diff: ${error}; the diff panel is unavailable this session`;
//@ chunk-c7hntn0y.js:28479-28556 placement
var RESIZE_TERMINAL_TEXT = "Resize your terminal to at least 110 columns to show the diff panel";
//@ chunk-c7hntn0y.js:28556-28651 placement
var untrackedWithheldTextOf = (status) =>
  `Untracked files unavailable (${status.words.lister} could not list them); not counted`;
//@ chunk-c7hntn0y.js:28651-28683 placement
var COMMAND_SPEC = {
  name: COMMAND_NAME,
  description: COMMAND_DESCRIPTION,
};
//@ chunk-c7hntn0y.js:28683-28743 placement
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
//@ chunk-c7hntn0y.js:28743-28782 placement (2.1.88 match: CODE_EDITING_TOOLS, 1)
var CODE_EDITING_TOOLS = ["Edit", "Write", "NotebookEdit"];
//@ chunk-c7hntn0y.js:28782-28859 placement
function mayHaveWritten(result) {
  let value = result;
  return value === undefined || (value.deny === undefined && value.isReadOnly !== true);
}
//@ chunk-c7hntn0y.js:28859-28888 placement
var SHELL_TOOLS = ["Bash", "PowerShell"];
//@ chunk-c7hntn0y.js:28888-28907 placement (2.1.88 match: TODO_WRITE_TOOL_NAME, 1)
/**
 * "TodoWrite"（另一块中的副本）。
 */
var TODO_TOOL = "TodoWrite";
export {
  STORE_OPEN_KEY,
  PANE_ID,
  TODO_TOOL,
  isRecord,
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
