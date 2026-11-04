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
import { zodStrictObject, booleanSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { saveGlobalConfigDurably } from "../config.js";

//@ chunk-q3c4ejfd.js:3352-3392 placement
/**
 * Chrome 设置的输入 schema（enabledByDefault）。
 */
var chromeSettingsInputSchema = DoctorLazy(() =>
  zodStrictObject({
    enabledByDefault: booleanSchema(),
  }),
);
//@ chunk-q3c4ejfd.js:3392-3877 placement
async function applyChromeSettingsEdit(input, storageV5) {
  let parseResult = chromeSettingsInputSchema().safeParse(input);
  if (!parseResult.success) {
    let issue = parseResult.error.issues[0];
    return {
      ok: false,
      error: issue
        ? `Not a Claude in Chrome settings edit (${issue.path.map(String).join(".") || "edit"}: ${issue.message}).`
        : "Not a Claude in Chrome settings edit.",
    };
  }
  let edit = parseResult.data;
  if (
    !(await saveGlobalConfigDurably(
      (config) =>
        config.claudeInChromeDefaultEnabled === edit.enabledByDefault
          ? config
          : {
              ...config,
              claudeInChromeDefaultEnabled: edit.enabledByDefault,
            },
      storageV5,
    ))
  )
    return {
      ok: false,
      error: "The Claude in Chrome setting may not have been saved.",
    };
  return {
    ok: true,
    written: edit,
  };
}
export { applyChromeSettingsEdit };
