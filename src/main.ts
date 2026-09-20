import * as THREE from 'three'
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js'
import './style.css'

type MediaKind = 'movie' | 'image' | 'model' | 'document'
type MediaItem = {
  id: string
  name: string
  path: string
  kind: MediaKind
  size: string
  source: 'library' | 'upload'
  url?: string
}

const icons: Record<MediaKind, string> = { movie: '▶', image: '▧', model: '◇', document: '≡' }
const state = { items: [] as MediaItem[], selectedId: '', mode: 'room' as 'room' | 'tv' }
const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">◒</span><span>VR <b>SHELF</b></span></div>
      <div class="status"><span class="status-dot"></span><span id="connection-status">LOCAL LIBRARY</span></div>
      <button class="primary-button" id="vr-button">ENTER VR <span>↗</span></button>
    </header>
    <section class="hero">
      <div class="hero-copy"><p class="eyebrow">YOUR PRIVATE MEDIA ROOM</p><h1>Everything you brought.<br><em>Nothing in the way.</em></h1><p class="hero-lede">Browse your repository shelf, drop in a file, then take the room with you.</p></div>
      <div class="hero-orbit"><div class="orbit-ring ring-one"></div><div class="orbit-ring ring-two"></div><div class="orbit-core">VR</div><span class="orbit-label label-top">01 / shelf</span><span class="orbit-label label-bottom">room scale</span></div>
    </section>
    <section class="workspace">
      <aside class="library-panel">
        <div class="panel-heading"><div><p class="eyebrow">COLLECTION</p><h2>Media shelf</h2></div><span class="count" id="item-count">04</span></div>
        <div class="filter-row"><button class="filter active" data-filter="all">All files</button><button class="filter" data-filter="movie">Movies</button><button class="filter" data-filter="image">Images</button></div>
        <div class="file-list" id="file-list"></div>
        <label class="drop-zone" for="file-input"><span class="upload-icon">↑</span><span><b>Drop files here</b><small>or browse your device</small></span><input id="file-input" type="file" multiple accept="video/*,image/*,.glb,.gltf,.pdf,.txt,.md" /></label>
      </aside>
      <section class="stage-panel">
        <div class="stage-heading"><div><p class="eyebrow">PREVIEW STAGE</p><h2 id="stage-title">Moon Station</h2></div><div class="stage-actions"><button class="icon-button" id="room-button" title="Room view">⌘</button><button class="icon-button active" id="tv-button" title="TV view">▣</button></div></div>
        <div class="preview" id="preview"><div class="preview-grid"></div><div class="preview-card"><div class="play-disc">▶</div><div><span class="preview-kicker">READY TO VIEW</span><h3 id="preview-name">Moon Station.mp4</h3><p id="preview-meta">Movie · 1.8 GB · repository</p></div></div><div class="preview-corner">A / SELECT<br>B / BACK</div></div>
        <div class="stage-footer"><div><span class="label">CURRENT MODE</span><strong id="mode-label">TV MODE</strong></div><div><span class="label">CONTROLS</span><strong>Xbox controller ready</strong></div><button class="launch-button" id="launch-button">LAUNCH IN VR <span>→</span></button></div>
      </section>
    </section>
    <footer><span>VR SHELF / 2026</span><span>Put your media in <code>public/media</code> to publish it with this repository.</span></footer>
  </main>
