/**
 * zod/v4/core/checks.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_core } from "./core.cjs";
import { require_regexes } from "./regexes.cjs";
import { require_util } from "./util.cjs";

//@ chunk-1ny7cxrt.js:123392-133068 cjs-fingerprint
var require_checks = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o_2, k2, desc);
        }
      : function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o_2[k2] = m[k];
        });
  var __setModuleDefault =
    (cjsExports && cjsExports.__setModuleDefault) ||
    (Object.create
      ? function (o, v) {
          Object.defineProperty(o, "default", {
            enumerable: true,
            value: v,
          });
        }
      : function (o, v) {
          o.default = v;
        });
  var __importStar =
    (cjsExports && cjsExports.__importStar) ||
    function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.$ZodCheckOverwrite =
    cjsExports.$ZodCheckMimeType =
    cjsExports.$ZodCheckProperty =
    cjsExports.$ZodCheckEndsWith =
    cjsExports.$ZodCheckStartsWith =
    cjsExports.$ZodCheckIncludes =
    cjsExports.$ZodCheckUpperCase =
    cjsExports.$ZodCheckLowerCase =
    cjsExports.$ZodCheckRegex =
    cjsExports.$ZodCheckStringFormat =
    cjsExports.$ZodCheckLengthEquals =
    cjsExports.$ZodCheckMinLength =
    cjsExports.$ZodCheckMaxLength =
    cjsExports.$ZodCheckSizeEquals =
    cjsExports.$ZodCheckMinSize =
    cjsExports.$ZodCheckMaxSize =
    cjsExports.$ZodCheckBigIntFormat =
    cjsExports.$ZodCheckNumberFormat =
    cjsExports.$ZodCheckMultipleOf =
    cjsExports.$ZodCheckGreaterThan =
    cjsExports.$ZodCheckLessThan =
    cjsExports.$ZodCheck =
      undefined;
  var core = __importStar(require_core());
  var regexes = __importStar(require_regexes());
  var util = __importStar(require_util());
  cjsExports.$ZodCheck = core.$constructor("$ZodCheck", (inst, def) => {
    var _a;
    inst._zod ?? (inst._zod = {});
    inst._zod.def = def;
    (_a = inst._zod).onattach ?? (_a.onattach = []);
  });
  var _whenHasSize = (payload) => {
    let val = payload.value;
    return !util.nullish(val) && val.size !== undefined;
  };
  var _whenHasLength = (payload) => {
    let val = payload.value;
    return !util.nullish(val) && val.length !== undefined;
  };
  var numericOriginMap = {
    number: "number",
    bigint: "bigint",
    object: "date",
  };
  cjsExports.$ZodCheckLessThan = core.$constructor("$ZodCheckLessThan", (inst, def) => {
    cjsExports.$ZodCheck.init(inst, def);
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
  cjsExports.$ZodCheckGreaterThan = core.$constructor("$ZodCheckGreaterThan", (inst, def) => {
    cjsExports.$ZodCheck.init(inst, def);
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
  cjsExports.$ZodCheckMultipleOf = core.$constructor("$ZodCheckMultipleOf", (inst, def) => {
    cjsExports.$ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      if (typeof payload.value !== typeof def.value)
        throw Error("Cannot mix number and bigint in multiple_of check.");
      if (
        typeof payload.value === "bigint"
          ? def.value !== BigInt(0) && payload.value % def.value === BigInt(0)
          : util.floatSafeRemainder(payload.value, def.value) === 0
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
  cjsExports.$ZodCheckNumberFormat = core.$constructor("$ZodCheckNumberFormat", (inst, def) => {
    cjsExports.$ZodCheck.init(inst, def);
    def.format = def.format || "float64";
    let isInt = def.format?.includes("int");
    let origin = isInt ? "int" : "number";
    let [minimum, maximum] = util.NUMBER_FORMAT_RANGES[def.format];
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
  cjsExports.$ZodCheckBigIntFormat = core.$constructor("$ZodCheckBigIntFormat", (inst, def) => {
    cjsExports.$ZodCheck.init(inst, def);
    let [minimum, maximum] = util.BIGINT_FORMAT_RANGES[def.format];
    inst._zod.check = (payload) => {
      let input = payload.value;
      if (input < minimum)
        payload.issues.push({
          origin: "bigint",
          input,
          code: "too_small",
          minimum,
          inclusive: true,
          inst,
          continue: !def.abort,
        });
      if (input > maximum)
        payload.issues.push({
          origin: "bigint",
          input,
          code: "too_big",
          maximum,
          inclusive: true,
          inst,
          continue: !def.abort,
        });
    };
  });
  cjsExports.$ZodCheckMaxSize = core.$constructor("$ZodCheckMaxSize", (inst, def) => {
    var _a;
    cjsExports.$ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = _whenHasSize);
    inst._zod.check = (payload) => {
      let input = payload.value;
      if (input.size <= def.maximum) return;
      payload.issues.push({
        origin: util.getSizableOrigin(input),
        code: "too_big",
        maximum: def.maximum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort,
      });
    };
  });
  cjsExports.$ZodCheckMinSize = core.$constructor("$ZodCheckMinSize", (inst, def) => {
    var _a;
    cjsExports.$ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = _whenHasSize);
    inst._zod.check = (payload) => {
      let input = payload.value;
      if (input.size >= def.minimum) return;
      payload.issues.push({
        origin: util.getSizableOrigin(input),
        code: "too_small",
        minimum: def.minimum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort,
      });
    };
  });
  cjsExports.$ZodCheckSizeEquals = core.$constructor("$ZodCheckSizeEquals", (inst, def) => {
    var _a;
    cjsExports.$ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = _whenHasSize);
    inst._zod.check = (payload) => {
      let input = payload.value;
      let size = input.size;
      if (size === def.size) return;
      let tooBig = size > def.size;
      payload.issues.push({
        origin: util.getSizableOrigin(input),
        ...(tooBig
          ? {
              code: "too_big",
              maximum: def.size,
            }
          : {
              code: "too_small",
              minimum: def.size,
            }),
        inclusive: true,
        exact: true,
        input: payload.value,
        inst,
        continue: !def.abort,
      });
    };
  });
  cjsExports.$ZodCheckMaxLength = core.$constructor("$ZodCheckMaxLength", (inst, def) => {
    var _a;
    cjsExports.$ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
    inst._zod.check = (payload) => {
      let input = payload.value;
      let units = input.length;
      if (
        (typeof input === "string" && units > def.maximum ? util.codePointLength(input) : units) <=
        def.maximum
      )
        return;
      let origin = util.getLengthableOrigin(input);
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
  cjsExports.$ZodCheckMinLength = core.$constructor("$ZodCheckMinLength", (inst, def) => {
    var _a;
    cjsExports.$ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
    inst._zod.check = (payload) => {
      let input = payload.value;
      let units = input.length;
      if (
        (typeof input === "string" && units >= def.minimum && units < def.minimum * 2
          ? util.codePointLength(input)
          : units) >= def.minimum
      )
        return;
      let origin = util.getLengthableOrigin(input);
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
  cjsExports.$ZodCheckLengthEquals = core.$constructor("$ZodCheckLengthEquals", (inst, def) => {
    var _a;
    cjsExports.$ZodCheck.init(inst, def);
    (_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
    inst._zod.check = (payload) => {
      let input = payload.value;
      let units = input.length;
      let length =
        typeof input === "string" && units >= def.length && units <= def.length * 2
          ? util.codePointLength(input)
          : units;
      if (length === def.length) return;
      let origin = util.getLengthableOrigin(input);
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
  cjsExports.$ZodCheckStringFormat = core.$constructor("$ZodCheckStringFormat", (inst, def) => {
    var _a;
    var _b;
    cjsExports.$ZodCheck.init(inst, def);
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
  cjsExports.$ZodCheckRegex = core.$constructor("$ZodCheckRegex", (inst, def) => {
    cjsExports.$ZodCheckStringFormat.init(inst, def);
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
  cjsExports.$ZodCheckLowerCase = core.$constructor("$ZodCheckLowerCase", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.lowercase);
    cjsExports.$ZodCheckStringFormat.init(inst, def);
  });
  cjsExports.$ZodCheckUpperCase = core.$constructor("$ZodCheckUpperCase", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.uppercase);
    cjsExports.$ZodCheckStringFormat.init(inst, def);
  });
  cjsExports.$ZodCheckIncludes = core.$constructor("$ZodCheckIncludes", (inst, def) => {
    cjsExports.$ZodCheck.init(inst, def);
    let escapedRegex = util.escapeRegex(def.includes);
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
  cjsExports.$ZodCheckStartsWith = core.$constructor("$ZodCheckStartsWith", (inst, def) => {
    cjsExports.$ZodCheck.init(inst, def);
    let pattern = new RegExp(`^${util.escapeRegex(def.prefix)}.*`);
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
  cjsExports.$ZodCheckEndsWith = core.$constructor("$ZodCheckEndsWith", (inst, def) => {
    cjsExports.$ZodCheck.init(inst, def);
    let pattern = new RegExp(`.*${util.escapeRegex(def.suffix)}$`);
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
  function handleCheckPropertyResult(result, payload, property) {
    if (result.issues.length) payload.issues.push(...util.prefixIssues(property, result.issues));
  }
  cjsExports.$ZodCheckProperty = core.$constructor("$ZodCheckProperty", (inst, def) => {
    cjsExports.$ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      let result = def.schema._zod.run(
        {
          value: payload.value[def.property],
          issues: [],
        },
        {},
      );
      if (result instanceof Promise)
        return result.then((result) => handleCheckPropertyResult(result, payload, def.property));
      handleCheckPropertyResult(result, payload, def.property);
      return;
    };
  });
  cjsExports.$ZodCheckMimeType = core.$constructor("$ZodCheckMimeType", (inst, def) => {
    cjsExports.$ZodCheck.init(inst, def);
    let mimeSet = new Set(def.mime);
    inst._zod.check = (payload) => {
      if (mimeSet.has(payload.value.type)) return;
      payload.issues.push({
        code: "invalid_value",
        values: def.mime,
        input: payload.value.type,
        inst,
        continue: !def.abort,
      });
    };
  });
  cjsExports.$ZodCheckOverwrite = core.$constructor("$ZodCheckOverwrite", (inst, def) => {
    cjsExports.$ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      payload.value = def.tx(payload.value);
    };
  });
  (function () {
    var keys = Object.getOwnPropertyNames(cjsExports);
    for (var i = 0; i < keys.length; i++) {
      var desc = Object.getOwnPropertyDescriptor(cjsExports, keys[i]);
      if (!desc || !desc.get || !desc.configurable) continue;
      var value;
      try {
        value = desc.get();
      } catch (e) {
        continue;
      }
      if (value === undefined) continue;
      Object.defineProperty(cjsExports, keys[i], {
        value,
        writable: false,
        enumerable: desc.enumerable,
        configurable: false,
      });
    }
    Object.freeze(cjsExports);
  })();
});
export { require_checks };
