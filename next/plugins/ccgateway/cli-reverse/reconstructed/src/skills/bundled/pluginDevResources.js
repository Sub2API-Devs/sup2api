/**
 * skills/bundled/pluginDevResources.ts
 *
 * 2.1.316 新增：插件开发相关内置技能的参考资源（组件模式、示例插件、MCP 服务器、搜索策略）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4vbvjchj.js (8)
 * attribution: placement 8
 */
import __cc_resource_0 from "../../../assets/component-schemas-7fabf82f.md.zst" with { type: "file" };
import __cc_resource_1 from "../../../assets/example-plugins-9n8v6pe1.md" with { type: "text" };
import __cc_resource_2 from "../../../assets/mcp-servers-chmkz450.md" with { type: "text" };
import __cc_resource_3 from "../../../assets/search-strategies-4qam2bp6.md" with { type: "text" };
import __cc_resource_4 from "../../../assets/SKILL-a71d0623.md.zst" with { type: "file" };
import { readEmbeddedTextSync } from "../../utils/embeddedAssets.js";

//@ chunk-4vbvjchj.js:675-697 placement
var componentSchemasPath = __cc_resource_0;
//@ chunk-4vbvjchj.js:697-729 placement
var referencesComponentSchemas = readEmbeddedTextSync(componentSchemasPath, import.meta.dirname);
//@ chunk-4vbvjchj.js:729-751 placement
var referencesExamplePlugins = __cc_resource_1;
//@ chunk-4vbvjchj.js:751-773 placement
var referencesMcpServers = __cc_resource_2;
//@ chunk-4vbvjchj.js:773-795 placement
var referencesSearchStrategies = __cc_resource_3;
//@ chunk-4vbvjchj.js:795-817 placement
var skillPath = __cc_resource_4;
//@ chunk-4vbvjchj.js:817-849 placement
var skill = readEmbeddedTextSync(skillPath, import.meta.dirname);
//@ chunk-4vbvjchj.js:849-997 placement
var PLUGIN_DEV_SKILL_MD = skill;
var PLUGIN_DEV_REFERENCE_FILES = {
  "references/component-schemas.md": referencesComponentSchemas,
  "references/example-plugins.md": referencesExamplePlugins,
  "references/mcp-servers.md": referencesMcpServers,
  "references/search-strategies.md": referencesSearchStrategies,
};
export { PLUGIN_DEV_REFERENCE_FILES, PLUGIN_DEV_SKILL_MD };
