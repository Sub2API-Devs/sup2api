package payment

import (
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/shopspring/decimal"
)

// Order statuses
const (
	StatusPending    = "pending"
	StatusPaid       = "paid"
	StatusRecharging = "recharging"
	StatusCompleted  = "completed"
	StatusFailed     = "failed"
	StatusCancelled  = "cancelled"
	StatusExpired    = "expired"
	StatusRefunding  = "refunding"
	StatusRefunded   = "refunded"
)

// Order types
const (
	OrderTypeBalance      = "balance"
	OrderTypeSubscription = "subscription"
)

// Redeem code types
const (
	RedeemTypeBalance      = "balance"
	RedeemTypeSubscription = "subscription"
	RedeemTypeInvitation   = "invitation"
)

// Redeem code statuses
const (
	RedeemStatusUnused  = "unused"
	RedeemStatusUsed    = "used"
	RedeemStatusExpired = "expired"
)

// Promo code statuses
const (
	PromoStatusActive   = "active"
	PromoStatusDisabled = "disabled"
)

// Provider keys (标准支付渠道)
const (
	ProviderEasyPay   = "easypay"
	ProviderAlipay    = "alipay"
	ProviderWxpay     = "wxpay"
	ProviderStripe    = "stripe"
	ProviderAirwallex = "airwallex"
)

// Payment types (用户可见的支付方式)
const (
	PaymentTypeAlipay = "alipay"
	PaymentTypeWxpay  = "wxpay"
	PaymentTypeStripe = "stripe"
)

// Provider notification statuses
const (
	NotificationStatusSuccess = "success"
	NotificationStatusFailed  = "failed"
	NotificationStatusPending = "pending"
)

// Provider order query statuses
const (
	ProviderStatusPaid    = "paid"
	ProviderStatusPending = "pending"
	ProviderStatusFailed  = "failed"
	ProviderStatusSuccess = "success"
)

// Currency
const (
	CurrencyDefaultCNY = "CNY"
	CurrencyUSD        = "USD"
	CurrencyEUR        = "EUR"
)

// Amount tolerance and constants
const (
	AmountToleranceCNY     = 0.01
	AmountToleranceUSD     = 0.01
	DefaultAmountTolerance = 0.01
	PaymentGraceMinutes    = 5
	OrderIDPrefix          = "s2a_"
)

// Rate limiting
const (
	RedeemMaxFailedAttempts = 5
	RedeemLockDuration      = 10 * time.Second
)

// Order represents a payment order
type Order struct {
	ID                 int64
	UserID             int64
	UserEmail          string
	OutTradeNo         string
	PaymentType        string
	PaymentTradeNo     string
	ProviderInstanceID *int64
	ProviderKey        string
	ProviderSnapshot   map[string]any
	Amount             decimal.Decimal
	PayAmount          decimal.Decimal
	FeeRate            decimal.Decimal
	Currency           string
	OrderType          string
	Status             string
	ExpiresAt          time.Time
	PaidAt             *time.Time
	FailedAt           *time.Time
	FailedReason       string
	ClientIP           string
	SrcHost            string
	SrcURL             string
	RechargeCode       string
	PlanID             *int64
	UserNotes          string
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

// ProviderInstance represents a payment provider configuration
type ProviderInstance struct {
	ID              int64
	ProviderKey     string
	Name            string
	Config          map[string]string
	Enabled         bool
	SortOrder       int
	Limits          map[string]any
	RefundEnabled   bool
	AllowUserRefund bool
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// RedeemCode represents a redeem code
type RedeemCode struct {
	ID           int64
	Code         string
	CodeHash     string
	Type         string
	Value        decimal.Decimal
	GroupID      *int64
	ValidityDays int
	Status       string
	UsedBy       *int64
	UsedAt       *time.Time
	ExpiresAt    *time.Time
	Notes        string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// IsUsed returns true if code is used
func (r *RedeemCode) IsUsed() bool {
	return r.Status == RedeemStatusUsed
}

// IsExpired returns true if code is expired
func (r *RedeemCode) IsExpired() bool {
	if r.Status == RedeemStatusExpired {
		return true
	}
	return r.ExpiresAt != nil && time.Now().After(*r.ExpiresAt)
}

// CanUse returns true if code can be redeemed
func (r *RedeemCode) CanUse() bool {
	return r.Status == RedeemStatusUnused && !r.IsExpired()
}

// PromoCode represents a promotional code
type PromoCode struct {
	ID          int64
	Code        string
	BonusAmount decimal.Decimal
	MaxUses     int
	UsedCount   int
	Status      string
	ExpiresAt   *time.Time
	Notes       string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// CanUse returns true if promo code can be applied
func (p *PromoCode) CanUse() bool {
	if p.Status != PromoStatusActive {
		return false
	}
	if p.ExpiresAt != nil && time.Now().After(*p.ExpiresAt) {
		return false
	}
	if p.MaxUses > 0 && p.UsedCount >= p.MaxUses {
		return false
	}
	return true
}

// PromoCodeUsage represents a promo code usage record
type PromoCodeUsage struct {
	ID          int64
	PromoCodeID int64
	UserID      int64
	BonusAmount decimal.Decimal
	UsedAt      time.Time
}

// HashRedeemCode hashes a redeem code using SHA-256
func HashRedeemCode(code string) string {
	h := sha256.Sum256([]byte(code))
	return hex.EncodeToString(h[:])
}

// PaymentConfig represents system-wide payment configuration
type PaymentConfig struct {
	ID                        int
	Enabled                   bool
	MinAmount                 decimal.Decimal
	MaxAmount                 decimal.Decimal
	DailyLimit                decimal.Decimal
	OrderTimeoutMinutes       int
	MaxPendingOrders          int
	EnabledPaymentTypes       []string
	BalanceDisabled           bool
	BalanceRechargeMultiplier decimal.Decimal
	RechargeFeeRate           decimal.Decimal
	LoadBalanceStrategy       string
	Settings                  map[string]any
	CreatedAt                 time.Time
	UpdatedAt                 time.Time
}
