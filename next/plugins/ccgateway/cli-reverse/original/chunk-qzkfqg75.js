
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{xe}from"./chunk-90nja2dk.js";import{oIn}from"./chunk-bvmq0a77.js";import{hm}from"./chunk-ga8a8mhv.js";import{P2e}from"./chunk-z20c443b.js";var Lde=(o)=>o.name===P2e&&hm(o);var $T=(o)=>{let t=o.startsWith("classic.")||o==="tool.describe"||o==="tool.call"||o==="tool.check";return xe().loadedModules.filter((e)=>!(t&&Lde(e))&&!(o==="tool.check"&&e.name===oIn&&hm(e)))};export{Lde,$T};
