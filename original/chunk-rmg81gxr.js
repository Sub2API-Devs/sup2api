
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{p}from"./chunk-kpa9nk58.js";import{ou,Tlr}from"./chunk-g54kbxqw.js";import{_Y}from"./chunk-knckn35w.js";import{o,oe,u,T}from"./chunk-7vp249v4.js";var gAe="anthropic/devicePassthrough",T0i=["get_device_info","device_bash","list_devices","sync_files"],r="Claude_Browser__",n=128,mHr=1,_=p(()=>u({v:T(mHr),tool:o().min(1).max(n),target:oe().optional()}));function kan(t){let e=_().safeParse(t);if(!e.success)return;let s=Tlr(e.data.target);return s===void 0?void 0:{v:e.data.v,tool:ou(e.data.tool,n),target:s}}var a=T0i.map(_Y),c=`${_Y(r)}_`;function i(t){let e=`${_Y(t)}_`;return a.some((s)=>e.startsWith(`${s}_`))}var E=new Set(["computer_request_access","computer_request_full_control","device_request_folder_access","device_request_delete_permission"]),l="device_bash";function gHr(t){let e=t.lastIndexOf("__"),s=e===-1?t:t.slice(e+2);return E.has(s)||t===l||`__${t}`.endsWith("__Claude_Browser__request_access")}function XGe(t){return!i(t)&&!`${_Y(t)}_`.startsWith(c)&&!gHr(t)}
export{gAe,T0i,mHr,kan,gHr,XGe};
