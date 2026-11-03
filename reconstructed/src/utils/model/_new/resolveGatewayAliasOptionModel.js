/**
 * utils/model/_new/resolveGatewayAliasOptionModel.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (2)
 * attribution: sole-consumer-new 2
 */
import { Lt, I_ } from "../modelIds.js";
import { usesFirstPartyModelIds } from "../providers.js";
import {
  newestAllowedInFamily,
  isModelAllowed,
  isModelAllowlistInactive,
  getModelEntitlementDenySet,
} from "../modelAllowlist.js";
import {
  shouldProbeThirdPartyDefaults,
  shouldProbeThirdPartyDefaultsAlt,
} from "../thirdPartyModelDefaults.js";
import { opus1mMergeAddsTagTo } from "../modelDisplay.js";
import { eligible1mSuffixTarget } from "../defaultModel.js";
import { getCanonicalName } from "../canonicalModelName.js";
import { buildModelOptionForId, recordDroppedModelOption } from "../modelOptions.js";

/**
 * 网关环境下把别名型 /model 选项解析成具体模型 id（必要时加 [1m]）；与其他选项重复或不可用时返回 null。
 */
//@ chunk-hwmsct5x.js:221128-221595 sole-consumer-new
function resolveGatewayAliasOptionModel(e, n, r) {
  if (typeof n.value !== "string") return (r?.(), null);
  let s = Lt(n.value);
  if (!I_(s) || !usesFirstPartyModelIds()) return (r?.(), null);
  let h = newestAllowedInFamily(s);
  if (h === null) return (r?.(), null);
  let y = n.value !== s,
    w =
      s === "opus"
        ? shouldProbeThirdPartyDefaults()
        : s === "sonnet"
          ? shouldProbeThirdPartyDefaultsAlt()
          : !0,
    E = (y || (s === "opus" && opus1mMergeAddsTagTo(h))) && w && eligible1mSuffixTarget(h) ? `${h}[1m]` : h,
    R = getCanonicalName(h, { identity: !0 }),
    L = E !== h;
  if (
    e.some(
      (O) =>
        O !== n &&
        O.value !== null &&
        (Lt(O.value) !== O.value) === L &&
        getCanonicalName(Lt(O.value), { identity: !0 }) === R &&
        isModelAllowed(O.value),
    )
  )
    return null;
  if (buildModelOptionForId(E) === null) return (r?.(), null);
  return E;
}
/**
 * 遍历 /model 选项：网关下别名选项替换成解析出的具体模型选项并去重；非网关原样返回。
 */
//@ chunk-hwmsct5x.js:221595-221838 sole-consumer-new
function expandGatewayAliasOptions(e, n) {
  if (isModelAllowlistInactive()) return e;
  let r = getModelEntitlementDenySet(),
    s = new Set();
  return e.flatMap((h) => {
    if (h.value === null || isModelAllowed(h.value)) return [h];
    let y = h.value,
      w = resolveGatewayAliasOptionModel(e, h, () => recordDroppedModelOption(n, y, r));
    if (w === null || s.has(w)) return [];
    let S = buildModelOptionForId(w);
    if (S === null) return [];
    return (s.add(w), [S]);
  });
}

export { expandGatewayAliasOptions, resolveGatewayAliasOptionModel };
