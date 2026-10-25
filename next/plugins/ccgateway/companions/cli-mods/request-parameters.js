// The build's generation parameters, imported only by build (request-build.js
// and request-input.js); interactive CLI defaults never read this module.
import { object } from './shared.js';
import { numberValue } from './request-options.js';

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
// Exported for the reconciliation test against the native body literal
// (test/request-parameters-304.test.mjs): what the adapter may not overwrite.
export const nativeParameterFields = Object.freeze([...nativeFields]);
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
}

// generationControls are the generation controls CC's builder takes, read
// from the client's parameters (2026-10-25: build never refuses a value of its
// own; the upstream judges the request). A control the builder can carry as
// the client meant it goes to the builder: a positive integer max_tokens, a
// number temperature, a thinking of a known type with its known fields, an
// output_config object. Any other value is not the builder's: it is sent as
// the client wrote it (raw), and the builder gets the control as if absent.
export function generationControls(parameters = {}) {
  const raw = {}, controls = { raw };
  if (has(parameters, 'max_tokens')) {
    const value = numberValue(parameters.max_tokens);
    if (Number.isSafeInteger(value) && value > 0) controls.maxTokens = value;
    else raw.max_tokens = parameters.max_tokens;
  }
  if (has(parameters, 'temperature')) {
    const value = numberValue(parameters.temperature);
    if (typeof value === 'number' && Number.isFinite(value)) controls.temperature = value;
    else raw.temperature = parameters.temperature;
  }
  if (has(parameters, 'thinking')) {
    controls.thinking = thinkingConfig(parameters.thinking);
    if (!controls.thinking) raw.thinking = parameters.thinking;
  }
  if (has(parameters, 'output_config')) {
    if (object(parameters.output_config)) controls.outputConfig = parameters.output_config;
    else raw.output_config = parameters.output_config;
  }
  return controls;
}

// thinkingConfig is the client's thinking as CC's thinking configuration,
// which CC's model rules turn back into the request's; undefined when it is
// not one CC knows (another type, a field CC does not carry, a budget that is
// not a positive integer).
function thinkingConfig(thinking) {
  if (!object(thinking)) return undefined;
  const fields = { enabled: ['type', 'budget_tokens', 'display'], adaptive: ['type', 'display'], disabled: ['type'] }[thinking.type];
  if (!fields || Object.keys(thinking).some(key => !fields.includes(key))) return undefined;
  if (thinking.display !== undefined && typeof thinking.display !== 'string') return undefined;
  if (thinking.type === 'disabled') return { type: 'disabled', mechanical: true };
  if (thinking.type === 'adaptive') return { type: 'enabled', display: thinking.display };
  const budget = numberValue(thinking.budget_tokens);
  return Number.isSafeInteger(budget) && budget > 0 ? { type: 'enabled', budgetTokens: budget, display: thinking.display } : undefined;
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
  if (object(supplied.output_config)) {
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
