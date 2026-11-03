/**
 * utils/_new/cleanup.helpers-23fm.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-23fm9f0d.js (5)
 * attribution: sole-consumer-new 5
 */
import { join, join as join_2, join as join_3 } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { createJsonStore } from "../jsonStore.js";

//@ chunk-23fm9f0d.js:2482-2525 sole-consumer-new
var MCP_SKILL_ARCHIVES = "mcp-skill-archives",
  META_JSON = "meta.json";
//@ chunk-23fm9f0d.js:2525-2590 sole-consumer-new
var Ne = DoctorLazy(() => u({ uri: o().optional(), cacheKey: o(), fetchedAt: E() }));
//@ chunk-23fm9f0d.js:2590-2679 sole-consumer-new
function Le(e) {
  return createJsonStore(join_2(e, META_JSON), () => Ne().nullable(), { defaultValue: null, ensureDir: !0 });
}
//@ chunk-23fm9f0d.js:2679-2711 sole-consumer-new
var fe = 64,
  Be = 16,
  $r = fe + 2 + fe + 2 + Be;
//@ chunk-23fm9f0d.js:2711-2781 sole-consumer-new
async function me(e) {
  try {
    return await Le(e).read();
  } catch {
    return null;
  }
}

export { MCP_SKILL_ARCHIVES, me };
