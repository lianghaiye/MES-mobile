/** 工单/任务按工序登记：排产数量默认值 + 不良增加则良品相应减少 */

export function resolveScheduleQty(source = {}) {
  return Math.max(0, Number(source.scheduleQty ?? source.targetQty ?? source.planQty) || 0)
}

export function createScheduledProcessQuantities(scheduleQty) {
  const qty = resolveScheduleQty({ scheduleQty })
  return {
    scheduleQty: qty,
    goodQty: qty,
    defectQty: 0,
    qty: qty,
  }
}

export function snapshotProcessQty(record = {}) {
  record._qtySnapshot = {
    goodQty: Math.max(0, Number(record.goodQty) || 0),
    defectQty: Math.max(0, Number(record.defectQty) || 0),
  }
  return record
}

/** 不良品变动时，良品按同幅度反向调整（不低于 0） */
export function applyLinkedProcessQtyChange(record = {}, field, prev = {}) {
  const prevGood = Math.max(0, Number(prev.goodQty ?? record.goodQty) || 0)
  const prevDefect = Math.max(0, Number(prev.defectQty ?? record.defectQty) || 0)
  let goodQty = Math.max(0, Number(record.goodQty) || 0)
  let defectQty = Math.max(0, Number(record.defectQty) || 0)

  if (field === 'defect') {
    const delta = defectQty - prevDefect
    goodQty = Math.max(0, prevGood - delta)
    record.goodQty = goodQty
    record.defectQty = defectQty
  } else if (field === 'good') {
    record.goodQty = goodQty
  }

  record.qty = (Number(record.goodQty) || 0) + (Number(record.defectQty) || 0)
  snapshotProcessQty(record)
  return record
}

export function applyLinkedProcessQtyStep(record = {}, field, delta) {
  const prev = record._qtySnapshot || snapshotProcessQty(record)._qtySnapshot
  if (field === 'defect') {
    record.defectQty = Math.max(0, prev.defectQty + delta)
    record.goodQty = prev.goodQty
  } else {
    record.goodQty = Math.max(0, prev.goodQty + delta)
    record.defectQty = prev.defectQty
  }
  return applyLinkedProcessQtyChange(record, field, prev)
}

export function applyLinkedSingleQtyChange(form, field, delta) {
  const prevGood = Math.max(0, Number(form.goodQty) || 0)
  const prevDefect = Math.max(0, Number(form.defectQty) || 0)
  if (field === 'defect') {
    form.defectQty = Math.max(0, prevDefect + delta)
    form.goodQty = Math.max(0, prevGood - delta)
  } else {
    form.goodQty = Math.max(0, prevGood + delta)
  }
  form.finishedQty = form.goodQty + form.defectQty
  return form
}

export function applyLinkedSingleQtyFromDefect(form, prev = {}) {
  const prevGood = Math.max(0, Number(prev.goodQty ?? form.goodQty) || 0)
  const prevDefect = Math.max(0, Number(prev.defectQty ?? form.defectQty) || 0)
  const defectQty = Math.max(0, Number(form.defectQty) || 0)
  const delta = defectQty - prevDefect
  form.goodQty = Math.max(0, prevGood - delta)
  form.defectQty = defectQty
  form.finishedQty = form.goodQty + form.defectQty
  return form
}
