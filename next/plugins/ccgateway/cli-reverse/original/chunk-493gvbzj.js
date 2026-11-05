
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{b}from"./chunk-vwtpw18x.js";import{t}from"./chunk-6hadbefe.js";import{l}from"./chunk-nkv493nm.js";import{kn}from"./chunk-emhzq435.js";import{Nnt}from"./chunk-2avr6cej.js";import{ue,y,j}from"./chunk-zsz062c7.js";j();function u(o,n,r){return o.isWindowActivation||i(n,r)}function QE(){let o=kn(),[n]=y(()=>o.now());return ue((r)=>{let e=o.now();if(!u(r,n,e))return!1;let c=r.isWindowActivation?b("window_activation"):b("mount_settle");return t(`Select: dropped stray click (${r.isWindowActivation?"window-activation click":`${e-n}ms after mount`})`),l("tengu_select_stray_click_dropped",{reason:c}),r.dropAsStray(),!0},[o,n])}function dWt(){let o=kn(),[n]=y(()=>o.now());return ue(()=>i(n,o.now()),[o,n])}function i(o,n){return n-o<Nnt}
export{QE,dWt};
