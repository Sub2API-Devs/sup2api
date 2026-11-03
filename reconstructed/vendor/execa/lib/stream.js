/**
 * execa/lib/stream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: esm-layout 1
 */
import { readFileSync, createReadStream } from "fs";
import { setTimeout as Co } from "timers/promises";
import { Re } from "../../../runtime/bun-runtime.js";
import { yn } from "../../unresolved-cjs/index.js";
import { ae } from "./pipe.js";
import { Le } from "../../get-stream/source/string.js";
import { getStreamAsBuffer } from "../../get-stream/source/buffer.js";

//@ chunk-m4p5zn6n.js:24564-25888 esm-layout
var Sn = Re(yn(), 1);
var validateInputOptions = (input) => {
  if (input !== undefined) throw TypeError("The `input` and `inputFile` options cannot be both set.");
};
var getInputSync = ({ input, inputFile }) => {
  if (typeof inputFile !== "string") return input;
  validateInputOptions(input);
  return readFileSync(inputFile);
};
var handleInputSync = (options) => {
  let input = getInputSync(options);
  if (ae(input)) throw TypeError("The `input` option cannot be a stream in sync mode");
  return input;
};
var getInput = ({ input, inputFile }) => {
  if (typeof inputFile !== "string") return input;
  validateInputOptions(input);
  return createReadStream(inputFile);
};
var handleInput = (spawned, options) => {
  let input = getInput(options);
  if (input === undefined) return;
  if (ae(input)) input.pipe(spawned.stdin);
  else spawned.stdin.end(input);
};
var makeAllStream = (spawned, { all }) => {
  if (!all || (!spawned.stdout && !spawned.stderr)) return;
  let mixed = Sn.default();
  if (spawned.stdout) mixed.add(spawned.stdout);
  if (spawned.stderr) mixed.add(spawned.stderr);
  return mixed;
};
var getBufferedData = async (stream, streamPromise) => {
  if (!stream || streamPromise === undefined) return;
  await Co(0);
  stream.destroy();
  try {
    return await streamPromise;
  } catch (error) {
    return error.bufferedData;
  }
};
var getStreamPromise = (stream, { encoding, buffer, maxBuffer }) => {
  if (!stream || !buffer) return;
  if (encoding === "utf8" || encoding === "utf-8")
    return Le(stream, {
      maxBuffer,
    });
  if (encoding === null || encoding === "buffer")
    return getStreamAsBuffer(stream, {
      maxBuffer,
    });
  return applyEncoding(stream, maxBuffer, encoding);
};
var applyEncoding = async (stream, maxBuffer, encoding) =>
  (
    await getStreamAsBuffer(stream, {
      maxBuffer,
    })
  ).toString(encoding);
var getSpawnedResult = async ({ stdout, stderr, all }, { encoding, buffer, maxBuffer }, processDone) => {
  let stdoutPromise = getStreamPromise(stdout, {
    encoding,
    buffer,
    maxBuffer,
  });
  let stderrPromise = getStreamPromise(stderr, {
    encoding,
    buffer,
    maxBuffer,
  });
  let allPromise = getStreamPromise(all, {
    encoding,
    buffer,
    maxBuffer: maxBuffer * 2,
  });
  try {
    return await Promise.all([processDone, stdoutPromise, stderrPromise, allPromise]);
  } catch (error) {
    return Promise.all([
      {
        error,
        signal: error.signal,
        timedOut: error.timedOut,
      },
      getBufferedData(stdout, stdoutPromise),
      getBufferedData(stderr, stderrPromise),
      getBufferedData(all, allPromise),
    ]);
  }
};
export { getSpawnedResult, handleInput, makeAllStream, handleInputSync };
