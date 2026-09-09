const { configure } = require('quasar/wrappers')

module.exports = configure(function () {
  return {
    css: ['app.css'],
    extras: ['material-icons'],
    build: {
      vueRouterMode: 'history',
      env: {
        clientPrefix: ['QCLI_', 'VITE_'],
        file: process.env.QUASAR_ENV === 'staging' ? ['.env.staging'] : undefined
      },
      typescript: {
        strict: true
      },
      extendViteConf (viteConf) {
        viteConf.server = viteConf.server || {}
        viteConf.server.proxy = {
          ...(viteConf.server.proxy || {}),
          '/coolkid-rss': {
            target: 'http://127.0.0.1:8081',
            changeOrigin: true
          }
        }
      }
    },
    devServer: {
      open: true,
      port: 8080,
      host: 'localhost'
    },
    framework: {
      config: {
        dark: false,
        brand: {
          primary: '#2563eb',
          secondary: '#64748b',
          accent: '#0ea5e9',
          positive: '#16a34a',
          negative: '#dc2626',
          info: '#0284c7',
          warning: '#d97706'
        }
      },
      plugins: ['Dialog', 'Notify']
    },
    animations: []
  }
})
