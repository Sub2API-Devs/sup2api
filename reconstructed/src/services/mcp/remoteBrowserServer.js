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
  MEMORY_SERVER_ID,
  qPn,
  WIDGETS_SERVER_ID,
  A471CAF9_E559_5AD8_836C_4E5972877185,
  ARTIFACTS_SERVER_ID,
  DOCS_SERVER_ID,
} from "./firstPartyServerIds.js";
import { BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A } from "./ccrMetaMcp.js";
import { ge } from "../../utils/identity.js";

//@ chunk-1wpnxx5r.js:2276-2323 placement
var C = [
    MEMORY_SERVER_ID,
    qPn,
    WIDGETS_SERVER_ID,
    BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A,
    A471CAF9_E559_5AD8_836C_4E5972877185,
    ARTIFACTS_SERVER_ID,
  ],
  cyr = [...C, DOCS_SERVER_ID];
//@ chunk-1wpnxx5r.js:2323-2982 placement
var REMOTE_BROWSER_SERVER_NAME = "remote-browser",
  w = "972fb542-4a76-509d-9058-f6b954ee456c",
  FPn = [
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
  ],
  TENGU_RECURSIVE_PUDDLE = "tengu_recursive_puddle",
  M = null,
  y = ge({ on: !1 }, (e) => {
    e.on = !1;
  }),
  F = ge({ allowed: !1 }, (e) => {
    e.allowed = !1;
  });
//@ chunk-1wpnxx5r.js:2982-3027 placement
function setRemoteBrowserFlagReader(e) {
  let r = M;
  return ((M = e), (y.on = !1), r);
}
//@ chunk-1wpnxx5r.js:3027-3087 placement
function isRemoteBrowserEnabled() {
  let e = M?.(TENGU_RECURSIVE_PUDDLE, !1) === !0;
  if (e) y.on = !0;
  return e;
}
//@ chunk-1wpnxx5r.js:3087-3119 placement
function isRemoteBrowserAllowed() {
  return F.allowed;
}

export {
  REMOTE_BROWSER_SERVER_NAME,
  cyr,
  isRemoteBrowserEnabled,
  y,
  F,
  C,
  isRemoteBrowserAllowed,
  w,
  setRemoteBrowserFlagReader,
  FPn,
  TENGU_RECURSIVE_PUDDLE,
};
