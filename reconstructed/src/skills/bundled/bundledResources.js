/**
 * skills/bundled/bundledResources.ts
 *
 * 2.1.316 新增：内置技能的打包资源引用（__cc_resource_*）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-84d2fjs2.js (2), chunk-cgwxv58n.js (2), chunk-qe856w7f.js (2)
 * attribution: placement 6
 */
import __cc_resource_0_2 from "../../../assets/permissions_external-2ede28fe.txt.zst" with { type: "file" };
import __cc_resource_0 from "../../../assets/SKILL-kyber1ah.md" with { type: "text" };
import __cc_resource_0_3 from "../../../assets/previews.mjs-8fcda441.txt.zst" with { type: "file" };
import { readEmbeddedTextSync } from "../../utils/embeddedAssets.js";

//@ chunk-cgwxv58n.js:319-341 placement
var permissionsExternalPath = __cc_resource_0_2;
//@ chunk-cgwxv58n.js:341-373 placement
/**
 * bundled 技能附带的 permissions-external 资源。
 */
var permissionsExternal = readEmbeddedTextSync(permissionsExternalPath, import.meta.dirname);
//@ chunk-84d2fjs2.js:299-321 placement
var skillText = __cc_resource_0;
//@ chunk-84d2fjs2.js:321-329 placement
/**
 * bundled 技能的 SKILL.md 资源。
 */
var skill = skillText;
//@ chunk-qe856w7f.js:311-333 placement
var previewsPath = __cc_resource_0_3;
//@ chunk-qe856w7f.js:333-365 placement
/**
 * bundled 技能附带的 previews 资源。
 */
var previews = readEmbeddedTextSync(previewsPath, import.meta.dirname);
export { permissionsExternal, previews, skill };
