import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Netlifyの環境変数を読み込む
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // コード内の process.env.API_KEY を、Netlifyで設定した実際のキーに置換する
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})