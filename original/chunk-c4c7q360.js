
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{r5e}from"./chunk-wphjdnre.js";import{nt,Kr}from"./chunk-x6v6jz2y.js";import{So,h9}from"./chunk-pq6d88wp.js";import{_i,ko}from"./chunk-ey2qag4x.js";import{er,hi}from"./chunk-e6aww6q8.js";import{Is}from"./chunk-1kwgxcw6.js";import{R,y,j}from"./chunk-p86mcgbc.js";j();j();function h(){let[o]=y(()=>r5e()?h9:So);return o}function IDe(o,{selfOpened:u,hasOpeningGrace:r=u,onCancelled:S,owedAtExit:b}){let[C,s]=y(!1),n=R(!1),[c,E]=y(!1),e=R(!1),i=h(),x=Kr(r?i:null),d=!r||x,A=nt()?!0:!1,g=_i(i),{refusedWithin:v,noteRefused:w}=ko();function _(){if(r&&(g()||v(i)))return w(),!0;return!1}let a=Is(()=>{if(e.current)return;let t=n.current;n.current=!0;let l=S(t);if(l===void 0){e.current=!0;let p=b?.(t);if(p===void 0){hi(1);return}p.then((m)=>er(1,"other",m===void 0?void 0:{finalMessage:m}),()=>er(1));return}s(!0),f(l)},void 0,u&&!c);function D(){if(n.current||!d)return!1;return n.current=!0,s(!0),!0}function f(t){if(e.current)return;e.current=!0,E(!0),o(t)}return{choicesDisabled:!d&&!A,decided:C,take:D,refuseInput:_,settled:()=>e.current,handBack:f,exit:a,exitHintShowing:a.pending&&!c}}
export{IDe};
