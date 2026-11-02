
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{bSs}from"./chunk-ndmse9kj.js";import{wa}from"./chunk-yetvfygf.js";function ySo(e){if(e)wa.terminalFocusGainedAt=Date.now();if(!e&&wa.terminalFocus==="blurred")return;wa.terminalFocus=e?"focused":"blurred",bSs(e),wa.terminalFocusChanged.emit()}function rGe(){return wa.terminalFocus!=="blurred"}function aoe(){return wa.terminalFocus}function EMs(){return wa.terminalFocusGainedAt}function oLe(e){return wa.terminalFocusChanged.subscribe(e)}
export{ySo,rGe,aoe,EMs,oLe};
