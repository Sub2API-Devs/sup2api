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
  _enum,
  string,
  partialRecord,
  array,
  union,
  literal,
  tuple,
  zodStrictObject,
  u,
  M,
  record,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { EXTERNAL_PERMISSION_MODES } from "../../types/permissions.js";
import { PERMISSION_RULE_SOURCES } from "./permissions.js";
import { isPlainObject } from "../objectUtils.js";
import { hasProtoKeys } from "../objectSafety.js";
import { bY } from "../../../vendor/zod/v4/core/core.js";
import { byteLengthOf } from "../../remote/tools/callResults.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { wS } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-2xp8150w.js:517-2230 placement
/**
 * 权限上下文序列化表：每个字段是序列化、作为限制序列化、由反序列化设置还是不序列化；默认限制值、限制键与需序列化字段列表；上限 512 KB。
 */
var MAX_SERIALIZED_CONTEXT_BYTES = 524288;
var PERMISSION_CONTEXT_FIELD_SERIALIZATION = {
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
};
var DEFAULT_RESTRICTIONS = {
  restricted: false,
  blockReadsOutsideWorkingDirectories: false,
  bashCommandClamps: [],
  toolAliases: {},
};
var RESTRICTION_KEYS = Object.keys(DEFAULT_RESTRICTIONS);
var SERIALIZED_CONTEXT_FIELDS = Object.entries(PERMISSION_CONTEXT_FIELD_SERIALIZATION).flatMap(
  ([key, value]) => (value === "serialized" ? [key] : []),
);
//@ chunk-2xp8150w.js:2230-2601 placement
/**
 * 序列化权限上下文用到的 zod 片段：权限模式、规则来源（不含 mcpMount）、按来源的规则表、绝对路径（≤4096、无 NUL）、限制项。
 */
var permissionModeSchema = DoctorLazy(() => _enum(EXTERNAL_PERMISSION_MODES));
var SERIALIZABLE_RULE_SOURCES = PERMISSION_RULE_SOURCES.filter((e) => e !== "mcpMount");
var ruleSourceSchema = DoctorLazy(() => _enum(SERIALIZABLE_RULE_SOURCES));
var nonEmptyStringSchema = DoctorLazy(() => string().min(1));
var rulesBySourceSchema = DoctorLazy(() => partialRecord(ruleSourceSchema(), array(string())));
var MAX_DIRECTORY_PATH_LENGTH = 4096;
var absolutePathSchema = DoctorLazy(() =>
  string()
    .max(MAX_DIRECTORY_PATH_LENGTH)
    .refine((e) => e.startsWith("/") && !e.includes("\x00")),
);
var neutralRestrictionSchema = DoctorLazy(() => union([literal(false), tuple([]), zodStrictObject({})]));
var restrictionsSchema = DoctorLazy(() =>
  u({
    restricted: M(),
    blockReadsOutsideWorkingDirectories: M(),
    bashCommandClamps: array(array(string())),
    toolAliases: record(nonEmptyStringSchema(), nonEmptyStringSchema()),
  }).catchall(neutralRestrictionSchema()),
);
//@ chunk-2xp8150w.js:2725-2794 placement
function hasUniqueMapKeys({ $map }) {
  return new Set($map.map(([s]) => s)).size === $map.length;
}
//@ chunk-2xp8150w.js:2794-3569 placement
/**
 * 序列化权限上下文的严格 schema，以及在其外包一层拒绝 __proto__ 键、只报告第一个问题的解析 schema。
 */
