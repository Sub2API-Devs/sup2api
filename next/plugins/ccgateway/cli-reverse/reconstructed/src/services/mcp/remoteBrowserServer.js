/**
 * services/mcp/remoteBrowserServer.ts
 *
 * 2.1.316 新增：remote-browser MCP 服务器常量与开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1wpnxx5r.js (5)
 * attribution: placement 5
 */
import {
  MEMORY_SERVER_ID_2,
  MEMORY_SERVER_ID,
  WIDGETS_SERVER_ID,
  A471CAF9_E559_5AD8_836C_4E5972877185,
  ARTIFACTS_SERVER_ID,
  DOCS_SERVER_ID,
} from "./firstPartyServerIds.js";
import { BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A } from "./ccrMetaMcp.js";
import { identity } from "../../utils/identity.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1wpnxx5r.js:2276-2323 placement
/**
 * 上述列表加上 docs 服务器 id。
 */
var RESERVED_BROWSER_SERVER_IDS; // deferred: uses MEMORY_SERVER_ID_2 (./firstPartyServerIds.js) of its import cycle while loading; runs once the cycle is complete
var RESERVED_SERVER_IDS_WITH_DOCS;
deferInit("chunk-1wpnxx5r.js:2276", () => {
  RESERVED_BROWSER_SERVER_IDS = [
    MEMORY_SERVER_ID_2,
    MEMORY_SERVER_ID,
    WIDGETS_SERVER_ID,
    BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A,
    A471CAF9_E559_5AD8_836C_4E5972877185,
    ARTIFACTS_SERVER_ID,
  ];
  RESERVED_SERVER_IDS_WITH_DOCS = [...RESERVED_BROWSER_SERVER_IDS, DOCS_SERVER_ID];
});
//@ chunk-1wpnxx5r.js:2323-2982 placement
/**
 * 远程浏览器是否被允许的状态。
 */
var REMOTE_BROWSER_SERVER_NAME; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REMOTE_BROWSER_SERVER_ID;
var REMOTE_BROWSER_TOOL_NAMES;
var TENGU_RECURSIVE_PUDDLE;
var remoteBrowserFlagReader;
var remoteBrowserEnabledState;
var remoteBrowserAllowedState;
deferInit("chunk-1wpnxx5r.js:2323", () => {
  REMOTE_BROWSER_SERVER_NAME = "remote-browser";
  REMOTE_BROWSER_SERVER_ID = "972fb542-4a76-509d-9058-f6b954ee456c";
  REMOTE_BROWSER_TOOL_NAMES = [
    "browser_click",
    "browser_close_file_chooser",
    "browser_close_window",
    "browser_drag",
    "browser_drag_to_offset",
    "browser_file_upload",
    "browser_fill_form",
    "browser_handle_dialog",
    "browser_hover",
    "browser_list_downloads",
    "browser_navigate",
    "browser_navigate_back",
    "browser_open_window",
    "browser_press_and_hold",
    "browser_press_key",
    "browser_resize",
    "browser_save_download",
    "browser_select_option",
    "browser_snapshot",
    "browser_tabs",
    "browser_take_screenshot",
    "browser_type",
    "browser_wait_for",
  ];
  TENGU_RECURSIVE_PUDDLE = "tengu_recursive_puddle";
  remoteBrowserFlagReader = null;
  remoteBrowserEnabledState = identity(
    {
      on: false,
    },
    (state) => {
      state.on = false;
    },
  );
  remoteBrowserAllowedState = identity(
    {
      allowed: false,
    },
    (state) => {
      state.allowed = false;
    },
  );
});
//@ chunk-1wpnxx5r.js:2982-3027 placement
function setRemoteBrowserFlagReader(getFeatureValue_CACHED_MAY_BE_STALE) {
  let previous = remoteBrowserFlagReader;
  remoteBrowserFlagReader = getFeatureValue_CACHED_MAY_BE_STALE;
  remoteBrowserEnabledState.on = false;
  return previous;
}
//@ chunk-1wpnxx5r.js:3027-3087 placement
function isRemoteBrowserEnabled() {
  let on = remoteBrowserFlagReader?.(TENGU_RECURSIVE_PUDDLE, false) === true;
  if (on) remoteBrowserEnabledState.on = true;
  return on;
}
//@ chunk-1wpnxx5r.js:3087-3119 placement
function isRemoteBrowserAllowed() {
  return remoteBrowserAllowedState.allowed;
}
export {
  REMOTE_BROWSER_SERVER_NAME,
  RESERVED_SERVER_IDS_WITH_DOCS,
  isRemoteBrowserEnabled,
  remoteBrowserEnabledState,
  remoteBrowserAllowedState,
  RESERVED_BROWSER_SERVER_IDS,
  isRemoteBrowserAllowed,
  REMOTE_BROWSER_SERVER_ID,
  setRemoteBrowserFlagReader,
  REMOTE_BROWSER_TOOL_NAMES,
  TENGU_RECURSIVE_PUDDLE,
};
