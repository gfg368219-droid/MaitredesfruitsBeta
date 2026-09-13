import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  CircleHelp,
  Crown,
  Crosshair,
  Flame,
  Footprints,
  Heart,
  Map,
  Pause,
  Play,
  RotateCcw,
  Shield,
  ShieldCheck,
  Skull,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from 'lucide-react';
import { type MouseEvent } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { World3D, type WorldEnemy, type WorldPlayer } from '@/game/World3D';

const queryClient = new QueryClient();

type PathId = 'guild' | 'necromancer' | 'solar' | 'tempest';
type SkillId = 'arc' | 'dash' | 'heal' | 'awakening';

type HeroState = WorldPlayer & {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  level: number;
  xp: number;
  gold: number;
  combo: number;
};

const initialHero: HeroState = {
  x: 0,
  z: 5,
  hp: 100,
  maxHp: 100,
  mana: 80,
  maxMana: 80,
  level: 1,
  xp: 0,
  gold: 120,
  combo: 0,
};

const pathOptions: Array<{
  id: PathId;
  title: string;
  subtitle: string;
  icon: ReactNode;
  color: string;
}> = [
  { id: 'guild', title: 'Maître de guilde', subtitle: 'Lame équilibrée', icon: <Crown />, color: '#f0b45f' },
  { id: 'necromancer', title: 'Nécromancien', subtitle: 'Rituel des ombres', icon: <Skull />, color: '#b38cff' },
  { id: 'solar', title: 'Dieu Solaire', subtitle: 'Lumière dévorante', icon: <Flame />, color: '#ffbe62' },
  { id: 'tempest', title: 'Tempest', subtitle: 'Foudre instantanée', icon: <Wind />, color: '#67e8f9' },
];

const makeWave = (wave: number): WorldEnemy[] => {
  const bossWave = wave % 3 === 0;
  const count = bossWave ? 4 : Math.min(6, wave + 2);
  const positions = [
    [-10, -5],
    [10, -5],
    [-7, 0],
    [7, 1],
    [-10, 6],
    [9, 7],
  ];
  const names = ['Ombre mineure', 'Traqueur voilé', 'Lame obscure', 'Éclat noir', 'Rôdeur du seuil', 'Gardien de faille'];
  return Array.from({ length: count }, (_, index) => {
    const isBoss = bossWave && index === 0;
    const kind: WorldEnemy['kind'] = isBoss ? 'boss' : index % 3 === 1 ? 'hunter' : 'shadow';
    const [x, z] = isBoss ? [0, -7] : positions[index % positions.length];
    const maxHp = isBoss ? 250 + wave * 35 : 48 + wave * 16 + index * 7;
    return {
      id: wave * 100 + index,
      kind,
      name: isBoss ? `Roi de l'ombre · Vague ${wave}` : names[index % names.length],
      x,
      z,
      hp: maxHp,
      maxHp,
      alive: true,
    };
  });
};

