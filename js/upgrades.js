(function (G) {
  function rankOf(v) {
    if (v === true) return 1;
    return Math.max(0, v | 0);
  }

  function bump(run, key, max) {
    var n = Math.min(max || 2, rankOf(run[key]) + 1);
    run[key] = n;
    return n;
  }

  G.RUN_CARDS = [
    { id: "dmg", rarity: "arquivo", title: "Mais dano", desc: "+18% de dano em todas as unidades.", apply: function (run) { run.dmg *= 1.18; } },
    { id: "fire", rarity: "arquivo", title: "Cadência", desc: "+20% na velocidade de tiro.", apply: function (run) { run.fireRate *= 1.2; } },
    { id: "hp", rarity: "arquivo", title: "Blindagem", desc: "+20% de HP no esquadrão e uma cura na hora.", apply: function (run, state) {
      run.hp *= 1.2;
      for (var i = 0; i < state.units.length; i++) {
        var u = state.units[i];
        u.maxHp = Math.round(u.maxHp * 1.2);
        u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.35));
      }
    } },
    { id: "speed", rarity: "arquivo", title: "Marcha rápida", desc: "+16% de velocidade no esquadrão.", apply: function (run) { run.speed *= 1.16; } },
    { id: "magnet", rarity: "arquivo", title: "Ímã de loot", desc: "Puxa moeda e reforço de mais longe.", apply: function (run) { run.magnet += 70; } },
    { id: "drop", rarity: "arquivo", title: "Reforços", desc: "Inimigo solta unidade com mais frequência.", apply: function (run) { run.dropChance = Math.min(0.5, run.dropChance + 0.1); } },
    { id: "gold", rarity: "arquivo", title: "Saque de guerra", desc: "+25% de moedas nesta run.", apply: function (run) { run.gold = (run.gold || 0) + 0.25; } },
    { id: "luck", rarity: "arquivo", title: "Sorte de recrutador", desc: "Reforço pode nascer um nível acima.", apply: function (run) { run.luck = (run.luck || 0) + 0.2; } },
    { id: "regen", rarity: "arquivo", title: "Rações", desc: "O esquadrão regenera HP no combate.", apply: function (run) { run.regen = (run.regen || 0) + 0.006; } },
    { id: "shield", rarity: "arquivo", title: "Campo de força", desc: "Toma 18% menos dano.", apply: function (run) { run.shield = Math.min(0.45, (run.shield || 0) + 0.18); } },

    { id: "explode", rarity: "confidencial", ranks: 2,
      title: function (run) { return rankOf(run.explode) ? "Explosão final II" : "Explosão final"; },
      desc: function (run) { return rankOf(run.explode) ? "O estouro fica maior e mais forte." : "Inimigo explode ao morrer."; },
      combo: function (run) { return rankOf(run.freeze) ? "Combo: o estouro também aplica o gelo." : ""; },
      apply: function (run) { bump(run, "explode", 2); }
    },
    { id: "ricochet", rarity: "confidencial", ranks: 2,
      title: function (run) { return rankOf(run.ricochet) ? "Ricochete II" : "Ricochete"; },
      desc: function (run) { return rankOf(run.ricochet) ? "O tiro pula duas vezes." : "O tiro pula pra um segundo alvo."; },
      combo: function (run) { return rankOf(run.pierce) ? "Combo: o pulo também atravessa." : ""; },
      apply: function (run) { bump(run, "ricochet", 2); }
    },
    { id: "dual", rarity: "confidencial", ranks: 2,
      title: function (run) { return rankOf(run.dual) ? "Fogo duplo II" : "Fogo duplo"; },
      desc: function (run) { return rankOf(run.dual) ? "Terceiro tiro do outro lado da mira." : "Cada disparo manda um segundo tiro na mesma mira."; },
      apply: function (run) { bump(run, "dual", 2); }
    },
    { id: "pierce", rarity: "confidencial", ranks: 2,
      title: function (run) { return rankOf(run.pierce) ? "Perfuração II" : "Perfuração"; },
      desc: function (run) { return rankOf(run.pierce) ? "Atravessa mais alvos e o dano cresce depois do primeiro." : "O projétil atravessa vários inimigos."; },
      combo: function (run) { return rankOf(run.ricochet) ? "Combo: o pulo do ricochete também atravessa." : ""; },
      apply: function (run) { bump(run, "pierce", 2); }
    },
    { id: "freeze", rarity: "confidencial", ranks: 2,
      title: function (run) { return rankOf(run.freeze) ? "Munição gelada II" : "Munição gelada"; },
      desc: function (run) { return rankOf(run.freeze) ? "O lento dura bem mais." : "Acerto deixa o inimigo lento."; },
      combo: function (run) { return rankOf(run.explode) ? "Combo: explosão final também gela." : ""; },
      apply: function (run) { bump(run, "freeze", 2); }
    },
    { id: "lifesteal", rarity: "confidencial", ranks: 2,
      title: function (run) { return rankOf(run.lifesteal) ? "Dreno II" : "Dreno"; },
      desc: function (run) { return rankOf(run.lifesteal) ? "Cura bem mais com o dano causado." : "Dano causado cura o esquadrão."; },
      apply: function (run) { bump(run, "lifesteal", 2); }
    },
    { id: "knockback", rarity: "confidencial", ranks: 2,
      title: function (run) { return rankOf(run.knockback) ? "Impacto II" : "Impacto"; },
      desc: function (run) { return rankOf(run.knockback) ? "O empurrão fica pesado." : "Acerto empurra o inimigo."; },
      apply: function (run) { bump(run, "knockback", 2); }
    },
    { id: "berserk", rarity: "confidencial", ranks: 2,
      title: function (run) { return rankOf(run.berserk) ? "Último suspiro II" : "Último suspiro"; },
      desc: function (run) { return rankOf(run.berserk) ? "A curva de dano com HP baixo fica bem mais agressiva." : "Quanto menos HP, mais dano."; },
      apply: function (run) { bump(run, "berserk", 2); }
    },
    { id: "clone", rarity: "confidencial", title: "Cópia de guerra", desc: "Duplica o soldado de menor nível. Respeita o limite de cópias (recruta livre; Míssil, Inferno e Colosso são únicos). Se lotou, vira arquivo de guerra.", apply: function (run, state) {
      var soldiers = [];
      for (var i = 0; i < state.units.length; i++) {
        if (state.units[i].hp > 0 && !state.units[i].commander) soldiers.push(state.units[i]);
      }
      if (!soldiers.length) return;
      var low = soldiers[0];
      for (var s = 1; s < soldiers.length; s++) if ((soldiers[s].gen || 0) < (low.gen || 0)) low = soldiers[s];
      if (G.soldierCount(state) < G.maxUnits() && G.canAddKind(state, low.kind)) {
        state.units.push(G.createPlayerUnit(low.x + 12, low.y + 12, low.kind, state.run, G.save.data.perm));
      } else {
        G.merge.addArquivo(state, low.x, low.y);
      }
    } },
    { id: "ficha", rarity: "confidencial", unique: true, rare: true, title: "Ficha de arquivo", desc: "+1 troca de cartas nesta run. Raro.", apply: function (run) { run.ficha = true; run.rerolls = (run.rerolls || 0) + 1; } },

    { id: "minesPlus", rarity: "maximo", ranks: 2, favor: { projectile: "mine" },
      title: function (run) { return rankOf(run.minesPlus) ? "Campo minado II" : "Campo minado"; },
      desc: function (run) { return rankOf(run.minesPlus) ? "Ainda mais minas, área maior." : "Minas ficam numa área maior e você planta mais."; },
      apply: function (run) { bump(run, "minesPlus", 2); }
    },
    { id: "flame", rarity: "maximo", ranks: 2, favor: { projectile: "flame" },
      title: function (run) { return rankOf(run.flame) ? "Combustível extra II" : "Combustível extra"; },
      desc: function (run) { return rankOf(run.flame) ? "Alcance e queima ainda mais fortes." : "Lança-chamas alcança mais e queima mais forte."; },
      apply: function (run) { bump(run, "flame", 2); }
    },
    { id: "boom", rarity: "maximo", ranks: 2, favor: { projectile: ["missile", "grenade"], explode: true },
      title: function (run) { return rankOf(run.boom) ? "Carga extra II" : "Carga extra"; },
      desc: function (run) { return rankOf(run.boom) ? "Explosão fica enorme." : "Explosão (morte, míssil, granada) fica maior."; },
      apply: function (run) { bump(run, "boom", 2); }
    },
    { id: "fieldMed", rarity: "maximo", ranks: 2, favor: { role: ["medic", "surgeon", "chaplain"] },
      title: function (run) { return rankOf(run.fieldMed) ? "Protocolo de campo II" : "Protocolo de campo"; },
      desc: function (run) { return rankOf(run.fieldMed) ? "Kit, âncora e poça de médico ficam ainda mais fortes." : "Médico, cirurgião e capelão: kit cai mais, âncora protege mais."; },
      apply: function (run) { bump(run, "fieldMed", 2); }
    },
    { id: "impact", rarity: "maximo", ranks: 2, favor: { role: ["colossus", "tank", "minitank", "truck"] },
      title: function (run) { return rankOf(run.impact) ? "Doutrina de impacto II" : "Doutrina de impacto"; },
      desc: function (run) { return rankOf(run.impact) ? "Slam, bash e linha blindada ficam ainda mais pesados." : "Colosso, tanque e caminhão: melee e escudo batem mais forte."; },
      apply: function (run) { bump(run, "impact", 2); }
    },
    { id: "optics", rarity: "maximo", ranks: 2, favor: { role: ["observer", "sniper"] },
      title: function (run) { return rankOf(run.optics) ? "Linha de mira II" : "Linha de mira"; },
      desc: function (run) { return rankOf(run.optics) ? "Marca dura mais e o atirador/observador causa mais dano." : "Observador e anti-matéria: marca dura mais, dano de precisão sobe."; },
      apply: function (run) { bump(run, "optics", 2); }
    },
    { id: "raid", rarity: "maximo", ranks: 2, favor: { role: ["stealth", "assassin", "outlaw"] },
      title: function (run) { return rankOf(run.raid) ? "Doutrina de raide II" : "Doutrina de raide"; },
      desc: function (run) { return rankOf(run.raid) ? "Furtivo, assassino e fora-da-lei ficam ainda mais letais." : "Furtivo, assassino e fora-da-lei: mais dano na linha de choque."; },
      apply: function (run) { bump(run, "raid", 2); }
    }
  ];

  function schoolTax(id) {
    var p = G.save && G.save.data && G.save.data.perm;
    if (!p) return 1;
    var schools = ["choque", "disparo", "mobilidade"];
    var funded = "";
    var best = 0;
    var i;
    for (i = 0; i < schools.length; i++) {
      var lv = p[schools[i]] | 0;
      if (lv > best) {
        best = lv;
        funded = schools[i];
      }
    }
    if (!funded || funded === id) return 1;
    return 1.6;
  }

  function schoolCost(id, lv) {
    var base = [420, 980, 2100][lv] || 2100;
    return Math.round(base * schoolTax(id));
  }

  G.PERM_WINGS = [
    {
      id: "formacao",
      kicker: "Começo",
      title: "Formação",
      stamp: "FORMAÇÃO",
      blurb: "Com quantos soldados você começa e em que nível.",
      items: [
        {
          id: "extraStart",
          title: "Recruta extra",
          max: 4,
          cost: function (lv) { return 250 * Math.pow(2, lv); },
          desc: function (lv) {
            var n = lv + 1;
            return "Começa a campanha com " + n + (n === 1 ? " recruta a mais." : " recrutas a mais.");
          }
        },
        {
          id: "earlyTier",
          title: "Soldado já promovido",
          max: 4,
          cost: function (lv) { return [550, 1200, 2600, 4800][lv]; },
          desc: function (lv) {
            var kind = G.EARLY_KINDS[Math.min(G.EARLY_KINDS.length - 1, lv + 1)];
            return "O primeiro soldado já entra como " + G.UNIT_DEFS[kind].name + ", sem merge.";
          }
        },
        {
          id: "maxUnits",
          title: "6ª vaga",
          max: 1,
          cost: function () { return 2800; },
          desc: function () { return "Cabe 6 soldados no campo. O comandante continua sem ocupar vaga."; }
        },
        {
          id: "startArquivo",
          title: "Arquivo de brinde",
          max: 1,
          capstone: true,
          cost: function () { return 2400; },
          desc: function () { return "Começa a campanha com 1 arquivo (o recurso do R, pra convocar e mergear)."; }
        }
      ]
    },
    {
      id: "doutrina",
      kicker: "Estilo",
      title: "Doutrina",
      stamp: "DOUTRINA",
      blurb: "A primeira que você comprar é a sua. As outras duas ficam 60% mais caras.",
      items: [
        {
          id: "choque",
          title: "Choque",
          school: true,
          max: 3,
          cost: function (lv) { return schoolCost("choque", lv); },
          desc: function (lv) {
            var n = lv + 1;
            var tax = schoolTax("choque") > 1 ? " 60% mais caro (você já tem outro estilo)." : "";
            if (n >= 3) return "+18% de vida e toma 15% menos dano. Começa a campanha regenerando vida. Sem bônus de dano." + tax;
            return "+" + (n * 6) + "% de vida e toma " + (n * 5) + "% menos dano. Não aumenta dano." + tax;
          }
        },
        {
          id: "disparo",
          title: "Disparo",
          school: true,
          max: 3,
          cost: function (lv) { return schoolCost("disparo", lv); },
          desc: function (lv) {
            var n = lv + 1;
            var tax = schoolTax("disparo") > 1 ? " 60% mais caro (você já tem outro estilo)." : "";
            if (n >= 3) return "+21% de dano e +24% de cadência. No fim da fase, a carta amarela tende a ser de tiro (perfuração, ricochete…)." + tax;
            return "+" + (n * 7) + "% de dano e +" + (n * 8) + "% na velocidade de tiro." + tax;
          }
        },
        {
          id: "mobilidade",
          title: "Mobilidade",
          school: true,
          max: 3,
          cost: function (lv) { return schoolCost("mobilidade", lv); },
          desc: function (lv) {
            var n = lv + 1;
            var tax = schoolTax("mobilidade") > 1 ? " 60% mais caro (você já tem outro estilo)." : "";
            if (n >= 3) return "+24% de velocidade, ímã forte e mais unidade caindo no chão. Começa já puxando loot e 12% mais rápido." + tax;
            return "+" + (n * 8) + "% de velocidade, puxa loot de mais longe e inimigo solta unidade um pouco mais." + tax;
          }
        },
        {
          id: "manualCampo",
          title: "Manual de campo",
          max: 1,
          capstone: true,
          cost: function () { return 2800; },
          desc: function () {
            var school = G.upgrades.fundedSchool && G.upgrades.fundedSchool();
            var hint = {
              choque: "Choque: começa com Impacto (empurra o inimigo).",
              disparo: "Disparo: começa com Perfuração (o tiro atravessa).",
              mobilidade: "Mobilidade: começa com Munição gelada (deixa lento)."
            }[school];
            if (hint) return hint + " Pegar de novo no fim da fase vira posto II.";
            return "Compra um estilo primeiro. Toda campanha já começa com a carta amarela dele no dossiê: Choque empurra, Disparo perfura, Mobilidade gela.";
          }
        }
      ]
    },
    {
      id: "intel",
      kicker: "Saque",
      title: "Inteligência",
      stamp: "INTEL",
      blurb: "Mais moeda, troca de carta no fim da fase e carta vermelha melhor.",
      items: [
        {
          id: "rerolls",
          title: "Troca extra",
          max: 2,
          cost: function (lv) { return [1800, 6500][lv]; },
          desc: function (lv) {
            var n = lv + 1;
            return "No fim da fase você pode trocar as 3 cartas " + n + (n === 1 ? " vez" : " vezes") + " de graça.";
          }
        },
        {
          id: "gold",
          title: "Mais moedas",
          max: 5,
          cost: function (lv) { return Math.round(240 * (lv + 1) * (1 + lv * 0.35)); },
          desc: function (lv) {
            var n = lv + 1;
            return "Inimigo solta +" + (n * 12) + "% de moedas. No começo de cada fase você ganha +" + (n * 20) + " moedas.";
          }
        },
        {
          id: "luck",
          title: "Reforço melhor",
          max: 5,
          cost: function (lv) { return Math.round(270 * (lv + 1) * (1 + lv * 0.35)); },
          desc: function (lv) {
            var n = lv + 1;
            var text = "Unidade que o inimigo solta nasce um nível acima com mais frequência.";
            if (n >= 4) text += " A carta vermelha do fim da fase também combina mais com o esquadrão.";
            else if (n >= 3) text += " A carta vermelha aparece um pouco mais.";
            return text;
          }
        },
        {
          id: "briefing",
          title: "Carta vermelha certa",
          max: 1,
          capstone: true,
          cost: function () { return 3200; },
          desc: function () { return "No fim da fase, a carta vermelha (Máximo) vem a que mais combina com quem você tem. Médico no campo? Tende a vir carta de médico."; }
        }
      ]
    }
  ];

  G.PERM = [];
  G.PERM_WINGS.forEach(function (wing) {
    wing.items.forEach(function (item) {
      item.wing = wing.id;
      G.PERM.push(item);
    });
  });

  G.PERM_LEGACY = [
    { id: "dmg", max: 10, cost: function (lv) { return Math.round(150 * (lv + 1) * (1 + lv * 0.35)); } },
    { id: "hp", max: 10, cost: function (lv) { return Math.round(150 * (lv + 1) * (1 + lv * 0.35)); } },
    { id: "fireRate", max: 8, cost: function (lv) { return Math.round(180 * (lv + 1) * (1 + lv * 0.35)); } },
    { id: "speed", max: 8, cost: function (lv) { return Math.round(170 * (lv + 1) * (1 + lv * 0.35)); } },
    { id: "regen", max: 5, cost: function (lv) { return Math.round(300 * (lv + 1) * (1 + lv * 0.35)); } },
    { id: "magnet", max: 5, cost: function (lv) { return Math.round(210 * (lv + 1) * (1 + lv * 0.35)); } }
  ];

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function textOf(val, run) {
    if (typeof val === "function") return val(run) || "";
    return val || "";
  }

  function cloneRunStats(run) {
    return JSON.parse(JSON.stringify({
      dmg: run.dmg,
      fireRate: run.fireRate,
      hp: run.hp,
      speed: run.speed,
      magnet: run.magnet,
      dropChance: run.dropChance,
      explode: run.explode,
      ricochet: run.ricochet,
      dual: run.dual,
      pierce: run.pierce,
      freeze: run.freeze,
      lifesteal: run.lifesteal,
      shield: run.shield,
      luck: run.luck,
      gold: run.gold,
      knockback: run.knockback,
      minesPlus: run.minesPlus,
      flame: run.flame,
      berserk: run.berserk,
      regen: run.regen,
      boom: run.boom,
      fieldMed: run.fieldMed || 0,
      impact: run.impact || 0,
      optics: run.optics || 0,
      raid: run.raid || 0,
      taken: run.taken,
      dossier: run.dossier || [],
      ficha: !!run.ficha,
      rerolls: run.rerolls | 0,
      intel: {
        arquivo: ((run.intel && run.intel.arquivo) | 0) + ((run.intel && run.intel.confidencial) | 0) * 2 + ((run.intel && run.intel.maximo) | 0) * 4
      }
    }));
  }

  function pickBestFavor(pool, seen, state) {
    var best = null;
    var bestN = -1;
    var i;
    var u;
    for (i = 0; i < pool.length; i++) {
      var card = pool[i];
      if (seen[card.id]) continue;
      var n = 0;
      var units = (state && state.units) || [];
      for (u = 0; u < units.length; u++) {
        if (G.upgrades.matchesFavor(units[u], card.favor, state)) n++;
      }
      if (!best || n > bestN) {
        best = card;
        bestN = n;
      }
    }
    if (best) seen[best.id] = true;
    return best;
  }

  function pickFrom(pool, seen) {
    var mixed = shuffle(pool);
    var i;
    for (i = 0; i < mixed.length; i++) {
      if (seen[mixed[i].id]) continue;
      seen[mixed[i].id] = true;
      return mixed[i];
    }
    return null;
  }

  G.upgrades = {
    rank: rankOf,
    bump: bump,
    schoolTax: schoolTax,

    fundedSchool: function () {
      var p = G.save && G.save.data && G.save.data.perm;
      if (!p) return "";
      var schools = ["choque", "disparo", "mobilidade"];
      var funded = "";
      var best = 0;
      var i;
      for (i = 0; i < schools.length; i++) {
        var lv = p[schools[i]] | 0;
        if (lv > best) {
          best = lv;
          funded = schools[i];
        }
      }
      return funded;
    },
    favorMul: function (state, u) {
      if (!u || !u.def || !state || !state.run) return 1;
      var role = u.def.role;
      var m = 1;
      var optics = rankOf(state.run.optics);
      var raid = rankOf(state.run.raid);
      var impact = rankOf(state.run.impact);
      var fieldMed = rankOf(state.run.fieldMed);
      if (optics && (role === "observer" || role === "sniper")) m *= 1 + 0.18 * optics;
      if (raid && (role === "stealth" || role === "assassin" || role === "outlaw")) m *= 1 + 0.2 * raid;
      if (impact && (role === "colossus" || role === "tank" || role === "minitank" || role === "truck")) m *= 1 + 0.16 * impact;
      if (fieldMed && (role === "medic" || role === "surgeon" || role === "chaplain")) m *= 1 + 0.12 * fieldMed;
      return m;
    },

    rarityOf: function (card) {
      return (card && card.rarity) || "arquivo";
    },

    stamp: function (card) {
      var r = G.upgrades.rarityOf(card);
      if (r === "maximo") return "MÁXIMO";
      if (r === "confidencial") return "CONFIDENCIAL";
      return "ARQUIVO";
    },

    titleOf: function (card, run) {
      return textOf(card.title, run);
    },

    descOf: function (card, run) {
      return textOf(card.desc, run);
    },

    comboOf: function (card, run) {
      return textOf(card.combo, run);
    },

    cardById: function (id) {
      for (var i = 0; i < G.RUN_CARDS.length; i++) if (G.RUN_CARDS[i].id === id) return G.RUN_CARDS[i];
      return null;
    },

    applyHqStart: function (run, perm) {
      perm = perm || {};
      if ((perm.choque | 0) >= 3) run.regen = (run.regen || 0) + 0.006;
      if ((perm.mobilidade | 0) >= 3) {
        run.magnet += 70;
        run.speed *= 1.12;
      }
    },

    grantDoctrineManual: function (state, perm) {
      perm = perm || (G.save && G.save.data && G.save.data.perm) || {};
      if (!(perm.manualCampo | 0) || !state || !state.run) return;
      var school = G.upgrades.fundedSchool();
      var id = { choque: "knockback", disparo: "pierce", mobilidade: "freeze" }[school];
      if (!id) return;
      var card = G.upgrades.cardById(id);
      if (!card) return;
      card.apply(state.run, state);
      if (!state.run.taken) state.run.taken = {};
      state.run.taken[id] = (state.run.taken[id] | 0) + 1;
      var rank = card.ranks ? rankOf(state.run[id]) : (state.run.taken[id] | 0);
      if (!state.run.dossier) state.run.dossier = [];
      var found = false;
      var i;
      for (i = 0; i < state.run.dossier.length; i++) {
        if (state.run.dossier[i].id === id) {
          state.run.dossier[i].rank = rank;
          found = true;
          break;
        }
      }
      if (!found) state.run.dossier.push({ id: id, rank: rank });
    },

    defaultRun: function () {
      return {
        dmg: 1,
        fireRate: 1,
        hp: 1,
        speed: 1,
        magnet: 0,
        dropChance: 0.16,
        explode: 0,
        ricochet: 0,
        dual: 0,
        pierce: 0,
        freeze: 0,
        lifesteal: 0,
        shield: 0,
        luck: 0,
        gold: 0,
        knockback: 0,
        minesPlus: 0,
        flame: 0,
        berserk: 0,
        regen: 0,
        boom: 0,
        fieldMed: 0,
        impact: 0,
        optics: 0,
        raid: 0,
        coins: 0,
        kills: 0,
        taken: {},
        dossier: [],
        rerolls: G.save.data.perm.rerolls | 0,
        ficha: false,
        reserve: [],
        intel: { arquivo: 0 },
        tempDmg: 1,
        tempSpeed: 1,
        tempShield: 0,
        tempT: 0,
        fluidT: 0,
        coilHp: 0,
        coilT: 0,
        smokeT: 0,
        activeFire: 0,
        activeFireT: 0,
        activeDmg: 0,
        activeDmgT: 0
      };
    },

    snapshot: function (state) {
      return {
        stats: cloneRunStats(state.run),
        units: state.units.map(function (u) {
          return { id: u.id, hp: u.hp, maxHp: u.maxHp };
        })
      };
    },

    restore: function (state, snap) {
      var coins = state.run.coins;
      var keys = Object.keys(snap.stats);
      for (var i = 0; i < keys.length; i++) state.run[keys[i]] = snap.stats[keys[i]];
      state.run.coins = coins;
      var keep = {};
      for (var u = 0; u < snap.units.length; u++) keep[snap.units[u].id] = snap.units[u];
      state.units = state.units.filter(function (unit) { return keep[unit.id]; });
      for (var j = 0; j < state.units.length; j++) {
        var s = keep[state.units[j].id];
        state.units[j].maxHp = s.maxHp;
        state.units[j].hp = Math.min(s.maxHp, s.hp);
      }
    },

    matchesFavor: function (unit, favor, state) {
      if (!unit || unit.hp <= 0 || !favor) return false;
      var def = unit.def || {};
      if (favor.projectile) {
        var projs = Array.isArray(favor.projectile) ? favor.projectile : [favor.projectile];
        if (projs.indexOf(def.projectile) >= 0) return true;
      }
      if (favor.kind) {
        var kinds = Array.isArray(favor.kind) ? favor.kind : [favor.kind];
        var kind = unit.kind || def.kind;
        if (kinds.indexOf(kind) >= 0) return true;
      }
      if (favor.role) {
        var roles = Array.isArray(favor.role) ? favor.role : [favor.role];
        if (roles.indexOf(def.role) >= 0) return true;
      }
      if (favor.explode && state && state.run && rankOf(state.run.explode)) return true;
      return false;
    },

    cardAvailable: function (card, state) {
      var run = (state && state.run) || {};
      var have = rankOf(run[card.id]);
      if (!have) have = (run.taken && run.taken[card.id]) | 0;
      if (card.ranks) {
        if (have >= card.ranks) return false;
      } else if (card.unique && have) return false;
      if (!card.favor) return true;
      if (card.favor.explode && rankOf(run.explode)) return true;
      var units = (state && state.units) || [];
      for (var i = 0; i < units.length; i++) {
        if (G.upgrades.matchesFavor(units[i], card.favor, state)) return true;
      }
      return false;
    },

    pickThree: function (state) {
      var pool = G.RUN_CARDS.filter(function (c) {
        if (!G.upgrades.cardAvailable(c, state)) return false;
        if (c.rare && Math.random() > 0.22) return false;
        return true;
      });
      var by = { arquivo: [], confidencial: [], maximo: [] };
      var i;
      for (i = 0; i < pool.length; i++) {
        var r = G.upgrades.rarityOf(pool[i]);
        if (!by[r]) by[r] = [];
        by[r].push(pool[i]);
      }
      var seen = {};
      var picked = [];
      var perm = (G.save && G.save.data && G.save.data.perm) || {};
      var disparo = (perm.disparo | 0) >= 3;
      var briefing = !!(perm.briefing | 0) || (perm.luck | 0) >= 4;
      var a = pickFrom(by.arquivo, seen);
      var c;
      if (disparo) {
        var hot = ["pierce", "ricochet", "dual", "freeze", "knockback", "explode"];
        var preferred = [];
        for (i = 0; i < by.confidencial.length; i++) {
          if (hot.indexOf(by.confidencial[i].id) >= 0) preferred.push(by.confidencial[i]);
        }
        c = (preferred.length && Math.random() < 0.75) ? pickFrom(preferred, seen) : pickFrom(by.confidencial, seen);
      } else {
        c = pickFrom(by.confidencial, seen);
      }
      var m = briefing ? pickBestFavor(by.maximo, seen, state) : pickFrom(by.maximo, seen);
      if (a) picked.push(a);
      if (c) picked.push(c);
      if (m) picked.push(m);
      var leftover = by.maximo.concat(by.confidencial, by.arquivo);
      if ((perm.luck | 0) >= 3) leftover = by.maximo.concat(leftover);
      while (picked.length < 3) {
        var extra = pickFrom(leftover, seen);
        if (!extra) break;
        picked.push(extra);
      }
      return picked;
    },

    applyCard: function (card, state) {
      if (!state.history) state.history = [];
      state.history.push(G.upgrades.snapshot(state));
      card.apply(state.run, state);
      if (!state.run.taken) state.run.taken = {};
      state.run.taken[card.id] = (state.run.taken[card.id] | 0) + 1;
      var rank = card.ranks ? rankOf(state.run[card.id]) : (state.run.taken[card.id] | 0);
      if (!state.run.dossier) state.run.dossier = [];
      var found = false;
      for (var i = 0; i < state.run.dossier.length; i++) {
        if (state.run.dossier[i].id === card.id) {
          state.run.dossier[i].rank = rank;
          found = true;
          break;
        }
      }
      if (!found) state.run.dossier.push({ id: card.id, rank: rank });
    },

    undoLast: function (state) {
      if (!state.history || !state.history.length) return false;
      G.upgrades.restore(state, state.history.pop());
      return true;
    },

    spentPerm: function () {
      var total = 0;
      function add(list) {
        (list || []).forEach(function (item) {
          var lv = G.save.data.perm[item.id] | 0;
          for (var i = 0; i < lv; i++) total += item.cost(i);
        });
      }
      add(G.PERM);
      add(G.PERM_LEGACY);
      return total;
    },

    refundPerm: function () {
      var total = G.upgrades.spentPerm();
      if (!total) return 0;
      G.PERM.forEach(function (item) {
        G.save.data.perm[item.id] = 0;
      });
      (G.PERM_LEGACY || []).forEach(function (item) {
        G.save.data.perm[item.id] = 0;
      });
      G.save.data.vault += total;
      G.save.persist();
      return total;
    },

    buy: function (item) {
      var lv = G.save.data.perm[item.id] | 0;
      if (lv >= item.max) return false;
      var cost = item.cost(lv);
      if (!G.save.spend(cost)) return false;
      G.save.data.perm[item.id] = lv + 1;
      G.save.persist();
      return true;
    }
  };
})(window.TFAG = window.TFAG || {});
