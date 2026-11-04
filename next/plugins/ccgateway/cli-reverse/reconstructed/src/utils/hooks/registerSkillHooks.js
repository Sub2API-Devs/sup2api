/**
 * utils/hooks/registerSkillHooks.ts
 *
 * 把 skill frontmatter 的 hooks 注册为会话钩子，支持 once 一次性钩子。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/registerSkillHooks.ts
 * pieces: chunk-3g0djq3w.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { jsonStringify } from "../slowOperations.js";
import { computeContentHash } from "../commitAttribution.js";
import { MAX_MATCHER_SET_SIZE, MAX_MATCHER_STEPS } from "./matcherGrammar.js";
import { getPluginHookRunner } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../debug.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { errorMessage } from "../errors.js";
import { tagHooksWithSource } from "./sessionHooks.js";
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";

//@ chunk-3g0djq3w.js:3289-3650 placement
/**
 * 技能钩子超限常量：记录上限与告诉模型钩子未注册的说明。
 */
var MAX_UNFIT_TEXTS = 64;
var SKILL_HOOKS_NOT_REGISTERED_TEXT =
  "This skill declares hooks, and they were not registered in this session: a limit on hooks, a matcher that cannot be tested here, or the organization's policy kept them out. The tools that its allowed-tools would grant were not granted either. If the skill relies on its hooks to check or block tool calls, nothing checks them now: tell the user.";
//@ chunk-3g0djq3w.js:3650-4926 placement
/**
 * 检查技能声明的钩子是否在同一来源的预算内（钩子数、matcher 字符数、可测试性）；超出时不注册钩子并返回原因。
 */
function checkSkillHooksFit(sessionHooksRegistry, sessionId, source, commandRepository, name, hooks) {
  let draws = sessionHooksRegistry.skillDraws(sessionId);
  if (draws === undefined) return;
  let sourceDraws = draws.get(commandRepository ?? source) ?? {
    hooks: 0,
    characters: 0,
    texts: new Map(),
    unfitTexts: 0,
  };
  draws.set(commandRepository ?? source, sourceDraws);
  let textKey = jsonStringify([name, computeContentHash(jsonStringify(hooks))]);
  if (sourceDraws.texts.has(textKey)) return sourceDraws.texts.get(textKey);
  let hooksAsked = 0;
  let charactersAsked = 0;
  for (let matcher of Object.values(hooks).flatMap((matchers) => matchers ?? [])) {
    let max = Math.max(1, matcher.hooks.length);
    hooksAsked += max;
    charactersAsked += (matcher.matcher?.length ?? 0) * max;
  }
  let unfitReason;
  if (sourceDraws.characters + charactersAsked > MAX_MATCHER_SET_SIZE) unfitReason = "characters";
  else if (sourceDraws.hooks + hooksAsked > MAX_MATCHER_STEPS) unfitReason = "count";
  else if (getPluginHookRunner()?.testsSkillMatchers(hooks) === false) unfitReason = "matcher";
  if (unfitReason !== undefined) {
    if (sourceDraws.unfitTexts === MAX_UNFIT_TEXTS) return unfitReason;
    sourceDraws.unfitTexts++;
  }
  sourceDraws.texts.set(textKey, unfitReason);
  logEvent("tengu_skill_hooks_bounds_checked", {
    outcome: fromEnum(unfitReason ?? "fits"),
    source_kind: fromEnum(source),
    hooks_asked: hooksAsked,
    characters_asked: charactersAsked,
    hooks_drawn_before: sourceDraws.hooks,
    characters_drawn_before: sourceDraws.characters,
    hooks_bound: MAX_MATCHER_STEPS,
    characters_bound: MAX_MATCHER_SET_SIZE,
  });
  if (unfitReason === undefined) {
    sourceDraws.hooks += hooksAsked;
    sourceDraws.characters += charactersAsked;
    return;
  }
  logForDebugging(
    `Skill '${name}' registers none of its hooks and grants no tools (${unfitReason}): the skills of one source hold at most ${MAX_MATCHER_STEPS} hooks and ${MAX_MATCHER_SET_SIZE} characters of matchers in a session, and a cloud session tests some matchers only`,
    {
      level: "warn",
    },
  );
  logForDiagnosticsNoPII("warn", "skill_hooks_do_not_fit", {
    reason: unfitReason,
  });
  try {
    getPluginHookRunner()?.skillHooksDoNotFit(source);
  } catch (error) {
    logForDebugging(
      `Hooks: the plugin hook runner threw when told of a skill whose hooks do not fit (${errorMessage(error)}): the host's log line is lost`,
      {
        level: "warn",
      },
    );
  }
  return unfitReason;
}
//@ chunk-3g0djq3w.js:4926-5357 fingerprint (2.1.88 match: registerSkillHooks, 0.79)
/**
 * 把 skill frontmatter 的 hooks 注册为会话钩子（带 skillRoot）；once 钩子成功后自动移除。
 */
function registerSkillHooks(
  setAppState,
  sessionId,
  hooks,
  skillName,
  skillRoot,
  personal = false,
  checkout = false,
  commandRepository,
) {
  tagHooksWithSource(hooks, commandRepository);
  let registeredCount = 0;
  for (let eventName of HOOK_EVENTS) {
    let matchers = hooks[eventName];
    if (!matchers) continue;
    for (let matcher of matchers)
      for (let hook of matcher.hooks) {
        let onHookSuccess = hook.once
          ? () => {
              logForDebugging(`Removing one-shot hook for event ${eventName} in skill '${skillName}'`);
              setAppState.remove(sessionId, eventName, hook, {
                skillRoot,
              });
            }
          : undefined;
        setAppState.add(sessionId, eventName, matcher.matcher || "", hook, {
          onHookSuccess,
          skillRoot,
          personal,
          checkout,
        });
        registeredCount++;
      }
  }
  if (registeredCount > 0) {
    if (skillRoot !== undefined) getPluginHookRunner()?.skillHooksRegistered(skillRoot, hooks);
    logForDebugging(`Registered ${registeredCount} hooks from skill '${skillName}'`);
  }
}
export { checkSkillHooksFit, registerSkillHooks, SKILL_HOOKS_NOT_REGISTERED_TEXT };
