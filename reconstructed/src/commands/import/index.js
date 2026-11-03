/**
 * commands/import/index.ts
 *
 * 2.1.316 新增：/import 命令对象：从 Codex、Gemini、Cursor 等导入配置与说明文件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getIsNonInteractiveSession, isDiskless } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";

//@ chunk-e6aww6q8.js:1696528-1696571 placement
/**
 * isImportEnabled：tengu_import。
 */
function isImportEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_import", false);
}
//@ chunk-e6aww6q8.js:1696571-1696794 placement
/**
 * IMPORT_UNAVAILABLE_MESSAGE：`claude import` is not yet available。
 */
var IMPORT_UNAVAILABLE_MESSAGE =
  "`claude import` is not yet available in this build. Run `claude` and use /mcp or edit ~/.claude/settings.json directly.";
var CONFIG_UNREADABLE_MESSAGE =
  "Could not read Claude Code config \u2014 run `claude` with no arguments to recover it.";
//@ chunk-e6aww6q8.js:1696794-1696968 placement
/**
 * planImportRewrite：`claude import` → `claude -- /import ...` 改写。
 */
function planImportRewrite(importArgv, n) {
  if (n === undefined)
    return {
      kind: "config-error",
    };
  if (!n)
    return {
      kind: "not-available",
    };
  return {
    kind: "rewrite",
    argv: [...importArgv.prefix, "--", ["/import", ...importArgv.rest].join(" ")],
  };
}
//@ chunk-e6aww6q8.js:1696968-1697312 placement
/**
 * parseImportArgv：识别 argv 中的 import 子命令。
 */
function parseImportArgv(e) {
  let index = e.indexOf("import");
  if (index < 0) return null;
  let sliced = e.slice(0, index);
  if (sliced.some((h) => ["--", "-h", "--help", "-v", "-V", "--version"].includes(h))) return null;
  let sliced_2 = e.slice(index + 1);
  if (sliced.length > 0 && sliced_2.length === 0) return null;
  if (!sliced.every((h, y) => h.startsWith("-") || sliced[y - 1]?.startsWith("-"))) return null;
  if (!areValidImportArgs(sliced_2)) return null;
  return {
    prefix: sliced,
    rest: sliced_2,
  };
}
//@ chunk-e6aww6q8.js:1697312-1697445 placement
/**
 * areValidImportArgs：codex|gemini|cursor|--dry-run|--yes[=digest]。
 */
function areValidImportArgs(e) {
  let n = new Set(["codex", "gemini", "cursor", "--dry-run", "--yes"]);
  return e.every((r) => n.has(r) || r.startsWith("--yes="));
}
//@ chunk-e6aww6q8.js:1697445-1697884 placement
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
  load: () => import("./chunk-he8wyk3b.js"),
};
var importCommand = importCommandDefinition;
//@ chunk-e6aww6q8.js:1697884-1698703 placement
/**
 * 提示模型在检测到其他 AI 工具配置时建议用户运行 /import，不要自行读取或改写。
 */
var IMPORT_OFFER_PROMPT =
  "Do NOT read the foreign-agent config files or write Claude Code config yourself \u2014 the deterministic import (triggered by `--yes`) applies the same safe-name and path-traversal guards as the terminal picker.";
var IMPORT_OFFER_INSTRUCTIONS = `offer to import it now \u2014 tell the user to reply \`/import\` to scan and list what's importable (MCP servers, slash commands, subagents, skills, instructions), then \`/import --yes=<digest>\` (the scan output names the digest) to apply the user-level items. ${"Do NOT read the foreign-agent config files or write Claude Code config yourself \u2014 the deterministic import (triggered by `--yes`) applies the same safe-name and path-traversal guards as the terminal picker."} If \`/import\` isn't available on this surface, tell the user to run \`claude import\` from a terminal instead.`;
//@ chunk-e6aww6q8.js:1698703-1698787 placement
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
  IMPORT_OFFER_PROMPT,
  importCommand,
  importNonInteractiveCommand,
  IMPORT_OFFER_INSTRUCTIONS,
  useNewInitPrompt,
};
