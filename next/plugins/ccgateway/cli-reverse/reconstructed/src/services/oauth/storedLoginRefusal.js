/**
 * services/oauth/storedLoginRefusal.ts
 *
 * 2.1.316 新增：保存的登录被拒绝使用（StoredLoginHeldBackError）及原因文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7c9mpntp.js (2)
 * attribution: placement 2
 */
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7c9mpntp.js:226-523 placement
var HELD_BACK_REASON_TEXT = {
  admin:
    "Your organization's settings need an update. Ask your administrator to fix the API key helper configuration.",
  settings_unloaded:
    "Couldn't load your organization's settings. Check your connection, then restart Claude Code.",
  restart_needed: "Restart Claude Code to finish signing in.",
};
//@ chunk-7c9mpntp.js:523-660 placement
let StoredLoginHeldBackError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7c9mpntp.js:523", () => {
  StoredLoginHeldBackError = class StoredLoginHeldBackError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(reason) {
      super(HELD_BACK_REASON_TEXT[reason], "Stored login held back", `stored_login_refused_${reason}`);
      this.name = "StoredLoginHeldBackError";
    }
  };
});
export { StoredLoginHeldBackError };
