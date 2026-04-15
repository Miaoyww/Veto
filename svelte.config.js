import adapterVercel from '@sveltejs/adapter-vercel';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isTauri = !!process.env.TAURI_ENV_PLATFORM;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: isTauri
			? adapterStatic({ fallback: 'index.html' })
			: adapterVercel(),
		csrf: {
			checkOrigin: false
		},
		alias: {
			'$units': 'src/units'
		}
	}
};

export default config;
