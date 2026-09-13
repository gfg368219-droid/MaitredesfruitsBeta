import { useEffect, useState } from 'react';
import {
  Axe,
  ArrowUpRight,
  Castle,
  Check,
  ChevronRight,
  CircleHelp,
  Crown,
  Gem,
  Hammer,
  Hand,
  Keyboard,
  Map,
  Mountain,
  MousePointer2,
  Plus,
  RotateCcw,
  Sparkles,
  Star,
  Sun,
  TreePine,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  WandSparkles,
  Zap,
} from 'lucide-react';
import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Tool = 'hand' | 'axe' | 'hammer' | 'wand';
type PathId = 'guild' | 'necromancer' | 'solar' | 'tempest';
type TargetId = 'tree' | 'rock' | 'pond' | 'house';

const toolLabels: Record<Tool, string> = {
  hand: 'Explorer',
  axe: 'Couper',
  hammer: 'Construire',
  wand: 'Éveiller',
};

const pathOptions: Array<{ id: PathId; title: string; subtitle: string; icon: ReactNode; color: string }> = [
  { id: 'guild', title: 'Maître de guilde', subtitle: 'Rassembler & bâtir', icon: <Crown />, color: '#ed5361' },
  { id: 'necromancer', title: 'Nécromancien', subtitle: 'Réveiller les anciens', icon: <Sparkles />, color: '#7663c7' },
  { id: 'solar', title: 'Dieu Solaire', subtitle: 'Rayonner & protéger', icon: <Sun />, color: '#edaa2f' },
  { id: 'tempest', title: 'Tempest', subtitle: 'Foudroyer & accélérer', icon: <Zap />, color: '#34aabd' },
];

