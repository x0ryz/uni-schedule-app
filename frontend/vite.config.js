import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [
		preact(),
		tailwindcss()
	],
	server: {
        allowedHosts: [
          'noncensurable-obeisantly-val.ngrok-free.dev'
        ],
    },
});
