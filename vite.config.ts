import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Serves the Vercel function in api/contact.js during `npm run dev`, with env from .env.local.
const contactApi = (): Plugin => ({
  name: 'contact-api',
  configureServer(server) {
    Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''))
    server.middlewares.use('/api/contact', async (req, res) => {
      try {
        const { default: handler } = await server.ssrLoadModule('/api/contact.js')
        await handler(req, res)
      } catch (err) {
        server.config.logger.error(`[contact-api] ${err}`)
        res.statusCode = 500
        res.end(JSON.stringify({ ok: false, error: 'Server error' }))
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    contactApi(),
  ],
})
