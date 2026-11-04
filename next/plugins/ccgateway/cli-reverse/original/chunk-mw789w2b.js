
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{tt,B}from"./chunk-ndmse9kj.js";import{P,y,j}from"./chunk-p86mcgbc.js";j();var eHe="continue";function tjs(t,e,n){if(n&&e===eHe&&t===eHe+"/")return"/";if(e.startsWith("/")&&t.length===eHe.length+e.length+1&&t.startsWith(eHe+e))return t.slice(eHe.length);return t}class o{lastResult=null;listeners=new Set;inFlight=null}var l=new tt(()=>new o);function i(){return l.of(B())}function EHr(t){let e=i();e.lastResult=t;for(let n of e.listeners)n(t)}function njs(){return i().inFlight}function aIo(t){i().inFlight=t}function rjs(){EHr(null),i().inFlight=null}function ojs(){let[t,e]=y(()=>i().lastResult);return P(()=>{let n=i();return e(n.lastResult),n.listeners.add(e),()=>{n.listeners.delete(e)}},[]),t}
export{eHe,tjs,EHr,njs,aIo,rjs,ojs};
