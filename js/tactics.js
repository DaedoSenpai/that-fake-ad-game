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
  }

  function healSquad(state, amt) {
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0) continue;
      u.hp = Math.min(u.maxHp, u.hp + amt);
    }
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
      boomR: extra.boomR || 0
    });
    p.ownerKind = u.kind;
    p.fromId = u.id;
    p.wallBounce = extra.wallBounce || 0;
    p.bounceMul = extra.bounceMul || 3;
    p.eraseShots = !!extra.eraseShots;
    p.stealShots = !!extra.stealShots;
    p.pairId = extra.pairId || 0;
    p.sticky = !!extra.sticky;
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

  function iframeDash(state, dur) {
    var p = aim(state);
    var dx = p.x - state.squad.x;
    var dy = p.y - state.squad.y;
    var len = hypot(dx, dy) || 1;
    state.dashT = 0.34;
    state.dashTMax = 0.34;
    state.dashCd = Math.max(state.dashCd || 0, 0.45);
    state.dashCdMax = 1.05;
    state.dashDir = { x: dx / len, y: dy / len };
    state.run.smokeT = Math.max(state.run.smokeT || 0, dur || 0.5);
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
      boomR: extra.boomR || 38
    });
    p.ownerKind = u.kind;
    p.fromId = u.id;
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
    if (!u || u.activeCd > 0) return;
    var id = selectedId(state);
    if (id === "archive") {
      collectLoot(state);
      return;
    }
    if (id === "carpet" && u.kind === "mineiro") {
      state.mineDraw = { last: { x: aim(state).x, y: aim(state).y }, spent: 0 };
      return;
    }
    if (id === "airstrike") {
      var q = aim(state);
      state.bombLine = { x0: q.x, y0: q.y, x1: q.x, y1: q.y, t: 0 };
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
    if (state.bombLine && selectedId(state) === "airstrike") {
      state.bombLine.t = 1;
      state.bombPending = state.bombLine;
      state.bombLine = null;
      putSelectedOnCd(state);
    }
    if (state.mineDraw && state.mineDraw.spent === 0) C().useActive(state, state.skillSlot | 0);
    state.mineDraw = null;
  }

  function onFireDown(state) {
    ensure(state);
    state.pointer.fireHold = true;
    if (has(state, "designado")) desClick(state);
  }

  function onFireUp(state) {
    state.pointer.fireHold = false;
    if (has(state, "anti_material") && state.atmCharge > 0.28) {
      var atm = lead(state, "anti_material");
      if (atm) {
        var k = Math.min(1, state.atmCharge / 1.05);
        bolt(state, atm, mouseAng(state, atm), {
          kind: "cannon",
          r: 5 + k * 10,
          speed: 380,
          dmgMul: 0.6 + k * 2.2,
          pierce: true,
          hitsLeft: 8,
          eraseShots: true,
          lifeDist: 900
        });
        G.audio.shoot();
      }
    }
    state.atmCharge = 0;
    if (!state.pointer.fireHold) state.girSpin = Math.min(state.girSpin, 0.4);
  }

  function dropCrate(state) {
    var p = aim(state);
    zone(state, { kind: "crate", x: p.x, y: p.y, r: 40, t: 0.55, falling: 1 });
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
    if (has(state, "fuzileiro") && state.pointer && state.pointer.fireHold) mul *= 0.7;
    if (has(state, "giratoria") && (state.girSpin || 0) > 1.2) mul *= 0.42;
    if (onTrail(state)) mul *= 2;
    for (var i = 0; i < (state.zones || []).length; i++) {
      var z = state.zones[i];
      if (z.kind === "beacon" && hypot(state.squad.x - z.x, state.squad.y - z.y) < z.r) mul *= 1.08;
    }
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
    var a = { shield: 0, fire: 0, dmg: 0 };
    for (var i = 0; i < (state.zones || []).length; i++) {
      var z = state.zones[i];
      if (hypot(state.squad.x - z.x, state.squad.y - z.y) > (z.r || 0)) continue;
      if (z.kind === "anchor") a.shield = Math.max(a.shield, z.shield || 0.35);
      if (z.kind === "beacon") {
        a.fire = Math.max(a.fire, z.fire || 0.35);
        a.dmg = Math.max(a.dmg, z.dmg || 0.25);
      }
    }
    state.tacticsAura = a;
  }

  function blockHurt(state, unit, opts) {
    if (unit.team !== "player") return false;
    if (state.phaseOn) return true;
    if ((state.ramT || 0) > 0) return true;
    return false;
  }

  function skipContact(state, enemy) {
    if (!has(state, "minitanque")) return false;
    var mt = lead(state, "minitanque");
    if (!mt) return false;
    if (mt.cooldown <= 0 && !(state.pointer && state.pointer.fireHold)) return false;
    var a = mouseAng(state, state.squad);
    var b = Math.atan2(enemy.y - state.squad.y, enemy.x - state.squad.x);
    var ad = Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
    return ad < 0.85;
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
    zoneAura(state);
    tickBumper(state, dt);

    state.desBeat = (state.desBeat || 0) + dt;
    state.phaseOn = has(state, "fantasma") && !(state.pointer && state.pointer.fireHold);
    if (state.phaseOn) state.run.smokeT = Math.max(state.run.smokeT || 0, 0.05);

    if (has(state, "anti_material") && state.pointer && state.pointer.fireHold) state.atmCharge += dt;
    else state.atmCharge = Math.max(0, (state.atmCharge || 0) - dt * 1.6);

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
      if (ofi) {
        ofi._scrapT = (ofi._scrapT == null ? 0.6 : ofi._scrapT) - dt;
        if (ofi._scrapT <= 0 && state.pointer && state.pointer.fireHold) {
          ofi._scrapT = 1.7;
          var oa = mouseAng(state, ofi);
          zone(state, {
            kind: "scrap",
            x: ofi.x + Math.cos(oa) * 54,
            y: ofi.y + Math.sin(oa) * 54,
            r: 22,
            t: 9
          });
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

  function updateDrones(state, dt) {
    var want = nKind(state, "droneiro");
    while (state.drones.length < want) {
      var u = lead(state, "droneiro");
      state.drones.push({ x: u ? u.x : state.squad.x, y: u ? u.y : state.squad.y, ang: Math.random() * 6.28, cd: 0 });
    }
    while (state.drones.length > want) state.drones.pop();
    var p = aim(state);
    var host = lead(state, "droneiro");
    for (var i = 0; i < state.drones.length; i++) {
      var d = state.drones[i];
      d.ang += dt * 2.6;
      var tx = p.x + Math.cos(d.ang + i) * 28;
      var ty = p.y + Math.sin(d.ang + i) * 28;
      d.x += (tx - d.x) * Math.min(1, dt * 8);
      d.y += (ty - d.y) * Math.min(1, dt * 8);
      d.cd -= dt;
      if (d.cd > 0 || !host) continue;
      if (!(state.pointer && state.pointer.fireHold)) continue;
      var tgt = C().nearest(state.enemies, p.x, p.y);
      if (!tgt || hypot(tgt.x - p.x, tgt.y - p.y) > 90) continue;
      d.cd = 1 / Math.max(0.4, host.def.fire);
      var fake = { x: d.x, y: d.y, def: host.def, kind: host.kind, marked: 0, id: host.id };
      bolt(state, fake, angTo(d, tgt), { speed: 440, r: 3, kind: "bullet" });
    }
  }

  function updateMinions(state, dt) {
    var q = lead(state, "quartel");
    if (q && q.def.spawn) {
      q.spawnT = (q.spawnT || q.def.spawn) - dt;
      if (q.spawnT <= 0) {
        q.spawnT = q.def.spawn / (1 + 0.2 * Math.max(0, nKind(state, "quartel") - 1));
        var a = mouseAng(state, q);
        state.minions.push({
          x: q.x,
          y: q.y,
          hp: 28,
          maxHp: 28,
          size: 9,
          t: 3.6,
          vx: Math.cos(a) * 210,
          vy: Math.sin(a) * 210,
          def: { size: 9 },
          team: "player",
          bait: true
        });
      }
    }
    var p = aim(state);
    for (var i = state.minions.length - 1; i >= 0; i--) {
      var m = state.minions[i];
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
    for (var i = state.deploys.length - 1; i >= 0; i--) {
      var t = state.deploys[i];
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

  function updateBeams(state, dt) {
    state.beams = [];
    if (!(state.pointer && state.pointer.fireHold)) return;
    beamUnit(state, "tesla", dt, 9, true);
    beamUnit(state, "cirurgiao", dt, 8, false, true);
    beamUnit(state, "colosso", dt, 16, true, false, true);
    if (has(state, "lanca_chamas") || has(state, "inferno")) meltCone(state);
  }

  function beamUnit(state, kind, dt, width, erase, drain, wipeWeak) {
    var u = lead(state, kind);
    if (!u) return;
    var p = aim(state);
    state.beams.push({ kind: kind, x0: u.x, y0: u.y, x1: p.x, y1: p.y, w: width, color: u.def.color });
    var swing = Math.min(2.4, 0.55 + (state.mouseSpd || 0) / 900);
    var dps = u.def.dmg * C().dmgMul(state) * (kind === "tesla" ? swing : 1) * (kind === "colosso" ? 1.15 : 0.85);
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
  var BUMPER_CD = 7;

  function bumperGeom(state) {
    if (!has(state, "caminhao")) return null;
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
    var inner = ring + maxS + 10;
    var thick = 18;
    return {
      x: state.squad.x,
      y: state.squad.y,
      ang: mouseAng(state, state.squad),
      arc: 1.35,
      inner: inner,
      outer: inner + thick,
      r: inner + thick * 0.55
    };
  }

  function bumperUp(state) {
    ensure(state);
    return has(state, "caminhao") && (state.bumperCd || 0) <= 0 && (state.bumperHp || 0) > 0;
  }

  function tickBumper(state, dt) {
    ensure(state);
    if (!has(state, "caminhao")) {
      state.bumperHp = BUMPER_MAX;
      state.bumperCd = 0;
      return;
    }
    if (state.bumperCd > 0) {
      state.bumperCd -= dt;
      if (state.bumperCd <= 0) {
        state.bumperCd = 0;
        state.bumperHp = BUMPER_MAX;
        state.floaters.push(G.createFloater(state.squad.x, state.squad.y - 22, "escudo", "#9ad4ff"));
      }
    }
  }

  function absorbBumper(state, p) {
    if (!p || p.team !== "enemy") return false;
    if (!bumperUp(state)) return false;
    var g = bumperGeom(state);
    if (!g) return false;
    var dx = p.x - g.x;
    var dy = p.y - g.y;
    var d = hypot(dx, dy);
    if (d > g.outer) return false;
    var ang = Math.atan2(dy, dx);
    var diff = Math.abs(Math.atan2(Math.sin(ang - g.ang), Math.cos(ang - g.ang)));
    if (diff > g.arc) return false;
    G.burst(state, p.x, p.y, "#9ad4ff", 5, 50);
    state.bumperHp = Math.max(0, (state.bumperHp || BUMPER_MAX) - 1);
    if (state.bumperHp <= 0) {
      state.bumperHp = 0;
      state.bumperCd = BUMPER_CD;
      state.floaters.push(G.createFloater(state.squad.x, state.squad.y - 24, "escudo quebrado", "#7aa0c8"));
    }
    return true;
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
      z.t -= dt;
      if (z.kind === "crate" && z.falling) {
        z.falling -= dt;
        if (z.falling <= 0) {
          C().explode(state, z.x, z.y, 48, 36, "player");
          state.drops.push(G.createDrop(z.x - 10, z.y, "hp", { value: 18 }));
          state.drops.push(G.createDrop(z.x + 10, z.y, "hp", { value: 18 }));
          z.falling = 0;
          z.t = 0;
        }
      }
      if (z.kind === "heal" && still && hypot(state.squad.x - z.x, state.squad.y - z.y) < z.r) {
        healSquad(state, z.heal * dt);
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
        z.t = 0;
      }
      if (z.t <= 0) state.zones.splice(i, 1);
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
      if (kind === "anti_material" || kind === "designado" || kind === "quartel" || kind === "radio") continue;
      if (kind === "caminhao" || kind === "oficina" || kind === "comandante") continue;
      if (kind === "tesla" || kind === "cirurgiao" || kind === "colosso") continue;
      if (kind === "bombardeiro" || kind === "droneiro") continue;
      if (kind === "mineiro") continue;
      if (!firing && kind !== "giratoria") continue;
      if (kind === "giratoria" && (state.girSpin || 0) < 2) continue;
      if (u.cooldown > 0) continue;

      var rate = C().fireMul(state);
      if (kind === "fuzileiro" && state.pointer && state.pointer.fireHold) rate *= 1.65;
      if (kind === "giratoria") rate *= 1.8;
      if (u.veilFogT > 0) rate *= 0.55;
      u.cooldown = 1 / (u.def.fire * rate);

      var ang = mouseAng(state, u);
      if (kind === "helicoptero") {
        var delayed = delayedMouse(state, 0.5);
        ang = Math.atan2(delayed.y - u.y, delayed.x - u.x);
      }

      if (kind === "sniper") {
        var cd = hypot(aim(state).x - state.squad.x, aim(state).y - state.squad.y);
        bolt(state, u, ang, { pierce: true, hitsLeft: 8, lifeDist: 1400, dmgMul: 0.4 + Math.min(2.1, cd / 280), r: 4, homing: false });
      } else if (kind === "metralhador") {
        for (var s = -2; s <= 2; s++) bolt(state, u, ang + s * 0.16, { r: 2.5, speed: 400, dmgMul: 0.55 });
      } else if (kind === "fuzileiro") {
        bolt(state, u, ang, { r: 3 });
      } else if (kind === "dualista") {
        var pair = ++state.pairSeq;
        var ox = Math.cos(ang + Math.PI / 2) * 5;
        var oy = Math.sin(ang + Math.PI / 2) * 5;
        bolt(state, u, ang, { ox: ox, oy: oy, pairId: pair });
        bolt(state, u, ang, { ox: -ox, oy: -oy, pairId: pair });
      } else if (kind === "engenheiro") {
        throwArc(state, u, aim(state), { kind: "mine", land: "mine", dmg: u.def.dmg });
      } else if (kind === "canhoneiro") {
        throwArc(state, u, aim(state), { kind: "grenade", land: "boom", boomR: 42 });
      } else if (kind === "medico") {
        throwArc(state, u, aim(state), { kind: "healshot", land: "puddle", dmg: 0 });
      } else if (kind === "lanca_chamas" || kind === "inferno") {
        C().flameAt(state, u, { x: u.x + Math.cos(ang) * 80, y: u.y + Math.sin(ang) * 80, def: { size: 8 } });
      } else if (kind === "fora_da_lei") {
        for (var f = -4; f <= 4; f++) bolt(state, u, ang + f * 0.22, { r: 2.5, dmgMul: 0.42, lifeDist: 90 + Math.random() * 40 });
      } else if (kind === "revolver") {
        bolt(state, u, ang, { pierce: true, hitsLeft: 6, wallBounce: 3, bounceMul: 3, r: 4, speed: 360, lifeDist: 900 });
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
      } else if (kind === "minitanque" || kind === "tanque" || kind === "torreta") {
        bolt(state, u, ang, { kind: "cannon", r: kind === "tanque" ? 8 : 6, speed: 300 });
      } else if (kind === "helicoptero") {
        bolt(state, u, ang, { r: 3, speed: 460 });
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
          else C().explode(state, ar.tx, ar.ty, p.boomR || 38, p.dmg, p.team);
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

  function enemyAim(state, e, target) {
    if (inSmoke(state, e)) {
      var a = Math.random() * Math.PI * 2;
      return { x: e.x + Math.cos(a) * 80, y: e.y + Math.sin(a) * 80, def: { size: 12 }, hp: 1, id: -3, dummy: true };
    }
    return target;
  }

  function useActive(state, id, u) {
    ensure(state);
    if (id === "dash") return iframeDash(state, 0.5);
    if (id === "smoke") {
      var s = aim(state);
      zone(state, { kind: "smoke", x: s.x, y: s.y, r: 78, t: u.def.active.dur || 3.2 });
      return true;
    }
    if (id === "flare") {
      var p = aim(state);
      zone(state, { kind: "spot", x: p.x, y: p.y, r: 72, t: 8 });
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
    if (id === "rocket") {
      var dr = state.drones[0] || u;
      var fake = { x: dr.x, y: dr.y, def: u.def, kind: u.kind, marked: 0, id: u.id };
      bolt(state, fake, mouseAng(state, dr), { kind: "missile", boomR: 32, homing: true, homeCursor: true, r: 5 });
      return true;
    }
    if (id === "ram") return startRam(state);
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
    if (id === "magnet") {
      var m = aim(state);
      zone(state, { kind: "lure", x: m.x, y: m.y, r: 160, t: 7 });
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
    if (id === "archive") {
      collectLoot(state);
      return true;
    }
    return false;
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
      } else if (z.kind === "smoke") {
        ctx.fillStyle = "rgba(180, 190, 210, 0.28)";
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (z.kind === "spot") {
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
        ctx.strokeStyle = bm.color || "#7af7ff";
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = bm.w;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(bm.x0, bm.y0);
        ctx.lineTo(bm.x1, bm.y1);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (has(state, "caminhao")) {
      var g = bumperGeom(state);
      if (g) {
        var up = bumperUp(state);
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.ang);
        ctx.lineCap = "round";
        if (up) {
          ctx.strokeStyle = "rgba(154, 212, 255, 0.88)";
          ctx.lineWidth = 12;
          ctx.shadowColor = "rgba(154, 212, 255, 0.55)";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(0, 0, g.r, -g.arc, g.arc);
          ctx.stroke();
          ctx.shadowBlur = 0;
          var hp = state.bumperHp | 0;
          var max = BUMPER_MAX;
          for (var pi = 0; pi < max; pi++) {
            var t = -g.arc + ((pi + 0.5) / max) * g.arc * 2;
            ctx.fillStyle = pi < hp ? "#d8f4ff" : "rgba(80, 110, 140, 0.45)";
            ctx.beginPath();
            ctx.arc(Math.cos(t) * g.r, Math.sin(t) * g.r, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          var frac = 1 - Math.max(0, Math.min(1, (state.bumperCd || 0) / BUMPER_CD));
          ctx.strokeStyle = "rgba(122, 160, 200, 0.28)";
          ctx.lineWidth = 6;
          ctx.setLineDash([7, 8]);
          ctx.beginPath();
          ctx.arc(0, 0, g.r, -g.arc, g.arc);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = "rgba(154, 212, 255, 0.45)";
          ctx.beginPath();
          ctx.arc(0, 0, g.r, -g.arc, -g.arc + g.arc * 2 * frac);
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

    if (has(state, "anti_material") && (state.atmCharge || 0) > 0.05) {
      var atm = lead(state, "anti_material");
      if (atm) {
        var ap2 = aim(state);
        var k = Math.min(1, state.atmCharge / 1.05);
        ctx.strokeStyle = "rgba(62, 192, 255," + (0.3 + k * 0.6) + ")";
        ctx.lineWidth = 1 + k * 6;
        ctx.beginPath();
        ctx.moveTo(atm.x, atm.y);
        ctx.lineTo(ap2.x, ap2.y);
        ctx.stroke();
      }
    }

    if (has(state, "designado")) {
      var beat = 0.62;
      var phase = (state.desBeat % beat) / beat;
      var px = state.squad.x;
      var py = state.squad.y + 42;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(px - 28, py - 4, 56, 8);
      ctx.fillStyle = phase < 0.12 || phase > 0.88 ? "#7cffb0" : "#4ec8e8";
      ctx.fillRect(px - 28 + phase * 56 - 3, py - 5, 6, 10);
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
      ctx.fillStyle = "#7af0ff";
      ctx.beginPath();
      ctx.arc(dr.x, dr.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (i = 0; i < state.minions.length; i++) {
      var mn = state.minions[i];
      ctx.fillStyle = "#9ad4ff";
      ctx.beginPath();
      ctx.arc(mn.x, mn.y, mn.size, 0, Math.PI * 2);
      ctx.fill();
    }
    for (i = 0; i < state.deploys.length; i++) {
      var dp = state.deploys[i];
      ctx.fillStyle = "#c8b45a";
      ctx.fillRect(dp.x - 8, dp.y - 8, 16, 16);
    }
    for (i = 0; i < state.stickies.length; i++) {
      var st = state.stickies[i];
      ctx.fillStyle = "#6a70c8";
      ctx.beginPath();
      ctx.arc(st.x, st.y - 10, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (has(state, "recon")) {
      for (i = 0; i < state.projectiles.length; i++) {
        var pr = state.projectiles[i];
        if (pr.team !== "enemy") continue;
        ctx.strokeStyle = "rgba(138, 240, 216, 0.95)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 2.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#8af0d8";
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
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
    preProjectiles: preProjectiles,
    enemyAim: enemyAim,
    useActive: useActive,
    pickupDrop: pickupDrop,
    selectedUnit: selectedUnit,
    selectedId: selectedId,
    has: has
  };
})(window.TFAG = window.TFAG || {});
