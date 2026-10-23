// Explicit build components -> CC records. Attachment extraction belongs to
// the gateway. Never infer a record's type or role from tags in ordinary text.
import { object, toBlocks } from './shared.js';

const fail = message => { throw new Error(`request --build: ${message}`); };
const record = (type, fields) => ({ type, uuid: crypto.randomUUID(), timestamp: new Date().toISOString(), ...fields });
const gatewayContext = (text, renderedRole) => record('attachment', {
  attachment: { type: 'hook_additional_context', hookName: 'gateway', hookEvent: 'UserPromptSubmit', content: [text] },
  // Native cached-render validation accepts text snapshots, not arbitrary
  // API block attributes. Keep cache_control on the component, outside it.
  rendered: [{ content: text }], renderedRole,
});

function systemRecord(message) {
  const blocks = toBlocks(message.content);
  if (!Array.isArray(blocks)) fail('system content must be text or a block array');
  const text = [], additions = [], removals = [], definitions = Object.create(null);
  for (const block of blocks) {
    if (!object(block)) fail('invalid system content block');
    if (block.type === 'text' && typeof block.text === 'string') { text.push(block.text); continue; }
    if (block.type !== 'tool_addition' && block.type !== 'tool_removal') fail(`unsupported system block ${block.type}; use --direct to forward it unchanged`);
    const tool = block.tool;
    if (!object(tool)) fail('tool change requires a tool reference or definition');
    let name;
    if (tool.type === 'tool_reference' && typeof tool.name === 'string') name = tool.name;
    else if (block.type === 'tool_addition' && tool.type === 'tool_definition' && object(tool.definition) && typeof tool.definition.name === 'string') {
      name = tool.definition.name; definitions[name] = structuredClone(tool.definition);
    } else fail('this tool-change representation requires --direct');
    (block.type === 'tool_addition' ? additions : removals).push(name);
  }
  // Internal CC records use string content; retain the already-rendered wire
  // blocks and lifecycle fields for the native Xyr serialization boundary.
  const result = record('api_system', { message: { role: 'system', content: text.join('\n') }, ccgatewayWireSystem: structuredClone(message) });
  if (additions.length) result.toolAdditions = additions;
  if (removals.length) result.toolRemovals = removals;
  if (Object.keys(definitions).length) result.toolDefinitions = definitions;
  if (message.output_config !== undefined) result.outputConfig = structuredClone(message.output_config);
  if (message.clear_at !== undefined && !['never', 'next_user_message'].includes(message.clear_at)) fail('unsupported clear_at value');
  return result;
}

// parseComponents checks the component envelope and reads the parameters and
// the system prompt (its texts, and with preserveContent its wire blocks).
function parseComponents(components, preserveContent) {
  if (!object(components) || typeof components.model !== 'string' || !components.model.trim()) fail('model must be a non-empty string');
  const allowed = new Set(['model', 'systemPrompt', 'messages', 'attachments', 'tools', 'parameters', 'stream']);
  for (const key of Object.keys(components)) if (!allowed.has(key)) fail(`unknown component ${key}; use parameters for generation options, or --direct for a complete HTTP body`);
  if (!Array.isArray(components.messages) || !components.messages.length) fail('messages must be a non-empty array');
  if (components.stream !== undefined && typeof components.stream !== 'boolean') fail('stream must be boolean');
  const parameters = structuredClone(components.parameters ?? {});
  if (!object(parameters)) fail('parameters must be an object');
  for (const key of ['model', 'system', 'messages', 'tools', 'stream']) if (Object.hasOwn(parameters, key)) fail(`parameters.${key} cannot replace a build component`);
  if (parameters.betas !== undefined && (!Array.isArray(parameters.betas) || !parameters.betas.every(b => typeof b === 'string'))) fail('parameters.betas must be an array of strings');
  let systemPrompt = [], systemBlocks;
  if (typeof components.systemPrompt === 'string') {
    systemPrompt = [components.systemPrompt];
    if (preserveContent) systemBlocks = [{ type: 'text', text: components.systemPrompt }];
  }
  else if (components.systemPrompt !== undefined) {
    if (!Array.isArray(components.systemPrompt)) fail('systemPrompt must be text or an array');
    systemBlocks = components.systemPrompt.map(block => {
      if (typeof block === 'string') return { type: 'text', text: block };
      if (!object(block) || block.type !== 'text' || typeof block.text !== 'string') fail('systemPrompt blocks must be text');
      return structuredClone(block);
    });
    systemPrompt = systemBlocks.map(block => block.text);
  }
  if (preserveContent && systemBlocks === undefined) systemBlocks = [];
  return { parameters, systemPrompt, systemBlocks };
}

