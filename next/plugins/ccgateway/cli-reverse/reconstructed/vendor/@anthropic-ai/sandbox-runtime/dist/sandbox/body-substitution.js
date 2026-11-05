/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/body-substitution.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (4)
 * attribution: esm-fingerprint 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { Transform } from "stream";
import { BODYLESS_METHODS } from "./request-filter.js";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";

//@ chunk-qg41pqt6.js:664686-664761 esm-fingerprint
function allLengthMatched(pairs) {
  return pairs.every((p) => p.sentinel.length === p.realValue.length);
}
//@ chunk-qg41pqt6.js:664761-665297 esm-fingerprint
function prepareBodySubstitution(getBodySubstitutions, req, fwdHeaders, destHost) {
  if (getBodySubstitutions === undefined) return;
  let declaresBody =
    req.headers["content-length"] !== undefined || req.headers["transfer-encoding"] !== undefined;
  if (BODYLESS_METHODS.has(req.method ?? "GET") && !declaresBody) return;
  let pairs = getBodySubstitutions(destHost);
  if (!pairs?.length) return;
  if (req.headers["content-encoding"] !== undefined) {
    logForDebugging_2(
      `[body-substitution] ${destHost}: request body has Content-Encoding "${String(req.headers["content-encoding"])}"; masked-credential ` +
        "substitution skipped \u2014 a sentinel in this body reaches the " +
        "upstream as the fake value",
      {
        level: "warn",
      },
    );
    return;
  }
  if (!allLengthMatched(pairs)) delete fwdHeaders["content-length"];
  return createBodySubstitutionTransform(pairs);
}
//@ chunk-qg41pqt6.js:665297-665553 esm-fingerprint
function createBodySubstitutionTransform(pairs) {
  let maxLen = Math.max(...pairs.map((p) => p.sentinel.length));
  let carry;
  return new Transform({
    transform(chunk, encoding, callback) {
      let buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
      let work = carry?.length ? Buffer.concat([carry, buf]) : buf;
      let { out, tail } = substitute(work, pairs, maxLen);
      carry = tail;
      callback(null, out);
    },
    flush(callback) {
      callback(null, carry?.length ? carry : undefined);
    },
  });
}
//@ chunk-qg41pqt6.js:665553-665880 esm-fingerprint
function substitute(work, pairs, maxLen) {
  let parts = [];
  let pos = 0;
  for (;;) {
    let matchIdx = -1;
    let matchPair;
    for (let p of pairs) {
      let i = work.indexOf(p.sentinel, pos);
      if (i !== -1 && (matchIdx === -1 || i < matchIdx)) {
        matchIdx = i;
        matchPair = p;
      }
    }
    if (matchPair === undefined) break;
    parts.push(work.subarray(pos, matchIdx), matchPair.realValue);
    pos = matchIdx + matchPair.sentinel.length;
  }
  let tailStart = Math.max(pos, work.length - (maxLen - 1));
  parts.push(work.subarray(pos, tailStart));
  return {
    out: Buffer.concat(parts),
    tail: Buffer.from(work.subarray(tailStart)),
  };
}
export { prepareBodySubstitution };
