/* ==========================================================================
   FERRO & SAL — interações compartilhadas por todas as páginas
   JavaScript puro, sem bibliotecas. Cada bloco só roda se a página tiver
   os elementos dele, então o mesmo arquivo serve o site inteiro.
   ========================================================================== */
(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const root = document.documentElement;
  const mqMotion = matchMedia('(prefers-reduced-motion: no-preference)');
  const motion = () => mqMotion.matches;
  const temSDA = CSS.supports('(animation-timeline: view()) and (animation-range: entry)');
  const desktopFino = matchMedia('(hover: hover) and (pointer: fine)');

  root.classList.add('js');
  if (!temSDA) root.classList.add('sem-sda');

  // Funções chamadas no único listener de rolagem (registradas pelos blocos)
  const aoRolar = [];

  /* ------------------------------------------------------------------------
     TEMA (prancha dia/noite) — guardado só como conveniência local
     ------------------------------------------------------------------------ */
  const temaBtn = $('#tema-btn');
  if (temaBtn) {
    const escuroAtual = () => {
      const t = root.dataset.theme;
      return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    };
    const pintar = () => {
      const escuro = escuroAtual();
      temaBtn.textContent = escuro ? 'Noite' : 'Dia';
      temaBtn.setAttribute('aria-pressed', String(escuro));
      temaBtn.setAttribute('aria-label', escuro ? 'Prancha noite (modo escuro). Trocar para dia' : 'Prancha dia (modo claro). Trocar para noite');
    };
    pintar();
    temaBtn.addEventListener('click', () => {
      const novo = escuroAtual() ? 'light' : 'dark';
      root.dataset.theme = novo;
      try { localStorage.setItem('fs-tema', novo); } catch {}
      pintar();
    });
  }

  /* ------------------------------------------------------------------------
     COTAS — gera o SVG (linha, setas, linhas de chamada) a partir de [data-cota]
     ------------------------------------------------------------------------ */
  const NS = 'http://www.w3.org/2000/svg';
  $$('[data-cota]').forEach((el) => {
    const vertical = el.classList.contains('cota--v');
    // Linha principal com percentuais; setas em <svg> aninhados para não distorcer
    const svg = vertical
      ? `<svg xmlns="${NS}" aria-hidden="true">
           <line class="cota-traco" x1="12" y1="1" x2="12" y2="100%"/>
           <path class="cota-ponta" d="M2 1H22M8 8 12 1 16 8"/>
           <svg y="100%" overflow="visible"><path class="cota-ponta" d="M2 -1H22M8 -8 12 -1 16 -8"/></svg>
         </svg>`
      : `<svg xmlns="${NS}" aria-hidden="true">
           <line class="cota-traco" x1="1" y1="12" x2="100%" y2="12"/>
           <path class="cota-ponta" d="M1 2V22M8 8 1 12 8 16"/>
           <svg x="100%" overflow="visible"><path class="cota-ponta" d="M-1 2V22M-8 8 -1 12 -8 16"/></svg>
         </svg>`;
    el.innerHTML = svg + `<span class="cota-medida">${el.dataset.cota}</span>`;
  });

  /* ------------------------------------------------------------------------
     CABEÇALHO — relógio de Natal, clima, some ao descer e volta ao subir
     ------------------------------------------------------------------------ */
  const hora = $('#hora');
  if (hora) {
    const fmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit' });
    const tic = () => { hora.textContent = fmt.format(new Date()); hora.dateTime = new Date().toISOString(); };
    tic();
    setInterval(tic, 15000);

    // Temperatura atual (Open-Meteo, sem chave). Guardada por 30 min; se falhar, fica 27°C.
    (async () => {
      const clima = $('#clima');
      try {
        const salvo = JSON.parse(sessionStorage.getItem('fs-clima') || 'null');
        if (salvo && Date.now() - salvo.t < 30 * 60e3) { clima.textContent = `${salvo.c}°C`; return; }
      } catch {}
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-5.79&longitude=-35.21&current=temperature_2m', { signal: ctrl.signal });
        clearTimeout(t);
        const c = Math.round((await r.json())?.current?.temperature_2m);
        if (Number.isFinite(c)) {
          clima.textContent = `${c}°C`;
          try { sessionStorage.setItem('fs-clima', JSON.stringify({ c, t: Date.now() })); } catch {}
        }
      } catch { /* fica o valor padrão */ }
    })();
  }

  const topo = $('#topo');
  let ultimoY = scrollY;
  aoRolar.push(() => {
    const y = scrollY;
    const desceu = y > ultimoY + 4;
    const subiu = y < ultimoY - 4;
    if (y < 120 || subiu) topo.classList.remove('is-oculto');
    else if (desceu) topo.classList.add('is-oculto');
    if (desceu || subiu) ultimoY = y;
  });

  // Nome da seção visível ao lado do número da folha
  const flNome = $('#fl-nome');
  const secoes = $$('[data-secao]');
  if (flNome && secoes.length) {
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        const nome = e.target.dataset.secao;
        if (flNome.textContent === nome) return;
        flNome.textContent = nome;
        if (motion()) { flNome.classList.remove('is-troca'); void flNome.offsetWidth; flNome.classList.add('is-troca'); }
      });
    }, { rootMargin: '-45% 0px -54% 0px' });
    secoes.forEach((s) => io.observe(s));
  }

  // Menu mobile em tela cheia
  const menu = $('#menu');
  if (menu) {
    $('#menu-abrir').addEventListener('click', () => menu.showModal());
    $('#menu-fechar').addEventListener('click', () => menu.close());
    $$('a', menu).forEach((a) => a.addEventListener('click', () => menu.close()));
    matchMedia('(min-width: 64rem)').addEventListener('change', (e) => { if (e.matches && menu.open) menu.close(); });
  }

  /* ------------------------------------------------------------------------
     REVELAÇÃO AO ROLAR + desenho das cotas + contadores (uma vez só)
     ------------------------------------------------------------------------ */
  const contar = (el) => {
    const alvo = +el.dataset.conta;
    if (!motion()) { el.textContent = alvo; return; }
    const t0 = performance.now();
    const passo = (t) => {
      const p = clamp((t - t0) / 600, 0, 1);
      el.textContent = Math.round(alvo * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  };
  const ioRevela = new IntersectionObserver((entradas, obs) => {
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      if (el.classList.contains('cota')) el.classList.add('is-desenhada');
      else if (el.hasAttribute('data-conta')) contar(el);
      else el.classList.add('is-in');
      obs.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
  $$('.rv').forEach((el) => ioRevela.observe(el));
  $$('.cota:not(.hero-cota-v):not(.hero-cota-h)').forEach((el) => ioRevela.observe(el));
  if (motion()) $$('[data-conta]').forEach((el) => { el.textContent = '0'; });
  $$('[data-conta]').forEach((el) => ioRevela.observe(el));

  /* ------------------------------------------------------------------------
     FL. 01 — HERO: título por máscara, depois a cota se desenha
     ------------------------------------------------------------------------ */
  const hero = $('.hero');
  if (hero) {
    const iniciar = () => {
      hero.classList.add('is-pronto');
      setTimeout(() => $$('.hero .cota').forEach((c) => c.classList.add('is-desenhada')), motion() ? 450 : 0);
    };
    Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 700))])
      .then(() => requestAnimationFrame(iniciar));
  }

  /* ------------------------------------------------------------------------
     MANIFESTO — palavras de --sal para --tinta conforme a rolagem
     ------------------------------------------------------------------------ */
  const manifesto = $('[data-palavras]');
  if (manifesto) {
    const quebrar = (no) => {
      [...no.childNodes].forEach((filho) => {
        if (filho.nodeType === 3) {
          const frag = document.createDocumentFragment();
          filho.textContent.split(/(\s+)/).forEach((pedaco) => {
            if (!pedaco) return;
            if (/^\s+$/.test(pedaco)) { frag.append(pedaco); return; }
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = pedaco;
            frag.append(s);
          });
          no.replaceChild(frag, filho);
        } else if (filho.nodeType === 1) {
          quebrar(filho);
        }
      });
    };
    quebrar(manifesto);
    const palavras = $$('.w', manifesto);
    palavras.forEach((w, i) => {
      const a = 10 + (i / palavras.length) * 36;
      w.style.setProperty('--a', a.toFixed(2) + '%');
      w.style.setProperty('--b', (a + 5).toFixed(2) + '%');
      w.dataset.a = a / 100;
    });
    // Fallback por JS para navegadores sem scroll-driven animations
    const atualizar = () => {
      if (temSDA || !motion()) return;
      const r = manifesto.getBoundingClientRect();
      const p = (innerHeight - r.top) / (innerHeight + r.height); // equivalente ao range "cover"
      palavras.forEach((w) => w.classList.toggle('is-on', p > +w.dataset.a + .025));
    };
    aoRolar.push(atualizar);
    atualizar();
  }

  /* ------------------------------------------------------------------------
     LISTA DE SERVIÇOS — imagem que segue o cursor (desktop apenas)
     ------------------------------------------------------------------------ */
  const segue = $('#segue');
  if (segue) {
    const img = $('img', segue);
    let sx = 0, sy = 0, tx = 0, ty = 0, raf = 0;
    const animar = () => {
      sx += (tx - sx) * .2;
      sy += (ty - sy) * .2;
      segue.style.transform = `translate3d(${sx + 24}px, ${sy - 90}px, 0)`;
      raf = Math.abs(tx - sx) + Math.abs(ty - sy) > .5 ? requestAnimationFrame(animar) : 0;
    };
    $$('[data-foto]').forEach((linha) => {
      linha.addEventListener('pointerenter', (e) => {
        if (!desktopFino.matches || !motion() || e.pointerType !== 'mouse') return;
        img.src = linha.dataset.foto;
        sx = tx = e.clientX; sy = ty = e.clientY;
        segue.style.transform = `translate3d(${sx + 24}px, ${sy - 90}px, 0)`;
        segue.classList.add('is-visivel');
      });
      linha.addEventListener('pointermove', (e) => {
        if (!segue.classList.contains('is-visivel')) return;
        tx = e.clientX; ty = e.clientY;
        if (!raf) raf = requestAnimationFrame(animar);
      });
      linha.addEventListener('pointerleave', () => segue.classList.remove('is-visivel'));
    });
  }

  /* ------------------------------------------------------------------------
     ANTES / DEPOIS — ponteiro + teclado
     ------------------------------------------------------------------------ */
  $$('.ba').forEach((ba) => {
    const alca = $('.ba-alca', ba);
    let arrastando = false;
    const definir = (v) => {
      v = clamp(v, 0, 100);
      ba.style.setProperty('--pos', v + '%');
      const n = Math.round(v);
      alca.setAttribute('aria-valuenow', n);
      alca.setAttribute('aria-valuetext', `${n}% antes, ${100 - n}% depois`);
    };
    const pelaPosicao = (e) => {
      const r = ba.getBoundingClientRect();
      definir(((e.clientX - r.left) / r.width) * 100);
    };
    ba.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      arrastando = true;
      ba.setPointerCapture(e.pointerId);
      ba.classList.add('is-arrastando');
      // no toque, só move quando o dedo andar de lado (para não atrapalhar a rolagem)
      if (e.pointerType !== 'touch') { pelaPosicao(e); e.preventDefault(); }
    });
    ba.addEventListener('pointermove', (e) => { if (arrastando) pelaPosicao(e); });
    const soltar = () => { arrastando = false; ba.classList.remove('is-arrastando'); };
    ba.addEventListener('pointerup', soltar);
    ba.addEventListener('pointercancel', soltar);
    alca.addEventListener('keydown', (e) => {
      const atual = +alca.getAttribute('aria-valuenow');
      const passos = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -20, PageUp: 20 };
      if (e.key in passos) definir(atual + passos[e.key]);
      else if (e.key === 'Home') definir(0);
      else if (e.key === 'End') definir(100);
      else return;
      e.preventDefault();
    });
  });

  /* ------------------------------------------------------------------------
     FL. 04 — OBRAS: filtro por tipo
     ------------------------------------------------------------------------ */
  const filtro = $('#filtro');
  if (filtro) {
    const grade = $('#obras');
    const cards = $$('.obra', grade);
    const status = $('#filtro-status');
    const aplicar = (tipo) => {
      let n = 0;
      cards.forEach((c) => {
        const mostra = tipo === 'todas' || c.dataset.tipos.split(' ').includes(tipo);
        c.hidden = !mostra;
        if (mostra) n++;
      });
      grade.classList.toggle('is-filtrado', tipo !== 'todas');
      $$('button', filtro).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tipo === tipo)));
      status.textContent = `${n} de ${cards.length} obras`;
    };
    filtro.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-tipo]');
      if (!b) return;
      aplicar(b.dataset.tipo);
      history.replaceState(null, '', b.dataset.tipo === 'todas' ? location.pathname : `?tipo=${b.dataset.tipo}`);
    });
    const inicial = new URLSearchParams(location.search).get('tipo');
    if (inicial && $(`button[data-tipo="${inicial}"]`, filtro)) aplicar(inicial);
  }

  /* ------------------------------------------------------------------------
     FL. 04.x — GALERIA DA OBRA: lightbox com setas e teclado
     ------------------------------------------------------------------------ */
  const lightbox = $('#lightbox');
  if (lightbox) {
    const itens = $$('[data-ampliar]');
    const img = $('#lb-img');
    const leg = $('#lb-legenda');
    const cont = $('#lb-contador');
    let i = 0, gatilho = null;
    const mostrar = (k) => {
      i = (k + itens.length) % itens.length;
      const b = itens[i];
      img.src = b.dataset.ampliar;
      img.alt = $('img', b).alt;
      leg.textContent = b.dataset.legenda || '';
      cont.textContent = `${String(i + 1).padStart(2, '0')} / ${String(itens.length).padStart(2, '0')}`;
    };
    itens.forEach((b, k) => b.addEventListener('click', () => { gatilho = b; mostrar(k); lightbox.showModal(); }));
    $('#lb-ant').addEventListener('click', () => mostrar(i - 1));
    $('#lb-prox').addEventListener('click', () => mostrar(i + 1));
    $('#lb-fechar').addEventListener('click', () => lightbox.close());
    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') mostrar(i - 1);
      if (e.key === 'ArrowRight') mostrar(i + 1);
    });
    lightbox.addEventListener('close', () => gatilho?.focus());
  }

  /* ------------------------------------------------------------------------
     FL. 05 — PROCESSO: linha do tempo horizontal fixada
     ------------------------------------------------------------------------ */
  const proc = $('#processo');
  if (proc) {
    const trilhoScroll = $('#trilho-scroll');
    const trilho = $('#trilho');
    const etapas = $$('.etapa', trilho);
    const reguaAtual = $('#regua-atual');
    const reguaBarra = $('#regua-barra');
    const mqLargo = matchMedia('(min-width: 64rem)');
    let distancia = 0, fixado = false;

    const atualizar = () => {
      if (!fixado) return;
      const r = trilhoScroll.getBoundingClientRect();
      const total = r.height - innerHeight;
      const p = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
      trilho.style.transform = `translate3d(${(-p * distancia).toFixed(1)}px, 0, 0)`;
      reguaBarra.style.setProperty('--p', p.toFixed(4));
      const k = Math.min(etapas.length - 1, Math.floor(p * etapas.length * .999 + .15));
      etapas.forEach((el, j) => { el.classList.toggle('is-atual', j === k); el.classList.toggle('is-feita', j < k); });
      reguaAtual.textContent = `Etapa ${String(k + 1).padStart(2, '0')}/06`;
    };
    const medir = () => {
      fixado = mqLargo.matches && motion();
      proc.classList.toggle('is-fixado', fixado);
      if (!fixado) { trilhoScroll.style.height = ''; trilho.style.transform = ''; return; }
      distancia = Math.max(0, trilho.scrollWidth - innerWidth);
      trilhoScroll.style.height = `${distancia + innerHeight}px`;
      atualizar();
    };
    medir();
    mqLargo.addEventListener('change', medir);
    mqMotion.addEventListener('change', medir);
    let t;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(medir, 120); });
    addEventListener('load', medir);
    document.fonts?.ready.then(medir);
    aoRolar.push(atualizar);
  }

  /* ------------------------------------------------------------------------
     FL. 06 — ESTIMATIVA RÁPIDA
     ------------------------------------------------------------------------ */
  const calc = $('#calc');
  if (calc) {
    const areaIn = $('#calc-area');
    const reais = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
    const faixa = (v) => {
      if (v >= 1e6) {
        const m = v / 1e6;
        return 'R$ ' + m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (m >= 2 ? ' milhões' : ' milhão');
      }
      return 'R$ ' + Math.round(v / 1000).toLocaleString('pt-BR') + ' mil';
    };
    let estimativa = {};
    const calcular = () => {
      const f = new FormData(calc);
      const tipo = f.get('tipo');
      const area = +f.get('area');
      const padraoEl = $('input[name="padrao"]:checked', calc);
      const preco = +padraoEl.value;
      const moveis = f.has('moveis'), retrofit = f.has('retrofit');
      const base = area * preco;
      const total = base * (1 + (moveis ? .18 : 0) + (retrofit ? .12 : 0));
      const lo = total * .93, hi = total * 1.07;

      // prazo: cresce com a área, ajustado pelo padrão e extras; comercial concentra equipe
      let meses = (1.5 + area / 30) * +padraoEl.dataset.prazo + (retrofit ? 1 : 0) + (moveis ? .5 : 0);
      if (tipo === 'comercial') meses *= .6;
      const mLo = Math.max(1, Math.round(meses * .9));
      const mHi = Math.max(mLo + 1, Math.round(meses * 1.15));

      areaIn.style.setProperty('--fill', ((area - 20) / 380) * 100 + '%');
      areaIn.setAttribute('aria-valuetext', `${area} metros quadrados`);
      $('#calc-area-saida').textContent = `${area} m²`;
      $('#res-resumo').textContent = `${area} m² · ${padraoEl.dataset.nome}`;
      $('#res-valor').innerHTML = `${faixa(lo)} <span class="a">a</span> ${faixa(hi)}`;
      $('#res-prazo').innerHTML = `Prazo estimado: <strong>${mLo} a ${mHi} meses</strong> de obra${tipo === 'comercial' ? ', noturna se o negócio não puder fechar' : ''}.`;
      const linhas = [`${area} m² × ${reais(preco)} = ${reais(base)}`];
      if (moveis) linhas.push('+ 18% móveis planejados');
      if (retrofit) linhas.push('+ 12% retrofit climático');
      linhas.push(`Faixa de ±7% sobre ${reais(total)}`);
      $('#res-conta').innerHTML = linhas.join('<br>');
      estimativa = { tipo, area, padrao: padraoEl.dataset.nome, moveis, retrofit, faixa: `${faixa(lo)} a ${faixa(hi)}`, prazo: `${mLo} a ${mHi} meses` };
    };
    calc.addEventListener('input', calcular);
    calc.addEventListener('change', calcular);
    calc.addEventListener('submit', (e) => e.preventDefault());
    calcular();

    // "Enviar essa estimativa e marcar visita" → abre o contato com o formulário preenchido
    $('#calc-enviar').addEventListener('click', () => {
      const e = estimativa;
      const extras = [e.moveis && 'com móveis planejados', e.retrofit && 'com retrofit climático'].filter(Boolean).join(' e ');
      const q = new URLSearchParams({
        tipo: e.tipo === 'comercial' ? 'comercial' : (e.retrofit ? 'retrofit' : 'residencial'),
        area: e.area,
        msg: `Fiz a estimativa no site: obra ${e.tipo}, ${e.area} m², padrão ${e.padrao}${extras ? ', ' + extras : ''}. Deu ${e.faixa}, ${e.prazo} de obra. Quero marcar uma visita.`,
        origem: 'estimativa',
      });
      location.href = `${calc.dataset.contato}?${q}#formulario`;
    });
  }

  /* ------------------------------------------------------------------------
     DEPOIMENTOS — carrossel, um por vez, sem autoplay
     ------------------------------------------------------------------------ */
  const carrossel = $('#carrossel');
  if (carrossel) {
    const deps = $$('.dep', carrossel);
    const contador = $('#dep-contador');
    let atual = 0;
    const irPara = (i) => {
      atual = (i + deps.length) % deps.length;
      deps.forEach((d, k) => {
        const ativo = k === atual;
        d.classList.toggle('is-ativo', ativo);
        d.inert = !ativo;
        d.setAttribute('aria-hidden', String(!ativo));
      });
      contador.innerHTML = `<b>${String(atual + 1).padStart(2, '0')}</b> / ${String(deps.length).padStart(2, '0')}`;
    };
    $('#dep-ant').addEventListener('click', () => irPara(atual - 1));
    $('#dep-prox').addEventListener('click', () => irPara(atual + 1));
    carrossel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { irPara(atual - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { irPara(atual + 1); e.preventDefault(); }
    });
    irPara(0);
  }

  /* ------------------------------------------------------------------------
     FL. 08 — FORMULÁRIO: validação em tempo real, mensagens humanas
     (o erro só aparece depois que a pessoa mexeu e saiu do campo, como :user-invalid)
     ------------------------------------------------------------------------ */
  const form = $('#form');
  if (form) {
    const digitos = (v) => v.replace(/\D/g, '');
    const REGRAS = {
      nome: (v) => !v.trim() ? 'Como a gente te chama? Só o primeiro nome já serve.'
        : v.trim().length < 2 ? 'Precisa de pelo menos duas letras.' : '',
      whatsapp: (v) => {
        const d = digitos(v);
        if (!d) return 'Faltou o WhatsApp, a gente responde por lá.';
        if (d.length < 10 || d.length > 11) return 'Esse número parece incompleto. Coloca o DDD também, tipo (84) 99188-0412.';
        return '';
      },
      local: (v) => !v.trim() ? 'Em que bairro ou cidade fica a obra? Atendemos até 120 km de Natal.' : '',
      tipo: (v) => !v ? 'Escolhe o tipo mais próximo. Dá para ajustar na conversa.' : '',
      area: (v) => {
        if (!v) return '';
        const n = +v;
        return (!Number.isFinite(n) || n < 5 || n > 5000) ? 'Entre 5 e 5.000 m². Pode ser chute, a gente mede depois.' : '';
      },
    };
    const tocados = new WeakSet();
    const validarCampo = (el, forcar = false) => {
      const regra = REGRAS[el.name];
      if (!regra) return true;
      if (forcar) tocados.add(el);
      const msg = regra(el.value);
      const campo = el.closest('.campo');
      if (!tocados.has(el)) return !msg;
      $('.campo-erro', campo).textContent = msg;
      campo.classList.toggle('is-erro', !!msg);
      campo.classList.toggle('is-ok', !msg && !!el.value.trim());
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      return !msg;
    };
    const mascaraWhats = (v) => {
      const d = digitos(v).slice(0, 11);
      if (d.length < 10) return v;
      return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    };
    form.addEventListener('focusout', (e) => {
      const el = e.target;
      if (!el.name || !REGRAS[el.name]) return;
      if (el.name === 'whatsapp') el.value = mascaraWhats(el.value);
      if (el.value || tocados.has(el)) validarCampo(el, true);
    });
    form.addEventListener('input', (e) => { if (tocados.has(e.target)) validarCampo(e.target); });
    form.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT') validarCampo(e.target, true); });

    // Pré-preenchimento vindo da estimativa (FL. 06) ou de uma página de serviço
    const q = new URLSearchParams(location.search);
    const tipoSel = $('#f-tipo');
    if (q.get('tipo') && $(`option[value="${CSS.escape(q.get('tipo'))}"]`, tipoSel)) { tipoSel.value = q.get('tipo'); validarCampo(tipoSel, true); }
    if (q.get('area')) { $('#f-area').value = q.get('area'); validarCampo($('#f-area'), true); }
    if (q.get('msg')) $('#f-msg').value = q.get('msg');
    if (q.get('origem') === 'estimativa') $('#form-origem').hidden = false;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const campos = $$('input[name], select[name]', form).filter((el) => REGRAS[el.name]);
      const invalidos = campos.filter((el) => !validarCampo(el, true));
      const status = $('#form-status');
      if (invalidos.length) {
        status.textContent = invalidos.length === 1
          ? 'Falta só um campo. Já deixamos o cursor nele.'
          : `Faltam ${invalidos.length} campos. O primeiro já está selecionado.`;
        invalidos[0].focus();
        return;
      }
      status.textContent = '';
      // enviar: aqui entraria o fetch para o serviço de formulários (Formspree, endpoint próprio etc.)
      form.hidden = true;
      const ok = $('#sucesso');
      ok.hidden = false;
      ok.focus();
    });
  }

  /* ------------------------------------------------------------------------
     Um único listener de rolagem, sincronizado com o quadro
     ------------------------------------------------------------------------ */
  let pendente = false;
  addEventListener('scroll', () => {
    if (pendente) return;
    pendente = true;
    requestAnimationFrame(() => {
      aoRolar.forEach((f) => f());
      pendente = false;
    });
  }, { passive: true });

  /* ------------------------------------------------------------------------
     CURSOR PERSONALIZADO — 8px; vira "arraste" sobre os sliders (desktop)
     ------------------------------------------------------------------------ */
  if (desktopFino.matches && motion()) {
    const cursor = document.createElement('div');
    cursor.className = 'cursor is-oculto';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<div class="cursor-disco"><span>arraste</span></div>';
    document.body.append(cursor);
    root.classList.add('tem-cursor');
    let cx = 0, cy = 0, agendado = false;
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      cx = e.clientX; cy = e.clientY;
      cursor.classList.remove('is-oculto');
      if (!agendado) {
        agendado = true;
        requestAnimationFrame(() => { cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`; agendado = false; });
      }
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      const arraste = !!t.closest('.ba');
      cursor.classList.toggle('is-arraste', arraste);
      cursor.classList.toggle('is-link', !arraste && !!t.closest('a, button, summary, label, [role="slider"], input[type="range"]'));
      cursor.classList.toggle('is-oculto', !!t.closest('input:not([type="range"]):not([type="radio"]):not([type="checkbox"]), textarea, select, dialog.lightbox'));
    });
    root.addEventListener('pointerleave', () => cursor.classList.add('is-oculto'));
  }
})();
