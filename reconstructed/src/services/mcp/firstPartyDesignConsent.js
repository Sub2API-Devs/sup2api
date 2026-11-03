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
import { ht } from "./cliOwnedClients.js";

//@ chunk-bz1hrmy7.js:227-238 placement
var s = null;
//@ chunk-bz1hrmy7.js:238-275 placement
function Czs(e) {
  let n = s;
  return ((s = e), n);
}
//@ chunk-bz1hrmy7.js:275-299 placement
function kYn() {
  return s;
}
//@ chunk-bz1hrmy7.js:299-310 placement
var r = null;
//@ chunk-bz1hrmy7.js:310-347 placement
function Rzs(e) {
  let n = r;
  return ((r = e), n);
}
//@ chunk-bz1hrmy7.js:347-393 placement
async function Foe(e) {
  return (await r?.(e)) ?? !1;
}
//@ chunk-bz1hrmy7.js:393-558 placement
class FirstPartyDesignNeedsConsentError extends Error {
  consent;
  constructor(e) {
    super("first-party design MCP server requires consent");
    this.consent = e;
    this.name = "FirstPartyDesignNeedsConsentError";
  }
}
//@ chunk-bz1hrmy7.js:558-569 placement
var t = null;
//@ chunk-bz1hrmy7.js:569-606 placement
function xzs(e) {
  let n = t;
  return ((t = e), n);
}
//@ chunk-bz1hrmy7.js:606-630 placement
function SZe() {
  return t;
}
/**
 * 首次扩展一方设计服务器授权范围时保存待显示的提示。
 */
//@ chunk-bz1hrmy7.js:630-754 placement
function noteScopeExpansion(e) {
  let n = ht();
  if (n.scopeExpansionDisclosed) return;
  ((n.scopeExpansionDisclosed = !0), (n.pendingScopeExpansionNotice = e));
}
/**
 * 取出并清除待显示的授权范围扩展提示。
 */
//@ chunk-bz1hrmy7.js:754-858 placement
function takeScopeExpansionNotice() {
  let e = ht(),
    pendingScopeExpansionNotice = e.pendingScopeExpansionNotice;
  return ((e.pendingScopeExpansionNotice = void 0), pendingScopeExpansionNotice);
}
//@ chunk-bz1hrmy7.js:858-920 placement
function Pzs() {
  let e = takeScopeExpansionNotice();
  if (e)
    process.stderr.write(`${e}
`);
}

export {
  kYn,
  noteScopeExpansion,
  SZe,
  FirstPartyDesignNeedsConsentError,
  Foe,
  takeScopeExpansionNotice,
  Czs,
  Rzs,
  xzs,
  Pzs,
};
