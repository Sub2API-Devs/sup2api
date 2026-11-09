package convert

// RequestError rejects a request the conversion cannot express at all
// (CONVERT-MATRIX §2.2 class 3), whatever the loss policy.
type RequestError struct{ Cause error }

func (e *RequestError) Error() string { return e.Cause.Error() }
func (e *RequestError) Unwrap() error { return e.Cause }
