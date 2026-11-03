/**
 * jose/dist/node/esm/lib/check_key_type.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import {
  init_content_encryption,
  init_content_encryption_2,
  F,
} from "../../../webapi/lib/content_encryption.js";
import { init_import } from "../key/import.js";
import { Le, m } from "../../../browser/runtime/is_key_like.js";
import { Be } from "./invalid_key_input.js";

//@ chunk-2tyrgda4.js:17250-17284 esm-layout
var init_check_key_type = Xa(() => {
  init_content_encryption();
  init_import();
  init_content_encryption_2();
  F();
});
//@ chunk-2tyrgda4.js:17284-18405 esm-fingerprint
var symmetricTypeCheck = (alg, key) => {
  if (key instanceof Uint8Array) return;
  if (!Le(key)) throw TypeError(Be(alg, key, ...m, "Uint8Array"));
  if (key.type !== "secret")
    throw TypeError(`${m.join(" or ")} instances for symmetric algorithms must be of type "secret"`);
};
var asymmetricTypeCheck = (alg, key, usage) => {
  if (!Le(key)) throw TypeError(Be(alg, key, ...m));
  if (key.type === "secret")
    throw TypeError(`${m.join(" or ")} instances for asymmetric algorithms must not be of type "secret"`);
  if (usage === "sign" && key.type === "public")
    throw TypeError(`${m.join(" or ")} instances for asymmetric algorithm signing must be of type "private"`);
  if (usage === "decrypt" && key.type === "public")
    throw TypeError(
      `${m.join(" or ")} instances for asymmetric algorithm decryption must be of type "private"`,
    );
  if (key.algorithm && usage === "verify" && key.type === "private")
    throw TypeError(
      `${m.join(" or ")} instances for asymmetric algorithm verifying must be of type "public"`,
    );
  if (key.algorithm && usage === "encrypt" && key.type === "private")
    throw TypeError(
      `${m.join(" or ")} instances for asymmetric algorithm encryption must be of type "public"`,
    );
};
var Jr = (alg, key, usage) => {
  if (alg.startsWith("HS") || alg === "dir" || alg.startsWith("PBES2") || /^A\d{3}(?:GCM)?KW$/.test(alg))
    symmetricTypeCheck(alg, key);
  else asymmetricTypeCheck(alg, key, usage);
};
var z;
export { z, Jr, init_check_key_type };
