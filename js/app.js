/*
 * Grupo As Vilas — Apresentação interativa
 * ------------------------------------------------------------
 * Todo o estado vive em memória nesta aba (objeto `estado`).
 * Não há envio para servidor, cookies, localStorage nem APIs.
 * Recarregar a página apaga as respostas simuladas.
 */
(function () {
  'use strict';

  const CFG = window.AS_VILAS_CONFIG || {};
  const FESTA = CFG.festa || {};
  const REGRAS_PADRAO = {
    isencao: (CFG.regras && CFG.regras.isencaoAbaixoDe) || 6,
    lembrancinha: (CFG.regras && CFG.regras.lembrancinhaAbaixoDe) || 10
  };
  const LIMITE_CONVIDADOS = CFG.limiteConvidadosPorResposta || 12;
  const ATALHOS = { demo: 'convite', demonstracao: 'convite', rsvp: 'confirmacao', equipe: 'painel' };

  const estado = {
    atual: -1,
    visitadas: new Set(),
    respostas: [],
    regras: { ...REGRAS_PADRAO },
    filtro: 'todos',
    secao: 'lista',
    seq: 0,
    exemplosCarregados: false,
    exemploForm: 0,
    ultimaId: null // última resposta enviada pelo visitante (destacada no painel)
  };

  /* ---------- Utilitários ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const limparNome = (s) => s.replace(/\s+/g, ' ').trim();
  const normalizar = (s) => limparNome(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const primeiroNome = (s) => limparNome(s).split(' ')[0];
  const hora = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const ic = (id) => `<svg class="ic" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const obter = (caminho) => caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), CFG);
  const idadeTexto = (n) => (n === 0 ? 'menos de 1 ano' : plural(n, 'ano', 'anos'));

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    t.style.animation = 'none';
    void t.offsetWidth;
    t.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3400);
  }

  function anunciar(msg) {
    const a = $('#anuncio');
    a.textContent = '';
    setTimeout(() => { a.textContent = msg; }, 40);
  }

  /* ---------- Datas da festa ---------- */
  function dataFesta() {
    const v = FESTA.data && FESTA.data.valor;
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    const [a, m, d] = v.split('-').map(Number);
    return new Date(a, m - 1, d);
  }
  function dataLonga() {
    const d = dataFesta();
    if (!d) return 'Data a definir';
    const s = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function dataCurta() {
    const d = dataFesta();
    return d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
  }
  function horaTexto(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':');
    return `${Number(h)}h${m && m !== '00' ? m : ''}`;
  }
  // Partes do "ingresso": número grande + complemento.
  function partesData() {
    const d = dataFesta();
    if (!d) return { grande: 'A definir', sub: '' };
    const mes = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const semana = d.toLocaleDateString('pt-BR', { weekday: 'long' });
    return { grande: `${d.getDate()} ${mes}`, sub: `${semana.charAt(0).toUpperCase() + semana.slice(1)} · ${d.getFullYear()}` };
  }
  function partesHorario(h) {
    if (!h || !h.inicio) return { grande: 'A definir', sub: '' };
    return { grande: horaTexto(h.inicio), sub: h.fim ? `até ${horaTexto(h.fim)}` : 'início' };
  }

  /* =========================================================
     Configuração → tela
     ========================================================= */
  function aplicarConfig() {
    $$('[data-cfg]').forEach((el) => {
      const v = obter(el.dataset.cfg);
      if (v != null && v !== '') el.textContent = v;
    });
    $$('[data-cfg-src]').forEach((el) => {
      const v = obter(el.dataset.cfgSrc);
      if (v) el.setAttribute('src', v);
    });

    const local = FESTA.local || {};
    const pd = partesData();
    const ph = partesHorario(FESTA.horario);
    $('#cv-dia').textContent = pd.grande;
    $('#cv-data').textContent = pd.sub;
    $('#cv-hora').textContent = ph.grande;
    $('#cv-horario').textContent = ph.sub;
    $('.ingresso').setAttribute('aria-label', `Data e horário: ${dataLonga()}, ${ph.grande} ${ph.sub}`);
    $('#cv-local-nome').textContent = local.nome || 'Local a definir';
    $('#cv-endereco').textContent = local.endereco || '';
    $('#ex-quando').hidden = !((FESTA.data && FESTA.data.exemplo) || (FESTA.horario && FESTA.horario.exemplo));
    $('#ex-local').hidden = !local.exemplo;
    $('#rsvp-data').textContent = dataLonga();
    $('#convite-sub').textContent = FESTA.idadeCompleta
      ? `vai completar ${FESTA.idadeCompleta} anos!`
      : 'vai celebrar o aniversário!';

    // Foto real (se configurada). Se o arquivo não carregar, mantém o espaço reservado.
    if (FESTA.foto) {
      const img = new Image();
      img.alt = `Foto de ${FESTA.aniversariante || 'aniversariante'}`;
      img.onload = () => $('#convite-foto').replaceChildren(img);
      img.src = FESTA.foto;
    }

    // Mapa: link universal do Google Maps (abre o app no celular).
    const mapa = $('#btn-mapa');
    mapa.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(local.endereco || '');
    mapa.addEventListener('click', (e) => {
      if (local.exemplo || !local.endereco) {
        e.preventDefault();
        toast('Endereço de exemplo. Com o endereço real, este botão abre o local no aplicativo de mapas.');
      }
    });

    // Convite em vídeo (complementar).
    $('#btn-video').addEventListener('click', () => {
      const url = FESTA.videoConvite;
      if (url && /^https:\/\//i.test(url)) window.open(url, '_blank', 'noopener');
      else toast('Aqui ficaria o convite em vídeo produzido pelo Grupo As Vilas.');
    });

    // Marcas (componentes provisórios, substituíveis por logotipos oficiais).
    const marcas = (CFG.grupo && CFG.grupo.marcas) || [];
    $('#marcas-abertura').innerHTML = marcas.map((m) => `
      <li class="marca marca-${esc(m.id)}">
        ${m.logo
          ? `<img src="${esc(m.logo)}" alt="${esc(m.nome)} ${esc(m.complemento || '')}">`
          : `<b>${esc(m.nome)}</b><small>${esc(m.complemento || '')}</small>`}
      </li>`).join('');
    $('#convite-marcas').textContent = marcas.map((m) => m.nome).join(' · ');

    // Chamada do rodapé: só vira link quando houver endereço oficial validado.
    const site = CFG.grupo && CFG.grupo.siteOficial;
    if (site && /^https:\/\//i.test(site)) {
      const p = $('#cv-chamada-site');
      const a = document.createElement('a');
      a.href = site;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = p.textContent;
      p.replaceChildren(a);
    }
  }

  /* =========================================================
     Navegação
     ========================================================= */
  const telas = $$('.tela');

  function montarProgresso() {
    const ol = $('#progresso-lista');
    ol.innerHTML = telas.map((t, i) => `
      <li><button type="button" data-idx="${i}" aria-label="Tela ${i + 1}: ${esc(t.dataset.titulo)}">
        <span class="num">${i + 1}</span><span class="rotulo">${esc(t.dataset.titulo)}</span>
      </button></li>`).join('');
    ol.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-idx]');
      if (b) irPara(Number(b.dataset.idx), { focar: true });
    });
    telas.forEach((t) => $$('.revela', t).forEach((el, i) => el.style.setProperty('--i', i)));
  }

  function atualizarNavegacao() {
    $$('#progresso-lista button').forEach((b, i) => {
      if (i === estado.atual) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
      b.classList.toggle('visitada', estado.visitadas.has(i));
    });
    const t = telas[estado.atual];
    $('#nav-contador').textContent = `${estado.atual + 1} de ${telas.length}`;
    $('#nav-titulo').textContent = t.dataset.titulo;
    const progresso = `${((estado.atual + 1) / telas.length) * 100}%`;
    $('#nav-barra-fill').style.width = progresso;
    $('.navegacao').style.setProperty('--progresso', progresso);

    const ant = $('#btn-anterior');
    const prox = $('#btn-proximo');
    ant.disabled = estado.atual === 0;
    prox.disabled = estado.atual === telas.length - 1;
    ant.setAttribute('aria-label', ant.disabled ? 'Anterior' : `Anterior: ${telas[estado.atual - 1].dataset.titulo}`);
    prox.setAttribute('aria-label', prox.disabled ? 'Próximo' : `Próximo: ${telas[estado.atual + 1].dataset.titulo}`);
  }

  function indiceDe(alvo) {
    if (typeof alvo === 'number') return alvo;
    const nome = ATALHOS[alvo] || alvo;
    return telas.findIndex((t) => t.dataset.tela === nome);
  }

  function irPara(alvo, { focar = false } = {}) {
    const idx = indiceDe(alvo);
    if (idx < 0 || idx >= telas.length) return;
    const mudou = idx !== estado.atual;
    const direcao = idx < estado.atual ? 'voltar' : 'avancar';

    telas.forEach((t, i) => { t.hidden = i !== idx; });
    const tela = telas[idx];
    if (mudou) {
      tela.classList.remove('entrando');
      tela.dataset.direcao = direcao;
      void tela.offsetWidth;
      tela.classList.add('entrando');
    }
    estado.atual = idx;
    estado.visitadas.add(idx);
    atualizarNavegacao();

    const hash = '#' + tela.dataset.tela;
    if (location.hash !== hash) history.replaceState(null, '', hash);

    if (mudou) {
      window.scrollTo(0, 0);
      anunciar(`Tela ${idx + 1} de ${telas.length}: ${tela.dataset.titulo}`);
      if (tela.dataset.tela === 'convite') {
        $('#aparelho-convite').scrollTop = 0;
        $('#aparelho').classList.remove('rolou', 'no-fim');
        ajustarAparelho();
        acenarConfirmar();
      }
      // Ao chegar no painel, os indicadores que mudaram desde a última visita pulsam.
      if (tela.dataset.tela === 'painel') renderPainel();
    }

    // Se o foco ficou num botão desativado ou numa tela escondida, leva-o ao título.
    const ativo = document.activeElement;
    const focoPerdido = ativo && ativo !== document.body &&
      (ativo.disabled || telas.some((t) => t.hidden && t.contains(ativo)));
    if (focar || focoPerdido) $('h1, h2', tela).focus({ preventScroll: true });
  }

  /* ---------- Mockup de celular (somente telas largas) ----------
     Prioridade: legibilidade. O convite nunca é reduzido abaixo de ~85%.
     Em telas baixas (notebooks), o celular fica mais estreito (360px) e
     assume a proporção de um aparelho compacto (até 1,8:1, como um
     iPhone SE) em vez de encolher; o restante do convite rola por dentro. */
  const APARELHO = { largura: 384, larguraCompacta: 360, alturaMax: 784, razaoMin: 1.8, zoomMin: 0.86 };
  const telaLarga = window.matchMedia('(min-width: 761px)');

  function ajustarAparelho() {
    const ap = $('#aparelho');
    if (!telaLarga.matches) {
      ['zoom', 'width', 'height'].forEach((p) => ap.style.removeProperty(p));
      return;
    }
    const suportaZoom = !!(window.CSS && CSS.supports('zoom', '0.8'));
    const barras = $('.topo').offsetHeight + $('.navegacao').offsetHeight;
    const respiro = parseFloat(getComputedStyle($('main')).paddingTop) + 10; // espaço acima + folga abaixo
    const disponivel = window.innerHeight - barras - respiro;
    const largura = disponivel < 700 ? APARELHO.larguraCompacta : APARELHO.largura;
    let zoom = suportaZoom ? Math.min(1, Math.max(APARELHO.zoomMin, disponivel / APARELHO.alturaMax)) : 1;
    let altura = Math.min(APARELHO.alturaMax, disponivel / zoom);
    if (altura < largura * APARELHO.razaoMin) {
      altura = largura * APARELHO.razaoMin;
      if (suportaZoom) zoom = Math.max(0.72, disponivel / altura);
    }
    ap.style.width = `${largura}px`;
    ap.style.height = `${Math.round(altura)}px`;
    ap.style.zoom = zoom.toFixed(3);
  }

  function ligarAparelho() {
    const tela = $('#aparelho-convite');
    const ap = $('#aparelho');
    const atualizarFim = () => {
      ap.classList.toggle('no-fim', tela.scrollTop + tela.clientHeight >= tela.scrollHeight - 8);
      ap.classList.toggle('rolou', tela.scrollTop > 40);
    };
    tela.addEventListener('scroll', atualizarFim, { passive: true });
    let espera;
    window.addEventListener('resize', () => {
      clearTimeout(espera);
      espera = setTimeout(() => { ajustarAparelho(); atualizarFim(); }, 120);
    });
    ajustarAparelho();
  }

  /* ---------- Incentivo à interação na tela do convite ---------- */
  let acenoTimer;
  function acenarConfirmar() {
    const btn = $('.convite [data-ir="confirmacao"]');
    clearTimeout(acenoTimer);
    btn.classList.remove('aceno');
    acenoTimer = setTimeout(() => {
      btn.classList.add('aceno');
      acenoTimer = setTimeout(() => btn.classList.remove('aceno'), 2600);
    }, 1400);
  }

  function ligarExperimente() {
    const exp = $('#experimente');
    const btn = $('.convite [data-ir="confirmacao"]');
    exp.addEventListener('mouseenter', () => btn.classList.add('chamando'));
    exp.addEventListener('mouseleave', () => btn.classList.remove('chamando'));
  }

  const proximo = () => irPara(estado.atual + 1);
  const anterior = () => irPara(estado.atual - 1);

  function ligarNavegacao() {
    $('#btn-proximo').addEventListener('click', proximo);
    $('#btn-anterior').addEventListener('click', anterior);

    document.addEventListener('click', (e) => {
      const ir = e.target.closest('[data-ir]');
      if (ir) { e.preventDefault(); irPara(ir.dataset.ir, { focar: true }); return; }
      if (e.target.closest('[data-acao="reiniciar"]')) pedirReinicio();
    });
    $('#btn-reiniciar').addEventListener('click', pedirReinicio);

    // Teclado: setas mudam de tela, exceto quando o foco está em campos.
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if ($('#dlg-reiniciar').open) return;
      if (e.target.closest('input, textarea, select, [contenteditable="true"], .tabela-rolavel')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); proximo(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); anterior(); }
    });

    // Toque: deslizar na horizontal muda de tela. A rolagem vertical nunca é bloqueada
    // (ouvintes passivos) e gestos iniciados em formulários ou tabelas são ignorados.
    let toque = null;
    const palco = $('#palco');
    palco.addEventListener('touchstart', (e) => {
      toque = null;
      if (e.touches.length !== 1) return;
      if (e.target.closest('form, input, textarea, select, .tabela-rolavel, .filtros')) return;
      const p = e.touches[0];
      toque = { x: p.clientX, y: p.clientY, t: Date.now() };
    }, { passive: true });
    palco.addEventListener('touchend', (e) => {
      if (!toque) return;
      const p = e.changedTouches[0];
      const dx = p.clientX - toque.x;
      const dy = p.clientY - toque.y;
      const dt = Date.now() - toque.t;
      toque = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6 && dt < 800) {
        if (dx < 0) proximo(); else anterior();
      }
    }, { passive: true });

    window.addEventListener('hashchange', () => {
      const idx = indiceDe(location.hash.slice(1));
      if (idx >= 0 && idx !== estado.atual) irPara(idx, { focar: true });
    });

    // No celular, a barra inferior se recolhe enquanto o teclado está aberto.
    const campoTexto = (el) => el && el.matches && el.matches('input[type="text"], input[type="number"], textarea');
    document.addEventListener('focusin', (e) => { if (campoTexto(e.target)) document.body.classList.add('digitando'); });
    document.addEventListener('focusout', () => {
      setTimeout(() => { if (!campoTexto(document.activeElement)) document.body.classList.remove('digitando'); }, 60);
    });
  }

  /* ---------- Reiniciar ---------- */
  function pedirReinicio() {
    const dlg = $('#dlg-reiniciar');
    if (typeof dlg.showModal === 'function') {
      dlg.returnValue = '';
      dlg.showModal();
    } else if (window.confirm('Reiniciar a demonstração? As respostas simuladas serão apagadas.')) {
      reiniciarTudo();
    }
  }

  function reiniciarTudo() {
    estado.respostas = [];
    estado.ultimaId = null;
    estado.exemplosCarregados = false;
    estado.regras = { ...REGRAS_PADRAO };
    estado.filtro = 'todos';
    estado.secao = 'lista';
    estado.exemploForm = 0;
    estado.visitadas.clear();
    aplicarSecao();
    expandirKpis(false);
    valoresKpi.clear();
    $('#regra-isencao').value = estado.regras.isencao;
    $('#regra-lembrancinha').value = estado.regras.lembrancinha;
    resetarFormulario();
    renderPainel();
    estado.atual = -1;
    irPara(0, { focar: true });
    toast('Demonstração reiniciada. Nenhuma resposta ficou guardada.');
  }

  /* =========================================================
     Formulário de confirmação
     ========================================================= */
  const form = $('#form-rsvp');
  const lista = $('#lista-convidados');
  const sucesso = $('#rsvp-sucesso');
  let seqLinha = 0;

  function criarLinha(dados = {}) {
    const id = `cv${++seqLinha}`;
    const li = document.createElement('li');
    li.className = 'convidado';
    li.innerHTML = `
      <div class="convidado-topo">
        <label class="convidado-rotulo" for="${id}-nome"><span class="convidado-num"></span> Nome completo <span class="obrig" aria-hidden="true">*</span></label>
        <button type="button" class="btn-remover">${ic('lixeira')}<span>Remover</span></button>
      </div>
      <input type="text" id="${id}-nome" data-campo="nome" maxlength="80" autocapitalize="words" spellcheck="false" enterkeyhint="next" aria-describedby="${id}-e-nome">
      <p class="erro" id="${id}-e-nome" hidden></p>
      <div class="linha2">
        <fieldset data-campo="tipo" aria-describedby="${id}-e-tipo">
          <legend>Adulto ou criança? <span class="obrig" aria-hidden="true">*</span></legend>
          <div class="segmento">
            <label><input type="radio" name="${id}-tipo" value="adulto"><span>Adulto</span></label>
            <label><input type="radio" name="${id}-tipo" value="crianca"><span>Criança</span></label>
          </div>
          <p class="erro" id="${id}-e-tipo" hidden></p>
        </fieldset>
        <div class="campo-idade" hidden>
          <label for="${id}-idade" title="Idade na data da festa">Idade${dataCurta() ? ` <small>em ${dataCurta()}</small>` : ''} <span class="obrig" aria-hidden="true">*</span></label>
          <input type="number" id="${id}-idade" data-campo="idade" min="0" max="17" step="1" inputmode="numeric" enterkeyhint="done" aria-describedby="${id}-e-idade">
          <p class="erro" id="${id}-e-idade" hidden></p>
        </div>
      </div>`;
    if (dados.nome) $('[data-campo="nome"]', li).value = dados.nome;
    if (dados.tipo) $(`input[value="${dados.tipo}"]`, li).checked = true;
    if (dados.idade != null) $('[data-campo="idade"]', li).value = dados.idade;
    atualizarCampoIdade(li);
    return li;
  }

  function atualizarCampoIdade(li) {
    const crianca = $('input[value="crianca"]', li).checked;
    $('.campo-idade', li).hidden = !crianca;
  }

  function renumerar() {
    const linhas = $$('.convidado', lista);
    linhas.forEach((li, i) => {
      const nome = limparNome($('[data-campo="nome"]', li).value);
      $('.convidado-num', li).textContent = `Convidado ${i + 1}`;
      $('.btn-remover', li).setAttribute('aria-label', `Remover convidado ${i + 1}${nome ? ': ' + nome : ''}`);
    });
    const add = $('#btn-add-convidado');
    const cheio = linhas.length >= LIMITE_CONVIDADOS;
    add.disabled = cheio;
    add.lastChild.textContent = cheio ? ` Limite de ${LIMITE_CONVIDADOS} convidados por resposta` : ' Adicionar convidado';
  }

  function atualizarResumo() {
    const d = coletar();
    const saida = $('#resumo-vivo');
    if (d.resposta !== 'sim') { saida.textContent = ''; return; }
    let adultos = d.vai ? 1 : 0;
    let criancas = 0;
    let indefinidos = 0;
    d.convidados.forEach((c) => {
      if (c.tipo === 'adulto') adultos++;
      else if (c.tipo === 'crianca') criancas++;
      else indefinidos++;
    });
    const total = adultos + criancas + indefinidos;
    let txt = `Total: ${plural(total, 'pessoa', 'pessoas')}`;
    if (total) txt += ` · ${plural(adultos, 'adulto', 'adultos')} · ${plural(criancas, 'criança', 'crianças')}`;
    if (indefinidos) txt += ` · ${indefinidos} sem perfil definido`;
    saida.textContent = txt;
  }

  function atualizarBlocoResposta() {
    const resposta = (form.querySelector('input[name="resposta"]:checked') || {}).value;
    $('#bloco-convidados').hidden = resposta !== 'sim';
    atualizarResumo();
  }

  function adicionarConvidado(dados, focar = true) {
    if ($$('.convidado', lista).length >= LIMITE_CONVIDADOS) {
      toast(`Nesta demonstração, cada resposta aceita até ${LIMITE_CONVIDADOS} convidados.`);
      return;
    }
    const li = criarLinha(dados);
    lista.append(li);
    renumerar();
    atualizarResumo();
    if (focar) $('[data-campo="nome"]', li).focus();
  }

  function removerConvidado(li) {
    const linhas = $$('.convidado', lista);
    const pos = linhas.indexOf(li);
    li.classList.add('saindo');
    setTimeout(() => {
      li.remove();
      renumerar();
      atualizarResumo();
      if (form.dataset.tentou) mostrarErros(validar(coletar()), false);
      const restantes = $$('.convidado', lista);
      const alvo = restantes[Math.min(pos, restantes.length - 1)];
      (alvo ? $('[data-campo="nome"]', alvo) : $('#btn-add-convidado')).focus();
    }, 220);
  }

  function coletar() {
    return {
      resposta: (form.querySelector('input[name="resposta"]:checked') || {}).value || '',
      responsavel: limparNome($('#resp-nome').value),
      vai: $('#resp-vai').checked,
      recado: $('#recado').value.trim(),
      convidados: $$('.convidado', lista).map((li) => {
        const idade = $('[data-campo="idade"]', li);
        return {
          li,
          nome: limparNome($('[data-campo="nome"]', li).value),
          tipo: (li.querySelector('input[type="radio"]:checked') || {}).value || '',
          idadeTxt: idade.value.trim(),
          idadeInvalida: idade.validity.badInput
        };
      })
    };
  }

  /* ---------- Validação ---------- */
  function erroNome(nome) {
    if (!nome) return 'Informe o nome completo.';
    if (!/^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u.test(nome)) return 'Use apenas letras, espaços, hífen ou apóstrofo.';
    if (nome.split(' ').filter((p) => /\p{L}/u.test(p)).length < 2) return 'Informe nome e sobrenome.';
    return '';
  }

  function erroIdade(txt, invalida) {
    if (invalida || (txt !== '' && !/^\d{1,2}$/.test(txt))) return 'Use um número inteiro de anos (0 para bebês com menos de 1 ano).';
    if (txt === '') return 'Informe a idade que a criança terá no dia da festa.';
    if (Number(txt) > 17) return 'Para 18 anos ou mais, marque “Adulto”.';
    return '';
  }

  function validar(d) {
    const erros = [];
    const add = (alvo, erroEl, msg, foco) => erros.push({ alvo, erroEl, msg, foco: foco || alvo });

    if (!d.resposta) {
      add($('#campo-resposta'), $('#erro-resposta'), 'Escolha se você poderá comparecer.', form.querySelector('input[name="resposta"]'));
    }
    const eResp = erroNome(d.responsavel);
    if (eResp) add($('#resp-nome'), $('#erro-resp-nome'), eResp);

    if (d.resposta === 'sim') {
      const vistos = new Set();
      if (d.vai && !eResp) vistos.add(normalizar(d.responsavel));

      d.convidados.forEach((c) => {
        const nomeEl = $('[data-campo="nome"]', c.li);
        const nomeErro = nomeEl.nextElementSibling;
        if (!c.nome && !c.tipo && !c.idadeTxt) {
          add(nomeEl, nomeErro, 'Preencha os dados deste convidado ou remova-o da lista.');
          return;
        }
        let msg = erroNome(c.nome);
        if (!msg) {
          const chave = normalizar(c.nome);
          if (vistos.has(chave)) msg = 'Este nome já está nesta resposta.';
          vistos.add(chave);
        }
        if (msg) add(nomeEl, nomeErro, msg);

        const tipoEl = $('fieldset[data-campo="tipo"]', c.li);
        if (!c.tipo) {
          add(tipoEl, $('.erro', tipoEl), 'Indique se é adulto ou criança.', $('input', tipoEl));
        } else if (c.tipo === 'crianca') {
          const idadeEl = $('[data-campo="idade"]', c.li);
          const mi = erroIdade(c.idadeTxt, c.idadeInvalida);
          if (mi) add(idadeEl, idadeEl.nextElementSibling, mi);
        }
      });

      if (!d.vai && d.convidados.length === 0) {
        add(null, $('#erro-convidados'), 'Inclua pelo menos uma pessoa que irá à festa.', $('#btn-add-convidado'));
      }
    }
    return erros;
  }

  function limparErros() {
    $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
    $$('.erro', form).forEach((p) => { p.hidden = true; p.textContent = ''; });
    $('#erro-resumo').hidden = true;
  }

  function mostrarErros(erros, focar) {
    limparErros();
    erros.forEach((e) => {
      if (e.alvo) e.alvo.setAttribute('aria-invalid', 'true');
      if (e.erroEl && e.erroEl.hidden) {
        e.erroEl.textContent = e.msg;
        e.erroEl.hidden = false;
      }
    });
    if (!erros.length) return;
    const resumo = $('#erro-resumo');
    resumo.textContent = erros.length === 1
      ? 'Falta corrigir 1 item, indicado abaixo.'
      : `Faltam corrigir ${erros.length} itens, indicados abaixo.`;
    resumo.hidden = false;
    if (focar) {
      const alvo = erros[0].foco;
      alvo.focus({ preventScroll: true });
      alvo.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  /* ---------- Envio ---------- */
  function montarResposta(d, extras = {}) {
    const convidados = [];
    if (d.resposta === 'sim') {
      if (d.vai) convidados.push({ nome: d.responsavel, tipo: 'adulto', idade: null, ehResponsavel: true });
      d.convidados.forEach((c) => convidados.push({
        nome: c.nome,
        tipo: c.tipo,
        idade: c.tipo === 'crianca' ? Number(c.idade != null ? c.idade : c.idadeTxt) : null
      }));
    }
    return {
      id: ++estado.seq,
      criadoEm: new Date(),
      resposta: d.resposta,
      responsavel: d.responsavel,
      recado: d.recado || '',
      conferida: false,
      ficticia: false,
      convidados,
      ...extras
    };
  }

  function enviar(e) {
    e.preventDefault();
    form.dataset.tentou = '1';
    const d = coletar();
    const erros = validar(d);
    mostrarErros(erros, true);
    if (erros.length) return;

    const r = montarResposta(d);
    estado.respostas.push(r);
    estado.ultimaId = r.id;
    renderPainel();
    mostrarSucesso(r);
    toast('Resposta adicionada ao painel de demonstração.');
  }

  function mostrarSucesso(r) {
    const nome = primeiroNome(r.responsavel);
    const aniv = FESTA.aniversariante || 'aniversariante';
    if (r.resposta === 'sim') {
      $('#sucesso-titulo').textContent = 'Presença confirmada!';
      $('#sucesso-texto').textContent = `Obrigado, ${nome}! Recebemos ${plural(r.convidados.length, 'pessoa', 'pessoas')} para o aniversário da ${aniv}.`;
      $('#sucesso-lista').innerHTML = r.convidados.map((c) => `
        <li><span>${esc(c.nome)}</span><span>${c.tipo === 'crianca' ? `Criança · ${idadeTexto(c.idade)}` : 'Adulto'}</span></li>`).join('');
    } else {
      $('#sucesso-titulo').textContent = 'Obrigado por avisar!';
      $('#sucesso-texto').textContent = `${nome}, registramos que vocês não poderão comparecer. A ${aniv} vai sentir sua falta!`;
      $('#sucesso-lista').innerHTML = '';
    }
    $('#sucesso-lista').hidden = r.resposta !== 'sim';
    $('#sucesso-proximo').textContent = r.resposta === 'sim'
      ? 'Sua resposta já aparece, em destaque, no painel da equipe.'
      : 'A ausência já aparece, em destaque, no painel da equipe.';
    form.hidden = true;
    sucesso.hidden = false;
    sucesso.focus({ preventScroll: true });
    sucesso.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function resetarFormulario() {
    form.reset();
    lista.replaceChildren();
    limparErros();
    delete form.dataset.tentou;
    form.hidden = false;
    sucesso.hidden = true;
    atualizarBlocoResposta();
    renumerar();
  }

  const EXEMPLOS_FORM = [
    {
      resposta: 'sim', responsavel: 'Ana Paula Ribeiro', vai: true, recado: 'Parabéns, Anne! Vamos com muito brilho!',
      convidados: [
        { nome: 'Lucas Ribeiro', tipo: 'adulto' },
        { nome: 'Isabela Ribeiro', tipo: 'crianca', idade: 7 },
        { nome: 'Theo Ribeiro', tipo: 'crianca', idade: 3 }
      ]
    },
    {
      resposta: 'sim', responsavel: 'Marcelo Tavares Pinto', vai: true, recado: '',
      convidados: [{ nome: 'Alice Tavares Pinto', tipo: 'crianca', idade: 10 }]
    },
    { resposta: 'nao', responsavel: 'Camila Ferreira Dias', recado: 'Estaremos viajando. Feliz aniversário, Anne!' }
  ];

  function preencherExemplo() {
    const ex = EXEMPLOS_FORM[estado.exemploForm++ % EXEMPLOS_FORM.length];
    resetarFormulario();
    form.querySelector(`input[name="resposta"][value="${ex.resposta}"]`).checked = true;
    $('#resp-nome').value = ex.responsavel;
    $('#recado').value = ex.recado || '';
    if (ex.resposta === 'sim') {
      $('#resp-vai').checked = ex.vai;
      ex.convidados.forEach((c) => lista.append(criarLinha(c)));
    }
    atualizarBlocoResposta();
    renumerar();
    toast('Dados fictícios preenchidos. Confira e toque em “Enviar resposta”.');
  }

  function ligarFormulario() {
    form.addEventListener('submit', enviar);
    $('#btn-add-convidado').addEventListener('click', () => adicionarConvidado());
    $('#btn-exemplo-form').addEventListener('click', preencherExemplo);
    $('#btn-nova-resposta').addEventListener('click', () => {
      resetarFormulario();
      form.scrollIntoView({ block: 'start', behavior: 'smooth' });
      form.querySelector('input[name="resposta"]').focus({ preventScroll: true });
    });

    lista.addEventListener('click', (e) => {
      const b = e.target.closest('.btn-remover');
      if (b) removerConvidado(b.closest('.convidado'));
    });

    form.addEventListener('change', (e) => {
      if (e.target.name === 'resposta') atualizarBlocoResposta();
      if (e.target.id === 'resp-vai') {
        if (!e.target.checked && !$$('.convidado', lista).length) adicionarConvidado(undefined, false);
        atualizarResumo();
      }
      if (e.target.type === 'radio' && e.target.closest('.convidado')) {
        atualizarCampoIdade(e.target.closest('.convidado'));
        atualizarResumo();
      }
      if (form.dataset.tentou) mostrarErros(validar(coletar()), false);
    });

    form.addEventListener('input', (e) => {
      if (e.target.dataset.campo === 'nome') renumerar();
      if (form.dataset.tentou) mostrarErros(validar(coletar()), false);
    });

    $('#campo-resposta').setAttribute('aria-describedby', 'erro-resposta');
  }

  /* =========================================================
     Painel demonstrativo
     ========================================================= */
  const valoresKpi = new Map();

  // Três faixas EXCLUSIVAS definidas pelos limites de exemplo (isenção < lembrancinha).
  // "Menores de isenção" = faixa 1; "menores de lembrancinha" = faixas 1 + 2 (sobrepostos).
  function definirFaixas(R) {
    const a = R.isencao;
    const b = R.lembrancinha;
    return [
      { cls: 'f0', curto: a === 1 ? '0' : `0–${a - 1}`, rot: a === 1 ? 'Menos de 1 ano' : `0 a ${a - 1} anos`, cabe: (i) => i < a },
      { cls: 'f1', curto: b - 1 === a ? `${a}` : `${a}–${b - 1}`, rot: b - 1 === a ? `${a} ${a === 1 ? 'ano' : 'anos'}` : `${a} a ${b - 1} anos`, cabe: (i) => i >= a && i < b },
      { cls: 'f2', curto: `${b}+`, rot: `${b} anos ou mais`, cabe: (i) => i >= b }
    ];
  }

  function calcular() {
    const R = estado.regras;
    const confirmadas = estado.respostas.filter((r) => r.resposta === 'sim');
    const ausencias = estado.respostas.filter((r) => r.resposta === 'nao');
    const pessoas = confirmadas.flatMap((r) => r.convidados.map((c) => ({ ...c, resp: r })));

    const contagem = new Map();
    pessoas.forEach((p) => {
      const k = normalizar(p.nome);
      contagem.set(k, (contagem.get(k) || 0) + 1);
    });
    pessoas.forEach((p) => {
      p.crianca = p.tipo === 'crianca';
      p.isenta = p.crianca && p.idade < R.isencao;
      p.lembr = p.crianca && p.idade < R.lembrancinha;
      p.repetido = contagem.get(normalizar(p.nome)) > 1;
    });
    const criancas = pessoas.filter((p) => p.crianca);
    return {
      faixas: definirFaixas(R).map((f) => ({ ...f, n: criancas.filter((p) => f.cabe(p.idade)).length })),
      confirmadas,
      ausencias,
      pessoas,
      adultos: pessoas.filter((p) => !p.crianca),
      criancas,
      isentas: criancas.filter((p) => p.isenta),
      lembr: criancas.filter((p) => p.lembr),
      pendentes: confirmadas.filter((r) => !r.conferida)
    };
  }

  function renderKpis(c) {
    const R = estado.regras;
    const F = c.faixas;
    // `sec`: indicadores secundários, recolhidos no celular até tocar em "Mais indicadores".
    const kpis = [
      { id: 'total', rot: 'Confirmados', ic: 'pessoas', v: c.pessoas.length, det: `pessoas em ${plural(c.confirmadas.length, 'resposta', 'respostas')}`, cls: 'kpi-destaque' },
      { id: 'adultos', rot: 'Adultos', ic: 'pessoa', v: c.adultos.length, det: 'confirmados' },
      { id: 'criancas', rot: 'Crianças', ic: 'estrela', v: c.criancas.length, det: F.map((f) => `${f.curto}: ${f.n}`).join(' · ') },
      { id: 'isentas', rot: `Menores de ${R.isencao} anos`, ic: 'coracao', v: c.isentas.length, det: `isenção (exemplo) · faixa ${F[0].curto}`, sec: true },
      { id: 'lembr', rot: `Menores de ${R.lembrancinha} anos`, ic: 'presente', v: c.lembr.length, det: `lembrancinha (exemplo) · inclui as menores de ${R.isencao}`, sec: true },
      { id: 'ausencias', rot: 'Ausências', ic: 'ausente', v: c.ausencias.length, det: 'informadas', sec: true },
      { id: 'pendentes', rot: 'A conferir', ic: 'relogio', v: c.pendentes.length, det: 'confirmações pendentes', cls: 'kpi-pend' },
      { id: 'respostas', rot: 'Respostas', ic: 'mensagem', v: estado.respostas.length, det: 'nesta simulação', sec: true }
    ];
    // Só registra como "visto" quando o painel está na tela, para o pulso
    // acontecer quando a pessoa chega ao painel depois de enviar uma resposta.
    const painelVisivel = !$('#tela-painel').hidden;
    $('#kpis').innerHTML = kpis.map((k) => {
      const antes = valoresKpi.has(k.id) ? valoresKpi.get(k.id) : 0;
      const mudou = painelVisivel && antes !== k.v;
      if (painelVisivel) valoresKpi.set(k.id, k.v);
      return `
        <div class="kpi ${k.cls || ''} ${k.sec ? 'kpi-sec' : ''} ${mudou ? 'pulso' : ''}" data-kpi="${k.id}">
          <div class="kpi-rotulo">${ic(k.ic)}<span>${esc(k.rot)}</span></div>
          <div class="kpi-valor">${k.v}</div>
          <div class="kpi-detalhe">${esc(k.det)}</div>
        </div>`;
    }).join('');
  }

  function renderFaixas(c) {
    const R = estado.regras;
    const F = c.faixas;
    const total = c.criancas.length;
    // Marcadores das faixas que cada indicador derivado inclui.
    const inclui = (qtd) => F.map((f, i) => i < qtd
      ? `<span class="marca-faixa inclui ${f.cls}">${ic('check')}${f.curto}</span>`
      : `<span class="marca-faixa">${f.curto}</span>`).join('');

    $('#faixas').innerHTML = `
      <div class="faixas-exclusivas">
        <p class="faixas-total">Total de crianças <b>${total}</b>${total ? `<span>= ${F.map((f) => f.n).join(' + ')}</span>` : ''}</p>
        <div class="faixas-barra" role="img" aria-label="${esc(`${plural(total, 'criança', 'crianças')}: ${F.map((f) => `${f.rot}, ${f.n}`).join('; ')}`)}">
          ${total
            ? F.filter((f) => f.n).map((f) => `<span class="faixa-seg ${f.cls}" style="flex-grow:${f.n}" title="${esc(`${f.rot}: ${plural(f.n, 'criança', 'crianças')}`)}"></span>`).join('')
            : '<span class="faixas-vazia"></span>'}
        </div>
        <ul class="faixas-lista">
          ${F.map((f) => `<li data-faixa="${f.cls}"><i class="${f.cls}"></i><span>${f.rot}</span><b>${f.n}</b></li>`).join('')}
        </ul>
        <p class="faixas-legenda">Faixas exclusivas: cada criança aparece em uma só.</p>
      </div>

      <div class="derivados">
        <p class="derivados-titulo"><b>Indicadores derivados</b> <span>Se sobrepõem: não some um com o outro.</span></p>
        <div class="derivado" data-derivado="isentas">
          <div class="derivado-topo"><span>Menores de ${R.isencao} anos</span><b>${c.isentas.length}</b></div>
          <div class="derivado-faixas" aria-hidden="true">${inclui(1)}</div>
          <small>Isenção · regra de exemplo · faixa ${F[0].curto}</small>
        </div>
        <div class="derivado" data-derivado="lembr">
          <div class="derivado-topo"><span>Menores de ${R.lembrancinha} anos</span><b>${c.lembr.length}</b></div>
          <div class="derivado-faixas" aria-hidden="true">${inclui(2)}</div>
          <small>Lembrancinha · regra de exemplo · faixas ${F[0].curto} e ${F[1].curto} (${F[0].n} + ${F[1].n})</small>
        </div>
        <p class="nota-pequena">Quem tem menos de ${R.isencao} anos também conta entre os menores de ${R.lembrancinha}.${total ? ` Por isso ${c.isentas.length} + ${c.lembr.length} não é o total de crianças (${total}).` : ''}</p>
      </div>`;
  }

  function pilulaEstado(conferida) {
    return conferida
      ? `<span class="estado estado-ok">${ic('check')} Conferido</span>`
      : `<span class="estado estado-pend">${ic('relogio')} Pendente</span>`;
  }

  function renderLista(c) {
    const R = estado.regras;
    const filtros = [
      ['todos', 'Todos', c.pessoas],
      ['adultos', 'Adultos', c.adultos],
      ['criancas', 'Crianças', c.criancas],
      ['isentas', `Menores de ${R.isencao}`, c.isentas],
      ['lembr', `Menores de ${R.lembrancinha}`, c.lembr],
      ['pendentes', 'A conferir', c.pessoas.filter((p) => !p.resp.conferida)]
    ];
    if (!filtros.some((f) => f[0] === estado.filtro)) estado.filtro = 'todos';
    $('#filtros').innerHTML = filtros.map(([id, rot, arr]) =>
      `<button type="button" class="filtro" data-filtro="${id}" aria-pressed="${estado.filtro === id}">${esc(rot)}<span>${arr.length}</span></button>`).join('');

    const itens = filtros.find((f) => f[0] === estado.filtro)[2];
    $('#tabela-convidados tbody').innerHTML = itens.map((p) => {
      const obs = [
        p.isenta ? `<span class="etiqueta etiqueta-isencao">${ic('coracao')} Isenção</span>` : '',
        p.lembr ? `<span class="etiqueta etiqueta-lembr">${ic('presente')} Lembrancinha</span>` : '',
        p.repetido ? `<span class="etiqueta etiqueta-alerta">${ic('info')} Nome repetido</span>` : ''
      ].join('');
      const recente = p.resp.id === estado.ultimaId;
      return `<tr${recente ? ' class="recente"' : ''}>
        <td data-rotulo="Convidado">${esc(p.nome)}${p.ehResponsavel ? ' <span class="etiqueta etiqueta-resp">responsável</span>' : ''}${recente ? ' <span class="etiqueta etiqueta-nova">nova</span>' : ''}</td>
        <td data-rotulo="Perfil">${p.crianca ? `Criança · ${idadeTexto(p.idade)}` : 'Adulto'}</td>
        <td data-rotulo="Observações"${obs ? '' : ' class="sem-observacao"'}><div>${obs || '<span class="sem-obs">—</span>'}</div></td>
        <td data-rotulo="Responsável"${p.ehResponsavel ? ' class="eh-resp"' : ''}>${esc(p.resp.responsavel)}</td>
        <td data-rotulo="Conferência">${pilulaEstado(p.resp.conferida)}</td>
      </tr>`;
    }).join('');
    $('#tabela-convidados').hidden = !itens.length;
    $('#tabela-vazia').hidden = !!itens.length;
  }

  function renderRespostas(c) {
    const ordenar = (arr) => arr.slice().sort((a, b) => b.criadoEm - a.criadoEm);
    const confirmadas = ordenar(c.confirmadas);
    $('#lista-respostas').innerHTML = confirmadas.length ? confirmadas.map((r) => {
      const ad = r.convidados.filter((p) => p.tipo !== 'crianca').length;
      const cr = r.convidados.length - ad;
      return `<li class="resposta${r.id === estado.ultimaId ? ' recente' : ''}">
        <div class="resposta-topo"><b>${esc(r.responsavel)}${r.id === estado.ultimaId ? ' <span class="etiqueta etiqueta-nova">sua resposta</span>' : ''}</b>${pilulaEstado(r.conferida)}</div>
        <div class="resposta-meta">${plural(r.convidados.length, 'pessoa', 'pessoas')} (${plural(ad, 'adulto', 'adultos')}, ${plural(cr, 'criança', 'crianças')}) · ${hora(r.criadoEm)}${r.ficticia ? ' · fictícia' : ''}</div>
        ${r.recado ? `<p class="resposta-recado">“${esc(r.recado)}”</p>` : ''}
        <div class="resposta-acoes">
          <button type="button" class="btn-mini" data-conferir="${r.id}">${r.conferida ? `${ic('reiniciar')} Desfazer conferência` : `${ic('check')} Marcar como conferida`}</button>
          <button type="button" class="btn-mini" data-excluir="${r.id}" aria-label="Excluir resposta de ${esc(r.responsavel)}">${ic('lixeira')} Excluir</button>
        </div>
      </li>`;
    }).join('') : '<li class="vazio">Nenhuma confirmação ainda.</li>';

    const ausencias = ordenar(c.ausencias);
    $('#lista-ausencias').innerHTML = ausencias.length ? ausencias.map((r) => `
      <li${r.id === estado.ultimaId ? ' class="recente"' : ''}>
        <div><b>${esc(r.responsavel)}</b><div class="resposta-meta">${hora(r.criadoEm)}${r.ficticia ? ' · fictícia' : ''}</div>
        ${r.recado ? `<p class="resposta-recado">“${esc(r.recado)}”</p>` : ''}</div>
        <button type="button" class="btn-mini" data-excluir="${r.id}" aria-label="Excluir resposta de ${esc(r.responsavel)}">${ic('lixeira')}<span class="sr-only">Excluir</span></button>
      </li>`).join('') : '<li class="vazio">Ninguém informou ausência até agora.</li>';
  }

  function renderPainel() {
    const vazio = estado.respostas.length === 0;
    $('#painel-vazio').hidden = !vazio;
    $('#painel-conteudo').hidden = vazio;
    $('#btn-limpar-respostas').hidden = vazio;
    $('#btn-carregar-exemplos').disabled = estado.exemplosCarregados;
    if (vazio) return;
    const c = calcular();
    renderKpis(c);
    renderFaixas(c);
    renderLista(c);
    renderRespostas(c);
  }

  // Respostas fictícias para mostrar o painel funcionando.
  const EXEMPLOS_PAINEL = [
    {
      resposta: 'sim', responsavel: 'Juliana Martins Rocha', vai: true, conferida: true,
      convidados: [
        { nome: 'Rafael Rocha', tipo: 'adulto' },
        { nome: 'Laura Martins Rocha', tipo: 'crianca', idade: 4 },
        { nome: 'Pedro Martins Rocha', tipo: 'crianca', idade: 8 }
      ]
    },
    {
      resposta: 'sim', responsavel: 'Carlos Henrique Duarte', vai: true, conferida: true, recado: 'Parabéns, Anne! Estaremos lá!',
      convidados: [{ nome: 'Beatriz Duarte', tipo: 'crianca', idade: 11 }]
    },
    {
      resposta: 'sim', responsavel: 'Patrícia Gomes Alves', vai: true,
      convidados: [
        { nome: 'Sofia Gomes Alves', tipo: 'crianca', idade: 5 },
        { nome: 'Miguel Gomes Alves', tipo: 'crianca', idade: 2 }
      ]
    },
    { resposta: 'nao', responsavel: 'Fernanda Costa Lima', recado: 'Infelizmente estaremos viajando. Feliz aniversário, Anne!' },
    {
      resposta: 'sim', responsavel: 'Roberto Nunes Prado', vai: true,
      convidados: [
        { nome: 'Helena Nunes Prado', tipo: 'adulto' },
        { nome: 'Valentina Nunes Prado', tipo: 'crianca', idade: 9 },
        { nome: 'Gabriel Nunes Prado', tipo: 'crianca', idade: 13 }
      ]
    },
    {
      resposta: 'sim', responsavel: 'Marcos Alves', vai: false, recado: 'A mãe também respondeu, conferir.',
      convidados: [{ nome: 'Sofia Gomes Alves', tipo: 'crianca', idade: 5 }]
    },
    { resposta: 'nao', responsavel: 'Thiago Mendes Souza' }
  ];

  function carregarExemplos() {
    if (estado.exemplosCarregados) return;
    const agora = Date.now();
    EXEMPLOS_PAINEL.forEach((ex, i) => {
      const r = montarResposta({ ...ex, recado: ex.recado || '', convidados: ex.convidados || [] }, {
        ficticia: true,
        conferida: !!ex.conferida
      });
      r.criadoEm = new Date(agora - (EXEMPLOS_PAINEL.length - i) * 23 * 60000);
      estado.respostas.push(r);
    });
    estado.exemplosCarregados = true;
    renderPainel();
    toast(`${EXEMPLOS_PAINEL.length} respostas fictícias adicionadas ao painel.`);
  }

  // Celular: seções do painel em abas e indicadores secundários recolhidos.
  function aplicarSecao() {
    $('#painel-conteudo').dataset.secaoAtiva = estado.secao;
    $$('#painel-abas button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.secao === estado.secao)));
  }

  function expandirKpis(abrir) {
    const btn = $('#btn-kpis-mais');
    $('#kpis').classList.toggle('expandido', abrir);
    btn.setAttribute('aria-expanded', String(abrir));
    $('span', btn).textContent = abrir ? 'Menos indicadores' : 'Mais indicadores';
  }

  function ligarPainel() {
    $('#painel-abas').addEventListener('click', (e) => {
      const b = e.target.closest('[data-secao]');
      if (!b) return;
      estado.secao = b.dataset.secao;
      aplicarSecao();
    });
    $('#btn-kpis-mais').addEventListener('click', () => {
      expandirKpis($('#btn-kpis-mais').getAttribute('aria-expanded') !== 'true');
    });
    $('#btn-carregar-exemplos').addEventListener('click', carregarExemplos);
    $('#btn-limpar-respostas').addEventListener('click', () => {
      estado.respostas = [];
    estado.ultimaId = null;
      estado.exemplosCarregados = false;
      valoresKpi.clear();
      renderPainel();
      $('#t5').focus();
      toast('Respostas simuladas apagadas.');
    });

    $('#filtros').addEventListener('click', (e) => {
      const b = e.target.closest('[data-filtro]');
      if (!b) return;
      estado.filtro = b.dataset.filtro;
      renderPainel();
      $(`[data-filtro="${estado.filtro}"]`).focus();
    });

    const acoesResposta = (e) => {
      const conf = e.target.closest('[data-conferir]');
      const exc = e.target.closest('[data-excluir]');
      if (conf) {
        const r = estado.respostas.find((x) => x.id === Number(conf.dataset.conferir));
        if (!r) return;
        r.conferida = !r.conferida;
        renderPainel();
        const novo = $(`[data-conferir="${r.id}"]`);
        if (novo) novo.focus();
      } else if (exc) {
        const id = Number(exc.dataset.excluir);
        estado.respostas = estado.respostas.filter((x) => x.id !== id);
        if (!estado.respostas.some((x) => x.ficticia)) estado.exemplosCarregados = false;
        renderPainel();
        $('#t5').focus();
        toast('Resposta excluída da simulação.');
      }
    };
    $('#lista-respostas').addEventListener('click', acoesResposta);
    $('#lista-ausencias').addEventListener('click', acoesResposta);

    [['#regra-isencao', 'isencao'], ['#regra-lembrancinha', 'lembrancinha']].forEach(([sel, chave]) => {
      const inp = $(sel);
      inp.value = estado.regras[chave];
      inp.setAttribute('aria-describedby', 'regra-erro');
      inp.addEventListener('input', () => {
        const v = inp.value.trim();
        const n = Number(v);
        const proposta = { ...estado.regras, [chave]: n };
        let msg = '';
        if (!/^\d{1,2}$/.test(v) || n < 1 || n > 17) msg = 'Use um número inteiro de 1 a 17.';
        else if (proposta.isencao >= proposta.lembrancinha) msg = 'O limite da isenção precisa ser menor que o da lembrancinha.';
        const erro = $('#regra-erro');
        erro.textContent = msg;
        erro.hidden = !msg;
        if (msg) { inp.setAttribute('aria-invalid', 'true'); return; }
        inp.removeAttribute('aria-invalid');
        estado.regras[chave] = n;
        renderPainel();
      });
      // Ao sair do campo, um valor inválido volta ao último valor aceito.
      inp.addEventListener('blur', () => {
        inp.value = estado.regras[chave];
        inp.removeAttribute('aria-invalid');
        $('#regra-erro').hidden = true;
      });
    });
  }

  /* =========================================================
     Início
     ========================================================= */
  function iniciar() {
    aplicarConfig();
    montarProgresso();
    ligarNavegacao();
    ligarFormulario();
    ligarPainel();
    ligarAparelho();
    ligarExperimente();
    resetarFormulario();
    renderPainel();

    // Fecha o diálogo e reinicia no mesmo clique (o evento `close` é assíncrono).
    $('#dlg-reiniciar form').addEventListener('submit', (e) => {
      const confirmou = !!e.submitter && e.submitter.value === 'ok';
      e.preventDefault();
      $('#dlg-reiniciar').close(confirmou ? 'ok' : 'cancelar');
      if (confirmou) reiniciarTudo();
    });

    const inicial = indiceDe(location.hash.slice(1));
    irPara(inicial >= 0 ? inicial : 0);
  }

  iniciar();
})();
