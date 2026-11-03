/**
 * is-unicode-supported/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: is-unicode-supported@2.1.0
 * pieces: chunk-6rgkw5kr.js (1)
 * attribution: esm-fingerprint 1
 */
import a from "process";

//@ chunk-6rgkw5kr.js:687-1041 esm-fingerprint
function isUnicodeSupported() {
  let { env: env } = a,
    { TERM: TERM, TERM_PROGRAM: TERM_PROGRAM } = env;
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
