/* eslint-env node */
// Force Tailwind to use the CommonJS config to avoid experimental require() of ESM
process.env.TAILWIND_CONFIG = process.env.TAILWIND_CONFIG || 'tailwind.config.cjs';
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		// run vite dev server on a different port than backend (backend uses 3000)
		port: 3002,
		proxy: {
			"/api": {
				// forward API requests to backend running on localhost:3000
				target: "http://localhost:3000",
				changeOrigin: true,
			},
		},
	},
});
