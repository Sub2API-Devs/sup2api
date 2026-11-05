/**
 * tools/REPLTool/preludes.ts
 *
 * REPL 脚本预置资源 shell.prelude.js 的引用（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (5), chunk-vn9gygmp.js (2)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import __cc_resource_0 from "../../../assets/running.prelude.js-gamvqz19.txt" with { type: "text" };
import __cc_resource_1 from "../../../assets/file.prelude.js-234qxsta.txt" with { type: "text" };
import __cc_resource_2 from "../../../assets/team.prelude.js-jyv8vsvj.txt" with { type: "text" };
import __cc_resource_0_9 from "../../../assets/shell.prelude.js-9a575786.txt.zst" with { type: "file" };
import { readEmbeddedTextSync } from "../../utils/embeddedAssets.js";

//@ chunk-n51jggtb.js:72481-72504 placement
/**
 * running.prelude 资源引用。
 */
var RESOURCE_0 = __cc_resource_0;
//@ chunk-n51jggtb.js:72504-72514 placement
/**
 * running prelude 的导出别名。
 */
var RESOURCE_0_ALIAS = RESOURCE_0;
//@ chunk-n51jggtb.js:72674-72697 placement
/**
 * file.prelude 资源引用。
 */
var RESOURCE_1_ALIAS = __cc_resource_1;
//@ chunk-n51jggtb.js:73250-73260 placement
/**
 * file prelude 的导出别名。
 */
var REPL_RESOURCE_0 = RESOURCE_1_ALIAS;
//@ chunk-n51jggtb.js:76333-76356 placement
/**
 * team.prelude 资源引用。
 */
var TEAM_PRELUDE = __cc_resource_2;
//@ chunk-vn9gygmp.js:315-337 placement
var resource0 = __cc_resource_0_9;
//@ chunk-vn9gygmp.js:337-369 placement
/**
 * 内嵌资源 shell.prelude.js 的路径解析结果（默认导出）。
 */
var text = readEmbeddedTextSync(resource0, import.meta.dirname);
export { TEAM_PRELUDE, REPL_RESOURCE_0, RESOURCE_0_ALIAS, text };
