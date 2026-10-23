package engine

func basic() Object {
	return Object{"model": "claude-sonnet-4-6", "max_tokens": 128, "system": "Test system body", "messages": []any{Object{"role": "user", "content": "Earlier question"}, Object{"role": "assistant", "content": "Earlier answer"}, Object{"role": "user", "content": "Next question"}}}
}
