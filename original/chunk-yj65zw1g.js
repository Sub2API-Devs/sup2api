
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{w}from"./chunk-s89ma3n1.js";import{e}from"./chunk-nn4p932b.js";import{qt,Se,y,yt,j}from"./chunk-p86mcgbc.js";import{hs}from"./chunk-2mbp91tg.js";j();function h(){let u=hs(v);let V=new l;return u.subscribe(()=>{if(u.getState().voiceState!=="recording")V.reset()}),{store:u,levelSmoother:V}}var v={voiceState:"idle",voiceError:null,voiceInterimTranscript:"",voiceAudioLevels:[],voiceWarmingUp:!1,awaitingVoiceSubmitDoubleTap:!1};class l{#e=0;next(o,t){return this.#e=this.#e*t+o*(1-t),this.#e}reset(){this.#e=0}}var i=qt(null);function IRr(o){let s=w(3),{children:t}=o,[n]=y(h),c;if(s[0]!==t||s[1]!==n)c=e(i.Provider,{value:n,children:t}),s[0]=t,s[1]=n,s[2]=c;else c=s[2];return c}function r(){let o=Se(i);if(!o){throw Error("useVoiceState must be used within a VoiceProvider")}return o}function PJe(){return r().store}function U_o(){return r().levelSmoother}function Ly(o){let n=w(3),t=PJe(),s;if(n[0]!==o||n[1]!==t)s=()=>o(t.getState()),n[0]=o,n[1]=t,n[2]=s;else s=n[2];let c=s;return yt(t.subscribe,c,c)}function CUn(){return PJe().setState}function KWe(){return PJe().getState}
export{IRr,PJe,U_o,Ly,CUn,KWe};
