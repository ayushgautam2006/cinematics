import { createRoot } from 'react-dom/client'
import App from './App'

/* No StrictMode. Its intentional double-invocation of effects means a WebGL
   context and a Lenis instance are created, destroyed and recreated on every
   mount, which in a scroll-driven 3D scene costs a visible hitch on load for
   no diagnostic benefit here. */
createRoot(document.getElementById('root')).render(<App />)