// referenceTable reads the Worker-extracted attachments: those with an id are
// referenced from messages (take, each exactly once), the rest are placed
// after a message.
function referenceTable(attachments) {
  const references = new Map(), used = new Set();
  for (const item of attachments) {
    if (!object(item) || item.id === undefined) continue;
    if (typeof item.id !== 'string' || !item.id || references.has(item.id)) fail('attachment ids must be unique strings');
    if (!['system', 'reminder'].includes(item.kind)) fail('unsupported extracted attachment kind');
    references.set(item.id, item);
  }
  const take = (id, kind) => {
    const item = references.get(id);
    if (!item || item.kind !== kind || used.has(id)) fail('attachment reference is missing, duplicated or has the wrong kind');
    used.add(id); return item;
  };
  return { take, allUsed: () => used.size === references.size };
}

// A reminder reference, rendered by CC's own renderer, which must give back
// the extracted text unchanged.
function renderReminder(item, renderAttachment) {
  if (!object(item.block) || item.block.type !== 'text' || typeof item.block.text !== 'string') fail('reminder attachment requires a text block');
  if (typeof renderAttachment !== 'function') fail('native attachment renderer is required');
  const rendered = renderAttachment(gatewayContext(item.block.text, 'user'));
  if (!rendered.isKnownType || rendered.messages.length !== 1 || rendered.messages[0].message.role !== 'user') fail('native reminder rendering failed');
  const value = rendered.messages[0].message.content;
  const text = typeof value === 'string' ? value : textOf(value);
  if (text !== item.block.text) fail('native rendered reminder snapshot changed unexpectedly');
  return [{ ...structuredClone(item.block), text }];
}
const textOf = blocks => blocks.map(block => { if (block?.type !== 'text') fail('reminder must render text'); return block.text; }).join('');

// resolveContent replaces the Worker's references in message content with the
// texts they stand for.
function resolveContent(content, reminder, preserveContent) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) fail('message content must be text or a block array');
  return content.flatMap(block => {
    if (preserveContent) {
      if (!object(block) || typeof block.type !== 'string' || !block.type) fail('invalid message content block');
      if (block.type === 'text' && typeof block.text !== 'string') fail('text block requires text');
      if (block.type === 'tool_result' && block.content !== undefined && typeof block.content !== 'string' && !Array.isArray(block.content)) fail('invalid tool result content');
    }
    if (block?.type === 'ccgateway_attachment') return reminder(block.id);
    if (block?.type === 'ccgateway_text') {
      if (!object(block.block) || block.block.type !== 'text' || Object.hasOwn(block.block, 'text') || !Array.isArray(block.parts)) fail('invalid text attachment template');
      const text = block.parts.map(part => {
        if (!object(part) || Object.keys(part).length !== 1) fail('invalid text attachment part');
        if (typeof part.text === 'string') return part.text;
        if (typeof part.attachment !== 'string') fail('invalid text attachment reference');
        return textOf(reminder(part.attachment));
      }).join('');
      return [{ ...structuredClone(block.block), text }];
    }
    // Media remains untouched. Only tool-result text arrays can contain
    // Worker-generated references; nested image/document data is opaque.
    if (block?.type === 'tool_result' && Array.isArray(block.content)) return [{ ...block, content: resolveContent(block.content, reminder, preserveContent) }];
    return [structuredClone(block)];
  });
}

// placedAttachments are the attachments without an id, by the message they
// follow.
function placedAttachments(attachments, messageCount) {
  const byMessage = new Map();
  for (const item of attachments) {
    if (item?.id !== undefined) continue;
    if (!object(item) || !Number.isInteger(item.afterMessage) || item.afterMessage < 0 || item.afterMessage >= messageCount) fail('attachment.afterMessage must index an existing message');
    const role = item.role ?? 'user';
    if (role !== 'user' && role !== 'system') fail('attachment.role must be user or system');
    const hasText = Object.hasOwn(item, 'text'), hasValue = Object.hasOwn(item, 'attachment');
    if (hasText === hasValue) fail('attachment requires exactly one of text or attachment');
    let entry;
    if (hasText) {
      if (typeof item.text !== 'string' || !item.text.trim()) fail('attachment.text must be non-empty');
      entry = gatewayContext(item.text, role);
    } else {
      if (!object(item.attachment) || typeof item.attachment.type !== 'string') fail('attachment payload requires a type');
      entry = record('attachment', { attachment: structuredClone(item.attachment), renderedRole: role });
    }
    const list = byMessage.get(item.afterMessage) ?? [];
    list.push(entry); byMessage.set(item.afterMessage, list);
  }
  return byMessage;
}

// messageRecord is one message as CC's record, its references resolved.
function messageRecord(source, messageIndex, { model, take, reminder, preserveContent }) {
  let resolved = source;
  if (object(source) && typeof source.attachment === 'string') {
    if (Object.keys(source).length !== 1) fail('system attachment reference cannot contain message fields');
    resolved = take(source.attachment, 'system').message;
    if (resolved?.role !== 'system') fail('system attachment must retain system role');
  }
  if (!object(resolved) || !['user', 'assistant', 'system'].includes(resolved.role)) fail(`invalid role at messages[${messageIndex}]`);
  const message = structuredClone(resolved);
  if (message.role === 'system') return systemRecord(message);
  message.content = resolveContent(message.content, reminder, preserveContent);
  if (typeof message.content !== 'string' && !Array.isArray(message.content)) fail(`invalid content at messages[${messageIndex}]`);
  const wire = preserveContent && { ccgatewayWireMessage: structuredClone(message) };
  if (message.role === 'user') return record('user', { ...wire, message });
  return record('assistant', { ...wire, message: { id: `msg_${crypto.randomUUID()}`, type: 'message', model, stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 }, ...message, content: toBlocks(message.content) } });
}

