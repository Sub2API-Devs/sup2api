/**
 * utils/hooks/registerSkillHooks.ts
 *
 * 把 skill frontmatter 的 hooks 注册为会话钩子，支持 once 一次性钩子。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/registerSkillHooks.ts
 * pieces: chunk-3g0djq3w.js (1)
 * attribution: fingerprint 1
 */
import { tagHooksWithSource } from "./sessionHooks.js";
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";
import { logForDebugging } from "../debug.js";
import { getPluginHookRunner } from "../../bootstrap/state.js";

/**
 * 把 skill frontmatter 的 hooks 注册为会话钩子（带 skillRoot）；once 钩子成功后自动移除。
 */
//@ chunk-3g0djq3w.js:4926-5357 fingerprint = registerSkillHooks (0.79)
function registerSkillHooks(e, n, o, u, s, T = !1, p = !1, h) {
  tagHooksWithSource(o, h);
  let registeredCount = 0;
  for (let eventName of HOOK_EVENTS) {
    let matchers = o[eventName];
    if (!matchers) continue;
    for (let matcher of matchers)
      for (let hook of matcher.hooks) {
        let onHookSuccess = hook.once
          ? () => {
              (logForDebugging(`Removing one-shot hook for event ${eventName} in skill '${u}'`),
                e.remove(n, eventName, hook, { skillRoot: s }));
            }
          : void 0;
        (e.add(n, eventName, matcher.matcher || "", hook, {
          onHookSuccess: onHookSuccess,
          skillRoot: s,
          personal: T,
          checkout: p,
        }),
          registeredCount++);
      }
  }
  if (registeredCount > 0) {
    if (s !== void 0) getPluginHookRunner()?.skillHooksRegistered(s, o);
    logForDebugging(`Registered ${registeredCount} hooks from skill '${u}'`);
  }
}

export { registerSkillHooks };
