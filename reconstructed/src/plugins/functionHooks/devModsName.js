/**
 * plugins/functionHooks/devModsName.ts
 *
 * dev-mods 名称常量（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2m7wmh13.js (1)
 * attribution: placement 1
 */
import { join } from "path";
import { getClaudeConfigDir } from "../../utils/envUtils.js";

//@ chunk-2m7wmh13.js:255-286 placement
/**
 * <配置目录>/dev-mods
 */
var devModsDir = () => join(getClaudeConfigDir(), "dev-mods");
export { devModsDir };
