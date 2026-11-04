
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{dV,yre}from"./chunk-a16kyqj3.js";function s(r){return r!=null&&typeof r=="object"}var lV=s;var l=Array.isArray,ME=l;var y="[object Symbol]";function b(r){return typeof r=="symbol"||lV(r)&&yre(r)==y}var Ede=b;function u(r,t){var o=-1,i=r==null?0:r.length,n=Array(i);while(++o<i)n[o]=t(r[o],o,r);return n}var s9e=u;var a=1/0,e=dV?dV.prototype:void 0,f=e?e.toString:void 0;function m(r){if(typeof r=="string")return r;if(ME(r))return s9e(r,m)+"";if(Ede(r))return f?f.call(r):"";var t=r+"";return t=="0"&&1/r==-a?"-0":t}var p=m;function d(r){return r==null?"":p(r)}var vde=d;
export{s9e,ME,lV,Ede,vde};
