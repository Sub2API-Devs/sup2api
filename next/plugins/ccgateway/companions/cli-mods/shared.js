// Small helpers the support modules share. Installed beside them as
// ccgateway-shared.js (patch-cli-2.1.304.cjs); no native bindings.

// A plain JSON object: not null, not an array.
export const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// Message or system content as blocks: a string is one text block.
export const toBlocks = content => typeof content === 'string' ? [{ type: 'text', text: content }] : content;

// The texts of a system: the string itself, or each block's text (undefined
// for a block without one).
export const systemTexts = system => typeof system === 'string' ? [system] : Array.isArray(system) ? system.map(block => block?.text) : [];

// The policy's field names: the environment fields build may take from the
// Worker or erase (build_attachment_sources), and the billing header fields
// the Worker may own (build_billing_sources).
export const environmentFields = ['platform_name', 'os_version', 'shell', 'primary_directory', 'additional_directories', 'git_repository', 'worktree', 'scratchpad_directory', 'github_cli', 'agent_proxy'];
export const billingFields = ['cc_version', 'cc_entrypoint'];

// UUIDs: any version, either case; and the lowercase version 4 form.
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// splice applies edits { start, end = start, value, order = 0 } to text, from
// the last start backwards; at one start, the higher order goes in first, so
// it ends up after the lower ones. Edits do not overlap.
export function splice(text, edits) {
  return [...edits].sort((a, b) => b.start - a.start || (b.order ?? 0) - (a.order ?? 0))
    .reduce((out, edit) => out.slice(0, edit.start) + edit.value + out.slice(edit.end ?? edit.start), text);
}
