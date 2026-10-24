import { setWasmUrl } from '@lottiefiles/dotlottie-react'
import wasmUrl from '@lottiefiles/dotlottie-web/dotlottie-player.wasm?url'

// By default dotlottie downloads its WASM runtime from a public CDN, which
// breaks the success animation when the vendor is offline. Serve it from our
// own origin instead (and let the service worker precache it).
setWasmUrl(wasmUrl)
