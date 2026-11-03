/**
 * @modelcontextprotocol/sdk/dist/esm/experimental/tasks/helpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-zykv69v4.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-zykv69v4.js:28190-28439 esm-fingerprint
function kGn(e, t, r) {
  if (!e) throw Error(`${r} does not support task creation (required for ${t})`);
  switch (t) {
    case "tools/call":
      if (!e.tools?.call)
        throw Error(`${r} does not support task creation for tools/call (required for ${t})`);
      break;
    default:
      break;
  }
}
//@ chunk-zykv69v4.js:28439-28875 esm-fingerprint
function TGn(e, t, r) {
  if (!e) throw Error(`${r} does not support task creation (required for ${t})`);
  switch (t) {
    case "sampling/createMessage":
      if (!e.sampling?.createMessage)
        throw Error(`${r} does not support task creation for sampling/createMessage (required for ${t})`);
      break;
    case "elicitation/create":
      if (!e.elicitation?.create)
        throw Error(`${r} does not support task creation for elicitation/create (required for ${t})`);
      break;
    default:
      break;
  }
}

export { TGn, kGn };
