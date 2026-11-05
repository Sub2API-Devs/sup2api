/**
 * jose/dist/node/esm/lib/check_key_type.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (3)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __esm } from "../../../../../../runtime/bun-runtime.js";
import {
  init_content_encryption,
  init_content_encryption_2,
  noopClaims,
} from "../../../webapi/lib/content_encryption.js";
import { init_import } from "../../../browser/runtime/jwk_to_key.js";
import {
  isKeyLike,
  keyObjectTypes,
  noopInit,
  init_is_key_like,
} from "../../../browser/runtime/is_key_like.js";
import { keyTypeError } from "./invalid_key_input.js";

//@ chunk-pd6th42n.js:17250-17284 esm-layout
var init_check_key_type = __esm(() => {
  init_content_encryption();
  init_import();
  init_content_encryption_2();
  noopClaims();
});
//@ chunk-pd6th42n.js:17284-18405 esm-fingerprint
var symmetricTypeCheck = (alg, key) => {
  if (key instanceof Uint8Array) return;
  if (!isKeyLike(key)) throw TypeError(keyTypeError(alg, key, ...keyObjectTypes, "Uint8Array"));
  if (key.type !== "secret")
    throw TypeError(
      `${keyObjectTypes.join(" or ")} instances for symmetric algorithms must be of type "secret"`,
    );
};
var asymmetricTypeCheck = (alg, key, usage) => {
  if (!isKeyLike(key)) throw TypeError(keyTypeError(alg, key, ...keyObjectTypes));
  if (key.type === "secret")
    throw TypeError(
      `${keyObjectTypes.join(" or ")} instances for asymmetric algorithms must not be of type "secret"`,
    );
  if (usage === "sign" && key.type === "public")
    throw TypeError(
      `${keyObjectTypes.join(" or ")} instances for asymmetric algorithm signing must be of type "private"`,
    );
  if (usage === "decrypt" && key.type === "public")
    throw TypeError(
      `${keyObjectTypes.join(" or ")} instances for asymmetric algorithm decryption must be of type "private"`,
    );
  if (key.algorithm && usage === "verify" && key.type === "private")
    throw TypeError(
      `${keyObjectTypes.join(" or ")} instances for asymmetric algorithm verifying must be of type "public"`,
    );
  if (key.algorithm && usage === "encrypt" && key.type === "private")
    throw TypeError(
      `${keyObjectTypes.join(" or ")} instances for asymmetric algorithm encryption must be of type "public"`,
    );
};
var checkKeyType = (alg, key, usage) => {
  if (alg.startsWith("HS") || alg === "dir" || alg.startsWith("PBES2") || /^A\d{3}(?:GCM)?KW$/.test(alg))
    symmetricTypeCheck(alg, key);
  else asymmetricTypeCheck(alg, key, usage);
};
var checkKeyTypeInit;
//@ chunk-pd6th42n.js:18405-18435 esm-layout (moved: shares a binding it assigns)
var init_encrypt = __esm(() => {
  noopInit();
  init_is_key_like();
  checkKeyTypeInit = checkKeyType;
});
export { init_check_key_type, init_encrypt, checkKeyTypeInit };
