package manifest

// RequestModelReference identifies model-bearing objects in one request array.
// ArrayPath may explicitly enumerate intermediate arrays with [] (for example
// messages[].content). Other paths are simple object paths without queries,
// so the host can rewrite exactly the admitted model after account selection.
// Name links the reference to UsageRules.Additional with the same name.
type RequestModelReference struct {
	Name      string            `json:"name"`
	ArrayPath string            `json:"arrayPath"`
	Match     map[string]string `json:"match,omitempty"`
	ModelPath string            `json:"modelPath"`
	// ParameterOverrides identifies request fields overridden by this array
	// entry for pricing. Missing fields inherit; explicit null stays null.
	ParameterOverrides []string `json:"parameterOverrides,omitempty"`
	// IdentityOnly protects model fields embedded in signed history. They are
	// authorized and priced normally, but account aliases may not rewrite them.
	IdentityOnly bool `json:"identityOnly,omitempty"`
}
