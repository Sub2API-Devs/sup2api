
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{I}from"./chunk-znrryf4y.js";import*as r from"fs/promises";import*as o from"path";function Rln(e={}){return{fs:r,path:o,platform:()=>I(),...e}}async function xln(e,t){return t.isRootNameExchangeable===!0?e.path.join(await e.fs.realpath(e.path.dirname(t.realRoot)),e.path.basename(t.realRoot)):e.fs.realpath(t.realRoot)}
export{Rln,xln};
