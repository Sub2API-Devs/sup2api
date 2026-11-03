/**
 * services/oauth/callbackPage.ts
 *
 * 2.1.316 新增：OAuth 回调落地页 HTML。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cq05wh48.js (6)
 * attribution: placement 6
 */
import {
  renderPixelgramSvg,
  CHECKMARK_PIXELGRAM,
  BROKEN_LINK_PIXELGRAM,
  REDUCED_MOTION_CSS,
  embeddedFontFaces,
} from "./callbackPageAssets.js";
import { xHe } from "../../../vendor/es-toolkit/dist/string/escape.mjs";

//@ chunk-cq05wh48.js:14403-14474 placement
function y(e) {
  return renderPixelgramSvg(e, { cell: 4, color: "#D97757", passes: "indefinite" });
}
//@ chunk-cq05wh48.js:14474-14501 placement
function checkmarkSvg() {
  return y(CHECKMARK_PIXELGRAM);
}
//@ chunk-cq05wh48.js:14501-14528 placement
function brokenLinkSvg() {
  return y(BROKEN_LINK_PIXELGRAM);
}
//@ chunk-cq05wh48.js:14528-15810 placement
var CALLBACK_PAGE_CSS = `*,*::before,*::after{box-sizing:border-box}
:root{color-scheme:light dark;--bg:#f9f9f7;--card:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--line:rgba(11,11,11,.1)}
@media (prefers-color-scheme:dark){:root{--bg:#0b0b0b;--card:#151515;--ink:#f0efec;--ink2:#c3c2b7;--line:rgba(255,255,255,.1)}}
html,body{margin:0;padding:0}
body{min-height:100vh;background:var(--bg);color:var(--ink);font:15px/1.5 "anthropic-sans",ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;display:flex;align-items:center;justify-content:center;padding:48px 24px 14vh;text-align:center}
main{width:100%;max-width:480px}
.pixelgram{display:block;margin:27px auto 12px;overflow:visible}
${REDUCED_MOTION_CSS}
h1{font-family:"anthropic-serif",ui-serif,Charter,"Iowan Old Style",Georgia,serif;font-weight:400;font-size:34px;line-height:1.15;margin:0 0 10px;text-wrap:balance}
.sub{margin:0 auto;color:var(--ink2);max-width:44ch;text-wrap:pretty}
.detail{margin-top:24px;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 14px;font:12.5px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--ink2);text-align:left;overflow-wrap:anywhere}
@media (max-width:520px){h1{font-size:27px}body{padding:32px 20px 14vh}}`;
//@ chunk-cq05wh48.js:15810-16015 placement
function callbackPageBody(e) {
  let { ok: ok, heading: heading, message: message, detail: detail } = e,
    a = ok ? checkmarkSvg() : brokenLinkSvg(),
    o = detail ? `<div class="detail">${xHe(detail)}</div>` : "";
  return renderCallbackPage(`${a}<h1>${xHe(heading)}</h1><p class="sub">${xHe(message)}</p>${o}`, {
    closeTab: ok ? {} : !1,
  });
}
/**
 * OAuth 回调落地页 HTML：内嵌字体与像素动画、结果标题与说明，可选 nonce 脚本自动关闭标签页。
 */
//@ chunk-cq05wh48.js:16015-16431 placement
function renderCallbackPage(e, t) {
  let r = t.closeTab
    ? `<script${t.closeTab.nonce ? ` nonce="${t.closeTab.nonce}"` : ""}>setTimeout(function(){try{window.close()}catch(e){}},1500)</script>`
    : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Claude Code</title><style>${embeddedFontFaces()}
${CALLBACK_PAGE_CSS}${t.css ?? ""}</style></head><body><main>${e}</main>${r}</body></html>`;
}

export { callbackPageBody, renderCallbackPage, brokenLinkSvg, checkmarkSvg };
