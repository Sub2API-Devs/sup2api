
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{F}from"./chunk-5ythzcas.js";import{M,y,j}from"./chunk-zsz062c7.js";import{Je}from"./chunk-r4yj9pae.js";j();var XFe="continue";function Oei(t,e,n){if(n&&e===XFe&&t===XFe+"/")return"/";if(e.startsWith("/")&&t.length===XFe.length+e.length+1&&t.startsWith(XFe+e))return t.slice(XFe.length);return t}class o{lastResult=null;listeners=new Set;inFlight=null}var l=new Je(()=>new o);function i(){return l.of(F())}function aVr(t){let e=i();e.lastResult=t;for(let n of e.listeners)n(t)}function Mei(){return i().inFlight}function lzo(t){i().inFlight=t}function Dei(){aVr(null),i().inFlight=null}function Lei(){let[t,e]=y(()=>i().lastResult);return M(()=>{let n=i();return e(n.lastResult),n.listeners.add(e),()=>{n.listeners.delete(e)}},[]),t}
export{XFe,Oei,aVr,Mei,lzo,Dei,Lei};
