
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{P}from"./chunk-bb1a67wr.js";import{iFt}from"./chunk-z20c443b.js";import{constants as t}from"fs";function ou(){return t.O_RDONLY|YY()}function YY(){if(P()==="windows")return 0;return t.O_NOFOLLOW|t.O_NONBLOCK}var ZCi=["aarch64-apple-darwin","x86_64-apple-darwin","aarch64-unknown-linux-musl","x86_64-unknown-linux-musl"];function o(r,e){let n=e==="arm64"?"aarch64":e==="x64"?"x86_64":void 0;if(n===void 0)return;switch(r){case"macos":return`${n}-apple-darwin`;case"linux":case"wsl":return`${n}-unknown-linux-musl`;case"windows":case"unknown":return}}var Aso=268435456;function Cso(){return o(P(),"x64")}function rOt(r,e){if(r.endsWith(`-${e}`)){let n=r.slice(0,-(e.length+1));return iFt.test(n)?n:void 0}if(r.endsWith(`-${e}.exe`)){let n=r.slice(0,-(e.length+5));return iFt.test(n)?`${n}.exe`:void 0}return}
export{ou,YY,ZCi,Aso,Cso,rOt};
