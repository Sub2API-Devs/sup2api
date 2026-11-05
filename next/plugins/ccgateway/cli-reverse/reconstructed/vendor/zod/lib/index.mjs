/**
 * zod/lib/index.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-djgshcbm.js (13)
 * attribution: esm-layout 5, esm-fingerprint 8
 */
import { ZodError, ZodIssueCode } from "../v3/ZodError.js";
import { ZodParsedType, util } from "../v3/helpers/util.js";
import {
  ZodString,
  ZodNumber,
  ZodNaN,
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodSymbol,
  ZodUndefined,
  ZodNull,
  ZodAny,
  ZodUnknown,
  ZodNever,
  ZodVoid,
  ZodArray,
  ZodObject,
  ZodUnion,
  ZodDiscriminatedUnion,
  ZodIntersection,
  ZodTuple,
  ZodRecord,
  ZodMap,
  ZodSet,
  ZodFunction,
  ZodLazy,
  ZodLiteral,
  ZodEnum,
  ZodNativeEnum,
  ZodPromise,
  ZodEffects,
  ZodOptional,
  ZodNullable,
  ZodPipeline,
} from "../v3/types.js";
import { deferInit, runDeferredInits } from "../../../runtime/deferred-init.js";

//@ chunk-djgshcbm.js:3800-3823 esm-layout
ZodError.create = (issues) => new ZodError(issues);
//@ chunk-djgshcbm.js:3823-6990 esm-fingerprint
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) message = "Required";
      else message = `Expected ${issue.expected}, received ${issue.received}`;
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = "Invalid input";
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = "Invalid function arguments";
      break;
    case ZodIssueCode.invalid_return_type:
      message = "Invalid function return type";
      break;
    case ZodIssueCode.invalid_date:
      message = "Invalid date";
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number")
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
        } else if ("startsWith" in issue.validation)
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        else if ("endsWith" in issue.validation)
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        else util.assertNever(issue.validation);
      } else if (issue.validation !== "regex") message = `Invalid ${issue.validation}`;
      else message = "Invalid";
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? "at least" : "more than"} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? "at least" : "over"} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? "exactly equal to " : issue.inclusive ? "greater than or equal to " : "greater than "}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? "exactly equal to " : issue.inclusive ? "greater than or equal to " : "greater than "}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? "exactly equal to " : issue.inclusive ? "greater than or equal to " : "greater than "}${new Date(Number(issue.minimum))}`;
      else message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? "at most" : "less than"} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? "at most" : "under"} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? "exactly" : issue.inclusive ? "less than or equal to" : "less than"} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? "exactly" : issue.inclusive ? "less than or equal to" : "less than"} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? "exactly" : issue.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(Number(issue.maximum))}`;
      else message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = "Invalid input";
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = "Intersection results could not be merged";
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return {
    message,
  };
};
var errorMap_2 = errorMap;
//@ chunk-djgshcbm.js:6990-6999 esm-layout
var errorMap_default = errorMap_2;
//@ chunk-djgshcbm.js:6999-7022 esm-layout
function getErrorMap() {
  return errorMap_default;
}
//@ chunk-djgshcbm.js:7022-7312 esm-fingerprint
var makeIssue = (params) => {
  let { data, path, errorMaps, issueData } = params;
  let fullPath = [...path, ...(issueData.path || [])];
  let fullIssue = {
    ...issueData,
    path: fullPath,
  };
  if (issueData.message !== undefined)
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message,
    };
  let errorMessage = "";
  let maps = errorMaps
    .filter((m) => !!m)
    .slice()
    .reverse();
  for (let map of maps)
    errorMessage = map(fullIssue, {
      data,
      defaultError: errorMessage,
    }).message;
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage,
  };
};
//@ chunk-djgshcbm.js:7312-7497 esm-fingerprint
function addIssueToContext(ctx, issueData) {
  let overrideMap = getErrorMap();
  let issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      ctx.schemaErrorMap,
      overrideMap,
      overrideMap === errorMap_2 ? undefined : errorMap_2,
    ].filter((x) => !!x),
  });
  ctx.common.issues.push(issue);
}
//@ chunk-djgshcbm.js:7497-8267 esm-fingerprint
class ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid") this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted") this.value = "aborted";
  }
  static mergeArray(status, results) {
    let arrayValue = [];
    for (let s of results) {
      if (s.status === "aborted") return INVALID;
      if (s.status === "dirty") status.dirty();
      arrayValue.push(s.value);
    }
    return {
      status: status.value,
      value: arrayValue,
    };
  }
  static async mergeObjectAsync(status, pairs) {
    let syncPairs = [];
    for (let pair of pairs) {
      let key = await pair.key;
      let value = await pair.value;
      syncPairs.push({
        key,
        value,
      });
    }
    return ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    let finalObject = {};
    for (let pair of pairs) {
      let { key, value } = pair;
      if (key.status === "aborted") return INVALID;
      if (value.status === "aborted") return INVALID;
      if (key.status === "dirty") status.dirty();
      if (value.status === "dirty") status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet))
        finalObject[key.value] = value.value;
    }
    return {
      status: status.value,
      value: finalObject,
    };
  }
}
//@ chunk-djgshcbm.js:8267-8505 esm-fingerprint
var INVALID = Object.freeze({
  status: "aborted",
});
var DIRTY = (value) => ({
  status: "dirty",
  value,
});
var OK = (value) => ({
  status: "valid",
  value,
});
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isPromise = (result) => typeof Promise !== "undefined" && result instanceof Promise;
//@ chunk-djgshcbm.js:8505-8511 esm-layout
var errorUtil;
//@ chunk-djgshcbm.js:8511-8640 esm-fingerprint
(function (errorUtil) {
  errorUtil.errToObj = (message) =>
    typeof message === "string"
      ? {
          message,
        }
      : message || {};
  errorUtil.toString = (message) => (typeof message === "string" ? message : message?.message);
})(errorUtil || (errorUtil = {}));
//@ chunk-djgshcbm.js:58896-59342 esm-fingerprint
var create_2; // deferred: uses ZodString (../v3/types.js) of its import cycle while loading; runs once the cycle is complete
var create_3;
var create_4;
var create_5;
var create_6;
var create_7;
var create_8;
var create_9;
var create_10;
var create_11;
var create_12;
var create_13;
var create_14;
var create_15;
var create;
var strictCreate;
var create_16;
var create_17;
var create_18;
var create_19;
var create_20;
var create_21;
var create_22;
var create_23;
var create_24;
var create_25;
var create_26;
var create_27;
var create_28;
var create_29;
var create_30;
var create_31;
var createWithPreprocess;
var create_32;
deferInit("chunk-djgshcbm.js:58896", () => {
  create_2 = ZodString.create;
  create_3 = ZodNumber.create;
  create_4 = ZodNaN.create;
  create_5 = ZodBigInt.create;
  create_6 = ZodBoolean.create;
  create_7 = ZodDate.create;
  create_8 = ZodSymbol.create;
  create_9 = ZodUndefined.create;
  create_10 = ZodNull.create;
  create_11 = ZodAny.create;
  create_12 = ZodUnknown.create;
  create_13 = ZodNever.create;
  create_14 = ZodVoid.create;
  create_15 = ZodArray.create;
  ({ create, strictCreate } = ZodObject);
  create_16 = ZodUnion.create;
  create_17 = ZodDiscriminatedUnion.create;
  create_18 = ZodIntersection.create;
  create_19 = ZodTuple.create;
  create_20 = ZodRecord.create;
  create_21 = ZodMap.create;
  create_22 = ZodSet.create;
  create_23 = ZodFunction.create;
  create_24 = ZodLazy.create;
  create_25 = ZodLiteral.create;
  create_26 = ZodEnum.create;
  create_27 = ZodNativeEnum.create;
  create_28 = ZodPromise.create;
  create_29 = ZodEffects.create;
  create_30 = ZodOptional.create;
  create_31 = ZodNullable.create;
  createWithPreprocess = ZodEffects.createWithPreprocess;
  create_32 = ZodPipeline.create;
});
//@ chunk-djgshcbm.js:59342-59545 esm-fingerprint
/**
 * zod 的 coerce 构造器表（string/number/boolean/bigint/date）。属于第三方 zod，不是 SDK schema。
 */