`

const list = document.querySelector<HTMLDivElement>('#file-list')!
const selected = () => state.items.find((item) => item.id === state.selectedId) ?? state.items[0]
const renderList = (filter = 'all') => {
  list.innerHTML = state.items.filter((item) => filter === 'all' || item.kind === filter).map((item) => `
    <button class="file-row ${item.id === state.selectedId ? 'selected' : ''}" data-id="${item.id}">
      <span class="file-icon ${item.kind}">${icons[item.kind]}</span><span class="file-name"><b>${item.name}</b><small>${item.kind} · ${item.size}</small></span><span class="row-arrow">${item.id === state.selectedId ? '●' : '›'}</span>
    </button>`).join('')
  document.querySelector('#item-count')!.textContent = String(state.items.length).padStart(2, '0')
}
const updateStage = () => {
  const item = selected()
  if (!item) return
  document.querySelector('#stage-title')!.textContent = item.name.replace(/\.[^.]+$/, '')
  document.querySelector('#preview-name')!.textContent = item.name
  document.querySelector('#preview-meta')!.textContent = `${item.kind[0].toUpperCase() + item.kind.slice(1)} · ${item.size} · ${item.source}`
  const preview = document.querySelector<HTMLDivElement>('#preview')!
  preview.dataset.kind = item.kind
  preview.style.backgroundImage = ''
  preview.querySelector('.media-preview')?.remove()
  const mediaUrl = item.url ?? item.path
  if (item.kind === 'image') {
    const media = document.createElement('img')
    media.className = 'media-preview'
    media.src = mediaUrl
    media.setAttribute('aria-label', item.name)
    preview.prepend(media)
  } else if (item.kind === 'movie') {
    const media = document.createElement('video')
    media.className = 'media-preview'
    media.src = mediaUrl
    media.setAttribute('aria-label', item.name)
    media.controls = true
    media.muted = true
    media.loop = true
    preview.prepend(media)
  }
}

list.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-id]')
  if (!target) return
  state.selectedId = target.dataset.id ?? state.selectedId
  renderList((document.querySelector('.filter.active') as HTMLElement)?.dataset.filter ?? 'all')
  updateStage()
})
document.querySelectorAll<HTMLButtonElement>('.filter').forEach((button) => button.addEventListener('click', () => {
  document.querySelector('.filter.active')?.classList.remove('active')
  button.classList.add('active')
  renderList(button.dataset.filter ?? 'all')
}))

document.querySelector<HTMLInputElement>('#file-input')!.addEventListener('change', (event) => {
  const files = Array.from((event.target as HTMLInputElement).files ?? [])
  files.forEach((file) => {
    const kind: MediaKind = file.type.startsWith('video') ? 'movie' : file.type.startsWith('image') ? 'image' : file.name.endsWith('.glb') || file.name.endsWith('.gltf') ? 'model' : 'document'
    state.items.push({ id: `${file.name}-${file.lastModified}`, name: file.name, path: file.name, kind, size: `${(file.size / 1024 / 1024).toFixed(1)} MB`, source: 'upload', url: URL.createObjectURL(file) })
  })
  if (files[0]) state.selectedId = state.items.at(-files.length)?.id ?? state.selectedId
  renderList()
  updateStage()
})

const setMode = (mode: 'room' | 'tv') => {
  state.mode = mode
  document.querySelector('#mode-label')!.textContent = mode === 'tv' ? 'TV MODE' : 'ROOM MODE'
  document.querySelector('#tv-button')?.classList.toggle('active', mode === 'tv')
  document.querySelector('#room-button')?.classList.toggle('active', mode === 'room')
}
document.querySelector('#tv-button')!.addEventListener('click', () => setMode('tv'))
document.querySelector('#room-button')!.addEventListener('click', () => setMode('room'))

const scene = new THREE.Scene()
scene.background = new THREE.Color('#0c1212')
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 1.6, 4)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.xr.enabled = true
renderer.domElement.className = 'vr-canvas'
document.body.appendChild(renderer.domElement)
const light = new THREE.HemisphereLight(0xb8d6ce, 0x111111, 2)
scene.add(light)
const room = new THREE.Group()
const floor = new THREE.Mesh(new THREE.CircleGeometry(5, 64), new THREE.MeshBasicMaterial({ color: 0x172424, transparent: true, opacity: 0.45 }))
floor.rotation.x = -Math.PI / 2
room.add(floor)
const grid = new THREE.GridHelper(10, 20, 0x3d6863, 0x203635)
grid.position.y = 0.01
room.add(grid)
const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.9), new THREE.MeshBasicMaterial({ color: 0x243b38 }))
panel.position.set(0, 1.8, -1.9)
room.add(panel)
const panelFrame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.4, 1.9)), new THREE.LineBasicMaterial({ color: 0x82c9ae }))
panelFrame.position.copy(panel.position)
room.add(panelFrame)
const rings = new THREE.Group()
for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7 + i * 0.22, 0.008, 8, 64), new THREE.MeshBasicMaterial({ color: i === 1 ? 0xb3e5cf : 0x3f7168, transparent: true, opacity: 0.7 }))
  ring.rotation.x = Math.PI / 2
  ring.position.set(0, 0.04 + i * 0.02, 0)
  rings.add(ring)
}
room.add(rings)
scene.add(room)
const controllerGrip = (hand: 'left' | 'right') => {
  const controller = renderer.xr.getController(hand === 'left' ? 0 : 1)
  controller.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0x9be0c4 })))
  controller.addEventListener('selectstart', () => rings.rotation.y += 0.6)
  scene.add(controller)
}
controllerGrip('left')
controllerGrip('right')
const vrButton = VRButton.createButton(renderer)
vrButton.id = 'hidden-vr-button'
vrButton.className = 'hidden-vr-button'
document.body.appendChild(vrButton)
const enterVr = () => (vrButton.querySelector('button') as HTMLButtonElement | null)?.click() ?? vrButton.click()
document.querySelector('#vr-button')!.addEventListener('click', enterVr)
document.querySelector('#launch-button')!.addEventListener('click', enterVr)
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
renderer.setAnimationLoop(() => { rings.rotation.y += 0.002; renderer.render(scene, camera) })
const loadLibrary = async () => {
  const response = await fetch('./media/manifest.json')
  if (!response.ok) throw new Error('Media manifest is unavailable')
  state.items = await response.json() as MediaItem[]
  state.selectedId = state.items[0]?.id ?? ''
  renderList()
  updateStage()
}

loadLibrary().catch(() => {
  document.querySelector('#connection-status')!.textContent = 'NO MEDIA YET'
  renderList()
})
