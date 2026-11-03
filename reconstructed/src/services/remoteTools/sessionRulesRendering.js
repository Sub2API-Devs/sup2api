/**
 * services/remoteTools/sessionRulesRendering.ts
 *
 * 2.1.316 新增。远程命令渲染时适用的会话规则（anthropic/renderUnderSessionRules）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-phzhvaxm.js (5)
 * attribution: placement 5
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, zodStrictObject, M } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  safeSerializedPermissionContextSchema,
  PV,
} from "../../utils/permissions/permissionContextSerialization.js";
import { addSessionWorkingDirectories } from "../../utils/permissions/PermissionUpdate.js";
import { buildNativeDoctorDiagnostics } from "../../screens/Doctor.js";
import { getOriginalCwd } from "../../bootstrap/state.js";

//@ chunk-phzhvaxm.js:416-458 placement
var ANTHROPIC_RENDERUNDERSESSIONRULES = "anthropic/renderUnderSessionRules";
//@ chunk-phzhvaxm.js:458-506 placement
function rendersUnderSessionRulesCapability() {
  return { experimental: { [ANTHROPIC_RENDERUNDERSESSIONRULES]: { v: 1 } } };
}
//@ chunk-phzhvaxm.js:506-558 placement
var z = DoctorLazy(() => u({ experimental: u({ [ANTHROPIC_RENDERUNDERSESSIONRULES]: u({ v: T(1) }) }) }));
//@ chunk-phzhvaxm.js:558-665 placement
var SESSION_RULES_SCHEMA = DoctorLazy(() =>
  zodStrictObject({
    v: T(1),
    permissionContext: safeSerializedPermissionContextSchema(),
    offersHandOff: M(),
    classifiesEveryCall: M(),
    grantsApply: M(),
  }),
);
/**
 * 远程命令渲染时适用的会话规则（anthropic/renderUnderSessionRules）。
 */
//@ chunk-phzhvaxm.js:665-1254 placement
function applicableSessionRules(r, n, t) {
  let e = PV(r) ? void 0 : SESSION_RULES_SCHEMA().safeParse(r).data;
  if (e === void 0 || n === void 0) return;
  let { mode: mode, ...o } = e.permissionContext;
  if (
    !(
      mode === "default" ||
      mode === "dontAsk" ||
      mode === "acceptEdits" ||
      (mode === "auto" && e.offersHandOff)
    ) ||
    Object.values(o.alwaysAllowRules).some((l) => l.length > 0) ||
    o.strippedDangerousRules !== void 0 ||
    o.additionalWorkingDirectories.$map.length > 0 ||
    o.trustedNetworkDirectories !== void 0
  )
    return;
  return {
    offersHandOff: e.offersHandOff,
    classifiesEveryCall: e.classifiesEveryCall,
    toolPermissionContext: {
      ...addSessionWorkingDirectories(
        buildNativeDoctorDiagnostics(e.permissionContext, n, getOriginalCwd(), t),
      ),
      ...(!e.grantsApply && { pollEventDeliveryGuard: !0 }),
    },
  };
}

export { applicableSessionRules };
