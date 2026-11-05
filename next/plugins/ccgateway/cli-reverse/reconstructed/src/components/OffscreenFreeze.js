/**
 * components/OffscreenFreeze.tsx
 *
 * 离屏冻结：内容滚出视口后停止重渲染。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/OffscreenFreeze.tsx
 * pieces: chunk-dkh1nd34.js (4)
 * attribution: placement 3, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { stringSchema, array, zodStrictObject } from "../../vendor/zod/v4/classic/schemas.js";
import { ANTHROPIC_FILEINPUTS } from "../services/mcpServe/fileInputs.js";

//@ chunk-dkh1nd34.js:339-364 placement
var offscreenFreezeSlot = new SessionRootSlot(() => ({}));
//@ chunk-dkh1nd34.js:364-522 layout
function heldServer(host, client) {
  let serverEntry = host?.servers.get(client.name);
  return serverEntry !== undefined &&
    client.config.type === "http" &&
    client.config.url === serverEntry.url &&
    host?.heldSinceBoot(client.name) === true
    ? serverEntry.server
    : undefined;
}
//@ chunk-dkh1nd34.js:522-670 placement
var identifierNameSchema = DoctorLazy(() =>
  stringSchema()
    .regex(/^[A-Za-z_][A-Za-z0-9_]{0,31}$/)
    .refine((name) => !(name in Object.prototype)),
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
//@ chunk-dkh1nd34.js:670-795 placement
function bindingSpecOf(meta) {
  let parsed = bindingSpecSchema().safeParse(meta?.[ANTHROPIC_FILEINPUTS]);
  if (!parsed.success) return;
  let [binding] = parsed.data;
  return binding !== undefined && binding.local !== binding.ref ? binding : undefined;
}
export { offscreenFreezeSlot, heldServer, bindingSpecOf };
