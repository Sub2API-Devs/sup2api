/**
 * services/gateway/_new/findCatalogRowIdByWireId.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (1)
 * attribution: sole-consumer-new 1
 */
import { Uc, getEffectiveServedCatalog, Yte } from "../../../utils/model/modelCatalog/servedCatalog.js";
import { getProviderState } from "../../../utils/model/providerCaches.js";
import { getCatalogState } from "../../../utils/model/modelCatalog.js";
import { catalogModels } from "../../../utils/model/providers.js";
import { getProviderWireIdVariants } from "../../../utils/betas.js";
import { normalizeModelId } from "../../../utils/model/modelCatalog/catalogEntries.js";
import { isKnownCatalogModelId } from "../../../utils/model/modelCatalog/catalogSeed.js";

/**
 * 非 firstParty/gateway 提供商下，按模型目录把各行的线上模型 id（含 Bedrock 区域前缀变体）映射回目录行 id，带缓存。
 */
//@ chunk-aepeg2w5.js:218511-219037 sole-consumer-new
function findCatalogRowIdByWireId(e, { provider: provider, generation: generation, wireIdOf: wireIdOf }) {
  if (Uc(provider)) return;
  let h = getEffectiveServedCatalog();
  if (h === null) return;
  let y = getProviderState(),
    w = getCatalogState().modelKnowledge?.settingsGeneration(),
    publishedWireIds = y.publishedWireIds;
  if (
    publishedWireIds?.catalog !== h ||
    publishedWireIds.generation !== generation ||
    publishedWireIds.settingsGeneration !== w
  ) {
    let x = new Map();
    ((publishedWireIds = { catalog: h, generation: generation, settingsGeneration: w, rowIdByWireId: x }),
      (y.publishedWireIds = publishedWireIds));
    for (let P of catalogModels(h)) {
      if (Yte(P.id) !== void 0) continue;
      let F = wireIdOf(P);
      if (F === void 0) continue;
      for (let L of getProviderWireIdVariants(F, provider)) {
        let G = normalizeModelId(L);
        if (!x.has(G) && !isKnownCatalogModelId(L)) x.set(G, P.id);
      }
    }
  }
  return publishedWireIds.rowIdByWireId.get(normalizeModelId(e));
}

export { findCatalogRowIdByWireId };
