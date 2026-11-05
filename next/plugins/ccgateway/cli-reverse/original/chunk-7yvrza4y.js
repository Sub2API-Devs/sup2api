
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Nl}from"./chunk-3zb8bxyj.js";var Ab={CURSOR_VISIBLE:25,ALT_SCREEN:47,ALT_SCREEN_CLEAR:1049,MOUSE_NORMAL:1000,MOUSE_BUTTON:1002,MOUSE_ANY:1003,MOUSE_SGR:1006,MOUSE_SGR_PIXELS:1016,FOCUS_EVENTS:1004,BRACKETED_PASTE:2004,THEME_NOTIFY:2031,SYNCHRONIZED_UPDATE:2026,WIN32_INPUT_MODE:9001};function TK(E){return Nl(`?${E}h`)}function ZJ(E){return Nl(`?${E}l`)}var afn=TK(Ab.SYNCHRONIZED_UPDATE),jwt=ZJ(Ab.SYNCHRONIZED_UPDATE),EVs=TK(Ab.BRACKETED_PASTE),oYn=ZJ(Ab.BRACKETED_PASTE),sYn=TK(Ab.FOCUS_EVENTS),SWt=ZJ(Ab.FOCUS_EVENTS),vVs=TK(Ab.THEME_NOTIFY),iYn=ZJ(Ab.THEME_NOTIFY),HU=TK(Ab.CURSOR_VISIBLE),NU=ZJ(Ab.CURSOR_VISIBLE),wWt=TK(Ab.ALT_SCREEN_CLEAR),EWt=ZJ(Ab.ALT_SCREEN_CLEAR),aYn=ZJ(Ab.WIN32_INPUT_MODE),S=TK(Ab.MOUSE_NORMAL)+TK(Ab.MOUSE_BUTTON)+TK(Ab.MOUSE_ANY)+TK(Ab.MOUSE_SGR),_=TK(Ab.MOUSE_NORMAL)+TK(Ab.MOUSE_SGR),xxe=ZJ(Ab.MOUSE_SGR)+ZJ(Ab.MOUSE_ANY)+ZJ(Ab.MOUSE_BUTTON)+ZJ(Ab.MOUSE_NORMAL),kVs=TK(Ab.MOUSE_SGR_PIXELS),TVs=ZJ(Ab.MOUSE_SGR_PIXELS)+TK(Ab.MOUSE_SGR);function lYn(E){switch(E){case"full":return S;case"scroll":return _;case"off":return""}}
export{Ab,TK,ZJ,afn,jwt,EVs,oYn,sYn,SWt,vVs,iYn,HU,NU,wWt,EWt,aYn,xxe,kVs,TVs,lYn};
