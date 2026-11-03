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
  return { account_id: 0, organization_uuid: "", account_uuid: "" };
}
//@ chunk-aepeg2w5.js:660671-661320 fingerprint = PublicApiAuth (1)
var PublicApiAuth = {
  fromJSON(e) {
    return {
      account_id: isSet(e.account_id) ? globalThis.Number(e.account_id) : 0,
      organization_uuid: isSet(e.organization_uuid) ? globalThis.String(e.organization_uuid) : "",
      account_uuid: isSet(e.account_uuid) ? globalThis.String(e.account_uuid) : "",
    };
  },
  toJSON(e) {
    let n = {};
    if (e.account_id !== void 0) n.account_id = Math.round(e.account_id);
    if (e.organization_uuid !== void 0) n.organization_uuid = e.organization_uuid;
    if (e.account_uuid !== void 0) n.account_uuid = e.account_uuid;
    return n;
  },
  create(e) {
    return PublicApiAuth.fromPartial(e ?? {});
  },
  fromPartial(e) {
    let n = createBasePublicApiAuth();
    return (
      (n.account_id = e.account_id ?? 0),
      (n.organization_uuid = e.organization_uuid ?? ""),
      (n.account_uuid = e.account_uuid ?? ""),
      n
    );
  },
};
//@ chunk-aepeg2w5.js:661320-661387 layout = createBasePublicApiAuth (0.771)
function createBasePublicApiAuth_2() {
  return { account_uuid: void 0, organization_uuid: void 0 };
}
//@ chunk-aepeg2w5.js:661387-661898 layout = PublicApiAuth (0.837)
var PublicApiAuth_2 = {
  fromJSON(e) {
    return {
      account_uuid: isSet(e.account_uuid) ? globalThis.String(e.account_uuid) : void 0,
      organization_uuid: isSet(e.organization_uuid) ? globalThis.String(e.organization_uuid) : void 0,
    };
  },
  toJSON(e) {
    let n = {};
    if (e.account_uuid !== void 0) n.account_uuid = e.account_uuid;
    if (e.organization_uuid !== void 0) n.organization_uuid = e.organization_uuid;
    return n;
  },
  create(e) {
    return PublicApiAuth_2.fromPartial(e ?? {});
  },
  fromPartial(e) {
    let n = createBasePublicApiAuth_2();
    return (
      (n.account_uuid = e.account_uuid ?? void 0),
      (n.organization_uuid = e.organization_uuid ?? void 0),
      n
    );
  },
};
//@ chunk-aepeg2w5.js:661898-661941 callgraph-witnessed = isSet (0)
function isSet(value) {
  return value !== null && value !== void 0;
}

export { PublicApiAuth, PublicApiAuth_2 };
