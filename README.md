# MES-mobile

I-DOMS MES **移动端延伸**（uni-app + Vue 3），主要发布为**微信小程序**，与 PC 端 `i-doms-web` 并列开发。

## 目录位置

```
CURSOR/
├── i-doms-web/      # PC 端
└── i-doms-mobile/   # 移动端（本项目）
```

## 功能模块

| 模块 | 状态 |
|------|------|
| 待办任务 | 占位页 |
| **质检任务** | 出厂质检列表、详情、移动端质检提交 |
| 工时工资 | 占位页 |
| 审批管理 | 占位页 |
| 领料管理 | 工单领料 / 快速领料，提交后同步 WEB 出库管理 |
| 成品入库 | 工单入库 / 快速入库，提交后同步 WEB 入库管理（待审批） |

## 环境要求

- Node.js 18+
- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- （可选）HBuilderX

## 安装与运行

```bash
cd i-doms-mobile
npm install

# 编译到微信小程序
npm run dev:mp-weixin
```

编译产物目录：`dist/dev/mp-weixin`

1. 打开微信开发者工具  
2. 导入项目 → 选择 `dist/dev/mp-weixin`  
3. 在 `src/manifest.json` → `mp-weixin.appid` 填入你的小程序 AppID（测试可用测试号）

### H5 预览（浏览器）

```bash
npm run dev:h5
```

### GitHub Pages 在线预览

地址：**https://lianghaiye.github.io/MES-mobile/**

仓库已配置 GitHub Actions（`.github/workflows/deploy-github-pages.yml`），推送 `main` 后会自动构建 H5 并发布。

**首次请在 GitHub 仓库设置中启用 Pages：**

1. 打开 **Settings → Pages**
2. **Build and deployment → Source** 选择 **GitHub Actions**
3. 等待工作流跑完后刷新上述链接

> 说明：微信小程序请用微信开发者工具导入 `dist/dev/mp-weixin`；GitHub Pages 仅用于 H5 浏览器预览，不是小程序运行环境。

## 演示账号

- 账号：`admin`（或任意非空账号）  
- 密码：任意非空  

登录后进入工作台，「质检任务」可查看 mock 数据并提交质检。

## 与 PC 端对齐

- 质检字段与 `i-doms-web` 出厂质检（`factoryQc`）保持一致，便于后续对接同一 REST API。  
- 当前数据存于小程序 `uni.storage` mock，刷新小程序后仍保留（除非清缓存）。

## 生产构建

```bash
npm run build:mp-weixin
```

上传 `dist/build/mp-weixin` 到微信公众平台。
