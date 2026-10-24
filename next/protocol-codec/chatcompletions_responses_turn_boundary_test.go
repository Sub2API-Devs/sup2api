package apicompat

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

// assistantReasoning returns the reasoning_content of every assistant message in
// order, so a test can pin which turn a reasoning item survives.
func assistantReasoning(messages []ChatMessage) []string {
	out := []string{}
	for _, m := range messages {
		if m.Role == "assistant" {
			out = append(out, m.ReasoningContent)
		}
	}
	return out
}

// The reasoning state machine has exactly one observable boundary: the turn end.
// Only user-side items may clear the turn's reasoning, because DeepSeek requires
// the reasoning that produced a tool call to be replayed on later calls of the
// same turn. Everything else (assistant messages, tool calls, tool outputs,
// unknown item types, empty agent messages) merely ends the thinking span that
// awaited an assistant message, so the turn's reasoning stays available.
//
// These cases pin every branch of that decision. Turning any of the user-side
// turn ends into a no-op (or a non-user item into a turn end) changes the output
// and must fail here.
func TestResponsesToChat_TurnBoundaryReasoningMatrix(t *testing.T) {
	const thinking = "turn thinking"
	reasoning := `{"type":"reasoning","id":"r1","summary":[{"type":"summary_text","text":"turn thinking"}]}`
	assistant := func(text string) string {
		return `{"type":"message","role":"assistant","content":[{"type":"output_text","text":"` + text + `"}]}`
	}
	user := func(text string) string {
		return `{"type":"message","role":"user","content":[{"type":"input_text","text":"` + text + `"}]}`
	}
	input := func(items ...string) json.RawMessage {
		joined := ""
		for i, item := range items {
			if i > 0 {
				joined += ","
			}
			joined += item
		}
		return json.RawMessage("[" + joined + "]")
	}

	cases := []struct {
		name  string
		input json.RawMessage
		want  []string
	}{
		{
			// A user item ends the turn: the next assistant turn starts clean
			// instead of replaying the previous turn's reasoning.
			name:  "user message ends the turn",
			input: input(reasoning, assistant("answer one"), user("next"), assistant("answer two")),
			want:  []string{thinking, ""},
		},
		{
			// A whitespace-only user item still ends the turn: it is a real
			// user message, not an empty item to skip.
			name: "whitespace-only user message ends the turn",
			input: input(reasoning, assistant("answer one"),
				`{"type":"message","role":"user","content":[{"type":"input_text","text":"   "}]}`,
				assistant("answer two")),
			want: []string{thinking, ""},
		},
		{
			// A bare-string user item takes the appendUserText path, which also
			// ends the turn.
			name:  "plain string user item ends the turn",
			input: input(reasoning, assistant("answer one"), `"next"`, assistant("answer two")),
			want:  []string{thinking, ""},
		},
		{
			// Tool output keeps the turn alive: DeepSeek may emit reasoning only
			// once per turn, so the assistant message after the output must
			// still carry it.
			name: "tool output keeps the turn reasoning",
			input: input(reasoning,
				`{"type":"function_call","call_id":"call_1","name":"f","arguments":"{}"}`,
				`{"type":"function_call_output","call_id":"call_1","output":"ok"}`,
				assistant("answer")),
			want: []string{thinking, thinking},
		},
		{
			// The turn ends at the user message that follows the tool round-trip.
			name: "user message after tool output ends the turn",
			input: input(reasoning,
				`{"type":"function_call","call_id":"call_1","name":"f","arguments":"{}"}`,
				`{"type":"function_call_output","call_id":"call_1","output":"ok"}`,
				user("next"), assistant("answer")),
			want: []string{thinking, ""},
		},
		{
			// An item type with no Chat equivalent is skipped, but it is not a
			// user item: the thinking span continues and the next assistant
			// message still gets the turn's reasoning.
			name: "unknown item type keeps the turn reasoning",
			input: input(reasoning,
				`{"type":"web_search_call","id":"ws_1","status":"completed"}`,
				assistant("answer")),
			want: []string{thinking},
		},
		{
			// An agent_message without text produces no Chat message; it must not
			// end the turn either.
			name: "empty agent_message keeps the turn reasoning",
			input: input(reasoning,
				`{"type":"agent_message","author":"/root","recipient":"/root/a","content":[]}`,
				assistant("answer")),
			want: []string{thinking},
		},
		{
			// A developer message becomes a (downgraded) user-side message, so it
			// ends the turn.
			name: "developer message ends the turn",
			input: input(reasoning,
				`{"type":"message","role":"developer","content":[{"type":"input_text","text":"notice"}]}`,
				assistant("answer")),
			want: []string{""},
		},
		{
			// An agent_message with text is a user message and ends the turn.
			name: "agent_message with text ends the turn",
			input: input(reasoning,
				`{"type":"agent_message","author":"/root","recipient":"/root/a","content":[{"type":"input_text","text":"task"}]}`,
				assistant("answer")),
			want: []string{""},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			out, err := ResponsesToChatCompletionsRequest(&ResponsesRequest{Model: "deepseek-reasoner", Input: tc.input})
			require.NoError(t, err)
			require.Equal(t, tc.want, assistantReasoning(out.Messages))
		})
	}
}
