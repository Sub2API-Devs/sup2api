package apicompat

// indexLastBy indexes items by key, keeping the last item for a duplicated key.
// key reports false for items that must not be indexed.
//
// It exists only to share the "index by id, last write wins" step between
// normalizeAnthropicToolPairing and normalizeChatMessagesWithToolOutputMedia.
// The pairing rebuilds themselves stay separate: one re-splits Anthropic
// messages around block arrays, the other trims Chat ToolCalls, and their
// rules for unanswered calls, orphaned replies and interleaved messages differ.
func indexLastBy[T any](items []T, key func(T) (string, bool)) map[string]T {
	out := make(map[string]T, len(items))
	for _, item := range items {
		if k, ok := key(item); ok {
			out[k] = item
		}
	}
	return out
}
