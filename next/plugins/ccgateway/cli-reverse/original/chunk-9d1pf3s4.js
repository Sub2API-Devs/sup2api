
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{I}from"./chunk-znrryf4y.js";import{OOt}from"./chunk-dcmhvw5a.js";import{constants as t}from"fs";function $c(){return t.O_RDONLY|zq()}function zq(){if(I()==="windows")return 0;return t.O_NOFOLLOW|t.O_NONBLOCK}var kii=["aarch64-apple-darwin","x86_64-apple-darwin","aarch64-unknown-linux-musl","x86_64-unknown-linux-musl"];function o(r,e){let n=e==="arm64"?"aarch64":e==="x64"?"x86_64":void 0;if(n===void 0)return;switch(r){case"macos":return`${n}-apple-darwin`;case"linux":case"wsl":return`${n}-unknown-linux-musl`;case"windows":case"unknown":return}}var q5r=268435456;function Y5r(){return o(I(),"x64")}function Ukt(r,e){if(r.endsWith(`-${e}`)){let n=r.slice(0,-(e.length+1));return OOt.test(n)?n:void 0}if(r.endsWith(`-${e}.exe`)){let n=r.slice(0,-(e.length+5));return OOt.test(n)?`${n}.exe`:void 0}return}
export{$c,zq,kii,q5r,Y5r,Ukt};
