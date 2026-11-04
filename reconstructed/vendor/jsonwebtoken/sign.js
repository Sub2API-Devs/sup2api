/**
 * jsonwebtoken/sign.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../runtime/bun-runtime.js";
import { require_timespan } from "./lib/timespan.js";
import { require_psSupported } from "./lib/psSupported.js";
import { require_validateAsymmetricKey } from "./lib/validateAsymmetricKey.js";
import { require_jws } from "../jws/index.js";
import { require_lodash_includes } from "../lodash.includes/index.js";
import { require_lodash_isboolean } from "../lodash.isboolean/index.js";
import { require_lodash_isinteger } from "../lodash.isinteger/index.js";
import { require_lodash_isnumber } from "../lodash.isnumber/index.js";
import { require_lodash_isplainobject } from "../lodash.isplainobject/index.js";
import { require_lodash_isstring } from "../lodash.isstring/index.js";
import { require_lodash_once } from "../lodash.once/index.js";

//@ chunk-mrx6y2r5.js:17076-22157 cjs-fingerprint
var require_sign = __commonJS(function (cjsExports, cjsModule) {
  var timespan = require_timespan();
  var PS_SUPPORTED = require_psSupported();
  var validateAsymmetricKey = require_validateAsymmetricKey();
  var jws = require_jws();
  var includes = require_lodash_includes();
  var isBoolean = require_lodash_isboolean();
  var isInteger = require_lodash_isinteger();
  var isNumber = require_lodash_isnumber();
  var isPlainObject = require_lodash_isplainobject();
  var isString = require_lodash_isstring();
  var once = require_lodash_once();
  var { KeyObject, createSecretKey, createPrivateKey } = importMetaRequire("crypto");
  var SUPPORTED_ALGS = [
    "RS256",
    "RS384",
    "RS512",
    "ES256",
    "ES384",
    "ES512",
    "HS256",
    "HS384",
    "HS512",
    "none",
  ];
  if (PS_SUPPORTED) SUPPORTED_ALGS.splice(3, 0, "PS256", "PS384", "PS512");
  var sign_options_schema = {
    expiresIn: {
      isValid: function (value) {
        return isInteger(value) || (isString(value) && value);
      },
      message: '"expiresIn" should be a number of seconds or string representing a timespan',
    },
    notBefore: {
      isValid: function (value) {
        return isInteger(value) || (isString(value) && value);
      },
      message: '"notBefore" should be a number of seconds or string representing a timespan',
    },
    audience: {
      isValid: function (value) {
        return isString(value) || Array.isArray(value);
      },
      message: '"audience" must be a string or array',
    },
    algorithm: {
      isValid: includes.bind(null, SUPPORTED_ALGS),
      message: '"algorithm" must be a valid string enum value',
    },
    header: {
      isValid: isPlainObject,
      message: '"header" must be an object',
    },
    encoding: {
      isValid: isString,
      message: '"encoding" must be a string',
    },
    issuer: {
      isValid: isString,
      message: '"issuer" must be a string',
    },
    subject: {
      isValid: isString,
      message: '"subject" must be a string',
    },
    jwtid: {
      isValid: isString,
      message: '"jwtid" must be a string',
    },
    noTimestamp: {
      isValid: isBoolean,
      message: '"noTimestamp" must be a boolean',
    },
    keyid: {
      isValid: isString,
      message: '"keyid" must be a string',
    },
    mutatePayload: {
      isValid: isBoolean,
      message: '"mutatePayload" must be a boolean',
    },
    allowInsecureKeySizes: {
      isValid: isBoolean,
      message: '"allowInsecureKeySizes" must be a boolean',
    },
    allowInvalidAsymmetricKeyTypes: {
      isValid: isBoolean,
      message: '"allowInvalidAsymmetricKeyTypes" must be a boolean',
    },
  };
  var registered_claims_schema = {
    iat: {
      isValid: isNumber,
      message: '"iat" should be a number of seconds',
    },
    exp: {
      isValid: isNumber,
      message: '"exp" should be a number of seconds',
    },
    nbf: {
      isValid: isNumber,
      message: '"nbf" should be a number of seconds',
    },
  };
  function validate(schema, allowUnknown, object, parameterName) {
    if (!isPlainObject(object)) throw Error('Expected "' + parameterName + '" to be a plain object.');
    Object.keys(object).forEach(function (key) {
      let validator = schema[key];
      if (!validator) {
        if (!allowUnknown) throw Error('"' + key + '" is not allowed in "' + parameterName + '"');
        return;
      }
      if (!validator.isValid(object[key])) throw Error(validator.message);
    });
  }
  function validateOptions(options) {
    return validate(sign_options_schema, false, options, "options");
  }
  function validatePayload(payload) {
    return validate(registered_claims_schema, true, payload, "payload");
  }
  var options_to_payload = {
    audience: "aud",
    issuer: "iss",
    subject: "sub",
    jwtid: "jti",
  };
  var options_for_objects = [
    "expiresIn",
    "notBefore",
    "noTimestamp",
    "audience",
    "issuer",
    "subject",
    "jwtid",
  ];
  cjsModule.exports = function (payload, secretOrPrivateKey, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    } else options = options || {};
    let isObjectPayload = typeof payload === "object" && !Buffer.isBuffer(payload);
    let header = Object.assign(
      {
        alg: options.algorithm || "HS256",
        typ: isObjectPayload ? "JWT" : undefined,
        kid: options.keyid,
      },
      options.header,
    );
    function failure(err) {
      if (callback) return callback(err);
      throw err;
    }
    if (!secretOrPrivateKey && options.algorithm !== "none")
      return failure(Error("secretOrPrivateKey must have a value"));
    if (secretOrPrivateKey != null && !(secretOrPrivateKey instanceof KeyObject))
      try {
        secretOrPrivateKey = createPrivateKey(secretOrPrivateKey);
      } catch (_) {
        try {
          secretOrPrivateKey = createSecretKey(
            typeof secretOrPrivateKey === "string" ? Buffer.from(secretOrPrivateKey) : secretOrPrivateKey,
          );
        } catch (_) {
          return failure(Error("secretOrPrivateKey is not valid key material"));
        }
      }
    if (header.alg.startsWith("HS") && secretOrPrivateKey.type !== "secret")
      return failure(Error(`secretOrPrivateKey must be a symmetric key when using ${header.alg}`));
    else if (/^(?:RS|PS|ES)/.test(header.alg)) {
      if (secretOrPrivateKey.type !== "private")
        return failure(Error(`secretOrPrivateKey must be an asymmetric key when using ${header.alg}`));
      if (
        !options.allowInsecureKeySizes &&
        !header.alg.startsWith("ES") &&
        secretOrPrivateKey.asymmetricKeyDetails !== undefined &&
        secretOrPrivateKey.asymmetricKeyDetails.modulusLength < 2048
      )
        return failure(Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`));
    }
    if (typeof payload === "undefined") return failure(Error("payload is required"));
    else if (isObjectPayload) {
      try {
        validatePayload(payload);
      } catch (error) {
        return failure(error);
      }
      if (!options.mutatePayload) payload = Object.assign({}, payload);
    } else {
      let invalid_options = options_for_objects.filter(function (opt) {
        return typeof options[opt] !== "undefined";
      });
      if (invalid_options.length > 0)
        return failure(
          Error("invalid " + invalid_options.join(",") + " option for " + typeof payload + " payload"),
        );
    }
    if (typeof payload.exp !== "undefined" && typeof options.expiresIn !== "undefined")
      return failure(Error('Bad "options.expiresIn" option the payload already has an "exp" property.'));
    if (typeof payload.nbf !== "undefined" && typeof options.notBefore !== "undefined")
      return failure(Error('Bad "options.notBefore" option the payload already has an "nbf" property.'));
    try {
      validateOptions(options);
    } catch (error) {
      return failure(error);
    }
    if (!options.allowInvalidAsymmetricKeyTypes)
      try {
        validateAsymmetricKey(header.alg, secretOrPrivateKey);
      } catch (error) {
        return failure(error);
      }
    let timestamp = payload.iat || Math.floor(Date.now() / 1000);
    if (options.noTimestamp) delete payload.iat;
    else if (isObjectPayload) payload.iat = timestamp;
    if (typeof options.notBefore !== "undefined") {
      try {
        payload.nbf = timespan(options.notBefore, timestamp);
      } catch (err) {
        return failure(err);
      }
      if (typeof payload.nbf === "undefined")
        return failure(
          Error(
            '"notBefore" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60',
          ),
        );
    }
    if (typeof options.expiresIn !== "undefined" && typeof payload === "object") {
      try {
        payload.exp = timespan(options.expiresIn, timestamp);
      } catch (err) {
        return failure(err);
      }
      if (typeof payload.exp === "undefined")
        return failure(
          Error(
            '"expiresIn" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60',
          ),
        );
    }
    Object.keys(options_to_payload).forEach(function (key) {
      let claim = options_to_payload[key];
      if (typeof options[key] !== "undefined") {
        if (typeof payload[claim] !== "undefined")
          return failure(
            Error('Bad "options.' + key + '" option. The payload already has an "' + claim + '" property.'),
          );
        payload[claim] = options[key];
      }
    });
    let encoding = options.encoding || "utf8";
    if (typeof callback === "function") {
      callback = callback && once(callback);
      jws
        .createSign({
          header,
          privateKey: secretOrPrivateKey,
          payload,
          encoding,
        })
        .once("error", callback)
        .once("done", function (signature) {
          if (!options.allowInsecureKeySizes && /^(?:RS|PS)/.test(header.alg) && signature.length < 256)
            return callback(
              Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`),
            );
          callback(null, signature);
        });
    } else {
      let signature = jws.sign({
        header,
        payload,
        secret: secretOrPrivateKey,
        encoding,
      });
      if (!options.allowInsecureKeySizes && /^(?:RS|PS)/.test(header.alg) && signature.length < 256)
        throw Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${header.alg}`);
      return signature;
    }
  };
});
export { require_sign };
