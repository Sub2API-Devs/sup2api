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
    timestamp: void 0,
    experiment_id: "",
    variation_id: 0,
    variation_key: void 0,
    environment: "",
    user_attributes: void 0,
    experiment_metadata: void 0,
    device_id: "",
    auth: void 0,
    session_id: "",
    anonymous_id: "",
    event_metadata_vars: void 0,
    server_timestamp: void 0,
    client_reported_auth: void 0,
    request_id: void 0,
    prompt_id: void 0,
  };
}
//@ chunk-aepeg2w5.js:679380-682497 fingerprint = GrowthbookExperimentEvent (0.867)
var GrowthbookExperimentEvent = {
  fromJSON(e) {
    return {
      event_id: pt(e.event_id) ? globalThis.String(e.event_id) : "",
      timestamp: pt(e.timestamp) ? fromJsonTimestamp_2(e.timestamp) : void 0,
      experiment_id: pt(e.experiment_id) ? globalThis.String(e.experiment_id) : "",
      variation_id: pt(e.variation_id) ? globalThis.Number(e.variation_id) : 0,
      variation_key: pt(e.variation_key) ? globalThis.String(e.variation_key) : void 0,
      environment: pt(e.environment) ? globalThis.String(e.environment) : "",
      user_attributes: pt(e.user_attributes) ? globalThis.String(e.user_attributes) : void 0,
      experiment_metadata: pt(e.experiment_metadata) ? globalThis.String(e.experiment_metadata) : void 0,
      device_id: pt(e.device_id) ? globalThis.String(e.device_id) : "",
      auth: pt(e.auth) ? PublicApiAuth.fromJSON(e.auth) : void 0,
      session_id: pt(e.session_id) ? globalThis.String(e.session_id) : "",
      anonymous_id: pt(e.anonymous_id) ? globalThis.String(e.anonymous_id) : "",
      event_metadata_vars: pt(e.event_metadata_vars) ? globalThis.String(e.event_metadata_vars) : void 0,
      server_timestamp: pt(e.server_timestamp) ? fromJsonTimestamp_2(e.server_timestamp) : void 0,
      client_reported_auth: pt(e.client_reported_auth)
        ? PublicApiAuth_2.fromJSON(e.client_reported_auth)
        : void 0,
      request_id: pt(e.request_id) ? globalThis.String(e.request_id) : void 0,
      prompt_id: pt(e.prompt_id) ? globalThis.String(e.prompt_id) : void 0,
    };
  },
  toJSON(e) {
    let n = {};
    if (e.event_id !== void 0) n.event_id = e.event_id;
    if (e.timestamp !== void 0) n.timestamp = e.timestamp.toISOString();
    if (e.experiment_id !== void 0) n.experiment_id = e.experiment_id;
    if (e.variation_id !== void 0) n.variation_id = Math.round(e.variation_id);
    if (e.variation_key !== void 0) n.variation_key = e.variation_key;
    if (e.environment !== void 0) n.environment = e.environment;
    if (e.user_attributes !== void 0) n.user_attributes = e.user_attributes;
    if (e.experiment_metadata !== void 0) n.experiment_metadata = e.experiment_metadata;
    if (e.device_id !== void 0) n.device_id = e.device_id;
    if (e.auth !== void 0) n.auth = PublicApiAuth.toJSON(e.auth);
    if (e.session_id !== void 0) n.session_id = e.session_id;
    if (e.anonymous_id !== void 0) n.anonymous_id = e.anonymous_id;
    if (e.event_metadata_vars !== void 0) n.event_metadata_vars = e.event_metadata_vars;
    if (e.server_timestamp !== void 0) n.server_timestamp = e.server_timestamp.toISOString();
    if (e.client_reported_auth !== void 0)
      n.client_reported_auth = PublicApiAuth_2.toJSON(e.client_reported_auth);
    if (e.request_id !== void 0) n.request_id = e.request_id;
    if (e.prompt_id !== void 0) n.prompt_id = e.prompt_id;
    return n;
  },
  create(e) {
    return GrowthbookExperimentEvent.fromPartial(e ?? {});
  },
  fromPartial(e) {
    let n = createBaseGrowthbookExperimentEvent();
    return (
      (n.event_id = e.event_id ?? ""),
      (n.timestamp = e.timestamp ?? void 0),
      (n.experiment_id = e.experiment_id ?? ""),
      (n.variation_id = e.variation_id ?? 0),
      (n.variation_key = e.variation_key ?? void 0),
      (n.environment = e.environment ?? ""),
      (n.user_attributes = e.user_attributes ?? void 0),
      (n.experiment_metadata = e.experiment_metadata ?? void 0),
      (n.device_id = e.device_id ?? ""),
      (n.auth = e.auth !== void 0 && e.auth !== null ? PublicApiAuth.fromPartial(e.auth) : void 0),
      (n.session_id = e.session_id ?? ""),
      (n.anonymous_id = e.anonymous_id ?? ""),
      (n.event_metadata_vars = e.event_metadata_vars ?? void 0),
      (n.server_timestamp = e.server_timestamp ?? void 0),
      (n.client_reported_auth =
        e.client_reported_auth !== void 0 && e.client_reported_auth !== null
          ? PublicApiAuth_2.fromPartial(e.client_reported_auth)
          : void 0),
      (n.request_id = e.request_id ?? void 0),
      (n.prompt_id = e.prompt_id ?? void 0),
      n
    );
  },
};
//@ chunk-aepeg2w5.js:682497-682588 sole-consumer = fromTimestamp (1)
function fromTimestamp_2(t) {
  let millis = (t.seconds || 0) * 1000;
  return ((millis += (t.nanos || 0) / 1e6), new globalThis.Date(millis));
}
//@ chunk-aepeg2w5.js:682588-682733 sole-consumer = fromJsonTimestamp (1)
function fromJsonTimestamp_2(o) {
  if (o instanceof globalThis.Date) return o;
  else if (typeof o === "string") return new globalThis.Date(o);
  else return fromTimestamp_2(Timestamp.fromJSON(o));
}
//@ chunk-aepeg2w5.js:682733-682776 sole-consumer
function pt(e) {
  return e !== null && e !== void 0;
}

export { GrowthbookExperimentEvent };
