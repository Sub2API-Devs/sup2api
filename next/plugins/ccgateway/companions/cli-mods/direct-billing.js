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
import { member, members, elements, skipWs } from './raw-json.js';
import { splice } from './shared.js';

// applyDirectBilling returns the raw body to send. nativeBilling() is the
// CLI's own header line (kLo).
export function applyDirectBilling(raw, body, { policy = {}, billingHeader, nativeBilling }) {
  const billing = createBillingPolicy(billingHeader);
  let native;
  const merge = blocks => billing.mergeBillingAttribution(blocks, { build_billing_entrypoint: policy.build_billing_entrypoint, build_billing_sources: policy.build_billing_sources }, native ??= nativeBilling());
  const top = members(raw, skipWs(raw, 0)), system = member(top, 'system');
  if (typeof body.system === 'string') return systemAsBlocks(raw, system, body.system, billingHeader, merge);
  if (body.system !== undefined && !Array.isArray(body.system)) return raw;
  const blocks = body.system ?? [], items = billingItems(blocks, billingHeader, merge);
  if (items.every((item, i) => item.index === i && item.text === undefined) && items.length === blocks.length) return raw;
  if (!system) return insertSystem(raw, top, items);
  return arraySystemEdits(raw, system, items);
}

// systemAsBlocks turns a string system into blocks, the way Claude Code sends
// every system (2026-10-23; its side requests' string system is one block
// after the header, IAs): a leading header line is a block of its own, the
// rest one block.
function systemAsBlocks(raw, system, own, billingHeader, merge) {
  const line = own.startsWith(billingHeader) ? own.match(/^[^\r\n]*/)[0] : '';
  const rest = line ? own.slice(line.length).replace(/^(\r\n|\r|\n)/, '') : own;
  const blocks = [...line ? [{ type: 'text', text: line }] : [], ...rest ? [{ type: 'text', text: rest }] : []];
  const final = line ? [...merge([blocks[0]]), ...blocks.slice(1)] : [...merge([]), ...blocks];
  return splice(raw, [{ start: system.start, end: system.end, value: JSON.stringify(final) }]);
}

// billingItems is the final system: client blocks by index, new blocks by
// value.
function billingItems(blocks, billingHeader, merge) {
  const items = blocks.map((block, index) => ({ index, block }));
  const leads = blocks[0]?.type === 'text' && typeof blocks[0].text === 'string' && blocks[0].text.startsWith(billingHeader);
  if (leads) {
    const [block] = merge([blocks[0]]);
    if (block.text !== blocks[0].text) items[0] = { index: 0, block, text: block.text };
  } else {
    const merged = merge([]);
    if (merged.length) items.unshift({ block: merged[0] });
  }
  return items;
}

// insertSystem puts a missing system where Claude Code sends it, after
// messages (model, messages, system, ...), else after model, else first.
function insertSystem(raw, top, items) {
  const json = '"system":' + JSON.stringify(items.map(item => item.block));
  const after = member(top, 'messages') ?? member(top, 'model');
  if (after) return raw.slice(0, after.end) + ',' + json + raw.slice(after.end);
  const open = skipWs(raw, 0);
  return raw.slice(0, open + 1) + json + (top.length ? ',' : '') + raw.slice(open + 1);
}

// arraySystemEdits splices the edited and new blocks into the existing array;
// a client block keeps its own bytes unless its text changed.
function arraySystemEdits(raw, system, items) {
  const list = elements(raw, system.start), edits = [];
  let pending = [], order = 0;
  for (const item of items) {
    if (item.index === undefined) { pending.push(item.block); continue; }
    const element = list[item.index];
    if (pending.length) edits.push({ start: element.start, value: pending.map(b => JSON.stringify(b)).join(',') + ',', order: order++ });
    pending = [];
    if (item.text !== undefined) {
      const text = member(members(raw, element.start), 'text');
      edits.push({ start: text.start, end: text.end, value: JSON.stringify(item.text), order: order++ });
    }
  }
  if (pending.length) {
    const json = pending.map(b => JSON.stringify(b)).join(',');
    edits.push(list.length ? { start: list.at(-1).end, value: ',' + json, order: order++ } : { start: system.start + 1, value: json, order: order++ });
  }
  return splice(raw, edits);
}
