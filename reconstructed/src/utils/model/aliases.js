/**
 * utils/model/aliases.ts
 *
 * 模型别名（opus/sonnet/haiku/fable/opusplan/best）到具体模型 id 的内置默认映射。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/aliases.ts
 * pieces: chunk-aepeg2w5.js (1)
 * attribution: fingerprint 1
 */
import { getRawModelStrings } from "./modelStrings.js";
import {
  getDefaultOpusBuiltin,
  getDefaultFableBuiltin,
  FAMILY_AVAILABILITY,
  getBestAvailableAlias,
} from "./model.js";
import { getDefaultSonnetBuiltin } from "./modelOptions.js";
import { defaultHaikuModel, isOpusFableAdvisorSetting } from "./planModeModel.js";

//@ chunk-aepeg2w5.js:454481-454751 fingerprint = MODEL_ALIASES (0.71)
/**
 * 别名的内置默认模型（不看 ANTHROPIC_DEFAULT_*_MODEL）：opus→opus 档默认（catalog aliases.opus，第一方 claude-opus-5-5）、sonnet/opusplan→sonnet 档、haiku→haiku 档、fable→fable 档、best→catalog best 族（fable，可用时）否则 opus；非别名返回 null。旧版名 MODEL_ALIASES（常量）为错配。
 */
function resolveBuiltinAlias(e) {
  let rawModelStrings = getRawModelStrings();
  switch (e) {
    case "opus":
      return getDefaultOpusBuiltin(rawModelStrings);
    case "sonnet":
      return getDefaultSonnetBuiltin(rawModelStrings);
    case "haiku":
      return defaultHaikuModel(rawModelStrings);
    case "fable":
      return getDefaultFableBuiltin(rawModelStrings);
    case "opusplan":
      return getDefaultSonnetBuiltin(rawModelStrings);
    case "best": {
      let r = FAMILY_AVAILABILITY[getBestAvailableAlias()];
      return r !== undefined ? r.builtinDefault(rawModelStrings) : getDefaultOpusBuiltin(rawModelStrings);
    }
    default:
      return isOpusFableAdvisorSetting(e) ? getDefaultOpusBuiltin(rawModelStrings) : null;
  }
}
export { resolveBuiltinAlias };
