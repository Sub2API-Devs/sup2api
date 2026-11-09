package convert

// RequestError rejects a request the conversion cannot express at all
// (CONVERT-MATRIX §2.2 class 3), whatever the loss policy.
type RequestError struct{ Cause error }

func (e *RequestError) Error() string { return e.Cause.Error() }
func (e *RequestError) Unwrap() error { return e.Cause }

// Prepare binds c to body with empty Options.
//
// TODO(convert-matrix): left for openai_chat_responses_test.go (T3) only;
// the gateway prepares with the request's Options (gateway/convert_policy.go).
// Removed with Dropped once that test uses Converter.Prepare and Losses.
func Prepare(c Converter, body []byte) (Converter, []byte, error) {
	return c.Prepare(body, Options{})
}

// Dropped returns the request paths a prepared converter left out.
//
// TODO(convert-matrix): see Prepare.
func Dropped(c Converter) []string {
	if d, ok := c.(interface{ Dropped() []string }); ok {
		return d.Dropped()
	}
	return nil
}
