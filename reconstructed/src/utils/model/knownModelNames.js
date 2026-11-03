/**
 * utils/model/knownModelNames.ts
 *
 * 2.1.316 新增。已知模型名集合，用于遥测脱敏与目录种子。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (4)
 * attribution: placement 4
 */
import { CLAUDE_MODEL_PREFIX } from "./modelAllowlist.js";
import { VERSIONED_MODEL_RE } from "../toolErrors.js";
import { LEGACY_MODEL_IDS } from "./modelIds.js";
import { BAKED_MODEL_CATALOG } from "./modelCatalog.js";
import { bedrockRegionVariants } from "./bedrock.js";

//@ chunk-aepeg2w5.js:135419-135514 placement
/**
 * "claude-" 后跟版本形式时返回去前缀部分，否则 undefined。auto 名 familyHasSpecificEntries 不准确。
 */
function stripClaudePrefixIfVersioned(e) {
  if (!e.startsWith(CLAUDE_MODEL_PREFIX)) return;
  let sliced = e.slice(CLAUDE_MODEL_PREFIX.length);
  return VERSIONED_MODEL_RE.test(sliced) ? sliced : undefined;
}
//@ chunk-aepeg2w5.js:135514-135782 placement
/**
 * 已知模型名：别名列表 + catalog 每个模型 id 与各提供商 id（bedrock 展开区域前缀），再加去 claude- 前缀的形式。
 */
function collectKnownModelNames() {
  let e = [...LEGACY_MODEL_IDS];
  for (let model of BAKED_MODEL_CATALOG.models) {
    e.push(model.id);
    for (let [key, value] of Object.entries(model.provider_ids)) {
      if (typeof value !== "string" || value === "") continue;
      if (key === "bedrock") e.push(...bedrockRegionVariants(value));
      else e.push(value);
    }
  }
  for (let n of [...e]) {
    let r = stripClaudePrefixIfVersioned(n);
    if (r !== undefined) e.push(r);
  }
  return e;
}
//@ chunk-aepeg2w5.js:135782-135817 placement
/**
 * 已知模型名集合；同句 ID 是匹配结尾 [1m] 的正则。
 */
var KNOWN_MODEL_NAMES = new Set(collectKnownModelNames());
var ONE_M_SUFFIX_RE = /\[1m\]$/i;
//@ chunk-aepeg2w5.js:135817-135864 placement
/**
 * 去掉 [1m] 后是否在已知模型名中。
 */
function isKnownModelName(e) {
  return KNOWN_MODEL_NAMES.has(e.replace(ONE_M_SUFFIX_RE, ""));
}
export { isKnownModelName };
