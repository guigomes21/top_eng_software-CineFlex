import test from 'node:test';
import assert from 'node:assert/strict';
import type { Movie, ViewRecord } from '@cineflex/shared';
import { recommend } from './recommender.ts';

const movies: Movie[] = [
  { id: 1, title: 'A', genre: 'Ação', rating: 7, year: 2025, synopsis: '', duration: 100, poster: '', accent: '' },
  { id: 2, title: 'B', genre: 'Ação', rating: 8, year: 2025, synopsis: '', duration: 100, poster: '', accent: '' },
  { id: 3, title: 'C', genre: 'Drama', rating: 9, year: 2025, synopsis: '', duration: 100, poster: '', accent: '' },
];
const view: ViewRecord = { id: '1', profileId: 'demo', movieId: 1, viewedAt: '2026-01-01T10:00:00Z' };

test('prioriza gênero mais acessado e exclui filme assistido', () => {
  const result = recommend(movies, [view]);
  assert.equal(result.items[0].id, 2);
  assert.ok(!result.items.some(movie => movie.id === 1));
  assert.deepEqual(result.basedOnGenres, ['Ação']);
});

test('sem histórico recomenda maior nota', () => {
  const result = recommend(movies, []);
  assert.equal(result.items[0].id, 3);
  assert.equal(result.historySize, 0);
});

test('histórico inexistente no catálogo não interrompe recomendação', () => {
  assert.equal(recommend(movies, [{ ...view, movieId: 999 }]).items.length, 3);
});
