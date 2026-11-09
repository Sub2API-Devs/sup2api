package upstream

import (
	"regexp"
	"strings"
)

// Templates (§2.4) are text with {variable} placeholders. Only a brace pair
// enclosing a variable name is a placeholder, so a JSON template such as
// {"model":"{model}"} keeps its own braces.
var placeholderRe = regexp.MustCompile(`\{([a-z_]+(?:\.[A-Za-z0-9_-]+)?)\}`)

// Template variables.
const (
	varAPIKey       = "api_key"
	varBaseURL      = "base_url"
	varModel        = "model"
	varCredentials  = "credentials."
	varClientHeader = "client_header."
)

// place is where a template is written; it decides the variables allowed.
type place int

const (
	placeAuth   place = iota // auth.value
	placeHeader              // an ordinary header
	placePath                // the path part of a route path
	placeQuery               // the query string of a route path
	placeBody                // the test body template
	placeList                // the path of the model listing (no model)
)

// allowed reports whether variable name may be written at pl. {api_key}
// only goes where the upstream expects the credential (auth, a query
// string); a client header never feeds auth, so a client cannot choose the
// credential the account sends.
func (pl place) allowed(name string) bool {
	switch {
	case name == varAPIKey:
		return pl == placeAuth || pl == placeQuery
	case name == varBaseURL:
		return pl == placeAuth || pl == placeHeader
	case name == varModel:
		return pl != placeList
	case strings.HasPrefix(name, varCredentials):
		return pl != placeBody
	case strings.HasPrefix(name, varClientHeader):
		return pl == placeHeader
	}
	return false
}

// variables lists the placeholders of tpl.
func variables(tpl string) []string {
	var out []string
	for _, m := range placeholderRe.FindAllStringSubmatch(tpl, -1) {
		out = append(out, m[1])
	}
	return out
}

// values are the variables a template is rendered with.
type values struct {
	apiKey, baseURL, model string
	// field reads {credentials.<k>}; header reads {client_header.<name>}.
	field  func(string) (string, bool)
	header map[string]string
}

func (v *values) lookup(name string) (string, bool) {
	switch {
	case name == varAPIKey:
		return v.apiKey, v.apiKey != ""
	case name == varBaseURL:
		return v.baseURL, v.baseURL != ""
	case name == varModel:
		return v.model, v.model != ""
	case strings.HasPrefix(name, varCredentials) && v.field != nil:
		return v.field(strings.TrimPrefix(name, varCredentials))
	case strings.HasPrefix(name, varClientHeader):
		s := v.header[strings.TrimPrefix(name, varClientHeader)]
		return s, s != ""
	}
	return "", false
}

// render fills tpl, passing every value through escape. ok is false when a
// variable has no value: a header is then not written at all, while a path
// keeps the empty value.
func (v *values) render(tpl string, escape func(string) string) (out string, ok bool) {
	ok = true
	out = placeholderRe.ReplaceAllStringFunc(tpl, func(m string) string {
		s, found := v.lookup(m[1 : len(m)-1])
		ok = ok && found
		if escape != nil {
			s = escape(s)
		}
		return s
	})
	return out, ok
}
