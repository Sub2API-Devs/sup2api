
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{f4,_ie}from"./chunk-j8tzrgex.js";function s(r){return r!=null&&typeof r=="object"}var u4=s;var l=Array.isArray,Ew=l;var y="[object Symbol]";function b(r){return typeof r=="symbol"||u4(r)&&_ie(r)==y}var P6=b;function u(r,t){var o=-1,i=r==null?0:r.length,n=Array(i);while(++o<i)n[o]=t(r[o],o,r);return n}var Kfe=u;var a=1/0,e=f4?f4.prototype:void 0,f=e?e.toString:void 0;function m(r){if(typeof r=="string")return r;if(Ew(r))return Kfe(r,m)+"";if(P6(r))return f?f.call(r):"";var t=r+"";return t=="0"&&1/r==-a?"-0":t}var p=m;function d(r){return r==null?"":p(r)}var Vfe=d;
export{Kfe,Ew,u4,P6,Vfe};
