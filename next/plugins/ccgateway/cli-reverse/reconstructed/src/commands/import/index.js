/**
 * commands/import/index.ts
 *
 * 2.1.316 新增：/import 命令对象：从 Codex、Gemini、Cursor 等导入配置与说明文件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: placement 8
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getIsNonInteractiveSession, isDiskless } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";

//@ chunk-5xgkngpb.js:1771898-1771941 placement
/**
 * isImportEnabled：tengu_import。
 */
function isImportEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_import", false);
}
//@ chunk-5xgkngpb.js:1771941-1772164 placement
/**
 * IMPORT_UNAVAILABLE_MESSAGE：`claude import` is not yet available。
 */
var IMPORT_UNAVAILABLE_MESSAGE =
  "`claude import` is not yet available in this build. Run `claude` and use /mcp or edit ~/.claude/settings.json directly.";
var CONFIG_UNREADABLE_MESSAGE =
  "Could not read Claude Code config \u2014 run `claude` with no arguments to recover it.";
//@ chunk-5xgkngpb.js:1772164-1772338 placement
/**
 * planImportRewrite：`claude import` → `claude -- /import ...` 改写。
 */
function planImportRewrite(importArgv, context) {
  if (context === undefined)
    return {
      kind: "config-error",
    };
  if (!context)
    return {
      kind: "not-available",
    };
  return {
    kind: "rewrite",
    argv: [...importArgv.prefix, "--", ["/import", ...importArgv.rest].join(" ")],
  };
}
//@ chunk-5xgkngpb.js:1772338-1772682 placement
/**
 * parseImportArgv：识别 argv 中的 import 子命令。
 */
function parseImportArgv(argv) {
  let index = argv.indexOf("import");
  if (index < 0) return null;
  let sliced = argv.slice(0, index);
  if (sliced.some((arg) => ["--", "-h", "--help", "-v", "-V", "--version"].includes(arg))) return null;
  let sliced_2 = argv.slice(index + 1);
  if (sliced.length > 0 && sliced_2.length === 0) return null;
  if (!sliced.every((arg, index) => arg.startsWith("-") || sliced[index - 1]?.startsWith("-"))) return null;
  if (!areValidImportArgs(sliced_2)) return null;
  return {
    prefix: sliced,
    rest: sliced_2,
  };
}
//@ chunk-5xgkngpb.js:1772682-1772815 placement
/**
 * areValidImportArgs：codex|gemini|cursor|--dry-run|--yes[=digest]。
 */
function areValidImportArgs(args) {
  let valid = new Set(["codex", "gemini", "cursor", "--dry-run", "--yes"]);
  return args.every((arg) => valid.has(arg) || arg.startsWith("--yes="));
}
//@ chunk-5xgkngpb.js:1772815-1773254 placement
/**
 * /import 命令对象（local-jsx）；描述：Import config from another AI coding agent；isEnabled: N0e；isHidden: {return!N0e()}；实现 chunk-cdgppz20.js 的 Fo。
 */
var importCommandDefinition = {
  type: "local-jsx",
  name: "import",
  description: "Import config from another AI coding agent",
  immediate: true,
  argumentHint: "[codex|gemini|cursor] [--dry-run]",
  isEnabled: isImportEnabled,
  get isHidden() {
    return !isImportEnabled();
  },
};
var importNonInteractiveCommand = {
  type: "local",
  name: "import",
  supportsNonInteractive: true,
  description: "Import config from another AI coding agent",
  get isHidden() {
    return !isImportEnabled() || !getIsNonInteractiveSession() || isDiskless();
  },
  isEnabled: () => isImportEnabled() && getIsNonInteractiveSession() && !isDiskless(),
  load: () => import("./call.lazy.js"),
};
var importCommand = importCommandDefinition;
//@ chunk-5xgkngpb.js:1773254-1774073 placement
/**
 * 提示模型在检测到其他 AI 工具配置时建议用户运行 /import，不要自行读取或改写。
 */
var IMPORT_OFFER_PROMPT =
  "Do NOT read the foreign-agent config files or write Claude Code config yourself \u2014 the deterministic import (triggered by `--yes`) applies the same safe-name and path-traversal guards as the terminal picker.";
var IMPORT_OFFER_INSTRUCTIONS = `offer to import it now \u2014 tell the user to reply \`/import\` to scan and list what's importable (MCP servers, slash commands, subagents, skills, instructions), then \`/import --yes=<digest>\` (the scan output names the digest) to apply the user-level items. ${"Do NOT read the foreign-agent config files or write Claude Code config yourself \u2014 the deterministic import (triggered by `--yes`) applies the same safe-name and path-traversal guards as the terminal picker."} If \`/import\` isn't available on this surface, tell the user to run \`claude import\` from a terminal instead.`;
//@ chunk-5xgkngpb.js:1774073-1774157 placement
/**
 * useNewInitPrompt：CLAUDE_CODE_NEW_INIT 或 tengu_slate_harbor_experiment。
 */
function useNewInitPrompt() {
  return (
    env.CLAUDE_CODE_NEW_INIT || getFeatureValue_CACHED_MAY_BE_STALE("tengu_slate_harbor_experiment", false)
  );
}
export {
  parseImportArgv,
  isImportEnabled,
  planImportRewrite,
  CONFIG_UNREADABLE_MESSAGE,
  IMPORT_UNAVAILABLE_MESSAGE,
  importCommand,
  importNonInteractiveCommand,
  IMPORT_OFFER_INSTRUCTIONS,
  useNewInitPrompt,
  IMPORT_OFFER_PROMPT,
};
