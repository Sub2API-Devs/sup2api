/**
 * plugins/functionHooks/devModsName.ts
 *
 * dev-mods 名称常量（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0v1sxpgs.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";

//@ chunk-0v1sxpgs.js:255-286 placement
/**
 * <配置目录>/dev-mods
 */
var devModsDir = () => join(getClaudeConfigDir(), "dev-mods");
export { devModsDir };
