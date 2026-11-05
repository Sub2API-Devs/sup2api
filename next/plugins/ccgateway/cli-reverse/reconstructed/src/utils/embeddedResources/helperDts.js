/**
 * utils/embeddedResources/helperDts.ts
 *
 * 内嵌的 bash/PowerShell/team helper 类型声明资源路径表（core.*.d.ts、team.*.d.ts）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ba67dbvd.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import __cc_resource_0 from "../../../assets/core.bash.async.d.ts-a6e9688e.txt.zst" with { type: "file" };
import __cc_resource_1 from "../../../assets/core.bash.sync.d.ts-84d57078.txt.zst" with { type: "file" };
import __cc_resource_2 from "../../../assets/core.powershell.async.d.ts-8a8d72fb.txt.zst" with { type: "file" };
import __cc_resource_3 from "../../../assets/core.powershell.sync.d.ts-93f6616d.txt.zst" with { type: "file" };
import __cc_resource_4 from "../../../assets/team.async.d.ts-t0nj35ss.txt" with { type: "text" };
import __cc_resource_5 from "../../../assets/team.sync.d.ts-w4kr6kyy.txt" with { type: "text" };
import { readEmbeddedTextSync } from "../embeddedAssets.js";

//@ chunk-ba67dbvd.js:811-833 placement
var embeddedResource0 = __cc_resource_0;
//@ chunk-ba67dbvd.js:833-865 placement
var embeddedText0 = readEmbeddedTextSync(embeddedResource0, import.meta.dirname);
//@ chunk-ba67dbvd.js:865-887 placement
var embeddedResource1 = __cc_resource_1;
//@ chunk-ba67dbvd.js:887-919 placement
var embeddedText1 = readEmbeddedTextSync(embeddedResource1, import.meta.dirname);
//@ chunk-ba67dbvd.js:919-941 placement
var embeddedResource2 = __cc_resource_2;
//@ chunk-ba67dbvd.js:941-973 placement
var embeddedText2 = readEmbeddedTextSync(embeddedResource2, import.meta.dirname);
//@ chunk-ba67dbvd.js:973-995 placement
var embeddedResource3 = __cc_resource_3;
//@ chunk-ba67dbvd.js:995-1027 placement
var embeddedText3 = readEmbeddedTextSync(embeddedResource3, import.meta.dirname);
//@ chunk-ba67dbvd.js:1027-1049 placement
var embeddedResource4 = __cc_resource_4;
//@ chunk-ba67dbvd.js:1049-1071 placement
var embeddedResource5 = __cc_resource_5;
//@ chunk-ba67dbvd.js:1071-1158 placement
/**
 * 按 core/team 与 shell 类型组织的 helper .d.ts 资源路径总表。
 */
var EMBEDDED_SCRIPTS = {
  core: {
    bash: {
      async: embeddedText0,
      sync: embeddedText1,
    },
    powershell: {
      async: embeddedText2,
      sync: embeddedText3,
    },
  },
  team: {
    async: embeddedResource4,
    sync: embeddedResource5,
  },
};
export { EMBEDDED_SCRIPTS };
