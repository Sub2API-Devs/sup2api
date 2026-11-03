/**
 * utils/permissions/permissionContextSerialization.ts
 *
 * 2.1.316 新增：权限上下文序列化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2xp8150w.js (9)
 * attribution: placement 9
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  U,
  o,
  Hve,
  A,
  Ue,
  T,
  xE,
  zodStrictObject,
  u,
  M,
  pe,
  oe,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { EXTERNAL_PERMISSION_MODES } from "../../types/permissions.js";
import { PERMISSION_RULE_SOURCES } from "./permissions.js";
import { isPlainObject } from "../objectUtils.js";
import { hasProtoKeys } from "../objectSafety.js";
import { freeze } from "../../../vendor/zod/v4/core/core.js";
import { iv } from "../../remote/tools/callResults.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { wS } from "../../../vendor/lodash-es/_inlinedHelpers.js";

/**
 * 权限上下文序列化表：每个字段是序列化、作为限制序列化、由反序列化设置还是不序列化；默认限制值、限制键与需序列化字段列表；上限 512 KB。
 */
//@ chunk-2xp8150w.js:517-2230 placement
var MAX_SERIALIZED_CONTEXT_BYTES = 524288,
  PERMISSION_CONTEXT_FIELD_SERIALIZATION = {
    mode: "serialized",
    additionalWorkingDirectories: "serialized",
    trustedNetworkDirectories: "serialized",
    alwaysAllowRules: "serialized",
    alwaysDenyRules: "serialized",
    alwaysAskRules: "serialized",
    strippedDangerousRules: "serialized",
    prePlanMode: "serialized",
    modeBeforeRewrite: "serialized",
    restricted: "serialized_as_restriction",
    blockReadsOutsideWorkingDirectories: "serialized_as_restriction",
    bashCommandClamps: "serialized_as_restriction",
    toolAliases: "serialized_as_restriction",
    servedCall: "set_by_deserialize",
    sandboxAutoAllowSuspended: "set_by_deserialize",
    callerClassifiesWebCalls: "not_serialized",
    chromeClassifierFloorEnabled: "not_serialized",
    chromeNavigationClassifierEnabled: "not_serialized",
    chromeClickClassifierEnabled: "not_serialized",
    chromeHostToolAsksEnabled: "not_serialized",
    canAutoClassifierRun: "not_serialized",
    proactivityBaseline: "not_serialized",
    startupModeDecidedByProactivityLevel: "not_serialized",
    isAutoModeAvailable: "not_serialized",
    isBypassPermissionsModeAvailable: "not_serialized",
    shouldAvoidPermissionPrompts: "not_serialized",
    awaitAutomatedChecksBeforeDialog: "not_serialized",
    mcpPermissionModeOverrides: "not_serialized",
    mcpAskForTools: "not_serialized",
    builtInToolsDisabled: "not_serialized",
    toolsKeptByLaunchList: "not_serialized",
    pollEventDeliveryGuard: "not_serialized",
    turnDisallowedTools: "not_serialized",
    toolsHeldUntilAPersonTypes: "not_serialized",
    blockWritesOutsideWorkingDirectories: "not_serialized",
    readBlockExemptPaths: "not_serialized",
    isRemoteMode: "not_serialized",
    remoteBrowserCardAnswers: "not_serialized",
  },
  DEFAULT_RESTRICTIONS = {
    restricted: !1,
    blockReadsOutsideWorkingDirectories: !1,
    bashCommandClamps: [],
    toolAliases: {},
  },
  RESTRICTION_KEYS = Object.keys(DEFAULT_RESTRICTIONS),
  SERIALIZED_CONTEXT_FIELDS = Object.entries(PERMISSION_CONTEXT_FIELD_SERIALIZATION).flatMap(([e, s]) =>
    s === "serialized" ? [e] : [],
  );
/**
 * 序列化权限上下文用到的 zod 片段：权限模式、规则来源（不含 mcpMount）、按来源的规则表、绝对路径（≤4096、无 NUL）、限制项。
 */
//@ chunk-2xp8150w.js:2230-2601 placement
var permissionModeSchema = DoctorLazy(() => U(EXTERNAL_PERMISSION_MODES)),
  SERIALIZABLE_RULE_SOURCES = PERMISSION_RULE_SOURCES.filter((e) => e !== "mcpMount"),
  ruleSourceSchema = DoctorLazy(() => U(SERIALIZABLE_RULE_SOURCES)),
  nonEmptyStringSchema = DoctorLazy(() => o().min(1)),
  rulesBySourceSchema = DoctorLazy(() => Hve(ruleSourceSchema(), A(o()))),
  MAX_DIRECTORY_PATH_LENGTH = 4096,
  absolutePathSchema = DoctorLazy(() =>
    o()
      .max(MAX_DIRECTORY_PATH_LENGTH)
      .refine((e) => e.startsWith("/") && !e.includes("\x00")),
  ),
  neutralRestrictionSchema = DoctorLazy(() => Ue([T(!1), xE([]), zodStrictObject({})])),
  restrictionsSchema = DoctorLazy(() =>
    u({
      restricted: M(),
      blockReadsOutsideWorkingDirectories: M(),
      bashCommandClamps: A(A(o())),
      toolAliases: pe(nonEmptyStringSchema(), nonEmptyStringSchema()),
    }).catchall(neutralRestrictionSchema()),
  );
