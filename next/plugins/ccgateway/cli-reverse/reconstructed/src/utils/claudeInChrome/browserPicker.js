/**
 * utils/claudeInChrome/browserPicker.ts
 *
 * 2.1.316 新增。Claude in Chrome 浏览器列表与切换：调用 list_connected_browsers/select_browser 并分类错误。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-g3p0yaze.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { jsonParse } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { disconnectedAnswerCount, hasDisconnectedAnswerText } from "./phoneAnswer.js";
import { callMcpTool } from "../../services/mcp/mcpWireUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-g3p0yaze.js:452-954 placement
/**
 * 浏览器列表 schema 与提示
 */
var browserListSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var NO_BROWSERS_CONNECTED_TEXT;
var CHROME_UNREACHABLE_TEXT;
var BROWSER_NOT_LISTED_TEXT;
deferInit("chunk-g3p0yaze.js:452", () => {
  browserListSchema = DoctorLazy(() =>
    objectSchema({
      deviceId: stringSchema(),
      name: stringSchema().default("Browser"),
      osPlatform: stringSchema().optional(),
    }),
  );
  NO_BROWSERS_CONNECTED_TEXT =
    "No browsers are connected. Open Chrome with the Claude extension and make sure you're signed in to the same claude.ai account.";
  CHROME_UNREACHABLE_TEXT =
    "Chrome can't be reached right now. Make sure Chrome is open with the Claude extension and signed in to the same claude.ai account, then try again.";
  BROWSER_NOT_LISTED_TEXT =
    "That browser isn't connected right now. Make sure Chrome is open with the Claude extension on that computer, then try again.";
});
//@ chunk-g3p0yaze.js:954-1175 placement
let BrowserNotListedError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g3p0yaze.js:954", () => {
  BrowserNotListedError = class BrowserNotListedError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    listEmpty;
    namedABrowser;
    constructor(listEmpty, namedABrowser) {
      if (namedABrowser) super(BROWSER_NOT_LISTED_TEXT, "claude-in-chrome browser not listed");
      else super(BROWSER_NOT_LISTED_TEXT, "claude-in-chrome switch request named no browser");
      this.listEmpty = listEmpty;
      this.namedABrowser = namedABrowser;
    }
  };
});
//@ chunk-g3p0yaze.js:1175-1256 placement
let ChromeToolRefusedError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g3p0yaze.js:1175", () => {
  ChromeToolRefusedError = class ChromeToolRefusedError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(message) {
      super(message, "claude-in-chrome tool call failed");
    }
  };
});
//@ chunk-g3p0yaze.js:1256-1296 placement
function isBrowserNotListed(error) {
  return error instanceof BrowserNotListedError;
}
//@ chunk-g3p0yaze.js:1296-1583 placement
function logBrowserSwitchFailure(error) {
  if (isChromeBridgeUnreachable(error)) logFeatureSad("chrome_browser_picker", "bridge_unreachable");
  else if (isBrowserNotListed(error) && error.namedABrowser)
    logFeatureSad("chrome_browser_picker", "browser_not_listed", {
      list_empty: error.listEmpty,
    });
  else if (isBrowserNotListed(error)) logFeatureBad("chrome_browser_picker", "invalid_request");
  else logFeatureBad("chrome_browser_picker", "select_failed");
}
//@ chunk-g3p0yaze.js:1583-1669 placement
let ChromeBridgeUnreachableError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g3p0yaze.js:1583", () => {
  ChromeBridgeUnreachableError = class ChromeBridgeUnreachableError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor() {
      super(CHROME_UNREACHABLE_TEXT, "claude-in-chrome bridge not reachable");
    }
  };
});
//@ chunk-g3p0yaze.js:1669-1709 placement
function isChromeBridgeUnreachable(error) {
  return error instanceof ChromeBridgeUnreachableError;
}
//@ chunk-g3p0yaze.js:1709-1752 placement
function noBrowsersWhenUnreachable(error) {
  if (isChromeBridgeUnreachable(error)) return [];
  throw error;
}
//@ chunk-g3p0yaze.js:1752-1909 placement
async function listConnectedBrowsers(chromeClient) {
  let rawText = await callChromeTool(chromeClient, "list_connected_browsers", {});
  if (!rawText) return [];
  let parseResult = array(browserListSchema()).safeParse(jsonParse(rawText));
  if (!parseResult.success) throw new BrowserListShapeError();
  return parseResult.data;
}
//@ chunk-g3p0yaze.js:1909-2119 placement
let BrowserListShapeError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g3p0yaze.js:1909", () => {
  BrowserListShapeError = class BrowserListShapeError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor() {
      super(
        "Claude Code couldn't read the browser list it got back. This is a bug on our side, not a problem with your setup.",
        "claude-in-chrome browser list in an unknown shape",
      );
    }
  };
});
//@ chunk-g3p0yaze.js:2119-2446 placement
async function selectBrowser(chromeClient, deviceId, withRetry = (promise) => promise) {
  if (typeof deviceId !== "string" || deviceId === "") throw new BrowserNotListedError(false, false);
  try {
    await withRetry(
      callChromeTool(chromeClient, "select_browser", {
        deviceId,
      }),
    );
  } catch (error) {
    if (!(error instanceof ChromeToolRefusedError)) throw error;
    logForDebugging(`claude-in-chrome select_browser refused: ${error.message}`);
    let browsers = await withRetry(listConnectedBrowsers(chromeClient));
    if (browsers.some((browser) => browser.deviceId === deviceId)) throw error;
    throw new BrowserNotListedError(browsers.length === 0, true);
  }
}
//@ chunk-g3p0yaze.js:2446-2819 placement
async function callChromeTool(chromeClient, toolName, args) {
  let disconnectCountBefore = disconnectedAnswerCount();
  let result = await callMcpTool(
    chromeClient,
    {
      name: toolName,
      arguments: args,
    },
    undefined,
    true,
  );
  let firstBlock = Array.isArray(result.content) ? result.content[0] : undefined;
  let text =
    firstBlock &&
    typeof firstBlock === "object" &&
    "text" in firstBlock &&
    typeof firstBlock.text === "string"
      ? firstBlock.text
      : undefined;
  if (
    disconnectedAnswerCount() !== disconnectCountBefore &&
    text !== undefined &&
    hasDisconnectedAnswerText(text)
  ) {
    logForDebugging(`claude-in-chrome bridge not reachable: ${text}`, {
      level: "error",
    });
    throw new ChromeBridgeUnreachableError();
  }
  if (result.isError) throw new ChromeToolRefusedError(text || `${toolName} failed`);
  return text;
}
export {
  listConnectedBrowsers,
  isChromeBridgeUnreachable,
  selectBrowser,
  logBrowserSwitchFailure,
  NO_BROWSERS_CONNECTED_TEXT,
  BROWSER_NOT_LISTED_TEXT,
  BrowserListShapeError,
  BrowserNotListedError,
  CHROME_UNREACHABLE_TEXT,
  ChromeBridgeUnreachableError,
  ChromeToolRefusedError,
  callChromeTool,
  isBrowserNotListed,
  noBrowsersWhenUnreachable,
};
