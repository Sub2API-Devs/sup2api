package convert

import (
	"context"
	"fmt"
)

// RequestError rejects a request the conversion cannot express at all
// (CONVERT-MATRIX §2.2 class 3), whatever the loss policy.
type RequestError struct{ Cause error }

func (e *RequestError) Error() string { return e.Cause.Error() }
func (e *RequestError) Unwrap() error { return e.Cause }

// Prepare binds c to one request body and checks the bound converter kept
// the protocol pair. On error it returns c itself, so a failed route keeps a
// usable converter value.
//
// TODO(convert-matrix T1): bridge for the gateway's attempt-time conversion,
// which has no Options yet; removed when the gateway prepares at pick time
// with the request's Options (CONVERT-MATRIX §2.4).
func Prepare(c Converter, body []byte) (Converter, []byte, error) {
	bound, out, err := c.Prepare(body, Options{Ctx: context.Background()})
	if err != nil {
		return c, nil, err
	}
	if bound == nil || bound.From() != c.From() || bound.To() != c.To() {
		return c, nil, fmt.Errorf("convert: prepared converter changed protocol pair")
	}
	return bound, out, nil
}

// DropReporter is implemented by a prepared converter that leaves out
// request fields without an equivalent, instead of rejecting them, when
// their absence keeps the request correct (CONTRACTS §83.2).
//
// TODO(convert-matrix): superseded by LossReporter; removed once
// chatResponses reports categorized losses (T3) and the gateway logs
// Losses (T1).
type DropReporter interface {
	// Dropped lists the request paths left out, sorted.
	Dropped() []string
}

// Dropped returns the request paths a prepared converter left out, nil
// when it reports none.
func Dropped(c Converter) []string {
	if d, ok := c.(DropReporter); ok {
		return d.Dropped()
	}
	return nil
}
