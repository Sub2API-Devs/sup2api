
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{b}from"./chunk-0wqny7vr.js";import{t}from"./chunk-cgr0tezp.js";import{a}from"./chunk-8kte1b36.js";import{yn}from"./chunk-x6v6jz2y.js";import{OJe}from"./chunk-bzr73sfg.js";import{ce,y,j}from"./chunk-p86mcgbc.js";j();function u(o,n,r){return o.isWindowActivation||i(n,r)}function eE(){let o=yn(),[n]=y(()=>o.now());return ce((r)=>{let e=o.now();if(!u(r,n,e))return!1;let c=r.isWindowActivation?b("window_activation"):b("mount_settle");return t(`Select: dropped stray click (${r.isWindowActivation?"window-activation click":`${e-n}ms after mount`})`),a("tengu_select_stray_click_dropped",{reason:c}),r.dropAsStray(),!0},[o,n])}function M0t(){let o=yn(),[n]=y(()=>o.now());return ce(()=>i(n,o.now()),[o,n])}function i(o,n){return n-o<OJe}
export{eE,M0t};
