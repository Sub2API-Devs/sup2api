/**
 * utils/claudeInChrome/browserPicker.ts
 *
 * 2.1.316 新增。Claude in Chrome 浏览器列表与切换：调用 list_connected_browsers/select_browser 并分类错误。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c8zmydch.js (12)
 * attribution: placement 12
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { jsonParse } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { cHo, h5n } from "./phoneAnswer.js";
import { callMcpTool } from "../../services/mcp/mcpWireUtils.js";

/**
 * 浏览器列表 schema 与提示
 */
//@ chunk-c8zmydch.js:452-954 placement
var browserListSchema = DoctorLazy(() =>
    u({ deviceId: o(), name: o().default("Browser"), osPlatform: o().optional() }),
  ),
  NO_BROWSERS_CONNECTED_TEXT =
    "No browsers are connected. Open Chrome with the Claude extension and make sure you're signed in to the same claude.ai account.",
  CHROME_UNREACHABLE_TEXT =
    "Chrome can't be reached right now. Make sure Chrome is open with the Claude extension and signed in to the same claude.ai account, then try again.",
  BROWSER_NOT_LISTED_TEXT =
    "That browser isn't connected right now. Make sure Chrome is open with the Claude extension on that computer, then try again.";
//@ chunk-c8zmydch.js:954-1175 placement
class BrowserNotListedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  listEmpty;
  namedABrowser;
  constructor(e, r) {
    if (r) super(BROWSER_NOT_LISTED_TEXT, "claude-in-chrome browser not listed");
    else super(BROWSER_NOT_LISTED_TEXT, "claude-in-chrome switch request named no browser");
    ((this.listEmpty = e), (this.namedABrowser = r));
  }
}
//@ chunk-c8zmydch.js:1175-1256 placement
class ChromeToolRefusedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e) {
    super(e, "claude-in-chrome tool call failed");
  }
}
//@ chunk-c8zmydch.js:1256-1296 placement
function isBrowserNotListed(e) {
  return e instanceof BrowserNotListedError;
}
//@ chunk-c8zmydch.js:1296-1583 placement
function logBrowserSwitchFailure(e) {
  if (isChromeBridgeUnreachable(e)) logFeatureSad("chrome_browser_picker", "bridge_unreachable");
  else if (isBrowserNotListed(e) && e.namedABrowser)
    logFeatureSad("chrome_browser_picker", "browser_not_listed", { list_empty: e.listEmpty });
  else if (isBrowserNotListed(e)) logFeatureBad("chrome_browser_picker", "invalid_request");
  else logFeatureBad("chrome_browser_picker", "select_failed");
}
//@ chunk-c8zmydch.js:1583-1669 placement
class ChromeBridgeUnreachableError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor() {
    super(CHROME_UNREACHABLE_TEXT, "claude-in-chrome bridge not reachable");
  }
}
//@ chunk-c8zmydch.js:1669-1709 placement
function isChromeBridgeUnreachable(e) {
  return e instanceof ChromeBridgeUnreachableError;
}
//@ chunk-c8zmydch.js:1709-1752 placement
function noBrowsersWhenUnreachable(e) {
  if (isChromeBridgeUnreachable(e)) return [];
  throw e;
}
//@ chunk-c8zmydch.js:1752-1909 placement
async function listConnectedBrowsers(e) {
  let r = await callChromeTool(e, "list_connected_browsers", {});
  if (!r) return [];
  let safeParse = A(browserListSchema()).safeParse(jsonParse(r));
  if (!safeParse.success) throw new BrowserListShapeError();
  return safeParse.data;
}
//@ chunk-c8zmydch.js:1909-2119 placement
class BrowserListShapeError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor() {
    super(
      "Claude Code couldn't read the browser list it got back. This is a bug on our side, not a problem with your setup.",
      "claude-in-chrome browser list in an unknown shape",
    );
  }
}
//@ chunk-c8zmydch.js:2119-2446 placement
async function selectBrowser(e, r, s = (n) => n) {
  if (typeof r !== "string" || r === "") throw new BrowserNotListedError(!1, !1);
  try {
    await s(callChromeTool(e, "select_browser", { deviceId: r }));
  } catch (error) {
    if (!(error instanceof ChromeToolRefusedError)) throw error;
    logForDebugging(`claude-in-chrome select_browser refused: ${error.message}`);
    let c = await s(listConnectedBrowsers(e));
    if (c.some((i) => i.deviceId === r)) throw error;
    throw new BrowserNotListedError(c.length === 0, !0);
  }
}
//@ chunk-c8zmydch.js:2446-2819 placement
async function callChromeTool(e, r, s) {
  let n = cHo(),
    c = await callMcpTool(e, { name: r, arguments: s }, void 0, !0),
    i = Array.isArray(c.content) ? c.content[0] : void 0,
    a = i && typeof i === "object" && "text" in i && typeof i.text === "string" ? i.text : void 0;
  if (cHo() !== n && a !== void 0 && h5n(a))
    throw (
      logForDebugging(`claude-in-chrome bridge not reachable: ${a}`, { level: "error" }),
      new ChromeBridgeUnreachableError()
    );
  if (c.isError) throw new ChromeToolRefusedError(a || `${r} failed`);
  return a;
}

export {
  listConnectedBrowsers,
  isChromeBridgeUnreachable,
  selectBrowser,
  logBrowserSwitchFailure,
  NO_BROWSERS_CONNECTED_TEXT,
};
