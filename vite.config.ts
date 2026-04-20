import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CI 환경(GitHub Actions)에서는 /<repo-name>/ 으로 자동 설정, 로컬 dev는 /
const base = process.env.GITHUB_REPOSITORY
  ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
  : '/'

export default defineConfig({
  plugins: [react()],
  base,
})
