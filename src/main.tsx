import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// NOTE: StrictMode is intentionally omitted. The Babylon engine + SceneManager
// is an imperative WebGL singleton; StrictMode's dev-only double mount/dispose
// creates two engines and leaves the live scene's render loop without a driven
// camera (navigation breaks, and worlds build into a disposed scene).
createRoot(document.getElementById('root')!).render(<App />)
