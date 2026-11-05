/**
 * @smithy/core/dist-cjs/submodules/protocols/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-1fkvp0h1.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_util_stream } from "../../../../util-stream/dist-cjs/index.js";
import { require_schema } from "../schema/index.js";
import { require_serde } from "../serde/index.js";
import { require_protocol_http } from "../../../../protocol-http/dist-cjs/index.js";
import { base64Module } from "../../../../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";
import { require_util_utf8 } from "../../../../util-utf8/dist-cjs/index.js";

//@ chunk-1fkvp0h1.js:35068-49122 cjs-fingerprint
var require_protocols = __commonJS(function (cjsExports) {
  var Uint8ArrayBlobAdapter = require_util_stream();
  var NormalizedSchema = require_schema();
  var serde = require_serde();
  var HttpRequest = require_protocol_http();
  var base64 = base64Module();
  var toUtf8 = require_util_utf8();
  var collectBody = async (streamBody = new Uint8Array(), context) => {
    if (streamBody instanceof Uint8Array)
      return Uint8ArrayBlobAdapter.Uint8ArrayBlobAdapter.mutate(streamBody);
    if (!streamBody) return Uint8ArrayBlobAdapter.Uint8ArrayBlobAdapter.mutate(new Uint8Array());
    let fromContext = context.streamCollector(streamBody);
    return Uint8ArrayBlobAdapter.Uint8ArrayBlobAdapter.mutate(await fromContext);
  };
  function extendedEncodeURIComponent(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
      return "%" + c.charCodeAt(0).toString(16).toUpperCase();
    });
  }
  class SerdeContext {
    serdeContext;
    setSerdeContext(serdeContext) {
      this.serdeContext = serdeContext;
    }
  }
  class HttpProtocol extends SerdeContext {
    options;
    constructor(options) {
      super();
      this.options = options;
    }
    getRequestType() {
      return HttpRequest.HttpRequest;
    }
    getResponseType() {
      return HttpRequest.HttpResponse;
    }
    setSerdeContext(serdeContext) {
      this.serdeContext = serdeContext;
      this.serializer.setSerdeContext(serdeContext);
      this.deserializer.setSerdeContext(serdeContext);
      if (this.getPayloadCodec()) this.getPayloadCodec().setSerdeContext(serdeContext);
    }
    updateServiceEndpoint(request, endpoint) {
      if ("url" in endpoint) {
        request.protocol = endpoint.url.protocol;
        request.hostname = endpoint.url.hostname;
        request.port = endpoint.url.port ? Number(endpoint.url.port) : undefined;
        request.path = endpoint.url.pathname;
        request.fragment = endpoint.url.hash || undefined;
        request.username = endpoint.url.username || undefined;
        request.password = endpoint.url.password || undefined;
        if (!request.query) request.query = {};
        for (let [k, v] of endpoint.url.searchParams.entries()) request.query[k] = v;
        return request;
      } else {
        request.protocol = endpoint.protocol;
        request.hostname = endpoint.hostname;
        request.port = endpoint.port ? Number(endpoint.port) : undefined;
        request.path = endpoint.path;
        request.query = {
          ...endpoint.query,
        };
        return request;
      }
    }
    setHostPrefix(request, operationSchema, input) {
      let inputNs = NormalizedSchema.NormalizedSchema.of(operationSchema.input);
      let opTraits = NormalizedSchema.translateTraits(operationSchema.traits ?? {});
      if (opTraits.endpoint) {
        let hostPrefix = opTraits.endpoint?.[0];
        if (typeof hostPrefix === "string") {
          let filtered = [...inputNs.structIterator()].filter(
            ([, memberSchema]) => memberSchema.getMergedTraits().hostLabel,
          );
          for (let [memberName] of filtered) {
            let replacement = input[memberName];
            if (typeof replacement !== "string")
              throw Error(`@smithy/core/schema - ${memberName} in input must be a string as hostLabel.`);
            hostPrefix = hostPrefix.replace(`{${memberName}}`, replacement);
          }
          request.hostname = hostPrefix + request.hostname;
        }
      }
    }
    deserializeMetadata(output) {
      return {
        httpStatusCode: output.statusCode,
        requestId:
          output.headers["x-amzn-requestid"] ??
          output.headers["x-amzn-request-id"] ??
          output.headers["x-amz-request-id"],
        extendedRequestId: output.headers["x-amz-id-2"],
        cfId: output.headers["x-amz-cf-id"],
      };
    }
    async serializeEventStream({ eventStream, requestSchema, initialRequest }) {
      return (await this.loadEventStreamCapability()).serializeEventStream({
        eventStream,
        requestSchema,
        initialRequest,
      });
    }
    async deserializeEventStream({ response, responseSchema, initialResponseContainer }) {
      return (await this.loadEventStreamCapability()).deserializeEventStream({
        response,
        responseSchema,
        initialResponseContainer,
      });
    }
    async loadEventStreamCapability() {
      let { EventStreamSerde } = await import("../event-streams/EventStreamSerde.lazy.js");
      return new EventStreamSerde({
        marshaller: this.getEventStreamMarshaller(),
        serializer: this.serializer,
        deserializer: this.deserializer,
        serdeContext: this.serdeContext,
        defaultContentType: this.getDefaultContentType(),
      });
    }
    getDefaultContentType() {
      throw Error(
        `@smithy/core/protocols - ${this.constructor.name} getDefaultContentType() implementation missing.`,
      );
    }
    async deserializeHttpMessage(schema, context, response, arg4, arg5) {
      return [];
    }
    getEventStreamMarshaller() {
      let context = this.serdeContext;
      if (!context.eventStreamMarshaller)
        throw Error("@smithy/core - HttpProtocol: eventStreamMarshaller missing in serdeContext.");
      return context.eventStreamMarshaller;
    }
  }
  class HttpBindingProtocol extends HttpProtocol {
    async serializeRequest(operationSchema, _input, context) {
      let input = {
        ...(_input ?? {}),
      };
      let serializer = this.serializer;
      let query = {};
      let headers = {};
      let endpoint = await context.endpoint();
      let ns = NormalizedSchema.NormalizedSchema.of(operationSchema?.input);
      let schema = ns.getSchema();
      let hasNonHttpBindingMember = false;
      let payload;
      let request = new HttpRequest.HttpRequest({
        protocol: "",
        hostname: "",
        port: undefined,
        path: "",
        fragment: undefined,
        query,
        headers,
        body: undefined,
      });
      if (endpoint) {
        this.updateServiceEndpoint(request, endpoint);
        this.setHostPrefix(request, operationSchema, input);
        let opTraits = NormalizedSchema.translateTraits(operationSchema.traits);
        if (opTraits.http) {
          request.method = opTraits.http[0];
          let [path, search] = opTraits.http[1].split("?");
          if (request.path == "/") request.path = path;
          else request.path += path;
          let uRLSearchParams = new URLSearchParams(search ?? "");
          Object.assign(query, Object.fromEntries(uRLSearchParams));
        }
      }
      for (let [memberName, memberNs] of ns.structIterator()) {
        let memberTraits = memberNs.getMergedTraits() ?? {};
        let inputMemberValue = input[memberName];
        if (inputMemberValue == null && !memberNs.isIdempotencyToken()) continue;
        if (memberTraits.httpPayload) {
          if (memberNs.isStreaming()) {
            if (memberNs.isStructSchema()) {
              if (input[memberName])
                payload = await this.serializeEventStream({
                  eventStream: input[memberName],
                  requestSchema: ns,
                });
            } else payload = inputMemberValue;
          } else {
            serializer.write(memberNs, inputMemberValue);
            payload = serializer.flush();
          }
          delete input[memberName];
        } else if (memberTraits.httpLabel) {
          serializer.write(memberNs, inputMemberValue);
          let replacement = serializer.flush();
          if (request.path.includes(`{${memberName}+}`))
            request.path = request.path.replace(
              `{${memberName}+}`,
              replacement.split("/").map(extendedEncodeURIComponent).join("/"),
            );
          else if (request.path.includes(`{${memberName}}`))
            request.path = request.path.replace(`{${memberName}}`, extendedEncodeURIComponent(replacement));
          delete input[memberName];
        } else if (memberTraits.httpHeader) {
          serializer.write(memberNs, inputMemberValue);
          headers[memberTraits.httpHeader.toLowerCase()] = String(serializer.flush());
          delete input[memberName];
        } else if (typeof memberTraits.httpPrefixHeaders === "string") {
          for (let [key, value] of Object.entries(inputMemberValue)) {
            let amalgam = memberTraits.httpPrefixHeaders + key;
            serializer.write(
              [
                memberNs.getValueSchema(),
                {
                  httpHeader: amalgam,
                },
              ],
              value,
            );
            headers[amalgam.toLowerCase()] = serializer.flush();
          }
          delete input[memberName];
        } else if (memberTraits.httpQuery || memberTraits.httpQueryParams) {
          this.serializeQuery(memberNs, inputMemberValue, query);
          delete input[memberName];
        } else hasNonHttpBindingMember = true;
      }
      if (hasNonHttpBindingMember && input) {
        serializer.write(schema, input);
        payload = serializer.flush();
      }
      request.headers = headers;
      request.query = query;
      request.body = payload;
      return request;
    }
    serializeQuery(ns, data, query) {
      let serializer = this.serializer;
      let traits = ns.getMergedTraits();
      if (traits.httpQueryParams) {
        for (let [key, value] of Object.entries(data))
          if (!(key in query)) {
            let valueSchema = ns.getValueSchema();
            Object.assign(valueSchema.getMergedTraits(), {
              ...traits,
              httpQuery: key,
              httpQueryParams: undefined,
            });
            this.serializeQuery(valueSchema, value, query);
          }
        return;
      }
      if (ns.isListSchema()) {
        let sparse = !!ns.getMergedTraits().sparse;
        let buffer = [];
        for (let item of data) {
          serializer.write([ns.getValueSchema(), traits], item);
          let serializable = serializer.flush();
          if (sparse || serializable !== undefined) buffer.push(serializable);
        }
        query[traits.httpQuery] = buffer;
      } else {
        serializer.write([ns, traits], data);
        query[traits.httpQuery] = serializer.flush();
      }
    }
    async deserializeResponse(operationSchema, context, response) {
      let deserializer = this.deserializer;
      let ns = NormalizedSchema.NormalizedSchema.of(operationSchema.output);
      let dataObject = {};
      if (response.statusCode >= 300) {
        let bytes = await collectBody(response.body, context);
        if (bytes.byteLength > 0) Object.assign(dataObject, await deserializer.read(15, bytes));
        await this.handleError(
          operationSchema,
          context,
          response,
          dataObject,
          this.deserializeMetadata(response),
        );
        throw Error("@smithy/core/protocols - HTTP Protocol error handler failed to throw.");
      }
      for (let header in response.headers) {
        let value = response.headers[header];
        delete response.headers[header];
        response.headers[header.toLowerCase()] = value;
      }
      let nonHttpBindingMembers = await this.deserializeHttpMessage(ns, context, response, dataObject);
      if (nonHttpBindingMembers.length) {
        let bytes = await collectBody(response.body, context);
        if (bytes.byteLength > 0) {
          let deserialized = await deserializer.read(ns, bytes);
          for (let member of nonHttpBindingMembers) dataObject[member] = deserialized[member];
        }
      } else if (nonHttpBindingMembers.discardResponseBody) await collectBody(response.body, context);
      dataObject.$metadata = this.deserializeMetadata(response);
      return dataObject;
    }
    async deserializeHttpMessage(schema, context, response, arg4, arg5) {
      let dataObject;
      if (arg4 instanceof Set) dataObject = arg5;
      else dataObject = arg4;
      let discardResponseBody = true;
      let deserializer = this.deserializer;
      let ns = NormalizedSchema.NormalizedSchema.of(schema);
      let nonHttpBindingMembers = [];
      for (let [memberName, memberSchema] of ns.structIterator()) {
        let memberTraits = memberSchema.getMemberTraits();
        if (memberTraits.httpPayload) {
          discardResponseBody = false;
          if (memberSchema.isStreaming()) {
            if (memberSchema.isStructSchema())
              dataObject[memberName] = await this.deserializeEventStream({
                response,
                responseSchema: ns,
              });
            else dataObject[memberName] = Uint8ArrayBlobAdapter.sdkStreamMixin(response.body);
          } else if (response.body) {
            let bytes = await collectBody(response.body, context);
            if (bytes.byteLength > 0) dataObject[memberName] = await deserializer.read(memberSchema, bytes);
          }
        } else if (memberTraits.httpHeader) {
          let key = String(memberTraits.httpHeader).toLowerCase();
          let value = response.headers[key];
          if (value != null)
            if (memberSchema.isListSchema()) {
              let headerListValueSchema = memberSchema.getValueSchema();
              headerListValueSchema.getMergedTraits().httpHeader = key;
              let sections;
              if (headerListValueSchema.isTimestampSchema() && headerListValueSchema.getSchema() === 4)
                sections = serde.splitEvery(value, ",", 2);
              else sections = serde.splitHeader(value);
              let list = [];
              for (let section of sections)
                list.push(await deserializer.read(headerListValueSchema, section.trim()));
              dataObject[memberName] = list;
            } else dataObject[memberName] = await deserializer.read(memberSchema, value);
        } else if (memberTraits.httpPrefixHeaders !== undefined) {
          dataObject[memberName] = {};
          for (let [header, value] of Object.entries(response.headers))
            if (header.startsWith(memberTraits.httpPrefixHeaders)) {
              let valueSchema = memberSchema.getValueSchema();
              valueSchema.getMergedTraits().httpHeader = header;
              dataObject[memberName][header.slice(memberTraits.httpPrefixHeaders.length)] =
                await deserializer.read(valueSchema, value);
            }
        } else if (memberTraits.httpResponseCode) dataObject[memberName] = response.statusCode;
        else nonHttpBindingMembers.push(memberName);
      }
      nonHttpBindingMembers.discardResponseBody = discardResponseBody;
      return nonHttpBindingMembers;
    }
  }
  class RpcProtocol extends HttpProtocol {
    async serializeRequest(operationSchema, input, context) {
      let serializer = this.serializer;
      let query = {};
      let headers = {};
      let endpoint = await context.endpoint();
      let ns = NormalizedSchema.NormalizedSchema.of(operationSchema?.input);
      let schema = ns.getSchema();
      let payload;
      let request = new HttpRequest.HttpRequest({
        protocol: "",
        hostname: "",
        port: undefined,
        path: "/",
        fragment: undefined,
        query,
        headers,
        body: undefined,
      });
      if (endpoint) {
        this.updateServiceEndpoint(request, endpoint);
        this.setHostPrefix(request, operationSchema, input);
      }
      let input_2 = {
        ...input,
      };
      if (input) {
        let eventStreamMember = ns.getEventStreamMember();
        if (eventStreamMember) {
          if (input_2[eventStreamMember]) {
            let initialRequest = {};
            for (let [memberName, memberSchema] of ns.structIterator())
              if (memberName !== eventStreamMember && input_2[memberName]) {
                serializer.write(memberSchema, input_2[memberName]);
                initialRequest[memberName] = serializer.flush();
              }
            payload = await this.serializeEventStream({
              eventStream: input_2[eventStreamMember],
              requestSchema: ns,
              initialRequest,
            });
          }
        } else {
          serializer.write(schema, input_2);
          payload = serializer.flush();
        }
      }
      request.headers = headers;
      request.query = query;
      request.body = payload;
      request.method = "POST";
      return request;
    }
    async deserializeResponse(operationSchema, context, response) {
      let deserializer = this.deserializer;
      let ns = NormalizedSchema.NormalizedSchema.of(operationSchema.output);
      let dataObject = {};
      if (response.statusCode >= 300) {
        let bytes = await collectBody(response.body, context);
        if (bytes.byteLength > 0) Object.assign(dataObject, await deserializer.read(15, bytes));
        await this.handleError(
          operationSchema,
          context,
          response,
          dataObject,
          this.deserializeMetadata(response),
        );
        throw Error("@smithy/core/protocols - RPC Protocol error handler failed to throw.");
      }
      for (let header in response.headers) {
        let value = response.headers[header];
        delete response.headers[header];
        response.headers[header.toLowerCase()] = value;
      }
      let eventStreamMember = ns.getEventStreamMember();
      if (eventStreamMember)
        dataObject[eventStreamMember] = await this.deserializeEventStream({
          response,
          responseSchema: ns,
          initialResponseContainer: dataObject,
        });
      else {
        let bytes = await collectBody(response.body, context);
        if (bytes.byteLength > 0) Object.assign(dataObject, await deserializer.read(ns, bytes));
      }
      dataObject.$metadata = this.deserializeMetadata(response);
      return dataObject;
    }
  }
  var resolvedPath = (resolvedPath, input, memberName, labelValueProvider, uriLabel, isGreedyLabel) => {
    if (input != null && input[memberName] !== undefined) {
      let labelValue = labelValueProvider();
      if (labelValue.length <= 0)
        throw Error("Empty value provided for input HTTP label: " + memberName + ".");
      resolvedPath = resolvedPath.replace(
        uriLabel,
        isGreedyLabel
          ? labelValue
              .split("/")
              .map((segment) => extendedEncodeURIComponent(segment))
              .join("/")
          : extendedEncodeURIComponent(labelValue),
      );
    } else throw Error("No value provided for input HTTP label: " + memberName + ".");
    return resolvedPath;
  };
  function requestBuilder(input, context) {
    return new RequestBuilder(input, context);
  }
  class RequestBuilder {
    input;
    context;
    query = {};
    method = "";
    headers = {};
    path = "";
    body = null;
    hostname = "";
    resolvePathStack = [];
    constructor(input, context) {
      this.input = input;
      this.context = context;
    }
    async build() {
      let { hostname, protocol = "https", port, path: basePath } = await this.context.endpoint();
      this.path = basePath;
      for (let resolvePath of this.resolvePathStack) resolvePath(this.path);
      return new HttpRequest.HttpRequest({
        protocol,
        hostname: this.hostname || hostname,
        port,
        method: this.method,
        path: this.path,
        query: this.query,
        body: this.body,
        headers: this.headers,
      });
    }
    hn(hostname) {
      this.hostname = hostname;
      return this;
    }
    bp(uriLabel) {
      this.resolvePathStack.push((basePath) => {
        this.path = `${basePath?.endsWith("/") ? basePath.slice(0, -1) : basePath || ""}` + uriLabel;
      });
      return this;
    }
    p(memberName, labelValueProvider, uriLabel, isGreedyLabel) {
      this.resolvePathStack.push((path) => {
        this.path = resolvedPath(path, this.input, memberName, labelValueProvider, uriLabel, isGreedyLabel);
      });
      return this;
    }
    h(headers) {
      this.headers = headers;
      return this;
    }
    q(query) {
      this.query = query;
      return this;
    }
    b(body) {
      this.body = body;
      return this;
    }
    m(method) {
      this.method = method;
      return this;
    }
  }
  function determineTimestampFormat(ns, settings) {
    if (settings.timestampFormat.useTrait) {
      if (ns.isTimestampSchema() && (ns.getSchema() === 5 || ns.getSchema() === 6 || ns.getSchema() === 7))
        return ns.getSchema();
    }
    let { httpLabel, httpPrefixHeaders, httpHeader, httpQuery } = ns.getMergedTraits();
    return (
      (settings.httpBindings
        ? typeof httpPrefixHeaders === "string" || Boolean(httpHeader)
          ? 6
          : Boolean(httpQuery) || Boolean(httpLabel)
            ? 5
            : undefined
        : undefined) ?? settings.timestampFormat.default
    );
  }
  class FromStringShapeDeserializer extends SerdeContext {
    settings;
    constructor(settings) {
      super();
      this.settings = settings;
    }
    read(_schema, data) {
      let ns = NormalizedSchema.NormalizedSchema.of(_schema);
      if (ns.isListSchema())
        return serde.splitHeader(data).map((item) => this.read(ns.getValueSchema(), item));
      if (ns.isBlobSchema()) return (this.serdeContext?.base64Decoder ?? base64.fromBase64)(data);
      if (ns.isTimestampSchema())
        switch (determineTimestampFormat(ns, this.settings)) {
          case 5:
            return serde._parseRfc3339DateTimeWithOffset(data);
          case 6:
            return serde._parseRfc7231DateTime(data);
          case 7:
            return serde._parseEpochTimestamp(data);
          default:
            console.warn("Missing timestamp format, parsing value with Date constructor:", data);
            return new Date(data);
        }
      if (ns.isStringSchema()) {
        let mediaType = ns.getMergedTraits().mediaType;
        let intermediateValue = data;
        if (mediaType) {
          if (ns.getMergedTraits().httpHeader) intermediateValue = this.base64ToUtf8(intermediateValue);
          if (mediaType === "application/json" || mediaType.endsWith("+json"))
            intermediateValue = serde.LazyJsonString.from(intermediateValue);
          return intermediateValue;
        }
      }
      if (ns.isNumericSchema()) return Number(data);
      if (ns.isBigIntegerSchema()) return BigInt(data);
      if (ns.isBigDecimalSchema()) return new serde.NumericValue(data, "bigDecimal");
      if (ns.isBooleanSchema()) return String(data).toLowerCase() === "true";
      return data;
    }
    base64ToUtf8(base64String) {
      return (this.serdeContext?.utf8Encoder ?? toUtf8.toUtf8)(
        (this.serdeContext?.base64Decoder ?? base64.fromBase64)(base64String),
      );
    }
  }
  class HttpInterceptingShapeDeserializer extends SerdeContext {
    codecDeserializer;
    stringDeserializer;
    constructor(codecDeserializer, codecSettings) {
      super();
      this.codecDeserializer = codecDeserializer;
      this.stringDeserializer = new FromStringShapeDeserializer(codecSettings);
    }
    setSerdeContext(serdeContext) {
      this.stringDeserializer.setSerdeContext(serdeContext);
      this.codecDeserializer.setSerdeContext(serdeContext);
      this.serdeContext = serdeContext;
    }
    read(schema, data) {
      let ns = NormalizedSchema.NormalizedSchema.of(schema);
      let traits = ns.getMergedTraits();
      let toString = this.serdeContext?.utf8Encoder ?? toUtf8.toUtf8;
      if (traits.httpHeader || traits.httpResponseCode)
        return this.stringDeserializer.read(ns, toString(data));
      if (traits.httpPayload) {
        if (ns.isBlobSchema()) {
          let toBytes = this.serdeContext?.utf8Decoder ?? toUtf8.fromUtf8;
          if (typeof data === "string") return toBytes(data);
          return data;
        } else if (ns.isStringSchema()) {
          if ("byteLength" in data) return toString(data);
          return data;
        }
      }
      return this.codecDeserializer.read(ns, data);
    }
  }
  class ToStringShapeSerializer extends SerdeContext {
    settings;
    stringBuffer = "";
    constructor(settings) {
      super();
      this.settings = settings;
    }
    write(schema, value) {
      let ns = NormalizedSchema.NormalizedSchema.of(schema);
      switch (typeof value) {
        case "object":
          if (value === null) {
            this.stringBuffer = "null";
            return;
          }
          if (ns.isTimestampSchema()) {
            if (!(value instanceof Date))
              throw Error(
                `@smithy/core/protocols - received non-Date value ${value} when schema expected Date in ${ns.getName(true)}`,
              );
            switch (determineTimestampFormat(ns, this.settings)) {
              case 5:
                this.stringBuffer = value.toISOString().replace(".000Z", "Z");
                break;
              case 6:
                this.stringBuffer = serde.dateToUtcString(value);
                break;
              case 7:
                this.stringBuffer = String(value.getTime() / 1000);
                break;
              default:
                console.warn("Missing timestamp format, using epoch seconds", value);
                this.stringBuffer = String(value.getTime() / 1000);
            }
            return;
          }
          if (ns.isBlobSchema() && "byteLength" in value) {
            this.stringBuffer = (this.serdeContext?.base64Encoder ?? base64.toBase64)(value);
            return;
          }
          if (ns.isListSchema() && Array.isArray(value)) {
            let buffer = "";
            for (let item of value) {
              this.write([ns.getValueSchema(), ns.getMergedTraits()], item);
              let headerItem = this.flush();
              let serialized = ns.getValueSchema().isTimestampSchema()
                ? headerItem
                : serde.quoteHeader(headerItem);
              if (buffer !== "") buffer += ", ";
              buffer += serialized;
            }
            this.stringBuffer = buffer;
            return;
          }
          this.stringBuffer = JSON.stringify(value, null, 2);
          break;
        case "string":
          let mediaType = ns.getMergedTraits().mediaType;
          let intermediateValue = value;
          if (mediaType) {
            if (mediaType === "application/json" || mediaType.endsWith("+json"))
              intermediateValue = serde.LazyJsonString.from(intermediateValue);
            if (ns.getMergedTraits().httpHeader) {
              this.stringBuffer = (this.serdeContext?.base64Encoder ?? base64.toBase64)(
                intermediateValue.toString(),
              );
              return;
            }
          }
          this.stringBuffer = value;
          break;
        default:
          if (ns.isIdempotencyToken()) this.stringBuffer = serde.generateIdempotencyToken();
          else this.stringBuffer = String(value);
      }
    }
    flush() {
      let buffer = this.stringBuffer;
      this.stringBuffer = "";
      return buffer;
    }
  }
  class HttpInterceptingShapeSerializer {
    codecSerializer;
    stringSerializer;
    buffer;
    constructor(
      codecSerializer,
      codecSettings,
      stringSerializer = new ToStringShapeSerializer(codecSettings),
    ) {
      this.codecSerializer = codecSerializer;
      this.stringSerializer = stringSerializer;
    }
    setSerdeContext(serdeContext) {
      this.codecSerializer.setSerdeContext(serdeContext);
      this.stringSerializer.setSerdeContext(serdeContext);
    }
    write(schema, value) {
      let ns = NormalizedSchema.NormalizedSchema.of(schema);
      let traits = ns.getMergedTraits();
      if (traits.httpHeader || traits.httpLabel || traits.httpQuery) {
        this.stringSerializer.write(ns, value);
        this.buffer = this.stringSerializer.flush();
        return;
      }
      return this.codecSerializer.write(ns, value);
    }
    flush() {
      if (this.buffer !== undefined) {
        let buffer = this.buffer;
        this.buffer = undefined;
        return buffer;
      }
      return this.codecSerializer.flush();
    }
  }
  cjsExports.FromStringShapeDeserializer = FromStringShapeDeserializer;
  cjsExports.HttpBindingProtocol = HttpBindingProtocol;
  cjsExports.HttpInterceptingShapeDeserializer = HttpInterceptingShapeDeserializer;
  cjsExports.HttpInterceptingShapeSerializer = HttpInterceptingShapeSerializer;
  cjsExports.HttpProtocol = HttpProtocol;
  cjsExports.RequestBuilder = RequestBuilder;
  cjsExports.RpcProtocol = RpcProtocol;
  cjsExports.SerdeContext = SerdeContext;
  cjsExports.ToStringShapeSerializer = ToStringShapeSerializer;
  cjsExports.collectBody = collectBody;
  cjsExports.determineTimestampFormat = determineTimestampFormat;
  cjsExports.extendedEncodeURIComponent = extendedEncodeURIComponent;
  cjsExports.requestBuilder = requestBuilder;
  cjsExports.resolvedPath = resolvedPath;
});
export { require_protocols };
