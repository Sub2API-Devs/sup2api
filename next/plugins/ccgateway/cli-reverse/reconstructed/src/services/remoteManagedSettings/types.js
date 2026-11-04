/**
 * services/remoteManagedSettings/types.ts
 *
 * 远程托管设置响应的 zod schema。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/remoteManagedSettings/types.ts
 * pieces: chunk-4pc1m5n9.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, record, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-4pc1m5n9.js:4092-4155 callgraph-fingerprint (2.1.88 match: RemoteManagedSettingsResponseSchema, 0.502)
var RemoteManagedSettingsResponseSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4pc1m5n9.js:4092", () => {
  RemoteManagedSettingsResponseSchema = DoctorLazy(() =>
    objectSchema({
      uuid: stringSchema(),
      checksum: stringSchema(),
      settings: record(stringSchema(), unknown()),
    }),
  );
});
export { RemoteManagedSettingsResponseSchema };
