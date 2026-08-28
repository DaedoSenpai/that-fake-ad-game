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
      if (e.type === "chefe_comandante" || e.type === "chefe_vulto") return true;
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
      var text = label || (e.type === "chefe_comandante" ? "Kaska perde a carapaça" : (e.type === "chefe_vulto" ? "Glinder · a lua queima" : "Segunda fase"));
      G.burst(state, e.x, e.y, "#ffe08a", 22, 150);
      G.burst(state, e.x, e.y, e.def.color || "#ff6a3a", 18, 120);
      if (state) state.shake = Math.max(state.shake || 0, 10);
      if (e.inv || e.type === "chefe_comandante" || e.type === "chefe_vulto") this.startCutscene(state, e, text);
      else if (state) state.banner = { text: text, t: 2.2 };
      return true;
    },

    clearFieldForCutscene: function (state, keep) {
      if (!state) return;
      var keepId = keep && keep.id;
      var kept = [];
      for (var i = 0; i < (state.enemies || []).length; i++) {
        var en = state.enemies[i];
        if (keepId && en.id === keepId) {
          en.attached = false;
          en.held = false;
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
