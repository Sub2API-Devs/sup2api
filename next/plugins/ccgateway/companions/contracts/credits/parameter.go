package credits

import (
	"encoding/json"
	"fmt"
	"strings"
)

// Parameter preserves the public token shape; null has no redemption semantics.
type Parameter struct {
	Token, Mode     string
	Present, Object bool
	Raw             json.RawMessage
}

func ParseParameter(value any) (Parameter, error) {
	p := Parameter{Mode: "strict"}
	if value == nil {
		return p, nil
	}
	p.Present = true
	switch v := value.(type) {
	case string:
		p.Token = v
	case map[string]any:
		p.Object = true
		for key := range v {
			if key != "token" && key != "mode" {
				return Parameter{}, fmt.Errorf("unsupported fallback credit token field")
			}
		}
		var ok bool
		p.Token, ok = v["token"].(string)
		if !ok {
			return Parameter{}, fmt.Errorf("fallback credit token must be a string")
		}
		if mode, exists := v["mode"]; exists {
			p.Mode, ok = mode.(string)
			if !ok || p.Mode != "strict" && p.Mode != "best_effort" {
				return Parameter{}, fmt.Errorf("invalid fallback credit mode")
			}
		}
	default:
		return Parameter{}, fmt.Errorf("fallback credit token must be a string, object or null")
	}
	if _, err := TokenHash(p.Token); err != nil {
		return Parameter{}, err
	}
	p.Raw, _ = json.Marshal(value)
	return p, nil
}

func (p Parameter) ValidateBetas(headers []string) error {
	if !p.Present {
		return nil
	}
	if !p.Object && Enabled(headers) {
		return nil
	}
	if p.Object {
		for _, header := range headers {
			for _, beta := range strings.Split(header, ",") {
				if strings.TrimSpace(beta) == "fallback-credit-2026-07-01" {
					return nil
				}
			}
		}
	}
	return fmt.Errorf("fallback credit token requires its registered beta; object form requires fallback-credit-2026-07-01")
}
