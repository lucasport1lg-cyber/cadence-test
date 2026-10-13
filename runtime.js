/*
 * Mini moteur qui affiche les écrans du prototype Cadence (fichiers .dc.html)
 * en dehors de Claude : gabarits {{ … }}, <sc-if>, <sc-for>, logique DCLogic,
 * liens entre écrans. S'appuie sur React 18 (dossier vendor/).
 */
(function () {
  'use strict';
  const R = window.React;
  const h = R.createElement;

  // ---------- Lecture des valeurs {{ … }} ----------
  const WHOLE = /^\s*\{\{\s*([^}]*?)\s*\}\}\s*$/;
  const PART = /\{\{\s*([^}]*?)\s*\}\}/g;

  function lookup(path, scope) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (path === 'undefined' || path === '') return undefined;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    const q = path.match(/^(['"])(.*)\1$/);
    if (q) return q[2];
    const parts = path.split('.');
    let v = scope;
    for (let i = 0; i < parts.length; i++) {
      if (v === null || v === undefined) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function resolve(str, scope) {
    if (str.indexOf('{{') < 0) return str;
    const m = str.match(WHOLE);
    if (m) return lookup(m[1], scope);
    return str.replace(PART, (_, p) => {
      const v = lookup(p, scope);
      return v === null || v === undefined ? '' : String(v);
    });
  }

  // ---------- Attributs HTML → props React ----------
  const RENAME = {
    class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly',
    maxlength: 'maxLength', minlength: 'minLength', autocomplete: 'autoComplete',
    autofocus: 'autoFocus', inputmode: 'inputMode', enterkeyhint: 'enterKeyHint',
    spellcheck: 'spellCheck', contenteditable: 'contentEditable', colspan: 'colSpan',
    rowspan: 'rowSpan', srcset: 'srcSet', novalidate: 'noValidate', datetime: 'dateTime',
    playsinline: 'playsInline', autoplay: 'autoPlay', crossorigin: 'crossOrigin',
    'xlink:href': 'xlinkHref', 'xml:space': 'xmlSpace', 'xmlns:xlink': 'xmlnsXlink'
  };
  const EVENTS = {};
  ['Click', 'Change', 'Input', 'KeyDown', 'KeyUp', 'KeyPress', 'Blur', 'Focus', 'Submit',
    'MouseDown', 'MouseUp', 'MouseEnter', 'MouseLeave', 'MouseMove', 'MouseOver', 'MouseOut',
    'PointerDown', 'PointerUp', 'PointerMove', 'PointerEnter', 'PointerLeave',
    'TouchStart', 'TouchEnd', 'TouchMove', 'Scroll', 'Wheel', 'DoubleClick', 'ContextMenu',
    'Load', 'Error', 'DragStart', 'DragEnd', 'DragOver', 'DragEnter', 'DragLeave', 'Drop',
    'AnimationEnd', 'TransitionEnd', 'Paste', 'Copy', 'Select'
  ].forEach((n) => { EVENTS['on' + n.toLowerCase()] = 'on' + n; });
  EVENTS.ondblclick = 'onDoubleClick';
  const BOOL = { disabled: 1, checked: 1, readOnly: 1, required: 1, autoFocus: 1, multiple: 1, hidden: 1, selected: 1, open: 1, noValidate: 1 };

  const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  function parseStyle(css) {
    const out = {};
    if (!css) return out;
    let depth = 0, quote = '', cur = '';
    const decls = [];
    for (let i = 0; i < css.length; i++) {
      const c = css[i];
      if (quote) { if (c === quote) quote = ''; cur += c; continue; }
      if (c === '"' || c === "'") { quote = c; cur += c; continue; }
      if (c === '(') depth++;
      if (c === ')') depth = Math.max(0, depth - 1);
      if (c === ';' && depth === 0) { decls.push(cur); cur = ''; continue; }
      cur += c;
    }
    decls.push(cur);
    decls.forEach((d) => {
      const i = d.indexOf(':');
      if (i < 0) return;
      let k = d.slice(0, i).trim();
      const v = d.slice(i + 1).trim();
      if (!k || !v) return;
      if (k.indexOf('--') !== 0) {
        k = k.toLowerCase();
        if (k.indexOf('-ms-') === 0) k = 'ms-' + k.slice(4);
        else if (k[0] === '-') k = k.slice(1).replace(/^([a-z])/, (c) => c.toUpperCase());
        k = camel(k);
      }
      out[k] = v;
    });
    return out;
  }

  // ---------- Rendu d'un gabarit ----------
  function isScreenLink(href) {
    return typeof href === 'string' && /\.dc\.html(\?|#|$)/.test(href);
  }
  function screenName(href) {
    return href.replace(/^\.?\//, '').replace(/[?#].*$/, '').split('/').pop();
  }

  function buildProps(el, scope, ctx, isRoot) {
    const props = {};
    let href;
    for (let i = 0; i < el.attributes.length; i++) {
      const a = el.attributes[i];
      const name = a.name;
      if (name.indexOf('hint-') === 0) continue;
      const literal = a.value.indexOf('{{') < 0;
      let val = resolve(a.value, scope);
      if (EVENTS[name]) {
        if (typeof val === 'function') props[EVENTS[name]] = val;
        continue;
      }
      if (name === 'style') {
        props.style = parseStyle(typeof val === 'string' ? val : '');
        continue;
      }
      let key = RENAME[name];
      if (!key) key = (name.indexOf('aria-') === 0 || name.indexOf('data-') === 0) ? name : (name.indexOf('-') > 0 ? camel(name) : name);
      if (BOOL[key]) {
        if (literal) val = true;
        else val = !!val && val !== 'false';
      }
      if (key === 'href') href = val;
      if (val === undefined || val === null) continue;
      props[key] = (typeof val === 'object' || typeof val === 'function') && key !== 'ref' ? val : (typeof val === 'boolean' && !BOOL[key] && key.indexOf('aria-') !== 0 ? String(val) : val);
    }

    // Liens entre écrans et liens externes
    if (el.localName === 'a' && typeof href === 'string') {
      const userClick = props.onClick;
      if (isScreenLink(href)) {
        const target = screenName(href);
        props.onClick = (e) => {
          if (userClick) userClick(e);
          e.preventDefault();
          ctx.navigate(target);
        };
      } else if (/^https?:/.test(href)) {
        props.target = '_blank';
        props.rel = 'noopener noreferrer';
      } else if (href === '' || href === '#') {
        props.onClick = (e) => { e.preventDefault(); if (userClick) userClick(e); };
      } else if (href[0] === '#') {
        props.onClick = (e) => {
          e.preventDefault();
          if (userClick) userClick(e);
          const t = document.getElementById(href.slice(1));
          if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
      }
    }

    // L'écran occupe toute la hauteur disponible du téléphone
    if (isRoot && props.style && ctx.frameH) {
      const z = parseFloat(props.style.zoom) || 1;
      props.style.height = (ctx.frameH / z).toFixed(2) + 'px';
      props.style.width = ((ctx.frameW || 390) / z).toFixed(2) + 'px';
    }
    return props;
  }

  function renderNodes(nodes, scope, ctx, rootFlag) {
    const out = [];
    let elIndex = 0;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.nodeType === 3) {
        const t = n.nodeValue;
        if (!t) continue;
        const v = resolve(t, scope);
        if (v === null || v === undefined || v === false) continue;
        out.push(typeof v === 'object' ? String(v) : v);
        continue;
      }
      if (n.nodeType !== 1) continue;
      const tag = n.localName;
      if (tag === 'sc-if') {
        const v = resolve(n.getAttribute('value') || '', scope);
        if (v && v !== 'false') out.push(h(R.Fragment, { key: 'if' + i }, renderNodes(n.childNodes, scope, ctx)));
        continue;
      }
      if (tag === 'sc-for') {
        const list = resolve(n.getAttribute('list') || '', scope);
        const as = n.getAttribute('as') || 'item';
        if (Array.isArray(list)) {
          const items = list.map((item, idx) => {
            const sub = Object.create(scope);
            sub[as] = item;
            sub.$index = idx;
            return h(R.Fragment, { key: idx }, renderNodes(n.childNodes, sub, ctx));
          });
          out.push(h(R.Fragment, { key: 'for' + i }, items));
        }
        continue;
      }
      if (tag === 'script' || tag === 'helmet' || tag === 'dc-import') continue;
      const isRoot = rootFlag && elIndex === 0;
      elIndex++;
      const props = buildProps(n, scope, ctx, isRoot);
      props.key = 'e' + i;
      const kids = (tag === 'textarea') ? [] : renderNodes(n.childNodes, scope, ctx);
      if (tag === 'textarea' && props.value === undefined) props.defaultValue = n.textContent;
      const voidTag = /^(input|img|br|hr|meta|link|source|area|col|wbr|track|embed)$/.test(tag);
      out.push(voidTag ? h(tag, props) : h(tag, props, kids.length ? kids : undefined));
    }
    return out;
  }

  // ---------- Classe de base des écrans ----------
  class DCLogic extends R.Component {
    constructor(props) {
      super(props);
      this.state = null;
    }
    renderVals() { return {}; }
    render() {
      const vals = this.renderVals() || {};
      const scope = Object.assign({}, vals);
      const ctx = this.props.__ctx;
      const nodes = renderNodes(ctx.tpl.childNodes, scope, ctx, true);
      return h(R.Fragment, null, nodes);
    }
  }

  // Filet de sécurité : un écran en erreur n'écrase pas tout le test
  class Guard extends R.Component {
    constructor(p) { super(p); this.state = { err: null }; }
    static getDerivedStateFromError(err) { return { err: err }; }
    componentDidCatch(err) { if (this.props.onError) this.props.onError(err); }
    render() {
      if (this.state.err) {
        return h('div', { style: { padding: '40px 24px', color: '#fff', background: '#0d0d0d', height: '100%', fontFamily: 'system-ui, sans-serif' } },
          h('p', { style: { fontSize: '16px', fontWeight: 600 } }, 'Cet écran a rencontré un problème.'),
          h('p', { style: { fontSize: '14px', opacity: 0.75, marginTop: '8px' } }, 'Utilise le bouton « Retour à l’accueil » ci-dessous.'),
          h('button', { onClick: () => { this.setState({ err: null }); this.props.onHome(); }, style: { marginTop: '16px', height: '44px', padding: '0 18px', borderRadius: '12px', border: 'none', background: '#4fbf86', color: '#0f1411', fontWeight: 600, fontSize: '15px' } }, 'Retour à l’accueil'));
      }
      return this.props.children;
    }
  }

  // ---------- Chargement des écrans ----------
  const cache = {};
  function loadScreen(name) {
    if (cache[name]) return cache[name];
    cache[name] = fetch('screens/' + name).then((r) => {
      if (!r.ok) throw new Error('missing ' + name);
      return r.text();
    }).then((src) => {
      const doc = new DOMParser().parseFromString(src, 'text/html');
      const xdc = doc.querySelector('x-dc');
      const css = Array.from(xdc.querySelectorAll('helmet style')).map((s) => s.textContent).join('\n');
      xdc.querySelectorAll('helmet').forEach((n) => n.remove());
      const code = doc.querySelector('script[data-dc-script]').textContent;
      // eslint-disable-next-line no-new-func
      const Comp = new Function('DCLogic', 'React', code + '\n;return Component;')(DCLogic, R);
      return { name: name, tpl: xdc, css: css, Comp: Comp };
    });
    cache[name].catch(() => { delete cache[name]; });
    return cache[name];
  }

  // Identité affichée : celle saisie au premier lancement, sinon le joueur de démonstration
  window.cadenceMe = function () {
    let p = {}, idx = null;
    try { p = JSON.parse(window.localStorage.getItem('cadence.profile') || '{}') || {}; } catch (e) {}
    try { idx = window.localStorage.getItem('cadence.index'); } catch (e) {}
    const first = String(p.first || '').trim();
    const last = String(p.last || '').trim();
    const own = !!first || idx !== null;
    const raw = idx === null ? '' : String(idx).trim().replace(',', '.');
    return {
      own: own,
      ini: first ? (first[0] + (last[0] || '')).toUpperCase() : (own ? '?' : 'LG'),
      idx: idx === null ? '14.2' : (raw || '—'),
      trend: idx === null ? '▼ 4.2 sur 10 semaines' : (raw ? 'Ton index de départ' : 'Pas encore d’index : joue ta première partie'),
      trendColor: idx === null ? 'var(--status-good)' : 'var(--text-3)',
      demoTrend: idx === null
    };
  };

  window.CadenceRuntime = { DCLogic: DCLogic, Guard: Guard, loadScreen: loadScreen, h: h };
})();
