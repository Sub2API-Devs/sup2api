/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/credential-aws-pairs.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (5)
 * attribution: esm-fingerprint 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";
import {
  detectSigv4,
  parseSigv4Authorization,
  singleHeader,
  UNSIGNED_PAYLOAD,
  signSigv4,
} from "./aws-sigv4.js";

//@ chunk-qg41pqt6.js:716317-716394 esm-fingerprint
var AWS_ACCESS_KEY_ID_VAR = "AWS_ACCESS_KEY_ID";
var AWS_SECRET_ACCESS_KEY_VAR = "AWS_SECRET_ACCESS_KEY";
var AWS_SESSION_TOKEN_VAR = "AWS_SESSION_TOKEN";
//@ chunk-qg41pqt6.js:716394-716610 esm-fingerprint
class AwsPairRegistry {
  constructor() {
    this.bySentinel = new Map();
  }
  register(pair) {
    this.bySentinel.set(pair.accessKeyIdSentinel, pair);
  }
  lookup(accessKeyIdSentinel) {
    return this.bySentinel.get(accessKeyIdSentinel);
  }
  get size() {
    return this.bySentinel.size;
  }
  clear() {
    this.bySentinel.clear();
  }
}
//@ chunk-qg41pqt6.js:716610-718017 esm-fingerprint
function registerAwsPairs(envVars, awsPairs, allowedDomains, setEnvVars, registry, env = process.env) {
  let specs = [...(awsPairs ?? [])];
  let explicitNames = new Set(
    specs.flatMap((p) => [
      p.accessKeyIdVar,
      p.secretAccessKeyVar,
      ...(p.sessionTokenVar ? [p.sessionTokenVar] : []),
    ]),
  );
  if (
    ![AWS_ACCESS_KEY_ID_VAR, AWS_SECRET_ACCESS_KEY_VAR, AWS_SESSION_TOKEN_VAR].some((n) =>
      explicitNames.has(n),
    )
  )
    specs.push({
      accessKeyIdVar: AWS_ACCESS_KEY_ID_VAR,
      secretAccessKeyVar: AWS_SECRET_ACCESS_KEY_VAR,
      sessionTokenVar: AWS_SESSION_TOKEN_VAR,
    });
  let wholeValueEntry = (name) =>
    envVars.find(
      (v) => v.name === name && v.mode === "mask" && v.extract === undefined && v.decode === undefined,
    );
  let maskedSentinel = (name) => (wholeValueEntry(name) !== undefined ? setEnvVars[name] : undefined);
  for (let spec of specs) {
    let akidSentinel = maskedSentinel(spec.accessKeyIdVar);
    let secretMasked = maskedSentinel(spec.secretAccessKeyVar) !== undefined;
    let realAkid = env[spec.accessKeyIdVar];
    let realSecret = env[spec.secretAccessKeyVar];
    if (akidSentinel === undefined || !secretMasked || realAkid === undefined || realSecret === undefined) {
      if (secretMasked && akidSentinel === undefined) {
        let msg =
          `[sandbox-runtime] WARNING: "${spec.secretAccessKeyVar}" is masked but "${spec.accessKeyIdVar}" is not, so no AWS credential pair was registered. SigV4 requests will be signed with the masked placeholder secret and the proxy cannot ` +
          "detect or re-sign them \u2014 they will fail upstream. Mask both " +
          "variables (whole-value) to enable re-signing.";
        console.warn(msg);
        logForDebugging_2(msg, {
          level: "warn",
        });
      }
      continue;
    }
    let akidEntry = wholeValueEntry(spec.accessKeyIdVar);
    let realSessionToken =
      (spec.sessionTokenVar !== undefined ? maskedSentinel(spec.sessionTokenVar) : undefined) !== undefined &&
      spec.sessionTokenVar !== undefined
        ? env[spec.sessionTokenVar]
        : undefined;
    registry.register({
      accessKeyIdSentinel: akidSentinel,
      realAccessKeyId: realAkid,
      realSecretAccessKey: realSecret,
      ...(realSessionToken !== undefined
        ? {
            realSessionToken,
          }
        : {}),
      injectHosts: akidEntry.injectHosts ?? allowedDomains,
    });
    logForDebugging_2(
      `[credential-aws] registered SigV4 pair for ${spec.accessKeyIdVar}/${spec.secretAccessKeyVar}` +
        (realSessionToken !== undefined ? " (+session token)" : ""),
    );
  }
}
//@ chunk-qg41pqt6.js:718017-718127 esm-fingerprint
function resolveSigv4Policies(config) {
  return {
    streaming: config?.streaming ?? "deny",
    presigned: config?.presigned ?? "deny",
    sigv4a: config?.sigv4a ?? "deny",
  };
}
//@ chunk-qg41pqt6.js:718127-720142 esm-fingerprint
function createSigv4Planner(registry, config, matches) {
  let policies = resolveSigv4Policies(config);
  return (method, requestTarget, headers, destHost) => {
    if (registry.size === 0) return;
    let detected = detectSigv4(headers, requestTarget);
    if (detected === null) return;
    let pair = registry.lookup(detected.accessKeyId);
    if (pair === undefined) return;
    if (!pair.injectHosts.some((p) => matches(destHost, p))) return;
    if (detected.kind !== "header-sigv4") {
      if (policies[detected.kind] === "passthrough") {
        logForDebugging_2(
          `[credential-aws] ${detected.kind} request with masked credential passed through un-resigned per credentials.sigv4.${detected.kind} (its signature covers the placeholder secret and will fail upstream)`,
        );
        return;
      }
      return {
        action: "deny",
        reason: `AWS SigV4 ${detected.kind} request uses a masked credential but cannot be re-signed by the sandbox proxy; denied by policy. Set credentials.sigv4.${detected.kind} to "passthrough" to forward it unmodified (it will fail upstream: the signature covers the masked placeholder).`,
      };
    }
    let auth = parseSigv4Authorization(singleHeader(headers.authorization));
    if (auth === null)
      return {
        action: "deny",
        reason:
          "AWS SigV4 request uses a masked credential but its Authorization header is malformed; the proxy cannot re-sign it.",
      };
    let amzDate = singleHeader(headers["x-amz-date"]);
    if (amzDate === undefined)
      return {
        action: "deny",
        reason:
          "AWS SigV4 request uses a masked credential but carries no x-amz-date header; the proxy cannot re-sign it.",
      };
    let signedHeaders = [...auth.signedHeaders];
    for (let name of signedHeaders) {
      if (name === "host") continue;
      if (name === "x-amz-security-token" && pair.realSessionToken !== undefined) continue;
      if (headers[name] === undefined)
        return {
          action: "deny",
          reason: `AWS SigV4 request uses a masked credential but signed header "${name}" is missing; the proxy cannot re-sign it.`,
        };
    }
    if (pair.realSessionToken !== undefined && !signedHeaders.includes("x-amz-security-token"))
      signedHeaders.push("x-amz-security-token");
    let contentSha = singleHeader(headers["x-amz-content-sha256"]);
    return {
      action: "resign",
      payloadHash: contentSha === UNSIGNED_PAYLOAD ? UNSIGNED_PAYLOAD : undefined,
      apply(fwdHeaders, hostHeader, payloadHash) {
        if (pair.realSessionToken !== undefined) fwdHeaders["x-amz-security-token"] = pair.realSessionToken;
        if (fwdHeaders["x-amz-content-sha256"] !== undefined && contentSha !== UNSIGNED_PAYLOAD)
          fwdHeaders["x-amz-content-sha256"] = payloadHash;
        let { authorization } = signSigv4({
          method,
          requestTarget,
          headers: fwdHeaders,
          hostHeader,
          signedHeaders,
          payloadHash,
          amzDate,
          scope: {
            date: auth.date,
            region: auth.region,
            service: auth.service,
          },
          accessKeyId: pair.realAccessKeyId,
          secretAccessKey: pair.realSecretAccessKey,
        });
        fwdHeaders.authorization = authorization;
      },
    };
  };
}
export { AwsPairRegistry, createSigv4Planner, registerAwsPairs };
