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

//@ chunk-aepeg2w5.js:454481-454751 fingerprint (2.1.88 match: MODEL_ALIASES, 0.71)
/**
 * 别名的内置默认模型（不看 ANTHROPIC_DEFAULT_*_MODEL）：opus→opus 档默认（catalog aliases.opus，第一方 claude-opus-5-5）、sonnet/opusplan→sonnet 档、haiku→haiku 档、fable→fable 档、best→catalog best 族（fable，可用时）否则 opus；非别名返回 null。旧版名 MODEL_ALIASES（常量）为错配。
 */
function resolveBuiltinAlias(alias) {
  let modelStrings = getRawModelStrings();
  switch (alias) {
    case "opus":
      return getDefaultOpusBuiltin(modelStrings);
    case "sonnet":
      return getDefaultSonnetBuiltin(modelStrings);
    case "haiku":
      return defaultHaikuModel(modelStrings);
    case "fable":
      return getDefaultFableBuiltin(modelStrings);
    case "opusplan":
      return getDefaultSonnetBuiltin(modelStrings);
    case "best": {
      let family = FAMILY_AVAILABILITY[getBestAvailableAlias()];
      return family !== undefined ? family.builtinDefault(modelStrings) : getDefaultOpusBuiltin(modelStrings);
    }
    default:
      return isOpusFableAdvisorSetting(alias) ? getDefaultOpusBuiltin(modelStrings) : null;
  }
}
export { resolveBuiltinAlias };
