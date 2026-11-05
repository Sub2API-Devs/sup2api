
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{De}from"./chunk-ndkzc8d3.js";import{F}from"./chunk-5ythzcas.js";import{W}from"./chunk-0qffyy27.js";class t{inFlightSnapshot={tasks:0,queued:0,kinds:[],items:[]};inFlightSnapshotChanged=De();pendingStructuredResult=void 0;relocatedCwd=void 0;ownStateWriteDepth=0;warnedUnknownDisabledSurface=!1;publishInFlightSnapshot(n){this.inFlightSnapshot=n;try{this.inFlightSnapshotChanged.emit()}catch{}}reset(){this.pendingStructuredResult=void 0,this.relocatedCwd=void 0,this.warnedUnknownDisabledSurface=!1,this.publishInFlightSnapshot({tasks:0,queued:0,kinds:[],items:[]})}}var e=new W(()=>new t);function EQ(){return e.of(F().host)}
export{EQ};
