/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-violation-store.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (8)
 * attribution: esm-fingerprint 6, esm-layout 2
 */
import { encodeSandboxedCommand, SANDBOXED_COMMAND_KEY_LENGTH } from "./sandbox-utils.js";

//@ chunk-fq0cr76a.js:653509-654298 esm-fingerprint
class SandboxViolationStore {
  constructor() {
    this.violations = [];
    this.totalCount = 0;
    this.maxSize = 100;
    this.listeners = new Set();
  }
  addViolation(violation) {
    this.violations.push({
      ...violation,
      line: sanitizeViolationText(violation.line),
    });
    this.totalCount++;
    if (this.violations.length > this.maxSize) this.violations = this.violations.slice(-this.maxSize);
    this.notifyListeners();
  }
  getViolations(limit) {
    if (limit === undefined) return [...this.violations];
    return this.violations.slice(-limit);
  }
  getCount() {
    return this.violations.length;
  }
  getTotalCount() {
    return this.totalCount;
  }
  getViolationsForCommand(command) {
    let commandBase64 = encodeSandboxedCommand(command);
    return this.violations.filter((v) => v.encodedCommand === commandBase64);
  }
  clear() {
    this.violations = [];
    this.notifyListeners();
  }
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getViolations());
    return () => {
      this.listeners.delete(listener);
    };
  }
  notifyListeners() {
    let violations = this.getViolations();
    this.listeners.forEach((listener) => listener(violations));
  }
}
//@ chunk-fq0cr76a.js:654298-654510 esm-fingerprint
function shouldIgnoreViolation(line, command, ignoreViolations) {
  if (!ignoreViolations) return false;
  if ((ignoreViolations["*"] ?? []).some((p) => line.includes(p))) return true;
  if (command === undefined) return false;
  for (let [pattern, patterns] of Object.entries(ignoreViolations))
    if (pattern !== "*" && command.includes(pattern) && patterns.some((p) => line.includes(p))) return true;
  return false;
}
//@ chunk-fq0cr76a.js:654510-654644 esm-fingerprint
var DISPLAY_UNSAFE_CHARACTERS =
  /[\x00-\x1f\x7f-\x9f\u00ad\u061c\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff\u{e0000}-\u{e007f}]+/gu;
//@ chunk-fq0cr76a.js:654644-654711 esm-fingerprint
function sanitizeViolationText(text) {
  return text.replace(DISPLAY_UNSAFE_CHARACTERS, " ").replace(/[<>]/g, "").trim();
}
//@ chunk-fq0cr76a.js:654711-654747 esm-layout
function dedupeFingerprint(decodedKey) {
  return cutBetweenCharacters(sanitizeViolationText(decodedKey), SANDBOXED_COMMAND_KEY_LENGTH);
}
//@ chunk-fq0cr76a.js:654747-654758 esm-layout
var MAX_DENIAL_REASON_LENGTH = 500;
//@ chunk-fq0cr76a.js:654758-654803 esm-fingerprint
function sanitizeDenialReason(reason) {
  return cutBetweenCharacters(sanitizeViolationText(reason), MAX_DENIAL_REASON_LENGTH).trimEnd();
}
//@ chunk-fq0cr76a.js:654803-654888 esm-fingerprint
function cutBetweenCharacters(text, length) {
  let cut = text.slice(0, length);
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
}
export { sanitizeDenialReason, SandboxViolationStore, dedupeFingerprint, shouldIgnoreViolation };
