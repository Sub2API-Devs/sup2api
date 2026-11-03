/**
 * execa/lib/stream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: esm-layout 1
 */
import { readFileSync, readFileSync as readFileSync_2, createReadStream } from "fs";
import { setTimeout as Co } from "timers/promises";
import { Re } from "../../../runtime/bun-runtime.js";
import { yn } from "../../unresolved-cjs/index.js";
import { ae } from "./pipe.js";
import { Le } from "../../get-stream/source/string.js";
import { de } from "../../get-stream/source/buffer.js";

//@ chunk-m4p5zn6n.js:24564-25888 esm-layout
var Sn = Re(yn(), 1),
  xn = (e) => {
    if (e !== void 0) throw TypeError("The `input` and `inputFile` options cannot be both set.");
  },
  Eo = ({ input: input, inputFile: inputFile }) => {
    if (typeof inputFile !== "string") return input;
    return (xn(input), readFileSync(inputFile));
  },
  bn = (e) => {
    let n = Eo(e);
    if (ae(n)) throw TypeError("The `input` option cannot be a stream in sync mode");
    return n;
  },
  wo = ({ input: input, inputFile: inputFile }) => {
    if (typeof inputFile !== "string") return input;
    return (xn(input), createReadStream(inputFile));
  },
  Cn = (e, n) => {
    let r = wo(n);
    if (r === void 0) return;
    if (ae(r)) r.pipe(e.stdin);
    else e.stdin.end(r);
  },
  En = (e, { all: all }) => {
    if (!all || (!e.stdout && !e.stderr)) return;
    let r = Sn.default();
    if (e.stdout) r.add(e.stdout);
    if (e.stderr) r.add(e.stderr);
    return r;
  },
  je = async (e, n) => {
    if (!e || n === void 0) return;
    (await Co(0), e.destroy());
    try {
      return await n;
    } catch (error) {
      return error.bufferedData;
    }
  },
  Me = (e, { encoding: encoding, buffer: buffer, maxBuffer: maxBuffer }) => {
    if (!e || !buffer) return;
    if (encoding === "utf8" || encoding === "utf-8") return Le(e, { maxBuffer: maxBuffer });
    if (encoding === null || encoding === "buffer") return de(e, { maxBuffer: maxBuffer });
    return To(e, maxBuffer, encoding);
  },
  To = async (e, n, r) => (await de(e, { maxBuffer: n })).toString(r),
  wn = async (
    { stdout: stdout, stderr: stderr, all: all },
    { encoding: encoding, buffer: buffer, maxBuffer: maxBuffer },
    d,
  ) => {
    let l = Me(stdout, { encoding: encoding, buffer: buffer, maxBuffer: maxBuffer }),
      f = Me(stderr, { encoding: encoding, buffer: buffer, maxBuffer: maxBuffer }),
      p = Me(all, { encoding: encoding, buffer: buffer, maxBuffer: maxBuffer * 2 });
    try {
      return await Promise.all([d, l, f, p]);
    } catch (error) {
      return Promise.all([
        { error: error, signal: error.signal, timedOut: error.timedOut },
        je(stdout, l),
        je(stderr, f),
        je(all, p),
      ]);
    }
  };

export { wn, Cn, En, bn };
