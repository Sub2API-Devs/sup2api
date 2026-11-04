
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{vz}from"./chunk-mfvgtsgj.js";import{Ae}from"./chunk-9ks6yv81.js";import{s,jV,Qs}from"./chunk-x6v6jz2y.js";import{e}from"./chunk-nn4p932b.js";import{Se,zt,R,y,j}from"./chunk-p86mcgbc.js";j();function f9({children:w,lock:o="always",restartKey:i}){let[H,{isVisible:x},d]=jV(),{rows:r,columns:c}=Ae(),m=R(null),[t,u]=y({minHeight:0,rows:r,columns:c,restartKey:i}),l=o==="always"&&(t.rows!==r||t.columns!==c||t.restartKey!==i),p=(o==="always"||!x)&&!l,a=R(0),g=Math.max(t.minHeight,a.current),E=Se(vz)!==null;return zt(()=>{if(!m.current)return;let{height:h}=Qs(m.current),n=Math.min(h,r);if(l){u({minHeight:n,rows:r,columns:c,restartKey:i});return}if(h>g){if(E&&o==="offscreen"&&!p&&n>=t.minHeight&&d()){a.current=n;return}a.current=0,u((f)=>f.minHeight===n?f:{...f,minHeight:n})}}),e(s,{minHeight:p?g:void 0,ref:H,children:e(s,{ref:m,flexDirection:"column",children:w})})}
export{f9};
