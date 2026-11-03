/**
 * @smithy/core/dist-cjs/submodules/schema/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { require_protocol_http } from "../../../../protocol-http/dist-cjs/index.js";
import { require_util_middleware } from "../../../../util-middleware/dist-cjs/index.js";

//@ chunk-wjd9n4jx.js:12581-22053 cjs-fingerprint
var require_schema = x(function (cjsExports) {
  var HttpResponse = require_protocol_http();
  var getSmithyContext = require_util_middleware();
  var deref = (schemaRef) => {
    if (typeof schemaRef === "function") return schemaRef();
    return schemaRef;
  };
  var operation = (namespace, name, traits, input, output) => ({
    name,
    namespace,
    traits,
    input,
    output,
  });
  var schemaDeserializationMiddleware = (config) => (next, context) => async (args) => {
    let { response } = await next(args);
    let { operationSchema } = getSmithyContext.getSmithyContext(context);
    let [, ns, n, t, i, o] = operationSchema ?? [];
    try {
      let parsed = await config.protocol.deserializeResponse(
        operation(ns, n, t, i, o),
        {
          ...config,
          ...context,
        },
        response,
      );
      return {
        response,
        output: parsed,
      };
    } catch (error) {
      Object.defineProperty(error, "$response", {
        value: response,
        enumerable: false,
        writable: false,
        configurable: false,
      });
      if (!("$metadata" in error)) {
        try {
          error.message += `
  Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.`;
        } catch (ignored) {
          if (!context.logger || context.logger?.constructor?.name === "NoOpLogger")
            console.warn(
              "Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.",
            );
          else
            context.logger?.warn?.(
              "Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.",
            );
        }
        if (typeof error.$responseBodyText !== "undefined") {
          if (error.$response) error.$response.body = error.$responseBodyText;
        }
        try {
          if (HttpResponse.HttpResponse.isInstance(response)) {
            let { headers = {} } = response;
            let headerEntries = Object.entries(headers);
            error.$metadata = {
              httpStatusCode: response.statusCode,
              requestId: findHeader(/^x-[\w-]+-request-?id$/, headerEntries),
              extendedRequestId: findHeader(/^x-[\w-]+-id-2$/, headerEntries),
              cfId: findHeader(/^x-[\w-]+-cf-id$/, headerEntries),
            };
          }
        } catch (ignored) {}
      }
      throw error;
    }
  };
  var findHeader = (pattern, headers) =>
    (headers.find(([k]) => k.match(pattern)) || [undefined, undefined])[1];
  var schemaSerializationMiddleware = (config) => (next, context) => async (args) => {
    let { operationSchema } = getSmithyContext.getSmithyContext(context);
    let [, ns, n, t, i, o] = operationSchema ?? [];
    let endpoint =
      context.endpointV2?.url && config.urlParser
        ? async () => config.urlParser(context.endpointV2.url)
        : config.endpoint;
    let request = await config.protocol.serializeRequest(operation(ns, n, t, i, o), args.input, {
      ...config,
      ...context,
      endpoint,
    });
    return next({
      ...args,
      request,
    });
  };
  var deserializerMiddlewareOption = {
    name: "deserializerMiddleware",
    step: "deserialize",
    tags: ["DESERIALIZER"],
    override: true,
  };
  var serializerMiddlewareOption = {
    name: "serializerMiddleware",
    step: "serialize",
    tags: ["SERIALIZER"],
    override: true,
  };
  function getSchemaSerdePlugin(config) {
    return {
      applyToStack: (commandStack) => {
        commandStack.add(schemaSerializationMiddleware(config), serializerMiddlewareOption);
        commandStack.add(schemaDeserializationMiddleware(config), deserializerMiddlewareOption);
        config.protocol.setSerdeContext(config);
      },
    };
  }
  class Schema {
    name;
    namespace;
    traits;
    static assign(instance, t) {
      return Object.assign(instance, t);
    }
    static [Symbol.hasInstance](lhs) {
      let isPrototype = this.prototype.isPrototypeOf(lhs);
      if (!isPrototype && typeof lhs === "object" && lhs !== null) return lhs.symbol === this.symbol;
      return isPrototype;
    }
    getName() {
      return this.namespace + "#" + this.name;
    }
  }
  class ListSchema extends Schema {
    static symbol = Symbol.for("@smithy/lis");
    name;
    traits;
    valueSchema;
    symbol = ListSchema.symbol;
  }
  var list = (namespace, name, traits, valueSchema) =>
    Schema.assign(new ListSchema(), {
      name,
      namespace,
      traits,
      valueSchema,
    });
  class MapSchema extends Schema {
    static symbol = Symbol.for("@smithy/map");
    name;
    traits;
    keySchema;
    valueSchema;
    symbol = MapSchema.symbol;
  }
  var map = (namespace, name, traits, keySchema, valueSchema) =>
    Schema.assign(new MapSchema(), {
      name,
      namespace,
      traits,
      keySchema,
      valueSchema,
    });
  class OperationSchema extends Schema {
    static symbol = Symbol.for("@smithy/ope");
    name;
    traits;
    input;
    output;
    symbol = OperationSchema.symbol;
  }
  var op = (namespace, name, traits, input, output) =>
    Schema.assign(new OperationSchema(), {
      name,
      namespace,
      traits,
      input,
      output,
    });
  class StructureSchema extends Schema {
    static symbol = Symbol.for("@smithy/str");
    name;
    traits;
    memberNames;
    memberList;
    symbol = StructureSchema.symbol;
  }
  var struct = (namespace, name, traits, memberNames, memberList) =>
    Schema.assign(new StructureSchema(), {
      name,
      namespace,
      traits,
      memberNames,
      memberList,
    });
  class ErrorSchema extends StructureSchema {
    static symbol = Symbol.for("@smithy/err");
    ctor;
    symbol = ErrorSchema.symbol;
  }
  var error = (namespace, name, traits, memberNames, memberList, _ctor) =>
    Schema.assign(new ErrorSchema(), {
      name,
      namespace,
      traits,
      memberNames,
      memberList,
      ctor: null,
    });
  function translateTraits(indicator) {
    if (typeof indicator === "object") return indicator;
    indicator = indicator | 0;
    let traits = {};
    let i = 0;
    for (let trait of [
      "httpLabel",
      "idempotent",
      "idempotencyToken",
      "sensitive",
      "httpPayload",
      "httpResponseCode",
      "httpQueryParams",
    ])
      if (((indicator >> i++) & 1) === 1) traits[trait] = 1;
    return traits;
  }
  class NormalizedSchema {
    ref;
    memberName;
    static symbol = Symbol.for("@smithy/nor");
    symbol = NormalizedSchema.symbol;
    name;
    schema;
    _isMemberSchema;
    traits;
    memberTraits;
    normalizedTraits;
    constructor(ref, memberName) {
      this.ref = ref;
      this.memberName = memberName;
      let traitStack = [];
      let _ref = ref;
      let schema = ref;
      this._isMemberSchema = false;
      while (isMemberSchema(_ref)) {
        traitStack.push(_ref[1]);
        _ref = _ref[0];
        schema = deref(_ref);
        this._isMemberSchema = true;
      }
      if (traitStack.length > 0) {
        this.memberTraits = {};
        for (let i = traitStack.length - 1; i >= 0; --i) {
          let traitSet = traitStack[i];
          Object.assign(this.memberTraits, translateTraits(traitSet));
        }
      } else this.memberTraits = 0;
      if (schema instanceof NormalizedSchema) {
        let computedMemberTraits = this.memberTraits;
        Object.assign(this, schema);
        this.memberTraits = Object.assign(
          {},
          computedMemberTraits,
          schema.getMemberTraits(),
          this.getMemberTraits(),
        );
        this.normalizedTraits = undefined;
        this.memberName = memberName ?? schema.memberName;
        return;
      }
      this.schema = deref(schema);
      if (isStaticSchema(this.schema)) {
        this.name = `${this.schema[1]}#${this.schema[2]}`;
        this.traits = this.schema[3];
      } else {
        this.name = this.memberName ?? String(schema);
        this.traits = 0;
      }
      if (this._isMemberSchema && !memberName)
        throw Error(
          `@smithy/core/schema - NormalizedSchema member init ${this.getName(true)} missing member name.`,
        );
    }
    static [Symbol.hasInstance](lhs) {
      let isPrototype = this.prototype.isPrototypeOf(lhs);
      if (!isPrototype && typeof lhs === "object" && lhs !== null) return lhs.symbol === this.symbol;
      return isPrototype;
    }
    static of(ref) {
      let sc = deref(ref);
      if (sc instanceof NormalizedSchema) return sc;
      if (isMemberSchema(sc)) {
        let [ns, traits] = sc;
        if (ns instanceof NormalizedSchema) {
          Object.assign(ns.getMergedTraits(), translateTraits(traits));
          return ns;
        }
        throw Error(
          `@smithy/core/schema - may not init unwrapped member schema=${JSON.stringify(ref, null, 2)}.`,
        );
      }
      return new NormalizedSchema(sc);
    }
    getSchema() {
      let sc = this.schema;
      if (sc[0] === 0) return sc[4];
      return sc;
    }
    getName(withNamespace = false) {
      let { name } = this;
      return !withNamespace && name && name.includes("#") ? name.split("#")[1] : name || undefined;
    }
    getMemberName() {
      return this.memberName;
    }
    isMemberSchema() {
      return this._isMemberSchema;
    }
    isListSchema() {
      let sc = this.getSchema();
      return typeof sc === "number" ? sc >= 64 && sc < 128 : sc[0] === 1;
    }
    isMapSchema() {
      let sc = this.getSchema();
      return typeof sc === "number" ? sc >= 128 && sc <= 255 : sc[0] === 2;
    }
    isStructSchema() {
      let id = this.getSchema();
      return id[0] === 3 || id[0] === -3;
    }
    isBlobSchema() {
      let sc = this.getSchema();
      return sc === 21 || sc === 42;
    }
    isTimestampSchema() {
      let sc = this.getSchema();
      return typeof sc === "number" && sc >= 4 && sc <= 7;
    }
    isUnitSchema() {
      return this.getSchema() === "unit";
    }
    isDocumentSchema() {
      return this.getSchema() === 15;
    }
    isStringSchema() {
      return this.getSchema() === 0;
    }
    isBooleanSchema() {
      return this.getSchema() === 2;
    }
    isNumericSchema() {
      return this.getSchema() === 1;
    }
    isBigIntegerSchema() {
      return this.getSchema() === 17;
    }
    isBigDecimalSchema() {
      return this.getSchema() === 19;
    }
    isStreaming() {
      let { streaming } = this.getMergedTraits();
      return !!streaming || this.getSchema() === 42;
    }
    isIdempotencyToken() {
      let e = (n) => (n & 4) === 4 || !!n?.idempotencyToken;
      let { normalizedTraits, traits, memberTraits } = this;
      return e(normalizedTraits) || e(traits) || e(memberTraits);
    }
    getMergedTraits() {
      return (
        this.normalizedTraits ??
        (this.normalizedTraits = {
          ...this.getOwnTraits(),
          ...this.getMemberTraits(),
        })
      );
    }
    getMemberTraits() {
      return translateTraits(this.memberTraits);
    }
    getOwnTraits() {
      return translateTraits(this.traits);
    }
    getKeySchema() {
      let [isDoc, isMap] = [this.isDocumentSchema(), this.isMapSchema()];
      if (!isDoc && !isMap)
        throw Error(`@smithy/core/schema - cannot get key for non-map: ${this.getName(true)}`);
      let schema = this.getSchema();
      let memberSchema = isDoc ? 15 : (schema[4] ?? 0);
      return member([memberSchema, 0], "key");
    }
    getValueSchema() {
      let sc = this.getSchema();
      let [isDoc, isMap, isList] = [this.isDocumentSchema(), this.isMapSchema(), this.isListSchema()];
      let memberSchema =
        typeof sc === "number"
          ? 63 & sc
          : sc && typeof sc === "object" && (isMap || isList)
            ? sc[3 + sc[0]]
            : isDoc
              ? 15
              : undefined;
      if (memberSchema != null) return member([memberSchema, 0], isMap ? "value" : "member");
      throw Error(`@smithy/core/schema - ${this.getName(true)} has no value member.`);
    }
    getMemberSchema(memberName) {
      let struct = this.getSchema();
      if (this.isStructSchema() && struct[4].includes(memberName)) {
        let i = struct[4].indexOf(memberName);
        let memberSchema = struct[5][i];
        return member(isMemberSchema(memberSchema) ? memberSchema : [memberSchema, 0], memberName);
      }
      if (this.isDocumentSchema()) return member([15, 0], memberName);
      throw Error(`@smithy/core/schema - ${this.getName(true)} has no no member=${memberName}.`);
    }
    getMemberSchemas() {
      let buffer = {};
      try {
        for (let [k, v] of this.structIterator()) buffer[k] = v;
      } catch (ignored) {}
      return buffer;
    }
    getEventStreamMember() {
      if (this.isStructSchema()) {
        for (let [memberName, memberSchema] of this.structIterator())
          if (memberSchema.isStreaming() && memberSchema.isStructSchema()) return memberName;
      }
      return "";
    }
    *structIterator() {
      if (this.isUnitSchema()) return;
      if (!this.isStructSchema()) throw Error("@smithy/core/schema - cannot iterate non-struct schema.");
      let struct = this.getSchema();
      for (let i = 0; i < struct[4].length; ++i)
        yield [struct[4][i], member([struct[5][i], 0], struct[4][i])];
    }
  }
  function member(memberSchema, memberName) {
    if (memberSchema instanceof NormalizedSchema)
      return Object.assign(memberSchema, {
        memberName,
        _isMemberSchema: true,
      });
    return new NormalizedSchema(memberSchema, memberName);
  }
  var isMemberSchema = (sc) => Array.isArray(sc) && sc.length === 2;
  var isStaticSchema = (sc) => Array.isArray(sc) && sc.length >= 5;
  class SimpleSchema extends Schema {
    static symbol = Symbol.for("@smithy/sim");
    name;
    schemaRef;
    traits;
    symbol = SimpleSchema.symbol;
  }
  var sim = (namespace, name, schemaRef, traits) =>
    Schema.assign(new SimpleSchema(), {
      name,
      namespace,
      traits,
      schemaRef,
    });
  var simAdapter = (namespace, name, traits, schemaRef) =>
    Schema.assign(new SimpleSchema(), {
      name,
      namespace,
      traits,
      schemaRef,
    });
  var SCHEMA = {
    BLOB: 21,
    STREAMING_BLOB: 42,
    BOOLEAN: 2,
    STRING: 0,
    NUMERIC: 1,
    BIG_INTEGER: 17,
    BIG_DECIMAL: 19,
    DOCUMENT: 15,
    TIMESTAMP_DEFAULT: 4,
    TIMESTAMP_DATE_TIME: 5,
    TIMESTAMP_HTTP_DATE: 6,
    TIMESTAMP_EPOCH_SECONDS: 7,
    LIST_MODIFIER: 64,
    MAP_MODIFIER: 128,
  };
  class TypeRegistry {
    namespace;
    schemas;
    exceptions;
    static registries = new Map();
    constructor(namespace, schemas = new Map(), exceptions = new Map()) {
      this.namespace = namespace;
      this.schemas = schemas;
      this.exceptions = exceptions;
    }
    static for(namespace) {
      if (!TypeRegistry.registries.has(namespace))
        TypeRegistry.registries.set(namespace, new TypeRegistry(namespace));
      return TypeRegistry.registries.get(namespace);
    }
    register(shapeId, schema) {
      let qualifiedName = this.normalizeShapeId(shapeId);
      TypeRegistry.for(qualifiedName.split("#")[0]).schemas.set(qualifiedName, schema);
    }
    getSchema(shapeId) {
      let id = this.normalizeShapeId(shapeId);
      if (!this.schemas.has(id)) throw Error(`@smithy/core/schema - schema not found for ${id}`);
      return this.schemas.get(id);
    }
    registerError(es, ctor) {
      let $error = es;
      let r = TypeRegistry.for($error[1]);
      r.schemas.set($error[1] + "#" + $error[2], $error);
      r.exceptions.set($error, ctor);
    }
    getErrorCtor(e) {
      let $error = e;
      return TypeRegistry.for($error[1]).exceptions.get($error);
    }
    getBaseException() {
      for (let exceptionKey of this.exceptions.keys())
        if (Array.isArray(exceptionKey)) {
          let [, ns, name] = exceptionKey;
          let id = ns + "#" + name;
          if (id.startsWith("smithy.ts.sdk.synthetic.") && id.endsWith("ServiceException"))
            return exceptionKey;
        }
      return;
    }
    find(predicate) {
      return [...this.schemas.values()].find(predicate);
    }
    clear() {
      this.schemas.clear();
      this.exceptions.clear();
    }
    normalizeShapeId(shapeId) {
      if (shapeId.includes("#")) return shapeId;
      return this.namespace + "#" + shapeId;
    }
  }
  cjsExports.ErrorSchema = ErrorSchema;
  cjsExports.ListSchema = ListSchema;
  cjsExports.MapSchema = MapSchema;
  cjsExports.NormalizedSchema = NormalizedSchema;
  cjsExports.OperationSchema = OperationSchema;
  cjsExports.SCHEMA = SCHEMA;
  cjsExports.Schema = Schema;
  cjsExports.SimpleSchema = SimpleSchema;
  cjsExports.StructureSchema = StructureSchema;
  cjsExports.TypeRegistry = TypeRegistry;
  cjsExports.deref = deref;
  cjsExports.deserializerMiddlewareOption = deserializerMiddlewareOption;
  cjsExports.error = error;
  cjsExports.getSchemaSerdePlugin = getSchemaSerdePlugin;
  cjsExports.isStaticSchema = isStaticSchema;
  cjsExports.list = list;
  cjsExports.map = map;
  cjsExports.op = op;
  cjsExports.operation = operation;
  cjsExports.serializerMiddlewareOption = serializerMiddlewareOption;
  cjsExports.sim = sim;
  cjsExports.simAdapter = simAdapter;
  cjsExports.struct = struct;
  cjsExports.translateTraits = translateTraits;
});
export { require_schema };
