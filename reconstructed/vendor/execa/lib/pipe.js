/**
 * execa/lib/pipe.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { ChildProcess, ChildProcess as ChildProcess_2 } from "child_process";
import { createWriteStream } from "fs";

//@ chunk-m4p5zn6n.js:20393-20473 esm-layout
function ae(e) {
  return e !== null && typeof e === "object" && typeof e.pipe === "function";
}
//@ chunk-m4p5zn6n.js:20473-20584 esm-layout
function Ae(e) {
  return ae(e) && e.writable !== !1 && typeof e._write === "function" && typeof e._writableState === "object";
}
//@ chunk-m4p5zn6n.js:20584-21132 esm-fingerprint
var Jr = (e) => e instanceof ChildProcess && typeof e.then === "function",
  _e = (e, n, r) => {
    if (typeof r === "string") return (e[n].pipe(createWriteStream(r)), e);
    if (Ae(r)) return (e[n].pipe(r), e);
    if (!Jr(r)) throw TypeError("The second argument must be a string, a stream or an Execa child process.");
    if (!Ae(r.stdin)) throw TypeError("The target child process's stdin must be available.");
    return (e[n].pipe(r.stdin), r);
  },
  sn = (e) => {
    if (e.stdout !== null) e.pipeStdout = _e.bind(void 0, e, "stdout");
    if (e.stderr !== null) e.pipeStderr = _e.bind(void 0, e, "stderr");
    if (e.all !== void 0) e.pipeAll = _e.bind(void 0, e, "all");
  };

export { sn, ae };
