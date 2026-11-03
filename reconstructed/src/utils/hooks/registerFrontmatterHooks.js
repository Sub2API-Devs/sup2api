/**
 * utils/hooks/registerFrontmatterHooks.ts
 *
 * 并入已有模块：frontmatter 钩子注册
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/registerFrontmatterHooks.ts
 * pieces: chunk-ahpsetyz.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";
import { tagHooksWithSource } from "./sessionHooks.js";
import { logForDebugging } from "../debug.js";
import { isPersonalConfigRestricted } from "../personalConfigRestriction.js";
import { REPO_DIR_SETTING_SOURCES } from "../settings/constants.js";

//@ chunk-ahpsetyz.js:371-545 placement
function hasFrontmatterHooks(o) {
  if (!o || Object.keys(o).length === 0) return !1;
  for (let n of HOOK_EVENTS) {
    let e = o[n];
    if (!e || e.length === 0) continue;
    for (let r of e) if ((r.hooks?.length ?? 0) > 0) return !0;
  }
  return !1;
}
/**
 * 把代理（agent）frontmatter 的 hooks 注册为会话钩子；isSubagent 时 Stop 改为 SubagentStop。
 */
//@ chunk-ahpsetyz.js:545-1033 fingerprint = registerFrontmatterHooks (0.946)
function registerFrontmatterHooks(o, n, e, r, m = !1, l = !1, u = !1, p) {
  if (!e || Object.keys(e).length === 0) return;
  tagHooksWithSource(e, p);
  let hookCount = 0;
  for (let event of HOOK_EVENTS) {
    let matchers = e[event];
    if (!matchers || matchers.length === 0) continue;
    let targetEvent = event;
    if (m && event === "Stop")
      ((targetEvent = "SubagentStop"),
        logForDebugging(`Converting Stop hook to SubagentStop for ${r} (subagents trigger SubagentStop)`));
    for (let matcherConfig of matchers) {
      let matcher = matcherConfig.matcher ?? "",
        hooksArray = matcherConfig.hooks;
      if (!hooksArray || hooksArray.length === 0) continue;
      for (let hook of hooksArray)
        (o.add(n, targetEvent, matcher, hook, { personal: l, checkout: u }), hookCount++);
    }
  }
  if (hookCount > 0)
    logForDebugging(`Registered ${hookCount} frontmatter hook(s) from ${r} for session ${n}`);
}
//@ chunk-ahpsetyz.js:1033-1084 placement
function yyt(o) {
  return isPersonalConfigRestricted() && o !== void 0 && REPO_DIR_SETTING_SOURCES.has(o);
}

export { hasFrontmatterHooks, yyt, registerFrontmatterHooks };
