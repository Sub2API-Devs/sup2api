/**
 * @smithy/core/dist-cjs/submodules/event-streams/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-3cddmtk7.js (9), chunk-w1q1hkg4.js (4)
 * attribution: esm-fingerprint 7, esm-layout 6
 */
import { Readable } from "stream";
import { EventStreamCodec } from "../../../../eventstream-codec/dist-es/EventStreamCodec.js";
import {
  SmithyMessageDecoderStream,
  Q,
  MessageEncoderStream,
  SmithyMessageEncoderStream,
} from "../../../../eventstream-codec/dist-cjs/index.js";
import { Re, Xa } from "../../../../../../runtime/bun-runtime.js";
import { require_index_native } from "../config/index.native.js";
import { require_core } from "../../index.js";
import { require_schema } from "../schema/index.js";
import { EventStreamPayloadHandler } from "../../../../../@aws-sdk/eventstream-handler-node/dist-es/EventStreamPayloadHandler.js";
import { require_util_user_agent_node } from "../../../../../@aws-sdk/util-user-agent-node/dist-cjs/index.js";
import { require_util_utf8 } from "../../../../util-utf8/dist-cjs/index.js";

//@ chunk-3cddmtk7.js:11622-12369 esm-fingerprint
function getChunkedStream(body) {
  let currentMessageTotalLength = 0;
  let currentMessagePendingLength = 0;
  let currentMessage = null;
  let messageLengthBuffer = null;
  let allocateMessage = (size) => {
    if (typeof size !== "number")
      throw Error("Attempted to allocate an event message where size was not a number: " + size);
    currentMessageTotalLength = size;
    currentMessagePendingLength = 4;
    currentMessage = new Uint8Array(size);
    new DataView(currentMessage.buffer).setUint32(0, size, false);
  };
  let iterator = async function* () {
    let sourceIterator = body[Symbol.asyncIterator]();
    while (true) {
      let { value, done } = await sourceIterator.next();
      if (done) {
        if (!currentMessageTotalLength) return;
        else if (currentMessageTotalLength === currentMessagePendingLength) yield currentMessage;
        else throw Error("Truncated event message received.");
        return;
      }
      let chunkLength = value.length;
      let currentOffset = 0;
      while (currentOffset < chunkLength) {
        if (!currentMessage) {
          let bytesRemaining = chunkLength - currentOffset;
          if (!messageLengthBuffer) messageLengthBuffer = new Uint8Array(4);
          let numBytesForTotal = Math.min(4 - currentMessagePendingLength, bytesRemaining);
          messageLengthBuffer.set(
            value.slice(currentOffset, currentOffset + numBytesForTotal),
            currentMessagePendingLength,
          );
          currentMessagePendingLength += numBytesForTotal;
          currentOffset += numBytesForTotal;
          if (currentMessagePendingLength < 4) break;
          allocateMessage(new DataView(messageLengthBuffer.buffer).getUint32(0, false));
          messageLengthBuffer = null;
        }
        let numBytesToWrite = Math.min(
          currentMessageTotalLength - currentMessagePendingLength,
          chunkLength - currentOffset,
        );
        currentMessage.set(
          value.slice(currentOffset, currentOffset + numBytesToWrite),
          currentMessagePendingLength,
        );
        currentMessagePendingLength += numBytesToWrite;
        currentOffset += numBytesToWrite;
        if (currentMessageTotalLength && currentMessageTotalLength === currentMessagePendingLength) {
          yield currentMessage;
          currentMessage = null;
          currentMessageTotalLength = 0;
          currentMessagePendingLength = 0;
        }
      }
    }
  };
  return {
    [Symbol.asyncIterator]: iterator,
  };
}
//@ chunk-3cddmtk7.js:12369-12920 esm-fingerprint
function getMessageUnmarshaller(deserializer, utfEncoder) {
  return async function (message) {
    let { value: messageType } = message.headers[":message-type"];
    if (messageType === "error") {
      let unmodeledError = Error(message.headers[":error-message"].value || "UnknownError");
      unmodeledError.name = message.headers[":error-code"].value;
      throw unmodeledError;
    } else if (messageType === "exception") {
      let code = message.headers[":exception-type"].value;
      let exception = {
        [code]: message,
      };
      let deserializedException = await deserializer(exception);
      if (deserializedException.$unknown) {
        let error = Error(utfEncoder(message.body));
        error.name = code;
        throw error;
      }
      throw deserializedException[code];
    } else if (messageType === "event") {
      let event = {
        [message.headers[":event-type"].value]: message,
      };
      let deserialized = await deserializer(event);
      if (deserialized.$unknown) return;
      return deserialized;
    } else throw Error(`Unrecognizable event type: ${message.headers[":event-type"].value}`);
  };
}
//@ chunk-3cddmtk7.js:12920-13329 esm-fingerprint
class EventStreamMarshaller$1 {
  eventStreamCodec;
  utfEncoder;
  constructor({ utf8Encoder, utf8Decoder }) {
    this.eventStreamCodec = new EventStreamCodec(utf8Encoder, utf8Decoder);
    this.utfEncoder = utf8Encoder;
  }
  deserialize(body, deserializer) {
    let inputStream = getChunkedStream(body);
    return new SmithyMessageDecoderStream({
      messageStream: new Q({
        inputStream,
        decoder: this.eventStreamCodec,
      }),
      deserializer: getMessageUnmarshaller(deserializer, this.utfEncoder),
    });
  }
  serialize(inputStream, serializer) {
    return new MessageEncoderStream({
      messageStream: new SmithyMessageEncoderStream({
        inputStream,
        serializer,
      }),
      encoder: this.eventStreamCodec,
      includeEndFrame: true,
    });
  }
}
//@ chunk-3cddmtk7.js:13329-13368 esm-layout
var import_index_native = Re(require_index_native());
var import_core = Re(require_core());
var import_schema = Re(require_schema());
//@ chunk-3cddmtk7.js:13368-13451 esm-fingerprint
var ge = (input) =>
  Object.assign(input, {
    eventStreamMarshaller: input.eventStreamSerdeProvider(input),
  });
