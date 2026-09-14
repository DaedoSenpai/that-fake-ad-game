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
        { id: "cmd", title: "Comando", jump: "CMD", tone: "cmd", kinds: [] },
        { id: "base", title: "Recruta", jump: "REC", tone: "t1", kinds: [] },
        { id: "t1", title: "Tier 1", jump: "T1", tone: "t2", kinds: [] },
        { id: "t2", title: "Tier 2", jump: "T2", tone: "t3", kinds: [] },
        { id: "t3", title: "Tier 3", jump: "T3", tone: "t4", kinds: [] },
        { id: "t4", title: "Tier 4", jump: "T4", tone: "t5", kinds: [] },
        { id: "t5", title: "Tier 5", jump: "T5", tone: "t5", kinds: [] }
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
      var miniType = {
        formiga_leao: true,
        besouro_bombardeiro: true,
        louva_deus: true
      };
      var groups = [
        { id: "foe", title: "Inimigos", jump: "Tropa", tone: "foe", kinds: [] },
        { id: "mini", title: "Mini bosses", jump: "Mini", tone: "mini", kinds: [] },
        { id: "boss", title: "Bosses", jump: "Chefes", tone: "boss", kinds: [] }
      ];
      Object.keys(G.ENEMY_DEFS).forEach(function (k) {
        var d = G.ENEMY_DEFS[k];
        if (!d || d.codexHide) return;
        var kind = String(d.kind || "");
        var shelf = 0;
        if (miniType[k] || (d.boss && kind.indexOf("mini_") === 0)) shelf = 1;
        else if (d.boss) shelf = 2;
        groups[shelf].kinds.push(k);
      });
      return groups.filter(function (g) { return g.kinds.length; });
    }
  };
})(window.TFAG = window.TFAG || {});
