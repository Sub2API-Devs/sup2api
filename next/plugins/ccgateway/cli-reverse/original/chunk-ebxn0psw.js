
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{vl}from"./chunk-wz6vk74d.js";var W_={CURSOR_VISIBLE:25,ALT_SCREEN:47,ALT_SCREEN_CLEAR:1049,MOUSE_NORMAL:1000,MOUSE_BUTTON:1002,MOUSE_ANY:1003,MOUSE_SGR:1006,MOUSE_SGR_PIXELS:1016,FOCUS_EVENTS:1004,BRACKETED_PASTE:2004,THEME_NOTIFY:2031,SYNCHRONIZED_UPDATE:2026,WIN32_INPUT_MODE:9001};function Az(E){return vl(`?${E}h`)}function S9(E){return vl(`?${E}l`)}var mrn=Az(W_.SYNCHRONIZED_UPDATE),dgt=S9(W_.SYNCHRONIZED_UPDATE),gIs=Az(W_.BRACKETED_PASTE),YUn=S9(W_.BRACKETED_PASTE),XUn=Az(W_.FOCUS_EVENTS),G0t=S9(W_.FOCUS_EVENTS),hIs=Az(W_.THEME_NOTIFY),JUn=S9(W_.THEME_NOTIFY),q$=Az(W_.CURSOR_VISIBLE),Y$=S9(W_.CURSOR_VISIBLE),z0t=Az(W_.ALT_SCREEN_CLEAR),K0t=S9(W_.ALT_SCREEN_CLEAR),QUn=S9(W_.WIN32_INPUT_MODE),S=Az(W_.MOUSE_NORMAL)+Az(W_.MOUSE_BUTTON)+Az(W_.MOUSE_ANY)+Az(W_.MOUSE_SGR),_=Az(W_.MOUSE_NORMAL)+Az(W_.MOUSE_SGR),_Te=S9(W_.MOUSE_SGR)+S9(W_.MOUSE_ANY)+S9(W_.MOUSE_BUTTON)+S9(W_.MOUSE_NORMAL),yIs=Az(W_.MOUSE_SGR_PIXELS),_Is=S9(W_.MOUSE_SGR_PIXELS)+Az(W_.MOUSE_SGR);function ZUn(E){switch(E){case"full":return S;case"scroll":return _;case"off":return""}}
export{W_,Az,S9,mrn,dgt,gIs,YUn,XUn,G0t,hIs,JUn,q$,Y$,z0t,K0t,QUn,_Te,yIs,_Is,ZUn};
