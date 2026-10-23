import path from 'node:path';
import { object } from './shared.js';

const environmentFields = [
  'platform_name', 'os_version', 'shell', 'primary_directory',
  'additional_directories', 'git_repository', 'worktree',
  'scratchpad_directory', 'github_cli', 'agent_proxy',
];
const billingFields = ['cc_version', 'cc_entrypoint'];

// The cc_entrypoint values build may write and, per entrypoint, the identity
// lines real clients send with it, the default first (contracts
// features/identity_line.go). The lines are names; CC renders the text (n1n).
// The desktop app's and the extension's side requests send official_cli.
export const defaultEntrypoint = 'sdk-cli';
export const identityLineChoices = {
  cli: ['official_cli'],
  'sdk-cli': ['agent_sdk', 'official_cli_sdk'],
  'sdk-ts': ['agent_sdk', 'official_cli_sdk'],
  'sdk-py': ['agent_sdk', 'official_cli_sdk'],
  'claude-desktop': ['official_cli_sdk', 'agent_sdk', 'official_cli'],
  'claude-vscode': ['official_cli_sdk', 'agent_sdk', 'official_cli'],
};
// Entrypoints a client may send that answer to a configured one.
const entrypointAliases = { 'claude-desktop-3p': 'claude-desktop' };

// identityLineFor picks the identity line for the request's entrypoint (the
// one its billing header carries after build filled it), the way Claude Code
// picks it (2026-10-23: adaptive, no configuration; 2.1.304 n1n chooses by
// interactivity and an appended prompt): the terminal cli its own line; the
// desktop app and the VS Code extension, which append a prompt, the SDK line
// with the append; the SDK entrypoints the plain SDK line, or the appended
// one when build gave the request CC's system prompt with the client's system
// appended (appended). An entrypoint outside the table uses the configured
// one's row. The line is inserted only when the request has none. Identity
// lines sent by an older core are accepted and not used.
export function identityLineFor(policy = {}, entrypoint, { appended = false } = {}) {
  const configured = policy.build_billing_entrypoint ?? defaultEntrypoint;
  const row = Object.hasOwn(identityLineChoices, entrypoint) ? entrypoint
    : Object.hasOwn(entrypointAliases, entrypoint ?? '') ? entrypointAliases[entrypoint] : configured;
  const line = appended && identityLineChoices[row].includes('official_cli_sdk') ? 'official_cli_sdk' : identityLineChoices[row][0];
  return { entrypoint: row, line, fallback: line };
}

// Entry point and identity line choices, shared by both envelopes.
function validateIdentityChoices(value) {
  if (value.build_billing_entrypoint !== undefined && !Object.hasOwn(identityLineChoices, value.build_billing_entrypoint)) throw Error('Unsupported build_billing_entrypoint');
  if (value.build_identity_lines !== undefined) {
    if (!object(value.build_identity_lines)) throw Error('build_identity_lines must be an object');
    for (const [entrypoint, line] of Object.entries(value.build_identity_lines)) {
      if (!Object.hasOwn(identityLineChoices, entrypoint) || line !== 'none' && !identityLineChoices[entrypoint].includes(line)) throw Error(`Unsupported build_identity_lines.${entrypoint}`);
    }
  }
}

// validateDirectPolicy reads the Worker's direct context (CCG_DIRECT_POLICY):
// the billing choices, the only ones direct takes. Undefined means none was
// given, and direct then forwards the body unchanged. Identity lines from an
// older Worker are accepted and not used: direct adds no line (2026-10-23).
export function validateDirectPolicy(raw) {
  if (raw === undefined) return undefined;
  let value;
  try { value = JSON.parse(raw); } catch { throw Error('Invalid Worker direct policy'); }
  if (!object(value) || Object.keys(value).some(key => !['build_billing_entrypoint', 'build_billing_sources', 'build_identity_lines'].includes(key))) throw Error('Invalid Worker direct policy');
  validateIdentityChoices(value);
  validateSources(value, 'build_billing_sources', billingFields, ['client', 'worker']);
  const { build_identity_lines: _, ...policy } = value;
  return policy;
}