var serializedPermissionContextSchema = DoctorLazy(() =>
  zodStrictObject({
    mode: permissionModeSchema(),
    additionalWorkingDirectories: zodStrictObject({
      $map: array(
        tuple([
          absolutePathSchema(),
          zodStrictObject({
            path: string(),
            source: ruleSourceSchema(),
          }),
        ]),
      ),
    })
      .refine(hasUniqueMapKeys)
      .refine(({ $map }) => $map.every(([s, { path: t }]) => s === t)),
    trustedNetworkDirectories: zodStrictObject({
      $map: array(tuple([nonEmptyStringSchema(), array(nonEmptyStringSchema())])),
    })
      .refine(hasUniqueMapKeys)
      .optional(),
    alwaysAllowRules: rulesBySourceSchema(),
    alwaysDenyRules: rulesBySourceSchema(),
    alwaysAskRules: rulesBySourceSchema(),
    strippedDangerousRules: rulesBySourceSchema().optional(),
    prePlanMode: permissionModeSchema().optional(),
    modeBeforeRewrite: permissionModeSchema().optional(),
    restrictions: restrictionsSchema(),
  }),
);
var safeSerializedPermissionContextSchema = DoctorLazy(() =>
  unknown().transform((e, s) => {
    let t = serializedPermissionContextSchema().safeParse(e);
    let r = t.success
      ? Object.entries(isPlainObject(e) ? e : {})
          .filter(([key, value]) => key === "__proto__" || hasProtoKeys(value))
          .map(([key]) => ({
            path: [key],
            message: "a key named __proto__",
          }))
      : t.error.issues;
    s.issues.push(
      ...r.slice(0, 1).map(({ path, message }) => ({
        code: "custom",
        path,
        message,
        input: e,
      })),
    );
    return t.success && r.length === 0 ? t.data : bY;
  }),
);
//@ chunk-2xp8150w.js:3569-3720 placement
function buildMinimalSerializedContext(mode) {
  return {
    mode,
    additionalWorkingDirectories: {
      $map: [],
    },
    alwaysAllowRules: {},
    alwaysDenyRules: {},
    alwaysAskRules: {},
    restrictions: restrictionsSchema().parse(DEFAULT_RESTRICTIONS),
  };
}
//@ chunk-2xp8150w.js:3720-3951 placement
/**
 * 接受只含模式、规则与目录均为空的最小权限上下文并转换为标准形状。
 */
var minimalPermissionContextSchema = DoctorLazy(() =>
  unknown()
    .refine((e) => !hasProtoKeys(e))
    .pipe(
      zodStrictObject({
        mode: permissionModeSchema(),
        additionalWorkingDirectories: zodStrictObject({
          $map: tuple([]),
        }),
        alwaysAllowRules: zodStrictObject({}),
        alwaysDenyRules: zodStrictObject({}),
        alwaysAskRules: zodStrictObject({}),
        restrictions: record(string(), neutralRestrictionSchema()),
      }),
    )
    .transform(({ mode }) => buildMinimalSerializedContext(mode)),
);
//@ chunk-2xp8150w.js:3951-4001 placement
/**
 * isMinimalContextSerializable：序列化权限上下文可通过最小 schema。
 */
function isMinimalContextSerializable(e) {
  return minimalPermissionContextSchema().safeParse(e).success;
}
//@ chunk-2xp8150w.js:4001-4043 placement
/**
 * exceedsSerializedContextLimit：序列化上下文是否超出上限。
 */
function exceedsSerializedContextLimit(permissionContext) {
  return permissionContext !== undefined && byteLengthOf(permissionContext) > MAX_SERIALIZED_CONTEXT_BYTES;
}
//@ chunk-2xp8150w.js:4043-4315 placement
/**
 * 把序列化的权限上下文还原为 ToolPermissionContext：Map 字段还原、限制项展开，并标记 servedCall 与暂停沙箱自动放行。
 */
function deserializePermissionContext(e) {
  let { restrictions, additionalWorkingDirectories, trustedNetworkDirectories, ...i } = e;
  return {
    ...getEmptyToolPermissionContext(),
    ...i,
    additionalWorkingDirectories: new Map(additionalWorkingDirectories.$map),
    ...(trustedNetworkDirectories && {
      trustedNetworkDirectories: new Map(trustedNetworkDirectories.$map),
    }),
    ...wS(restrictions, RESTRICTION_KEYS),
    servedCall: true,
    sandboxAutoAllowSuspended: true,
  };
}
export {
  RESTRICTION_KEYS,
  neutralRestrictionSchema,
  deserializePermissionContext,
  safeSerializedPermissionContextSchema,
  exceedsSerializedContextLimit,
  SERIALIZABLE_RULE_SOURCES,
  MAX_DIRECTORY_PATH_LENGTH,
  absolutePathSchema,
  minimalPermissionContextSchema,
  isMinimalContextSerializable,
};
