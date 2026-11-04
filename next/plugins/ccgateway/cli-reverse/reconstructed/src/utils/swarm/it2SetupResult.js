/**
 * utils/swarm/it2SetupResult.ts
 *
 * 2.1.316 新增：iTerm2 设置结果
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yddynw6k.js (1)
 * attribution: placement 1
 */
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, booleanSchema, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-yddynw6k.js:301-444 placement
var IT2_SETUP_DIALOG; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-yddynw6k.js:301", () => {
  IT2_SETUP_DIALOG = withHideWhile({
    kind: "it2_setup",
    payload: DoctorLazy(() =>
      objectSchema({
        tmuxAvailable: booleanSchema(),
      }),
    ),
    result: DoctorLazy(() => _enum(["installed", "use-tmux", "cancelled"])),
    default: "cancelled",
  });
});
export { IT2_SETUP_DIALOG };
