
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{c}from"./chunk-0wqny7vr.js";import{a}from"./chunk-8kte1b36.js";import{vg}from"./chunk-g8d4yw80.js";import{Uxe}from"./chunk-yf82ynbr.js";function dpt(){return vg()||Uxe()}function WTs(e){switch(e.kind){case"elsewhere":return"elsewhere";case"nowhere":return e.hasOwnSessionRecord?"here_only":"nowhere";case"unknown":return e.why==="not_looked"?"not_looked":"unknown"}}function c0n(e,o){a("tengu_remote_attach_record_lookup",{outcome:c(e),entry_point:c(o)})}
export{dpt,WTs,c0n};
