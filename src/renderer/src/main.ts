import { mount } from 'svelte'

import App from './routes/index.svelte'

const app = mount(App, {
  target: document.getElementById('app')!
})

export default app
