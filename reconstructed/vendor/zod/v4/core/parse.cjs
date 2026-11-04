/**
 * zod/v4/core/parse.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_core } from "./core.cjs";
import { require_errors_2 } from "./errors.cjs";
import { require_util } from "./util.cjs";

//@ chunk-1ny7cxrt.js:110963-116076 cjs-fingerprint
var require_parse = __commonJS(function (cjsExports) {
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
  cjsExports.safeDecodeAsync =
    cjsExports._safeDecodeAsync =
    cjsExports.safeEncodeAsync =
    cjsExports._safeEncodeAsync =
    cjsExports.safeDecode =
    cjsExports._safeDecode =
    cjsExports.safeEncode =
    cjsExports._safeEncode =
    cjsExports.decodeAsync =
    cjsExports._decodeAsync =
    cjsExports.encodeAsync =
    cjsExports._encodeAsync =
    cjsExports.decode =
    cjsExports._decode =
    cjsExports.encode =
    cjsExports._encode =
    cjsExports.validateAsync =
    cjsExports.validate =
    cjsExports.safeParseAsync =
    cjsExports._safeParseAsync =
    cjsExports.safeParse =
    cjsExports._safeParse =
    cjsExports.parseAsync =
    cjsExports._parseAsync =
    cjsExports.parse =
    cjsExports._parse =
      undefined;
  var core = __importStar(require_core());
  var errors = __importStar(require_errors_2());
  var util = __importStar(require_util());
  function finalizeParams(callee, params) {
    return {
      callee: params?.callee ?? callee,
      Err: params?.Err,
    };
  }
  var _parse = (_Err) => {
    let fn = (schema, value, _ctx, _params) => {
      let ctx = _ctx
        ? {
            ..._ctx,
            async: false,
          }
        : {
            async: false,
          };
      let result = schema._zod.run(
        {
          value,
          issues: [],
        },
        ctx,
      );
      if (result instanceof Promise) throw new core.$ZodAsyncError();
      if (result.issues.length) {
        let e = new (_params?.Err ?? _Err)(
          result.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
        );
        util.captureStackTrace(e, _params?.callee ?? fn);
        throw e;
      }
      return result.value;
    };
    return fn;
  };
  cjsExports._parse = _parse;
  cjsExports.parse = (0, cjsExports._parse)(errors.$ZodRealError);
  var _parseAsync = (_Err) => {
    let fn = async (schema, value, _ctx, params) => {
      let ctx = _ctx
        ? {
            ..._ctx,
            async: true,
          }
        : {
            async: true,
          };
      let result = schema._zod.run(
        {
          value,
          issues: [],
        },
        ctx,
      );
      if (result instanceof Promise) result = await result;
      if (result.issues.length) {
        let e = new (params?.Err ?? _Err)(
          result.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
        );
        util.captureStackTrace(e, params?.callee ?? fn);
        throw e;
      }
      return result.value;
    };
    return fn;
  };
  cjsExports._parseAsync = _parseAsync;
  cjsExports.parseAsync = (0, cjsExports._parseAsync)(errors.$ZodRealError);
  var _safeParse = (_Err) => (schema, value, _ctx) => {
    let ctx = _ctx
      ? {
          ..._ctx,
          async: false,
        }
      : {
          async: false,
        };
    let result = schema._zod.run(
      {
        value,
        issues: [],
      },
      ctx,
    );
    if (result instanceof Promise) throw new core.$ZodAsyncError();
    return result.issues.length
      ? failure(_Err, result.issues, ctx)
      : {
          success: true,
          data: result.value,
        };
  };
  cjsExports._safeParse = _safeParse;
  cjsExports.safeParse = (0, cjsExports._safeParse)(errors.$ZodRealError);
  function failure(Err, issues, ctx) {
    let error;
    return {
      success: false,
      get error() {
        if (!error) {
          error = new Err(issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())));
          issues = undefined;
          ctx = undefined;
        }
        return error;
      },
      set error(e) {
        error = e;
        issues = undefined;
        ctx = undefined;
      },
    };
  }
  var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
    let ctx = _ctx
      ? {
          ..._ctx,
          async: true,
        }
      : {
          async: true,
        };
    let result = schema._zod.run(
      {
        value,
        issues: [],
      },
      ctx,
    );
    if (result instanceof Promise) result = await result;
    return result.issues.length
      ? failure(_Err, result.issues, ctx)
      : {
          success: true,
          data: result.value,
        };
  };
  cjsExports._safeParseAsync = _safeParseAsync;
  cjsExports.safeParseAsync = (0, cjsExports._safeParseAsync)(errors.$ZodRealError);
  var COMPILE_INVALID = Symbol.for("zod.compile.invalid");
  var COMPILE_FALLBACK = Symbol.for("zod.compile.fallback");
  cjsExports.validate = (schema, value, _ctx) => {
    let validator = schema._zod.bag.validator;
    if (validator !== undefined) {
      if (validator(value) !== COMPILE_INVALID) return true;
      if (validator.definite === true && _ctx === undefined) return false;
    }
    return validateFallback(schema, value, _ctx);
  };
  function validateFallback(schema, value, _ctx) {
    let ctx = _ctx
      ? {
          ..._ctx,
          async: false,
          abortEarly: true,
        }
      : {
          async: false,
          abortEarly: true,
        };
    let fallbackRun = schema._zod.bag.fallbackRun;
    let result;
    if (fallbackRun) {
      ctx[COMPILE_FALLBACK] = true;
      result = fallbackRun(
        {
          value,
          issues: [],
        },
        ctx,
      );
    } else
      result = schema._zod.run(
        {
          value,
          issues: [],
        },
        ctx,
      );
    if (result instanceof Promise) throw new core.$ZodAsyncError();
    return result.issues.length === 0;
  }
  var validateAsync = async (schema, value, _ctx) => {
    let ctx = _ctx
      ? {
          ..._ctx,
          async: true,
          abortEarly: true,
        }
      : {
          async: true,
          abortEarly: true,
        };
    let result = schema._zod.run(
      {
        value,
        issues: [],
      },
      ctx,
    );
    if (result instanceof Promise) result = await result;
    return result.issues.length === 0;
  };
  cjsExports.validateAsync = validateAsync;
  var _encode = (_Err) => {
    let parse = (0, cjsExports._parse)(_Err);
    let fn = (schema, value, _ctx, _params) => {
      let ctx = _ctx
        ? {
            ..._ctx,
            direction: "backward",
          }
        : {
            direction: "backward",
          };
      return parse(schema, value, ctx, finalizeParams(fn, _params));
    };
    return fn;
  };
  cjsExports._encode = _encode;
  cjsExports.encode = (0, cjsExports._encode)(errors.$ZodRealError);
  var _decode = (_Err) => {
    let parse = (0, cjsExports._parse)(_Err);
    let fn = (schema, value, _ctx, _params) => parse(schema, value, _ctx, finalizeParams(fn, _params));
    return fn;
  };
  cjsExports._decode = _decode;
  cjsExports.decode = (0, cjsExports._decode)(errors.$ZodRealError);
  var _encodeAsync = (_Err) => {
    let parseAsync = (0, cjsExports._parseAsync)(_Err);
    let fn = async (schema, value, _ctx, _params) => {
      let ctx = _ctx
        ? {
            ..._ctx,
            direction: "backward",
          }
        : {
            direction: "backward",
          };
      return await parseAsync(schema, value, ctx, finalizeParams(fn, _params));
    };
    return fn;
  };
  cjsExports._encodeAsync = _encodeAsync;
  cjsExports.encodeAsync = (0, cjsExports._encodeAsync)(errors.$ZodRealError);
  var _decodeAsync = (_Err) => {
    let parseAsync = (0, cjsExports._parseAsync)(_Err);
    let fn = async (schema, value, _ctx, _params) =>
      await parseAsync(schema, value, _ctx, finalizeParams(fn, _params));
    return fn;
  };
  cjsExports._decodeAsync = _decodeAsync;
  cjsExports.decodeAsync = (0, cjsExports._decodeAsync)(errors.$ZodRealError);
  var _safeEncode = (_Err) => (schema, value, _ctx) => {
    let ctx = _ctx
      ? {
          ..._ctx,
          direction: "backward",
        }
      : {
          direction: "backward",
        };
    return (0, cjsExports._safeParse)(_Err)(schema, value, ctx);
  };
  cjsExports._safeEncode = _safeEncode;
  cjsExports.safeEncode = (0, cjsExports._safeEncode)(errors.$ZodRealError);
  var _safeDecode = (_Err) => (schema, value, _ctx) => (0, cjsExports._safeParse)(_Err)(schema, value, _ctx);
  cjsExports._safeDecode = _safeDecode;
  cjsExports.safeDecode = (0, cjsExports._safeDecode)(errors.$ZodRealError);
  var _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
    let ctx = _ctx
      ? {
          ..._ctx,
          direction: "backward",
        }
      : {
          direction: "backward",
        };
    return (0, cjsExports._safeParseAsync)(_Err)(schema, value, ctx);
  };
  cjsExports._safeEncodeAsync = _safeEncodeAsync;
  cjsExports.safeEncodeAsync = (0, cjsExports._safeEncodeAsync)(errors.$ZodRealError);
  var _safeDecodeAsync = (_Err) => async (schema, value, _ctx) =>
    (0, cjsExports._safeParseAsync)(_Err)(schema, value, _ctx);
  cjsExports._safeDecodeAsync = _safeDecodeAsync;
  cjsExports.safeDecodeAsync = (0, cjsExports._safeDecodeAsync)(errors.$ZodRealError);
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
export { require_parse };