//@ chunk-2xp8150w.js:2725-2794 placement
function m({ $map: $map }) {
  return new Set($map.map(([s]) => s)).size === $map.length;
}
/**
 * 序列化权限上下文的严格 schema，以及在其外包一层拒绝 __proto__ 键、只报告第一个问题的解析 schema。
 */
//@ chunk-2xp8150w.js:2794-3569 placement
var serializedPermissionContextSchema = DoctorLazy(() =>
    zodStrictObject({
      mode: permissionModeSchema(),
      additionalWorkingDirectories: zodStrictObject({
        $map: A(xE([absolutePathSchema(), zodStrictObject({ path: o(), source: ruleSourceSchema() })])),
      })
        .refine(m)
        .refine(({ $map: $map }) => $map.every(([s, { path: t }]) => s === t)),
      trustedNetworkDirectories: zodStrictObject({
        $map: A(xE([nonEmptyStringSchema(), A(nonEmptyStringSchema())])),
      })
        .refine(m)
        .optional(),
      alwaysAllowRules: rulesBySourceSchema(),
      alwaysDenyRules: rulesBySourceSchema(),
      alwaysAskRules: rulesBySourceSchema(),
      strippedDangerousRules: rulesBySourceSchema().optional(),
      prePlanMode: permissionModeSchema().optional(),
      modeBeforeRewrite: permissionModeSchema().optional(),
      restrictions: restrictionsSchema(),
    }),
  ),
  safeSerializedPermissionContextSchema = DoctorLazy(() =>
    oe().transform((e, s) => {
      let safeParse = serializedPermissionContextSchema().safeParse(e),
        r = safeParse.success
          ? Object.entries(isPlainObject(e) ? e : {})
              .filter(([i, d]) => i === "__proto__" || hasProtoKeys(d))
              .map(([i]) => ({ path: [i], message: "a key named __proto__" }))
          : safeParse.error.issues;
      return (
        s.issues.push(
          ...r
            .slice(0, 1)
            .map(({ path: path, message: message }) => ({
              code: "custom",
              path: path,
              message: message,
              input: e,
            })),
        ),
        safeParse.success && r.length === 0 ? safeParse.data : freeze
      );
    }),
  );
//@ chunk-2xp8150w.js:3569-3720 placement
function buildMinimalSerializedContext(e) {
  return {
    mode: e,
    additionalWorkingDirectories: { $map: [] },
    alwaysAllowRules: {},
    alwaysDenyRules: {},
    alwaysAskRules: {},
    restrictions: restrictionsSchema().parse(DEFAULT_RESTRICTIONS),
  };
}
/**
 * 接受只含模式、规则与目录均为空的最小权限上下文并转换为标准形状。
 */
//@ chunk-2xp8150w.js:3720-3951 placement
var minimalPermissionContextSchema = DoctorLazy(() =>
  oe()
    .refine((e) => !hasProtoKeys(e))
    .pipe(
      zodStrictObject({
        mode: permissionModeSchema(),
        additionalWorkingDirectories: zodStrictObject({ $map: xE([]) }),
        alwaysAllowRules: zodStrictObject({}),
        alwaysDenyRules: zodStrictObject({}),
        alwaysAskRules: zodStrictObject({}),
        restrictions: pe(o(), neutralRestrictionSchema()),
      }),
    )
    .transform(({ mode: mode }) => buildMinimalSerializedContext(mode)),
);
//@ chunk-2xp8150w.js:3951-4001 placement
function PTs(e) {
  return minimalPermissionContextSchema().safeParse(e).success;
}
//@ chunk-2xp8150w.js:4001-4043 placement
function PV(e) {
  return e !== void 0 && iv(e) > MAX_SERIALIZED_CONTEXT_BYTES;
}
/**
 * 把序列化的权限上下文还原为 ToolPermissionContext：Map 字段还原、限制项展开，并标记 servedCall 与暂停沙箱自动放行。
 */
//@ chunk-2xp8150w.js:4043-4315 placement
function deserializePermissionContext(e) {
  let {
    restrictions: restrictions,
    additionalWorkingDirectories: additionalWorkingDirectories,
    trustedNetworkDirectories: trustedNetworkDirectories,
    ...i
  } = e;
  return {
    ...getEmptyToolPermissionContext(),
    ...i,
    additionalWorkingDirectories: new Map(additionalWorkingDirectories.$map),
    ...(trustedNetworkDirectories && { trustedNetworkDirectories: new Map(trustedNetworkDirectories.$map) }),
    ...wS(restrictions, RESTRICTION_KEYS),
    servedCall: !0,
    sandboxAutoAllowSuspended: !0,
  };
}

export {
  RESTRICTION_KEYS,
  neutralRestrictionSchema,
  deserializePermissionContext,
  safeSerializedPermissionContextSchema,
  PV,
  SERIALIZABLE_RULE_SOURCES,
  MAX_DIRECTORY_PATH_LENGTH,
  absolutePathSchema,
  minimalPermissionContextSchema,
  PTs,
};
