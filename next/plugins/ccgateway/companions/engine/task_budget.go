package engine

import (
	"encoding/json"
	"fmt"
)

const taskBudgetBeta = "task-budgets-2026-03-13"

// Task budgets are API advisory controls, not CLI token-spend limits. Store
// the client's request-local value without decrementing it or pretending that
// the worker can meter the provider's server-side countdown.
func (p *RequestPlan) takeTaskBudget(body Object) error {
	config, ok := body["output_config"].(map[string]any)
	if !ok {
		return nil
	}
	value, exists := config["task_budget"]
	if !exists {
		return nil
	}
	if value != nil {
		budget, ok := value.(map[string]any)
		if !ok {
			return fmt.Errorf("output_config.task_budget must be an object or null")
		}
		if err := keys(budget, "type", "total", "remaining"); err != nil {
			return err
		}
		if str(budget, "type") != "tokens" {
			return fmt.Errorf("task_budget.type must be tokens")
		}
		if err := taskBudgetInteger(budget["total"], "total"); err != nil {
			return err
		}
		if remaining, exists := budget["remaining"]; exists && remaining != nil {
			if err := taskBudgetInteger(remaining, "remaining"); err != nil {
				return err
			}
		}
	}
	p.taskBudget, _ = json.Marshal(value)
	delete(config, "task_budget")
	return nil
}

func taskBudgetInteger(value any, field string) error {
	n, ok := value.(json.Number)
	if !ok {
		return fmt.Errorf("task_budget.%s must be a nonnegative integer", field)
	}
	number, err := n.Int64()
	if err != nil || number < 0 {
		return fmt.Errorf("task_budget.%s must be a nonnegative integer", field)
	}
	if field == "total" && number < 20000 {
		return fmt.Errorf("task_budget.total must be at least 20000 tokens")
	}
	return nil
}

func (p *RequestPlan) addTaskBudget(output Object) {
	if len(p.taskBudget) > 0 {
		value, _ := decodePlannedValue(p.taskBudget)
		output["task_budget"] = value
	}
}

func (p *RequestPlan) validateTaskBudget(req *Request) error {
	if p == nil || len(p.taskBudget) == 0 {
		return nil
	}
	found := false
	for _, beta := range req.Betas {
		found = found || beta == taskBudgetBeta
	}
	if !found {
		return fmt.Errorf("output_config.task_budget requires admitted %s beta", taskBudgetBeta)
	}
	var budget Object
	_ = json.Unmarshal(p.taskBudget, &budget)
	if budget["remaining"] != nil && (len(p.fields["compaction"]) > 0 || req.hasCompactionHistory()) {
		return fmt.Errorf("task_budget.remaining cannot be combined with compaction or signed compaction history")
	}
	if req.structuredOutput() || req.toolSearchEnabled() && !req.forcedLoadedClientCatalog() {
		return fmt.Errorf("task_budget with CLI internal rounds requires durable restoration of hidden helper history across client continuations and cold imports; use API server tools or client tool roundtrips")
	}
	return nil
}
