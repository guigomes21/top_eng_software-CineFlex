import express from 'express';
import type { Movie, ViewRecord } from '@cineflex/shared';
import { recommend } from './recommender.ts';

const app = express();
const catalogUrl = process.env.CATALOG_URL || 'http://localhost:4001';
const historyUrl = process.env.HISTORY_URL || 'http://localhost:4002';

/** GET /recommendations/:profileId — solicita catálogo e histórico aos outros serviços. */
app.get('/recommendations/:profileId', async (req, res) => {
  try {
    const id = String(req.params.profileId);
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(id)) return res.status(400).json({ error: 'Perfil inválido.' });
    const responses = await Promise.all([
      fetch(`${catalogUrl}/movies`, { signal: AbortSignal.timeout(5000) }),
      fetch(`${historyUrl}/history/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(5000) }),
    ]);
    if (responses.some(response => !response.ok)) throw new Error('Serviço dependente indisponível.');
    const [movies, history] = await Promise.all([
      responses[0].json() as Promise<Movie[]>,
      responses[1].json() as Promise<ViewRecord[]>,
    ]);
    return res.json(recommend(movies, history));
  } catch (error) {
    console.error('[recommendation]', error);
    return res.status(503).json({ error: 'Não foi possível calcular as recomendações.' });
  }
});

app.get('/health', (_req, res) => res.json({ service: 'recommendation', status: 'ok', port: 4003 }));
const port = Number(process.env.PORT || 4003);
app.listen(port, () => console.log(`[recommendation] http://localhost:${port}`));
