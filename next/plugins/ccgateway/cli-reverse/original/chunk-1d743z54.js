
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{nJe}from"./chunk-c391cw88.js";import{rt,Gr}from"./chunk-emhzq435.js";import{To,qJ}from"./chunk-y9ge9zb9.js";import{Js,_o}from"./chunk-p1yqn9ds.js";import{er,ea}from"./chunk-5xgkngpb.js";import{Ns}from"./chunk-2nf232h2.js";import{R,y,j}from"./chunk-zsz062c7.js";j();j();function h(){let[o]=y(()=>nJe()?qJ:To);return o}function T$e(o,{selfOpened:u,hasOpeningGrace:r=u,onCancelled:S,owedAtExit:b}){let[C,s]=y(!1),n=R(!1),[c,E]=y(!1),e=R(!1),i=h(),x=Gr(r?i:null),d=!r||x,A=rt()?!0:!1,g=Js(i),{refusedWithin:v,noteRefused:w}=_o();function _(){if(r&&(g()||v(i)))return w(),!0;return!1}let a=Ns(()=>{if(e.current)return;let t=n.current;n.current=!0;let l=S(t);if(l===void 0){e.current=!0;let p=b?.(t);if(p===void 0){ea(1);return}p.then((m)=>er(1,"other",m===void 0?void 0:{finalMessage:m}),()=>er(1));return}s(!0),f(l)},void 0,u&&!c);function D(){if(n.current||!d)return!1;return n.current=!0,s(!0),!0}function f(t){if(e.current)return;e.current=!0,E(!0),o(t)}return{choicesDisabled:!d&&!A,decided:C,take:D,refuseInput:_,settled:()=>e.current,handBack:f,exit:a,exitHintShowing:a.pending&&!c}}
export{T$e};
