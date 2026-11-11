import express from 'express';
import { readFileSync } from 'node:fs';
import type { Movie } from '@cineflex/shared';

const movies = JSON.parse(readFileSync(new URL('../data/movies.json', import.meta.url), 'utf8')) as Movie[];
const app = express();

/** GET /movies — lista de filmes. Opcionalmente aceita ?genre=Ação. */
app.get('/movies', (req, res) => {
  const genre = typeof req.query.genre === 'string' ? req.query.genre : undefined;
  res.json(genre ? movies.filter(movie => movie.genre === genre) : movies);
});

/** GET /movies/:id — detalhes de um filme. */
app.get('/movies/:id', (req, res) => {
  const id = Number(req.params.id);
  const movie = movies.find(item => item.id === id);
  if (!movie) return res.status(404).json({ error: 'Filme não encontrado.' });
  return res.json(movie);
});

app.get('/health', (_req, res) => res.json({ service: 'catalog', status: 'ok', port: 4001 }));
const port = Number(process.env.PORT || 4001);
app.listen(port, () => console.log(`[catalog] http://localhost:${port}`));
