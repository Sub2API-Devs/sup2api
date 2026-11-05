
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{gN}from"./chunk-exfmq47h.js";import{rt,s,n,ll}from"./chunk-emhzq435.js";import{m$}from"./chunk-xd1cb3xs.js";import{qo}from"./chunk-z20c443b.js";import{Zs}from"./chunk-9rmr50wd.js";import{Mu}from"./chunk-w63e462p.js";import{np}from"./chunk-6ax44zw6.js";import{e}from"./chunk-6n4z8qxn.js";import{ue,M,R,j}from"./chunk-zsz062c7.js";j();var B=500,m=5000;function JSt(){let t=rt(),r=m$(),o=Zs();return ue(()=>{if(!t)return;let l=gN.of(o),c=Date.now();if(c-l.lastBellAt<B)return;l.lastBellAt=c,r.notifyBell()},[t,r,o])}j();var _=600;function p(t,r=_){let o=Mu(),[l,c]=ll(t&&o?r:null);if(!t||!o)return[l,!0];let i=Math.floor(c/r)%2===0;return[l,i]}function L4({isError:t,isNeutral:r=!1,isUnresolved:o,shouldAnimate:l}){let c=rt(),i=np(),[L,d]=p(l&&!c&&!i),a=o&&l&&i&&!c,f=JSt(),u=R(null);return M(()=>{if(o)u.current??=Date.now();else if(u.current!==null){if(Date.now()-u.current>m)f();u.current=null}},[o,f]),e(s,{ref:L,minWidth:2,children:e(n,{"aria-label":t&&!r?"tool error:":"tool:",color:a?"text":o||r?void 0:t?"error":"success",dimColor:o&&!a||r,children:!l||d||t||!o?qo:" "})})}
export{JSt,L4};
