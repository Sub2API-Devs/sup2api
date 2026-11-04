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
import { secondArgument, ENVIRONMENT_DEDUP_SEPARATOR } from "../utils/contextAttachments/environment.js";
import {
  resolvePromptSection,
  noteSectionAnswer,
  sectionIdOf,
} from "../plugins/functionHooks/promptComposition.js";

//@ chunk-e6aww6q8.js:104482-104539 fingerprint (2.1.88 match: systemPromptSection, 1)
/**
 * 定义一个可缓存的系统提示词分段 {name, compute, cacheBreak:false}；同名段在会话内只计算一次（bootstrap promptAssembly 缓存）。
 */
function systemPromptSection(name, compute) {
  return {
    name,
    compute,
    cacheBreak: false,
  };
}
//@ chunk-e6aww6q8.js:104566-104733 placement
async function computeAndCacheSection(
  name,
  compute,
  { epoch = getSystemPromptSectionEpoch(), sentAs = secondArgument } = {},
) {
  let body = await name.compute();
  let promptSection = await resolvePromptSection(compute, body);
  if (getSystemPromptSectionEpoch() === epoch) {
    setSystemPromptSectionCacheEntry(name.name, promptSection);
    noteSectionAnswer(name.name, sentAs(name.name, body), sentAs(name.name, promptSection));
  }
  return promptSection;
}
//@ chunk-e6aww6q8.js:104733-105000 placement
/**
 * 解析系统提示词分段：未要求打破缓存且已缓存的直接复用，否则计算（可选写入缓存并记录发送形式）。疑似放错文件：属系统提示词分段缓存而非环境附件。
 */
async function resolveSystemPromptSections(
  sections,
  { isStored = true, hookOrigin, since, sentAs = secondArgument } = {},
) {
  let cache = getSystemPromptSectionCache();
  return Promise.all(
    sections.map(async (section) => {
      if (!section.cacheBreak && cache.has(section.name)) return cache.get(section.name) ?? null;
      let compute = sectionIdOf(section.name);
      return isStored
        ? computeAndCacheSection(section, compute, {
            epoch: since,
            sentAs,
          })
        : resolvePromptSection(compute, await section.compute(), hookOrigin);
    }),
  );
}
//@ chunk-e6aww6q8.js:105015-105148 placement
/**
 * 取系统提示词分段缓存中的内容，未缓存时计算并写入（按名称与参数组成键）；实为系统提示分段缓存，疑似放错文件。
 */
function cachedSectionFor(compute, epoch) {
  let name = `${compute}${ENVIRONMENT_DEDUP_SEPARATOR}${JSON.stringify(epoch)}`;
  let systemPromptSectionCache = getSystemPromptSectionCache();
  return systemPromptSectionCache.has(name)
    ? Promise.resolve(systemPromptSectionCache.get(name) ?? null)
    : computeAndCacheSection(
        systemPromptSection(name, () => epoch),
        compute,
      );
}
export { cachedSectionFor, resolveSystemPromptSections, systemPromptSection };
