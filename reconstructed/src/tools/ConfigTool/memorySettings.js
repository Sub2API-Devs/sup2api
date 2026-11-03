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
import { M, zodStrictObject } from "../../../vendor/zod/v4/classic/schemas.js";
import { getInitialSettings_2, updateSettingsForSourceWithTransform } from "../../utils/settings/settings.js";
import { logEventAsync } from "../../services/analytics/index.js";

//@ chunk-vtcvnd20.js:2168-2427 placement
var accountMemoryModule = null,
  memorySettingsEditSchema = DoctorLazy(() => {
    let r = { autoMemoryEnabled: M().optional(), autoDreamEnabled: M().optional() };
    return zodStrictObject(r).refine((a) => Object.values(a).some((o) => o !== void 0), {
      error: `it sets none of ${new Intl.ListFormat("en", { type: "disjunction" }).format(Object.keys(r))}`,
    });
  });
/**
 * Config 工具修改记忆设置：校验至少设置 autoMemoryEnabled/autoDreamEnabled 之一，写入用户设置（账号记忆可拒绝提升），上报 tengu_auto_memory_toggled / tengu_auto_dream_toggled。
 */
//@ chunk-vtcvnd20.js:2427-3399 placement
async function applyMemorySettingsEdit(input, storage) {
  let safeParse = memorySettingsEditSchema().safeParse(input);
  if (!safeParse.success) {
    let t = safeParse.error.issues[0];
    return {
      ok: !1,
      error: t
        ? t.path.length > 0
          ? `Not a memory settings edit (${t.path.map(String).join(".")}: ${t.message}).`
          : `Not a memory settings edit: ${t.message}.`
        : "Not a memory settings edit.",
    };
  }
  let edit = safeParse.data,
    d = edit.autoDreamEnabled === !0 && getInitialSettings_2().autoDreamEnabled === void 0,
    written = edit,
    refusal,
    s = parseMemorySettingMode(edit.accountMemory),
    m = await updateSettingsForSourceWithTransform(
      "userSettings",
      (t) => {
        if (
          ((refusal = s === void 0 ? void 0 : accountMemoryModule?.accountSettingRaiseRefusal(t, s)),
          refusal !== void 0)
        )
          return null;
        return (
          (written = {
            ...edit,
            ...(edit.autoMemoryEnabled !== void 0 &&
              edit.accountMemory === void 0 &&
              accountMemoryModule?.accountKeyKeptWithAutoMemory(t, edit.autoMemoryEnabled)),
          }),
          written
        );
      },
      void 0,
      storage,
    );
  if (m.error) return { ok: !1, error: m.error.message };
  if (refusal !== void 0) return { ok: !1, error: refusal };
  if (typeof edit.autoMemoryEnabled === "boolean")
    await logEventAsync("tengu_auto_memory_toggled", { enabled: edit.autoMemoryEnabled });
  if (typeof edit.autoDreamEnabled === "boolean")
    await logEventAsync("tengu_auto_dream_toggled", { enabled: edit.autoDreamEnabled, is_first_enable: d });
  return { ok: !0, written: written };
}
/**
 * 记忆开关字符串转 on/read_only/off。
 */
//@ chunk-dcmhvw5a.js:189349-189583 placement
function parseMemorySettingMode(e) {
  let n = e?.trim().toLowerCase();
  if (n === void 0 || n === "") return;
  switch (n) {
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