// expandReferences gives the messages as CC's records, each followed by the
// attachments placed after it; every extracted attachment must be used.
function expandReferences(components, renderAttachment, preserveContent) {
  const attachments = components.attachments ?? [];
  if (!Array.isArray(attachments)) fail('attachments must be an array');
  const { take, allUsed } = referenceTable(attachments);
  const reminder = id => renderReminder(take(id, 'reminder'), renderAttachment);
  const byMessage = placedAttachments(attachments, components.messages.length);
  const context = { model: components.model, take, reminder, preserveContent };
  const messages = [];
  for (const [messageIndex, source] of components.messages.entries()) {
    messages.push(messageRecord(source, messageIndex, context));
    messages.push(...byMessage.get(messageIndex) ?? []);
  }
  if (!allUsed()) fail('unreferenced extracted attachments are not allowed');
  return messages;
}

// validateToolPairs requires every tool_use to be answered by a tool_result in
// the next user turn, before the next assistant turn.
function validateToolPairs(records) {
  const pending = new Set(), seen = new Set();
  const checkBlock = (role, block) => {
    if (block.type === 'tool_use') {
      if (role !== 'assistant' || typeof block.id !== 'string' || !block.id || seen.has(block.id)) fail('invalid or duplicate tool_use id');
      if (typeof block.name !== 'string' || !block.name || !object(block.input)) fail('invalid tool_use definition');
      seen.add(block.id); pending.add(block.id);
    } else if (block.type === 'tool_result') {
      if (role !== 'user' || typeof block.tool_use_id !== 'string' || !pending.delete(block.tool_use_id)) fail('tool_result has no matching pending tool_use');
    }
  };
  for (const row of records) {
    const message = row.ccgatewayWireSystem ?? row.ccgatewayWireMessage;
    if (!message || message.role === 'system') continue;
    if (message.role === 'assistant' && pending.size) fail('tool results must precede the next assistant turn');
    for (const block of Array.isArray(message.content) ? message.content : []) checkBlock(message.role, block);
    if (message.role === 'user' && pending.size) fail('missing tool results');
  }
  if (pending.size) fail('missing tool results');
}

// splitTools separates custom tools (input_schema, as CC takes them) from the
// other tool types, which go to the wire as written.
function splitTools(tools) {
  if (tools !== undefined && !Array.isArray(tools)) fail('tools must be an array');
  const customTools = [], extraToolSchemas = [];
  for (const tool of tools ?? []) {
    if (!object(tool) || typeof tool.name !== 'string') fail('tool definition requires a name');
    if (tool.type && tool.type !== 'custom') { extraToolSchemas.push(structuredClone(tool)); continue; }
    if (!object(tool.inputSchema)) fail(`tool ${tool.name} requires inputSchema`);
    const { inputSchema, ...rest } = structuredClone(tool);
    customTools.push({ ...rest, input_schema: inputSchema });
  }
  return { customTools, extraToolSchemas };
}

export function prepareBuildInput(components, renderAttachment, { preserveContent = false } = {}) {
  const { parameters, systemPrompt, systemBlocks } = parseComponents(components, preserveContent);
  const messages = expandReferences(components, renderAttachment, preserveContent);
  if (preserveContent) validateToolPairs(messages);
  const { customTools, extraToolSchemas } = splitTools(components.tools);
  // stream goes upstream only when the client sent it (absent means false).
  const request = { ...parameters, model: components.model, ...(components.stream !== undefined && { stream: components.stream }) };
  return { request, messages, systemPrompt, systemBlocks, customTools, extraToolSchemas };
}

// fingerprintMessages gives CC's attribution fingerprint (RIs) the message it
// reads in a native session: the first user prompt. Native attachments are
// separate isMeta records there, so RIs never sees them; a wire user message
// carries them as reminder blocks beside the prompt, so those blocks (opening
// with the native reminder tag) and tool results are skipped here. Without
// this every conversation hashed the same reminder characters.
export function fingerprintMessages(messages, reminderOpen) {
  const prompt = block => block?.type === 'text' && typeof block.text === 'string' && !block.text.trimStart().startsWith(reminderOpen);
  const text = messages.filter(message => message?.role === 'user')
    .map(message => toBlocks(message.content)).find(blocks => Array.isArray(blocks) && blocks.some(prompt))?.find(prompt)?.text ?? '';
  return [{ type: 'user', message: { role: 'user', content: text } }];
}
