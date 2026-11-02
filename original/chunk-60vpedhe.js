
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Uu}from"./chunk-39r7st4c.js";import{Sg}from"./chunk-hgfr0vx8.js";import{zTo}from"./chunk-f9mnszgj.js";import{ol}from"./chunk-yjaa68dq.js";import{TN}from"./chunk-0y0w50mr.js";function oMr(){return[{type:"text",text:zTo()}]}function RGi(){ol({name:TN,description:`Reference for writing a ${Uu} tool script (script API and gotchas, resume, quality patterns, worked examples). Load before authoring a script for a workflow the user already opted into; it does not itself authorize running one.`,menuDescription:"Load the reference for writing Workflow tool scripts",userInvocable:!0,isEnabled:()=>Sg(),async getPromptForCommand(){return oMr()}})}
export{oMr,RGi};
