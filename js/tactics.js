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
    var dmg = Math.round(u.def.dmg * C().dmgMul(state) * (extra.dmgMul || 1));
    if (u.marked > 0) {
      dmg = Math.round(dmg * (u.marked <= 1 ? 4 : u.marked));
      u.marked = 0;
    }
    var spd = extra.speed || (u.def.projectile === "cannon" ? 320 : u.def.projectile === "missile" ? 210 : u.def.projectile === "laser" ? 560 : 420);
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
  var GUER_RECRUIT_CAP = 5;

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
        healPct: 0.01
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
      arm: 0.25,
      life: 12,
      r: 34 + (state.run.minesPlus || 0) * 6,
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
    var a = mouseAng(state, u);
    state.hook = {
      x: u.x,
      y: u.y,
      vx: Math.cos(a) * 620,
      vy: Math.sin(a) * 620,
      t: 0.55,
      flying: true
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

  function deployTurret(state) {
    var u = lead(state, "torreta");
    if (!u) return;
    state.deploys.push({
      kind: "turret",
      x: u.x,
      y: u.y,
      hp: 90,
      maxHp: 90,
      cooldown: 0,
      fire: u.def.fire,
      dmg: u.def.dmg,
      range: u.def.range,
      t: 18,
      size: 14
    });
    state.floaters.push(G.createFloater(u.x, u.y - 16, "torreta", "#c8b45a"));
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
    for (var i = 0; i < (state.zones || []).length; i++) {
      var z = state.zones[i];
      if (z.kind === "beacon" && hypot(state.squad.x - z.x, state.squad.y - z.y) < z.r) mul *= 1.08;
    }
    if (state.tacticsAura && state.tacticsAura.speed) mul *= 1 + state.tacticsAura.speed;
    return mul;
  }

  function onTrail(state) {
    if (!has(state, "mensageiro") || !state.zones) return false;
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

  function blockHurt(state, unit, opts) {
    if (unit.team !== "player") return false;
    if (state.phaseOn) return true;
    if ((state.ramT || 0) > 0) return true;
    if ((state.spearRamT || 0) > 0) return true;
    if (unit.leap) return true;
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
      if (u.hp <= 0 || u.kind !== "ponta_lanca" || u.held || u.stowed || state.dashActive) continue;
      if (u.leap) {
        var L = u.leap;
        L.t += dt;
        if (L.phase === "out") {
          var k = Math.min(1, L.t / L.dur);
          u.x = L.x0 + (L.tx - L.x0) * k;
          u.y = L.y0 + (L.ty - L.y0) * k;
          u.leapZ = 4 * k * (1 - k) * 52;
          if (k >= 1) {
            var tgt = null;
            for (var ei = 0; ei < state.enemies.length; ei++) {
              if (state.enemies[ei].id === L.eid) tgt = state.enemies[ei];
            }
            if (tgt && tgt.hp > 0) {
              var dmg = Math.round(u.def.dmg * C().dmgMul(state) * 1.7);
              C().hurt(state, tgt, dmg, u.x, u.y, true);
              G.burst(state, tgt.x, tgt.y, "#ff9a3a", 12, 110);
            }
            L.phase = "back";
            L.t = 0;
            L.dur = 0.22;
            L.x0 = u.x;
            L.y0 = u.y;
          }
        } else {
          var hx = state.squad.x - u.x;
          var hy = state.squad.y - u.y;
          var hl = hypot(hx, hy);
          var backSpd = 620;
          if (hl < 16 || L.t >= L.dur) {
            u.leap = null;
            u.leapZ = 0;
            u.leapCd = 0.8;
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
      var near = C().nearest(state.enemies, u.x, u.y);
      if (!near || hypot(near.x - u.x, near.y - u.y) > 170 + (near.def.size || 10)) continue;
      u.leap = {
        phase: "out",
        t: 0,
        dur: 0.26,
        x0: u.x,
        y0: u.y,
        tx: near.x,
        ty: near.y,
        eid: near.id
      };
    }
  }

  function spearDash(state, u) {
    iframeDash(state, 2);
    state.spearRamT = 2;
    state.run.smokeT = Math.max(state.run.smokeT || 0, 2);
    for (var ui = 0; ui < state.units.length; ui++) {
      var su = state.units[ui];
      if (su.kind === "ponta_lanca") {
        su.leap = null;
        su.leapZ = 0;
      }
    }
    var dmg = Math.round(u.def.dmg * C().dmgMul(state) * 1.35);
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp > 0) C().hurt(state, e, dmg, u.x, u.y, true);
    }
    if (G.combat && G.combat.spawnDashBurst) G.combat.spawnDashBurst(state, "#ff9a3a");
    else G.burst(state, state.squad.x, state.squad.y, "#ff9a3a", 20, 160);
    return true;
  }

  function tickBannerSword(state, dt) {
    var u = lead(state, "bandeira");
    if (!u) return;
    u.swordCd = (u.swordCd || 0) - dt;
    if (u.swordCd > 0) return;
    if (!(state.pointer && state.pointer.fireHold)) return;
    var range = u.def.swordRange || 150;
    var tgt = C().nearest(state.enemies, u.x, u.y);
    if (!tgt || hypot(tgt.x - u.x, tgt.y - u.y) > range + (tgt.def.size || 10)) return;
    u.swordCd = 1 / Math.max(0.4, (u.def.swordFire || 0.9) * C().fireMul(state));
    var dmg = Math.round((u.def.swordDmg || 52) * C().dmgMul(state));
    C().hurt(state, tgt, dmg, u.x, u.y, true);
    G.burst(state, tgt.x, tgt.y, "#e8d080", 10, 90);
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
    zoneAura(state);
    tickBumper(state, dt);

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
    if ((state.spearRamT || 0) > 0) state.spearRamT = Math.max(0, state.spearRamT - dt);

    if (has(state, "giratoria") && state.pointer && state.pointer.fireHold) state.girSpin = Math.min(2.4, (state.girSpin || 0) + dt);
    else state.girSpin = Math.max(0, (state.girSpin || 0) - dt * 1.4);

    if (has(state, "mensageiro")) {
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
        var n = 6;
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
        var b = G.playfield(state);
        var hitWall = h.x < b.x0 + 8 || h.x > b.x1 - 8 || h.y < b.y0 + 8 || h.y > b.y1 - 8;
        if (hitWall) {
          h.flying = false;
          h.x = Math.max(b.x0 + 8, Math.min(b.x1 - 8, h.x));
          h.y = Math.max(b.y0 + 8, Math.min(b.y1 - 8, h.y));
          h.t = 0.28;
        } else if (h.t <= 0) state.hook = null;
      } else {
        var hx = h.x - state.squad.x;
        var hy = h.y - state.squad.y;
        var hl = hypot(hx, hy) || 1;
        state.squad.x += (hx / hl) * 760 * dt;
        state.squad.y += (hy / hl) * 760 * dt;
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
            x: q.x + (Math.random() - 0.5) * 18,
            y: q.y + (Math.random() - 0.5) * 18,
            hp: 70,
            maxHp: 70,
            size: 11,
            t: 999,
            vx: 0,
            vy: 0,
            cooldown: 0.2,
            fire: 1.05,
            dmg: 14,
            range: 170,
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
          m.vx = Math.cos(ca) * 165;
          m.vy = Math.sin(ca) * 165;
          if (best < 16) {
            state.run.coins += coin.value || 1;
            G.audio.coin();
            state.floaters.push(G.createFloater(coin.x, coin.y, "+" + (coin.value || 1), "#ffd24a"));
            state.drops.splice(state.drops.indexOf(coin), 1);
          }
        } else {
          m.vx *= 0.9;
          m.vy *= 0.9;
        }
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        clampField(state, m);
        m.t -= dt;
        if (m.hp <= 0 || m.t <= 0) {
          C().explode(state, m.x, m.y, 52, Math.round(36 * C().dmgMul(state)), "player");
          zone(state, { kind: "fire", x: m.x, y: m.y, r: 34, t: 5, dmg: 14 });
          state.minions.splice(i, 1);
        }
        continue;
      }
      if (m.kind === "elite" || m.kind === "cmd_recruit") {
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
    for (var i = state.deploys.length - 1; i >= 0; i--) {
      var t = state.deploys[i];
      if (t.kind === "coil_tower") {
        if (!teslaAlive) {
          state.deploys.splice(i, 1);
          continue;
        }
        var fed = !!t.fed;
        t.fed = false;
        t.linked = false;
        t.zaps = [];
        var fieldR = t.fieldR || t.range || 128;
        var teslaN = nKind(state, "tesla");
        var dps = (t.dmg || 26) * C().dmgMul(state) * 0.8;
        dps *= 1 + 0.22 * Math.max(0, teslaN - 1);
        if (fed) dps *= 1.3;
        var tick = dps * dt;
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
      if (t.hp <= 0 || t.t <= 0) {
        state.deploys.splice(i, 1);
        continue;
      }
      if (t.kind !== "turret" || t.cooldown > 0) continue;
      var e = C().nearest(state.enemies, t.x, t.y);
      if (!e || hypot(e.x - t.x, e.y - t.y) > t.range) continue;
      t.cooldown = 1 / Math.max(0.3, t.fire);
      var fake = { x: t.x, y: t.y, def: { dmg: t.dmg, projectile: "cannon", range: t.range }, kind: "torreta", marked: 0, id: -8 };
      bolt(state, fake, angTo(t, e), { kind: "cannon", r: 5, speed: 340 });
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
    C().hurt(state, e, dmg, srcX, srcY, true, { trueDmg: dmg < 4 });
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
    var joltR = 42;
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
        state.beams.push(makeTeslaBolt(ca.x, ca.y - 16, cb.x, cb.y - 16, (state.time || 0) * 7 + a, 0.85));
        if (chainTick > 0) joltAlongSeg(state, ca.x, ca.y, cb.x, cb.y, chainTick, chainHit);
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
    var dps = u.def.dmg * C().dmgMul(state);
    var tick = dps * dt;
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
    return has(state, "caminhao") || has(state, "minitanque") || has(state, "tanque");
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
          healAlliesPct(state, (z.healPct || 0.01) * dt, z.x, z.y, z.r);
        }
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

  function playerShoot(state, dt) {
    if (state.stageOutro) return;
    ensure(state);
    var firing = !!(state.pointer && state.pointer.fireHold);
    var sfx = false;

    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0) continue;
      u.cooldown -= dt;
      if (u.def.projectile === "none" || u.def.fire <= 0) continue;
      var kind = u.kind;
      if (kind === "quartel") continue;
      if (kind === "caminhao" || kind === "oficina" || kind === "comandante") continue;
      if (kind === "tesla" || kind === "colosso") continue;
      if (kind === "bombardeiro" || kind === "droneiro" || kind === "helicoptero" || kind === "recon") continue;
      if (kind === "mineiro") continue;
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
        bolt(state, u, ang, { pierce: true, hitsLeft: 8, lifeDist: 1400, dmgMul: 0.4 + Math.min(2.1, cd / 280), r: 4, homing: false });
      } else if (kind === "metralhador") {
        for (var s = -2; s <= 2; s++) bolt(state, u, ang + s * 0.16, { r: 2.5, speed: 400, dmgMul: 0.55 });
      } else if (kind === "fuzileiro" || kind === "designado") {
        bolt(state, u, ang, { r: 3 });
      } else if (kind === "anti_material") {
        bolt(state, u, ang, {
          kind: "cannon",
          r: 6,
          speed: 400,
          pierce: true,
          hitsLeft: 8,
          eraseShots: true,
          color: "#141418",
          lifeDist: 980
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
        for (var f = -4; f <= 4; f++) bolt(state, u, ang + f * 0.22, { r: 2.5, dmgMul: 0.42, lifeDist: 90 + Math.random() * 40 });
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
          bolt(state, u, ang, { kind: "grenade", r: 7, speed: 280, boomR: 48, color: "#2a2a32" });
        } else {
          bolt(state, u, ang, { r: 3.5, speed: 420 });
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
    }
    if (p.ownerKind === "assassino" && hit.team === "enemy") applySilence(state, hit);
    if (p.ownerKind === "fantasma" && hit.team === "enemy") tryShotFear(state, hit);
    if (p.ownerKind === "cirurgiao" && hit.team === "enemy") {
      hit.bleedT = 5;
      hit.bleedDps = Math.max(hit.bleedDps || 0, p.dmg * 0.7);
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
            var eng = lead(state, "engenheiro") || { def: { dmg: 22 }, kind: "engenheiro" };
            plantMineAt(state, eng, ar.tx, ar.ty);
          } else if (ar.land === "puddle") placePuddle(state, ar.tx, ar.ty, 40, 26, 4.8);
          else {
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
    if (id === "storm" || id === "coil") return placeCoilTower(state, u);
    if (id === "smoke") {
      var s = aim(state);
      zone(state, { kind: "smoke", x: s.x, y: s.y, r: 132, t: 3.2 });
      return true;
    }
    if (id === "flare") {
      var p = aim(state);
      zone(state, { kind: "obsmark", x: p.x, y: p.y, r: 92, t: 8 });
      for (var fi = 0; fi < state.enemies.length; fi++) {
        var fe = state.enemies[fi];
        if (fe.hp <= 0) continue;
        if (hypot(fe.x - p.x, fe.y - p.y) > 92 + (fe.def.size || 12)) continue;
        fe.obsMarkT = 8;
      }
      return true;
    }
    if (id === "bless") {
      var a = aim(state);
      zone(state, { kind: "anchor", x: a.x, y: a.y, r: 88, t: 9, shield: 0.35 });
      return true;
    }
    if (id === "order") {
      var b = aim(state);
      zone(state, { kind: "beacon", x: b.x, y: b.y, r: 92, t: 8, fire: 0.35, dmg: 0.25 });
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
      var live = [];
      for (var ei = 0; ei < state.enemies.length; ei++) {
        var en = state.enemies[ei];
        if (en.hp <= 0 || en.fake || en.decoy) continue;
        if (en.def && (en.def.kind === "orbit_shield" || en.def.codexHide)) continue;
        live.push(en);
      }
      for (var sh = live.length - 1; sh > 0; sh--) {
        var sw = (Math.random() * (sh + 1)) | 0;
        var tmp = live[sh];
        live[sh] = live[sw];
        live[sw] = tmp;
      }
      var nBomb = 5;
      var bDmg = Math.round((u.def.dmg || 28) * 1.45 * C().dmgMul(state));
      var b = G.playfield(state);
      for (var bi = 0; bi < nBomb; bi++) {
        var tx;
        var ty;
        if (live.length) {
          var pick = live[bi % live.length];
          tx = pick.x + (Math.random() - 0.5) * 18;
          ty = pick.y + (Math.random() - 0.5) * 18;
        } else {
          tx = b.x0 + 40 + Math.random() * Math.max(40, b.x1 - b.x0 - 80);
          ty = b.y0 + 40 + Math.random() * Math.max(40, b.y1 - b.y0 - 80);
        }
        state.warnings = state.warnings || [];
        state.warnings.push({
          x: tx,
          y: ty,
          t: 0.7 + bi * 0.08,
          max: 0.85,
          r: 44,
          dmg: bDmg,
          team: "player",
          color: "#5ad0c8"
        });
      }
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
      dropCrate(state);
      return true;
    }
    if (id === "hook") {
      startHook(state);
      return true;
    }
    if (id === "deploy") {
      deployTurret(state);
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
      var tgt = C().aimTarget(state, u);
      if (!tgt) return true;
      var behind = angTo(tgt, state.squad) + Math.PI;
      var pathX = state.squad.x;
      var pathY = state.squad.y;
      state.squad.x = tgt.x + Math.cos(behind) * (tgt.def.size + 28);
      state.squad.y = tgt.y + Math.sin(behind) * (tgt.def.size + 28);
      clampField(state, state.squad);
      C().explode(state, (pathX + state.squad.x) / 2, (pathY + state.squad.y) / 2, 40, Math.round(u.def.dmg * 1.8 * C().dmgMul(state)), "player");
      C().hurt(state, tgt, Math.round(u.def.dmg * 2.4 * C().dmgMul(state)), u.x, u.y, true);
      state.run.smokeT = Math.max(state.run.smokeT || 0, 0.35);
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
        ctx.strokeStyle = z.kind === "anchor" ? "rgba(255, 233, 160, 0.8)" : "rgba(240, 200, 74, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = z.kind === "anchor" ? "#f0e0a0" : "#f0c84a";
        ctx.beginPath();
        ctx.arc(z.x, z.y, 6, 0, Math.PI * 2);
        ctx.fill();
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
        ctx.fillStyle = "#c8b45a";
        ctx.fillRect(dp.x - 8, dp.y - 8, 16, 16);
      }
    }
    for (i = 0; i < state.stickies.length; i++) {
      var st = state.stickies[i];
      ctx.fillStyle = "#6a70c8";
      ctx.beginPath();
      ctx.arc(st.x, st.y - 10, 4, 0, Math.PI * 2);
      ctx.fill();
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
      var pb = G.playfield(state);
      ctx.fillRect(pb.x0, pb.y0, pb.x1 - pb.x0, pb.y1 - pb.y0);
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
    skipContact: skipContact,
    onBulletHit: onBulletHit,
    absorbBumper: absorbBumper,
    shieldPhysics: shieldPhysics,
    preProjectiles: preProjectiles,
    enemyAim: enemyAim,
    tickConfuse: tickConfuse,
    useActive: useActive,
    pickupDrop: pickupDrop,
    healSquad: healSquad,
    inBanner: inBanner,
    shieldProtects: shieldProtects,
    selectedUnit: selectedUnit,
    selectedId: selectedId,
    guerrillaHud: guerrillaHud,
    has: has
  };
})(window.TFAG = window.TFAG || {});
