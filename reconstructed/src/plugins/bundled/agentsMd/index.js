/**
 * plugins/bundled/agentsMd/index.ts
 *
 * 2.1.316 新增。内置插件 agentsMd 注册。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-16jhn3ak.js (4), chunk-8jbcmznm.js (7)
 * attribution: placement 11
 */
import { getFeatureValue_SESSION_PINNED } from "../../../services/analytics/growthbook.js";
import { __commonJS, __export } from "../../../../runtime/bun-runtime.js";
import {
  PLUGIN_DESCRIPTION,
  FEATURE_NAME,
  LOAD_EVENT,
  MODE_EVENT,
  NESTED_EVENT,
  PENDING_STAGES,
  RIDING,
  WALK_FAILED_REASON,
  holdPending,
  isSwitchedOn,
  loadCountsOf,
  loadMarkOf,
  loadRowOf,
  modeChoiceOf,
  modeRowOf,
  nestedRowOf,
  quietly,
  loadAgentsMdInstructions,
  settlePending,
  stagePending,
  startOver,
  takeBack,
  touchedOf,
  walkOf,
} from "./agentsMd.js";
import {
  AGENTS_MD_FILENAMES,
  CLAUDE_MD_FILENAMES,
  DEFAULT_AGENTS_MD_MODE,
  MAIN_THREAD,
  AGENTS_MD_MODES,
  CLAUDE_MD_RESET_EVENTS,
  resolveIncludePath,
  flattenProjectInstructionParts,
  findInsertIndex,
  isPathUnder,
  isClaudeMdAtDir,
  isSamePathEntry,
  isProjectLocalMcpSource,
  isMcpServerFromProjectOrLocalSettings,
  instructionModeLabel,
  resolveAgentsMdMode,
  formatInstructionFile,
  toPosixPathTrimmed,
  excludeDirs,
  instructionFileDir,
  dedupeInstructionFiles,
  appendInstructionParts,
  insertAgentsMdFiles,
} from "./agentsMdFiles.js";
import { MCP_SETTINGS_SCOPE_KINDS } from "../../../services/mcp/headersHelper.js";
import { registerBuiltinPlugin, builtinHooksModuleRef } from "../../builtinPlugins.js";
import { deferInit, beginDeferredInits } from "../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 3 modules closed by ./agentsMd.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/plugins/bundled/agentsMd/agentsMd.js");
//@ chunk-16jhn3ak.js:227-238 placement
/**
 * 默认开启
 */
var AGENTS_MD_ON_BY_DEFAULT = true;
//@ chunk-16jhn3ak.js:238-280 placement
/**
 * 读取 tengu_agents_md_mod 决定 agentsMd 插件是否可用，默认开启。
 */
var isAgentsMdPluginAvailable = () =>
  getFeatureValue_SESSION_PINNED("tengu_agents_md_mod", AGENTS_MD_ON_BY_DEFAULT);
//@ chunk-16jhn3ak.js:280-310 placement
/**
 * 内置插件 cc-plugin-agents-md 的名字。
 */
var AGENTS_MD_PLUGIN_NAME = "cc-plugin-agents-md";
//@ chunk-16jhn3ak.js:310-441 placement
/**
 * 沿 parent 链找到最顶层的引用文件路径（防环）。
 */
function rootIncludeAncestor(file, fileByPath) {
  let seen = new Set([file.path]);
  let { path, parent } = file;
  while (parent !== undefined && !seen.has(parent)) {
    seen.add(parent);
    path = parent;
    parent = fileByPath.get(parent)?.parent;
  }
  return path;
}
//@ chunk-8jbcmznm.js:3605-4106 placement
/**
 * agentsMd 插件的扫描清单：订阅的钩子、调用的 API、读取的环境变量。
 */
