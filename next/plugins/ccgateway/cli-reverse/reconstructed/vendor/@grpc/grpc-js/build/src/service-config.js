/**
 * @grpc/grpc-js/build/src/service-config.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_constants } from "./constants.js";

//@ chunk-3k21nfa0.js:21748-30265 cjs-fingerprint
var require_service_config = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.validateRetryThrottling = validateRetryThrottling;
  cjsExports.validateServiceConfig = validateServiceConfig;
  cjsExports.extractAndSelectServiceConfig = extractAndSelectServiceConfig;
  var os = importMetaRequire("os");
  var constants_1 = require_constants();
  var DURATION_REGEX = /^\d+(\.\d{1,9})?s$/;
  var CLIENT_LANGUAGE_STRING = "node";
  function validateName(obj) {
    if ("service" in obj && obj.service !== "") {
      if (typeof obj.service !== "string")
        throw Error(
          `Invalid method config name: invalid service: expected type string, got ${typeof obj.service}`,
        );
      if ("method" in obj && obj.method !== "") {
        if (typeof obj.method !== "string")
          throw Error(
            `Invalid method config name: invalid method: expected type string, got ${typeof obj.service}`,
          );
        return {
          service: obj.service,
          method: obj.method,
        };
      } else
        return {
          service: obj.service,
        };
    } else {
      if ("method" in obj && obj.method !== undefined)
        throw Error("Invalid method config name: method set with empty or unset service");
      return {};
    }
  }
  function validateRetryPolicy(obj) {
    if (!("maxAttempts" in obj) || !Number.isInteger(obj.maxAttempts) || obj.maxAttempts < 2)
      throw Error("Invalid method config retry policy: maxAttempts must be an integer at least 2");
    if (
      !("initialBackoff" in obj) ||
      typeof obj.initialBackoff !== "string" ||
      !DURATION_REGEX.test(obj.initialBackoff)
    )
      throw Error(
        "Invalid method config retry policy: initialBackoff must be a string consisting of a positive integer or decimal followed by s",
      );
    if (!("maxBackoff" in obj) || typeof obj.maxBackoff !== "string" || !DURATION_REGEX.test(obj.maxBackoff))
      throw Error(
        "Invalid method config retry policy: maxBackoff must be a string consisting of a positive integer or decimal followed by s",
      );
    if (
      !("backoffMultiplier" in obj) ||
      typeof obj.backoffMultiplier !== "number" ||
      obj.backoffMultiplier <= 0
    )
      throw Error("Invalid method config retry policy: backoffMultiplier must be a number greater than 0");
    if (!("retryableStatusCodes" in obj && Array.isArray(obj.retryableStatusCodes)))
      throw Error("Invalid method config retry policy: retryableStatusCodes is required");
    if (obj.retryableStatusCodes.length === 0)
      throw Error("Invalid method config retry policy: retryableStatusCodes must be non-empty");
    for (let value of obj.retryableStatusCodes)
      if (typeof value === "number") {
        if (!Object.values(constants_1.Status).includes(value))
          throw Error(
            "Invalid method config retry policy: retryableStatusCodes value not in status code range",
          );
      } else if (typeof value === "string") {
        if (!Object.values(constants_1.Status).includes(value.toUpperCase()))
          throw Error(
            "Invalid method config retry policy: retryableStatusCodes value not a status code name",
          );
      } else
        throw Error(
          "Invalid method config retry policy: retryableStatusCodes value must be a string or number",
        );
    return {
      maxAttempts: obj.maxAttempts,
      initialBackoff: obj.initialBackoff,
      maxBackoff: obj.maxBackoff,
      backoffMultiplier: obj.backoffMultiplier,
      retryableStatusCodes: obj.retryableStatusCodes,
    };
  }
  function validateHedgingPolicy(obj) {
    if (!("maxAttempts" in obj) || !Number.isInteger(obj.maxAttempts) || obj.maxAttempts < 2)
      throw Error("Invalid method config hedging policy: maxAttempts must be an integer at least 2");
    if (
      "hedgingDelay" in obj &&
      (typeof obj.hedgingDelay !== "string" || !DURATION_REGEX.test(obj.hedgingDelay))
    )
      throw Error(
        "Invalid method config hedging policy: hedgingDelay must be a string consisting of a positive integer followed by s",
      );
    if ("nonFatalStatusCodes" in obj && Array.isArray(obj.nonFatalStatusCodes))
      for (let value of obj.nonFatalStatusCodes)
        if (typeof value === "number") {
          if (!Object.values(constants_1.Status).includes(value))
            throw Error(
              "Invalid method config hedging policy: nonFatalStatusCodes value not in status code range",
            );
        } else if (typeof value === "string") {
          if (!Object.values(constants_1.Status).includes(value.toUpperCase()))
            throw Error(
              "Invalid method config hedging policy: nonFatalStatusCodes value not a status code name",
            );
        } else
          throw Error(
            "Invalid method config hedging policy: nonFatalStatusCodes value must be a string or number",
          );
    let result = {
      maxAttempts: obj.maxAttempts,
    };
    if (obj.hedgingDelay) result.hedgingDelay = obj.hedgingDelay;
    if (obj.nonFatalStatusCodes) result.nonFatalStatusCodes = obj.nonFatalStatusCodes;
    return result;
  }
  function validateMethodConfig(obj) {
    var _a;
    let result = {
      name: [],
    };
    if (!("name" in obj) || !Array.isArray(obj.name))
      throw Error("Invalid method config: invalid name array");
    for (let name of obj.name) result.name.push(validateName(name));
    if ("waitForReady" in obj) {
      if (typeof obj.waitForReady !== "boolean") throw Error("Invalid method config: invalid waitForReady");
      result.waitForReady = obj.waitForReady;
    }
    if ("timeout" in obj)
      if (typeof obj.timeout === "object") {
        if (!("seconds" in obj.timeout) || typeof obj.timeout.seconds !== "number")
          throw Error("Invalid method config: invalid timeout.seconds");
        if (!("nanos" in obj.timeout) || typeof obj.timeout.nanos !== "number")
          throw Error("Invalid method config: invalid timeout.nanos");
        result.timeout = obj.timeout;
      } else if (typeof obj.timeout === "string" && DURATION_REGEX.test(obj.timeout)) {
        let timeoutParts = obj.timeout.substring(0, obj.timeout.length - 1).split(".");
        result.timeout = {
          seconds: timeoutParts[0] | 0,
          nanos: ((_a = timeoutParts[1]) !== null && _a !== undefined ? _a : 0) | 0,
        };
      } else throw Error("Invalid method config: invalid timeout");
    if ("maxRequestBytes" in obj) {
      if (typeof obj.maxRequestBytes !== "number")
        throw Error("Invalid method config: invalid maxRequestBytes");
      result.maxRequestBytes = obj.maxRequestBytes;
    }
    if ("maxResponseBytes" in obj) {
      if (typeof obj.maxResponseBytes !== "number")
        throw Error("Invalid method config: invalid maxRequestBytes");
      result.maxResponseBytes = obj.maxResponseBytes;
    }
    if ("retryPolicy" in obj) {
      if ("hedgingPolicy" in obj)
        throw Error("Invalid method config: retryPolicy and hedgingPolicy cannot both be specified");
      else result.retryPolicy = validateRetryPolicy(obj.retryPolicy);
    } else if ("hedgingPolicy" in obj) result.hedgingPolicy = validateHedgingPolicy(obj.hedgingPolicy);
    return result;
  }
  function validateRetryThrottling(obj) {
    if (
      !("maxTokens" in obj) ||
      typeof obj.maxTokens !== "number" ||
      obj.maxTokens <= 0 ||
      obj.maxTokens > 1000
    )
      throw Error("Invalid retryThrottling: maxTokens must be a number in (0, 1000]");
    if (!("tokenRatio" in obj) || typeof obj.tokenRatio !== "number" || obj.tokenRatio <= 0)
      throw Error("Invalid retryThrottling: tokenRatio must be a number greater than 0");
    return {
      maxTokens: +obj.maxTokens.toFixed(3),
      tokenRatio: +obj.tokenRatio.toFixed(3),
    };
  }
  function validateLoadBalancingConfig(obj) {
    if (!(typeof obj === "object" && obj !== null))
      throw Error(`Invalid loadBalancingConfig: unexpected type ${typeof obj}`);
    let keys = Object.keys(obj);
    if (keys.length > 1) throw Error(`Invalid loadBalancingConfig: unexpected multiple keys ${keys}`);
    if (keys.length === 0) throw Error("Invalid loadBalancingConfig: load balancing policy name required");
    return {
      [keys[0]]: obj[keys[0]],
    };
  }
  function validateServiceConfig(obj) {
    let result = {
      loadBalancingConfig: [],
      methodConfig: [],
    };
    if ("loadBalancingPolicy" in obj)
      if (typeof obj.loadBalancingPolicy === "string") result.loadBalancingPolicy = obj.loadBalancingPolicy;
      else throw Error("Invalid service config: invalid loadBalancingPolicy");
    if ("loadBalancingConfig" in obj)
      if (Array.isArray(obj.loadBalancingConfig))
        for (let config of obj.loadBalancingConfig)
          result.loadBalancingConfig.push(validateLoadBalancingConfig(config));
      else throw Error("Invalid service config: invalid loadBalancingConfig");
    if ("methodConfig" in obj) {
      if (Array.isArray(obj.methodConfig))
        for (let methodConfig of obj.methodConfig)
          result.methodConfig.push(validateMethodConfig(methodConfig));
    }
    if ("retryThrottling" in obj) result.retryThrottling = validateRetryThrottling(obj.retryThrottling);
    let seenMethodNames = [];
    for (let methodConfig of result.methodConfig)
      for (let name of methodConfig.name) {
        for (let seenName of seenMethodNames)
          if (name.service === seenName.service && name.method === seenName.method)
            throw Error(`Invalid service config: duplicate name ${name.service}/${name.method}`);
        seenMethodNames.push(name);
      }
    return result;
  }
  function validateCanaryConfig(obj) {
    if (!("serviceConfig" in obj)) throw Error("Invalid service config choice: missing service config");
    let result = {
      serviceConfig: validateServiceConfig(obj.serviceConfig),
    };
    if ("clientLanguage" in obj)
      if (Array.isArray(obj.clientLanguage)) {
        result.clientLanguage = [];
        for (let lang of obj.clientLanguage)
          if (typeof lang === "string") result.clientLanguage.push(lang);
          else throw Error("Invalid service config choice: invalid clientLanguage");
      } else throw Error("Invalid service config choice: invalid clientLanguage");
    if ("clientHostname" in obj)
      if (Array.isArray(obj.clientHostname)) {
        result.clientHostname = [];
        for (let lang of obj.clientHostname)
          if (typeof lang === "string") result.clientHostname.push(lang);
          else throw Error("Invalid service config choice: invalid clientHostname");
      } else throw Error("Invalid service config choice: invalid clientHostname");
    if ("percentage" in obj)
      if (typeof obj.percentage === "number" && 0 <= obj.percentage && obj.percentage <= 100)
        result.percentage = obj.percentage;
      else throw Error("Invalid service config choice: invalid percentage");
    let allowedFields = ["clientLanguage", "percentage", "clientHostname", "serviceConfig"];
    for (let field in obj)
      if (!allowedFields.includes(field))
        throw Error(`Invalid service config choice: unexpected field ${field}`);
    return result;
  }
  function validateAndSelectCanaryConfig(obj, percentage) {
    if (!Array.isArray(obj)) throw Error("Invalid service config list");
    for (let config of obj) {
      let validatedConfig = validateCanaryConfig(config);
      if (typeof validatedConfig.percentage === "number" && percentage > validatedConfig.percentage) continue;
      if (Array.isArray(validatedConfig.clientHostname)) {
        let hostnameMatched = false;
        for (let hostname of validatedConfig.clientHostname)
          if (hostname === os.hostname()) hostnameMatched = true;
        if (!hostnameMatched) continue;
      }
      if (Array.isArray(validatedConfig.clientLanguage)) {
        let languageMatched = false;
        for (let language of validatedConfig.clientLanguage)
          if (language === CLIENT_LANGUAGE_STRING) languageMatched = true;
        if (!languageMatched) continue;
      }
      return validatedConfig.serviceConfig;
    }
    throw Error("No matching service config found");
  }
  function extractAndSelectServiceConfig(txtRecord, percentage) {
    for (let record of txtRecord)
      if (record.length > 0 && record[0].startsWith("grpc_config=")) {
        let recordString = record.join("").substring(12);
        let recordJson = JSON.parse(recordString);
        return validateAndSelectCanaryConfig(recordJson, percentage);
      }
    return null;
  }
});
export { require_service_config };