const distance = (a: WorldPlayer, b: WorldPlayer) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function Home() {
  const [hero, setHero] = useState<HeroState>(initialHero);
  const [enemies, setEnemies] = useState<WorldEnemy[]>(() => makeWave(1));
  const [wave, setWave] = useState(1);
  const [selectedPath, setSelectedPath] = useState<PathId>('guild');
  const [selectedEnemy, setSelectedEnemy] = useState<number | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<SkillId, number>>({ arc: 0, dash: 0, heal: 0, awakening: 0 });
  const [attackPulse, setAttackPulse] = useState(0);
  const [awakeningPulse, setAwakeningPulse] = useState(0);
  const [feedback, setFeedback] = useState('La faille s’ouvre. Entre dans le combat.');
  const [feedbackKey, setFeedbackKey] = useState(0);
  const [log, setLog] = useState(['La faille des ombres est active.', 'Ton éveil commence maintenant.']);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const feedbackTimerRef = useRef<number | undefined>(undefined);
  const heroRef = useRef(hero);
  const enemiesRef = useRef(enemies);
  const selectedEnemyRef = useRef(selectedEnemy);
  const cooldownsRef = useRef(cooldowns);
  const transitionRef = useRef(false);

  heroRef.current = hero;
  enemiesRef.current = enemies;
  selectedEnemyRef.current = selectedEnemy;
  cooldownsRef.current = cooldowns;

  const selectedPathInfo = pathOptions.find((path) => path.id === selectedPath) ?? pathOptions[0];
  const aliveEnemies = enemies.filter((enemy) => enemy.alive);
  const defeated = enemies.length - aliveEnemies.length;
  const boss = enemies.find((enemy) => enemy.kind === 'boss' && enemy.alive);
  const progress = enemies.length ? Math.round((defeated / enemies.length) * 100) : 0;

  const notify = (message: string) => {
    setFeedback(message);
    setFeedbackKey((key) => key + 1);
    setLog((current) => [message, ...current].slice(0, 4));
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(''), 3400);
  };

  const resetGame = () => {
    setHero(initialHero);
    setEnemies(makeWave(1));
    setWave(1);
    setSelectedPath('guild');
    setSelectedEnemy(null);
    setCooldowns({ arc: 0, dash: 0, heal: 0, awakening: 0 });
    setAttackPulse(0);
    setAwakeningPulse(0);
    setPaused(false);
    setGameOver(false);
    transitionRef.current = false;
    notify('Nouvelle chasse lancée. La première vague arrive.');
  };

  const dealDamage = (enemyId: number, damage: number) => {
    let defeatedTarget = false;
    setEnemies((current) => current.map((enemy) => {
      if (enemy.id !== enemyId || !enemy.alive) return enemy;
      const nextHp = Math.max(0, enemy.hp - damage);
      defeatedTarget = nextHp === 0;
      return { ...enemy, hp: nextHp, alive: nextHp > 0 };
    }));
    setHero((current) => ({
      ...current,
      combo: Math.min(99, current.combo + 1),
      xp: clamp(current.xp + (defeatedTarget ? 18 : 5), 0, 100),
    }));
    return defeatedTarget;
  };

  const attack = () => {
    if (paused || gameOver) return;
    const currentHero = heroRef.current;
    const available = enemiesRef.current.filter((enemy) => enemy.alive);
    const locked = available.find((enemy) => enemy.id === selectedEnemyRef.current);
    const target = locked ?? [...available].sort((a, b) => distance(currentHero, a) - distance(currentHero, b))[0];
    if (!target || distance(currentHero, target) > 4.1) {
      notify('Approche-toi d’une ombre avant d’attaquer.');
      return;
    }
    const multiplier = selectedPath === 'tempest' ? 1.15 : selectedPath === 'guild' ? 1.08 : 1;
    const damage = Math.round((14 + currentHero.level * 4) * multiplier);
    setAttackPulse((pulse) => pulse + 1);
    const defeatedTarget = dealDamage(target.id, damage);
    notify(defeatedTarget ? `${target.name} est vaincu.` : `Frappe de l’éveil : −${damage} dégâts.`);
  };

  const castSkill = (skill: SkillId) => {
    if (paused || gameOver) return;
    const currentHero = heroRef.current;
    const currentCooldown = cooldownsRef.current[skill];
    if (currentCooldown > 0) {
      notify(`Cette compétence revient dans ${Math.ceil(currentCooldown)}s.`);
      return;
    }
    const costs: Record<SkillId, number> = { arc: 15, dash: 10, heal: 20, awakening: 40 };
    if (currentHero.mana < costs[skill]) {
      notify('Pas assez de mana.');
      return;
    }
    const cooldownTimes: Record<SkillId, number> = { arc: 3, dash: 5, heal: 8, awakening: 14 };
    setCooldowns((current) => ({ ...current, [skill]: cooldownTimes[skill] }));
    setHero((current) => ({ ...current, mana: Math.max(0, current.mana - costs[skill]) }));

    if (skill === 'heal') {
      setHero((current) => ({ ...current, hp: Math.min(current.maxHp, current.hp + 35) }));
      notify('Soin solaire : ta vitalité remonte.');
      return;
    }

    if (skill === 'dash') {
      const target = [...enemiesRef.current.filter((enemy) => enemy.alive)].sort((a, b) => distance(currentHero, a) - distance(currentHero, b))[0];
      if (target) {
        setHero((current) => ({ ...current, x: clamp(target.x + (target.x > current.x ? -2 : 2), -14, 14), z: clamp(target.z + (target.z > current.z ? -2 : 2), -9, 10) }));
        dealDamage(target.id, 30 + currentHero.level * 5);
      }
      setAttackPulse((pulse) => pulse + 1);
      notify('Pas de Tempest : tu traverses la faille.');
      return;
    }

    const radius = skill === 'awakening' ? 6.7 : 4.5;
    const damage = skill === 'awakening' ? 68 + currentHero.level * 10 : 26 + currentHero.level * 5;
    let hits = 0;
    enemiesRef.current.forEach((enemy) => {
      if (enemy.alive && distance(currentHero, enemy) <= radius) {
        dealDamage(enemy.id, damage);
        hits += 1;
      }
    });
    if (skill === 'awakening') setAwakeningPulse((pulse) => pulse + 1);
    setAttackPulse((pulse) => pulse + 1);
    notify(skill === 'awakening' ? `Éveil absolu : ${hits} cible${hits > 1 ? 's' : ''} frappée${hits > 1 ? 's' : ''}.` : `Arc de lumière : ${hits} cible${hits > 1 ? 's' : ''} touchée${hits > 1 ? 's' : ''}.`);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      const key = event.key.toLowerCase();
      if (event.key === ' ') {
        event.preventDefault();
        attack();
      }
      if (key === 'q') castSkill('arc');
      if (key === 'w') castSkill('dash');
      if (key === 'e') castSkill('heal');
      if (key === 'r') castSkill('awakening');
      if (key === 'escape') setPaused((current) => !current);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    };
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (paused || gameOver) return;
      const currentHero = heroRef.current;
      let damageTaken = 0;
      setEnemies((current) => current.map((enemy) => {
        if (!enemy.alive) return enemy;
        const gap = distance(currentHero, enemy);
        if (gap < 1.45) {
          damageTaken += enemy.kind === 'boss' ? 12 : 5;
          return enemy;
        }
        if (gap < 15 && enemy.kind !== 'hunter') {
          const angle = Math.atan2(currentHero.z - enemy.z, currentHero.x - enemy.x);
          return { ...enemy, x: clamp(enemy.x + Math.cos(angle) * 0.08, -14, 14), z: clamp(enemy.z + Math.sin(angle) * 0.08, -9, 10) };
        }
        return enemy;
      }));
      if (damageTaken) {
        setHero((current) => {
          const hp = Math.max(0, current.hp - damageTaken);
          if (hp === 0) setGameOver(true);
          return { ...current, hp, combo: 0 };
        });
        notify('Les ombres t’encerclent. Déplace-toi.');
      }
      setCooldowns((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, Math.max(0, Number((value - 0.1).toFixed(1)))])) as Record<SkillId, number>);
      setHero((current) => ({ ...current, mana: Math.min(current.maxMana, current.mana + 0.6) }));
    }, 100);
    return () => window.clearInterval(interval);
  }, [gameOver, paused]);

  useEffect(() => {
    const allDefeated = enemies.length > 0 && enemies.every((enemy) => !enemy.alive);
    if (!allDefeated || transitionRef.current || gameOver) return;
    transitionRef.current = true;
    setPaused(true);
    notify(`Vague ${wave} nettoyée. Le portail suivant s’ouvre.`);
    const transition = window.setTimeout(() => {
      setWave((current) => {
        const nextWave = current + 1;
        setEnemies(makeWave(nextWave));
        return nextWave;
      });
      setHero((current) => ({ ...current, hp: current.maxHp, mana: current.maxMana, level: current.level + 1, xp: 0, combo: 0, gold: current.gold + wave * 40 }));
      setSelectedEnemy(null);
      setPaused(false);
      transitionRef.current = false;
      notify('Nouvelle vague. La difficulté augmente.');
    }, 1500);
    return () => window.clearTimeout(transition);
  }, [enemies, gameOver, wave]);

  const skillCards = useMemo(() => [
    { id: 'arc' as SkillId, key: 'Q', title: 'Arc solaire', hint: 'Zone', icon: <Flame />, cost: 15 },
    { id: 'dash' as SkillId, key: 'W', title: 'Pas fantôme', hint: 'Dash', icon: <Footprints />, cost: 10 },
    { id: 'heal' as SkillId, key: 'E', title: 'Soin', hint: 'Vitalité', icon: <Heart />, cost: 20 },
    { id: 'awakening' as SkillId, key: 'R', title: 'Éveil absolu', hint: 'Ultime', icon: <Sparkles />, cost: 40 },
  ], []);

  const onPlayerMove = (position: WorldPlayer) => setHero((current) => ({ ...current, ...position }));
  const onEnemySelect = (id: number) => {
    setSelectedEnemy(id);
    const target = enemiesRef.current.find((enemy) => enemy.id === id);
    if (target) notify(`${target.name} est verrouillé.`);
  };

  return (
    <main className="game-shell">
      <header className="game-topbar">
        <div className="brand-lockup"><div className="brand-mark"><Swords size={22} /></div><div><div className="brand-kicker">Dossier de chasseur · Saison 01</div><div className="brand-name">Éveil des Royaumes</div></div></div>
        <div className="top-center"><span className="top-status-dot" /> SERVEUR DE LA FAILLE <b>EN DIRECT</b></div>
        <div className="top-actions"><button className="icon-button" data-testid="button-help" title="Commandes" onClick={() => setShowHelp(true)}><CircleHelp size={18} /></button><button className="icon-button" data-testid="button-toggle-sound" title="Son" onClick={() => { setSoundOn((current) => !current); notify(soundOn ? 'Sons coupés.' : 'Sons activés.'); }}>{soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}</button><div className="player-chip" data-testid="status-player"><div className="player-avatar">E</div><div><strong>Éclaireur·euse</strong><small>Niveau {hero.level} · Rang C</small></div></div><button className="icon-button" data-testid="button-reset-game" title="Recommencer" onClick={resetGame}><RotateCcw size={17} /></button></div>
      </header>

      <div className="game-layout">
        <aside className="side-rail" aria-label="Navigation"><div className="rail-badge"><Shield size={19} /></div><button className="rail-icon active" data-testid="button-nav-dungeon" title="Donjon"><Swords size={19} /></button><button className="rail-icon" data-testid="button-nav-map" title="Carte" onClick={() => notify('La carte sera débloquée après la vague 3.')}><Map size={19} /></button><button className="rail-icon" data-testid="button-nav-rank" title="Classement" onClick={() => notify(`Rang C · ${wave} vague${wave > 1 ? 's' : ''} franchie${wave > 1 ? 's' : ''}.`)}><Trophy size={19} /></button><button className="rail-icon" data-testid="button-nav-guild" title="Guilde" onClick={() => notify('La guilde attend ton premier boss.')}><Crown size={19} /></button><div className="rail-bottom"><div className="level-rail">LVL<br /><b>{hero.level}</b></div></div></aside>

        <section className="play-column">
          <div className="battle-heading"><div><div className="eyebrow">Donjon instancié · Fissure des ombres</div><h1>La chasse <span>commence.</span></h1><p>Un monde 3D vivant. Déplace ton héros, verrouille une cible et utilise tes compétences pour survivre à chaque vague.</p></div><div className="wave-card" data-testid="status-wave"><div className="wave-card-top"><span>VAGUE</span><strong>{String(wave).padStart(2, '0')} <small>/ ∞</small></strong></div><div className="wave-progress"><i style={{ width: `${progress}%` }} /></div><small>{defeated} / {enemies.length} ombres vaincues</small></div></div>

          <div className="arena-frame">
            <div className="arena-topline"><span className="live-pill"><i /> EN DIRECT</span><b>SECTEUR 07 · RUINES DE SOLARIA</b><span className="arena-coordinates">X {hero.x.toFixed(1)} · Z {hero.z.toFixed(1)}</span></div>
            <World3D player={hero} enemies={enemies} selectedEnemy={selectedEnemy} attackPulse={attackPulse} awakeningPulse={awakeningPulse} onPlayerMove={onPlayerMove} onEnemySelect={onEnemySelect} />
            {boss && <div className="boss-bar" data-testid="status-boss"><div className="boss-title"><Skull size={14} /> {boss.name}<b>{Math.round((boss.hp / boss.maxHp) * 100)}%</b></div><div><i style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }} /></div></div>}
            <div className="arena-help"><Crosshair size={14} /> WASD pour bouger · clique une ombre pour la verrouiller · espace pour attaquer</div>
            {paused && !gameOver && <div className="arena-paused"><Pause size={26} /><strong>Pause</strong><small>Appuie sur Échap ou le bouton pause pour reprendre</small></div>}
          </div>

          <div className="combat-controls"><div className="control-copy"><span className="eyebrow">Compétences éveillées</span><strong>Frappe l’ombre</strong><small>Les touches Q W E R sont actives</small></div><div className="skill-row">{skillCards.map((skill) => <button key={skill.id} className={`skill-button ${skill.id === 'awakening' ? 'ultimate' : ''} ${cooldowns[skill.id] > 0 ? 'cooldown' : ''}`} data-testid={`button-skill-${skill.id}`} onClick={() => castSkill(skill.id)} disabled={cooldowns[skill.id] > 0}><span className="skill-key">{skill.key}</span><span className="skill-icon">{skill.icon}</span><span className="skill-info"><b>{skill.title}</b><small>{skill.hint} · {skill.cost} mana</small></span>{cooldowns[skill.id] > 0 && <em>{Math.ceil(cooldowns[skill.id])}</em>}</button>)}<button className="attack-button" data-testid="button-basic-attack" onClick={attack}><Swords size={18} /><span>Attaque</span><small>ESPACE</small></button></div></div>

          <div className="bottom-grid"><div className="event-log" data-testid="status-event-log"><div className="section-label"><span>Journal de chasse</span><b>LIVE</b></div>{log.map((entry, index) => <div className={`log-entry ${index === 0 ? 'fresh' : ''}`} key={`${entry}-${index}`}><i />{entry}<small>{index === 0 ? 'maintenant' : `${index} min`}</small></div>)}</div><div className="path-panel" data-testid="status-path-panel"><div className="section-label"><span>Classe éveillée</span><b>CHOISIR</b></div><div className="path-active" style={{ '--path-color': selectedPathInfo.color } as CSSProperties}><div className="path-icon">{selectedPathInfo.icon}</div><div><strong>{selectedPathInfo.title}</strong><small>{selectedPathInfo.subtitle}</small></div></div><div className="path-options">{pathOptions.map((path) => <button key={path.id} className={selectedPath === path.id ? 'selected' : ''} data-testid={`button-path-${path.id}`} onClick={() => { setSelectedPath(path.id); notify(`${path.title} équipé.`); }}>{path.icon}<span>{path.title}</span></button>)}</div></div></div>
        </section>

        <aside className="right-panel">
          <div className="hunter-card"><div className="hunter-card-head"><div className="hunter-avatar"><ShieldCheck size={25} /></div><div><div className="eyebrow">Chasseur en mission</div><h2>Éclaireur·euse</h2><small>Rang C · Royaume 01</small></div><button className="mini-icon" data-testid="button-pause" onClick={() => setPaused((current) => !current)}>{paused ? <Play size={15} /> : <Pause size={15} />}</button></div><div className="stat-row"><div className="stat-label"><Heart size={13} /> VITALITÉ <b>{Math.ceil(hero.hp)} / {hero.maxHp}</b></div><div className="stat-bar health"><i style={{ width: `${(hero.hp / hero.maxHp) * 100}%` }} /></div></div><div className="stat-row"><div className="stat-label"><Zap size={13} /> MANA <b>{Math.ceil(hero.mana)} / {hero.maxMana}</b></div><div className="stat-bar mana"><i style={{ width: `${(hero.mana / hero.maxMana) * 100}%` }} /></div></div><div className="hunter-metrics"><span><b>{hero.combo}</b><small>combo</small></span><span><b>{hero.level}</b><small>niveau</small></span><span><b>{hero.gold}</b><small>or</small></span></div></div>
          <div className="mission-panel" data-testid="status-mission"><div className="eyebrow">Objectif actuel</div><h3>Nettoyer la faille</h3><p>Vaincs toutes les ombres de la vague pour augmenter ton rang.</p><div className="mission-line"><div><i style={{ width: `${progress}%` }} /></div><b>{defeated}/{enemies.length}</b></div><span className="mission-reward"><Trophy size={13} /> Récompense : +1 niveau</span></div>
          <div className="control-panel"><div className="section-label"><span>Raccourcis</span><b>CLAVIER</b></div><div className="shortcut"><span className="keys">W A S D</span><span>Déplacer le héros</span></div><div className="shortcut"><span className="keys">Q W E R</span><span>Compétences</span></div><div className="shortcut"><span className="keys wide">ESPACE</span><span>Frappe rapide</span></div></div>
          <button className="rank-card" data-testid="button-rank-card" onClick={() => notify(`Rang C · ${wave} vague${wave > 1 ? 's' : ''} franchie${wave > 1 ? 's' : ''}.`)}><div className="rank-emblem"><Shield size={22} /></div><div><span className="eyebrow">Classement local</span><strong>Rang C</strong><small>Encore 2 boss pour le rang B</small></div><Target size={16} /></button>
        </aside>
      </div>

      {feedback && <div key={feedbackKey} className="toast-feedback" data-testid="status-feedback">{feedback}</div>}
      {showHelp && <div className="modal-backdrop" data-testid="status-help-modal" onClick={() => setShowHelp(false)}><div className="help-modal" onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}><div className="modal-top"><span className="modal-icon"><CircleHelp size={24} /></span><button className="mini-icon" data-testid="button-close-help" onClick={() => setShowHelp(false)}>×</button></div><div className="eyebrow">Manuel du chasseur</div><h2>Entre dans la faille.</h2><p>Déplace-toi avec WASD ou les flèches. Clique une ombre pour la verrouiller. Espace attaque. Q, W, E et R déclenchent les compétences. Toutes les trois vagues, un Roi de l’ombre apparaît.</p><div className="help-list"><span><Swords size={16} /> Bats chaque vague pour gagner un niveau.</span><span><Sparkles size={16} /> Change de classe pour modifier ton style de combat.</span><span><Trophy size={16} /> Reviens plus fort pour atteindre le rang B.</span></div></div></div>}
      {gameOver && <div className="modal-backdrop" data-testid="status-game-over"><div className="help-modal game-over"><span className="modal-icon danger"><Skull size={25} /></span><div className="eyebrow">Chasse interrompue</div><h2>La faille t’a vaincu.</h2><p>Ton éveil n’est pas terminé. Reviens plus fort et bats la première vague pour reprendre ton ascension.</p><button className="primary-modal-button" data-testid="button-restart-game" onClick={resetGame}><RotateCcw size={16} /> Recommencer la chasse</button></div></div>}
    </main>
  );
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;