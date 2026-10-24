// The native bindings a request is built on, read once from the modules the
// patch hash-binds: the request identity (yBe), the billing header (oJe, B1s),
// the login's beta (gTe), the attribution fingerprint (RIs), the query source
// naming (Zoe) and the layer vocabulary, composed here with the support modules
// that use them. The request command imports this module; the patched entry
// only loads the command.
import { gTe as oauthAuth } from './chunk-4qs43hr1.js';
import { yBe as nativeIdentity, PAs as attributionHeader } from './chunk-t61vswm2.js';
import { oJe as billingHeader } from './chunk-7y2kvacy.js';
import { KF as reminderOpen } from './chunk-jkcb7qdd.js';
import { RIs as attributionFingerprint } from './chunk-2gh4h0fv.js';
import { Al as mainAgentContext } from './chunk-7p6jp6kj.js';
import { Zoe as querySourceFor } from './chunk-m5q1b1c4.js';
import { ccgatewayLayerVocabulary, ccgatewayPromptTurn } from './chunk-rncrmfyt.js';
import { applyBuildMetadata } from './ccgateway-request-identity.js';
import { applyDirectBilling } from './ccgateway-direct-billing.js';
import { createBillingPolicy } from './ccgateway-content-policy.js';
import { fingerprintMessages, firstPromptText } from './ccgateway-request-input.js';

// The login's beta: an API key is not a login, so request-headers.js drops it
// from an API-key request's header.
export const oauthBeta = oauthAuth.header;

const billing = createBillingPolicy(billingHeader);

// identityBuild owns build's metadata: the native builder's own identity is
// used only where the client's follows it (request-identity.js).
export const identityBuild = (built, clientMetadata) => applyBuildMetadata(built, clientMetadata, nativeIdentity);

// directBuild fills direct's billing header (direct-billing.js) with the
// native header CC generates for this request (PAs), over the client's first
// prompt as CC's attribution fingerprint reads it (RIs).
export const directBuild = (raw, body, options) => applyDirectBilling(raw, body, {
  ...options, billingHeader,
  nativeBilling: () => attributionHeader([], void 0, {
    fingerprint: attributionFingerprint(fingerprintMessages(Array.isArray(body.messages) ? body.messages : [], reminderOpen)),
    agentContext: options.agentContext ?? mainAgentContext(), promptId: options.promptId,
    turnOrigin: options.turnOrigin, turnPosition: options.turnPosition,
  })[0] ?? '',
});

// agentNative is the client's kind of request as CC names it: the query source
// naming, the client loop header names, the billing header's kind, the first
// prompt and its turn.
export const agentNative = {
  querySourceFor,
  loopHeaders: ccgatewayLayerVocabulary().loopHeaders,
  requestBilling: system => billing.requestBilling(system),
  leadingBilling: system => billing.leadingBilling(system),
  entrypoint: (system, requestPolicy) => billing.requestEntrypoint(system, requestPolicy),
  prompt: messages => firstPromptText(messages, reminderOpen),
  turn: ccgatewayPromptTurn,
};
