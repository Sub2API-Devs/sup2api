package resources

import (
	"fmt"
	"net/http"
)

// ValidateIdentityHeaders accepts a single unambiguous assertion for each part
// of an already established issuer identity. It does not establish ownership.
func ValidateIdentityHeaders(h http.Header, expected Identity) error {
	principal, generation := h.Values(PrincipalHeader), h.Values(GenerationHeader)
	if expected.PrincipalID == "" || expected.Generation == "" || len(principal) != 1 || len(generation) != 1 || principal[0] != expected.PrincipalID || generation[0] != expected.Generation {
		return fmt.Errorf("resource issuer or authorization generation does not match")
	}
	return nil
}