function Home() {
  const [activeNav, setActiveNav] = useState('Mon royaume');
  const [activeTool, setActiveTool] = useState<Tool>('hand');
  const [selectedPath, setSelectedPath] = useState<PathId>('guild');
  const [resources, setResources] = useState({ wood: 6, stone: 4, essence: 1 });
  const [collected, setCollected] = useState<Record<TargetId, boolean>>({ tree: false, rock: false, pond: false, house: false });
  const [buildings, setBuildings] = useState(0);
  const [greeted, setGreeted] = useState<Record<string, boolean>>({});
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(24);
  const [feedback, setFeedback] = useState('Le village attend ton premier geste.');
  const [feedbackKey, setFeedbackKey] = useState(0);
  const [muted, setMuted] = useState(false);
  const [pendingLevel, setPendingLevel] = useState<number | null>(null);

  const selectedPathInfo = pathOptions.find((path) => path.id === selectedPath) ?? pathOptions[0];
  const missionCount = Math.min(3, Object.values(greeted).filter(Boolean).length + buildings + (collected.tree ? 1 : 0));
  const missionPercent = Math.min(100, Math.round((missionCount / 3) * 100));

  const notify = (message: string) => {
    setFeedback(message);
    setFeedbackKey((key) => key + 1);
  };

  const earnXp = (amount: number, message: string) => {
    setXp((currentXp) => {
      const nextXp = currentXp + amount;
      if (nextXp >= level * 100 && level < 3) {
        setLevel((currentLevel) => currentLevel + 1);
        setPendingLevel(level + 1);
        return nextXp - level * 100;
      }
      return Math.min(nextXp, 99);
    });
    notify(message);
  };

  const chooseTool = (tool: Tool) => {
    setActiveTool(tool);
    notify(`${toolLabels[tool]} équipé. À toi de jouer.`);
  };

  const useTarget = (target: TargetId) => {
    if (activeTool === 'axe' && target === 'tree' && !collected.tree) {
      setResources((current) => ({ ...current, wood: current.wood + 3 }));
      setCollected((current) => ({ ...current, tree: true }));
      earnXp(28, 'Trois bûches bondissent dans ton sac.');
      return;
    }
    if (activeTool === 'hammer' && target === 'rock' && !collected.rock) {
      setResources((current) => ({ ...current, stone: current.stone + 2 }));
      setCollected((current) => ({ ...current, rock: true }));
      earnXp(24, 'La pierre chante sous le marteau.');
      return;
    }
    if (activeTool === 'wand' && target === 'pond' && !collected.pond) {
      setResources((current) => ({ ...current, essence: current.essence + 2 }));
      setCollected((current) => ({ ...current, pond: true }));
      earnXp(24, 'Une essence turquoise se réveille.');
      return;
    }
    if (activeTool === 'hammer' && target === 'house' && !collected.house) {
      if (resources.wood < 2 || resources.stone < 1) {
        notify('Il te faut 2 bois et 1 pierre pour bâtir ici.');
        return;
      }
      setResources((current) => ({ ...current, wood: current.wood - 2, stone: current.stone - 1 }));
      setCollected((current) => ({ ...current, house: true }));
      setBuildings((current) => current + 1);
      earnXp(32, 'Une maison colorée rejoint le village.');
      return;
    }
    if (activeTool === 'hand') {
      earnXp(8, target === 'house' ? 'La cloche du village te salue.' : 'Tu observes ce coin du royaume.');
      return;
    }
    if (collected[target]) {
      notify('Cet endroit a déjà livré son petit secret.');
      return;
    }
    notify(activeTool === 'axe' ? 'Essaie le marteau sur la roche.' : activeTool === 'hammer' ? 'Le marteau aime la pierre et les maisons.' : 'La baguette cherche une eau qui scintille.');
  };

  const greet = (name: string, description: string) => {
    if (greeted[name]) {
      notify(`${name} est déjà installé près de la place.`);
      return;
    }
    setGreeted((current) => ({ ...current, [name]: true }));
    earnXp(12, `${name} arrive avec une histoire : ${description}`);
  };

  const resetGame = () => {
    setActiveTool('hand');
    setSelectedPath('guild');
    setResources({ wood: 6, stone: 4, essence: 1 });
    setCollected({ tree: false, rock: false, pond: false, house: false });
    setBuildings(0);
    setGreeted({});
    setLevel(1);
    setXp(24);
    setPendingLevel(null);
    notify('Le royaume est prêt pour un nouveau départ.');
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const keyTools: Record<string, Tool> = { '1': 'hand', '2': 'axe', '3': 'hammer', '4': 'wand' };
      if (keyTools[event.key]) {
        chooseTool(keyTools[event.key]);
      }
      if (event.key === 'Escape') setPendingLevel(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <main className="game-shell">
      <header className="game-topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><Sparkles size={24} /></div>
          <div>
            <div className="brand-kicker">Le bac à sable enchanté</div>
            <div className="brand-name">Éveil des Royaumes</div>
          </div>
        </div>
        <div className="top-actions">
          <button className="icon-button" data-testid="button-help" title="Aide" onClick={() => notify('Astuce : choisis un outil, puis touche un élément du paysage.')}><CircleHelp size={18} /></button>
          <button className="icon-button" data-testid="button-toggle-sound" title={muted ? 'Activer les sons' : 'Couper les sons'} onClick={() => { setMuted((current) => !current); notify(muted ? 'Les sons du royaume reprennent.' : 'Le royaume devient silencieux.'); }}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
          <div className="player-chip" data-testid="status-player">
            <div className="player-avatar">E</div>
            <div><strong>Éclaireur·euse</strong><small>Royaume 01</small></div>
          </div>
          <button className="icon-button" data-testid="button-reset-game" title="Recommencer" onClick={resetGame}><RotateCcw size={17} /></button>
        </div>
      </header>

      <div className="game-layout">
        <aside className="side-rail" aria-label="Navigation du royaume">
          <div className="rail-title">
            <div className="eyebrow">Carnet de bord</div>
          </div>
          <nav className="rail-nav">
            {[
              { label: 'Mon royaume', icon: <Castle size={17} /> },
              { label: 'Carte', icon: <Map size={17} /> },
              { label: 'Habitants', icon: <Users size={17} /> },
            ].map((item) => (
              <button key={item.label} className={`rail-button ${activeNav === item.label ? 'active' : ''}`} data-testid={`button-nav-${item.label.toLowerCase().replace(' ', '-')}`} onClick={() => { setActiveNav(item.label); notify(item.label === 'Mon royaume' ? 'Le royaume est sous tes yeux.' : `${item.label} arrive bientôt dans ton carnet.`); }}>
                {item.icon}<span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="level-stack">
            <span className="eyebrow">Progression</span>
            <div className="level-pips">
              {[1, 2, 3].map((item) => <div key={item} className={`level-pip ${item < level ? 'done' : ''} ${item === level ? 'current' : ''}`} data-testid={`status-level-pip-${item}`}>{item < level ? <Check size={14} /> : item}</div>)}
            </div>
            <div className="level-caption" data-testid="status-level-caption">Niveau {level} · {level === 1 ? 'Le premier feu' : level === 2 ? 'Bâtisseur·euse' : 'Gardien·ne du royaume'}</div>
          </div>
        </aside>

        <section className="play-column">
          <div className="game-intro">
            <div>
              <div className="eyebrow">Chapitre {level} · La clairière des arrivants</div>
              <h1>Ton royaume vient<br /><span>de s’éveiller.</span></h1>
              <p>Coupe, place, construis. Ici, chaque geste transforme la page en monde vivant.</p>
            </div>
            <div className="xp-card">
              <div className="xp-head"><span>Élan du royaume</span><b data-testid="status-xp">{xp} / {level < 3 ? 100 : 100}</b></div>
              <div className="xp-track"><div className="xp-fill" style={{ width: `${xp}%` }} /></div>
            </div>
          </div>

          <div className="scene-card" data-testid="status-game-scene">
            <div className="scene-sky"><div className="cloud" /><div className="cloud two" /></div>
            <div className="scene-label"><MousePointer2 size={13} /> Clique un élément pour agir</div>
            <div className="island" />
            <button className={`scene-object tree ${collected.tree ? 'selected' : ''}`} data-testid="button-scene-tree" aria-label="Arbre à couper" onClick={() => useTarget('tree')}>
              <span className="crown" /><span className="trunk" /><i className="fruit" style={{ left: '17px', top: '37px' }} /><i className="fruit" style={{ left: '48px', top: '22px' }} />
            </button>
            <button className={`scene-object rock ${collected.rock ? 'selected' : ''}`} data-testid="button-scene-rock" aria-label="Rocher à récolter" onClick={() => useTarget('rock')} />
            <button className={`scene-object pond ${collected.pond ? 'selected' : ''}`} data-testid="button-scene-pond" aria-label="Mare à éveiller" onClick={() => useTarget('pond')} />
            <button className={`scene-object house ${collected.house ? 'selected' : ''}`} data-testid="button-scene-house" aria-label="Maison à construire" onClick={() => useTarget('house')}>
              <span className="roof" /><span className="wall" /><span className="door" /><span className="window" />
            </button>
            <div className="scene-tip"><Keyboard size={15} /> Touches 1–4 pour changer d’outil <ChevronRight size={14} /></div>
          </div>

          <div className="tools-panel" role="toolbar" aria-label="Outils du royaume">
            {([
              { id: 'hand' as Tool, icon: <Hand />, label: 'Explorer', key: '1' },
              { id: 'axe' as Tool, icon: <Axe />, label: 'Couper', key: '2' },
              { id: 'hammer' as Tool, icon: <Hammer />, label: 'Construire', key: '3' },
              { id: 'wand' as Tool, icon: <WandSparkles />, label: 'Éveiller', key: '4' },
            ]).map((tool) => (
              <button key={tool.id} className={`tool-button ${activeTool === tool.id ? 'active' : ''}`} data-testid={`button-tool-${tool.id}`} aria-pressed={activeTool === tool.id} onClick={() => chooseTool(tool.id)}>
                {tool.icon}<span>{tool.label}</span><span className="tool-key">{tool.key}</span>
              </button>
            ))}
          </div>

          <div className="section-row">
            <h2>Les nouveaux visages</h2>
            <button data-testid="button-see-arrivals" onClick={() => notify('Trois nouveaux visages attendent ton accueil.')}>Voir le carnet <ChevronRight size={13} /></button>
          </div>
          <div className="arrivals">
            {[
              { name: 'Milo', detail: 'Cartographe des lucioles', initial: 'M', desc: 'une carte pliée' },
              { name: 'Alba', detail: 'Jardinière des nuages', initial: 'A', desc: 'des graines dorées' },
              { name: 'Nox', detail: 'Forgeron tranquille', initial: 'N', desc: 'un secret de métal' },
            ].map((person) => (
              <article className="arrival-card" key={person.name} data-testid={`card-arrival-${person.name.toLowerCase()}`}>
                <div className="arrival-avatar">{person.initial}</div>
                <strong>{person.name}</strong>
                <p>{person.detail}</p>
                <button className="welcome-button" data-testid={`button-welcome-${person.name.toLowerCase()}`} onClick={() => greet(person.name, person.desc)}>{greeted[person.name] ? 'Accueilli' : 'Accueillir'} {greeted[person.name] ? <Check size={11} /> : <Plus size={11} />}</button>
              </article>
            ))}
          </div>
        </section>

        <aside className="right-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">Petite réserve</div><h2>Dans ton sac</h2></div>
            <div className="live-dot" data-testid="status-live">en direct</div>
          </div>
          <div className="resource-stack">
            <div className="resource-card" data-testid="status-resource-wood"><div className="resource-icon"><TreePine size={18} /></div><div><strong>{resources.wood}</strong><span>Bois tendre</span></div></div>
            <div className="resource-card" data-testid="status-resource-stone"><div className="resource-icon"><Mountain size={18} /></div><div><strong>{resources.stone}</strong><span>Pierres-lune</span></div></div>
            <div className="resource-card" data-testid="status-resource-essence"><div className="resource-icon"><Gem size={18} /></div><div><strong>{resources.essence}</strong><span>Essences</span></div></div>
          </div>

          <hr className="panel-divider" />

          <div className="mission-card" data-testid="status-mission">
            <div className="eyebrow">Mission du chapitre</div>
            <h3>Donner un toit aux arrivants</h3>
            <p>Récolte, construis, puis accueille les nouveaux voisins de la clairière.</p>
            <div className="mission-progress"><div className="mission-bar"><i style={{ width: `${missionPercent}%` }} /></div><b>{missionCount} / 3</b></div>
          </div>

          <hr className="panel-divider" />

          <div className="path-card" data-testid="status-path">
            <header style={{ color: selectedPathInfo.color }}>{selectedPathInfo.icon}<span className="eyebrow">Ton pouvoir</span></header>
            <h3>{selectedPathInfo.title}</h3>
            <p>{selectedPathInfo.subtitle}. Choisis une voie, puis invente tes propres règles.</p>
            <div className="paths-grid">
              {pathOptions.map((path) => (
                <button key={path.id} className={selectedPath === path.id ? 'selected' : ''} data-testid={`button-path-${path.id}`} onClick={() => { setSelectedPath(path.id); notify(`${path.title} rejoint ton histoire.`); }}>
                  {path.icon}<span>{path.title}</span>
                </button>
              ))}
            </div>
          </div>

          <hr className="panel-divider" />

          <button className="path-card path-action" data-testid="button-open-paths" onClick={() => notify('Ton pouvoir grandira avec chaque geste du village.')}>
            <header><Trophy /><span className="eyebrow">Prochaine étincelle</span></header>
            <h3>Le monde est à toi</h3>
            <p>Chaque outil ouvre une nouvelle façon de jouer.</p>
            <span className="eyebrow">Continuer l’aventure <ArrowUpRight size={13} /></span>
          </button>
        </aside>
      </div>

      {feedback && <div key={feedbackKey} className="toast-feedback" data-testid="status-feedback">{feedback}</div>}

      {pendingLevel && (
        <div className="level-modal-backdrop" data-testid="status-level-modal">
          <div className="level-modal">
            <div className="modal-icon"><Star size={26} fill="currentColor" /></div>
            <div className="eyebrow">Nouveau chapitre débloqué</div>
            <h2>Niveau {pendingLevel} : ça devient vivant.</h2>
            <p>Ton royaume grandit. De nouveaux gestes, de nouvelles idées et peut-être une créature à apprivoiser t’attendent dans la suite.</p>
            <div className="modal-actions">
              <button className="secondary" data-testid="button-dismiss-level" onClick={() => setPendingLevel(null)}>Plus tard</button>
              <button className="primary" data-testid="button-continue-level" onClick={() => { setPendingLevel(null); notify('Le chapitre suivant est ouvert.'); }}>Continuer <ChevronRight size={15} /></button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;