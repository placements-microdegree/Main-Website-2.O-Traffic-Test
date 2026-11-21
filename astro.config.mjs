// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// Hides the Astro dev toolbar that floats at the bottom of the page in `npm run dev`
	devToolbar: { enabled: false },
	// Inline the stylesheet so it doesn't block first paint with an extra request
	build: { inlineStylesheets: 'always' },
});
