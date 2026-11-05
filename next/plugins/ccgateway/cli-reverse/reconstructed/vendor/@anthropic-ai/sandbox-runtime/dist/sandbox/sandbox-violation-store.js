/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-violation-store.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (8)
 * attribution: esm-fingerprint 6, esm-layout 2
 */
import { encodeSandboxedCommand, SANDBOXED_COMMAND_KEY_LENGTH } from "./sandbox-utils.js";

//@ chunk-qg41pqt6.js:654016-654805 esm-fingerprint
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
//@ chunk-qg41pqt6.js:654805-655017 esm-fingerprint
function shouldIgnoreViolation(line, command, ignoreViolations) {
  if (!ignoreViolations) return false;
  if ((ignoreViolations["*"] ?? []).some((p) => line.includes(p))) return true;
  if (command === undefined) return false;
  for (let [pattern, patterns] of Object.entries(ignoreViolations))
    if (pattern !== "*" && command.includes(pattern) && patterns.some((p) => line.includes(p))) return true;
  return false;
}
//@ chunk-qg41pqt6.js:655017-655151 esm-fingerprint
var DISPLAY_UNSAFE_CHARACTERS =
  /[\x00-\x1f\x7f-\x9f\u00ad\u061c\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff\u{e0000}-\u{e007f}]+/gu;
//@ chunk-qg41pqt6.js:655151-655218 esm-fingerprint
function sanitizeViolationText(text) {
  return text.replace(DISPLAY_UNSAFE_CHARACTERS, " ").replace(/[<>]/g, "").trim();
}
//@ chunk-qg41pqt6.js:655218-655254 esm-layout
function dedupeFingerprint(decodedKey) {
  return cutBetweenCharacters(sanitizeViolationText(decodedKey), SANDBOXED_COMMAND_KEY_LENGTH);
}
//@ chunk-qg41pqt6.js:655254-655265 esm-layout
var MAX_DENIAL_REASON_LENGTH = 500;
//@ chunk-qg41pqt6.js:655265-655310 esm-fingerprint
function sanitizeDenialReason(reason) {
  return cutBetweenCharacters(sanitizeViolationText(reason), MAX_DENIAL_REASON_LENGTH).trimEnd();
}
//@ chunk-qg41pqt6.js:655310-655395 esm-fingerprint
function cutBetweenCharacters(text, length) {
  let cut = text.slice(0, length);
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
}
export { sanitizeDenialReason, SandboxViolationStore, dedupeFingerprint, shouldIgnoreViolation };
