/**
 * utils/settings/holdSettings.ts
 *
 * 2.1.316 新增。暂缓设置变更。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-w378kgd5.js (1)
 * attribution: placement 1
 */
import { freezeServedSettings } from "../../remote/tools/serve/servedSettingsFreeze.js";
import {
  recordServedUserRulesAtAttach,
  getHeldServedOwnerSettings,
} from "../../remote/tools/servedOwnerSettings.js";
import { createAcceptedSettingsStore } from "../../services/remoteTools/acceptedSettings.js";

//@ chunk-w378kgd5.js:5486-5568 placement
function freezeServedAndRecord(session) {
  try {
    let handle = freezeServedSettings(session);
    return {
      end: () => handle?.end(),
    };
  } finally {
    recordServedUserRulesAtAttach(createAcceptedSettingsStore());
    getHeldServedOwnerSettings();
  }
}
export { freezeServedAndRecord };
