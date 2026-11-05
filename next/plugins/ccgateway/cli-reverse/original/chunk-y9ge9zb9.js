
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{JUr}from"./chunk-2avr6cej.js";import{sa}from"./chunk-emhzq435.js";import{ue,Ee,wre,Zt,R,y,j}from"./chunk-zsz062c7.js";j();var RI=150,To=250;var qJ=600;function la(n,r,t=RI){let e=n()-r;if(e>=0)return e<t;return r<=Date.now()}function F4n(n){let r=sa(),[t,e]=y(()=>({key:n,at:Date.now()}));if(t.key!==n)e({key:n,at:Date.now()});let a=Gv(t.at);return function(){return la(r,a(t.at))}}function Gv(n){let[r]=y(()=>n!==0&&Date.now()-n>=RI?n:0),t=n===r?0:n,e=R({stamp:0,at:0,painted:!1}),a=Ee(JUr)??s;return wre(()=>{if(t===0||e.current.stamp===t&&e.current.painted)return;let o=e.current.stamp===t?e.current.at:t;e.current={stamp:t,at:o,painted:!1};let u=a(()=>{e.current={stamp:t,at:Math.max(e.current.at,Date.now()),painted:!0},u()});return u},[t,a]),Zt(()=>{if(t!==0&&e.current.stamp===t&&!e.current.painted)e.current={stamp:t,at:Math.max(t,Date.now()),painted:!1}},[t]),ue((o)=>o===e.current.stamp?e.current.at:o,[])}function s(){return()=>{}}
export{RI,To,qJ,la,F4n,Gv};
