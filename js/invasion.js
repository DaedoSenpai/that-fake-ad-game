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

    homeStageIndex: function (type) {
      var stages = G.STAGES || [];
      var s, w, i, wave, item, t;
      for (s = 0; s < stages.length; s++) {
        wave = stages[s].waves || [];
        for (w = 0; w < wave.length; w++) {
          item = wave[w] || [];
          for (i = 0; i < item.length; i++) {
            t = typeof item[i] === "string" ? item[i] : (item[i] && item[i].type) || "";
            if (t === type) return s;
          }
        }
      }
      return -1;
    },

    p2Eligible: function (e) {
      if (!e || !e.def || !e.def.boss || e.fake || e.def.codexHide) return false;
      if (e.helperOf || e.guardianFor) return false;
      if (e.type === "beeprincess") return false;
      return this.homeStageIndex(e.type) >= 0;
    },

    P2_HP_BUFF: 1.2,

    cinematic: function (state) {
      return !!(state && state.bossCutscene);
    },

    locked: function (state) {
      return !!(state && (state.bossCutscene || state.stageOutro));
    },

    wantsTwoBars: function (state, e) {
      if (!this.p2Eligible(e)) return false;
      if (e.type === "chefe_final") return false;
      if (e.type === "chefe_megatanque") return false;
      return this.enraged(state, this.homeStageIndex(e.type));
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
      var twoBar = this.wantsTwoBars(state, e);
      if (this.p2Eligible(e) && this.enraged(state, this.homeStageIndex(e.type))) {
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
      if (!this.wantsTwoBars(state, e)) return false;
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
      var text = label || (e.type === "chefe_comandante" ? "Kaska perde a carapaça" : (e.type === "chefe_vulto" ? "Glinder · a lua queima" : "Segunda fase"));
      G.burst(state, e.x, e.y, "#ffe08a", 22, 150);
      G.burst(state, e.x, e.y, e.def.color || "#ff6a3a", 18, 120);
      if (state) state.shake = Math.max(state.shake || 0, 10);
      if (e.inv) this.startCutscene(state, e, text);
      else if (state) state.banner = { text: text, t: 2.2 };
      return true;
    },

    clearFieldForCutscene: function (state, keep) {
      if (!state) return;
      var keepId = keep && keep.id;
      var heir = keep && keep.cutKind === "heir";
      var kept = [];
      for (var i = 0; i < (state.enemies || []).length; i++) {
        var en = state.enemies[i];
        if (keepId && en.id === keepId) {
          en.attached = false;
          en.held = false;
          kept.push(en);
          continue;
        }
        if (heir && (en.fallen || en.type === "hive_cocoon")) {
          kept.push(en);
        }
      }
      state.enemies = kept;
      state.projectiles = [];
      state.drops = [];
      state.mines = [];
      state.warnings = [];
      state.booms = [];
      state.zones = [];
      state.firewaves = [];
      state.minions = [];
      state.drones = [];
      state.deploys = [];
      state.stickies = [];
      state.cmdStrikes = [];
      state.spawnQueue = [];
      state.particles = [];
      state.floaters = [];
      state.vfx = [];
      state.timeLock = null;
      state.bombLine = null;
      state.bombPending = null;
      state.guerrillaDraw = null;
      state.guerrillaMenu = null;
      state.hook = null;
      state.waitingClear = false;
      for (var u = 0; u < (state.units || []).length; u++) {
        var unit = state.units[u];
        unit.held = false;
        unit.stowed = false;
        unit.packed = false;
        unit.attached = false;
      }
    },

    startCutscene: function (state, e, label) {
      if (!state || !e) return;
      this.clearFieldForCutscene(state, e);
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
      var z = spec.zoom != null ? spec.zoom : this.defaultCutscene.zoom;
      if (!(z > 0) || !isFinite(z)) z = 1;
      else z = Math.max(0.15, Math.min(8, z));
      state.camZoomTo = z;
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
      if (!(z > 0) || !isFinite(z)) z = 1;
      else z = Math.max(0.15, Math.min(8, z));
      state.camZoomTo = z;
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
              if (state.banner) state.banner = { text: "Ordem de reforço", t: 2.2 };
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
      },
      chefe_comandante: {
        dur: 4.7,
        zoom: 1.36,
        onStart: function (state, e, cs) {
          cs.cx = (state.W || 1280) / 2;
          cs.cy = (state.H || 720) / 2;
          if (!isFinite(cs.cx)) cs.cx = 640;
          if (!isFinite(cs.cy)) cs.cy = 360;
          cs.fromX = e && isFinite(e.x) ? e.x : cs.cx;
          cs.fromY = e && isFinite(e.y) ? e.y : cs.cy;
          cs.hopSfx = [];
          cs.broke = false;
          if (e) {
            e.zDraw = 0;
            e.vx = 0;
            e.vy = 0;
            e.rot = Math.atan2(cs.cy - cs.fromY, cs.cx - cs.fromX);
          }
          state.camLook = { x: cs.fromX, y: cs.fromY };
        },
        tick: function (state, e, cs, dt) {
          var t = cs.t;
          var hopLen = 0.38;
          var hops = 4;
          var hopEnd = hopLen * hops;
          var flyEnd = hopEnd + 1.05;
          var k;
          if (!e || e.hp <= 0) {
            state.camLook = { x: cs.cx, y: cs.cy };
            return;
          }
          if (t < hopEnd) {
            var hi = Math.min(hops - 1, Math.floor(t / hopLen));
            k = (t - hi * hopLen) / hopLen;
            if (!isFinite(k)) k = 0;
            if (k < 0) k = 0;
            else if (k > 1) k = 1;
            var z = Math.sin(k * Math.PI) * 58;
            if (!isFinite(z) || z < 0) z = 0;
            e.zDraw = Math.min(z, 72);
            e.x = cs.fromX;
            e.y = cs.fromY;
            e.rot += dt * 10;
            if (k < 0.12 && !cs.hopSfx[hi]) {
              cs.hopSfx[hi] = true;
              state.shake = Math.max(state.shake || 0, 7);
              if (G.audio && G.audio.thud) G.audio.thud();
              else if (G.audio && G.audio.hit) G.audio.hit();
              G.burst(state, e.x, e.y + 10, "#c48a20", 8, 70);
            }
            state.camLook = { x: e.x, y: e.y - (e.zDraw || 0) * 0.25 };
          } else if (t < flyEnd) {
            k = (t - hopEnd) / 1.05;
            if (!isFinite(k)) k = 1;
            if (k < 0) k = 0;
            else if (k > 1) k = 1;
            k = k * k * (3 - 2 * k);
            e.x = cs.fromX + (cs.cx - cs.fromX) * k;
            e.y = cs.fromY + (cs.cy - cs.fromY) * k;
            var flyZ = Math.sin(k * Math.PI) * 44 + (1 - k) * 10;
            if (!isFinite(flyZ) || flyZ < 0) flyZ = 0;
            e.zDraw = Math.min(flyZ, 72);
            e.rot = Math.atan2(cs.cy - cs.fromY, cs.cx - cs.fromX);
            state.camLook = { x: e.x, y: e.y };
          } else {
            e.x = cs.cx + (Math.random() - 0.5) * (cs.broke ? 7 : 4);
            e.y = cs.cy + (Math.random() - 0.5) * (cs.broke ? 6 : 3);
            e.zDraw = 0;
            e.flash = Math.max(e.flash || 0, 0.18);
            e.rot += dt * (cs.broke ? 14 : 8);
            state.shake = Math.max(state.shake || 0, cs.broke ? 11 : 7);
            state.camLook = { x: cs.cx, y: cs.cy };
            if (t >= 3.55 && !cs.broke) {
              cs.broke = true;
              e.shellOff = true;
              e.x = cs.cx;
              e.y = cs.cy;
              G.burst(state, e.x, e.y, "#ffd24a", 28, 160);
              G.burst(state, e.x, e.y, "#8a4a18", 22, 140);
              G.burst(state, e.x, e.y, "#fff4c4", 16, 110);
              state.shake = Math.max(state.shake || 0, 14);
              if (G.audio && G.audio.explosion) G.audio.explosion();
              if (state.banner) state.banner = { text: "A carapaça racha", t: 1.6 };
            }
          }
        },
        draw: function (ctx, state, e, cs) {
          var dur = cs.dur || 4.7;
          var u = dur > 0 ? Math.min(1, cs.t / 0.32) : 0;
          var out = cs.t > dur - 0.38 ? Math.min(1, (dur - cs.t) / 0.38) : 1;
          if (!isFinite(u)) u = 0;
          if (!isFinite(out)) out = 1;
          var a = Math.min(u, out) * 0.52;
          if (!isFinite(a) || a < 0) a = 0;
          var cx = (state.W || 1280) / 2;
          var cy = (state.H || 720) / 2;
          if (!isFinite(cx)) cx = 640;
          if (!isFinite(cy)) cy = 360;
          ctx.save();
          try {
            var inner = 22;
            var outer = 260;
            var g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
            g.addColorStop(0, "rgba(40, 22, 6, 0)");
            g.addColorStop(0.55, "rgba(18, 10, 4, " + (a * 0.32) + ")");
            g.addColorStop(1, "rgba(8, 4, 2, " + a + ")");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, state.W || 1280, state.H || 720);
          } finally {
            ctx.restore();
          }
        },
        onEnd: function (state, e) {
          if (e) {
            e.zDraw = 0;
            e.shellOff = true;
            e.x = isFinite(e.x) ? e.x : (state.W || 1280) / 2;
            e.y = isFinite(e.y) ? e.y : (state.H || 720) / 2;
            var n = 16;
            var i;
            var dmg = Math.round((e.def && e.def.dmg ? e.def.dmg : 28) * 0.85);
            for (i = 0; i < n; i++) {
              var ang = (i / n) * Math.PI * 2 + 0.18;
              var sp = 200 + (i % 4) * 26;
              var r = 8 + (i % 3);
              if (!isFinite(r) || r <= 0) r = 8;
              r = Math.min(r, 16);
              if (!isFinite(sp) || sp <= 0) sp = 210;
              state.projectiles.push(G.createProjectile({
                x: e.x,
                y: e.y,
                vx: Math.cos(ang) * sp,
                vy: Math.sin(ang) * sp,
                dmg: dmg,
                team: "enemy",
                kind: "horn",
                life: 2.4,
                r: r,
                color: "#e8b84a",
                fromBoss: true,
                fromId: e.id
              }));
            }
          }
          state.banner = { text: "Desvia dos cacos", t: 1.8 };
        }
      },
      chefe_vulto: {
        dur: 8.7,
        zoom: 1.18,
        onStart: function (state, e, cs) {
          var b = G.playfield(state);
          cs.cx = (b.x0 + b.x1) / 2;
          cs.cy = (b.y0 + b.y1) / 2;
          cs.rx = Math.max(90, (b.x1 - b.x0) * 0.32);
          cs.ry = Math.max(64, (b.y1 - b.y0) * 0.28);
          cs.fires = [];
          cs.nextFire = 0.18;
          cs.scream = false;
          cs.pulse = false;
          cs.rings = [];
          state.glinderHeat = 0.15;
          state.glinderFoci = [];
          if (G.combat && G.combat.endGlinderNight) G.combat.endGlinderNight(state, e);
          if (e) {
            e.zDraw = 18;
            e.vx = 0;
            e.vy = 0;
          }
          state.banner = { text: "Sua ira incendia o campo de batalha.", t: 2.4 };
        },
        tick: function (state, e, cs, dt) {
          var t = cs.t;
          if (!e || e.hp <= 0) return;
          var flyEnd = 5.15;
          var heatEnd = 6.35;
          var screamAt = 6.85;
          var k;
          var b = G.playfield(state);
          var x0 = 14;
          var y0 = 14;
          var x1 = state.W - 14;
          var y1 = state.H - 14;
          function edgeOf(px, py) {
            var dx = px - cs.cx;
            var dy = py - cs.cy;
            var len = Math.hypot(dx, dy);
            if (len < 1) {
              var a = Math.random() * Math.PI * 2;
              dx = Math.cos(a);
              dy = Math.sin(a);
            } else {
              dx /= len;
              dy /= len;
            }
            var hit = 1e9;
            if (dx > 0.001) hit = Math.min(hit, (x1 - cs.cx) / dx);
            else if (dx < -0.001) hit = Math.min(hit, (x0 - cs.cx) / dx);
            if (dy > 0.001) hit = Math.min(hit, (y1 - cs.cy) / dy);
            else if (dy < -0.001) hit = Math.min(hit, (y0 - cs.cy) / dy);
            if (!isFinite(hit) || hit < 20) hit = Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.5;
            return { x: cs.cx + dx * hit, y: cs.cy + dy * hit };
          }
          function shoveFires(spd) {
            var foci = state.glinderFoci || [];
            var i;
            for (i = 0; i < foci.length; i++) {
              var f = foci[i];
              if (!f.tx) {
                var dest = edgeOf(f.x, f.y);
                f.tx = dest.x;
                f.ty = dest.y;
                f.prison = true;
                f.t = 999;
              }
              var ddx = f.tx - f.x;
              var ddy = f.ty - f.y;
              var dd = Math.hypot(ddx, ddy);
              if (dd < 3) {
                f.x = f.tx;
                f.y = f.ty;
                continue;
              }
              var step = Math.min(dd, spd * dt);
              f.x += (ddx / dd) * step;
              f.y += (ddy / dd) * step;
            }
          }
          if (t < flyEnd) {
            k = t / flyEnd;
            var ang = k * Math.PI * 2.15;
            e.x = cs.cx + Math.cos(ang) * cs.rx;
            e.y = cs.cy + Math.sin(ang * 1.35) * cs.ry;
            e.zDraw = 22 + Math.sin(t * 9) * 8;
            e.rot = ang + Math.PI / 2;
            cs.nextFire -= dt;
            if (cs.nextFire <= 0) {
              cs.nextFire = 0.48;
              cs.fires.push({ x: e.x, y: e.y, t: 0 });
              if (!state.glinderFoci) state.glinderFoci = [];
              state.glinderFoci.push({ x: e.x, y: e.y, r: 26, t: 999 });
              G.burst(state, e.x, e.y, "#ff6a18", 14, 90);
              G.burst(state, e.x, e.y, "#3a0808", 8, 50);
              if (G.audio && G.audio.hit) G.audio.hit();
            }
            state.glinderHeat = Math.min(1, (state.glinderHeat || 0) + dt * 0.18);
            state.camLook = { x: e.x, y: e.y - 10 };
            state.camZoomTo = 1.12 + Math.sin(t * 2) * 0.04;
          } else if (t < heatEnd) {
            k = (t - flyEnd) / (heatEnd - flyEnd);
            e.x = e.x + (cs.cx - e.x) * Math.min(1, dt * 3.2);
            e.y = e.y + (cs.cy - e.y) * Math.min(1, dt * 3.2);
            e.zDraw = 16 + (1 - k) * 10;
            state.glinderHeat = 0.55 + k * 0.45;
            state.shake = Math.max(state.shake || 0, 5 + k * 6);
            state.camLook = { x: (e.x + cs.cx) / 2, y: (e.y + cs.cy) / 2 };
            state.camZoomTo = 1.2 + k * 0.18;
            if (!cs.pushed) {
              cs.pushed = true;
              state.banner = { text: "As chamas engolem as saídas, você está preso.", t: 2.2 };
            }
            shoveFires(420);
          } else {
            e.x = cs.cx;
            e.y = cs.cy;
            e.zDraw = 8 + Math.sin(t * 14) * 3;
            e.rot += dt * (cs.scream ? 2.4 : 0.4);
            state.camLook = { x: cs.cx, y: cs.cy };
            shoveFires(cs.scream ? 980 : 560);
            if (t >= screamAt && !cs.scream) {
              cs.scream = true;
              state.shake = Math.max(state.shake || 0, 18);
              state.camZoomTo = 1.72;
              state.glinderHeat = 1;
              G.burst(state, e.x, e.y, "#fff4c4", 36, 220);
              G.burst(state, e.x, e.y, "#ff3a18", 28, 180);
              if (G.audio && G.audio.explosion) G.audio.explosion();
              state.banner = { text: "GLINDER, A CHAMA ETERNA DA LEGIÃO", t: 3.4 };
              var ri;
              for (ri = 0; ri < 5; ri++) {
                cs.rings.push({ r: 12, max: 70 + ri * 48, t: 0.12 * ri, life: 0.55 });
              }
            }
            if (cs.scream && !cs.pulse && t >= screamAt + 0.42) {
              cs.pulse = true;
              e.novaWave = { x: cs.cx, y: cs.cy, r: 10, maxR: 160, t: 0.55, max: 0.55 };
              state.shake = Math.max(state.shake || 0, 14);
              var fj;
              var foci = state.glinderFoci || [];
              for (fj = 0; fj < foci.length; fj++) {
                if (foci[fj].tx != null) {
                  foci[fj].x = foci[fj].tx;
                  foci[fj].y = foci[fj].ty;
                  foci[fj].prison = true;
                }
              }
            }
            var r;
            for (r = 0; r < cs.rings.length; r++) {
              cs.rings[r].t += dt;
            }
          }
          var f;
          for (f = 0; f < cs.fires.length; f++) cs.fires[f].t += dt;
        },
        draw: function (ctx, state, e, cs) {
          var t = cs.t || 0;
          var heat = Math.min(1, state.glinderHeat || 0);
          var a = Math.min(1, t / 0.35) * 0.55;
          if (t > (cs.dur || 8.7) - 0.4) a *= Math.max(0, ((cs.dur || 8.7) - t) / 0.4);
          ctx.save();
          var g = ctx.createRadialGradient(cs.cx || state.W / 2, cs.cy || state.H / 2, 30, cs.cx || state.W / 2, cs.cy || state.H / 2, Math.max(state.W, state.H) * 0.7);
          g.addColorStop(0, "rgba(80, 18, 4, 0)");
          g.addColorStop(0.5, "rgba(40, 8, 2, " + (a * 0.28 + heat * 0.12) + ")");
          g.addColorStop(1, "rgba(8, 2, 2, " + (a * 0.72) + ")");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, state.W, state.H);
          var i;
          for (i = 0; i < (cs.rings || []).length; i++) {
            var rg = cs.rings[i];
            if (rg.t < 0) continue;
            var kk = Math.min(1, rg.t / (rg.life || 0.55));
            ctx.strokeStyle = "rgba(255, 220, 180, " + (0.7 * (1 - kk)) + ")";
            ctx.lineWidth = 3 + (1 - kk) * 8;
            ctx.beginPath();
            ctx.arc(cs.cx, cs.cy, 16 + kk * (rg.max || 120), 0, Math.PI * 2);
            ctx.stroke();
          }
          if (cs.scream) {
            ctx.fillStyle = "rgba(255, 240, 210, " + (0.18 * Math.max(0, 1 - (t - 6.85) * 2.4)) + ")";
            ctx.fillRect(0, 0, state.W, state.H);
          }
          ctx.restore();
        },
        onEnd: function (state, e) {
          if (e) {
            e.zDraw = 0;
            var b = G.playfield(state);
            var cx = (b.x0 + b.x1) / 2;
            var cy = (b.y0 + b.y1) / 2;
            e.x = cx;
            e.y = cy;
            e.vultoAct = "";
            e.vultoT = 1.35;
            e.mazeCd = 9;
            e.novaCd = 6;
            if (G.combat && G.combat.spawnGlinderSun) G.combat.spawnGlinderSun(state, e);
          }
          var foci = state.glinderFoci || [];
          var fi;
          for (fi = 0; fi < foci.length; fi++) {
            if (foci[fi].tx != null) {
              foci[fi].x = foci[fi].tx;
              foci[fi].y = foci[fi].ty;
            }
            foci[fi].prison = true;
            foci[fi].t = 999;
          }
          state.glinderHeat = 0.38;
          state.camZoomTo = 1;
        }
      },
      beeprincess: {
        dur: 12.2,
        zoom: 1.18,
        onStart: function (state, e, cs) {
          cs.kind = (e && e.cutKind) || cs.kind || "heir";
          var b = G.playfield(state);
          cs.cx = (b.x0 + b.x1) / 2;
          cs.cy = (b.y0 + b.y1) / 2;
          cs.topY = b.y0 + 36;
          if (e) {
            e.introLock = true;
            e.immortal = true;
            e.heirArmed = cs.kind !== "heir";
            e.vx = e.vy = 0;
          }
          if (cs.kind === "hive_realm") {
            cs.dur = 16;
            state.banner = { text: "", t: 0 };
            state.camZoomTo = 1.22;
            state.princessBlink = null;
            state.hiveWake = { black: 0, lids: 1, flash: 0 };
            cs.pFrom = e ? { x: e.x, y: e.y } : { x: cs.cx, y: cs.cy };
            cs.sFrom = { x: state.squad.x, y: state.squad.y };
            cs.unitFrom = [];
            cs.scatter = [];
            cs.hidUnits = [];
            var ui;
            for (ui = 0; ui < (state.units || []).length; ui++) {
              var un = state.units[ui];
              if (!un || un.hp <= 0) continue;
              if (!un.commander) {
                cs.hidUnits.push(un.id);
                un.stowed = true;
                continue;
              }
              cs.unitFrom.push({ id: un.id, x: un.x, y: un.y, commander: true });
              cs.scatter.push({ ax: 0, ay: 0, sx: 0, sy: 0 });
            }
            if (e) {
              e.hideDraw = false;
              e.princessAct = "";
              e.thrustPhase = "";
              e.zDraw = 4;
              e.blinkFxT = 0;
            }
          }
          if (cs.kind === "heir") {
            cs.dur = 12.2;
            state.banner = { text: "", t: 0 };
            state.camZoomTo = 1.58;
            if (e) {
              e.hideDraw = true;
              e.heirArmed = false;
              e.heirSwordK = 0;
              e.heirScepterK = 0;
              e.screamFx = 0;
              e.zDraw = 0;
              e.rot = Math.PI / 2;
              e.x = cs.cx;
              e.y = cs.topY;
            }
            state.squad.x = cs.cx;
            state.squad.y = Math.min(b.y1 - 42, cs.cy + 155);
            G.clampPlay(state.squad, state);
            var ui;
            for (ui = 0; ui < (state.units || []).length; ui++) {
              if (state.units[ui].hp <= 0) continue;
              state.units[ui].x = state.squad.x + (ui % 3 - 1) * 16;
              state.units[ui].y = state.squad.y + ((ui / 3) | 0) * 14;
            }
          }
        },
        tick: function (state, e, cs, dt) {
          var t = cs.t;
          var b = G.playfield(state);
          var cx = cs.cx;
          var cy = cs.cy;
          var i, en;
          if (cs.kind === "hive_realm") {
            function hiveEase(u) {
              u = Math.max(0, Math.min(1, u));
              return u * u * (3 - 2 * u);
            }
            function hiveIn(u) {
              u = Math.max(0, Math.min(1, u));
              return u * u;
            }
            function hiveOut(u) {
              u = Math.max(0, Math.min(1, u));
              return 1 - Math.pow(1 - u, 3);
            }
            function hiveDash(u) {
              u = Math.max(0, Math.min(1, u));
              return 1 - (1 - u) * (1 - u);
            }
            function hiveLaunch(u) {
              u = Math.max(0, Math.min(1, u));
              if (u < 0.58) return Math.min(1.18, hiveOut(u / 0.58) * 1.18);
              return 1.18 + (1 - 1.18) * hiveEase((u - 0.58) / 0.42);
            }
            function hiveAim(from, to) {
              if (!from || !to) return from ? (from.rot || 0) : 0;
              return Math.atan2(to.y - from.y, to.x - from.x);
            }
            function hiveCmd() {
              var ci;
              for (ci = 0; ci < (state.units || []).length; ci++) {
                if (state.units[ci].commander && state.units[ci].hp > 0) return state.units[ci];
              }
              return null;
            }
            function hiveUnitById(id) {
              var uj;
              for (uj = 0; uj < (state.units || []).length; uj++) {
                if (state.units[uj].id === id) return state.units[uj];
              }
              return null;
            }
            function hivePulse(t0, d) {
              if (t < t0 || t > t0 + d) return 0;
              return Math.sin(((t - t0) / d) * Math.PI);
            }
            var T_ARR1 = 1.7;
            var T_CHG0 = 1.78;
            var T_CLASH = 2.2;
            var T_HIT = 2.34;
            var T_SEP1 = 2.9;
            var T_VANISH = 3.52;
            var T_GRAB = 4.24;
            var T_LIFT0 = 4.4;
            var T_LIFT1 = 7.28;
            var T_FADE0 = 6.95;
            var T_FADE1 = 7.72;
            var T_SWAP = 8.08;
            var T_WAKE0 = 8.9;
            var T_SLIT1 = 10.3;
            var T_BLINK1 = 10.62;
            var T_HOLD = 10.82;
            var T_OPEN1 = 12.95;
            var T_OPEN2 = 14.85;
            var pArr = { x: cx - 100, y: cy - 8 };
            var sArr = { x: cx + 100, y: cy + 30 };
            var meet = { x: cx, y: cy + 10 };
            var pSep = { x: cx - 212, y: cy - 22 };
            var sSep = { x: cx + 208, y: cy + 36 };
            var cmd = hiveCmd();
            var k, ui, src, sc, u, tx, ty, lk, gx, gy;
            if (e) {
              e.introLock = true;
              e.immortal = true;
              e.vx = e.vy = 0;
              e.princessAct = "";
              if ((e.blinkFxT || 0) > 0) e.blinkFxT = Math.max(0, e.blinkFxT - dt);
            }
            function hivePlaceBand(ox, oy, scatterK) {
              state.squad.x = ox;
              state.squad.y = oy;
              for (ui = 0; ui < (cs.unitFrom || []).length; ui++) {
                src = cs.unitFrom[ui];
                u = hiveUnitById(src.id);
                if (!u || u.hp <= 0) continue;
                sc = (cs.scatter && cs.scatter[ui]) || { ax: 0, ay: 0, sx: 0, sy: 0 };
                if (u.commander) {
                  u.x = ox;
                  u.y = oy;
                } else {
                  u.x = ox + sc.ax + scatterK * sc.sx;
                  u.y = oy + sc.ay + scatterK * sc.sy;
                }
                u.rot = hiveAim(u, e || meet);
              }
            }
            function hiveLerpBand(fromX, fromY, toX, toY, kk, scatterK) {
              hivePlaceBand(fromX + (toX - fromX) * kk, fromY + (toY - fromY) * kk, scatterK);
            }
            if (!cs.swapped) {
              if (t < T_CHG0) {
                k = hiveEase(Math.min(1, t / T_ARR1));
                if (e) {
                  e.x = (cs.pFrom ? cs.pFrom.x : pArr.x) + (pArr.x - (cs.pFrom ? cs.pFrom.x : pArr.x)) * k;
                  e.y = (cs.pFrom ? cs.pFrom.y : pArr.y) + (pArr.y - (cs.pFrom ? cs.pFrom.y : pArr.y)) * k;
                  e.zDraw = 4;
                  e.rot = hiveAim(e, sArr);
                  e.hideDraw = false;
                }
                state.squad.x = (cs.sFrom ? cs.sFrom.x : sArr.x) + (sArr.x - (cs.sFrom ? cs.sFrom.x : sArr.x)) * k;
                state.squad.y = (cs.sFrom ? cs.sFrom.y : sArr.y) + (sArr.y - (cs.sFrom ? cs.sFrom.y : sArr.y)) * k;
                for (ui = 0; ui < (cs.unitFrom || []).length; ui++) {
                  src = cs.unitFrom[ui];
                  u = hiveUnitById(src.id);
                  if (!u || u.hp <= 0) continue;
                  sc = (cs.scatter && cs.scatter[ui]) || { ax: 0, ay: 0, sx: 0, sy: 0 };
                  tx = sArr.x + (u.commander ? 0 : sc.ax);
                  ty = sArr.y + (u.commander ? 0 : sc.ay);
                  u.x = src.x + (tx - src.x) * k;
                  u.y = src.y + (ty - src.y) * k;
                  u.rot = hiveAim(u, e || pArr);
                }
                state.camLook = { x: (e ? e.x : cx) * 0.5 + state.squad.x * 0.5, y: (e ? e.y : cy) * 0.5 + state.squad.y * 0.5 };
                state.camZoomTo = 1.22;
              } else if (t < T_CLASH) {
                k = hiveDash((t - T_CHG0) / (T_CLASH - T_CHG0));
                if (!cs.dashed) {
                  cs.dashed = true;
                  function hiveStreak(x, y, dx, dy, color) {
                    var ang = Math.atan2(dy, dx);
                    var si;
                    G.burst(state, x, y, color, 8, 90);
                    for (si = 0; si < 10; si++) {
                      var along = 8 + si * 10;
                      state.particles.push({
                        x: x - dx * along,
                        y: y - dy * along,
                        vx: -dx * (22 + si * 5),
                        vy: -dy * (22 + si * 5),
                        life: 0.2 + si * 0.012,
                        max: 0.2 + si * 0.012,
                        size: 4.4 - si * 0.2,
                        color: color,
                        streak: true,
                        ang: ang
                      });
                    }
                  }
                  if (e) hiveStreak(e.x, e.y, 1, 0, "#ffe08a");
                  hiveStreak(state.squad.x, state.squad.y, -1, 0, "#7ec8ff");
                  if (G.audio && G.audio.thud) G.audio.thud();
                }
                if (e) {
                  e.x = pArr.x + (meet.x + 16 - pArr.x) * k;
                  e.y = pArr.y + (meet.y - pArr.y) * k;
                  e.rot = hiveAim(e, meet);
                  e.zDraw = 4 + k * 6;
                  e.hideDraw = false;
                }
                hiveLerpBand(sArr.x, sArr.y, meet.x - 16, meet.y, k, 0);
                state.camLook = { x: meet.x, y: meet.y };
                state.camZoomTo = 1.24 + k * 0.28;
              } else if (t < T_GRAB) {
                if (t < T_HIT) {
                  if (e) {
                    e.x = meet.x + 16;
                    e.y = meet.y;
                    e.rot = 0;
                    e.zDraw = 22;
                    e.hideDraw = false;
                  }
                  hivePlaceBand(meet.x - 16, meet.y, 0);
                  if (cmd) cmd.leapZ = 16;
                  state.camLook = { x: meet.x, y: meet.y };
                  state.camZoomTo = 1.62;
                } else {
                  k = t < T_SEP1 ? hiveLaunch((t - T_HIT) / (T_SEP1 - T_HIT)) : 1;
                  var rec = Math.max(0, 1 - k);
                  if (e && !cs.vanished) {
                    e.x = meet.x + 16 + (pSep.x - (meet.x + 16)) * k;
                    e.y = meet.y + (pSep.y - meet.y) * k;
                    e.rot = hiveAim(e, sSep);
                    e.zDraw = 4 + rec * 18;
                    e.hideDraw = false;
                  }
                  hiveLerpBand(meet.x - 16, meet.y, sSep.x, sSep.y, k, k);
                  if (cmd) cmd.leapZ = rec * 14;
                }
                if (t >= T_CLASH && !cs.clashed) {
                  cs.clashed = true;
                  state.shake = Math.max(state.shake || 0, 38);
                  if (G.boomFx) {
                    G.boomFx(state, meet.x, meet.y, 210, "#ffe08a");
                    G.boomFx(state, meet.x, meet.y, 140, "#ffffff");
                    G.boomFx(state, meet.x, meet.y, 88, "#7af7ff");
                  }
                  G.burst(state, meet.x, meet.y, "#ffffff", 36, 320);
                  G.burst(state, meet.x, meet.y, "#ffe08a", 32, 260);
                  G.burst(state, meet.x, meet.y, "#7af7ff", 22, 220);
                  G.burst(state, meet.x, meet.y, "#ff9a3a", 14, 180);
                  if (e) e.flash = Math.max(e.flash || 0, 0.45);
                  for (ui = 0; ui < (state.units || []).length; ui++) {
                    if (state.units[ui].hp > 0) state.units[ui].flash = 0.38;
                  }
                  if (G.audio && G.audio.thud) G.audio.thud();
                  if (G.audio && G.audio.hit) G.audio.hit();
                  if (G.audio && G.audio.explosion) G.audio.explosion();
                  if (G.audio && G.audio.horn) G.audio.horn();
                }
                if (t >= T_CLASH && t < T_CLASH + 0.5) {
                  var sk = 1 - (t - T_CLASH) / 0.5;
                  state.shake = Math.max(state.shake || 0, 10 + sk * 30);
                }
                if (t >= T_VANISH && e && !cs.vanished) {
                  cs.vanished = true;
                  cs.vanishAt = t;
                  e.blinkFrom = { x: e.x, y: e.y };
                  e.blinkFxT = 0.42;
                  e.hideDraw = true;
                  e.zDraw = 4;
                  G.burst(state, e.x, e.y, "#ffe08a", 14, 90);
                  G.burst(state, e.x, e.y, "#7af7ff", 10, 70);
                  if (G.audio && G.audio.thud) G.audio.thud();
                }
                if (t >= T_HIT) {
                  state.camLook = {
                    x: ((e && !cs.vanished) ? e.x : pSep.x) * 0.38 + state.squad.x * 0.62,
                    y: ((e && !cs.vanished) ? e.y : pSep.y) * 0.38 + state.squad.y * 0.62
                  };
                  state.camZoomTo = t < T_SEP1 ? 1.48 - k * 0.22 : 1.22;
                }
              } else {
                gx = cs.grabAt ? cs.grabAt.x : (cmd ? cmd.x : sSep.x);
                gy = cs.grabAt ? cs.grabAt.y : (cmd ? cmd.y : sSep.y);
                if (!cs.grabbed) {
                  cs.grabbed = true;
                  gx = cmd ? cmd.x : sSep.x;
                  gy = cmd ? cmd.y : sSep.y;
                  cs.grabAt = { x: gx, y: gy };
                  if (e) {
                    e.blinkFrom = { x: e.x, y: e.y };
                    e.x = gx + 18;
                    e.y = gy + 4;
                    e.hideDraw = false;
                    e.blinkFxT = 0.34;
                    e.zDraw = 12;
                    e.rot = hiveAim(e, cmd || { x: gx, y: gy });
                  }
                  if (cmd) cmd.rot = hiveAim(cmd, e || { x: gx + 24, y: gy });
                  G.burst(state, gx, gy, "#ffe08a", 12, 80);
                  G.burst(state, gx + 24, gy, "#7af7ff", 10, 70);
                  state.shake = Math.max(state.shake || 0, 8);
                  if (G.audio && G.audio.thud) G.audio.thud();
                }
                lk = t < T_LIFT0 ? 0 : (t < T_LIFT1 ? hiveEase((t - T_LIFT0) / (T_LIFT1 - T_LIFT0)) : 1);
                gy = cs.grabAt.y - lk * 58;
                gx = cs.grabAt.x;
                state.squad.x = gx;
                state.squad.y = gy;
                if (cmd) {
                  cmd.x = gx;
                  cmd.y = gy;
                  cmd.leapZ = 8 + lk * 108;
                }
                if (e) {
                  e.x = gx + 16;
                  e.y = gy + 3;
                  e.zDraw = 14 + lk * 118;
                  e.hideDraw = false;
                  e.rot = Math.PI + 0.08;
                }
                if (cmd) cmd.rot = Math.PI;
                state.camLook = { x: gx, y: gy - (cmd && cmd.leapZ ? cmd.leapZ * 0.42 : lk * 40) };
                state.camZoomTo = 1.22 + lk * 1.28;
                if (lk > 0.35) state.shake = Math.max(state.shake || 0, 3 + lk * 5);
              }
            }
            if (t >= T_SWAP && !cs.swapped) {
              cs.swapped = true;
              state.hiveRealm = true;
              state.theme = { ground: "#16100a", grid: "#2a2014", fog: "rgba(30,18,6,0.22)" };
              var hiveBg = "img/cenarios/bg-hive-robo.png";
              if (!G.stageBgs[hiveBg] && G.loadImg) G.stageBgs[hiveBg] = G.loadImg(G.stageBgUrls(hiveBg));
              if (G.stageBgs[hiveBg]) state.bgImg = G.stageBgs[hiveBg];
              var kept = [];
              for (i = 0; i < state.enemies.length; i++) {
                en = state.enemies[i];
                if (e && en.id === e.id) kept.push(en);
              }
              state.enemies = kept;
              state.warnings = [];
              state.projectiles = [];
              state.zones = [];
              if (e) {
                e.princessHive = true;
                e.princessAct = "";
                e.hp = e.maxHp;
                e.x = cx;
                e.y = cy - 8;
                e.zDraw = 4;
                e.hideDraw = false;
                e.stealth = 0;
                e.blinkFxT = 0;
                e.rot = Math.PI / 2;
              }
              for (ui = 0; ui < (state.units || []).length; ui++) {
                state.units[ui].leapZ = 0;
              }
              state.squad.x = cx;
              state.squad.y = cy + 96;
              hivePlaceBand(state.squad.x, state.squad.y, 0);
              if (cmd) {
                cmd.x = state.squad.x;
                cmd.y = state.squad.y;
                cmd.leapZ = 0;
                cmd.rot = hiveAim(cmd, e || { x: cx, y: cy });
              }
              state.camZoom = 1;
              state.camZoomTo = 1;
              state.camLook = { x: cx, y: cy + 42 };
              if (state.banner) state.banner.t = 0;
            }
            cs.flashA = Math.max(
              hivePulse(5.12, 0.22),
              hivePulse(5.74, 0.2),
              hivePulse(6.34, 0.24),
              hivePulse(6.9, 0.46)
            );
            cs.clashFlash = (t >= T_CLASH && t < T_CLASH + 0.2) ? 1 - (t - T_CLASH) / 0.2 : 0;
            if (t >= T_CLASH && t < T_CLASH + 0.08) cs.clashFlash = 1;
            cs.blackA = 0;
            cs.eyeK = 1;
            if (t >= T_FADE0 && t < T_WAKE0) {
              cs.blackA = t >= T_FADE1 ? 1 : hiveEase((t - T_FADE0) / (T_FADE1 - T_FADE0));
              if (t >= T_FADE1) cs.eyeK = 0;
            }
            if (t >= T_WAKE0) {
              cs.blackA = Math.max(0, 1 - (t - T_WAKE0) / 0.16);
              if (t < T_SLIT1) cs.eyeK = hiveEase((t - T_WAKE0) / (T_SLIT1 - T_WAKE0)) * 0.24;
              else if (t < T_BLINK1) cs.eyeK = 0.24 * (1 - hiveEase((t - T_SLIT1) / (T_BLINK1 - T_SLIT1)));
              else if (t < T_HOLD) cs.eyeK = 0;
              else if (t < T_OPEN1) cs.eyeK = hiveEase((t - T_HOLD) / (T_OPEN1 - T_HOLD)) * 0.62;
              else if (t < T_OPEN2) cs.eyeK = 0.62 + hiveEase((t - T_OPEN1) / (T_OPEN2 - T_OPEN1)) * 0.3;
              else cs.eyeK = 0.92 + hiveEase((t - T_OPEN2) / Math.max(0.05, cs.dur - T_OPEN2)) * 0.08;
              state.camLook = { x: cx, y: cy + 42 };
              state.camZoomTo = 1;
            }
            state.heirFlash = cs.flashA;
            state.hiveWake = { black: cs.blackA, lids: cs.eyeK, flash: Math.max(cs.flashA, cs.clashFlash || 0) };
            if (!cs.swapped && e && t < T_FADE1) {
              /* câmera já setada nas fases */
            } else if (cs.swapped) {
              state.camLook = { x: cx, y: cy + 42 };
            }
            return;
          }
          var cocoon = null;
          var queen = null;
          var king = null;
          for (i = 0; i < state.enemies.length; i++) {
            en = state.enemies[i];
            if (en.type === "hive_cocoon") cocoon = en;
            if (en.fallen && en.type === "chefe_megatanque") queen = en;
            if (en.fallen && en.type === "chefe_beeking") king = en;
          }
          function heirEase(u) {
            u = Math.max(0, Math.min(1, u));
            return u * u * (3 - 2 * u);
          }
          function heirAim(from, to) {
            if (!from || !to) return from ? (from.rot || 0) : 0;
            return Math.atan2(to.y - from.y, to.x - from.x);
          }
          function heirTurn(ent, ang, rate) {
            if (!ent) return;
            var cur = ent.rot || 0;
            var d = ang - cur;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            ent.rot = cur + d * Math.min(1, dt * rate);
          }
          var gapX = Math.min(132, Math.max(108, (b.x1 - b.x0) * 0.3));
          var gapY = 62;
          var qx = cx - gapX;
          var qy = cy + gapY;
          var kx = cx + gapX;
          var ky = cy + gapY;
          var px = cx;
          var py = cy - 18;
          var T_CRACK = 3.45;
          var T_FLASH = 3.45;
          var T_LAND0 = 3.62;
          var T_LAND1 = 5.35;
          var T_PULL0 = 5.15;
          var T_PULL1 = 7.05;
          var T_SWORD0 = 7.05;
          var T_SWORD1 = 8.35;
          var T_SCEP0 = 8.2;
          var T_SCEP1 = 9.5;
          var T_LOOK0 = 9.55;
          var T_SCREAM = 10.55;
          if (cocoon) {
            cocoon.opening = true;
            cocoon.phase = (cocoon.phase || 0) + dt;
            cocoon.crackK = t < T_CRACK ? Math.pow(t / T_CRACK, 1.12) : 1;
            if (t >= T_FLASH) cocoon.burstOpen = true;
            cs.crackFx = (cs.crackFx || 0) - dt;
            if (t < T_CRACK && cs.crackFx <= 0) {
              cs.crackFx = 0.22 + (1 - (cocoon.crackK || 0)) * 0.1;
              G.burst(state, cocoon.x, cocoon.y, "#ffe08a", 3, 22 + (cocoon.crackK || 0) * 28);
            }
            if (!cs.crackThud && (cocoon.crackK || 0) > 0.52) {
              cs.crackThud = true;
              if (G.audio && G.audio.thud) G.audio.thud();
            }
            if (!cs.crackThud2 && (cocoon.crackK || 0) > 0.84) {
              cs.crackThud2 = true;
              if (G.audio && G.audio.thud) G.audio.thud();
            }
          }
          if (state.heirFlash > 0) state.heirFlash = Math.max(0, state.heirFlash - dt * 1.65);
          if (t >= T_FLASH && !cs.flashed) {
            cs.flashed = true;
            state.heirFlash = 1;
            state.shake = Math.max(state.shake || 0, 14);
            if (cocoon) {
              G.burst(state, cocoon.x, cocoon.y, "#fff6c0", 28, 160);
              G.burst(state, cocoon.x, cocoon.y, "#ffe08a", 18, 110);
            }
            if (G.audio && G.audio.explosion) G.audio.explosion();
          }
          if (t < T_LAND0) {
            if (e) {
              e.hideDraw = true;
              e.heirArmed = false;
              e.x = cocoon ? cocoon.x : cx;
              e.y = cocoon ? cocoon.y : cs.topY;
              e.zDraw = 0;
            }
            state.camLook = { x: cocoon ? cocoon.x : cx, y: cocoon ? cocoon.y : cs.topY };
            state.camZoomTo = 1.58;
          } else if (e) {
            if (!cs.landed) {
              cs.landed = true;
              e.hideDraw = false;
              e.x = px;
              e.y = py - 8;
              e.zDraw = 92;
              e.rot = Math.PI / 2;
              G.burst(state, px, py, "#ffe08a", 14, 80);
              if (G.audio && G.audio.thud) G.audio.thud();
            }
            var landK = heirEase((t - T_LAND0) / (T_LAND1 - T_LAND0));
            e.x = px;
            e.y = py;
            e.zDraw = 4 + 88 * (1 - landK);
            e.hideDraw = false;
            var zoomK = heirEase(Math.min(1, (t - T_FLASH) / 0.9));
            state.camZoomTo = 1.58 + (1.12 - 1.58) * zoomK;
            state.camLook = { x: e.x, y: e.y - e.zDraw * 0.35 };
          }
          if (t >= T_PULL0) {
            if (!cs.pullFrom) {
              cs.pullFrom = {
                q: queen ? { x: queen.x, y: queen.y } : null,
                k: king ? { x: king.x, y: king.y } : null
              };
            }
            var pullK = heirEase((t - T_PULL0) / (T_PULL1 - T_PULL0));
            if (queen && cs.pullFrom.q) {
              queen.x = cs.pullFrom.q.x + (qx - cs.pullFrom.q.x) * pullK;
              queen.y = cs.pullFrom.q.y + (qy - cs.pullFrom.q.y) * pullK;
              queen.vx = queen.vy = 0;
            }
            if (king && cs.pullFrom.k) {
              king.x = cs.pullFrom.k.x + (kx - cs.pullFrom.k.x) * pullK;
              king.y = cs.pullFrom.k.y + (ky - cs.pullFrom.k.y) * pullK;
              king.vx = king.vy = 0;
            }
          }
          if (t >= T_SWORD0 && t < T_SCEP0 && e) {
            e.heirSwordK = heirEase((t - T_SWORD0) / (T_SWORD1 - T_SWORD0));
            if (king) king.disarmed = true;
            if (!cs.tookSword && e.heirSwordK > 0.08) {
              cs.tookSword = true;
              if (G.audio && G.audio.merge) G.audio.merge();
              else if (G.audio && G.audio.coin) G.audio.coin();
            }
            if (king) heirTurn(e, heirAim(e, king), 3.2);
          }
          if (t >= T_SCEP0 && t < T_LOOK0 && e) {
            e.heirSwordK = 1;
            e.heirScepterK = heirEase((t - T_SCEP0) / (T_SCEP1 - T_SCEP0));
            if (queen) queen.disarmed = true;
            if (!cs.tookScepter && e.heirScepterK > 0.08) {
              cs.tookScepter = true;
              if (G.audio && G.audio.merge) G.audio.merge();
              else if (G.audio && G.audio.coin) G.audio.coin();
            }
            if (queen) heirTurn(e, heirAim(e, queen), 3.2);
          }
          if (t >= T_SWORD1 && t >= T_SCEP1 && e && !cs.armed) {
            cs.armed = true;
            e.heirArmed = true;
            e.heirSwordK = 1;
            e.heirScepterK = 1;
            G.burst(state, e.x, e.y, "#7af7ff", 10, 70);
            G.burst(state, e.x, e.y, "#ffe08a", 8, 50);
          }
          if (t >= T_LOOK0 && e) {
            heirTurn(e, heirAim(e, state.squad), 2.6);
            if (!cs.looked) cs.looked = true;
          }
          if (t >= T_SCREAM && e && !cs.scream) {
            cs.scream = true;
            e.screamFx = 1;
            state.shake = Math.max(state.shake || 0, 16);
            G.burst(state, e.x, e.y, "#fff4c4", 28, 170);
            G.burst(state, e.x, e.y, "#ffe08a", 16, 110);
            if (G.audio && G.audio.horn) G.audio.horn();
            if (G.audio && G.audio.explosion) G.audio.explosion();
          }
          if (e && (e.screamFx || 0) > 0) e.screamFx = Math.max(0, e.screamFx - dt * 0.7);
        },
        draw: function (ctx, state, e, cs) {
          var t = cs.t;
          if (cs.kind === "hive_realm") {
            ctx.save();
            var ha = 0.28;
            if (t < 0.8) ha *= t / 0.8;
            if ((cs.blackA || 0) > 0.35) ha *= Math.max(0, 1 - (cs.blackA - 0.35) / 0.65);
            if ((cs.eyeK != null) && cs.eyeK < 0.5) ha *= cs.eyeK / 0.5;
            if (ha > 0.01) {
              var hg = ctx.createRadialGradient(state.W / 2, state.H / 2, 36, state.W / 2, state.H / 2, Math.max(state.W, state.H) * 0.72);
              hg.addColorStop(0, "rgba(255, 210, 80, " + (ha * 0.08) + ")");
              hg.addColorStop(1, "rgba(8, 4, 2, " + ha + ")");
              ctx.fillStyle = hg;
              ctx.fillRect(0, 0, state.W, state.H);
            }
            if (cs.vanished && !cs.grabbed && (cs.blackA || 0) < 0.25) {
              var cui, cmd = null;
              for (cui = 0; cui < (state.units || []).length; cui++) {
                if (state.units[cui].commander && state.units[cui].hp > 0) cmd = state.units[cui];
              }
              if (cmd) {
                var z = state.camZoom || 1;
                var lx = state.camLook && state.camLook.x != null ? state.camLook.x : state.W / 2;
                var ly = state.camLook && state.camLook.y != null ? state.camLook.y : state.H / 2;
                var sx = (cmd.x - lx) * z + state.W / 2;
                var sy = (cmd.y - (cmd.leapZ || 0) - 22 - ly) * z + state.H / 2;
                var ht = Math.max(0, t - (cs.vanishAt || t));
                var qi, qk, qx, qy, qpop;
                ctx.save();
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = "bold 22px Segoe UI, sans-serif";
                for (qi = 0; qi < 3; qi++) {
                  qpop = Math.max(0, Math.min(1, (ht - qi * 0.1) / 0.12));
                  if (qpop <= 0) continue;
                  qk = qpop * qpop * (3 - 2 * qpop);
                  qx = sx + (qi - 1) * 13;
                  qy = sy - 10 - qi * 7 + Math.sin(ht * 8 + qi * 1.3) * 3.5;
                  ctx.globalAlpha = 0.2 + qk * 0.8;
                  ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
                  ctx.lineWidth = 4;
                  ctx.strokeText("?", qx, qy);
                  ctx.fillStyle = "#ffe08a";
                  ctx.fillText("?", qx, qy);
                }
                ctx.restore();
              }
            }
            ctx.restore();
            return;
          }
          var a = Math.min(1, t / 0.35) * 0.42;
          if (t > cs.dur - 0.45) a *= Math.max(0, (cs.dur - t) / 0.45);
          ctx.save();
          var g = ctx.createRadialGradient(state.W / 2, state.H / 2, 40, state.W / 2, state.H / 2, Math.max(state.W, state.H) * 0.72);
          g.addColorStop(0, "rgba(255, 220, 90, " + (a * 0.12) + ")");
          g.addColorStop(1, "rgba(12, 8, 2, " + a + ")");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, state.W, state.H);
          if (t < 3.5) {
            var crack = Math.min(1, t / 3.45);
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = "rgba(255, 220, 90, " + (0.05 + crack * 0.1 + Math.sin(t * 7) * 0.03) + ")";
            ctx.beginPath();
            ctx.arc(state.W / 2, 72, 70 + crack * 50, 0, Math.PI * 2);
            ctx.fill();
          }
          if ((state.heirFlash || 0) > 0.02) {
            var fa = Math.min(1, state.heirFlash);
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = "rgba(255, 248, 220, " + (fa * 0.92) + ")";
            ctx.fillRect(0, 0, state.W, state.H);
            var fg = ctx.createRadialGradient(state.W / 2, state.H * 0.22, 10, state.W / 2, state.H * 0.22, Math.max(state.W, state.H) * 0.8);
            fg.addColorStop(0, "rgba(255, 255, 255, " + fa + ")");
            fg.addColorStop(0.35, "rgba(255, 220, 90, " + (fa * 0.55) + ")");
            fg.addColorStop(1, "rgba(255, 180, 40, 0)");
            ctx.fillStyle = fg;
            ctx.fillRect(0, 0, state.W, state.H);
          }
          if (e && (e.screamFx || 0) > 0.04) {
            var sk = e.screamFx;
            ctx.globalCompositeOperation = "lighter";
            ctx.strokeStyle = "rgba(255, 244, 196, " + (sk * 0.7) + ")";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(state.W / 2, state.H / 2, 40 + (1 - sk) * 120, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        },
        onEnd: function (state, e, cs) {
          var ui;
          if (cs && cs.kind === "hive_realm" && !cs.swapped && e) {
            cs.swapped = true;
            state.hiveRealm = true;
            state.theme = { ground: "#16100a", grid: "#2a2014", fog: "rgba(30,18,6,0.22)" };
            var hiveBgEnd = "img/cenarios/bg-hive-robo.png";
            if (!G.stageBgs[hiveBgEnd] && G.loadImg) G.stageBgs[hiveBgEnd] = G.loadImg(G.stageBgUrls(hiveBgEnd));
            if (G.stageBgs[hiveBgEnd]) state.bgImg = G.stageBgs[hiveBgEnd];
            var hb = G.playfield(state);
            var hx = (hb.x0 + hb.x1) / 2;
            var hy = (hb.y0 + hb.y1) / 2;
            e.x = hx;
            e.y = hy - 8;
            state.squad.x = hx;
            state.squad.y = hy + 96;
          }
          if (e) {
            e.introLock = false;
            e.immortal = false;
            e.heirArmed = true;
            e.heirSwordK = 1;
            e.heirScepterK = 1;
            e.hideDraw = false;
            e.screamFx = 0;
            e.zDraw = 4;
            e.princessAct = "";
            e.skillT = (cs && cs.kind === "hive_realm") ? 1.4 : 1.1;
            e.cutKind = "";
            e.blinkFxT = 0;
            if (state.hiveRealm) {
              e.princessHive = true;
              e.hp = e.maxHp;
            }
          }
          for (ui = 0; ui < (state.units || []).length; ui++) {
            state.units[ui].leapZ = 0;
          }
          if (cs && cs.kind === "hive_realm") {
            var hn = 0;
            for (ui = 0; ui < (state.units || []).length; ui++) {
              var hu = state.units[ui];
              if (!hu) continue;
              hu.stowed = false;
              hu.leapZ = 0;
              if (hu.hp <= 0) continue;
              if (hu.commander) {
                hu.x = state.squad.x;
                hu.y = state.squad.y;
              } else {
                hu.x = state.squad.x + (hn % 3 - 1) * 16;
                hu.y = state.squad.y + ((hn / 3) | 0) * 14;
                hn++;
              }
            }
          }
          state.princessBlink = null;
          state.hiveWake = null;
          state.heirFlash = 0;
          state.camLook = null;
          state.camZoomTo = 1;
          if (typeof document !== "undefined") {
            var hudEl = document.getElementById("hud");
            if (hudEl) hudEl.style.opacity = "";
          }
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
      var i, e;
      for (i = 0; i < state.enemies.length; i++) {
        e = state.enemies[i];
        if (e.hp <= 0) continue;
        if (e.type === "chefe_megatanque" && !e.fallen) queenDead = false;
        if (e.type === "chefe_beeking" && !e.fallen) kingDead = false;
      }
      if (!queenDead || !kingDead) return;
      var b = G.playfield(state);
      var cx = (b.x0 + b.x1) / 2;
      var cy = b.y0 + 36;
      for (i = 0; i < state.enemies.length; i++) {
        if (state.enemies[i].type === "hive_cocoon") {
          state.enemies[i].opening = true;
          cx = state.enemies[i].x;
          cy = state.enemies[i].y;
        }
      }
      var kept = [];
      for (i = 0; i < state.enemies.length; i++) {
        e = state.enemies[i];
        if (e.fallen || e.type === "hive_cocoon") kept.push(e);
      }
      state.enemies = kept;
      state.projectiles = [];
      state.warnings = [];
      state.zones = [];
      var p = G.game.spawnAt(state, "beeprincess", cx, cy, { noLink: true });
      p.skillT = 14;
      p.princessAct = "";
      p.introLock = true;
      p.heirArmed = false;
      p.hideDraw = true;
      p.cutKind = "heir";
      p.immortal = true;
      this.startCutscene(state, p, "Beeprincess-09");
      if (state.bossCutscene) state.bossCutscene.kind = "heir";
      G.audio.sync(state, 0);
    },

    startHiveRealm: function (state, e) {
      if (!state || !e) return;
      e.cutKind = "hive_realm";
      e.introLock = true;
      e.princessAct = "";
      this.startCutscene(state, e, "A colmeia abre");
      if (state.bossCutscene) {
        state.bossCutscene.kind = "hive_realm";
        state.bossCutscene.dur = 16;
      }
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
      for (var i = 0; i < (state.enemies || []).length; i++) {
        var f = state.enemies[i];
        if (f.hp > 0 && f.type === "fogueira" && !f.glinderCoal) return true;
      }
      return false;
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
