(function (G) {
  function C() {
    return G.combat;
  }

  function aim(state) {
    return C().aimPoint(state);
  }

  function has(state, kind) {
    for (var i = 0; i < state.units.length; i++) {
      if (state.units[i].hp > 0 && state.units[i].kind === kind) return true;
    }
    return false;
  }

  function lead(state, kind) {
    var best = null;
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || u.kind !== kind) continue;
      if (!best || u.id < best.id) best = u;
    }
    return best;
  }

  function nKind(state, kind) {
    var n = 0;
    for (var i = 0; i < state.units.length; i++) if (state.units[i].hp > 0 && state.units[i].kind === kind) n++;
    return n;
  }

  function hasAny(state, kinds) {
    for (var i = 0; i < kinds.length; i++) if (has(state, kinds[i])) return true;
    return false;
  }

  function trailLine(state) {
    return hasAny(state, ["mensageiro", "radio", "oficial", "bandeira"]);
  }

  function speedDmgMul(state, kind) {
    if (!trailLine(state)) return 1;
    if (kind && kind !== "mensageiro" && kind !== "radio" && kind !== "oficial" && kind !== "bandeira") return 1;
    var sp = hypot(state.squad.vx || 0, state.squad.vy || 0);
    return 1 + Math.min(1, sp / 180);
  }

  function knockEnemy(state, e, srcX, srcY, push) {
    if (!e || e.hp <= 0 || e.scenery) return;
    var dx = e.x - srcX;
    var dy = e.y - srcY;
    var len = hypot(dx, dy) || 1;
    e.x += (dx / len) * (push || 16);
    e.y += (dy / len) * (push || 16);
    G.clampPlay(e, state);
  }

  function angTo(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x);
  }

  function hypot(x, y) {
    return Math.sqrt(x * x + y * y);
  }

  function clampAim(from, to, range) {
    var dx = to.x - from.x;
    var dy = to.y - from.y;
    var d = hypot(dx, dy);
    if (d <= range || d < 0.001) return { x: to.x, y: to.y };
    return { x: from.x + (dx / d) * range, y: from.y + (dy / d) * range };
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax;
    var dy = by - ay;
    var l2 = dx * dx + dy * dy || 1;
    var t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
    return hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  function clampField(state, o) {
    var b = G.playfield(state);
    o.x = Math.max(b.x0, Math.min(b.x1, o.x));
    o.y = Math.max(b.y0, Math.min(b.y1, o.y));
  }

  function ensure(state) {
    if (!state.zones) state.zones = [];
    if (!state.minions) state.minions = [];
    if (!state.drones) state.drones = [];
    if (!state.deploys) state.deploys = [];
    if (!state.stickies) state.stickies = [];
    if (!state.mouseHist) state.mouseHist = [];
    if (state.desBeat == null) state.desBeat = 0;
    if (state.atmCharge == null) state.atmCharge = 0;
    if (state.girSpin == null) state.girSpin = 0;
    if (state.pairSeq == null) state.pairSeq = 1;
    if (state.dualHits == null) state.dualHits = {};
    if (state.bumperHp == null) state.bumperHp = 7;
    if (state.bumperCd == null) state.bumperCd = 0;
    if (state.bumperMax == null) state.bumperMax = 7;
    if (state.tankFireMode == null) state.tankFireMode = 0;
    if (state.tankBarrageUsed == null) state.tankBarrageUsed = false;
    if (state.coilSeq == null) state.coilSeq = 0;
    if (!state.cmdOrders) state.cmdOrders = { crate: 0, recruit: 0, strike: 0 };
    if (state.cmdRecruitUsed == null) state.cmdRecruitUsed = 0;
    if (!state.cmdStrikes) state.cmdStrikes = [];
    if (!state.firewaves) state.firewaves = [];
  }

  function healSquad(state, amt) {
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0) continue;
      u.hp = Math.min(u.maxHp, u.hp + amt);
    }
  }

  function beginRetire(state, obj, dur) {
    if (!obj || obj.retiring) return;
    obj.retiring = true;
    obj.retireT = dur || 0.72;
    obj.retireMax = obj.retireT;
    if (!state || obj.x == null) return;
    var col = obj.color || "#e8e4d8";
    G.burst(state, obj.x, obj.y, col, 8, 42);
    if (state.particles) {
      for (var i = 0; i < 6; i++) {
        var a = Math.random() * Math.PI * 2;
        state.particles.push({
          x: obj.x + (Math.random() - 0.5) * 10,
          y: obj.y + (Math.random() - 0.5) * 6,
          vx: Math.cos(a) * (12 + Math.random() * 28),
          vy: -18 - Math.random() * 36,
          life: 0.32 + Math.random() * 0.22,
          max: 0.52,
          size: 2 + Math.random() * 2.6,
          color: i % 2 ? col : "#f4f0e8"
        });
      }
    }
  }

  function tickRetire(obj, dt) {
    if (!obj || !obj.retiring) return false;
    obj.retireT -= dt;
    return obj.retireT <= 0;
  }

  function retireK(obj) {
    if (!obj || !obj.retiring) return 0;
    return 1 - Math.max(0, obj.retireT) / Math.max(0.01, obj.retireMax || 0.58);
  }

  function zoneRetires(z) {
    if (!z) return false;
    var k = z.kind;
    return k === "heal" || k === "smoke" || k === "fire" || k === "napalm" || k === "anchor" || k === "standard" || k === "obsmark" || k === "spot" || k === "beacon" || k === "phalanx" || k === "cmd_aura" || k === "crack";
  }

  function applyRetirePose(ctx, k, mode) {
    if (k <= 0) return;
    if (mode === "sink") {
      ctx.translate(0, k * 16);
      ctx.scale(1 - k * 0.1, Math.max(0.18, 1 - k * 0.52));
    } else if (mode === "pop") {
      var bounce = k < 0.32 ? k / 0.32 : 1 - (k - 0.32) / 0.68;
      ctx.translate(0, k * 5);
      ctx.scale(1 + bounce * 0.28, Math.max(0.25, 1 + bounce * 0.12 - k * 0.45));
    } else if (mode === "puff") {
      ctx.scale(1 + k * 0.48, 1 + k * 0.22);
    } else {
      ctx.translate(k * 6, k * 8);
      ctx.rotate(k * 0.7);
      ctx.scale(1 + k * 0.1, Math.max(0.22, 1 - k * 0.4));
    }
  }

  function drawRetireBits(ctx, k, pal) {
    if (k <= 0.02 || k >= 0.98) return;
    pal = pal || ["#fff4d0", "#d8e0e8", "#c8d4c0"];
    var i;
    ctx.save();
    for (i = 0; i < 5; i++) {
      var a = i * 1.256 + k * 2.4;
      var d = 7 + k * (14 + i * 3.5);
      ctx.globalAlpha = (1 - k) * 0.5;
      ctx.fillStyle = "rgba(214, 218, 226, 0.92)";
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d * 0.42 - k * 11 - i * 1.8, 4.2 + k * 5, 2.5 + k * 3.2, a * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < 7; i++) {
      var a2 = i * 0.9 - k * 3.4;
      var d2 = 5 + k * 20;
      ctx.globalAlpha = (1 - k) * 0.88;
      ctx.fillStyle = pal[i % pal.length];
      ctx.beginPath();
      ctx.arc(Math.cos(a2) * d2, -8 - k * 16 + Math.sin(a2) * d2 * 0.28, 1.15 + (1 - k) * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.globalAlpha = (1 - k) * 0.5;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 3, 7 + k * 20, 2.8 + k * 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function zoneRetireMode(z) {
    var k = z && z.kind;
    if (k === "smoke" || k === "fire" || k === "napalm") return "puff";
    return "sink";
  }

  function zoneRetirePal(z) {
    var k = z && z.kind;
    if (k === "heal" || k === "cmd_aura") return ["#b8ffd0", "#7cffb0", "#e8ffe8"];
    if (k === "fire" || k === "napalm") return ["#ffe060", "#ff6a20", "#fff4d0"];
    if (k === "smoke") return ["#c8d0d8", "#8a949e", "#e8eef4"];
    if (k === "obsmark" || k === "spot") return ["#7ad8ff", "#e8ffff", "#4aa3ff"];
    if (k === "beacon") return ["#ff6a4a", "#ffd24a", "#ff9080"];
    if (k === "phalanx") return ["#e8c878", "#c4a45a", "#fff4d0"];
    if (k === "crack") return ["#6a3a14", "#c49040", "#3a1c08"];
    return ["#ffe9a0", "#fff8d8", "#c8b070"];
  }

  function healAlliesPct(state, pct, ox, oy, r) {
    function healOne(u) {
      if (!u || u.hp <= 0 || !u.maxHp) return;
      if (r != null && !u.stowed && hypot((u.x || 0) - ox, (u.y || 0) - oy) > r + ((u.def && u.def.size) || 10)) return;
      u.hp = Math.min(u.maxHp, u.hp + u.maxHp * pct);
    }
    for (var i = 0; i < state.units.length; i++) healOne(state.units[i]);
    for (var m = 0; m < (state.minions || []).length; m++) healOne(state.minions[m]);
  }

  function lowest(state) {
    var best = null;
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0) continue;
      if (!best || u.hp / u.maxHp < best.hp / best.maxHp) best = u;
    }
    return best;
  }

  function zone(state, z) {
    state.zones.push(z);
  }

  var INFERNO_PUDDLE_CAP = 8;

  function spawnInfernoPuddle(state, x, y) {
    if (!has(state, "inferno")) return;
    ensure(state);
    var inf = lead(state, "inferno");
    var dmg = inf ? Math.round(inf.def.dmg * 0.8 * C().dmgMul(state)) : 12;
    var i;
    for (i = 0; i < state.zones.length; i++) {
      var z = state.zones[i];
      if (z.kind !== "fire" || !z.fromInferno || z.retiring) continue;
      if (hypot(z.x - x, z.y - y) < 32) {
        z.t = Math.max(z.t, 5);
        z.max = Math.max(z.max || 5, 5);
        z.r = Math.min(36, (z.r || 26) + 2);
        z.dmg = Math.max(z.dmg || 0, dmg);
        return;
      }
    }
    var oldest = -1;
    var oldestT = 99;
    var count = 0;
    for (i = 0; i < state.zones.length; i++) {
      if (state.zones[i].kind !== "fire" || !state.zones[i].fromInferno || state.zones[i].retiring) continue;
      count++;
      if (state.zones[i].t < oldestT) {
        oldestT = state.zones[i].t;
        oldest = i;
      }
    }
    if (count >= INFERNO_PUDDLE_CAP && oldest >= 0) beginRetire(state, state.zones[oldest], 0.48);
    zone(state, { kind: "fire", fromInferno: true, x: x, y: y, r: 28, t: 5, max: 5, dmg: dmg });
  }

  function mapCornerR(state, x, y) {
    var b = G.playfield(state);
    return Math.max(
      hypot(x - b.x0, y - b.y0),
      hypot(x - b.x1, y - b.y0),
      hypot(x - b.x0, y - b.y1),
      hypot(x - b.x1, y - b.y1)
    ) + 28;
  }

  function startFirewaves(state, u) {
    ensure(state);
    var dmgScale = C().dmgMul(state);
    var n = nKind(state, "inferno");
    var sm = n > 1 ? 1 + 0.15 * (n - 1) : 1;
    for (var i = 0; i < state.units.length; i++) {
      var inf = state.units[i];
      if (inf.hp <= 0 || inf.kind !== "inferno" || inf.stowed) continue;
      state.firewaves.push({
        x: inf.x,
        y: inf.y,
        t: 0.9,
        max: 0.9,
        r: 18,
        rMax: mapCornerR(state, inf.x, inf.y),
        width: 64,
        dmg: Math.round(inf.def.dmg * 3.4 * dmgScale * sm),
        burnDps: inf.def.dmg * 0.9 * dmgScale,
        hit: {}
      });
      G.burst(state, inf.x, inf.y, "#ffffff", 24, 170);
      G.burst(state, inf.x, inf.y, "#ffe08a", 16, 120);
    }
    if (G.audio && G.audio.explosion) G.audio.explosion();
    state.shake = Math.max(state.shake || 0, 8);
    if (u) state.floaters.push(G.createFloater(u.x, u.y - 22, "maré de fogo", "#fff4c8"));
  }

  function tickFirewaves(state, dt) {
    var waves = state.firewaves;
    if (!waves || !waves.length) return;
    for (var i = waves.length - 1; i >= 0; i--) {
      var w = waves[i];
      w.t -= dt;
      var k = 1 - Math.max(0, w.t) / w.max;
      var eased = 1 - (1 - k) * (1 - k);
      w.r = 18 + (w.rMax - 18) * eased;
      var inner = Math.max(0, w.r - w.width);
      var e;
      for (e = 0; e < state.enemies.length; e++) {
        var en = state.enemies[e];
        if (en.hp <= 0) continue;
        var d = hypot(en.x - w.x, en.y - w.y) - ((en.def && en.def.size) || 10);
        if (d > w.r + 10 || d < inner - 10) continue;
        if (w.hit[en.id]) continue;
        w.hit[en.id] = 1;
        en.burnT = Math.max(en.burnT || 0, 5);
        en.burnDps = Math.max(en.burnDps || 0, w.burnDps);
        C().hurt(state, en, w.dmg, w.x, w.y, true);
      }
      for (var p = state.projectiles.length - 1; p >= 0; p--) {
        var pr = state.projectiles[p];
        if (pr.team !== "enemy") continue;
        if (pr.kind === "laser" || pr.kind === "missile") continue;
        var pd = hypot(pr.x - w.x, pr.y - w.y);
        if (pd > w.r + 8 || pd < inner - 8) continue;
        G.burst(state, pr.x, pr.y, "#ffffff", 5, 46);
        state.projectiles.splice(p, 1);
      }
      var sparks = 2;
      for (var s = 0; s < sparks; s++) {
        var a = Math.random() * Math.PI * 2;
        var rr = w.r + (Math.random() - 0.35) * 16;
        state.particles.push({
          x: w.x + Math.cos(a) * rr,
          y: w.y + Math.sin(a) * rr,
          vx: Math.cos(a) * (50 + Math.random() * 90),
          vy: Math.sin(a) * (50 + Math.random() * 90) - 24,
          life: 0.22 + Math.random() * 0.18,
          max: 0.4,
          size: 4 + Math.random() * 6,
          color: Math.random() > 0.4 ? "#ffffff" : "#ffe08a",
          flame: true,
          napalm: true
        });
      }
      if (w.t <= 0) waves.splice(i, 1);
    }
  }

  function bolt(state, u, ang, extra) {
    extra = extra || {};
    var dmg = Math.round(u.def.dmg * C().dmgMul(state) * (extra.dmgMul || 1) * speedDmgMul(state, u.kind));
    if (u.marked > 0) {
      dmg = Math.round(dmg * (u.marked <= 1 ? 4 : u.marked));
      u.marked = 0;
    }
    var spd = extra.speed || (u.def.projectile === "cannon" ? 320 : u.def.projectile === "missile" ? 210 : u.def.projectile === "laser" ? 560 : 420);
    if (u.def && u.def.infiniteRange && extra.lifeDist == null) extra.lifeDist = 5000;
    var range = extra.lifeDist || u.def.range || 220;
    var p = G.createProjectile({
      x: u.x + (extra.ox || 0),
      y: u.y + (extra.oy || 0),
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      dmg: dmg,
      team: "player",
      kind: extra.kind || u.def.projectile || "bullet",
      life: extra.life || Math.max(0.35, range / spd),
      r: extra.r || (u.def.projectile === "cannon" ? 6 : 3),
      pierce: extra.pierce,
      homing: extra.homing,
      homeId: extra.homeId || 0,
      homeCursor: !!extra.homeCursor,
      hitsLeft: extra.hitsLeft || (extra.pierce ? 6 : 1),
      boomR: extra.boomR || 0,
      eraseShots: extra.eraseShots,
      color: extra.color || ""
    });
    p.ownerKind = u.kind;
    p.fromId = u.id;
    p.tracer = !!extra.tracer;
    if (p.tracer) {
      var pal = ["#8af0d8", "#ffe08a", "#ff7ad0", "#7ad8ff", "#ff9a3a", "#c8a0ff"];
      state.tracerSeq = (state.tracerSeq || 0) + 1;
      p.tracerColor = extra.tracerColor || pal[state.tracerSeq % pal.length];
      if (!p.color) p.color = p.tracerColor;
    }
    p.wallBounce = extra.wallBounce || 0;
    p.bounceMul = extra.bounceMul || 3;
    p.eraseShots = !!extra.eraseShots;
    p.stealShots = !!extra.stealShots;
    p.pairId = extra.pairId || 0;
    p.sticky = !!extra.sticky;
    p.bleed = !!extra.bleed;
    p.enemyBounce = extra.enemyBounce || 0;
    p.bounceRange = extra.bounceRange || 0;
    p.arc = extra.arc || null;
    p.orbitBoss = extra.orbitBoss || null;
    p.spreadExplode = extra.spreadExplode;
    p.homeId = extra.homeId || 0;
    p.homeCursor = !!extra.homeCursor;
    if (state.run && state.run.ricochet) p.ricochet = true;
    if (state.run && state.run.pierce && !p.pierce) {
      p.pierce = true;
      p.hitsLeft = Math.max(p.hitsLeft || 1, 4);
    }
    if (extra.homing !== false && !p.homeCursor && !p.homeId) {
      var spotHome = holofoteTarget(state);
      if (spotHome) {
        p.homing = true;
        p.homeId = spotHome.id;
      }
    }
    state.projectiles.push(p);
    return p;
  }

  function mouseAng(state, from) {
    var p = aim(state);
    var dx = p.x - from.x;
    var dy = p.y - from.y;
    if (dx * dx + dy * dy < 16) {
      var md = state.moveDir || { x: 0, y: -1 };
      return Math.atan2(md.y, md.x);
    }
    return Math.atan2(dy, dx);
  }

  function delayedMouse(state, lag) {
    var hist = state.mouseHist;
    var t = (state.time || 0) - lag;
    for (var i = hist.length - 1; i >= 0; i--) {
      if (hist[i].t <= t) return hist[i];
    }
    return hist[0] || aim(state);
  }

  function inSmoke(state, e) {
    for (var i = 0; i < state.zones.length; i++) {
      var z = state.zones[i];
      if (z.kind !== "smoke") continue;
      if (hypot(e.x - z.x, e.y - z.y) < z.r) return true;
    }
    return false;
  }

  function holofoteTarget(state) {
    var marked = null;
    var markedT = 0;
    for (var m = 0; m < state.enemies.length; m++) {
      var me = state.enemies[m];
      if (me.hp <= 0) continue;
      if ((me.obsMarkT || 0) > markedT) {
        markedT = me.obsMarkT;
        marked = me;
      }
    }
    if (marked) return marked;
    var best = null;
    var bestD = 1e9;
    for (var i = 0; i < state.zones.length; i++) {
      var z = state.zones[i];
      if (z.kind !== "spot" && z.kind !== "obsmark") continue;
      for (var j = 0; j < state.enemies.length; j++) {
        var e = state.enemies[j];
        if (e.hp <= 0) continue;
        var d = hypot(e.x - z.x, e.y - z.y);
        if (d < z.r && d < bestD) {
          bestD = d;
          best = e;
        }
      }
    }
    return best;
  }

  function cmdMark(state) {
    var cmd = lead(state, "comandante");
    if (!cmd) {
      state.cmdMark = null;
      return;
    }
    var p = aim(state);
    var best = null;
    var bestD = 36;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0) continue;
      var d = hypot(e.x - p.x, e.y - p.y) - (e.def.size || 12);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    state.cmdMark = best;
  }

  var GUER_CD = { crate: 15, recruit: 30, strike: 20 };
  var GUER_RECRUIT_CAP = 2;

  function guerrillaHud(state) {
    ensure(state);
    var o = state.cmdOrders;
    var recLeft = Math.max(0, GUER_RECRUIT_CAP - (state.cmdRecruitUsed | 0));
    return {
      crate: o.crate || 0,
      recruit: o.recruit || 0,
      strike: o.strike || 0,
      crateMax: GUER_CD.crate,
      recruitMax: GUER_CD.recruit,
      strikeMax: GUER_CD.strike,
      recruitsLeft: recLeft,
      anyReady: (o.crate || 0) <= 0 || ((o.recruit || 0) <= 0 && recLeft > 0) || (o.strike || 0) <= 0
    };
  }

  function guerrillaTick(state, dt) {
    ensure(state);
    var o = state.cmdOrders;
    if (o.crate > 0) o.crate = Math.max(0, o.crate - dt);
    if (o.recruit > 0) o.recruit = Math.max(0, o.recruit - dt);
    if (o.strike > 0) o.strike = Math.max(0, o.strike - dt);
    if (state.cmdStrikes) {
      for (var i = state.cmdStrikes.length - 1; i >= 0; i--) {
        var s = state.cmdStrikes[i];
        s.t -= dt;
        if (s.t > 0) continue;
        C().explode(state, s.x, s.y, s.r, s.dmg, "player");
        G.audio.explosion();
        if (s.fire) zone(state, { kind: "fire", x: s.x, y: s.y, r: s.fireR || s.r, t: 5, dmg: s.fireDps || 18 });
        state.cmdStrikes.splice(i, 1);
      }
    }
  }

  function guerrillaSlice(dx, dy) {
    var dist = hypot(dx, dy);
    if (dist < 28) return null;
    var a = Math.atan2(dy, dx) + Math.PI / 2;
    if (a < 0) a += Math.PI * 2;
    if (a < Math.PI / 3 || a >= (Math.PI * 5) / 3) return "square";
    if (a < Math.PI) return "triangle";
    return "circle";
  }

  function guerrillaOpenMenu(state) {
    var p = aim(state);
    state.guerrillaMenu = { x: p.x, y: p.y, hover: null };
  }

  function guerrillaUpdateMenu(state) {
    var m = state.guerrillaMenu;
    if (!m) return;
    var p = aim(state);
    m.hover = guerrillaSlice(p.x - m.x, p.y - m.y);
  }

  function guerrillaCloseMenu(state) {
    var m = state.guerrillaMenu;
    state.guerrillaMenu = null;
    if (!m) return;
    if (!m.hover) return;
    guerrillaFireAt(state, m.hover, m.x, m.y);
  }

  function guerrillaClamp(state, x, y) {
    var b = G.playfield(state);
    return {
      x: Math.max(b.x0 + 18, Math.min(b.x1 - 18, x)),
      y: Math.max(b.y0 + 18, Math.min(b.y1 - 18, y))
    };
  }

  function nearCommander(state) {
    var cmd = lead(state, "comandante");
    var ox = cmd && cmd.hp > 0 ? cmd.x : state.squad.x;
    var oy = cmd && cmd.hp > 0 ? cmd.y : state.squad.y;
    var n = G.soldierCount ? G.soldierCount(state) : 0;
    var ang = -Math.PI / 2 + n * 0.85;
    return guerrillaClamp(state, ox + Math.cos(ang) * 28, oy + Math.sin(ang) * 28);
  }

  function dropCrateAt(state, x, y, extra) {
    extra = extra || {};
    zone(state, {
      kind: "crate",
      x: x,
      y: y,
      r: extra.r || 40,
      t: extra.t || 0.55,
      falling: extra.falling != null ? extra.falling : 1,
      hpN: extra.hpN != null ? extra.hpN : 2,
      dmg: extra.dmg
    });
  }

  function spawnGuerrillaRecruit(state, x, y) {
    var pos = guerrillaClamp(state, x, y);
    var nu = G.createPlayerUnit(pos.x, pos.y, "recruta", state.run, G.save.data.perm);
    state.units.push(nu);
    if (G.codex) G.codex.unlockUnit("recruta");
    state.floaters.push(G.createFloater(pos.x, pos.y - 16, "recruta", "#9ad4ff"));
    G.burst(state, pos.x, pos.y, "#9ad4ff", 12, 80);
    return true;
  }

  function recruitWithArquivo(state) {
    if (!state || !state.run) return false;
    if (G.soldierCount(state) >= G.maxUnits()) return false;
    var intel = G.merge.ensureIntel(state.run);
    if ((intel.arquivo | 0) < 1) return false;
    intel.arquivo -= 1;
    var pos = nearCommander(state);
    spawnGuerrillaRecruit(state, pos.x, pos.y);
    return true;
  }

  function guerrillaFireAt(state, kind, x, y) {
    var pos = guerrillaClamp(state, x, y);
    var cmd = lead(state, "comandante");
    var o = state.cmdOrders;
    if (kind === "square") {
      if (o.crate > 0) {
        var waitAt = cmd || pos;
        state.floaters.push(G.createFloater(waitAt.x, waitAt.y - 18, "aura em recarga", "#7cffb0"));
        return false;
      }
      if (!cmd || cmd.hp <= 0) return false;
      for (var zi = state.zones.length - 1; zi >= 0; zi--) {
        if (state.zones[zi].kind === "cmd_aura") beginRetire(state, state.zones[zi], 0.5);
      }
      zone(state, {
        kind: "cmd_aura",
        x: cmd.x,
        y: cmd.y,
        r: 96,
        t: 5,
        max: 5,
        healPct: 0.02
      });
      G.burst(state, cmd.x, cmd.y, "#7cffb0", 14, 80);
      o.crate = GUER_CD.crate;
      state.floaters.push(G.createFloater(cmd.x, cmd.y - 22, "aura 5s", "#7cffb0"));
    } else if (kind === "circle") {
      var here = nearCommander(state);
      var waitAt = cmd || here;
      if ((state.cmdRecruitUsed | 0) >= GUER_RECRUIT_CAP) {
        state.floaters.push(G.createFloater(waitAt.x, waitAt.y - 18, "limite da fase", "#9ad4ff"));
        return false;
      }
      if (o.recruit > 0) {
        state.floaters.push(G.createFloater(waitAt.x, waitAt.y - 18, "recruta em recarga", "#9ad4ff"));
        return false;
      }
      if (G.soldierCount && G.soldierCount(state) >= G.maxUnits()) {
        state.floaters.push(G.createFloater(waitAt.x, waitAt.y - 18, "esquadrão cheio", "#9ad4ff"));
        return false;
      }
      spawnGuerrillaRecruit(state, here.x, here.y);
      state.cmdRecruitUsed = (state.cmdRecruitUsed | 0) + 1;
      o.recruit = GUER_CD.recruit;
    } else if (kind === "triangle") {
      if (o.strike > 0) {
        state.floaters.push(G.createFloater(pos.x, pos.y - 18, "airstrike em recarga", "#ff9a3a"));
        return false;
      }
      var r = 62;
      var dmg = cmd ? Math.round(cmd.def.dmg * C().dmgMul(state) * 4.2) : 52;
      state.cmdStrikes.push({
        x: pos.x,
        y: pos.y,
        t: 0.55,
        max: 0.55,
        r: r,
        dmg: dmg,
        fire: true,
        fireR: r * 0.92,
        fireDps: 18
      });
      o.strike = GUER_CD.strike;
      state.floaters.push(G.createFloater(pos.x, pos.y - 22, "airstrike", "#ff9a3a"));
    } else {
      return false;
    }
    if (cmd) cmd.activeFlash = 0.45;
    G.audio.wave();
    return true;
  }

  function iframeDash(state, dur) {
    var md = state.moveDir || { x: 0, y: -1 };
    var dx = md.x;
    var dy = md.y;
    var len = hypot(dx, dy);
    if (len < 0.05) {
      var p = aim(state);
      dx = p.x - state.squad.x;
      dy = p.y - state.squad.y;
      len = hypot(dx, dy) || 1;
    }
    var dashDur = 0.68;
    state.dashT = dashDur;
    state.dashTMax = dashDur;
    state.dashCd = Math.max(state.dashCd || 0, 0.45);
    state.dashCdMax = 1.05;
    state.dashDir = { x: dx / len, y: dy / len };
    state.moveDir = { x: dx / len, y: dy / len };
    state.dashCoast = true;
    state.dashHit = {};
    state.dashSlideT = 0;
    state.run.smokeT = Math.max(state.run.smokeT || 0, Math.max(dur || 0.5, dashDur));
    if (G.combat && G.combat.spawnDashBurst) G.combat.spawnDashBurst(state, "#ffe08a");
    else G.burst(state, state.squad.x, state.squad.y, "#ffe08a", 12, 120);
    return true;
  }

  function throwArc(state, u, land, extra) {
    extra = extra || {};
    var p = G.createProjectile({
      x: u.x,
      y: u.y,
      vx: 0,
      vy: 0,
      dmg: extra.dmg || Math.round(u.def.dmg * C().dmgMul(state)),
      team: "player",
      kind: extra.kind || "grenade",
      life: 1.2,
      r: extra.r || 5,
      hitsLeft: 99,
      boomR: extra.boomR || 62
    });
    p.ownerKind = u.kind;
    p.fromId = u.id;
    p.color = extra.color || "";
    p.cluster = extra.cluster;
    p.arc = {
      z: 0,
      vz: extra.vz || 240,
      grav: extra.grav || 620,
      x0: u.x,
      y0: u.y,
      tx: land.x,
      ty: land.y,
      t: 0,
      dur: extra.dur || 0.72,
      land: extra.land || "boom"
    };
    state.projectiles.push(p);
    return p;
  }

  function placePuddle(state, x, y, r, heal, t) {
    var h = heal || 0;
    zone(state, { kind: "heal", x: x, y: y, r: r || 38, heal: h, t: t || 4.5, max: t || 4.5, toxin: h <= 0 });
  }

  function enemyInPuddle(state, e) {
    if (!e || e.hp <= 0) return false;
    for (var i = 0; i < (state.zones || []).length; i++) {
      var z = state.zones[i];
      if (z.kind !== "heal" || z.retiring) continue;
      if (hypot(e.x - z.x, e.y - z.y) < (z.r || 38) + (e.def.size || 10)) return true;
    }
    return false;
  }

  function splashMedicFlask(state, p, x, y) {
    var r = 40;
    var dmg = Math.round(p.dmg || 6);
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0 || e.scenery) continue;
      if (hypot(e.x - x, e.y - y) > r + (e.def.size || 10)) continue;
      var slowed = (e.slowT || 0) > 0.05 || enemyInPuddle(state, e);
      if (dmg > 0) C().hurt(state, e, dmg, x, y, true);
      e.slowT = Math.max(e.slowT || 0, 0.85);
      if (slowed && Math.random() < 0.28) {
        state.drops.push(G.createDrop(e.x, e.y, "hp", { value: 14 }));
      }
    }
    G.burst(state, x, y, "#7cffb0", 10, 50);
  }

  function fireBucknade(state, src, x, y) {
    var owner = null;
    if (src && src.fromId) {
      for (var i = 0; i < state.units.length; i++) {
        if (state.units[i].id === src.fromId) owner = state.units[i];
      }
    }
    owner = owner || lead(state, "fora_da_lei");
    if (!owner) return;
    var fake = { x: x, y: y, def: owner.def, kind: "fora_da_lei", marked: 0, id: owner.id };
    var n = 18;
    for (var k = 0; k < n; k++) {
      var a = (Math.PI * 2 * k) / n;
      bolt(state, fake, a, { r: 2.5, dmgMul: 0.42, lifeDist: 2000, speed: 400 });
      bolt(state, fake, a + 0.12, { r: 2.2, dmgMul: 0.38, lifeDist: 1600, speed: 360 });
    }
    G.burst(state, x, y, "#ff8a4a", 22, 160);
    G.burst(state, x, y, "#ffe0b0", 12, 90);
    if (G.audio && G.audio.explosion) G.audio.explosion();
    else G.audio.shoot();
  }

  function scalpelRain(state, u) {
    var p = aim(state);
    var r = 96;
    var dmg = Math.round(u.def.dmg * C().dmgMul(state) * 2.4);
    var dealt = 0;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0 || e.scenery) continue;
      if (hypot(e.x - p.x, e.y - p.y) > r + (e.def.size || 10)) continue;
      var before = e.hp;
      C().hurt(state, e, dmg, p.x, p.y, true);
      var took = Math.max(0, before - Math.max(0, e.hp));
      dealt += took;
      e.bleedT = 5;
      e.bleedDps = Math.max(e.bleedDps || 0, dmg * 0.91);
    }
    if (dealt > 0) {
      healSquad(state, dealt);
      state.floaters.push(G.createFloater(p.x, p.y - 18, "+" + Math.round(dealt), "#ffd0d0"));
    }
    state.vfx = state.vfx || [];
    state.vfx.push({ scalpelRain: true, x: p.x, y: p.y, r: r, t: 0.55, max: 0.55, color: "#ffd0d0" });
    G.burst(state, p.x, p.y, "#ffd0d0", 22, 140);
    G.burst(state, p.x, p.y, "#ffffff", 10, 70);
    if (G.audio && G.audio.hit) G.audio.hit();
  }

  function plantMineAt(state, u, x, y) {
    if (!state.mines) state.mines = [];
    var cap = 10 + (state.run.minesPlus || 0) * 2;
    state.mines.push({
      x: x,
      y: y,
      arm: 0,
      life: 12,
      r: Math.round((34 + (state.run.minesPlus || 0) * 6) * 1.2),
      dmg: Math.round(u.def.dmg * C().dmgMul(state)),
      team: "player"
    });
    if (state.mines.length > cap) {
      var oldest = state.mines[0];
      if (oldest && !oldest.retiring) beginRetire(state, oldest, 0.48);
      else state.mines.shift();
    }
  }

  function selectedUnit(state) {
    var list = C().activesOf(state);
    if (!list.length) return null;
    var i = state.skillSlot | 0;
    if (i < 0 || i >= list.length) i = 0;
    state.skillSlot = i;
    return list[i];
  }

  function selectedId(state) {
    var u = selectedUnit(state);
    return u && u.def.active ? u.def.active.id : "";
  }

  function putSelectedOnCd(state) {
    var u = selectedUnit(state);
    if (!u || !u.def.active) return;
    var id = u.def.active.id;
    var cd = u.def.active.cd;
    for (var i = 0; i < state.units.length; i++) {
      var other = state.units[i];
      if (other.hp > 0 && other.def.active && other.def.active.id === id) other.activeCd = cd;
    }
  }

  function onAltDown(state) {
    ensure(state);
    if (state.paused || state.stageOutro || (G.invasion && G.invasion.cinematic(state)) || state.timeLock) return;
    state.pointer.altHold = true;
    state.pointer.altFrom = { x: aim(state).x, y: aim(state).y };
    var u = selectedUnit(state);
    if (!u) return;
    var id = selectedId(state);
    if (id === "guerrilla") {
      guerrillaOpenMenu(state);
      return;
    }
    if (u.activeCd > 0) return;
    if (id === "deploy") {
      openTurretMenu(state);
      return;
    }
    if (id === "airstrike") {
      var ap = aim(state);
      state.bombLine = { x0: ap.x, y0: ap.y, x1: ap.x, y1: ap.y };
      return;
    }
    if (id === "carpet" && u.kind === "mineiro") {
      state.mineDraw = { last: { x: aim(state).x, y: aim(state).y }, spent: 0 };
      return;
    }
    if (id === "carpetbomb") {
      state.gunBombs = true;
      putSelectedOnCd(state);
      return;
    }
    C().useActive(state, state.skillSlot | 0);
  }

  function onAltUp(state) {
    state.pointer.altHold = false;
    state.gunBombs = false;
    if (state.guerrillaMenu) {
      guerrillaCloseMenu(state);
    }
    if (state.turretMenu) {
      closeTurretMenu(state);
    }
    if (state.bombLine) {
      var bl = state.bombLine;
      state.bombLine = null;
      var len = hypot(bl.x1 - bl.x0, bl.y1 - bl.y0);
      if (len < 12) {
        bl.x1 = bl.x0;
        bl.y1 = bl.y0 + 8;
      }
      state.bombPending = { x0: bl.x0, y0: bl.y0, x1: bl.x1, y1: bl.y1, t: 0.28 };
      putSelectedOnCd(state);
    }
    if (state.mineDraw && state.mineDraw.spent === 0) C().useActive(state, state.skillSlot | 0);
    state.mineDraw = null;
  }

  function onFireDown(state) {
    ensure(state);
    state.pointer.fireHold = true;
  }

  function onFireUp(state) {
    state.pointer.fireHold = false;
    state.atmCharge = 0;
    if (!state.pointer.fireHold) state.girSpin = Math.min(state.girSpin, 0.4);
  }

  function dropCrate(state) {
    var p = aim(state);
    dropCrateAt(state, p.x, p.y, {});
  }

  function startHook(state) {
    var u = lead(state, "socorrista") || { x: state.squad.x, y: state.squad.y };
    var p = aim(state);
    var dx = p.x - u.x;
    var dy = p.y - u.y;
    var len = hypot(dx, dy) || 1;
    var spd = 920;
    state.hook = {
      x: u.x,
      y: u.y,
      vx: (dx / len) * spd,
      vy: (dy / len) * spd,
      tx: p.x,
      ty: p.y,
      t: Math.min(1.1, len / spd + 0.05),
      flying: true,
      global: true
    };
  }

  function startRam(state) {
    var a = mouseAng(state, state.squad);
    state.ramT = 0.34;
    state.dashT = 0.34;
    state.dashTMax = 0.34;
    state.dashDir = { x: Math.cos(a), y: Math.sin(a) };
    state.dashCoast = false;
    state.dashCd = Math.max(state.dashCd || 0, 0.3);
    state.dashSlideT = 0;
    state.run.smokeT = Math.max(state.run.smokeT || 0, 0.28);
    if (G.combat && G.combat.spawnDashBurst) G.combat.spawnDashBurst(state, "#7ad0ff");
    else G.burst(state, state.squad.x, state.squad.y, "#7ad0ff", 14, 140);
  }

  var TURRET_PLACE_R = 200;

  function turretPlaceAt(state) {
    var p = aim(state);
    var origin = state.squad || { x: p.x, y: p.y };
    var clamped = clampAim(origin, p, TURRET_PLACE_R);
    return guerrillaClamp(state, clamped.x, clamped.y);
  }

  function turretDeploySpec(u, variant, pos) {
    variant = variant || "mg";
    if (variant === "mg") {
      return {
        kind: "turret",
        variant: "mg",
        x: pos.x,
        y: pos.y,
        hp: 70,
        maxHp: 70,
        cooldown: 0.4,
        fire: 6.5,
        dmg: Math.round(u.def.dmg * 0.45),
        range: 210,
        t: 18,
        size: 14,
        noAggro: true,
        label: "metralhadora",
        color: "#c8b45a"
      };
    }
    if (variant === "flame") {
      return {
        kind: "turret",
        variant: "flame",
        x: pos.x,
        y: pos.y,
        hp: 85,
        maxHp: 85,
        cooldown: 0.4,
        fire: 6,
        dmg: Math.round(u.def.dmg * 0.35),
        range: 110,
        t: 16,
        size: 15,
        noAggro: true,
        label: "lança-chamas",
        color: "#ff7a2a"
      };
    }
    return {
      kind: "turret",
      variant: "jolt",
      x: pos.x,
      y: pos.y,
      hp: 75,
      maxHp: 75,
      cooldown: 0.4,
      fire: 3.2,
      dmg: Math.round(u.def.dmg * 0.42),
      range: 210,
      t: 16,
      size: 14,
      noAggro: true,
      label: "jolt",
      color: "#a8f6ff"
    };
  }

  function startTurretToss(state, u, spec) {
    var dx = spec.x - u.x;
    var dy = spec.y - u.y;
    var dist = hypot(dx, dy);
    var ang = Math.atan2(dy, dx);
    var x0 = u.x + Math.cos(ang) * 18;
    var y0 = u.y + Math.sin(ang) * 8;
    spec.toss = {
      x0: x0,
      y0: y0,
      tx: spec.x,
      ty: spec.y,
      t: 0,
      dur: 0.36 + Math.min(0.2, dist / 980),
      peak: 46 + dist * 0.36,
      x: x0,
      y: y0,
      z: 0,
      spin: 0
    };
    spec.airborne = true;
    spec.landSquash = 0;
    u.activeFlash = 0.4;
    u.throwT = 0.34;
    u.throwAng = ang;
    u.rot = ang;
    G.burst(state, x0, y0, spec.color || "#c8b45a", 10, 80);
    if (G.audio && G.audio.toss) G.audio.toss();
    else if (G.audio && G.audio.shoot) G.audio.shoot();
  }

  function deployTurret(state, variant, at) {
    var u = lead(state, "torreta");
    if (!u) return;
    var pos = at || turretPlaceAt(state);
    var spec = turretDeploySpec(u, variant, pos);
    startTurretToss(state, u, spec);
    state.deploys.push(spec);
  }

  function openTurretMenu(state) {
    var p = turretPlaceAt(state);
    state.turretMenu = { x: p.x, y: p.y, hover: null };
  }

  function closeTurretMenu(state) {
    var m = state.turretMenu;
    state.turretMenu = null;
    if (!m || !m.hover) return;
    var u = lead(state, "torreta");
    if (!u || u.activeCd > 0) return;
    var map = { square: "jolt", triangle: "flame", circle: "mg" };
    deployTurret(state, map[m.hover] || "mg", { x: m.x, y: m.y });
    putSelectedOnCd(state);
  }

  function placeCoilTower(state, u) {
    var p = clampAim(u, aim(state), u.def.range || 300);
    var coils = [];
    for (var i = 0; i < state.deploys.length; i++) {
      if (state.deploys[i].kind === "coil_tower" && !state.deploys[i].retiring) coils.push(state.deploys[i]);
    }
    var fieldR = 128;
    if (coils.length < 2) {
      state.coilSeq = (state.coilSeq || 0) + 1;
      state.deploys.push({
        kind: "coil_tower",
        x: p.x,
        y: p.y,
        hp: 70,
        maxHp: 70,
        cooldown: 0,
        fire: 1,
        dmg: u.def.dmg,
        range: fieldR,
        fieldR: fieldR,
        t: 9999,
        size: 13,
        seq: state.coilSeq,
        fed: false,
        battery: 0,
        zaps: []
      });
      state.floaters.push(G.createFloater(p.x, p.y - 16, "bobina", "#a8f6ff"));
    } else {
      var oldest = coils[0];
      for (var c = 1; c < coils.length; c++) {
        if ((coils[c].seq || 0) < (oldest.seq || 0)) oldest = coils[c];
      }
      oldest.x = p.x;
      oldest.y = p.y;
      oldest.seq = ++state.coilSeq;
      oldest.t = 9999;
      oldest.dmg = u.def.dmg;
      oldest.range = fieldR;
      oldest.fieldR = fieldR;
      oldest.zaps = [];
      state.floaters.push(G.createFloater(p.x, p.y - 16, "recoloca", "#a8f6ff"));
    }
    G.burst(state, p.x, p.y, "#a8f6ff", 14, 90);
    return true;
  }

  function desClick(state) {
    var u = lead(state, "designado");
    if (!u) return;
    var beat = 0.62;
    var phase = (state.desBeat % beat) / beat;
    var perfect = phase < 0.12 || phase > 0.88;
    bolt(state, u, mouseAng(state, u), {
      pierce: true,
      hitsLeft: perfect ? 5 : 1,
      wallBounce: perfect ? 3 : 0,
      bounceMul: 3,
      dmgMul: perfect ? 1.35 : 0.7,
      lifeDist: 700
    });
    u.cooldown = 0.12;
    if (perfect) state.floaters.push(G.createFloater(u.x, u.y - 18, "tempo", "#4ec8e8"));
    G.audio.shoot();
  }

  function detonateStickies(state) {
    for (var i = state.stickies.length - 1; i >= 0; i--) {
      var s = state.stickies[i];
      var e = null;
      for (var j = 0; j < state.enemies.length; j++) if (state.enemies[j].id === s.eid) e = state.enemies[j];
      var x = e ? e.x : s.x;
      var y = e ? e.y : s.y;
      C().explode(state, x, y, 46, s.dmg, "player");
    }
    state.stickies = [];
    G.audio.explosion();
  }

  function speedMul(state) {
    var mul = 1;
    if ((state.spearRamT || 0) <= 0) {
      if ((has(state, "fuzileiro") || has(state, "designado")) && state.pointer && state.pointer.fireHold) mul *= 0.7;
      if (has(state, "giratoria") && (state.girSpin || 0) > 1.2) mul *= 0.42;
    }
    if (onTrail(state)) mul *= 2;
    if ((state.honeyT || 0) > 0) mul *= 0.42;
    var onCrack = false;
    for (var i = 0; i < (state.zones || []).length; i++) {
      var z = state.zones[i];
      if (z.retiring) continue;
      if (z.kind === "beacon" && hypot(state.squad.x - z.x, state.squad.y - z.y) < z.r) mul *= 1.08;
      if (z.kind === "crack") {
        if (z.foeSlow) continue;
        var cr = z.r;
        if (isFinite(cr) && cr > 0 && hypot(state.squad.x - z.x, state.squad.y - z.y) < Math.min(cr, 260)) onCrack = true;
      }
    }
    if (onCrack) mul *= 0.55;
    if (state.tacticsAura && state.tacticsAura.speed) mul *= 1 + state.tacticsAura.speed;
    return mul;
  }

  function onTrail(state) {
    if (!trailLine(state) || !state.zones) return false;
    for (var i = 0; i < state.zones.length; i++) {
      var z = state.zones[i];
      if (z.kind === "trail" && hypot(state.squad.x - z.x, state.squad.y - z.y) < 18) return true;
    }
    return false;
  }

  function zoneAura(state) {
    var a = { shield: 0, fire: 0, dmg: 0, speed: 0 };
    for (var i = 0; i < (state.zones || []).length; i++) {
      var z = state.zones[i];
      if (z.retiring) continue;
      if (hypot(state.squad.x - z.x, state.squad.y - z.y) > (z.r || 0)) continue;
      if (z.kind === "anchor") a.shield = Math.max(a.shield, z.shield || 0.35);
      if (z.kind === "beacon") {
        a.fire = Math.max(a.fire, z.fire || 0.35);
        a.dmg = Math.max(a.dmg, z.dmg || 0.25);
      }
      if (z.kind === "standard") {
        a.fire = Math.max(a.fire, z.fire || 0.4);
        a.dmg = Math.max(a.dmg, z.dmg || 0.4);
        a.speed = Math.max(a.speed, z.speed || 0.4);
      }
    }
    state.tacticsAura = a;
  }

  function holdingLeap(u) {
    if (u && u.leap && (u.leap.slash || u.leap.hold)) return true;
    if (u && u.coloAct && u.coloAct.style === "slam") return true;
    if (u && u.warCombo && (u.warCombo.phase | 0) >= 2) return true;
    return false;
  }

  function blockHurt(state, unit, opts) {
    if (unit.team !== "player") return false;
    var cover = radioShieldAt(state, unit.x, unit.y);
    if (cover) {
      hitRadioShield(state, cover, unit.x, unit.y);
      return true;
    }
    if (state.phaseOn) return true;
    if ((state.ramT || 0) > 0) return true;
    if ((state.spearRamT || 0) > 0) return true;
    if (unit.leap && !unit.leap.noIframe) return true;
    if (unit.coloAct && unit.coloAct.style === "slam") return true;
    if (unit.warCombo) return true;
    if (unit.kind === "assassino" && (state.assassinHunt && state.assassinHunt.id === unit.id)) return true;
    return false;
  }

  function skipContact(state, enemy) {
    var sg = radioShieldAt(state, enemy.x, enemy.y);
    if (sg) {
      var sr = sg.range || 86;
      if (hypot(enemy.x - sg.x, enemy.y - sg.y) <= sr + (enemy.def.size || 10) + 8) return true;
    }
    if (bumperUp(state)) {
      var g = bumperGeom(state);
      if (g && hypot(enemy.x - g.x, enemy.y - g.y) >= g.r - 10) {
        bumperMeleeHit(state, enemy);
        return true;
      }
    }
    if (!has(state, "minitanque") && !has(state, "tanque")) return false;
    var mt = lead(state, "tanque") || lead(state, "minitanque");
    if (!mt) return false;
    if (mt.cooldown <= 0 && !(state.pointer && state.pointer.fireHold)) return false;
    var a = mouseAng(state, state.squad);
    var b = Math.atan2(enemy.y - state.squad.y, enemy.x - state.squad.x);
    var ad = Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
    return ad < 0.85;
  }

  function fearImmuneKind(e) {
    return !e || e.def.boss || e.def.kind === "nest" || e.def.kind === "orbit_shield";
  }

  function applyFear(state, e, dur) {
    if (fearImmuneKind(e) || e.hp <= 0) return false;
    var away = Math.atan2(e.y - state.squad.y, e.x - state.squad.x);
    if (!away && e.x === state.squad.x && e.y === state.squad.y) away = Math.random() * Math.PI * 2;
    e.confuseT = Math.max(e.confuseT || 0, dur);
    e.confuseAng = away + (Math.random() - 0.5) * 0.9;
    e.allyHitCd = 0;
    return true;
  }

  function tryShotFear(state, e) {
    if (!e || e.hp <= 0 || e.team === "player") return;
    if ((e.fearImmuneT || 0) > 0) return;
    if (e.fearUsed) {
      e.fearImmuneT = 60;
      return;
    }
    if (applyFear(state, e, 0.5)) e.fearUsed = true;
  }

  function shooterEnemy(e) {
    return !!(e && e.def && (e.def.fire || 0) > 0);
  }

  function applySilence(state, e) {
    if (!shooterEnemy(e) || e.hp <= 0) return;
    if (e.def.boss) {
      if ((e.silenceImmuneT || 0) > 0) return;
      e.silenceHits = (e.silenceHits || 0) + 1;
      e.silenceT = Math.max(e.silenceT || 0, 3);
      if (e.silenceHits >= 5) {
        e.silenceImmuneT = 60;
        e.silenceHits = 0;
        state.floaters.push(G.createFloater(e.x, e.y - 22, "imune", "#c8a0ff"));
      }
    } else {
      e.silenceT = Math.max(e.silenceT || 0, 3);
    }
  }

  function squadOverlap(state, e) {
    var er = e.def.size || 10;
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || u.stowed) continue;
      if (hypot(u.x - e.x, u.y - e.y) < (u.def.size || 12) + er + 4) return true;
    }
    if (state.dashActive && state.dashStep) {
      var x1 = state.squad.x;
      var y1 = state.squad.y;
      var x0 = x1 - state.dashStep.x;
      var y0 = y1 - state.dashStep.y;
      if (distToSeg(e.x, e.y, x0, y0, x1, y1) < 34 + er) return true;
    }
    return hypot(state.squad.x - e.x, state.squad.y - e.y) < 30 + er;
  }

  function tickSquadContact(state, dt) {
    var dashing = !!state.dashActive && (has(state, "batedor") || has(state, "ponta_lanca"));
    var ramming = (state.spearRamT || 0) > 0;
    var haunting = (state.hauntT || 0) > 0;
    if (!dashing) state.dashHit = null;
    if (!dashing && !haunting && !ramming) return;
    if (dashing && !state.dashHit) state.dashHit = {};
    var bat = lead(state, "ponta_lanca") || lead(state, "batedor");
    var dmg = bat ? Math.round(bat.def.dmg * C().dmgMul(state) * 1.2) : 12;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0) continue;
      if (!squadOverlap(state, e)) continue;
      if (dashing && !state.dashHit[e.id]) {
        state.dashHit[e.id] = 1;
        C().hurt(state, e, dmg, state.squad.x, state.squad.y, true);
      } else if (ramming && !dashing) {
        e.spearHitCd = (e.spearHitCd || 0) - dt;
        if (e.spearHitCd <= 0) {
          e.spearHitCd = 0.28;
          C().hurt(state, e, dmg, state.squad.x, state.squad.y, true);
        }
      }
      if (haunting && !e.hauntTagged) {
        e.hauntTagged = true;
        applyFear(state, e, 2.5);
      }
    }
  }

  var COLO_SLASH_N = 5;
  var COLO_SLASH_T = 3.84;

  function coloEnergySlash(state, u, ang) {
    if (!u) return;
    var c = Math.cos(ang);
    var s = Math.sin(ang);
    var len = 3200;
    var x0 = u.x + c * 36;
    var y0 = u.y + s * 36;
    var x1 = u.x + c * len;
    var y1 = u.y + s * len;
    var halfW = 118;
    var dmg = Math.round(u.def.dmg * C().dmgMul(state) * 1.25);
    state.vfx = state.vfx || [];
    state.vfx.push({
      coloSlash: true,
      live: true,
      x0: x0,
      y0: y0,
      x1: x1,
      y1: y1,
      ang: ang,
      t: COLO_SLASH_T,
      max: COLO_SLASH_T,
      seed: (u.id || 1) + (state.time || 0),
      w: halfW,
      dmg: dmg,
      ox: u.x,
      oy: u.y,
      hitIds: {},
      _fly: 0
    });
    G.burst(state, x0 + c * 40, y0 + s * 40, "#7af7ff", 14, 120);
    G.burst(state, x0 + c * 40, y0 + s * 40, "#e8ffff", 8, 70);
    if (G.audio && G.audio.shoot) G.audio.shoot();
  }

  function tickColoSlashDamage(state) {
    if (!state.vfx) return;
    for (var i = 0; i < state.vfx.length; i++) {
      var fx = state.vfx[i];
      if (!fx.coloSlash || !fx.live) continue;
      var k = Math.max(0, fx.t / (fx.max || COLO_SLASH_T));
      var age = 1 - k;
      var fly = Math.min(1, age * 1.55);
      var prev = fx._fly || 0;
      if (fly <= prev + 0.0001 && fly >= 1) {
        fx.live = false;
        continue;
      }
      var x0 = fx.x0;
      var y0 = fx.y0;
      var dx = fx.x1 - x0;
      var dy = fx.y1 - y0;
      var px = x0 + dx * prev;
      var py = y0 + dy * prev;
      var cx = x0 + dx * fly;
      var cy = y0 + dy * fly;
      var hitR = fx.w || 118;
      eatShotsOnLine(state, px, py, cx, cy, hitR);
      if (!fx.hitIds) fx.hitIds = {};
      for (var ei = 0; ei < state.enemies.length; ei++) {
        var e = state.enemies[ei];
        if (e.hp <= 0 || e.scenery || fx.hitIds[e.id]) continue;
        if (distToSeg(e.x, e.y, px, py, cx, cy) > hitR + (e.def.size || 10)) continue;
        fx.hitIds[e.id] = 1;
        C().hurt(state, e, fx.dmg || 0, fx.ox || x0, fx.oy || y0, true);
      }
      fx._fly = fly;
      if (fly >= 1) fx.live = false;
    }
  }

  function endColoBlade(state, msg) {
    if ((state.coloOverT || 0) <= 0 && !(state.coloSlashLeft > 0)) return;
    state.coloOverT = 0;
    state.coloSlashLeft = 0;
    for (var i = 0; i < state.units.length; i++) state.units[i].coloGlow = false;
    if (msg) state.floaters.push(G.createFloater(state.squad.x, state.squad.y - 22, msg, "#7af7ff"));
  }

  function coloAimAng(state, u) {
    var p = aim(state);
    var dx = p.x - u.x;
    var dy = p.y - u.y;
    if (dx * dx + dy * dy < 16) {
      var near = C().nearest(state.enemies, u.x, u.y);
      if (near) return Math.atan2(near.y - u.y, near.x - u.x);
      return u.rot || 0;
    }
    return Math.atan2(dy, dx);
  }

  function coloStrike(state, u, style, ang) {
    var dmg = Math.round(u.def.dmg * C().dmgMul(state));
    var x = u.x;
    var y = u.y;
    var i;
    var e;
    state.vfx = state.vfx || [];
    if (style === "slam") {
      var slamR = u.def.aoe || 250;
      for (i = 0; i < state.enemies.length; i++) {
        e = state.enemies[i];
        if (e.hp <= 0 || e.scenery) continue;
        if (hypot(e.x - x, e.y - y) > slamR + (e.def.size || 10)) continue;
        C().hurt(state, e, dmg, x, y, true);
        e.slowT = Math.max(e.slowT || 0, 1.6);
      }
      zone(state, { kind: "crack", x: x, y: y, r: slamR, t: 3.6, max: 3.6, seed: (u.id || 1) * 0.41 + (state.time || 0), foeSlow: true, tech: true });
      state.vfx.push({ coloSlam: true, x: x, y: y, r: slamR, t: 0.9, max: 0.9, seed: (u.id || 1) * 1.7 + (state.time || 0) });
      G.burst(state, x, y, "#7af7ff", 22, 160);
      G.burst(state, x, y, "#3a8aff", 14, 110);
      G.burst(state, x, y, "#e8f6ff", 10, 70);
      if (G.audio && G.audio.explosion) G.audio.explosion();
      else if (G.audio && G.audio.thud) G.audio.thud();
    } else if (style === "bash") {
      var bashR = 150;
      var bx = x + Math.cos(ang) * 62;
      var by = y + Math.sin(ang) * 62;
      for (i = 0; i < state.enemies.length; i++) {
        e = state.enemies[i];
        if (e.hp <= 0 || e.scenery) continue;
        if (hypot(e.x - bx, e.y - by) > bashR + (e.def.size || 10)) continue;
        C().hurt(state, e, Math.round(dmg * 1.15), x, y, true);
        knockEnemy(state, e, x, y, 72);
      }
      state.vfx.push({ coloBash: true, x: bx, y: by, ox: x, oy: y, r: bashR, t: 0.78, max: 0.78, ang: ang, seed: (u.id || 1) });
      G.burst(state, bx, by, "#3a8aff", 18, 140);
      G.burst(state, bx, by, "#9ad4ff", 12, 90);
      if (G.audio && G.audio.thud) G.audio.thud();
      else if (G.audio && G.audio.hit) G.audio.hit();
    } else {
      var fist = bolt(state, u, ang, {
        kind: "colo_fist",
        r: 16,
        speed: 680,
        pierce: true,
        hitsLeft: 12,
        dmgMul: 1.4,
        color: "#e8f6ff",
        lifeDist: 2800,
        eraseShots: true,
        homing: false,
        enemyBounce: 10,
        bounceRange: 620,
        bounceMul: 1,
        wallBounce: 10,
        ox: Math.cos(ang) * 38,
        oy: Math.sin(ang) * 38
      });
      if (fist) {
        fist.fistAng = ang;
        fist.ricochet = false;
        fist.homeId = 0;
        fist.homing = false;
        fist.coloRico = 10;
      }
      u.coloFistT = 1.12;
      state.vfx.push({
        coloPunch: true,
        x0: x,
        y0: y,
        x1: x + Math.cos(ang) * 52,
        y1: y + Math.sin(ang) * 52,
        t: 0.18,
        max: 0.18
      });
      G.burst(state, x + Math.cos(ang) * 32, y + Math.sin(ang) * 32, "#7af7ff", 12, 110);
      if (G.audio && G.audio.shoot) G.audio.shoot();
    }
  }

  function tickColosso(state, dt) {
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || u.kind !== "colosso") continue;
      u.coloGlow = (state.coloOverT || 0) > 0;
      if (u.leap && u.leap.colo) {
        u.leap = null;
      }
      if (u.held || u.stowed) {
        u.coloAct = null;
        continue;
      }
      var fistOut = false;
      for (var fi = 0; fi < (state.projectiles || []).length; fi++) {
        if (state.projectiles[fi].kind === "colo_fist" && state.projectiles[fi].fromId === u.id) {
          fistOut = true;
          break;
        }
      }
      u.coloFistT = fistOut ? 1 : 0;
      if (u.coloSlashK > 0) u.coloSlashK = Math.max(0, u.coloSlashK - dt * 5);
      if ((state.coloOverT || 0) > 0) {
        u.coloAct = null;
        u.coloSquash = 0;
        u.coloBashK = 0;
        u.coloPunchK = 0;
        u.leapZ = 0;
        var bang = coloAimAng(state, u);
        u.rot = bang;
        if ((state.coloSlashLeft || 0) <= 0) {
          endColoBlade(state, "lâmina off");
          continue;
        }
        u.coloSlashCd = (u.coloSlashCd || 0) - dt;
        if (state.pointer && state.pointer.fireHold && u.coloSlashCd <= 0) {
          var bRate = C().fireMul(state);
          if (u.veilFogT > 0) bRate *= 0.55;
          u.coloSlashCd = 1 / (Math.max(0.2, bRate) * 2.8);
          coloEnergySlash(state, u, bang);
          u.coloSlashK = 1;
          state.coloSlashLeft = Math.max(0, (state.coloSlashLeft || 0) - 1);
          if ((state.coloSlashLeft || 0) <= 0) endColoBlade(state, "lâmina off");
        }
        continue;
      }
      var A = u.coloAct;
      if (A) {
        A.t += dt;
        var k = Math.min(1, A.t / Math.max(0.04, A.dur));
        u.rot = A.ang;
        if (A.style === "slam") {
          if (A.phase === "dash") {
            u.x = A.x0 + (A.tx - A.x0) * k;
            u.y = A.y0 + (A.ty - A.y0) * k;
            u.leapZ = 4 * k * (1 - k) * 92;
            u.coloSquash = 0.06 * (1 - k);
            if (A.t >= A.dur) {
              u.x = A.tx;
              u.y = A.ty;
              A.phase = "fall";
              A.t = 0;
              A.dur = 0.11;
            }
          } else if (A.phase === "fall") {
            u.x = A.tx;
            u.y = A.ty;
            u.leapZ = 36 * (1 - k);
            u.coloSquash = k * 0.22;
            if (A.t >= A.dur) {
              u.leapZ = 0;
              coloStrike(state, u, "slam", A.ang);
              A.phase = "hold";
              A.t = 0;
              A.dur = 0.22;
            }
          } else {
            u.x = A.tx;
            u.y = A.ty;
            u.leapZ = 0;
            u.coloSquash = 0.22 * (1 - k);
            if (A.t >= A.dur) {
              u.coloAct = null;
              u.coloSquash = 0;
            }
          }
        } else if (A.style === "bash") {
          if (A.phase === "wind") {
            u.coloBashK = k;
            if (A.t >= A.dur) {
              coloStrike(state, u, "bash", A.ang);
              A.phase = "hold";
              A.t = 0;
              A.dur = 0.28;
              u.coloBashK = 1;
            }
          } else {
            u.coloBashK = 1 - k;
            if (A.t >= A.dur) {
              u.coloAct = null;
              u.coloBashK = 0;
            }
          }
        } else {
          if (A.phase === "wind") {
            A.ang = coloAimAng(state, u);
            u.rot = A.ang;
            u.coloPunchK = k;
            if (A.t >= A.dur) {
              coloStrike(state, u, "punch", A.ang);
              A.phase = "hold";
              A.t = 0;
              A.dur = 0.2;
              u.coloPunchK = 1;
            }
          } else {
            u.coloPunchK = 1 - k * 0.4;
            if (A.t >= A.dur) {
              u.coloAct = null;
              u.coloPunchK = 0;
            }
          }
        }
        continue;
      }
      u.coloSquash = 0;
      u.coloBashK = 0;
      u.coloPunchK = 0;
      u.leapZ = 0;
      if (!(state.pointer && state.pointer.fireHold)) continue;
      if (u.cooldown > 0) continue;
      var rate = C().fireMul(state);
      if (u.veilFogT > 0) rate *= 0.55;
      u.cooldown = 1 / (u.def.fire * Math.max(0.2, rate));
      var styles = ["slam", "bash", "punch"];
      u.coloSeq = (u.coloSeq || 0) % 3;
      var style = styles[u.coloSeq];
      u.coloSeq += 1;
      var ang = coloAimAng(state, u);
      if (style === "slam") {
        var near = C().nearest(state.enemies, u.x, u.y);
        var land = { x: u.x, y: u.y };
        if (near) {
          ang = Math.atan2(near.y - u.y, near.x - u.x);
          land.x = near.x;
          land.y = near.y;
        }
        clampField(state, land);
        var leapD = hypot(land.x - u.x, land.y - u.y);
        u.coloAct = {
          style: "slam",
          phase: "dash",
          t: 0,
          dur: Math.max(0.16, Math.min(0.38, leapD / 720)),
          ang: ang,
          x0: u.x,
          y0: u.y,
          tx: land.x,
          ty: land.y
        };
      } else if (style === "bash") {
        u.coloAct = { style: "bash", phase: "wind", t: 0, dur: 0.14, ang: ang };
      } else {
        u.coloAct = { style: "punch", phase: "wind", t: 0, dur: 0.16, ang: ang };
      }
    }
  }

  function tickSpearLeap(state, dt) {
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || u.held || u.stowed) continue;
      if (u.kind !== "ponta_lanca" && u.kind !== "ceifador" && u.kind !== "bandeira" && u.kind !== "phalanx") continue;
      if (u.leap) {
        var L = u.leap;
        L.t += dt;
        if (L.phase === "out") {
          var k = Math.min(1, L.t / L.dur);
          u.x = L.x0 + (L.tx - L.x0) * k;
          u.y = L.y0 + (L.ty - L.y0) * k;
          u.leapZ = 4 * k * (1 - k) * (L.slash ? 28 : 52);
          if (L.slash) u.scytheSpin = (u.scytheSpin || 0) + dt * (10 + k * 28);
          if (L.pierce) {
            if (!L.hit) L.hit = {};
            for (var pi = 0; pi < state.enemies.length; pi++) {
              var pe = state.enemies[pi];
              if (pe.hp <= 0 || L.hit[pe.id]) continue;
              if (hypot(pe.x - u.x, pe.y - u.y) > (pe.def.size || 10) + (u.def.size || 12) + 10) continue;
              L.hit[pe.id] = 1;
              C().hurt(state, pe, Math.round(u.def.dmg * C().dmgMul(state) * 1.15), u.x, u.y, true);
            }
          }
          if (k >= 1) {
            if (L.phalanxWall) {
              u.x = L.tx;
              u.y = L.ty;
              plantPhalanxRing(state, u, u.x, u.y);
              L.phase = "back";
              L.t = 0;
              L.dur = 0.24;
              L.x0 = u.x;
              L.y0 = u.y;
              continue;
            }
            if (L.slash) {
              L.phase = "spin";
              L.t = 0;
              L.dur = 0.48;
              u.x = L.tx;
              u.y = L.ty;
              u.leapZ = 10;
              continue;
            }
            var tgt = null;
            for (var ei = 0; ei < state.enemies.length; ei++) {
              if (state.enemies[ei].id === L.eid) tgt = state.enemies[ei];
            }
            if (tgt && tgt.hp > 0) {
              if (L.reapBasic) {
                scytheSlash(state, u, u.x, u.y, u.def.aoe || 60, 1, null, { ring: true, epic: false });
              } else {
                var dmg = Math.round(u.def.dmg * C().dmgMul(state) * 1.7 * speedDmgMul(state, u.kind));
                C().hurt(state, tgt, dmg, u.x, u.y, true);
                G.burst(state, tgt.x, tgt.y, u.def.color || "#ff9a3a", 12, 110);
                if (u.kind === "phalanx") phalanxBeam(state, u, tgt.x, tgt.y, Math.atan2(L.ty - L.y0, L.tx - L.x0));
                if (u.kind === "bandeira") grantBannerBuff(state, u);
              }
            } else if (L.reapBasic) {
              scytheSlash(state, u, u.x, u.y, u.def.aoe || 60, 1, null, { ring: true, epic: false });
            } else if (u.kind === "phalanx") {
              phalanxBeam(state, u, u.x, u.y, Math.atan2(L.ty - L.y0, L.tx - L.x0));
            }
            L.phase = "back";
            L.t = 0;
            L.dur = 0.22;
            L.x0 = u.x;
            L.y0 = u.y;
          }
        } else if (L.phase === "hang") {
          u.x = L.tx;
          u.y = L.ty;
          u.leapZ = Math.max(2, 8 - L.t * 28);
          u.rot = L.ang || u.rot;
          if (L.t >= L.dur) {
            L.phase = "back";
            L.t = 0;
            L.dur = 0.26;
            L.x0 = u.x;
            L.y0 = u.y;
          }
        } else if (L.phase === "punch") {
          u.x = L.tx;
          u.y = L.ty;
          u.leapZ = 8;
          u.rot = L.ang || u.rot;
          if (L.t >= L.dur) {
            L.phase = "back";
            L.t = 0;
            L.dur = 0.22;
            L.x0 = u.x;
            L.y0 = u.y;
          }
        } else if (L.phase === "spin") {
          u.x = L.tx;
          u.y = L.ty;
          u.leapZ = 10 + Math.sin(L.t * 28) * 2;
          var sk = Math.min(1, L.t / L.dur);
          u.scytheSpin = (u.scytheSpin || 0) + dt * (18 + sk * 36);
          if (L.t >= L.dur) {
            scytheSlash(state, u, u.x, u.y, L.slashR || 400, 1, null, {
              sweep: true,
              pull: true,
              extra: 10,
              startAng: u.scytheSpin || 0
            });
            L.phase = "rip";
            L.t = 0;
            L.dur = 1.28;
            L.startAng = u.scytheSpin || 0;
          }
        } else if (L.phase === "rip") {
          u.x = L.tx;
          u.y = L.ty;
          u.leapZ = 8;
          u.scytheSpin = (L.startAng || 0) + Math.min(1, L.t / L.dur) * Math.PI * 2;
          if (L.t >= L.dur) {
            u.leap = null;
            u.leapZ = 0;
            u.leapCd = 0.5;
          }
        } else {
          var hx = state.squad.x - u.x;
          var hy = state.squad.y - u.y;
          var hl = hypot(hx, hy);
          var backSpd = 620;
          if (hl < 16 || L.t >= L.dur) {
            u.leap = null;
            u.leapZ = 0;
            u.leapCd = L.reapBasic ? 0 : 0.8;
          } else {
            u.x += (hx / hl) * backSpd * dt;
            u.y += (hy / hl) * backSpd * dt;
            u.leapZ = Math.max(0, 18 - L.t * 80);
          }
        }
        continue;
      }
      u.leapZ = 0;
      u.leapCd = (u.leapCd || 0) - dt;
      if (u.leapCd > 0) continue;
      if (u.kind === "ceifador") {
        if (!(state.pointer && state.pointer.fireHold)) continue;
        if ((u.cooldown || 0) > 0) continue;
        var reapNear = C().nearest(state.enemies, u.x, u.y);
        if (!reapNear || hypot(reapNear.x - u.x, reapNear.y - u.y) > (u.def.range || 200) + (reapNear.def.size || 10)) continue;
        var rate = C().fireMul(state);
        if (u.veilFogT > 0) rate *= 0.55;
        u.cooldown = 1 / (u.def.fire * Math.max(0.2, rate));
        u.leap = {
          phase: "out",
          t: 0,
          dur: 0.2,
          x0: u.x,
          y0: u.y,
          tx: reapNear.x,
          ty: reapNear.y,
          eid: reapNear.id,
          reapBasic: true
        };
        continue;
      }
      var near = C().nearest(state.enemies, u.x, u.y);
      var leapR = u.kind === "bandeira" ? 160 : u.kind === "phalanx" ? 180 : 170;
      if (!near || hypot(near.x - u.x, near.y - u.y) > leapR + (near.def.size || 10)) continue;
      u.leap = {
        phase: "out",
        t: 0,
        dur: u.kind === "phalanx" ? 0.32 : 0.26,
        x0: u.x,
        y0: u.y,
        tx: near.x,
        ty: near.y,
        eid: near.id
      };
    }
  }

  function scytheSlash(state, u, x, y, r, mul, ang, opt) {
    opt = opt || {};
    var dmg = Math.round(u.def.dmg * C().dmgMul(state) * (mul || 1.2) * speedDmgMul(state, u.kind)) + (opt.extra || 0);
    var epic = opt.epic != null ? !!opt.epic : r >= 180;
    var pull = !!opt.pull;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0 || e.scenery) continue;
      var dist = hypot(e.x - x, e.y - y);
      if (dist > r + (e.def.size || 10)) continue;
      if (pull && dist > 4) {
        var nx = (x - e.x) / dist;
        var ny = (y - e.y) / dist;
        e.x += nx * Math.min(36, dist * 0.22);
        e.y += ny * Math.min(36, dist * 0.22);
      }
      C().hurt(state, e, dmg, x, y, true);
    }
    state.vfx = state.vfx || [];
    if (opt.sweep) {
      state.vfx.push({
        slash: true,
        sweep: true,
        x: x,
        y: y,
        r: r,
        startAng: opt.startAng || 0,
        t: 1.28,
        max: 1.28,
        color: "#c41e3a"
      });
    } else {
      state.vfx.push({
        slash: true,
        ring: true,
        epic: epic,
        x: x,
        y: y,
        r: r,
        t: epic ? 0.72 : 0.28,
        max: epic ? 0.72 : 0.28,
        color: "#c41e3a"
      });
    }
    G.burst(state, x, y, "#c41e3a", opt.sweep || epic ? 36 : 6, opt.sweep || epic ? 260 : Math.max(28, r * 1.6));
    if (opt.sweep || epic) G.burst(state, x, y, "#ffe4ea", 18, 180);
  }

  function drawScytheRing(ctx, fx) {
    var progress = 1 - Math.max(0, fx.t) / (fx.max || 0.28);
    var grow = 1 - Math.pow(1 - progress, 2.35);
    var fade = progress < 0.58 ? 1 : Math.max(0, 1 - (progress - 0.58) / 0.42);
    var epic = !!fx.epic;
    var r = (fx.r || 8) * (epic ? 0.06 + grow * 0.98 : 0.45 + grow * 0.55);
    var thick = epic ? Math.max(12, r * 0.085) : Math.max(2.2, r * 0.28);
    var col = fx.color || "#c41e3a";
    var spin = progress * (epic ? 4.8 : 6.2);

    function ring(outerR, innerR) {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2, outerR), 0, Math.PI * 2);
      ctx.arc(0, 0, Math.max(1, innerR), 0, Math.PI * 2, true);
      ctx.closePath();
    }

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.globalCompositeOperation = "lighter";

    if (epic && progress < 0.22) {
      ctx.globalAlpha = (1 - progress / 0.22) * 0.42;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }

    if (epic) {
      ctx.globalAlpha = fade * 0.16;
      ctx.fillStyle = "#8e1230";
      ring(r * 0.78, r * 0.78 - thick * 0.7);
      ctx.fill();
      ctx.globalAlpha = fade * 0.1;
      ring(r * 0.58, r * 0.58 - thick * 0.55);
      ctx.fill();
    }

    ctx.globalAlpha = fade * (epic ? 0.38 : 0.32);
    ctx.fillStyle = col;
    ring(r + thick * 0.45, r - thick * 1.15);
    ctx.fill();

    ctx.globalAlpha = fade * 0.9;
    ctx.fillStyle = col;
    ring(r, r - thick);
    ctx.fill();

    ctx.globalAlpha = fade;
    ctx.fillStyle = "#ff4d6d";
    ring(r * 0.98, r - thick * 0.45);
    ctx.fill();

    ctx.globalAlpha = fade * 0.95;
    ctx.strokeStyle = "#ffe4ea";
    ctx.lineWidth = epic ? 3.2 : 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.97, 0, Math.PI * 2);
    ctx.stroke();

    if (epic) {
      ctx.globalAlpha = fade * 0.7;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, r - thick * 0.35, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = "#ffe4ea";
    ctx.lineWidth = epic ? 3.4 : 2.4;
    ctx.lineCap = "round";
    var blades = epic ? 4 : 2;
    for (var i = 0; i < blades; i++) {
      var a0 = spin + i * ((Math.PI * 2) / blades);
      ctx.globalAlpha = fade * (epic ? 0.85 : 0.7);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.96, a0, a0 + (epic ? 0.85 : 1.15));
      ctx.stroke();
    }

    if (epic) {
      ctx.strokeStyle = "#ffb0bc";
      ctx.lineWidth = 1.6;
      for (var s = 0; s < 12; s++) {
        var a = spin * 0.35 + s * (Math.PI * 2 / 12);
        ctx.globalAlpha = fade * 0.45;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (r - 6), Math.sin(a) * (r - 6));
        ctx.lineTo(Math.cos(a) * (r + 16), Math.sin(a) * (r + 16));
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function drawGiantScythe(ctx, x, y, ang, reach, alpha) {
    if (alpha <= 0.02 || reach < 8) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(42,16,24,0.95)";
    ctx.lineWidth = Math.max(4, reach * 0.018);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(reach * 0.7, 0);
    ctx.stroke();
    ctx.strokeStyle = "#c41e3a";
    ctx.lineWidth = Math.max(2.2, reach * 0.01);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(reach * 0.68, 0);
    ctx.stroke();
    ctx.translate(reach * 0.7, 0);
    ctx.shadowColor = "rgba(196,30,58,0.95)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#c41e3a";
    ctx.beginPath();
    ctx.moveTo(0, -reach * 0.07);
    ctx.quadraticCurveTo(reach * 0.36, reach * 0.04, 4, reach * 0.52);
    ctx.quadraticCurveTo(reach * 0.16, reach * 0.16, 2, reach * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffe4ea";
    ctx.lineWidth = Math.max(1.8, reach * 0.008);
    ctx.beginPath();
    ctx.moveTo(6, -reach * 0.05);
    ctx.quadraticCurveTo(reach * 0.3, reach * 0.06, 8, reach * 0.46);
    ctx.stroke();
    ctx.restore();
  }

  function drawReapSweep(ctx, fx) {
    var progress = 1 - Math.max(0, fx.t) / (fx.max || 1.28);
    var ease = Math.pow(progress, 1.12);
    var fade = progress < 0.86 ? 1 : Math.max(0, 1 - (progress - 0.86) / 0.14);
    var r = fx.r || 400;
    var start = fx.startAng || 0;
    var ang = start + ease * Math.PI * 2;
    var thick = Math.max(14, r * 0.08);
    var col = fx.color || "#c41e3a";

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = fade * 0.22;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, 0, r, start, ang, false);
    ctx.arc(0, 0, Math.max(2, r - thick * 1.35), ang, start, true);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = fade * 0.72;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, 0, r, start, ang, false);
    ctx.arc(0, 0, Math.max(2, r - thick), ang, start, true);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = fade;
    ctx.fillStyle = "#ff4d6d";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.99, start, ang, false);
    ctx.arc(0, 0, Math.max(2, r - thick * 0.42), ang, start, true);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = fade * 0.9;
    ctx.strokeStyle = "#ffe4ea";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.97, start, ang, false);
    ctx.stroke();
    ctx.restore();

    for (var g = 4; g >= 1; g--) {
      drawGiantScythe(ctx, fx.x, fx.y, ang - g * 0.16, r * (0.94 - g * 0.03), fade * (0.28 / g));
    }
    drawGiantScythe(ctx, fx.x, fx.y, ang, r, fade);
  }

  function drawReaperCast(ctx, u) {
    var L = u.leap;
    if (!L || !L.slash) return;
    var r = L.slashR || 400;
    if (L.phase === "spin") {
      var k = Math.min(1, L.t / Math.max(0.05, L.dur));
      ctx.save();
      ctx.strokeStyle = "rgba(196,30,58," + (0.2 + k * 0.45) + ")";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(u.x, u.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.12 + k * 0.18;
      ctx.fillStyle = "#c41e3a";
      ctx.beginPath();
      ctx.arc(u.x, u.y, 18 + k * 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      var appear = Math.max(0, (k - 0.28) / 0.72);
      appear = appear * appear;
      if (appear > 0.02) {
        drawGiantScythe(ctx, u.x, u.y, u.scytheSpin || 0, r * (0.22 + appear * 0.78), appear);
      }
    }
  }

  var BANNER_BUFFS = [
    { id: "bravura", name: "Bravura", icon: "⚔", col: "#ff9a3a", desc: "+40% de dano por 6s.", apply: function (s) { s.run.tempDmg = Math.max(s.run.tempDmg || 1, 1.4); s.run.tempT = Math.max(s.run.tempT || 0, 6); } },
    { id: "marcha", name: "Marcha", icon: "⇢", col: "#ffe08a", desc: "+40% de velocidade por 6s.", apply: function (s) { s.run.tempSpeed = Math.max(s.run.tempSpeed || 1, 1.4); s.run.tempT = Math.max(s.run.tempT || 0, 6); } },
    { id: "rajada", name: "Rajada", icon: "⌁", col: "#ffb070", desc: "+50% de cadência por 6s.", apply: function (s) { s.run.activeFire = 0.5; s.run.activeFireT = 6; } },
    { id: "couraca", name: "Couraça", icon: "🛡", col: "#9ad4ff", desc: "35% de redução de dano por 6s.", apply: function (s) { s.run.tempShield = 0.35; s.run.tempT = Math.max(s.run.tempT || 0, 6); } },
    { id: "vital", name: "Vital", icon: "✚", col: "#7cffb0", desc: "Cura 12% da vida máxima do esquadrão.", apply: function (s) { healSquad(s, 0); for (var i = 0; i < s.units.length; i++) { var u = s.units[i]; if (u.hp > 0) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.12); } } },
    { id: "ima", name: "Ímã", icon: "◎", col: "#e8d080", desc: "Puxa loot de mais longe por 6s.", apply: function (s) { s.run.magnet = (s.run.magnet || 0) + 80; s.bannerMagnetT = 6; } },
    { id: "gelo", name: "Gelo", icon: "❄", col: "#7ad8ff", desc: "Os tiros congelam inimigos por 6s.", apply: function (s) { s.run.freeze = true; s.bannerFreezeT = 6; } },
    { id: "chamas", name: "Chamas", icon: "🔥", col: "#ff7a2a", desc: "O esquadrão deixa fogo no chão por 5s.", apply: function (s) { s.bannerFireT = 5; } },
    { id: "fortuna", name: "Fortuna", icon: "$", col: "#ffd24a", desc: "+50% de ouro coletado por 8s.", apply: function (s) { s.run.gold = (s.run.gold || 0) + 0.5; s.bannerGoldT = 8; } },
    { id: "impacto", name: "Impacto", icon: "💥", col: "#ff8a4a", desc: "Os tiros empurram inimigos por 6s.", apply: function (s) { s.run.knockback = true; s.bannerKnockT = 6; } }
  ];

  function grantBannerBuff(state, u) {
    var b = BANNER_BUFFS[(Math.random() * BANNER_BUFFS.length) | 0];
    b.apply(state);
    state.floaters.push(G.createFloater(u.x, u.y - 22, b.name, b.col));
    G.burst(state, u.x, u.y, b.col, 14, 90);
  }

  function spearDash(state, u) {
    var p = aim(state);
    u.leap = {
      phase: "out",
      t: 0,
      dur: 0.42,
      x0: u.x,
      y0: u.y,
      tx: p.x,
      ty: p.y,
      pierce: true,
      hold: true,
      hit: {}
    };
    u.leapZ = 0;
    G.burst(state, u.x, u.y, "#ff9a3a", 16, 140);
    return true;
  }

  function reapCharge(state, u) {
    var p = aim(state);
    u.leap = {
      phase: "out",
      t: 0,
      dur: 0.34,
      x0: u.x,
      y0: u.y,
      tx: p.x,
      ty: p.y,
      slash: true,
      slashR: 400,
      pierce: true,
      hit: {}
    };
    G.burst(state, u.x, u.y, "#c41e3a", 18, 160);
    return true;
  }

  function holdPhalanxActive(state) {
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || !u.def.active || u.def.active.id !== "phalanx_wall") continue;
      u.activeCd = 0;
      u.activeHeld = true;
    }
  }

  function releasePhalanxActive(state) {
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (!u.def.active || u.def.active.id !== "phalanx_wall") continue;
      u.activeHeld = false;
      u.activeCd = u.def.active.cd || 20;
    }
  }

  function syncPhalanxHold(state) {
    var keep = false;
    for (var i = 0; i < (state.zones || []).length; i++) {
      if (state.zones[i].kind === "phalanx") keep = true;
    }
    for (var j = 0; j < state.units.length; j++) {
      if (state.units[j].leap && state.units[j].leap.phalanxWall) keep = true;
    }
    if (keep) return;
    for (var k = 0; k < state.units.length; k++) {
      var u = state.units[k];
      if (!u.def.active || u.def.active.id !== "phalanx_wall" || !u.activeHeld) continue;
      u.activeHeld = false;
      u.activeCd = u.def.active.cd || 20;
    }
  }

  function warlordHaste(u) {
    return 1 + 0.1 * Math.min(10, u.warStacks || 0);
  }

  function ensureWarBand(u) {
    if (u.warBand && u.warBand.length === 2) return u.warBand;
    u.warBand = [
      { x: u.x, y: u.y, ox: -18, oy: 14, size: 9, id: -710, leapZ: 0, rot: 0 },
      { x: u.x, y: u.y, ox: 18, oy: 14, size: 9, id: -711, leapZ: 0, rot: 0 }
    ];
    return u.warBand;
  }

  function tickWarFrenzy(u, dt) {
    if ((u.warFrenzyT || 0) <= 0) {
      if (u.warStacks) u.warStacks = 0;
      return;
    }
    u.warFrenzyT -= dt;
    if (u.warFrenzyT <= 0) {
      u.warFrenzyT = 0;
      u.warStacks = 0;
    }
  }

  function warSlashLine(state, u, x, y, ang, len, mul, col) {
    var c = Math.cos(ang);
    var s = Math.sin(ang);
    var x0 = x - c * len * 0.18;
    var y0 = y - s * len * 0.18;
    var x1 = x + c * len;
    var y1 = y + s * len;
    var dmg = Math.round(u.def.dmg * C().dmgMul(state) * (mul || 1));
    state.vfx = state.vfx || [];
    state.vfx.push({
      warSlash: true,
      x0: x0,
      y0: y0,
      x1: x1,
      y1: y1,
      x: x,
      y: y,
      ang: ang,
      t: 0.2,
      max: 0.2,
      color: col || "#c41e3a"
    });
    G.burst(state, (x0 + x1) / 2, (y0 + y1) / 2, col || "#c41e3a", 10, 80);
    G.burst(state, x1, y1, "#7a3a22", 6, 50);
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0) continue;
      if (distToSeg(e.x, e.y, x0, y0, x1, y1) > 12 + (e.def.size || 10) * 0.28) continue;
      C().hurt(state, e, dmg, x, y, true);
    }
  }

  function onEnemyKilled(state, e) {
    if (!e || e.fake || e.decoy) return;
    if ((e.burnT > 0 || e.burnDps > 0) && !e.stolen && has(state, "inferno")) {
      spawnInfernoPuddle(state, e.x, e.y);
    }
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || u.kind !== "warlord" || u.stowed) continue;
      u.warStacks = Math.min(10, (u.warStacks || 0) + 1);
      u.warFrenzyT = 5;
      if (u.warStacks === 1 || u.warStacks === 10) {
        state.floaters.push(G.createFloater(u.x, u.y - 20, u.warStacks === 10 ? "fúria máx" : "+cadência", "#c41e3a"));
      }
    }
  }

  function startWarCombo(state, u, tgt) {
    var band = ensureWarBand(u);
    var haste = warlordHaste(u);
    var rate = C().fireMul(state);
    if (u.veilFogT > 0) rate *= 0.55;
    u.cooldown = 1 / (u.def.fire * Math.max(0.2, rate) * haste);
    u.warCombo = {
      phase: 0,
      t: 0,
      tx: tgt.x,
      ty: tgt.y,
      eid: tgt.id,
      ang: Math.atan2(tgt.y - u.y, tgt.x - u.x),
      wx0: u.x,
      wy0: u.y,
      ax0: band[0].x,
      ay0: band[0].y,
      bx0: band[1].x,
      by0: band[1].y
    };
  }

  function warComboDur(phase, haste) {
    var h = Math.max(0.7, haste || 1);
    if (phase === 0 || phase === 1 || phase === 2) return 0.09 / h;
    if (phase === 5) return 0.1 / h;
    return 0.055 / h;
  }

  function tickWarlord(state, dt) {
    var firing = !!(state.pointer && state.pointer.fireHold);
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || u.kind !== "warlord" || u.stowed) continue;
      var band = ensureWarBand(u);
      tickWarFrenzy(u, dt);
      if (u.held) {
        u.warCombo = null;
        u.leapZ = 0;
      }
      var haste = warlordHaste(u);
      if (u.warCombo) {
        var Cmb = u.warCombo;
        Cmb.t += dt;
        var dur = warComboDur(Cmb.phase, haste);
        var k = Math.min(1, Cmb.t / Math.max(0.02, dur));
        var tgt = null;
        for (var ei = 0; ei < state.enemies.length; ei++) {
          if (state.enemies[ei].id === Cmb.eid && state.enemies[ei].hp > 0) tgt = state.enemies[ei];
        }
        if (tgt) {
          Cmb.tx = tgt.x;
          Cmb.ty = tgt.y;
          Cmb.ang = Math.atan2(tgt.y - (Cmb.wy0 || u.y), tgt.x - (Cmb.wx0 || u.x));
        }
        var tx = Cmb.tx;
        var ty = Cmb.ty;
        if (Cmb.phase === 0) {
          band[0].x = Cmb.ax0 + (tx - Cmb.ax0) * k;
          band[0].y = Cmb.ay0 + (ty - Cmb.ay0) * k;
          band[0].leapZ = 18 * k * (1 - k) * 4;
          band[0].rot = Cmb.ang;
        } else if (Cmb.phase === 1) {
          band[1].x = Cmb.bx0 + (tx - Cmb.bx0) * k;
          band[1].y = Cmb.by0 + (ty - Cmb.by0) * k;
          band[1].leapZ = 18 * k * (1 - k) * 4;
          band[1].rot = Cmb.ang + Math.PI / 2;
        } else if (Cmb.phase === 2) {
          u.x = Cmb.wx0 + (tx - Cmb.wx0) * k;
          u.y = Cmb.wy0 + (ty - Cmb.wy0) * k;
          u.leapZ = 16 * k * (1 - k) * 4;
          u.rot = Cmb.ang;
        } else if (Cmb.phase === 3 || Cmb.phase === 4) {
          u.rot = Cmb.ang + (Cmb.phase === 3 ? Math.PI / 4 : -Math.PI / 4);
        } else if (Cmb.phase === 5) {
          var hx = state.squad.x;
          var hy = state.squad.y;
          u.x += (hx - u.x) * Math.min(1, k);
          u.y += (hy - u.y) * Math.min(1, k);
          u.leapZ = Math.max(0, 12 * (1 - k));
          band[0].x += (u.x + band[0].ox - band[0].x) * Math.min(1, k);
          band[0].y += (u.y + band[0].oy - band[0].y) * Math.min(1, k);
          band[1].x += (u.x + band[1].ox - band[1].x) * Math.min(1, k);
          band[1].y += (u.y + band[1].oy - band[1].y) * Math.min(1, k);
          band[0].leapZ = 0;
          band[1].leapZ = 0;
        }
        if (Cmb.t < dur) continue;
        if (Cmb.phase === 0) warSlashLine(state, u, band[0].x, band[0].y, Cmb.ang, 56, 0.42, "#a84828");
        if (Cmb.phase === 1) warSlashLine(state, u, band[1].x, band[1].y, Cmb.ang + Math.PI / 2, 56, 0.42, "#c41e3a");
        if (Cmb.phase === 3) warSlashLine(state, u, u.x, u.y, Cmb.ang + Math.PI / 4, 68, 1, "#c41e3a");
        if (Cmb.phase === 4) warSlashLine(state, u, u.x, u.y, Cmb.ang - Math.PI / 4, 68, 1, "#7a3a22");
        Cmb.phase += 1;
        Cmb.t = 0;
        if (Cmb.phase === 2) {
          Cmb.wx0 = u.x;
          Cmb.wy0 = u.y;
        }
        if (Cmb.phase > 5) {
          u.warCombo = null;
          u.leapZ = 0;
        }
        continue;
      }
      u.leapZ = 0;
      for (var b = 0; b < 2; b++) {
        var homeX = u.x + band[b].ox;
        var homeY = u.y + band[b].oy;
        band[b].x += (homeX - band[b].x) * Math.min(1, dt * 14);
        band[b].y += (homeY - band[b].y) * Math.min(1, dt * 14);
        band[b].leapZ *= Math.max(0, 1 - dt * 8);
        band[b].rot = u.rot || 0;
      }
      if (!firing || u.held) continue;
      if ((u.cooldown || 0) > 0) continue;
      var near = C().nearest(state.enemies, u.x, u.y);
      var reach = (u.def.range || 190) + (near && near.def ? near.def.size : 10);
      if (!near || hypot(near.x - u.x, near.y - u.y) > reach) continue;
      startWarCombo(state, u, near);
    }
  }

  function drawWarSlash(ctx, fx) {
    var k = Math.max(0, Math.min(1, fx.t / (fx.max || 0.2)));
    var mx = (fx.x0 + fx.x1) / 2;
    var my = (fx.y0 + fx.y1) / 2;
    var dx = fx.x1 - fx.x0;
    var dy = fx.y1 - fx.y0;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len;
    var ny = dx / len;
    var bulge = 16 + k * 10;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = fx.color || "#c41e3a";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "rgba(90, 28, 18, " + (0.28 + k * 0.45) + ")";
    ctx.lineWidth = 12 * k + 4;
    ctx.beginPath();
    ctx.moveTo(fx.x0, fx.y0);
    ctx.quadraticCurveTo(mx + nx * bulge, my + ny * bulge, fx.x1, fx.y1);
    ctx.stroke();
    ctx.strokeStyle = fx.color || "#c41e3a";
    ctx.globalAlpha = 0.4 + k * 0.6;
    ctx.lineWidth = 5 * k + 1.8;
    ctx.beginPath();
    ctx.moveTo(fx.x0, fx.y0);
    ctx.quadraticCurveTo(mx + nx * bulge, my + ny * bulge, fx.x1, fx.y1);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 214, 170, " + (0.62 * k) + ")";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(fx.x0, fx.y0);
    ctx.quadraticCurveTo(mx + nx * (bulge * 0.72), my + ny * (bulge * 0.72), fx.x1, fx.y1);
    ctx.stroke();
    ctx.globalAlpha = k;
    ctx.fillStyle = "#ffe0c4";
    ctx.beginPath();
    ctx.arc(fx.x1, fx.y1, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(196, 30, 58, 0.45)";
    ctx.beginPath();
    ctx.arc(fx.x0, fx.y0, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function phalanxBeam(state, u, x, y, ang) {
    if (ang == null || isNaN(ang)) ang = u.rot || 0;
    var start = 14;
    var len = 58;
    var c = Math.cos(ang);
    var s = Math.sin(ang);
    var x0 = x + c * start;
    var y0 = y + s * start;
    var x1 = x + c * (start + len);
    var y1 = y + s * (start + len);
    var dmg = Math.round(u.def.dmg * C().dmgMul(state) * 0.9);
    state.vfx = state.vfx || [];
    state.vfx.push({ phalanxBeam: true, x0: x0, y0: y0, x1: x1, y1: y1, t: 0.22, max: 0.22, color: "#fff4c4" });
    G.burst(state, x1, y1, "#fff0c4", 8, 70);
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0) continue;
      if (distToSeg(e.x, e.y, x0, y0, x1, y1) > 11 + (e.def.size || 10) * 0.25) continue;
      C().hurt(state, e, dmg, x1, y1, true);
    }
  }

  function plantPhalanxRing(state, u, x, y) {
    ensure(state);
    for (var i = state.zones.length - 1; i >= 0; i--) {
      if (state.zones[i].kind === "phalanx") state.zones.splice(i, 1);
    }
    holdPhalanxActive(state);
    var n = 8;
    var guards = [];
    for (var g = 0; g < n; g++) {
      guards.push({ hp: 2, maxHp: 2, ang: (Math.PI * 2 * g) / n, flash: 0, ifr: 0 });
    }
    var enemyHit = null;
    var enemyD = 9999;
    for (var ei = 0; ei < state.enemies.length; ei++) {
      var en = state.enemies[ei];
      if (en.hp <= 0) continue;
      var ed = hypot(en.x - x, en.y - y);
      if (ed < 90 + (en.def.size || 10) && ed < enemyD) {
        enemyHit = en;
        enemyD = ed;
      }
    }
    var mode = enemyHit ? "thermo" : "guard";
    zone(state, {
      kind: "phalanx",
      x: x,
      y: y,
      r: mode === "thermo" ? 92 : 122,
      spearLen: 56,
      count: n,
      t: 15,
      dmg: u.def.dmg,
      ownerId: u.id,
      hitCd: {},
      guards: guards,
      mode: mode,
      inward: mode === "thermo",
      follow: false,
      thrust: 0
    });
    G.burst(state, x, y, "#fff0c4", 24, 170);
    state.floaters.push(G.createFloater(x, y - 18, mode === "thermo" ? "termópilas" : "falange", "#fff0c4"));
  }

  function phalanxCharge(state, u) {
    var p = aim(state);
    holdPhalanxActive(state);
    u.leap = {
      phase: "out",
      t: 0,
      dur: 0.44,
      x0: u.x,
      y0: u.y,
      tx: p.x,
      ty: p.y,
      pierce: true,
      hold: true,
      phalanxWall: true,
      hit: {}
    };
    u.leapZ = 0;
    G.burst(state, u.x, u.y, "#c4a45a", 16, 140);
    state.floaters.push(G.createFloater(u.x, u.y - 18, "falange", "#fff0c4"));
    return true;
  }

  function phalanxGuards(z) {
    if (z.guards && z.guards.length) return z.guards;
    var n = z.count || 8;
    z.guards = [];
    for (var i = 0; i < n; i++) {
      z.guards.push({ hp: 2, maxHp: 2, ang: (Math.PI * 2 * i) / n, flash: 0, ifr: 0 });
    }
    z.count = n;
    return z.guards;
  }

  function phalanxSlotAt(z, x, y) {
    var n = phalanxGuards(z).length;
    var ang = Math.atan2(y - z.y, x - z.x);
    var step = (Math.PI * 2) / n;
    var idx = Math.round(ang / step);
    return ((idx % n) + n) % n;
  }

  function phalanxPos(z, g) {
    var ring = z.r || 122;
    return { x: z.x + Math.cos(g.ang) * ring, y: z.y + Math.sin(g.ang) * ring };
  }

  function phalanxAlive(g) {
    return !!(g && g.hp > 0);
  }

  function hurtPhalanxGuard(state, z, idx, lethal) {
    var guards = phalanxGuards(z);
    var g = guards[idx];
    if (!phalanxAlive(g)) return false;
    if (!lethal && (g.ifr || 0) > 0) return false;
    if (lethal) g.hp = 0;
    else g.hp -= 1;
    g.flash = 0.22;
    g.ifr = lethal ? 0 : 0.38;
    var p = phalanxPos(z, g);
    if (g.hp <= 0) {
      g.hp = 0;
      g.fallT = 0.42;
      G.burst(state, p.x, p.y, "#c4a45a", 18, 120);
      state.floaters.push(G.createFloater(p.x, p.y - 14, "brecha", "#c4a45a"));
    } else {
      G.burst(state, p.x, p.y, "#fff0c4", 8, 55);
    }
    return true;
  }

  function phalanxSmash(state, x, y, r, lethal) {
    if (!state.zones) return;
    r = r || 40;
    for (var i = 0; i < state.zones.length; i++) {
      var z = state.zones[i];
      if (z.kind !== "phalanx" || z.retiring) continue;
      var guards = phalanxGuards(z);
      for (var k = 0; k < guards.length; k++) {
        if (guards[k].hp <= 0) continue;
        var p = phalanxPos(z, guards[k]);
        if (hypot(p.x - x, p.y - y) > r + 18) continue;
        hurtPhalanxGuard(state, z, k, !!lethal);
      }
    }
  }

  function tickPhalanxRing(state, z, dt) {
    var n = z.count || 8;
    var ring = z.r || 122;
    var spearLen = z.spearLen || 56;
    var dmg = Math.round((z.dmg || 26) * C().dmgMul(state) * 0.7);
    var guards = phalanxGuards(z);
    var half = Math.PI / n;
    var bodyR = 22;
    z.thrust = (z.thrust || 0) + dt * (z.mode === "thermo" ? 14 : 6);
    var stab = z.mode === "thermo" ? (0.55 + Math.sin(z.thrust) * 0.45) : 0;
    if (z.mode !== "thermo") {
      var sd = hypot(state.squad.x - z.x, state.squad.y - z.y);
      if (sd < ring - 18) z.follow = true;
      if (z.follow) {
        z.x = state.squad.x;
        z.y = state.squad.y;
        z.r = Math.max(78, 86 + Math.min(28, (G.soldierCount(state) || 1) * 4));
        ring = z.r;
      }
    }
    for (var gi = 0; gi < guards.length; gi++) {
      if (guards[gi].flash > 0) guards[gi].flash = Math.max(0, guards[gi].flash - dt);
      if (guards[gi].ifr > 0) guards[gi].ifr = Math.max(0, guards[gi].ifr - dt);
      if (guards[gi].hp <= 0 && (guards[gi].fallT || 0) > 0) {
        guards[gi].fallT = Math.max(0, guards[gi].fallT - dt);
      }
    }
    if (!z.hitCd) z.hitCd = {};
    for (var key in z.hitCd) {
      z.hitCd[key] -= dt;
      if (z.hitCd[key] <= 0) delete z.hitCd[key];
    }
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0 || e.scenery || (e.def && e.def.kind === "orbit_shield")) continue;
      var boss = !!(e.def && e.def.boss);
      var es = e.def.size || 10;
      if (z.mode === "thermo") {
        var cd = hypot(e.x - z.x, e.y - z.y);
        if (cd < ring - 8 + es) {
          var hitKeyC = e.id + "_core";
          if ((z.hitCd[hitKeyC] || 0) <= 0) {
            z.hitCd[hitKeyC] = 0.22;
            C().hurt(state, e, Math.round(dmg * 1.15), z.x, z.y, true);
            if (cd > 4) {
              e.x += ((z.x - e.x) / cd) * 18 * dt;
              e.y += ((z.y - e.y) / cd) * 18 * dt;
            }
          }
        }
      }
      for (var k = 0; k < n; k++) {
        if (!phalanxAlive(guards[k])) continue;
        var a = guards[k].ang;
        var px = z.x + Math.cos(a) * ring;
        var py = z.y + Math.sin(a) * ring;
        var dir = z.mode === "thermo" ? a + Math.PI : a;
        var sLen = spearLen * (z.mode === "thermo" ? (0.7 + stab * 0.55) : 1);
        var sx = px + Math.cos(dir) * sLen;
        var sy = py + Math.sin(dir) * sLen;
        var bd = hypot(e.x - px, e.y - py);
        var onSpear = distToSeg(e.x, e.y, px, py, sx, sy) <= 14 + es * 0.25;
        var onBody = bd <= bodyR + es;
        if (!onSpear && !onBody) continue;
        if (boss) {
          hurtPhalanxGuard(state, z, k, true);
        } else {
          if (onBody && bd > 0.001 && z.mode !== "thermo") {
            var push = bodyR + es;
            e.x = px + ((e.x - px) / bd) * push;
            e.y = py + ((e.y - py) / bd) * push;
            G.clampPlay(e, state);
          }
          hurtPhalanxGuard(state, z, k, false);
        }
        var hitKey = e.id + "_" + k;
        if ((z.hitCd[hitKey] || 0) <= 0) {
          z.hitCd[hitKey] = 0.28;
          C().hurt(state, e, dmg, px, py, true);
        }
      }
    }
    for (var p = state.projectiles.length - 1; p >= 0; p--) {
      var pr = state.projectiles[p];
      if (pr.team !== "enemy") continue;
      var bossShot = !!pr.fromBoss;
      if (!bossShot && pr.fromId) {
        for (var bi = 0; bi < state.enemies.length; bi++) {
          if (state.enemies[bi].id === pr.fromId && state.enemies[bi].def && state.enemies[bi].def.boss) {
            bossShot = true;
            break;
          }
        }
      }
      var pd = hypot(pr.x - z.x, pr.y - z.y);
      var slot = phalanxSlotAt(z, pr.x, pr.y);
      var sg = guards[slot];
      var inArc = phalanxAlive(sg) && angDiff(Math.atan2(pr.y - z.y, pr.x - z.x), sg.ang) < half + 0.08;
      var hitSlot = -1;
      if (inArc && pd > ring - 28 && pd < ring + spearLen + 10) hitSlot = slot;
      if (hitSlot < 0) {
        for (var sk = 0; sk < guards.length; sk++) {
          if (!phalanxAlive(guards[sk])) continue;
          var gp = phalanxPos(z, guards[sk]);
          var ga = guards[sk].ang;
          var gsx = gp.x + Math.cos(ga) * spearLen;
          var gsy = gp.y + Math.sin(ga) * spearLen;
          if (hypot(pr.x - gp.x, pr.y - gp.y) < bodyR + (pr.r || 3)) {
            hitSlot = sk;
            break;
          }
          if (distToSeg(pr.x, pr.y, gp.x, gp.y, gsx, gsy) < 12 + (pr.r || 3)) {
            hitSlot = sk;
            break;
          }
        }
      }
      if (hitSlot < 0) continue;
      hurtPhalanxGuard(state, z, hitSlot, bossShot);
      if (bossShot) continue;
      G.burst(state, pr.x, pr.y, "#fff0c4", 4, 28);
      state.projectiles.splice(p, 1);
    }
  }

  function angDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  }

  function drawPhalanxBeam(ctx, fx) {
    var k = Math.max(0, Math.min(1, fx.t / (fx.max || 0.22)));
    ctx.save();
    ctx.strokeStyle = "rgba(255, 244, 196, " + (0.25 + k * 0.7) + ")";
    ctx.shadowColor = "#ffe08a";
    ctx.shadowBlur = 14;
    ctx.lineCap = "round";
    ctx.lineWidth = 5.5 * k + 1.5;
    ctx.beginPath();
    ctx.moveTo(fx.x0, fx.y0);
    ctx.lineTo(fx.x1, fx.y1);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, " + (0.45 * k) + ")";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx.x0, fx.y0);
    ctx.lineTo(fx.x1, fx.y1);
    ctx.stroke();
    ctx.restore();
  }

  function drawPhalanxDummy(ctx, def, px, py, a, g, time, k) {
    if (!def || !G.drawPlayerUnit) return;
    var fall = g.hp <= 0 ? Math.min(1, 1 - (g.fallT || 0) / 0.42) : 0;
    ctx.save();
    if (fall > 0) ctx.globalAlpha = Math.max(0, 1 - fall);
    G.drawPlayerUnit(ctx, {
      x: px,
      y: py + fall * 10,
      kind: "phalanx",
      def: def,
      rot: a + fall * 1.15,
      hp: Math.max(0, g.hp),
      maxHp: g.maxHp || 2,
      id: -500 - k,
      gait: time * 2 + k,
      vx: 0,
      vy: 0,
      flash: g.flash || 0
    }, time);
    ctx.restore();
  }

  function drawPhalanxRing(ctx, state, z) {
    var n = z.count || 8;
    var ring = z.r || 122;
    var spearLen = z.spearLen || 56;
    var time = state.time || 0;
    var guards = phalanxGuards(z);
    var half = Math.PI / n;
    var def = G.UNIT_DEFS.phalanx;
    var anyAlive = false;
    for (var a0 = 0; a0 < n; a0++) if (phalanxAlive(guards[a0])) anyAlive = true;
    if (anyAlive) {
      ctx.save();
      ctx.fillStyle = z.mode === "thermo" ? "rgba(255, 90, 50, 0.16)" : "rgba(196, 164, 90, 0.1)";
      ctx.beginPath();
      ctx.arc(z.x, z.y, Math.max(36, ring - 28), 0, Math.PI * 2);
      ctx.fill();
      if (z.mode === "thermo") {
        var pulse = 0.25 + Math.sin((z.thrust || 0) * 2) * 0.12;
        ctx.strokeStyle = "rgba(255, 210, 120, " + (0.45 + pulse) + ")";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(z.x, z.y, 22 + pulse * 10, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    for (var k = 0; k < n; k++) {
      var g = guards[k];
      var a = (g && g.ang != null) ? g.ang : (Math.PI * 2 * k) / n;
      var px = z.x + Math.cos(a) * ring;
      var py = z.y + Math.sin(a) * ring;
      if (!phalanxAlive(g)) {
        if (g && (g.fallT || 0) > 0) drawPhalanxDummy(ctx, def, px, py, a, g, time, k);
        continue;
      }
      ctx.save();
      ctx.strokeStyle = "rgba(196, 164, 90, 0.55)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(z.x, z.y, Math.max(36, ring - 8), a - half * 0.78, a + half * 0.78);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = "rgba(80, 60, 28, 0.8)";
      ctx.fillRect(-4, -14, 8, 14);
      ctx.fillStyle = "rgba(232, 200, 120, 0.9)";
      ctx.beginPath();
      ctx.ellipse(0, -14, 4, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      var dir = z.mode === "thermo" ? a + Math.PI : a;
      var stab = z.mode === "thermo" ? (0.55 + Math.sin((z.thrust || 0)) * 0.45) : 1;
      var sLen = spearLen * (z.mode === "thermo" ? (0.7 + stab * 0.55) : 1);
      var sx = px + Math.cos(dir) * sLen;
      var sy = py + Math.sin(dir) * sLen;
      ctx.save();
      ctx.strokeStyle = "rgba(255, 240, 196, 0.85)";
      ctx.shadowColor = "#ffe08a";
      ctx.shadowBlur = 8;
      ctx.lineCap = "round";
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
      drawPhalanxDummy(ctx, def, px, py, z.mode === "thermo" ? dir : a, g, time, k);
      ctx.save();
      for (var pip = 0; pip < (g.maxHp || 2); pip++) {
        ctx.fillStyle = pip < g.hp ? "#fff0c4" : "rgba(40, 32, 20, 0.7)";
        ctx.strokeStyle = "rgba(20, 16, 10, 0.8)";
        ctx.lineWidth = 1;
        ctx.fillRect(px - 6 + pip * 8, py - (def.size || 16) - 10, 6, 4);
        ctx.strokeRect(px - 6 + pip * 8, py - (def.size || 16) - 10, 6, 4);
      }
      ctx.restore();
    }
  }

  function startAssassinHunt(state, u) {
    u.detached = true;
    u.leap = null;
    state.assassinHunt = { id: u.id, wait: 0 };
    state.floaters.push(G.createFloater(u.x, u.y - 18, "execução", "#c8a0ff"));
  }

  function tickAssassinHunt(state, dt) {
    var hunt = state.assassinHunt;
    if (!hunt) return;
    var u = null;
    for (var i = 0; i < state.units.length; i++) if (state.units[i].id === hunt.id) u = state.units[i];
    if (!u || u.hp <= 0) {
      state.assassinHunt = null;
      return;
    }
    u.detached = true;
    hunt.wait -= dt;
    if (hunt.wait > 0) return;
    var tgt = C().nearest(state.enemies, u.x, u.y);
    if (!tgt) {
      u.detached = false;
      state.assassinHunt = null;
      return;
    }
    u.x = tgt.x;
    u.y = tgt.y;
    clampField(state, u);
    var dmg = Math.round(u.def.dmg * C().dmgMul(state) * 2.6);
    C().hurt(state, tgt, dmg, u.x, u.y, true);
    G.burst(state, tgt.x, tgt.y, "#c8a0ff", 14, 120);
    if (tgt.hp > 0) {
      u.detached = false;
      state.assassinHunt = null;
      state.floaters.push(G.createFloater(u.x, u.y - 16, "falhou", "#c8a0ff"));
    } else {
      hunt.wait = 0.12;
    }
  }

  function popDeployFromCrate(state, spec, crate) {
    spec.toss = {
      x0: crate.x,
      y0: crate.y,
      tx: crate.x + (Math.random() - 0.5) * 14,
      ty: crate.y + (Math.random() - 0.5) * 14,
      t: 0,
      dur: 0.34,
      peak: 38,
      x: crate.x,
      y: crate.y,
      z: 0,
      spin: 0
    };
    spec.airborne = true;
    spec.landSquash = 0;
    state.deploys.push(spec);
  }

  function spawnMechDog(state, x, y, dmg) {
    state.minions.push({
      kind: "mech_dog",
      x: x,
      y: y,
      hp: 110,
      maxHp: 110,
      size: 12,
      t: 15,
      maxT: 15,
      immortal: true,
      vx: 0,
      vy: 0,
      facing: 1,
      leapT: 0.15,
      leapK: 0,
      leaping: false,
      leapZ: 18,
      barkCd: 0.35,
      lureT: 0,
      barkFlash: 0,
      clawCd: 0,
      dmg: Math.max(8, Math.round(dmg * 0.7)),
      def: { size: 12, dmg: Math.max(8, Math.round(dmg * 0.7)) },
      team: "player"
    });
  }

  function spawnShieldGen(state, crate, dmg) {
    popDeployFromCrate(state, {
      kind: "shield_gen",
      x: crate.x,
      y: crate.y,
      hp: 30,
      maxHp: 30,
      cooldown: 0,
      fire: 0,
      dmg: dmg,
      range: 86,
      t: 18,
      size: 16,
      pulse: 0,
      color: "#7ad4ff",
      label: "gerador"
    }, crate);
  }

  function spawnMegaphone(state, crate, dmg) {
    popDeployFromCrate(state, {
      kind: "megaphone",
      x: crate.x,
      y: crate.y,
      hp: 70,
      maxHp: 70,
      cooldown: 0.2,
      fire: 1.35,
      dmg: Math.max(6, Math.round(dmg * 0.55)),
      range: 216,
      t: 15,
      maxT: 15,
      immortal: true,
      size: 14,
      rings: [],
      color: "#ffb24a",
      label: "megafone"
    }, crate);
  }

  function openSupplyCrate(state, z) {
    var payload = z.payload || "dog";
    G.burst(state, z.x, z.y, "#c48a3a", 18, 110);
    G.burst(state, z.x, z.y, "#ffe08a", 10, 70);
    if (G.audio && G.audio.thud) G.audio.thud();
    if (payload === "dog") {
      spawnMechDog(state, z.x, z.y, z.dmg || 18);
      state.floaters.push(G.createFloater(z.x, z.y - 18, "cão mecânico", "#c8d0d8"));
    } else if (payload === "shield") {
      spawnShieldGen(state, z, z.dmg || 18);
      state.floaters.push(G.createFloater(z.x, z.y - 18, "gerador", "#7ad4ff"));
    } else {
      spawnMegaphone(state, z, z.dmg || 18);
      state.floaters.push(G.createFloater(z.x, z.y - 18, "megafone", "#ffb24a"));
    }
  }

  function hitRadioShield(state, gen, x, y) {
    if (!gen || gen.hp <= 0 || gen.airborne) return false;
    gen.hp -= 1;
    G.burst(state, x, y, "#9ad4ff", 7, 55);
    if (gen.hp <= 0) {
      gen.hp = 0;
      beginRetire(state, gen, 0.64);
      G.burst(state, gen.x, gen.y, "#7ad4ff", 22, 140);
      G.burst(state, gen.x, gen.y, "#fff4c4", 10, 80);
      state.floaters.push(G.createFloater(gen.x, gen.y - 18, "escudo estourado", "#7aa0c8"));
      if (G.audio && G.audio.thud) G.audio.thud();
    }
    return true;
  }

  function radioShieldAt(state, x, y) {
    for (var i = 0; i < (state.deploys || []).length; i++) {
      var t = state.deploys[i];
      if (t.kind !== "shield_gen" || t.hp <= 0 || t.airborne || t.retiring) continue;
      if (hypot(x - t.x, y - t.y) <= (t.range || 86) + 6) return t;
    }
    return null;
  }

  function tickShieldGen(state, t, dt) {
    t.pulse = (t.pulse || 0) + dt;
    var r = t.range || 86;
    var now = state.time || 0;
    for (var i = 0; i < state.enemies.length; i++) {
      var en = state.enemies[i];
      if (en.hp <= 0) continue;
      var dx = en.x - t.x;
      var dy = en.y - t.y;
      var d = hypot(dx, dy) || 0.001;
      var min = r + (en.def.size || 10);
      if (d >= min) continue;
      en.x = t.x + (dx / d) * min;
      en.y = t.y + (dy / d) * min;
      G.clampPlay(en, state);
      if ((en.radioBumpT || 0) < now) {
        en.radioBumpT = now + 0.38;
        hitRadioShield(state, t, en.x, en.y);
        if (t.hp <= 0) return;
      }
    }
  }

  function tickMegaphone(state, t, dt) {
    t.rings = t.rings || [];
    for (var r = t.rings.length - 1; r >= 0; r--) {
      t.rings[r].t -= dt;
      if (t.rings[r].t <= 0) t.rings.splice(r, 1);
    }
    t.cooldown -= dt;
    if (t.cooldown > 0) return;
    t.cooldown = 1 / Math.max(0.4, t.fire || 1.35);
    t.rings.push({ t: 0.42, max: 0.42 });
    if (G.audio && G.audio.horn) G.audio.horn();
    var pulseR = t.range || 216;
    for (var i = 0; i < state.enemies.length; i++) {
      var en = state.enemies[i];
      if (en.hp <= 0) continue;
      if (hypot(en.x - t.x, en.y - t.y) > pulseR + (en.def.size || 10)) continue;
      C().hurt(state, en, t.dmg || 10, t.x, t.y, true);
      en.drunkT = Math.max(en.drunkT || 0, 1.55);
      en.drunkPhase = (en.drunkPhase || 0) + 1.2;
    }
  }

  function tickMechDog(state, m, dt, idx) {
    if (m.retiring) {
      if (tickRetire(m, dt)) state.minions.splice(idx, 1);
      return;
    }
    m.t -= dt;
    if ((!m.immortal && m.hp <= 0) || m.t <= 0) {
      beginRetire(state, m, 0.68);
      return;
    }
    m.lureT = Math.max(0, (m.lureT || 0) - dt);
    m.barkCd = (m.barkCd || 0) - dt;
    m.clawCd = (m.clawCd || 0) - dt;
    m.barkFlash = Math.max(0, (m.barkFlash || 0) - dt);
    var tgt = C().nearest(state.enemies, m.x, m.y);
    if (tgt) m.facing = tgt.x < m.x ? -1 : 1;
    if (m.barkCd <= 0) {
      m.barkCd = 1.4;
      m.lureT = 1.25;
      m.barkFlash = 0.32;
      zone(state, { kind: "lure", x: m.x, y: m.y, r: 28, t: 0.55 });
      G.burst(state, m.x, m.y - 8, "#ff9a4a", 10, 70);
      state.floaters.push(G.createFloater(m.x, m.y - 22, "au!", "#ffb070"));
      if (G.audio && G.audio.bark) G.audio.bark();
    }
    if (m.leaping) {
      m.leapK = Math.min(1, (m.leapK || 0) + dt / 0.34);
      var k = m.leapK;
      m.x = m.lx0 + (m.lx1 - m.lx0) * k;
      m.y = m.ly0 + (m.ly1 - m.ly0) * k;
      m.leapZ = 4 * k * (1 - k) * 36;
      if (k >= 1) {
        m.leaping = false;
        m.leapZ = 0;
        m.leapT = 0.55;
        if (tgt && hypot(tgt.x - m.x, tgt.y - m.y) < 34) {
          C().hurt(state, tgt, m.dmg || 12, m.x, m.y, true);
          knockEnemy(state, tgt, m.x, m.y, 16);
          G.burst(state, tgt.x, tgt.y, "#d0d8e0", 8, 60);
        }
      }
    } else if (tgt) {
      var td = hypot(tgt.x - m.x, tgt.y - m.y);
      m.leapT = (m.leapT || 0) - dt;
      if (td > 28 && m.leapT <= 0) {
        m.leaping = true;
        m.leapK = 0;
        m.lx0 = m.x;
        m.ly0 = m.y;
        var ang = Math.atan2(tgt.y - m.y, tgt.x - m.x);
        var hop = Math.min(78, td);
        m.lx1 = m.x + Math.cos(ang) * hop;
        m.ly1 = m.y + Math.sin(ang) * hop;
      } else if (td > 18) {
        var a = Math.atan2(tgt.y - m.y, tgt.x - m.x);
        m.x += Math.cos(a) * 108 * dt;
        m.y += Math.sin(a) * 108 * dt;
      } else if (m.clawCd <= 0) {
        m.clawCd = 0.42;
        C().hurt(state, tgt, m.dmg || 12, m.x, m.y, true);
        G.burst(state, tgt.x, tgt.y, "#c8d0d8", 5, 40);
      }
    }
    G.clampPlay(m, state);
  }

  function dropSupplyPack(state) {
    var p = aim(state);
    var radio = lead(state, "radio");
    var dmg = radio ? radio.def.dmg : 18;
    if (radio) {
      var dx = p.x - radio.x;
      var dy = p.y - radio.y;
      var dist = hypot(dx, dy);
      var maxR = 240;
      if (dist > maxR) {
        p = { x: radio.x + (dx / dist) * maxR, y: radio.y + (dy / dist) * maxR };
      }
    }
    G.clampPlay(p, state);
    var roll = Math.random();
    var payload = roll < 1 / 3 ? "dog" : roll < 2 / 3 ? "shield" : "horn";
    zone(state, {
      kind: "supply_drop",
      x: p.x,
      y: p.y,
      r: 16,
      t: 2.4,
      falling: 1.75,
      fallMax: 1.75,
      payload: payload,
      dmg: dmg
    });
    if (G.audio && G.audio.toss) G.audio.toss();
  }

  function tickBannerSword(state, dt) {
    /* Porta-estandarte agora é melee; o buff sai no espeto. */
  }

  function update(state, dt) {
    if (G.invasion && G.invasion.cinematic(state)) return;
    if (state.timeLock) return;
    ensure(state);
    var p = aim(state);
    var last = state.lastMouse || p;
    state.mouseSpd = hypot(p.x - last.x, p.y - last.y) / Math.max(dt, 0.008);
    state.lastMouse = { x: p.x, y: p.y };
    state.mouseHist.push({ x: p.x, y: p.y, t: state.time || 0 });
    while (state.mouseHist.length > 48) state.mouseHist.shift();

    cmdMark(state);
    guerrillaTick(state, dt);
    if (state.guerrillaMenu && state.pointer && state.pointer.altHold) guerrillaUpdateMenu(state);
    if (state.turretMenu && state.pointer && state.pointer.altHold) {
      var tm = state.turretMenu;
      var tp = aim(state);
      tm.hover = guerrillaSlice(tp.x - tm.x, tp.y - tm.y);
    }
    zoneAura(state);
    tickBumper(state, dt);
    tickTimedFlags(state, dt);

    if ((state.hauntT || 0) > 0) {
      state.hauntT = Math.max(0, state.hauntT - dt);
      state.phaseOn = true;
      state.run.smokeT = Math.max(state.run.smokeT || 0, 0.05);
    } else {
      state.phaseOn = false;
    }
    tickSquadContact(state, dt);
    tickBannerSword(state, dt);
    tickColosso(state, dt);
    tickColoSlashDamage(state);
    tickSpearLeap(state, dt);
    tickWarlord(state, dt);
    if ((state.suppressT || 0) > 0) state.suppressT = Math.max(0, state.suppressT - dt);
    if ((state.mgFocusT || 0) > 0) state.mgFocusT = Math.max(0, state.mgFocusT - dt);

    if (has(state, "giratoria") && state.pointer && state.pointer.fireHold) state.girSpin = Math.min(2.4, (state.girSpin || 0) + dt);
    else state.girSpin = Math.max(0, (state.girSpin || 0) - dt * 1.4);

    if (trailLine(state)) {
      var sx = state.squad.x;
      var sy = state.squad.y;
      var prev = state.trailAt;
      if (!prev || hypot(sx - prev.x, sy - prev.y) > 10) {
        zone(state, { kind: "trail", x: sx, y: sy, r: 14, t: 2.8 });
        state.trailAt = { x: sx, y: sy };
      }
    }

    if (has(state, "metralhador") && state.pointer && state.pointer.fireHold) {
      var rec = nKind(state, "metralhador");
      if (rec && (state.dashT || 0) <= 0) {
        var ra = mouseAng(state, state.squad) + Math.PI;
        var push = 38 * rec * dt;
        state.squad.x += Math.cos(ra) * push;
        state.squad.y += Math.sin(ra) * push;
        clampField(state, state.squad);
      }
    }

    if (state.mineDraw && state.pointer && state.pointer.altHold && has(state, "mineiro")) {
      var min = lead(state, "mineiro");
      var d = hypot(p.x - state.mineDraw.last.x, p.y - state.mineDraw.last.y);
      if (min && d > 18 && state.mineDraw.spent < 14) {
        plantMineAt(state, min, p.x, p.y);
        state.mineDraw.last = { x: p.x, y: p.y };
        state.mineDraw.spent++;
        if (state.mineDraw.spent === 1) putSelectedOnCd(state);
      }
    }

    if (state.bombLine && state.pointer && state.pointer.altHold) {
      state.bombLine.x1 = p.x;
      state.bombLine.y1 = p.y;
    }
    if (state.bombPending) {
      state.bombPending.t -= dt;
      if (state.bombPending.t <= 0) {
        var bl = state.bombPending;
        var n = Math.max(6, Math.round(hypot(bl.x1 - bl.x0, bl.y1 - bl.y0) / 36));
        var bmb = lead(state, "bombardeiro");
        var dmg = bmb ? Math.round(bmb.def.dmg * C().dmgMul(state) * 1.4) : 40;
        for (var k = 0; k < n; k++) {
          var t = n === 1 ? 0 : k / (n - 1);
          C().explode(state, bl.x0 + (bl.x1 - bl.x0) * t, bl.y0 + (bl.y1 - bl.y0) * t, 40, dmg, "player");
        }
        G.audio.explosion();
        state.bombPending = null;
      }
    }

    if ((state.ramT || 0) > 0) {
      state.ramT -= dt;
      eatEnemyShots(state, state.squad.x, state.squad.y, 34, true);
    }

    if (state.hook) {
      var h = state.hook;
      if (h.flying) {
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        h.t -= dt;
        var reached = h.global && hypot((h.tx || h.x) - h.x, (h.ty || h.y) - h.y) < 18;
        var b = G.playfield(state);
        var hitWall = h.x < b.x0 + 8 || h.x > b.x1 - 8 || h.y < b.y0 + 8 || h.y > b.y1 - 8;
        if (reached || hitWall || (h.global && h.t <= 0)) {
          h.flying = false;
          if (h.global && !hitWall) {
            h.x = h.tx;
            h.y = h.ty;
          } else {
            h.x = Math.max(b.x0 + 8, Math.min(b.x1 - 8, h.x));
            h.y = Math.max(b.y0 + 8, Math.min(b.y1 - 8, h.y));
          }
          h.t = 0.32;
        } else if (h.t <= 0) state.hook = null;
      } else {
        var hx = h.x - state.squad.x;
        var hy = h.y - state.squad.y;
        var hl = hypot(hx, hy) || 1;
        state.squad.x += (hx / hl) * 760 * dt;
        state.squad.y += (hy / hl) * 760 * dt;
        state.run.smokeT = Math.max(state.run.smokeT || 0, 0.12);
        h.t -= dt;
        if (hl < 18 || h.t <= 0) state.hook = null;
        clampField(state, state.squad);
      }
    }

    updateDrones(state, dt);
    if (has(state, "oficina")) {
      var ofi = lead(state, "oficina");
      if (ofi && state.pointer && state.pointer.fireHold) {
        ofi._cartT = (ofi._cartT == null ? 0.4 : ofi._cartT) - dt;
        if (ofi._cartT <= 0) {
          var carts = 0;
          for (var ci = 0; ci < state.minions.length; ci++) if (state.minions[ci].kind === "cart") carts++;
          if (carts < 1) spawnScrapCart(state, ofi);
          ofi._cartT = 6.5;
        }
      }
    }
    updateMinions(state, dt);
    updateDeploys(state, dt);
    updateBeams(state, dt);
    tickJoltArcs(state, dt);
    updateZones(state, dt);
    tickFirewaves(state, dt);
    syncPhalanxHold(state);
    updateStickies(state, dt);

    if (state.gunBombs && has(state, "gunship") && state.pointer && state.pointer.altHold) {
      var gs = lead(state, "gunship");
      if (gs && (gs._bombT || 0) <= 0) {
        gs._bombT = 0.12;
        C().explode(state, p.x, p.y + 8, 28, Math.round(gs.def.dmg * 0.7 * C().dmgMul(state)), "player");
      } else if (gs) gs._bombT -= dt;
    }
  }

  function droneSpec(kind) {
    if (kind === "helicoptero") return { n: 2, orbit: 34, size: 5.5, color: "#3ef0ff", shootR: 100, spin: 3.1 };
    if (kind === "bombardeiro") return { n: 1, orbit: 20, size: 12, color: "#5ad0c8", shootR: 112, spin: 1.6, fat: true };
    if (kind === "recon") return { n: 1, orbit: 28, size: 5.5, color: "#8af0d8", shootR: 100, spin: 2.8, tracer: true };
    return { n: 1, orbit: 28, size: 5, color: "#7af0ff", shootR: 90, spin: 2.6 };
  }

  function droneWantList(state) {
    var kinds = ["droneiro", "helicoptero", "bombardeiro", "recon"];
    var list = [];
    for (var k = 0; k < kinds.length; k++) {
      var kind = kinds[k];
      var spec = droneSpec(kind);
      var nU = nKind(state, kind);
      for (var u = 0; u < nU; u++) {
        for (var s = 0; s < spec.n; s++) {
          list.push({ from: kind, slot: u * spec.n + s, spec: spec });
        }
      }
    }
    return list;
  }

  function dronesOf(state, kind) {
    var out = [];
    for (var i = 0; i < state.drones.length; i++) {
      if (state.drones[i].from === kind) out.push(state.drones[i]);
    }
    return out;
  }

  function updateDrones(state, dt) {
    var want = droneWantList(state);
    while (state.drones.length < want.length) {
      var w0 = want[state.drones.length];
      state.drones.push({
        x: state.squad.x,
        y: state.squad.y,
        ang: Math.random() * 6.28,
        cd: 0,
        from: w0.from,
        slot: w0.slot
      });
    }
    while (state.drones.length > want.length) state.drones.pop();
    var p = aim(state);
    for (var i = 0; i < state.drones.length; i++) {
      var d = state.drones[i];
      var spec = want[i] ? want[i].spec : droneSpec(d.from);
      d.from = want[i] ? want[i].from : d.from;
      d.slot = want[i] ? want[i].slot : d.slot;
      d.spec = spec;
      var host = lead(state, d.from);
      d.ang += dt * (spec.spin || 2.6);
      var spread = spec.orbit || 28;
      var tx = p.x + Math.cos(d.ang + d.slot) * spread;
      var ty = p.y + Math.sin(d.ang + d.slot) * spread;
      d.x += (tx - d.x) * Math.min(1, dt * 8);
      d.y += (ty - d.y) * Math.min(1, dt * 8);
      d.cd -= dt;
      if (d.cd > 0 || !host) continue;
      if (!(state.pointer && state.pointer.fireHold)) continue;
      var tgt = C().nearest(state.enemies, p.x, p.y);
      var shootR = spec.shootR || 90;
      if (!tgt || hypot(tgt.x - p.x, tgt.y - p.y) > shootR) continue;
      d.cd = 1 / Math.max(0.35, host.def.fire * C().fireMul(state));
      var fake = { x: d.x, y: d.y, def: host.def, kind: host.kind, marked: 0, id: host.id };
      var shot = { speed: spec.fat ? 360 : 440, r: spec.fat ? 5 : 3, kind: "bullet" };
      if (spec.tracer) {
        shot.color = "#8af0d8";
        shot.tracer = true;
      }
      bolt(state, fake, angTo(d, tgt), shot);
    }
  }

  function spawnScrapCart(state, ofi) {
    state.minions.push({
      kind: "cart",
      x: ofi.x,
      y: ofi.y,
      hp: 48,
      maxHp: 48,
      size: 11,
      t: 5,
      vx: 0,
      vy: 0,
      def: { size: 11 },
      team: "player"
    });
    state.floaters.push(G.createFloater(ofi.x, ofi.y - 16, "carrinho", "#7a9aaa"));
  }

  function spawnCluster(state, x, y, dmg) {
    var n = 7;
    var base = dmg / Math.max(0.01, C().dmgMul(state));
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n;
      var fake = { x: x, y: y, def: { dmg: base, projectile: "bullet", range: 90 }, kind: "canhoneiro", marked: 0, id: -11 };
      bolt(state, fake, a, { r: 4, speed: 240, dmgMul: 0.25, color: "#141414", lifeDist: 92, kind: "bullet" });
    }
  }

  function tankModeOf(u) {
    return u.fireMode || 0;
  }

  function updateMinions(state, dt) {
    var q = lead(state, "quartel");
    if (q && q.def.spawn) {
      q.spawnT = (q.spawnT || q.def.spawn) - dt;
      if (q.spawnT <= 0) {
        q.spawnT = q.def.spawn / (1 + 0.2 * Math.max(0, nKind(state, "quartel") - 1));
        var elites = 0;
        for (var ei = 0; ei < state.minions.length; ei++) if (state.minions[ei].kind === "elite") elites++;
        if (elites < 4) {
          state.minions.push({
            kind: "elite",
            eliteClass: "recruta",
            x: q.x + (Math.random() - 0.5) * 18,
            y: q.y + (Math.random() - 0.5) * 18,
            hp: 70,
            maxHp: 70,
            size: 11,
            t: 999,
            aliveT: 0,
            vx: 0,
            vy: 0,
            cooldown: 0.2,
            fire: 1.05,
            dmg: 14,
            range: 170,
            lure: true,
            def: { size: 11, dmg: 14, projectile: "bullet", range: 170 },
            team: "player"
          });
          state.floaters.push(G.createFloater(q.x, q.y - 18, "recruta de elite", "#9ad4ff"));
        }
      }
    }
    for (var i = state.minions.length - 1; i >= 0; i--) {
      var m = state.minions[i];
      if (m.kind === "cart") {
        var coin = null;
        var best = 1e9;
        for (var d = 0; d < (state.drops || []).length; d++) {
          var drop = state.drops[d];
          if (drop.kind !== "coin") continue;
          var dd = hypot(drop.x - m.x, drop.y - m.y);
          if (dd < best) {
            best = dd;
            coin = drop;
          }
        }
        if (coin) {
          var ca = Math.atan2(coin.y - m.y, coin.x - m.x);
          m.vx = Math.cos(ca) * 280;
          m.vy = Math.sin(ca) * 280;
          if (best < 16) {
            state.run.coins += coin.value || 1;
            G.audio.coin();
            state.floaters.push(G.createFloater(coin.x, coin.y, "+" + (coin.value || 1), "#ffd24a"));
            state.drops.splice(state.drops.indexOf(coin), 1);
          }
        } else {
          var roam = Math.atan2((state.squad.y || 0) - m.y, (state.squad.x || 0) - m.x);
          m.vx = Math.cos(roam) * 220;
          m.vy = Math.sin(roam) * 220;
        }
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        clampField(state, m);
        for (var ce = 0; ce < state.enemies.length; ce++) {
          var cen = state.enemies[ce];
          if (cen.hp <= 0) continue;
          if (hypot(cen.x - m.x, cen.y - m.y) > (cen.def.size || 10) + 12) continue;
          cen.cartHitCd = (cen.cartHitCd || 0) - dt;
          if (cen.cartHitCd <= 0) {
            cen.cartHitCd = 0.22;
            C().hurt(state, cen, Math.round(18 * C().dmgMul(state)), m.x, m.y, true);
            knockEnemy(state, cen, m.x, m.y, 12);
          }
        }
        m.t -= dt;
        if (m.hp <= 0 || m.t <= 0) {
          C().explode(state, m.x, m.y, 52, Math.round(36 * C().dmgMul(state)), "player");
          zone(state, { kind: "fire", x: m.x, y: m.y, r: 34, t: 5, dmg: 14 });
          state.minions.splice(i, 1);
        }
        continue;
      }
      if (m.kind === "mech_dog") {
        tickMechDog(state, m, dt, i);
        continue;
      }
      if (m.kind === "elite" || m.kind === "cmd_recruit") {
        m.aliveT = (m.aliveT || 0) + dt;
        if (m.kind === "elite" && !m.promoted && m.aliveT >= 16) {
          var promo = ["fuzileiro", "dualista", "batedor"][(Math.random() * 3) | 0];
          m.promoted = true;
          m.eliteClass = promo;
          if (promo === "fuzileiro") {
            m.hp = m.maxHp = 95;
            m.dmg = 20;
            m.fire = 1.2;
            m.range = 240;
            m.size = 12;
          } else if (promo === "dualista") {
            m.hp = m.maxHp = 88;
            m.dmg = 16;
            m.fire = 2.0;
            m.range = 190;
            m.size = 12;
          } else {
            m.hp = m.maxHp = 78;
            m.dmg = 15;
            m.fire = 1.35;
            m.range = 180;
            m.size = 11;
          }
          m.def = { size: m.size, dmg: m.dmg, projectile: "bullet", range: m.range };
          state.floaters.push(G.createFloater(m.x, m.y - 18, "promovido", "#ffd24a"));
          G.burst(state, m.x, m.y, "#ffd24a", 12, 80);
        }
        var tgt = C().nearest(state.enemies, m.x, m.y);
        if (tgt) {
          var ta = angTo(m, tgt);
          var td = hypot(tgt.x - m.x, tgt.y - m.y);
          if (td > 70) {
            m.vx = Math.cos(ta) * 95;
            m.vy = Math.sin(ta) * 95;
          } else {
            m.vx *= 0.7;
            m.vy *= 0.7;
          }
          m.cooldown -= dt;
          if (m.cooldown <= 0 && td < (m.range || 170)) {
            m.cooldown = 1 / Math.max(0.4, m.fire || 1);
            bolt(state, m, ta, { r: 3, speed: 400, kind: "bullet" });
          }
        } else {
          m.vx *= 0.85;
          m.vy *= 0.85;
        }
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        clampField(state, m);
        if (m.hp <= 0) state.minions.splice(i, 1);
        continue;
      }
      var p = aim(state);
      var a2 = angTo(m, p);
      m.vx = Math.cos(a2) * 210;
      m.vy = Math.sin(a2) * 210;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.t -= dt;
      if (m.hp <= 0 || m.t <= 0) state.minions.splice(i, 1);
    }
  }

  function updateDeploys(state, dt) {
    var teslaAlive = has(state, "tesla");
    var teslaN = nKind(state, "tesla");
    for (var i = state.deploys.length - 1; i >= 0; i--) {
      var t = state.deploys[i];
      if (t.retiring) {
        if (tickRetire(t, dt)) state.deploys.splice(i, 1);
        continue;
      }
      if (t.kind === "coil_tower") {
        if (!teslaAlive && !t.pack) {
          beginRetire(state, t, 0.55);
          continue;
        }
        if (t.pack) {
          t.t -= dt;
          if (t.t <= 0 || t.hp <= 0) {
            beginRetire(state, t, 0.55);
            continue;
          }
        }
        var coilsNow = listCoils(state);
        var paired = false;
        for (var pi = 0; pi < coilsNow.length; pi++) {
          var otherC = coilsNow[pi];
          if (otherC === t) continue;
          if (hypot(otherC.x - t.x, otherC.y - t.y) <= 300) {
            paired = true;
            break;
          }
        }
        t.linked = paired;
        if (t.pack) {
          t.battery = 1;
        } else if (!t.fed) {
          var drain = 0.11 * dt * (paired ? 0.5 : 1);
          t.battery = Math.max(0, (t.battery || 0) - drain);
        }
        var energized = (t.battery || 0) > 0.02;
        t.fed = false;
        t.zaps = [];
        if (!energized) {
          t.fieldHit = {};
          t.fieldTick = 0;
          continue;
        }
        var fieldR = t.fieldR || t.range || 128;
        var dps = (t.dmg || 26) * C().dmgMul(state) * 1.15;
        dps *= 1 + 0.22 * Math.max(0, teslaN - 1);
        if ((t.battery || 0) > 0.5) dps *= 1.7;
        var tick = Math.max(dps * dt, dps / 40);
        var sparks = [];
        var fieldHit = {};
        for (var ei = 0; ei < state.enemies.length; ei++) {
          var en = state.enemies[ei];
          if (en.hp <= 0) continue;
          var ed = hypot(en.x - t.x, en.y - t.y);
          if (ed > fieldR + (en.def.size || 10)) continue;
          applyJolt(state, en, tick, t.x, t.y);
          fieldHit[en.id] = 1;
          sparks.push({ x: en.x, y: en.y, d: ed });
        }
        t.fieldHit = fieldHit;
        t.fieldTick = tick;
        sparks.sort(function (a, b) { return a.d - b.d; });
        t.zaps = sparks.slice(0, 2);
        continue;
      }
      if (t.airborne && t.toss) {
        var to = t.toss;
        to.t += dt;
        var k = Math.min(1, to.t / Math.max(0.08, to.dur));
        var ease = k * k * (3 - 2 * k);
        to.x = to.x0 + (to.tx - to.x0) * ease;
        to.y = to.y0 + (to.ty - to.y0) * ease;
        to.z = 4 * k * (1 - k) * to.peak;
        to.spin = k * Math.PI * 4.8;
        if (state.particles && Math.random() < 0.7) {
          var trailAng = Math.atan2(to.ty - to.y0, to.tx - to.x0);
          state.particles.push({
            x: to.x + (Math.random() - 0.5) * 8,
            y: to.y - to.z + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 28,
            vy: 12 + Math.random() * 28,
            life: 0.2,
            max: 0.2,
            size: 2.2 + Math.random() * 2.2,
            color: t.color || "#c8b45a",
            streak: true,
            ang: trailAng
          });
        }
        if (k >= 1) {
          t.x = to.tx;
          t.y = to.ty;
          t.toss = null;
          t.airborne = false;
          t.landSquash = 1;
          t.cooldown = Math.max(t.cooldown || 0, 0.2);
          G.burst(state, t.x, t.y, t.color || "#c8b45a", 16, 110);
          G.burst(state, t.x, t.y, "#fff4c4", 8, 55);
          if (t.label) state.floaters.push(G.createFloater(t.x, t.y - 16, t.label, t.color || "#c8b45a"));
          if (G.audio && G.audio.thud) G.audio.thud();
          else if (G.audio && G.audio.hit) G.audio.hit();
        }
        continue;
      }
      if (t.landSquash) t.landSquash = Math.max(0, t.landSquash - dt * 5.4);
      t.t -= dt;
      t.cooldown -= dt;
      if (t.kind !== "shield_gen" && !t.immortal) {
        for (var ei2 = 0; ei2 < state.enemies.length; ei2++) {
          var en2 = state.enemies[ei2];
          if (en2.hp <= 0) continue;
          if (hypot(en2.x - t.x, en2.y - t.y) > (en2.def.size || 10) + (t.size || 14)) continue;
          t.hp -= (en2.def.dmg || 12) * dt * 0.85;
        }
      }
      if (t.hp <= 0 || t.t <= 0) {
        beginRetire(state, t, t.kind === "megaphone" || t.kind === "shield_gen" ? 0.64 : 0.56);
        continue;
      }
      if (t.kind === "shield_gen") {
        tickShieldGen(state, t, dt);
        continue;
      }
      if (t.kind === "megaphone") {
        tickMegaphone(state, t, dt);
        continue;
      }
      if (t.kind !== "turret" || t.cooldown > 0) continue;
      if (t.variant === "flame") {
        t.cooldown = 1 / Math.max(0.4, t.fire || 6);
        t.spin = (t.spin || 0) + 0.38;
        var range = t.range || 110;
        var fake = {
          x: t.x,
          y: t.y,
          def: { dmg: t.dmg || 10, projectile: "flame", range: range },
          kind: "torreta",
          marked: 0,
          id: -8
        };
        var jets = 8;
        var spd = 240;
        for (var fj = 0; fj < jets; fj++) {
          var fang = (t.spin || 0) + (Math.PI * 2 * fj) / jets;
          bolt(state, fake, fang, {
            kind: "flame",
            r: 7,
            speed: spd,
            life: range / spd,
            pierce: true,
            hitsLeft: 4,
            dmgMul: 0.55,
            ox: Math.cos(fang) * 10,
            oy: Math.sin(fang) * 10,
            color: fj % 2 ? "#ff9a2a" : "#ffe060"
          });
        }
        if (state.particles) {
          for (var fp = 0; fp < 6; fp++) {
            var pang = Math.random() * Math.PI * 2;
            var psp = 70 + Math.random() * 90;
            state.particles.push({
              x: t.x + Math.cos(pang) * 8,
              y: t.y + Math.sin(pang) * 8,
              vx: Math.cos(pang) * psp,
              vy: Math.sin(pang) * psp,
              life: 0.28,
              max: 0.28,
              size: 4 + Math.random() * 5,
              color: Math.random() > 0.5 ? "#ff9a2a" : "#ffe060"
            });
          }
        }
        continue;
      }
      if (t.variant === "jolt") {
        var je = C().nearest(state.enemies, t.x, t.y);
        if (!je || hypot(je.x - t.x, je.y - t.y) > t.range) continue;
        t.cooldown = 1 / Math.max(0.3, t.fire || 3.2);
        t.spin = angTo(t, je);
        fireJoltChain(state, t, je, (t.dmg || 12) * C().dmgMul(state), 5);
        continue;
      }
      var e = C().nearest(state.enemies, t.x, t.y);
      if (!e || hypot(e.x - t.x, e.y - t.y) > t.range) continue;
      t.cooldown = 1 / Math.max(0.3, t.fire);
      var fake = { x: t.x, y: t.y, def: { dmg: t.dmg, projectile: t.variant === "mg" ? "bullet" : "cannon", range: t.range }, kind: "torreta", marked: 0, id: -8 };
      bolt(state, fake, angTo(t, e), { kind: t.variant === "mg" ? "bullet" : "cannon", r: t.variant === "mg" ? 3 : 6, speed: t.variant === "mg" ? 520 : 340 });
    }
  }

  function jaggedBolt(x0, y0, x1, y1, segs, jag, seed) {
    var pts = [{ x: x0, y: y0 }];
    var dx = x1 - x0;
    var dy = y1 - y0;
    var len = hypot(dx, dy) || 1;
    var nx = -dy / len;
    var ny = dx / len;
    segs = segs || Math.max(5, Math.round(len / 26));
    jag = jag == null ? 18 : jag;
    for (var i = 1; i < segs; i++) {
      var t = i / segs;
      var fall = Math.sin(t * Math.PI);
      var n = Math.sin((seed + i * 1.7) * 12.9898) * 43758.5453;
      n = n - Math.floor(n);
      var off = (n - 0.5) * 2 * jag * fall;
      pts.push({ x: x0 + dx * t + nx * off, y: y0 + dy * t + ny * off });
    }
    pts.push({ x: x1, y: y1 });
    return pts;
  }

  function makeTeslaBolt(x0, y0, x1, y1, seed, jagMul) {
    jagMul = jagMul || 1;
    var pts = jaggedBolt(x0, y0, x1, y1, 0, 22 * jagMul, seed || 1);
    var forks = [];
    var n = pts.length;
    if (n > 4) {
      var fi = 2 + Math.abs((seed * 3) | 0) % (n - 3);
      var a = Math.atan2(y1 - y0, x1 - x0) + (seed % 2 ? 0.95 : -0.95);
      var fl = 28 + Math.abs(seed * 13) % 36;
      var fx = pts[fi].x + Math.cos(a) * fl;
      var fy = pts[fi].y + Math.sin(a) * fl;
      forks.push(jaggedBolt(pts[fi].x, pts[fi].y, fx, fy, 4, 10, seed + 2.1));
    }
    return { kind: "tesla", x0: x0, y0: y0, x1: x1, y1: y1, pts: pts, forks: forks, w: 3.2, color: "#c8ffff" };
  }

  function applyJolt(state, e, dmg, srcX, srcY) {
    if (!e || e.hp <= 0) return;
    C().hurt(state, e, dmg, srcX, srcY, true, { trueDmg: dmg < 1.2 });
    e.slowT = Math.max(e.slowT || 0, 0.28);
    e.joltT = 0.16;
    e.flash = Math.max(e.flash || 0, 0.1);
  }

  function pushJoltArc(state, bolt) {
    state.joltArcs = state.joltArcs || [];
    bolt.t = bolt.t || 0.16;
    state.joltArcs.push(bolt);
  }

  function tickJoltArcs(state, dt) {
    var list = state.joltArcs;
    if (!list) return;
    for (var i = list.length - 1; i >= 0; i--) {
      list[i].t -= dt;
      if (list[i].t <= 0) list.splice(i, 1);
    }
  }

  function fireJoltChain(state, src, first, dmg, jumps) {
    if (!first || first.hp <= 0) return;
    jumps = jumps || 5;
    var chainR = 168;
    var hit = {};
    var fromX = src.x;
    var fromY = src.y - 10;
    var cur = first;
    var seed = ((state.time || 0) * 17 + src.x) | 0;
    for (var n = 0; n < jumps && cur; n++) {
      var tick = dmg * (n === 0 ? 1 : Math.pow(0.78, n));
      applyJolt(state, cur, tick, fromX, fromY);
      var arc = makeTeslaBolt(fromX, fromY, cur.x, cur.y, seed + n * 3, 0.72);
      arc.t = 0.18;
      pushJoltArc(state, arc);
      hit[cur.id] = 1;
      fromX = cur.x;
      fromY = cur.y;
      var next = null;
      var best = chainR;
      for (var ei = 0; ei < state.enemies.length; ei++) {
        var en = state.enemies[ei];
        if (en.hp <= 0 || hit[en.id]) continue;
        var d = hypot(en.x - cur.x, en.y - cur.y);
        if (d < best) {
          best = d;
          next = en;
        }
      }
      cur = next;
    }
  }

  function listCoils(state) {
    var list = [];
    for (var i = 0; i < state.deploys.length; i++) {
      if (state.deploys[i].kind === "coil_tower" && !state.deploys[i].retiring) list.push(state.deploys[i]);
    }
    return list;
  }

  function joltAlongSeg(state, x0, y0, x1, y1, tick, hitMap) {
    var joltR = 58;
    hitMap = hitMap || {};
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0 || hitMap[e.id]) continue;
      if (distToSeg(e.x, e.y, x0, y0, x1, y1) > joltR + (e.def.size || 10)) continue;
      applyJolt(state, e, tick, x0, y0);
      hitMap[e.id] = 1;
    }
    return hitMap;
  }

  function shockSplash(state, hitMap, dmg) {
    if (!hitMap || dmg <= 0) return hitMap;
    var splashR = 72;
    var origins = {};
    for (var k in hitMap) origins[k] = 1;
    for (var i = 0; i < state.enemies.length; i++) {
      var o = state.enemies[i];
      if (o.hp <= 0 || hitMap[o.id]) continue;
      var from = null;
      var best = splashR + (o.def.size || 10);
      for (var j = 0; j < state.enemies.length; j++) {
        var src = state.enemies[j];
        if (!origins[src.id] || src.hp <= 0) continue;
        var d = hypot(o.x - src.x, o.y - src.y);
        if (d < best) {
          best = d;
          from = src;
        }
      }
      if (!from) continue;
      applyJolt(state, o, dmg * 0.55, from.x, from.y);
      state.beams.push(makeTeslaBolt(from.x, from.y, o.x, o.y, (state.time || 0) * 5 + i, 0.48));
      hitMap[o.id] = 1;
    }
    return hitMap;
  }

  function tickTeslaBattery(state, dt) {
    var teslas = [];
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp > 0 && u.kind === "tesla") teslas.push(u);
    }
    if (!teslas.length) return false;
    var leadU = teslas[0];
    for (var t = 1; t < teslas.length; t++) if (teslas[t].id < leadU.id) leadU = teslas[t];
    var batt = leadU.teslaBatt == null ? 1 : leadU.teslaBatt;
    var holding = !!(state.pointer && state.pointer.fireHold);
    if (holding) batt = Math.min(1, batt + 0.48 * dt);
    else if (batt > 0) batt = Math.max(0, batt - 0.15 * dt);
    for (var s = 0; s < teslas.length; s++) teslas[s].teslaBatt = batt;
    return holding || batt > 0.02;
  }

  function shareCoilBattery(ca, cb, dt) {
    var a = ca.battery || 0;
    var b = cb.battery || 0;
    var diff = a - b;
    if (Math.abs(diff) < 0.001) return;
    var xfer = Math.min(Math.abs(diff) * 0.5, 0.22 * dt);
    if (diff > 0) {
      ca.battery = a - xfer;
      cb.battery = b + xfer;
    } else {
      cb.battery = b - xfer;
      ca.battery = a + xfer;
    }
  }

  function updateBeams(state, dt) {
    state.beams = [];
    var tesla = lead(state, "tesla");
    var teslaOn = tickTeslaBattery(state, dt);
    var chainTick = tesla && teslaOn ? tesla.def.dmg * C().dmgMul(state) * 0.75 * dt : 0;
    var chainHit = {};
    var coils = listCoils(state);
    var chainR = 300;
    for (var a = 0; a < coils.length; a++) {
      for (var b = a + 1; b < coils.length; b++) {
        var ca = coils[a];
        var cb = coils[b];
        if (hypot(ca.x - cb.x, ca.y - cb.y) > chainR) continue;
        ca.linked = true;
        cb.linked = true;
        shareCoilBattery(ca, cb, dt);
        var aLive = (ca.battery || 0) > 0.02 || !!ca.pack;
        var bLive = (cb.battery || 0) > 0.02 || !!cb.pack;
        if (!aLive || !bLive) continue;
        state.beams.push(makeTeslaBolt(ca.x, ca.y - 16, cb.x, cb.y - 16, (state.time || 0) * 7 + a, 0.85));
        var pairTick = chainTick > 0 ? chainTick * 1.6 : (ca.dmg || 26) * C().dmgMul(state) * 0.55 * dt;
        joltAlongSeg(state, ca.x, ca.y, cb.x, cb.y, pairTick, chainHit);
      }
    }
    for (var ci = 0; ci < state.deploys.length; ci++) {
      var coil = state.deploys[ci];
      if (coil.kind !== "coil_tower" || coil.retiring) continue;
      if (coil.fieldHit && coil.fieldTick) shockSplash(state, coil.fieldHit, coil.fieldTick);
      if (!coil.zaps || !coil.zaps.length) continue;
      for (var zi = 0; zi < coil.zaps.length; zi++) {
        var zap = coil.zaps[zi];
        state.beams.push(makeTeslaBolt(coil.x, coil.y - 18, zap.x, zap.y, (state.time || 0) * 8 + ci + zi, 0.55));
      }
    }
    if (Object.keys(chainHit).length) shockSplash(state, chainHit, chainTick);
    if (teslaOn) beamUnit(state, "tesla", dt, 9, false);
    if ((has(state, "lanca_chamas") || has(state, "inferno")) && state.pointer && state.pointer.fireHold) meltCone(state);
  }

  function beamUnit(state, kind, dt, width, erase, drain, wipeWeak) {
    var u = lead(state, kind);
    if (!u) return;
    var p = aim(state);
    if (kind === "tesla") {
      teslaJoltBeam(state, u, p, dt);
      return;
    }
    state.beams.push({ kind: kind, x0: u.x, y0: u.y, x1: p.x, y1: p.y, w: width, color: u.def.color });
    var dps = u.def.dmg * C().dmgMul(state) * (kind === "colosso" ? 1.15 : 0.85);
    var tick = dps * dt;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0) continue;
      if (distToSeg(e.x, e.y, u.x, u.y, p.x, p.y) > width + (e.def.size || 10)) continue;
      C().hurt(state, e, tick, u.x, u.y, true, { trueDmg: tick < 3 });
      if (drain) healSquad(state, tick * 0.55);
      if (wipeWeak && !e.def.boss && e.maxHp < 90) e.hp = 0;
    }
    if (erase) eatShotsOnLine(state, u.x, u.y, p.x, p.y, width + 6);
  }

  function teslaJoltBeam(state, u, p, dt) {
    var range = u.def.range || 300;
    var chainR = 300;
    var dps = u.def.dmg * C().dmgMul(state) * (listCoils(state).length >= 2 ? 1.55 : 1);
    var tick = Math.max(dps * dt, dps / 36);
    var hit = {};
    var end = clampAim(u, p, range);
    state.beams.push(makeTeslaBolt(u.x, u.y, end.x, end.y, (state.time || 0) * 9.1, 1));
    joltAlongSeg(state, u.x, u.y, end.x, end.y, tick, hit);
    shockSplash(state, hit, tick);

    var coils = listCoils(state);
    var frontier = [];
    var seen = {};
    for (var d = 0; d < coils.length; d++) {
      var coil = coils[d];
      var nearTesla = hypot(coil.x - u.x, coil.y - u.y) <= range + 12;
      var nearBeam = distToSeg(coil.x, coil.y, u.x, u.y, end.x, end.y) <= (coil.fieldR || 128);
      if (!nearTesla && !nearBeam) continue;
      coil.fed = true;
      coil.battery = Math.min(1, (coil.battery || 0) + 0.7 * dt);
      frontier.push(coil);
      seen[coil.seq || coil.x] = 1;
    }
    while (frontier.length) {
      var from = frontier.pop();
      for (var c = 0; c < coils.length; c++) {
        var other = coils[c];
        var key = other.seq || other.x;
        if (seen[key] || other === from) continue;
        if (hypot(other.x - from.x, other.y - from.y) > chainR) continue;
        seen[key] = 1;
        other.fed = true;
        other.battery = Math.min(1, (other.battery || 0) + 0.55 * dt);
        frontier.push(other);
      }
    }
  }

  function meltCone(state, opt) {
    opt = opt || {};
    var u = opt.unit || lead(state, "inferno") || lead(state, "lanca_chamas");
    if (!u) return;
    var chance = opt.chance == null ? 0.1 : opt.chance;
    var all = chance >= 1;
    var a = opt.ang != null ? opt.ang : mouseAng(state, u);
    var range = (opt.range != null ? opt.range : u.def.range) * (1 + (state.run.flame || 0) * 0.12);
    var cone = 0.38;
    for (var i = state.projectiles.length - 1; i >= 0; i--) {
      var p = state.projectiles[i];
      if (p.team !== "enemy") continue;
      if (p.kind === "laser" || p.kind === "missile") continue;
      var dx = p.x - u.x;
      var dy = p.y - u.y;
      var d = hypot(dx, dy);
      if (d > range || d < 1) continue;
      var ang = Math.atan2(dy, dx);
      var diff = Math.abs(Math.atan2(Math.sin(ang - a), Math.cos(ang - a)));
      if (diff >= cone) continue;
      if (!all) {
        if (p.meltTried) continue;
        p.meltTried = true;
        if (Math.random() >= chance) continue;
      }
      G.burst(state, p.x, p.y, all ? "#fff4c8" : "#ff9a2a", all ? 8 : 5, all ? 80 : 42);
      state.projectiles.splice(i, 1);
    }
  }

    var BUMPER_MAX = 7;
    var BUMPER_CD = 10;
    var BUMPER_REGEN = 5;
    var BUMPER_MERGE_MAX = 10;

  function hasBumper(state) {
    return hasAny(state, ["caminhao", "minitanque", "tanque", "quartel", "oficina", "colosso"]);
  }

  function tickTimedFlags(state, dt) {
    function decay(key, onEnd) {
      if ((state[key] || 0) <= 0) return;
      state[key] = Math.max(0, state[key] - dt);
      if (state[key] <= 0 && onEnd) onEnd();
    }
    decay("bannerMagnetT", function () { state.run.magnet = Math.max(0, (state.run.magnet || 0) - 80); });
    decay("bannerFreezeT", function () { if (!state.run._permFreeze) state.run.freeze = false; });
    decay("bannerFireT");
    decay("bannerGoldT", function () { state.run.gold = Math.max(0, (state.run.gold || 0) - 0.5); });
    decay("bannerKnockT", function () { if (!state.run._permKnock) state.run.knockback = false; });
    decay("coloOverT", function () {
      endColoBlade(state, "lâmina off");
    });
    if ((state.bannerFireT || 0) > 0) {
      zone(state, { kind: "fire", x: state.squad.x, y: state.squad.y, r: 22, t: 0.35, dmg: 10 });
    }
    tickAssassinHunt(state, dt);
  }

  function bumperCap(state) {
    if (hasAny(state, ["minitanque", "tanque", "quartel", "oficina", "colosso"])) return BUMPER_MERGE_MAX;
    return BUMPER_MAX;
  }

  function bumperGeom(state) {
    if (!hasBumper(state)) return null;
    var n = 0;
    var maxS = 14;
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0) continue;
      if (!u.commander) {
        n++;
        maxS = Math.max(maxS, u.def.size || 12);
      }
    }
    var ring = 34 + Math.max(0, n - 3) * 5;
    var r = ring + maxS + 16;
    return {
      x: state.squad.x,
      y: state.squad.y,
      r: r,
      inner: Math.max(18, r - 12),
      outer: r + 10
    };
  }

  function bumperUp(state) {
    ensure(state);
    return hasBumper(state) && (state.bumperCd || 0) <= 0 && (state.bumperHp || 0) > 0;
  }

  function tickBumper(state, dt) {
    ensure(state);
    if (!hasBumper(state)) {
      state.bumperHp = bumperCap(state);
      state.bumperCd = 0;
      state.bumperRegenT = 0;
      state.bumperMax = bumperCap(state);
      return;
    }
    var cap = bumperCap(state);
    if ((state.bumperMax || BUMPER_MAX) < cap && (state.bumperCd || 0) <= 0 && (state.bumperHp || 0) >= (state.bumperMax || BUMPER_MAX)) {
      state.bumperHp = cap;
    }
    state.bumperMax = cap;
    if (state.bumperCd > 0) {
      state.bumperCd -= dt;
      if (state.bumperCd <= 0) {
        state.bumperCd = 0;
        state.bumperHp = cap;
        state.bumperRegenT = 0;
        state.floaters.push(G.createFloater(state.squad.x, state.squad.y - 22, "escudo", "#9ad4ff"));
      }
      return;
    }
    if ((state.bumperHp || 0) > 0 && state.bumperHp < cap) {
      state.bumperRegenT = (state.bumperRegenT || 0) + dt;
      if (state.bumperRegenT >= BUMPER_REGEN) {
        state.bumperRegenT = 0;
        state.bumperHp = Math.min(cap, (state.bumperHp || 0) + 1);
        state.floaters.push(G.createFloater(state.squad.x, state.squad.y - 18, "+1 escudo", "#9ad4ff"));
      }
    } else {
      state.bumperRegenT = 0;
    }
  }

  function absorbBumper(state, p) {
    if (!p || p.team !== "enemy") return false;
    var gen = radioShieldAt(state, p.x, p.y);
    if (gen) {
      hitRadioShield(state, gen, p.x, p.y);
      return true;
    }
    if (!bumperUp(state)) return false;
    var g = bumperGeom(state);
    if (!g) return false;
    var d = hypot(p.x - g.x, p.y - g.y);
    if (d > g.outer) return false;
    G.burst(state, p.x, p.y, "#9ad4ff", 5, 50);
    bumpBumper(state);
    return true;
  }

  function bumpBumper(state) {
    if (!bumperUp(state)) return false;
    state.bumperHp = Math.max(0, (state.bumperHp || bumperCap(state)) - 1);
    if (state.bumperHp <= 0) {
      state.bumperHp = 0;
      state.bumperCd = BUMPER_CD;
      state.bumperRegenT = 0;
      state.floaters.push(G.createFloater(state.squad.x, state.squad.y - 24, "escudo quebrado", "#7aa0c8"));
    }
    return true;
  }

  function bumperMeleeHit(state, enemy) {
    if (!bumperUp(state) || !enemy) return;
    var now = state.time || 0;
    if ((enemy.bumperHitT || 0) > now) return;
    enemy.bumperHitT = now + 0.32;
    G.burst(state, enemy.x, enemy.y, "#9ad4ff", 6, 40);
    bumpBumper(state);
  }

  function shieldPhysics(state) {
    if (!bumperUp(state)) return;
    var g = bumperGeom(state);
    if (!g) return;
    var i;
    for (i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || u.held || u.stowed || u.commander) continue;
      var udx = u.x - g.x;
      var udy = u.y - g.y;
      var ud = hypot(udx, udy) || 0.001;
      var umax = Math.max(8, g.r - (u.def.size || 12) - 2);
      if (ud > umax) {
        u.x = g.x + (udx / ud) * umax;
        u.y = g.y + (udy / ud) * umax;
      }
    }
    for (i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0 || e.def.kind === "orbit_shield") continue;
      var edx = e.x - g.x;
      var edy = e.y - g.y;
      var ed = hypot(edx, edy) || 0.001;
      var emin = g.r + (e.def.size || 12) + 2;
      if (ed < emin) {
        bumperMeleeHit(state, e);
        e.x = g.x + (edx / ed) * emin;
        e.y = g.y + (edy / ed) * emin;
        G.clampPlay(e, state);
      }
    }
  }

  function eatForceWall(state, z) {
    var ca = Math.cos(z.ang || 0);
    var sa = Math.sin(z.ang || 0);
    var hw = (z.w || 150) / 2;
    var hh = (z.h || 18);
    for (var i = state.projectiles.length - 1; i >= 0; i--) {
      var p = state.projectiles[i];
      if (p.team !== "enemy") continue;
      var lx = p.x - z.x;
      var ly = p.y - z.y;
      var localX = lx * ca + ly * sa;
      var localY = -lx * sa + ly * ca;
      if (Math.abs(localX) > hw || Math.abs(localY) > hh) continue;
      healSquad(state, p.dmg || 8);
      G.burst(state, p.x, p.y, "#c86a3a", 6, 40);
      state.projectiles.splice(i, 1);
    }
  }

  function eatShotsOnLine(state, x0, y0, x1, y1, w) {
    for (var i = state.projectiles.length - 1; i >= 0; i--) {
      var p = state.projectiles[i];
      if (p.team !== "enemy") continue;
      if (distToSeg(p.x, p.y, x0, y0, x1, y1) < w) state.projectiles.splice(i, 1);
    }
  }

  function eatEnemyShots(state, x, y, r, reload) {
    var n = 0;
    for (var i = state.projectiles.length - 1; i >= 0; i--) {
      var p = state.projectiles[i];
      if (p.team !== "enemy") continue;
      if (hypot(p.x - x, p.y - y) > r) continue;
      state.projectiles.splice(i, 1);
      n++;
    }
    if (reload && n && has(state, "tanque")) {
      var t = lead(state, "tanque");
      if (t) t.cooldown = 0;
    }
    return n;
  }

  function updateZones(state, dt) {
    var still = hypot(state.squad.vx || 0, state.squad.vy || 0) < 28;
    for (var i = state.zones.length - 1; i >= 0; i--) {
      var z = state.zones[i];
      if (z.retiring) {
        if (tickRetire(z, dt)) {
          if (z.kind === "phalanx") releasePhalanxActive(state);
          if (z.kind === "standard") {
            for (var bi = 0; bi < state.units.length; bi++) {
              var bu = state.units[bi];
              if (bu.hp <= 0 || !bu.def.active) continue;
              if (bu.def.active.id !== "standard" && bu.def.active.id !== "magnet") continue;
              bu.activeHeld = false;
              bu.activeCd = bu.def.active.cd || 12;
            }
          }
          state.zones.splice(i, 1);
        }
        continue;
      }
      if (z.kind === "cmd_aura") {
        var host = lead(state, "comandante");
        if (!host || host.hp <= 0) {
          z.t = 0;
        } else {
          z.x = host.x;
          z.y = host.y;
          healAlliesPct(state, (z.healPct || 0.02) * dt, z.x, z.y, z.r);
        }
      }
      if (z.kind === "obsmark" && z.followId) {
        var fol = null;
        for (var oi = 0; oi < state.enemies.length; oi++) {
          if (state.enemies[oi].id === z.followId && state.enemies[oi].hp > 0) fol = state.enemies[oi];
        }
        if (fol) {
          z.x = fol.x;
          z.y = fol.y;
        }
        for (var om = 0; om < state.enemies.length; om++) {
          var ome = state.enemies[om];
          if (ome.hp <= 0) continue;
          if (hypot(ome.x - z.x, ome.y - z.y) <= z.r + (ome.def.size || 12)) ome.obsMarkT = Math.max(ome.obsMarkT || 0, z.t);
        }
      }
      if (z.kind === "anchor") {
        z.x += (state.squad.x - z.x) * Math.min(1, dt * 1.15);
        z.y += (state.squad.y - z.y) * Math.min(1, dt * 1.15);
      }
      if (z.kind === "blackhole") {
        if (z.t <= 0.78 && !z.collapseFx) {
          z.collapseFx = true;
        }
        if (z.t <= 0.18 && !z.flashFx) {
          z.flashFx = true;
          G.burst(state, z.x, z.y, "#ffffff", 16, 60);
          G.burst(state, z.x, z.y, "#e8f4ff", 8, 36);
        }
        if (z.t > 0.78) {
          for (var bh = 0; bh < state.enemies.length; bh++) {
            var be = state.enemies[bh];
            if (be.hp <= 0 || be.scenery) continue;
            var bdx = z.x - be.x;
            var bdy = z.y - be.y;
            var bd = hypot(bdx, bdy);
            if (bd > z.r + (be.def.size || 10) || bd < 1) continue;
            var pull = 220 * dt;
            be.x += (bdx / bd) * pull;
            be.y += (bdy / bd) * pull;
            C().hurt(state, be, (z.dmg || 24) * dt, z.x, z.y, true, { trueDmg: true });
          }
        }
      }
      if (z.kind === "bubble") {
        for (var bb = 0; bb < state.enemies.length; bb++) {
          var bbe = state.enemies[bb];
          if (bbe.hp <= 0 || bbe.scenery || bbe.def.kind === "orbit_shield") continue;
          var bbd = hypot(bbe.x - z.x, bbe.y - z.y) || 0.001;
          var minR = z.r + (bbe.def.size || 10);
          if (bbd < minR) {
            bbe.x = z.x + ((bbe.x - z.x) / bbd) * minR;
            bbe.y = z.y + ((bbe.y - z.y) / bbd) * minR;
            G.clampPlay(bbe, state);
          }
        }
      }
      if (z.kind === "forcewall") {
        eatForceWall(state, z);
      }
      if (z.kind === "phalanx") {
        tickPhalanxRing(state, z, dt);
      }
      z.t -= dt;
      if (z.kind === "crate" && z.falling) {
        z.falling -= dt;
        if (z.falling <= 0) {
          C().explode(state, z.x, z.y, 48, z.dmg || 36, "player");
          var hpN = z.hpN != null ? z.hpN : 2;
          if (hpN <= 1) {
            state.drops.push(G.createDrop(z.x, z.y, "hp", { value: 18 }));
          } else {
            state.drops.push(G.createDrop(z.x - 10, z.y, "hp", { value: 18 }));
            state.drops.push(G.createDrop(z.x + 10, z.y, "hp", { value: 18 }));
          }
          z.falling = 0;
          z.t = 0;
        }
      }
      if (z.kind === "supply_drop" && z.falling) {
        z.falling -= dt;
        if (z.falling <= 0) {
          z.falling = 0;
          openSupplyCrate(state, z);
          z.t = 0;
        }
      }
      if (z.kind === "heal") {
        if (!z.toxin && still && hypot(state.squad.x - z.x, state.squad.y - z.y) < z.r) {
          healSquad(state, z.heal * dt);
        }
        for (var he = 0; he < state.enemies.length; he++) {
          var hen = state.enemies[he];
          if (hen.hp <= 0) continue;
          if (hypot(hen.x - z.x, hen.y - z.y) < z.r + (hen.def.size || 10)) {
            hen.slowT = Math.max(hen.slowT || 0, z.toxin ? 0.7 : 0.45);
          }
        }
      }
      if (z.kind === "crack" && z.foeSlow) {
        for (var crk = 0; crk < state.enemies.length; crk++) {
          var cre = state.enemies[crk];
          if (cre.hp <= 0 || cre.scenery) continue;
          if (hypot(cre.x - z.x, cre.y - z.y) < (z.r || 80) + (cre.def.size || 10)) {
            cre.slowT = Math.max(cre.slowT || 0, 0.55);
          }
        }
      }
      if (z.kind === "fire") {
        for (var e = 0; e < state.enemies.length; e++) {
          var en = state.enemies[e];
          if (en.hp <= 0 || hypot(en.x - z.x, en.y - z.y) >= z.r) continue;
          C().hurt(state, en, z.dmg * dt, z.x, z.y, true, { trueDmg: true });
          if (z.fromInferno) {
            en.burnT = Math.max(en.burnT || 0, 2.4);
            en.burnDps = Math.max(en.burnDps || 0, z.dmg);
          }
        }
      }
      if (z.kind === "napalm" && !z.hurtPlayer) {
        for (var ne = 0; ne < state.enemies.length; ne++) {
          var nen = state.enemies[ne];
          if (nen.hp <= 0) continue;
          if (hypot(nen.x - z.x, nen.y - z.y) < z.r + (nen.def.size || 10)) {
            C().hurt(state, nen, (z.dmg || 12) * dt, z.x, z.y, true, { trueDmg: true });
          }
        }
      }
      if ((z.kind === "napalm" || z.kind === "acid") && z.hurtPlayer) {
        for (var pu = 0; pu < state.units.length; pu++) {
          var un = state.units[pu];
          if (un.hp <= 0 || un.stowed) continue;
          if (hypot(un.x - z.x, un.y - z.y) < z.r + (un.def.size || 10)) {
            C().hurt(state, un, (z.dmg || 14) * dt, z.x, z.y, false, { trueDmg: true });
            if (z.kind === "acid") un.poisonT = Math.max(un.poisonT || 0, 1.2);
          }
        }
      }
      if (z.kind === "moon_burn" || (z.kind === "moon_spot" && z.hurtPlayer)) {
        for (var mu = 0; mu < state.units.length; mu++) {
          var mun = state.units[mu];
          if (mun.hp <= 0 || mun.stowed) continue;
          if (hypot(mun.x - z.x, mun.y - z.y) < z.r + (mun.def.size || 10)) {
            C().hurt(state, mun, (z.dmg || 14) * dt, z.x, z.y, false, { trueDmg: true });
            var wasM = mun.exposedT || 0;
            mun.exposedT = Math.max(wasM, 4);
            if (wasM <= 0.2) state.floaters.push(G.createFloater(mun.x, mun.y - 12, "exposto", "#ffe08a"));
          }
        }
      }
      if (z.kind === "honey") {
        if (z.ripe != null) {
          z.ripe -= dt;
          if (z.ripe <= 0) z.liquid = true;
        }
        if (hypot(state.squad.x - z.x, state.squad.y - z.y) < z.r) {
          state.honeyT = Math.max(state.honeyT || 0, z.liquid ? 0.25 : 0.4);
          if (z.pin) state.honeyPin = Math.max(state.honeyPin || 0, 0.35);
        }
      }
      if (z.kind === "sandstorm" && hypot(state.squad.x - z.x, state.squad.y - z.y) < z.r + 20) {
        var px = z.x - state.squad.x;
        var py = z.y - state.squad.y;
        var pl = Math.hypot(px, py) || 1;
        state.squad.x += (px / pl) * (z.pull || 80) * dt;
        state.squad.y += (py / pl) * (z.pull || 80) * dt;
      }
      if (z.kind === "scrap" && hypot(state.squad.x - z.x, state.squad.y - z.y) < z.r) {
        healSquad(state, 28);
        G.burst(state, z.x, z.y, "#7a9aaa", 8, 50);
        state.floaters.push(G.createFloater(z.x, z.y - 12, "sucata", "#7a9aaa"));
        z.t = 0;
      }
      if (z.kind === "fluid" && hypot(state.squad.x - z.x, state.squad.y - z.y) < z.r) {
        state.run.tempDmg = Math.max(state.run.tempDmg || 1, 1.5);
        state.run.fluidT = 3;
        G.burst(state, z.x, z.y, "#ff8a2a", 10, 60);
        state.floaters.push(G.createFloater(z.x, z.y - 12, "fluido", "#ff8a2a"));
        z.t = 0;
      }
      if (z.kind === "coil" && hypot(state.squad.x - z.x, state.squad.y - z.y) < z.r) {
        state.run.coilHp = 48;
        state.run.coilT = 10;
        G.burst(state, z.x, z.y, "#a8f6ff", 12, 70);
        state.floaters.push(G.createFloater(z.x, z.y - 12, "bobina", "#a8f6ff"));
        z.t = 0;
      }
      if (z.t <= 0) {
        if (zoneRetires(z)) {
          beginRetire(state, z, z.kind === "phalanx" ? 0.7 : 0.55);
          continue;
        }
        if (z.kind === "phalanx") releasePhalanxActive(state);
        if (z.kind === "standard") {
          for (var bi = 0; bi < state.units.length; bi++) {
            var bu = state.units[bi];
            if (bu.hp <= 0 || !bu.def.active) continue;
            if (bu.def.active.id !== "standard" && bu.def.active.id !== "magnet") continue;
            bu.activeHeld = false;
            bu.activeCd = bu.def.active.cd || 12;
          }
        }
        state.zones.splice(i, 1);
      }
    }
  }

  function updateStickies(state, dt) {
    for (var i = state.stickies.length - 1; i >= 0; i--) {
      var s = state.stickies[i];
      var e = null;
      for (var j = 0; j < state.enemies.length; j++) if (state.enemies[j].id === s.eid && state.enemies[j].hp > 0) e = state.enemies[j];
      if (!e) {
        state.stickies.splice(i, 1);
        continue;
      }
      s.x = e.x;
      s.y = e.y;
      s.t -= dt;
      if (s.t <= 0) state.stickies.splice(i, 1);
    }
  }

  function reaperBasic(state, u, dt, firing) {
    if (u.held || u.stowed) return;
    u.scytheSpin = (u.scytheSpin || 0) + dt * (u.leap ? 18 : firing ? 6 : 2.4);
  }

  function playerShoot(state, dt) {
    if (state.stageOutro || (G.invasion && G.invasion.cinematic(state)) || state.timeLock) return;
    ensure(state);
    var firing = !!(state.pointer && state.pointer.fireHold);
    var sfx = false;

    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0) continue;
      u.cooldown -= dt;
      var kind = u.kind;
      if (kind === "ceifador") {
        reaperBasic(state, u, dt, firing);
        continue;
      }
      if (kind === "warlord") continue;
      if (u.def.projectile === "none" || u.def.fire <= 0) continue;
      if (kind === "quartel") continue;
      if (kind === "caminhao" || kind === "oficina" || kind === "comandante") continue;
      if (kind === "tesla" || kind === "colosso") continue;
      if (kind === "bombardeiro" || kind === "droneiro" || kind === "helicoptero" || kind === "recon") continue;
      if (kind === "bandeira") continue;
      if (!firing && kind !== "giratoria" && kind !== "torreta") continue;
      if (kind === "giratoria" && (state.girSpin || 0) < 2) continue;
      if (u.cooldown > 0) continue;
      var turretTgt = null;
      if (kind === "torreta") {
        turretTgt = C().nearest(state.enemies, u.x, u.y);
        if (!turretTgt || hypot(turretTgt.x - u.x, turretTgt.y - u.y) > u.def.range) continue;
      }

      var rate = C().fireMul(state);
      if ((kind === "fuzileiro" || kind === "designado") && state.pointer && state.pointer.fireHold) rate *= 1.65;
      if (kind === "giratoria") rate *= 1.8;
      if (u.veilFogT > 0) rate *= 0.55;
      u.cooldown = 1 / (u.def.fire * rate);

      var ang = mouseAng(state, u);
      if (kind === "torreta" && turretTgt) ang = angTo(u, turretTgt);
      if (kind === "helicoptero") {
        var delayed = delayedMouse(state, 0.5);
        ang = Math.atan2(delayed.y - u.y, delayed.x - u.x);
      }

      if (kind === "sniper") {
        var cd = hypot(aim(state).x - state.squad.x, aim(state).y - state.squad.y);
        bolt(state, u, ang, { pierce: true, hitsLeft: 8, lifeDist: 5000, dmgMul: 0.4 + Math.min(2.1, cd / 280), r: 4, homing: false });
      } else if (kind === "metralhador") {
        if ((state.mgFocusT || 0) > 0) {
          for (var fs = -2; fs <= 2; fs++) bolt(state, u, ang, { r: 2.5, speed: 430, dmgMul: 0.55, ox: Math.cos(ang + Math.PI / 2) * fs * 1.6, oy: Math.sin(ang + Math.PI / 2) * fs * 1.6 });
        } else {
          for (var s = -2; s <= 2; s++) bolt(state, u, ang + s * 0.16, { r: 2.5, speed: 400, dmgMul: 0.55 });
        }
      } else if (kind === "fuzileiro" || kind === "designado") {
        bolt(state, u, ang, { r: 3, lifeDist: kind === "designado" ? 5000 : undefined });
      } else if (kind === "observador") {
        var spot = C().nearest(state.enemies, aim(state).x, aim(state).y);
        bolt(state, u, ang, {
          homing: !!spot,
          homeId: spot ? spot.id : 0,
          r: 3.5,
          speed: 460,
          color: "#80e0ff",
          lifeDist: 5000
        });
      } else if (kind === "anti_material") {
        u.atmShots = (u.atmShots || 0) + 1;
        if (u.atmShots >= 7) {
          u.atmShots = 0;
          u.marked = 4;
          state.floaters.push(G.createFloater(u.x, u.y - 18, "marcado", "#3ec0ff"));
        }
        bolt(state, u, ang, {
          kind: "cannon",
          r: 6,
          speed: 400,
          pierce: true,
          hitsLeft: 8,
          eraseShots: true,
          color: "#141418",
          lifeDist: 5000
        });
      } else if (kind === "dualista") {
        var pair = ++state.pairSeq;
        var ox = Math.cos(ang + Math.PI / 2) * 5;
        var oy = Math.sin(ang + Math.PI / 2) * 5;
        bolt(state, u, ang, { ox: ox, oy: oy, pairId: pair });
        bolt(state, u, ang, { ox: -ox, oy: -oy, pairId: pair });
      } else if (kind === "engenheiro") {
        throwArc(state, u, aim(state), { kind: "mine", land: "mine", dmg: u.def.dmg });
      } else if (kind === "canhoneiro") {
        throwArc(state, u, aim(state), { kind: "grenade", land: "cluster", boomR: 40, r: 10, color: "#141414", cluster: true });
      } else if (kind === "medico") {
        throwArc(state, u, aim(state), { kind: "healshot", land: "puddle", dmg: Math.round(u.def.dmg * C().dmgMul(state)) });
      } else if (kind === "lanca_chamas" || kind === "inferno") {
        C().flameAt(state, u, aim(state));
      } else if (kind === "fora_da_lei") {
        for (var f = -4; f <= 4; f++) bolt(state, u, ang + f * 0.22, { r: 2.5, dmgMul: 0.42, lifeDist: 2000 });
      } else if (kind === "cirurgiao") {
        bolt(state, u, ang, { kind: "scalpel", r: 4, speed: 380, color: "#ffd0d0", bleed: true, lifeDist: 220 });
      } else if (kind === "revolver") {
        bolt(state, u, ang, { pierce: true, hitsLeft: 5, enemyBounce: 3, bounceMul: 3, r: 4, speed: 320, lifeDist: 820 });
      } else if (kind === "torreta") {
        bolt(state, u, ang, { kind: "cannon", r: 5, speed: 340 });
      } else if (kind === "saqueador") {
        bolt(state, u, ang, { stealShots: true, dmgMul: 0.55, r: 4 });
      } else if (kind === "sabotador") {
        bolt(state, u, ang, { sticky: true, kind: "grenade", r: 5, speed: 300 });
      } else if (kind === "missil") {
        var boss = null;
        for (var b = 0; b < state.enemies.length; b++) if (state.enemies[b].def.boss && state.enemies[b].hp > 0) boss = state.enemies[b];
        var overBoss = boss && hypot(aim(state).x - boss.x, aim(state).y - boss.y) < 70 && (state.mouseSpd || 0) < 90;
        var spread = (state.mouseSpd || 0) > 220;
        for (var mi = 0; mi < 5; mi++) {
          bolt(state, u, ang + (spread ? (mi - 2) * 0.28 : (mi - 2) * 0.06), {
            kind: "missile",
            homing: !spread,
            homeCursor: !spread,
            boomR: 36,
            orbitBoss: overBoss ? boss : null,
            spreadExplode: spread,
            r: 5,
            speed: 200,
            life: spread ? 0.55 : 2.2
          });
        }
      } else if (kind === "gunship") {
        bolt(state, u, ang, { homing: true, homeCursor: true, r: 3, speed: 480 });
      } else if (kind === "minitanque" || kind === "tanque") {
        var mode = u.fireMode || state.tankFireMode || 0;
        if (kind === "tanque" && mode === 2) {
          if (state.tankBarrageUsed) {
            u.cooldown = 0.35;
            continue;
          }
          state.tankBarrageUsed = true;
          u.barrageUsed = true;
          var bdmg = Math.round(160 * C().dmgMul(state));
          for (var be = 0; be < state.enemies.length; be++) {
            var ben = state.enemies[be];
            if (ben.hp > 0) C().hurt(state, ben, bdmg, u.x, u.y, true);
          }
          G.burst(state, u.x, u.y, "#7ad0ff", 28, 180);
          state.floaters.push(G.createFloater(u.x, u.y - 22, "barragem", "#7ad0ff"));
          G.audio.explosion();
        } else if (mode === 1 || (kind === "minitanque" && mode === 2)) {
          bolt(state, u, ang, { kind: "grenade", r: 11, speed: 300, boomR: 52, color: "#ffe08a" });
        } else {
          bolt(state, u, ang, { r: 7, speed: 440, color: "#d8f4ff" });
        }
      } else if (kind === "helicoptero") {
        bolt(state, u, ang, { r: 3, speed: 460 });
      } else if (kind === "radio") {
        var land = aim(state);
        var lx = land.x - u.x;
        var ly = land.y - u.y;
        var ld = hypot(lx, ly) || 1;
        var maxR = u.def.range || 150;
        if (ld > maxR) {
          land = { x: u.x + (lx / ld) * maxR, y: u.y + (ly / ld) * maxR };
        }
        throwArc(state, u, land, { kind: "crate", land: "boom", boomR: 42, r: 8, color: "#c48a3a", dur: 0.55 });
      } else if (kind === "mineiro") {
        var aimP = aim(state);
        for (var mn = 0; mn < 3; mn++) {
          var ox = (Math.random() - 0.5) * 36;
          var oy = (Math.random() - 0.5) * 36;
          throwArc(state, u, { x: aimP.x + ox, y: aimP.y + oy }, { kind: "mine", land: "mine", dmg: u.def.dmg, dur: 0.48 });
        }
      } else {
        bolt(state, u, ang, {});
      }
      if (u.doubleShotT > 0) bolt(state, u, ang + 0.08, {});
      if (state.run && state.run.dual) bolt(state, u, ang + 0.12, { dmgMul: 0.8 });
      sfx = true;
    }

    if (has(state, "comandante")) {
      var cmd = lead(state, "comandante");
      if (cmd && cmd.cooldown <= 0 && firing) {
        cmd.cooldown = 1 / (cmd.def.fire * C().fireMul(state));
        bolt(state, cmd, mouseAng(state, cmd), { r: 3, dmgMul: 0.85 });
        sfx = true;
      }
    }

    if (sfx) G.audio.shoot();
  }

  function onBulletHit(state, p, hit) {
    if (p.ownerKind === "recon" && hit.team === "enemy") {
      hit.reconMark = Math.min(15, (hit.reconMark || 0) + 1);
      hit.reconMarkT = 5;
      hit.reconDarts = hit.reconDarts || [];
      hit.reconDarts.push({
        color: p.tracerColor || p.color || "#8af0d8",
        ang: Math.random() * Math.PI * 2,
        off: (hit.def.size || 12) * (0.35 + Math.random() * 0.5)
      });
      if (hit.reconDarts.length > 12) hit.reconDarts.shift();
    }
    if ((state.suppressT || 0) > 0 && p.ownerKind === "fuzileiro" && hit.team === "enemy") {
      knockEnemy(state, hit, p.x, p.y, 18);
    }
    if (p.ownerKind === "assassino" && hit.team === "enemy") applySilence(state, hit);
    if (p.ownerKind === "fantasma" && hit.team === "enemy") tryShotFear(state, hit);
    if (p.ownerKind === "cirurgiao" && hit.team === "enemy") {
      hit.bleedT = 5;
      hit.bleedDps = Math.max(hit.bleedDps || 0, p.dmg * 0.91);
    }
    if ((p.kind === "flame" || p.burn) && hit.team === "enemy") {
      hit.burnT = 5;
      hit.burnDps = Math.max(hit.burnDps || 0, (p.dmg || 8) * 0.9);
    }
    if (p.ownerKind === "capelao" && hit.team === "enemy" && Math.random() < 0.34) {
      var blessed = lowest(state);
      if (blessed) {
        var healAmt = Math.max(8, Math.round(p.dmg * 1.4));
        blessed.hp = Math.min(blessed.maxHp, blessed.hp + healAmt);
        state.floaters.push(G.createFloater(blessed.x, blessed.y - 16, "+" + healAmt, "#f0e0a0"));
      }
    }
    if (p.ownerKind === "pistoleiro" && hit.team === "enemy" && Math.random() < 0.28) {
      state.drops.push(G.createDrop(hit.x, hit.y, "hp", { value: 14 }));
    }
    if (p.ownerKind === "medico" && hit.team === "enemy" && (hit.slowT || 0) > 0.05 && Math.random() < 0.28) {
      state.drops.push(G.createDrop(hit.x, hit.y, "hp", { value: 14 }));
    }
    if (p.pairId && hit.team === "enemy") {
      var key = p.pairId + ":" + hit.id;
      state.dualHits[key] = (state.dualHits[key] || 0) + 1;
      if (state.dualHits[key] >= 2) {
        var ally = lowest(state);
        if (ally) ally.hp = Math.min(ally.maxHp, ally.hp + p.dmg * 0.22);
        delete state.dualHits[key];
      }
    }
    if (p.sticky && hit.team === "enemy") {
      state.stickies.push({ eid: hit.id, x: hit.x, y: hit.y, dmg: Math.round(p.dmg * 1.6), t: 8 });
      return true;
    }
    return false;
  }

  function preProjectiles(state, dt) {
    ensure(state);
    var lure = null;
    for (var z = 0; z < state.zones.length; z++) if (state.zones[z].kind === "lure") lure = state.zones[z];
    var b = G.playfield(state);

    for (var i = state.projectiles.length - 1; i >= 0; i--) {
      var p = state.projectiles[i];
      if (p.arc) {
        var ar = p.arc;
        ar.t += dt;
        var k = Math.min(1, ar.t / ar.dur);
        p.x = ar.x0 + (ar.tx - ar.x0) * k;
        p.y = ar.y0 + (ar.ty - ar.y0) * k;
        ar.z = 4 * k * (1 - k) * 70;
        p.z = ar.z;
        if (k >= 1) {
          if (ar.land === "mine") {
            var eng = lead(state, "engenheiro") || lead(state, "mineiro") || { def: { dmg: 22 }, kind: "engenheiro" };
            plantMineAt(state, eng, ar.tx, ar.ty);
          } else if (ar.land === "puddle") {
            splashMedicFlask(state, p, ar.tx, ar.ty);
            placePuddle(state, ar.tx, ar.ty, 40, 0, 4.8);
          } else if (ar.land === "buckshot") {
            fireBucknade(state, p, ar.tx, ar.ty);
          } else if (ar.land === "blackhole") {
            C().explode(state, ar.tx, ar.ty, 80, p.dmg, p.team, "#7ad8ff");
            G.burst(state, ar.tx, ar.ty, "#c060ff", 16, 150);
            G.burst(state, ar.tx, ar.ty, "#ffd080", 10, 90);
            zone(state, { kind: "blackhole", x: ar.tx, y: ar.ty, r: 300, t: 2.38, max: 2.38, dmg: p.dmg, seed: Math.random() * 80 });
          } else {
            C().explode(state, ar.tx, ar.ty, p.boomR || 62, p.dmg, p.team);
            if (p.cluster || ar.land === "cluster") spawnCluster(state, ar.tx, ar.ty, p.dmg);
          }
          state.projectiles.splice(i, 1);
        }
        continue;
      }
      if (p.orbitBoss && p.orbitBoss.hp > 0) {
        var ob = p.orbitBoss;
        var oa = Math.atan2(p.y - ob.y, p.x - ob.x) + dt * 4;
        var orad = hypot(p.x - ob.x, p.y - ob.y);
        orad = Math.max(18, orad - 40 * dt);
        p.x = ob.x + Math.cos(oa) * orad;
        p.y = ob.y + Math.sin(oa) * orad;
        if (orad < 22) {
          C().explode(state, ob.x, ob.y, p.boomR || 40, p.dmg, p.team);
          state.projectiles.splice(i, 1);
        }
        continue;
      }
      if (p.spreadExplode && p.life < 0.08) {
        C().explode(state, p.x, p.y, 34, p.dmg, p.team);
        state.projectiles.splice(i, 1);
        continue;
      }
      if (p.boomOnCursor && p.team === "player") {
        var apc = aim(state);
        if (hypot(p.x - apc.x, p.y - apc.y) < 22) {
          C().explode(state, p.x, p.y, p.boomR || 80, p.dmg, p.team);
          state.projectiles.splice(i, 1);
          continue;
        }
      }
      if (p.eraseShots) eatEnemyShots(state, p.x, p.y, (p.r || 6) + 10, false);
      if (p.stealShots) {
        var stole = eatEnemyShots(state, p.x, p.y, (p.r || 4) + 8, false);
        if (stole) {
          healSquad(state, 7 * stole);
          state.floaters.push(G.createFloater(p.x, p.y, "roubo", "#c86a3a"));
          state.projectiles.splice(i, 1);
          continue;
        }
      }
      if (p.wallBounce > 0) {
        var bounced = false;
        if (p.x < b.x0 || p.x > b.x1) {
          p.vx *= -1;
          p.x = Math.max(b.x0, Math.min(b.x1, p.x));
          bounced = true;
        }
        if (p.y < b.y0 || p.y > b.y1) {
          p.vy *= -1;
          p.y = Math.max(b.y0, Math.min(b.y1, p.y));
          bounced = true;
        }
        if (bounced) {
          p.wallBounce--;
          p.dmg = Math.round(p.dmg * (p.bounceMul || 3));
          p.life = Math.max(p.life, 0.5);
          if (p.kind === "colo_fist") {
            p.hitIds = {};
            p.fistAng = Math.atan2(p.vy, p.vx);
            G.burst(state, p.x, p.y, "#7af7ff", 8, 70);
            if (p.coloRico != null) {
              p.coloRico--;
              if (p.coloRico <= 0) {
                p.wallBounce = 0;
                p.enemyBounce = 0;
              }
            }
          }
        }
      }
      if (lure && p.team === "enemy" && p.homing) {
        var lx = lure.x - p.x;
        var ly = lure.y - p.y;
        var ll = hypot(lx, ly) || 1;
        var sp = hypot(p.vx, p.vy) || 220;
        p.vx = p.vx * 0.7 + (lx / ll) * sp * 0.3;
        p.vy = p.vy * 0.7 + (ly / ll) * sp * 0.3;
      }
      if (state.phaseOn && p.team === "enemy" && p.homing) {
        p.homing = false;
      }
    }

    for (var m = 0; m < state.minions.length; m++) {
      var bait = state.minions[m];
      for (var pi = state.projectiles.length - 1; pi >= 0; pi--) {
        var ep = state.projectiles[pi];
        if (ep.team !== "enemy") continue;
        if (hypot(ep.x - bait.x, ep.y - bait.y) < bait.size + (ep.r || 3)) {
          if (!bait.immortal) bait.hp -= ep.dmg || 8;
          else G.burst(state, ep.x, ep.y, "#ffe08a", 4, 36);
          state.projectiles.splice(pi, 1);
        }
      }
    }
  }

  function tickConfuse(state, e, dt) {
    if (!e || e.hp <= 0) return false;
    if (fearImmuneKind(e)) return false;
    if (inSmoke(state, e) && (e.enrageT || 0) <= 0 && !e.enrageLock) {
      e.enrageT = 3;
      e.enrageLock = true;
    }
    if (!inSmoke(state, e)) e.enrageLock = false;
    if ((e.enrageT || 0) > 0) {
      e.enrageT -= dt;
      var prey = null;
      var best = 1e9;
      for (var ri = 0; ri < state.enemies.length; ri++) {
        var o = state.enemies[ri];
        if (o.id === e.id || o.hp <= 0 || o.scenery) continue;
        var rd = hypot(o.x - e.x, o.y - e.y);
        if (rd < best) {
          best = rd;
          prey = o;
        }
      }
      if (prey) {
        var ea = Math.atan2(prey.y - e.y, prey.x - e.x);
        var spd = (e.def.speed || 60) * 1.35;
        e.x += Math.cos(ea) * spd * dt;
        e.y += Math.sin(ea) * spd * dt;
        e.rot = ea;
        e.allyHitCd = (e.allyHitCd || 0) - dt;
        if (best < (e.def.size || 10) + (prey.def.size || 10) + 4 && e.allyHitCd <= 0) {
          e.allyHitCd = 0.28;
          C().hurt(state, prey, Math.max(10, Math.round((e.def.dmg || 12) * 0.7)), e.x, e.y);
        }
      }
      G.clampPlay(e, state);
      return true;
    }
    if (inSmoke(state, e) && (e.confuseT || 0) <= 0 && !e.confuseLock) {
      applyFear(state, e, 3);
      e.confuseLock = true;
    }
    if (!inSmoke(state, e)) e.confuseLock = false;
    if ((e.confuseT || 0) <= 0) return false;
    e.confuseT -= dt;
    var spd = (e.def.speed || 60) * 1.08;
    e.x += Math.cos(e.confuseAng) * spd * dt;
    e.y += Math.sin(e.confuseAng) * spd * dt;
    e.rot = e.confuseAng;
    e.allyHitCd = (e.allyHitCd || 0) - dt;
    for (var i = 0; i < state.enemies.length; i++) {
      var o = state.enemies[i];
      if (o.id === e.id || o.hp <= 0 || o.scenery) continue;
      var dx = o.x - e.x;
      var dy = o.y - e.y;
      var d = hypot(dx, dy);
      var min = (e.def.size || 10) + (o.def.size || 10) + 2;
      if (d >= min) continue;
      if (d < 0.001) d = 0.001;
      var nx = dx / d;
      var ny = dy / d;
      var push = (min - d) / 2;
      e.x -= nx * push;
      e.y -= ny * push;
      o.x += nx * push;
      o.y += ny * push;
      if (e.allyHitCd <= 0) {
        e.allyHitCd = 0.32;
        C().hurt(state, o, Math.max(8, Math.round((e.def.dmg || 12) * 0.5)), e.x, e.y);
      }
    }
    G.clampPlay(e, state);
    return true;
  }

  function enemyTarget(state, e) {
    var best = null;
    var bestD = 1e9;
    for (var i = 0; i < (state.minions || []).length; i++) {
      var m = state.minions[i];
      if (m.hp <= 0) continue;
      var taunt = m.kind === "elite" || m.kind === "cmd_recruit" || (m.kind === "mech_dog" && (m.lureT || 0) > 0);
      if (!taunt) continue;
      var d = hypot(m.x - e.x, m.y - e.y);
      if (m.kind === "mech_dog") d *= 0.52;
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
    return best;
  }

  function enemyAim(state, e, target) {
    if ((e.confuseT || 0) > 0) {
      return {
        x: e.x + Math.cos(e.confuseAng || 0) * 140,
        y: e.y + Math.sin(e.confuseAng || 0) * 140,
        def: { size: 12 },
        hp: 1,
        id: -3,
        dummy: true
      };
    }
    if (inSmoke(state, e)) {
      var a = Math.random() * Math.PI * 2;
      return { x: e.x + Math.cos(a) * 80, y: e.y + Math.sin(a) * 80, def: { size: 12 }, hp: 1, id: -3, dummy: true };
    }
    return target;
  }

  function stealableEnemy(e) {
    if (!e || e.hp <= 0 || e.stolen) return false;
    if (e.def && e.def.boss) return false;
    if (e.fake || e.decoy) return false;
    var k = e.def && e.def.kind;
    if (k === "nest" || k === "orbit_shield" || k === "pin_spike" || k === "hive_wall" || k === "bonfire" || k === "parasite") return false;
    return true;
  }

  function stealEnemy(state, u) {
    var p = aim(state);
    var best = null;
    var bestD = 1e9;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (!stealableEnemy(e)) continue;
      var dAim = hypot(e.x - p.x, e.y - p.y);
      var dUnit = hypot(e.x - u.x, e.y - u.y);
      if (dAim > 150 + (e.def.size || 12) && dUnit > 210) continue;
      var score = dAim * 0.65 + dUnit * 0.35;
      if (score < bestD) {
        bestD = score;
        best = e;
      }
    }
    if (!best) {
      for (var r = 0; r < state.units.length; r++) {
        var ru = state.units[r];
        if (ru.hp > 0 && ru.def.active && ru.def.active.id === "hijack") ru.activeCd = 0;
      }
      state.floaters.push(G.createFloater(u.x, u.y - 16, "sem alvo", "#c86a3a"));
      return;
    }
    best.team = "player";
    best.stolen = true;
    best.stolenT = 30;
    best.stolenMax = 30;
    best.noDrop = true;
    best.stealth = 0;
    best.confuseT = 0;
    best.burnT = 0;
    best.bleedT = 0;
    best.attached = null;
    best.revealT = 2;
    G.burst(state, best.x, best.y, "#c86a3a", 18, 110);
    G.burst(state, best.x, best.y, "#ffe0b0", 10, 70);
    state.floaters.push(G.createFloater(best.x, best.y - 18, "aliado", "#c86a3a"));
  }

  function useActive(state, id, u) {
    ensure(state);
    if (id === "dash") return iframeDash(state, 0.5);
    if (id === "spear_dash") return spearDash(state, u);
    if (id === "phalanx_wall") return phalanxCharge(state, u);
    if (id === "reap") return reapCharge(state, u);
    if (id === "suppress") {
      state.suppressT = 5;
      state.floaters.push(G.createFloater(u.x, u.y - 18, "supressão", "#4aa3ff"));
      return true;
    }
    if (id === "focus_fire") {
      state.mgFocusT = 8;
      state.floaters.push(G.createFloater(u.x, u.y - 18, "foco absoluto", "#2f7dff"));
      return true;
    }
    if (id === "blackhole") {
      var bhNade = throwArc(state, u, aim(state), { kind: "grenade", land: "blackhole", color: "#1a1028", boomR: 300, r: 9, dur: 0.7, dmg: Math.round(u.def.dmg * 1.4) });
      bhNade.blackhole = true;
      return true;
    }
    if (id === "hijack") {
      stealEnemy(state, u);
      return true;
    }
    if (id === "storm" || id === "coil") return placeCoilTower(state, u);
    if (id === "smoke") {
      var s = aim(state);
      zone(state, { kind: "smoke", x: s.x, y: s.y, r: Math.round(132 * 1.3), t: 3.2 });
      return true;
    }
    if (id === "flare") {
      var p = aim(state);
      var host = C().nearest(state.enemies, p.x, p.y);
      if (host) {
        host.obsMarkT = 8;
        zone(state, { kind: "obsmark", x: host.x, y: host.y, r: 36, t: 8, max: 8, followId: host.id });
        state.floaters.push(G.createFloater(host.x, host.y - 18, "marcado", "#80e0ff"));
      } else {
        u.activeCd = 0;
        for (var fi = 0; fi < state.units.length; fi++) {
          var fu = state.units[fi];
          if (fu.hp > 0 && fu.def.active && fu.def.active.id === "flare") fu.activeCd = 0;
        }
        state.floaters.push(G.createFloater(u.x, u.y - 16, "sem alvo", "#80e0ff"));
      }
      return true;
    }
    if (id === "bless") {
      var a = aim(state);
      zone(state, { kind: "anchor", x: a.x, y: a.y, r: 176, t: 9, shield: 0.35 });
      return true;
    }
    if (id === "order") {
      var pb = G.playfield(state);
      zone(state, {
        kind: "beacon",
        x: (pb.x0 + pb.x1) / 2,
        y: (pb.y0 + pb.y1) / 2,
        r: Math.max(pb.x1 - pb.x0, pb.y1 - pb.y0),
        t: 8,
        fire: 0.35,
        dmg: 0.25,
        global: true
      });
      return true;
    }
    if (id === "kit") {
      var sx = state.squad.x;
      var sy = state.squad.y;
      state.drops.push(G.createDrop(sx, sy - 10, "hp", { value: 16 }));
      state.drops.push(G.createDrop(sx - 16, sy + 8, "hp", { value: 16 }));
      state.drops.push(G.createDrop(sx + 16, sy + 8, "hp", { value: 16 }));
      for (var ki = 0; ki < state.enemies.length; ki++) {
        var ke = state.enemies[ki];
        if (ke.hp <= 0) continue;
        if (!enemyInPuddle(state, ke)) continue;
        state.drops.push(G.createDrop(ke.x, ke.y, "hp", { value: 14 }));
      }
      G.burst(state, sx, sy, "#7cffb0", 16, 90);
      return true;
    }
    if (id === "scalpel_rain") {
      scalpelRain(state, u);
      return true;
    }
    if (id === "bucknade") {
      throwArc(state, u, aim(state), { kind: "grenade", land: "buckshot", color: "#ff8a4a", boomR: 28, r: 8, dur: 0.55, dmg: Math.round(u.def.dmg * C().dmgMul(state)) });
      return true;
    }
    if (id === "energy_blade" || id === "overcharge") {
      state.coloOverT = 10;
      state.coloOverMax = 10;
      state.coloSlashLeft = COLO_SLASH_N;
      state.coloSlashMax = COLO_SLASH_N;
      for (var ci = 0; ci < state.units.length; ci++) {
        if (state.units[ci].kind === "colosso" && state.units[ci].hp > 0) {
          state.units[ci].coloGlow = true;
          state.units[ci].coloAct = null;
          state.units[ci].coloSlashCd = 0;
        }
      }
      state.floaters.push(G.createFloater(u.x, u.y - 22, "lâmina de energia", "#7af7ff"));
      G.burst(state, u.x, u.y, "#7af7ff", 24, 180);
      G.burst(state, u.x, u.y, "#e8f6ff", 12, 90);
      return true;
    }
    if (id === "strafe") {
      var heli = dronesOf(state, "helicoptero");
      var sm = Math.max(1, nKind(state, "helicoptero"));
      var sDmg = Math.round(28 * C().dmgMul(state) * (sm > 1 ? 1 + 0.15 * (sm - 1) : 1));
      if (!heli.length) {
        var ap = aim(state);
        C().explode(state, ap.x, ap.y, 70, sDmg, "player");
      } else {
        for (var hi = 0; hi < heli.length; hi++) {
          C().explode(state, heli[hi].x, heli[hi].y, 62, sDmg, "player");
        }
      }
      return true;
    }
    if (id === "airstrike") {
      var ap2 = aim(state);
      state.bombPending = { x0: u.x, y0: u.y, x1: ap2.x, y1: ap2.y, t: 0.22 };
      return true;
    }
    if (id === "rocket") {
      var pack = dronesOf(state, "droneiro");
      var dr = pack[0] || state.drones[0] || u;
      var fake = { x: dr.x, y: dr.y, def: u.def, kind: u.kind, marked: 0, id: u.id };
      var rk = bolt(state, fake, mouseAng(state, dr), {
        kind: "missile",
        boomR: 82,
        homing: true,
        homeCursor: true,
        r: 7,
        dmgMul: 2,
        speed: 280,
        life: 1.8
      });
      rk.boomOnCursor = true;
      return true;
    }
    if (id === "napalm") return false;
    if (id === "firewave") {
      startFirewaves(state, u);
      return true;
    }
    if (id === "ram") return startRam(state);
    if (id === "firemode") {
      var maxMode = has(state, "tanque") ? 3 : 2;
      state.tankFireMode = ((state.tankFireMode || 0) + 1) % maxMode;
      for (var ti = 0; ti < state.units.length; ti++) {
        var tu = state.units[ti];
        if (tu.hp <= 0) continue;
        if (tu.kind !== "minitanque" && tu.kind !== "tanque") continue;
        tu.fireMode = state.tankFireMode;
      }
      return true;
    }
    if (id === "crate") {
      dropSupplyPack(state);
      return true;
    }
    if (id === "hook") {
      startHook(state);
      return true;
    }
    if (id === "deploy") {
      deployTurret(state, "mg");
      return true;
    }
    if (id === "detonate") {
      detonateStickies(state);
      return true;
    }
    if (id === "magnet" || id === "standard") {
      var m = aim(state);
      for (var zi = state.zones.length - 1; zi >= 0; zi--) {
        if (state.zones[zi].kind === "standard") beginRetire(state, state.zones[zi], 0.5);
      }
      for (var ui = 0; ui < state.units.length; ui++) {
        var ou = state.units[ui];
        if (ou.hp > 0 && ou.def.active && (ou.def.active.id === "magnet" || ou.def.active.id === "standard")) {
          ou.activeCd = 0;
          ou.activeHeld = true;
        }
      }
      zone(state, {
        kind: "standard",
        x: m.x,
        y: m.y,
        r: 118,
        t: 15,
        fire: 0.4,
        dmg: 0.4,
        speed: 0.4,
        ownerId: u.id
      });
      return true;
    }
    if (id === "haunt") {
      state.hauntT = 3;
      state.phaseOn = true;
      state.run.smokeT = Math.max(state.run.smokeT || 0, 3);
      for (var hi = 0; hi < state.enemies.length; hi++) state.enemies[hi].hauntTagged = false;
      G.burst(state, state.squad.x, state.squad.y, "#a090ff", 18, 140);
      return true;
    }
    if (id === "execute_dash") {
      startAssassinHunt(state, u);
      return true;
    }
    if (id === "salvo") {
      for (var n = 0; n < 6; n++) bolt(state, u, mouseAng(state, u) + (n - 2.5) * 0.1, { kind: "missile", homing: true, homeCursor: true, boomR: 32, r: 5 });
      return true;
    }
    if (id === "guerrilla") return false;
    return false;
  }

  function strokeBoltPts(ctx, pts) {
    if (!pts || pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  function drawTeslaBolt(ctx, bm) {
    var glow = 0.35 + Math.sin((bm.x0 + bm.y1) * 0.08) * 0.08;
    ctx.shadowColor = "rgba(140, 255, 255, 0.85)";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "rgba(80, 200, 255, " + (0.28 + glow) + ")";
    ctx.lineWidth = 11;
    strokeBoltPts(ctx, bm.pts);
    ctx.strokeStyle = "rgba(160, 245, 255, 0.75)";
    ctx.lineWidth = 5;
    strokeBoltPts(ctx, bm.pts);
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "#f4ffff";
    ctx.lineWidth = 1.8;
    strokeBoltPts(ctx, bm.pts);
    if (bm.forks) {
      ctx.shadowBlur = 10;
      for (var f = 0; f < bm.forks.length; f++) {
        ctx.strokeStyle = "rgba(180, 255, 255, 0.55)";
        ctx.lineWidth = 2.4;
        strokeBoltPts(ctx, bm.forks[f]);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        strokeBoltPts(ctx, bm.forks[f]);
      }
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(220, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(bm.x1, bm.y1, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function colMix(hex, amt) {
    var h = (hex || "#888888").replace("#", "");
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    var r = parseInt(h.slice(0, 2), 16) || 0;
    var g = parseInt(h.slice(2, 4), 16) || 0;
    var b = parseInt(h.slice(4, 6), 16) || 0;
    var t = amt >= 0 ? 255 : 0;
    var k = Math.min(1, Math.abs(amt));
    return "rgb(" + Math.round(r + (t - r) * k) + "," + Math.round(g + (t - g) * k) + "," + Math.round(b + (t - b) * k) + ")";
  }

  function groundShadow(ctx, rx, ry, a) {
    ctx.fillStyle = "rgba(0,0,0," + (a == null ? 0.34 : a) + ")";
    ctx.beginPath();
    ctx.ellipse(1.6, 5, rx, ry || rx * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }

  function isoCyl(ctx, r, h, top, side) {
    side = side || colMix(top, -0.3);
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(-r, -h);
    ctx.lineTo(r, -h);
    ctx.lineTo(r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.ellipse(0, -h, r, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colMix(top, 0.2);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -h - r * 0.06, r * 0.32, r * 0.12, -0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  function isoCube(ctx, s, h, top, left, right) {
    var x = s;
    var y = s * 0.52;
    ctx.fillStyle = right || colMix(top, -0.38);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(x, -y);
    ctx.lineTo(x, -y - h);
    ctx.lineTo(0, -h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = left || colMix(top, -0.18);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-x, -y);
    ctx.lineTo(-x, -y - h);
    ctx.lineTo(0, -h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.lineTo(x, -y - h);
    ctx.lineTo(0, -2 * y - h);
    ctx.lineTo(-x, -y - h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.moveTo(-x, -y - h);
    ctx.lineTo(0, -h);
    ctx.lineTo(x, -y - h);
    ctx.stroke();
  }

  function drawHpPip(ctx, hp, maxHp, y, color) {
    if (hp == null || !maxHp) return;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(-11, y, 22, 3.4);
    ctx.fillStyle = color || "#7cffb0";
    ctx.fillRect(-11, y, 22 * Math.max(0, Math.min(1, hp / maxHp)), 3.4);
  }

  function drawTurretSprite(ctx, dp, time) {
    var toss = dp.toss;
    var dx = toss ? toss.x : dp.x;
    var dy = toss ? toss.y : dp.y;
    var z = toss ? toss.z : 0;
    var spin = toss ? toss.spin : 0;
    var squash = dp.landSquash || 0;
    ctx.save();
    ctx.translate(dx, dy);
    var rk = retireK(dp);
    if (rk > 0) {
      applyRetirePose(ctx, rk, "slump");
      ctx.globalAlpha *= Math.max(0.18, 1 - rk * 0.7);
    }
    var v = dp.variant || "cannon";
    var shA = toss ? 0.16 + 0.22 * (1 - Math.min(1, z / 90)) : 0.38;
    groundShadow(ctx, 11 + z * 0.12, 4 + z * 0.05, shA);
    if (squash > 0.02) {
      ctx.strokeStyle = "rgba(255, 230, 140, " + (squash * 0.75) + ")";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 4, 14 + (1 - squash) * 26, 5 + (1 - squash) * 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(0, -z);
    if (spin) ctx.rotate(spin);
    if (squash > 0) ctx.scale(1 + squash * 0.34, 1 - squash * 0.24);
    if (v === "flame") {
      var flick = 0.4 + Math.sin(time * 14) * 0.16;
      ctx.fillStyle = "rgba(255, 90, 20, " + (0.12 + flick * 0.18) + ")";
      ctx.beginPath();
      ctx.ellipse(0, 2, 22, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      isoCyl(ctx, 9, 8, "#8a3a18", "#4a2010");
      isoCyl(ctx, 6.5, 16, "#d45a22", "#8a3010");
      ctx.fillStyle = "#2a1408";
      ctx.fillRect(-3, -22, 11, 5);
      ctx.fillStyle = "#c45a22";
      ctx.fillRect(-2, -24, 12, 3);
      ctx.fillStyle = "rgba(255, 210, 80, " + flick + ")";
      ctx.beginPath();
      ctx.ellipse(12, -23, 5 + flick * 3, 3 + flick * 2, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 220, " + (0.55 + flick * 0.4) + ")";
      ctx.beginPath();
      ctx.ellipse(14, -23, 2.2, 1.4, 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (v === "mg") {
      isoCyl(ctx, 8.5, 7, "#5a5a62", "#2e2e34");
      isoCube(ctx, 7, 8, "#d4c46a", "#8a7838", "#5a4c22");
      ctx.save();
      ctx.translate(0, -16);
      ctx.rotate(-0.18);
      ctx.fillStyle = "#2a2a30";
      ctx.fillRect(-2, -14, 4.4, 16);
      ctx.fillStyle = "#c8b45a";
      ctx.fillRect(-2.6, -16, 5.6, 4);
      ctx.fillStyle = "#888";
      ctx.fillRect(-3.4, -6, 7, 3);
      ctx.restore();
      isoCyl(ctx, 2.4, 5, "#3a3a40", "#1a1a20");
      ctx.save();
      ctx.translate(8, -4);
      isoCube(ctx, 3.2, 5, "#6a6a70", "#404048", "#2a2a30");
      ctx.restore();
    } else if (v === "jolt") {
      var pulse = 0.45 + Math.sin(time * 16) * 0.2;
      ctx.fillStyle = "rgba(120, 240, 255, " + (0.12 + pulse * 0.16) + ")";
      ctx.beginPath();
      ctx.ellipse(0, 1, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      isoCyl(ctx, 8, 6, "#3a6a78", "#1a3040");
      isoCyl(ctx, 4.2, 18, "#a8f6ff", "#3a6a78");
      ctx.strokeStyle = "rgba(168, 246, 255, " + (0.45 + pulse) + ")";
      ctx.lineWidth = 1.5;
      for (var ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        ctx.ellipse(0, -8 - ring * 4, 6.5 - ring * 0.6, 2.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(232, 255, 255, " + pulse + ")";
      ctx.beginPath();
      ctx.ellipse(0, -22, 5 + pulse, 2.2 + pulse * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      isoCyl(ctx, 9, 8, "#c8b45a", "#6a5a30");
      isoCyl(ctx, 3.2, 18, "#2a3040", "#121828");
    }
    ctx.restore();
    if (!toss && rk <= 0) drawHpPip(ctx, dp.hp, dp.maxHp, 8);
    if (rk > 0) drawRetireBits(ctx, rk, v === "flame" ? ["#ffe060", "#ff9a2a", "#fff4d0"] : v === "jolt" ? ["#a8f6ff", "#e8ffff", "#7ad8ff"] : ["#ffe08a", "#c8b45a", "#fff4d0"]);
    ctx.restore();
  }

  function drawCoilTower(ctx, dp, time) {
    var pulse = 0.55 + Math.sin(time * 10 + dp.x) * 0.25;
    var fieldR = dp.fieldR || dp.range || 128;
    var batt = dp.pack ? 1 : (dp.battery || 0);
    var live = batt > 0.02;
    var fed = live && (!!dp.fed || !!dp.linked);
    ctx.save();
    ctx.translate(dp.x, dp.y);
    var rk = retireK(dp);
    if (rk > 0) {
      applyRetirePose(ctx, rk, "slump");
      ctx.globalAlpha *= Math.max(0.15, 1 - rk * 0.75);
      fieldR *= Math.max(0.08, 1 - rk);
    }
    ctx.fillStyle = live ? (fed ? "rgba(120, 240, 255, 0.14)" : "rgba(70, 190, 230, 0.08)") : "rgba(50, 70, 80, 0.05)";
    circle(ctx, 0, 0, fieldR);
    ctx.fill();
    ctx.strokeStyle = live ? (fed ? "rgba(190, 255, 255, 0.7)" : "rgba(140, 230, 255, 0.36)") : "rgba(90, 110, 120, 0.22)";
    ctx.lineWidth = fed ? 2.2 : 1.4;
    ctx.setLineDash([10, 7]);
    circle(ctx, 0, 0, fieldR);
    ctx.stroke();
    ctx.setLineDash([]);
    groundShadow(ctx, 12, 5, 0.4);
    isoCyl(ctx, 10, 6, "#4a5a68", "#2a343c");
    isoCyl(ctx, 5.5, 22, live ? "#7a8a98" : "#4a5258", "#3a4a58");
    ctx.strokeStyle = "rgba(168, 246, 255, " + (live ? 0.35 + pulse * 0.4 : 0.12) + ")";
    ctx.lineWidth = 1.6;
    for (var cr = 0; cr < 4; cr++) {
      ctx.beginPath();
      ctx.ellipse(0, -8 - cr * 4, 7.2 - cr * 0.4, 2.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = live ? (fed ? "rgba(200, 255, 255, " + (0.55 + pulse * 0.4) + ")" : "rgba(168, 246, 255, " + pulse + ")") : "rgba(90, 110, 120, 0.35)";
    ctx.beginPath();
    ctx.ellipse(0, -26, 7.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (live) {
      ctx.strokeStyle = "rgba(168, 246, 255, " + (0.4 + pulse * 0.5) + ")";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(0, -26, 11 + Math.sin(time * 14) * 2, 4.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    var bh = 22;
    var bw = 4;
    var bx = 16;
    var by = -24;
    ctx.globalAlpha = rk > 0 ? Math.max(0.15, 1 - rk * 0.75) : 1;
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = "#1a2830";
    ctx.fillRect(bx, by, bw, bh);
    var fh = bh * Math.max(0, Math.min(1, batt));
    ctx.fillStyle = !live ? "#4a5560" : batt < 0.28 ? "#ff8a4a" : "#7af7ff";
    ctx.fillRect(bx, by + bh - fh, bw, fh);
    ctx.strokeStyle = live ? "rgba(168,246,255,0.85)" : "rgba(120,140,160,0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - 0.5, by - 0.5, bw + 1, bh + 1);
    if (rk > 0) drawRetireBits(ctx, rk, ["#a8f6ff", "#e8ffff", "#7ad8ff"]);
    ctx.restore();
  }

  function drawSmokeVolume(ctx, z, time) {
    ctx.fillStyle = "rgba(40, 48, 58, 0.28)";
    circle(ctx, z.x, z.y, z.r * 0.92);
    ctx.fill();
    var n = 11;
    for (var i = 0; i < n; i++) {
      var seed = z.x * 0.11 + z.y * 0.07 + i * 1.9;
      var ang = seed + time * (0.22 + (i % 3) * 0.06);
      var dist = z.r * (0.12 + (i / n) * 0.72);
      var px = z.x + Math.cos(ang) * dist;
      var py = z.y + Math.sin(ang) * dist;
      var rise = 10 + (i % 5) * 7 + Math.sin(time * 1.6 + i) * 5;
      var rr = 11 + (i % 5) * 5.5;
      ctx.fillStyle = "rgba(" + (62 + (i % 3) * 10) + "," + (72 + (i % 2) * 8) + "," + (88 + (i % 4) * 8) + "," + (0.18 + (i % 3) * 0.06) + ")";
      ctx.beginPath();
      ctx.ellipse(px, py - rise, rr, rr * 0.58, ang * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(210, 218, 228, 0.14)";
      ctx.beginPath();
      ctx.ellipse(px - 4, py - rise - 5, rr * 0.5, rr * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFireVolume(ctx, z, time, whiteHot) {
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.fillStyle = whiteHot ? "rgba(255, 220, 160, 0.22)" : "rgba(80, 20, 8, 0.35)";
    circle(ctx, 0, 0, z.r);
    ctx.fill();
    var n = 6;
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + time * 0.7;
      var ox = Math.cos(a) * z.r * 0.28;
      var oy = Math.sin(a) * z.r * 0.28;
      var h = z.r * (0.7 + Math.sin(time * 9 + i) * 0.22);
      var w = 4 + (i % 3);
      var grd = ctx.createLinearGradient(ox, oy, ox, oy - h);
      if (whiteHot) {
        grd.addColorStop(0, "rgba(255, 90, 30, 0.15)");
        grd.addColorStop(0.4, "rgba(255, 210, 120, 0.7)");
        grd.addColorStop(1, "rgba(255, 255, 255, 0.9)");
      } else {
        grd.addColorStop(0, "rgba(180, 30, 10, 0.2)");
        grd.addColorStop(0.35, "rgba(255, 90, 20, 0.75)");
        grd.addColorStop(0.75, "rgba(255, 180, 50, 0.85)");
        grd.addColorStop(1, "rgba(255, 250, 200, 0.7)");
      }
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(ox - w, oy);
      ctx.quadraticCurveTo(ox - w * 0.4, oy - h * 0.55, ox, oy - h);
      ctx.quadraticCurveTo(ox + w * 0.4, oy - h * 0.55, ox + w, oy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawJaggedBolt(ctx, x0, y0, x1, y1, segs, jag, seed) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    var i;
    var dx = x1 - x0;
    var dy = y1 - y0;
    var px = -dy;
    var py = dx;
    var pl = Math.sqrt(px * px + py * py) || 1;
    px /= pl;
    py /= pl;
    for (i = 1; i < segs; i++) {
      var t = i / segs;
      var wob = Math.sin(seed * 8.1 + i * 2.4) * jag;
      ctx.lineTo(x0 + dx * t + px * wob, y0 + dy * t + py * wob);
    }
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  function drawCrackGround(ctx, z, time) {
    var r = Number(z.r);
    if (!isFinite(r) || r <= 0) return;
    r = Math.min(r, z.big ? 520 : 260);
    var seed = Number(z.seed);
    if (!isFinite(seed)) seed = 1;
    if (z.tech) {
      drawTechCrack(ctx, z, r, seed, time);
      return;
    }
    var inner = Math.max(8, r * 0.62);
    ctx.save();
    try {
      ctx.translate(z.x, z.y);
      ctx.fillStyle = "rgba(18, 8, 4, 0.52)";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(8, 3, 2, 0.45)";
      ctx.beginPath();
      ctx.arc(0, 0, inner, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(92, 48, 18, 0.95)";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(180, 90, 36, 0.5)";
      ctx.lineWidth = 1.6;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(10, 4, 2, 0.92)";
      ctx.lineWidth = 2.2;
      var i;
      for (i = 0; i < 7; i++) {
        var a = seed + i * 0.95;
        var len = r * (0.48 + (i % 3) * 0.16);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.stroke();
        var b = a + 0.32;
        var mid = len * 0.52;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * mid, Math.sin(a) * mid);
        ctx.lineTo(Math.cos(b) * (mid + r * 0.16), Math.sin(b) * (mid + r * 0.16));
        ctx.stroke();
      }
      for (i = 0; i < 8; i++) {
        var ra = seed * 0.7 + i * (Math.PI * 2 / 8);
        var rr = r * 0.88;
        ctx.save();
        ctx.translate(Math.cos(ra) * rr, Math.sin(ra) * rr - 2);
        isoCube(ctx, 4 + (i % 3), 3 + (i % 2), "#6a4828", "#3a2410", "#241408");
        ctx.restore();
      }
    } finally {
      ctx.restore();
    }
  }

  function drawTechCrack(ctx, z, r, seed, time) {
    if (time == null) time = (z.t || 0) * 3.4;
    var pulse = 0.55 + Math.sin(time * 9 + seed) * 0.45;
    var i;
    var a;
    var len;
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.fillStyle = "rgba(6, 14, 28, 0.62)";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(12, 40, 72, 0.4)";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(58, 138, 255, 0.55)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.98, 0, Math.PI * 2);
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (i = 0; i < 10; i++) {
      a = seed + i * 0.63;
      len = r * (0.42 + (i % 4) * 0.14);
      var x1 = Math.cos(a) * len;
      var y1 = Math.sin(a) * len;
      ctx.strokeStyle = "rgba(20, 50, 90, 0.95)";
      ctx.lineWidth = 4.2;
      drawJaggedBolt(ctx, Math.cos(a) * 8, Math.sin(a) * 8, x1, y1, 5, 7, seed + i);
      ctx.strokeStyle = "rgba(58, 160, 255, " + (0.35 + pulse * 0.35) + ")";
      ctx.lineWidth = 2.1;
      drawJaggedBolt(ctx, Math.cos(a) * 8, Math.sin(a) * 8, x1, y1, 5, 7, seed + i + time * 3.2);
      ctx.strokeStyle = "rgba(200, 245, 255, " + (0.25 + pulse * 0.55) + ")";
      ctx.lineWidth = 1;
      drawJaggedBolt(ctx, Math.cos(a) * 8, Math.sin(a) * 8, x1, y1, 5, 5, seed + i + 1.1 + time * 5.1);
      var node = 0.55 + Math.sin(time * 14 + i) * 0.45;
      ctx.fillStyle = "rgba(122, 247, 255, " + (0.35 + node * 0.5) + ")";
      ctx.beginPath();
      ctx.arc(x1, y1, 2.4 + node * 1.6, 0, Math.PI * 2);
      ctx.fill();
      if (i % 2 === 0) {
        var br = a + 0.42;
        var bx = Math.cos(br) * (len * 0.62);
        var by = Math.sin(br) * (len * 0.62);
        ctx.strokeStyle = "rgba(122, 210, 255, " + (0.2 + pulse * 0.4) + ")";
        ctx.lineWidth = 1.2;
        drawJaggedBolt(ctx, x1 * 0.55, y1 * 0.55, bx, by, 4, 5, seed * 0.4 + i);
      }
    }
    ctx.strokeStyle = "rgba(154, 212, 255, " + (0.22 + pulse * 0.2) + ")";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (i = 0; i < 6; i++) {
      a = -Math.PI / 2 + i * Math.PI / 3;
      var hx = Math.cos(a) * r * 0.28;
      var hy = Math.sin(a) * r * 0.28;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  function drawBanner3d(ctx, z, time) {
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.fillStyle = "rgba(232, 208, 128, 0.12)";
    circle(ctx, 0, 0, z.r);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 210, 74, 0.8)";
    ctx.lineWidth = 2.4;
    circle(ctx, 0, 0, z.r);
    ctx.stroke();
    groundShadow(ctx, 8, 3.4, 0.4);
    isoCyl(ctx, 2.2, 34, "#c45a2a", "#7a3010");
    var flap = Math.sin(time * 4) * 3;
    ctx.fillStyle = "#5a1a10";
    ctx.beginPath();
    ctx.moveTo(2, -32);
    ctx.lineTo(22 + flap, -24);
    ctx.lineTo(20 + flap, -12);
    ctx.lineTo(2, -14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e8d080";
    ctx.beginPath();
    ctx.moveTo(2, -32);
    ctx.lineTo(20 + flap, -25);
    ctx.lineTo(18 + flap, -14);
    ctx.lineTo(2, -16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff3c0";
    ctx.beginPath();
    ctx.moveTo(4, -30);
    ctx.lineTo(12 + flap * 0.4, -27);
    ctx.lineTo(11 + flap * 0.4, -22);
    ctx.lineTo(4, -24);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawColoBeam(ctx, fx) {
    var k = Math.max(0, fx.t / (fx.max || 0.28));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(232, 246, 255, " + (0.25 + k * 0.55) + ")";
    ctx.lineWidth = 22 * k;
    ctx.beginPath();
    ctx.moveTo(fx.x0, fx.y0);
    ctx.lineTo(fx.x1, fx.y1);
    ctx.stroke();
    ctx.strokeStyle = "rgba(122, 247, 255, " + (0.45 + k * 0.5) + ")";
    ctx.lineWidth = 10 * k;
    ctx.beginPath();
    ctx.moveTo(fx.x0, fx.y0);
    ctx.lineTo(fx.x1, fx.y1);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, " + (0.7 * k) + ")";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(fx.x0, fx.y0);
    ctx.lineTo(fx.x1, fx.y1);
    ctx.stroke();
    ctx.restore();
  }

  function drawColoSlash(ctx, fx) {
    var k = Math.max(0, fx.t / (fx.max || COLO_SLASH_T));
    var age = 1 - k;
    var fade = k > 0.28 ? 1 : Math.max(0, k / 0.28);
    var dx = fx.x1 - fx.x0;
    var dy = fx.y1 - fx.y0;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len;
    var uy = dy / len;
    var nx = -uy;
    var ny = ux;
    var side = Math.sin((fx.seed || 1) * 12.9) >= 0 ? 1 : -1;
    var fly = Math.min(1, age * 1.55);
    var cx = fx.x0 + dx * fly;
    var cy = fx.y0 + dy * fly;
    var R = 210;
    var thick = 52;
    var a0 = -1.22;
    var a1 = 1.22;
    var seed = fx.seed || 1;
    var i;
    function cres(ctx2, rOut, rIn) {
      ctx2.beginPath();
      ctx2.arc(0, 0, rOut, a0, a1);
      ctx2.arc(0, 0, rIn, a1, a0, true);
      ctx2.closePath();
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (age < 0.45) {
      var swing = Math.min(1, age / 0.16);
      var swFade = (1 - age / 0.45) * fade;
      ctx.save();
      ctx.translate(fx.x0, fx.y0);
      ctx.rotate((fx.ang || 0) + side * (0.55 - swing * 1.15));
      ctx.globalAlpha = swFade * 0.85;
      ctx.strokeStyle = "rgba(70, 180, 255, 0.55)";
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(0, 0, 78, -1.35, 1.05);
      ctx.stroke();
      ctx.strokeStyle = "rgba(230, 250, 255, 0.9)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 78, -1.35, 1.05);
      ctx.stroke();
      ctx.restore();
    }
    var trail = Math.min(0.22, fly);
    var tx0 = fx.x0 + dx * Math.max(0, fly - trail);
    var ty0 = fx.y0 + dy * Math.max(0, fly - trail);
    var tmx = (tx0 + cx) / 2 + nx * side * 48;
    var tmy = (ty0 + cy) / 2 + ny * side * 48;
    ctx.globalAlpha = fade * 0.35;
    ctx.strokeStyle = "rgba(80, 190, 255, 0.8)";
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(tx0, ty0);
    ctx.quadraticCurveTo(tmx, tmy, cx, cy);
    ctx.stroke();
    ctx.globalAlpha = fade * 0.55;
    ctx.strokeStyle = "rgba(220, 250, 255, 0.85)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(tx0, ty0);
    ctx.quadraticCurveTo(tmx, tmy, cx, cy);
    ctx.stroke();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((fx.ang || 0) + side * 0.18);
    ctx.translate(-R * 0.22, 0);
    ctx.globalAlpha = fade;
    ctx.fillStyle = "rgba(28, 90, 220, 0.32)";
    cres(ctx, R + 18, R - thick - 16);
    ctx.fill();
    ctx.fillStyle = "rgba(50, 170, 255, 0.55)";
    cres(ctx, R + 4, R - thick);
    ctx.fill();
    ctx.fillStyle = "rgba(170, 235, 255, 0.82)";
    cres(ctx, R - 8, R - thick + 14);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    cres(ctx, R - 18, R - thick + 26);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, " + (0.75 * fade) + ")";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, R - 2, a0, a1);
    ctx.stroke();
    for (i = 0; i < 6; i++) {
      var ta = a0 + (a1 - a0) * ((i + 0.2) / 6);
      var tb = ta + 0.22;
      var ox = Math.cos(ta) * (R + 6);
      var oy = Math.sin(ta) * (R + 6);
      var px = Math.cos(tb) * (R + 16 + (i % 3) * 8);
      var py = Math.sin(tb) * (R + 16 + (i % 3) * 8);
      ctx.strokeStyle = "rgba(200, 245, 255, " + (0.5 + k * 0.4) * fade + ")";
      ctx.lineWidth = 2;
      drawJaggedBolt(ctx, ox, oy, px, py, 4, 10, seed + i + age * 11);
    }
    ctx.restore();
    ctx.restore();
  }

  function drawColoSlam(ctx, fx) {
    var progress = 1 - Math.max(0, fx.t) / (fx.max || 0.9);
    var fade = progress < 0.42 ? 1 : Math.max(0, 1 - (progress - 0.42) / 0.58);
    var crackK = Math.min(1, progress * 2.4);
    var r = fx.r || 250;
    var seed = fx.seed || 1;
    var i;
    var a;
    var len;
    var flicker = seed + progress * 18;
    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.fillStyle = "rgba(8, 16, 32, " + (0.7 * fade) + ")";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(18, 48, 88, " + (0.38 * fade) + ")";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(58, 138, 255, " + (0.55 * fade) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.98, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < 12; i++) {
      a = seed + i * 0.54;
      len = r * (0.4 + (i % 4) * 0.15) * crackK;
      var x1 = Math.cos(a) * len;
      var y1 = Math.sin(a) * len;
      ctx.globalAlpha = fade;
      ctx.strokeStyle = "rgba(30, 70, 140, 0.9)";
      ctx.lineWidth = 5;
      drawJaggedBolt(ctx, Math.cos(a) * 8, Math.sin(a) * 8, x1, y1, 6, 9, flicker + i);
      ctx.strokeStyle = "rgba(70, 180, 255, " + (0.55 * fade) + ")";
      ctx.lineWidth = 2.4;
      drawJaggedBolt(ctx, Math.cos(a) * 8, Math.sin(a) * 8, x1, y1, 6, 8, flicker + i + 0.4);
      ctx.strokeStyle = "rgba(230, 250, 255, " + (0.75 * fade) + ")";
      ctx.lineWidth = 1.05;
      drawJaggedBolt(ctx, Math.cos(a) * 8, Math.sin(a) * 8, x1, y1, 6, 6, flicker + i + 1.2);
      ctx.fillStyle = "rgba(180, 240, 255, " + fade + ")";
      ctx.beginPath();
      ctx.arc(x1, y1, 2.2, 0, Math.PI * 2);
      ctx.fill();
      if (i % 3 === 0) {
        var br = a + (i % 2 ? 0.5 : -0.46);
        ctx.strokeStyle = "rgba(122, 247, 255, " + (0.45 * fade) + ")";
        ctx.lineWidth = 1.4;
        drawJaggedBolt(ctx, x1 * 0.5, y1 * 0.5, Math.cos(br) * len * 0.72, Math.sin(br) * len * 0.72, 4, 6, flicker + i * 0.7);
      }
    }
    ctx.globalAlpha = fade * 0.55;
    ctx.strokeStyle = "rgba(154, 212, 255, 0.9)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (i = 0; i < 6; i++) {
      a = -Math.PI / 2 + i * Math.PI / 3 + progress * 0.2;
      var hx = Math.cos(a) * r * (0.22 + crackK * 0.12);
      var hy = Math.sin(a) * r * (0.22 + crackK * 0.12);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
    if (progress < 0.28) {
      var flash = 1 - progress / 0.28;
      ctx.globalAlpha = flash * 0.85;
      ctx.fillStyle = "#e8ffff";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = flash * 0.55;
      ctx.strokeStyle = "#7af7ff";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(0, 0, r * (0.18 + progress * 1.7), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function coloHexPath(ctx, r) {
    ctx.beginPath();
    var i;
    for (i = 0; i < 6; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 3;
      var x = Math.cos(a) * r;
      var y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawColoBash(ctx, fx) {
    var progress = 1 - Math.max(0, fx.t) / (fx.max || 0.78);
    var grow = 1 - Math.pow(1 - Math.min(1, progress * 1.35), 2.2);
    var fade = progress < 0.42 ? 1 : Math.max(0, 1 - (progress - 0.42) / 0.58);
    var r = (fx.r || 150) * (0.42 + grow * 0.62);
    var ang = fx.ang || 0;
    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.rotate(ang);
    ctx.globalAlpha = fade * 0.28;
    ctx.fillStyle = "#1a4aad";
    coloHexPath(ctx, r * 1.08);
    ctx.fill();
    ctx.globalAlpha = fade * 0.42;
    var fill = ctx.createRadialGradient(0, 0, r * 0.12, 0, 0, r);
    fill.addColorStop(0, "rgba(180, 230, 255, 0.7)");
    fill.addColorStop(0.45, "rgba(40, 120, 255, 0.5)");
    fill.addColorStop(1, "rgba(10, 50, 180, 0.08)");
    ctx.fillStyle = fill;
    coloHexPath(ctx, r);
    ctx.fill();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = "#b8e8ff";
    ctx.lineWidth = 4.4;
    coloHexPath(ctx, r);
    ctx.stroke();
    ctx.strokeStyle = "rgba(58, 138, 255, 0.95)";
    ctx.lineWidth = 2;
    coloHexPath(ctx, r * 0.78);
    ctx.stroke();
    ctx.strokeStyle = "rgba(232, 246, 255, 0.55)";
    ctx.lineWidth = 1.2;
    coloHexPath(ctx, r * 0.52);
    ctx.stroke();
    var i;
    ctx.strokeStyle = "rgba(154, 212, 255, " + (0.45 * fade) + ")";
    ctx.lineWidth = 1.1;
    for (i = 0; i < 6; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(232, 246, 255, " + (0.85 * fade) + ")";
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.22);
    ctx.lineTo(r * 0.16, 0);
    ctx.lineTo(0, r * 0.22);
    ctx.lineTo(-r * 0.16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(58, 138, 255, " + fade + ")";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = fade * 0.55;
    ctx.strokeStyle = "#7ad4ff";
    ctx.lineWidth = 7;
    coloHexPath(ctx, r * 1.02);
    ctx.stroke();
    if (progress < 0.28) {
      var flash = 1 - progress / 0.28;
      ctx.globalAlpha = flash * 0.65;
      ctx.fillStyle = "#c8f0ff";
      coloHexPath(ctx, r * 0.35);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawColoPunch(ctx, fx) {
    var k = Math.max(0, fx.t / (fx.max || 0.18));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(122, 247, 255, " + (0.35 + k * 0.5) + ")";
    ctx.lineWidth = 10 * k;
    ctx.beginPath();
    ctx.moveTo(fx.x0, fx.y0);
    ctx.lineTo(fx.x1, fx.y1);
    ctx.stroke();
    ctx.fillStyle = "rgba(232, 246, 255, " + k + ")";
    ctx.beginPath();
    ctx.arc(fx.x1, fx.y1, 7 + (1 - k) * 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawScalpelRain(ctx, fx) {
    var progress = 1 - Math.max(0, fx.t) / (fx.max || 0.55);
    var fade = progress < 0.55 ? 1 : Math.max(0, 1 - (progress - 0.55) / 0.45);
    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.globalAlpha = fade * 0.22;
    ctx.fillStyle = "#ffd0d0";
    ctx.beginPath();
    ctx.arc(0, 0, fx.r || 96, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = fade;
    var i;
    for (i = 0; i < 14; i++) {
      var a = i * 2.1;
      var dist = (fx.r || 96) * (0.15 + (i % 5) * 0.16);
      var drop = -40 + progress * 70 + (i % 4) * 6;
      ctx.save();
      ctx.translate(Math.cos(a) * dist, Math.sin(a) * dist * 0.55 + drop);
      ctx.rotate(0.7 + i * 0.15);
      ctx.fillStyle = i % 2 ? "#ffffff" : "#ffd0d0";
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(2.2, 6);
      ctx.lineTo(-2.2, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c45a5a";
      ctx.fillRect(-1.4, 6, 2.8, 4);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawAnchor3d(ctx, z) {
    var sc = Math.max(1, (z.r || 88) / 88);
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.strokeStyle = "rgba(255, 233, 160, 0.72)";
    ctx.lineWidth = 2;
    circle(ctx, 0, 0, z.r);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 233, 160, 0.08)";
    ctx.fill();
    ctx.scale(sc, sc);
    groundShadow(ctx, 9, 3.6, 0.4);
    isoCyl(ctx, 4.5, 8, "#c8b070", "#6a5830");
    isoCyl(ctx, 2.4, 26, "#f0e0a0", "#a09060");
    ctx.fillStyle = "#ffe9a0";
    ctx.beginPath();
    ctx.moveTo(-8, -22);
    ctx.lineTo(8, -22);
    ctx.lineTo(6, -18);
    ctx.lineTo(-6, -18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff8d8";
    ctx.beginPath();
    ctx.moveTo(-2.4, -32);
    ctx.lineTo(2.4, -32);
    ctx.lineTo(1.6, -20);
    ctx.lineTo(-1.6, -20);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawFirewaves(ctx, state) {
    var waves = state.firewaves;
    if (!waves || !waves.length) return;
    var b = G.playfield(state);
    var time = state.time || 0;
    for (var i = 0; i < waves.length; i++) {
      var w = waves[i];
      var r = w.r;
      var inner = Math.max(4, r - w.width);
      var fade = Math.min(1, w.t / 0.18);
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
      ctx.clip();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.92 * fade;

      var glow = ctx.createRadialGradient(w.x, w.y, Math.max(0, inner - 12), w.x, w.y, r + 28);
      glow.addColorStop(0, "rgba(255, 90, 20, 0)");
      glow.addColorStop(0.42, "rgba(255, 140, 40, 0.18)");
      glow.addColorStop(0.72, "rgba(255, 230, 170, 0.55)");
      glow.addColorStop(0.9, "rgba(255, 255, 255, 0.95)");
      glow.addColorStop(1, "rgba(180, 230, 255, 0.12)");
      ctx.beginPath();
      var n = 64;
      var a;
      var j;
      for (j = 0; j <= n; j++) {
        a = (j / n) * Math.PI * 2;
        var flick = Math.sin(a * 8 + time * 16) * 11 + Math.sin(a * 13 + time * 21) * 6;
        var px = w.x + Math.cos(a) * (r + 10 + flick);
        var py = w.y + Math.sin(a) * (r + 10 + flick);
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      for (j = n; j >= 0; j--) {
        a = (j / n) * Math.PI * 2;
        var flickIn = Math.sin(a * 7 + time * 14) * 7;
        var ix = w.x + Math.cos(a) * Math.max(2, inner + flickIn);
        var iy = w.y + Math.sin(a) * Math.max(2, inner + flickIn);
        if (j === n) ctx.moveTo(ix, iy);
        else ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fillStyle = glow;
      ctx.fill("evenodd");

      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 7;
      ctx.beginPath();
      for (j = 0; j <= n; j++) {
        a = (j / n) * Math.PI * 2;
        var edge = Math.sin(a * 9 + time * 18) * 8 + Math.sin(a * 17 + time * 24) * 4;
        var ex = w.x + Math.cos(a) * (r + edge);
        var ey = w.y + Math.sin(a) * (r + edge);
        if (j === 0) ctx.moveTo(ex, ey);
        else ctx.lineTo(ex, ey);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 220, 160, 0.55)";
      ctx.lineWidth = 3;
      ctx.stroke();

      var tongues = 18;
      for (j = 0; j < tongues; j++) {
        a = (j / tongues) * Math.PI * 2 + time * 2.4;
        var len = 18 + Math.sin(a * 5 + time * 20) * 10;
        var c = Math.cos(a);
        var s = Math.sin(a);
        var x0 = w.x + c * (r - 8);
        var y0 = w.y + s * (r - 8);
        var x1 = w.x + c * (r + len);
        var y1 = w.y + s * (r + len);
        var grd = ctx.createLinearGradient(x0, y0, x1, y1);
        grd.addColorStop(0, "rgba(255, 120, 40, 0.15)");
        grd.addColorStop(0.45, "rgba(255, 230, 170, 0.7)");
        grd.addColorStop(1, "rgba(255, 255, 255, 0.95)");
        ctx.strokeStyle = grd;
        ctx.lineWidth = 3.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.55 * fade;
      ctx.strokeStyle = "rgba(200, 240, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w.x, w.y, Math.max(8, r - 18), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBlackHole(ctx, z, time) {
    var r = z.r || 300;
    var life = Math.max(0, z.t);
    var max = z.max || 2.38;
    var born = Math.max(0, max - life);
    var collapseDur = 0.78;
    var dying = life < collapseDur ? 1 - life / collapseDur : 0;
    var starPull = Math.min(1, dying / 0.4);
    starPull = starPull * starPull * (3 - 2 * starPull);
    var selfK = dying > 0.38 ? Math.min(1, (dying - 0.38) / 0.34) : 0;
    selfK = selfK * selfK;
    var flashK = dying > 0.66 ? Math.min(1, (dying - 0.66) / 0.34) : 0;
    var fade = Math.min(1, born / 0.16);
    if (flashK > 0.72) fade *= Math.max(0, (1 - flashK) / 0.28);
    var pulse = 0.5 + Math.sin(time * 7.4) * 0.1;
    var spin = time * 2.2 + (z.seed || 0);
    var baseCore = Math.max(15, r * 0.105);
    var coreR = Math.max(1.2, baseCore * (1 - selfK * 0.92));
    var visR = r * (1 - selfK * 0.9);
    var diskR = baseCore * 2.45 * (1 - selfK * 0.8);
    var holeA = fade * (1 - Math.min(1, flashK / 0.35));
    var i;
    var ang;
    var rad;

    ctx.save();
    ctx.translate(z.x, z.y);

    if (holeA > 0.02) {
      ctx.globalAlpha = holeA;
      var well = ctx.createRadialGradient(0, 0, coreR * 0.4, 0, 0, visR);
      well.addColorStop(0, "rgba(2, 0, 10, 0.88)");
      well.addColorStop(0.1, "rgba(18, 4, 48, 0.42)");
      well.addColorStop(0.28, "rgba(48, 16, 96, 0.18)");
      well.addColorStop(0.55, "rgba(62, 80, 180, 0.08)");
      well.addColorStop(0.82, "rgba(62, 192, 255, 0.06)");
      well.addColorStop(1, "rgba(62, 192, 255, 0)");
      ctx.fillStyle = well;
      ctx.beginPath();
      ctx.arc(0, 0, visR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(160, 220, 255," + (0.28 + pulse * 0.22) * (1 - selfK) + ")";
      ctx.lineWidth = 1.7;
      ctx.setLineDash([11, 9]);
      ctx.lineDashOffset = -time * 48;
      ctx.beginPath();
      ctx.arc(0, 0, visR * 0.988, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (born < 0.42 && dying <= 0) {
      var sk = born / 0.42;
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(220, 240, 255," + (1 - sk) * 0.9 + ")";
      ctx.lineWidth = 5 + (1 - sk) * 12;
      ctx.beginPath();
      ctx.arc(0, 0, 16 + sk * r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 190, 120," + (1 - sk) * 0.55 + ")";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 10 + sk * r * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.globalCompositeOperation = "lighter";
    if (dying <= 0) {
      ctx.globalAlpha = fade;
      for (i = 0; i < 3; i++) {
        ctx.strokeStyle = i === 1 ? "rgba(255, 196, 130, 0.2)" : "rgba(150, 130, 255, 0.16)";
        ctx.lineWidth = i === 1 ? 2.1 : 1.3;
        ctx.beginPath();
        ctx.arc(0, 0, r * (0.2 + i * 0.12) + Math.sin(time * 5.4 + i) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    var starN = dying > 0 ? 48 : 32;
    for (i = 0; i < starN; i++) {
      var u = (time * 0.62 + i * 0.181 + (z.seed || 0) * 0.013) % 1;
      ang = spin * 0.72 + i * 0.54 + u * 6.5;
      var homeRad = r * (0.95 - Math.pow(u, 0.7) * 0.88);
      if (dying > 0 && i >= 32) {
        homeRad = r * (0.72 + ((i - 32) / 16) * 0.24);
        ang = spin * 0.2 + (i - 32) * 0.393 + (z.seed || 0);
      }
      var pull = starPull;
      if (dying > 0) {
        var delay = (i % 10) / 10 * 0.18;
        pull = Math.min(1, Math.max(0, (starPull - delay) / (1 - delay * 0.4)));
        pull = pull * pull;
      }
      if (pull > 0.97) continue;
      rad = homeRad * (1 - pull) + baseCore * 1.05 * pull;
      var px = Math.cos(ang) * rad;
      var py = Math.sin(ang) * rad;
      var cr;
      var cg;
      var cb;
      if (i % 5 === 0) {
        cr = 255; cg = 214; cb = 150;
      } else if (i % 3 === 0) {
        cr = 186; cg = 130; cb = 255;
      } else {
        cr = 210; cg = 240; cb = 255;
      }
      var a = dying > 0 ? 0.75 + (1 - pull) * 0.25 : (1 - u) * 0.95;
      var sz = dying > 0 ? (1.6 + (1 - pull) * 2.2) * (1 - pull * 0.55) : 0.7 + (1 - u) * 2.6;
      if (i % 5 === 0) sz *= 1.2;
      ctx.globalAlpha = fade;
      if (dying > 0.02 && pull > 0.04) {
        var streak = (26 + homeRad * 0.07) * (1 - pull);
        streak = Math.max(4 * (1 - pull), streak);
        var tailRad = Math.min(homeRad, rad + streak);
        var tailAng = ang - 0.16 * (1 - pull);
        var ox = Math.cos(tailAng) * tailRad;
        var oy = Math.sin(tailAng) * tailRad;
        var mx = Math.cos(ang - 0.07 * (1 - pull)) * (tailRad * 0.48 + rad * 0.52);
        var my = Math.sin(ang - 0.07 * (1 - pull)) * (tailRad * 0.48 + rad * 0.52);
        var trail = ctx.createLinearGradient(ox, oy, px, py);
        trail.addColorStop(0, "rgba(" + cr + "," + cg + "," + cb + ",0)");
        trail.addColorStop(0.4, "rgba(" + cr + "," + cg + "," + cb + "," + (0.12 * (1 - pull)) + ")");
        trail.addColorStop(0.78, "rgba(" + cr + "," + cg + "," + cb + "," + (0.4 + (1 - pull) * 0.2) + ")");
        trail.addColorStop(1, "rgba(" + cr + "," + cg + "," + cb + "," + (0.7 + (1 - pull) * 0.25) + ")");
        ctx.strokeStyle = trail;
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(0.6, (2.8 + sz * 0.35) * (1 - pull * 0.7));
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.quadraticCurveTo(mx, my, px, py);
        ctx.stroke();
        ctx.lineWidth = Math.max(0.35, (0.8 + sz * 0.12) * (1 - pull * 0.65));
        ctx.strokeStyle = "rgba(255,255,255," + (0.22 + (1 - pull) * 0.35) + ")";
        ctx.beginPath();
        ctx.moveTo(ox * 0.22 + px * 0.78, oy * 0.22 + py * 0.78);
        ctx.lineTo(px, py);
        ctx.stroke();
      } else if (i % 2 === 0 && u > 0.12) {
        ctx.strokeStyle = "rgba(" + cr + "," + cg + "," + cb + "," + (a * 0.4) + ")";
        ctx.lineWidth = 1.05;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang - 0.2) * rad * 1.1, Math.sin(ang - 0.2) * rad * 1.1);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
      var glow = ctx.createRadialGradient(px, py, 0, px, py, sz * 2.4);
      glow.addColorStop(0, "rgba(255,255,255," + (dying > 0 ? 0.95 : 0.55) + ")");
      glow.addColorStop(0.35, "rgba(" + cr + "," + cg + "," + cb + "," + a + ")");
      glow.addColorStop(1, "rgba(" + cr + "," + cg + "," + cb + ",0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, sz * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255," + (dying > 0 ? 0.9 : 0.7) + ")";
      ctx.beginPath();
      ctx.arc(px, py, Math.max(0.45, sz * 0.35), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = holeA;

    if (holeA > 0.02 && selfK < 0.95) {
      ctx.save();
      ctx.rotate(0.16);
      ctx.scale(1, 0.4);
      ctx.rotate(spin * 0.32);
      var disk = ctx.createRadialGradient(0, 0, coreR * 0.85, 0, 0, Math.max(4, diskR * 1.6));
      disk.addColorStop(0, "rgba(0,0,0,0)");
      disk.addColorStop(0.3, "rgba(0,0,0,0)");
      disk.addColorStop(0.4, "rgba(255, 70, 36, 0.5)");
      disk.addColorStop(0.55, "rgba(255, 196, 100, 0.95)");
      disk.addColorStop(0.72, "rgba(140, 180, 255, 0.62)");
      disk.addColorStop(0.88, "rgba(90, 50, 200, 0.22)");
      disk.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = disk;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2, diskR * 1.6), 0, Math.PI * 2);
      ctx.arc(0, 0, Math.max(1, coreR * 1.02), 0, Math.PI * 2, true);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 244, 210, 0.55)";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      for (i = 0; i < 5; i++) {
        var a0 = spin * 1.15 + i * 1.256;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(2, diskR * (0.68 + (i % 2) * 0.2)), a0, a0 + 1.05);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = "rgba(255, 236, 205, 0.95)";
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.arc(0, 0, coreR * 1.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(130, 210, 255, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, coreR * 1.36, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(0, 0, coreR, 0, Math.PI * 2);
      ctx.fill();
      var hole = ctx.createRadialGradient(-coreR * 0.22, -coreR * 0.28, 0, 0, 0, coreR);
      hole.addColorStop(0, "rgba(18, 10, 36, 0.55)");
      hole.addColorStop(0.55, "rgba(0, 0, 0, 0)");
      hole.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = hole;
      ctx.beginPath();
      ctx.arc(0, 0, coreR, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255, 168, 80, 0.8)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, coreR * 0.06, coreR * 1.52, coreR * 0.38, 0, 0.12, Math.PI - 0.12);
      ctx.stroke();
      ctx.strokeStyle = "rgba(190, 220, 255, 0.55)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, -coreR * 0.04, coreR * 1.42, coreR * 0.32, 0, Math.PI + 0.18, -0.18);
      ctx.stroke();

      if (dying < 0.2) {
        ctx.globalAlpha = holeA * (0.28 + pulse * 0.12) * (dying > 0 ? 1 - dying / 0.2 : 1);
        var jet = ctx.createLinearGradient(0, -coreR * 4.2, 0, coreR * 4.2);
        jet.addColorStop(0, "rgba(140, 200, 255, 0)");
        jet.addColorStop(0.38, "rgba(170, 140, 255, 0.45)");
        jet.addColorStop(0.5, "rgba(255, 255, 255, 0.2)");
        jet.addColorStop(0.62, "rgba(170, 140, 255, 0.45)");
        jet.addColorStop(1, "rgba(140, 200, 255, 0)");
        ctx.fillStyle = jet;
        ctx.beginPath();
        ctx.ellipse(0, 0, coreR * 0.22, coreR * 4.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (flashK > 0) {
      var flashLen;
      var flashH;
      var flashA;
      if (flashK < 0.28) {
        flashLen = 18 + (flashK / 0.28) * 150;
        flashH = 2.2 + (flashK / 0.28) * 5.5;
        flashA = flashK / 0.28;
      } else if (flashK < 0.48) {
        flashLen = 168;
        flashH = 7.7;
        flashA = 1;
      } else {
        var out = (flashK - 0.48) / 0.52;
        flashLen = 168 * (1 - out * 0.15);
        flashH = 7.7 * (1 - out);
        flashA = 1 - out;
      }
      flashH = Math.max(0.35, flashH);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = fade * flashA;
      var flash = ctx.createLinearGradient(-flashLen, 0, flashLen, 0);
      flash.addColorStop(0, "rgba(255,255,255,0)");
      flash.addColorStop(0.28, "rgba(255,255,255,0.55)");
      flash.addColorStop(0.5, "rgba(255,255,255,1)");
      flash.addColorStop(0.72, "rgba(255,255,255,0.55)");
      flash.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = flash;
      ctx.beginPath();
      ctx.ellipse(0, 0, flashLen, flashH * 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.98)";
      ctx.beginPath();
      ctx.ellipse(0, 0, flashLen * 0.92, Math.max(0.4, flashH * 0.22), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawCrate3d(ctx, z) {
    var max = z.fallMax || 1;
    var k = z.falling ? Math.max(0, z.falling / max) : 0;
    var lift = z.kind === "supply_drop" ? k * 188 : (z.falling || 0) * 80;
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.fillStyle = "rgba(0,0,0," + Math.max(0.08, 0.34 - lift * 0.0014) + ")";
    ctx.beginPath();
    ctx.ellipse(0, 5, 11 + lift * 0.04, 4.4 + lift * 0.02, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(0, -lift);
    if (z.kind === "supply_drop" && lift > 10) {
      var sway = Math.sin((z.falling || 0) * 5) * 6;
      ctx.save();
      ctx.translate(sway * 0.25, 0);
      ctx.fillStyle = "rgba(220, 70, 70, 0.92)";
      ctx.beginPath();
      ctx.ellipse(0, -34, 22, 10, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 230, 230, 0.55)";
      ctx.beginPath();
      ctx.ellipse(-8, -36, 6, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(40, 20, 10, 0.55)";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-18, -32);
      ctx.lineTo(-6, -8);
      ctx.moveTo(18, -32);
      ctx.lineTo(6, -8);
      ctx.moveTo(0, -34);
      ctx.lineTo(0, -8);
      ctx.stroke();
      ctx.restore();
      ctx.rotate(sway * 0.012);
    }
    isoCube(ctx, 9, 12, "#e0a85a", "#c48a3a", "#8a5a22");
    ctx.strokeStyle = "rgba(60, 32, 10, 0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6, -14);
    ctx.lineTo(6, -20);
    ctx.moveTo(0, -8);
    ctx.lineTo(0, -20);
    ctx.stroke();
    ctx.fillStyle = "#3a2410";
    ctx.fillRect(-3, -7, 6, 3);
    ctx.restore();
  }

  function deployDrawPos(dp) {
    if (dp.toss) return { x: dp.toss.x, y: dp.toss.y, z: dp.toss.z || 0, spin: dp.toss.spin || 0 };
    return { x: dp.x, y: dp.y, z: 0, spin: 0 };
  }

  function drawMechDog(ctx, m, time) {
    var z = m.leapZ || 0;
    var rk = retireK(m);
    ctx.save();
    ctx.translate(m.x, m.y);
    if (rk > 0) {
      applyRetirePose(ctx, rk, "slump");
      ctx.globalAlpha *= Math.max(0.12, 1 - rk * 0.78);
    }
    groundShadow(ctx, 11 + z * 0.1, 4.2, 0.32 * (1 - Math.min(0.55, z / 50)));
    ctx.translate(0, -z);
    ctx.save();
    ctx.scale(m.facing < 0 ? -1 : 1, 1);
    isoCube(ctx, 8, 7, "#c8d0d8", "#6a727c", "#3a4248");
    ctx.save();
    ctx.translate(7, -4);
    isoCube(ctx, 4.4, 5.5, "#d8e0e8", "#7a828c", "#4a5258");
    ctx.fillStyle = (m.lureT || 0) > 0 ? "#ff7a3a" : "#7af0ff";
    ctx.beginPath();
    ctx.ellipse(2.4, -7.2, 3.4, 1.7, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a9098";
    ctx.beginPath();
    ctx.moveTo(-1.6, -10);
    ctx.lineTo(0.4, -16);
    ctx.lineTo(2.2, -10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(-4, 1);
    isoCyl(ctx, 1.7, 6, "#5a6068", "#2a3038");
    ctx.restore();
    ctx.save();
    ctx.translate(5, 1);
    isoCyl(ctx, 1.7, 6, "#5a6068", "#2a3038");
    ctx.restore();
    ctx.fillStyle = "#e8eef4";
    ctx.fillRect(9, -2.2, 6, 1.8);
    ctx.fillRect(9, 0.8, 5, 1.5);
    if ((m.barkFlash || 0) > 0 && rk <= 0) {
      ctx.globalAlpha = Math.min(1, m.barkFlash * 3.2);
      ctx.strokeStyle = "#ffb070";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(12, -6, 10, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(16, -6, 16, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (rk <= 0) {
      if (m.immortal) drawHpPip(ctx, m.t, m.maxT || 15, 9, "#ffd24a");
      else drawHpPip(ctx, m.hp, m.maxHp, 9);
    }
    if (rk > 0) drawRetireBits(ctx, rk, ["#d8e0e8", "#7af0ff", "#fff4d0"]);
    ctx.restore();
  }

  function drawShieldGen(ctx, dp, time) {
    var pos = deployDrawPos(dp);
    var squash = dp.landSquash || 0;
    var rk = retireK(dp);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    if (rk > 0) {
      applyRetirePose(ctx, rk, "slump");
      ctx.globalAlpha *= Math.max(0.12, 1 - rk * 0.78);
    }
    var r = (dp.range || 86) * (rk > 0 ? Math.max(0.08, 1 - rk) : 1);
    if (!dp.toss && (dp.hp > 0 || rk > 0)) {
      var pulse = 0.5 + Math.sin((time + (dp.pulse || 0)) * 3.2) * 0.14;
      var a = 0.1 + pulse * 0.1;
      ctx.fillStyle = "rgba(90, 190, 255," + a + ")";
      ctx.strokeStyle = "rgba(140, 220, 255," + (0.4 + pulse * 0.4) + ")";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(200, 240, 255," + (0.18 + pulse * 0.22) + ")";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
      ctx.stroke();
    }
    groundShadow(ctx, 13 + pos.z * 0.08, 5, dp.toss ? 0.18 : 0.4);
    ctx.translate(0, -pos.z);
    if (pos.spin) ctx.rotate(pos.spin);
    if (squash > 0) ctx.scale(1 + squash * 0.28, 1 - squash * 0.2);
    isoCube(ctx, 11, 10, "#7aa0c0", "#3a5870", "#1a2838");
    isoCyl(ctx, 7.5, 5, "#8ad4ff", "#3a6a88");
    isoCyl(ctx, 3.6, 14, "#e8f8ff", "#5a90aa");
    ctx.fillStyle = dp.hp > 0 ? "rgba(190, 245, 255, 0.9)" : "#667080";
    ctx.beginPath();
    ctx.ellipse(0, -22, 9, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!dp.toss && rk <= 0) drawHpPip(ctx, dp.hp, dp.maxHp, 10);
    if (rk > 0) drawRetireBits(ctx, rk, ["#9ad4ff", "#e8f8ff", "#7ad4ff"]);
    ctx.restore();
  }

  function drawMegaphone(ctx, dp, time) {
    var pos = deployDrawPos(dp);
    var squash = dp.landSquash || 0;
    var rk = retireK(dp);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    if (rk > 0) {
      applyRetirePose(ctx, rk, "slump");
      ctx.globalAlpha *= Math.max(0.12, 1 - rk * 0.78);
    }
    var rings = dp.rings || [];
    if (rk <= 0) {
      for (var i = 0; i < rings.length; i++) {
        var ringK = 1 - rings[i].t / (rings[i].max || 0.42);
        ctx.globalAlpha = (1 - ringK) * 0.55;
        ctx.strokeStyle = "#ffc060";
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(0, 0, 14 + ringK * (dp.range || 216), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = rk > 0 ? Math.max(0.12, 1 - rk * 0.78) : 1;
    groundShadow(ctx, 12 + pos.z * 0.08, 4.5, dp.toss ? 0.18 : 0.38);
    ctx.translate(0, -pos.z);
    if (pos.spin) ctx.rotate(pos.spin);
    if (squash > 0) ctx.scale(1 + squash * 0.3, 1 - squash * 0.22);
    isoCube(ctx, 8, 8, "#4a4a54", "#2a2a32", "#121218");
    isoCyl(ctx, 3.2, 10, "#ffb24a", "#a86820");
    ctx.save();
    ctx.translate(5, -12);
    ctx.rotate(-0.35);
    ctx.fillStyle = "#ffb24a";
    ctx.beginPath();
    ctx.moveTo(-2, 5);
    ctx.lineTo(15, 11);
    ctx.lineTo(15, -11);
    ctx.lineTo(-2, -5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2a2218";
    ctx.beginPath();
    ctx.ellipse(15, 0, 2.4, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 230, 160, 0.35)";
    ctx.beginPath();
    ctx.ellipse(15, 0, 1.4, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (!dp.toss && rk <= 0) {
      if (dp.immortal) drawHpPip(ctx, dp.t, dp.maxT || 15, 9, "#ffd24a");
      else drawHpPip(ctx, dp.hp, dp.maxHp, 9);
    }
    if (rk > 0) drawRetireBits(ctx, rk, ["#ffc060", "#ffb24a", "#fff4d0"]);
    ctx.restore();
  }

  function drawGround(ctx, state) {
    ensure(state);
    var i;
    for (i = 0; i < state.zones.length; i++) {
      var z = state.zones[i];
      if (z.kind !== "crack") continue;
      ctx.save();
      try {
        var rk = retireK(z);
        if (rk > 0) {
          ctx.translate(z.x, z.y);
          applyRetirePose(ctx, rk, "sink");
          ctx.globalAlpha *= Math.max(0.06, 1 - rk * 0.7);
          ctx.translate(-z.x, -z.y);
        }
        drawCrackGround(ctx, z, state.time);
      } catch (eG) {}
      ctx.restore();
    }
  }

  function draw(ctx, state) {
    ensure(state);
    var i;
    for (i = 0; i < state.zones.length; i++) {
      var z = state.zones[i];
      ctx.save();
      var rk = retireK(z);
      if (rk > 0) {
        if (z.kind === "beacon" && z.global) {
          ctx.globalAlpha *= Math.max(0.04, 1 - rk);
        } else {
          ctx.translate(z.x, z.y);
          applyRetirePose(ctx, rk, zoneRetireMode(z));
          ctx.globalAlpha *= Math.max(0.06, 1 - rk * (zoneRetireMode(z) === "puff" ? 0.95 : 0.7));
          ctx.translate(-z.x, -z.y);
        }
      }
      if (z.kind === "trail") {
        ctx.fillStyle = "rgba(255, 211, 106, 0.22)";
        circle(ctx, z.x, z.y, z.r);
        ctx.fill();
      } else if (z.kind === "heal") {
        var tox = !!z.toxin;
        ctx.fillStyle = tox ? "rgba(40, 180, 110, 0.2)" : "rgba(80, 255, 140, 0.16)";
        circle(ctx, z.x, z.y, z.r);
        ctx.fill();
        ctx.strokeStyle = tox ? "rgba(80, 220, 140, 0.45)" : "rgba(120, 255, 170, 0.35)";
        ctx.lineWidth = 1.6;
        ctx.setLineDash(tox ? [5, 4] : []);
        circle(ctx, z.x, z.y, z.r);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.save();
        ctx.translate(z.x, z.y);
        groundShadow(ctx, 8, 3.2, 0.3);
        if (tox) {
          isoCyl(ctx, 7, 4, "#3a8a68", "#1a4a38");
          ctx.fillStyle = "rgba(120, 255, 180, 0.45)";
          ctx.beginPath();
          ctx.ellipse(-2, -2, 4, 2, -0.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          isoCyl(ctx, 6, 5, "#7cffb0", "#2a8a58");
          isoCyl(ctx, 3.2, 11, "#e8ffe8", "#7cffb0");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-1.2, -16, 2.4, 8);
          ctx.fillRect(-4, -13.2, 8, 2.4);
        }
        ctx.restore();
      } else if (z.kind === "cmd_aura") {
        var pulse = 0.5 + 0.5 * Math.sin((z.max - z.t) * 5);
        ctx.fillStyle = "rgba(80, 255, 160, " + (0.08 + pulse * 0.07) + ")";
        circle(ctx, z.x, z.y, z.r);
        ctx.fill();
        ctx.strokeStyle = "rgba(160, 255, 200, " + (0.4 + pulse * 0.4) + ")";
        ctx.lineWidth = 2.2;
        circle(ctx, z.x, z.y, z.r);
        ctx.stroke();
        ctx.save();
        ctx.translate(z.x, z.y);
        groundShadow(ctx, 7, 3, 0.32);
        isoCyl(ctx, 5, 6, "#7cffb0", "#2a7050");
        isoCyl(ctx, 2.2, 16, "#e8ffe8", "#7cffb0");
        ctx.restore();
      } else if (z.kind === "smoke") {
        drawSmokeVolume(ctx, z, state.time || 0);
      } else if (z.kind === "spot" || z.kind === "obsmark") {
        ctx.strokeStyle = "rgba(128, 224, 255, 0.8)";
        ctx.lineWidth = 2;
        circle(ctx, z.x, z.y, z.r);
        ctx.stroke();
        ctx.fillStyle = "rgba(128, 224, 255, 0.08)";
        ctx.fill();
        ctx.save();
        ctx.translate(z.x, z.y);
        groundShadow(ctx, 5, 2.2, 0.3);
        isoCyl(ctx, 2, 18, "#7ad8ff", "#2a6080");
        ctx.fillStyle = "rgba(255, 240, 140, 0.85)";
        ctx.beginPath();
        ctx.ellipse(0, -20, 4.5, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (z.kind === "anchor" || z.kind === "beacon") {
        if (z.global) {
          var pb = G.playfield(state);
          ctx.fillStyle = "rgba(180, 30, 40, 0.12)";
          ctx.fillRect(pb.x0, pb.y0, pb.x1 - pb.x0, pb.y1 - pb.y0);
          ctx.fillStyle = "rgba(255, 80, 50, 0.08)";
          for (var smk = 0; smk < 10; smk++) {
            var sx = pb.x0 + ((smk * 97 + (state.time || 0) * 40) % (pb.x1 - pb.x0));
            var sy = pb.y0 + ((smk * 53 + (state.time || 0) * 28) % (pb.y1 - pb.y0));
            ctx.beginPath();
            ctx.arc(sx, sy, 26 + (smk % 4) * 8, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          drawAnchor3d(ctx, z);
        }
      } else if (z.kind === "blackhole") {
        drawBlackHole(ctx, z, state.time || 0);
      } else if (z.kind === "bubble") {
        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.fillStyle = "rgba(154, 212, 255, 0.12)";
        circle(ctx, 0, 0, z.r);
        ctx.fill();
        ctx.strokeStyle = "rgba(200, 240, 255, 0.75)";
        ctx.lineWidth = 2.4;
        ctx.stroke();
        isoCyl(ctx, 5, 10, "rgba(220, 245, 255, 0.55)", "rgba(120, 180, 220, 0.4)");
        ctx.restore();
      } else if (z.kind === "forcewall") {
        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.rotate(z.ang || 0);
        var fw = z.w || 150;
        var fh = z.h || 18;
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath();
        ctx.ellipse(0, 8, fw * 0.48, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(120, 60, 28, 0.85)";
        ctx.fillRect(-fw / 2, -28, fw, 28);
        ctx.fillStyle = "rgba(255, 210, 160, 0.95)";
        ctx.beginPath();
        ctx.ellipse(0, -28, fw / 2, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 230, 190, 0.7)";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
      } else if (z.kind === "phalanx") {
        drawPhalanxRing(ctx, state, z);
      } else if (z.kind === "lure") {
        ctx.save();
        ctx.translate(z.x, z.y);
        groundShadow(ctx, 8, 3, 0.3);
        isoCyl(ctx, 5, 8, "#e8d080", "#8a7030");
        ctx.restore();
      } else if (z.kind === "fire") {
        drawFireVolume(ctx, z, state.time || 0, false);
      } else if (z.kind === "napalm") {
        drawFireVolume(ctx, z, state.time || 0, !!z.whiteHot);
      } else if (z.kind === "acid") {
        ctx.fillStyle = "rgba(140, 220, 40, 0.22)";
        circle(ctx, z.x, z.y, z.r);
        ctx.fill();
        ctx.strokeStyle = "rgba(180, 255, 70, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "rgba(200, 255, 90, 0.35)";
        circle(ctx, z.x - 4, z.y - 2, z.r * 0.28);
        ctx.fill();
      } else if (z.kind === "sandstorm") {
        ctx.fillStyle = "rgba(196, 160, 106, 0.28)";
        circle(ctx, z.x, z.y, z.r);
        ctx.fill();
        ctx.strokeStyle = "rgba(232, 200, 140, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (z.kind === "honey") {
        var liq = !!z.liquid;
        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.fillStyle = liq ? "rgba(196, 120, 20, 0.32)" : "rgba(0,0,0,0.16)";
        ctx.beginPath();
        ctx.ellipse(2, 6, z.r * 0.95, z.r * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = liq ? "rgba(232, 150, 32, 0.55)" : "rgba(232, 180, 48, 0.28)";
        ctx.beginPath();
        ctx.ellipse(0, 0, z.r, z.r * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = liq ? "rgba(255, 210, 90, 0.5)" : "rgba(255, 220, 120, 0.4)";
        ctx.beginPath();
        ctx.ellipse(-z.r * 0.18, -z.r * 0.08, z.r * (liq ? 0.55 : 0.62), z.r * 0.28, -0.3, 0, Math.PI * 2);
        ctx.fill();
        if (liq) {
          ctx.strokeStyle = "rgba(255, 230, 140, 0.45)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 0, z.r * 0.92, z.r * 0.55, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.strokeStyle = liq ? "rgba(255, 180, 40, 0.4)" : "rgba(255, 220, 90, 0.32)";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, z.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      } else if (z.kind === "crack") {
        /* chão: G.tactics.drawGround, abaixo das entidades */
      } else if (z.kind === "moon_spot" || z.kind === "moon_burn") {
        var mp = 0.5 + Math.sin((state.time || 0) * 5) * 0.2;
        var grd = ctx.createRadialGradient(z.x, z.y, 8, z.x, z.y, z.r * 2.2);
        grd.addColorStop(0, "rgba(200, 230, 255, " + (0.35 + mp * 0.2) + ")");
        grd.addColorStop(0.45, "rgba(80, 140, 255, 0.18)");
        grd.addColorStop(1, "rgba(20, 40, 80, 0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(180, 220, 255, " + (0.5 + mp * 0.4) + ")";
        ctx.lineWidth = 3;
        circle(ctx, z.x, z.y, z.r);
        ctx.stroke();
      } else if (z.kind === "scrap") {
        ctx.save();
        ctx.translate(z.x, z.y);
        groundShadow(ctx, 9, 3.5, 0.35);
        isoCube(ctx, 7, 8, "#c8dce0", "#7a9aaa", "#4a6068");
        ctx.restore();
      } else if (z.kind === "fluid") {
        ctx.save();
        ctx.translate(z.x, z.y);
        groundShadow(ctx, 8, 3, 0.3);
        isoCyl(ctx, 6, 9, "#ffe08a", "#c45a18");
        ctx.fillStyle = "#ffe08a";
        ctx.beginPath();
        ctx.ellipse(-2, -10, 2.4, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (z.kind === "coil") {
        ctx.save();
        ctx.translate(z.x, z.y);
        groundShadow(ctx, 8, 3.2, 0.32);
        isoCyl(ctx, 6, 14, "#a8f6ff", "#3a6a78");
        ctx.restore();
      } else if (z.kind === "standard") {
        drawBanner3d(ctx, z, state.time || 0);
      } else if (z.kind === "crate" || z.kind === "supply_drop") {
        drawCrate3d(ctx, z);
      }
      if (rk > 0 && !(z.kind === "beacon" && z.global)) {
        ctx.save();
        ctx.translate(z.x, z.y);
        drawRetireBits(ctx, rk, zoneRetirePal(z));
        ctx.restore();
      }
      ctx.restore();
    }

    drawFirewaves(ctx, state);

    if (state.beams) {
      for (i = 0; i < state.beams.length; i++) {
        var bm = state.beams[i];
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (bm.kind === "tesla" && bm.pts && bm.pts.length) {
          drawTeslaBolt(ctx, bm);
        } else {
          ctx.strokeStyle = bm.color || "#7af7ff";
          ctx.globalAlpha = 0.85;
          ctx.lineWidth = bm.w;
          ctx.beginPath();
          ctx.moveTo(bm.x0, bm.y0);
          ctx.lineTo(bm.x1, bm.y1);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    if (state.joltArcs) {
      for (i = 0; i < state.joltArcs.length; i++) {
        var ja = state.joltArcs[i];
        ctx.save();
        ctx.globalAlpha = Math.max(0.25, Math.min(1, (ja.t || 0.16) / 0.18));
        drawTeslaBolt(ctx, ja);
        ctx.restore();
      }
    }

    if (hasBumper(state)) {
      var g = bumperGeom(state);
      if (g) {
        var up = bumperUp(state);
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.lineCap = "round";
        if (up) {
          ctx.fillStyle = "rgba(154, 212, 255, 0.07)";
          circle(ctx, 0, 0, g.r);
          ctx.fill();
          var plates = 10;
          for (var pl = 0; pl < plates; pl++) {
            var pa = -Math.PI / 2 + ((pl + 0.5) / plates) * Math.PI * 2;
            var px = Math.cos(pa) * g.r;
            var py = Math.sin(pa) * g.r;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(pa + Math.PI / 2);
            ctx.fillStyle = "rgba(20, 40, 60, 0.55)";
            ctx.fillRect(-5, -16, 10, 16);
            ctx.fillStyle = "rgba(180, 230, 255, 0.55)";
            ctx.beginPath();
            ctx.ellipse(0, -16, 5, 2.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          var hp = state.bumperHp | 0;
          var max = state.bumperMax || bumperCap(state);
          for (var pi = 0; pi < max; pi++) {
            var t = -Math.PI / 2 + ((pi + 0.5) / max) * Math.PI * 2;
            ctx.fillStyle = pi < hp ? "#d8f4ff" : "rgba(80, 110, 140, 0.45)";
            circle(ctx, Math.cos(t) * g.r, Math.sin(t) * g.r, 3.2);
            ctx.fill();
          }
        } else {
          var frac = 1 - Math.max(0, Math.min(1, (state.bumperCd || 0) / BUMPER_CD));
          ctx.strokeStyle = "rgba(122, 160, 200, 0.28)";
          ctx.lineWidth = 6;
          ctx.setLineDash([7, 8]);
          ctx.beginPath();
          ctx.arc(0, 0, g.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = "rgba(154, 212, 255, 0.5)";
          ctx.beginPath();
          ctx.arc(0, 0, g.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    if (has(state, "comandante")) {
      var cmd = lead(state, "comandante");
      var ap = aim(state);
      if (cmd) {
        ctx.strokeStyle = "rgba(255, 210, 74, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cmd.x, cmd.y);
        ctx.lineTo(ap.x, ap.y);
        ctx.stroke();
      }
      if (state.cmdMark) {
        ctx.strokeStyle = "#ffd24a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(state.cmdMark.x, state.cmdMark.y, (state.cmdMark.def.size || 12) + 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (state.bombLine) {
      ctx.strokeStyle = "rgba(90, 208, 200, 0.85)";
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(state.bombLine.x0, state.bombLine.y0);
      ctx.lineTo(state.bombLine.x1, state.bombLine.y1);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (state.bombPending) {
      ctx.strokeStyle = "rgba(255, 210, 74, 0.7)";
      ctx.beginPath();
      ctx.moveTo(state.bombPending.x0, state.bombPending.y0);
      ctx.lineTo(state.bombPending.x1, state.bombPending.y1);
      ctx.stroke();
    }

    if (state.guerrillaMenu) {
      var gm = state.guerrillaMenu;
      var hud = guerrillaHud(state);
      var inner = 26;
      var outer = 86;
      var items = [
        { id: "square", icon: "✚", name: "Aura", col: "#7cffb0", ready: hud.crate <= 0, a0: -Math.PI / 2 - Math.PI / 3, a1: -Math.PI / 2 + Math.PI / 3 },
        { id: "triangle", icon: "△", name: "Airstrike", col: "#ff9a3a", ready: hud.strike <= 0, a0: -Math.PI / 2 + Math.PI / 3, a1: -Math.PI / 2 + Math.PI },
        { id: "circle", icon: "○", name: "Recruta", col: "#9ad4ff", ready: hud.recruit <= 0 && hud.recruitsLeft > 0, a0: -Math.PI / 2 + Math.PI, a1: -Math.PI / 2 + Math.PI * 5 / 3 }
      ];
      ctx.save();
      ctx.translate(gm.x, gm.y);
      ctx.beginPath();
      ctx.arc(0, 0, outer + 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(8, 12, 22, 0.55)";
      ctx.fill();
      for (var gi = 0; gi < items.length; gi++) {
        var it = items[gi];
        var on = gm.hover === it.id;
        ctx.beginPath();
        ctx.moveTo(Math.cos(it.a0) * inner, Math.sin(it.a0) * inner);
        ctx.arc(0, 0, outer, it.a0, it.a1);
        ctx.arc(0, 0, inner, it.a1, it.a0, true);
        ctx.closePath();
        ctx.fillStyle = on
          ? (it.ready ? it.col : "rgba(80, 80, 90, 0.55)")
          : (it.ready ? "rgba(20, 24, 36, 0.82)" : "rgba(16, 16, 22, 0.7)");
        ctx.fill();
        ctx.strokeStyle = on ? "#fff4c4" : "rgba(255, 210, 74, 0.35)";
        ctx.lineWidth = on ? 2.4 : 1.2;
        ctx.stroke();
        var mid = (it.a0 + it.a1) / 2;
        var ix = Math.cos(mid) * 54;
        var iy = Math.sin(mid) * 54;
        ctx.globalAlpha = it.ready ? 1 : 0.4;
        ctx.fillStyle = on && it.ready ? "#1a1208" : it.col;
        ctx.font = "bold 20px Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(it.icon, ix, iy - 7);
        ctx.font = "bold 10px Segoe UI, sans-serif";
        ctx.fillStyle = on && it.ready ? "#1a1208" : "#f0e8d0";
        ctx.fillText(it.name, ix, iy + 12);
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.arc(0, 0, inner - 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(10, 14, 24, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 210, 74, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#c8c0b0";
      ctx.font = "bold 9px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(gm.hover ? "soltar" : "cancela", 0, 0);
      ctx.restore();
    }

    if (state.turretMenu) {
      var tgm = state.turretMenu;
      ctx.save();
      ctx.strokeStyle = "rgba(200, 180, 90, 0.35)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 7]);
      ctx.beginPath();
      ctx.arc(state.squad.x, state.squad.y, TURRET_PLACE_R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(200, 180, 90, 0.12)";
      ctx.beginPath();
      ctx.arc(tgm.x, tgm.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 230, 140, 0.8)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
      var tItems = [
        { id: "square", icon: "⚡", name: "Jolt", col: "#a8f6ff", ready: true, a0: -Math.PI / 2 - Math.PI / 3, a1: -Math.PI / 2 + Math.PI / 3 },
        { id: "triangle", icon: "🔥", name: "Chamas", col: "#ff7a2a", ready: true, a0: -Math.PI / 2 + Math.PI / 3, a1: -Math.PI / 2 + Math.PI },
        { id: "circle", icon: "🔫", name: "Metralhadora", col: "#c8b45a", ready: true, a0: -Math.PI / 2 + Math.PI, a1: -Math.PI / 2 + Math.PI * 5 / 3 }
      ];
      ctx.save();
      ctx.translate(tgm.x, tgm.y);
      ctx.beginPath();
      ctx.arc(0, 0, 92, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(8, 12, 22, 0.55)";
      ctx.fill();
      for (var tii = 0; tii < tItems.length; tii++) {
        var tit = tItems[tii];
        var ton = tgm.hover === tit.id;
        ctx.beginPath();
        ctx.moveTo(Math.cos(tit.a0) * 26, Math.sin(tit.a0) * 26);
        ctx.arc(0, 0, 86, tit.a0, tit.a1);
        ctx.arc(0, 0, 26, tit.a1, tit.a0, true);
        ctx.closePath();
        ctx.fillStyle = ton ? tit.col : "rgba(20, 24, 36, 0.82)";
        ctx.fill();
        ctx.strokeStyle = ton ? "#fff4c4" : "rgba(255, 210, 74, 0.35)";
        ctx.stroke();
        var tmid = (tit.a0 + tit.a1) / 2;
        ctx.fillStyle = ton ? "#1a1208" : tit.col;
        ctx.font = "bold 18px Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tit.icon, Math.cos(tmid) * 54, Math.sin(tmid) * 54 - 7);
        ctx.font = "bold 9px Segoe UI, sans-serif";
        ctx.fillText(tit.name, Math.cos(tmid) * 54, Math.sin(tmid) * 54 + 12);
      }
      ctx.restore();
    }

    if (state.cmdStrikes) {
      for (var cs = 0; cs < state.cmdStrikes.length; cs++) {
        var st = state.cmdStrikes[cs];
        var sk = 1 - st.t / (st.max || 0.55);
        ctx.save();
        ctx.strokeStyle = "rgba(255, 154, 58, " + (0.4 + sk * 0.5) + ")";
        ctx.fillStyle = "rgba(255, 120, 40, " + (0.1 + sk * 0.16) + ")";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r * (0.55 + sk * 0.45), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 226, 74, 0.85)";
        ctx.beginPath();
        ctx.moveTo(st.x, st.y - st.r * 0.7);
        ctx.lineTo(st.x, st.y + st.r * 0.15);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(st.x, st.y + st.r * 0.32, 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (state.hook) {
      ctx.strokeStyle = "#7cffb0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(state.squad.x, state.squad.y);
      ctx.lineTo(state.hook.x, state.hook.y);
      ctx.stroke();
      ctx.fillStyle = "#b8ffd4";
      ctx.beginPath();
      ctx.arc(state.hook.x, state.hook.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (i = 0; i < state.drones.length; i++) {
      var dr = state.drones[i];
      var spec = dr.spec || droneSpec(dr.from);
      var col = spec.color || "#7af0ff";
      var sz = spec.size || 5;
      ctx.save();
      ctx.translate(dr.x, dr.y);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(1, sz * 1.1, sz * 0.9, sz * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      if (spec.fat) {
        ctx.fillStyle = "#3a6a68";
        ctx.beginPath();
        ctx.ellipse(0, 2, sz * 0.95, sz * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(0, 0, sz, sz * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#d8ffff";
        ctx.beginPath();
        ctx.ellipse(-sz * 0.2, -sz * 0.15, sz * 0.28, sz * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(232, 255, 255, 0.7)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, sz + 3, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(0, 0, sz, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#e8ffff";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, sz + 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    for (i = 0; i < state.minions.length; i++) {
      var mn = state.minions[i];
      ctx.save();
      if (mn.kind === "mech_dog") {
        drawMechDog(ctx, mn, state.time || 0);
      } else if (mn.kind === "cart") {
        ctx.translate(mn.x, mn.y);
        groundShadow(ctx, 12, 4.5, 0.4);
        isoCube(ctx, 10, 10, "#d0e4e8", "#8a9aaa", "#4a5860");
        ctx.fillStyle = "#2a2a30";
        ctx.beginPath();
        ctx.ellipse(-6, 2, 3.2, 1.6, 0, 0, Math.PI * 2);
        ctx.ellipse(6, 2, 3.2, 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (mn.kind === "elite") {
        ctx.fillStyle = "#b8dcff";
        ctx.beginPath();
        ctx.arc(mn.x, mn.y, mn.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#4aa3ff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(mn.x - 10, mn.y - mn.size - 8, 20, 3);
        ctx.fillStyle = "#7cffb0";
        ctx.fillRect(mn.x - 10, mn.y - mn.size - 8, 20 * (mn.hp / mn.maxHp), 3);
      } else if (mn.kind === "cmd_recruit") {
        ctx.fillStyle = "#9ad4ff";
        ctx.beginPath();
        ctx.arc(mn.x, mn.y, mn.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#d7f1ff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(mn.x - 10, mn.y - mn.size - 8, 20, 3);
        ctx.fillStyle = "#7cffb0";
        ctx.fillRect(mn.x - 10, mn.y - mn.size - 8, 20 * (mn.hp / mn.maxHp), 3);
      } else {
        ctx.fillStyle = "#9ad4ff";
        ctx.beginPath();
        ctx.arc(mn.x, mn.y, mn.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    for (i = 0; i < state.deploys.length; i++) {
      var dp = state.deploys[i];
      if (dp.kind === "coil_tower") {
        drawCoilTower(ctx, dp, state.time || 0);
      } else if (dp.kind === "shield_gen") {
        drawShieldGen(ctx, dp, state.time || 0);
      } else if (dp.kind === "megaphone") {
        drawMegaphone(ctx, dp, state.time || 0);
      } else {
        drawTurretSprite(ctx, dp, state.time || 0);
      }
    }
    for (i = 0; i < state.stickies.length; i++) {
      var st = state.stickies[i];
      ctx.save();
      ctx.translate(st.x + 4, st.y - 8);
      groundShadow(ctx, 7, 2.8, 0.35);
      isoCube(ctx, 5.5, 10, "#c45a2a", "#5a2a20", "#2a2a38");
      ctx.fillStyle = Math.sin((state.time || 0) * 16) > 0 ? "#ff4a2a" : "#ffe08a";
      ctx.beginPath();
      ctx.ellipse(0, -16, 2.4, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (i = 0; i < state.enemies.length; i++) {
      var mk = state.enemies[i];
      if (mk.hp <= 0) continue;
      if ((mk.obsMarkT || 0) > 0) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 226, 74, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mk.x, mk.y, (mk.def.size || 12) + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (mk.reconDarts && mk.reconDarts.length) {
        for (var rd = 0; rd < mk.reconDarts.length; rd++) {
          var dart = mk.reconDarts[rd];
          ctx.save();
          ctx.translate(mk.x + Math.cos(dart.ang) * dart.off, mk.y + Math.sin(dart.ang) * dart.off);
          ctx.rotate(dart.ang);
          ctx.fillStyle = dart.color || "#8af0d8";
          ctx.beginPath();
          ctx.moveTo(6, 0);
          ctx.lineTo(-4, -2.2);
          ctx.lineTo(-4, 2.2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      if (!(mk.reconMark > 0) || (mk.reconMarkT || 0) <= 0) continue;
      ctx.save();
      ctx.strokeStyle = "rgba(138, 240, 216, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(mk.x, mk.y, (mk.def.size || 12) + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (state.phaseOn) {
      ctx.fillStyle = "rgba(160, 144, 255, 0.08)";
      var pb2 = G.playfield(state);
      ctx.fillRect(pb2.x0, pb2.y0, pb2.x1 - pb2.x0, pb2.y1 - pb2.y0);
    }

    var atm = lead(state, "anti_material");
    if (atm) {
      ctx.fillStyle = "#3ec0ff";
      ctx.font = "bold 11px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText((atm.atmShots || 0) + "/7", atm.x, atm.y - (atm.def.size || 15) - 10);
    }
    for (var wi = 0; wi < state.units.length; wi++) {
      var wu = state.units[wi];
      if (!wu || wu.hp <= 0 || wu.kind !== "warlord" || wu.held || wu.stowed) continue;
      var stacks = wu.warStacks || 0;
      ctx.fillStyle = stacks >= 10 ? "#ffe0c4" : "#c41e3a";
      ctx.font = "bold 11px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(stacks + "/10", wu.x, wu.y - (wu.def.size || 15) - 11);
      var band = wu.warBand;
      if (band) {
        for (var wb = 0; wb < band.length; wb++) {
          if (G.drawWarlordEscort) G.drawWarlordEscort(ctx, band[wb], state.time || 0);
        }
      }
    }

    var firingNow = !!(state.pointer && state.pointer.fireHold);
    for (var ri = 0; ri < state.units.length; ri++) {
      var ru = state.units[ri];
      if (!ru || ru.hp <= 0 || ru.kind !== "ceifador" || ru.held || ru.stowed) continue;
      if (ru.leap && ru.leap.slash) {
        drawReaperCast(ctx, ru);
        continue;
      }
      var engage = ru.def.range || 200;
      var aoe = ru.def.aoe || 60;
      var pulse = 0.22 + Math.sin((ru.scytheSpin || 0) * 0.85) * 0.08;
      if (firingNow && !ru.leap) {
        ctx.save();
        ctx.strokeStyle = "rgba(196,30,58,0.22)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.arc(ru.x, ru.y, engage, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      ctx.save();
      ctx.strokeStyle = firingNow && !ru.leap ? "rgba(196,30,58,0.7)" : "rgba(196,30,58,0.2)";
      ctx.lineWidth = firingNow && !ru.leap ? 2 : 1.2;
      ctx.globalAlpha = firingNow && !ru.leap ? 0.75 + pulse : 0.32;
      ctx.beginPath();
      ctx.arc(ru.x, ru.y, aoe, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      drawReaperCast(ctx, ru);
    }

    if (state.vfx) {
      for (var vx = 0; vx < state.vfx.length; vx++) {
        var fx = state.vfx[vx];
        if (fx.phalanxBeam) {
          drawPhalanxBeam(ctx, fx);
          continue;
        }
        if (fx.warSlash) {
          drawWarSlash(ctx, fx);
          continue;
        }
        if (fx.coloBeam) {
          drawColoBeam(ctx, fx);
          continue;
        }
        if (fx.coloSlash) {
          drawColoSlash(ctx, fx);
          continue;
        }
        if (fx.coloSlam) {
          drawColoSlam(ctx, fx);
          continue;
        }
        if (fx.coloBash) {
          drawColoBash(ctx, fx);
          continue;
        }
        if (fx.coloPunch) {
          drawColoPunch(ctx, fx);
          continue;
        }
        if (fx.scalpelRain) {
          drawScalpelRain(ctx, fx);
          continue;
        }
        if (!fx.slash) continue;
        if (fx.sweep) drawReapSweep(ctx, fx);
        else drawScytheRing(ctx, fx);
      }
    }
  }

  function pickupDrop(state, d) {
    if (d.kind === "hp") {
      healSquad(state, d.value || 14);
      G.audio.coin();
      state.floaters.push(G.createFloater(d.x, d.y, "+" + (d.value || 14) + " HP", "#7cffb0"));
      return true;
    }
    return false;
  }

  function shieldProtects(state, ox, oy, tx, ty) {
    if (!bumperUp(state)) return false;
    var g = bumperGeom(state);
    if (!g) return false;
    if (hypot(ox - g.x, oy - g.y) <= g.r + 6) return false;
    return hypot(tx - g.x, ty - g.y) < g.r;
  }

  function inBanner(state, x, y) {
    for (var i = 0; i < (state.zones || []).length; i++) {
      var z = state.zones[i];
      if (z.kind !== "standard" || z.retiring) continue;
      if (hypot(x - z.x, y - z.y) < z.r) return true;
    }
    return false;
  }

  function listStatus(state) {
    var out = [];
    function add(id, icon, name, desc, col, t, max) {
      if (!(t > 0.04)) return;
      out.push({ id: id, icon: icon, name: name, desc: desc, col: col, t: t, max: max || Math.max(t, 1) });
    }
    var run = state.run || {};
    var tt = run.tempT || 0;
    if ((run.tempDmg || 1) > 1.01 && tt > 0) add("bravura", "⚔", "Bravura", "+40% de dano.", "#ff9a3a", tt, 6);
    if ((run.tempSpeed || 1) > 1.01 && tt > 0) add("marcha", "⇢", "Marcha", "+40% de velocidade.", "#ffe08a", tt, 6);
    if ((run.tempShield || 0) > 0 && tt > 0) add("couraca", "🛡", "Couraça", "35% de redução de dano.", "#9ad4ff", tt, 6);
    if ((run.activeFire || 0) > 0) add("rajada", "⌁", "Rajada", "+50% de cadência.", "#ffb070", run.activeFireT || 0, 6);
    if ((state.bannerMagnetT || 0) > 0) add("ima", "◎", "Ímã", "Puxa loot de mais longe.", "#e8d080", state.bannerMagnetT, 6);
    if ((state.bannerFreezeT || 0) > 0) add("gelo", "❄", "Gelo", "Os tiros congelam inimigos.", "#7ad8ff", state.bannerFreezeT, 6);
    if ((state.bannerFireT || 0) > 0) add("chamas", "🔥", "Chamas", "O esquadrão deixa fogo no chão.", "#ff7a2a", state.bannerFireT, 5);
    if ((state.bannerGoldT || 0) > 0) add("fortuna", "$", "Fortuna", "+50% de ouro coletado.", "#ffd24a", state.bannerGoldT, 8);
    if ((state.bannerKnockT || 0) > 0) add("impacto", "💥", "Impacto", "Os tiros empurram inimigos.", "#ff8a4a", state.bannerKnockT, 6);
    if ((state.coloOverT || 0) > 0) {
      var left = state.coloSlashLeft | 0;
      add(
        "energy_blade",
        "⚔",
        "Lâmina de energia",
        left === 1 ? "1 slash de luz restante. Bem mais lento." : "Atirar: " + left + " slashes de luz restantes. Bem mais lentos.",
        "#7af7ff",
        left,
        state.coloSlashMax || COLO_SLASH_N
      );
    }
    if ((run.fluidT || 0) > 0) add("fluido", "⚗", "Fluido", "+50% de dano.", "#ff8a2a", run.fluidT, 3);
    for (var i = 0; i < (state.zones || []).length; i++) {
      var z = state.zones[i];
      if (z.kind !== "standard") continue;
      var inside = hypot(state.squad.x - z.x, state.squad.y - z.y) <= (z.r || 0);
      add(
        "estandarte",
        "🚩",
        "Estandarte",
        inside
          ? "No círculo: +40% dano, cadência e velocidade. Loot é puxado sozinho."
          : "Fincado. Entre no círculo: +40% dano, cadência e velocidade. Loot dentro é puxado.",
        "#e8d080",
        z.t,
        z.max || 15
      );
    }
    return out;
  }

  G.tactics = {
    ensure: ensure,
    update: update,
    draw: draw,
    drawGround: drawGround,
    playerShoot: playerShoot,
    onAltDown: onAltDown,
    onAltUp: onAltUp,
    onFireDown: onFireDown,
    onFireUp: onFireUp,
    speedMul: speedMul,
    blockHurt: blockHurt,
    holdingLeap: holdingLeap,
    skipContact: skipContact,
    onBulletHit: onBulletHit,
    absorbBumper: absorbBumper,
    shieldPhysics: shieldPhysics,
    preProjectiles: preProjectiles,
    enemyAim: enemyAim,
    enemyTarget: enemyTarget,
    tickConfuse: tickConfuse,
    useActive: useActive,
    pickupDrop: pickupDrop,
    healSquad: healSquad,
    inBanner: inBanner,
    shieldProtects: shieldProtects,
    phalanxSmash: phalanxSmash,
    onEnemyKilled: onEnemyKilled,
    selectedUnit: selectedUnit,
    selectedId: selectedId,
    meltCone: meltCone,
    guerrillaHud: guerrillaHud,
    recruitWithArquivo: recruitWithArquivo,
    listStatus: listStatus,
    beginRetire: beginRetire,
    retireK: retireK,
    applyRetirePose: applyRetirePose,
    drawRetireBits: drawRetireBits,
    has: has
  };
})(window.TFAG = window.TFAG || {});
