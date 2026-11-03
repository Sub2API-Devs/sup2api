/**
 * commands/keybindings/keybindings.ts
 *
 * /keybindings 实现：不存在时创建快捷键文件并用编辑器打开
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/keybindings/keybindings.ts
 * pieces: chunk-1nat7wre.js (1)
 * attribution: fingerprint 1
 */
import { dirname } from "path";
import { writeFile } from "fs/promises";
import {
  isKeybindingCustomizationEnabled,
  getKeybindingsPath,
  keybindingsStoreKey,
} from "../../keybindings/loadUserBindings.js";
import { generateKeybindingsTemplate } from "../../keybindings/template.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "../../utils/errors.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { editFileInEditor } from "../../utils/promptEditor.js";
import { isSafeMode, getSafeModeExitHint } from "../../utils/envUtils.js";

//@ chunk-1nat7wre.js:4514-5347 fingerprint = call (0.623)
/**
 * /keybindings 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(args, context) {
  if (!isKeybindingCustomizationEnabled())
    return {
      type: "text",
      value: "Keybinding customization is disabled in this environment.",
    };
  let keybindingsPath = getKeybindingsPath();
  let i = false;
  let storageV5 = context.storageV5;
  if (storageV5) {
    let o = await storageV5.write(keybindingsStoreKey, generateKeybindingsTemplate(), {
      precondition: {
        type: "ifAbsent",
      },
    });
    if (!o.ok)
      if (o.error.code === "AlreadyExists") i = true;
      else
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `keybindings template write failed: ${formatStorageError(o.error)}`,
          "keybindings template write failed",
        );
  } else {
    await getFsImplementation().mkdir(dirname(keybindingsPath));
    try {
      await writeFile(keybindingsPath, generateKeybindingsTemplate(), {
        encoding: "utf-8",
        flag: "wx",
      });
    } catch (e) {
      if (getErrnoCode(e) === "EEXIST") i = true;
      else throw e;
    }
  }
  let result = await editFileInEditor(keybindingsPath);
  if (result.error)
    return {
      type: "text",
      value: `${i ? "Opened" : "Created"} ${keybindingsPath}. ${result.error}`,
    };
  let d = isSafeMode()
    ? ` (Safe mode: custom keybindings are disabled this session \u2014 changes take effect after you ${getSafeModeExitHint()}.)`
    : "";
  return {
    type: "text",
    value: i
      ? `Opened ${keybindingsPath} in your editor.${d}`
      : `Created ${keybindingsPath} with template. Opened in your editor.${d}`,
  };
}
