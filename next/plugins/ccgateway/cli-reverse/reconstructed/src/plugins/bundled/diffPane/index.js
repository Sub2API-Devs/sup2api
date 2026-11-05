/**
 * plugins/bundled/diffPane/index.ts
 *
 * 2.1.316 新增：diff 面板插件注册与可用性。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-01kgd7xg.js (1), chunk-c7hntn0y.js (10)
 * attribution: placement 11
 */
import { isRemoteSessionAvailable } from "../../../remote/remoteMode.js";
import {
  getBuiltinPlugin,
  getBuiltinPlugins,
  registerBuiltinPlugin,
  builtinHooksModuleRef,
  getModsFolderPath,
} from "../../builtinPlugins.js";
import { CC_PLUGIN_DIFF } from "../diff/index.js";
import { isBundledModLive } from "../../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { __export } from "../../../../runtime/bun-runtime.js";
import { STORE_ID } from "./DiffPane.js";
import { availabilityFlag, diffPaneHooks } from "./hooks.js";
import { storeEventQueued, markPaneAsked, paneKey } from "../../functionHooks/panes.js";
import { STORE_OPEN_KEY, PANE_ID } from "./constants.js";
import { logForDebugging } from "../../../utils/debug.js";
import { getIsNonInteractiveSession } from "../../../bootstrap/state.js";
import { getSessionEntrypoint } from "../../../utils/sessionShape.js";
import { isDesktopNonClaudecode } from "../../../utils/entrypointKinds.js";
import {
  getFeatureValue_SESSION_PINNED,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../../services/analytics/growthbook.js";
import { getGlobalConfig } from "../../../utils/config.js";
import { diffPaneManifest } from "./manifest.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-01kgd7xg.js:63315-63421 placement
function isDiffPaneAvailable() {
  return (
    !isRemoteSessionAvailable() &&
    getBuiltinPlugin(CC_PLUGIN_DIFF)?.isAvailable?.() === true &&
    getBuiltinPlugins().enabled.some((plugin) => plugin.name === CC_PLUGIN_DIFF) &&
    isBundledModLive(CC_PLUGIN_DIFF)
  );
}
//@ chunk-c7hntn0y.js:5577-5587 placement
var diffPaneModule = {};
//@ chunk-c7hntn0y.js:5587-5847 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c7hntn0y.js:5587", () => {
  __export(diffPaneModule, {
    MOD_FOLDER: () => MOD_FOLDER,
    PLUGIN_DESCRIPTION: () => PLUGIN_DESCRIPTION,
    PLUGIN_NAME: () => CC_PLUGIN_DIFF,
    STORE_ID: () => STORE_ID,
    availabilityFlag: () => availabilityFlag,
    carryPanelPreference: () => carryPanelPreference,
    default: () => diffPaneModule,
    isAvailable: () => isAvailable,
    isOfferedNow: () => isOfferedNow,
    isOnByDefault: () => isOnByDefault,
    isPaneDrawable: () => isPaneDrawable,
    registerPlugin: () => registerPlugin,
  });
});
//@ chunk-c7hntn0y.js:64483-64710 placement (2.1.88 match: outputSchema, 0.36)
/**
 * 读取 diff 面板的已保存开关（缺省时把内置面板的旧偏好迁过来），开启时注册 diff 插件面板。与 ConfigTool 无关。
 */
async function carryPanelPreference(diffSidebarOpen) {
  let storedOpen = await storeEventQueued(
    {
      event: "get",
      key: STORE_OPEN_KEY,
    },
    STORE_ID,
  );
  if (storedOpen === undefined && diffSidebarOpen !== undefined) {
    await storeEventQueued(
      {
        event: "set",
        key: STORE_OPEN_KEY,
        value: diffSidebarOpen,
      },
      STORE_ID,
    );
    logForDebugging(`diff: carried the built-in panel's saved preference (${diffSidebarOpen})`);
  }
  if ((storedOpen ?? diffSidebarOpen) === true) markPaneAsked(paneKey(CC_PLUGIN_DIFF, PANE_ID));
}
//@ chunk-c7hntn0y.js:64710-64720 placement
var isOnByDefault = true;
//@ chunk-c7hntn0y.js:64720-64768 placement
var isPaneDrawable = () =>
  !getIsNonInteractiveSession() || (getSessionEntrypoint() === "claude-desktop" && isDesktopNonClaudecode());
//@ chunk-c7hntn0y.js:64768-64797 placement
var isAvailable = () => isPaneDrawable() && getFeatureValue_SESSION_PINNED(availabilityFlag(), isOnByDefault);
//@ chunk-c7hntn0y.js:64797-64825 placement
var isOfferedNow = () =>
  isPaneDrawable() && getFeatureValue_CACHED_MAY_BE_STALE(availabilityFlag(), isOnByDefault);
//@ chunk-c7hntn0y.js:64825-64839 placement
var MOD_FOLDER = "diff";
//@ chunk-c7hntn0y.js:64839-64971 placement
var PLUGIN_DESCRIPTION =
  "The diff panel as a plugin pane: /diff, the changed files and their hunks beside the transcript, refreshed as Claude edits";
//@ chunk-c7hntn0y.js:64971-65163 placement
function registerPlugin() {
  if (isOfferedNow())
    carryPanelPreference(getGlobalConfig().diffSidebarOpen).catch((error) =>
      logForDebugging(`diff: the panel preference did not carry: ${error}`),
    );
  registerBuiltinPlugin({
    name: CC_PLUGIN_DIFF,
    description: PLUGIN_DESCRIPTION,
    isAvailable,
    hooksModule: builtinHooksModuleRef(getModsFolderPath(MOD_FOLDER), diffPaneHooks, () =>
      diffPaneManifest(),
    ),
  });
}
export {
  isDiffPaneAvailable,
  MOD_FOLDER,
  PLUGIN_DESCRIPTION,
  carryPanelPreference,
  diffPaneModule,
  isAvailable,
  isOfferedNow,
  isOnByDefault,
  isPaneDrawable,
  registerPlugin,
};
