/**
 * execa/lib/pipe.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { ChildProcess } from "child_process";
import { createWriteStream } from "fs";

//@ chunk-m4p5zn6n.js:20393-20473 esm-layout
function isStream(stream) {
  return stream !== null && typeof stream === "object" && typeof stream.pipe === "function";
}
//@ chunk-m4p5zn6n.js:20473-20584 esm-layout
function isWritableStream(stream) {
  return (
    isStream(stream) &&
    stream.writable !== false &&
    typeof stream._write === "function" &&
    typeof stream._writableState === "object"
  );
}
//@ chunk-m4p5zn6n.js:20584-21132 esm-fingerprint
var isChildProcessPromise = (target) => target instanceof ChildProcess && typeof target.then === "function";
var pipeToTarget = (spawned, streamName, target) => {
  if (typeof target === "string") {
    spawned[streamName].pipe(createWriteStream(target));
    return spawned;
  }
  if (isWritableStream(target)) {
    spawned[streamName].pipe(target);
    return spawned;
  }
  if (!isChildProcessPromise(target))
    throw TypeError("The second argument must be a string, a stream or an Execa child process.");
  if (!isWritableStream(target.stdin)) throw TypeError("The target child process's stdin must be available.");
  spawned[streamName].pipe(target.stdin);
  return target;
};
var addPipeMethods = (spawned) => {
  if (spawned.stdout !== null) spawned.pipeStdout = pipeToTarget.bind(undefined, spawned, "stdout");
  if (spawned.stderr !== null) spawned.pipeStderr = pipeToTarget.bind(undefined, spawned, "stderr");
  if (spawned.all !== undefined) spawned.pipeAll = pipeToTarget.bind(undefined, spawned, "all");
};
export { addPipeMethods, isStream };
