package api

import (
	"net/http"

	"ccgateway/controller/internal/pyjson"
)

// handleWorker is handle_worker: POST /accounts/<key>/worker. {"image"}
// replaces the Worker program; a body with "components" activates a
// Worker+CLI pair (R9). Errors are WORKER_ERRORS.
func (ex *exchange) handleWorker(aid string) {
	if ex.r.Method != http.MethodPost {
		ex.fail(http.StatusMethodNotAllowed, "method_not_allowed", true)
		return
	}
	desired, err := ex.readJSON(MaxSmallBody)
	if err == nil {
		var res pyjson.Ordered
		if obj, ok := desired.(pyjson.Ordered); ok && obj.Has("components") {
			res, err = ex.s.updates.UpdatePair(ex.r.Context(), aid, desired)
		} else {
			res, err = ex.s.updates.UpdateWorker(ex.r.Context(), aid, desired)
		}
		if err == nil {
			ex.reply(http.StatusOK, res)
			return
		}
	}
	ex.answerError(err, workerErrors, false)
}
