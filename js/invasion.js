(function (G) {
  G.invasion = {
    MAX: 8,
    PHALANX_R: 122,

    hpMul: function (level) {
      return 1 + 0.2 * Math.max(0, level | 0);
    },

    spawnMul: function (level) {
      return 1 + 0.1 * Math.max(0, level | 0);
    },

    speedMul: function (level) {
      return 1 + 0.02 * Math.max(0, level | 0);
    },

    selected: function () {
      return (G.save.data && G.save.data.invasion) | 0;
    },

    unlocked: function () {
      return (G.save.data && G.save.data.maxInvasion) | 0;
    },

    setSelected: function (n) {
      n = n | 0;
      if (n < 0) n = 0;
      if (n > this.MAX) n = this.MAX;
      if (n > 0 && n > this.unlocked()) n = this.unlocked();
      G.save.data.invasion = n;
      G.save.persist();
    },

    noteWin: function (played) {
      played = played | 0;
      var next = Math.min(this.MAX, played + 1);
      if (next > this.unlocked()) {
        G.save.data.maxInvasion = next;
        if (!G.save.data.invasion) G.save.data.invasion = next;
        G.save.persist();
        return next;
      }
      return this.unlocked();
    },

    enraged: function (state, stageIndex) {
      var inv = (state && state.run && state.run.invasion) | 0;
      return inv >= (stageIndex | 0) + 1;
    },

    isP2: function (e) {
      return !!(e && e.inv && e.hp <= e.maxHp * 0.5);
    },

    stamp: function (state, e) {
      if (!e || !e.def || !state || !state.run) return e;
      var mul = this.hpMul(state.run.invasion | 0);
      if (mul !== 1) {
        e.maxHp = Math.round(e.maxHp * mul);
        e.hp = e.maxHp;
      }
      var spdMul = this.speedMul(state.run.invasion | 0);
      if (spdMul !== 1 && e.def && (e.def.speed || 0) > 0 && !e.def._invScaled) {
        e.def = Object.assign({}, e.def);
        e.def.speed *= spdMul;
        e.def._invScaled = true;
      }
      var stage = state.stageIndex | 0;
      if (e.def.boss && !e.fake && !e.def.codexHide && this.enraged(state, stage) && e.type !== "beeprincess") {
        e.inv = true;
        e.hpBars = 2;
        e.maxHp *= 2;
        e.hp = e.maxHp;
      }
      return e;
    },

    enterP2: function (state, e, label) {
      if (!e || e.invP2) return false;
      if (!this.isP2(e)) return false;
      e.invP2 = true;
      state.banner = { text: label || "Segunda fase", t: 2.2 };
      G.burst(state, e.x, e.y, e.def.color || "#ff6a3a", 28, 160);
      state.shake = Math.max(state.shake || 0, 8);
      return true;
    },

    countType: function (state, type) {
      var n = 0;
      for (var i = 0; i < state.enemies.length; i++) {
        if (state.enemies[i].hp > 0 && state.enemies[i].type === type) n++;
      }
      return n;
    },

    maybePrincess: function (state) {
      if (!this.enraged(state, 3)) return;
      if (this.countType(state, "beeprincess")) return;
      var queenDead = true;
      var kingDead = true;
      for (var i = 0; i < state.enemies.length; i++) {
        var e = state.enemies[i];
        if (e.hp <= 0) continue;
        if (e.type === "chefe_megatanque") queenDead = false;
        if (e.type === "chefe_beeking") kingDead = false;
      }
      if (!queenDead || !kingDead) return;
      var b = G.playfield(state);
      var p = G.game.spawnAt(state, "beeprincess", (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, { noLink: true });
      p.skillT = 1.4;
      p.princessAct = "";
      state.banner = { text: "Beeprincess-09 entra no campo", t: 2.4 };
      G.audio.sync(state, 0);
    },

    spawnFires: function (state) {
      var b = G.playfield(state);
      var pad = 54;
      var spots = [
        { x: b.x0 + pad, y: b.y0 + pad },
        { x: b.x1 - pad, y: b.y0 + pad },
        { x: b.x0 + pad, y: b.y1 - pad },
        { x: b.x1 - pad, y: b.y1 - pad }
      ];
      for (var i = 0; i < spots.length; i++) {
        G.game.spawnAt(state, "fogueira", spots[i].x, spots[i].y, { noDrop: true });
      }
      state.banner = { text: "Apague as fogueiras", t: 2.0 };
    },

    firesAlive: function (state) {
      return this.countType(state, "fogueira") > 0;
    },

    pickOpposite: function (state, from) {
      var b = G.playfield(state);
      var cx = (b.x0 + b.x1) / 2;
      var cy = (b.y0 + b.y1) / 2;
      var dx = from.x - cx;
      var dy = from.y - cy;
      return {
        x: Math.max(b.x0 + 40, Math.min(b.x1 - 40, cx - dx * 0.85)),
        y: Math.max(b.y0 + 40, Math.min(b.y1 - 40, cy - dy * 0.85))
      };
    }
  };
})(window.TFAG = window.TFAG || {});
