import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

const mediaManifest = (): Plugin => ({
  name: 'media-manifest',
  buildStart() {
    const mediaDirectory = join(process.cwd(), 'public', 'media')
    const entries = readdirSync(mediaDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && !entry.name.startsWith('.') && entry.name !== 'README.md' && entry.name !== 'manifest.json')
      .map((entry) => {
        const name = entry.name
        const extension = name.split('.').pop()?.toLowerCase() ?? ''
        const kind = ['mp4', 'webm', 'mov', 'm4v'].includes(extension)
          ? 'movie'
          : ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(extension)
            ? 'image'
            : ['glb', 'gltf', 'obj', 'fbx'].includes(extension)
              ? 'model'
              : 'document'
        return {
          id: name,
          name,
          path: `./media/${encodeURIComponent(name)}`,
          kind,
          size: `${(statSync(join(mediaDirectory, name)).size / 1024 / 1024).toFixed(1)} MB`,
          source: 'library',
        }
      })
    writeFileSync(join(mediaDirectory, 'manifest.json'), JSON.stringify(entries, null, 2))
  },
})

export default defineConfig({
  base: './',
  plugins: [mediaManifest()],
})
