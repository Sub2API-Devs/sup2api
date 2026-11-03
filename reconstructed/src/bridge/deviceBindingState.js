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
import { Ue, u, T, o } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-xfkf9vr6.js:268-340 placement
var r = DoctorLazy(() => Ue([u({ v: T(1), state: o() }), u({ v: T(2), engine: T("bridge") })]));
//@ chunk-xfkf9vr6.js:340-641 placement
function deviceBindingState(e, n) {
  if (e === void 0 || e === null) return typeof n === "object" && n !== null ? "none" : "unstated";
  let safeParse = r().safeParse(e);
  if (!safeParse.success) return "unreadable";
  if (safeParse.data.v === 2) return "bridge";
  switch (safeParse.data.state) {
    case "connected":
    case "requested":
    case "detached":
      return safeParse.data.state;
    default:
      return "other_state";
  }
}
//@ chunk-xfkf9vr6.js:641-708 placement
function isKnownBindingState(e) {
  return e === "none" || e === "bridge" || e === "this_helper";
}

export { isKnownBindingState, deviceBindingState };
