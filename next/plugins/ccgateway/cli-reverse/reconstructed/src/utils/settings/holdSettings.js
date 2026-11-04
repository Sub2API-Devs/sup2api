/**
 * utils/settings/holdSettings.ts
 *
 * 2.1.316 新增。暂缓设置变更。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xnr5zsa8.js (1)
 * attribution: placement 1
 */
import { freezeServedSettings } from "../../remote/tools/serve/servedSettingsFreeze.js";
import {
  recordServedUserRulesAtAttach,
  getHeldServedOwnerSettings,
} from "../../remote/tools/servedOwnerSettings.js";
import { createAcceptedSettingsStore } from "../../services/remoteTools/acceptedSettings.js";

//@ chunk-xnr5zsa8.js:5206-5288 placement
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
