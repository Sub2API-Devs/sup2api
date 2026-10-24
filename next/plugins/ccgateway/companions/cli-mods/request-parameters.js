// The build's generation parameters, imported only by build (request-build.js
// and request-input.js); interactive CLI defaults never read this module.
import { object } from './shared.js';

// buildInputError is the error for invalid build input.
export const buildInputError = (message, fields) => Object.assign(new Error(`request --build: ${message}`), { status: 400, code: 'invalid_request_error', ...fields });
const has = (value, key) => Object.hasOwn(value, key);
const fail = (field, reason) => { throw buildInputError(`${field} ${reason}`, { field }); };
const componentKeys = new Set(['model', 'system', 'messages', 'tools', 'stream', 'systemPrompt', 'attachments']);
const envelopeKeys = new Set(['requestPolicy', 'runtimeContext']);
// These fields have explicit adapter/native ownership. In particular a native
// omission is meaningful: never restore client thinking, temperature, metadata,
// model aliases, forced tool choice, token limits, or beta bodies afterward.
const nativeFields = new Set([...componentKeys, ...envelopeKeys, 'max_tokens', 'thinking', 'tool_choice', 'metadata', 'temperature', 'betas', 'output_config']);
const nativeOutputFields = new Set(['effort', 'format']);
// The native builder fills these from the history it rebuilt, and build
// history comes from the client without upstream message ids: native
// diagnostics.previous_message_id was an id it made up (msg_<uuid>, 2026-10-21
// audit). They are sent only as the client sent them, or not at all.
const clientOnlyFields = new Set(['diagnostics']);

export function validateBuildParameters(value) {
  if (value === undefined) return;
  if (!object(value)) fail('parameters', 'must be an object');
  for (const key of Object.keys(value)) {
    if (componentKeys.has(key)) fail(`parameters.${key}`, 'cannot replace a build component');
    if (envelopeKeys.has(key) || key.startsWith('ccgateway')) fail(`parameters.${key}`, 'is reserved for the trusted build adapter');
  }
  if (has(value, 'max_tokens') && (!Number.isSafeInteger(value.max_tokens) || value.max_tokens <= 0)) fail('parameters.max_tokens', 'must be a positive safe integer');
  if (has(value, 'thinking')) {
    const thinking = value.thinking;
    if (!object(thinking)) fail('parameters.thinking', 'must be an object');
    if (!['enabled', 'disabled', 'adaptive'].includes(thinking.type)) fail('parameters.thinking.type', 'must be enabled, disabled or adaptive');
    if (thinking.type === 'enabled') {
      if (!Number.isSafeInteger(thinking.budget_tokens) || thinking.budget_tokens <= 0) fail('parameters.thinking.budget_tokens', 'must be a positive safe integer for enabled thinking');
    } else if (has(thinking, 'budget_tokens')) fail('parameters.thinking.budget_tokens', 'is only valid for enabled thinking');
  }
  if (has(value, 'output_config') && !object(value.output_config)) fail('parameters.output_config', 'must be an object');
}

export function wireToolDefinitions(tools) {
  if (tools === undefined) return undefined;
  if (!Array.isArray(tools)) fail('tools', 'must be an array');
  return tools.map((source, index) => {
    if (!object(source) || typeof source.name !== 'string') fail(`tools[${index}]`, 'must be a named tool object');
    const tool = structuredClone(source);
    if (tool.type && tool.type !== 'custom') return tool;
    if (!object(tool.inputSchema)) fail(`tools[${index}].inputSchema`, 'must be an object');
    // Renamed in place: the client's key order is the wire order.
    return Object.fromEntries(Object.entries(tool).map(([key, value]) => [key === 'inputSchema' ? 'input_schema' : key, value]));
  });
}

// mergeAdditionalParameters takes parameters validateBuildParameters accepted.
export function mergeAdditionalParameters(built, parameters) {
  if (!object(built)) throw new Error('Native builder did not produce a request object');
  const supplied = parameters ?? {};
  // Object.fromEntries/spread create own data properties even for JSON keys such
  // as __proto__; property assignment would invoke Object.prototype's setter.
  const additional = Object.fromEntries(Object.entries(supplied).filter(([key]) => !nativeFields.has(key)));
  const result = { ...structuredClone(built), ...structuredClone(additional) };
  for (const key of clientOnlyFields) if (!has(supplied, key)) delete result[key];
  if (has(supplied, 'output_config')) {
    const extraOutput = Object.fromEntries(Object.entries(supplied.output_config).filter(([key]) => !nativeOutputFields.has(key)));
    if (Object.keys(extraOutput).length) {
      if (built.output_config !== undefined && !object(built.output_config)) throw new Error('Native output_config must be an object');
      result.output_config = { ...structuredClone(built.output_config ?? {}), ...structuredClone(extraOutput) };
    } else if (!Object.keys(supplied.output_config).length && built.output_config === undefined) {
      result.output_config = {};
    }
  }
  return result;
}
