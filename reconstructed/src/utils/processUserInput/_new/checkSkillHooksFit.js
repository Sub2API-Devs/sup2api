/**
 * utils/processUserInput/_new/checkSkillHooksFit.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3g0djq3w.js (2)
 * attribution: sole-consumer-new 2
 */
import { jsonStringify } from "../../slowOperations.js";
import { computeContentHash } from "../../commitAttribution.js";
import { k6r, v6r } from "../../hooks/matcherGrammar.js";
import { getPluginHookRunner } from "../../../bootstrap/state.js";
import { logEvent } from "../../../services/analytics/index.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../../debug.js";
import { logForDiagnosticsNoPII } from "../../diagLogs.js";
import { errorMessage } from "../../errors.js";

/**
 * 技能钩子超限常量：记录上限与告诉模型钩子未注册的说明。
 */
//@ chunk-3g0djq3w.js:3289-3650 sole-consumer-new
var MAX_UNFIT_TEXTS = 64,
  yt =
    "This skill declares hooks, and they were not registered in this session: a limit on hooks, a matcher that cannot be tested here, or the organization's policy kept them out. The tools that its allowed-tools would grant were not granted either. If the skill relies on its hooks to check or block tool calls, nothing checks them now: tell the user.";
/**
 * 检查技能声明的钩子是否在同一来源的预算内（钩子数、matcher 字符数、可测试性）；超出时不注册钩子并返回原因。
 */
//@ chunk-3g0djq3w.js:3650-4926 sole-consumer-new
function checkSkillHooksFit(e, n, o, u, s, T) {
  let skillDraws = e.skillDraws(n);
  if (skillDraws === void 0) return;
  let sourceDraws = skillDraws.get(u ?? o) ?? { hooks: 0, characters: 0, texts: new Map(), unfitTexts: 0 };
  skillDraws.set(u ?? o, sourceDraws);
  let y = jsonStringify([s, computeContentHash(jsonStringify(T))]);
  if (sourceDraws.texts.has(y)) return sourceDraws.texts.get(y);
  let hooksAsked = 0,
    charactersAsked = 0;
  for (let H of Object.values(T).flatMap((D) => D ?? [])) {
    let max = Math.max(1, H.hooks.length);
    ((hooksAsked += max), (charactersAsked += (H.matcher?.length ?? 0) * max));
  }
  let unfitReason;
  if (sourceDraws.characters + charactersAsked > k6r) unfitReason = "characters";
  else if (sourceDraws.hooks + hooksAsked > v6r) unfitReason = "count";
  else if (getPluginHookRunner()?.testsSkillMatchers(T) === !1) unfitReason = "matcher";
  if (unfitReason !== void 0) {
    if (sourceDraws.unfitTexts === MAX_UNFIT_TEXTS) return unfitReason;
    sourceDraws.unfitTexts++;
  }
  if (
    (sourceDraws.texts.set(y, unfitReason),
    logEvent("tengu_skill_hooks_bounds_checked", {
      outcome: fromEnum(unfitReason ?? "fits"),
      source_kind: fromEnum(o),
      hooks_asked: hooksAsked,
      characters_asked: charactersAsked,
      hooks_drawn_before: sourceDraws.hooks,
      characters_drawn_before: sourceDraws.characters,
      hooks_bound: v6r,
      characters_bound: k6r,
    }),
    unfitReason === void 0)
  ) {
    ((sourceDraws.hooks += hooksAsked), (sourceDraws.characters += charactersAsked));
    return;
  }
  (logForDebugging(
    `Skill '${s}' registers none of its hooks and grants no tools (${unfitReason}): the skills of one source hold at most ${v6r} hooks and ${k6r} characters of matchers in a session, and a cloud session tests some matchers only`,
    { level: "warn" },
  ),
    logForDiagnosticsNoPII("warn", "skill_hooks_do_not_fit", { reason: unfitReason }));
  try {
    getPluginHookRunner()?.skillHooksDoNotFit(o);
  } catch (error) {
    logForDebugging(
      `Hooks: the plugin hook runner threw when told of a skill whose hooks do not fit (${errorMessage(error)}): the host's log line is lost`,
      { level: "warn" },
    );
  }
  return unfitReason;
}

export { checkSkillHooksFit, yt };
