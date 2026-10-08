package engine

import "fmt"

func programmaticTool(tool Object) bool {
	callers, _ := tool["allowed_callers"].([]any)
	for _, caller := range callers {
		if caller != "direct" {
			return true
		}
	}
	return false
}

// Output authorization is issued by core only when it can register provider
// containers and generated files before exposing the response to its owner.
func (r *Request) validateExecutionAdmission() error {
	needed := false
	for _, tool := range r.ServerTools {
		needed = needed || codeExecutionVersion(str(tool, "type")) || implicitCodeExecution(tool)
	}
	for _, tool := range r.Tools {
		needed = needed || programmaticTool(tool.Metadata)
	}
	for _, tool := range r.APIClientTools {
		needed = needed || programmaticTool(tool)
	}
	for _, message := range r.Messages {
		for _, block := range message.Content {
			caller, _ := block["caller"].(Object)
			needed = needed || codeExecutionResult(str(block, "type")) || str(block, "type") == "server_tool_use" && codeExecutionCall(str(block, "name")) || caller != nil && str(caller, "type") != "direct"
		}
	}
	if needed && !r.resourceOutputsAllowed() {
		return fmt.Errorf("provider execution requires trusted resource output registration")
	}
	return nil
}

func (r *Request) configureProviderExecution() error {
	if r.Plan != nil && r.Plan.container != nil {
		if !r.resourceOutputsAllowed() {
			return fmt.Errorf("container requires trusted resource output registration")
		}
		container := r.Plan.container
		if container.ID != "" {
			if err := r.requireResourceKind("container", container.ID); err != nil {
				return err
			}
		}
		for _, skill := range container.Skills {
			if str(skill, "type") == "custom" {
				if err := r.requireResourceKind("skill", str(skill, "skill_id")); err != nil {
					return err
				}
				if err := r.requireSkillVersion(str(skill, "skill_id"), str(skill, "version")); err != nil {
					return err
				}
			}
		}
	}
	// Container ownership alone does not prove that a supplied paused execution
	// belongs to it. Keep this precise continuation boundary closed until core
	// supplies the parent execution binding, rather than guess from client JSON.
	ledger := newPTCLedger()
	programmaticParents := map[string]bool{}
	for _, message := range r.Messages {
		if message.Role == "user" {
			if err := ledger.user(message.Content); err != nil {
				return err
			}
		}
		if message.Role == "assistant" {
			ledger.beginTurn()
			for _, block := range message.Content {
				if caller, ok := block["caller"].(Object); ok && str(caller, "type") != "direct" {
					programmaticParents[str(caller, "tool_id")] = true
				}
				if err := ledger.assistant(block); err != nil {
					return err
				}
			}
		}
	}
	for parent := range ledger.parents {
		if !programmaticParents[parent] {
			continue
		}
		if r.Plan == nil || r.Plan.container == nil || r.Plan.container.ID == "" {
			return fmt.Errorf("programmatic continuation requires its original container")
		}
		if err := r.checkResourceContext(parent, r.Plan.container.ID); err != nil {
			return err
		}
	}
	return nil
}
