// The request command's entry. The patched CLI entry (request-entry.inc.js) is
// a stub that loads this module only for `claude request` and gives it the
// command's arguments and CC's settings source, so an ordinary CLI start never
// loads the request tree.
import { encodeErrorFrame, policyDeniedFrame } from './ccgateway-request-error.js';

// runRequest is `claude request`, and the exit code it returns is the
// command's. CC's own fast-path policy decides first; a refusal is a 403 error
// frame. It is written synchronously because the entry exits as soon as this
// returns. The native bindings (request-natives.js) load only once the request
// is accepted.
export async function runRequest(args, settings) {
  const { loadFastPathPolicy } = await import('./chunk-3nrrbnwj.js');
  if (await loadFastPathPolicy(settings)) {
    process.stderr.write(encodeErrorFrame(policyDeniedFrame()));
    return 1;
  }
  const { runRequestCommand } = await import('./ccgateway-request-command.js');
  const { agentNative, directBuild, identityBuild, oauthBeta } = await import('./ccgateway-request-natives.js');
  return runRequestCommand(args, { agentNative, directBuild, identityBuild, oauthBeta });
}
