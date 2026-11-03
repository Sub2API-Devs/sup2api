/**
 * utils/claudeInChrome/chromeSettingsEdit.ts
 *
 * 2.1.316 新增：Claude in Chrome 设置修改
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q3c4ejfd.js (2)
 * attribution: placement 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { saveGlobalConfigDurably } from "../config.js";

//@ chunk-q3c4ejfd.js:3352-3392 placement
var n = DoctorLazy(() => zodStrictObject({ enabledByDefault: M() }));
//@ chunk-q3c4ejfd.js:3392-3877 placement
async function applyChromeSettingsEdit(o, a) {
  let safeParse = n().safeParse(o);
  if (!safeParse.success) {
    let e = safeParse.error.issues[0];
    return {
      ok: !1,
      error: e
        ? `Not a Claude in Chrome settings edit (${e.path.map(String).join(".") || "edit"}: ${e.message}).`
        : "Not a Claude in Chrome settings edit.",
    };
  }
  let r = safeParse.data;
  if (
    !(await saveGlobalConfigDurably(
      (e) =>
        e.claudeInChromeDefaultEnabled === r.enabledByDefault
          ? e
          : { ...e, claudeInChromeDefaultEnabled: r.enabledByDefault },
      a,
    ))
  )
    return { ok: !1, error: "The Claude in Chrome setting may not have been saved." };
  return { ok: !0, written: r };
}
