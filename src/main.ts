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
type ViewMode = 'room' | 'theatre' | 'surround'

const icons: Record<MediaKind, string> = { movie: '▶', image: '▧', model: '◇', document: '≡' }
const modes: ViewMode[] = ['room', 'theatre', 'surround']
const modeLabels: Record<ViewMode, string> = { room: 'ROOM MODE', theatre: 'THEATRE MODE', surround: '360 MODE' }
const state = { items: [] as MediaItem[], selectedId: '', mode: 'theatre' as ViewMode, open: false }
const app = document.querySelector<HTMLDivElement>('#app')!
let updateSceneMedia = () => {}

app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">◒</span><span>VR <b>SHELF</b></span></div>
      <div class="status"><span class="status-dot"></span><span id="connection-status">LOCAL LIBRARY</span></div>
      <button class="primary-button" id="vr-button"><span class="button-icon">◉</span> ENTER VR <span>↗</span></button>
    </header>
    <section class="hero">
      <div class="hero-copy"><p class="eyebrow">YOUR PRIVATE MEDIA ROOM</p><h1>Drop in.<br><em>Step inside.</em></h1><p class="hero-lede">Add a file, pick your view, and take your shelf into VR.</p><div class="hero-actions"><label class="add-files-button" for="file-input"><span>↑</span> ADD FILES<input id="file-input" type="file" multiple accept="video/*,image/*,.glb,.gltf,.obj,.fbx,.pdf,.txt,.md" /></label><button class="secondary-button" id="hero-vr-button">OPEN VR <span>↗</span></button></div></div>
      <div class="hero-orbit"><div class="orbit-ring ring-one"></div><div class="orbit-ring ring-two"></div><div class="orbit-core">VR</div><span class="orbit-label label-top">01 / shelf</span><span class="orbit-label label-bottom">room scale</span></div>
    </section>
    <section class="workspace">
      <aside class="library-panel">
        <div class="panel-heading"><div><p class="eyebrow">COLLECTION</p><h2>Media shelf</h2></div><span class="count" id="item-count">04</span></div>
        <div class="filter-row"><button class="filter active" data-filter="all">All files</button><button class="filter" data-filter="movie">Movies</button><button class="filter" data-filter="image">Images</button></div>
        <div class="file-list" id="file-list"></div>
        <label class="drop-zone" for="file-input"><span class="upload-icon">↑</span><span><b>Add more files</b><small>tap to browse or drop files here</small></span></label>
      </aside>
      <section class="stage-panel">
        <div class="stage-heading"><div><p class="eyebrow">PREVIEW STAGE</p><h2 id="stage-title">Moon Station</h2></div><div class="stage-actions"><button class="icon-button" data-mode="room" title="Room view">⌂</button><button class="icon-button active" data-mode="theatre" title="Theatre view">▣</button><button class="icon-button" data-mode="surround" title="360 view">◎</button></div></div>
        <div class="preview" id="preview"><div class="preview-grid"></div><div class="preview-card"><div class="play-disc">▶</div><div><span class="preview-kicker">READY TO VIEW</span><h3 id="preview-name">Moon Station.mp4</h3><p id="preview-meta">Movie · 1.8 GB · repository</p></div></div><div class="preview-corner">A / SELECT<br>B / BACK</div></div>
        <div class="stage-footer"><div><span class="label">CURRENT MODE</span><strong id="mode-label">THEATRE MODE</strong></div><div><span class="label">VR CONTROLS</span><strong>LB / RB browse · A open · B close</strong></div><button class="launch-button" id="launch-button">LAUNCH IN VR <span>→</span></button></div>
      </section>
    </section>
    <footer><span>VR SHELF / 2026</span><span>Put your media in <code>public/media</code> to publish it with this repository.</span></footer>
  </main>
