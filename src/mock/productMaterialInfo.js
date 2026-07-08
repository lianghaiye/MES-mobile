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
    material: p.material || '',
    drawingNo: p.drawingNo || '',
  }
}

function mapMaterial(m) {
  return {
    id: m.id,
    itemType: '物料',
    name: m.name,
    code: m.code,
    spec: m.specModel || '',
    material: m.material || '',
    drawingNo: m.drawingNo || '',
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
    material: p.material || '',
    drawingNo: p.drawingNo || '',
  }))
}

export function searchProductMaterials(keyword = '') {
  const kw = keyword.trim().toLowerCase()
  const list = loadProductMaterialItems()
  if (!kw) return list
  return list.filter((item) => {
    const hay = [item.name, item.code, item.spec, item.material, item.drawingNo]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(kw)
  })
}

/** 仅可销售产品（成品入库快速选择） */
export function searchSellableProducts(keyword = '') {
  const products = loadJson(PRODUCT_KEY, 'products')
  const mapped = products
    .filter((p) => p.canSell !== false)
    .map(mapProduct)
  const list = mapped.length ? mapped : loadProductMaterialItems().filter((i) => i.itemType === '产品')
  const kw = keyword.trim().toLowerCase()
  if (!kw) return list
  return list.filter((item) => {
    const hay = [item.name, item.code, item.spec, item.material, item.drawingNo]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(kw)
  })
}

export function getProductMaterialById(id) {
  return loadProductMaterialItems().find((item) => item.id === id) || null
}
