
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Zn}from"./chunk-w10mwqe3.js";import{wc}from"./chunk-yqqx9rv1.js";function os(r,a){let{signalB:o,timeoutMs:i,refTimer:d}=a??{},n=Zn();if(r?.aborted||o?.aborted)return n.abort(),{signal:n.signal,cleanup:()=>{}};let e,t=()=>{if(e!==void 0)clearTimeout(e);n.abort()};if(i!==void 0){if(e=setTimeout(t,Math.min(i,wc)),!d)e.unref?.()}r?.addEventListener("abort",t),o?.addEventListener("abort",t);let m=()=>{if(e!==void 0)clearTimeout(e);r?.removeEventListener("abort",t),o?.removeEventListener("abort",t)};return{signal:n.signal,cleanup:m}}
export{os};
