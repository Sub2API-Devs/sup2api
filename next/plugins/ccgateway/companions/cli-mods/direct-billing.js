// Direct sends the client's Messages body as written, with two exceptions
// (2026-10-22 decision): the billing header is required, so a request without
// one that opens its system gets the native header there, and a header missing
// a field gets the native value; and the identity line chosen for the
// request's entrypoint follows it, as in build. Everything else, the client's
// own header values included, goes byte for byte: edits are spliced into the
// raw JSON text, and only the edited string is re-encoded.
import { createBillingPolicy } from './content-policy.js';
import { identityLineFor } from './request-policy.js';
import { applyBuildCliPrefix } from './request-identity.js';

const ws = ' \t\n\r';
function skipWs(s, i) { while (i < s.length && ws.includes(s[i])) i++; return i; }
function skipString(s, i) {
  for (i++; i < s.length; i++) {
    if (s[i] === '\\') i++;
    else if (s[i] === '"') return i + 1;
  }
  throw Error('Unterminated JSON string');
}
function skipValue(s, i) {
  if (s[i] === '"') return skipString(s, i);
  if (s[i] === '{' || s[i] === '[') {
    for (let depth = 0; i < s.length;) {
      if (s[i] === '"') { i = skipString(s, i); continue; }
      if (s[i] === '{' || s[i] === '[') depth++;
      else if ((s[i] === '}' || s[i] === ']') && --depth === 0) return i + 1;
      i++;
    }
    throw Error('Unterminated JSON value');
  }
  while (i < s.length && !',}]'.includes(s[i]) && !ws.includes(s[i])) i++;
  return i;
}
// members lists an object's keys with their value ranges; i is at '{'.
function members(s, i) {
  const out = [];
  i = skipWs(s, i + 1);
  while (s[i] !== '}') {
    const keyEnd = skipString(s, i), key = JSON.parse(s.slice(i, keyEnd));
    const start = skipWs(s, skipWs(s, keyEnd) + 1), end = skipValue(s, start);
    out.push({ key, start, end });
    i = skipWs(s, end);
    if (s[i] === ',') i = skipWs(s, i + 1);
  }
  return out;
}
// elements lists an array's element ranges; i is at '['.
function elements(s, i) {
  const out = [];
  i = skipWs(s, i + 1);
  while (s[i] !== ']') {
    const end = skipValue(s, i);
    out.push({ start: i, end });
    i = skipWs(s, end);
    if (s[i] === ',') i = skipWs(s, i + 1);
  }
  return out;
}
// The last occurrence wins, as in JSON.parse.
const member = (list, key) => list.findLast(m => m.key === key);
const splice = (text, edits) => edits.sort((a, b) => b.at - a.at || b.order - a.order)
  .reduce((out, e) => out.slice(0, e.at) + e.text + out.slice(e.end ?? e.at), text);

// applyDirectBilling returns the raw body to send. nativeBilling() is the
// CLI's own header line (kLo); lines, isPrefix and isBilling are the CLI's
// identity lines (n1n), recognizer (t1n) and header-block test (B1s). The
// identity line is OAuth only, as in build.
export function applyDirectBilling(raw, body, { policy = {}, oauth, billingHeader, nativeBilling, lines, isPrefix, isBilling }) {
  const billing = createBillingPolicy(billingHeader);
  let native;
  const merge = blocks => billing.mergeBillingAttribution(blocks, { build_billing_entrypoint: policy.build_billing_entrypoint }, native ??= nativeBilling());
  const top = members(raw, skipWs(raw, 0)), system = member(top, 'system');
  // A string keeps its type: the header opens it, followed by a newline
  // (upstream reads a string system like a single block). It cannot carry a
  // separate identity line.
  if (typeof body.system === 'string') {
    const own = body.system;
    let text = own;
    if (own.startsWith(billingHeader)) {
      const merged = merge(own);
      if (Array.isArray(merged)) text = merged[0].text;
    } else {
      const merged = merge([]);
      if (merged.length) text = merged[0].text + '\n' + own;
    }
    return text === own ? raw : splice(raw, [{ at: system.start, end: system.end, text: JSON.stringify(text) }]);
  }
  if (body.system !== undefined && !Array.isArray(body.system)) return raw;
  const blocks = body.system ?? [];
  // Items are the final system: client blocks by index, new blocks by value.
  const items = blocks.map((block, index) => ({ index, block }));
  const leads = blocks[0]?.type === 'text' && typeof blocks[0].text === 'string' && blocks[0].text.startsWith(billingHeader);
  if (leads) {
    const [block] = merge([blocks[0]]);
    if (block.text !== blocks[0].text) items[0] = { index: 0, block, text: block.text };
  } else {
    const merged = merge([]);
    if (merged.length) items.unshift({ block: merged[0] });
  }
  if (oauth) {
    const before = items.map(item => item.block);
    const after = applyBuildCliPrefix({ system: before }, identityLineFor(policy, billing.billingEntrypoint(before)), lines, isPrefix, isBilling).system;
    const at = after.findIndex((block, i) => block !== before[i]);
    if (at >= 0) items.splice(at, 0, { block: after[at] });
  }
  if (items.every((item, i) => item.index === i && item.text === undefined) && items.length === blocks.length) return raw;
  if (!system) {
    // No system: it goes first in the body, after the opening brace.
    const open = skipWs(raw, 0);
    return raw.slice(0, open + 1) + '"system":' + JSON.stringify(items.map(item => item.block)) + ',' + raw.slice(open + 1);
  }
  const list = elements(raw, system.start), edits = [];
  let pending = [], order = 0;
  for (const item of items) {
    if (item.index === undefined) { pending.push(item.block); continue; }
    const element = list[item.index];
    if (pending.length) edits.push({ at: element.start, text: pending.map(b => JSON.stringify(b)).join(',') + ',', order: order++ });
    pending = [];
    if (item.text !== undefined) {
      const text = member(members(raw, element.start), 'text');
      edits.push({ at: text.start, end: text.end, text: JSON.stringify(item.text), order: order++ });
    }
  }
  if (pending.length) {
    const json = pending.map(b => JSON.stringify(b)).join(',');
    edits.push(list.length ? { at: list.at(-1).end, text: ',' + json, order: order++ } : { at: system.start + 1, text: json, order: order++ });
  }
  return splice(raw, edits);
}
