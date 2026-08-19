(function (G) {
  G.RUN_CARDS = [
    { id: "dmg", title: "Mais dano", desc: "+18% de dano em todas as unidades.", apply: function (run) { run.dmg *= 1.18; } },
    { id: "fire", title: "Cadência", desc: "+20% na velocidade de tiro.", apply: function (run) { run.fireRate *= 1.2; } },
    { id: "hp", title: "Blindagem", desc: "+20% de HP no esquadrão e uma cura na hora.", apply: function (run, state) {
      run.hp *= 1.2;
      for (var i = 0; i < state.units.length; i++) {
        var u = state.units[i];
        u.maxHp = Math.round(u.maxHp * 1.2);
        u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.35));
      }
    } },
    { id: "speed", title: "Marcha rápida", desc: "+16% de velocidade no esquadrão.", apply: function (run) { run.speed *= 1.16; } },
    { id: "magnet", title: "Ímã de loot", desc: "Puxa moeda e reforço de mais longe.", apply: function (run) { run.magnet += 70; } },
    { id: "drop", title: "Reforços", desc: "Inimigo solta unidade com mais frequência.", apply: function (run) { run.dropChance = Math.min(0.5, run.dropChance + 0.1); } },
    { id: "explode", title: "Explosão final", desc: "Inimigo explode ao morrer.", unique: true, apply: function (run) { run.explode = true; } },
    { id: "ricochet", title: "Ricochete", desc: "O tiro pula pra um segundo alvo.", unique: true, apply: function (run) { run.ricochet = true; } },
    { id: "dual", title: "Fogo duplo", desc: "Cada disparo manda um segundo tiro na mesma mira.", unique: true, apply: function (run) { run.dual = true; } },
    { id: "pierce", title: "Perfuração", desc: "O projétil atravessa vários inimigos.", unique: true, apply: function (run) { run.pierce = true; } },
    { id: "freeze", title: "Munição gelada", desc: "Acerto deixa o inimigo lento.", unique: true, apply: function (run) { run.freeze = true; } },
    { id: "lifesteal", title: "Dreno", desc: "Dano causado cura o esquadrão.", unique: true, apply: function (run) { run.lifesteal = true; } },
    { id: "shield", title: "Campo de força", desc: "Toma 18% menos dano.", apply: function (run) { run.shield = Math.min(0.45, (run.shield || 0) + 0.18); } },
    { id: "luck", title: "Sorte de recrutador", desc: "Reforço pode nascer um nível acima.", apply: function (run) { run.luck = (run.luck || 0) + 0.2; } },
    { id: "gold", title: "Saque de guerra", desc: "+25% de moedas nesta run.", apply: function (run) { run.gold = (run.gold || 0) + 0.25; } },
    { id: "knockback", title: "Impacto", desc: "Acerto empurra o inimigo.", unique: true, apply: function (run) { run.knockback = true; } },
    { id: "minesPlus", title: "Campo minado", desc: "Minas ficam numa área maior e você planta mais.", favor: { projectile: "mine" }, apply: function (run) { run.minesPlus = (run.minesPlus || 0) + 1; } },
    { id: "flame", title: "Combustível extra", desc: "Lança-chamas alcança mais e queima mais forte.", favor: { projectile: "flame" }, apply: function (run) { run.flame = (run.flame || 0) + 1; } },
    { id: "berserk", title: "Último suspiro", desc: "Quanto menos HP, mais dano.", unique: true, apply: function (run) { run.berserk = true; } },
    { id: "regen", title: "Rações", desc: "O esquadrão regenera HP no combate.", apply: function (run) { run.regen = (run.regen || 0) + 0.006; } },
    { id: "boom", title: "Carga extra", desc: "Explosão (morte, míssil, granada) fica maior.", favor: { projectile: ["missile", "grenade"], explode: true }, apply: function (run) { run.boom = (run.boom || 0) + 10; } },
    { id: "clone", title: "Cópia de guerra", desc: "Duplica o soldado de menor nível. Se o grupo lotou, vira arquivo de guerra.", apply: function (run, state) {
      var soldiers = [];
      for (var i = 0; i < state.units.length; i++) {
        if (state.units[i].hp > 0 && !state.units[i].commander) soldiers.push(state.units[i]);
      }
      if (!soldiers.length) return;
      var low = soldiers[0];
      for (var s = 1; s < soldiers.length; s++) if ((soldiers[s].gen || 0) < (low.gen || 0)) low = soldiers[s];
      if (G.soldierCount(state) < G.maxUnits()) {
        state.units.push(G.createPlayerUnit(low.x + 12, low.y + 12, low.kind, state.run, G.save.data.perm));
      } else {
        G.merge.addArquivo(state, low.x, low.y);
      }
    } },
    { id: "ficha", title: "Ficha de arquivo", desc: "+1 troca de cartas nesta run. Raro.", unique: true, apply: function (run) { run.ficha = true; run.rerolls = (run.rerolls || 0) + 1; } }
  ];

  G.PERM = [
    {
      id: "extraStart",
      title: "Unidade extra no começo",
      max: 4,
      cost: function (lv) { return 80 * Math.pow(2, lv); },
      desc: function (lv) { return "Começa com +" + (lv + 1) + " soldado."; }
    },
    {
      id: "dmg",
      title: "Dano permanente",
      max: 10,
      cost: function (lv) { return 50 * (lv + 1); },
      desc: function (lv) { return "+" + ((lv + 1) * 8) + "% de dano em toda run."; }
    },
    {
      id: "hp",
      title: "HP permanente",
      max: 10,
      cost: function (lv) { return 50 * (lv + 1); },
      desc: function (lv) { return "+" + ((lv + 1) * 10) + "% de HP em toda run."; }
    },
    {
      id: "fireRate",
      title: "Gatilho permanente",
      max: 8,
      cost: function (lv) { return 60 * (lv + 1); },
      desc: function (lv) { return "+" + ((lv + 1) * 8) + "% de cadência em toda run."; }
    },
    {
      id: "speed",
      title: "Marcha permanente",
      max: 8,
      cost: function (lv) { return 55 * (lv + 1); },
      desc: function (lv) { return "+" + ((lv + 1) * 6) + "% de velocidade em toda run."; }
    },
    {
      id: "earlyTier",
      title: "Merge antecipado",
      max: 4,
      cost: function (lv) { return [200, 450, 900, 1600][lv]; },
      desc: function (lv) {
        var kind = G.EARLY_KINDS[Math.min(G.EARLY_KINDS.length - 1, lv + 1)];
        return "Começa como " + G.UNIT_DEFS[kind].name + ".";
      }
    },
    {
      id: "luck",
      title: "Sorte permanente",
      max: 5,
      cost: function (lv) { return 90 * (lv + 1); },
      desc: function (lv) { return "Mais chance do reforço nascer um nível acima."; }
    },
    {
      id: "gold",
      title: "Saque permanente",
      max: 5,
      cost: function (lv) { return 80 * (lv + 1); },
      desc: function (lv) { return "+" + ((lv + 1) * 12) + "% de moedas em toda run."; }
    },
    {
      id: "regen",
      title: "Rações permanentes",
      max: 5,
      cost: function (lv) { return 100 * (lv + 1); },
      desc: function (lv) { return "Regenera HP no combate."; }
    },
    {
      id: "magnet",
      title: "Ímã permanente",
      max: 5,
      cost: function (lv) { return 70 * (lv + 1); },
      desc: function (lv) { return "Puxa loot de mais longe."; }
    },
    {
      id: "maxUnits",
      title: "Limite do esquadrão",
      max: 5,
      cost: function (lv) { return [180, 320, 520, 840, 1300][lv]; },
      desc: function (lv) { return "O esquadrão cabe até " + (5 + lv + 1) + " soldados."; }
    },
    {
      id: "rerolls",
      title: "Fichas de arquivo",
      max: 2,
      cost: function (lv) { return [650, 2200][lv]; },
      desc: function (lv) { return "Começa cada run com " + (lv + 1) + " ficha pra trocar carta."; }
    }
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
      taken: run.taken,
      ficha: !!run.ficha,
      rerolls: run.rerolls | 0,
      intel: {
        arquivo: (run.intel && run.intel.arquivo) | 0,
        confidencial: (run.intel && run.intel.confidencial) | 0,
        maximo: (run.intel && run.intel.maximo) | 0
      }
    }));
  }

  G.upgrades = {
    defaultRun: function () {
      return {
        dmg: 1,
        fireRate: 1,
        hp: 1,
        speed: 1,
        magnet: 0,
        dropChance: 0.16,
        explode: false,
        ricochet: false,
        dual: false,
        pierce: false,
        freeze: false,
        lifesteal: false,
        shield: 0,
        luck: 0,
        gold: 0,
        knockback: false,
        minesPlus: 0,
        flame: 0,
        berserk: false,
        regen: 0,
        boom: 0,
        coins: 0,
        kills: 0,
        taken: {},
        rerolls: G.save.data.perm.rerolls | 0,
        ficha: false,
        reserve: [],
        intel: { arquivo: 0, confidencial: 0, maximo: 0 },
        tempDmg: 1,
        tempSpeed: 1,
        tempShield: 0,
        tempT: 0,
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
      if (favor.explode && state && state.run && state.run.explode) return true;
      return false;
    },

    cardAvailable: function (card, state) {
      var run = (state && state.run) || {};
      if (card.unique && (run[card.id] || (run.taken && run.taken[card.id]))) return false;
      if (!card.favor) return true;
      if (card.favor.explode && run.explode) return true;
      var units = (state && state.units) || [];
      for (var i = 0; i < units.length; i++) {
        if (G.upgrades.matchesFavor(units[i], card.favor, state)) return true;
      }
      return false;
    },

    pickThree: function (state) {
      var pool = G.RUN_CARDS.filter(function (c) {
        return G.upgrades.cardAvailable(c, state);
      });
      var bag = [];
      for (var i = 0; i < pool.length; i++) {
        var w = pool[i].id === "ficha" ? 1 : 5;
        for (var k = 0; k < w; k++) bag.push(pool[i]);
      }
      var picked = [];
      var seen = {};
      var mixed = shuffle(bag);
      for (var j = 0; j < mixed.length && picked.length < 3; j++) {
        if (seen[mixed[j].id]) continue;
        seen[mixed[j].id] = true;
        picked.push(mixed[j]);
      }
      return picked;
    },

    applyCard: function (card, state) {
      if (!state.history) state.history = [];
      state.history.push(G.upgrades.snapshot(state));
      card.apply(state.run, state);
      state.run.taken[card.id] = true;
    },

    undoLast: function (state) {
      if (!state.history || !state.history.length) return false;
      G.upgrades.restore(state, state.history.pop());
      return true;
    },

    spentPerm: function () {
      var total = 0;
      G.PERM.forEach(function (item) {
        var lv = G.save.data.perm[item.id] | 0;
        for (var i = 0; i < lv; i++) total += item.cost(i);
      });
      return total;
    },

    refundPerm: function () {
      var total = G.upgrades.spentPerm();
      if (!total) return 0;
      G.PERM.forEach(function (item) {
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
