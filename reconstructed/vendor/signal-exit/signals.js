/**
 * signal-exit/signals.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: signal-exit@4.1.0
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-bmbhxpfm.js:14791-15044 cjs-fingerprint
var Ve = x(function (nr, le) {
  le.exports = ["SIGABRT", "SIGALRM", "SIGHUP", "SIGINT", "SIGTERM"];
  le.exports.push("SIGVTALRM", "SIGXCPU", "SIGXFSZ", "SIGUSR2", "SIGTRAP", "SIGSYS", "SIGQUIT", "SIGIOT");
  le.exports.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT", "SIGUNUSED");
});

export { Ve };
