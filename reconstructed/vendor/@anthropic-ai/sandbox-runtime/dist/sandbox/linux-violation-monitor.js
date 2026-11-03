/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/linux-violation-monitor.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: esm-fingerprint 1
 */
import {
  mkdtempSync,
  mkdtempSync as mkdtempSync_2,
  rmSync,
  rmSync as rmSync_2,
  rmSync as rmSync_3,
  rmSync as rmSync_4,
} from "fs";
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
  posix,
} from "path";
import { tmpdir, tmpdir as tmpdir_2, tmpdir as tmpdir_3, tmpdir as tmpdir_4, tmpdir as tmpdir_5 } from "os";
import {
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
} from "crypto";
import { createServer as createServer_4, createServer as createServer_5 } from "net";
import { createInterface } from "readline";
import { At } from "../utils/debug.js";
import { x4e, E8o } from "./sandbox-utils.js";
import { Eu } from "./sandbox-violation-store.js";

//@ chunk-fq0cr76a.js:776092-777559 esm-fingerprint
function R1(e, n) {
  let {
      allowWritePaths: allowWritePaths,
      denyWritePaths: denyWritePaths,
      ignoreViolations: ignoreViolations,
      resolveCommandText: resolveCommandText,
    } = n,
    b = mkdtempSync_2(join_8(tmpdir_5(), "srt-obs-")),
    S = join_8(b, `s${randomBytes_4(4).toString("hex")}.sock`),
    w = (J, ie) => J === ie || J.startsWith(ie.endsWith("/") ? ie : ie + "/"),
    R = (J) => {
      if (denyWritePaths.some((ie) => w(J, ie))) return !0;
      return !allowWritePaths.some((ie) => w(J, ie));
    },
    D = (J, ie) => {
      if (J.observe_init_error) {
        At(`[Sandbox Linux Monitor] observe filter not installed: ${J.observe_init_error}`);
        return;
      }
      if (typeof J.path !== "string") return;
      if (!J.path.startsWith("/")) return;
      let normalized = posix.normalize(J.path);
      if (!R(normalized)) return;
      let Se;
      if (ie)
        try {
          Se = resolveCommandText(x4e(ie));
        } catch {}
      if (Eu(normalized, Se, ignoreViolations)) return;
      let ue = {
        line: `deny ${J.syscall ?? "syscall"} ${normalized}`,
        command: Se,
        encodedCommand: ie,
        timestamp: new Date(),
      };
      e(ue);
    },
    O,
    promise = new Promise((J) => {
      O = J;
    }),
    V = S,
    K = createServer_5((J) => {
      let ie,
        ae = createInterface({ input: J });
      (ae.on("line", (Se) => {
        if (!Se) return;
        let ue;
        try {
          ue = JSON.parse(Se);
        } catch {
          return;
        }
        let me =
          ue.encodedCommand !== void 0 && Buffer.byteLength(ue.encodedCommand) <= E8o
            ? ue.encodedCommand
            : void 0;
        if (me && ie === void 0) ie = me;
        D(ue, ie ?? me);
      }),
        J.on("error", () => ae.close()),
        J.on("close", () => ae.close()));
    });
  (K.on("error", (J) => {
    (At(`[Sandbox Linux Monitor] listen failed: ${J.message} - violation monitoring disabled`, {
      level: "warn",
    }),
      (V = void 0),
      O());
  }),
    K.listen(S, () => O()));
  let q = new Set();
  return (
    K.on("connection", (J) => {
      (q.add(J), J.on("close", () => q.delete(J)));
    }),
    {
      get observeSocketPath() {
        return V;
      },
      ready: promise,
      stop: () => {
        At("[Sandbox Linux Monitor] stopping");
        for (let J of q) J.destroy();
        K.close();
        try {
          rmSync_3(b, { recursive: !0, force: !0 });
        } catch {}
      },
    }
  );
}

export { R1 };