`

const list = document.querySelector<HTMLDivElement>('#file-list')!
const selected = () => state.items.find((item) => item.id === state.selectedId) ?? state.items[0]
const renderList = (filter = 'all') => {
  const filteredItems = state.items.filter((item) => filter === 'all' || item.kind === filter)
  list.innerHTML = filteredItems.length ? filteredItems.map((item) => `
    <button class="file-row ${item.id === state.selectedId ? 'selected' : ''}" data-id="${item.id}">
      <span class="file-icon ${item.kind}">${icons[item.kind]}</span><span class="file-name"><b>${item.name}</b><small>${item.kind} · ${item.size}</small></span><span class="row-arrow">${item.id === state.selectedId ? '●' : '›'}</span>
    </button>`).join('') : '<div class="empty-library"><span>＋</span><b>Your shelf is empty</b><small>Add files above or drop them here.</small></div>'
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
  updateSceneMedia()
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

let applySceneMode = () => {}
const setMode = (mode: ViewMode) => {
  state.mode = mode
  document.querySelector('#mode-label')!.textContent = modeLabels[mode]
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode))
  applySceneMode()
}
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode as ViewMode)))

const selectRelative = (direction: number) => {
  const filter = (document.querySelector('.filter.active') as HTMLElement)?.dataset.filter ?? 'all'
  const visibleItems = state.items.filter((item) => filter === 'all' || item.kind === filter)
  if (!visibleItems.length) return
  const currentIndex = visibleItems.findIndex((item) => item.id === state.selectedId)
  const nextIndex = (currentIndex + direction + visibleItems.length) % visibleItems.length
  state.selectedId = visibleItems[nextIndex].id
  renderList(filter)
  updateStage()
}
const openSelected = () => {
  if (!selected()) return
  state.open = true
  document.querySelector('#preview')?.classList.add('is-open')
  updateSceneMedia()
}
const closeSelected = () => {
  state.open = false
  document.querySelector('#preview')?.classList.remove('is-open')
  updateSceneMedia()
}

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
const mediaPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 1.72), new THREE.MeshBasicMaterial({ color: 0x12201e }))
mediaPlane.position.set(0, 1.8, -1.87)
mediaPlane.visible = false
room.add(mediaPlane)
const vrUi = new THREE.Group()
room.add(vrUi)
const vrCardGroup = new THREE.Group()
vrUi.add(vrCardGroup)
const vrStatus = new THREE.Mesh(
  new THREE.PlaneGeometry(2.8, 0.34),
  new THREE.MeshBasicMaterial({ color: 0x10211d, transparent: true, opacity: 0.94 }),
)
vrStatus.position.set(0, 3.02, -1.88)
vrUi.add(vrStatus)
const canvasTexture = (text: string, accent = '#a7e0c5') => {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 256
  const context = canvas.getContext('2d')!
  context.fillStyle = '#10211d'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = accent
  context.fillRect(0, 0, 12, canvas.height)
  context.font = '600 42px Arial'
  context.fillText(text, 38, 94)
  context.fillStyle = '#8da29d'
  context.font = '26px monospace'
  context.fillText('LB/RB browse   A select   B close', 38, 174)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
const refreshVrUi = () => {
  vrCardGroup.clear()
  const visibleItems = state.items
  const selectedIndex = Math.max(0, visibleItems.findIndex((item) => item.id === state.selectedId))
  visibleItems.slice(Math.max(0, selectedIndex - 2), selectedIndex + 3).forEach((item, index) => {
    const absoluteIndex = Math.max(0, selectedIndex - 2) + index
    const isSelected = absoluteIndex === selectedIndex
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(isSelected ? 1.16 : 0.92, isSelected ? 0.7 : 0.56),
      new THREE.MeshBasicMaterial({ color: isSelected ? 0x2f6657 : 0x1b302d, transparent: true, opacity: isSelected ? 1 : 0.78 }),
    )
    card.position.set((index - 2) * 1.08, 0.72 + (isSelected ? 0.08 : 0), -1.82)
    card.userData.itemId = item.id
    vrCardGroup.add(card)
  })
  const statusMaterial = vrStatus.material as THREE.MeshBasicMaterial
  statusMaterial.map?.dispose()
  statusMaterial.map = canvasTexture(`${modeLabels[state.mode]}  /  ${selected()?.name ?? 'EMPTY SHELF'}`, state.open ? '#ff8e69' : '#a7e0c5')
  statusMaterial.color.set(0xffffff)
  statusMaterial.needsUpdate = true
}
const surround = new THREE.Mesh(new THREE.SphereGeometry(7, 32, 20), new THREE.MeshBasicMaterial({ color: 0x132a27, side: THREE.BackSide, transparent: true, opacity: 0.9, wireframe: true }))
surround.visible = false
scene.add(surround)
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
  scene.add(controller)
}
controllerGrip('left')
controllerGrip('right')
updateSceneMedia = () => {
  const item = selected()
  if (!item) return
  const material = mediaPlane.material as THREE.MeshBasicMaterial
  const mediaUrl = item.url ?? item.path
  if (item.kind === 'image') {
    material.map = new THREE.TextureLoader().load(mediaUrl)
    material.color.set(0xffffff)
    material.needsUpdate = true
  } else {
    material.map = null
    material.color.set(item.kind === 'movie' ? 0x6b3027 : 0x21443b)
    material.needsUpdate = true
  }
  mediaPlane.visible = state.open && state.mode !== 'surround'
  refreshVrUi()
}
applySceneMode = () => {
  const isSurround = state.mode === 'surround'
  panel.visible = !isSurround
  panelFrame.visible = !isSurround
  mediaPlane.visible = state.open && !isSurround
  surround.visible = isSurround
  const scale = state.mode === 'theatre' ? 1.22 : state.mode === 'room' ? 1 : 0.92
  panel.scale.set(scale, scale, 1)
  panelFrame.scale.set(scale, scale, 1)
  mediaPlane.scale.set(scale, scale, 1)
  rings.visible = state.mode !== 'theatre'
  vrUi.visible = !state.open || isSurround
  if (isSurround) {
    panel.visible = false
    panelFrame.visible = false
    mediaPlane.visible = false
  }
  refreshVrUi()
}
applySceneMode()
const previousButtons = new Map<string, boolean[]>()
const pollControllerButtons = () => {
  const session = renderer.xr.getSession()
  if (!session) return
  session.inputSources.forEach((source, sourceIndex) => {
    if (!source.gamepad) return
    const key = source.handedness || `source-${sourceIndex}`
    const current = source.gamepad.buttons.map((button) => button.pressed)
    const previous = previousButtons.get(key) ?? []
    const pressed = (index: number) => current[index] && !previous[index]
    // XR gamepads expose shoulder buttons as 4/5 and D-pad as 14/15.
    if (pressed(4)) selectRelative(-1)
    if (pressed(5)) selectRelative(1)
    if (pressed(14)) setMode(modes[(modes.indexOf(state.mode) + modes.length - 1) % modes.length])
    if (pressed(15)) setMode(modes[(modes.indexOf(state.mode) + 1) % modes.length])
    if (pressed(0)) openSelected()
    if (pressed(1)) closeSelected()
    // Some controllers expose LB/RB as the first two non-trigger buttons.
    if (pressed(2) && source.gamepad.buttons.length < 6) selectRelative(-1)
    if (pressed(3) && source.gamepad.buttons.length < 6) selectRelative(1)
    previousButtons.set(key, current)
  })
}
const vrButton = VRButton.createButton(renderer)
vrButton.id = 'hidden-vr-button'
vrButton.className = 'hidden-vr-button'
document.body.appendChild(vrButton)
const enterVr = () => (vrButton.querySelector('button') as HTMLButtonElement | null)?.click() ?? vrButton.click()
document.querySelector('#vr-button')!.addEventListener('click', enterVr)
document.querySelector('#hero-vr-button')!.addEventListener('click', enterVr)
document.querySelector('#launch-button')!.addEventListener('click', enterVr)
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
renderer.setAnimationLoop(() => { pollControllerButtons(); rings.rotation.y += state.mode === 'surround' ? 0.006 : 0.002; renderer.render(scene, camera) })
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
