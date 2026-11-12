// The form of a segment: a named one has a name, a description and a
// discount; a personal one (named after its user by the system) only the
// discount.
import type { Segment } from '@/api/pricing'
import { validRate } from '@/components/pricing/pricingFormat'

// Whether a segment has a discount to show is a rule of every pricing view.
export { hasDiscount } from '@/components/pricing/pricingFormat'

export interface SegmentForm {
  name: string
  description: string
  discount: string
}

/** The form of `segment`; of a new one without it. */
export function formOf(segment: Segment | null): SegmentForm {
  return { name: segment?.name ?? '', description: segment?.description ?? '', discount: String(segment?.discount ?? '1') }
}

/** A discount is a rate above zero; "1" is none. */
export const validDiscount = (v: string): boolean => validRate(v) && Number(v) > 0

/** The body of POST /segments and PATCH /segments/:id. */
export function segmentBody(form: SegmentForm, personal: boolean): Partial<SegmentForm> {
  const discount = form.discount.trim()
  return personal ? { discount } : { name: form.name.trim(), description: form.description.trim(), discount }
}

/** Whether the form differs from the segment it was opened on. */
export function formChanged(form: SegmentForm, segment: Segment | null): boolean {
  const personal = segment?.kind === 'personal'
  const now = segmentBody(form, personal)
  const was = segmentBody(formOf(segment), personal)
  return (Object.keys(now) as Array<keyof SegmentForm>).some((k) => now[k] !== was[k])
}
