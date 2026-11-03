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
import { u, o, pe, oe } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-4pc1m5n9.js:4092-4155 callgraph-fingerprint = RemoteManagedSettingsResponseSchema (0.502)
var RemoteManagedSettingsResponseSchema = DoctorLazy(() =>
  u({ uuid: o(), checksum: o(), settings: pe(o(), oe()) }),
);

export { RemoteManagedSettingsResponseSchema };
