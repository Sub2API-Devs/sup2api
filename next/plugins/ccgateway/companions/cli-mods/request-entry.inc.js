// Inserted by patch-cli-2.1.304.cjs into the hash-bound entry function (cli.js
// Ve), ahead of its ordinary command handling, as written. e is Ve's argument
// list and s the settings source it gives CC's fast-path policy. The patcher
// replaces the info placeholder below with the profile's version, patch and
// capabilities.
if (e[0] === "--ccgateway-info") { console.log(JSON.stringify(CCGATEWAY_INFO)); return }
if (e[0] === "request") {
  // CC's own fast-path policy decides first; a refusal is a 403 error frame.
  let { loadFastPathPolicy: policy } = await import("./chunk-3nrrbnwj.js");
  let refusal = await policy(s);
  if (refusal) {
    let { encodeErrorFrame: errFrame } = await import("./ccgateway-request-error.js");
    process.stderr.write(errFrame({ protocol: "ccgateway.request.error.v1", source: "input", status: 403, error: { type: "permission_error", code: "cli_policy_denied", message: "CC policy denied this request" } }));
    process.exitCode = 1;
    return
  }
  let { runRequestCommand: run } = await import("./ccgateway-request-command.js");
  let { gTe: oauthAuth } = await import("./chunk-4qs43hr1.js");
  let { applyBuildMetadata: ccgBuildMetadata, applyBuildCliPrefix: ccgPrefixBuild } = await import("./ccgateway-request-identity.js");
  let { yBe: ccgNativeMetadata, t1n: ccgIsPrefix, n1n: ccgPrefix, PAs: ccgHead } = await import("./chunk-t61vswm2.js");
  let { B1s: ccgIsBilling, oJe: ccgHeader } = await import("./chunk-7y2kvacy.js");
  // Direct's header is the native main-thread header (PAs, which reads the
  // attribution project itself) over the native fingerprint (RIs) of the first
  // user prompt, as build computes it (fingerprintMessages), with a main-thread
  // prompt's ID and turn (request-command.js).
  let ccgDirect = async (raw, body, o) => {
    let { applyDirectBilling: apply } = await import("./ccgateway-direct-billing.js");
    let { fingerprintMessages: prompt } = await import("./ccgateway-request-input.js");
    let { RIs: fingerprint } = await import("./chunk-2gh4h0fv.js");
    let { KF: reminder } = await import("./chunk-jkcb7qdd.js");
    let { Al: agent } = await import("./chunk-7p6jp6kj.js");
    return apply(raw, body, { ...o, billingHeader: ccgHeader, nativeBilling: () => ccgHead([], void 0, {
      fingerprint: fingerprint(prompt(Array.isArray(body.messages) ? body.messages : [], reminder)),
      agentContext: o.agentContext ?? agent(), promptId: o.promptId, turnOrigin: o.turnOrigin, turnPosition: o.turnPosition })[0] ?? "" })
  };
  // The client's kind of request is chosen from CC's own query source naming
  // (Zoe), billing header (oJe), prompt fingerprint text and turn, and the
  // client loop header names (request-agent.js).
  let { Zoe: ccgQuerySource } = await import("./chunk-m5q1b1c4.js");
  let { createBillingPolicy: ccgBillingFor } = await import("./ccgateway-content-policy.js");
  let { fingerprintMessages: ccgPromptOf } = await import("./ccgateway-request-input.js");
  let { KF: ccgReminder } = await import("./chunk-jkcb7qdd.js");
  let { ccgatewayLayerVocabulary: ccgLayers, ccgatewayPromptTurn: ccgTurnOf } = await import("./chunk-rncrmfyt.js");
  let ccgBilling = ccgBillingFor(ccgHeader);
  let ccgAgent = { querySourceFor: ccgQuerySource, loopHeaders: ccgLayers().loopHeaders,
    requestBilling: s => ccgBilling.requestBilling(s), leadingBilling: s => ccgBilling.leadingBilling(s),
    entrypoint: (s, p) => ccgBilling.requestEntrypoint(s, p),
    prompt: m => ccgPromptOf(m, ccgReminder)[0].message.content, turn: ccgTurnOf };
  // The identity lines are CC's own three (n1n): interactive, and
  // non-interactive with and without an appended prompt.
  process.exit(await run(e.slice(1), { oauthBeta: oauthAuth.header,
    identityBuild: (b, m) => ccgBuildMetadata(b, m, ccgNativeMetadata),
    prefixBuild: (b, c) => ccgPrefixBuild(b, c, {
      official_cli: ccgPrefix({ isNonInteractive: !1, hasAppendSystemPrompt: !1 }),
      official_cli_sdk: ccgPrefix({ isNonInteractive: !0, hasAppendSystemPrompt: !0 }),
      agent_sdk: ccgPrefix({ isNonInteractive: !0, hasAppendSystemPrompt: !1 }) }, ccgIsPrefix, ccgIsBilling),
    directBuild: ccgDirect, agentNative: ccgAgent }))
}
