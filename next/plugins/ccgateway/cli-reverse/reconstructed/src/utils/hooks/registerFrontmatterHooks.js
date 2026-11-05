/**
 * utils/hooks/registerFrontmatterHooks.ts
 *
 * 并入已有模块：frontmatter 钩子注册
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/registerFrontmatterHooks.ts
 * pieces: chunk-w4s3ryq5.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";
import { tagHooksWithSource } from "./sessionHooks.js";
import { logForDebugging } from "../debug.js";
import { isPersonalConfigRestricted } from "../personalConfigRestriction.js";
import { REPO_DIR_SETTING_SOURCES } from "../settings/constants.js";

//@ chunk-w4s3ryq5.js:371-545 placement
function hasFrontmatterHooks(hooks) {
  if (!hooks || Object.keys(hooks).length === 0) return false;
  for (let event of HOOK_EVENTS) {
    let matchers = hooks[event];
    if (!matchers || matchers.length === 0) continue;
    for (let matcher of matchers) if ((matcher.hooks?.length ?? 0) > 0) return true;
  }
  return false;
}
//@ chunk-w4s3ryq5.js:545-1033 fingerprint (2.1.88 match: registerFrontmatterHooks, 0.946)
/**
 * 把代理（agent）frontmatter 的 hooks 注册为会话钩子；isSubagent 时 Stop 改为 SubagentStop。
 */
function registerFrontmatterHooks(
  setAppState,
  sessionId,
  hooks,
  sourceName,
  isAgent = false,
  personal = false,
  checkout = false,
  commandRepository,
) {
  if (!hooks || Object.keys(hooks).length === 0) return;
  tagHooksWithSource(hooks, commandRepository);
  let hookCount = 0;
  for (let event of HOOK_EVENTS) {
    let matchers = hooks[event];
    if (!matchers || matchers.length === 0) continue;
    let targetEvent = event;
    if (isAgent && event === "Stop") {
      targetEvent = "SubagentStop";
      logForDebugging(
        `Converting Stop hook to SubagentStop for ${sourceName} (subagents trigger SubagentStop)`,
      );
    }
    for (let matcherConfig of matchers) {
      let matcher = matcherConfig.matcher ?? "";
      let hooksArray = matcherConfig.hooks;
      if (!hooksArray || hooksArray.length === 0) continue;
      for (let hook of hooksArray) {
        setAppState.add(sessionId, targetEvent, matcher, hook, {
          personal,
          checkout,
        });
        hookCount++;
      }
    }
  }
  if (hookCount > 0)
    logForDebugging(
      `Registered ${hookCount} frontmatter hook(s) from ${sourceName} for session ${sessionId}`,
    );
}
//@ chunk-w4s3ryq5.js:1033-1084 placement
/**
 * 判断某 frontmatter 钩子来源是否因个人配置受限而禁用。
 */
function isRepoFrontmatterHookRestricted(source) {
  return isPersonalConfigRestricted() && source !== undefined && REPO_DIR_SETTING_SOURCES.has(source);
}
export { hasFrontmatterHooks, isRepoFrontmatterHookRestricted, registerFrontmatterHooks };
