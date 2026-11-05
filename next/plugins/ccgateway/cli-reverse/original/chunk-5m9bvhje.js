
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{i}from"./chunk-xjnnz630.js";import{Ae,ci,W2,Bc,Jd}from"./chunk-5m8x0kb6.js";import{Yc,xO}from"./chunk-exfmq47h.js";import{dKe}from"./chunk-bxxnnnh4.js";import{KTe}from"./chunk-gjbr82c9.js";function tft(r=Ae()){if(r!=="firstParty"||!ci())return!1;if(W2())return!0;return s()}function fMi(r=Ae()){if(r!=="firstParty"||!Bc())return!1;return s()}function oZ(r=Ae()){if(r!=="firstParty"||!Bc())return!1;if(i.ANTHROPIC_BASE_URL!==void 0||!Yc()||!xO())return!0;let t=KTe(),e=t===void 0?dKe()??null:t;return e===null||Jd(e)}function s(){if(i.ANTHROPIC_BASE_URL!==void 0||!xO())return!0;let r=KTe();return r===null||r!==void 0&&Jd(r)}function Klo(){if(i.ANTHROPIC_BASE_URL!==void 0)return i.ANTHROPIC_BASE_URL;try{if(xO()){let r=KTe();if(typeof r==="string")return r}}catch{}return"https://api.anthropic.com"}
export{tft,fMi,oZ,Klo};
