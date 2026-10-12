package engine

func thinkingFixtureEvents(thinking, signature string) []Object {
	return []Object{
		{"type": "message_start", "message": Object{"id": "thinking_fixture", "type": "message", "role": "assistant", "model": "fixture", "content": []any{}, "usage": Object{"input_tokens": 2}}},
		{"type": "content_block_start", "index": 0, "content_block": Object{"type": "thinking", "thinking": thinking, "signature": signature}},
		{"type": "content_block_stop", "index": 0},
		{"type": "message_delta", "delta": Object{"stop_reason": "end_turn"}, "usage": Object{"output_tokens": 3}},
		{"type": "message_stop"},
	}
}
