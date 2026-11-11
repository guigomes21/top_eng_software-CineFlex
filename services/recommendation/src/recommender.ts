import type { Movie, RecommendationResponse, ViewRecord } from '@cineflex/shared';

/**
 * Recomendação baseada em conteúdo, intencionalmente simples e explicável.
 * 1. Conta quantas vezes cada gênero aparece no histórico.
 * 2. Exclui filmes já visualizados.
 * 3. Prioriza filmes dos gêneros mais acessados e usa a nota como desempate.
 * Se não houver histórico, apresenta os filmes com maiores notas.
 */
export function recommend(
  movies: Movie[], history: ViewRecord[], limit = 6,
): RecommendationResponse {
  const byId = new Map(movies.map(movie => [movie.id, movie]));
  const seen = new Set<number>();
  const genreCounts = new Map<string, number>();

  for (const event of history) {
    const movie = byId.get(event.movieId);
    if (!movie) continue;
    seen.add(movie.id);
    genreCounts.set(movie.genre, (genreCounts.get(movie.genre) || 0) + 1);
  }
  const basedOnGenres = [...genreCounts.keys()].sort((a, b) =>
    (genreCounts.get(b) || 0) - (genreCounts.get(a) || 0),
  );

  const items = movies
    .filter(movie => !seen.has(movie.id))
    .map(movie => {
      const frequency = genreCounts.get(movie.genre) || 0;
      return {
        ...movie,
        score: frequency * 10 + movie.rating,
        reason: frequency > 0 ? `Você demonstrou interesse em ${movie.genre}` : 'Bem avaliado no catálogo',
      };
    })
    .sort((a, b) => b.score - a.score || a.id - b.id)
    .slice(0, Math.max(0, limit));

  return { items, basedOnGenres, historySize: history.length };
}
