
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{r$s}from"./chunk-5ythzcas.js";import{Fa}from"./chunk-t19sg4mz.js";function kHo(e){if(e)Fa.terminalFocusGainedAt=Date.now();if(!e&&Fa.terminalFocus==="blurred")return;Fa.terminalFocus=e?"focused":"blurred",r$s(e),Fa.terminalFocusChanged.emit()}function Uqe(){return Fa.terminalFocus!=="blurred"}function aae(){return Fa.terminalFocus}function MYs(){return Fa.terminalFocusGainedAt}function sFe(e){return Fa.terminalFocusChanged.subscribe(e)}
export{kHo,Uqe,aae,MYs,sFe};
