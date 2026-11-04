/**
 * services/mcp/firstPartyDesignConsent.ts
 *
 * 2.1.316 新增：第一方 Design MCP 服务器的同意处理与作用域扩展提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bz1hrmy7.js (13)
 * attribution: placement 13
 */
import { getCliOwnedState } from "./cliOwnedClients.js";

//@ chunk-bz1hrmy7.js:227-238 placement
/**
 * 当前的脚手架（初始化）解析函数。
 */
var scaffoldResolver = null;
//@ chunk-bz1hrmy7.js:238-275 placement
/**
 * 替换脚手架解析函数并返回旧的。
 */
function swapScaffoldResolver(designUnavailableReason) {
  let previous = scaffoldResolver;
  scaffoldResolver = designUnavailableReason;
  return previous;
}
//@ chunk-bz1hrmy7.js:275-299 placement
/**
 * 取当前脚手架解析函数。
 */
function getScaffoldResolver() {
  return scaffoldResolver;
}
//@ chunk-bz1hrmy7.js:299-310 placement
/**
 * 当前的同意检查函数。
 */
var consentChecker = null;
//@ chunk-bz1hrmy7.js:310-347 placement
/**
 * 替换同意检查函数并返回旧的。
 */
function swapConsentChecker(checker) {
  let previous = consentChecker;
  consentChecker = checker;
  return previous;
}
//@ chunk-bz1hrmy7.js:347-393 placement
/**
 * 调用同意检查函数（未设置时视为不同意）。
 */
async function checkConsent(credentials) {
  return (await consentChecker?.(credentials)) ?? false;
}
//@ chunk-bz1hrmy7.js:393-558 placement
class FirstPartyDesignNeedsConsentError extends Error {
  consent;
  constructor(consent) {
    super("first-party design MCP server requires consent");
    this.consent = consent;
    this.name = "FirstPartyDesignNeedsConsentError";
  }
}
//@ chunk-bz1hrmy7.js:558-569 placement
/**
 * 当前待显示的授权扩展开启提示。
 */
var noticeHolder = null;
//@ chunk-bz1hrmy7.js:569-606 placement
/**
 * 替换提示持有者并返回旧的。
 */
function swapNoticeHolder(holder) {
  let previous = noticeHolder;
  noticeHolder = holder;
  return previous;
}
//@ chunk-bz1hrmy7.js:606-630 placement
/**
 * 取待显示的授权扩展提示（不清空）。
 */
function peekScopeExpansionNotice() {
  return noticeHolder;
}
//@ chunk-bz1hrmy7.js:630-754 placement
/**
 * 首次扩展一方设计服务器授权范围时保存待显示的提示。
 */
function noteScopeExpansion(pendingScopeExpansionNotice) {
  let cliOwnedState = getCliOwnedState();
  if (cliOwnedState.scopeExpansionDisclosed) return;
  cliOwnedState.scopeExpansionDisclosed = true;
  cliOwnedState.pendingScopeExpansionNotice = pendingScopeExpansionNotice;
}
//@ chunk-bz1hrmy7.js:754-858 placement
/**
 * 取出并清除待显示的授权范围扩展提示。
 */
function takeScopeExpansionNotice() {
  let cliOwnedState = getCliOwnedState();
  let pendingScopeExpansionNotice = cliOwnedState.pendingScopeExpansionNotice;
  cliOwnedState.pendingScopeExpansionNotice = undefined;
  return pendingScopeExpansionNotice;
}
//@ chunk-bz1hrmy7.js:858-920 placement
/**
 * 把待显示的授权扩展提示写到 stderr。
 */
function printScopeExpansionNotice() {
  let notice = takeScopeExpansionNotice();
  if (notice)
    process.stderr.write(`${notice}
`);
}
export {
  getScaffoldResolver,
  noteScopeExpansion,
  peekScopeExpansionNotice,
  FirstPartyDesignNeedsConsentError,
  checkConsent,
  takeScopeExpansionNotice,
  swapScaffoldResolver,
  swapConsentChecker,
  swapNoticeHolder,
  printScopeExpansionNotice,
};