// What build adds to a request without a billing header (a request that is not
// Claude Code's), each optional (2026-10-23 decision; contracts
// features/injection.go): Claude Code's own system prompt, the attachments CC
// sends on a session's first turn, and CC's own tools by name, each a key set
// to true. The text and the tool definitions are the CLI's, never sent in.
export const injectionAttachments = ['environment', 'model', 'total_tokens', 'date'];
const toolName = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

function validateInjection(value) {
  if (value === undefined) return;
  if (!object(value) || Object.keys(value).some(key => !['system_prompt', 'attachments', 'tools'].includes(key))) throw Error('Invalid build_injection');
  if (value.system_prompt !== undefined && typeof value.system_prompt !== 'boolean') throw Error('Invalid build_injection.system_prompt');
  for (const [name, valid] of [['attachments', key => injectionAttachments.includes(key)], ['tools', key => toolName.test(key)]]) {
    const set = value[name];
    if (set === undefined) continue;
    if (!object(set) || Object.keys(set).length > 64 || !Object.entries(set).every(([key, on]) => valid(key) && typeof on === 'boolean')) throw Error(`Invalid build_injection.${name}`);
  }
}

// injectionChoices reads what is added: the system prompt, the attachments in
// CC's order and the tool names.
export function injectionChoices(value) {
  const on = set => Object.entries(set ?? {}).filter(([, chosen]) => chosen).map(([key]) => key);
  return { systemPrompt: value?.system_prompt === true, attachments: injectionAttachments.filter(kind => value?.attachments?.[kind] === true), tools: on(value?.tools) };
}

// This envelope is built by the trusted Worker. User Messages JSON cannot
// supply it. Standalone request --build without a policy remains client-only.
export function validateRequestPolicy(value) {
  if (value === undefined) return {};
  if (!object(value) || value.contract_version !== 2) throw Error('Unsupported request policy contract');
  for (const key of Object.keys(value)) {
    if (!['contract_version', 'build_attachment_sources', 'build_billing_sources', 'build_billing_entrypoint', 'build_identity_lines', 'build_injection'].includes(key)) throw Error(`Unknown request policy key: ${key}`);
  }
  validateIdentityChoices(value);
  validateInjection(value.build_injection);
  validateSources(value, 'build_attachment_sources', environmentFields, ['client', 'worker', 'erase']);
  validateSources(value, 'build_billing_sources', billingFields, ['client', 'worker']);
  return structuredClone(value);
}

function validateSources(value, name, fields, sources) {
  const mapping = value[name];
  if (mapping === undefined) return;
  if (!object(mapping)) throw Error(`${name} must be an object`);
  for (const [key, source] of Object.entries(mapping)) {
    if (!fields.includes(key) || !sources.includes(source)) throw Error(`Unsupported ${name}.${key}`);
  }
}

export function runtimeContext(value) {
  if (value === undefined) return { workingDirectory: process.cwd(), additionalWorkingDirectories: [] };
  if (!object(value) || Object.keys(value).some(key => !['workingDirectory', 'additionalWorkingDirectories'].includes(key))) throw Error('Invalid trusted runtime context');
  if (typeof value.workingDirectory !== 'string' || !path.isAbsolute(value.workingDirectory)) throw Error('Runtime working directory must be absolute');
  // Native git and scratchpad helpers read the startup directory. Refuse a
  // contradictory context instead of announcing facts about a temporary cwd.
  if (path.resolve(value.workingDirectory) !== path.resolve(process.cwd())) throw Error('Runtime working directory differs from CLI startup directory');
  const additional = value.additionalWorkingDirectories ?? [];
  if (!Array.isArray(additional) || additional.some(item => typeof item !== 'string' || !path.isAbsolute(item))) throw Error('Invalid additional working directories');
  return { workingDirectory: value.workingDirectory, additionalWorkingDirectories: [...additional] };
}

export function contentDiagnostic(value) {
  // No matched text, paths, billing values or arbitrary properties reach logs.
  if (!object(value)) return;
  const { field, status, carrier } = value;
  if (![...environmentFields, ...billingFields].includes(field)) return;
  if (typeof status !== 'string' || !/^[a-z_]{1,40}$/.test(status)) return;
  if (typeof carrier !== 'string' || !/^[a-z_]{1,40}$/.test(carrier)) return;
  process.stderr.write('CCG_CONTENT_DIAGNOSTIC ' + JSON.stringify({ protocol: 'ccgateway.content.diagnostic.v1', field, status, carrier }) + '\n');
}
