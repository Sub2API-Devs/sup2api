/**
 * bridge/deviceBindingState.ts
 *
 * 2.1.316 新增：设备绑定状态的解析与合法值判断
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rvwc68ta.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { union, objectSchema, literal, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-rvwc68ta.js:268-340 placement
var deviceBindingStateSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rvwc68ta.js:268", () => {
  deviceBindingStateSchema = DoctorLazy(() =>
    union([
      objectSchema({
        v: literal(1),
        state: stringSchema(),
      }),
      objectSchema({
        v: literal(2),
        engine: literal("bridge"),
      }),
    ]),
  );
});
//@ chunk-rvwc68ta.js:340-641 placement
function deviceBindingState(toolHostStatus, deviceBindPosture) {
  if (toolHostStatus === undefined || toolHostStatus === null)
    return typeof deviceBindPosture === "object" && deviceBindPosture !== null ? "none" : "unstated";
  let parsed = deviceBindingStateSchema().safeParse(toolHostStatus);
  if (!parsed.success) return "unreadable";
  if (parsed.data.v === 2) return "bridge";
  switch (parsed.data.state) {
    case "connected":
    case "requested":
    case "detached":
      return parsed.data.state;
    default:
      return "other_state";
  }
}
//@ chunk-rvwc68ta.js:641-708 placement
function isKnownBindingState(toolHostLink) {
  return toolHostLink === "none" || toolHostLink === "bridge" || toolHostLink === "this_helper";
}
export { deviceBindingState, isKnownBindingState };
