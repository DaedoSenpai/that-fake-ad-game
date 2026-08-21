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
    if (!e || e.hp <= 0) return;
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
    if (state.bumperHp == null) state.bumperHp = 5;
    if (state.bumperCd == null) state.bumperCd = 0;
    if (state.bumperMax == null) state.bumperMax = 5;
    if (state.tankFireMode == null) state.tankFireMode = 0;
    if (state.tankBarrageUsed == null) state.tankBarrageUsed = false;
    if (state.coilSeq == null) state.coilSeq = 0;
    if (!state.cmdOrders) state.cmdOrders = { crate: 0, recruit: 0, strike: 0 };
    if (state.cmdRecruitUsed == null) state.cmdRecruitUsed = 0;
    if (!state.cmdStrikes) state.cmdStrikes = [];
  }

  function healSquad(state, amt) {
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0) continue;
      u.hp = Math.min(u.maxHp, u.hp + amt);
    }
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
    var best = null;
    var bestD = 1e9;
    for (var i = 0; i < state.zones.length; i++) {
      var z = state.zones[i];
      if (z.kind !== "spot") continue;
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

  function collectLoot(state) {
    var p = aim(state);
    if (!has(state, "comandante") || !state.drops) return false;
    for (var i = state.drops.length - 1; i >= 0; i--) {
      var d = state.drops[i];
      if (d.kind !== "unit") continue;
      if (hypot(d.x - p.x, d.y - p.y) > 32) continue;
      if (G.codex) G.codex.unlockUnit(d.unitKind || "recruta");
      G.merge.addArquivo(state, d.x, d.y);
      state.floaters.push(G.createFloater(d.x, d.y, "arquivo", "#ffd24a"));
      G.burst(state, d.x, d.y, "#ffd24a", 10, 70);
      state.drops.splice(i, 1);
      return true;
    }
    return false;
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
        if (state.zones[zi].kind === "cmd_aura") state.zones.splice(zi, 1);
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
      if ((state.cmdRecruitUsed | 0) >= GUER_RECRUIT_CAP) {
        state.floaters.push(G.createFloater(pos.x, pos.y - 18, "limite da fase", "#9ad4ff"));
        return false;
      }
      if (o.recruit > 0) {
        state.floaters.push(G.createFloater(pos.x, pos.y - 18, "recruta em recarga", "#9ad4ff"));
        return false;
      }
      spawnGuerrillaRecruit(state, pos.x, pos.y);
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
    zone(state, { kind: "heal", x: x, y: y, r: r || 38, heal: heal || 22, t: t || 4.5 });
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
    if (state.mines.length > cap) state.mines.shift();
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
    if (state.paused || state.stageOutro) return;
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
    state.run.smokeT = Math.max(state.run.smokeT || 0, 0.28);
    if (G.combat && G.combat.spawnDashBurst) G.combat.spawnDashBurst(state, "#7ad0ff");
    else G.burst(state, state.squad.x, state.squad.y, "#7ad0ff", 14, 140);
  }

  function deployTurret(state, variant) {
    var u = lead(state, "torreta");
    if (!u) return;
    variant = variant || "mg";
    if (variant === "mg") {
      state.deploys.push({
        kind: "turret",
        variant: "mg",
        x: u.x,
        y: u.y,
        hp: 70,
        maxHp: 70,
        cooldown: 0,
        fire: 6.5,
        dmg: Math.round(u.def.dmg * 0.45),
        range: 210,
        t: 18,
        size: 14,
        noAggro: true
      });
      state.floaters.push(G.createFloater(u.x, u.y - 16, "metralhadora", "#c8b45a"));
    } else if (variant === "flame") {
      state.deploys.push({
        kind: "turret",
        variant: "flame",
        x: u.x,
        y: u.y,
        hp: 85,
        maxHp: 85,
        cooldown: 0,
        fire: 6,
        dmg: Math.round(u.def.dmg * 0.35),
        range: 110,
        t: 16,
        size: 15,
        noAggro: true
      });
      state.floaters.push(G.createFloater(u.x, u.y - 16, "lança-chamas", "#ff7a2a"));
    } else {
      var a = aim(state);
      for (var i = 0; i < 3; i++) {
        var ang = -Math.PI / 2 + (i - 1) * 0.7;
        zone(state, {
          kind: "bubble",
          x: a.x + Math.cos(ang) * 46,
          y: a.y + Math.sin(ang) * 46,
          r: 62,
          t: 10
        });
      }
      state.floaters.push(G.createFloater(a.x, a.y - 16, "bolhas", "#9ad4ff"));
    }
  }

  function openTurretMenu(state) {
    var p = aim(state);
    state.turretMenu = { x: p.x, y: p.y, hover: null };
  }

  function closeTurretMenu(state) {
    var m = state.turretMenu;
    state.turretMenu = null;
    if (!m || !m.hover) return;
    var u = lead(state, "torreta");
    if (!u || u.activeCd > 0) return;
    var map = { square: "shield", triangle: "flame", circle: "mg" };
    deployTurret(state, map[m.hover] || "mg");
    putSelectedOnCd(state);
  }

  function placeCoilTower(state, u) {
    var p = clampAim(u, aim(state), u.def.range || 300);
    var coils = [];
    for (var i = 0; i < state.deploys.length; i++) {
      if (state.deploys[i].kind === "coil_tower") coils.push(state.deploys[i]);
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
    for (var i = 0; i < (state.zones || []).length; i++) {
      var z = state.zones[i];
      if (z.kind === "beacon" && hypot(state.squad.x - z.x, state.squad.y - z.y) < z.r) mul *= 1.08;
    }
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
    if (u && u.warCombo && (u.warCombo.phase | 0) >= 2) return true;
    return false;
  }

  function blockHurt(state, unit, opts) {
    if (unit.team !== "player") return false;
    if (state.phaseOn) return true;
    if ((state.ramT || 0) > 0) return true;
    if ((state.spearRamT || 0) > 0) return true;
    if (unit.leap && !unit.leap.noIframe) return true;
    if (unit.warCombo) return true;
    if (unit.kind === "assassino" && (state.assassinHunt && state.assassinHunt.id === unit.id)) return true;
    return false;
  }

  function skipContact(state, enemy) {
    if (bumperUp(state)) {
      var g = bumperGeom(state);
      if (g && hypot(enemy.x - g.x, enemy.y - g.y) >= g.r - 6) return true;
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
      if (e.hp <= 0) continue;
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
    { id: "bravura", name: "Bravura", col: "#ff9a3a", apply: function (s) { s.run.tempDmg = Math.max(s.run.tempDmg || 1, 1.4); s.run.tempT = Math.max(s.run.tempT || 0, 6); } },
    { id: "marcha", name: "Marcha", col: "#ffe08a", apply: function (s) { s.run.tempSpeed = Math.max(s.run.tempSpeed || 1, 1.4); s.run.tempT = Math.max(s.run.tempT || 0, 6); } },
    { id: "rajada", name: "Rajada", col: "#ffb070", apply: function (s) { s.run.activeFire = 0.5; s.run.activeFireT = 6; } },
    { id: "couraca", name: "Couraça", col: "#9ad4ff", apply: function (s) { s.run.tempShield = 0.35; s.run.tempT = Math.max(s.run.tempT || 0, 6); } },
    { id: "vital", name: "Vital", col: "#7cffb0", apply: function (s) { healSquad(s, 0); for (var i = 0; i < s.units.length; i++) { var u = s.units[i]; if (u.hp > 0) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.12); } } },
    { id: "ima", name: "Ímã", col: "#e8d080", apply: function (s) { s.run.magnet = (s.run.magnet || 0) + 80; s.bannerMagnetT = 6; } },
    { id: "gelo", name: "Gelo", col: "#7ad8ff", apply: function (s) { s.run.freeze = true; s.bannerFreezeT = 6; } },
    { id: "chamas", name: "Chamas", col: "#ff7a2a", apply: function (s) { s.bannerFireT = 5; } },
    { id: "fortuna", name: "Fortuna", col: "#ffd24a", apply: function (s) { s.run.gold = (s.run.gold || 0) + 0.5; s.bannerGoldT = 8; } },
    { id: "impacto", name: "Impacto", col: "#ff8a4a", apply: function (s) { s.run.knockback = true; s.bannerKnockT = 6; } }
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
    return 1 + 0.05 * Math.min(10, (u.warFrenzy || []).length);
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
    if (!u.warFrenzy || !u.warFrenzy.length) return;
    for (var i = u.warFrenzy.length - 1; i >= 0; i--) {
      u.warFrenzy[i] -= dt;
      if (u.warFrenzy[i] <= 0) u.warFrenzy.splice(i, 1);
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
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || u.kind !== "warlord" || u.stowed) continue;
      u.warFrenzy = u.warFrenzy || [];
      u.warFrenzy.push(5);
      if (u.warFrenzy.length > 10) u.warFrenzy.shift();
      if (u.warFrenzy.length === 1 || u.warFrenzy.length === 10) {
        state.floaters.push(G.createFloater(u.x, u.y - 20, u.warFrenzy.length === 10 ? "fúria máx" : "+cadência", "#c41e3a"));
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
    zone(state, {
      kind: "phalanx",
      x: x,
      y: y,
      r: 122,
      spearLen: 56,
      count: n,
      t: 15,
      dmg: u.def.dmg,
      ownerId: u.id,
      hitCd: {},
      guards: guards
    });
    G.burst(state, x, y, "#fff0c4", 24, 170);
    state.floaters.push(G.createFloater(x, y - 18, "falange", "#fff0c4"));
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
      if (z.kind !== "phalanx") continue;
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
      if (e.hp <= 0 || (e.def && e.def.kind === "orbit_shield")) continue;
      var boss = !!(e.def && e.def.boss);
      var es = e.def.size || 10;
      for (var k = 0; k < n; k++) {
        if (!phalanxAlive(guards[k])) continue;
        var a = guards[k].ang;
        var px = z.x + Math.cos(a) * ring;
        var py = z.y + Math.sin(a) * ring;
        var sx = px + Math.cos(a) * spearLen;
        var sy = py + Math.sin(a) * spearLen;
        var bd = hypot(e.x - px, e.y - py);
        var onSpear = distToSeg(e.x, e.y, px, py, sx, sy) <= 14 + es * 0.25;
        var onBody = bd <= bodyR + es;
        if (!onSpear && !onBody) continue;
        if (boss) {
          hurtPhalanxGuard(state, z, k, true);
        } else {
          if (onBody && bd > 0.001) {
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
      ctx.fillStyle = "rgba(196, 164, 90, 0.1)";
      ctx.beginPath();
      ctx.arc(z.x, z.y, Math.max(36, ring - 28), 0, Math.PI * 2);
      ctx.fill();
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
      ctx.strokeStyle = "rgba(196, 164, 90, 0.75)";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(z.x, z.y, ring, a - half * 0.78, a + half * 0.78);
      ctx.stroke();
      ctx.restore();
      var sx = px + Math.cos(a) * spearLen;
      var sy = py + Math.sin(a) * spearLen;
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
      drawPhalanxDummy(ctx, def, px, py, a, g, time, k);
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

  function dropSupplyPack(state) {
    var p = aim(state);
    var radio = lead(state, "radio");
    var dmg = radio ? radio.def.dmg : 18;
    state.deploys.push({
      kind: "coil_tower",
      pack: true,
      x: p.x - 28,
      y: p.y,
      hp: 70,
      maxHp: 70,
      cooldown: 0,
      fire: 1,
      dmg: dmg,
      range: 128,
      fieldR: 128,
      t: 14,
      size: 13,
      seq: ++state.coilSeq,
      fed: true,
      chargeT: 14,
      zaps: []
    });
    state.deploys.push({
      kind: "turret",
      variant: "mg",
      x: p.x + 18,
      y: p.y - 22,
      hp: 70,
      maxHp: 70,
      cooldown: 0,
      fire: 6.2,
      dmg: Math.round(dmg * 0.7),
      range: 200,
      t: 14,
      size: 14,
      noAggro: true
    });
    state.deploys.push({
      kind: "turret",
      variant: "flame",
      x: p.x + 18,
      y: p.y + 22,
      hp: 80,
      maxHp: 80,
      cooldown: 0,
      fire: 6,
      dmg: Math.round(dmg * 0.5),
      range: 110,
      t: 14,
      size: 15,
      noAggro: true
    });
    state.floaters.push(G.createFloater(p.x, p.y - 18, "suprimento", "#ffcc66"));
  }

  function tickBannerSword(state, dt) {
    /* Porta-estandarte agora é melee; o buff sai no espeto. */
  }

  function update(state, dt) {
    ensure(state);
    var p = aim(state);
    var last = state.lastMouse || p;
    state.mouseSpd = hypot(p.x - last.x, p.y - last.y) / Math.max(dt, 0.008);
    state.lastMouse = { x: p.x, y: p.y };
    state.mouseHist.push({ x: p.x, y: p.y, t: state.time || 0 });
    while (state.mouseHist.length > 48) state.mouseHist.shift();

    cmdMark(state);
    guerrillaTick(state, dt);
    if (has(state, "comandante") && !state.vacuumLoot && !state.stageOutro && !state.waitingClear && !state.guerrillaMenu) collectLoot(state);
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
    updateZones(state, dt);
    syncPhalanxHold(state);
    updateStickies(state, dt);

    if (has(state, "inferno") && state.pointer && state.pointer.fireHold) {
      zone(state, { kind: "fire", x: p.x, y: p.y, r: 26, t: 5, dmg: 12 });
    }
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
      if (t.kind === "coil_tower") {
        if (!teslaAlive && !t.pack) {
          state.deploys.splice(i, 1);
          continue;
        }
        t.chargeT = Math.max(0, (t.chargeT || 0) - dt);
        var energized = !!t.fed || (t.chargeT || 0) > 0 || !!t.linked;
        t.fed = false;
        t.linked = false;
        t.zaps = [];
        if (!energized) {
          t.fieldHit = {};
          t.fieldTick = 0;
          continue;
        }
        var fieldR = t.fieldR || t.range || 128;
        var dps = (t.dmg || 26) * C().dmgMul(state) * 1.15;
        dps *= 1 + 0.22 * Math.max(0, teslaN - 1);
        if ((t.chargeT || 0) > 0) dps *= 1.7;
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
      t.t -= dt;
      t.cooldown -= dt;
      for (var ei2 = 0; ei2 < state.enemies.length; ei2++) {
        var en2 = state.enemies[ei2];
        if (en2.hp <= 0) continue;
        if (hypot(en2.x - t.x, en2.y - t.y) > (en2.def.size || 10) + (t.size || 14)) continue;
        t.hp -= (en2.def.dmg || 12) * dt * 0.85;
      }
      if (t.hp <= 0 || t.t <= 0) {
        state.deploys.splice(i, 1);
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

  function listCoils(state) {
    var list = [];
    for (var i = 0; i < state.deploys.length; i++) {
      if (state.deploys[i].kind === "coil_tower") list.push(state.deploys[i]);
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

  function updateBeams(state, dt) {
    state.beams = [];
    var tesla = lead(state, "tesla");
    var chainTick = tesla ? tesla.def.dmg * C().dmgMul(state) * 0.75 * dt : 0;
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
        ca.chargeT = Math.max(ca.chargeT || 0, 2.6);
        cb.chargeT = Math.max(cb.chargeT || 0, 2.6);
        state.beams.push(makeTeslaBolt(ca.x, ca.y - 16, cb.x, cb.y - 16, (state.time || 0) * 7 + a, 0.85));
        var pairTick = chainTick > 0 ? chainTick * 1.6 : (ca.dmg || 26) * C().dmgMul(state) * 0.55 * dt;
        joltAlongSeg(state, ca.x, ca.y, cb.x, cb.y, pairTick, chainHit);
      }
    }
    for (var ci = 0; ci < state.deploys.length; ci++) {
      var coil = state.deploys[ci];
      if (coil.kind !== "coil_tower") continue;
      if (coil.fieldHit && coil.fieldTick) shockSplash(state, coil.fieldHit, coil.fieldTick);
      if (!coil.zaps || !coil.zaps.length) continue;
      for (var zi = 0; zi < coil.zaps.length; zi++) {
        var zap = coil.zaps[zi];
        state.beams.push(makeTeslaBolt(coil.x, coil.y - 18, zap.x, zap.y, (state.time || 0) * 8 + ci + zi, 0.55));
      }
    }
    if (Object.keys(chainHit).length) shockSplash(state, chainHit, chainTick);
    if (state.pointer && state.pointer.fireHold) beamUnit(state, "tesla", dt, 9, false);
    if (state.pointer && state.pointer.fireHold) beamUnit(state, "colosso", dt, 16, true, false, true);
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
      coil.chargeT = Math.max(coil.chargeT || 0, 3.2);
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
        other.chargeT = Math.max(other.chargeT || 0, 2.8);
        frontier.push(other);
      }
    }
  }

  function meltCone(state) {
    var u = lead(state, "inferno") || lead(state, "lanca_chamas");
    if (!u) return;
    var a = mouseAng(state, u);
    var range = u.def.range;
    var cone = 0.62;
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
      if (diff < cone) state.projectiles.splice(i, 1);
    }
  }

    var BUMPER_MAX = 5;
    var BUMPER_CD = 10;
    var BUMPER_REGEN = 5;

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
    if ((state.bannerFireT || 0) > 0) {
      zone(state, { kind: "fire", x: state.squad.x, y: state.squad.y, r: 22, t: 0.35, dmg: 10 });
    }
    tickAssassinHunt(state, dt);
  }

  function bumperCap(state) {
    return has(state, "tanque") ? 10 : BUMPER_MAX;
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
    if (!bumperUp(state)) return false;
    var g = bumperGeom(state);
    if (!g) return false;
    var d = hypot(p.x - g.x, p.y - g.y);
    if (d > g.outer) return false;
    G.burst(state, p.x, p.y, "#9ad4ff", 5, 50);
    state.bumperHp = Math.max(0, (state.bumperHp || bumperCap(state)) - 1);
    if (state.bumperHp <= 0) {
      state.bumperHp = 0;
      state.bumperCd = BUMPER_CD;
      state.bumperRegenT = 0;
      state.floaters.push(G.createFloater(state.squad.x, state.squad.y - 24, "escudo quebrado", "#7aa0c8"));
    }
    return true;
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
        for (var bh = 0; bh < state.enemies.length; bh++) {
          var be = state.enemies[bh];
          if (be.hp <= 0) continue;
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
      if (z.kind === "bubble") {
        for (var bb = 0; bb < state.enemies.length; bb++) {
          var bbe = state.enemies[bb];
          if (bbe.hp <= 0 || bbe.def.kind === "orbit_shield") continue;
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
      if (z.kind === "heal") {
        if (still && hypot(state.squad.x - z.x, state.squad.y - z.y) < z.r) {
          healSquad(state, z.heal * dt);
        }
        for (var he = 0; he < state.enemies.length; he++) {
          var hen = state.enemies[he];
          if (hen.hp <= 0) continue;
          if (hypot(hen.x - z.x, hen.y - z.y) < z.r + (hen.def.size || 10)) {
            hen.slowT = Math.max(hen.slowT || 0, 0.45);
          }
        }
      }
      if (z.kind === "fire") {
        for (var e = 0; e < state.enemies.length; e++) {
          var en = state.enemies[e];
          if (en.hp > 0 && hypot(en.x - z.x, en.y - z.y) < z.r) C().hurt(state, en, z.dmg * dt, z.x, z.y, true, { trueDmg: true });
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
      if (z.kind === "honey" && hypot(state.squad.x - z.x, state.squad.y - z.y) < z.r) {
        state.honeyT = Math.max(state.honeyT || 0, 0.4);
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
    if (state.stageOutro) return;
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
        throwArc(state, u, aim(state), { kind: "healshot", land: "puddle", dmg: 0 });
      } else if (kind === "lanca_chamas" || kind === "inferno") {
        C().flameAt(state, u, { x: u.x + Math.cos(ang) * 80, y: u.y + Math.sin(ang) * 80, def: { size: 8 } });
      } else if (kind === "fora_da_lei") {
        for (var f = -4; f <= 4; f++) bolt(state, u, ang + f * 0.22, { r: 2.5, dmgMul: 0.42, lifeDist: 1000 });
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
          } else if (ar.land === "puddle") placePuddle(state, ar.tx, ar.ty, 40, 26, 4.8);
          else if (ar.land === "blackhole") {
            C().explode(state, ar.tx, ar.ty, 80, p.dmg, p.team);
            zone(state, { kind: "blackhole", x: ar.tx, y: ar.ty, r: 300, t: 1.6, dmg: p.dmg });
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
          bait.hp -= ep.dmg || 8;
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
        if (o.id === e.id || o.hp <= 0) continue;
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
      if (o.id === e.id || o.hp <= 0) continue;
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
      if (m.hp <= 0 || (m.kind !== "elite" && m.kind !== "cmd_recruit")) continue;
      var d = hypot(m.x - e.x, m.y - e.y);
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
      throwArc(state, u, aim(state), { kind: "grenade", land: "blackhole", color: "#1a1028", boomR: 300, r: 9, dur: 0.7, dmg: Math.round(u.def.dmg * 1.4) });
      return true;
    }
    if (id === "forcewall") {
      var fw = aim(state);
      var fa = mouseAng(state, state.squad);
      zone(state, { kind: "forcewall", x: fw.x, y: fw.y, r: 70, t: 5, ang: fa, w: 150, h: 18 });
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
      if (host && hypot(host.x - p.x, host.y - p.y) > 120 + (host.def.size || 12)) host = null;
      zone(state, { kind: "obsmark", x: p.x, y: p.y, r: 92, t: 8, followId: host ? host.id : 0 });
      if (host) host.obsMarkT = 8;
      return true;
    }
    if (id === "bless") {
      var a = aim(state);
      zone(state, { kind: "anchor", x: a.x, y: a.y, r: 88, t: 9, shield: 0.35 });
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
      throwArc(state, u, aim(state), { kind: "healshot", land: "puddle", dmg: 0 });
      for (var i = 0; i < state.units.length; i++) state.units[i].parasite = 0;
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
        if (state.zones[zi].kind === "standard") state.zones.splice(zi, 1);
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
    if (id === "archive") {
      collectLoot(state);
      return true;
    }
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

  function drawTurretSprite(ctx, dp, time) {
    ctx.save();
    ctx.translate(dp.x, dp.y);
    var v = dp.variant || "cannon";
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 10, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    if (v === "flame") {
      var flick = 0.35 + Math.sin(time * 14) * 0.12;
      ctx.fillStyle = "rgba(255, 110, 30, " + flick + ")";
      ctx.beginPath();
      ctx.arc(0, 0, 28 + Math.sin(time * 11) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 180, 70, 0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, dp.range ? dp.range * 0.42 : 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#5a2a18";
      ctx.fillRect(-9, -6, 18, 14);
      ctx.fillStyle = "#c45a22";
      ctx.beginPath();
      ctx.arc(0, -10, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.arc(0, -12, 3.2 + Math.sin(time * 16) * 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (v === "mg") {
      ctx.fillStyle = "#3a3a42";
      ctx.fillRect(-8, -4, 16, 12);
      ctx.fillStyle = "#c8b45a";
      ctx.fillRect(-3, -16, 6, 18);
      ctx.fillStyle = "#e8d080";
      ctx.fillRect(-10, -8, 20, 5);
      ctx.fillStyle = "#888";
      ctx.fillRect(-11, 6, 5, 5);
      ctx.fillRect(6, 6, 5, 5);
    } else {
      ctx.fillStyle = "#6a5a30";
      ctx.fillRect(-9, -5, 18, 13);
      ctx.fillStyle = "#c8b45a";
      ctx.beginPath();
      ctx.arc(0, -8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#121828";
      ctx.fillRect(-3, -20, 6, 14);
    }
    if (dp.hp != null && dp.maxHp) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(-10, 12, 20, 3);
      ctx.fillStyle = "#7cffb0";
      ctx.fillRect(-10, 12, 20 * Math.max(0, dp.hp / dp.maxHp), 3);
    }
    ctx.restore();
  }

  function drawCoilTower(ctx, dp, time) {
    var pulse = 0.55 + Math.sin(time * 10 + dp.x) * 0.25;
    var fieldR = dp.fieldR || dp.range || 128;
    var fed = !!dp.fed || !!dp.linked;
    ctx.save();
    ctx.translate(dp.x, dp.y);
    ctx.fillStyle = fed ? "rgba(120, 240, 255, 0.16)" : "rgba(70, 190, 230, 0.09)";
    ctx.beginPath();
    ctx.arc(0, 0, fieldR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = fed ? "rgba(190, 255, 255, 0.72)" : "rgba(140, 230, 255, 0.38)";
    ctx.lineWidth = fed ? 2.4 : 1.5;
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, fieldR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(168, 246, 255, " + (0.18 + pulse * 0.32) + ")";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, 0, fieldR * (0.52 + pulse * 0.14), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 10, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a4a58";
    ctx.fillRect(-7, -4, 14, 14);
    ctx.fillStyle = "#6a7a88";
    ctx.fillRect(-5, -18, 10, 16);
    ctx.strokeStyle = "#a8f6ff";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, -22, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(168, 246, 255, " + pulse + ")";
    ctx.beginPath();
    ctx.arc(0, -22, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(168, 246, 255, " + (0.35 + pulse * 0.4) + ")";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -22, 11 + Math.sin(time * 14) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function draw(ctx, state) {
    ensure(state);
    var i;
    for (i = 0; i < state.zones.length; i++) {
      var z = state.zones[i];
      ctx.save();
      if (z.kind === "trail") {
        ctx.fillStyle = "rgba(255, 211, 106, 0.28)";
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (z.kind === "heal") {
        ctx.fillStyle = "rgba(80, 255, 140, 0.22)";
        ctx.strokeStyle = "rgba(120, 255, 170, 0.7)";
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (z.kind === "cmd_aura") {
        var pulse = 0.5 + 0.5 * Math.sin((z.max - z.t) * 5);
        ctx.fillStyle = "rgba(80, 255, 160, " + (0.1 + pulse * 0.08) + ")";
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(160, 255, 200, " + (0.4 + pulse * 0.4) + ")";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 244, 196, " + (0.18 + pulse * 0.22) + ")";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * 0.62, 0, Math.PI * 2);
        ctx.stroke();
      } else if (z.kind === "smoke") {
        ctx.fillStyle = "rgba(160, 175, 200, 0.32)";
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(200, 210, 230, 0.45)";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (z.kind === "spot" || z.kind === "obsmark") {
        ctx.strokeStyle = "rgba(128, 224, 255, 0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(128, 224, 255, 0.08)";
        ctx.fill();
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
          ctx.strokeStyle = z.kind === "anchor" ? "rgba(255, 233, 160, 0.8)" : "rgba(240, 200, 74, 0.8)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = z.kind === "anchor" ? "#f0e0a0" : "#f0c84a";
          ctx.beginPath();
          ctx.arc(z.x, z.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (z.kind === "blackhole") {
        ctx.fillStyle = "rgba(20, 8, 40, 0.45)";
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(180, 140, 255, 0.7)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * (0.45 + Math.sin((state.time || 0) * 8) * 0.05), 0, Math.PI * 2);
        ctx.stroke();
      } else if (z.kind === "bubble") {
        ctx.fillStyle = "rgba(154, 212, 255, 0.16)";
        ctx.strokeStyle = "rgba(200, 240, 255, 0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (z.kind === "forcewall") {
        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.rotate(z.ang || 0);
        ctx.fillStyle = "rgba(200, 106, 58, 0.35)";
        ctx.strokeStyle = "rgba(255, 210, 160, 0.9)";
        ctx.lineWidth = 3;
        ctx.fillRect(-(z.w || 150) / 2, -(z.h || 18), z.w || 150, (z.h || 18) * 2);
        ctx.strokeRect(-(z.w || 150) / 2, -(z.h || 18), z.w || 150, (z.h || 18) * 2);
        ctx.restore();
      } else if (z.kind === "phalanx") {
        drawPhalanxRing(ctx, state, z);
      } else if (z.kind === "lure") {
        ctx.strokeStyle = "rgba(232, 208, 128, 0.7)";
        ctx.beginPath();
        ctx.arc(z.x, z.y, 16, 0, Math.PI * 2);
        ctx.stroke();
      } else if (z.kind === "fire") {
        ctx.fillStyle = "rgba(255, 80, 20, 0.28)";
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (z.kind === "napalm") {
        var flick = 0.22 + Math.sin((state.time || 0) * 14 + z.x) * 0.08;
        ctx.fillStyle = "rgba(255, 90, 20, " + flick + ")";
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 210, 70, 0.35)";
        ctx.beginPath();
        ctx.arc(z.x, z.y - 4, z.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else if (z.kind === "acid") {
        ctx.fillStyle = "rgba(140, 220, 40, 0.28)";
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(180, 255, 70, 0.55)";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (z.kind === "honey") {
        ctx.fillStyle = "rgba(232, 180, 48, 0.32)";
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 220, 120, 0.4)";
        ctx.beginPath();
        ctx.ellipse(z.x, z.y + 4, z.r * 0.7, z.r * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (z.kind === "moon_spot") {
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
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (z.kind === "scrap") {
        ctx.fillStyle = "#7a9aaa";
        ctx.fillRect(z.x - 7, z.y - 7, 14, 14);
        ctx.fillStyle = "#c8dce0";
        ctx.fillRect(z.x - 3, z.y - 3, 6, 6);
      } else if (z.kind === "fluid") {
        ctx.fillStyle = "#ff7a22";
        ctx.beginPath();
        ctx.arc(z.x, z.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffe08a";
        ctx.beginPath();
        ctx.arc(z.x - 2, z.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (z.kind === "coil") {
        ctx.strokeStyle = "#a8f6ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(z.x, z.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(z.x, z.y, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#7af0ff";
        ctx.beginPath();
        ctx.arc(z.x, z.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (z.kind === "standard") {
        ctx.fillStyle = "rgba(232, 208, 128, 0.12)";
        ctx.strokeStyle = "rgba(255, 210, 74, 0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#c45a2a";
        ctx.fillRect(z.x - 2, z.y - 28, 4, 32);
        ctx.fillStyle = "#e8d080";
        ctx.beginPath();
        ctx.moveTo(z.x + 2, z.y - 28);
        ctx.lineTo(z.x + 22, z.y - 20);
        ctx.lineTo(z.x + 2, z.y - 10);
        ctx.closePath();
        ctx.fill();
      } else if (z.kind === "crate") {
        ctx.fillStyle = "#c48a3a";
        ctx.fillRect(z.x - 8, z.y - 8 - (z.falling || 0) * 80, 16, 16);
      }
      ctx.restore();
    }

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

    if (hasBumper(state)) {
      var g = bumperGeom(state);
      if (g) {
        var up = bumperUp(state);
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.lineCap = "round";
        if (up) {
          ctx.fillStyle = "rgba(154, 212, 255, 0.08)";
          ctx.beginPath();
          ctx.arc(0, 0, g.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(154, 212, 255, 0.9)";
          ctx.lineWidth = 8;
          ctx.shadowColor = "rgba(154, 212, 255, 0.55)";
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(0, 0, g.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
          var hp = state.bumperHp | 0;
          var max = state.bumperMax || bumperCap(state);
          for (var pi = 0; pi < max; pi++) {
            var t = -Math.PI / 2 + ((pi + 0.5) / max) * Math.PI * 2;
            ctx.fillStyle = pi < hp ? "#d8f4ff" : "rgba(80, 110, 140, 0.45)";
            ctx.beginPath();
            ctx.arc(Math.cos(t) * g.r, Math.sin(t) * g.r, 3.4, 0, Math.PI * 2);
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
      var tItems = [
        { id: "square", icon: "🛡", name: "Escudos", col: "#9ad4ff", ready: true, a0: -Math.PI / 2 - Math.PI / 3, a1: -Math.PI / 2 + Math.PI / 3 },
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
      if (mn.kind === "cart") {
        ctx.fillStyle = "#8a9aaa";
        ctx.fillRect(mn.x - 9, mn.y - 7, 18, 14);
        ctx.fillStyle = "#c8dce0";
        ctx.fillRect(mn.x - 4, mn.y - 3, 8, 6);
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
      } else {
        drawTurretSprite(ctx, dp, state.time || 0);
      }
    }
    for (i = 0; i < state.stickies.length; i++) {
      var st = state.stickies[i];
      ctx.save();
      ctx.translate(st.x + 6, st.y - 12);
      ctx.rotate(-0.25);
      ctx.fillStyle = "#2a2a38";
      ctx.fillRect(-5, -7, 10, 14);
      ctx.fillStyle = "#c45a2a";
      ctx.fillRect(-5, -7, 10, 5);
      ctx.strokeStyle = "#f0c422";
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-5, -7, 10, 14);
      ctx.fillStyle = Math.sin((state.time || 0) * 16) > 0 ? "#ff4a2a" : "#ffe08a";
      ctx.beginPath();
      ctx.arc(0, -10, 2.2, 0, Math.PI * 2);
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
      var stacks = (wu.warFrenzy || []).length;
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
      if (z.kind !== "standard") continue;
      if (hypot(x - z.x, y - z.y) < z.r) return true;
    }
    return false;
  }

  G.tactics = {
    ensure: ensure,
    update: update,
    draw: draw,
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
    guerrillaHud: guerrillaHud,
    has: has
  };
})(window.TFAG = window.TFAG || {});
