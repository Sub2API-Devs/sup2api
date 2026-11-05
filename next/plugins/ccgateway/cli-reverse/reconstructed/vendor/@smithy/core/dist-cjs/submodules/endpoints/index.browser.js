/**
 * @smithy/core/dist-cjs/submodules/endpoints/index.browser.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-7ycvgepx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_types } from "../../../../types/dist-cjs/index.js";

//@ chunk-7ycvgepx.js:819-7701 cjs-fingerprint
var require_index_browser = __commonJS(function (cjsExports) {
  var EndpointURLScheme = require_types();
  class EndpointCache {
    capacity;
    data = new Map();
    parameters = [];
    constructor({ size, params }) {
      this.capacity = size ?? 50;
      if (params) this.parameters = params;
    }
    get(endpointParams, resolver) {
      let key = this.hash(endpointParams);
      if (key === false) return resolver();
      if (!this.data.has(key)) {
        if (this.data.size > this.capacity + 10) {
          let keys = this.data.keys();
          let i_2 = 0;
          while (true) {
            let { value, done } = keys.next();
            this.data.delete(value);
            if (done || ++i_2 > 10) break;
          }
        }
        this.data.set(key, resolver());
      }
      return this.data.get(key);
    }
    size() {
      return this.data.size;
    }
    hash(endpointParams) {
      let buffer = "";
      let { parameters } = this;
      if (parameters.length === 0) return false;
      for (let param of parameters) {
        let val = String(endpointParams[param] ?? "");
        if (val.includes("|;")) return false;
        buffer += val + "|;";
      }
      return buffer;
    }
  }
  var IP_V4_REGEX = new RegExp(
    "^(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}$",
  );
  var isIpAddress = (value) => IP_V4_REGEX.test(value) || (value.startsWith("[") && value.endsWith("]"));
  var regExp = new RegExp("^(?!.*-$)(?!-)[a-zA-Z0-9-]{1,63}$");
  var isValidHostLabel = (value, allowSubDomains = false) => {
    if (!allowSubDomains) return regExp.test(value);
    let parts = value.split(".");
    for (let label of parts) if (!isValidHostLabel(label)) return false;
    return true;
  };
  var customEndpointFunctions = {};
  var debugId = "endpoints";
  function toDebugString(input) {
    if (typeof input !== "object" || input == null) return input;
    if ("ref" in input) return `$${toDebugString(input.ref)}`;
    if ("fn" in input) return `${input.fn}(${(input.argv || []).map(toDebugString).join(", ")})`;
    return JSON.stringify(input, null, 2);
  }
  class EndpointError extends Error {
    constructor(message) {
      super(message);
      this.name = "EndpointError";
    }
  }
  var coalesce = (left, args) => left === args;
  var getAttrPathList = (path) => {
    let parts = path.split(".");
    let pathList = [];
    for (let part of parts) {
      let squareBracketIndex = part.indexOf("[");
      if (squareBracketIndex !== -1) {
        if (part.indexOf("]") !== part.length - 1)
          throw new EndpointError(`Path: '${path}' does not end with ']'`);
        let arrayIndex = part.slice(squareBracketIndex + 1, -1);
        if (Number.isNaN(parseInt(arrayIndex)))
          throw new EndpointError(`Invalid array index: '${arrayIndex}' in path: '${path}'`);
        if (squareBracketIndex !== 0) pathList.push(part.slice(0, squareBracketIndex));
        pathList.push(arrayIndex);
      } else pathList.push(part);
    }
    return pathList;
  };
  var getAttr = (value, path) =>
    getAttrPathList(path).reduce((acc, index) => {
      if (typeof acc !== "object")
        throw new EndpointError(`Index '${index}' in '${path}' not found in '${JSON.stringify(value)}'`);
      else if (Array.isArray(acc)) return acc[parseInt(index)];
      return acc[index];
    }, value);
  var isSet = (value) => value != null;
  var not = (value) => !value;
  var DEFAULT_PORTS = {
    [EndpointURLScheme.EndpointURLScheme.HTTP]: 80,
    [EndpointURLScheme.EndpointURLScheme.HTTPS]: 443,
  };
  var parseURL = (value) => {
    let whatwgURL = (() => {
      try {
        if (value instanceof URL) return value;
        if (typeof value === "object" && "hostname" in value) {
          let { hostname, port, protocol = "", path = "", query = {} } = value;
          let url = new URL(`${protocol}//${hostname}${port ? `:${port}` : ""}${path}`);
          url.search = Object.entries(query)
            .map(([k, v]) => `${k}=${v}`)
            .join("&");
          return url;
        }
        return new URL(value);
      } catch (ignored) {
        return null;
      }
    })();
    if (!whatwgURL) {
      console.error(`Unable to parse ${JSON.stringify(value)} as a whatwg URL.`);
      return null;
    }
    let urlString = whatwgURL.href;
    let { host, hostname, pathname, protocol, search } = whatwgURL;
    if (search) return null;
    let scheme = protocol.slice(0, -1);
    if (!Object.values(EndpointURLScheme.EndpointURLScheme).includes(scheme)) return null;
    let isIp = isIpAddress(hostname);
    let inputContainsDefaultPort =
      urlString.includes(`${host}:${DEFAULT_PORTS[scheme]}`) ||
      (typeof value === "string" && value.includes(`${host}:${DEFAULT_PORTS[scheme]}`));
    let authority = `${host}${inputContainsDefaultPort ? `:${DEFAULT_PORTS[scheme]}` : ""}`;
    return {
      scheme,
      authority,
      path: pathname,
      normalizedPath: pathname.endsWith("/") ? pathname : `${pathname}/`,
      isIp,
    };
  };
  var stringEquals = (left, right) => left === right;
  var substring = (input, start, stop, reverse) => {
    if (start >= stop || input.length < stop) return null;
    if (!reverse) return input.substring(start, stop);
    return input.substring(input.length - stop, input.length - start);
  };
  var uriEncode = (value) =>
    encodeURIComponent(value).replace(/[!*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  var defaultEndpointFunctions = {
    booleanEquals: coalesce,
    getAttr,
    isSet,
    isValidHostLabel,
    not,
    parseURL,
    stringEquals,
    substring,
    uriEncode,
  };
  var evaluateTemplate = (template, options) => {
    let evaluatedTemplateArr = [];
    let referenceRecord = {
      ...options.endpointParams,
      ...options.referenceRecord,
    };
    let currentIndex = 0;
    while (currentIndex < template.length) {
      let openingBraceIndex = template.indexOf("{", currentIndex);
      if (openingBraceIndex === -1) {
        evaluatedTemplateArr.push(template.slice(currentIndex));
        break;
      }
      evaluatedTemplateArr.push(template.slice(currentIndex, openingBraceIndex));
      let closingBraceIndex = template.indexOf("}", openingBraceIndex);
      if (closingBraceIndex === -1) {
        evaluatedTemplateArr.push(template.slice(openingBraceIndex));
        break;
      }
      if (template[openingBraceIndex + 1] === "{" && template[closingBraceIndex + 1] === "}") {
        evaluatedTemplateArr.push(template.slice(openingBraceIndex + 1, closingBraceIndex));
        currentIndex = closingBraceIndex + 2;
      }
      let parameterName = template.substring(openingBraceIndex + 1, closingBraceIndex);
      if (parameterName.includes("#")) {
        let [refName, attrName] = parameterName.split("#");
        evaluatedTemplateArr.push(getAttr(referenceRecord[refName], attrName));
      } else evaluatedTemplateArr.push(referenceRecord[parameterName]);
      currentIndex = closingBraceIndex + 1;
    }
    return evaluatedTemplateArr.join("");
  };
  var getReferenceValue = ({ ref }, options) =>
    ({
      ...options.endpointParams,
      ...options.referenceRecord,
    })[ref];
  var evaluateExpression = (obj, keyName, options) => {
    if (typeof obj === "string") return evaluateTemplate(obj, options);
    else if (obj.fn) return group$2.callFunction(obj, options);
    else if (obj.ref) return getReferenceValue(obj, options);
    throw new EndpointError(`'${keyName}': ${String(obj)} is not a string, function or reference.`);
  };
  var callFunction = ({ fn, argv }, options) => {
    let evaluatedArgs = argv.map((arg) =>
      ["boolean", "number"].includes(typeof arg) ? arg : group$2.evaluateExpression(arg, "arg", options),
    );
    let namespaceSeparatorIndex = fn.split(".");
    if (namespaceSeparatorIndex[0] in customEndpointFunctions && namespaceSeparatorIndex[1] != null)
      return customEndpointFunctions[namespaceSeparatorIndex[0]][namespaceSeparatorIndex[1]](
        ...evaluatedArgs,
      );
    return defaultEndpointFunctions[fn](...evaluatedArgs);
  };
  var group$2 = {
    evaluateExpression,
    callFunction,
  };
  var evaluateCondition = ({ assign, ...condition }, options) => {
    if (assign && assign in options.referenceRecord)
      throw new EndpointError(`'${assign}' is already defined in Reference Record.`);
    let value = callFunction(condition, options);
    options.logger?.debug?.(
      `${debugId} evaluateCondition: ${toDebugString(condition)} = ${toDebugString(value)}`,
    );
    return {
      result: value === "" ? true : !!value,
      ...(assign != null && {
        toAssign: {
          name: assign,
          value,
        },
      }),
    };
  };
  var evaluateConditions = (conditions = [], options) => {
    let referenceRecord = {};
    for (let condition of conditions) {
      let { result, toAssign } = evaluateCondition(condition, {
        ...options,
        referenceRecord: {
          ...options.referenceRecord,
          ...referenceRecord,
        },
      });
      if (!result)
        return {
          result,
        };
      if (toAssign) {
        referenceRecord[toAssign.name] = toAssign.value;
        options.logger?.debug?.(`${debugId} assign: ${toAssign.name} := ${toDebugString(toAssign.value)}`);
      }
    }
    return {
      result: true,
      referenceRecord,
    };
  };
  var getEndpointHeaders = (headers, options) =>
    Object.entries(headers).reduce(
      (acc, [headerKey, headerVal]) => ({
        ...acc,
        [headerKey]: headerVal.map((headerValEntry) => {
          let processedExpr = evaluateExpression(headerValEntry, "Header value entry", options);
          if (typeof processedExpr !== "string")
            throw new EndpointError(`Header '${headerKey}' value '${processedExpr}' is not a string`);
          return processedExpr;
        }),
      }),
      {},
    );
  var getEndpointProperties = (properties, options) =>
    Object.entries(properties).reduce(
      (acc, [propertyKey, propertyVal]) => ({
        ...acc,
        [propertyKey]: group$1.getEndpointProperty(propertyVal, options),
      }),
      {},
    );
  var getEndpointProperty = (property, options) => {
    if (Array.isArray(property))
      return property.map((propertyEntry) => getEndpointProperty(propertyEntry, options));
    switch (typeof property) {
      case "string":
        return evaluateTemplate(property, options);
      case "object":
        if (property === null) throw new EndpointError(`Unexpected endpoint property: ${property}`);
        return group$1.getEndpointProperties(property, options);
      case "boolean":
        return property;
      default:
        throw new EndpointError(`Unexpected endpoint property type: ${typeof property}`);
    }
  };
  var group$1 = {
    getEndpointProperty,
    getEndpointProperties,
  };
  var parseEndpointUrl = (endpointUrl, options) => {
    let expression = evaluateExpression(endpointUrl, "Endpoint URL", options);
    if (typeof expression === "string")
      try {
        return new URL(expression);
      } catch (error) {
        console.error(`Failed to construct URL with ${expression}`, error);
        throw error;
      }
    throw new EndpointError(`Endpoint URL must be a string, got ${typeof expression}`);
  };
  var evaluateEndpointRule = (rule, options) => {
    let { conditions, endpoint } = rule;
    let { result, referenceRecord } = evaluateConditions(conditions, options);
    if (!result) return;
    let options_2 = {
      ...options,
      referenceRecord: {
        ...options.referenceRecord,
        ...referenceRecord,
      },
    };
    let { url, properties, headers } = endpoint;
    options.logger?.debug?.(`${debugId} Resolving endpoint from template: ${toDebugString(endpoint)}`);
    return {
      ...(headers != null && {
        headers: getEndpointHeaders(headers, options_2),
      }),
      ...(properties != null && {
        properties: getEndpointProperties(properties, options_2),
      }),
      url: parseEndpointUrl(url, options_2),
    };
  };
  var evaluateErrorRule = (errorRule, options) => {
    let { conditions, error } = errorRule;
    let { result, referenceRecord } = evaluateConditions(conditions, options);
    if (!result) return;
    throw new EndpointError(
      evaluateExpression(error, "Error", {
        ...options,
        referenceRecord: {
          ...options.referenceRecord,
          ...referenceRecord,
        },
      }),
    );
  };
  var evaluateRules = (rules, options) => {
    for (let rule of rules)
      if (rule.type === "endpoint") {
        let endpointOrUndefined = evaluateEndpointRule(rule, options);
        if (endpointOrUndefined) return endpointOrUndefined;
      } else if (rule.type === "error") evaluateErrorRule(rule, options);
      else if (rule.type === "tree") {
        let endpointOrUndefined = exportedRules.evaluateTreeRule(rule, options);
        if (endpointOrUndefined) return endpointOrUndefined;
      } else throw new EndpointError(`Unknown endpoint rule: ${rule}`);
    throw new EndpointError("Rules evaluation failed");
  };
  var evaluateTreeRule = (treeRule, options) => {
    let { conditions, rules } = treeRule;
    let { result, referenceRecord } = evaluateConditions(conditions, options);
    if (!result) return;
    return exportedRules.evaluateRules(rules, {
      ...options,
      referenceRecord: {
        ...options.referenceRecord,
        ...referenceRecord,
      },
    });
  };
  var exportedRules = {
    evaluateRules,
    evaluateTreeRule,
  };
  var resolveEndpoint = (ruleSetObject, options) => {
    let { endpointParams, logger } = options;
    let { parameters, rules } = ruleSetObject;
    options.logger?.debug?.(`${debugId} Initial EndpointParams: ${toDebugString(endpointParams)}`);
    let mapped = Object.entries(parameters)
      .filter(([, value]) => value.default != null)
      .map(([key, value]) => [key, value.default]);
    if (mapped.length > 0)
      for (let [key, defaultValue] of mapped) endpointParams[key] = endpointParams[key] ?? defaultValue;
    let mapped_2 = Object.entries(parameters)
      .filter(([, value]) => value.required)
      .map(([key]) => key);
    for (let requiredKey of mapped_2)
      if (endpointParams[requiredKey] == null)
        throw new EndpointError(`Missing required parameter: '${requiredKey}'`);
    let endpoint = evaluateRules(rules, {
      endpointParams,
      logger,
      referenceRecord: {},
    });
    options.logger?.debug?.(`${debugId} Resolved endpoint: ${toDebugString(endpoint)}`);
    return endpoint;
  };
  cjsExports.EndpointCache = EndpointCache;
  cjsExports.EndpointError = EndpointError;
  cjsExports.customEndpointFunctions = customEndpointFunctions;
  cjsExports.isIpAddress = isIpAddress;
  cjsExports.isValidHostLabel = isValidHostLabel;
  cjsExports.resolveEndpoint = resolveEndpoint;
});
export { require_index_browser };
