
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{F}from"./chunk-5ythzcas.js";import{W}from"./chunk-0qffyy27.js";import{t}from"./chunk-6hadbefe.js";import{a}from"./chunk-my2r02mp.js";import{gi}from"./chunk-9yhyzdpp.js";var JSr="in-process";class vLi{captured=null;cliOverride=null;setCliOverride(e){this.cliOverride=e}capture(e){this.captured=e}replaceWith(e){this.captured=e,this.cliOverride=null}}var YZi=new W(()=>new vLi);function o(){return YZi.of(F().host)}function cca(e){o().setCliOverride(e)}function lgs(){return o().cliOverride}function dgs(e){o().replaceWith(e),t(`[TeammateModeSnapshot] CLI override cleared, new mode: ${e}`)}function cgs(){return o().captured!==null}function Pco(){let e=o();if(e.cliOverride)e.capture(e.cliOverride),t(`[TeammateModeSnapshot] Captured from CLI override: ${e.captured}`);else e.capture(gi("teammateMode",JSr).value),t(`[TeammateModeSnapshot] Captured from config: ${e.captured}`)}function hQt(){let e=o();if(e.captured===null)a(Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug")),Pco();return e.captured??JSr}
export{JSr,vLi,YZi,cca,lgs,dgs,cgs,Pco,hQt};
