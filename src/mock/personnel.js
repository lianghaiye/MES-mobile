/** 人员 mock */

export const personnelList = [
  { id: 'u1', name: '张三', dept: '焊接车间', workCenter: '焊接车间' },
  { id: 'u2', name: '李四', dept: '焊接车间', workCenter: '焊接车间' },
  { id: 'u3', name: '王五', dept: '冲压车间', workCenter: '冲压车间' },
  { id: 'u4', name: '赵六', dept: '机加车间', workCenter: '机加车间' },
  { id: 'u5', name: '钱七', dept: '机加车间', workCenter: '机加车间' },
  { id: 'u6', name: '孙八', dept: '装配车间', workCenter: '装配车间' },
  { id: 'u7', name: '周九', dept: '装配车间', workCenter: '装配车间' },
  { id: 'u8', name: '吴十', dept: '质检组', workCenter: '质检组' },
]

export function getWorkCenterOptions() {
  return [...new Set(personnelList.map((p) => p.workCenter))]
}

export function searchPersonnel(keyword = '', workCenter = '') {
  const kw = keyword.trim().toLowerCase()
  return personnelList.filter((p) => {
    if (workCenter && p.workCenter !== workCenter) return false
    if (!kw) return true
    return (
      p.name.toLowerCase().includes(kw) ||
      p.dept.toLowerCase().includes(kw) ||
      p.workCenter.toLowerCase().includes(kw)
    )
  })
}
