
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{wn,v,Hlt,eC}from"./chunk-aepeg2w5.js";import{wO,w5e,qTn}from"./chunk-g8d4yw80.js";var rLe="tengu_violin_willow";function UBn(){try{let{value:e,source:o}=wn(rLe,!1);return eC(o)?e===!0:void 0}catch{return}}function VJe(){try{return v(rLe,!1)}catch{return!1}}function qJe(){return qTn()&&UBn()===!0}function tGe({cloudClient:e}){if(w5e())return"tengu_violin_wood";return e&&UBn()===!1?rLe:void 0}async function mSo({cloudClient:e}){try{return await wO()&&(!e||await Hlt(rLe))}catch{return!1}}
export{rLe,UBn,VJe,qJe,tGe,mSo};
