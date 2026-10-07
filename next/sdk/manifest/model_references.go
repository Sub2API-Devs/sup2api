package manifest

// RequestModelReference identifies model-bearing objects in one request array.
// Paths are simple object paths, without wildcard/query/modifier expressions,
// so the host can rewrite exactly the admitted model after account selection.
// Name links the reference to UsageRules.Additional with the same name.
type RequestModelReference struct {
	Name      string            `json:"name"`
	ArrayPath string            `json:"arrayPath"`
	Match     map[string]string `json:"match,omitempty"`
	ModelPath string            `json:"modelPath"`
}
