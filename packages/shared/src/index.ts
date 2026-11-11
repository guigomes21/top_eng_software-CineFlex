/** Tipos compartilhados pelos três serviços e pela aplicação web. */
export interface Movie {
  id: number;
  title: string;
  year: number;
  genre: string;
  synopsis: string;
  duration: number;
  rating: number;
  poster: string;
  accent: string;
}

export interface ViewRecord {
  id: string;
  profileId: string;
  movieId: number;
  viewedAt: string;
}

export interface RecommendedMovie extends Movie {
  score: number;
  reason: string;
}

export interface RecommendationResponse {
  items: RecommendedMovie[];
  basedOnGenres: string[];
  historySize: number;
}

export interface ProductFeatures {
  catalog: true;
  movieDetails: true;
  history: true;
  recommendations: true;
  favorites: boolean;
  genreFilter: boolean;
  darkTheme: boolean;
}

export interface ProductConfig {
  name: string;
  description: string;
  features: ProductFeatures;
}

export function validateProductConfig(value: unknown): ProductConfig {
  if (!value || typeof value !== 'object') throw new Error('Configuração inválida.');
  const obj = value as Record<string, unknown>;
  if (typeof obj.name !== 'string' || !/^[a-z0-9][a-z0-9-]{1,39}$/.test(obj.name)) {
    throw new Error('O nome do produto deve ter de 2 a 40 caracteres (a-z, 0-9 e hífen).');
  }
  if (typeof obj.description !== 'string' || obj.description.length > 160) {
    throw new Error('Descrição do produto inválida (máximo 160 caracteres).');
  }
  if (!obj.features || typeof obj.features !== 'object') throw new Error('Features ausentes.');
  const features = obj.features as Record<string, unknown>;
  for (const key of ['catalog', 'movieDetails', 'history', 'recommendations']) {
    if (features[key] !== true) throw new Error(`A feature obrigatória ${key} precisa estar ativa.`);
  }
  for (const key of ['favorites', 'genreFilter', 'darkTheme']) {
    if (typeof features[key] !== 'boolean') throw new Error(`A feature ${key} deve ser booleana.`);
  }
  return value as ProductConfig;
}
