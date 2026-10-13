/*
 * Parcours de test autonome de Cadence : accueil, profil, missions chronométrées
 * dans le prototype, facilité perçue, questionnaire SUS, commentaires, envoi.
 */
(function () {
  'use strict';
  const R = window.React;
  const { useState, useEffect, useRef, useCallback } = R;
  const { h, Guard, loadScreen } = window.CadenceRuntime;
  const CONFIG = window.CADENCE_CONFIG || {};

  // ---------- Contenu ----------
  const SCREENS = {
    'MainMobile.dc.html': 'Accueil',
    'SeancesMobile.dc.html': 'Séances',
    'ProgressionMobile.dc.html': 'Progression',
    'ObjectifsMobile.dc.html': 'Objectifs',
    'ProfilMobile.dc.html': 'Profil',
    'ParametresMobile.dc.html': 'Paramètres',
    'PartieDetail.dc.html': 'Détail de la partie',
    'SocialMobile.dc.html': 'Social',
    'ChatMobile.dc.html': 'Discussion',
    'OnboardingMobile.dc.html': 'Premier lancement',
    'AccueilVideMobile.dc.html': 'Accueil vide',
    'EntrainementMobile.dc.html': 'Enregistrer un entraînement',
    'PartieLiveMobile.dc.html': 'Partie en direct',
    'CompetitionsMobile.dc.html': 'Compétitions',
    'ParcoursMobile.dc.html': 'Parcours',
    'SeanceGuideeMobile.dc.html': 'Séance guidée',
    'TrackmanMobile.dc.html': 'TrackMan'
  };
  const HOME = 'MainMobile.dc.html';

  const MISSIONS = [
    { id: 'T0', title: 'Faire le premier lancement', say: 'Tu viens d’installer Cadence. Configure l’application jusqu’à arriver sur l’accueil.', start: 'OnboardingMobile.dc.html' },
    { id: 'T1', title: 'Enregistrer 30 min de putting', say: 'Tu viens de faire 30 minutes de putting. Enregistre cette séance.', start: HOME },
    { id: 'T2', title: 'Partie en Stableford, 3 trous', say: 'Tu commences une partie en Stableford. Crée-la et note tes 3 premiers trous.', start: HOME },
    { id: 'T3', title: 'Retrouver son meilleur score', say: 'Retrouve ton meilleur score.', start: HOME },
    { id: 'T4', title: 'Évolution du putting sur la saison', say: 'Regarde comment ton putting a évolué sur la saison.', start: HOME },
    { id: 'T5', title: 'Passer en mode clair', say: 'Passe l’application en mode clair.', start: HOME },
    { id: 'T6', title: 'Lancer la séance guidée', say: 'Lance la séance que l’application te recommande cette semaine.', start: HOME },
    { id: 'T7', title: 'Retrouver la note du coach', say: 'Ton coach t’a laissé une note. Retrouve-la.', start: HOME },
    { id: 'T8', title: 'TrackMan : distance au fer 7', say: 'Importe tes séances TrackMan et trouve ta distance moyenne au fer 7.', start: HOME },
    { id: 'T9', title: 'Retirer un bloc de l’accueil', say: 'Tu ne veux plus voir l’activité récente sur ton accueil. Retire-la.', start: HOME },
    { id: 'T10', title: 'Comprendre « différentiel »', say: 'Tu ne sais pas ce qu’est un « différentiel ». Trouve l’explication dans l’application.', start: HOME },
    { id: 'T11', title: 'Rechercher ses séances de putting', say: 'Retrouve toutes tes séances de putting en utilisant la recherche.', start: HOME }
  ];

  const SUS = [
    'Je pense que j’aimerais utiliser Cadence régulièrement.',
    'J’ai trouvé Cadence inutilement compliqué.',
    'J’ai trouvé Cadence facile à utiliser.',
    'Je pense que j’aurais besoin de l’aide de quelqu’un pour savoir utiliser Cadence.',
    'J’ai trouvé que les différentes parties de Cadence étaient bien reliées entre elles.',
    'J’ai trouvé qu’il y avait trop d’incohérences dans Cadence.',
    'J’imagine que la plupart des golfeurs apprendraient à utiliser Cadence très rapidement.',
    'J’ai trouvé Cadence lourd à utiliser.',
    'Je me suis senti·e en confiance en utilisant Cadence.',
    'J’ai dû apprendre beaucoup de choses avant de pouvoir me servir de Cadence.'
  ];

  const AGES = ['Moins de 20 ans', '20 à 34 ans', '35 à 49 ans', '50 à 64 ans', '65 ans et plus'];
  const LEVELS = ['Débutant (pas d’index)', 'Loisir (index 25 à 54)', 'Régulier (index 12 à 25)', 'Compétition (index sous 12)', 'Ne joue pas au golf'];
  const APPS = ['Jamais', 'Parfois', 'Chaque semaine', 'Tous les jours'];
  const SEQ_LABELS = ['Très difficile', '', '', '', '', '', 'Très facile'];

  // ---------- Stockage de la session de test ----------
  const KEY = 'cadenceTest.session';
  const load = () => { try { return JSON.parse(window.localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const save = (s) => { try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
  const wipeApp = () => {
    try { Object.keys(window.localStorage).filter((k) => k.indexOf('cadence.') === 0).forEach((k) => window.localStorage.removeItem(k)); } catch (e) {}
  };

  function device() {
    const ua = navigator.userAgent || '';
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const w = Math.min(window.screen.width, window.screen.height);
    if (/iPad|Tablet/i.test(ua) || (touch && w >= 600)) return 'Tablette';
    if (/Mobi|Android|iPhone/i.test(ua) || (touch && w < 600)) return 'Téléphone';
    return 'Ordinateur';
  }
  function browser() {
    const ua = navigator.userAgent || '';
    const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Autre';
    const br = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'Autre';
    return os + ' · ' + br;
  }
  const newCode = () => 'T-' + Math.random().toString(36).slice(2, 6).toUpperCase();

  function newSession() {
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      code: newCode(),
      startedAt: new Date().toISOString(),
      step: 'profile',
      i: 0,
      profile: { age: '', level: '', apps: '', device: device(), browser: browser() },
      missions: [],
      sus: Array(10).fill(0),
      likes: '', dislikes: '',
      run: null,
      sent: false
    };
  }

  const susScore = (a) => a.every((x) => x >= 1) ? a.reduce((t, v, i) => t + (i % 2 === 0 ? v - 1 : 5 - v), 0) * 2.5 : null;

  // ---------- Taille du téléphone à l'écran ----------
  function useViewport() {
    const get = () => ({ w: window.innerWidth, h: (window.visualViewport && window.visualViewport.height) || window.innerHeight });
    const [vp, setVp] = useState(get);
    useEffect(() => {
      let t;
      const on = () => { clearTimeout(t); t = setTimeout(() => setVp(get()), 80); };
      window.addEventListener('resize', on);
      window.addEventListener('orientationchange', on);
      return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
    }, []);
    return vp;
  }

  // ---------- Le téléphone : affiche un écran du prototype ----------
  const styleEl = document.getElementById('screen-css');

  function Phone(props) {
    const { screen, navKey, availW, availH, onNavigate, onClickInside } = props;
    const [mod, setMod] = useState(null);
    useEffect(() => {
      let alive = true;
      loadScreen(screen).then((m) => { if (alive) setMod(m); }).catch(() => { if (alive) setMod({ name: screen, failed: true }); });
      return () => { alive = false; };
    }, [screen]);
    useEffect(() => { if (mod && mod.css) styleEl.textContent = mod.css; }, [mod]);

    const small = availW < 520;
    // Sur téléphone, pas de mise à l'échelle : un parent transformé gêne le défilement tactile sur iPhone.
    const scale = small ? 1 : Math.min(1, availH / 700);
    const frameW = small ? Math.round(availW) : 390;
    const frameH = small ? availH : Math.min(844, availH / scale);

    const ready = mod && mod.name === screen && !mod.failed;
    const inner = ready
      ? h(Guard, { key: navKey, onHome: () => onNavigate(HOME) }, h(mod.Comp, { __ctx: { tpl: mod.tpl, navigate: onNavigate, frameH: frameH, frameW: frameW } }))
      : h('div', { className: 't-phone-loading' }, mod && mod.failed ? 'Écran introuvable. Vérifie ta connexion puis recharge la page.' : 'Chargement…');

    return h('div', { className: 't-phone' + (small ? ' is-full' : ''), style: { width: frameW * scale + 'px', height: frameH * scale + 'px' }, onClickCapture: onClickInside },
      h('div', { className: 't-phone-inner', onScroll: (e) => { e.currentTarget.scrollTop = 0; e.currentTarget.scrollLeft = 0; }, style: { width: frameW + 'px', height: frameH + 'px', transform: scale === 1 ? 'none' : 'scale(' + scale + ')' } }, inner));
  }

  // ---------- Petits composants d'interface ----------
  function Shell(props) {
    return h('div', { className: 't-page' }, h('div', { className: 't-card' + (props.wide ? ' is-wide' : '') }, props.children));
  }
  function Logo() {
    return h('div', { className: 't-brand' },
      h('svg', { width: 40, height: 40, viewBox: '0 0 96 96', 'aria-hidden': 'true' },
        h('rect', { x: 1, y: 1, width: 94, height: 94, rx: 22, fill: '#17201a', stroke: '#2b3a30', strokeWidth: 2 }),
        h('path', { d: 'M14 72 H 84', stroke: '#4fbf86', strokeWidth: 1.6, strokeLinecap: 'round', opacity: 0.35 }),
        h('path', { d: 'M20 71 C 26 30, 46 26, 54 71 Q 59 61, 64 71.5 L 70 72', fill: 'none', stroke: '#4fbf86', strokeWidth: 3.4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('circle', { cx: 20, cy: 71, r: 4.6, fill: '#4fbf86' }),
        h('path', { d: 'M74 72 V 30', stroke: '#f2efe7', strokeWidth: 2.6, strokeLinecap: 'round' }),
        h('path', { d: 'M74 30 L 86 34.5 L 74 39 Z', fill: '#4fbf86' })),
      h('span', null, 'Cadence'));
  }
  function Choice(props) {
    return h('fieldset', { className: 't-field' },
      h('legend', null, props.label),
      h('div', { className: 't-chips' }, props.options.map((o) => h('button', {
        key: o, type: 'button', className: 't-chip' + (props.value === o ? ' is-on' : ''), 'aria-pressed': props.value === o ? 'true' : 'false',
        onClick: () => props.onChange(o)
      }, o))));
  }
  function Progress(props) {
    return h('div', { className: 't-progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': props.total, 'aria-valuenow': props.done },
      h('i', { style: { width: (100 * props.done / props.total) + '%' } }));
  }

  // ---------- Application ----------
  function App() {
    const vp = useViewport();
    // Verrouille le défilement de la page pendant une mission ou l'exploration libre
    useEffect(() => {
      const lock = () => document.documentElement.classList.toggle('t-lock', !!document.querySelector('.t-run'));
      lock();
      const t = setInterval(lock, 500);
      return () => clearInterval(t);
    }, []);
    const free = /[?&]libre\b/.test(window.location.search);
    const [s, setS] = useState(() => (free ? null : load()));
    const [screen, setScreen] = useState(() => (s && s.run && s.run.screen) || HOME);
    const [navKey, setNavKey] = useState(0);
    const [expanded, setExpanded] = useState(true);
    const [confirm, setConfirm] = useState(null);
    const [toast, setToast] = useState('');
    const [sending, setSending] = useState('');
    const toastT = useRef(null);
    // Hauteur réelle de la barre de mission, pour donner le reste au téléphone
    const barRef = useRef(null);
    const [barH, setBarH] = useState(96);
    useEffect(() => {
      const el = barRef.current;
      if (!el || !window.ResizeObserver) return undefined;
      const ro = new ResizeObserver(() => setBarH(Math.ceil(el.getBoundingClientRect().height)));
      ro.observe(el);
      return () => ro.disconnect();
    });

    const update = useCallback((fn) => {
      setS((prev) => { const next = fn(Object.assign({}, prev)); save(next); return next; });
    }, []);

    // Précharge tous les écrans pour une navigation instantanée
    useEffect(() => { Object.keys(SCREENS).forEach((n) => loadScreen(n).catch(() => {})); }, []);

    const showToast = (msg) => {
      setToast(msg);
      clearTimeout(toastT.current);
      toastT.current = setTimeout(() => setToast(''), 2600);
    };

    const navigate = useCallback((target) => {
      if (!SCREENS[target]) { showToast('Cet écran ne fait pas partie du test.'); return; }
      setScreen(target);
      setNavKey((k) => k + 1);
      if (!free) {
        update((p) => {
          if (!p || !p.run) return p;
          const run = Object.assign({}, p.run);
          run.navs = (run.navs || 0) + 1;
          run.path = (run.path || []).concat(SCREENS[target]).slice(-60);
          run.screen = target;
          p.run = run;
          return p;
        });
      }
    }, [free, update]);

    const countClick = useCallback(() => {
      if (free) return;
      update((p) => { if (!p || !p.run) return p; p.run = Object.assign({}, p.run, { clicks: (p.run.clicks || 0) + 1 }); return p; });
    }, [free, update]);

    // ----- Mode exploration libre (?libre) -----
    if (free) {
      window.__cadenceNav = navigate;
      return h('div', { className: 't-run' },
        h('div', { className: 't-bar', ref: barRef }, h('div', { className: 't-bar-row' },
          h('span', { className: 't-bar-title is-static' }, 'Cadence · exploration libre'),
          h('button', { className: 't-btn is-ghost is-small', onClick: () => { wipeApp(); navigate('OnboardingMobile.dc.html'); } }, 'Remettre à zéro'))),
        h(Phone, { screen: screen, navKey: navKey, availW: vp.w, availH: vp.h - barH - 1, onNavigate: navigate }),
        toast ? h('div', { className: 't-toast', role: 'status' }, toast) : null);
    }

    // ----- Accueil -----
    if (!s) {
      return h(Shell, null,
        h(Logo),
        h('h1', { className: 't-h1' }, 'Merci de tester Cadence !'),
        h('p', { className: 't-lead' }, 'Cadence est une application de suivi pour golfeurs (séances, parties, progression), que nous concevons pour un projet d’école.'),
        h('ul', { className: 't-list' },
          h('li', null, h('strong', null, 'On teste l’application, pas toi. '), 'Si quelque chose est difficile, c’est l’appli qu’il faudra changer.'),
          h('li', null, 'Tu vas faire ', h('strong', null, '12 petites missions'), ', une par une, directement dans l’appli. Fais comme tu le sentirais, sans chercher l’aide de quelqu’un.'),
          h('li', null, 'Tu peux abandonner une mission à tout moment : c’est une information utile pour nous.'),
          h('li', null, 'C’est une maquette : certaines données sont inventées et tous les boutons ne mènent pas quelque part.'),
          h('li', null, 'Compte ', h('strong', null, '15 à 20 minutes'), ', puis un court questionnaire. Tes réponses sont ', h('strong', null, 'anonymes'), '.')),
        h('div', { className: 't-actions' },
          h('button', { className: 't-btn', onClick: () => { wipeApp(); const n = newSession(); save(n); setS(n); } }, 'Commencer')),
        h('p', { className: 't-fine' }, 'En continuant, tu acceptes que tes réponses anonymes (choix, temps, commentaires) soient utilisées pour notre projet d’école.'));
    }

    // ----- Profil -----
    if (s.step === 'profile') {
      const p = s.profile;
      const setP = (k) => (v) => update((x) => { x.profile = Object.assign({}, x.profile, { [k]: v }); return x; });
      const ok = p.age && p.level && p.apps;
      return h(Shell, null,
        h('div', { className: 't-eyebrow' }, 'Avant de commencer'),
        h('h1', { className: 't-h1' }, 'Trois questions sur toi'),
        h(Choice, { label: 'Ton âge', options: AGES, value: p.age, onChange: setP('age') }),
        h(Choice, { label: 'Ton niveau de golf', options: LEVELS, value: p.level, onChange: setP('level') }),
        h(Choice, { label: 'Tu utilises des applis de suivi sportif…', options: APPS, value: p.apps, onChange: setP('apps') }),
        h('div', { className: 't-actions' },
          h('button', { className: 't-btn', disabled: !ok, onClick: () => update((x) => { x.step = 'brief'; x.i = 0; return x; }) }, ok ? 'Voir la première mission' : 'Réponds aux trois questions')));
    }

    const m = MISSIONS[s.i];

    // ----- Présentation d'une mission -----
    if (s.step === 'brief') {
      return h(Shell, null,
        h(Progress, { done: s.i, total: MISSIONS.length }),
        h('div', { className: 't-eyebrow' }, 'Mission ' + (s.i + 1) + ' sur ' + MISSIONS.length),
        h('p', { className: 't-say' }, m.say),
        h('p', { className: 't-help' }, 'Quand tu penses avoir terminé, touche « J’ai terminé » en haut de l’écran. Tu peux aussi abandonner.'),
        h('div', { className: 't-actions' },
          h('button', { className: 't-btn', onClick: () => {
            // Après le premier lancement, active les modules dont les missions ont besoin
            // (coach, compétitions, social), même si le testeur les a désactivés.
            if (m.id !== 'T0') {
              try { ['competitions', 'coach', 'social'].forEach((k) => window.localStorage.setItem('cadence.mod.' + k, '1')); } catch (e) {}
            }
            setScreen(m.start); setNavKey((k) => k + 1); setExpanded(false);
            update((x) => { x.step = 'run'; x.run = { start: Date.now(), navs: 0, clicks: 0, path: [SCREENS[m.start]], screen: m.start }; return x; });
          } }, 'C’est parti')));
    }

    // ----- Mission en cours, dans le prototype -----
    if (s.step === 'run') {
      const finish = (status) => {
        setConfirm(null);
        update((x) => {
          const r = x.run || {};
          const secs = Math.round((Date.now() - (r.start || Date.now())) / 1000);
          x.missions = x.missions.filter((y) => y.id !== m.id).concat({ id: m.id, title: m.title, status: status, secs: secs, navs: r.navs || 0, clicks: r.clicks || 0, path: (r.path || []).join(' › '), seq: 0, comment: '' });
          x.run = null;
          x.step = 'rate';
          return x;
        });
      };
      return h('div', { className: 't-run' },
        h('div', { className: 't-bar', ref: barRef },
          h('div', { className: 't-bar-row' },
            h('button', { className: 't-bar-title', onClick: () => setExpanded(!expanded), 'aria-expanded': expanded ? 'true' : 'false' },
              'Mission ' + (s.i + 1) + '/' + MISSIONS.length, h('span', { className: 't-bar-toggle' }, expanded ? 'masquer' : 'revoir la consigne')),
            h('div', { className: 't-bar-btns' },
              h('button', { className: 't-btn is-ghost is-small', onClick: () => setConfirm('abandon') }, 'J’abandonne'),
              h('button', { className: 't-btn is-small', onClick: () => setConfirm('reussie') }, 'J’ai terminé'))),
          expanded ? h('p', { className: 't-bar-say' }, m.say) : null),
        h(Phone, { screen: screen, navKey: navKey, availW: vp.w, availH: vp.h - barH - 1, onNavigate: navigate, onClickInside: countClick }),
        confirm ? h('div', { className: 't-modal', role: 'dialog', 'aria-modal': 'true' },
          h('div', { className: 't-modal-box' },
            h('p', { className: 't-modal-text' }, confirm === 'reussie' ? 'Tu as terminé cette mission ?' : 'Tu veux abandonner cette mission ?'),
            h('div', { className: 't-actions is-row' },
              h('button', { className: 't-btn is-ghost', onClick: () => setConfirm(null) }, 'Continuer la mission'),
              h('button', { className: 't-btn', onClick: () => finish(confirm) }, confirm === 'reussie' ? 'Oui, terminé' : 'Oui, abandonner')))) : null,
        toast ? h('div', { className: 't-toast', role: 'status' }, toast) : null);
    }

    // ----- Facilité perçue après chaque mission -----
    if (s.step === 'rate') {
      const rec = s.missions.find((y) => y.id === m.id) || {};
      const setRec = (patch) => update((x) => { x.missions = x.missions.map((y) => (y.id === m.id ? Object.assign({}, y, patch) : y)); return x; });
      const last = s.i === MISSIONS.length - 1;
      return h(Shell, null,
        h(Progress, { done: s.i + 1, total: MISSIONS.length }),
        h('div', { className: 't-eyebrow' }, 'Mission ' + (s.i + 1) + ' · ' + (rec.status === 'abandon' ? 'abandonnée' : 'terminée')),
        h('h1', { className: 't-h1' }, 'C’était facile ?'),
        h('div', { className: 't-scale7', role: 'radiogroup', 'aria-label': 'Facilité de la mission, de 1 à 7' },
          [1, 2, 3, 4, 5, 6, 7].map((v) => h('button', { key: v, role: 'radio', 'aria-checked': rec.seq === v ? 'true' : 'false', className: 't-dot' + (rec.seq === v ? ' is-on' : ''), onClick: () => setRec({ seq: v }) }, v))),
        h('div', { className: 't-scale-l' }, h('span', null, SEQ_LABELS[0]), h('span', null, SEQ_LABELS[6])),
        h('label', { className: 't-field' },
          h('span', { className: 't-legend' }, 'Un commentaire ? (facultatif)'),
          h('textarea', { value: rec.comment || '', placeholder: 'Ce qui t’a surpris, gêné, plu…', onChange: (e) => setRec({ comment: e.target.value }) })),
        h('div', { className: 't-actions' },
          h('button', { className: 't-btn', disabled: !rec.seq, onClick: () => update((x) => { if (last) { x.step = 'sus'; } else { x.i = x.i + 1; x.step = 'brief'; } return x; }) },
            !rec.seq ? 'Choisis une note de 1 à 7' : last ? 'Dernière étape : le questionnaire' : 'Mission suivante')));
    }

    // ----- Questionnaire SUS -----
    if (s.step === 'sus') {
      const done = s.sus.filter((x) => x >= 1).length;
      return h(Shell, { wide: true },
        h('div', { className: 't-eyebrow' }, 'Questionnaire · ' + done + ' sur 10'),
        h('h1', { className: 't-h1' }, 'Ton avis sur l’ensemble de l’appli'),
        h('p', { className: 't-help' }, 'Pour chaque phrase, indique ton accord de 1 (pas du tout d’accord) à 5 (tout à fait d’accord). Réponds spontanément.'),
        h('ol', { className: 't-sus' }, SUS.map((q, i) => h('li', { key: i },
          h('p', null, q),
          h('div', { className: 't-scale5', role: 'radiogroup', 'aria-label': 'Phrase ' + (i + 1) },
            [1, 2, 3, 4, 5].map((v) => h('button', { key: v, role: 'radio', 'aria-checked': s.sus[i] === v ? 'true' : 'false', className: 't-dot' + (s.sus[i] === v ? ' is-on' : ''), onClick: () => update((x) => { x.sus = x.sus.slice(); x.sus[i] = v; return x; }) }, v))),
          h('div', { className: 't-scale-l' }, h('span', null, 'Pas du tout d’accord'), h('span', null, 'Tout à fait d’accord'))))),
        h('div', { className: 't-actions' },
          h('button', { className: 't-btn', disabled: done < 10, onClick: () => update((x) => { x.step = 'final'; return x; }) }, done < 10 ? 'Encore ' + (10 - done) + ' réponse' + (10 - done > 1 ? 's' : '') : 'Continuer')));
    }

    // ----- Commentaires et envoi -----
    if (s.step === 'final') {
      const send = () => {
        const payload = buildPayload(s);
        if (!CONFIG.sheetUrl) {
          setSending('noconfig');
          return;
        }
        setSending('sending');
        fetch(CONFIG.sheetUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
          .then(() => { setSending(''); update((x) => { x.sent = true; x.step = 'done'; return x; }); })
          .catch(() => setSending('error'));
      };
      return h(Shell, null,
        h('div', { className: 't-eyebrow' }, 'Presque fini'),
        h('h1', { className: 't-h1' }, 'Deux dernières questions'),
        h('label', { className: 't-field' },
          h('span', { className: 't-legend' }, 'Ce que tu as le plus aimé (facultatif)'),
          h('textarea', { value: s.likes, onChange: (e) => { const v = e.target.value; update((x) => { x.likes = v; return x; }); } })),
        h('label', { className: 't-field' },
          h('span', { className: 't-legend' }, 'Ce qui t’a le plus gêné (facultatif)'),
          h('textarea', { value: s.dislikes, onChange: (e) => { const v = e.target.value; update((x) => { x.dislikes = v; return x; }); } })),
        sending === 'error' ? h('p', { className: 't-warn' }, 'L’envoi n’a pas fonctionné. Vérifie ta connexion internet, puis réessaie.') : null,
        sending === 'noconfig' ? h('p', { className: 't-warn' }, 'L’envoi des résultats n’est pas encore configuré (adresse du tableur manquante). Préviens la personne qui t’a envoyé le lien.') : null,
        h('div', { className: 't-actions' },
          h('button', { className: 't-btn', disabled: sending === 'sending', onClick: send }, sending === 'sending' ? 'Envoi en cours…' : 'Envoyer mes réponses')));
    }

    // ----- Fin -----
    return h(Shell, null,
      h(Logo),
      h('h1', { className: 't-h1' }, 'Merci, c’est envoyé !'),
      h('p', { className: 't-lead' }, 'Tes réponses vont nous aider à améliorer Cadence. Tu peux fermer cette page.'),
      h('div', { className: 't-actions' },
        h('button', { className: 't-btn is-ghost', onClick: () => { wipeApp(); const n = newSession(); save(n); setS(n); } }, 'Faire passer le test à quelqu’un d’autre')));
  }

  // ---------- Données envoyées au tableur ----------
  function buildPayload(s) {
    const total = s.missions.reduce((t, x) => t + (x.secs || 0), 0);
    return {
      id: s.id,
      code: s.code,
      date: new Date().toISOString(),
      startedAt: s.startedAt,
      age: s.profile.age,
      level: s.profile.level,
      apps: s.profile.apps,
      device: s.profile.device,
      browser: s.profile.browser,
      version: 'v1.2',
      totalMin: Math.round(total / 6) / 10,
      success: s.missions.filter((x) => x.status === 'reussie').length,
      missionCount: MISSIONS.length,
      sus: s.sus,
      susScore: susScore(s.sus),
      likes: s.likes,
      dislikes: s.dislikes,
      missions: MISSIONS.map((mm) => s.missions.find((x) => x.id === mm.id)).filter(Boolean)
    };
  }

  window.addEventListener('DOMContentLoaded', () => {
    const root = window.ReactDOM.createRoot(document.getElementById('app'));
    root.render(h(App));
  });
})();
