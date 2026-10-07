package engine

import "fmt"

// Citation location schemas belong to the upstream API. Validate the envelope
// here and retain every field, including opaque search reference identifiers.
// Revalidating document indices against transformed history would be incorrect.
func checkCitation(v any) error {
	c, ok := v.(map[string]any)
	if !ok || str(c, "type") == "" {
		return fmt.Errorf("citation must be an object with a type")
	}
	return nil
}

func checkCitations(v any) error {
	if v == nil {
		return nil
	}
	list, ok := v.([]any)
	if !ok {
		return fmt.Errorf("citations must be an array or null")
	}
	for _, c := range list {
		if err := checkCitation(c); err != nil {
			return err
		}
	}
	return nil
}
