import { addAuditor, addStage, MAX_STAGE_AUDITORS, MAX_STAGES, moveAuditor, moveStage, removeAuditor, type AuditorTypeOf } from './flowOps'
import type { Spec } from './types'

// Drag and drop on the flow canvas (new-api canvas-drag.ts): the payload of
// a drag and what a drop does to the draft (flowOps.ts).

/** What is dragged: a library auditor, an auditor placed in a stage, or a stage. */
export type CanvasDrag = { kind: 'library'; auditor: number } | { kind: 'node'; stage: number; index: number } | { kind: 'stage'; stage: number }

/** Where it is dropped: a stage, the "new stage" zone, or the library (= remove). */
export type CanvasDropTarget = { kind: 'stage'; stage: number } | { kind: 'new' } | { kind: 'trash' }

const DRAG_TYPE = 'application/x-content-moderation-flow'

export function startCanvasDrag(event: DragEvent, drag: CanvasDrag) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(drag))
  event.dataTransfer.setData('text/plain', JSON.stringify(drag))
  event.dataTransfer.effectAllowed = 'move'
  event.stopPropagation()
}

export function readCanvasDrag(event: DragEvent): CanvasDrag | null {
  const dt = event.dataTransfer
  if (!dt) return null
  try {
    const value = JSON.parse(dt.getData(DRAG_TYPE) || dt.getData('text/plain'))
    return typeof value === 'object' && value !== null && 'kind' in value ? (value as CanvasDrag) : null
  } catch {
    return null
  }
}

/** dragover: accepts only canvas drags (the payload itself is unreadable until drop). */
export function acceptsCanvasDrag(event: DragEvent): boolean {
  const types = event.dataTransfer?.types
  return !!types && (Array.from(types).includes(DRAG_TYPE) || Array.from(types).includes('text/plain'))
}

/** dragleave that only moves onto a child of the drop zone. */
export const leavesInside = (event: DragEvent) => {
  const to = event.relatedTarget as Node | null
  return !!to && (event.currentTarget as HTMLElement | null)?.contains(to) === true
}

/**
 * Applies a drop (new-api flow-canvas applyDrop). Returns the new spec, or
 * the reason nothing changed: `duplicate` (target stage has the auditor),
 * `full` (target stage holds the maximum), `max_stages`, or `noop`.
 */
export function applyDrop(spec: Spec, drag: CanvasDrag, target: CanvasDropTarget, typeOf: AuditorTypeOf): Spec | 'duplicate' | 'full' | 'max_stages' | 'noop' {
  let next = spec
  if (target.kind === 'trash') {
    if (drag.kind === 'node') next = removeAuditor(spec, drag.stage, drag.index)
  } else if (target.kind === 'new') {
    if (drag.kind === 'library') next = addStage(spec, drag.auditor, typeOf)
    if (drag.kind === 'node') next = moveAuditor(spec, drag, { stage: spec.stages.length })
    if (next === spec && drag.kind !== 'stage' && spec.stages.length >= MAX_STAGES) return 'max_stages'
  } else if (drag.kind === 'stage') next = moveStage(spec, drag.stage, target.stage)
  else if (drag.kind === 'library') next = addAuditor(spec, target.stage, drag.auditor, typeOf)
  else if (drag.stage !== target.stage) next = moveAuditor(spec, drag, { stage: target.stage })
  else return 'noop'

  if (next !== spec) return next
  if (drag.kind !== 'stage' && target.kind === 'stage') {
    const st = spec.stages[target.stage]
    const id = drag.kind === 'library' ? drag.auditor : spec.stages[drag.stage]?.auditors[drag.index]
    if (st && id !== undefined && st.auditors.includes(id)) return 'duplicate'
    if (st && st.auditors.length >= MAX_STAGE_AUDITORS) return 'full'
  }
  return 'noop'
}
