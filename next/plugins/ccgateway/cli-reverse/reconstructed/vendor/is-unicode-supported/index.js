/**
 * is-unicode-supported/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: is-unicode-supported@2.1.0
 * pieces: chunk-g66qqkzw.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import a from "process";

//@ chunk-g66qqkzw.js:687-1041 esm-fingerprint
function isUnicodeSupported() {
  let { env } = a;
  let { TERM, TERM_PROGRAM } = env;
  if (a.platform !== "win32") return TERM !== "linux";
  return (
    Boolean(env.WT_SESSION) ||
    Boolean(env.TERMINUS_SUBLIME) ||
    env.ConEmuTask === "{cmd::Cmder}" ||
    TERM_PROGRAM === "Terminus-Sublime" ||
    TERM_PROGRAM === "vscode" ||
    TERM === "xterm-256color" ||
    TERM === "alacritty" ||
    TERM === "rxvt-unicode" ||
    TERM === "rxvt-unicode-256color" ||
    env.TERMINAL_EMULATOR === "JetBrains-JediTerm"
  );
}
export { isUnicodeSupported };
