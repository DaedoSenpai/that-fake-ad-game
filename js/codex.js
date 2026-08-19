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
    }
  };
})(window.TFAG = window.TFAG || {});
