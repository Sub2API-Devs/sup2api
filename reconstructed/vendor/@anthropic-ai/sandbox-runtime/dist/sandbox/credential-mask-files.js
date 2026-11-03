/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/credential-mask-files.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (4)
 * attribution: esm-fingerprint 4
 */
import * as fsModule from "fs";
import * as fsModule_2 from "fs";
import * as fsModule_3 from "fs";
import * as fsModule_4 from "fs";
import * as fsModule_5 from "fs";
import * as fsModule_6 from "fs";
import * as fsModule_7 from "fs";
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
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { At } from "../utils/debug.js";
import { sS } from "./sandbox-utils.js";
import { vR, Vm, Gm, Wm } from "./credential-decode.js";

//@ chunk-fq0cr76a.js:707455-708365 esm-fingerprint
function $m(e, n, r, s = {}) {
  let regExp = new RegExp(n, "gd"),
    y = new Map(),
    b = new Map(),
    S = [];
  for (let D of e.matchAll(regExp)) {
    let O = D[1];
    if (O === void 0)
      throw Error(
        `extract pattern /${n}/ matched at offset ${D.index} but ` +
          "capture group 1 is undefined \u2014 group 1 must capture the " +
          "credential value on every match.",
      );
    if (O.length === 0) continue;
    let L = y.get(O);
    if (L === void 0) y.set(O, (L = y.size));
    let [V, K] = D.indices[1],
      q = r(O, L);
    if (!b.has(O)) b.set(O, q);
    S.push({ start: V, end: K, sentinel: q });
  }
  if (y.size === 0) return null;
  if (s.maskDuplicates) {
    let sorted = [...y.keys()].sort((O, L) => L.length - O.length);
    for (let O of sorted) {
      let L = b.get(O);
      if (L === O) continue;
      for (let index = e.indexOf(O); index !== -1; index = e.indexOf(O, index + 1)) {
        let K = index + O.length;
        if (S.some((q) => index < q.end && q.start < K)) continue;
        S.push({ start: index, end: K, sentinel: L });
      }
    }
    S.sort((O, L) => O.start - L.start);
  }
  let w = "",
    R = 0;
  for (let D of S) ((w += e.slice(R, D.start) + D.sentinel), (R = D.end));
  return { fakeContent: w + e.slice(R), captures: [...y.keys()] };
}
//@ chunk-fq0cr76a.js:709266-709281 esm-fingerprint
var FILE_URL_PREFIX = "file:";
//@ chunk-fq0cr76a.js:709281-709783 esm-fingerprint
class kE {
  constructor() {
    this.byKey = new Map();
  }
  write(e, n) {
    if (this.dir === void 0) this.dir = fsModule_2.mkdtempSync(join_4(tmpdir_3(), "srt-credmask-"));
    let r = this.byKey.get(e);
    if (r === void 0) ((r = join_4(this.dir, `${this.byKey.size}.fake`)), this.byKey.set(e, r));
    return (fsModule_2.rmSync(r, { force: !0 }), fsModule_2.writeFileSync(r, n, { mode: 384 }), r);
  }
  dispose() {
    if (this.dir !== void 0)
      try {
        fsModule_2.rmSync(this.dir, { recursive: !0, force: !0 });
      } catch (error) {
        At(`MaskedFileStore cleanup failed: ${error}`, { level: "error" });
      }
    ((this.dir = void 0), this.byKey.clear());
  }
  get dirPath() {
    return this.dir;
  }
}
//@ chunk-fq0cr76a.js:709783-712340 esm-fingerprint
function AR(e, n, r, s) {
  let h = [],
    y = [];
  for (let b of e) {
    if (b.mode !== "mask") continue;
    let S = sS(b.path, { literal: !0 }),
      w;
    try {
      if (fsModule_2.statSync(S).isDirectory()) {
        At(
          `[credential-mask] Skipping masked file entry that resolves to a directory: ${b.path} \u2014 use mode "deny" for directories.`,
          { level: "warn" },
        );
        continue;
      }
      let content = fsModule_2.readFileSync(S);
      if (((w = content.toString("utf8")), Buffer.byteLength(w, "utf8") !== content.length)) {
        At(
          `[credential-mask] Skipping masked file with non-UTF-8 content (binary credential files are not supported in mask mode): ${b.path}`,
          { level: "warn" },
        );
        continue;
      }
    } catch (error) {
      At(`[credential-mask] Skipping masked file (unreadable on host): ${b.path} \u2014 ${error.message}`);
      continue;
    }
    let R = b.injectHosts ?? n,
      D = FILE_URL_PREFIX + S,
      O;
    if (b.extract === void 0 && b.decode === void 0) O = r.register(D, w, R);
    else {
      let V = b.extract ?? vR,
        K = 0,
        q = $m(
          w,
          V,
          (Z, J) => {
            if (b.decode === "jwt" && !Vm(Z)) return Z;
            let ie = `${D}#${J}`;
            if (b.decode === "jwt" && b.maskClaims?.length) {
              let ae = Gm(Z, b.maskClaims, (ue, me) => r.register(`${D}#jwt${J}.${ue}`, me, R));
              if (ae === null)
                return (
                  At(
                    `[credential-mask] ${b.path}: verified JWT candidate has none of maskClaims ${JSON.stringify(b.maskClaims)} as ` +
                      "string claims \u2014 left unmasked.",
                  ),
                  Z
                );
              let filtered = b.maskClaims.filter((maskClaim) => !ae.claimSentinels.has(maskClaim));
              if (filtered.length > 0)
                At(
                  `[credential-mask] ${b.path}: maskClaims ${JSON.stringify(filtered)} absent or non-string in a ` +
                    "verified JWT \u2014 skipped.",
                );
              return (K++, r.registerWithSentinel(ie, ae.fakeToken, Z, R));
            }
            return (
              K++,
              b.decode === "jwt" ? r.registerWithSentinel(ie, Wm(randomUUID_2()), Z, R) : r.register(ie, Z, R)
            );
          },
          { maskDuplicates: b.maskDuplicates ?? !1 },
        );
      if (q === null || K === 0) {
        let Z =
            b.decode === "jwt"
              ? b.maskClaims?.length
                ? `decode "jwt" with pattern "${V}" that matched no verified JWT with maskable claims (maskClaims: ${JSON.stringify(b.maskClaims)})`
                : `decode "jwt" with pattern "${V}" that matched no verified JWT`
              : `extract pattern "${V}" that matched nothing`,
          J = b.onExtractNoMatch ?? "warn";
        if (J === "error")
          throw Error(
            `credentials.files entry "${b.path}": ${Z} (onExtractNoMatch: "error"). Fix the config, change to "warn"/"deny", or remove the entry.`,
          );
        if (J === "deny") {
          (At(`[credential-mask] ${b.path} has ${Z} \u2014 degrading to ` + 'mode "deny".', {
            level: "warn",
          }),
            y.push(S));
          continue;
        }
        let ie = `[sandbox-runtime] WARNING: credentials.files entry "${b.path}" has ${Z} in the file. The file is left UNPROTECTED (readable as-is inside the sandbox). Fix the config, set onExtractNoMatch to "deny" or "error", or remove the entry.`;
        (console.warn(ie), At(ie, { level: "warn" }));
        continue;
      }
      O = q.fakeContent;
    }
    let write = s.write(D, O);
    h.push({ realPath: S, fakePath: write });
  }
  return { binds: h, degradeToDenyPaths: y };
}

export { kE, AR, $m };
