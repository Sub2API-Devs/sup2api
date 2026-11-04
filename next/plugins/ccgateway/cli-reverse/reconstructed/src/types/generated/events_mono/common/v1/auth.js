/**
 * types/generated/events_mono/common/v1/auth.ts
 *
 * protobuf 生成代码：PublicApiAuth（account_id、organization_uuid、account_uuid）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/types/generated/events_mono/common/v1/auth.ts
 * pieces: chunk-aepeg2w5.js (5)
 * attribution: fingerprint 2, layout 2, callgraph-witnessed 1
 */

//@ chunk-aepeg2w5.js:660599-660671 fingerprint = createBasePublicApiAuth (1)
function createBasePublicApiAuth() {
  return {
    account_id: 0,
    organization_uuid: "",
    account_uuid: "",
  };
}
//@ chunk-aepeg2w5.js:660671-661320 fingerprint = PublicApiAuth (1)
var PublicApiAuth = {
  fromJSON(object) {
    return {
      account_id: isSet(object.account_id) ? globalThis.Number(object.account_id) : 0,
      organization_uuid: isSet(object.organization_uuid) ? globalThis.String(object.organization_uuid) : "",
      account_uuid: isSet(object.account_uuid) ? globalThis.String(object.account_uuid) : "",
    };
  },
  toJSON(message) {
    let obj = {};
    if (message.account_id !== undefined) obj.account_id = Math.round(message.account_id);
    if (message.organization_uuid !== undefined) obj.organization_uuid = message.organization_uuid;
    if (message.account_uuid !== undefined) obj.account_uuid = message.account_uuid;
    return obj;
  },
  create(base) {
    return PublicApiAuth.fromPartial(base ?? {});
  },
  fromPartial(object) {
    let message = createBasePublicApiAuth();
    message.account_id = object.account_id ?? 0;
    message.organization_uuid = object.organization_uuid ?? "";
    message.account_uuid = object.account_uuid ?? "";
    return message;
  },
};
//@ chunk-aepeg2w5.js:661320-661387 layout = createBasePublicApiAuth (0.771)
function createBasePublicApiAuth_2() {
  return {
    account_uuid: undefined,
    organization_uuid: undefined,
  };
}
//@ chunk-aepeg2w5.js:661387-661898 layout = PublicApiAuth (0.837)
var PublicApiAuth_2 = {
  fromJSON(object) {
    return {
      account_uuid: isSet(object.account_uuid) ? globalThis.String(object.account_uuid) : undefined,
      organization_uuid: isSet(object.organization_uuid)
        ? globalThis.String(object.organization_uuid)
        : undefined,
    };
  },
  toJSON(message) {
    let obj = {};
    if (message.account_uuid !== undefined) obj.account_uuid = message.account_uuid;
    if (message.organization_uuid !== undefined) obj.organization_uuid = message.organization_uuid;
    return obj;
  },
  create(base) {
    return PublicApiAuth_2.fromPartial(base ?? {});
  },
  fromPartial(object) {
    let message = createBasePublicApiAuth_2();
    message.account_uuid = object.account_uuid ?? undefined;
    message.organization_uuid = object.organization_uuid ?? undefined;
    return message;
  },
};
//@ chunk-aepeg2w5.js:661898-661941 callgraph-witnessed = isSet (0)
function isSet(value) {
  return value !== null && value !== undefined;
}
export { PublicApiAuth, PublicApiAuth_2 };
