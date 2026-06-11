/** 产品与物料信息（与 Web 共用 localStorage） */
import { productList as fallbackProducts } from './quickReportProducts'

const PRODUCT_KEY = 'i_doms_product_info'
const MATERIAL_KEY = 'i_doms_material_info'

function loadJson(key, field) {
  try {
    const raw = uni.getStorageSync(key)
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed?.[field] || []
  } catch {
    return []
  }
}

function mapProduct(p) {
  return {
    id: p.id,
    itemType: '产品',
    name: p.name,
    code: p.code,
    spec: p.specModel || '',
  }
}

function mapMaterial(m) {
  return {
    id: m.id,
    itemType: '物料',
    name: m.name,
    code: m.code,
    spec: m.specModel || '',
  }
}

export function loadProductMaterialItems() {
  const products = loadJson(PRODUCT_KEY, 'products').map(mapProduct)
  const materials = loadJson(MATERIAL_KEY, 'materials').map(mapMaterial)
  const merged = [...products, ...materials]
  if (merged.length) return merged
  return fallbackProducts.map((p) => ({
    id: p.id,
    itemType: '产品',
    name: p.name,
    code: p.code,
    spec: p.spec || '',
  }))
}

export function searchProductMaterials(keyword = '') {
  const kw = keyword.trim().toLowerCase()
  const list = loadProductMaterialItems()
  if (!kw) return list
  return list.filter(
    (item) =>
      item.name.toLowerCase().includes(kw) ||
      item.code.toLowerCase().includes(kw) ||
      (item.spec && item.spec.toLowerCase().includes(kw)),
  )
}

export function getProductMaterialById(id) {
  return loadProductMaterialItems().find((item) => item.id === id) || null
}
