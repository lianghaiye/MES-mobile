const KEY = 'i_doms_mobile_page_selection'

export function setSelectionResult(type, data) {
  uni.setStorageSync(KEY, { type, data, ts: Date.now() })
}

export function consumeSelectionResult(expectedType) {
  try {
    const raw = uni.getStorageSync(KEY)
    if (!raw || raw.type !== expectedType) return null
    uni.removeStorageSync(KEY)
    return raw.data
  } catch {
    return null
  }
}
