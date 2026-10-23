// Direct sends the client's Messages body as written except for the billing
// header, which is required (2026-10-23, level none: the header alone, no
// identity line): a request without one that opens its system gets the native
// header there (the main thread's, as build fills it), a header missing a
// field gets the native value, and a field the Worker owns
// (build_billing_sources) gets the native value too; a string system becomes
// blocks, as Claude Code sends it. Everything else, the
// client's other header values included, goes byte for byte: edits are spliced
// into the raw JSON text, and only the edited string is re-encoded.
import { createBillingPolicy } from './content-policy.js';

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
// CLI's own header line (kLo).
export function applyDirectBilling(raw, body, { policy = {}, billingHeader, nativeBilling }) {
  const billing = createBillingPolicy(billingHeader);
  let native;
  const merge = blocks => billing.mergeBillingAttribution(blocks, { build_billing_entrypoint: policy.build_billing_entrypoint, build_billing_sources: policy.build_billing_sources }, native ??= nativeBilling());
  const top = members(raw, skipWs(raw, 0)), system = member(top, 'system');
  // A string becomes blocks, the way Claude Code sends every system
  // (2026-10-23; its side requests' string system is one block after the
  // header, IAs): a leading header line is a block of its own, the rest one
  // block.
  if (typeof body.system === 'string') {
    const own = body.system, line = own.startsWith(billingHeader) ? own.match(/^[^\r\n]*/)[0] : '';
    const rest = line ? own.slice(line.length).replace(/^(\r\n|\r|\n)/, '') : own;
    const blocks = [...line ? [{ type: 'text', text: line }] : [], ...rest ? [{ type: 'text', text: rest }] : []];
    const final = line ? [...merge([blocks[0]]), ...blocks.slice(1)] : [...merge([]), ...blocks];
    return splice(raw, [{ at: system.start, end: system.end, text: JSON.stringify(final) }]);
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
