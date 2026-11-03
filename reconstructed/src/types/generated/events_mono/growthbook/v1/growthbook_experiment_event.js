/**
 * types/generated/events_mono/growthbook/v1/growthbook_experiment_event.ts
 *
 * protobuf 生成代码：GrowthbookExperimentEvent（实验曝光事件）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/types/generated/events_mono/growthbook/v1/growthbook_experiment_event.ts
 * pieces: chunk-aepeg2w5.js (5)
 * attribution: fingerprint 2, sole-consumer 3
 */
import { PublicApiAuth, PublicApiAuth_2 } from "../../common/v1/auth.js";
import { Timestamp } from "../../../google/protobuf/timestamp.js";

//@ chunk-aepeg2w5.js:679042-679380 fingerprint = createBaseGrowthbookExperimentEvent (0.815)
function createBaseGrowthbookExperimentEvent() {
  return {
    event_id: "",
    timestamp: undefined,
    experiment_id: "",
    variation_id: 0,
    variation_key: undefined,
    environment: "",
    user_attributes: undefined,
    experiment_metadata: undefined,
    device_id: "",
    auth: undefined,
    session_id: "",
    anonymous_id: "",
    event_metadata_vars: undefined,
    server_timestamp: undefined,
    client_reported_auth: undefined,
    request_id: undefined,
    prompt_id: undefined,
  };
}
//@ chunk-aepeg2w5.js:679380-682497 fingerprint = GrowthbookExperimentEvent (0.867)
var GrowthbookExperimentEvent = {
  fromJSON(object) {
    return {
      event_id: isPresent(object.event_id) ? globalThis.String(object.event_id) : "",
      timestamp: isPresent(object.timestamp) ? fromJsonTimestamp_2(object.timestamp) : undefined,
      experiment_id: isPresent(object.experiment_id) ? globalThis.String(object.experiment_id) : "",
      variation_id: isPresent(object.variation_id) ? globalThis.Number(object.variation_id) : 0,
      variation_key: isPresent(object.variation_key) ? globalThis.String(object.variation_key) : undefined,
      environment: isPresent(object.environment) ? globalThis.String(object.environment) : "",
      user_attributes: isPresent(object.user_attributes)
        ? globalThis.String(object.user_attributes)
        : undefined,
      experiment_metadata: isPresent(object.experiment_metadata)
        ? globalThis.String(object.experiment_metadata)
        : undefined,
      device_id: isPresent(object.device_id) ? globalThis.String(object.device_id) : "",
      auth: isPresent(object.auth) ? PublicApiAuth.fromJSON(object.auth) : undefined,
      session_id: isPresent(object.session_id) ? globalThis.String(object.session_id) : "",
      anonymous_id: isPresent(object.anonymous_id) ? globalThis.String(object.anonymous_id) : "",
      event_metadata_vars: isPresent(object.event_metadata_vars)
        ? globalThis.String(object.event_metadata_vars)
        : undefined,
      server_timestamp: isPresent(object.server_timestamp)
        ? fromJsonTimestamp_2(object.server_timestamp)
        : undefined,
      client_reported_auth: isPresent(object.client_reported_auth)
        ? PublicApiAuth_2.fromJSON(object.client_reported_auth)
        : undefined,
      request_id: isPresent(object.request_id) ? globalThis.String(object.request_id) : undefined,
      prompt_id: isPresent(object.prompt_id) ? globalThis.String(object.prompt_id) : undefined,
    };
  },
  toJSON(message) {
    let obj = {};
    if (message.event_id !== undefined) obj.event_id = message.event_id;
    if (message.timestamp !== undefined) obj.timestamp = message.timestamp.toISOString();
    if (message.experiment_id !== undefined) obj.experiment_id = message.experiment_id;
    if (message.variation_id !== undefined) obj.variation_id = Math.round(message.variation_id);
    if (message.variation_key !== undefined) obj.variation_key = message.variation_key;
    if (message.environment !== undefined) obj.environment = message.environment;
    if (message.user_attributes !== undefined) obj.user_attributes = message.user_attributes;
    if (message.experiment_metadata !== undefined) obj.experiment_metadata = message.experiment_metadata;
    if (message.device_id !== undefined) obj.device_id = message.device_id;
    if (message.auth !== undefined) obj.auth = PublicApiAuth.toJSON(message.auth);
    if (message.session_id !== undefined) obj.session_id = message.session_id;
    if (message.anonymous_id !== undefined) obj.anonymous_id = message.anonymous_id;
    if (message.event_metadata_vars !== undefined) obj.event_metadata_vars = message.event_metadata_vars;
    if (message.server_timestamp !== undefined) obj.server_timestamp = message.server_timestamp.toISOString();
    if (message.client_reported_auth !== undefined)
      obj.client_reported_auth = PublicApiAuth_2.toJSON(message.client_reported_auth);
    if (message.request_id !== undefined) obj.request_id = message.request_id;
    if (message.prompt_id !== undefined) obj.prompt_id = message.prompt_id;
    return obj;
  },
  create(base) {
    return GrowthbookExperimentEvent.fromPartial(base ?? {});
  },
  fromPartial(object) {
    let message = createBaseGrowthbookExperimentEvent();
    message.event_id = object.event_id ?? "";
    message.timestamp = object.timestamp ?? undefined;
    message.experiment_id = object.experiment_id ?? "";
    message.variation_id = object.variation_id ?? 0;
    message.variation_key = object.variation_key ?? undefined;
    message.environment = object.environment ?? "";
    message.user_attributes = object.user_attributes ?? undefined;
    message.experiment_metadata = object.experiment_metadata ?? undefined;
    message.device_id = object.device_id ?? "";
    message.auth =
      object.auth !== undefined && object.auth !== null ? PublicApiAuth.fromPartial(object.auth) : undefined;
    message.session_id = object.session_id ?? "";
    message.anonymous_id = object.anonymous_id ?? "";
    message.event_metadata_vars = object.event_metadata_vars ?? undefined;
    message.server_timestamp = object.server_timestamp ?? undefined;
    message.client_reported_auth =
      object.client_reported_auth !== undefined && object.client_reported_auth !== null
        ? PublicApiAuth_2.fromPartial(object.client_reported_auth)
        : undefined;
    message.request_id = object.request_id ?? undefined;
    message.prompt_id = object.prompt_id ?? undefined;
    return message;
  },
};
//@ chunk-aepeg2w5.js:682497-682588 sole-consumer = fromTimestamp (1)
function fromTimestamp_2(t) {
  let millis = (t.seconds || 0) * 1000;
  millis += (t.nanos || 0) / 1e6;
  return new globalThis.Date(millis);
}
//@ chunk-aepeg2w5.js:682588-682733 sole-consumer = fromJsonTimestamp (1)
function fromJsonTimestamp_2(o) {
  if (o instanceof globalThis.Date) return o;
  else if (typeof o === "string") return new globalThis.Date(o);
  else return fromTimestamp_2(Timestamp.fromJSON(o));
}
//@ chunk-aepeg2w5.js:682733-682776 sole-consumer
/**
 * 判断值既不是 null 也不是 undefined（protobuf 生成代码用）。
 */
function isPresent(e) {
  return e !== null && e !== undefined;
}
export { GrowthbookExperimentEvent };
