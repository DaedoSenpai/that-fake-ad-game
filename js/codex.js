(function (G) {
  G.codex = {
    ensure: function () {
      var d = G.save.data;
      if (!d.codex) d.codex = { units: {}, enemies: {} };
      if (!d.codex.units) d.codex.units = {};
      if (!d.codex.enemies) d.codex.enemies = {};
    },

    hasUnit: function (kind) {
      this.ensure();
      return !!G.save.data.codex.units[kind];
    },

    hasEnemy: function (type) {
      this.ensure();
      return !!G.save.data.codex.enemies[type];
    },

    unlockUnit: function (kind) {
      this.ensure();
      if (!kind || G.save.data.codex.units[kind]) return false;
      G.save.data.codex.units[kind] = true;
      G.save.persist();
      return true;
    },

    unlockEnemy: function (type) {
      this.ensure();
      var def = G.ENEMY_DEFS[type];
      if (!type || !def || def.codexHide || G.save.data.codex.enemies[type]) return false;
      G.save.data.codex.enemies[type] = true;
      G.save.persist();
      return true;
    },

    counts: function () {
      this.ensure();
      var u = Object.keys(G.save.data.codex.units).length;
      var keys = Object.keys(G.ENEMY_DEFS).filter(function (k) {
        return !G.ENEMY_DEFS[k].codexHide;
      });
      var e = 0;
      keys.forEach(function (k) {
        if (G.save.data.codex.enemies[k]) e++;
      });
      return { units: u, unitMax: G.unitList().length, enemies: e, enemyMax: keys.length };
    },

    allySections: function () {
      var groups = [
        { id: "cmd", title: "Comando", jump: "CMD", hint: "Não ocupa vaga e não entra na pirâmide.", tone: "cmd", kinds: [] },
        { id: "base", title: "Recruta", jump: "REC", hint: "A semente. Dois iguais abrem o Tier 1.", tone: "t1", kinds: [] },
        { id: "t1", title: "Tier 1", jump: "T1", hint: "Primeira promoção: fuzil, pistola, batedor ou psíquico.", tone: "t2", kinds: [] },
        { id: "t2", title: "Tier 2", jump: "T2", hint: "O meio baixo da pirâmide. Já muda o kit.", tone: "t3", kinds: [] },
        { id: "t3", title: "Tier 3", jump: "T3", hint: "Especialistas. A linha ganha identidade.", tone: "t4", kinds: [] },
        { id: "t4", title: "Tier 4", jump: "T4", hint: "Ápice de cada ramo — vários são únicos.", tone: "t5", kinds: [] },
        { id: "t5", title: "Tier 5", jump: "T5", hint: "O Colosso. Um só, caro, o esquadrão inteiro gira em volta.", tone: "t5", kinds: [] }
      ];
      var byId = {};
      groups.forEach(function (g) { byId[g.id] = g; });
      G.unitList().forEach(function (kind) {
        var def = G.UNIT_DEFS[kind];
        if (!def) return;
        var id = "base";
        if (def.role === "commander") id = "cmd";
        else if (def.gen <= 0) id = "base";
        else if (def.gen === 1) id = "t1";
        else if (def.gen === 2) id = "t2";
        else if (def.gen === 3) id = "t3";
        else if (def.gen === 4) id = "t4";
        else id = "t5";
        byId[id].kinds.push(kind);
      });
      return groups.filter(function (g) { return g.kinds.length; });
    },

    enemySections: function () {
      var lists = [
        {
          id: "swarm", title: "Enxame", jump: "Enxame", hint: "A massa da colmeia. Fracos sozinhos, ruins em grupo.", tone: "swarm",
          kinds: ["infantaria", "corredor", "atirador", "drone", "kamikaze", "medico", "fragmento", "larva", "sombra", "sniper", "parasita", "criomante"]
        },
        {
          id: "heavy", title: "Couraça", jump: "Couraça", hint: "Bicho que demora pra cair ou pune de longe.", tone: "heavy",
          kinds: ["escudeiro", "tanque", "artilharia", "ninho"]
        },
        {
          id: "invasion", title: "Tropa da invasão", jump: "Invasão", hint: "O espelho hostil do esquadrão. Vem com o Irwin.", tone: "invasion",
          kinds: ["fuzileiro_alien", "batedor_alien", "pistoleiro_alien", "fuzileiro_elite", "fuzileiro_veterano", "pistoleiro_elite", "medico_alien", "batedor_elite", "infiltrador_alien"]
        },
        {
          id: "hive", title: "Corte da colmeia", jump: "Colmeia", hint: "Abelhas da rainha e do rei. Merge entre elas.", tone: "hive",
          kinds: ["hive_bee", "elite_bee", "royal_bee", "mini_beemote", "abelha_enfermeira", "abelha_arquiteta"]
        },
        {
          id: "arena", title: "Arena", jump: "Arena", hint: "Não é a linha de frente: totem, sentry, prisma.", tone: "arena",
          kinds: ["fogueira", "kaska_sentry", "dobrador_luz"]
        },
        {
          id: "mini", title: "Minibosses", jump: "Mini", hint: "Pesa igual chefe, mas não fecha a fase.", tone: "mini",
          kinds: ["formiga_leao", "besouro_bombardeiro", "louva_deus"]
        },
        {
          id: "boss", title: "Chefes", jump: "Chefes", hint: "Quem segura a fase. Um de cada mapa.", tone: "boss",
          kinds: ["chefe_invasao", "chefe_comandante", "chefe_vulto", "chefe_megatanque", "chefe_beeking", "beeprincess", "chefe_arklan", "chefe_fortaleza", "chefe_espectro", "chefe_final"]
        }
      ];
      var used = {};
      lists.forEach(function (sec) {
        sec.kinds = sec.kinds.filter(function (k) {
          var d = G.ENEMY_DEFS[k];
          if (!d || d.codexHide) return false;
          used[k] = true;
          return true;
        });
      });
      var extra = Object.keys(G.ENEMY_DEFS).filter(function (k) {
        var d = G.ENEMY_DEFS[k];
        return d && !d.codexHide && !used[k];
      });
      if (extra.length) {
        lists.push({ id: "other", title: "Outros", hint: "Ainda não encaixou nas prateleiras.", tone: "arena", kinds: extra });
      }
      return lists.filter(function (sec) { return sec.kinds.length; });
    }
  };
})(window.TFAG = window.TFAG || {});
