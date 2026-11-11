import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { validateProductConfig } from '@cineflex/shared';

// Seleciona qual produto da LPS será compilado (Básico, Plus ou configuração exportada).
const root = resolve(import.meta.dirname, '../..');
const file = resolve(root, process.env.PRODUCT_CONFIG_PATH || 'products/cineflex-basic.json');
const product = validateProductConfig(JSON.parse(readFileSync(file, 'utf8')));
const outDir = process.env.PRODUCT_OUTPUT_DIR || resolve(root, 'dist/products', product.name);

console.log(`[LPS] Produto: ${product.name} | Configuração: ${basename(file)}`);
export default defineConfig({
  plugins: [react()],
  define: { __PRODUCT_CONFIG__: JSON.stringify(product) },
  build: { outDir, emptyOutDir: true },
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://localhost:3000' } },
  preview: { port: 4173, strictPort: true, proxy: { '/api': 'http://localhost:3000' } },
});