var AGENTS_MD_MANIFEST = __commonJS(function (requireFn, moduleObject) {
  moduleObject.exports = {
    scan: {
      hooks: [
        "session.start",
        "prompt.context",
        "command.run",
        "session.compact",
        "prompt.submit",
        "turn.start",
        "turn.complete",
        "agent.spawn",
        "tool.call",
        "prompt.mention",
      ],
      calls: [
        "env.get",
        "fs.ancestors",
        "session.cwd",
        "session.id",
        "session.root",
        "store.get",
        "store.set",
        "telemetry.log",
        "telemetry.mark",
        "ui.log",
      ],
      env: {
        reads: [
          "CLAUDE_CODE_AGENTS_MD_ROWS_EVERY_PROCESS",
          "CLAUDE_CODE_DISABLE_ATTACHMENTS",
          "CLAUDE_CODE_SIMPLE",
          "HOME",
          "USERPROFILE",
        ],
        writes: [],
      },
    },
    files: {},
  };
});
//@ chunk-8jbcmznm.js:4106-4115 placement
var indexNamespace = {};
//@ chunk-8jbcmznm.js:4115-4264 placement
__export(indexNamespace, {
  PLUGIN_DESCRIPTION: () => PLUGIN_DESCRIPTION,
  PLUGIN_NAME: () => AGENTS_MD_PLUGIN_NAME,
  USER_CONFIG: () => USER_CONFIG,
  default: () => indexNamespace,
  isAvailable: () => isAgentsMdPluginAvailable,
  isOnByDefault: () => AGENTS_MD_ON_BY_DEFAULT,
  registerPlugin: () => registerPlugin,
});
//@ chunk-8jbcmznm.js:4264-4273 placement
var indexNamespace2 = {};
//@ chunk-8jbcmznm.js:4273-5228 placement
__export(indexNamespace2, {
  AGENTS_NAMES: () => AGENTS_MD_FILENAMES,
  CLAUDE_NAMES: () => CLAUDE_MD_FILENAMES,
  DEFAULT_MODE: () => DEFAULT_AGENTS_MD_MODE,
  DROPPED_KINDS: () => MCP_SETTINGS_SCOPE_KINDS,
  FEATURE_NAME: () => FEATURE_NAME,
  LOAD_EVENT: () => LOAD_EVENT,
  MAIN_LOOP: () => MAIN_THREAD,
  MODES: () => AGENTS_MD_MODES,
  MODE_EVENT: () => MODE_EVENT,
  NESTED_EVENT: () => NESTED_EVENT,
  PENDING_STAGES: () => PENDING_STAGES,
  RESET_COMMANDS: () => CLAUDE_MD_RESET_EVENTS,
  RIDING: () => RIDING,
  WALK_FAILED_REASON: () => WALK_FAILED_REASON,
  absoluteOf: () => resolveIncludePath,
  chainRootOf: () => rootIncludeAncestor,
  default: () => indexNamespace2,
  filesOf: () => flattenProjectInstructionParts,
  holdPending: () => holdPending,
  insertionIndex: () => findInsertIndex,
  isBelow: () => isPathUnder,
  isClaudeFileOnWalk: () => isClaudeMdAtDir,
  isFileAt: () => isSamePathEntry,
  isKeptWithoutInstructions: () => isProjectLocalMcpSource,
  isProjectOwn: () => isMcpServerFromProjectOrLocalSettings,
  isSwitchedOn: () => isSwitchedOn,
  legacyModeOf: () => instructionModeLabel,
  loadCountsOf: () => loadCountsOf,
  loadMarkOf: () => loadMarkOf,
  loadRowOf: () => loadRowOf,
  modeChoiceOf: () => modeChoiceOf,
  modeOf: () => resolveAgentsMdMode,
  modeRowOf: () => modeRowOf,
  nestedFrame: () => formatInstructionFile,
  nestedRowOf: () => nestedRowOf,
  normalSpellingOf: () => toPosixPathTrimmed,
  outsideClaudeDirs: () => excludeDirs,
  projectDirOf: () => instructionFileDir,
  quietly: () => quietly,
  register: () => loadAgentsMdInstructions,
  settlePending: () => settlePending,
  stagePending: () => stagePending,
  startOver: () => startOver,
  takeBack: () => takeBack,
  touchedOf: () => touchedOf,
  unseenFiles: () => dedupeInstructionFiles,
  walkOf: () => walkOf,
  withFrames: () => appendInstructionParts,
  withProjectFiles: () => insertAgentsMdFiles,
});
//@ chunk-8jbcmznm.js:11777-12387 placement
var USER_CONFIG; // deferred: uses DEFAULT_AGENTS_MD_MODE (./agentsMdFiles.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8jbcmznm.js:11777", () => {
  USER_CONFIG = {
    instructionFiles: {
      type: "string",
      title: "Project instructions",
      description: `"claude-md": CLAUDE.md only, loaded by the engine as today. "claude-md-or-agents-md" (default): a project with no CLAUDE.md of its own gets its AGENTS.md files instead, loaded exactly where and how CLAUDE.md would be. "claude-md-and-agents-md": AGENTS.md files are loaded beside CLAUDE.md (a file CLAUDE.md already imports or links to is not loaded twice). "managed-only": the project's and your own instruction files are dropped; the organization's managed CLAUDE.md and memory stay.`,
      required: false,
      default: DEFAULT_AGENTS_MD_MODE,
      options: [...AGENTS_MD_MODES],
    },
  };
});
//@ chunk-8jbcmznm.js:12387-12499 placement
var registerPlugin = () =>
  registerBuiltinPlugin({
    name: AGENTS_MD_PLUGIN_NAME,
    description: PLUGIN_DESCRIPTION,
    isAvailable: isAgentsMdPluginAvailable,
    hooksModule: builtinHooksModuleRef(import.meta.dir, indexNamespace2, () => AGENTS_MD_MANIFEST()),
    userConfig: USER_CONFIG,
  });
export {
  rootIncludeAncestor,
  AGENTS_MD_PLUGIN_NAME,
  USER_CONFIG,
  indexNamespace,
  isAgentsMdPluginAvailable,
  AGENTS_MD_ON_BY_DEFAULT,
  registerPlugin,
};
