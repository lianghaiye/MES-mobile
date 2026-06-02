const TOKEN_KEY = 'i_doms_mobile_token'
const USER_KEY = 'i_doms_mobile_user'

export function isLoggedIn() {
  return Boolean(uni.getStorageSync(TOKEN_KEY))
}

export function getUser() {
  try {
    const raw = uni.getStorageSync(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function login(username, password) {
  if (!username?.trim()) return { ok: false, message: '请输入账号' }
  if (!password?.trim()) return { ok: false, message: '请输入密码' }
  const user = {
    username: username.trim(),
    displayName: username.trim() === 'admin' ? '管理员' : username.trim(),
    factory: '默认工厂',
  }
  uni.setStorageSync(TOKEN_KEY, `mock-token-${Date.now()}`)
  uni.setStorageSync(USER_KEY, JSON.stringify(user))
  return { ok: true, user }
}

export function logout() {
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync(USER_KEY)
}
