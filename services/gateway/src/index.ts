import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '10kb' }));

const catalog = process.env.CATALOG_URL || 'http://localhost:4001';
const history = process.env.HISTORY_URL || 'http://localhost:4002';
const recommendation = process.env.RECOMMENDATION_URL || 'http://localhost:4003';

/**
 * API Gateway: único ponto de entrada do frontend.
 * Apenas rotas explícitas são encaminhadas, evitando proxy aberto.
 */
function proxy(target: (req: express.Request) => string) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const response = await fetch(target(req), {
        method: req.method,
        headers: { 'Content-Type': 'application/json' },
        body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
        signal: AbortSignal.timeout(5000),
      });
      const body = await response.text();
      res.status(response.status).type('application/json').send(body);
    } catch (error) {
      console.error('[gateway]', error);
      res.status(503).json({ error: 'Microserviço indisponível. Verifique se todos estão rodando.' });
    }
  };
}

app.get('/api/movies', proxy(req => `${catalog}/movies${req.query.genre ? `?genre=${encodeURIComponent(String(req.query.genre))}` : ''}`));
app.get('/api/movies/:id', proxy(req => `${catalog}/movies/${encodeURIComponent(String(req.params.id))}`));
app.get('/api/history/:profileId', proxy(req => `${history}/history/${encodeURIComponent(String(req.params.profileId))}`));
app.post('/api/history', proxy(() => `${history}/history`));
app.get('/api/recommendations/:profileId', proxy(req => `${recommendation}/recommendations/${encodeURIComponent(String(req.params.profileId))}`));

app.get('/api/health', async (_req, res) => {
  const services = [
    { name: 'catalog', url: catalog },
    { name: 'history', url: history },
    { name: 'recommendation', url: recommendation },
  ];
  const statuses = await Promise.all(services.map(async service => {
    try {
      const result = await fetch(`${service.url}/health`, { signal: AbortSignal.timeout(1500) });
      return { name: service.name, online: result.ok, url: service.url };
    } catch {
      return { name: service.name, online: false, url: service.url };
    }
  }));
  res.json({ gateway: 'online', services: statuses });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`[gateway] http://localhost:${port}`));
