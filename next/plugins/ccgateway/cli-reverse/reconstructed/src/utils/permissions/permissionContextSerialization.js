/**
 * utils/permissions/permissionContextSerialization.ts
 *
 * 2.1.316 新增：权限上下文序列化。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nh073evr.js (10)
 * attribution: placement 9, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  _enum,
  stringSchema,
  partialRecord,
  array,
  union,
  literal,
  tuple,
  zodStrictObject,
  objectSchema,
  booleanSchema,
  record,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { EXTERNAL_PERMISSION_MODES } from "../../types/permissions.js";
import { PERMISSION_RULE_SOURCES } from "./permissions.js";
import { isPlainObject } from "../objectUtils.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { hasProtoKeys } from "../objectSafety.js";
import { INVALID } from "../../../vendor/zod/v4/core/core.js";
import { byteLengthOf } from "../../remote/tools/callResults.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { pickAlias } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-nh073evr.js:550-2429 placement
/**
 * 权限上下文序列化表：每个字段是序列化、作为限制序列化、由反序列化设置还是不序列化；默认限制值、限制键与需序列化字段列表；上限 512 KB。
 */
var MAX_SERIALIZED_CONTEXT_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PERMISSION_CONTEXT_FIELD_SERIALIZATION;
var DEFAULT_RESTRICTIONS;
var RESTRICTION_KEYS;
var SERIALIZED_CONTEXT_FIELDS;
deferInit("chunk-nh073evr.js:550", () => {
  MAX_SERIALIZED_CONTEXT_BYTES = 524288;
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
    mcpPolicyAsksLiftedInAcceptEdits: "not_serialized",
    mcpPolicyFileAsksLiftedInAcceptEdits: "not_serialized",
    builtInToolsDisabled: "not_serialized",
    toolsKeptByLaunchList: "not_serialized",
    pollEventDeliveryGuard: "not_serialized",
    turnDisallowedTools: "not_serialized",
    toolsHeldUntilAPersonTypes: "not_serialized",
    blockWritesOutsideWorkingDirectories: "not_serialized",
    readBlockExemptPaths: "not_serialized",
    isRemoteMode: "not_serialized",
    remoteBrowserCardAnswers: "not_serialized",
    connectorCardAllows: "not_serialized",
    planDoc: "not_serialized",
  };
  DEFAULT_RESTRICTIONS = {
    restricted: false,
    blockReadsOutsideWorkingDirectories: false,
    bashCommandClamps: [],
    toolAliases: {},
  };
  RESTRICTION_KEYS = Object.keys(DEFAULT_RESTRICTIONS);
  SERIALIZED_CONTEXT_FIELDS = Object.entries(PERMISSION_CONTEXT_FIELD_SERIALIZATION).flatMap(
    ([key, value]) => (value === "serialized" ? [key] : []),
  );
});
//@ chunk-nh073evr.js:2429-2800 placement
/**
 * 序列化权限上下文用到的 zod 片段：权限模式、规则来源（不含 mcpMount）、按来源的规则表、绝对路径（≤4096、无 NUL）、限制项。
 */
var permissionModeSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SERIALIZABLE_RULE_SOURCES;
var ruleSourceSchema;
var nonEmptyStringSchema;
var rulesBySourceSchema;
var MAX_DIRECTORY_PATH_LENGTH;
var absolutePathSchema;
var neutralRestrictionSchema;
var restrictionsSchema;
deferInit("chunk-nh073evr.js:2429", () => {
  permissionModeSchema = DoctorLazy(() => _enum(EXTERNAL_PERMISSION_MODES));
  SERIALIZABLE_RULE_SOURCES = PERMISSION_RULE_SOURCES.filter((source) => source !== "mcpMount");
  ruleSourceSchema = DoctorLazy(() => _enum(SERIALIZABLE_RULE_SOURCES));
  nonEmptyStringSchema = DoctorLazy(() => stringSchema().min(1));
  rulesBySourceSchema = DoctorLazy(() => partialRecord(ruleSourceSchema(), array(stringSchema())));
  MAX_DIRECTORY_PATH_LENGTH = 4096;
  absolutePathSchema = DoctorLazy(() =>
    stringSchema()
      .max(MAX_DIRECTORY_PATH_LENGTH)
      .refine((path) => path.startsWith("/") && !path.includes("\x00")),
  );
  neutralRestrictionSchema = DoctorLazy(() => union([literal(false), tuple([]), zodStrictObject({})]));
  restrictionsSchema = DoctorLazy(() =>
    objectSchema({
      restricted: booleanSchema(),
      blockReadsOutsideWorkingDirectories: booleanSchema(),
      bashCommandClamps: array(array(stringSchema())),
      toolAliases: record(nonEmptyStringSchema(), nonEmptyStringSchema()),
    }).catchall(neutralRestrictionSchema()),
  );
});
//@ chunk-nh073evr.js:2800-2924 layout
function hasNonNeutralRestrictions(permissionContext) {
  let restrictions = isPlainObject(permissionContext) ? permissionContext.restrictions : undefined;
  return (
    isPlainObject(restrictions) &&
    Object.values(omitAlias(restrictions, RESTRICTION_KEYS)).some(
      (restriction) => !neutralRestrictionSchema().safeParse(restriction).success,
    )
  );
}
//@ chunk-nh073evr.js:2924-2993 placement
function hasUniqueMapKeys({ $map }) {
  return new Set($map.map(([key]) => key)).size === $map.length;
}
//@ chunk-nh073evr.js:2993-3768 placement
/**
 * 序列化权限上下文的严格 schema，以及在其外包一层拒绝 __proto__ 键、只报告第一个问题的解析 schema。
 */
var serializedPermissionContextSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var safeSerializedPermissionContextSchema;
deferInit("chunk-nh073evr.js:2993", () => {
  serializedPermissionContextSchema = DoctorLazy(() =>
    zodStrictObject({
      mode: permissionModeSchema(),
      additionalWorkingDirectories: zodStrictObject({
        $map: array(
          tuple([
            absolutePathSchema(),
            zodStrictObject({
              path: stringSchema(),
              source: ruleSourceSchema(),
            }),
          ]),
        ),
      })
        .refine(hasUniqueMapKeys)
        .refine(({ $map }) => $map.every(([key, { path: entry }]) => key === entry)),
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
  safeSerializedPermissionContextSchema = DoctorLazy(() =>
    unknown().transform((input, ctx) => {
      let parsed = serializedPermissionContextSchema().safeParse(input);
      let issues = parsed.success
        ? Object.entries(isPlainObject(input) ? input : {})
            .filter(([key, value]) => key === "__proto__" || hasProtoKeys(value))
            .map(([key]) => ({
              path: [key],
              message: "a key named __proto__",
            }))
        : parsed.error.issues;
      ctx.issues.push(
        ...issues.slice(0, 1).map(({ path, message }) => ({
          code: "custom",
          path,
          message,
          input,
        })),
      );
      return parsed.success && issues.length === 0 ? parsed.data : INVALID;
    }),
  );
});
//@ chunk-nh073evr.js:3768-3919 placement
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
//@ chunk-nh073evr.js:3919-4150 placement
/**
 * 接受只含模式、规则与目录均为空的最小权限上下文并转换为标准形状。
 */
var minimalPermissionContextSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nh073evr.js:3919", () => {
  minimalPermissionContextSchema = DoctorLazy(() =>
    unknown()
      .refine((value) => !hasProtoKeys(value))
      .pipe(
        zodStrictObject({
          mode: permissionModeSchema(),
          additionalWorkingDirectories: zodStrictObject({
            $map: tuple([]),
          }),
          alwaysAllowRules: zodStrictObject({}),
          alwaysDenyRules: zodStrictObject({}),
          alwaysAskRules: zodStrictObject({}),
          restrictions: record(stringSchema(), neutralRestrictionSchema()),
        }),
      )
      .transform(({ mode }) => buildMinimalSerializedContext(mode)),
  );
});
//@ chunk-nh073evr.js:4150-4200 placement
/**
 * isMinimalContextSerializable：序列化权限上下文可通过最小 schema。
 */
function isMinimalContextSerializable(value) {
  return minimalPermissionContextSchema().safeParse(value).success;
}
//@ chunk-nh073evr.js:4200-4242 placement
/**
 * exceedsSerializedContextLimit：序列化上下文是否超出上限。
 */
function exceedsSerializedContextLimit(permissionContext) {
  return permissionContext !== undefined && byteLengthOf(permissionContext) > MAX_SERIALIZED_CONTEXT_BYTES;
}
//@ chunk-nh073evr.js:4242-4514 placement
/**
 * 把序列化的权限上下文还原为 ToolPermissionContext：Map 字段还原、限制项展开，并标记 servedCall 与暂停沙箱自动放行。
 */
function deserializePermissionContext(serialized) {
  let { restrictions, additionalWorkingDirectories, trustedNetworkDirectories, ...rest } = serialized;
  return {
    ...getEmptyToolPermissionContext(),
    ...rest,
    additionalWorkingDirectories: new Map(additionalWorkingDirectories.$map),
    ...(trustedNetworkDirectories && {
      trustedNetworkDirectories: new Map(trustedNetworkDirectories.$map),
    }),
    ...pickAlias(restrictions, RESTRICTION_KEYS),
    servedCall: true,
    sandboxAutoAllowSuspended: true,
  };
}
export {
  safeSerializedPermissionContextSchema,
  minimalPermissionContextSchema,
  exceedsSerializedContextLimit,
  hasNonNeutralRestrictions,
  isMinimalContextSerializable,
  deserializePermissionContext,
  SERIALIZABLE_RULE_SOURCES,
  MAX_DIRECTORY_PATH_LENGTH,
  absolutePathSchema,
};
