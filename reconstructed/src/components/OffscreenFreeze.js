/**
 * components/OffscreenFreeze.tsx
 *
 * 离屏冻结：内容滚出视口后停止重渲染。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/OffscreenFreeze.tsx
 * pieces: chunk-gwvwj681.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { string, array, zodStrictObject } from "../../vendor/zod/v4/classic/schemas.js";
import { ANTHROPIC_FILEINPUTS } from "../services/mcpServe/fileInputs.js";

//@ chunk-gwvwj681.js:6507-6530 placement
var offscreenFreezeSlot = new SessionRootSlot(() => ({}));
//@ chunk-gwvwj681.js:6530-6678 placement
var identifierNameSchema = DoctorLazy(() =>
  string()
    .regex(/^[A-Za-z_][A-Za-z0-9_]{0,31}$/)
    .refine((e) => !(e in Object.prototype)),
);
var bindingSpecSchema = DoctorLazy(() =>
  array(
    zodStrictObject({
      arg: identifierNameSchema(),
      local: identifierNameSchema(),
      ref: identifierNameSchema(),
    }),
  ).length(1),
);
//@ chunk-gwvwj681.js:6678-6801 fingerprint = OffscreenFreeze (0.408)
function OffscreenFreeze(meta) {
  let n = bindingSpecSchema().safeParse(meta?.[ANTHROPIC_FILEINPUTS]);
  if (!n.success) return;
  let [i] = n.data;
  return i !== undefined && i.local !== i.ref ? i : undefined;
}
export { OffscreenFreeze, offscreenFreezeSlot };
