
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{S}from"./chunk-zt8d60ng.js";import{e}from"./chunk-6n4z8qxn.js";import{Qt,Ee,y,At,j}from"./chunk-zsz062c7.js";import{Ds}from"./chunk-8zzj4j31.js";j();function x(){let u=Ds(v);let b=new l;return u.subscribe(()=>{if(u.getState().voiceState!=="recording")b.reset()}),{store:u,levelSmoother:b}}var v={voiceState:"idle",voiceError:null,voiceInterimTranscript:"",voiceAudioLevels:[],voiceWarmingUp:!1,awaitingVoiceSubmitDoubleTap:!1};class l{#e=0;next(o,t){return this.#e=this.#e*t+o*(1-t),this.#e}reset(){this.#e=0}}var i=Qt(null);function DUr(o){let s=S(3),{children:t}=o,[n]=y(x),c;if(s[0]!==t||s[1]!==n)c=e(i.Provider,{value:n,children:t}),s[0]=t,s[1]=n,s[2]=c;else c=s[2];return c}function r(){let o=Ee(i);if(!o){throw Error("useVoiceState must be used within a VoiceProvider")}return o}function Lnt(){return r().store}function jMo(){return r().levelSmoother}function S_(o){let n=S(3),t=Lnt(),s;if(n[0]!==o||n[1]!==t)s=()=>o(t.getState()),n[0]=o,n[1]=t,n[2]=s;else s=n[2];let c=s;return At(t.subscribe,c,c)}function N4n(){return Lnt().setState}function Eqe(){return Lnt().getState}
export{DUr,Lnt,jMo,S_,N4n,Eqe};
