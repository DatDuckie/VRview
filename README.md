# VR Shelf

A browser-based media shelf for WebXR headsets and Xbox-style controllers. The desktop view lets you browse a repository-backed collection, preview local uploads, and switch between TV mode and room mode. Enter VR to take the spatial shelf with you.

## Run it

```bash
npm install
npm run dev
```

Open the local Vite URL. WebXR works from `localhost` during development; deployed builds need HTTPS and a browser/headset with WebXR support.

## Publish on GitHub

Upload this folder to a GitHub repository using the `main` branch. The included GitHub Actions workflow builds and deploys the app to GitHub Pages automatically. In the repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**. After the workflow finishes, open the Pages URL on the computer or headset.

## Add repository media

Put files in `public/media` and push. The Vite build automatically scans that folder and generates the shelf manifest, so no code changes are needed. Supported shelf types are movies, images, 3D models, and documents. For large MP4 files, use Git LFS.

The browser upload control creates a temporary local preview. Browsers cannot write files back into a GitHub repository without an authenticated server or GitHub API integration, so permanent repository uploads still happen through GitHub or a future backend.

## VR controls

The WebXR scene exposes controller rays. Point and press the controller select button to rotate the room ring; the shelf is intentionally presented as a forward-facing TV panel rather than a full surround environment.
