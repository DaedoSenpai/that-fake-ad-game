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
      desc: function (run) {
        return rankOf(run.knockback)
          ? "O empurrão fica pesado."
          : "Acerto empurra o inimigo. Em fogo, napalm e buraco negro, puxa pra dentro.";
      },
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

  var DOCTRINE_IDS = ["choque", "disparo", "mobilidade"];
  var QUARTEL_IDS = ["otica", "supressao", "blindados", "triagem", "raide", "forca"];
  var QUARTEL_KINDS = {
    otica: ["sniper", "observador", "anti_material", "designado"],
    supressao: ["metralhador", "giratoria", "lanca_chamas", "canhoneiro", "inferno", "missil"],
    blindados: ["caminhao", "minitanque", "quartel", "oficina", "tanque", "colosso"],
    triagem: ["pistoleiro", "medico", "cirurgiao", "capelao", "socorrista"],
    raide: ["batedor", "infiltrador", "assassino", "sabotador", "fantasma", "fora_da_lei", "saqueador"],
    forca: ["psiquico", "escolhido", "jedi", "mestre"]
  };
  var QUARTEL_EARLY = {
    otica: ["recruta", "fuzileiro", "sniper", "observador", "anti_material"],
    supressao: ["recruta", "fuzileiro", "metralhador", "giratoria", "lanca_chamas"],
    blindados: ["recruta", "fuzileiro", "caminhao", "minitanque", "tanque"],
    triagem: ["recruta", "pistoleiro", "medico", "cirurgiao", "cirurgiao"],
    raide: ["recruta", "batedor", "infiltrador", "assassino", "assassino"],
    forca: ["recruta", "psiquico", "escolhido", "jedi", "jedi"]
  };
  var QUARTEL_NAME = {
    otica: "Ótica",
    supressao: "Supressão",
    blindados: "Blindados",
    triagem: "Triagem",
    raide: "Raide",
    forca: "Força"
  };

  function permOf() {
    return (G.save && G.save.data && G.save.data.perm) || {};
  }

  function maxInvasionOf() {
    return (G.save && G.save.data && G.save.data.maxInvasion) | 0;
  }

  function fundedOf(ids) {
    var p = permOf();
    var funded = "";
    var best = 0;
    var i;
    for (i = 0; i < ids.length; i++) {
      var lv = p[ids[i]] | 0;
      if (lv > best) {
        best = lv;
        funded = ids[i];
      }
    }
    return funded;
  }

  function schoolTax(id) {
    var funded = fundedOf(DOCTRINE_IDS);
    if (!funded || funded === id) return 1;
    return 1.6;
  }

  function quartelTax(id) {
    var funded = fundedOf(QUARTEL_IDS);
    if (!funded || funded === id) return 1;
    return 1.6;
  }

  function schoolCost(id, lv) {
    var base = [420, 980, 2100, 4200][lv] || 4200;
    return Math.round(base * schoolTax(id));
  }

  function quartelCost(id, lv) {
    var base = [480, 1100, 2400][lv] || 2400;
    return Math.round(base * quartelTax(id));
  }

  function quartelCount() {
    var p = permOf();
    var n = 0;
    var i;
    for (i = 0; i < QUARTEL_IDS.length; i++) if ((p[QUARTEL_IDS[i]] | 0) > 0) n++;
    return n;
  }

  function quartelSlotLocked(id) {
    var p = permOf();
    if ((p[id] | 0) > 0) return false;
    var n = quartelCount();
    var inv = maxInvasionOf();
    if (n >= 2) return inv < 5;
    if (n >= 1) return inv < 3;
    return false;
  }

  function quartelLockHint(id) {
    if (!quartelSlotLocked(id)) return "";
    if (quartelCount() >= 2) return "Invasão 5.";
    return "Invasão 3.";
  }

  function taxNote(item) {
    if (!item.school) return "";
    var tax = item.schoolSet === "quartel" ? quartelTax(item.id) : schoolTax(item.id);
    if (tax > 1) return " +60%.";
    return "";
  }

  function kindInLine(kind, spec) {
    var list = QUARTEL_KINDS[spec];
    return !!(list && list.indexOf(kind) >= 0);
  }

  function lineLvForKind(kind, spec) {
    if (!kindInLine(kind, spec)) return 0;
    return permOf()[spec] | 0;
  }

  function lineLvForUnit(u, spec) {
    if (!u) return 0;
    return lineLvForKind(u.kind || (u.def && u.def.kind), spec);
  }

  G.PERM_WINGS = [
    {
      id: "formacao",
      board: "operacao",
      kicker: "Começo",
      title: "Formação",
      stamp: "FORMAÇÃO",
      blurb: "Começo da campanha.",
      items: [
        {
          id: "extraStart",
          title: "Recruta extra",
          max: 4,
          cost: function (lv) { return 250 * Math.pow(2, lv); },
          desc: function (lv) {
            var n = lv + 1;
            return "+" + n + (n === 1 ? " recruta" : " recrutas") + " no começo.";
          }
        },
        {
          id: "earlyTier",
          title: "Soldado já promovido",
          max: 4,
          cost: function (lv) { return [550, 1200, 2600, 4800][lv]; },
          desc: function (lv) {
            var list = (G.upgrades && G.upgrades.earlyKinds) ? G.upgrades.earlyKinds() : G.EARLY_KINDS;
            var kind = list[Math.min(list.length - 1, lv + 1)];
            var nome = G.UNIT_DEFS[kind] ? G.UNIT_DEFS[kind].name : kind;
            var q = G.upgrades && G.upgrades.fundedQuartel && G.upgrades.fundedQuartel();
            var extra = q ? " Linha: " + (QUARTEL_NAME[q] || q) + "." : "";
            return "O 1º soldado entra como " + nome + "." + extra;
          }
        },
        {
          id: "segundoVeterano",
          title: "Segundo veterano",
          max: 1,
          cost: function () { return 2200; },
          lock: function () { return (permOf().earlyTier | 0) < 1; },
          lockHint: function () { return "Precisa de Soldado já promovido."; },
          desc: function () {
            return "O 2º soldado entra um nível abaixo do 1º.";
          }
        },
        {
          id: "maxUnits",
          title: "6ª vaga",
          max: 1,
          cost: function () { return 2800; },
          desc: function () { return "6 soldados no campo."; }
        },
        {
          id: "pocketArquivo",
          title: "Arquivo no bolso",
          max: 2,
          cost: function (lv) { return [1600, 3400][lv]; },
          desc: function (lv) {
            var n = lv + 1;
            return "+" + n + (n === 1 ? " arquivo" : " arquivos") + " no começo de cada fase.";
          }
        },
        {
          id: "startArquivo",
          title: "Arquivo de brinde",
          max: 1,
          capstone: true,
          cost: function () { return 2400; },
          lock: function () {
            var p = permOf();
            return (p.extraStart | 0) + (p.earlyTier | 0) + (p.maxUnits | 0) < 3;
          },
          lockHint: function () { return "Sobe Recruta extra, Soldado já promovido ou 6ª vaga."; },
          desc: function () { return "Começa com 1 arquivo."; }
        }
      ]
    },
    {
      id: "doutrina",
      board: "operacao",
      kicker: "Estilo",
      title: "Doutrina",
      stamp: "DOUTRINA",
      blurb: "A primeira é a sua. As outras +60%. Nv 4 só na sua.",
      items: [
        {
          id: "choque",
          title: "Choque",
          school: true,
          max: 4,
          cost: function (lv) { return schoolCost("choque", lv); },
          lock: function (lv) { return lv >= 3 && fundedOf(DOCTRINE_IDS) !== "choque"; },
          lockHint: function () { return "Nv 4 só no seu estilo."; },
          desc: function (lv) {
            var n = lv + 1;
            var tax = taxNote({ school: true, id: "choque" });
            if (n >= 4) return "+24% vida, −20% dano recebido. Regenera. +8% escudo." + tax;
            if (n >= 3) return "+18% vida, −15% dano recebido. Regenera no começo." + tax;
            return "+" + (n * 6) + "% vida, −" + (n * 5) + "% dano recebido." + tax;
          }
        },
        {
          id: "disparo",
          title: "Disparo",
          school: true,
          max: 4,
          cost: function (lv) { return schoolCost("disparo", lv); },
          lock: function (lv) { return lv >= 3 && fundedOf(DOCTRINE_IDS) !== "disparo"; },
          lockHint: function () { return "Nv 4 só no seu estilo."; },
          desc: function (lv) {
            var n = lv + 1;
            var tax = taxNote({ school: true, id: "disparo" });
            if (n >= 4) return "+28% dano, +32% cadência. Carta amarela de tiro quase sempre." + tax;
            if (n >= 3) return "+21% dano, +24% cadência. Carta amarela tende a ser de tiro." + tax;
            return "+" + (n * 7) + "% dano, +" + (n * 8) + "% cadência." + tax;
          }
        },
        {
          id: "mobilidade",
          title: "Mobilidade",
          school: true,
          max: 4,
          cost: function (lv) { return schoolCost("mobilidade", lv); },
          lock: function (lv) { return lv >= 3 && fundedOf(DOCTRINE_IDS) !== "mobilidade"; },
          lockHint: function () { return "Nv 4 só no seu estilo."; },
          desc: function (lv) {
            var n = lv + 1;
            var tax = taxNote({ school: true, id: "mobilidade" });
            if (n >= 4) return "+32% velocidade. Ímã forte. Mais reforço no chão. Começa +12% rápido." + tax;
            if (n >= 3) return "+24% velocidade. Ímã forte. Começa +12% rápido e puxando loot." + tax;
            return "+" + (n * 8) + "% velocidade. Puxa loot de mais longe. Mais reforço no chão." + tax;
          }
        },
        {
          id: "manualCampo",
          title: "Manual de campo",
          max: 2,
          capstone: true,
          cost: function (lv) { return [2800, 4200][lv]; },
          lock: function (lv) {
            var school = fundedOf(DOCTRINE_IDS);
            if (!school) return true;
            if (lv >= 1) return (permOf()[school] | 0) < 3;
            return false;
          },
          lockHint: function () {
            if (!fundedOf(DOCTRINE_IDS)) return "Compra um estilo.";
            return "Estilo no nível 3.";
          },
          desc: function (lv) {
            var school = G.upgrades.fundedSchool && G.upgrades.fundedSchool();
            var hint = {
              choque: "Começa com Impacto.",
              disparo: "Começa com Perfuração.",
              mobilidade: "Começa com Munição gelada."
            }[school];
            if (!hint) return "Começa com a carta amarela do seu estilo.";
            if (lv >= 1) return hint.replace(".", " II.");
            return hint + " Nv 2: posto II.";
          }
        }
      ]
    },
    {
      id: "intel",
      board: "operacao",
      kicker: "Saque",
      title: "Inteligência",
      stamp: "INTEL",
      blurb: "Moeda, reroll e carta do fim da fase.",
      items: [
        {
          id: "rerolls",
          title: "Troca extra",
          max: 2,
          cost: function (lv) { return [1800, 6500][lv]; },
          desc: function (lv) {
            var n = lv + 1;
            return "+" + n + (n === 1 ? " troca" : " trocas") + " grátis no fim da fase.";
          }
        },
        {
          id: "gold",
          title: "Mais moedas",
          max: 5,
          cost: function (lv) { return Math.round(240 * (lv + 1) * (1 + lv * 0.35)); },
          desc: function (lv) {
            var n = lv + 1;
            return "+" + (n * 12) + "% moedas. +" + (n * 20) + " moedas no começo de cada fase.";
          }
        },
        {
          id: "luck",
          title: "Reforço melhor",
          max: 5,
          cost: function (lv) { return Math.round(270 * (lv + 1) * (1 + lv * 0.35)); },
          desc: function (lv) {
            var n = lv + 1;
            var text = "Reforço nasce um nível acima mais vezes.";
            if (n >= 4) text += " Carta vermelha combina com o esquadrão.";
            else if (n >= 3) text += " Carta vermelha aparece mais.";
            return text;
          }
        },
        {
          id: "saqueInvasao",
          title: "Saque de invasão",
          max: 3,
          cost: function (lv) { return [900, 2100, 3800][lv]; },
          desc: function (lv) {
            var n = lv + 1;
            return "Na invasão: +" + (n * 12) + "% no Cofre. +" + (n * 25) + " moedas e +" + n + " arquivo" + (n === 1 ? "" : "s") + " por fase.";
          }
        },
        {
          id: "dossieInicial",
          title: "Dossiê inicial",
          max: 1,
          capstone: true,
          cost: function () { return 3000; },
          lock: function () {
            var p = permOf();
            return (p.rerolls | 0) + (p.luck | 0) + (p.briefing | 0) < 2;
          },
          lockHint: function () { return "Sobe Troca extra, Reforço melhor ou Carta vermelha certa."; },
          desc: function () { return "Começa com 1 carta amarela extra."; }
        },
        {
          id: "briefing",
          title: "Carta vermelha certa",
          max: 1,
          capstone: true,
          cost: function () { return 3200; },
          lock: function () {
            var p = permOf();
            return (p.gold | 0) + (p.luck | 0) + (p.rerolls | 0) < 3;
          },
          lockHint: function () { return "Sobe Mais moedas, Reforço melhor ou Troca extra."; },
          desc: function () { return "A carta vermelha combina com o esquadrão."; }
        }
      ]
    },
    {
      id: "quartel",
      board: "quartel",
      kicker: "Linha",
      title: "Quartel",
      stamp: "QUARTEL",
      blurb: "A primeira é a sua. 2ª: Invasão 3. 3ª: Invasão 5. Outras +60%.",
      items: [
        {
          id: "otica",
          title: "Ótica",
          school: true,
          schoolSet: "quartel",
          max: 3,
          cost: function (lv) { return quartelCost("otica", lv); },
          lock: function (lv) { return lv < 1 && quartelSlotLocked("otica"); },
          lockHint: function () { return quartelLockHint("otica"); },
          desc: function (lv) {
            var n = lv + 1;
            var tax = taxNote({ school: true, schoolSet: "quartel", id: "otica" });
            if (n >= 3) return "Linha: +18% dano. Marca dura mais. Formação inicial: Ótica." + tax;
            return "Sniper, observador, designado, antimaterial: +" + (n * 6) + "% dano. Marca dura mais." + tax;
          }
        },
        {
          id: "supressao",
          title: "Supressão",
          school: true,
          schoolSet: "quartel",
          max: 3,
          cost: function (lv) { return quartelCost("supressao", lv); },
          lock: function (lv) { return lv < 1 && quartelSlotLocked("supressao"); },
          lockHint: function () { return quartelLockHint("supressao"); },
          desc: function (lv) {
            var n = lv + 1;
            var tax = taxNote({ school: true, schoolSet: "quartel", id: "supressao" });
            if (n >= 3) return "Linha: +18% cadência, +12% dano. Giratória esquenta mais rápido. Inferno/Míssil: 12 arquivos. Formação inicial: Supressão." + tax;
            return "Metralhador, giratória, lança-chamas, canhoneiro: +" + (n * 6) + "% cadência, +" + (n * 4) + "% dano." + tax;
          }
        },
        {
          id: "blindados",
          title: "Blindados",
          school: true,
          schoolSet: "quartel",
          max: 3,
          cost: function (lv) { return quartelCost("blindados", lv); },
          lock: function (lv) { return lv < 1 && quartelSlotLocked("blindados"); },
          lockHint: function () { return quartelLockHint("blindados"); },
          desc: function (lv) {
            var n = lv + 1;
            var tax = taxNote({ school: true, schoolSet: "quartel", id: "blindados" });
            if (n >= 3) return "Linha: +15% vida, −12% dano recebido. Quartel spawna mais rápido. Colosso: 80 arquivos. Formação inicial: Blindados." + tax;
            return "Caminhão, mini-tanque, tanque, quartel, oficina: +" + (n * 5) + "% vida, −" + (n * 4) + "% dano recebido." + tax;
          }
        },
        {
          id: "triagem",
          title: "Triagem",
          school: true,
          schoolSet: "quartel",
          max: 3,
          cost: function (lv) { return quartelCost("triagem", lv); },
          lock: function (lv) { return lv < 1 && quartelSlotLocked("triagem"); },
          lockHint: function () { return quartelLockHint("triagem"); },
          desc: function (lv) {
            var n = lv + 1;
            var tax = taxNote({ school: true, schoolSet: "quartel", id: "triagem" });
            if (n >= 3) return "Linha médica: kit e âncora mais fortes. Kit +1 pacote. Formação inicial: pistoleiro." + tax;
            return "Médico, cirurgião, capelão, socorrista: kit e âncora +" + (n * 8) + "%." + tax;
          }
        },
        {
          id: "raide",
          title: "Raide",
          school: true,
          schoolSet: "quartel",
          max: 3,
          cost: function (lv) { return quartelCost("raide", lv); },
          lock: function (lv) { return lv < 1 && quartelSlotLocked("raide"); },
          lockHint: function () { return quartelLockHint("raide"); },
          desc: function (lv) {
            var n = lv + 1;
            var tax = taxNote({ school: true, schoolSet: "quartel", id: "raide" });
            if (n >= 3) return "Linha: +21% dano. Fumaça +20% duração. Formação inicial: Raide." + tax;
            return "Batedor, infiltrador, assassino, fora-da-lei: +" + (n * 7) + "% dano." + tax;
          }
        },
        {
          id: "forca",
          title: "Força",
          school: true,
          schoolSet: "quartel",
          max: 3,
          cost: function (lv) { return quartelCost("forca", lv); },
          lock: function (lv) { return lv < 1 && quartelSlotLocked("forca"); },
          lockHint: function () { return quartelLockHint("forca"); },
          desc: function (lv) {
            var n = lv + 1;
            var tax = taxNote({ school: true, schoolSet: "quartel", id: "forca" });
            if (n >= 3) return "Linha: +18% dano. Menu da força −24% recarga. Mestre: 12 arquivos. Formação inicial: Força." + tax;
            return "Psíquico, escolhido, jedi, mestre: +" + (n * 6) + "% dano. Menu da força −" + (n * 8) + "% recarga." + tax;
          }
        }
      ]
    },
    {
      id: "comando",
      board: "quartel",
      kicker: "Herói",
      title: "Comando",
      stamp: "COMANDO",
      blurb: "Radial do comandante e unique.",
      items: [
        {
          id: "cmdUp",
          kit: "up",
          title: "Cima",
          max: 2,
          cost: function (lv) { return lv ? 0 : 1600; },
          desc: function (lv) {
            var now = (lv | 0) === 1 ? "B" : "A";
            return "Agora: " + now + ". A · Aura: cura 2%/s, 5s. B · Grito: +20% dano e cadência, 5s.";
          }
        },
        {
          id: "cmdStrike",
          kit: "strike",
          title: "Direita",
          max: 2,
          cost: function (lv) { return lv ? 0 : 1800; },
          desc: function (lv) {
            var now = (lv | 0) === 1 ? "B" : "A";
            return "Agora: " + now + ". A · Airstrike com fogo no chão. B · Cluster: 5 bombas, sem fogo, recarga menor.";
          }
        },
        {
          id: "cmdRecruit",
          kit: "recruit",
          title: "Esquerda",
          max: 2,
          cost: function (lv) { return lv ? 0 : 1600; },
          desc: function (lv) {
            var now = (lv | 0) === 1 ? "B" : "A";
            return "Agora: " + now + ". A · Recruta no comandante. B · +2 arquivos. Mesma recarga.";
          }
        },
        {
          id: "guerrilhaEnsaiada",
          title: "Guerrilha ensaiada",
          max: 2,
          cost: function (lv) { return [1400, 2800][lv]; },
          desc: function (lv) {
            if (lv >= 1) return "Radial −22% recarga. Recruta: 3 por fase.";
            return "Radial −12% recarga.";
          }
        },
        {
          id: "arquivista",
          title: "Arquivista",
          max: 3,
          cost: function (lv) { return [900, 1800, 3200][lv]; },
          desc: function (lv) {
            var n = lv + 1;
            var text = "+" + (n * 4) + "% chance de reforço.";
            if (n >= 2) text += " +1 arquivo no começo.";
            if (n >= 3) text += " 12% da baixa virar arquivo.";
            return text;
          }
        },
        {
          id: "marcaComando",
          title: "Marca de comando",
          max: 2,
          cost: function (lv) { return [1100, 2400][lv]; },
          desc: function (lv) {
            if (lv >= 1) return "Laser pega de mais longe. Alvo marcado: +16% dano. Esquadrão mira nele.";
            return "Laser pega de mais longe. Alvo marcado: +8% dano.";
          }
        },
        {
          id: "segundoFolego",
          title: "Segundo fôlego",
          max: 1,
          capstone: true,
          cost: function () { return 3600; },
          lock: function () { return (permOf().guerrilhaEnsaiada | 0) < 1; },
          lockHint: function () { return "Precisa de Guerrilha ensaiada."; },
          desc: function () { return "1× por fase: se o comandante cair abaixo de 20% de vida, cura e fica 1s imune."; }
        },
        {
          id: "duplaUnique",
          title: "Licença de unique",
          max: 1,
          capstone: true,
          cost: function () { return 4800; },
          lock: function () {
            var p = permOf();
            if (maxInvasionOf() < 4) return true;
            return (p.supressao | 0) < 2 && (p.raide | 0) < 2;
          },
          lockHint: function () {
            if (maxInvasionOf() < 4) return "Invasão 4.";
            return "Supressão ou Raide no nível 2.";
          },
          desc: function () { return "Inferno e Míssil: até 2 no campo."; }
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

  function grantCard(state, id) {
    var card = G.upgrades.cardById(id);
    if (!card || !state || !state.run) return false;
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
    return true;
  }

  G.upgrades = {
    rank: rankOf,
    bump: bump,
    schoolTax: schoolTax,
    quartelTax: quartelTax,
    shopBoard: "operacao",

    fundedSchool: function () {
      return fundedOf(DOCTRINE_IDS);
    },
    fundedQuartel: function () {
      return fundedOf(QUARTEL_IDS);
    },
    quartelName: function (id) {
      return QUARTEL_NAME[id] || id;
    },
    earlyKinds: function () {
      var q = fundedOf(QUARTEL_IDS);
      if (q && QUARTEL_EARLY[q] && (permOf()[q] | 0) >= 1) return QUARTEL_EARLY[q];
      return G.EARLY_KINDS;
    },
    lineLv: function (spec) {
      return permOf()[spec] | 0;
    },
    lineLvFor: function (u, spec) {
      return lineLvForUnit(u, spec);
    },
    lineLvForKind: function (kind, spec) {
      return lineLvForKind(kind, spec);
    },
    kindInLine: function (kind, spec) {
      return kindInLine(kind, spec);
    },
    itemTax: function (item) {
      if (!item || !item.school) return 1;
      return item.schoolSet === "quartel" ? quartelTax(item.id) : schoolTax(item.id);
    },
    itemFunded: function (item) {
      if (!item || !item.school) return false;
      if (item.schoolSet === "quartel") return fundedOf(QUARTEL_IDS) === item.id;
      return fundedOf(DOCTRINE_IDS) === item.id;
    },
    itemLocked: function (item) {
      if (!item || !item.lock) return false;
      var lv = permOf()[item.id] | 0;
      if (lv >= item.max) return false;
      return !!item.lock(lv);
    },
    itemLockHint: function (item) {
      if (!item || !item.lockHint || !this.itemLocked(item)) return "";
      return item.lockHint() || "";
    },
    itemDesc: function (item, lv, maxed) {
      if (!item || !item.desc) return "";
      var at = maxed ? Math.max(0, item.max - 1) : lv;
      return item.desc(at) || "";
    },
    quartelDmgMul: function (u) {
      if (!u) return 1;
      var m = 1;
      var otica = lineLvForUnit(u, "otica");
      var sup = lineLvForUnit(u, "supressao");
      var bli = lineLvForUnit(u, "blindados");
      var rai = lineLvForUnit(u, "raide");
      var forca = lineLvForUnit(u, "forca");
      if (otica) m *= 1 + 0.06 * otica;
      if (sup) m *= 1 + 0.04 * sup;
      if (bli) m *= 1 + 0.04 * bli;
      if (rai) m *= 1 + 0.07 * rai;
      if (forca) m *= 1 + 0.06 * forca;
      return m;
    },
    quartelFireMul: function (u) {
      var lv = lineLvForUnit(u, "supressao");
      return lv ? 1 + 0.06 * lv : 1;
    },
    quartelHpMul: function (kind) {
      var lv = lineLvForKind(kind, "blindados");
      return lv ? 1 + 0.05 * lv : 1;
    },
    quartelDr: function (u) {
      var lv = lineLvForUnit(u, "blindados");
      return lv ? lv * 0.04 : 0;
    },
    activeCdMul: function (u) {
      if (!u) return 1;
      var best = 0;
      var i;
      for (i = 0; i < QUARTEL_IDS.length; i++) {
        var lv = lineLvForUnit(u, QUARTEL_IDS[i]);
        if (lv > best) best = lv;
      }
      if (best >= 2) return 0.92;
      return 1;
    },
    obsMarkBonus: function () {
      return (permOf().otica | 0) * 1.6;
    },
    kitExtra: function () {
      return (permOf().triagem | 0) >= 3 ? 1 : 0;
    },
    kitHealMul: function () {
      return 1 + (permOf().triagem | 0) * 0.08;
    },
    fieldMedHq: function () {
      return (permOf().triagem | 0) * 0.04;
    },
    smokeMul: function () {
      return (permOf().raide | 0) >= 3 ? 1.2 : 1;
    },
    quartelSpawnMul: function () {
      var lv = permOf().blindados | 0;
      return lv ? 1 + 0.1 * lv : 1;
    },
    girSpinNeed: function () {
      return (permOf().supressao | 0) >= 3 ? 1.25 : 2;
    },
    forceCdMul: function () {
      var lv = permOf().forca | 0;
      return lv ? 1 - 0.08 * lv : 1;
    },
    guerCdMul: function () {
      var lv = permOf().guerrilhaEnsaiada | 0;
      if (lv >= 2) return 0.78;
      if (lv >= 1) return 0.88;
      return 1;
    },
    guerRecruitCap: function () {
      return (permOf().guerrilhaEnsaiada | 0) >= 2 ? 3 : 2;
    },
    cmdKit: function (slot) {
      var id = slot === "strike" ? "cmdStrike" : slot === "recruit" ? "cmdRecruit" : "cmdUp";
      return (permOf()[id] | 0) === 1 ? "b" : "a";
    },
    cmdSlice: function (slot) {
      var b = this.cmdKit(slot) === "b";
      if (slot === "strike") {
        return b
          ? { name: "Cluster", icon: "✸", col: "#ff9a3a" }
          : { name: "Airstrike", icon: "△", col: "#ff9a3a" };
      }
      if (slot === "recruit") {
        return b
          ? { name: "Arquivos", icon: "▤", col: "#ffd24a" }
          : { name: "Recruta", icon: "○", col: "#9ad4ff" };
      }
      return b
        ? { name: "Grito", icon: "⚑", col: "#ffd24a" }
        : { name: "Aura", icon: "✚", col: "#7cffb0" };
    },
    cmdMarkSnap: function () {
      return 36 + (permOf().marcaComando | 0) * 16;
    },
    cmdMarkDmg: function () {
      var lv = permOf().marcaComando | 0;
      return lv ? 1 + 0.08 * lv : 1;
    },
    cmdMarkHold: function () {
      var lv = permOf().marcaComando | 0;
      if (!lv) return 0;
      return 0.4 + 0.5 * lv;
    },
    colossoCost: function () {
      return (permOf().blindados | 0) >= 3 ? 80 : 100;
    },
    uniqueCopyCap: function (kind) {
      if ((kind === "inferno" || kind === "missil") && (permOf().duplaUnique | 0)) return 2;
      return 1;
    },
    promoteCostFor: function (gen, kinds) {
      var i;
      kinds = kinds || [];
      for (i = 0; i < kinds.length; i++) {
        if (kinds[i] === "mestre" && (permOf().forca | 0) >= 3) return 12;
        if ((kinds[i] === "inferno" || kinds[i] === "missil") && (permOf().supressao | 0) >= 3) return 12;
      }
      return 0;
    },
    dropChanceBonus: function () {
      return (permOf().arquivista | 0) * 0.04;
    },
    killArquivoChance: function () {
      return (permOf().arquivista | 0) >= 3 ? 0.12 : 0;
    },
    stageArquivo: function (state) {
      var n = permOf().pocketArquivo | 0;
      var saque = permOf().saqueInvasao | 0;
      var inv = (state && state.run && state.run.invasion) | 0;
      if (inv > 0 && saque) n += saque;
      return n;
    },
    stageGold: function (state) {
      var gold = (permOf().gold | 0) * 20;
      var saque = permOf().saqueInvasao | 0;
      var inv = (state && state.run && state.run.invasion) | 0;
      if (inv > 0 && saque) gold += saque * 25;
      return gold;
    },
    bankRun: function (state) {
      var coins = (state && state.run && state.run.coins) | 0;
      var saque = permOf().saqueInvasao | 0;
      var inv = (state && state.run && state.run.invasion) | 0;
      if (inv > 0 && saque) coins = Math.round(coins * (1 + 0.12 * saque));
      G.save.bank(coins);
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
      m *= G.upgrades.quartelDmgMul(u);
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

    dossierView: function (card, ownedRank, run) {
      ownedRank = ownedRank | 0;
      var src = run || {};
      function fake(ownVal) {
        var o = {};
        for (var k in src) {
          if (Object.prototype.hasOwnProperty.call(src, k)) o[k] = src[k];
        }
        o[card.id] = ownVal;
        return o;
      }
      var titleRun = fake(card.ranks && ownedRank >= 2 ? 1 : 0);
      var title = textOf(card.title, titleRun);
      if (!card.ranks && ownedRank > 1) title += " ×" + ownedRank;
      var lines = [];
      if (card.ranks) {
        lines.push({ mark: "I", text: textOf(card.desc, fake(0)) });
        if (ownedRank >= 2) lines.push({ mark: "II", text: textOf(card.desc, fake(1)) });
      } else {
        lines.push({ mark: "", text: textOf(card.desc, src) });
      }
      return {
        title: title,
        lines: lines,
        combo: textOf(card.combo, src)
      };
    },

    cardById: function (id) {
      for (var i = 0; i < G.RUN_CARDS.length; i++) if (G.RUN_CARDS[i].id === id) return G.RUN_CARDS[i];
      return null;
    },

    applyHqStart: function (run, perm) {
      perm = perm || {};
      if ((perm.choque | 0) >= 3) run.regen = (run.regen || 0) + 0.006;
      if ((perm.choque | 0) >= 4) run.shield = Math.min(0.45, (run.shield || 0) + 0.08);
      if ((perm.mobilidade | 0) >= 3) {
        run.magnet += 70;
        run.speed *= 1.12;
      }
      if ((perm.mobilidade | 0) >= 4) run.dropChance = Math.min(0.5, (run.dropChance || 0) + 0.06);
    },

    grantDoctrineManual: function (state, perm) {
      perm = perm || (G.save && G.save.data && G.save.data.perm) || {};
      if (!(perm.manualCampo | 0) || !state || !state.run) return;
      var school = G.upgrades.fundedSchool();
      var id = { choque: "knockback", disparo: "pierce", mobilidade: "freeze" }[school];
      if (!id) return;
      grantCard(state, id);
      if ((perm.manualCampo | 0) >= 2) grantCard(state, id);
    },

    grantStartDossier: function (state, perm) {
      perm = perm || (G.save && G.save.data && G.save.data.perm) || {};
      if (!(perm.dossieInicial | 0) || !state || !state.run) return;
      var taken = state.run.taken || {};
      var pool = [];
      var i;
      for (i = 0; i < G.RUN_CARDS.length; i++) {
        var card = G.RUN_CARDS[i];
        if (card.rarity !== "confidencial" || card.unique) continue;
        if (taken[card.id]) continue;
        pool.push(card);
      }
      if (!pool.length) return;
      var pick = pool[(Math.random() * pool.length) | 0];
      grantCard(state, pick.id);
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
      var disparoHot = (perm.disparo | 0) >= 4 ? 0.9 : 0.75;
      var briefing = !!(perm.briefing | 0) || (perm.luck | 0) >= 4;
      var a = pickFrom(by.arquivo, seen);
      var c;
      if (disparo) {
        var hot = ["pierce", "ricochet", "dual", "freeze", "knockback", "explode"];
        var preferred = [];
        for (i = 0; i < by.confidencial.length; i++) {
          if (hot.indexOf(by.confidencial[i].id) >= 0) preferred.push(by.confidencial[i]);
        }
        c = (preferred.length && Math.random() < disparoHot) ? pickFrom(preferred, seen) : pickFrom(by.confidencial, seen);
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
      if (item && item.kit) {
        var kitLv = G.save.data.perm[item.id] | 0;
        if (kitLv <= 0) {
          if (G.upgrades.itemLocked(item)) return false;
          if (!G.save.spend(item.cost(0))) return false;
          G.save.data.perm[item.id] = 1;
        } else {
          G.save.data.perm[item.id] = kitLv === 1 ? 2 : 1;
        }
        G.save.persist();
        return true;
      }
      var lv = G.save.data.perm[item.id] | 0;
      if (lv >= item.max) return false;
      if (G.upgrades.itemLocked(item)) return false;
      var cost = item.cost(lv);
      if (!G.save.spend(cost)) return false;
      G.save.data.perm[item.id] = lv + 1;
      G.save.persist();
      return true;
    }
  };
})(window.TFAG = window.TFAG || {});
