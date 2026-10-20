import path from 'node:path';

const environmentFields = [
  'platform_name', 'os_version', 'shell', 'primary_directory',
  'additional_directories', 'git_repository', 'worktree',
  'scratchpad_directory', 'github_cli', 'agent_proxy',
];
const billingFields = ['cc_version', 'cc_entrypoint'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// This envelope is built by the trusted Worker. User Messages JSON cannot
// supply it. Standalone request --build without a policy remains client-only.
export function validateRequestPolicy(value) {
  if (value === undefined) return {};
  if (!object(value) || value.contract_version !== 2) throw Error('Unsupported request policy contract');
  for (const key of Object.keys(value)) {
    if (!['contract_version', 'build_attachment_sources', 'build_billing_sources'].includes(key)) throw Error(`Unknown request policy key: ${key}`);
  }
  for (const [name, fields, sources] of [
    ['build_attachment_sources', environmentFields, ['client', 'worker', 'erase']],
    ['build_billing_sources', billingFields, ['client', 'worker']],
  ]) {
    const mapping = value[name];
    if (mapping === undefined) continue;
    if (!object(mapping)) throw Error(`${name} must be an object`);
    for (const [key, source] of Object.entries(mapping)) {
      if (!fields.includes(key) || !sources.includes(source)) throw Error(`Unsupported ${name}.${key}`);
    }
  }
  return structuredClone(value);
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