//@ chunk-3cddmtk7.js:19948-19970 esm-layout
var ne = (options) => new EventStreamPayloadHandler(options);
//@ chunk-3cddmtk7.js:19970-20009 esm-layout
var import_util_user_agent_node = Re(require_util_user_agent_node());
var import_index_native_2 = Re(require_index_native());
var import_core_5 = Re(require_core());
//@ chunk-3cddmtk7.js:20044-20285 esm-fingerprint
async function* Ie(readStream) {
  let streamEnded = false;
  let generationEnded = false;
  let records = [];
  readStream.on("error", (err) => {
    if (!streamEnded) streamEnded = true;
    if (err) throw err;
  });
  readStream.on("data", (data) => {
    records.push(data);
  });
  readStream.on("end", () => {
    streamEnded = true;
  });
  while (!generationEnded) {
    let value = await new Promise((resolve) => setTimeout(() => resolve(records.shift()), 0));
    if (value) yield value;
    generationEnded = streamEnded && records.length === 0;
  }
}
//@ chunk-3cddmtk7.js:20285-20617 esm-fingerprint
class Gur {
  universalMarshaller;
  constructor({ utf8Encoder, utf8Decoder }) {
    this.universalMarshaller = new EventStreamMarshaller$1({
      utf8Decoder,
      utf8Encoder,
    });
  }
  deserialize(readStream, t) {
    let o = typeof readStream[Symbol.asyncIterator] === "function" ? readStream : Ie(readStream);
    return this.universalMarshaller.deserialize(o, t);
  }
  serialize(e, t) {
    return Readable.from(this.universalMarshaller.serialize(e, t));
  }
}
//@ chunk-w1q1hkg4.js:263-3851 esm-fingerprint
class x {
  marshaller;
  serializer;
  deserializer;
  serdeContext;
  defaultContentType;
  constructor({ marshaller, serializer, deserializer, serdeContext, defaultContentType }) {
    this.marshaller = marshaller;
    this.serializer = serializer;
    this.deserializer = deserializer;
    this.serdeContext = serdeContext;
    this.defaultContentType = defaultContentType;
  }
  async serializeEventStream({ eventStream, requestSchema, initialRequest }) {
    let marshaller = this.marshaller;
    let eventStreamMember = requestSchema.getEventStreamMember();
    let unionSchema = requestSchema.getMemberSchema(eventStreamMember);
    let serializer = this.serializer;
    let defaultContentType = this.defaultContentType;
    let initialRequestMarker = Symbol("initialRequestMarker");
    let eventStreamIterable = {
      async *[Symbol.asyncIterator]() {
        if (initialRequest) {
          let headers = {
            ":event-type": {
              type: "string",
              value: "initial-request",
            },
            ":message-type": {
              type: "string",
              value: "event",
            },
            ":content-type": {
              type: "string",
              value: defaultContentType,
            },
          };
          serializer.write(requestSchema, initialRequest);
          let body = serializer.flush();
          yield {
            [initialRequestMarker]: true,
            headers,
            body,
          };
        }
        for await (let page of eventStream) yield page;
      },
    };
    return marshaller.serialize(eventStreamIterable, (event) => {
      if (event[initialRequestMarker])
        return {
          headers: event.headers,
          body: event.body,
        };
      let unionMember = Object.keys(event).find((key) => key !== "__type") ?? "";
      let { additionalHeaders, body, eventType, explicitPayloadContentType } = this.writeEventBody(
        unionMember,
        unionSchema,
        event,
      );
      return {
        headers: {
          ":event-type": {
            type: "string",
            value: eventType,
          },
          ":message-type": {
            type: "string",
            value: "event",
          },
          ":content-type": {
            type: "string",
            value: explicitPayloadContentType ?? defaultContentType,
          },
          ...additionalHeaders,
        },
        body,
      };
    });
  }
  async deserializeEventStream({ response, responseSchema, initialResponseContainer }) {
    let marshaller = this.marshaller;
    let eventStreamMember = responseSchema.getEventStreamMember();
    let memberSchemas = responseSchema.getMemberSchema(eventStreamMember).getMemberSchemas();
    let initialResponseMarker = Symbol("initialResponseMarker");
    let asyncIterable = marshaller.deserialize(response.body, async (event) => {
      let unionMember = Object.keys(event).find((key) => key !== "__type") ?? "";
      let body = event[unionMember].body;
      if (unionMember === "initial-response") {
        let dataObject = await this.deserializer.read(responseSchema, body);
        delete dataObject[eventStreamMember];
        return {
          [initialResponseMarker]: true,
          ...dataObject,
        };
      } else if (unionMember in memberSchemas) {
        let eventStreamSchema = memberSchemas[unionMember];
        if (eventStreamSchema.isStructSchema()) {
          let out = {};
          let hasBindings = false;
          for (let [name, member] of eventStreamSchema.structIterator()) {
            let { eventHeader, eventPayload } = member.getMergedTraits();
            hasBindings = hasBindings || Boolean(eventHeader || eventPayload);
            if (eventPayload) {
              if (member.isBlobSchema()) out[name] = body;
              else if (member.isStringSchema())
                out[name] = (this.serdeContext?.utf8Encoder ?? z.toUtf8)(body);
              else if (member.isStructSchema()) out[name] = await this.deserializer.read(member, body);
            } else if (eventHeader) {
              let value = event[unionMember].headers[name]?.value;
              if (value != null)
                if (member.isNumericSchema()) {
                  if (value && typeof value === "object" && "bytes" in value)
                    out[name] = BigInt(value.toString());
                  else out[name] = Number(value);
                } else out[name] = value;
            }
          }
          if (hasBindings)
            return {
              [unionMember]: out,
            };
        }
        return {
          [unionMember]: await this.deserializer.read(eventStreamSchema, body),
        };
      } else
        return {
          $unknown: event,
        };
    });
    let asyncIterator = asyncIterable[Symbol.asyncIterator]();
    let firstEvent = await asyncIterator.next();
    if (firstEvent.done) return asyncIterable;
    if (firstEvent.value?.[initialResponseMarker]) {
      if (!responseSchema)
        throw Error(
          "@smithy::core/protocols - initial-response event encountered in event stream but no response schema given.",
        );
      for (let [key, key_2] of Object.entries(firstEvent.value)) initialResponseContainer[key] = key_2;
    }
    return {
      async *[Symbol.asyncIterator]() {
        if (!firstEvent?.value?.[initialResponseMarker]) yield firstEvent.value;
        while (true) {
          let { done, value } = await asyncIterator.next();
          if (done) break;
          yield value;
        }
      },
    };
  }
  writeEventBody(unionMember, unionSchema, event) {
    let serializer = this.serializer;
    let eventType = unionMember;
    let explicitPayloadMember = null;
    let explicitPayloadContentType;
    let isKnownSchema = (() => unionSchema.getSchema()[4].includes(unionMember))();
    let additionalHeaders = {};
    if (!isKnownSchema) {
      let [type, value] = event[unionMember];
      eventType = type;
      serializer.write(15, value);
    } else {
      let eventSchema = unionSchema.getMemberSchema(unionMember);
      if (eventSchema.isStructSchema()) {
        for (let [memberName, memberSchema] of eventSchema.structIterator()) {
          let { eventHeader, eventPayload } = memberSchema.getMergedTraits();
          if (eventPayload) {
            explicitPayloadMember = memberName;
            break;
          } else if (eventHeader) {
            let value = event[unionMember][memberName];
            let type = "binary";
            if (memberSchema.isNumericSchema()) {
              if (-2147483648 <= value && value <= 2147483647) type = "integer";
              else type = "long";
            } else if (memberSchema.isTimestampSchema()) type = "timestamp";
            else if (memberSchema.isStringSchema()) type = "string";
            else if (memberSchema.isBooleanSchema()) type = "boolean";
            if (value != null) {
              additionalHeaders[memberName] = {
                type,
                value,
              };
              delete event[unionMember][memberName];
            }
          }
        }
        if (explicitPayloadMember !== null) {
          let payloadSchema = eventSchema.getMemberSchema(explicitPayloadMember);
          if (payloadSchema.isBlobSchema()) explicitPayloadContentType = "application/octet-stream";
          else if (payloadSchema.isStringSchema()) explicitPayloadContentType = "text/plain";
          serializer.write(payloadSchema, event[unionMember][explicitPayloadMember]);
        } else serializer.write(eventSchema, event[unionMember]);
      } else
        throw Error("@smithy/core/event-streams - non-struct member not supported in event stream union.");
    }
    let messageSerialization = serializer.flush();
    return {
      body:
        typeof messageSerialization === "string"
          ? (this.serdeContext?.utf8Decoder ?? z.fromUtf8)(messageSerialization)
          : messageSerialization,
      eventType,
      explicitPayloadContentType,
      additionalHeaders,
    };
  }
}
//@ chunk-w1q1hkg4.js:3851-3859 esm-layout
var z;
var E;
//@ chunk-w1q1hkg4.js:3859-3886 esm-layout
var init_event_streams = Xa(() => {
  z = require_util_utf8();
  E = x;
});
//@ chunk-w1q1hkg4.js:3886-3890 esm-layout
init_event_streams();
export {
  import_index_native,
  ge,
  import_schema,
  import_core,
  Gur,
  import_util_user_agent_node,
  ne,
  import_core_5,
  import_index_native_2,
};
