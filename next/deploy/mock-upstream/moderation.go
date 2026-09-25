package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

// Moderation simulation (CONTRACTS §20.9). A non-streaming chat completion
// that offers a function tool named "submit_verdict" is answered like a
// moderation LLM would: the last user message decides the verdict.
//
//	MOD-BLOCK    -> block, [illegal], high
//	MOD-FLAG     -> flag, [other], low
//	MOD-NOTOOL   -> plain assistant text without tool calls while the request
//	                has no assistant message yet (tests the agent's follow-up)
//	MOD-BADARGS  -> submit_verdict with invalid arguments while the request
//	                has no tool message yet (tests the agent's retry)
//	otherwise    -> pass, [], none
//
// The markers are checked in that order; a later round without the
// triggering condition falls through to the verdict rules.
const moderationTool = "submit_verdict"

type moderationRequest struct {
	Messages []struct {
		Role    string          `json:"role"`
		Content json.RawMessage `json:"content"`
	} `json:"messages"`
	Tools []struct {
		Type     string `json:"type"`
		Function struct {
			Name string `json:"name"`
		} `json:"function"`
	} `json:"tools"`
}

// moderationReply is what the mock answers to a moderation request.
type moderationReply struct {
	text      string // plain assistant text (no tool call) when set
	arguments string // submit_verdict arguments JSON otherwise
}

// moderationFor reports whether body is a moderation request and, if so,
// the reply to send.
func moderationFor(body []byte) (moderationReply, bool) {
	var req moderationRequest
	if json.Unmarshal(body, &req) != nil {
		return moderationReply{}, false
	}
	hasTool := false
	for _, t := range req.Tools {
		if t.Function.Name == moderationTool {
			hasTool = true
			break
		}
	}
	if !hasTool {
		return moderationReply{}, false
	}
	var text string
	hasAssistant, hasToolMsg := false, false
	for _, m := range req.Messages {
		switch m.Role {
		case "user":
			text = messageText(m.Content)
		case "assistant":
			hasAssistant = true
		case "tool":
			hasToolMsg = true
		}
	}
	verdict := func(v string, categories []string, severity, reason string) moderationReply {
		args, _ := json.Marshal(map[string]any{"verdict": v, "categories": categories, "severity": severity, "reason": reason})
		return moderationReply{arguments: string(args)}
	}
	switch {
	case strings.Contains(text, "MOD-BLOCK"):
		return verdict("block", []string{"illegal"}, "high", "mock: illegal"), true
	case strings.Contains(text, "MOD-FLAG"):
		return verdict("flag", []string{"other"}, "low", "mock: flagged"), true
	case strings.Contains(text, "MOD-NOTOOL") && !hasAssistant:
		return moderationReply{text: "I have reviewed the content and it looks fine."}, true
	case strings.Contains(text, "MOD-BADARGS") && !hasToolMsg:
		return moderationReply{arguments: `{"verdict":"maybe"}`}, true
	}
	return verdict("pass", []string{}, "none", "mock: ok"), true
}

// messageText is a chat message content: a string, or the text parts of a
// content array joined by newlines.
func messageText(raw json.RawMessage) string {
	var s string
	if json.Unmarshal(raw, &s) == nil {
		return s
	}
	var parts []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	}
	if json.Unmarshal(raw, &parts) != nil {
		return ""
	}
	var out []string
	for _, p := range parts {
		if p.Type == "text" || p.Type == "" {
			out = append(out, p.Text)
		}
	}
	return strings.Join(out, "\n")
}

// writeModeration writes the chat completion for a moderation reply.
func writeModeration(w http.ResponseWriter, id int64, chatID string, created int64, model string, rep moderationReply, u Usage) {
	msg := map[string]any{"role": "assistant", "content": nil, "refusal": nil}
	finish := "tool_calls"
	if rep.arguments == "" {
		msg["content"], finish = rep.text, "stop"
	} else {
		msg["tool_calls"] = []any{map[string]any{
			"id": fmt.Sprintf("call_%d", id), "type": "function",
			"function": map[string]any{"name": moderationTool, "arguments": rep.arguments},
		}}
	}
	writeJSON(w, 200, map[string]any{
		"id": chatID, "object": "chat.completion", "created": created, "model": model,
		"choices": []any{map[string]any{"index": 0, "finish_reason": finish, "logprobs": nil, "message": msg}},
		"usage":   openaiChatUsage(u),
	})
}
