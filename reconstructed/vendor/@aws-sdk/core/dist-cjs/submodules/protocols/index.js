/**
 * @aws-sdk/core/dist-cjs/submodules/protocols/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/core@3.936.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { require_cbor } from "../../../../../@smithy/core/dist-cjs/submodules/cbor/index.js";
import { require_schema } from "../../../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { require_client } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_protocols as require_protocols_2 } from "../../../../../@smithy/core/dist-cjs/submodules/protocols/index.js";
import { require_serde } from "../../../../../@smithy/core/dist-cjs/submodules/serde/index.js";
import { base64Module } from "../../../../credential-provider-web-identity/dist-cjs/index.js";
import { require_util_utf8 } from "../../../../../@smithy/util-utf8/dist-cjs/index.js";
import { require_xml_builder } from "../../../../xml-builder/dist-cjs/index.js";

//@ chunk-edce4vxq.js:136783-166742 cjs-fingerprint
var require_protocols = x(function (cjsExports) {
  var cbor = require_cbor();
  var schema = require_schema();
  var smithyClient = require_client();
  var protocols = require_protocols_2();
  var serde = require_serde();
  var utilBase64 = base64Module();
  var utilUtf8 = require_util_utf8();
  var xmlBuilder = require_xml_builder();
  class ProtocolLib {
    queryCompat;
    constructor(queryCompat = false) {
      this.queryCompat = queryCompat;
    }
    resolveRestContentType(defaultContentType, inputSchema) {
      let members = inputSchema.getMemberSchemas();
      let httpPayloadMember = Object.values(members).find((m) => !!m.getMergedTraits().httpPayload);
      if (httpPayloadMember) {
        let mediaType = httpPayloadMember.getMergedTraits().mediaType;
        if (mediaType) return mediaType;
        else if (httpPayloadMember.isStringSchema()) return "text/plain";
        else if (httpPayloadMember.isBlobSchema()) return "application/octet-stream";
        else return defaultContentType;
      } else if (!inputSchema.isUnitSchema()) {
        if (
          Object.values(members).find((m_2) => {
            let { httpQuery, httpQueryParams, httpHeader, httpLabel, httpPrefixHeaders } =
              m_2.getMergedTraits();
            return (
              !httpQuery && !httpQueryParams && !httpHeader && !httpLabel && httpPrefixHeaders === undefined
            );
          })
        )
          return defaultContentType;
      }
    }
    async getErrorSchemaOrThrowBaseException(
      errorIdentifier,
      defaultNamespace,
      response,
      dataObject,
      metadata,
      getErrorSchema,
    ) {
      let namespace = defaultNamespace;
      let errorName = errorIdentifier;
      if (errorIdentifier.includes("#")) [namespace, errorName] = errorIdentifier.split("#");
      let errorMetadata = {
        $metadata: metadata,
        $fault: response.statusCode < 500 ? "client" : "server",
      };
      let registry = schema.TypeRegistry.for(namespace);
      try {
        return {
          errorSchema: getErrorSchema?.(registry, errorName) ?? registry.getSchema(errorIdentifier),
          errorMetadata,
        };
      } catch (e) {
        dataObject.message = dataObject.message ?? dataObject.Message ?? "UnknownError";
        let synthetic = schema.TypeRegistry.for("smithy.ts.sdk.synthetic." + namespace);
        let baseExceptionSchema = synthetic.getBaseException();
        if (baseExceptionSchema) {
          let ErrorCtor = synthetic.getErrorCtor(baseExceptionSchema) ?? Error;
          throw this.decorateServiceException(
            Object.assign(
              new ErrorCtor({
                name: errorName,
              }),
              errorMetadata,
            ),
            dataObject,
          );
        }
        throw this.decorateServiceException(Object.assign(Error(errorName), errorMetadata), dataObject);
      }
    }
    decorateServiceException(exception, additions = {}) {
      if (this.queryCompat) {
        let msg = exception.Message ?? additions.Message;
        let error = smithyClient.decorateServiceException(exception, additions);
        if (msg) {
          error.Message = msg;
          error.message = msg;
        }
        return error;
      }
      return smithyClient.decorateServiceException(exception, additions);
    }
    setQueryCompatError(output, response) {
      let queryErrorHeader = response.headers?.["x-amzn-query-error"];
      if (output !== undefined && queryErrorHeader != null) {
        let [Code, Type] = queryErrorHeader.split(";");
        let entries = Object.entries(output);
        let c = {
          Code,
          Type,
        };
        Object.assign(output, c);
        for (let [k, v] of entries) c[k] = v;
        delete c.__type;
        output.Error = c;
      }
    }
    queryCompatOutput(queryCompatErrorData, errorData) {
      if (queryCompatErrorData.Error) errorData.Error = queryCompatErrorData.Error;
      if (queryCompatErrorData.Type) errorData.Type = queryCompatErrorData.Type;
      if (queryCompatErrorData.Code) errorData.Code = queryCompatErrorData.Code;
    }
  }
  class AwsSmithyRpcV2CborProtocol extends cbor.SmithyRpcV2CborProtocol {
    awsQueryCompatible;
    mixin;
    constructor({ defaultNamespace, awsQueryCompatible }) {
      super({
        defaultNamespace,
      });
      this.awsQueryCompatible = !!awsQueryCompatible;
      this.mixin = new ProtocolLib(this.awsQueryCompatible);
    }
    async serializeRequest(operationSchema, input, context) {
      let request = await super.serializeRequest(operationSchema, input, context);
      if (this.awsQueryCompatible) request.headers["x-amzn-query-mode"] = "true";
      return request;
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
      if (this.awsQueryCompatible) this.mixin.setQueryCompatError(dataObject, response);
      let errorName = cbor.loadSmithyRpcV2CborErrorCode(response, dataObject) ?? "Unknown";
      let { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(
        errorName,
        this.options.defaultNamespace,
        response,
        dataObject,
        metadata,
      );
      let ns = schema.NormalizedSchema.of(errorSchema);
      let message = dataObject.message ?? dataObject.Message ?? "Unknown";
      let N = new (schema.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error)(message);
      let output = {};
      for (let [name, member] of ns.structIterator())
        output[name] = this.deserializer.readValue(member, dataObject[name]);
      if (this.awsQueryCompatible) this.mixin.queryCompatOutput(dataObject, output);
      throw this.mixin.decorateServiceException(
        Object.assign(
          N,
          errorMetadata,
          {
            $fault: ns.getMergedTraits().error,
            message,
          },
          output,
        ),
        dataObject,
      );
    }
  }
  var _toStr = (val) => {
    if (val == null) return val;
    if (typeof val === "number" || typeof val === "bigint") {
      let warning = Error(`Received number ${val} where a string was expected.`);
      warning.name = "Warning";
      console.warn(warning);
      return String(val);
    }
    if (typeof val === "boolean") {
      let warning = Error(`Received boolean ${val} where a string was expected.`);
      warning.name = "Warning";
      console.warn(warning);
      return String(val);
    }
    return val;
  };
  var _toBool = (val) => {
    if (val == null) return val;
    if (typeof val === "string") {
      let lowercase = val.toLowerCase();
      if (val !== "" && lowercase !== "false" && lowercase !== "true") {
        let warning = Error(`Received string "${val}" where a boolean was expected.`);
        warning.name = "Warning";
        console.warn(warning);
      }
      return val !== "" && lowercase !== "false";
    }
    return val;
  };
  var _toNum = (val) => {
    if (val == null) return val;
    if (typeof val === "string") {
      let num = Number(val);
      if (num.toString() !== val) {
        let warning = Error(`Received string "${val}" where a number was expected.`);
        warning.name = "Warning";
        console.warn(warning);
        return val;
      }
      return num;
    }
    return val;
  };
  class SerdeContextConfig {
    serdeContext;
    setSerdeContext(serdeContext) {
      this.serdeContext = serdeContext;
    }
  }
  function jsonReviver(key, value, context) {
    if (context?.source) {
      let numericString = context.source;
      if (typeof value === "number") {
        if (
          value > Number.MAX_SAFE_INTEGER ||
          value < Number.MIN_SAFE_INTEGER ||
          numericString !== String(value)
        )
          if (numericString.includes(".")) return new serde.NumericValue(numericString, "bigDecimal");
          else return BigInt(numericString);
      }
    }
    return value;
  }
  var collectBodyString = (streamBody, context) =>
    smithyClient
      .collectBody(streamBody, context)
      .then((body) => (context?.utf8Encoder ?? utilUtf8.toUtf8)(body));
  var parseJsonBody = (streamBody, context) =>
    collectBodyString(streamBody, context).then((encoded) => {
      if (encoded.length)
        try {
          return JSON.parse(encoded);
        } catch (e) {
          if (e?.name === "SyntaxError")
            Object.defineProperty(e, "$responseBodyText", {
              value: encoded,
            });
          throw e;
        }
      return {};
    });
  var parseJsonErrorBody = async (errorBody, context) => {
    let value = await parseJsonBody(errorBody, context);
    value.message = value.message ?? value.Message;
    return value;
  };
  var loadRestJsonErrorCode = (output, data) => {
    let findKey = (object, key) => Object.keys(object).find((k) => k.toLowerCase() === key.toLowerCase());
    let sanitizeErrorCode = (rawValue) => {
      let cleanValue = rawValue;
      if (typeof cleanValue === "number") cleanValue = cleanValue.toString();
      if (cleanValue.indexOf(",") >= 0) cleanValue = cleanValue.split(",")[0];
      if (cleanValue.indexOf(":") >= 0) cleanValue = cleanValue.split(":")[0];
      if (cleanValue.indexOf("#") >= 0) cleanValue = cleanValue.split("#")[1];
      return cleanValue;
    };
    let headerKey = findKey(output.headers, "x-amzn-errortype");
    if (headerKey !== undefined) return sanitizeErrorCode(output.headers[headerKey]);
    if (data && typeof data === "object") {
      let codeKey = findKey(data, "code");
      if (codeKey && data[codeKey] !== undefined) return sanitizeErrorCode(data[codeKey]);
      if (data.__type !== undefined) return sanitizeErrorCode(data.__type);
    }
  };
  class JsonShapeDeserializer extends SerdeContextConfig {
    settings;
    constructor(settings) {
      super();
      this.settings = settings;
    }
    async read(schema, data) {
      return this._read(
        schema,
        typeof data === "string"
          ? JSON.parse(data, jsonReviver)
          : await parseJsonBody(data, this.serdeContext),
      );
    }
    readObject(schema, data) {
      return this._read(schema, data);
    }
    _read(schema$1, value) {
      let isObject = value !== null && typeof value === "object";
      let ns = schema.NormalizedSchema.of(schema$1);
      if (ns.isListSchema() && Array.isArray(value)) {
        let listMember = ns.getValueSchema();
        let out = [];
        let sparse = !!ns.getMergedTraits().sparse;
        for (let item of value) if (sparse || item != null) out.push(this._read(listMember, item));
        return out;
      } else if (ns.isMapSchema() && isObject) {
        let mapMember = ns.getValueSchema();
        let out = {};
        let sparse = !!ns.getMergedTraits().sparse;
        for (let [_k, _v] of Object.entries(value))
          if (sparse || _v != null) out[_k] = this._read(mapMember, _v);
        return out;
      } else if (ns.isStructSchema() && isObject) {
        let out = {};
        for (let [memberName, memberSchema] of ns.structIterator()) {
          let fromKey = this.settings.jsonName
            ? (memberSchema.getMergedTraits().jsonName ?? memberName)
            : memberName;
          let deserializedValue = this._read(memberSchema, value[fromKey]);
          if (deserializedValue != null) out[memberName] = deserializedValue;
        }
        return out;
      }
      if (ns.isBlobSchema() && typeof value === "string") return utilBase64.fromBase64(value);
      let mediaType = ns.getMergedTraits().mediaType;
      if (ns.isStringSchema() && typeof value === "string" && mediaType) {
        if (mediaType === "application/json" || mediaType.endsWith("+json"))
          return serde.LazyJsonString.from(value);
      }
      if (ns.isTimestampSchema() && value != null)
        switch (protocols.determineTimestampFormat(ns, this.settings)) {
          case 5:
            return serde.parseRfc3339DateTimeWithOffset(value);
          case 6:
            return serde.parseRfc7231DateTime(value);
          case 7:
            return serde.parseEpochTimestamp(value);
          default:
            console.warn("Missing timestamp format, parsing value with Date constructor:", value);
            return new Date(value);
        }
      if (ns.isBigIntegerSchema() && (typeof value === "number" || typeof value === "string"))
        return BigInt(value);
      if (ns.isBigDecimalSchema() && value != null) {
        if (value instanceof serde.NumericValue) return value;
        let untyped = value;
        if (untyped.type === "bigDecimal" && "string" in untyped)
          return new serde.NumericValue(untyped.string, untyped.type);
        return new serde.NumericValue(String(value), "bigDecimal");
      }
      if (ns.isNumericSchema() && typeof value === "string")
        switch (value) {
          case "Infinity":
            return 1 / 0;
          case "-Infinity":
            return -1 / 0;
          case "NaN":
            return NaN;
        }
      if (ns.isDocumentSchema())
        if (isObject) {
          let out = Array.isArray(value) ? [] : {};
          for (let [k, v] of Object.entries(value))
            if (v instanceof serde.NumericValue) out[k] = v;
            else out[k] = this._read(ns, v);
          return out;
        } else return structuredClone(value);
      return value;
    }
  }
  var NUMERIC_CONTROL_CHAR = String.fromCharCode(925);
  class JsonReplacer {
    values = new Map();
    counter = 0;
    stage = 0;
    createReplacer() {
      if (this.stage === 1) throw Error("@aws-sdk/core/protocols - JsonReplacer already created.");
      if (this.stage === 2) throw Error("@aws-sdk/core/protocols - JsonReplacer exhausted.");
      this.stage = 1;
      return (key, value) => {
        if (value instanceof serde.NumericValue) {
          let v = `${NUMERIC_CONTROL_CHAR + "nv" + this.counter++}_` + value.string;
          this.values.set(`"${v}"`, value.string);
          return v;
        }
        if (typeof value === "bigint") {
          let s_2 = value.toString();
          let v = `${NUMERIC_CONTROL_CHAR + "b" + this.counter++}_` + s_2;
          this.values.set(`"${v}"`, s_2);
          return v;
        }
        return value;
      };
    }
    replaceInJson(json) {
      if (this.stage === 0) throw Error("@aws-sdk/core/protocols - JsonReplacer not created yet.");
      if (this.stage === 2) throw Error("@aws-sdk/core/protocols - JsonReplacer exhausted.");
      this.stage = 2;
      if (this.counter === 0) return json;
      for (let [key, value] of this.values) json = json.replace(key, value);
      return json;
    }
  }
  class JsonShapeSerializer extends SerdeContextConfig {
    settings;
    buffer;
    rootSchema;
    constructor(settings) {
      super();
      this.settings = settings;
    }
    write(schema$1, value) {
      this.rootSchema = schema.NormalizedSchema.of(schema$1);
      this.buffer = this._write(this.rootSchema, value);
    }
    writeDiscriminatedDocument(schema$1, value) {
      this.write(schema$1, value);
      if (typeof this.buffer === "object")
        this.buffer.__type = schema.NormalizedSchema.of(schema$1).getName(true);
    }
    flush() {
      let { rootSchema } = this;
      this.rootSchema = undefined;
      if (rootSchema?.isStructSchema() || rootSchema?.isDocumentSchema()) {
        let replacer = new JsonReplacer();
        return replacer.replaceInJson(JSON.stringify(this.buffer, replacer.createReplacer(), 0));
      }
      return this.buffer;
    }
    _write(schema$1, value, container) {
      let isObject = value !== null && typeof value === "object";
      let ns = schema.NormalizedSchema.of(schema$1);
      if (ns.isListSchema() && Array.isArray(value)) {
        let listMember = ns.getValueSchema();
        let out = [];
        let sparse = !!ns.getMergedTraits().sparse;
        for (let item of value) if (sparse || item != null) out.push(this._write(listMember, item));
        return out;
      } else if (ns.isMapSchema() && isObject) {
        let mapMember = ns.getValueSchema();
        let out = {};
        let sparse = !!ns.getMergedTraits().sparse;
        for (let [_k, _v] of Object.entries(value))
          if (sparse || _v != null) out[_k] = this._write(mapMember, _v);
        return out;
      } else if (ns.isStructSchema() && isObject) {
        let out = {};
        for (let [memberName, memberSchema] of ns.structIterator()) {
          let targetKey = this.settings.jsonName
            ? (memberSchema.getMergedTraits().jsonName ?? memberName)
            : memberName;
          let serializableValue = this._write(memberSchema, value[memberName], ns);
          if (serializableValue !== undefined) out[targetKey] = serializableValue;
        }
        return out;
      }
      if (value === null && container?.isStructSchema()) return;
      if (
        (ns.isBlobSchema() && (value instanceof Uint8Array || typeof value === "string")) ||
        (ns.isDocumentSchema() && value instanceof Uint8Array)
      ) {
        if (ns === this.rootSchema) return value;
        return (this.serdeContext?.base64Encoder ?? utilBase64.toBase64)(value);
      }
      if ((ns.isTimestampSchema() || ns.isDocumentSchema()) && value instanceof Date)
        switch (protocols.determineTimestampFormat(ns, this.settings)) {
          case 5:
            return value.toISOString().replace(".000Z", "Z");
          case 6:
            return serde.dateToUtcString(value);
          case 7:
            return value.getTime() / 1000;
          default:
            console.warn("Missing timestamp format, using epoch seconds", value);
            return value.getTime() / 1000;
        }
      if (ns.isNumericSchema() && typeof value === "number") {
        if (Math.abs(value) === 1 / 0 || isNaN(value)) return String(value);
      }
      if (ns.isStringSchema()) {
        if (typeof value === "undefined" && ns.isIdempotencyToken()) return serde.generateIdempotencyToken();
        let mediaType = ns.getMergedTraits().mediaType;
        if (value != null && mediaType) {
          if (mediaType === "application/json" || mediaType.endsWith("+json"))
            return serde.LazyJsonString.from(value);
        }
      }
      if (ns.isDocumentSchema())
        if (isObject) {
          let out = Array.isArray(value) ? [] : {};
          for (let [k, v] of Object.entries(value))
            if (v instanceof serde.NumericValue) out[k] = v;
            else out[k] = this._write(ns, v);
          return out;
        } else return structuredClone(value);
      return value;
    }
  }
  class JsonCodec extends SerdeContextConfig {
    settings;
    constructor(settings) {
      super();
      this.settings = settings;
    }
    createSerializer() {
      let serializer = new JsonShapeSerializer(this.settings);
      serializer.setSerdeContext(this.serdeContext);
      return serializer;
    }
    createDeserializer() {
      let deserializer = new JsonShapeDeserializer(this.settings);
      deserializer.setSerdeContext(this.serdeContext);
      return deserializer;
    }
  }
  class AwsJsonRpcProtocol extends protocols.RpcProtocol {
    serializer;
    deserializer;
    serviceTarget;
    codec;
    mixin;
    awsQueryCompatible;
    constructor({ defaultNamespace, serviceTarget, awsQueryCompatible }) {
      super({
        defaultNamespace,
      });
      this.serviceTarget = serviceTarget;
      this.codec = new JsonCodec({
        timestampFormat: {
          useTrait: true,
          default: 7,
        },
        jsonName: false,
      });
      this.serializer = this.codec.createSerializer();
      this.deserializer = this.codec.createDeserializer();
      this.awsQueryCompatible = !!awsQueryCompatible;
      this.mixin = new ProtocolLib(this.awsQueryCompatible);
    }
    async serializeRequest(operationSchema, input, context) {
      let request = await super.serializeRequest(operationSchema, input, context);
      if (!request.path.endsWith("/")) request.path += "/";
      Object.assign(request.headers, {
        "content-type": `application/x-amz-json-${this.getJsonRpcVersion()}`,
        "x-amz-target": `${this.serviceTarget}.${operationSchema.name}`,
      });
      if (this.awsQueryCompatible) request.headers["x-amzn-query-mode"] = "true";
      if (schema.deref(operationSchema.input) === "unit" || !request.body) request.body = "{}";
      return request;
    }
    getPayloadCodec() {
      return this.codec;
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
      if (this.awsQueryCompatible) this.mixin.setQueryCompatError(dataObject, response);
      let errorIdentifier = loadRestJsonErrorCode(response, dataObject) ?? "Unknown";
      let { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(
        errorIdentifier,
        this.options.defaultNamespace,
        response,
        dataObject,
        metadata,
      );
      let ns = schema.NormalizedSchema.of(errorSchema);
      let message = dataObject.message ?? dataObject.Message ?? "Unknown";
      let N = new (schema.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error)(message);
      let output = {};
      for (let [name, member] of ns.structIterator()) {
        let target = member.getMergedTraits().jsonName ?? name;
        output[name] = this.codec.createDeserializer().readObject(member, dataObject[target]);
      }
      if (this.awsQueryCompatible) this.mixin.queryCompatOutput(dataObject, output);
      throw this.mixin.decorateServiceException(
        Object.assign(
          N,
          errorMetadata,
          {
            $fault: ns.getMergedTraits().error,
            message,
          },
          output,
        ),
        dataObject,
      );
    }
  }
  class AwsJson1_0Protocol extends AwsJsonRpcProtocol {
    constructor({ defaultNamespace, serviceTarget, awsQueryCompatible }) {
      super({
        defaultNamespace,
        serviceTarget,
        awsQueryCompatible,
      });
    }
    getShapeId() {
      return "aws.protocols#awsJson1_0";
    }
    getJsonRpcVersion() {
      return "1.0";
    }
    getDefaultContentType() {
      return "application/x-amz-json-1.0";
    }
  }
  class AwsJson1_1Protocol extends AwsJsonRpcProtocol {
    constructor({ defaultNamespace, serviceTarget, awsQueryCompatible }) {
      super({
        defaultNamespace,
        serviceTarget,
        awsQueryCompatible,
      });
    }
    getShapeId() {
      return "aws.protocols#awsJson1_1";
    }
    getJsonRpcVersion() {
      return "1.1";
    }
    getDefaultContentType() {
      return "application/x-amz-json-1.1";
    }
  }
  class AwsRestJsonProtocol extends protocols.HttpBindingProtocol {
    serializer;
    deserializer;
    codec;
    mixin = new ProtocolLib();
    constructor({ defaultNamespace }) {
      super({
        defaultNamespace,
      });
      let settings = {
        timestampFormat: {
          useTrait: true,
          default: 7,
        },
        httpBindings: true,
        jsonName: true,
      };
      this.codec = new JsonCodec(settings);
      this.serializer = new protocols.HttpInterceptingShapeSerializer(
        this.codec.createSerializer(),
        settings,
      );
      this.deserializer = new protocols.HttpInterceptingShapeDeserializer(
        this.codec.createDeserializer(),
        settings,
      );
    }
    getShapeId() {
      return "aws.protocols#restJson1";
    }
    getPayloadCodec() {
      return this.codec;
    }
    setSerdeContext(serdeContext) {
      this.codec.setSerdeContext(serdeContext);
      super.setSerdeContext(serdeContext);
    }
    async serializeRequest(operationSchema, input, context) {
      let request = await super.serializeRequest(operationSchema, input, context);
      let inputSchema = schema.NormalizedSchema.of(operationSchema.input);
      if (!request.headers["content-type"]) {
        let contentType = this.mixin.resolveRestContentType(this.getDefaultContentType(), inputSchema);
        if (contentType) request.headers["content-type"] = contentType;
      }
      if (request.body == null && request.headers["content-type"] === this.getDefaultContentType())
        request.body = "{}";
      return request;
    }
    async deserializeResponse(operationSchema, context, response) {
      let output = await super.deserializeResponse(operationSchema, context, response);
      let outputSchema = schema.NormalizedSchema.of(operationSchema.output);
      for (let [name, member] of outputSchema.structIterator())
        if (member.getMemberTraits().httpPayload && !(name in output)) output[name] = null;
      return output;
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
      let errorIdentifier = loadRestJsonErrorCode(response, dataObject) ?? "Unknown";
      let { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(
        errorIdentifier,
        this.options.defaultNamespace,
        response,
        dataObject,
        metadata,
      );
      let ns = schema.NormalizedSchema.of(errorSchema);
      let message = dataObject.message ?? dataObject.Message ?? "Unknown";
      let N = new (schema.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error)(message);
      await this.deserializeHttpMessage(errorSchema, context, response, dataObject);
      let output = {};
      for (let [name, member] of ns.structIterator()) {
        let target = member.getMergedTraits().jsonName ?? name;
        output[name] = this.codec.createDeserializer().readObject(member, dataObject[target]);
      }
      throw this.mixin.decorateServiceException(
        Object.assign(
          N,
          errorMetadata,
          {
            $fault: ns.getMergedTraits().error,
            message,
          },
          output,
        ),
        dataObject,
      );
    }
    getDefaultContentType() {
      return "application/json";
    }
  }
  var awsExpectUnion = (value) => {
    if (value == null) return;
    if (typeof value === "object" && "__type" in value) delete value.__type;
    return smithyClient.expectUnion(value);
  };
  class XmlShapeDeserializer extends SerdeContextConfig {
    settings;
    stringDeserializer;
    constructor(settings) {
      super();
      this.settings = settings;
      this.stringDeserializer = new protocols.FromStringShapeDeserializer(settings);
    }
    setSerdeContext(serdeContext) {
      this.serdeContext = serdeContext;
      this.stringDeserializer.setSerdeContext(serdeContext);
    }
    read(schema$1, bytes, key) {
      let ns = schema.NormalizedSchema.of(schema$1);
      let memberSchemas = ns.getMemberSchemas();
      if (
        ns.isStructSchema() &&
        ns.isMemberSchema() &&
        !!Object.values(memberSchemas).find((memberNs) => !!memberNs.getMemberTraits().eventPayload)
      ) {
        let output = {};
        let memberName = Object.keys(memberSchemas)[0];
        if (memberSchemas[memberName].isBlobSchema()) output[memberName] = bytes;
        else output[memberName] = this.read(memberSchemas[memberName], bytes);
        return output;
      }
      let xmlString = (this.serdeContext?.utf8Encoder ?? utilUtf8.toUtf8)(bytes);
      let parsedObject = this.parseXml(xmlString);
      return this.readSchema(schema$1, key ? parsedObject[key] : parsedObject);
    }
    readSchema(_schema, value) {
      let ns = schema.NormalizedSchema.of(_schema);
      if (ns.isUnitSchema()) return;
      let traits = ns.getMergedTraits();
      if (ns.isListSchema() && !Array.isArray(value)) return this.readSchema(ns, [value]);
      if (value == null) return value;
      if (typeof value === "object") {
        let sparse = !!traits.sparse;
        let flat = !!traits.xmlFlattened;
        if (ns.isListSchema()) {
          let listValue = ns.getValueSchema();
          let buffer = [];
          let sourceKey = listValue.getMergedTraits().xmlName ?? "member";
          let source = flat ? value : (value[0] ?? value)[sourceKey];
          let sourceArray = Array.isArray(source) ? source : [source];
          for (let v of sourceArray) if (v != null || sparse) buffer.push(this.readSchema(listValue, v));
          return buffer;
        }
        let buffer = {};
        if (ns.isMapSchema()) {
          let keyNs = ns.getKeySchema();
          let memberNs = ns.getValueSchema();
          let entries;
          if (flat) entries = Array.isArray(value) ? value : [value];
          else entries = Array.isArray(value.entry) ? value.entry : [value.entry];
          let keyProperty = keyNs.getMergedTraits().xmlName ?? "key";
          let valueProperty = memberNs.getMergedTraits().xmlName ?? "value";
          for (let entry of entries) {
            let key = entry[keyProperty];
            let value = entry[valueProperty];
            if (value != null || sparse) buffer[key] = this.readSchema(memberNs, value);
          }
          return buffer;
        }
        if (ns.isStructSchema()) {
          for (let [memberName, memberSchema] of ns.structIterator()) {
            let memberTraits = memberSchema.getMergedTraits();
            let xmlObjectKey = !memberTraits.httpPayload
              ? (memberSchema.getMemberTraits().xmlName ?? memberName)
              : (memberTraits.xmlName ?? memberSchema.getName());
            if (value[xmlObjectKey] != null)
              buffer[memberName] = this.readSchema(memberSchema, value[xmlObjectKey]);
          }
          return buffer;
        }
        if (ns.isDocumentSchema()) return value;
        throw Error(
          `@aws-sdk/core/protocols - xml deserializer unhandled schema type for ${ns.getName(true)}`,
        );
      }
      if (ns.isListSchema()) return [];
      if (ns.isMapSchema() || ns.isStructSchema()) return {};
      return this.stringDeserializer.read(ns, value);
    }
    parseXml(xml) {
      if (xml.length) {
        let parsedObj;
        try {
          parsedObj = xmlBuilder.parseXML(xml);
        } catch (e) {
          if (e && typeof e === "object")
            Object.defineProperty(e, "$responseBodyText", {
              value: xml,
            });
          throw e;
        }
        let textNodeName = "#text";
        let key = Object.keys(parsedObj)[0];
        let parsedObjToReturn = parsedObj[key];
        if (parsedObjToReturn[textNodeName]) {
          parsedObjToReturn[key] = parsedObjToReturn[textNodeName];
          delete parsedObjToReturn[textNodeName];
        }
        return smithyClient.getValueFromTextNode(parsedObjToReturn);
      }
      return {};
    }
  }
  class QueryShapeSerializer extends SerdeContextConfig {
    settings;
    buffer;
    constructor(settings) {
      super();
      this.settings = settings;
    }
    write(schema$1, value, prefix = "") {
      if (this.buffer === undefined) this.buffer = "";
      let ns = schema.NormalizedSchema.of(schema$1);
      if (prefix && !prefix.endsWith(".")) prefix += ".";
      if (ns.isBlobSchema()) {
        if (typeof value === "string" || value instanceof Uint8Array) {
          this.writeKey(prefix);
          this.writeValue((this.serdeContext?.base64Encoder ?? utilBase64.toBase64)(value));
        }
      } else if (ns.isBooleanSchema() || ns.isNumericSchema() || ns.isStringSchema()) {
        if (value != null) {
          this.writeKey(prefix);
          this.writeValue(String(value));
        } else if (ns.isIdempotencyToken()) {
          this.writeKey(prefix);
          this.writeValue(serde.generateIdempotencyToken());
        }
      } else if (ns.isBigIntegerSchema()) {
        if (value != null) {
          this.writeKey(prefix);
          this.writeValue(String(value));
        }
      } else if (ns.isBigDecimalSchema()) {
        if (value != null) {
          this.writeKey(prefix);
          this.writeValue(value instanceof serde.NumericValue ? value.string : String(value));
        }
      } else if (ns.isTimestampSchema()) {
        if (value instanceof Date)
          switch ((this.writeKey(prefix), protocols.determineTimestampFormat(ns, this.settings))) {
            case 5:
              this.writeValue(value.toISOString().replace(".000Z", "Z"));
              break;
            case 6:
              this.writeValue(smithyClient.dateToUtcString(value));
              break;
            case 7:
              this.writeValue(String(value.getTime() / 1000));
              break;
          }
      } else if (ns.isDocumentSchema())
        throw Error(
          `@aws-sdk/core/protocols - QuerySerializer unsupported document type ${ns.getName(true)}`,
        );
      else if (ns.isListSchema()) {
        if (Array.isArray(value))
          if (value.length === 0) {
            if (this.settings.serializeEmptyLists) {
              this.writeKey(prefix);
              this.writeValue("");
            }
          } else {
            let member = ns.getValueSchema();
            let flat = this.settings.flattenLists || ns.getMergedTraits().xmlFlattened;
            let i = 1;
            for (let item of value) {
              if (item == null) continue;
              let suffix = this.getKey("member", member.getMergedTraits().xmlName);
              let key = flat ? `${prefix}${i}` : `${prefix}${suffix}.${i}`;
              this.write(member, item, key);
              ++i;
            }
          }
      } else if (ns.isMapSchema()) {
        if (value && typeof value === "object") {
          let keySchema = ns.getKeySchema();
          let memberSchema = ns.getValueSchema();
          let flat = ns.getMergedTraits().xmlFlattened;
          let i = 1;
          for (let [k, v] of Object.entries(value)) {
            if (v == null) continue;
            let keySuffix = this.getKey("key", keySchema.getMergedTraits().xmlName);
            let key = flat ? `${prefix}${i}.${keySuffix}` : `${prefix}entry.${i}.${keySuffix}`;
            let valueSuffix = this.getKey("value", memberSchema.getMergedTraits().xmlName);
            let valueKey = flat ? `${prefix}${i}.${valueSuffix}` : `${prefix}entry.${i}.${valueSuffix}`;
            this.write(keySchema, k, key);
            this.write(memberSchema, v, valueKey);
            ++i;
          }
        }
      } else if (ns.isStructSchema()) {
        if (value && typeof value === "object")
          for (let [memberName, member] of ns.structIterator()) {
            if (value[memberName] == null && !member.isIdempotencyToken()) continue;
            let suffix = this.getKey(memberName, member.getMergedTraits().xmlName);
            let key = `${prefix}${suffix}`;
            this.write(member, value[memberName], key);
          }
      } else if (ns.isUnitSchema());
      else
        throw Error(`@aws-sdk/core/protocols - QuerySerializer unrecognized schema type ${ns.getName(true)}`);
    }
    flush() {
      if (this.buffer === undefined)
        throw Error("@aws-sdk/core/protocols - QuerySerializer cannot flush with nothing written to buffer.");
      let str = this.buffer;
      delete this.buffer;
      return str;
    }
    getKey(memberName, xmlName) {
      let key = xmlName ?? memberName;
      if (this.settings.capitalizeKeys) return key[0].toUpperCase() + key.slice(1);
      return key;
    }
    writeKey(key) {
      if (key.endsWith(".")) key = key.slice(0, key.length - 1);
      this.buffer += `&${protocols.extendedEncodeURIComponent(key)}=`;
    }
    writeValue(value) {
      this.buffer += protocols.extendedEncodeURIComponent(value);
    }
  }
  class AwsQueryProtocol extends protocols.RpcProtocol {
    options;
    serializer;
    deserializer;
    mixin = new ProtocolLib();
    constructor(options) {
      super({
        defaultNamespace: options.defaultNamespace,
      });
      this.options = options;
      let settings = {
        timestampFormat: {
          useTrait: true,
          default: 5,
        },
        httpBindings: false,
        xmlNamespace: options.xmlNamespace,
        serviceNamespace: options.defaultNamespace,
        serializeEmptyLists: true,
      };
      this.serializer = new QueryShapeSerializer(settings);
      this.deserializer = new XmlShapeDeserializer(settings);
    }
    getShapeId() {
      return "aws.protocols#awsQuery";
    }
    setSerdeContext(serdeContext) {
      this.serializer.setSerdeContext(serdeContext);
      this.deserializer.setSerdeContext(serdeContext);
    }
    getPayloadCodec() {
      throw Error("AWSQuery protocol has no payload codec.");
    }
    async serializeRequest(operationSchema, input, context) {
      let request = await super.serializeRequest(operationSchema, input, context);
      if (!request.path.endsWith("/")) request.path += "/";
      Object.assign(request.headers, {
        "content-type": "application/x-www-form-urlencoded",
      });
      if (schema.deref(operationSchema.input) === "unit" || !request.body) request.body = "";
      let action = operationSchema.name.split("#")[1] ?? operationSchema.name;
      request.body = `Action=${action}&Version=${this.options.version}` + request.body;
      if (request.body.endsWith("&")) request.body = request.body.slice(-1);
      return request;
    }
    async deserializeResponse(operationSchema, context, response) {
      let deserializer = this.deserializer;
      let ns = schema.NormalizedSchema.of(operationSchema.output);
      let dataObject = {};
      if (response.statusCode >= 300) {
        let bytes = await protocols.collectBody(response.body, context);
        if (bytes.byteLength > 0) Object.assign(dataObject, await deserializer.read(15, bytes));
        await this.handleError(
          operationSchema,
          context,
          response,
          dataObject,
          this.deserializeMetadata(response),
        );
      }
      for (let header in response.headers) {
        let value = response.headers[header];
        delete response.headers[header];
        response.headers[header.toLowerCase()] = value;
      }
      let shortName = operationSchema.name.split("#")[1] ?? operationSchema.name;
      let awsQueryResultKey =
        ns.isStructSchema() && this.useNestedResult() ? shortName + "Result" : undefined;
      let bytes = await protocols.collectBody(response.body, context);
      if (bytes.byteLength > 0)
        Object.assign(dataObject, await deserializer.read(ns, bytes, awsQueryResultKey));
      return {
        $metadata: this.deserializeMetadata(response),
        ...dataObject,
      };
    }
    useNestedResult() {
      return true;
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
      let errorIdentifier = this.loadQueryErrorCode(response, dataObject) ?? "Unknown";
      let errorData = this.loadQueryError(dataObject);
      let message = this.loadQueryErrorMessage(dataObject);
      errorData.message = message;
      errorData.Error = {
        Type: errorData.Type,
        Code: errorData.Code,
        Message: message,
      };
      let { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(
        errorIdentifier,
        this.options.defaultNamespace,
        response,
        errorData,
        metadata,
        (registry, errorName) => {
          try {
            return registry.getSchema(errorName);
          } catch (e) {
            return registry.find(
              (schema$1) =>
                schema.NormalizedSchema.of(schema$1).getMergedTraits().awsQueryError?.[0] === errorName,
            );
          }
        },
      );
      let ns = schema.NormalizedSchema.of(errorSchema);
      let b = new (schema.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error)(message);
      let output = {
        Error: errorData.Error,
      };
      for (let [name, member] of ns.structIterator()) {
        let target = member.getMergedTraits().xmlName ?? name;
        let value = errorData[target] ?? dataObject[target];
        output[name] = this.deserializer.readSchema(member, value);
      }
      throw this.mixin.decorateServiceException(
        Object.assign(
          b,
          errorMetadata,
          {
            $fault: ns.getMergedTraits().error,
            message,
          },
          output,
        ),
        dataObject,
      );
    }
    loadQueryErrorCode(output, data) {
      let code = (data.Errors?.[0]?.Error ?? data.Errors?.Error ?? data.Error)?.Code;
      if (code !== undefined) return code;
      if (output.statusCode == 404) return "NotFound";
    }
    loadQueryError(data) {
      return data.Errors?.[0]?.Error ?? data.Errors?.Error ?? data.Error;
    }
    loadQueryErrorMessage(data) {
      let errorData = this.loadQueryError(data);
      return errorData?.message ?? errorData?.Message ?? data.message ?? data.Message ?? "Unknown";
    }
    getDefaultContentType() {
      return "application/x-www-form-urlencoded";
    }
  }
  class AwsEc2QueryProtocol extends AwsQueryProtocol {
    options;
    constructor(options) {
      super(options);
      this.options = options;
      let ec2Settings = {
        capitalizeKeys: true,
        flattenLists: true,
        serializeEmptyLists: false,
      };
      Object.assign(this.serializer.settings, ec2Settings);
    }
    useNestedResult() {
      return false;
    }
  }
  var parseXmlBody = (streamBody, context) =>
    collectBodyString(streamBody, context).then((encoded) => {
      if (encoded.length) {
        let parsedObj;
        try {
          parsedObj = xmlBuilder.parseXML(encoded);
        } catch (e) {
          if (e && typeof e === "object")
            Object.defineProperty(e, "$responseBodyText", {
              value: encoded,
            });
          throw e;
        }
        let textNodeName = "#text";
        let key = Object.keys(parsedObj)[0];
        let parsedObjToReturn = parsedObj[key];
        if (parsedObjToReturn[textNodeName]) {
          parsedObjToReturn[key] = parsedObjToReturn[textNodeName];
          delete parsedObjToReturn[textNodeName];
        }
        return smithyClient.getValueFromTextNode(parsedObjToReturn);
      }
      return {};
    });
  var parseXmlErrorBody = async (errorBody, context) => {
    let value = await parseXmlBody(errorBody, context);
    if (value.Error) value.Error.message = value.Error.message ?? value.Error.Message;
    return value;
  };
  var loadRestXmlErrorCode = (output, data) => {
    if (data?.Error?.Code !== undefined) return data.Error.Code;
    if (data?.Code !== undefined) return data.Code;
    if (output.statusCode == 404) return "NotFound";
  };
  class XmlShapeSerializer extends SerdeContextConfig {
    settings;
    stringBuffer;
    byteBuffer;
    buffer;
    constructor(settings) {
      super();
      this.settings = settings;
    }
    write(schema$1, value) {
      let ns = schema.NormalizedSchema.of(schema$1);
      if (ns.isStringSchema() && typeof value === "string") this.stringBuffer = value;
      else if (ns.isBlobSchema())
        this.byteBuffer =
          "byteLength" in value ? value : (this.serdeContext?.base64Decoder ?? utilBase64.fromBase64)(value);
      else {
        this.buffer = this.writeStruct(ns, value, undefined);
        let traits = ns.getMergedTraits();
        if (traits.httpPayload && !traits.xmlName) this.buffer.withName(ns.getName());
      }
    }
    flush() {
      if (this.byteBuffer !== undefined) {
        let bytes = this.byteBuffer;
        delete this.byteBuffer;
        return bytes;
      }
      if (this.stringBuffer !== undefined) {
        let str = this.stringBuffer;
        delete this.stringBuffer;
        return str;
      }
      let buffer = this.buffer;
      if (this.settings.xmlNamespace) {
        if (!buffer?.attributes?.xmlns) buffer.addAttribute("xmlns", this.settings.xmlNamespace);
      }
      delete this.buffer;
      return buffer.toString();
    }
    writeStruct(ns, value, parentXmlns) {
      let traits = ns.getMergedTraits();
      let name =
        ns.isMemberSchema() && !traits.httpPayload
          ? (ns.getMemberTraits().xmlName ?? ns.getMemberName())
          : (traits.xmlName ?? ns.getName());
      if (!name || !ns.isStructSchema())
        throw Error(
          `@aws-sdk/core/protocols - xml serializer, cannot write struct with empty name or non-struct, schema=${ns.getName(true)}.`,
        );
      let structXmlNode = xmlBuilder.XmlNode.of(name);
      let [xmlnsAttr, xmlns] = this.getXmlnsAttribute(ns, parentXmlns);
      for (let [memberName, memberSchema] of ns.structIterator()) {
        let val = value[memberName];
        if (val != null || memberSchema.isIdempotencyToken()) {
          if (memberSchema.getMergedTraits().xmlAttribute) {
            structXmlNode.addAttribute(
              memberSchema.getMergedTraits().xmlName ?? memberName,
              this.writeSimple(memberSchema, val),
            );
            continue;
          }
          if (memberSchema.isListSchema()) this.writeList(memberSchema, val, structXmlNode, xmlns);
          else if (memberSchema.isMapSchema()) this.writeMap(memberSchema, val, structXmlNode, xmlns);
          else if (memberSchema.isStructSchema())
            structXmlNode.addChildNode(this.writeStruct(memberSchema, val, xmlns));
          else {
            let memberNode = xmlBuilder.XmlNode.of(
              memberSchema.getMergedTraits().xmlName ?? memberSchema.getMemberName(),
            );
            this.writeSimpleInto(memberSchema, val, memberNode, xmlns);
            structXmlNode.addChildNode(memberNode);
          }
        }
      }
      if (xmlns) structXmlNode.addAttribute(xmlnsAttr, xmlns);
      return structXmlNode;
    }
    writeList(listMember, array, container, parentXmlns) {
      if (!listMember.isMemberSchema())
        throw Error(
          `@aws-sdk/core/protocols - xml serializer, cannot write non-member list: ${listMember.getName(true)}`,
        );
      let listTraits = listMember.getMergedTraits();
      let listValueSchema = listMember.getValueSchema();
      let listValueTraits = listValueSchema.getMergedTraits();
      let sparse = !!listValueTraits.sparse;
      let flat = !!listTraits.xmlFlattened;
      let [xmlnsAttr, xmlns] = this.getXmlnsAttribute(listMember, parentXmlns);
      let writeItem = (container, value) => {
        if (listValueSchema.isListSchema())
          this.writeList(listValueSchema, Array.isArray(value) ? value : [value], container, xmlns);
        else if (listValueSchema.isMapSchema()) this.writeMap(listValueSchema, value, container, xmlns);
        else if (listValueSchema.isStructSchema()) {
          let struct = this.writeStruct(listValueSchema, value, xmlns);
          container.addChildNode(
            struct.withName(
              flat
                ? (listTraits.xmlName ?? listMember.getMemberName())
                : (listValueTraits.xmlName ?? "member"),
            ),
          );
        } else {
          let listItemNode = xmlBuilder.XmlNode.of(
            flat ? (listTraits.xmlName ?? listMember.getMemberName()) : (listValueTraits.xmlName ?? "member"),
          );
          this.writeSimpleInto(listValueSchema, value, listItemNode, xmlns);
          container.addChildNode(listItemNode);
        }
      };
      if (flat) {
        for (let value of array) if (sparse || value != null) writeItem(container, value);
      } else {
        let listNode = xmlBuilder.XmlNode.of(listTraits.xmlName ?? listMember.getMemberName());
        if (xmlns) listNode.addAttribute(xmlnsAttr, xmlns);
        for (let value of array) if (sparse || value != null) writeItem(listNode, value);
        container.addChildNode(listNode);
      }
    }
    writeMap(mapMember, map, container, parentXmlns, containerIsMap = false) {
      if (!mapMember.isMemberSchema())
        throw Error(
          `@aws-sdk/core/protocols - xml serializer, cannot write non-member map: ${mapMember.getName(true)}`,
        );
      let mapTraits = mapMember.getMergedTraits();
      let mapKeySchema = mapMember.getKeySchema();
      let xmlName = mapKeySchema.getMergedTraits().xmlName ?? "key";
      let mapValueSchema = mapMember.getValueSchema();
      let mapValueTraits = mapValueSchema.getMergedTraits();
      let valueTag = mapValueTraits.xmlName ?? "value";
      let sparse = !!mapValueTraits.sparse;
      let flat = !!mapTraits.xmlFlattened;
      let [xmlnsAttr, xmlns] = this.getXmlnsAttribute(mapMember, parentXmlns);
      let addKeyValue = (entry, key, val) => {
        let keyNode = xmlBuilder.XmlNode.of(xmlName, key);
        let [keyXmlnsAttr, keyXmlns] = this.getXmlnsAttribute(mapKeySchema, xmlns);
        if (keyXmlns) keyNode.addAttribute(keyXmlnsAttr, keyXmlns);
        entry.addChildNode(keyNode);
        let valueNode = xmlBuilder.XmlNode.of(valueTag);
        if (mapValueSchema.isListSchema()) this.writeList(mapValueSchema, val, valueNode, xmlns);
        else if (mapValueSchema.isMapSchema()) this.writeMap(mapValueSchema, val, valueNode, xmlns, true);
        else if (mapValueSchema.isStructSchema()) valueNode = this.writeStruct(mapValueSchema, val, xmlns);
        else this.writeSimpleInto(mapValueSchema, val, valueNode, xmlns);
        entry.addChildNode(valueNode);
      };
      if (flat) {
        for (let [key, val] of Object.entries(map))
          if (sparse || val != null) {
            let entry = xmlBuilder.XmlNode.of(mapTraits.xmlName ?? mapMember.getMemberName());
            addKeyValue(entry, key, val);
            container.addChildNode(entry);
          }
      } else {
        let mapNode;
        if (!containerIsMap) {
          mapNode = xmlBuilder.XmlNode.of(mapTraits.xmlName ?? mapMember.getMemberName());
          if (xmlns) mapNode.addAttribute(xmlnsAttr, xmlns);
          container.addChildNode(mapNode);
        }
        for (let [key, val] of Object.entries(map))
          if (sparse || val != null) {
            let entry = xmlBuilder.XmlNode.of("entry");
            addKeyValue(entry, key, val);
            (containerIsMap ? container : mapNode).addChildNode(entry);
          }
      }
    }
    writeSimple(_schema, value) {
      if (value === null) throw Error("@aws-sdk/core/protocols - (XML serializer) cannot write null value.");
      let ns = schema.NormalizedSchema.of(_schema);
      let nodeContents = null;
      if (value && typeof value === "object")
        if (ns.isBlobSchema())
          nodeContents = (this.serdeContext?.base64Encoder ?? utilBase64.toBase64)(value);
        else if (ns.isTimestampSchema() && value instanceof Date)
          switch (protocols.determineTimestampFormat(ns, this.settings)) {
            case 5:
              nodeContents = value.toISOString().replace(".000Z", "Z");
              break;
            case 6:
              nodeContents = smithyClient.dateToUtcString(value);
              break;
            case 7:
              nodeContents = String(value.getTime() / 1000);
              break;
            default:
              console.warn("Missing timestamp format, using http date", value);
              nodeContents = smithyClient.dateToUtcString(value);
              break;
          }
        else if (ns.isBigDecimalSchema() && value) {
          if (value instanceof serde.NumericValue) return value.string;
          return String(value);
        } else if (ns.isMapSchema() || ns.isListSchema())
          throw Error(
            "@aws-sdk/core/protocols - xml serializer, cannot call _write() on List/Map schema, call writeList or writeMap() instead.",
          );
        else
          throw Error(
            `@aws-sdk/core/protocols - xml serializer, unhandled schema type for object value and schema: ${ns.getName(true)}`,
          );
      if (ns.isBooleanSchema() || ns.isNumericSchema() || ns.isBigIntegerSchema() || ns.isBigDecimalSchema())
        nodeContents = String(value);
      if (ns.isStringSchema())
        if (value === undefined && ns.isIdempotencyToken()) nodeContents = serde.generateIdempotencyToken();
        else nodeContents = String(value);
      if (nodeContents === null) throw Error(`Unhandled schema-value pair ${ns.getName(true)}=${value}`);
      return nodeContents;
    }
    writeSimpleInto(_schema, value, into, parentXmlns) {
      let nodeContents = this.writeSimple(_schema, value);
      let ns = schema.NormalizedSchema.of(_schema);
      let content = new xmlBuilder.XmlText(nodeContents);
      let [xmlnsAttr, xmlns] = this.getXmlnsAttribute(ns, parentXmlns);
      if (xmlns) into.addAttribute(xmlnsAttr, xmlns);
      into.addChildNode(content);
    }
    getXmlnsAttribute(ns, parentXmlns) {
      let traits = ns.getMergedTraits();
      let [prefix, xmlns] = traits.xmlNamespace ?? [];
      if (xmlns && xmlns !== parentXmlns) return [prefix ? `xmlns:${prefix}` : "xmlns", xmlns];
      return [undefined, undefined];
    }
  }
  class XmlCodec extends SerdeContextConfig {
    settings;
    constructor(settings) {
      super();
      this.settings = settings;
    }
    createSerializer() {
      let serializer = new XmlShapeSerializer(this.settings);
      serializer.setSerdeContext(this.serdeContext);
      return serializer;
    }
    createDeserializer() {
      let deserializer = new XmlShapeDeserializer(this.settings);
      deserializer.setSerdeContext(this.serdeContext);
      return deserializer;
    }
  }
  class AwsRestXmlProtocol extends protocols.HttpBindingProtocol {
    codec;
    serializer;
    deserializer;
    mixin = new ProtocolLib();
    constructor(options) {
      super(options);
      let settings = {
        timestampFormat: {
          useTrait: true,
          default: 5,
        },
        httpBindings: true,
        xmlNamespace: options.xmlNamespace,
        serviceNamespace: options.defaultNamespace,
      };
      this.codec = new XmlCodec(settings);
      this.serializer = new protocols.HttpInterceptingShapeSerializer(
        this.codec.createSerializer(),
        settings,
      );
      this.deserializer = new protocols.HttpInterceptingShapeDeserializer(
        this.codec.createDeserializer(),
        settings,
      );
    }
    getPayloadCodec() {
      return this.codec;
    }
    getShapeId() {
      return "aws.protocols#restXml";
    }
    async serializeRequest(operationSchema, input, context) {
      let request = await super.serializeRequest(operationSchema, input, context);
      let inputSchema = schema.NormalizedSchema.of(operationSchema.input);
      if (!request.headers["content-type"]) {
        let contentType = this.mixin.resolveRestContentType(this.getDefaultContentType(), inputSchema);
        if (contentType) request.headers["content-type"] = contentType;
      }
      if (request.headers["content-type"] === this.getDefaultContentType()) {
        if (typeof request.body === "string")
          request.body = '<?xml version="1.0" encoding="UTF-8"?>' + request.body;
      }
      return request;
    }
    async deserializeResponse(operationSchema, context, response) {
      return super.deserializeResponse(operationSchema, context, response);
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
      let errorIdentifier = loadRestXmlErrorCode(response, dataObject) ?? "Unknown";
      let { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(
        errorIdentifier,
        this.options.defaultNamespace,
        response,
        dataObject,
        metadata,
      );
      let ns = schema.NormalizedSchema.of(errorSchema);
      let message =
        dataObject.Error?.message ??
        dataObject.Error?.Message ??
        dataObject.message ??
        dataObject.Message ??
        "Unknown";
      let N = new (schema.TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error)(message);
      await this.deserializeHttpMessage(errorSchema, context, response, dataObject);
      let output = {};
      for (let [name, member] of ns.structIterator()) {
        let target = member.getMergedTraits().xmlName ?? name;
        let value = dataObject.Error?.[target] ?? dataObject[target];
        output[name] = this.codec.createDeserializer().readSchema(member, value);
      }
      throw this.mixin.decorateServiceException(
        Object.assign(
          N,
          errorMetadata,
          {
            $fault: ns.getMergedTraits().error,
            message,
          },
          output,
        ),
        dataObject,
      );
    }
    getDefaultContentType() {
      return "application/xml";
    }
  }
  cjsExports.AwsEc2QueryProtocol = AwsEc2QueryProtocol;
  cjsExports.AwsJson1_0Protocol = AwsJson1_0Protocol;
  cjsExports.AwsJson1_1Protocol = AwsJson1_1Protocol;
  cjsExports.AwsJsonRpcProtocol = AwsJsonRpcProtocol;
  cjsExports.AwsQueryProtocol = AwsQueryProtocol;
  cjsExports.AwsRestJsonProtocol = AwsRestJsonProtocol;
  cjsExports.AwsRestXmlProtocol = AwsRestXmlProtocol;
  cjsExports.AwsSmithyRpcV2CborProtocol = AwsSmithyRpcV2CborProtocol;
  cjsExports.JsonCodec = JsonCodec;
  cjsExports.JsonShapeDeserializer = JsonShapeDeserializer;
  cjsExports.JsonShapeSerializer = JsonShapeSerializer;
  cjsExports.XmlCodec = XmlCodec;
  cjsExports.XmlShapeDeserializer = XmlShapeDeserializer;
  cjsExports.XmlShapeSerializer = XmlShapeSerializer;
  cjsExports._toBool = _toBool;
  cjsExports._toNum = _toNum;
  cjsExports._toStr = _toStr;
  cjsExports.awsExpectUnion = awsExpectUnion;
  cjsExports.loadRestJsonErrorCode = loadRestJsonErrorCode;
  cjsExports.loadRestXmlErrorCode = loadRestXmlErrorCode;
  cjsExports.parseJsonBody = parseJsonBody;
  cjsExports.parseJsonErrorBody = parseJsonErrorBody;
  cjsExports.parseXmlBody = parseXmlBody;
  cjsExports.parseXmlErrorBody = parseXmlErrorBody;
});
export { require_protocols };
