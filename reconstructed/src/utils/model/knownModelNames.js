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
import { Qs } from "../toolErrors.js";
import { E8 } from "./modelIds.js";
import { BAKED_MODEL_CATALOG } from "./modelCatalog.js";
import { bD } from "./bedrock.js";

/**
 * "claude-" 后跟版本形式时返回去前缀部分，否则 undefined。auto 名 familyHasSpecificEntries 不准确。
 */
//@ chunk-aepeg2w5.js:135419-135514 placement
function stripClaudePrefixIfVersioned(e) {
  if (!e.startsWith(CLAUDE_MODEL_PREFIX)) return;
  let sliced = e.slice(CLAUDE_MODEL_PREFIX.length);
  return Qs.test(sliced) ? sliced : void 0;
}
/**
 * 已知模型名：别名列表 + catalog 每个模型 id 与各提供商 id（bedrock 展开区域前缀），再加去 claude- 前缀的形式。
 */
//@ chunk-aepeg2w5.js:135514-135782 placement
function collectKnownModelNames() {
  let e = [...E8];
  for (let model of BAKED_MODEL_CATALOG.models) {
    e.push(model.id);
    for (let [r, s] of Object.entries(model.provider_ids)) {
      if (typeof s !== "string" || s === "") continue;
      if (r === "bedrock") e.push(...bD(s));
      else e.push(s);
    }
  }
  for (let n of [...e]) {
    let r = stripClaudePrefixIfVersioned(n);
    if (r !== void 0) e.push(r);
  }
  return e;
}
/**
 * 已知模型名集合；同句 ID 是匹配结尾 [1m] 的正则。
 */
//@ chunk-aepeg2w5.js:135782-135817 placement
var KNOWN_MODEL_NAMES = new Set(collectKnownModelNames()),
  ONE_M_SUFFIX_RE = /\[1m\]$/i;
/**
 * 去掉 [1m] 后是否在已知模型名中。
 */
//@ chunk-aepeg2w5.js:135817-135864 placement
function isKnownModelName(e) {
  return KNOWN_MODEL_NAMES.has(e.replace(ONE_M_SUFFIX_RE, ""));
}

export { isKnownModelName };
