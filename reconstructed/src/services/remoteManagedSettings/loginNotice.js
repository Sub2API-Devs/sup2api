/**
 * services/remoteManagedSettings/loginNotice.ts
 *
 * 2.1.316 新增：托管设置登录提示已读标记
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y5dttnq0.js (1)
 * attribution: placement 1
 */
import { saveGlobalConfig } from "../../utils/config.js";
import { logFeatureOkAsync } from "../analytics/featureTelemetry.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-y5dttnq0.js:368-650 placement
async function markManagedSettingsNoticeSeen(o, r, storageV5) {
  try {
    await Promise.all([
      saveGlobalConfig(
        (e) =>
          e.managedSettingsNoticeSeenOrg === o
            ? e
            : {
                ...e,
                managedSettingsNoticeSeenOrg: o,
              },
        storageV5,
      ),
      logFeatureOkAsync("remote_managed_settings_login_notice", {
        surface: fromEnum(r),
      }),
    ]);
  } catch (error) {
    logForDebugging(`managed settings notice: not recorded as shown: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
export { markManagedSettingsNoticeSeen };
