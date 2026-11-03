/**
 * constants/systemPromptSections.ts
 *
 * 系统提示词分段的定义工厂（name、compute、cacheBreak）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/constants/systemPromptSections.ts
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: fingerprint 1, placement 3
 */
import {
  getSystemPromptSectionEpoch,
  setSystemPromptSectionCacheEntry,
  getSystemPromptSectionCache,
} from "../bootstrap/state.js";
import { kkt, wio } from "../utils/contextAttachments/environment.js";
import { resolvePromptSection, noteSectionAnswer, ile } from "../plugins/functionHooks/promptComposition.js";

/**
 * 定义一个可缓存的系统提示词分段 {name, compute, cacheBreak:false}；同名段在会话内只计算一次（bootstrap promptAssembly 缓存）。
 */
//@ chunk-e6aww6q8.js:104482-104539 fingerprint = systemPromptSection (1)
function systemPromptSection(name, compute) {
  return { name: name, compute: compute, cacheBreak: !1 };
}
//@ chunk-e6aww6q8.js:104566-104733 placement
async function computeAndCacheSection(
  name,
  compute,
  { epoch: r = getSystemPromptSectionEpoch(), sentAs: s = kkt } = {},
) {
  let compute_2 = await name.compute(),
    y = await resolvePromptSection(compute, compute_2);
  if (getSystemPromptSectionEpoch() === r)
    (setSystemPromptSectionCacheEntry(name.name, y),
      noteSectionAnswer(name.name, s(name.name, compute_2), s(name.name, y)));
  return y;
}
/**
 * 解析系统提示词分段：未要求打破缓存且已缓存的直接复用，否则计算（可选写入缓存并记录发送形式）。疑似放错文件：属系统提示词分段缓存而非环境附件。
 */
//@ chunk-e6aww6q8.js:104733-105000 placement
async function resolveSystemPromptSections(
  sections,
  { isStored: n = !0, hookOrigin: r, since: s, sentAs: h = kkt } = {},
) {
  let cache = getSystemPromptSectionCache();
  return Promise.all(
    sections.map(async (S) => {
      if (!S.cacheBreak && cache.has(S.name)) return cache.get(S.name) ?? null;
      let w = ile(S.name);
      return n
        ? computeAndCacheSection(S, w, { epoch: s, sentAs: h })
        : resolvePromptSection(w, await S.compute(), r);
    }),
  );
}
/**
 * 取系统提示词分段缓存中的内容，未缓存时计算并写入（按名称与参数组成键）；实为系统提示分段缓存，疑似放错文件。
 */
//@ chunk-e6aww6q8.js:105015-105148 placement
function cachedSectionFor(e, n) {
  let r = `${e}${wio}${JSON.stringify(n)}`,
    s = getSystemPromptSectionCache();
  return s.has(r)
    ? Promise.resolve(s.get(r) ?? null)
    : computeAndCacheSection(
        systemPromptSection(r, () => n),
        e,
      );
}

export { cachedSectionFor, resolveSystemPromptSections, systemPromptSection };
