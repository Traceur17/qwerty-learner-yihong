/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { promises as fs } from 'fs'
import { getLastCommit } from 'git-last-commit'
import jotaiDebugLabel from 'jotai/babel/plugin-debug-label'
import jotaiReactRefresh from 'jotai/babel/plugin-react-refresh'
import path from 'node:path'
import { visualizer } from 'rollup-plugin-visualizer'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'
import type { PluginOption } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const latestCommitHash = await new Promise<string>((resolve) => {
    return getLastCommit((err, commit) => (err ? 'unknown' : resolve(commit.shortHash)))
  })
  return {
    plugins: [
      react({ babel: { plugins: [jotaiDebugLabel, jotaiReactRefresh] } }),
      visualizer() as PluginOption,
      Icons({
        compiler: 'jsx',
        jsx: 'react',
        customCollections: {
          'my-icons': {
            xiaohongshu: () => fs.readFile('./src/assets/xiaohongshu.svg', 'utf-8'),
          },
        },
      }),
      {
        name: 'emit-version-json',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'version.json',
            source: JSON.stringify({ hash: latestCommitHash }, null, 2),
          })
        },
      },
      {
        name: 'inject-version-check-bootstrap',
        transformIndexHtml(html) {
          const pagesPrefix = process.env.REACT_APP_DEPLOY_ENV === 'pages' ? '/qwerty-learner-yihong' : ''
          const bootstrap = `<script>(function(){var p=${JSON.stringify(pagesPrefix)};fetch((p||'')+'/version.json?_='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(d){if(!d||!d.hash)return;var u=new URL(location.href);if(u.searchParams.get('_v')===d.hash)return;u.searchParams.set('_v',d.hash);location.replace(u.toString())}).catch(function(){});if('serviceWorker' in navigator){navigator.serviceWorker.register((p||'')+'/sw.js',{scope:(p||'/')}).catch(function(){})}})();</script>`
          return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${bootstrap}`)
        },
      },
    ],
    build: {
      minify: true,
      outDir: 'build',
      sourcemap: false,
    },
    esbuild: {
      drop: mode === 'development' ? [] : ['console', 'debugger'],
    },
    define: {
      REACT_APP_DEPLOY_ENV: JSON.stringify(process.env.REACT_APP_DEPLOY_ENV),
      LATEST_COMMIT_HASH: JSON.stringify(latestCommitHash + (process.env.NODE_ENV === 'production' ? '' : ' (dev)')),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'tools/**/*.test.mjs'],
    },
  }
})
