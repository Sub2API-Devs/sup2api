/**
 * bridge/deviceBindingState.ts
 *
 * 2.1.316 新增：设备绑定状态的解析与合法值判断
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xfkf9vr6.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { union, u, literal, string } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-xfkf9vr6.js:268-340 placement
var deviceBindingStateSchema = DoctorLazy(() =>
  union([
    u({
      v: literal(1),
      state: string(),
    }),
    u({
      v: literal(2),
      engine: literal("bridge"),
    }),
  ]),
);
//@ chunk-xfkf9vr6.js:340-641 placement
function deviceBindingState(toolHostStatus, deviceBindPosture) {
  if (toolHostStatus === undefined || toolHostStatus === null)
    return typeof deviceBindPosture === "object" && deviceBindPosture !== null ? "none" : "unstated";
  let t = deviceBindingStateSchema().safeParse(toolHostStatus);
  if (!t.success) return "unreadable";
  if (t.data.v === 2) return "bridge";
  switch (t.data.state) {
    case "connected":
    case "requested":
    case "detached":
      return t.data.state;
    default:
      return "other_state";
  }
}
//@ chunk-xfkf9vr6.js:641-708 placement
function isKnownBindingState(toolHostLink) {
  return toolHostLink === "none" || toolHostLink === "bridge" || toolHostLink === "this_helper";
}
export { isKnownBindingState, deviceBindingState };
