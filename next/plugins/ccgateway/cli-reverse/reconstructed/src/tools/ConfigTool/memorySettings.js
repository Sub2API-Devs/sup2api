/**
 * tools/ConfigTool/memorySettings.ts
 *
 * 2.1.316 新增：Config 工具记忆设置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (1), chunk-vtcvnd20.js (2)
 * attribution: placement 3
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { booleanSchema, zodStrictObject } from "../../../vendor/zod/v4/classic/schemas.js";
import { getInitialSettings_2, updateSettingsForSourceWithTransform } from "../../utils/settings/settings.js";
import { logEventAsync } from "../../services/analytics/index.js";

//@ chunk-dcmhvw5a.js:189349-189583 placement
/**
 * 记忆开关字符串转 on/read_only/off。
 */
function parseMemorySettingMode(accountMemory) {
  let lower = accountMemory?.trim().toLowerCase();
  if (lower === undefined || lower === "") return;
  switch (lower) {
    case "on":
    case "1":
    case "true":
    case "yes":
    case "enabled":
      return "on";
    case "read-only":
    case "read_only":
    case "readonly":
      return "read_only";
    default:
      return "off";
  }
}
//@ chunk-vtcvnd20.js:2168-2427 placement
var accountMemoryModule = null;
var memorySettingsEditSchema = DoctorLazy(() => {
  let shape = {
    autoMemoryEnabled: booleanSchema().optional(),
    autoDreamEnabled: booleanSchema().optional(),
  };
  return zodStrictObject(shape).refine(
    (edit) => Object.values(edit).some((fieldValue) => fieldValue !== undefined),
    {
      error: `it sets none of ${new Intl.ListFormat("en", {
        type: "disjunction",
      }).format(Object.keys(shape))}`,
    },
  );
});
//@ chunk-vtcvnd20.js:2427-3399 placement
/**
 * Config 工具修改记忆设置：校验至少设置 autoMemoryEnabled/autoDreamEnabled 之一，写入用户设置（账号记忆可拒绝提升），上报 tengu_auto_memory_toggled / tengu_auto_dream_toggled。
 */
async function applyMemorySettingsEdit(input, storage) {
  let parseResult = memorySettingsEditSchema().safeParse(input);
  if (!parseResult.success) {
    let issue = parseResult.error.issues[0];
    return {
      ok: false,
      error: issue
        ? issue.path.length > 0
          ? `Not a memory settings edit (${issue.path.map(String).join(".")}: ${issue.message}).`
          : `Not a memory settings edit: ${issue.message}.`
        : "Not a memory settings edit.",
    };
  }
  let edit = parseResult.data;
  let isFirstEnable = edit.autoDreamEnabled === true && getInitialSettings_2().autoDreamEnabled === undefined;
  let written = edit;
  let refusal;
  let memorySettingMode = parseMemorySettingMode(edit.accountMemory);
  let updateResult = await updateSettingsForSourceWithTransform(
    "userSettings",
    (settings) => {
      refusal =
        memorySettingMode === undefined
          ? undefined
          : accountMemoryModule?.accountSettingRaiseRefusal(settings, memorySettingMode);
      if (refusal !== undefined) return null;
      written = {
        ...edit,
        ...(edit.autoMemoryEnabled !== undefined &&
          edit.accountMemory === undefined &&
          accountMemoryModule?.accountKeyKeptWithAutoMemory(settings, edit.autoMemoryEnabled)),
      };
      return written;
    },
    undefined,
    storage,
  );
  if (updateResult.error)
    return {
      ok: false,
      error: updateResult.error.message,
    };
  if (refusal !== undefined)
    return {
      ok: false,
      error: refusal,
    };
  if (typeof edit.autoMemoryEnabled === "boolean")
    await logEventAsync("tengu_auto_memory_toggled", {
      enabled: edit.autoMemoryEnabled,
    });
  if (typeof edit.autoDreamEnabled === "boolean")
    await logEventAsync("tengu_auto_dream_toggled", {
      enabled: edit.autoDreamEnabled,
      is_first_enable: isFirstEnable,
    });
  return {
    ok: true,
    written,
  };
}
export { applyMemorySettingsEdit };
