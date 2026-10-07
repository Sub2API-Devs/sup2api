package usage

import "testing"

func TestSubmitNilRemainsNoopWithAdditionalUsage(t *testing.T) {
	new(Service).Submit(nil)
}
