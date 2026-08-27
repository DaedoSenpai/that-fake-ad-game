(function (G) {
  G.debug = {
    CODE: "HU3BR",
    buf: "",
    bufT: 0,
    selectedStage: 0,
    selectedInvasion: 0,
    dmgMul: 1,
    god: false,
    startArchives: false,

    isOn: function () {
      return !!G.save.debugUnlocked;
    },

    resetTaps: function () {
      this.buf = "";
      this.bufT = 0;
    },

    noteKey: function (ch) {
      var now = Date.now();
      if (now - (this.bufT || 0) > 2500) this.buf = "";
      this.bufT = now;
      ch = String(ch || "").toUpperCase();
      if (ch.length !== 1) return 0;
      this.buf = (this.buf + ch).slice(-this.CODE.length);
      if (this.buf !== this.CODE) return this.buf.length;
      this.buf = "";
      if (this.isOn()) return "open";
      G.save.debugUnlocked = true;
      return "unlocked";
    },

    unitsComplete: function () {
      if (!G.codex) return false;
      var c = G.codex.counts();
      return c.units >= c.unitMax && c.enemies >= c.enemyMax;
    },

    permMaxed: function () {
      if (!G.PERM) return false;
      for (var i = 0; i < G.PERM.length; i++) {
        if ((G.save.data.perm[G.PERM[i].id] | 0) < G.PERM[i].max) return false;
      }
      return true;
    },

    invasionMaxed: function () {
      return !!(G.invasion && this.invasionUnlocked() >= G.invasion.MAX);
    },

    invasionUnlocked: function () {
      return (G.save.data && G.save.data.maxInvasion) | 0;
    },

    unlockUnits: function () {
      if (this.unitsComplete()) return false;
      G.codex.ensure();
      G.unitList().forEach(function (kind) {
        G.save.data.codex.units[kind] = true;
      });
      Object.keys(G.ENEMY_DEFS).forEach(function (type) {
        var def = G.ENEMY_DEFS[type];
        if (def && !def.codexHide) G.save.data.codex.enemies[type] = true;
      });
      G.save.persist();
      return true;
    },

    maxUpgrades: function () {
      if (this.permMaxed()) return false;
      G.PERM.forEach(function (item) {
        G.save.data.perm[item.id] = item.max;
      });
      G.save.persist();
      return true;
    },

    unlockInvasion: function () {
      if (!G.invasion || this.invasionMaxed()) return false;
      G.save.data.maxInvasion = G.invasion.MAX;
      G.save.persist();
      return true;
    },

    unlockAll: function () {
      var u = this.unlockUnits();
      var p = this.maxUpgrades();
      var i = this.unlockInvasion();
      return u || p || i;
    },

    stageCount: function () {
      return (G.STAGES && G.STAGES.length) || 0;
    },

    stageInfo: function (i) {
      var stage = G.STAGES[i];
      if (!stage) return { name: "—", boss: "—", bossType: "" };
      var waves = stage.waves || [];
      var last = waves[waves.length - 1] || [];
      var bossType = "";
      var bossName = "onda final";
      for (var w = 0; w < last.length; w++) {
        var def = G.ENEMY_DEFS[last[w].type];
        if (def && def.boss) {
          bossType = last[w].type;
          bossName = def.name;
          break;
        }
      }
      return { name: stage.name, boss: bossName, bossType: bossType };
    },

    clampStage: function (i) {
      var max = Math.max(0, this.stageCount() - 1);
      i = i | 0;
      if (i < 0) return 0;
      if (i > max) return max;
      return i;
    },

    invasionMax: function () {
      return (G.invasion && G.invasion.MAX) || 8;
    },

    clampInvasion: function (n) {
      n = n | 0;
      if (n < 0) return 0;
      var max = this.invasionMax();
      if (n > max) return max;
      return n;
    },

    clampDmgMul: function (n) {
      n = Number(n);
      if (isNaN(n)) return 1;
      return Math.max(1, Math.min(50, Math.round(n)));
    },

    playOpts: function (extra) {
      var opts = {
        debug: true,
        stageIndex: this.clampStage(this.selectedStage),
        invasion: this.clampInvasion(this.selectedInvasion),
        dmgMul: this.clampDmgMul(this.dmgMul),
        god: !!this.god,
        startArchives: !!this.startArchives
      };
      if (extra) {
        Object.keys(extra).forEach(function (k) {
          opts[k] = extra[k];
        });
      }
      return opts;
    }
  };
})(window.TFAG = window.TFAG || {});
