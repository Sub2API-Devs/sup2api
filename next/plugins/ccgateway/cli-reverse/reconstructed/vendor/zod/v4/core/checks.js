/**
 * zod/v4/core/checks.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (4)
 * attribution: esm-fingerprint 3, esm-layout 1
 */
import { $constructor } from "./core.js";
import {
  nullish,
  floatSafeRemainder,
  NUMBER_FORMAT_RANGES,
  codePointLength,
  getLengthableOrigin,
  escapeRegex,
} from "./util.js";
import { lowercase, uppercase } from "./regexes.js";

//@ chunk-7vp249v4.js:8628-8736 esm-fingerprint
var $ZodCheck = $constructor("$ZodCheck", (inst, def) => {
  var _a;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a = inst._zod).onattach ?? (_a.onattach = []);
});
//@ chunk-7vp249v4.js:8736-10853 esm-layout
var _whenHasLength = (payload) => {
  let val = payload.value;
  return !nullish(val) && val.length !== undefined;
};
var numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date",
};
var $ZodCheckLessThan = $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  let origin = numericOriginMap[typeof def.value];
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
    payload.issues.push({
      origin: numericOriginMap[typeof payload.value] ?? origin,
      code: "too_big",
      maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort,
    });
  };
});
var $ZodCheckGreaterThan = $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  let origin = numericOriginMap[typeof def.value];
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
    payload.issues.push({
      origin: numericOriginMap[typeof payload.value] ?? origin,
      code: "too_small",
      minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort,
    });
  };
});
var $ZodCheckMultipleOf = $constructor("$ZodCheckMultipleOf", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    if (typeof payload.value !== typeof def.value)
      throw Error("Cannot mix number and bigint in multiple_of check.");
    if (
      typeof payload.value === "bigint"
        ? def.value !== BigInt(0) && payload.value % def.value === BigInt(0)
        : floatSafeRemainder(payload.value, def.value) === 0
    )
      return;
    payload.issues.push({
      origin: typeof payload.value,
      code: "not_multiple_of",
      divisor: def.value,
      input: payload.value,
      inst,
      continue: !def.abort,
    });
  };
});
var $ZodCheckNumberFormat = $constructor("$ZodCheckNumberFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  let isInt = def.format?.includes("int");
  let origin = isInt ? "int" : "number";
  let [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.check = (payload) => {
    let input = payload.value;
    if (isInt) {
      if (!Number.isInteger(input)) {
        payload.issues.push({
          expected: origin,
          format: def.format,
          code: "invalid_type",
          continue: false,
          input,
          inst,
        });
        return;
      }
      if (!Number.isSafeInteger(input)) {
        if (input > 0)
          payload.issues.push({
            input,
            code: "too_big",
            maximum: Number.MAX_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort,
          });
        else
          payload.issues.push({
            input,
            code: "too_small",
            minimum: Number.MIN_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort,
          });
        return;
      }
    }
    if (input < minimum)
      payload.issues.push({
        origin: "number",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort,
      });
    if (input > maximum)
      payload.issues.push({
        origin: "number",
        input,
        code: "too_big",
        maximum,
        inclusive: true,
        inst,
        continue: !def.abort,
      });
  };
});
//@ chunk-7vp249v4.js:10853-13646 esm-fingerprint
var $ZodCheckMaxLength = $constructor("$ZodCheckMaxLength", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
  inst._zod.check = (payload) => {
    let input = payload.value;
    let units = input.length;
    if ((typeof input === "string" && units > def.maximum ? codePointLength(input) : units) <= def.maximum)
      return;
    let origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort,
    });
  };
});
var $ZodCheckMinLength = $constructor("$ZodCheckMinLength", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
  inst._zod.check = (payload) => {
    let input = payload.value;
    let units = input.length;
    if (
      (typeof input === "string" && units >= def.minimum && units < def.minimum * 2
        ? codePointLength(input)
        : units) >= def.minimum
    )
      return;
    let origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort,
    });
  };
});
var $ZodCheckLengthEquals = $constructor("$ZodCheckLengthEquals", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
  inst._zod.check = (payload) => {
    let input = payload.value;
    let units = input.length;
    let length =
      typeof input === "string" && units >= def.length && units <= def.length * 2
        ? codePointLength(input)
        : units;
    if (length === def.length) return;
    let origin = getLengthableOrigin(input);
    let tooBig = length > def.length;
    payload.issues.push({
      origin,
      ...(tooBig
        ? {
            code: "too_big",
            maximum: def.length,
          }
        : {
            code: "too_small",
            minimum: def.length,
          }),
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort,
    });
  };
});
var $ZodCheckStringFormat = $constructor("$ZodCheckStringFormat", (inst, def) => {
  var _a;
  var _b;
  $ZodCheck.init(inst, def);
  if (def.pattern)
    (_a = inst._zod).check ??
      (_a.check = (payload) => {
        def.pattern.lastIndex = 0;
        if (def.pattern.test(payload.value)) return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: def.format,
          input: payload.value,
          ...(def.pattern
            ? {
                pattern: def.pattern.toString(),
              }
            : {}),
          inst,
          continue: !def.abort,
        });
      });
  else (_b = inst._zod).check ?? (_b.check = () => {});
});
var $ZodCheckRegex = $constructor("$ZodCheckRegex", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    def.pattern.lastIndex = 0;
    if (def.pattern.test(payload.value)) return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: payload.value,
      pattern: def.pattern.toString(),
      inst,
      continue: !def.abort,
    });
  };
});
var $ZodCheckLowerCase = $constructor("$ZodCheckLowerCase", (inst, def) => {
  def.pattern ?? (def.pattern = lowercase);
  $ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckUpperCase = $constructor("$ZodCheckUpperCase", (inst, def) => {
  def.pattern ?? (def.pattern = uppercase);
  $ZodCheckStringFormat.init(inst, def);
});
var $ZodCheckIncludes = $constructor("$ZodCheckIncludes", (inst, def) => {
  $ZodCheck.init(inst, def);
  let escapedRegex = escapeRegex(def.includes);
  let pattern = new RegExp(
    typeof def.position === "number" ? `^.{${def.position},}${escapedRegex}` : escapedRegex,
  );
  def.pattern = pattern;
  inst._zod.check = (payload) => {
    if (payload.value.includes(def.includes, def.position)) return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: def.includes,
      input: payload.value,
      inst,
      continue: !def.abort,
    });
  };
});
var $ZodCheckStartsWith = $constructor("$ZodCheckStartsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  let pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.check = (payload) => {
    if (payload.value.startsWith(def.prefix)) return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: def.prefix,
      input: payload.value,
      inst,
      continue: !def.abort,
    });
  };
});
var $ZodCheckEndsWith = $constructor("$ZodCheckEndsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  let pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.check = (payload) => {
    if (payload.value.endsWith(def.suffix)) return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: def.suffix,
      input: payload.value,
      inst,
      continue: !def.abort,
    });
  };
});
//@ chunk-7vp249v4.js:13646-13742 esm-fingerprint
var $ZodCheckOverwrite = $constructor("$ZodCheckOverwrite", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    payload.value = def.tx(payload.value);
  };
});
export {
  $ZodCheckStringFormat,
  $ZodCheckNumberFormat,
  $ZodCheck,
  $ZodCheckLessThan,
  $ZodCheckGreaterThan,
  $ZodCheckMultipleOf,
  $ZodCheckMaxLength,
  $ZodCheckMinLength,
  $ZodCheckLengthEquals,
  $ZodCheckRegex,
  $ZodCheckLowerCase,
  $ZodCheckUpperCase,
  $ZodCheckIncludes,
  $ZodCheckStartsWith,
  $ZodCheckEndsWith,
  $ZodCheckOverwrite,
};
