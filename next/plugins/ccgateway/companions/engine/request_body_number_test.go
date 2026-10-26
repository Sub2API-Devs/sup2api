package engine

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

// representableNumbers are the numbers whose decade and value decide whether a
// float64 holds them: the limit itself, either side of it, and zeros that
// would otherwise look far past it.
var representableNumbers = []string{
	"0", "-0", "1", "-1", "9007199254740993", "1e308", "1.7e308", "1e307", "1e-999", "-1e-999",
	"0.1e308", "0.0000001", "1.7976931348623157e308", "10e307", "100e306", "0e999", "0.0e999", "0.1e309",
	"12345678901234567890123456789012345678901234567890123456789012345678901234567890",
	"0.0000000000000000000000000000000000000000000000000000000000000000000000000000001e-100",
}

// A number's representability is decided exactly as the tree decode decides
// it: only a magnitude above float64's range makes the scan fail.
func TestUnrepresentableNumberMatchesTheTreeDecode(t *testing.T) {
	for _, number := range representableNumbers {
		raw := []byte(`{"n":` + number + `}`)
		var tree any
		require.NoError(t, json.Unmarshal(raw, &tree), "%s is not a number JSON reads", number)
		require.False(t, hasUnrepresentableNumber(raw), number)
		require.True(t, parseRequestBody(raw).valid, number)
	}
	for _, number := range []string{"1e309", "1e999", "-1e999", "1E400", "1.8e308", "1.7976931348623159e308"} {
		raw := []byte(`{"n":` + number + `}`)
		var tree any
		require.Error(t, json.Unmarshal(raw, &tree), "%s fits a float64", number)
		require.True(t, hasUnrepresentableNumber(raw), number)
		require.False(t, parseRequestBody(raw).valid, number)
	}
}

// A number inside a string spells nothing: only the JSON numbers count.
func TestNumberScanIgnoresStrings(t *testing.T) {
	for _, raw := range []string{
		`{"s":"1e999"}`,
		`{"s":"\"1e999\""}`,
		`{"s":"\\\\1e999"}`,
	} {
		require.False(t, hasUnrepresentableNumber([]byte(raw)), raw)
		require.True(t, parseRequestBody([]byte(raw)).valid, raw)
	}
	for _, raw := range []string{
		`{"n":1e999,"s":"x"}`,
		`{"a":[1e999]}`,
		`{"a":{"b":-1E400}}`,
	} {
		require.True(t, hasUnrepresentableNumber([]byte(raw)), raw)
		require.False(t, parseRequestBody([]byte(raw)).valid, raw)
	}
}
