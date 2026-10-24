package apicompat

// indexLastInto indexes items into dst, keeping the last item for a duplicated
// key. key reports false for items that must not be indexed.
//
// It exists only to share the "index by id, last write wins" step between
// normalizeAnthropicToolPairing and normalizeChatMessagesWithToolOutputMedia.
// The pairing rebuilds themselves stay separate: one re-splits Anthropic
// messages around block arrays, the other trims Chat ToolCalls, and their
// rules for unanswered calls, orphaned replies and interleaved messages differ.
func indexLastInto[T any](dst map[string]T, items []T, key func(T) (string, bool)) {
	for _, item := range items {
		if k, ok := key(item); ok {
			dst[k] = item
		}
	}
}

// indexLastBy is indexLastInto building its own map sized for items.
func indexLastBy[T any](items []T, key func(T) (string, bool)) map[string]T {
	out := make(map[string]T, len(items))
	indexLastInto(out, items, key)
	return out
}
