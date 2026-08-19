(function (G) {
  var nextId = 1;
  function uid() {
    return nextId++;
  }

  G.MAX_UNITS = 5;

  G.PLAYER_TIERS = [];

  G.ENEMY_DEFS = {
    infantaria: { name: "Formiga-soldado", hp: 34, dmg: 22, range: 24, fire: 0, speed: 58, size: 12, color: "#c45a2a", kind: "melee", blurb: "Linha de frente da colmeia. Fecha e morde." },
    corredor: { name: "Estalador", hp: 22, dmg: 20, range: 22, fire: 0, speed: 128, size: 10, color: "#e8a03a", kind: "melee", blurb: "Rápido demais. Corta quem tenta girar em volta." },
    escudeiro: { name: "Escaravelho", hp: 110, dmg: 30, range: 26, fire: 0, speed: 42, size: 16, color: "#6a3a18", kind: "melee", blurb: "Carapaça pesada. Anda devagar e empurra no contato." },
    atirador: { name: "Cuspe-ácido", hp: 32, dmg: 16, range: 190, fire: 0.7, speed: 52, size: 12, color: "#8ad422", kind: "ranged", prefer: 170, blurb: "Fica atrás e cospe ácido de longe." },
    tanque: { name: "Couraça-viva", hp: 180, dmg: 36, range: 170, fire: 0.4, speed: 38, size: 22, color: "#4a5a48", kind: "ranged", prefer: 140, blurb: "Couraça híbrida. Demora pra cair e atira pesado." },
    drone: { name: "Vespa-sonda", hp: 26, dmg: 14, range: 150, fire: 1.1, speed: 90, size: 11, color: "#f0d24a", kind: "drone", flying: true, blurb: "Vespa aérea. Flanqueia por cima e metralha." },
    kamikaze: { name: "Carrapato-bomba", hp: 30, dmg: 52, range: 26, fire: 0, speed: 110, size: 11, color: "#ff3a2a", kind: "kamikaze", blurb: "O corpo é a bomba. Estoura se encostar." },
    medico: { name: "Simbionte", hp: 40, dmg: 0, range: 70, fire: 0, speed: 62, size: 12, color: "#e8ffe8", kind: "healer", blurb: "Cura o enxame. Prioriza o aliado mais ferido." },
    artilharia: { name: "Besouro-morteiro", hp: 55, dmg: 38, range: 320, fire: 0.28, speed: 28, size: 16, color: "#c46a22", kind: "artillery", prefer: 250, blurb: "Marca o chão e dispara morteiro químico." },
    fragmento: { name: "Cisto", hp: 50, dmg: 24, range: 22, fire: 0, speed: 70, size: 14, color: "#d4783a", kind: "melee", splits: true, blurb: "Ao morrer, parte em duas larvas." },
    larva: { name: "Larva", hp: 14, dmg: 16, range: 16, fire: 0, speed: 100, size: 7, color: "#c8e050", kind: "melee", blurb: "Fraca sozinha. Perigosa em grupo." },
    sombra: { name: "Mimetídeo", hp: 38, dmg: 32, range: 22, fire: 0, speed: 95, size: 12, color: "#3a2458", kind: "stealth", blurb: "Some de longe. Aparece perto pra matar." },
    sniper: { name: "Percevejo-agulha", hp: 36, dmg: 34, range: 280, fire: 0.32, speed: 36, size: 12, color: "#5a8a2a", kind: "sniper", prefer: 240, blurb: "Poucos tiros. Cada um dói. Longo alcance." },
    ninho: { name: "Ninho-colmeia", hp: 130, dmg: 0, range: 10, fire: 0, speed: 12, size: 20, color: "#8a5a18", kind: "nest", blurb: "Quase não anda. O perigo é o que nasce dele." },
    parasita: { name: "Sanguessuga", hp: 22, dmg: 12, range: 16, fire: 0, speed: 120, size: 8, color: "#a03070", kind: "parasite", blurb: "Gruda num soldado, suga e deixa ele lento." },
    criomante: { name: "Gafanhoto-gelo", hp: 44, dmg: 14, range: 170, fire: 0.7, speed: 48, size: 13, color: "#7ad8ff", kind: "cryo", prefer: 150, blurb: "Tiro gelado. Atrasa o passo do esquadrão." },
    chefe_comandante: {
      name: "Marechal Casca",
      title: "O enxame não recua",
      hp: 930, dmg: 28, range: 210, fire: 0.9, speed: 48, size: 32, color: "#d4a024", kind: "boss_burst", boss: true,
      blurb: "Chefe da linha. Escudos orbitam e ele gira atirando pra todos os lados."
    },
    chefe_megatanque: {
      name: "Beemote-07",
      title: "Imperatriz da Colmeia",
      hp: 1350, dmg: 46, range: 160, fire: 0.45, speed: 58, size: 42, color: "#f0b42a", kind: "boss_charge", boss: true, flying: true,
      blurb: "Imperatriz voadora. Ferrão venenoso e mergulho que atropela."
    },
    chefe_fortaleza: {
      name: "Colmeia Andarilha",
      title: "Fortaleza com patas",
      hp: 2280, dmg: 32, range: 200, fire: 0.7, speed: 28, size: 44, color: "#c45cff", kind: "boss_spawn", boss: true,
      blurb: "Fortaleza ambulante. Vomita reforço e se cura se você parar de atirar."
    },
    chefe_espectro: {
      name: "Mariposa-Véu",
      title: "Some entre os tiros",
      hp: 1470, dmg: 26, range: 200, fire: 0.8, speed: 70, size: 30, color: "#c8a0ff", kind: "boss_veil", boss: true, flying: true,
      blurb: "Furtiva. O que ela invoca é isca: atrapalha, não mata."
    },
    chefe_final: {
      name: "Núcleo da Enxame",
      title: "O cérebro da legião",
      hp: 1900, dmg: 34, range: 230, fire: 0.85, speed: 40, size: 48, color: "#fff36a", kind: "boss_final", boss: true,
      blurb: "O cérebro da legião. Três camadas: Colmeia, Mariposa, núcleo nu."
    },
    mini_beemote: {
      name: "Operária Beemote",
      hp: 140, dmg: 10, range: 170, fire: 0.55, speed: 72, size: 16, color: "#ffc44a", kind: "mini_beemote", flying: true,
      blurb: "Operária da Imperatriz. Ferrão lento que envenena."
    },
    orb_escudo: {
      name: "Órbita-casca",
      hp: 95, dmg: 0, range: 0, fire: 0, speed: 0, size: 13, color: "#ffe08a", kind: "orbit_shield", codexHide: true,
      blurb: "Escudo vivo do Marechal. Orbita e toma tiro no lugar dele."
    },
    veu_clone: {
      name: "Mariposa-Véu",
      title: "Some entre os tiros",
      hp: 48, dmg: 0, range: 200, fire: 0.8, speed: 70, size: 30, color: "#c8a0ff", kind: "boss_veil", fake: true, flying: true, codexHide: true,
      blurb: "Cópia vazia da Mariposa. Atrasa, não mata."
    }
  };

  G.ENEMY_POOL = [
    "infantaria", "corredor", "escudeiro", "atirador", "tanque", "drone", "kamikaze",
    "medico", "artilharia", "fragmento", "sombra", "sniper", "ninho", "parasita", "criomante"
  ];
  G.BOSS_POOL = ["chefe_comandante", "chefe_megatanque", "chefe_fortaleza", "chefe_espectro"];

  (function attachEnemySkills() {
    var E = G.ENEMY_DEFS;
    E.infantaria.passive = { name: "Formação", desc: "Vem em grupo. Mandíbula de quitina, passo de soldado." };
    E.infantaria.active = { name: "Mandíbula", desc: "Morde de perto. Dano de contato." };
    E.corredor.passive = { name: "Patas longas", desc: "Corre mais que o resto do enxame." };
    E.corredor.active = { name: "Estalo", desc: "Fecha a distância rápido e corta quem tenta girar em volta." };
    E.escudeiro.passive = { name: "Carapaça", desc: "Elmo de besouro. Muita vida, passo lento." };
    E.escudeiro.active = { name: "Chifre", desc: "Empurra com o chifre no contato." };
    E.atirador.passive = { name: "Retaguarda", desc: "Fica atrás da linha e cospe de longe." };
    E.atirador.active = { name: "Cuspe ácido", desc: "Projétil corrosivo no aliado mais perto." };
    E.tanque.passive = { name: "Couraça híbrida", desc: "Inseto soldado à máquina. Demora pra cair." };
    E.tanque.active = { name: "Canhão orgânico", desc: "Projétil pesado de médio alcance." };
    E.drone.passive = { name: "Asas de sonda", desc: "Aéreo: ignora o chão e flanqueia." };
    E.drone.active = { name: "Ferrão rápido", desc: "Metralha de cima." };
    E.kamikaze.passive = { name: "Saco de esporos", desc: "Não atira. O corpo é a bomba." };
    E.kamikaze.active = { name: "Explosão", desc: "Estoura ao encostar, em área." };
    E.medico.passive = { name: "Glândula", desc: "Prioriza curar aliado ferido." };
    E.medico.active = { name: "Seiva", desc: "Restaura HP de um inimigo perto." };
    E.artilharia.passive = { name: "Abdômen-morteiro", desc: "Fica atrás e marca o chão antes de atirar." };
    E.artilharia.active = { name: "Morteiro", desc: "Aviso no chão, depois explosão química no esquadrão." };
    E.fragmento.passive = { name: "Instável", desc: "Ao morrer, parte em duas larvas." };
    E.fragmento.active = { name: "Embite", desc: "Dano de contato. A cisão só acontece na morte." };
    E.larva.passive = { name: "Enxame", desc: "Fraca sozinha, perigosa em grupo." };
    E.larva.active = { name: "Mordida", desc: "Dano de contato rápido." };
    E.sombra.passive = { name: "Camuflagem", desc: "Fica apagada longe. Só aparece perto pra matar." };
    E.sombra.active = { name: "Apunhalada", desc: "Fecha rápido e bate forte de perto." };
    E.sniper.passive = { name: "Rostro", desc: "Poucos tiros, cada um dói. Bico de percevejo." };
    E.sniper.active = { name: "Agulha", desc: "Projétil de longo alcance no aliado." };
    E.ninho.passive = { name: "Raiz", desc: "Quase não anda. O perigo é o que nasce dele." };
    E.ninho.active = { name: "Cria", desc: "Solta larvas de tempos em tempos." };
    E.parasita.passive = { name: "Aderência", desc: "Gruda num aliado e suga." };
    E.parasita.active = { name: "Infestação", desc: "Quem está grudado toma mais dano e atira mais devagar." };
    E.criomante.passive = { name: "Frente fria", desc: "Tiro gelado atrasa o passo do esquadrão." };
    E.criomante.active = { name: "Rajada fria", desc: "Cristais de gelo à distância." };
    E.chefe_comandante.passive = { name: "Carrasco da linha", desc: "Escudos orbitam nele. Só chama o próximo anel quando o atual morre e passam 10s desprotegido." };
    E.chefe_comandante.skills = [
      { type: "active", name: "Giro de fogo", desc: "Gira 360° no horário atirando pra todos os lados, depois repete no anti-horário.", icon: "💥" },
      { type: "active", name: "Guarda orbital", desc: "A cada 20% de HP chama um anel de escudos. Não chama outro enquanto algum estiver vivo. Quando o anel cai, fica 10s sem proteção.", icon: "🛡" }
    ];
    E.chefe_megatanque.passive = { name: "Rainha de choque", desc: "Voa como abelha: oito, zumbido, ferrão. Atropela quem fica na frente. Não atira no meio da carga." };
    E.chefe_megatanque.skills = [
      { type: "active", name: "Leque tóxico", desc: "Três ferrões em leque. Cada um envenena (5% da vida máxima em 5s, dano verdadeiro).", icon: "🦂" },
      { type: "active", name: "Investida", desc: "Mergulho de abelha, rápido pra valer. Durante a investida ela só atropela — não atira.", icon: "🐝" },
      { type: "active", name: "Ricochete", desc: "A cada 5 investidas, bate nas paredes 5 vezes com o rumo torto.", icon: "💥" },
      { type: "active", name: "Cria tóxica", desc: "A cada 30s invoca uma operária. Os ferrões também envenenam.", icon: "🐝" }
    ];
    E.chefe_fortaleza.passive = { name: "Muralha ambulante", desc: "Anda devagar e vomita reforço. Os minions dela não largam ouro nem reforço." };
    E.chefe_fortaleza.skills = [
      { type: "active", name: "Portão", desc: "Invoca formigas-soldado e estaladores do lado.", icon: "🏕" },
      { type: "active", name: "Fortificar", desc: "Se ninguém acerta ela por um tempo, estaciona, levanta escudo e cura 0,5%/s nela e nos aliados perto.", icon: "✚" },
      { type: "active", name: "Guarnição final", desc: "Ao cair, solta 10 inimigos aleatórios.", icon: "👁" }
    ];
    E.chefe_espectro.passive = { name: "Entre os tiros", desc: "Fica semitransparente. Tudo que ela invoca é isca: zero dano, só atrapalha mira, passo e cadência." };
    E.chefe_espectro.skills = [
      { type: "active", name: "Passo ao lado", desc: "Teleporta ao lado do alvo — nunca em cima.", icon: "🌫" },
      { type: "active", name: "Estouro do véu", desc: "A cada 3 a 6 saltos, o teleporte explode em área. O dano é só dela, não das iscas.", icon: "💥" },
      { type: "active", name: "Sósia", desc: "Solta um clone furtivo. Não dá dano: rouba a mira e aplica névoa (cadência e passo).", icon: "🕶" },
      { type: "active", name: "Corte duplo", desc: "Abaixo de 50% de HP, dois clones copiam os saltos. Se um cair, some por 30s.", icon: "👥" },
      { type: "active", name: "Névoa-isca", desc: "Mimetídeos invocados no teleporte também são isca: encostam, empurram e deixam o soldado lento e atirando menos.", icon: "🕸" }
    ];
    E.chefe_final.passive = { name: "Três camadas", desc: "Fase 1: a Colmeia protege. Fase 2: a Mariposa esconde. Fase 3: o núcleo exposto." };
    E.chefe_final.skills = [
      { type: "active", name: "Casca da colmeia", desc: "Enquanto a Colmeia viver, o núcleo não toma dano.", icon: "🏕" },
      { type: "active", name: "Véu do núcleo", desc: "Na segunda fase, a Mariposa-Véu ajuda ele a sumir enquanto a rajada continua.", icon: "🌫" },
      { type: "active", name: "Núcleo exposto", desc: "Raios, projéteis, cura, teleporte e invocação de tudo — inclusive chefes a cada 1–2 min.", icon: "👁" },
      { type: "active", name: "Zoom tático", desc: "Na última fase o campo abre e o mapa cresce.", icon: "☄" }
    ];
    E.mini_beemote.passive = { name: "Ferrão", desc: "Tiro envenena. 5% da vida máxima em 5s, dano verdadeiro." };
    E.mini_beemote.active = { name: "Aguilhão", desc: "Projétil lento que aplica veneno." };
  })();

  G.maxUnits = function () {
    return G.MAX_UNITS + (G.save.data.perm.maxUnits | 0);
  };

  G.soldierCount = function (state) {
    var n = 0;
    for (var i = 0; i < state.units.length; i++) {
      if (state.units[i].hp > 0 && !state.units[i].commander) n++;
    }
    return n;
  };

  G.playfield = function (state) {
    var z = state.camZoom || 1;
    var m = 10;
    return {
      x0: state.W / 2 * (1 - 1 / z) + m,
      y0: state.H / 2 * (1 - 1 / z) + m,
      x1: state.W / 2 * (1 + 1 / z) - m,
      y1: state.H / 2 * (1 + 1 / z) - m
    };
  };

  G.screenToWorld = function (state, sx, sy) {
    var z = state.camZoom || 1;
    return {
      x: (sx - state.W / 2) / z + state.W / 2,
      y: (sy - state.H / 2) / z + state.H / 2
    };
  };

  G.applyCamera = function (ctx, state) {
    var z = state.camZoom || 1;
    var lx = state.camLook && state.camLook.x != null ? state.camLook.x : state.W / 2;
    var ly = state.camLook && state.camLook.y != null ? state.camLook.y : state.H / 2;
    ctx.translate(state.W / 2, state.H / 2);
    ctx.scale(z, z);
    ctx.translate(-lx, -ly);
  };

  G.clampPlay = function (e, state) {
    var b = G.playfield(state);
    var m = (e.def && e.def.size) || 12;
    e.x = Math.max(b.x0 + m, Math.min(b.x1 - m, e.x));
    e.y = Math.max(b.y0 + m, Math.min(b.y1 - m, e.y));
  };

  G.createPlayerUnit = function (x, y, kind, run, perm) {
    kind = G.unitKind(kind);
    var def = G.UNIT_DEFS[kind] || G.UNIT_DEFS.recruta;
    var hpMul = (run && run.hp ? run.hp : 1) * (1 + (perm ? perm.hp : 0) * 0.1);
    var hp = Math.round(def.hp * hpMul);
    return {
      id: uid(),
      team: "player",
      kind: def.kind,
      gen: def.gen,
      commander: def.role === "commander",
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      rot: 0,
      hp: hp,
      maxHp: hp,
      cooldown: 0,
      flash: 0,
      rotor: Math.random() * Math.PI * 2,
      gait: Math.random() * Math.PI * 2,
      wheel: Math.random() * Math.PI * 2,
      held: false,
      parasite: 0,
      activeCd: 0,
      activeSlot: -1,
      activeFlash: 0,
      marked: 0,
      spawnT: def.spawn || 0,
      poisonT: 0,
      def: def
    };
  };

  G.createEnemy = function (type, x, y, scale) {
    var def = G.ENEMY_DEFS[type];
    var s = type === "larva" ? 1 : scale || 1;
    var hp = Math.round(def.hp * s);
    return {
      id: uid(),
      team: "enemy",
      type: type,
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      hp: hp,
      maxHp: hp,
      cooldown: 0,
      flash: 0,
      phase: Math.random() * Math.PI * 2,
      chargeT: type === "chefe_megatanque" ? 1.8 : 0,
      spawnT: 2.2,
      burstLeft: 0,
      burstCd: 0,
      contactCd: 0,
      slowT: 0,
      freezeT: 0,
      stealth: type === "sombra" ? 1 : 0,
      attached: null,
      warnT: 0,
      rot: 0,
      splits: !!def.splits,
      noDrop: false,
      fake: !!def.fake,
      decoy: !!def.fake,
      orbitHost: 0,
      orbitIndex: 0,
      guardianId: 0,
      helperOf: 0,
      bossPhase: type === "chefe_final" ? 1 : 0,
      lastHitT: 0,
      parked: false,
      spinMode: 0,
      spinT: 0,
      skillT: 3.2,
      shieldBand: 0,
      shieldLockT: 0,
      shieldPending: false,
      chargeCount: 0,
      ricoLeft: 0,
      miniT: 30,
      tpCount: 0,
      nextBoom: 3 + ((Math.random() * 4) | 0),
      cloneCd: [0, 0],
      veilRage: false,
      coreHealT: 6,
      coreRayT: 2.4,
      coreSummonT: 75,
      def: def
    };
  };

  G.createProjectile = function (opt) {
    return {
      id: uid(),
      x: opt.x,
      y: opt.y,
      vx: opt.vx,
      vy: opt.vy,
      dmg: opt.dmg,
      team: opt.team,
      kind: opt.kind || "bullet",
      life: opt.life || 1.2,
      r: opt.r || 3,
      ricochet: !!opt.ricochet,
      pierce: !!opt.pierce,
      homing: !!opt.homing,
      homeId: opt.homeId || 0,
      homeCursor: !!opt.homeCursor,
      poison: !!opt.poison,
      fake: !!opt.fake,
      boomR: opt.boomR || 0,
      hitIds: {},
      hitsLeft: opt.hitsLeft || 1,
      wallBounce: opt.wallBounce || 0,
      bounceMul: opt.bounceMul || 3,
      eraseShots: !!opt.eraseShots,
      stealShots: !!opt.stealShots,
      ownerKind: opt.ownerKind || "",
      fromId: opt.fromId || 0,
      pairId: opt.pairId || 0,
      sticky: !!opt.sticky,
      arc: opt.arc || null,
      z: opt.z || 0
    };
  };

  G.createDrop = function (x, y, kind, extra) {
    return {
      id: uid(),
      x: x,
      y: y,
      kind: kind,
      value: extra && extra.value ? extra.value : 1,
      unitKind: extra && extra.unitKind ? extra.unitKind : "recruta",
      t: 0
    };
  };

  G.createFloater = function (x, y, text, color) {
    return { x: x, y: y, text: text, color: color || "#fff", life: 0.7, max: 0.7 };
  };

  G.burst = function (state, x, y, color, n, speed) {
    n = n || 10;
    speed = speed || 90;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = speed * (0.4 + Math.random());
      state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.25,
        max: 0.6,
        size: 2 + Math.random() * 3,
        color: color
      });
    }
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function hpBar(ctx, e) {
    if (e.def.boss) return;
    if (e.hp >= e.maxHp * 0.98) return;
    var w = Math.max(16, e.def.size * 2);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(e.x - w / 2, e.y - e.def.size - 10, w, 4);
    ctx.fillStyle = e.team === "player" ? "#6cff7a" : "#ff5a5a";
    ctx.fillRect(e.x - w / 2, e.y - e.def.size - 10, w * (e.hp / e.maxHp), 4);
  }

  function label(ctx, u) {
    ctx.font = "bold 9px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(u.def.short, 0.5, u.def.size + 3);
    ctx.fillStyle = u.def.accent;
    ctx.fillText(u.def.short, 0, u.def.size + 2);
  }

  function hexParts(hex) {
    hex = String(hex || "#888888").replace("#", "");
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return [parseInt(hex.slice(0, 2), 16) || 0, parseInt(hex.slice(2, 4), 16) || 0, parseInt(hex.slice(4, 6), 16) || 0];
  }

  function liftCol(hex, t) {
    var p = hexParts(hex);
    return "rgb(" + Math.round(p[0] + (255 - p[0]) * t) + "," + Math.round(p[1] + (255 - p[1]) * t) + "," + Math.round(p[2] + (255 - p[2]) * t) + ")";
  }

  function dimCol(hex, t) {
    var p = hexParts(hex);
    return "rgb(" + Math.round(p[0] * t) + "," + Math.round(p[1] * t) + "," + Math.round(p[2] * t) + ")";
  }

  function gleam(ctx, x, y, rx, ry, a) {
    ctx.fillStyle = "rgba(255,255,255," + a + ")";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, -0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  function fillRound(ctx, x, y, w, h, r, color) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
  }

  function soldierLegs(ctx, s, gait, moving, color) {
    var amp = moving ? s * 0.38 : s * 0.07;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (var i = 0; i < 2; i++) {
      var side = i ? 1 : -1;
      var phase = gait + (i ? Math.PI : 0);
      var swing = Math.sin(phase) * amp;
      var lift = moving ? Math.max(0, Math.cos(phase)) * s * 0.15 : 0;
      var y = side * s * 0.2;
      ctx.strokeStyle = dimCol(color, 0.45);
      ctx.lineWidth = Math.max(2.8, s * 0.22);
      ctx.beginPath();
      ctx.moveTo(-s * 0.04, y);
      ctx.lineTo(swing * 0.5, y + side * (s * 0.2 - lift * 0.55));
      ctx.lineTo(swing, y + side * (s * 0.46 - lift * 0.22));
      ctx.stroke();
      oval(ctx, swing + 1, y + side * (s * 0.48 - lift * 0.2), s * 0.16, s * 0.09, "#161018");
    }
  }

  function drawWheel(ctx, x, y, r, ang, rim) {
    oval(ctx, x, y, r, r * 0.42, "#12151c");
    oval(ctx, x, y, r * 0.86, r * 0.34, rim || "#3a4250");
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.42);
    ctx.rotate(ang);
    ctx.strokeStyle = "rgba(220,230,240,0.7)";
    ctx.lineWidth = Math.max(1.1, r * 0.16);
    ctx.lineCap = "round";
    for (var i = 0; i < 4; i++) {
      var a = (Math.PI / 2) * i;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18);
      ctx.lineTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72);
      ctx.stroke();
    }
    ctx.restore();
    oval(ctx, x, y, r * 0.22, r * 0.1, "#8a94a4");
  }

  function drawTreads(ctx, x, y, w, h, scroll) {
    fillRound(ctx, x, y, w, h, 3, "#141820");
    ctx.save();
    roundRect(ctx, x, y, w, h, 3);
    ctx.clip();
    ctx.fillStyle = "#2c3444";
    var gap = 6;
    var off = ((scroll % gap) + gap) % gap;
    for (var i = -1; i < w / gap + 2; i++) {
      ctx.fillRect(x + i * gap + off, y + 1, 3.2, h - 2);
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, 3);
    ctx.stroke();
  }

  function visor(ctx, x, y, w, h, color) {
    fillRound(ctx, x, y, w, h, 2, color);
    gleam(ctx, x + w * 0.35, y + h * 0.28, w * 0.28, h * 0.18, 0.35);
  }

  function barrel(ctx, x, y, len, thick, color) {
    fillRound(ctx, x, y - thick / 2, len, thick, 1.4, color || "#121828");
    fillRound(ctx, x + len - 5, y - thick / 2 - 1, 6, thick + 2, 1, "#2a3448");
  }

  function rotorDisc(ctx, s, ang, span) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#d8f4ff";
    ctx.beginPath();
    ctx.arc(0, 0, span, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.rotate(ang);
    ctx.strokeStyle = "rgba(230,248,255,0.85)";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-span, 0);
    ctx.lineTo(span, 0);
    ctx.moveTo(0, -span);
    ctx.lineTo(0, span);
    ctx.stroke();
    ctx.restore();
  }

  function commanderFallPose(t) {
    t = Math.max(0, t || 0);
    if (t < 0.28) {
      var a = t / 0.28;
      return { rot: -0.16 * (1 - a) + 0.1 * a, sink: 2 + a * 3, squish: 1.05 - a * 0.03, ring: 1 - a };
    }
    if (t < 1.55) {
      var b = (t - 0.28) / 1.27;
      b = b * b * (3 - 2 * b);
      return { rot: 0.1 + b * 0.52, sink: 5 + b * 9, squish: 1.02 - b * 0.06, ring: 0 };
    }
    if (t < 2.55) {
      var c = (t - 1.55) / 1.0;
      var e = 1 - (1 - c) * (1 - c);
      return { rot: 0.62 + e * 0.94, sink: 14 + e * 5, squish: 0.96 - e * 0.08, ring: 0 };
    }
    var d = Math.min(1, (t - 2.55) / 0.7);
    var bounce = Math.sin(d * Math.PI) * 0.07 * (1 - d);
    return { rot: 1.56 - bounce, sink: 19, squish: 0.88 + bounce * 0.35, ring: 0 };
  }

  G.drawPlayerUnit = function (ctx, u, time) {
    var s = u.def.size;
    var lift = u.held ? 6 : 0;
    var role = u.def.role;
    var kind = u.kind;
    var timeN = time || 0;
    var idOff = (u.id || 1) * 0.71;
    var fallT = u.fallT || 0;
    var falling = !!(u.commander && fallT > 0);
    var pose = falling ? commanderFallPose(fallT) : null;
    var spd = Math.hypot(u.vx || 0, u.vy || 0);
    var moving = !u.held && !falling && spd > 24;
    var breath = falling ? 1 : 1 + Math.sin(timeN * 3.3 + idOff) * (u.def.flying ? 0.016 : 0.042);
    var gait = u.gait || 0;
    var wheel = u.wheel || 0;
    var bob = moving && !u.def.flying ? Math.abs(Math.sin(gait * 2)) * s * 0.06 : 0;
    var hover = u.def.flying && !falling ? Math.sin(timeN * 5.2 + idOff) * 2.4 : 0;
    var col = u.def.color;
    var acc = u.def.accent;
    ctx.save();
    ctx.translate(u.x, u.y - lift - bob - hover + (pose ? pose.sink : 0));
    if (u.flash > 0) ctx.globalAlpha = 0.65;
    if (falling) ctx.globalAlpha *= 0.92;
    ctx.fillStyle = "rgba(0,0,0," + (falling ? 0.42 : 0.32) + ")";
    ctx.beginPath();
    ctx.ellipse(
      falling ? 10 : (u.def.flying ? 4 : 0),
      s * (u.def.flying ? 1.28 : 0.95) + hover,
      s * (falling ? 1.15 : (u.def.flying ? 0.7 : 0.95)),
      s * (falling ? 0.22 : (u.def.flying ? 0.2 : 0.32)),
      falling ? 0.4 : 0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    if (role === "commander" && !(pose && pose.ring < 0.15)) {
      var ringA = pose ? pose.ring : 1;
      ctx.globalAlpha *= ringA;
      ctx.strokeStyle = "rgba(255, 224, 138, 0.4)";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(0, 2, s + 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#ffe08a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 2, s + 8, 0, Math.PI * 2);
      ctx.stroke();
      if (pose) ctx.globalAlpha /= ringA || 1;
    }
    ctx.rotate((u.rot || 0) + (pose ? pose.rot : 0));
    if (pose) ctx.scale(1, pose.squish);

    if (role === "commander") {
      soldierLegs(ctx, s, falling ? 0 : gait, moving, "#2a1a08");
      var cape = falling ? s * 0.22 : Math.sin(timeN * 4.2 + idOff) * s * 0.14;
      ctx.fillStyle = "#3a2208";
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.25);
      ctx.quadraticCurveTo(-s * 1.25 + cape, falling ? s * 0.35 : 0, -s * 0.35, s * 0.7);
      ctx.lineTo(-s * 0.05, s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.scale(breath, breath);
      oval(ctx, 0, 0, s * 0.78, s * 0.92, dimCol(col, falling ? 0.55 : 0.72));
      oval(ctx, 0.6, -0.4, s * 0.68, s * 0.82, falling ? dimCol(col, 0.82) : col);
      gleam(ctx, -s * 0.18, -s * 0.28, s * 0.28, s * 0.16, falling ? 0.06 : 0.2);
      ctx.fillStyle = "#8a1a1a";
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.08);
      ctx.lineTo(s * 0.62, s * 0.12);
      ctx.lineTo(s * 0.55, s * 0.32);
      ctx.lineTo(-s * 0.55, s * 0.1);
      ctx.closePath();
      ctx.fill();
      oval(ctx, 0, -s * 0.52, s * 0.62, s * 0.26, "#2a1a00");
      ctx.fillStyle = "#ffe08a";
      ctx.fillRect(-s * 0.66, -s * 0.48, s * 1.32, 3);
      visor(ctx, s * 0.08, -s * 0.18, s * 0.42, s * 0.28, falling ? "#0a1018" : "#0b1a33");
      ctx.fillStyle = falling ? "#c8a84a" : "#ffe08a";
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.12);
      ctx.lineTo(s * 0.2, s * 0.26);
      ctx.lineTo(-s * 0.2, s * 0.26);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      barrel(ctx, s * 0.35, falling ? s * 0.18 : 0, s * 0.85, 4, "#0b1a33");
      if (!falling) {
        ctx.strokeStyle = "#fff4c4";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, s + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (u.def.flying && (role === "drone")) {
      var arm = s * 0.85;
      for (var d = 0; d < 4; d++) {
        var da = (Math.PI / 2) * d + Math.PI / 4;
        var dx = Math.cos(da) * arm;
        var dy = Math.sin(da) * arm;
        ctx.strokeStyle = dimCol(col, 0.55);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(dx, dy);
        ctx.stroke();
        ctx.save();
        ctx.translate(dx, dy);
        rotorDisc(ctx, s, (u.rotor || 0) + d, s * 0.38);
        ctx.restore();
      }
      ctx.save();
      ctx.scale(breath, breath);
      oval(ctx, 0, 0, s * 0.48, s * 0.38, dimCol(col, 0.7));
      oval(ctx, 0, 0, s * 0.38, s * 0.28, col);
      visor(ctx, s * 0.02, -s * 0.12, s * 0.32, s * 0.22, acc);
      gleam(ctx, -s * 0.1, -s * 0.08, s * 0.14, s * 0.08, 0.28);
      ctx.restore();
    } else if (u.def.flying) {
      rotorDisc(ctx, s, u.rotor || 0, s * 1.48);
      ctx.save();
      ctx.scale(1, breath);
      fillRound(ctx, -s * 0.95, -s * 0.32, s * 1.55, s * 0.64, 7, dimCol(col, 0.62));
      fillRound(ctx, -s * 0.82, -s * 0.24, s * 1.35, s * 0.48, 6, col);
      visor(ctx, s * 0.05, -s * 0.16, s * 0.42, s * 0.3, "#083040");
      gleam(ctx, -s * 0.35, -s * 0.12, s * 0.28, s * 0.1, 0.2);
      if (role === "gunship" || kind === "bombardeiro") {
        fillRound(ctx, -s * 0.2, s * 0.18, s * 0.7, s * 0.16, 2, "#1a2430");
        oval(ctx, s * 0.15, s * 0.28, 3, 3, "#ff7a2a");
      }
      ctx.restore();
      fillRound(ctx, -s * 1.15, -3, s * 0.4, 6, 2, dimCol(col, 0.5));
      barrel(ctx, s * 0.45, 0, s * 0.7, role === "gunship" ? 5 : 3.5, "#0b1a33");
      ctx.save();
      ctx.translate(-s * 1.05, 0);
      ctx.rotate((u.rotor || 0) * 1.8);
      ctx.strokeStyle = "rgba(230,248,255,0.7)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-s * 0.28, 0);
      ctx.lineTo(s * 0.28, 0);
      ctx.stroke();
      ctx.restore();
    } else if (role === "colossus") {
      var piston = Math.sin(gait) * s * 0.06;
      fillRound(ctx, -s * 0.55, s * 0.35 + piston, s * 0.28, s * 0.42, 3, "#2a3848");
      fillRound(ctx, s * 0.22, s * 0.35 - piston, s * 0.28, s * 0.42, 3, "#2a3848");
      ctx.save();
      ctx.scale(breath, breath);
      fillRound(ctx, -s * 0.9, -s * 0.72, s * 1.8, s * 1.35, 8, "#4a6a88");
      fillRound(ctx, -s * 0.62, -s * 0.48, s * 1.2, s * 0.95, 7, col);
      gleam(ctx, -s * 0.28, -s * 0.32, s * 0.4, s * 0.16, 0.18);
      oval(ctx, s * 0.12, -s * 0.04, s * 0.28, s * 0.24, acc);
      ctx.strokeStyle = acc;
      ctx.globalAlpha = 0.55 + Math.sin(timeN * 6 + idOff) * 0.25;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s * 0.12, -s * 0.04, s * 0.36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
      barrel(ctx, s * 0.55, 0, s * 0.95, 7, "#0b1a33");
    } else if (role === "tank" || role === "minitank") {
      var scr = wheel * 18;
      drawTreads(ctx, -s * 1.05, -s * 0.62, s * 2.1, s * 0.28, scr);
      drawTreads(ctx, -s * 1.05, s * 0.34, s * 2.1, s * 0.28, scr);
      ctx.save();
      ctx.translate(0, Math.sin(timeN * 2.8 + idOff) * 0.6);
      fillRound(ctx, -s * 0.82, -s * 0.38, s * 1.64, s * 0.76, 5, dimCol(col, 0.55));
      fillRound(ctx, -s * 0.7, -s * 0.28, s * 1.4, s * 0.56, 5, col);
      gleam(ctx, -s * 0.28, -s * 0.16, s * 0.32, s * 0.1, 0.16);
      oval(ctx, s * 0.05, -s * 0.04, s * 0.38, s * 0.32, dimCol(col, 0.75));
      visor(ctx, s * 0.02, -s * 0.16, s * 0.36, s * 0.22, acc);
      barrel(ctx, s * 0.28, 0, s * 1.05, kind === "tanque" ? 7 : 5, acc);
      ctx.restore();
    } else if (role === "truck" || role === "bunker") {
      drawWheel(ctx, -s * 0.62, -s * 0.52, s * 0.28, wheel, "#4a5568");
      drawWheel(ctx, s * 0.55, -s * 0.52, s * 0.28, wheel, "#4a5568");
      drawWheel(ctx, -s * 0.62, s * 0.52, s * 0.28, wheel, "#4a5568");
      drawWheel(ctx, s * 0.55, s * 0.52, s * 0.28, wheel, "#4a5568");
      ctx.save();
      ctx.translate(0, Math.sin(timeN * 2.5 + idOff) * 0.5);
      fillRound(ctx, -s * 1.05, -s * 0.42, s * 2.1, s * 0.84, 4, "#2a3848");
      fillRound(ctx, -s * 0.55, -s * 0.5, s * 1.15, s * 0.78, 5, col);
      visor(ctx, s * 0.15, -s * 0.28, s * 0.42, s * 0.36, "#c8dce8");
      gleam(ctx, -s * 0.2, -s * 0.22, s * 0.28, s * 0.1, 0.14);
      if (role === "bunker") {
        fillRound(ctx, -s * 0.35, -s * 0.72, s * 0.7, s * 0.28, 3, acc);
      }
      ctx.restore();
    } else if (role === "miner" || role === "engineer") {
      drawWheel(ctx, -s * 0.55, -s * 0.48, s * 0.24, wheel, "#3a3220");
      drawWheel(ctx, s * 0.5, -s * 0.48, s * 0.24, wheel, "#3a3220");
      drawWheel(ctx, -s * 0.55, s * 0.48, s * 0.24, wheel, "#3a3220");
      drawWheel(ctx, s * 0.5, s * 0.48, s * 0.24, wheel, "#3a3220");
      fillRound(ctx, -s * 0.92, -s * 0.34, s * 1.84, s * 0.68, 4, "#2a2208");
      ctx.save();
      ctx.scale(breath, breath);
      oval(ctx, 0, -s * 0.08, s * 0.7, s * 0.58, col);
      visor(ctx, s * 0.08, -s * 0.22, s * 0.32, s * 0.24, "#111");
      gleam(ctx, -s * 0.16, -s * 0.18, s * 0.2, s * 0.08, 0.18);
      ctx.restore();
      fillRound(ctx, s * 0.2, -3, s * 0.85, 5, 1, "#111");
    } else if (role === "tesla" || role === "missile") {
      soldierLegs(ctx, s * 0.92, gait, moving, dimCol(col, 0.4));
      ctx.save();
      ctx.scale(breath, breath);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(s * 1.05, 0);
      ctx.lineTo(-s * 0.62, -s * 0.7);
      ctx.lineTo(-s * 0.28, 0);
      ctx.lineTo(-s * 0.62, s * 0.7);
      ctx.closePath();
      ctx.fill();
      gleam(ctx, -s * 0.1, -s * 0.18, s * 0.22, s * 0.1, 0.2);
      visor(ctx, s * 0.12, -s * 0.16, s * 0.32, s * 0.3, acc);
      if (role === "tesla") {
        ctx.strokeStyle = acc;
        ctx.globalAlpha = 0.55 + Math.sin(timeN * 18) * 0.35;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(-s * 0.15, 0, s * 0.38 + Math.sin(timeN * 12) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        fillRound(ctx, -s * 0.55, -s * 0.22, s * 0.55, 5, 2, acc);
        fillRound(ctx, -s * 0.55, s * 0.12, s * 0.55, 5, 2, acc);
      }
      ctx.restore();
    } else {
      var vest = dimCol(col, 0.55);
      soldierLegs(ctx, s, gait, moving, vest);
      ctx.save();
      ctx.scale(breath, 1 + (breath - 1) * 0.6);
      oval(ctx, 0, 0, s * 0.78, s * 0.7, vest);
      oval(ctx, s * 0.04, -s * 0.04, s * 0.62, s * 0.55, col);
      gleam(ctx, -s * 0.12, -s * 0.18, s * 0.24, s * 0.1, 0.2);
      oval(ctx, s * 0.1, -s * 0.02, s * 0.34, s * 0.32, dimCol(col, 0.62));
      visor(ctx, s * 0.16, -s * 0.16, s * 0.3, s * 0.28, "#0b1a33");
      if (role === "medic" || role === "surgeon" || role === "chaplain") {
        ctx.fillStyle = role === "chaplain" ? "#c9a227" : "#c02020";
        ctx.fillRect(-2.5, -s * 0.42, 5, 14);
        ctx.fillRect(-7, -s * 0.32, 14, 5);
      }
      if (role === "radio" || kind === "oficial" || kind === "bandeira") {
        ctx.strokeStyle = acc;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, -s * 0.2);
        ctx.quadraticCurveTo(-s * 0.55, -s * 0.85, -s * 0.15, -s * 1.05);
        ctx.stroke();
        oval(ctx, -s * 0.12, -s * 1.05, 2.4, 2.4, acc);
      }
      if (role === "flamer" || role === "inferno") {
        oval(ctx, -s * 0.55, 0, s * 0.28, s * 0.34, "#7a2a10");
        oval(ctx, -s * 0.55, 0, s * 0.16, s * 0.2, "#ffd27a");
      }
      if (kind === "fantasma") {
        ctx.globalAlpha = 0.55 + Math.sin(timeN * 5) * 0.12;
        oval(ctx, 0, 0, s * 0.85, s * 0.75, "rgba(160,144,255,0.25)");
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      var gunLen = s * (role === "sniper" || role === "observer" ? 1.35 : role === "mg" || role === "grenadier" ? 1.1 : 0.78);
      var gunTh = role === "mg" ? 6 : role === "flamer" || role === "inferno" ? 7 : 3.6;
      if (role === "flamer" || role === "inferno") {
        ctx.fillStyle = acc;
        ctx.beginPath();
        ctx.moveTo(s * 0.2, -5);
        ctx.lineTo(s + 10, 0);
        ctx.lineTo(s * 0.2, 5);
        ctx.closePath();
        ctx.fill();
      } else {
        barrel(ctx, s * 0.28, -2, gunLen, gunTh, "#121828");
        if (role === "dual" || role === "outlaw") barrel(ctx, s * 0.28, 4, gunLen * 0.85, 3.2, "#121828");
      }
      if (role === "scout" || role === "stealth" || role === "assassin") {
        ctx.fillStyle = dimCol(col, 0.4);
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, -s * 0.35);
        ctx.lineTo(-s * 0.85, 0);
        ctx.lineTo(-s * 0.2, s * 0.35);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (u.parasite > 0) {
      ctx.fillStyle = "#b44aff";
      ctx.beginPath();
      ctx.arc(s * 0.5, -s * 0.4, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (u.veilFogT > 0) {
      ctx.strokeStyle = "rgba(200, 160, 255, 0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s + 11, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (u.preview) return;
    if (!falling) {
      ctx.save();
      ctx.translate(u.x, u.y - lift);
      label(ctx, u);
      ctx.restore();
      hpBar(ctx, u);
      drawActiveMark(ctx, u, time);
    }
  };

  function drawActiveMark(ctx, u, time) {
    time = time || 0;
    var s = u.def.size;
    if (u.marked > 0) {
      ctx.save();
      ctx.strokeStyle = "#ffe08a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(u.x, u.y, s + 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(u.x - 5, u.y - s - 14);
      ctx.lineTo(u.x, u.y - s - 6);
      ctx.lineTo(u.x + 5, u.y - s - 14);
      ctx.closePath();
      ctx.fillStyle = "#ffe08a";
      ctx.fill();
      ctx.restore();
    }
    if (!u.def.active || (u.activeSlot | 0) < 0) return;
    var meta = G.activeMeta(u.def.active.id);
    var ready = u.activeCd <= 0;
    ctx.save();
    ctx.lineWidth = 2.4;
    if (ready) {
      ctx.globalAlpha = 0.5 + Math.sin(time * 7) * 0.35;
      ctx.strokeStyle = meta.color;
      ctx.beginPath();
      ctx.arc(u.x, u.y, s + 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = "rgba(255,210,74,0.22)";
      ctx.beginPath();
      ctx.arc(u.x, u.y, s + 9, 0, Math.PI * 2);
      ctx.stroke();
      var frac = 1 - Math.max(0, u.activeCd) / (u.def.active.cd || 1);
      ctx.strokeStyle = meta.color;
      ctx.beginPath();
      ctx.arc(u.x, u.y, s + 9, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
    }
    if (u.activeFlash > 0) {
      ctx.globalAlpha = Math.min(1, u.activeFlash * 2);
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(u.x, u.y, s + 16 + (0.4 - u.activeFlash) * 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    var bx = u.x + s * 0.85;
    var by = u.y - s - 6;
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.beginPath();
    ctx.arc(bx, by, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ready ? meta.color : "#9aa4b8";
    ctx.font = "bold 11px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String((u.activeSlot | 0) + 1), bx, by + 0.5);
    ctx.font = "12px Segoe UI, sans-serif";
    ctx.fillText(meta.icon, bx, by - 16);
    ctx.restore();
  }

  function oval(ctx, x, y, rx, ry, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function eye(ctx, x, y, r, glow) {
    oval(ctx, x, y, r, r * 0.82, glow || "#1a0808");
    oval(ctx, x - r * 0.28, y - r * 0.28, r * 0.32, r * 0.26, "#fff8d0");
  }

  function mandibles(ctx, s, color) {
    ctx.fillStyle = color || "#2a1008";
    ctx.beginPath();
    ctx.moveTo(s * 0.5, -s * 0.12);
    ctx.quadraticCurveTo(s * 1.15, -s * 0.5, s * 1.28, -s * 0.04);
    ctx.lineTo(s * 0.55, 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.12);
    ctx.quadraticCurveTo(s * 1.15, s * 0.5, s * 1.28, s * 0.04);
    ctx.lineTo(s * 0.55, -0.02);
    ctx.closePath();
    ctx.fill();
  }

  var drawPhase = 0;

  function insectLegs(ctx, s, n, color) {
    var phase = drawPhase;
    ctx.strokeStyle = color || "#2a1408";
    ctx.lineWidth = Math.max(1.4, s * 0.1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    n = n || 3;
    for (var i = 0; i < n; i++) {
      var y = (i - (n - 1) / 2) * s * 0.38;
      var gait = phase * 11 + i * 1.15;
      var swingR = Math.sin(gait) * s * 0.32;
      var liftR = Math.max(0, Math.cos(gait)) * s * 0.16;
      var swingL = Math.sin(gait + Math.PI) * s * 0.32;
      var liftL = Math.max(0, Math.cos(gait + Math.PI)) * s * 0.16;
      ctx.beginPath();
      ctx.moveTo(2, y);
      ctx.lineTo(s * 0.42 + swingR * 0.55, y + s * 0.22 - liftR);
      ctx.lineTo(s * 0.88 + swingR, y + s * 0.52 - liftR * 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-2, y);
      ctx.lineTo(-s * 0.42 + swingL * 0.55, y + s * 0.22 - liftL);
      ctx.lineTo(-s * 0.88 + swingL, y + s * 0.52 - liftL * 0.25);
      ctx.stroke();
    }
  }

  function buzzWings(ctx, s, phase, scale) {
    scale = scale || 1;
    var flap = 0.45 + Math.sin(phase * 48) * 0.45;
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = "rgba(210, 240, 255, 0.7)";
    ctx.beginPath();
    ctx.ellipse(s * 0.08, -s * 0.62, s * 1.05 * scale, s * (0.18 + flap * 0.32) * scale, -0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.08, s * 0.62, s * 1.05 * scale, s * (0.18 + flap * 0.32) * scale, 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function beeBody(ctx, e, s, queen) {
    var ph = e.phase || 0;
    buzzWings(ctx, s, ph, queen ? 1.35 : 1);
    insectLegs(ctx, s * 0.7, 3, "#1a0c04");
    var aw = queen ? s * 1.05 : s * 0.78;
    var ah = queen ? s * 0.62 : s * 0.46;
    oval(ctx, -s * 0.55, 0, aw, ah, "#1a0c04");
    oval(ctx, -s * 0.55, 0, aw * 0.9, ah * 0.86, queen ? "#f0b42a" : "#ffc44a");
    ctx.fillStyle = "#1a0c04";
    var stripes = queen ? 5 : 3;
    for (var i = 0; i < stripes; i++) {
      var x = -s * 0.12 - i * (queen ? s * 0.26 : s * 0.28);
      ctx.fillRect(x - (queen ? 3.5 : 2.4), -ah * 0.84, queen ? 7 : 5, ah * 1.68);
    }
    ctx.fillStyle = "#c8fff0";
    ctx.beginPath();
    ctx.moveTo(-s * 0.55 - aw + 2, 0);
    ctx.lineTo(-s * 0.55 - aw - s * 0.42, -3);
    ctx.lineTo(-s * 0.55 - aw - s * (queen ? 0.7 : 0.5), 0);
    ctx.lineTo(-s * 0.55 - aw - s * 0.42, 3);
    ctx.closePath();
    ctx.fill();
    oval(ctx, s * 0.08, 0, s * (queen ? 0.55 : 0.42), s * (queen ? 0.48 : 0.36), "#3a2208");
    oval(ctx, s * 0.08, 0, s * (queen ? 0.42 : 0.3), s * (queen ? 0.36 : 0.26), queen ? "#d49020" : "#e8a028");
    if (queen) {
      oval(ctx, s * 0.08, 0, s * 0.16, s * 0.16, "#7af7ff");
      ctx.strokeStyle = "rgba(122, 247, 255, 0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s * 0.08, 0, s * 0.28 + Math.sin(ph * 6) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    oval(ctx, s * 0.62, 0, s * (queen ? 0.42 : 0.32), s * (queen ? 0.36 : 0.28), "#2a1808");
    oval(ctx, s * 0.62, 0, s * (queen ? 0.32 : 0.24), s * (queen ? 0.28 : 0.2), "#5a3010");
    eye(ctx, s * 0.78, -s * 0.14, s * (queen ? 0.16 : 0.11), "#1a3040");
    eye(ctx, s * 0.78, s * 0.14, s * (queen ? 0.16 : 0.11), "#1a3040");
    mandibles(ctx, s * (queen ? 0.85 : 0.7), "#1a0c04");
    ctx.strokeStyle = "#1a0c04";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(s * 0.7, -s * 0.22);
    ctx.quadraticCurveTo(s * 1.15, -s * 0.7, s * 1.35, -s * 0.85);
    ctx.moveTo(s * 0.7, s * 0.22);
    ctx.quadraticCurveTo(s * 1.15, s * 0.7, s * 1.35, s * 0.85);
    ctx.stroke();
    if (queen) {
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.moveTo(s * 0.35, -s * 0.42);
      ctx.lineTo(s * 0.55, -s * 0.92);
      ctx.lineTo(s * 0.72, -s * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#7af7ff";
      ctx.fillRect(-s * 0.15, -3, s * 0.7, 6);
    }
  }

  G.drawEnemy = function (ctx, e) {
    var s = e.def.size;
    var ph = e.phase || 0;
    var t = e.type;
    drawPhase = ph;
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.flash > 0) ctx.globalAlpha = 0.6;
    if (e.stealth > 0.2) ctx.globalAlpha *= 0.28;
    var fly = !!(e.def && e.def.flying);
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(fly ? 5 : 0, s * (fly ? 1.35 : 0.85), s * (fly ? 0.62 : 0.85), s * (fly ? 0.18 : 0.3), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(e.rot || 0);

    if (t === "orb_escudo") {
      oval(ctx, 0, 0, s, s, "#ffe08a");
      ctx.strokeStyle = "#fff4c4";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, s + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(200, 140, 40, 0.7)";
      ctx.lineWidth = 1.4;
      for (var hx = 0; hx < 6; hx++) {
        var ha = (Math.PI / 3) * hx;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ha) * s * 0.3, Math.sin(ha) * s * 0.3);
        ctx.lineTo(Math.cos(ha) * s, Math.sin(ha) * s);
        ctx.stroke();
      }
    } else if (t === "chefe_megatanque" || t === "mini_beemote") {
      beeBody(ctx, e, s, t === "chefe_megatanque");
    } else if (t === "chefe_comandante") {
      insectLegs(ctx, s, 3, "#3a2208");
      oval(ctx, -s * 0.35, 0, s * 0.95, s * 0.7, "#3a2208");
      oval(ctx, -s * 0.35, 0, s * 0.82, s * 0.58, "#c48a20");
      ctx.fillStyle = "#5a3010";
      for (var sg = 0; sg < 4; sg++) ctx.fillRect(-s * 0.9 + sg * s * 0.28, -s * 0.5, 5, s);
      oval(ctx, s * 0.35, 0, s * 0.55, s * 0.5, "#8a5a18");
      oval(ctx, s * 0.85, 0, s * 0.42, s * 0.38, "#d4a024");
      eye(ctx, s * 1.02, -s * 0.12, s * 0.14, "#1a0808");
      eye(ctx, s * 1.02, s * 0.12, s * 0.14, "#1a0808");
      mandibles(ctx, s * 0.9, "#2a1408");
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.moveTo(s * 0.55, -s * 0.4);
      ctx.lineTo(s * 0.72, -s * 0.95);
      ctx.lineTo(s * 0.95, -s * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#3a2010";
      ctx.fillRect(s * 0.15, -s * 0.72, s * 0.7, 7);
      ctx.fillStyle = "#ffd24a";
      ctx.fillRect(s * 0.55, -4, s * 0.95, 8);
    } else if (t === "chefe_fortaleza") {
      ctx.strokeStyle = "#4a1848";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      for (var lg = 0; lg < 4; lg++) {
        var ly = -s * 0.55 + lg * s * 0.38;
        var gaitF = drawPhase * 6 + lg * 0.9;
        var swingF = Math.sin(gaitF) * 10;
        var liftF = Math.max(0, Math.cos(gaitF)) * 8;
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, ly);
        ctx.quadraticCurveTo(-s * 0.9, ly + 18 - liftF, -s * 1.35 + swingF, ly + 28);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * 0.2, ly);
        ctx.quadraticCurveTo(s * 0.9, ly + 18 - Math.max(0, Math.cos(gaitF + Math.PI)) * 8, s * 1.35 + Math.sin(gaitF + Math.PI) * 10, ly + 28);
        ctx.stroke();
      }
      roundRect(ctx, -s * 0.95, -s * 0.85, s * 1.9, s * 1.7, 8);
      ctx.fillStyle = "#6a2468";
      ctx.fill();
      ctx.fillStyle = "#c45cff";
      roundRect(ctx, -s * 0.7, -s * 0.62, s * 1.4, s * 1.25, 6);
      ctx.fill();
      ctx.fillStyle = "#3a1030";
      for (var cell = 0; cell < 8; cell++) {
        var cx = -s * 0.5 + (cell % 4) * s * 0.34;
        var cy = -s * 0.35 + Math.floor(cell / 4) * s * 0.5;
        ctx.beginPath();
        for (var hi = 0; hi < 6; hi++) {
          var ha2 = (Math.PI / 3) * hi;
          var fn = hi ? ctx.lineTo : ctx.moveTo;
          fn.call(ctx, cx + Math.cos(ha2) * 6, cy + Math.sin(ha2) * 6);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#e8a0ff";
      ctx.fillRect(-s * 0.22, -s * 1.25, s * 0.44, s * 0.5);
      oval(ctx, 0, -s * 0.1, s * 0.22, s * 0.22, "#fff");
      oval(ctx, 0, -s * 0.1, s * 0.12, s * 0.12, "#3a1030");
    } else if (t === "chefe_espectro" || t === "veu_clone") {
      ctx.globalAlpha *= t === "veu_clone" ? 0.55 : 0.82;
      var wing = 0.85 + Math.sin(ph * 8) * 0.12;
      ctx.fillStyle = "#6a48a8";
      ctx.beginPath();
      ctx.ellipse(-s * 0.15, -s * 0.15, s * 1.15 * wing, s * 0.72, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-s * 0.15, s * 0.15, s * 1.15 * wing, s * 0.72, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(232, 210, 255, 0.35)";
      ctx.beginPath();
      ctx.ellipse(-s * 0.2, -s * 0.2, s * 0.7 * wing, s * 0.4, -0.4, 0, Math.PI * 2);
      ctx.fill();
      oval(ctx, s * 0.15, 0, s * 0.42, s * 0.55, "#c8a0ff");
      oval(ctx, s * 0.55, 0, s * 0.32, s * 0.28, "#3a2458");
      eye(ctx, s * 0.68, -s * 0.1, s * 0.12, "#e8d0ff");
      eye(ctx, s * 0.68, s * 0.1, s * 0.12, "#e8d0ff");
      ctx.strokeStyle = "#e8d0ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s * 0.5, -s * 0.22);
      ctx.quadraticCurveTo(s * 0.9, -s * 0.95, s * 0.55, -s * 1.15);
      ctx.moveTo(s * 0.5, s * 0.22);
      ctx.quadraticCurveTo(s * 0.9, s * 0.95, s * 0.55, s * 1.15);
      ctx.stroke();
    } else if (t === "chefe_final") {
      ctx.strokeStyle = "rgba(255, 210, 80, 0.45)";
      ctx.lineWidth = 2;
      for (var ray = 0; ray < 8; ray++) {
        var ra = (Math.PI * 2 * ray) / 8 + ph * 0.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ra) * s * 0.4, Math.sin(ra) * s * 0.4);
        ctx.lineTo(Math.cos(ra) * (s * 1.15 + Math.sin(ph * 5 + ray) * 6), Math.sin(ra) * (s * 1.15 + Math.sin(ph * 5 + ray) * 6));
        ctx.stroke();
      }
      ctx.fillStyle = "#fff36a";
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = (Math.PI / 3) * i - Math.PI / 6;
        var fn = i ? ctx.lineTo : ctx.moveTo;
        fn.call(ctx, Math.cos(a) * s, Math.sin(a) * s);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#3a2010";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
      ctx.fill();
      oval(ctx, 0, 0, s * 0.22, s * 0.22, "#ff6a2a");
      oval(ctx, -s * 0.06, -s * 0.06, s * 0.08, s * 0.08, "#fff");
      ctx.strokeStyle = "#7af7ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.58 + Math.sin(ph * 4) * 3, 0, Math.PI * 2);
      ctx.stroke();
      mandibles(ctx, s * 0.55, "#5a3010");
    } else if (t === "infantaria") {
      insectLegs(ctx, s, 3, "#3a1808");
      oval(ctx, -s * 0.25, 0, s * 0.7, s * 0.42, "#8a3a18");
      ctx.fillStyle = "#5a220c";
      ctx.fillRect(-s * 0.55, -s * 0.32, 4, s * 0.64);
      ctx.fillRect(-s * 0.2, -s * 0.32, 4, s * 0.64);
      oval(ctx, s * 0.45, 0, s * 0.42, s * 0.36, "#c45a2a");
      eye(ctx, s * 0.58, -s * 0.1, s * 0.1);
      eye(ctx, s * 0.58, s * 0.1, s * 0.1);
      mandibles(ctx, s * 0.65, "#2a1008");
    } else if (t === "corredor") {
      insectLegs(ctx, s * 1.15, 3, "#5a3010");
      oval(ctx, -s * 0.15, 0, s * 0.95, s * 0.28, "#c47a20");
      oval(ctx, s * 0.7, 0, s * 0.28, s * 0.22, "#e8a03a");
      eye(ctx, s * 0.82, -s * 0.06, 3);
      eye(ctx, s * 0.82, s * 0.06, 3);
      ctx.fillStyle = "#3a1808";
      ctx.fillRect(s * 0.85, -1.5, s * 0.55, 3);
    } else if (t === "escudeiro") {
      insectLegs(ctx, s, 3, "#2a1808");
      oval(ctx, -s * 0.1, 0, s * 0.7, s * 0.55, "#4a2810");
      ctx.fillStyle = "#c8a060";
      ctx.beginPath();
      ctx.moveTo(s * 0.15, -s * 0.95);
      ctx.quadraticCurveTo(s * 1.15, 0, s * 0.15, s * 0.95);
      ctx.quadraticCurveTo(s * 0.55, 0, s * 0.15, -s * 0.95);
      ctx.fill();
      ctx.fillStyle = "#6a3a18";
      ctx.beginPath();
      ctx.moveTo(s * 0.9, 0);
      ctx.lineTo(s * 1.45, -s * 0.18);
      ctx.lineTo(s * 1.55, 0);
      ctx.lineTo(s * 1.45, s * 0.18);
      ctx.closePath();
      ctx.fill();
      eye(ctx, s * 0.35, -s * 0.18, s * 0.1);
    } else if (t === "atirador") {
      insectLegs(ctx, s * 0.8, 2, "#3a5010");
      oval(ctx, -s * 0.35, 0, s * 0.7, s * 0.5, "#5a8a18");
      oval(ctx, -s * 0.45, 0, s * 0.38, s * 0.38, "#b4ff40");
      oval(ctx, s * 0.4, 0, s * 0.38, s * 0.3, "#8ad422");
      ctx.fillStyle = "#d4ff70";
      ctx.beginPath();
      ctx.moveTo(s * 0.6, -4);
      ctx.lineTo(s * 1.25, 0);
      ctx.lineTo(s * 0.6, 4);
      ctx.closePath();
      ctx.fill();
      eye(ctx, s * 0.52, -s * 0.08, 3.5);
    } else if (t === "tanque") {
      insectLegs(ctx, s * 0.85, 3, "#1a2018");
      roundRect(ctx, -s * 1.05, -s * 0.55, s * 2.1, s * 1.1, 6);
      ctx.fillStyle = "#2a3228";
      ctx.fill();
      roundRect(ctx, -s * 0.7, -s * 0.42, s * 1.4, s * 0.84, 5);
      ctx.fillStyle = "#4a5a48";
      ctx.fill();
      ctx.fillStyle = "#7a8a70";
      ctx.fillRect(-s * 0.55, -s * 0.22, s * 0.35, s * 0.44);
      ctx.fillRect(-s * 0.1, -s * 0.22, s * 0.35, s * 0.44);
      ctx.fillStyle = "#c8d4b0";
      ctx.fillRect(s * 0.25, -5, s * 1.05, 10);
      oval(ctx, s * 0.15, -s * 0.15, 5, 5, "#8ad422");
    } else if (t === "drone") {
      buzzWings(ctx, s, ph, 0.85);
      oval(ctx, 0, 0, s * 0.55, s * 0.38, "#c8a020");
      oval(ctx, s * 0.35, 0, s * 0.32, s * 0.24, "#f0d24a");
      ctx.fillStyle = "#1a0c04";
      ctx.beginPath();
      ctx.moveTo(s * 0.55, 0);
      ctx.lineTo(s * 1.05, -3);
      ctx.lineTo(s * 1.15, 0);
      ctx.lineTo(s * 1.05, 3);
      ctx.closePath();
      ctx.fill();
      eye(ctx, s * 0.48, -s * 0.08, 3.2);
      eye(ctx, s * 0.48, s * 0.08, 3.2);
    } else if (t === "kamikaze") {
      var pulse = 1 + Math.sin(ph * 8) * 0.12;
      oval(ctx, 0, 0, s * pulse, s * pulse * 0.85, "#8a1010");
      oval(ctx, 0, 0, s * 0.55 * pulse, s * 0.5 * pulse, "#ff3a2a");
      oval(ctx, 0, 0, s * 0.22, s * 0.22, "#ffe08a");
      insectLegs(ctx, s * 0.7, 2, "#3a0808");
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(4, 4);
      ctx.moveTo(4, -4);
      ctx.lineTo(-4, 4);
      ctx.stroke();
    } else if (t === "medico") {
      insectLegs(ctx, s, 3, "#88aa88");
      oval(ctx, 0, 0, s, s * 0.85, "#d8f0d8");
      oval(ctx, s * 0.15, -s * 0.1, s * 0.28, s * 0.28, "#7cffb0");
      ctx.fillStyle = "#c02020";
      ctx.fillRect(-3, -8, 6, 16);
      ctx.fillRect(-8, -3, 16, 6);
      eye(ctx, s * 0.45, -s * 0.18, 3.5);
    } else if (t === "artilharia") {
      insectLegs(ctx, s * 0.7, 2, "#3a1808");
      oval(ctx, -s * 0.15, 4, s * 0.85, s * 0.5, "#8a4a18");
      ctx.fillStyle = "#3a2010";
      roundRect(ctx, s * 0.05, -s * 1.15, 10, s * 1.05, 3);
      ctx.fill();
      oval(ctx, s * 0.22, -s * 1.15, 8, 6, "#c46a22");
      oval(ctx, -s * 0.35, 2, s * 0.32, s * 0.28, "#5a3010");
    } else if (t === "fragmento") {
      oval(ctx, 0, 0, s, s * 0.85, "#a05020");
      oval(ctx, -4, -2, s * 0.45, s * 0.4, "#d4783a");
      oval(ctx, 6, 3, s * 0.32, s * 0.28, "#ffaa66");
      ctx.strokeStyle = "#3a1808";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.7, 0.2, 2.4);
      ctx.stroke();
    } else if (t === "larva") {
      oval(ctx, -2, 0, s * 1.15, s * 0.7, "#8aaa28");
      oval(ctx, 4, 0, s * 0.55, s * 0.5, "#c8e050");
      ctx.fillStyle = "#5a7018";
      ctx.fillRect(-s * 0.5, -s * 0.5, 2, s);
      ctx.fillRect(-s * 0.1, -s * 0.55, 2, s * 1.1);
      eye(ctx, s * 0.45, -2, 2.4);
    } else if (t === "sombra") {
      ctx.globalAlpha *= 0.85;
      ctx.fillStyle = "#3a2458";
      ctx.beginPath();
      ctx.moveTo(s * 0.9, 0);
      ctx.quadraticCurveTo(s * 0.2, -s * 0.9, -s * 0.9, -s * 0.2);
      ctx.quadraticCurveTo(-s * 0.3, 0, -s * 0.9, s * 0.2);
      ctx.quadraticCurveTo(s * 0.2, s * 0.9, s * 0.9, 0);
      ctx.fill();
      eye(ctx, s * 0.35, -s * 0.12, 3.5, "#e8d0ff");
      eye(ctx, s * 0.35, s * 0.12, 3.5, "#e8d0ff");
    } else if (t === "sniper") {
      insectLegs(ctx, s * 0.65, 2, "#2a3a10");
      oval(ctx, -s * 0.1, 0, s * 0.45, s * 0.7, "#3a5a18");
      oval(ctx, s * 0.25, 0, s * 0.32, s * 0.28, "#5a8a2a");
      ctx.fillStyle = "#1a2010";
      ctx.fillRect(s * 0.35, -2, s * 1.35, 4);
      oval(ctx, s * 1.55, 0, 4, 3, "#8ad422");
      eye(ctx, s * 0.38, -s * 0.12, 3.2);
    } else if (t === "ninho") {
      oval(ctx, 0, 4, s * 1.05, s * 0.8, "#5a3a10");
      ctx.fillStyle = "#8a5a18";
      ctx.beginPath();
      ctx.moveTo(-s, 6);
      ctx.quadraticCurveTo(0, -s * 1.15, s, 6);
      ctx.quadraticCurveTo(0, s * 0.55, -s, 6);
      ctx.fill();
      ctx.fillStyle = "#3a2010";
      for (var hc = 0; hc < 5; hc++) {
        var hx2 = -s * 0.45 + (hc % 3) * s * 0.4;
        var hy2 = -s * 0.15 + Math.floor(hc / 3) * s * 0.4;
        ctx.beginPath();
        for (var h6 = 0; h6 < 6; h6++) {
          var ha3 = (Math.PI / 3) * h6;
          var fn2 = h6 ? ctx.lineTo : ctx.moveTo;
          fn2.call(ctx, hx2 + Math.cos(ha3) * 5, hy2 + Math.sin(ha3) * 5);
        }
        ctx.closePath();
        ctx.fill();
      }
      oval(ctx, -5, 6, 4, 4, "#c8e050");
      oval(ctx, 6, 4, 3, 3, "#c8e050");
    } else if (t === "parasita") {
      oval(ctx, -2, 0, s * 0.85, s * 0.55, "#701848");
      oval(ctx, 5, 1, s * 0.5, s * 0.4, "#a03070");
      ctx.strokeStyle = "#3a0820";
      ctx.lineWidth = 1.5;
      for (var pl = 0; pl < 4; pl++) {
        var pa = -0.8 + pl * 0.55;
        ctx.beginPath();
        ctx.moveTo(s * 0.2, 0);
        ctx.lineTo(Math.cos(pa) * s * 1.1, Math.sin(pa) * s * 0.9);
        ctx.stroke();
      }
      eye(ctx, 6, -2, 2.6, "#ff80c8");
    } else if (t === "criomante") {
      insectLegs(ctx, s, 2, "#4a88aa");
      ctx.fillStyle = "#7ad8ff";
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.85, s * 0.55);
      ctx.lineTo(-s * 0.85, s * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.55);
      ctx.lineTo(s * 0.35, s * 0.15);
      ctx.lineTo(-s * 0.35, s * 0.15);
      ctx.closePath();
      ctx.fill();
      eye(ctx, 0, -s * 0.15, 4, "#104060");
    } else {
      oval(ctx, 0, 0, s, s, e.def.color);
    }
    ctx.restore();
    if (!e.preview) drawEnemyMark(ctx, e);
    if (e.parked) {
      ctx.save();
      ctx.strokeStyle = "rgba(224, 92, 255, 0.55)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.def.size + 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (!e.preview) hpBar(ctx, e);
  };

  function drawEnemyMark(ctx, e) {
    var s = e.def.size;
    var stealth = (e.stealth || 0) > 0.2;
    var pulse = 0.62 + Math.sin((e.phase || 0) * 5.5) * 0.22;
    var decoy = !!(e.decoy || e.fake);
    var col = decoy ? "#d8b0ff" : (e.def.boss ? "#ffe08a" : "#ff6a5a");
    ctx.save();
    ctx.globalAlpha = (stealth ? 0.42 : 0.28) * pulse;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + s * 0.92, s * 1.05, s * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = stealth ? 0.9 : 0.62;
    ctx.strokeStyle = col;
    ctx.lineWidth = stealth || decoy ? 2.2 : 1.7;
    ctx.beginPath();
    ctx.arc(e.x, e.y, s + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = col;
    var py = e.y - s - 9;
    ctx.beginPath();
    ctx.moveTo(e.x, py - 6);
    ctx.lineTo(e.x + 4.5, py);
    ctx.lineTo(e.x, py + 3.5);
    ctx.lineTo(e.x - 4.5, py);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  G.drawProjectile = function (ctx, p) {
    ctx.save();
    if (p.z) ctx.translate(0, -p.z);
    if (p.kind === "flame") {
      ctx.fillStyle = p.team === "player" ? "rgba(255,140,40,0.7)" : "#ff8a8a";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "missile") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = "#e8b0ff";
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-8, -4);
      ctx.lineTo(-8, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (p.kind === "laser") {
      ctx.strokeStyle = "#7af7ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
      ctx.stroke();
    } else if (p.kind === "ice") {
      ctx.fillStyle = "#b8f0ff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "sting") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = p.fake ? "rgba(180, 255, 140, 0.45)" : "#9cff6a";
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-5, -3);
      ctx.lineTo(-5, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = p.team === "player" ? "#fff4b0" : (p.fake ? "rgba(255, 138, 138, 0.4)" : "#ff8a8a");
      if (p.kind === "grenade") ctx.fillStyle = "#9cff7a";
      if (p.kind === "cannon") ctx.fillStyle = "#ffd24a";
      if (p.kind === "healshot") ctx.fillStyle = "#7cffb0";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  G.drawMine = function (ctx, m) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.fillStyle = m.arm > 0 ? "#888" : "#f0c422";
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 5);
    ctx.stroke();
    if (m.arm <= 0) {
      ctx.strokeStyle = "rgba(255,80,40,0.45)";
      ctx.beginPath();
      ctx.arc(0, 0, m.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  G.drawWarning = function (ctx, w) {
    var k = 1 - w.t / w.max;
    ctx.strokeStyle = "rgba(255,70,70," + (0.35 + k * 0.5) + ")";
    ctx.fillStyle = "rgba(255,40,40," + 0.12 * k + ")";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  G.drawDrop = function (ctx, d) {
    ctx.save();
    ctx.translate(d.x, d.y + Math.sin(d.t * 6) * 3);
    if (d.kind === "coin") {
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8a5a00";
      ctx.font = "bold 10px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 1);
    } else if (d.kind === "hp") {
      ctx.fillStyle = "#7cffb0";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#146038";
      ctx.font = "bold 11px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", 0, 1);
    } else {
      ctx.fillStyle = "#4da6ff";
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", 0, 1);
    }
    ctx.restore();
  };

  G.drawPortrait = function (canvas, team, key, locked) {
    var ctx = canvas.getContext("2d");
    var w = canvas.width;
    var h = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#101828";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,220,120,0.22)";
    ctx.strokeRect(8, 8, w - 16, h - 16);
    if (locked) {
      ctx.fillStyle = "#3a4458";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2 - 6, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#889";
      ctx.font = "bold 36px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", w / 2, h / 2);
      return;
    }
    var dummy;
    if (team === "player") {
      dummy = G.createPlayerUnit(w / 2, h / 2 + 8, key, { hp: 1 }, {});
    } else {
      dummy = G.createEnemy(key, w / 2, h / 2 + 8, 1);
    }
    dummy.preview = true;
    dummy.rot = -0.55;
    dummy.hp = dummy.maxHp;
    dummy.gait = 1.18;
    dummy.rotor = 0.95;
    dummy.wheel = 0.7;
    dummy.vx = 70;
    var scale = Math.min(2.8, 52 / Math.max(12, dummy.def.size));
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -h / 2);
    if (team === "player") G.drawPlayerUnit(ctx, dummy, 0.35);
    else G.drawEnemy(ctx, dummy);
    ctx.restore();
  };
})(window.TFAG = window.TFAG || {});
