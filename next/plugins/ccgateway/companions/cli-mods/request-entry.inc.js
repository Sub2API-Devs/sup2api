// Inserted by patch-cli-2.1.304.cjs into the hash-bound entry function (cli.js
// Ve), ahead of its ordinary command handling, as written. e is Ve's argument
// list and s the settings source it gives CC's fast-path policy. The patcher
// replaces the info placeholder below with the profile's version, patch and
// capabilities. Modules load on demand, so an ordinary CLI start is unchanged.
if (e[0] === "--ccgateway-info") { console.log(JSON.stringify(CCGATEWAY_INFO)); return }
if (e[0] === "request") {
  // CC's own fast-path policy decides first; a refusal is a 403 error frame.
  let { loadFastPathPolicy: policy } = await import("./chunk-3nrrbnwj.js");
  if (await policy(s)) {
    let { encodeErrorFrame: ccgErrorFrame, policyDeniedFrame: ccgDenied } = await import("./ccgateway-request-error.js");
    process.stderr.write(ccgErrorFrame(ccgDenied()));
    process.exitCode = 1;
    return
  }
  let { runRequestCommand: run } = await import("./ccgateway-request-command.js");
  let { gTe: oauthAuth } = await import("./chunk-4qs43hr1.js");
  let { applyBuildMetadata: ccgBuildMetadata, applyBuildCliPrefix: ccgPrefixBuild } = await import("./ccgateway-request-identity.js");
  let { yBe: ccgNativeMetadata, t1n: ccgIsPrefix, n1n: ccgPrefix, PAs: ccgHead } = await import("./chunk-t61vswm2.js");
  let { B1s: ccgIsBilling, oJe: ccgHeader } = await import("./chunk-7y2kvacy.js");
  // The first user prompt, as CC's attribution fingerprint (RIs) reads it
  // (fingerprintMessages) and as its text (request-input.js), past CC's
  // reminder blocks (KF).
  let { fingerprintMessages: ccgPromptRecords, firstPromptText: ccgPromptText } = await import("./ccgateway-request-input.js");
  let { KF: ccgReminder } = await import("./chunk-jkcb7qdd.js");
  let { RIs: ccgFingerprint } = await import("./chunk-2gh4h0fv.js");
  let { Al: ccgMainAgent } = await import("./chunk-7p6jp6kj.js");
  // Direct's header is the native main-thread header (PAs, which reads the
  // attribution project itself) over the native fingerprint of the first user
  // prompt, as build computes it, with a main-thread prompt's ID and turn
  // (request-command.js).
  let ccgDirect = async (raw, body, o) => {
    let { applyDirectBilling: apply } = await import("./ccgateway-direct-billing.js");
    return apply(raw, body, { ...o, billingHeader: ccgHeader, nativeBilling: () => ccgHead([], void 0, {
      fingerprint: ccgFingerprint(ccgPromptRecords(Array.isArray(body.messages) ? body.messages : [], ccgReminder)),
      agentContext: o.agentContext ?? ccgMainAgent(), promptId: o.promptId, turnOrigin: o.turnOrigin, turnPosition: o.turnPosition })[0] ?? "" })
  };
  // The client's kind of request is chosen from CC's own query source naming
  // (Zoe), billing header (oJe), prompt fingerprint text and turn, and the
  // client loop header names (request-agent.js).
  let { Zoe: ccgQuerySource } = await import("./chunk-m5q1b1c4.js");
  let { createBillingPolicy: ccgBillingFor } = await import("./ccgateway-content-policy.js");
  let { ccgatewayLayerVocabulary: ccgLayers, ccgatewayPromptTurn: ccgTurnOf, ccgatewayBetaOrder: ccgBetaOrder } = await import("./chunk-rncrmfyt.js");
  let ccgBilling = ccgBillingFor(ccgHeader);
  let ccgAgent = { querySourceFor: ccgQuerySource, loopHeaders: ccgLayers().loopHeaders,
    requestBilling: system => ccgBilling.requestBilling(system), leadingBilling: system => ccgBilling.leadingBilling(system),
    entrypoint: (system, requestPolicy) => ccgBilling.requestEntrypoint(system, requestPolicy),
    prompt: messages => ccgPromptText(messages, ccgReminder), turn: ccgTurnOf };
  // The identity lines are CC's own three (n1n): interactive, and
  // non-interactive with and without an appended prompt.
  process.exit(await run(e.slice(1), { oauthBeta: oauthAuth.header, betaOrder: ccgBetaOrder,
    identityBuild: (b, m) => ccgBuildMetadata(b, m, ccgNativeMetadata),
    prefixBuild: (b, c) => ccgPrefixBuild(b, c, {
      official_cli: ccgPrefix({ isNonInteractive: !1, hasAppendSystemPrompt: !1 }),
      official_cli_sdk: ccgPrefix({ isNonInteractive: !0, hasAppendSystemPrompt: !0 }),
      agent_sdk: ccgPrefix({ isNonInteractive: !0, hasAppendSystemPrompt: !1 }) }, ccgIsPrefix, ccgIsBilling),
    directBuild: ccgDirect, agentNative: ccgAgent }))
}
