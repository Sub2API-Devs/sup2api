/**
 * @smithy/core/dist-cjs/submodules/client/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-x53tzdyc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_middleware_stack } from "../../../../middleware-stack/dist-cjs/index.js";
import { require_protocols } from "../protocols/index.js";
import { require_types } from "../../../../types/dist-cjs/index.js";
import { require_schema } from "../schema/index.js";
import { require_serde } from "../serde/index.js";

//@ chunk-x53tzdyc.js:3961-12613 cjs-fingerprint
var require_client = __commonJS(function (cjsExports) {
  var constructStack = require_middleware_stack();
  var protocols = require_protocols();
  var AlgorithmId = require_types();
  var NormalizedSchema = require_schema();
  var serde = require_serde();
  class Client {
    config;
    middlewareStack = constructStack.constructStack();
    initConfig;
    handlers;
    constructor(config) {
      this.config = config;
    }
    send(command, optionsOrCb, cb) {
      let options = typeof optionsOrCb !== "function" ? optionsOrCb : undefined;
      let callback = typeof optionsOrCb === "function" ? optionsOrCb : cb;
      let useHandlerCache = options === undefined && this.config.cacheMiddleware === true;
      let handler;
      if (useHandlerCache) {
        if (!this.handlers) this.handlers = new WeakMap();
        let handlers = this.handlers;
        if (handlers.has(command.constructor)) handler = handlers.get(command.constructor);
        else {
          handler = command.resolveMiddleware(this.middlewareStack, this.config, options);
          handlers.set(command.constructor, handler);
        }
      } else {
        delete this.handlers;
        handler = command.resolveMiddleware(this.middlewareStack, this.config, options);
      }
      if (callback)
        handler(command)
          .then(
            (result) => callback(null, result.output),
            (err) => callback(err),
          )
          .catch(() => {});
      else return handler(command).then((result) => result.output);
    }
    destroy() {
      this.config?.requestHandler?.destroy?.();
      delete this.handlers;
    }
  }
  var SENSITIVE_STRING$1 = "***SensitiveInformation***";
  function schemaLogFilter(schema, data) {
    if (data == null) return data;
    let ns = NormalizedSchema.NormalizedSchema.of(schema);
    if (ns.getMergedTraits().sensitive) return SENSITIVE_STRING$1;
    if (ns.isListSchema()) {
      if (!!ns.getValueSchema().getMergedTraits().sensitive) return SENSITIVE_STRING$1;
    } else if (ns.isMapSchema()) {
      if (
        !!ns.getKeySchema().getMergedTraits().sensitive ||
        !!ns.getValueSchema().getMergedTraits().sensitive
      )
        return SENSITIVE_STRING$1;
    } else if (ns.isStructSchema() && typeof data === "object") {
      let object = data;
      let newObject = {};
      for (let [member, memberNs] of ns.structIterator())
        if (object[member] != null) newObject[member] = schemaLogFilter(memberNs, object[member]);
      return newObject;
    }
    return data;
  }
  class Command {
    middlewareStack = constructStack.constructStack();
    schema;
    static classBuilder() {
      return new ClassBuilder();
    }
    resolveMiddlewareWithContext(
      clientStack,
      configuration,
      options,
      {
        middlewareFn,
        clientName,
        commandName,
        inputFilterSensitiveLog,
        outputFilterSensitiveLog,
        smithyContext,
        additionalContext,
        CommandCtor,
      },
    ) {
      for (let mw of middlewareFn.bind(this)(CommandCtor, clientStack, configuration, options))
        this.middlewareStack.use(mw);
      let stack = clientStack.concat(this.middlewareStack);
      let { logger } = configuration;
      let handlerExecutionContext = {
        logger,
        clientName,
        commandName,
        inputFilterSensitiveLog,
        outputFilterSensitiveLog,
        [AlgorithmId.SMITHY_CONTEXT_KEY]: {
          commandInstance: this,
          ...smithyContext,
        },
        ...additionalContext,
      };
      let { requestHandler } = configuration;
      return stack.resolve(
        (request) => requestHandler.handle(request.request, options || {}),
        handlerExecutionContext,
      );
    }
  }
  class ClassBuilder {
    _init = () => {};
    _ep = {};
    _middlewareFn = () => [];
    _commandName = "";
    _clientName = "";
    _additionalContext = {};
    _smithyContext = {};
    _inputFilterSensitiveLog = undefined;
    _outputFilterSensitiveLog = undefined;
    _serializer = null;
    _deserializer = null;
    _operationSchema;
    init(cb) {
      this._init = cb;
    }
    ep(endpointParameterInstructions) {
      this._ep = endpointParameterInstructions;
      return this;
    }
    m(middlewareSupplier) {
      this._middlewareFn = middlewareSupplier;
      return this;
    }
    s(service, operation, smithyContext = {}) {
      this._smithyContext = {
        service,
        operation,
        ...smithyContext,
      };
      return this;
    }
    c(additionalContext = {}) {
      this._additionalContext = additionalContext;
      return this;
    }
    n(clientName, commandName) {
      this._clientName = clientName;
      this._commandName = commandName;
      return this;
    }
    f(inputFilter = (_) => _, outputFilter = (_) => _) {
      this._inputFilterSensitiveLog = inputFilter;
      this._outputFilterSensitiveLog = outputFilter;
      return this;
    }
    ser(serializer) {
      this._serializer = serializer;
      return this;
    }
    de(deserializer) {
      this._deserializer = deserializer;
      return this;
    }
    sc(operation) {
      this._operationSchema = operation;
      this._smithyContext.operationSchema = operation;
      return this;
    }
    build() {
      let closure = this;
      let CommandRef;
      return (CommandRef = class extends Command {
        input;
        static getEndpointParameterInstructions() {
          return closure._ep;
        }
        constructor(...[input]) {
          super();
          this.input = input ?? {};
          closure._init(this);
          this.schema = closure._operationSchema;
        }
        resolveMiddleware(stack, configuration, options) {
          let op = closure._operationSchema;
          let input = op?.[4] ?? op?.input;
          let output = op?.[5] ?? op?.output;
          return this.resolveMiddlewareWithContext(stack, configuration, options, {
            CommandCtor: CommandRef,
            middlewareFn: closure._middlewareFn,
            clientName: closure._clientName,
            commandName: closure._commandName,
            inputFilterSensitiveLog:
              closure._inputFilterSensitiveLog ?? (op ? schemaLogFilter.bind(null, input) : (_) => _),
            outputFilterSensitiveLog:
              closure._outputFilterSensitiveLog ?? (op ? schemaLogFilter.bind(null, output) : (_) => _),
            smithyContext: closure._smithyContext,
            additionalContext: closure._additionalContext,
          });
        }
        serialize = closure._serializer;
        deserialize = closure._deserializer;
      });
    }
  }
  var SENSITIVE_STRING = "***SensitiveInformation***";
  var createAggregatedClient = (commands, client) => {
    for (let key of Object.keys(commands)) {
      let CommandCtor = commands[key];
      let commandImpl = async function (args, optionsOrCb, cb) {
        let command = new CommandCtor(args);
        if (typeof optionsOrCb === "function") this.send(command, optionsOrCb);
        else if (typeof cb === "function") {
          if (typeof optionsOrCb !== "object")
            throw Error(`Expected http options but got ${typeof optionsOrCb}`);
          this.send(command, optionsOrCb || {}, cb);
        } else return this.send(command, optionsOrCb);
      };
      let methodName = (key[0].toLowerCase() + key.slice(1)).replace(/Command$/, "");
      client.prototype[methodName] = commandImpl;
    }
  };
  class ServiceException extends Error {
    $fault;
    $response;
    $retryable;
    $metadata;
    constructor(options) {
      super(options.message);
      Object.setPrototypeOf(this, Object.getPrototypeOf(this).constructor.prototype);
      this.name = options.name;
      this.$fault = options.$fault;
      this.$metadata = options.$metadata;
    }
    static isInstance(value) {
      if (!value) return false;
      let candidate = value;
      return (
        ServiceException.prototype.isPrototypeOf(candidate) ||
        (Boolean(candidate.$fault) &&
          Boolean(candidate.$metadata) &&
          (candidate.$fault === "client" || candidate.$fault === "server"))
      );
    }
    static [Symbol.hasInstance](instance) {
      if (!instance) return false;
      let candidate = instance;
      if (this === ServiceException) return ServiceException.isInstance(instance);
      if (ServiceException.isInstance(instance)) {
        if (candidate.name && this.name)
          return this.prototype.isPrototypeOf(instance) || candidate.name === this.name;
        return this.prototype.isPrototypeOf(instance);
      }
      return false;
    }
  }
  var decorateServiceException = (exception, additions = {}) => {
    Object.entries(additions)
      .filter(([, v]) => v !== undefined)
      .forEach(([k, v]) => {
        if (exception[k] == null || exception[k] === "") exception[k] = v;
      });
    let message = exception.message || exception.Message || "UnknownError";
    exception.message = message;
    delete exception.Message;
    return exception;
  };
  var throwDefaultError = ({ output, parsedBody, exceptionCtor, errorCode }) => {
    let $metadata = deserializeMetadata(output);
    let statusCode = $metadata.httpStatusCode ? $metadata.httpStatusCode + "" : undefined;
    let response = new exceptionCtor({
      name: parsedBody?.code || parsedBody?.Code || errorCode || statusCode || "UnknownError",
      $fault: "client",
      $metadata,
    });
    throw decorateServiceException(response, parsedBody);
  };
  var withBaseException =
    (ExceptionCtor) =>
    ({ output, parsedBody, errorCode }) => {
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: ExceptionCtor,
        errorCode,
      });
    };
  var deserializeMetadata = (output) => ({
    httpStatusCode: output.statusCode,
    requestId:
      output.headers["x-amzn-requestid"] ??
      output.headers["x-amzn-request-id"] ??
      output.headers["x-amz-request-id"],
    extendedRequestId: output.headers["x-amz-id-2"],
    cfId: output.headers["x-amz-cf-id"],
  });
  var loadConfigsForDefaultMode = (mode) => {
    switch (mode) {
      case "standard":
        return {
          retryMode: "standard",
          connectionTimeout: 3100,
        };
      case "in-region":
        return {
          retryMode: "standard",
          connectionTimeout: 1100,
        };
      case "cross-region":
        return {
          retryMode: "standard",
          connectionTimeout: 3100,
        };
      case "mobile":
        return {
          retryMode: "standard",
          connectionTimeout: 30000,
        };
      default:
        return {};
    }
  };
  var warningEmitted = false;
  var emitWarningIfUnsupportedVersion = (version) => {
    if (version && !warningEmitted && parseInt(version.substring(1, version.indexOf("."))) < 16)
      warningEmitted = true;
  };
  var getChecksumConfiguration = (runtimeConfig) => {
    let checksumAlgorithms = [];
    for (let id in AlgorithmId.AlgorithmId) {
      let algorithmId = AlgorithmId.AlgorithmId[id];
      if (runtimeConfig[algorithmId] === undefined) continue;
      checksumAlgorithms.push({
        algorithmId: () => algorithmId,
        checksumConstructor: () => runtimeConfig[algorithmId],
      });
    }
    return {
      addChecksumAlgorithm(algo) {
        checksumAlgorithms.push(algo);
      },
      checksumAlgorithms() {
        return checksumAlgorithms;
      },
    };
  };
  var collectChecksumConfiguration = (clientConfig) => {
    let runtimeConfig = {};
    clientConfig.checksumAlgorithms().forEach((checksumAlgorithm) => {
      runtimeConfig[checksumAlgorithm.algorithmId()] = checksumAlgorithm.checksumConstructor();
    });
    return runtimeConfig;
  };
  var getRetryConfiguration = (runtimeConfig) => ({
    setRetryStrategy(retryStrategy) {
      runtimeConfig.retryStrategy = retryStrategy;
    },
    retryStrategy() {
      return runtimeConfig.retryStrategy;
    },
  });
  var resolveRetryRuntimeConfig = (retryStrategyConfiguration) => {
    let runtimeConfig = {};
    runtimeConfig.retryStrategy = retryStrategyConfiguration.retryStrategy();
    return runtimeConfig;
  };
  var getDefaultExtensionConfiguration = (runtimeConfig) =>
    Object.assign(getChecksumConfiguration(runtimeConfig), getRetryConfiguration(runtimeConfig));
  var getDefaultClientConfiguration = getDefaultExtensionConfiguration;
  var resolveDefaultRuntimeConfig = (config) =>
    Object.assign(collectChecksumConfiguration(config), resolveRetryRuntimeConfig(config));
  var getArrayIfSingleItem = (mayBeArray) => (Array.isArray(mayBeArray) ? mayBeArray : [mayBeArray]);
  var getValueFromTextNode = (obj) => {
    for (let key in obj)
      if (obj.hasOwnProperty(key) && obj[key]["#text"] !== undefined) obj[key] = obj[key]["#text"];
      else if (typeof obj[key] === "object" && obj[key] !== null) obj[key] = getValueFromTextNode(obj[key]);
    return obj;
  };
  var isSerializableHeaderValue = (value) => value != null;
  class NoOpLogger {
    trace() {}
    debug() {}
    info() {}
    warn() {}
    error() {}
  }
  function map(arg0, arg1, arg2) {
    let target;
    let filter;
    let instructions;
    if (typeof arg1 === "undefined" && typeof arg2 === "undefined") {
      target = {};
      instructions = arg0;
    } else {
      target = arg0;
      if (typeof arg1 === "function") {
        filter = arg1;
        instructions = arg2;
        return mapWithFilter(target, filter, instructions);
      } else instructions = arg1;
    }
    for (let key of Object.keys(instructions)) {
      if (!Array.isArray(instructions[key])) {
        target[key] = instructions[key];
        continue;
      }
      applyInstruction(target, null, instructions, key);
    }
    return target;
  }
  var convertMap = (target) => {
    let output = {};
    for (let [k, v] of Object.entries(target || {})) output[k] = [, v];
    return output;
  };
  var take = (source, instructions) => {
    let out = {};
    for (let key in instructions) applyInstruction(out, source, instructions, key);
    return out;
  };
  var mapWithFilter = (target, filter, instructions) =>
    map(
      target,
      Object.entries(instructions).reduce((_instructions, [key, value]) => {
        if (Array.isArray(value)) _instructions[key] = value;
        else if (typeof value === "function") _instructions[key] = [filter, value()];
        else _instructions[key] = [filter, value];
        return _instructions;
      }, {}),
    );
  var applyInstruction = (target, source, instructions, targetKey) => {
    if (source !== null) {
      let instruction = instructions[targetKey];
      if (typeof instruction === "function") instruction = [, instruction];
      let [filter = nonNullish, valueFn = pass, sourceKey = targetKey] = instruction;
      if (
        (typeof filter === "function" && filter(source[sourceKey])) ||
        (typeof filter !== "function" && !!filter)
      )
        target[targetKey] = valueFn(source[sourceKey]);
      return;
    }
    let [filter, value] = instructions[targetKey];
    if (typeof value === "function") {
      let _value;
      let defaultFilterPassed = filter === undefined && (_value = value()) != null;
      let customFilterPassed =
        (typeof filter === "function" && !!filter(undefined)) || (typeof filter !== "function" && !!filter);
      if (defaultFilterPassed) target[targetKey] = _value;
      else if (customFilterPassed) target[targetKey] = value();
    } else {
      let defaultFilterPassed = filter === undefined && value != null;
      let customFilterPassed =
        (typeof filter === "function" && !!filter(value)) || (typeof filter !== "function" && !!filter);
      if (defaultFilterPassed || customFilterPassed) target[targetKey] = value;
    }
  };
  var nonNullish = (_) => _ != null;
  var pass = (_) => _;
  var serializeFloat = (value) => {
    if (value !== value) return "NaN";
    switch (value) {
      case 1 / 0:
        return "Infinity";
      case -1 / 0:
        return "-Infinity";
      default:
        return value;
    }
  };
  var serializeDateTime = (date) => date.toISOString().replace(".000Z", "Z");
  var _json = (obj) => {
    if (obj == null) return {};
    if (Array.isArray(obj)) return obj.filter((_) => _ != null).map(_json);
    if (typeof obj === "object") {
      let target = {};
      for (let key of Object.keys(obj)) {
        if (obj[key] == null) continue;
        target[key] = _json(obj[key]);
      }
      return target;
    }
    return obj;
  };
  Object.defineProperty(cjsExports, "collectBody", {
    enumerable: true,
    get: function () {
      return protocols.collectBody;
    },
  });
  Object.defineProperty(cjsExports, "extendedEncodeURIComponent", {
    enumerable: true,
    get: function () {
      return protocols.extendedEncodeURIComponent;
    },
  });
  Object.defineProperty(cjsExports, "resolvedPath", {
    enumerable: true,
    get: function () {
      return protocols.resolvedPath;
    },
  });
  cjsExports.Client = Client;
  cjsExports.Command = Command;
  cjsExports.NoOpLogger = NoOpLogger;
  cjsExports.SENSITIVE_STRING = SENSITIVE_STRING;
  cjsExports.ServiceException = ServiceException;
  cjsExports._json = _json;
  cjsExports.convertMap = convertMap;
  cjsExports.createAggregatedClient = createAggregatedClient;
  cjsExports.decorateServiceException = decorateServiceException;
  cjsExports.emitWarningIfUnsupportedVersion = emitWarningIfUnsupportedVersion;
  cjsExports.getArrayIfSingleItem = getArrayIfSingleItem;
  cjsExports.getDefaultClientConfiguration = getDefaultClientConfiguration;
  cjsExports.getDefaultExtensionConfiguration = getDefaultExtensionConfiguration;
  cjsExports.getValueFromTextNode = getValueFromTextNode;
  cjsExports.isSerializableHeaderValue = isSerializableHeaderValue;
  cjsExports.loadConfigsForDefaultMode = loadConfigsForDefaultMode;
  cjsExports.map = map;
  cjsExports.resolveDefaultRuntimeConfig = resolveDefaultRuntimeConfig;
  cjsExports.serializeDateTime = serializeDateTime;
  cjsExports.serializeFloat = serializeFloat;
  cjsExports.take = take;
  cjsExports.throwDefaultError = throwDefaultError;
  cjsExports.withBaseException = withBaseException;
  Object.keys(serde).forEach(function (key) {
    if (key !== "default" && !Object.prototype.hasOwnProperty.call(cjsExports, key))
      Object.defineProperty(cjsExports, key, {
        enumerable: true,
        get: function () {
          return serde[key];
        },
      });
  });
});
export { require_client };
