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
import { yn, Wp, Uu, getBestAvailableAlias } from "./model.js";
import { getDefaultSonnetBuiltin } from "./modelOptions.js";
import { zp, isOpusFableAdvisorSetting } from "./planModeModel.js";

/**
 * 别名的内置默认模型（不看 ANTHROPIC_DEFAULT_*_MODEL）：opus→opus 档默认（catalog aliases.opus，第一方 claude-opus-5-5）、sonnet/opusplan→sonnet 档、haiku→haiku 档、fable→fable 档、best→catalog best 族（fable，可用时）否则 opus；非别名返回 null。旧版名 MODEL_ALIASES（常量）为错配。
 */
//@ chunk-aepeg2w5.js:454481-454751 fingerprint = MODEL_ALIASES (0.71)
function resolveBuiltinAlias(e) {
  let n = getRawModelStrings();
  switch (e) {
    case "opus":
      return yn(n);
    case "sonnet":
      return getDefaultSonnetBuiltin(n);
    case "haiku":
      return zp(n);
    case "fable":
      return Wp(n);
    case "opusplan":
      return getDefaultSonnetBuiltin(n);
    case "best": {
      let r = Uu[getBestAvailableAlias()];
      return r !== void 0 ? r.builtinDefault(n) : yn(n);
    }
    default:
      return isOpusFableAdvisorSetting(e) ? yn(n) : null;
  }
}

export { resolveBuiltinAlias };
