/**
 * jose/dist/node/esm/lib/check_key_type.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { P, E, F } from "../../../webapi/lib/content_encryption.js";
import { Jt } from "../key/import.js";
import { Le, m } from "../../../browser/runtime/is_key_like.js";
import { Be } from "./invalid_key_input.js";

//@ chunk-2tyrgda4.js:17250-17284 esm-layout
var Qe = Xa(() => {
  P();
  Jt();
  E();
  F();
});
//@ chunk-2tyrgda4.js:17284-18405 esm-fingerprint
var vr = (e, t) => {
    if (t instanceof Uint8Array) return;
    if (!Le(t)) throw TypeError(Be(e, t, ...m, "Uint8Array"));
    if (t.type !== "secret")
      throw TypeError(`${m.join(" or ")} instances for symmetric algorithms must be of type "secret"`);
  },
  Pr = (e, t, r) => {
    if (!Le(t)) throw TypeError(Be(e, t, ...m));
    if (t.type === "secret")
      throw TypeError(`${m.join(" or ")} instances for asymmetric algorithms must not be of type "secret"`);
    if (r === "sign" && t.type === "public")
      throw TypeError(
        `${m.join(" or ")} instances for asymmetric algorithm signing must be of type "private"`,
      );
    if (r === "decrypt" && t.type === "public")
      throw TypeError(
        `${m.join(" or ")} instances for asymmetric algorithm decryption must be of type "private"`,
      );
    if (t.algorithm && r === "verify" && t.type === "private")
      throw TypeError(
        `${m.join(" or ")} instances for asymmetric algorithm verifying must be of type "public"`,
      );
    if (t.algorithm && r === "encrypt" && t.type === "private")
      throw TypeError(
        `${m.join(" or ")} instances for asymmetric algorithm encryption must be of type "public"`,
      );
  },
  Jr = (e, t, r) => {
    if (e.startsWith("HS") || e === "dir" || e.startsWith("PBES2") || /^A\d{3}(?:GCM)?KW$/.test(e)) vr(e, t);
    else Pr(e, t, r);
  },
  z;

export { z, Jr, Qe };
