import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// CLI de construção de variantes da Linha de Produtos de Software.
// Exemplo: npm run build:product -- products/cineflex-plus.json
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = resolve(root, process.argv[2] || 'products/cineflex-basic.json');
if (!existsSync(configPath)) {
  console.error(`Configuração não encontrada: ${configPath}`);
  process.exit(1);
}
const product = JSON.parse(readFileSync(configPath, 'utf8'));
if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(product.name || '')) {
  console.error('Nome de produto inválido. Use letras minúsculas, números e hífens.');
  process.exit(1);
}
const features = product.features || {};
for (const key of ['catalog', 'movieDetails', 'history', 'recommendations']) {
  if (features[key] !== true) {
    console.error(`Feature obrigatória ausente: ${key}`);
    process.exit(1);
  }
}
for (const key of ['favorites', 'genreFilter', 'darkTheme']) {
  if (typeof features[key] !== 'boolean') {
    console.error(`Feature opcional inválida: ${key}`);
    process.exit(1);
  }
}
const output = join(root, 'dist', 'products', product.name);
mkdirSync(dirname(output), { recursive: true });
console.log(`\nConstruindo ${product.name} (${configPath})...\n`);
const result = spawnSync(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build'], {
  cwd: join(root, 'apps', 'web'),
  stdio: 'inherit',
  env: { ...process.env, PRODUCT_CONFIG_PATH: configPath, PRODUCT_OUTPUT_DIR: output },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
console.log(`\nProduto criado em: ${output}`);
console.log(`Execute o backend (npm run dev) e abra outra janela com:`);
console.log(`  npm run preview -w @cineflex/web -- --outDir "${output}"\n`);
