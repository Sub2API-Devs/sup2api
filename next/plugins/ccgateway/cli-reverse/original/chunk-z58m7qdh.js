
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{B}from"./chunk-ndmse9kj.js";import{W}from"./chunk-x7vma94a.js";import{t}from"./chunk-cgr0tezp.js";import{l}from"./chunk-bbtre4r8.js";import{ei}from"./chunk-r5n7tcxe.js";var wcr="in-process";class Nhi{captured=null;cliOverride=null;setCliOverride(e){this.cliOverride=e}capture(e){this.captured=e}replaceWith(e){this.captured=e,this.cliOverride=null}}var ZFi=new W(()=>new Nhi);function o(){return ZFi.of(B().host)}function TVi(e){o().setCliOverride(e)}function les(){return o().cliOverride}function des(e){o().replaceWith(e),t(`[TeammateModeSnapshot] CLI override cleared, new mode: ${e}`)}function ces(){return o().captured!==null}function mQr(){let e=o();if(e.cliOverride)e.capture(e.cliOverride),t(`[TeammateModeSnapshot] Captured from CLI override: ${e.captured}`);else e.capture(ei("teammateMode",wcr).value),t(`[TeammateModeSnapshot] Captured from config: ${e.captured}`)}function D5t(){let e=o();if(e.captured===null)l(Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug")),mQr();return e.captured??wcr}
export{wcr,Nhi,ZFi,TVi,les,des,ces,mQr,D5t};
