/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/mux-proxy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
} from "path";
import { tmpdir, tmpdir as tmpdir_2, tmpdir as tmpdir_3, tmpdir as tmpdir_4, tmpdir as tmpdir_5 } from "os";
import {
  connect,
  connect as connect_2,
  createServer as createServer_4,
  createServer as createServer_5,
} from "net";
import { unlink } from "fs/promises";
import { rmSync, rmSync as rmSync_2, rmSync as rmSync_3, rmSync as rmSync_4 } from "fs";
import { zv } from "../utils/platform.js";
import { At } from "../utils/debug.js";
import { vE } from "./tls-terminate-proxy.js";
import { Mm } from "./sandbox-manager.js";

//@ chunk-fq0cr76a.js:703511-703545 esm-layout
var BH = new Set([4, 5]),
  UH = 1e4,
  FH = 0;
//@ chunk-fq0cr76a.js:703545-703628 esm-fingerprint
function MH() {
  return join_3(tmpdir_2(), `srt-mux-${process.pid}-${(FH++).toString(36)}.sock`);
}
//@ chunk-fq0cr76a.js:703628-705566 esm-fingerprint
function xR(e) {
  let n = e.firstByteTimeoutMs ?? UH,
    r = zv() === "windows",
    s,
    h,
    y = new Set();
  function b(w) {
    if (s === void 0 && h === void 0) {
      (At("mux: HTTP dispatch before backend bound; dropping", { level: "error" }), w.destroy());
      return;
    }
    let R = s ? connect_2(s) : connect_2(h, "127.0.0.1"),
      D = !1;
    (R.once("data", () => {
      D = !0;
    }),
      R.on("error", (O) => {
        if (D) {
          At(`mux: HTTP backend error: ${O.message}`);
          return;
        }
        let L = O.code ?? "ERR";
        if ((At(`mux: HTTP backend dial failed: ${O.message}`, { level: "error" }), !w.destroyed))
          w.end(`HTTP/1.1 502 Bad Gateway\r
Connection: close\r
\r
mux backend dial failed (${L})
`);
      }),
      w.on("error", () => R.destroy()),
      w.once("close", () => R.destroy()),
      R.once("close", () => vE(w, () => {})),
      w.pipe(R),
      R.pipe(w));
  }
  let S = createServer_4((w) => {
    (y.add(w),
      w.once("close", () => y.delete(w)),
      w.on("error", (D) => At(`mux: client socket error: ${D.message}`)));
    let R = setTimeout(() => {
      (At("mux: first-byte timeout; destroying connection"), w.destroy());
    }, n);
    if (typeof R.unref === "function") R.unref();
    w.once("readable", () => {
      clearTimeout(R);
      let read = w.read(1);
      if (!read || read.length === 0) {
        w.destroy();
        return;
      }
      if ((w.unshift(read), BH.has(read[0]))) e.handleSocksConnection(w);
      else b(w);
    });
  });
  return {
    server: S,
    getPort() {
      let address = S.address();
      return address && typeof address === "object" ? address.port : void 0;
    },
    async listenHttpBackend() {
      if (!r) {
        let R = MH();
        (await unlink(R).catch(() => {}),
          await new Promise((D, O) => {
            (e.httpServer.once("error", O),
              e.httpServer.listen(R, () => {
                (e.httpServer.removeListener("error", O), D());
              }));
          }),
          (s = R),
          At(`mux: HTTP backend listening on ${R}`));
        return;
      }
      await Mm(e.httpServer, (R) => e.httpServer.listen(R, "127.0.0.1"), e.httpBackendPortRange, new Set());
      let address = e.httpServer.address();
      return (
        (h = address && typeof address === "object" ? address.port : void 0),
        At(`mux: HTTP backend listening on 127.0.0.1:${h}`),
        h
      );
    },
    async close() {
      for (let w of y) w.destroy();
      if (
        (y.clear(),
        await new Promise((w) => S.close(() => w())),
        await new Promise((w) => e.httpServer.close(() => w())),
        s)
      )
        (await unlink(s).catch(() => {}), (s = void 0));
      h = void 0;
    },
    removeBackendSocketSync() {
      try {
        if (s) rmSync_2(s, { force: !0 });
      } catch {}
    },
    unref() {
      (S.unref(), e.httpServer.unref());
    },
  };
}

export { xR };
