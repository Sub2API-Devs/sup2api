// The first-party shape of an official Claude Code client's system prompt
// (2026-11-03 user decision, CONTRACTS §53.23; billing doc §0, §2). A client
// connected through a custom ANTHROPIC_BASE_URL sends three system blocks:
// its billing header, its identity line and one block that is CC's whole
// prompt, the static sections and the dynamic ones joined by a blank line,
// the line and the prompt each with a cache marker. Connected to
// api.anthropic.com it sends four: the header, the line without a marker,
// the static sections as their own block with the global cache scope, and
// the dynamic ones. CC makes both from the same sections (its s2o, without
// and with the dynamic boundary), so the conversion is CC's own split of the
// client's prompt, made only when the client's prompt opens with exactly the
// static sections this CLI's CC writes for the request's model and tools.
// Anything else (another version's prompt, a custom system prompt, an output
// style, an unexpected block or marker) is left as the client sent it, as CC
// itself sends a prompt without its static sections in one block.
//
// Loaded by request-build.js only for a request it converts, so the native
// bindings it needs are not part of any other build.
import { ccgatewayPromptSections, ccgatewayFirstPartySystem, ccgatewayDeferredToolsOpening, isIdentityLine, reminderOpen, reminderClose } from './native-build.js';
import { requestTool } from './native-tools.js';
import { object, toBlocks } from './shared.js';

// The cache markers CC writes on its prompt (vX): ephemeral, with the
// lifetime when it is not the default. The client's lifetime is kept: the
// 1-hour lifetime of a subscription login is the client's to choose
// (2026-11-03: not converted).
const marker = value => object(value) && value.type === 'ephemeral' &&
  Object.keys(value).every(key => key === 'type' || key === 'ttl' && typeof value.ttl === 'string' && value.ttl);
const plain = block => object(block) && block.type === 'text' && typeof block.text === 'string' &&
  Object.keys(block).every(key => ['type', 'text', 'cache_control'].includes(key));
const sameMarker = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// deferredToolNames are the tools CC's reminder in the client's messages
// announces as deferred (CC's own opening, then one name a line): CC wrote
// its prompt for its whole pool, those included, and a request lists them
// only there.
const toolName = /^[A-Za-z0-9_.:-]{1,128}$/;
export function deferredToolNames(messages = []) {
  const opening = ccgatewayDeferredToolsOpening(), names = new Set();
  if (typeof opening !== 'string' || !opening) return names;
  for (const message of messages) {
    if (message?.role !== 'user') continue;
    for (const block of toBlocks(message.content ?? []) ?? []) {
      if (block?.type !== 'text' || typeof block.text !== 'string') continue;
      const text = block.text.trim();
      if (!text.startsWith(reminderOpen) || !text.endsWith(reminderClose)) continue;
      const body = text.slice(reminderOpen.length, text.length - reminderClose.length).trim();
      if (!body.startsWith(opening + '\n')) continue;
      const lines = body.slice(opening.length + 1).split('\n').map(line => line.trim()).filter(Boolean);
      if (lines.every(line => toolName.test(line))) for (const line of lines) names.add(line);
    }
  }
  return names;
}

// firstPartySystem is the client's three blocks in the first-party shape, or
// null when they are not CC's prompt as this CLI writes it. tools are the
// request's tools as CC tools (the client's own, request-build.js
// clientTools), model the request's model, messages the client's: CC's
// prompt sections depend on the model and its tools, the deferred ones
// (named in the messages) included. The sections are rendered for the
// request's tools with the deferred ones, as CC rendered them, then without
// (a client that names none); the first rendering that is exactly how the
// client's prompt opens is the split.
export async function firstPartySystem(system, { model, tools, messages = [] }) {
  if (!Array.isArray(system) || system.length !== 3 || !system.every(plain)) return null;
  const [header, line, prompt] = system;
  if (header.cache_control !== undefined || !isIdentityLine(line.text)) return null;
  const cache = prompt.cache_control;
  if (!sameMarker(line.cache_control, cache) || cache !== undefined && !marker(cache)) return null;
  const names = new Set(tools.map(tool => tool.name));
  const deferred = [...deferredToolNames(messages)].filter(name => !names.has(name))
    .map(name => requestTool({ name, description: '', inputSchema: { type: 'object' }, isDeferred: true }));
  let sections, staticText;
  for (const candidate of deferred.length ? [[...tools, ...deferred], tools] : [tools]) {
    const rendered = await ccgatewayPromptSections(candidate, model);
    const text = rendered?.static.filter(Boolean).join('\n\n');
    if (text && prompt.text.startsWith(text + '\n\n')) { sections = rendered; staticText = text; break; }
  }
  if (!sections) return null;
  const dynamic = prompt.text.slice(staticText.length + 2);
  if (!dynamic) return null;
  // CC's own blocks for the client's texts: its split and its markers.
  const blocks = ccgatewayFirstPartySystem([header.text, line.text, ...sections.static, sections.boundary, dynamic], cache !== undefined, cache?.ttl);
  if (!Array.isArray(blocks) || blocks.length < 4 || blocks[0].text !== header.text || blocks[1].text !== line.text || blocks.at(-1).text !== dynamic) return null;
  return blocks;
}
