
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{f}from"./chunk-vwtpw18x.js";import{l}from"./chunk-nkv493nm.js";import{bh}from"./chunk-r1fa3fft.js";import{bDe}from"./chunk-pjb5ptr5.js";function zbt(){return bh()||bDe()}function Qjs(e){switch(e.kind){case"elsewhere":return"elsewhere";case"nowhere":return e.hasOwnSessionRecord?"here_only":"nowhere";case"unknown":return e.why==="not_looked"?"not_looked":"unknown"}}function u2n(e,o){l("tengu_remote_attach_record_lookup",{outcome:f(e),entry_point:f(o)})}
export{zbt,Qjs,u2n};
