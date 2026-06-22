export const MOBILE_LABOR_WAGE_KEY = 'i_doms_mobile_labor_wage_lines'

export const TASK_STATUS = {
  REPORTED: '已报工',
  AUDITED: '已审核',
}

export const PUSH_STATUS = {
  NOT_PUSHED: '未推送',
  PUSHED: '已推送',
  AUTO_PUSHED: '已自动推送',
}

export function isPushedToMobile(pushStatus) {
  return pushStatus === PUSH_STATUS.PUSHED || pushStatus === PUSH_STATUS.AUTO_PUSHED
}

const FUNCTION_PARAM_KEY = 'i_doms_function_params'

/** 与 WEB functionParamStore 共用配置 */
export function isAutoSalaryPush() {
  try {
    const raw = uni.getStorageSync(FUNCTION_PARAM_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed.salaryPushMode === 'auto'
    }
  } catch {
    /* ignore */
  }
  return false
}
