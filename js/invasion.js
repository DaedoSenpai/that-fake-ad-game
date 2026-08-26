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

    P2_HP_BUFF: 1.2,

    cinematic: function (state) {
      return !!(state && state.bossCutscene);
    },

    locked: function (state) {
      return !!(state && (state.bossCutscene || state.stageOutro));
    },

    wantsTwoBars: function (state, e) {
      if (!e || !e.def || !e.def.boss || e.fake || e.def.codexHide) return false;
      if (e.type === "beeprincess" || e.type === "chefe_final") return false;
      return this.enraged(state, state.stageIndex | 0);
    },

    barCount: function (e) {
      return Math.max(1, (e && e.hpBars) || 1);
    },

    atP2Threshold: function (e) {
      if (!e || e.p2 || e.hp <= 0) return false;
      if (this.barCount(e) < 2) return false;
      return e.hp <= e.maxHp / this.barCount(e);
    },

    isP2: function (e) {
      if (!e) return false;
      if (e.invP2 || (e.inv && e.p2)) return true;
      return !!(e.inv && this.atP2Threshold(e));
    },

    rage: function (e) {
      if (!e) return false;
      if (e.p2 || e.invP2) return true;
      return e.hp <= e.maxHp * 0.5;
    },

    heal: function (e, amount) {
      if (!e || e.hp <= 0 || !(amount > 0)) return 0;
      var cap = e.maxHp;
      if (e.hpCeil != null) cap = Math.min(cap, e.hpCeil);
      var next = Math.min(cap, e.hp + amount);
      var gained = next - e.hp;
      e.hp = next;
      return gained;
    },

    tookP2Hook: function (e) {
      if (!e || !e.p2 || e._p2CombatDone) return false;
      e._p2CombatDone = true;
      e._p2PendingHook = false;
      return true;
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
      var twoBar = this.wantsTwoBars(state, e);
      if (e.def.boss && !e.fake && !e.def.codexHide && this.enraged(state, stage) && e.type !== "beeprincess") {
        e.inv = true;
      }
      if (twoBar && this.barCount(e) < 2) {
        e.hpBars = 2;
        e.maxHp *= 2;
        e.hp = e.maxHp;
      }
      return e;
    },

    specFor: function (type) {
      return (this.cutscenes && this.cutscenes[type]) || this.defaultCutscene;
    },

    enterP2: function (state, e, label) {
      if (!e) return false;
      if (e.p2) {
        if (label && e._p2PendingHook) {
          if (state.banner) state.banner.text = label;
          if (state.bossCutscene) state.bossCutscene.label = label;
        }
        return false;
      }
      if (!this.atP2Threshold(e)) return false;
      var bars = this.barCount(e);
      var barHp = e.maxHp / bars;
      var newMax = Math.max(1, Math.round(barHp * this.P2_HP_BUFF));
      e.p2 = true;
      if (e.inv) e.invP2 = true;
      e._p2PendingHook = true;
      e.hp = Math.max(1, Math.min(newMax, Math.round(e.hp * this.P2_HP_BUFF)));
      e.maxHp = newMax;
      e.hpCeil = newMax;
      e.hpBars = 1;
      e.flash = Math.max(e.flash || 0, 0.55);
      if (state) state.bossShown = 1;
      var text = label || "Segunda fase";
      G.burst(state, e.x, e.y, "#ffe08a", 22, 150);
      G.burst(state, e.x, e.y, e.def.color || "#ff6a3a", 18, 120);
      if (state) state.shake = Math.max(state.shake || 0, 10);
      if (e.inv) this.startCutscene(state, e, text);
      else if (state) state.banner = { text: text, t: 2.2 };
      return true;
    },

    startCutscene: function (state, e, label) {
      if (!state || !e) return;
      var spec = this.specFor(e.type);
      var dur = spec.dur || this.defaultCutscene.dur;
      state.bossCutscene = {
        t: 0,
        dur: dur,
        bossId: e.id,
        type: e.type,
        kind: (e.type || "boss") + "_p2",
        label: label || "Segunda fase",
        prevZoom: state.camZoomTo,
        prevLook: state.camLook,
        phase: "play"
      };
      e.vx = 0;
      e.vy = 0;
      e.immortal = true;
      state.camLook = { x: e.x, y: e.y };
      state.camZoomTo = spec.zoom != null ? spec.zoom : this.defaultCutscene.zoom;
      state.banner = { text: state.bossCutscene.label, t: dur };
      state.pointer.down = false;
      state.pointer.fireHold = false;
      state.pointer.altHold = false;
      state.dashActive = false;
      state.dashT = 0;
      if (spec.onStart) spec.onStart(state, e, state.bossCutscene);
    },

    findCutsceneBoss: function (state, cs) {
      if (!state || !cs) return null;
      for (var i = 0; i < (state.enemies || []).length; i++) {
        if (state.enemies[i].id === cs.bossId) return state.enemies[i];
      }
      return null;
    },

    tickCutscene: function (state, dt) {
      var cs = state && state.bossCutscene;
      if (!cs) return false;
      cs.t += dt;
      var e = this.findCutsceneBoss(state, cs);
      if (e && e.hp > 0) {
        e.vx = 0;
        e.vy = 0;
        e.immortal = true;
        state.camLook = { x: e.x, y: e.y };
      }
      var spec = this.specFor(cs.type);
      if (spec.tick) spec.tick(state, e, cs, dt);
      if (cs.t >= cs.dur) this.endCutscene(state);
      return !!state.bossCutscene;
    },

    endCutscene: function (state) {
      var cs = state && state.bossCutscene;
      if (!cs) return;
      var e = this.findCutsceneBoss(state, cs);
      var spec = this.specFor(cs.type);
      if (spec.onEnd) spec.onEnd(state, e, cs);
      if (e) e.immortal = false;
      state.bossCutscene = null;
      if (state.defeat) return;
      state.camLook = cs.prevLook || null;
      var z = cs.prevZoom;
      state.camZoomTo = z != null && z > 0 ? z : 1;
    },

    drawCutscene: function (ctx, state) {
      var cs = state && state.bossCutscene;
      if (!cs || !ctx) return;
      var spec = this.specFor(cs.type);
      if (spec.draw) {
        spec.draw(ctx, state, this.findCutsceneBoss(state, cs), cs);
        return;
      }
      var u = Math.min(1, cs.t / 0.28);
      var out = cs.t > cs.dur - 0.32 ? Math.min(1, (cs.dur - cs.t) / 0.32) : 1;
      var a = Math.min(u, out) * 0.55;
      var g = ctx.createRadialGradient(
        state.W / 2, state.H / 2, 40,
        state.W / 2, state.H / 2, Math.max(state.W, state.H) * 0.72
      );
      g.addColorStop(0, "rgba(40, 28, 8, 0)");
      g.addColorStop(0.45, "rgba(18, 12, 4, " + (a * 0.35) + ")");
      g.addColorStop(1, "rgba(8, 6, 2, " + a + ")");
      ctx.save();
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, state.W, state.H);
      ctx.restore();
    },

    defaultCutscene: {
      dur: 2.35,
      zoom: 1.52
    },

    cutscenes: {
      chefe_invasao: {
        dur: 7.4,
        zoom: 1.28,
        onStart: function (state, e, cs) {
          cs.cx = state.W / 2;
          cs.cy = state.H / 2;
          cs.midY = cs.cy;
          var gap = Math.min(128, Math.max(78, state.W * 0.16));
          cs.leftX = cs.cx - gap;
          cs.rightX = cs.cx + gap;
          state.camLook = { x: cs.cx, y: cs.cy };
          cs.squadFrom = { x: state.squad.x, y: state.squad.y };
          cs.bossFrom = e ? { x: e.x, y: e.y } : { x: cs.rightX, y: cs.midY };
          cs.beams = [];
          cs.spawned = 0;
          cs.order = [
            "fuzileiro_elite", "fuzileiro_elite",
            "pistoleiro_elite", "pistoleiro_elite",
            "batedor_elite", "batedor_elite"
          ];
          if (e) {
            e.radioLift = 0;
            e.vx = e.vy = 0;
          }
        },
        tick: function (state, e, cs, dt) {
          var t = cs.t;
          state.camLook = { x: cs.cx, y: cs.cy };
          var moveK = Math.min(1, t / 0.85);
          moveK = moveK * moveK * (3 - 2 * moveK);
          var sx = cs.squadFrom.x + (cs.leftX - cs.squadFrom.x) * moveK;
          var sy = cs.squadFrom.y + (cs.midY - cs.squadFrom.y) * moveK;
          state.squad.x = sx;
          state.squad.y = sy;
          state.squad.vx = 0;
          state.squad.vy = 0;
          for (var u = 0; u < state.units.length; u++) {
            if (state.units[u].hp <= 0) continue;
            if (state.units[u].commander) {
              state.units[u].x = sx;
              state.units[u].y = sy;
            } else {
              var ang = (u / Math.max(1, state.units.length)) * Math.PI * 2;
              state.units[u].x = sx + Math.cos(ang) * 16;
              state.units[u].y = sy + Math.sin(ang) * 16;
            }
            state.units[u].rot = 0;
          }
          if (e && e.hp > 0) {
            e.x = cs.bossFrom.x + (cs.rightX - cs.bossFrom.x) * moveK;
            e.y = cs.bossFrom.y + (cs.midY - cs.bossFrom.y) * moveK;
            e.rot = Math.PI;
            e.radioLift = t < 1.7 ? 0 : Math.min(1, (t - 1.7) / 0.7);
            if (t > 2.35 && !cs.radioBurst) {
              cs.radioBurst = true;
              G.burst(state, e.x, e.y, "#ffe08a", 18, 110);
              G.burst(state, e.x, e.y, "#8ad422", 12, 80);
              state.shake = Math.max(state.shake || 0, 7);
              if (state.banner) state.banner = { text: "Ordem de rádio", t: 2.2 };
            }
          }
          var beamStart = 2.55;
          var gap = 0.62;
          for (var i = 0; i < 6; i++) {
            if (t < beamStart + i * gap || cs.beams[i]) continue;
            var off = (i - 2.5) * 38;
            var bx = (e ? e.x : cs.rightX) + 40 + (i % 2 ? -16 : 16);
            var by = cs.midY + off;
            cs.beams[i] = { x: bx, y: by, t: 0, type: cs.order[i], spawned: false };
          }
          for (var n = 0; n < cs.beams.length; n++) {
            var beam = cs.beams[n];
            if (!beam) continue;
            beam.t += dt;
            if (!beam.spawned && beam.t >= 0.62) {
              beam.spawned = true;
              var spawned = G.game.spawnAt(state, beam.type, beam.x, beam.y, {
                noDrop: true,
                rushMinion: true,
                ownerId: e ? e.id : 0,
                eliteDrop: true
              });
              if (spawned) {
                spawned.evoT = 0;
                spawned.vx = spawned.vy = 0;
                G.burst(state, beam.x, beam.y, "#ffe08a", 14, 90);
              }
            }
          }
        },
        draw: function (ctx, state, e, cs) {
          var u = Math.min(1, cs.t / 0.35);
          var out = cs.t > cs.dur - 0.4 ? Math.min(1, (cs.dur - cs.t) / 0.4) : 1;
          var a = Math.min(u, out) * 0.5;
          ctx.save();
          ctx.fillStyle = "rgba(6, 12, 8, " + a + ")";
          ctx.fillRect(0, 0, state.W, state.H);
          ctx.restore();
          if (!cs.beams) return;
          ctx.save();
          G.applyCamera(ctx, state);
          for (var i = 0; i < cs.beams.length; i++) {
            var beam = cs.beams[i];
            if (!beam) continue;
            var k = Math.min(1, beam.t / 0.18);
            var fade = beam.t > 0.45 ? Math.max(0, 1 - (beam.t - 0.45) / 0.4) : 1;
            var alpha = k * fade;
            if (alpha <= 0.02) continue;
            var grd = ctx.createLinearGradient(beam.x, beam.y - 220, beam.x, beam.y + 20);
            grd.addColorStop(0, "rgba(255, 240, 160, 0)");
            grd.addColorStop(0.55, "rgba(255, 230, 120, " + (0.18 * alpha) + ")");
            grd.addColorStop(1, "rgba(180, 255, 90, " + (0.55 * alpha) + ")");
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.moveTo(beam.x - 10, beam.y - 220);
            ctx.lineTo(beam.x + 10, beam.y - 220);
            ctx.lineTo(beam.x + 16, beam.y + 8);
            ctx.lineTo(beam.x - 16, beam.y + 8);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "rgba(255, 255, 220, " + (0.55 * alpha) + ")";
            ctx.beginPath();
            ctx.arc(beam.x, beam.y, 7 + (1 - fade) * 10, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        },
        onEnd: function (state, e) {
          if (e) e.radioLift = 0;
          state.banner = { text: "Tropa de elite", t: 1.8 };
        }
      }
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
