
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{p}from"./chunk-k6qypy1d.js";import{xu,Awr}from"./chunk-k0v80sg8.js";import{M1}from"./chunk-ja2b06pa.js";import{o,oe,u,T}from"./chunk-m4y44r15.js";var RPe="anthropic/devicePassthrough",fJi=["get_device_info","device_bash","list_devices","sync_files"],r="Claude_Browser__",n=128,XKr=1,_=p(()=>u({v:T(XKr),tool:o().min(1).max(n),target:oe().optional()}));function Kgn(t){let e=_().safeParse(t);if(!e.success)return;let s=Awr(e.data.target);return s===void 0?void 0:{v:e.data.v,tool:xu(e.data.tool,n),target:s}}var a=fJi.map(M1),c=`${M1(r)}_`;function i(t){let e=`${M1(t)}_`;return a.some((s)=>e.startsWith(`${s}_`))}var E=new Set(["computer_request_access","computer_request_full_control","device_request_folder_access","device_request_delete_permission"]),l="device_bash";function JKr(t){let e=t.lastIndexOf("__"),s=e===-1?t:t.slice(e+2);return E.has(s)||t===l||`__${t}`.endsWith("__Claude_Browser__request_access")}function R4e(t){return!i(t)&&!`${M1(t)}_`.startsWith(c)&&!JKr(t)}
export{RPe,fJi,XKr,Kgn,JKr,R4e};
