package httpfacts

const (
	NativeQuotaTypeHeader      = "x-ccgateway-cli-quota-type"
	NativeQuotaResetHeader     = "x-ccgateway-cli-quota-reset"
	NativeObservedStatusHeader = "x-ccgateway-cli-status"
)

func NativeQuotaKey(kind string) string {
	switch kind {
	case "five_hour":
		return "5h"
	case "seven_day":
		return "7d"
	case "seven_day_sonnet":
		return "7d_sonnet"
	case "seven_day_overage_included":
		return "7d_fable"
	default:
		return ""
	}
}

func SharedQuotaType(kind string) bool { return kind == "five_hour" || kind == "seven_day" }
