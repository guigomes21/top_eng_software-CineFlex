import express from 'express';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ViewRecord } from '@cineflex/shared';

const app = express();
app.use(express.json({ limit: '10kb' }));

// A variável de ambiente permite isolar os dados durante testes.
const file = process.env.HISTORY_DATA_FILE || fileURLToPath(new URL('../data/history.json', import.meta.url));
if (!existsSync(file)) {
  const seed = readFileSync(new URL('../data/history.seed.json', import.meta.url), 'utf8');
  writeFileSync(file, seed);
}

function readHistory(): ViewRecord[] {
  return JSON.parse(readFileSync(file, 'utf8')) as ViewRecord[];
}

/** GET /history/:profileId — histórico do perfil informado. */
app.get('/history/:profileId', (req, res) => {
  const items = readHistory()
    .filter(item => item.profileId === req.params.profileId)
    .sort((a, b) => b.viewedAt.localeCompare(a.viewedAt));
  res.json(items);
});

/** POST /history — registra visualização. Body: { profileId, movieId }. */
app.post('/history', (req, res) => {
  const { profileId, movieId } = req.body || {};
  if (typeof profileId !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(profileId) ||
      !Number.isInteger(movieId) || movieId < 1) {
    return res.status(400).json({ error: 'Informe profileId e movieId válidos.' });
  }
  const record: ViewRecord = {
    id: randomUUID(), profileId, movieId, viewedAt: new Date().toISOString(),
  };
  const data = readHistory();
  data.push(record);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  return res.status(201).json(record);
});

app.get('/health', (_req, res) => res.json({ service: 'history', status: 'ok', port: 4002 }));
const port = Number(process.env.PORT || 4002);
app.listen(port, () => console.log(`[history] http://localhost:${port}`));
