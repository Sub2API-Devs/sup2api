/**
 * services/remoteTools/sessionRulesRendering.ts
 *
 * 2.1.316 新增。远程命令渲染时适用的会话规则（anthropic/renderUnderSessionRules）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6tycsy38.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  literal,
  zodStrictObject,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  safeSerializedPermissionContextSchema,
  exceedsSerializedContextLimit,
} from "../../utils/permissions/permissionContextSerialization.js";
import { addSessionWorkingDirectories } from "../../utils/permissions/PermissionUpdate.js";
import { buildNativeDoctorDiagnostics } from "../../screens/Doctor.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6tycsy38.js:416-458 placement
var ANTHROPIC_RENDERUNDERSESSIONRULES = "anthropic/renderUnderSessionRules";
//@ chunk-6tycsy38.js:458-506 placement
function rendersUnderSessionRulesCapability() {
  return {
    experimental: {
      [ANTHROPIC_RENDERUNDERSESSIONRULES]: {
        v: 1,
      },
    },
  };
}
//@ chunk-6tycsy38.js:506-558 placement
var sessionRulesContractSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6tycsy38.js:506", () => {
  sessionRulesContractSchema = DoctorLazy(() =>
    objectSchema({
      experimental: objectSchema({
        [ANTHROPIC_RENDERUNDERSESSIONRULES]: objectSchema({
          v: literal(1),
        }),
      }),
    }),
  );
});
//@ chunk-6tycsy38.js:558-665 placement
var SESSION_RULES_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6tycsy38.js:558", () => {
  SESSION_RULES_SCHEMA = DoctorLazy(() =>
    zodStrictObject({
      v: literal(1),
      permissionContext: safeSerializedPermissionContextSchema(),
      offersHandOff: booleanSchema(),
      classifiesEveryCall: booleanSchema(),
      grantsApply: booleanSchema(),
    }),
  );
});
//@ chunk-6tycsy38.js:665-1254 placement
/**
 * 远程命令渲染时适用的会话规则（anthropic/renderUnderSessionRules）。
 */
function applicableSessionRules(sessionRules, launchPermissionContext, repoRules) {
  let rules = exceedsSerializedContextLimit(sessionRules)
    ? undefined
    : SESSION_RULES_SCHEMA().safeParse(sessionRules).data;
  if (rules === undefined || launchPermissionContext === undefined) return;
  let { mode, ...context } = rules.permissionContext;
  if (
    !(
      mode === "default" ||
      mode === "dontAsk" ||
      mode === "acceptEdits" ||
      (mode === "auto" && rules.offersHandOff)
    ) ||
    Object.values(context.alwaysAllowRules).some((alwaysAllowRule) => alwaysAllowRule.length > 0) ||
    context.strippedDangerousRules !== undefined ||
    context.additionalWorkingDirectories.$map.length > 0 ||
    context.trustedNetworkDirectories !== undefined
  )
    return;
  return {
    offersHandOff: rules.offersHandOff,
    classifiesEveryCall: rules.classifiesEveryCall,
    toolPermissionContext: {
      ...addSessionWorkingDirectories(
        buildNativeDoctorDiagnostics(
          rules.permissionContext,
          launchPermissionContext,
          getOriginalCwd(),
          repoRules,
        ),
      ),
      ...(!rules.grantsApply && {
        pollEventDeliveryGuard: true,
      }),
    },
  };
}
export { applicableSessionRules, rendersUnderSessionRulesCapability };