var zodCoerce = {
  string: (stringParams) =>
    ZodString.create({
      ...stringParams,
      coerce: true,
    }),
  number: (numberParams) =>
    ZodNumber.create({
      ...numberParams,
      coerce: true,
    }),
  boolean: (booleanParams) =>
    ZodBoolean.create({
      ...booleanParams,
      coerce: true,
    }),
  bigint: (arg) =>
    ZodBigInt.create({
      ...arg,
      coerce: true,
    }),
  date: (arg) =>
    ZodDate.create({
      ...arg,
      coerce: true,
    }),
};
//@ chunk-djgshcbm.js:59545-59555 esm-layout
var INVALID_default = INVALID;

// The import cycle this module closes (2 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("vendor/zod/lib/index.mjs");
runDeferredInits("worker:vendor/zod/lib/index.mjs");
export {
  create_2,
  create_16,
  create,
  create_25,
  create_15,
  create_26,
  create_6,
  create_20,
  create_3,
  create_19,
  create_12,
  strictCreate,
  create_17,
  zodCoerce,
  create_9,
  INVALID_default,
  create_10,
  isValid,
  ParseStatus,
  isPromise,
  addIssueToContext,
  INVALID,
  errorUtil,
  OK,
  isAborted,
  isDirty,
  makeIssue,
  getErrorMap,
  errorMap_2,
  DIRTY,
};
