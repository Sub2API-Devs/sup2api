
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Vi}from"./chunk-x6v6jz2y.js";import{y,j}from"./chunk-p86mcgbc.js";j();var mM=150,So=250;var h9=600;function ta(e,t,n=mM){let o=e()-t;if(o>=0)return o<n;return t<=Date.now()}function xUn(e){let t=Vi(),[n,o]=y(()=>({key:e,at:Date.now()}));if(n.key!==e)o({key:e,at:Date.now()});return function(){return ta(t,n.at)}}
export{mM,So,h9,ta,xUn};
