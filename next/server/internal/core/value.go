package core

// ValueOr is *value, or def when value is nil (an absent optional field).
func ValueOr[T any](value *T, def T) T {
	if value != nil {
		return *value
	}
	return def
}
