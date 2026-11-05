/**
 * zod/v4/core/parse.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-m4y44r15.js (15)
 * attribution: esm-fingerprint 12, esm-layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { $ZodAsyncError, config } from "./core.js";
import { finalizeIssue, captureStackTrace } from "./util.js";
import { $ZodRealError } from "./errors.js";

//@ chunk-m4y44r15.js:2814-2870 esm-fingerprint
function finalizeParams(callee, params) {
  return {
    callee: params?.callee ?? callee,
    Err: params?.Err,
  };
}
//@ chunk-m4y44r15.js:2870-3140 esm-fingerprint
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
    if (result instanceof Promise) throw new $ZodAsyncError();
    if (result.issues.length) {
      let e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, _params?.callee ?? fn);
      throw e;
    }
    return result.value;
  };
  return fn;
};
//@ chunk-m4y44r15.js:3140-3411 esm-fingerprint
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
      let e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, params?.callee ?? fn);
      throw e;
    }
    return result.value;
  };
  return fn;
};
//@ chunk-m4y44r15.js:3411-3618 esm-fingerprint
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
  if (result instanceof Promise) throw new $ZodAsyncError();
  return result.issues.length
    ? failure(_Err, result.issues, ctx)
    : {
        success: true,
        data: result.value,
      };
};
var safeParseReal = _safeParse($ZodRealError);
//@ chunk-m4y44r15.js:3618-3780 esm-fingerprint
function failure(Err, issues, ctx) {
  let error;
  return {
    success: false,
    get error() {
      if (!error) {
        error = new Err(issues.map((iss) => finalizeIssue(iss, ctx, config())));
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
//@ chunk-m4y44r15.js:3780-3979 esm-fingerprint
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
//@ chunk-m4y44r15.js:3979-4193 esm-fingerprint
var COMPILE_INVALID = Symbol.for("zod.compile.invalid");
var COMPILE_FALLBACK = Symbol.for("zod.compile.fallback");
var validate = (schema, value, _ctx) => {
  let validator = schema._zod.bag.validator;
  if (validator !== undefined) {
    if (validator(value) !== COMPILE_INVALID) return true;
    if (validator.definite === true && _ctx === undefined) return false;
  }
  return validateFallback(schema, value, _ctx);
};
//@ chunk-m4y44r15.js:4193-4449 esm-fingerprint
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
  if (result instanceof Promise) throw new $ZodAsyncError();
  return result.issues.length === 0;
}
//@ chunk-m4y44r15.js:4449-4761 esm-fingerprint
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
var _encode = (_Err) => {
  let parse = _parse(_Err);
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
//@ chunk-m4y44r15.js:4761-4826 esm-layout
var decodeFactory = (_Err) => {
  let parse = _parse(_Err);
  let fn = (schema, value, _ctx, _params) => parse(schema, value, _ctx, finalizeParams(fn, _params));
  return fn;
};
//@ chunk-m4y44r15.js:4826-4970 esm-fingerprint
var _encodeAsync = (_Err) => {
  let parseAsync = _parseAsync(_Err);
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
//@ chunk-m4y44r15.js:4970-5046 esm-layout
var decodeAsyncFactory = (_Err) => {
  let parseAsync = _parseAsync(_Err);
  let fn = async (schema, value, _ctx, _params) =>
    await parseAsync(schema, value, _ctx, finalizeParams(fn, _params));
  return fn;
};
//@ chunk-m4y44r15.js:5046-5147 esm-fingerprint
var _safeEncode = (_Err) => (schema, value, _ctx) => {
  let ctx = _ctx
    ? {
        ..._ctx,
        direction: "backward",
      }
    : {
        direction: "backward",
      };
  return _safeParse(_Err)(schema, value, ctx);
};
//@ chunk-m4y44r15.js:5147-5180 esm-layout
var safeDecodeFactory = (_Err) => (schema, value, _ctx) => _safeParse(_Err)(schema, value, _ctx);
//@ chunk-m4y44r15.js:5180-5287 esm-fingerprint
var _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  let ctx = _ctx
    ? {
        ..._ctx,
        direction: "backward",
      }
    : {
        direction: "backward",
      };
  return _safeParseAsync(_Err)(schema, value, ctx);
};
export {
  safeParseReal,
  _safeParseAsync,
  validate,
  validateAsync,
  _parse,
  _parseAsync,
  _safeParse,
  _encode,
  decodeFactory,
  _encodeAsync,
  decodeAsyncFactory,
  _safeEncode,
  safeDecodeFactory,
  _safeEncodeAsync,
};
