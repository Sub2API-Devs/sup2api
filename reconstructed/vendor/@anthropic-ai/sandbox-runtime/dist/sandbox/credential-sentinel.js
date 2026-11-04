/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/credential-sentinel.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (3)
 * attribution: esm-fingerprint 3
 */
import { randomUUID, randomBytes } from "crypto";

//@ chunk-fq0cr76a.js:705621-705686 esm-fingerprint
var SENTINEL_PREFIX = "fake_value_";
var SENTINEL_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789_-";
//@ chunk-fq0cr76a.js:705686-705819 esm-fingerprint
function mintSentinel(realValue) {
  let base = SENTINEL_PREFIX + randomUUID();
  let pad = Buffer.byteLength(realValue) - base.length;
  if (pad <= 0) return base;
  let out = base;
  for (let b of randomBytes(pad)) out += SENTINEL_ALPHABET[b % SENTINEL_ALPHABET.length];
  return out;
}
//@ chunk-fq0cr76a.js:705819-707338 esm-fingerprint
class SentinelRegistry {
  constructor() {
    this.byName = new Map();
    this.bySentinel = new Map();
    this.allSentinelsPrefixed = true;
  }
  register(name, realValue, injectHosts) {
    return this.registerWithSentinel(name, mintSentinel(realValue), realValue, injectHosts);
  }
  registerWithSentinel(name, sentinel, realValue, injectHosts) {
    let existing = this.byName.get(name);
    if (existing !== undefined) {
      existing.realValue = realValue;
      existing.injectHosts = injectHosts;
      return existing.sentinel;
    }
    if (!sentinel.startsWith(SENTINEL_PREFIX)) this.allSentinelsPrefixed = false;
    let entry = {
      name,
      sentinel,
      realValue,
      injectHosts,
    };
    this.byName.set(name, entry);
    this.bySentinel.set(sentinel, entry);
    return sentinel;
  }
  lookupReal(sentinel) {
    return this.bySentinel.get(sentinel)?.realValue;
  }
  namesInjectableAt(destHost, matches) {
    let names = [];
    for (let e of this.byName.values())
      if (e.injectHosts.some((p) => matches(destHost, p))) names.push(e.name);
    return names;
  }
  sentinelsForHost(destHost, matches) {
    let pairs = [];
    for (let e of this.bySentinel.values()) {
      if (!e.injectHosts.some((p) => matches(destHost, p))) continue;
      pairs.push({
        sentinel: Buffer.from(e.sentinel),
        realValue: Buffer.from(e.realValue),
      });
    }
    return pairs;
  }
  *entries() {
    for (let credential of this.bySentinel.values()) yield [credential.sentinel, credential.realValue];
  }
  get size() {
    return this.bySentinel.size;
  }
  clear() {
    this.byName.clear();
    this.bySentinel.clear();
    this.allSentinelsPrefixed = true;
  }
  substituteInHeaders(headers, destHost, matches) {
    if (this.bySentinel.size === 0) return;
    for (let [name, value] of Object.entries(headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value))
        for (let i = 0; i < value.length; i++)
          value[i] = this.substituteInString(value[i], destHost, matches);
      else headers[name] = this.substituteInString(value, destHost, matches);
    }
  }
  substituteInString(s_2, destHost, matches) {
    if (this.allSentinelsPrefixed && !s_2.includes(SENTINEL_PREFIX)) return s_2;
    let out = s_2;
    for (let e of this.bySentinel.values()) {
      if (!out.includes(e.sentinel)) continue;
      if (!e.injectHosts.some((p) => matches(destHost, p))) continue;
      out = out.split(e.sentinel).join(e.realValue);
    }
    return out;
  }
}
export { SentinelRegistry, SENTINEL_PREFIX };
