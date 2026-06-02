import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// GitHub Pages 项目站：https://lianghaiye.github.io/MES-mobile/
const isGithubPages = process.env.GITHUB_PAGES === 'true'

export default defineConfig({
  base: isGithubPages ? '/MES-mobile/' : '/',
  plugins: [uni()],
})
