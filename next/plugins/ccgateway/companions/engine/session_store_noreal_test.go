//go:build !realvalkey

package engine

import "testing"

// realStoreCases has the real Valkey cases only with -tags realvalkey
// (session_store_real_test.go).
func realStoreCases(*testing.T) []storeCase { return nil }
