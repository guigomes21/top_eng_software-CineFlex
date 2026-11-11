import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Check, CheckCircle2,
  Clapperboard, Clock3, Code2, Compass, ExternalLink, Film, Filter,
  Heart, History, Info, Layers3, Menu, MonitorCog, Play, Search,
  Settings2, Sparkles, Star, X,
} from 'lucide-react';
import { validateProductConfig, type Movie, type ProductConfig, type RecommendationResponse, type ViewRecord } from '@cineflex/shared';

declare const __PRODUCT_CONFIG__: ProductConfig;
const BAKED = __PRODUCT_CONFIG__;
const PROFILE = 'demo'; // Perfil demonstrativo; login não é necessário para a atividade.
type Tab = 'catalog' | 'recommendations' | 'history' | 'configurator' | 'status';
type OptionalFeature = 'favorites' | 'genreFilter' | 'darkTheme';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Falha na requisição (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

function MovieArt({ movie, size = 'normal' }: { movie: Movie; size?: 'normal' | 'large' }) {
  return (
    <div className={`movie-art ${size}`} style={{ '--poster-accent': movie.accent } as React.CSSProperties}>
      <span className="poster-glow" />
      <span className="poster-emoji" role="img" aria-label="Arte ilustrativa">{movie.poster}</span>
      <span className="poster-footnote">CINEFLEX ORIGINAL</span>
    </div>
  );
}

function MovieCard({ movie, onOpen, favorite, onFavorite, showFavorite, reason }: {
  movie: Movie; onOpen: (movie: Movie) => void;
  favorite: boolean; onFavorite: (movie: Movie) => void; showFavorite: boolean; reason?: string;
}) {
  return (
    <article className="movie-card">
      <button className="poster-button" onClick={() => onOpen(movie)} aria-label={`Ver detalhes de ${movie.title}`}>
        <MovieArt movie={movie} />
        <span className="poster-overlay"><Play fill="currentColor" size={19} /> Ver filme</span>
      </button>
      {showFavorite && (
        <button className={`heart-button ${favorite ? 'selected' : ''}`} onClick={() => onFavorite(movie)}
          aria-label={favorite ? `Remover ${movie.title} dos favoritos` : `Favoritar ${movie.title}`} title="Favorito">
          <Heart size={17} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      )}
      <div className="movie-card-body">
        <div className="movie-meta"><span>{movie.genre}</span><span><Star size={12} fill="currentColor" /> {movie.rating.toFixed(1)}</span></div>
        <button className="movie-title" onClick={() => onOpen(movie)}>{movie.title}</button>
        <div className="movie-submeta">{movie.year} <span>·</span> {movie.duration} min</div>
        {reason && <div className="reason"><Sparkles size={13} /> {reason}</div>}
      </div>
    </article>
  );
}

const descriptions: Record<OptionalFeature, { title: string; description: string }> = {
  favorites: { title: 'Lista de favoritos', description: 'Permite salvar filmes localmente para consultar depois.' },
  genreFilter: { title: 'Filtro por gênero', description: 'Habilita a busca de filmes por categoria.' },
  darkTheme: { title: 'Tema escuro', description: 'Exibe a interface com cores escuras.' },
};

export default function App() {
  const [tab, setTab] = useState<Tab>('catalog');
  const [config, setConfig] = useState<ProductConfig>(BAKED);
  const [draft, setDraft] = useState<ProductConfig>(BAKED);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [history, setHistory] = useState<ViewRecord[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('Todos');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [recordStatus, setRecordStatus] = useState<'pending' | 'saved' | 'failed'>('pending');
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState<{ gateway: string; services: { name: string; online: boolean; url: string }[] } | null>(null);
  const [favorites, setFavorites] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('cineflex:favorites:demo') || '[]') as number[]; }
    catch { return []; }
  });

  const loadUserData = useCallback(async () => {
    const [historyData, recoData] = await Promise.all([
      api<ViewRecord[]>(`/history/${PROFILE}`),
      api<RecommendationResponse>(`/recommendations/${PROFILE}`),
    ]);
    setHistory(historyData);
    setRecommendations(recoData);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [catalog] = await Promise.all([api<Movie[]>('/movies'), loadUserData()]);
        setMovies(catalog);
      } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao carregar aplicação.'); }
      finally { setIsLoading(false); }
    })();
  }, [loadUserData]);

  useEffect(() => {
    localStorage.setItem('cineflex:favorites:demo', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => { document.documentElement.dataset.theme = config.features.darkTheme ? 'dark' : 'light'; }, [config]);

  useEffect(() => {
    if (tab === 'status') {
      api<typeof status>('/health').then(setStatus).catch(() => setStatus(null));
    }
  }, [tab]);

  const genres = useMemo(() => ['Todos', ...new Set(movies.map(movie => movie.genre))], [movies]);
  const visibleMovies = useMemo(() => movies.filter(movie => {
    const text = `${movie.title} ${movie.genre}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) &&
      (!config.features.genreFilter || genre === 'Todos' || movie.genre === genre) &&
      (!onlyFavorites || !config.features.favorites || favorites.includes(movie.id));
  }), [movies, query, genre, onlyFavorites, favorites, config]);
  const movieById = useMemo(() => new Map(movies.map(movie => [movie.id, movie])), [movies]);

  const openMovie = async (movie: Movie) => {
    setSelected(movie);
    setRecordStatus('pending');
    try {
      await api('/history', { method: 'POST', body: JSON.stringify({ profileId: PROFILE, movieId: movie.id }) });
      setRecordStatus('saved');
      await loadUserData();
    } catch (err) { setRecordStatus('failed'); setError(err instanceof Error ? err.message : 'Erro ao registrar histórico.'); }
  };

  const toggleFavorite = (movie: Movie) => setFavorites(current =>
    current.includes(movie.id) ? current.filter(id => id !== movie.id) : [...current, movie.id],
  );

  const navigate = (next: Tab) => {
    setTab(next); setMenuOpen(false); setError(''); setOnlyFavorites(false);
  };

  const updateFeature = (key: OptionalFeature, checked: boolean) => {
    setDraft(current => ({ ...current, features: { ...current.features, [key]: checked } }));
  };

  const exportProduct = () => {
    setSaving(true);
    const validated: ProductConfig = {
      ...draft,
      name: draft.name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'cineflex-personalizado',
    };
    try { validateProductConfig(validated); }
    catch (err) { setSaving(false); setError(err instanceof Error ? err.message : 'Configuração inválida.'); return; }
    const blob = new Blob([JSON.stringify(validated, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${validated.name}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setSaving(false);
  };

  const navigation = [
    { id: 'catalog', label: 'Explorar filmes', icon: Compass },
    { id: 'recommendations', label: 'Para você', icon: Sparkles },
    { id: 'history', label: 'Meu histórico', icon: History },
    { id: 'configurator', label: 'Configurador LPS', icon: Layers3 },
    { id: 'status', label: 'Microserviços', icon: Activity },
  ] as const;

  const renderCards = (items: Movie[], withReason = false) => (
    <div className="movie-grid">
      {items.map(movie => (
        <MovieCard key={movie.id} movie={movie} onOpen={openMovie} favorite={favorites.includes(movie.id)}
          onFavorite={toggleFavorite} showFavorite={config.features.favorites}
          reason={withReason && 'reason' in movie ? String(movie.reason) : undefined} />
      ))}
    </div>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand"><span className="brand-mark"><Clapperboard size={24} /></span>
          <span><strong>cineflex<span className="brand-dot">.</span></strong><small>DISCOVER MORE</small></span>
        </div>
        <div className="sidebar-divider" />
        <p className="sidebar-heading">MENU PRINCIPAL</p>
        <nav className="sidebar-nav" aria-label="Navegação principal">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${tab === id ? 'active' : ''}`} onClick={() => navigate(id)}>
              <Icon size={19} strokeWidth={1.9} /> <span>{label}</span>
              {id === 'recommendations' && <span className="nav-bubble">{recommendations?.items.length || '•'}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="product-tile"><span className="product-icon"><Layers3 size={18} /></span>
            <div><small>PRODUTO ATIVO</small><strong>{config.name.replace('cineflex-', 'CineFlex ')}</strong></div>
            <CheckCircle2 size={16} className="product-check" />
          </div>
          <div className="sidebar-profile"><span className="avatar">D</span><span><strong>Perfil Demo</strong><small>Ambiente acadêmico</small></span><span className="profile-state" /></div>
        </div>
      </aside>

      {menuOpen && <button className="mobile-backdrop" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left"><button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={22} /></button>
            <span className="breadcrumb">CINEFLEX</span> <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{navigation.find(item => item.id === tab)?.label}</span>
          </div>
          <div className="topbar-right"><span className="system-status"><span /> Sistema local</span><span className="topbar-avatar">D</span></div>
        </header>

        {error && <div className="alert" role="alert"><Info size={18} /><span>{error}</span><button onClick={() => setError('')} aria-label="Fechar aviso"><X size={17} /></button></div>}
        {isLoading && <div className="loading"><div className="spinner" /> Carregando catálogo...</div>}

        {tab === 'catalog' && (
          <div className="page-content">
            <section className="hero">
              <div className="hero-copy"><span className="hero-overline"><Sparkles size={14} /> SEU UNIVERSO DE FILMES</span>
                <h1>Boas histórias<br /><em>começam aqui.</em></h1>
                <p>Descubra novos mundos, acompanhe o que você viu e encontre seu próximo filme favorito.</p>
                <button className="primary-button" onClick={() => navigate('recommendations')}>Ver recomendações <ArrowRight size={17} /></button>
              </div>
              <div className="hero-visual"><div className="orbit orbit-a" /><div className="orbit orbit-b" /><span className="hero-moon">✦</span><span className="hero-planet">🪐</span><span className="hero-spark spark-a">✧</span><span className="hero-spark spark-b">✦</span></div>
            </section>
            <section className="metrics" aria-label="Estatísticas do catálogo">
              <div className="metric"><span className="metric-icon purple"><Film size={18} /></span><div><strong>{movies.length}</strong><small>Filmes disponíveis</small></div></div>
              <div className="metric"><span className="metric-icon orange"><Clock3 size={18} /></span><div><strong>{history.length}</strong><small>Visualizações</small></div></div>
              <div className="metric"><span className="metric-icon green"><Sparkles size={18} /></span><div><strong>{recommendations?.items.length || 0}</strong><small>Recomendações</small></div></div>
            </section>
            <div className="section-head"><div><div className="eyebrow">EXPLORE NOSSO ACERVO</div><h2>Catálogo de filmes <span className="count-badge">{visibleMovies.length}</span></h2></div>
              <div className="catalog-actions"><label className="search-box"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar filme..." aria-label="Buscar filme" /></label></div>
            </div>
            {config.features.genreFilter && (
              <div className="filters"><span className="filter-label"><Filter size={15} /> Gênero</span>
                {genres.map(item => <button key={item} className={`filter-chip ${genre === item && !onlyFavorites ? 'active' : ''}`} onClick={() => { setGenre(item); setOnlyFavorites(false); }}>{item}</button>)}
                {config.features.favorites && <button className={`filter-chip ${onlyFavorites ? 'active' : ''}`} onClick={() => setOnlyFavorites(!onlyFavorites)}><Heart size={13} /> Favoritos</button>}
              </div>
            )}
            {renderCards(visibleMovies)}
            {!isLoading && visibleMovies.length === 0 && <div className="empty">Nenhum filme encontrado. Tente outra busca.</div>}
          </div>
        )}

        {tab === 'recommendations' && (
          <div className="page-content page-interior">
            <span className="eyebrow"><Sparkles size={15} /> SELEÇÃO PERSONALIZADA</span>
            <h1 className="page-title">Escolhidos <span>para você.</span></h1>
            <p className="page-description">Sugestões calculadas automaticamente com base nos gêneros dos filmes que você abriu.</p>
            <div className="insight-box"><span className="insight-icon"><Sparkles size={24} /></span><div><strong>Como funciona a recomendação?</strong>
              <p>{recommendations?.historySize
                ? `Analisamos ${recommendations.historySize} visualizações. Gêneros em destaque: ${recommendations.basedOnGenres.join(', ') || 'variados'}. Filmes já visualizados ficam fora das sugestões.`
                : 'Seu histórico está vazio. Por enquanto, selecionamos os filmes com maiores notas. Abra alguns filmes para personalizar as sugestões.'}</p></div></div>
            <div className="section-head small"><div><div className="eyebrow">RECOMENDADOS PARA O PERFIL DEMO</div><h2>Sua próxima descoberta</h2></div></div>
            {renderCards(recommendations?.items || [], true)}
            {!isLoading && recommendations?.items.length === 0 && <div className="empty">Você já viu todos os filmes do catálogo!</div>}
          </div>
        )}

        {tab === 'history' && (
          <div className="page-content page-interior">
            <span className="eyebrow"><History size={15} /> SUA ATIVIDADE</span><h1 className="page-title">Histórico de <span>visualizações.</span></h1>
            <p className="page-description">Cada vez que você abre os detalhes de um filme, registramos uma visualização no microserviço de histórico.</p>
            <div className="history-panel"><div className="panel-header"><strong>Atividade recente</strong><span>{history.length} registros</span></div>
              {history.length ? history.map(event => {
                const movie = movieById.get(event.movieId);
                if (!movie) return null;
                return <button className="history-row" key={event.id} onClick={() => openMovie(movie)}>
                  <span className="mini-poster" style={{ background: movie.accent }}>{movie.poster}</span>
                  <span className="history-info"><strong>{movie.title}</strong><small>{movie.genre} · {movie.year}</small></span>
                  <span className="history-date">{new Date(event.viewedAt).toLocaleDateString('pt-BR')}<small>{new Date(event.viewedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></span>
                  <ArrowRight size={16} className="history-arrow" />
                </button>;
              }) : <div className="empty">Nenhuma visualização registrada.</div>}
            </div>
          </div>
        )}

        {tab === 'configurator' && (
          <div className="page-content page-interior">
            <span className="eyebrow"><Layers3 size={15} /> LINHA DE PRODUTO DE SOFTWARE</span><h1 className="page-title">Configure seu <span>produto.</span></h1>
            <p className="page-description">Escolha as funcionalidades opcionais e exporte uma configuração para gerar uma nova versão do CineFlex.</p>
            <div className="config-layout"><div className="config-main">
              <div className="settings-card"><div className="settings-card-header"><span className="settings-icon"><CheckCircle2 size={21} /></span><div><strong>Funcionalidades obrigatórias</strong><small>Presentes em todas as variantes do produto</small></div><span className="required-tag">SEMPRE ATIVAS</span></div>
                <div className="required-features">{['Catálogo de filmes', 'Detalhes do filme', 'Histórico do perfil', 'Recomendações por gênero'].map(item => <span key={item}><Check size={16} /> {item}</span>)}</div>
              </div>
              <div className="settings-card"><div className="settings-card-header"><span className="settings-icon purple-icon"><Settings2 size={21} /></span><div><strong>Funcionalidades opcionais</strong><small>Ative as features da variante desejada</small></div></div>
                {(Object.keys(descriptions) as OptionalFeature[]).map(key => (
                  <label className="feature-row" key={key}><div><strong>{descriptions[key].title}</strong><small>{descriptions[key].description}</small></div>
                    <input className="toggle-input" type="checkbox" checked={draft.features[key]} onChange={event => updateFeature(key, event.target.checked)} aria-label={descriptions[key].title} />
                  </label>
                ))}
              </div>
              <div className="settings-card"><div className="settings-card-header"><span className="settings-icon"><Code2 size={21} /></span><div><strong>Identificação do produto</strong><small>Nome usado no arquivo de configuração e no build</small></div></div>
                <label className="field-label">Nome técnico (minúsculas, números e hífens)<input className="field-input" value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="cineflex-personalizado" /></label>
                <label className="field-label">Descrição<input className="field-input" value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} maxLength={160} /></label>
              </div>
            </div><aside className="config-summary">
              <div className="config-preview-icon"><Clapperboard size={25} /></div><div className="eyebrow">RESUMO DO PRODUTO</div><h3>{draft.name || 'Nova variante'}</h3><p>{draft.description}</p>
              <div className="summary-list"><div><span>Features obrigatórias</span><strong>4</strong></div><div><span>Features opcionais</span><strong>{Object.values(draft.features).filter(Boolean).length - 4} / 3</strong></div><div><span>Microserviços</span><strong>3 + Gateway</strong></div></div>
              <button className="primary-button full" onClick={() => setConfig({ ...draft, features: { ...draft.features } })}><MonitorCog size={17} /> Pré-visualizar</button>
              <button className="secondary-button full" onClick={exportProduct} disabled={saving}><ArrowDownToLine size={17} /> Baixar configuração JSON</button>
              <p className="summary-note"><Info size={15} /> Para gerar um build real, salve o JSON na pasta <code>products/</code> e execute <code>npm run build:product -- products/arquivo.json</code>.</p>
              <div className="current-baked">Produto compilado: <strong>{BAKED.name}</strong></div>
            </aside></div>
          </div>
        )}

        {tab === 'status' && (
          <div className="page-content page-interior">
            <span className="eyebrow"><Activity size={15} /> ARQUITETURA DA APLICAÇÃO</span><h1 className="page-title">Painel de <span>microserviços.</span></h1>
            <p className="page-description">O frontend acessa a API Gateway, que encaminha as requisições para cada serviço.</p>
            <div className="architecture"><div className="arch-node web"><MonitorCog size={20} /><strong>Frontend React</strong><small>localhost:5173</small></div><span className="arch-line">↓</span><div className="arch-node gateway"><Layers3 size={20} /><strong>API Gateway</strong><small>localhost:3000</small></div><span className="arch-line">↓</span><div className="arch-services">
              {['Catálogo · 4001', 'Histórico · 4002', 'Recomendação · 4003'].map(item => <div className="arch-node service" key={item}><Activity size={18} /><strong>{item.split(' · ')[0]}</strong><small>localhost:{item.split(' · ')[1]}</small></div>)}
            </div></div>
            <div className="section-head small"><h2>Status em tempo real</h2><button className="text-button" onClick={() => api<typeof status>('/health').then(setStatus).catch(() => setStatus(null))}>Atualizar <ArrowRight size={16} /></button></div>
            <div className="services-table"><div className="service-status-row"><strong>API Gateway</strong><span><span className={`online-dot ${status ? '' : 'offline'}`} /> {status ? 'Online' : 'Offline'}</span><code>3000</code></div>
              {(status?.services || []).map(service => <div className="service-status-row" key={service.name}><strong>{service.name}</strong><span><span className={`online-dot ${service.online ? '' : 'offline'}`} /> {service.online ? 'Online' : 'Offline'}</span><code>{new URL(service.url).port}</code></div>)}
              {!status && <div className="empty">Não foi possível consultar o status dos serviços.</div>}
            </div>
          </div>
        )}

        <footer className="footer"><span>© 2026 CineFlex · Projeto acadêmico de Engenharia de Software</span><span>Feito com React + Microserviços <ExternalLink size={13} /></span></footer>
      </main>

      {selected && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }} role="presentation"><div className="detail-modal" role="dialog" aria-modal="true" aria-label={`Detalhes de ${selected.title}`}>
        <button className="modal-close" onClick={() => setSelected(null)} aria-label="Fechar detalhes"><X size={19} /></button>
        <MovieArt movie={selected} size="large" />
        <div className="modal-body"><div className="eyebrow">DETALHES DO FILME</div><h2>{selected.title}</h2><div className="modal-meta"><span><Star size={16} fill="currentColor" /> {selected.rating.toFixed(1)}</span><span>{selected.year}</span><span>{selected.duration} min</span><span>{selected.genre}</span></div><p>{selected.synopsis}</p>
          <div className="modal-notice"><CheckCircle2 size={18} /> {recordStatus === 'saved' ? 'Visualização registrada no histórico do perfil Demo.' : recordStatus === 'pending' ? 'Registrando visualização no histórico...' : 'Não foi possível registrar no histórico. Confira os serviços.'}</div>
          <div className="modal-actions"><button className="primary-button" onClick={() => { setSelected(null); navigate('recommendations'); }}><Sparkles size={17} /> Ver recomendações</button>
            {config.features.favorites && <button className="secondary-button" onClick={() => toggleFavorite(selected)}><Heart size={17} fill={favorites.includes(selected.id) ? 'currentColor' : 'none'} /> {favorites.includes(selected.id) ? 'Favoritado' : 'Favoritar'}</button>}</div>
        </div></div></div>}
    </div>
  );
}
