
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{yn,v,bht,Av}from"./chunk-exfmq47h.js";import{UP,hJe,NHn}from"./chunk-r1fa3fft.js";var X$e="tengu_violin_willow";function jYn(){try{let{value:e,source:o}=yn(X$e,!1);return Av(o)?e===!0:void 0}catch{return}}function Xnt(){try{return v(X$e,!1)}catch{return!1}}function Jnt(){return NHn()&&jYn()===!0}function Oqe({cloudClient:e}){if(hJe())return"tengu_violin_wood";return e&&jYn()===!1?X$e:void 0}async function iLo({cloudClient:e}){try{return await UP()&&(!e||await bht(X$e))}catch{return!1}}
export{X$e,jYn,Xnt,Jnt,Oqe,iLo};
