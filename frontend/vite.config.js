import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	base: "/",
	plugins: [
		preact(),
		tailwindcss()
	],
	preview: {
		port: 8080,
		strictPort: true,
	},
	server: {
		port: 8080,
		strictPort: true,
		host: true,
		origin: "http://0.0.0.0:8080",
	},
});

