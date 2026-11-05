/**
 * services/remoteManagedSettings/types.ts
 *
 * 远程托管设置响应的 zod schema。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/remoteManagedSettings/types.ts
 * pieces: chunk-a28agxjs.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, record, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a28agxjs.js:4101-4164 callgraph-fingerprint (2.1.88 match: RemoteManagedSettingsResponseSchema, 0.502)
var RemoteManagedSettingsResponseSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a28agxjs.js:4101", () => {
  RemoteManagedSettingsResponseSchema = DoctorLazy(() =>
    objectSchema({
      uuid: stringSchema(),
      checksum: stringSchema(),
      settings: record(stringSchema(), unknown()),
    }),
  );
});
export { RemoteManagedSettingsResponseSchema };
