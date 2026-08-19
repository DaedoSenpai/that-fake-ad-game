(function (G) {
  function dist(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function bodyR(e) {
    return (e && e.def && e.def.size) || 0;
  }

  function edgeDist(from, e) {
    return Math.max(0, dist(from, e) - bodyR(e));
  }

  function nearest(list, x, y, ignoreId) {
    var best = null;
    var bestD = 1e9;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.id === ignoreId || e.hp <= 0) continue;
      var d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function nearestEdge(list, x, y, ignoreId) {
    var best = null;
    var bestD = 1e9;
    var from = { x: x, y: y };
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.id === ignoreId || e.hp <= 0) continue;
      var d = edgeDist(from, e);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function stackMul(n) {
    return 1 + 0.2 * Math.max(0, (n || 1) - 1);
  }

  function unitsWithActive(state, id) {
    var list = [];
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp > 0 && u.def.active && u.def.active.id === id) list.push(u);
    }
    return list;
  }

  function dmgMul(state) {
    var mul = state.run.dmg * (1 + G.save.data.perm.dmg * 0.08);
    if (state.aura && state.aura.dmg) mul *= 1 + state.aura.dmg;
    mul *= state.run.tempDmg || 1;
    mul *= 1 + (state.run.activeDmg || 0);
    if (state.tacticsAura && state.tacticsAura.dmg) mul *= 1 + state.tacticsAura.dmg;
    if (state.run.berserk) {
      var hp = 0;
      var max = 0;
      for (var i = 0; i < state.units.length; i++) {
        hp += state.units[i].hp;
        max += state.units[i].maxHp;
      }
      if (max > 0) mul *= 1 + (1 - hp / max) * 0.7;
    }
    return mul;
  }

  function fireMul(state) {
    var mul = state.run.fireRate * (1 + (G.save.data.perm.fireRate | 0) * 0.08);
    mul *= 1 + ((state.aura && state.aura.fire) || 0);
    mul *= 1 + (state.run.activeFire || 0);
    if (state.tacticsAura && state.tacticsAura.fire) mul *= 1 + state.tacticsAura.fire;
    return mul;
  }

  function goldMul(state) {
    return (1 + (state.run.gold || 0)) * (1 + (G.save.data.perm.gold | 0) * 0.12);
  }

  function moveTowards(e, tx, ty, speed, dt) {
    var dx = tx - e.x;
    var dy = ty - e.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var slow = e.slowT > 0 || e.freezeT > 0 ? 0.42 : 1;
    e.x += (dx / len) * speed * slow * dt;
    e.y += (dy / len) * speed * slow * dt;
  }

  function chase(state, e, target, speed, dt) {
    var svx = target.vx != null ? target.vx : state.squad.vx || 0;
    var svy = target.vy != null ? target.vy : state.squad.vy || 0;
    var spin = Math.hypot(svx, svy);
    var d0 = dist(e, target);
    var lead = Math.min(0.75, d0 / 240);
    var tx = target.x + svx * lead;
    var ty = target.y + svy * lead;
    if (d0 < 72) {
      tx = target.x;
      ty = target.y;
    } else if (spin > 50) {
      var pull = Math.min(0.72, 0.32 + (spin - 50) / 180);
      tx = tx * (1 - pull) + state.squad.x * pull;
      ty = ty * (1 - pull) + state.squad.y * pull;
    }
    moveTowards(e, tx, ty, speed * (d0 > 150 ? 1.18 : 1) * (spin > 90 ? 1.14 : 1), dt);
  }

  function separateBodies(list, state, clampEach) {
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (a.hp <= 0 || a.held) continue;
      for (var j = i + 1; j < list.length; j++) {
        var b = list[j];
        if (b.hp <= 0 || b.held) continue;
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        var min = a.def.size + b.def.size + 4;
        if (d >= min) continue;
        var nx = dx / d;
        var ny = dy / d;
        var push = (min - d) / 2;
        var am = a.commander ? 0.15 : 1;
        var bm = b.commander ? 0.15 : 1;
        var tot = am + bm;
        a.x -= nx * push * (2 * bm / tot);
        a.y -= ny * push * (2 * bm / tot);
        b.x += nx * push * (2 * am / tot);
        b.y += ny * push * (2 * am / tot);
      }
      if (clampEach) G.clampPlay(a, state);
    }
  }

  function bankDrop(state, kind, x, y) {
    if (G.codex && kind) G.codex.unlockUnit(kind);
    G.merge.addArquivo(state, x, y);
  }

  function findEnemy(state, id) {
    if (!id) return null;
    for (var i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].id === id && state.enemies[i].hp > 0) return state.enemies[i];
    }
    return null;
  }

  function hurt(state, unit, amount, srcX, srcY, fromPlayer, opts) {
    if (unit.hp <= 0) return;
    var trueDmg = opts && opts.trueDmg;
    if (unit.team === "player") {
      if (G.tactics && G.tactics.blockHurt && G.tactics.blockHurt(state, unit, opts)) return;
      if (state.run.smokeT > 0) return;
      if (!trueDmg) {
        amount *= 1 - (state.run.shield || 0) - ((state.aura && state.aura.shield) || 0) - (state.run.tempShield || 0) - ((state.tacticsAura && state.tacticsAura.shield) || 0);
        if (unit.commander) amount *= 0.9;
        if (unit.parasite > 0) amount *= 1.15;
      }
    } else {
      unit.lastHitT = 0;
      if (unit.parked) amount *= 0.4;
      if (unit.type === "chefe_final" && unit.bossPhase === 1 && findEnemy(state, unit.guardianId)) {
        if (unit.contactCd <= 0) {
          unit.contactCd = 0.5;
          state.floaters.push(G.createFloater(unit.x, unit.y - 18, "protegido", "#e05cff"));
        }
        return;
      }
    }
    unit.hp -= amount;
    if (!(trueDmg && amount < 2)) {
      unit.flash = 0.12;
      if (unit.team === "player") state.shake = Math.max(state.shake, 6);
      G.burst(state, unit.x, unit.y, unit.team === "player" ? "#7ec8ff" : "#ff6b6b", 6, 70);
      state.floaters.push(G.createFloater(unit.x, unit.y - 12, String(Math.round(amount)), unit.team === "player" ? "#ffd0d0" : "#fff"));
    }
    if (fromPlayer && unit.team === "enemy") {
      if (state.run.freeze) unit.slowT = Math.max(unit.slowT, 0.9);
      var doKnock = state.run.knockback;
      if (doKnock && srcX != null) {
        var dx = unit.x - srcX;
        var dy = unit.y - srcY;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        unit.x += (dx / len) * 10;
        unit.y += (dy / len) * 10;
        G.clampPlay(unit, state);
      }
      if (state.run.lifesteal) {
        var ally = nearest(state.units, unit.x, unit.y);
        if (ally) ally.hp = Math.min(ally.maxHp, ally.hp + amount * 0.12);
      }
    }
    if (unit.hp <= 0) {
      if (unit.team === "enemy" && advanceCorePhase(state, unit)) return;
      unit.hp = 0;
      if (unit.team === "enemy") killEnemy(state, unit);
    }
  }

  function explode(state, x, y, radius, dmg, team) {
    G.burst(state, x, y, "#ffd24a", 16, 160);
    var list = team === "player" ? state.enemies : state.units;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t.hp <= 0) continue;
      var dx = t.x - x;
      var dy = t.y - y;
      if (dx * dx + dy * dy <= radius * radius) hurt(state, t, dmg, x, y, team === "player");
    }
  }

  function advanceCorePhase(state, unit) {
    if (unit.type !== "chefe_final" || (unit.bossPhase || 1) >= 3) return false;
    unit.bossPhase = (unit.bossPhase || 1) + 1;
    unit.hp = unit.maxHp;
    unit.flash = 0.55;
    G.audio.wave();
    G.burst(state, unit.x, unit.y, "#fff36a", 28, 160);
    if (unit.bossPhase === 2) {
      state.banner = { text: "Camada 2 · Mariposa-Véu", t: 2.2 };
      var veu = G.game.spawnAt(state, "chefe_espectro", unit.x - 70, unit.y, { helperOf: unit.id, noLink: true });
      unit.helperId = veu.id;
      unit.skillT = 6;
    } else if (unit.bossPhase === 3) {
      state.banner = { text: "O campo se abre", t: 2.4 };
      state.camZoomTo = 0.68;
      unit.skillT = 6.5;
      unit.coreHealT = 8;
      unit.coreRayT = 2;
      unit.coreSummonT = 70;
      for (var i = 0; i < state.enemies.length; i++) {
        var h = state.enemies[i];
        if (h.helperOf === unit.id || (h.type === "veu_clone" && h.ownerId === unit.helperId)) {
          h.hp = 0;
          h.noDrop = true;
        }
      }
      unit.helperId = 0;
    }
    state.bossShown = 1;
    return true;
  }

  function killEnemy(state, e) {
    G.audio.hit();
    G.burst(state, e.x, e.y, e.def.color, e.def.boss ? 28 : 14, 140);
    var skipLoot = e.noDrop || e.fake || (e.def && (e.def.codexHide || e.def.fake));
    if (!skipLoot) {
      state.run.kills = (state.run.kills || 0) + 1;
      var coins = e.def.boss ? 6 + ((Math.random() * 4) | 0) : Math.random() < 0.35 ? 2 : 1;
      coins = Math.max(1, Math.round(coins * goldMul(state)));
      state.drops.push(G.createDrop(e.x, e.y, "coin", { value: coins }));
      if (G.codex && G.codex.unlockEnemy(e.type)) {
        state.floaters.push(G.createFloater(e.x, e.y - 28, "Compêndio: " + e.def.name, "#ffb0b0"));
      }
      var extra = Math.random() < (G.save.data.perm.luck | 0) * 0.08 + (state.run.luck || 0) ? 1 : 0;
      var dropKind = extra ? "fuzileiro" : G.unitKind(G.save.data.perm.earlyTier | 0);
      if (Math.random() < (state.run.dropChance + ((state.aura && state.aura.drop) || 0))) {
        state.drops.push(G.createDrop(e.x + 10, e.y, "unit", { unitKind: dropKind }));
      }
    }
    if (e.splits) {
      G.game.spawnAt(state, "larva", e.x - 10, e.y);
      G.game.spawnAt(state, "larva", e.x + 10, e.y);
    }
    if (state.run.explode && !skipLoot) {
      G.audio.explosion();
      explode(state, e.x, e.y, 42 + (state.run.boom || 0), Math.round((18 + (state.run.boom || 0)) * dmgMul(state)), "player");
    }
    if (e.attached) {
      for (var i = 0; i < state.units.length; i++) {
        if (state.units[i].id === e.attached) state.units[i].parasite = Math.max(0, state.units[i].parasite - 1);
      }
    }
    if (e.type === "orb_escudo" && e.orbitHost) {
      var dusk = findEnemy(state, e.orbitHost);
      if (dusk && countOrbitShields(state, e.orbitHost) === 0) {
        dusk.shieldLockT = 10;
        state.floaters.push(G.createFloater(dusk.x, dusk.y - 22, "desprotegido", "#ffd24a"));
      }
    }
    if (e.type === "chefe_comandante") {
      for (var o = 0; o < state.enemies.length; o++) {
        if (state.enemies[o].orbitHost === e.id) {
          state.enemies[o].hp = 0;
          state.enemies[o].noDrop = true;
        }
      }
    }
    if (e.type === "chefe_fortaleza") {
      for (var r = 0; r < 10; r++) {
        var pick = G.ENEMY_POOL[(Math.random() * G.ENEMY_POOL.length) | 0];
        var ang = (Math.PI * 2 * r) / 10;
        G.game.spawnAt(state, pick, e.x + Math.cos(ang) * 42, e.y + Math.sin(ang) * 42);
      }
      state.floaters.push(G.createFloater(e.x, e.y - 26, "guarnição", "#e05cff"));
    }
    if (e.type === "veu_clone" && e.ownerId) {
      var owner = findEnemy(state, e.ownerId);
      if (owner && owner.cloneCd) owner.cloneCd[e.cloneSlot | 0] = 30;
    }
  }

  function fireAt(state, u, target) {
    var dx = target.x - u.x;
    var dy = target.y - u.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var kind = u.def.projectile;
    var dmg = Math.round(u.def.dmg * dmgMul(state));
    if (u.marked > 0) {
      dmg = Math.round(dmg * (u.marked <= 1 ? 4 : u.marked));
      u.marked = 0;
    }
    if (u.def.lifesteal) u.hp = Math.min(u.maxHp, u.hp + dmg * 0.1);
    var speed = kind === "missile" ? 210 : kind === "cannon" ? 320 : kind === "laser" ? 560 : 420;
    var r = kind === "cannon" ? 6 : kind === "missile" ? 5 : kind === "laser" ? 4 : 3;
    state.projectiles.push(
      G.createProjectile({
        x: u.x,
        y: u.y,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        dmg: dmg,
        team: "player",
        kind: kind,
        life: kind === "missile" ? 2.2 : 1.35,
        r: r,
        ricochet: state.run.ricochet,
        pierce: state.run.pierce || kind === "laser",
        homing: kind === "missile",
        hitsLeft: state.run.pierce || kind === "laser" ? 4 : 1
      })
    );
  }

  function flameAt(state, u, target) {
    var ang = Math.atan2(target.y - u.y, target.x - u.x);
    var cone = 0.62;
    var range = u.def.range * (1 + (state.run.flame || 0) * 0.12);
    var dmg = Math.round(u.def.dmg * dmgMul(state));
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0) continue;
      var dx = e.x - u.x;
      var dy = e.y - u.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (Math.max(0, d - bodyR(e)) > range || d < 1) continue;
      var a = Math.atan2(dy, dx);
      var diff = Math.abs(Math.atan2(Math.sin(a - ang), Math.cos(a - ang)));
      if (diff < cone) hurt(state, e, dmg, u.x, u.y, true);
    }
    for (var n = 0; n < 5; n++) {
      var spread = ang + (Math.random() - 0.5) * cone * 1.6;
      var sp = 90 + Math.random() * 80;
      state.particles.push({
        x: u.x + Math.cos(ang) * 10,
        y: u.y + Math.sin(ang) * 10,
        vx: Math.cos(spread) * sp,
        vy: Math.sin(spread) * sp,
        life: 0.22,
        max: 0.22,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.5 ? "#ff9a2a" : "#ffe060"
      });
    }
  }

  function applyVeilNuisance(state, unit, src) {
    if (!unit || unit.hp <= 0 || unit.team !== "player") return;
    var was = unit.veilFogT || 0;
    unit.veilFogT = Math.max(was, 2.5);
    unit.slowT = Math.max(unit.slowT || 0, 0.85);
    if (src && src.x != null) {
      var dx = unit.x - src.x;
      var dy = unit.y - src.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      unit.x += (dx / len) * 8;
      unit.y += (dy / len) * 8;
      G.clampPlay(unit, state);
    }
    if (was <= 0.25) state.floaters.push(G.createFloater(unit.x, unit.y - 14, "névoa", "#c8a0ff"));
  }

  function isDecoy(e) {
    return !!(e && (e.decoy || e.fake));
  }

  function enemyFire(state, e, target, kind, extra) {
    if (!target) return;
    enemyFireAng(state, e, Math.atan2(target.y - e.y, target.x - e.x), kind, extra);
  }

  function enemyFireAng(state, e, ang, kind, extra) {
    extra = extra || {};
    var speed = extra.speed || (e.def.boss ? 280 : 250);
    var dmg = extra.dmg != null ? extra.dmg : e.def.dmg;
    if (e.fake || e.decoy || extra.fake) dmg = 0;
    state.projectiles.push(
      G.createProjectile({
        x: e.x,
        y: e.y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        dmg: dmg,
        team: "enemy",
        kind: kind || "bullet",
        life: extra.life || 1.4,
        r: extra.r || (e.def.boss ? 5 : 3),
        poison: !!extra.poison,
        fake: !!(e.fake || e.decoy || extra.fake)
      })
    );
  }

  function enemyFan(state, e, target, n, spread, kind, extra) {
    if (!target) return;
    extra = extra || {};
    var base = Math.atan2(target.y - e.y, target.x - e.x);
    var start = n > 1 ? base - spread / 2 : base;
    var step = n > 1 ? spread / (n - 1) : 0;
    for (var i = 0; i < n; i++) enemyFireAng(state, e, start + step * i, kind, extra);
  }

  function countOrbitShields(state, hostId) {
    var n = 0;
    if (!hostId) return 0;
    for (var i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].orbitHost === hostId && state.enemies[i].hp > 0) n++;
    }
    return n;
  }

  function spawnDuskShields(state, e) {
    if ((e.shieldLockT || 0) > 0) return false;
    if (countOrbitShields(state, e.id) > 0) return false;
    for (var k = 0; k < 4; k++) {
      G.game.spawnAt(state, "orb_escudo", e.x, e.y, {
        orbitHost: e.id,
        orbitIndex: k,
        noDrop: true
      });
    }
    G.burst(state, e.x, e.y, "#ffd24a", 14, 80);
    return true;
  }

  function veilBlink(state, e, target, withBoom) {
    if (!target) return;
    var ang = Math.random() * Math.PI * 2;
    var gap = (target.def.size || 12) + e.def.size + 44;
    e.x = target.x + Math.cos(ang) * gap;
    e.y = target.y + Math.sin(ang) * gap;
    G.clampPlay(e, state);
    if (withBoom) {
      explode(state, e.x, e.y, 78, e.fake || e.decoy ? 0 : 34, "enemy");
      G.audio.explosion();
    } else {
      G.burst(state, e.x, e.y, "#c8a0ff", 16, 90);
    }
    if (!e.fake && e.type === "chefe_espectro" && !e.helperOf) {
      G.game.spawnAt(state, "sombra", e.x + Math.cos(ang + 0.9) * 28, e.y + Math.sin(ang + 0.9) * 28, {
        noDrop: true,
        decoy: true
      });
    }
    var core = findEnemy(state, e.helperOf);
    if (core && core.bossPhase === 2) {
      core.x = e.x + Math.cos(ang + Math.PI) * 36;
      core.y = e.y + Math.sin(ang + Math.PI) * 36;
      core.stealth = 0.7;
      G.clampPlay(core, state);
    }
  }

  function spawnVeilClone(state, veu, slot) {
    var c = G.game.spawnAt(state, "veu_clone", veu.x + 24, veu.y, {
      ownerId: veu.id,
      cloneSlot: slot,
      fake: true,
      decoy: true,
      noDrop: true,
      nextBoom: 3 + ((Math.random() * 4) | 0)
    });
    return c;
  }

  function face(u, tx, ty, dt) {
    var want = Math.atan2(ty - u.y, tx - u.x);
    if (u.rot == null) u.rot = want;
    var dlt = Math.atan2(Math.sin(want - u.rot), Math.cos(want - u.rot));
    u.rot += dlt * Math.min(1, dt * 14);
  }

  function gatherAuras(state, dt) {
    var a = { dmg: 0, speed: 0, fire: 0, shield: 0, range: 0, magnet: 0, drop: 0, slowSquad: 0, heal: 0, regen: 0 };
    var kindN = {};
    var kindAura = {};
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || !u.def.aura) continue;
      kindN[u.kind] = (kindN[u.kind] || 0) + 1;
      kindAura[u.kind] = u.def.aura;
    }
    Object.keys(kindAura).forEach(function (k) {
      var au = kindAura[k];
      var mul = stackMul(kindN[k]);
      if (au.dmg) a.dmg += au.dmg * mul;
      if (au.speed) a.speed += au.speed * mul;
      if (au.fire) a.fire += au.fire * mul;
      if (au.shield) a.shield += au.shield * mul;
      if (au.range) a.range += au.range * mul;
      if (au.magnet) a.magnet += au.magnet * mul;
      if (au.drop) a.drop += au.drop * mul;
      if (au.slowSquad) a.slowSquad += au.slowSquad * mul;
      if (au.heal) a.heal += au.heal * mul;
      if (au.regen) a.regen += au.regen * mul;
    });
    state.aura = a;
    if (state.run.smokeT > 0) state.run.smokeT -= dt;
    if (state.run.activeFireT > 0) {
      state.run.activeFireT -= dt;
      if (state.run.activeFireT <= 0) state.run.activeFire = 0;
    }
    if (state.run.activeDmgT > 0) {
      state.run.activeDmgT -= dt;
      if (state.run.activeDmgT <= 0) state.run.activeDmg = 0;
    }
    if (state.run.tempT > 0) {
      state.run.tempT -= dt;
      if (state.run.tempT <= 0) {
        state.run.tempDmg = 1;
        state.run.tempSpeed = 1;
        state.run.tempShield = 0;
      }
    }
    for (var t = 0; t < state.units.length; t++) {
      if (state.units[t].doubleShotT > 0) state.units[t].doubleShotT -= dt;
    }
  }

  var SQUAD_SPEED = 210;
  var DASH_SPEED = 640;
  var DASH_DUR = 0.3;
  var DASH_CD = 1.05;
  var AIM_SNAP = 64;

  function aimPoint(state) {
    if (state.pointer && state.pointer.x != null) return { x: state.pointer.x, y: state.pointer.y };
    return { x: state.squad.x, y: state.squad.y - 40 };
  }

  function aimGhost(state) {
    var p = aimPoint(state);
    return { x: p.x, y: p.y, def: { size: 10 }, hp: 1, maxHp: 1, id: -2 };
  }

  function aimAngle(state, from) {
    var p = aimPoint(state);
    from = from || state.squad;
    return Math.atan2(p.y - from.y, p.x - from.x);
  }

  function aimTarget(state, from, range) {
    var p = aimPoint(state);
    var t = nearestEdge(state.enemies, p.x, p.y);
    if (!t) return null;
    if (edgeDist(p, t) > AIM_SNAP) return null;
    if (from && range != null && edgeDist(from, t) > range) return null;
    return t;
  }

  function fireTarget(state, u, range) {
    return aimTarget(state, u, range);
  }

  function readMoveDir(state) {
    var k = state.keys || {};
    var x = 0;
    var y = 0;
    if (k.KeyA || k.ArrowLeft) x -= 1;
    if (k.KeyD || k.ArrowRight) x += 1;
    if (k.KeyW || k.ArrowUp) y -= 1;
    if (k.KeyS || k.ArrowDown) y += 1;
    var len = Math.sqrt(x * x + y * y);
    if (len > 0) {
      x /= len;
      y /= len;
      state.moveDir = { x: x, y: y };
    }
    return { x: x, y: y, moving: len > 0 };
  }

  function tryDash(state) {
    if (state.paused || state.userPaused || state.stageOutro || state.defeat) return false;
    if ((state.dashCd || 0) > 0) return false;
    var md = readMoveDir(state);
    var dx = md.x;
    var dy = md.y;
    if (!md.moving) {
      var p = aimPoint(state);
      dx = p.x - state.squad.x;
      dy = p.y - state.squad.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      dx /= len;
      dy /= len;
    }
    state.dashT = DASH_DUR;
    state.dashTMax = DASH_DUR;
    state.dashCd = DASH_CD;
    state.dashCdMax = DASH_CD;
    state.dashDir = { x: dx, y: dy };
    state.moveDir = { x: dx, y: dy };
    spawnDashBurst(state, "#7ec8ff");
    return true;
  }

  function dashMul(state) {
    var max = state.dashTMax || DASH_DUR;
    var k = Math.max(0, Math.min(1, (state.dashT || 0) / max));
    var p = 1 - k;
    if (p < 0.12) {
      var t = p / 0.12;
      return 0.28 + 0.72 * t * t;
    }
    if (p < 0.6) return 1;
    var u = (p - 0.6) / 0.4;
    return Math.max(0.16, 1 - 0.84 * u * u);
  }

  function spawnDashBurst(state, color) {
    var dir = state.dashDir || { x: 0, y: -1 };
    var ang = Math.atan2(dir.y, dir.x);
    G.burst(state, state.squad.x, state.squad.y, color || "#7ec8ff", 8, 70);
    for (var i = 0; i < 10; i++) {
      var along = 6 + i * 9;
      state.particles.push({
        x: state.squad.x - dir.x * along,
        y: state.squad.y - dir.y * along,
        vx: -dir.x * (18 + i * 4),
        vy: -dir.y * (18 + i * 4),
        life: 0.22 + i * 0.01,
        max: 0.22 + i * 0.01,
        size: 4.2 - i * 0.18,
        color: color || "#7ec8ff",
        streak: true,
        ang: ang
      });
    }
  }

  function spawnDashTrail(state, dt) {
    state.dashTrailAcc = (state.dashTrailAcc || 0) + dt;
    if (state.dashTrailAcc < 0.016) return;
    state.dashTrailAcc = 0;
    var dir = state.dashDir || { x: 0, y: -1 };
    var ang = Math.atan2(dir.y, dir.x);
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0) continue;
      state.particles.push({
        x: u.x,
        y: u.y,
        vx: -dir.x * 22,
        vy: -dir.y * 22,
        life: 0.24,
        max: 0.24,
        size: Math.max(4.5, (u.def.size || 12) * 0.62),
        color: u.def.color || "#7ec8ff",
        streak: true,
        ang: ang
      });
    }
  }

  function steerSquad(state, dt) {
    if (state.dashCd > 0) state.dashCd = Math.max(0, state.dashCd - dt);
    if (state.stageOutro) return;
    var b = G.playfield(state);
    if (state.pointer && state.pointer.moveSquad && (state.dashT || 0) <= 0) return;
    var speedMul = state.run.speed * (1 + (G.save.data.perm.speed | 0) * 0.06) * (state.run.tempSpeed || 1);
    if (state.aura) speedMul *= 1 + state.aura.speed;
    if (state.aura && state.aura.slowSquad) speedMul *= Math.max(0.55, 1 - state.aura.slowSquad);
    if (G.tactics && G.tactics.speedMul) speedMul *= G.tactics.speedMul(state);
    var vx = 0;
    var vy = 0;
    state.dashStep = null;
    state.dashActive = false;
    if ((state.dashT || 0) > 0) {
      var dir = state.dashDir || { x: 0, y: -1 };
      var sp = DASH_SPEED * dashMul(state);
      vx = dir.x * sp;
      vy = dir.y * sp;
      state.dashActive = true;
      spawnDashTrail(state, dt);
      state.dashT = Math.max(0, state.dashT - dt);
    } else {
      var md = readMoveDir(state);
      if (md.moving) {
        vx = md.x * SQUAD_SPEED * speedMul;
        vy = md.y * SQUAD_SPEED * speedMul;
      }
    }
    var ox = state.squad.x;
    var oy = state.squad.y;
    state.squad.x = Math.max(b.x0, Math.min(b.x1, state.squad.x + vx * dt));
    state.squad.y = Math.max(b.y0, Math.min(b.y1, state.squad.y + vy * dt));
    if (state.dashActive) {
      state.dashStep = { x: state.squad.x - ox, y: state.squad.y - oy };
    }
  }

  function soldierSlot(si, n) {
    var angle = -Math.PI / 2 + (si / Math.max(1, n)) * Math.PI * 2;
    var r = 34 + Math.max(0, n - 3) * 5;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  }

  function updateSquad(state, dt) {
    gatherAuras(state, dt);
    steerSquad(state, dt);
    if (state.squad.lx == null) {
      state.squad.lx = state.squad.x;
      state.squad.ly = state.squad.y;
    }
    state.squad.vx = (state.squad.x - state.squad.lx) / Math.max(dt, 0.008);
    state.squad.vy = (state.squad.y - state.squad.ly) / Math.max(dt, 0.008);
    state.squad.lx = state.squad.x;
    state.squad.ly = state.squad.y;

    var alive = [];
    var soldiers = [];
    var cmd = null;
    for (var i = 0; i < state.units.length; i++) {
      if (state.units[i].hp <= 0) continue;
      alive.push(state.units[i]);
      if (state.units[i].commander) cmd = state.units[i];
      else soldiers.push(state.units[i]);
    }
    var speedMul = state.run.speed * (1 + (G.save.data.perm.speed | 0) * 0.06) * (state.run.tempSpeed || 1);
    if (state.aura) speedMul *= 1 + state.aura.speed;
    if (state.aura && state.aura.slowSquad) speedMul *= Math.max(0.55, 1 - state.aura.slowSquad);
    var regen = (G.save.data.perm.regen | 0) * 0.004 + (state.run.regen || 0) + ((state.aura && state.aura.regen) || 0);
    var lowest = null;
    for (var h = 0; h < alive.length; h++) {
      if (!lowest || alive[h].hp / alive[h].maxHp < lowest.hp / lowest.maxHp) lowest = alive[h];
    }
    var si = 0;
    for (var j = 0; j < alive.length; j++) {
      var u = alive[j];
      if (u.activeCd > 0) u.activeCd -= dt;
      if (u.activeFlash > 0) u.activeFlash -= dt;
      if (u.veilFogT > 0) u.veilFogT -= dt;
      var ox = u.x;
      var oy = u.y;
      if (u.held) {
        u.vx = 0;
        u.vy = 0;
        continue;
      }
      var tx;
      var ty;
      if (u.commander) {
        tx = state.squad.x;
        ty = state.squad.y;
      } else {
        var slot = soldierSlot(si, soldiers.length);
        si++;
        tx = state.squad.x + slot.x;
        ty = state.squad.y + slot.y;
      }
      var dx = tx - u.x;
      var dy = ty - u.y;
      var spd = u.def.speed * speedMul;
      if (u.veilFogT > 0) spd *= 0.62;
      if (state.dashActive && state.dashStep) {
        u.x += state.dashStep.x;
        u.y += state.dashStep.y;
        dx = tx - u.x;
        dy = ty - u.y;
        u.x += dx * Math.min(1, dt * 8);
        u.y += dy * Math.min(1, dt * 8);
      } else {
        var follow = spd / 55;
        if (state.stageOutro && state.stageOutro.phase === "march") {
          follow = 10;
          face(u, u.x, u.y - 40, dt);
        }
        u.x += dx * Math.min(1, dt * follow);
        u.y += dy * Math.min(1, dt * follow);
      }
      u.vx = (u.x - ox) / Math.max(dt, 0.008);
      u.vy = (u.y - oy) / Math.max(dt, 0.008);
      var moveSpd = Math.hypot(u.vx, u.vy);
      if (u.def.flying) u.rotor += dt * (16 + Math.min(14, moveSpd * 0.04));
      u.gait = (u.gait || 0) + dt * (moveSpd > 26 ? Math.min(16, moveSpd / 15) : 2.15);
      u.wheel = (u.wheel || 0) + dt * (moveSpd / 11);
      if (regen > 0) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * regen * dt);
      if (u.poisonT > 0) {
        u.poisonT -= dt;
        hurt(state, u, u.maxHp * 0.05 * dt / 5, u.x, u.y, false, { trueDmg: true });
      }
      var cursor = aimPoint(state);
      if (!(state.stageOutro && state.stageOutro.phase === "march")) {
        face(u, cursor.x, cursor.y, dt);
      }
    }
    separateBodies(state.units, state, !(state.stageOutro && state.stageOutro.phase === "march"));
    if (state.aura && state.aura.heal > 0 && lowest) {
      lowest.hp = Math.min(lowest.maxHp, lowest.hp + state.aura.heal * dt);
    }
  }

  function playerShoot(state, dt) {
    if (G.tactics && G.tactics.playerShoot) G.tactics.playerShoot(state, dt);
  }

  function updateEnemies(state, dt) {
    var units = state.units;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0) continue;
      e.phase += dt;
      e.cooldown -= dt;
      e.burstCd -= dt;
      e.contactCd -= dt;
      e.lastHitT = (e.lastHitT || 0) + dt;
      if (e.slowT > 0) e.slowT -= dt;
      if (e.freezeT > 0) e.freezeT -= dt;
      var target = nearest(units, e.x, e.y);
      if (G.tactics && G.tactics.enemyAim) target = G.tactics.enemyAim(state, e, target);
      if (!target) {
        if (e.def.kind !== "nest") continue;
        target = { x: state.squad.x, y: state.squad.y, def: { size: 12 }, hp: 1, id: -1 };
      }
      var d = dist(e, target);
      face(e, target.x, target.y, dt);
      var kind = e.def.kind;
      var spd = e.def.speed;

      if (kind === "melee") {
        chase(state, e, target, spd, dt);
        if (d < e.def.range + target.def.size && e.contactCd <= 0) {
          e.contactCd = 0.32;
          if (G.tactics && G.tactics.skipContact && G.tactics.skipContact(state, e)) {
            /* frontal armor */
          } else if (isDecoy(e)) applyVeilNuisance(state, target, e);
          else {
            hurt(state, target, e.def.dmg, e.x, e.y);
            G.audio.hit();
          }
        }
      } else if (kind === "ranged" || kind === "cryo") {
        var prefer = e.def.prefer || 160;
        if (d < prefer - 30) moveTowards(e, e.x * 2 - target.x, e.y * 2 - target.y, spd, dt);
        else if (d > prefer + 20) moveTowards(e, target.x, target.y, spd, dt);
        if (d <= e.def.range && e.cooldown <= 0) {
          e.cooldown = 1 / e.def.fire;
          enemyFire(state, e, target, kind === "cryo" ? "ice" : "bullet");
        }
      } else if (kind === "drone") {
        var ang = Math.atan2(target.y - e.y, target.x - e.x);
        var slow = e.slowT > 0 ? 0.42 : 1;
        e.x += Math.cos(ang) * spd * slow * dt + Math.cos(e.phase * 5) * 40 * dt;
        e.y += Math.sin(ang) * spd * slow * dt + Math.sin(e.phase * 4) * 40 * dt;
        if (d <= e.def.range && e.cooldown <= 0) {
          e.cooldown = 1 / e.def.fire;
          enemyFire(state, e, target);
        }
      } else if (kind === "kamikaze") {
        chase(state, e, target, spd, dt);
        if (d < e.def.range) {
          explode(state, e.x, e.y, 38, e.def.dmg, "enemy");
          e.hp = 0;
          G.audio.explosion();
          G.burst(state, e.x, e.y, "#ff4a2a", 18, 150);
        }
      } else if (kind === "healer") {
        var wounded = null;
        var worst = 1;
        for (var h = 0; h < state.enemies.length; h++) {
          var ally = state.enemies[h];
          if (ally.hp <= 0 || ally.id === e.id || ally.def.kind === "healer") continue;
          var ratio = ally.hp / ally.maxHp;
          if (ratio < worst) {
            worst = ratio;
            wounded = ally;
          }
        }
        if (wounded && worst < 0.95) {
          moveTowards(e, wounded.x, wounded.y, spd, dt);
          if (dist(e, wounded) < 55 && e.cooldown <= 0) {
            e.cooldown = 0.8;
            wounded.hp = Math.min(wounded.maxHp, wounded.hp + 10);
            G.burst(state, wounded.x, wounded.y, "#ffe6e6", 6, 40);
          }
        } else {
          moveTowards(e, e.x * 2 - target.x, e.y * 2 - target.y, spd, dt);
        }
      } else if (kind === "artillery") {
        var prefA = e.def.prefer || 250;
        if (d < prefA - 40) moveTowards(e, e.x * 2 - target.x, e.y * 2 - target.y, spd, dt);
        else if (d > prefA + 40) moveTowards(e, target.x, target.y, spd * 0.6, dt);
        if (e.cooldown <= 0) {
          e.cooldown = 1 / e.def.fire;
          state.warnings.push({ x: target.x, y: target.y, t: 0.85, max: 0.85, r: 42, dmg: e.def.dmg });
        }
      } else if (kind === "stealth") {
        if (d > 88) {
          e.stealth = 1;
          chase(state, e, target, spd * 1.15, dt);
        } else {
          e.stealth = Math.max(0, e.stealth - dt * 3);
          chase(state, e, target, spd * 1.35, dt);
          if (d < e.def.range + target.def.size && e.cooldown <= 0) {
            e.cooldown = 0.32;
            if (isDecoy(e)) applyVeilNuisance(state, target, e);
            else hurt(state, target, e.def.dmg, e.x, e.y);
          }
        }
      } else if (kind === "sniper") {
        var prefS = e.def.prefer || 240;
        if (d < prefS - 40) moveTowards(e, e.x * 2 - target.x, e.y * 2 - target.y, spd, dt);
        else if (d > prefS + 30) moveTowards(e, target.x, target.y, spd, dt);
        if (e.cooldown <= 0 && d <= e.def.range) {
          e.cooldown = 1 / e.def.fire;
          enemyFire(state, e, target);
        }
      } else if (kind === "nest") {
        e.spawnT -= dt;
        if (e.spawnT <= 0) {
          e.spawnT = 3.2;
          var larvae = 0;
          for (var L = 0; L < state.enemies.length; L++) if (state.enemies[L].type === "larva") larvae++;
          if (larvae < 10) G.game.spawnAt(state, "larva", e.x + (Math.random() - 0.5) * 30, e.y + (Math.random() - 0.5) * 30);
        }
      } else if (kind === "parasite") {
        if (e.attached) {
          var host = null;
          for (var p = 0; p < units.length; p++) if (units[p].id === e.attached) host = units[p];
          if (!host || host.hp <= 0) {
            e.attached = null;
          } else {
            e.x = host.x + 10;
            e.y = host.y - 12;
            if (e.cooldown <= 0) {
              e.cooldown = 0.7;
              hurt(state, host, e.def.dmg, e.x, e.y);
            }
          }
        } else {
          chase(state, e, target, spd, dt);
          if (d < 18) {
            e.attached = target.id;
            target.parasite = (target.parasite || 0) + 1;
          }
        }
      } else if (kind === "orbit_shield") {
        var host = findEnemy(state, e.orbitHost);
        if (!host) {
          e.hp = 0;
          e.noDrop = true;
        } else {
          var nOrb = 0;
          for (var oi = 0; oi < state.enemies.length; oi++) {
            if (state.enemies[oi].orbitHost === e.orbitHost && state.enemies[oi].hp > 0) nOrb++;
          }
          var slot = e.orbitIndex || 0;
          var oang = -Math.PI / 2 + (slot / Math.max(1, nOrb)) * Math.PI * 2 + e.phase * 1.35;
          var orad = host.def.size + 30;
          e.x = host.x + Math.cos(oang) * orad;
          e.y = host.y + Math.sin(oang) * orad;
          e.rot = oang;
        }
      } else if (kind === "mini_beemote") {
        var preferM = 140;
        var bzMx = Math.sin(e.phase * 24) * 36;
        var bzMy = Math.cos(e.phase * 19) * 28;
        if (d < preferM - 24) moveTowards(e, e.x * 2 - target.x + bzMx, e.y * 2 - target.y + bzMy, spd, dt);
        else if (d > preferM + 20) moveTowards(e, target.x + bzMx * 0.4, target.y + bzMy * 0.4, spd * 1.35, dt);
        else {
          e.x += (Math.sin(e.phase * 3.4) * 55 + bzMx) * dt;
          e.y += (Math.cos(e.phase * 5.1) * 40 + bzMy) * dt;
        }
        if (d <= e.def.range && e.cooldown <= 0) {
          e.cooldown = 1 / e.def.fire;
          enemyFire(state, e, target, "sting", { poison: true, speed: 200, r: 4 });
        }
      } else if (kind === "boss_burst") {
        if (e.shieldLockT > 0) e.shieldLockT -= dt;
        var crossed = Math.floor((1 - e.hp / e.maxHp) / 0.2);
        if (crossed > (e.shieldBand || 0)) {
          e.shieldBand = crossed;
          if (!spawnDuskShields(state, e)) e.shieldPending = true;
        }
        if (e.shieldPending && spawnDuskShields(state, e)) e.shieldPending = false;
        e.skillT -= dt;
        if (e.spinMode > 0) {
          var spinSpd = Math.PI * 2 / 1.15;
          e.rot = (e.rot || 0) + (e.spinMode === 1 ? spinSpd : -spinSpd) * dt;
          e.spinT -= dt;
          e.spinShotT = (e.spinShotT || 0) - dt;
          if (e.spinShotT <= 0) {
            e.spinShotT = 0.07;
            enemyFireAng(state, e, e.rot, "bullet");
            enemyFireAng(state, e, e.rot + Math.PI, "bullet", { dmg: Math.round(e.def.dmg * 0.7) });
          }
          if (e.spinT <= 0) {
            if (e.spinMode === 1) {
              e.spinMode = 2;
              e.spinT = 1.15;
            } else {
              e.spinMode = 0;
              e.skillT = 6.2;
            }
          }
        } else {
          moveTowards(e, state.squad.x, state.squad.y, spd, dt);
          if (e.skillT <= 0) {
            e.spinMode = 1;
            e.spinT = 1.15;
            e.spinShotT = 0;
          }
          if (e.cooldown <= 0 && target) {
            e.cooldown = 1.25;
            enemyFire(state, e, target);
          }
        }
      } else if (kind === "boss_charge") {
        e.miniT -= dt;
        if (e.miniT <= 0) {
          e.miniT = 30;
          G.game.spawnAt(state, "mini_beemote", e.x + 40, e.y, { noDrop: false });
          state.floaters.push(G.createFloater(e.x, e.y - 24, "cria", "#ffb070"));
        }
        var charging = e.ricoLeft > 0 || e.chargeT > 1.35;
        if (e.ricoLeft > 0) {
          var rsp = Math.sqrt(e.vx * e.vx + e.vy * e.vy) || 1;
          var rwob = Math.sin(e.phase * 22) * 52 + Math.sin(e.phase * 9) * 22;
          e.x += e.vx * dt + (-e.vy / rsp) * rwob * dt;
          e.y += e.vy * dt + (e.vx / rsp) * rwob * dt;
          e.rot = Math.atan2(e.vy, e.vx);
          var bf = G.playfield(state);
          var ms = e.def.size;
          var bounced = false;
          if (e.x < bf.x0 + ms) { e.x = bf.x0 + ms; e.vx = Math.abs(e.vx); bounced = true; }
          else if (e.x > bf.x1 - ms) { e.x = bf.x1 - ms; e.vx = -Math.abs(e.vx); bounced = true; }
          if (e.y < bf.y0 + ms) { e.y = bf.y0 + ms; e.vy = Math.abs(e.vy); bounced = true; }
          else if (e.y > bf.y1 - ms) { e.y = bf.y1 - ms; e.vy = -Math.abs(e.vy); bounced = true; }
          if (bounced) {
            e.ricoLeft--;
            var twist = (Math.random() - 0.5) * 0.7;
            var spB = Math.sqrt(e.vx * e.vx + e.vy * e.vy) || 780;
            var angB = Math.atan2(e.vy, e.vx) + twist;
            e.vx = Math.cos(angB) * spB;
            e.vy = Math.sin(angB) * spB;
          }
        } else {
          e.chargeT -= dt;
          if (e.chargeT <= 0) {
            e.chargeCount = (e.chargeCount || 0) + 1;
            var aim = Math.atan2(
              (target.y + (state.squad.vy || 0) * 0.12) - e.y,
              (target.x + (state.squad.vx || 0) * 0.12) - e.x
            ) + (Math.random() - 0.5) * 0.28;
            if (e.chargeCount >= 5) {
              e.chargeCount = 0;
              e.ricoLeft = 5;
              var ricoSp = 760 + Math.random() * 140;
              e.vx = Math.cos(aim) * ricoSp;
              e.vy = Math.sin(aim) * ricoSp;
              e.chargeT = 1.9;
            } else {
              var dashSp = 840 + Math.random() * 180;
              e.vx = Math.cos(aim) * dashSp;
              e.vy = Math.sin(aim) * dashSp;
              e.chargeT = 1.9;
            }
          }
          charging = e.ricoLeft > 0 || e.chargeT > 1.35;
          if (e.ricoLeft <= 0 && e.chargeT > 1.35) {
            var dsp = Math.sqrt(e.vx * e.vx + e.vy * e.vy) || 1;
            var dwob = Math.sin(e.phase * 26) * 48;
            e.x += e.vx * dt + (-e.vy / dsp) * dwob * dt;
            e.y += e.vy * dt + (e.vx / dsp) * dwob * dt;
            e.rot = Math.atan2(e.vy, e.vx);
          } else if (e.ricoLeft <= 0 && !charging) {
            var angH = e.phase * 0.9;
            var stand = 145 + Math.sin(e.phase * 1.4) * 36;
            var fig8x = Math.sin(e.phase * 3.2) * 58;
            var fig8y = Math.sin(e.phase * 6.4) * 30;
            var bzX = Math.sin(e.phase * 28) * 20 + Math.cos(e.phase * 17) * 10;
            var bzY = Math.cos(e.phase * 31) * 16;
            var hx = target.x + Math.cos(angH) * stand + fig8x + bzX;
            var hy = target.y + Math.sin(angH) * stand * 0.6 + fig8y + bzY;
            moveTowards(e, hx, hy, spd * 2.6, dt);
            if (e.cooldown <= 0 && edgeDist(e, target) < e.def.range) {
              e.cooldown = 1 / Math.max(0.25, e.def.fire);
              enemyFan(state, e, target, 3, 0.52, "sting", { poison: true, speed: 220, r: 4, life: 1.5 });
            }
          }
        }
        if (d < e.def.size + target.def.size && e.contactCd <= 0) {
          e.contactCd = 0.16;
          if (!(G.tactics && G.tactics.skipContact && G.tactics.skipContact(state, e))) {
            hurt(state, target, e.def.dmg, e.x, e.y);
          }
        }
      } else if (kind === "boss_spawn") {
        if (e.lastHitT > 4.8) {
          e.parked = true;
          e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.005 * dt);
          for (var al = 0; al < state.enemies.length; al++) {
            var ally = state.enemies[al];
            if (ally.hp <= 0 || ally.id === e.id) continue;
            if (dist(e, ally) < 150) ally.hp = Math.min(ally.maxHp, ally.hp + ally.maxHp * 0.005 * dt);
          }
        } else {
          e.parked = false;
        }
        if (!e.parked) moveTowards(e, state.squad.x, state.squad.y, spd * 0.6, dt);
        e.spawnT -= dt;
        if (e.spawnT <= 0) {
          e.spawnT = 3.4;
          G.game.spawnAt(state, "infantaria", e.x + 30, e.y, { noDrop: true });
          G.game.spawnAt(state, "corredor", e.x - 30, e.y, { noDrop: true });
        }
        if (e.cooldown <= 0 && d < e.def.range) {
          e.cooldown = 1 / e.def.fire;
          enemyFire(state, e, target);
        }
      } else if (kind === "boss_veil") {
        e.stealth = 0.45 + Math.sin(e.phase * 2) * 0.2;
        if (e.type === "chefe_espectro" && !e.fake && !e.helperOf) {
          if (!e.veilRage && e.hp < e.maxHp * 0.5) e.veilRage = true;
          e.cloneCd[0] -= dt;
          e.cloneCd[1] -= dt;
          if (e.veilRage) {
            for (var cs = 0; cs < 2; cs++) {
              if (e.cloneCd[cs] <= 0 && !findEnemy(state, e["_clone" + cs])) {
                var cl = spawnVeilClone(state, e, cs);
                e["_clone" + cs] = cl.id;
              }
            }
          } else {
            e.skillT = (e.skillT || 8) - dt;
            if (e.skillT <= 0 && e.cloneCd[0] <= 0 && !findEnemy(state, e._clone0)) {
              e.skillT = 9 + Math.random() * 4;
              var c0 = spawnVeilClone(state, e, 0);
              e._clone0 = c0.id;
            }
          }
        }
        if (e.cooldown <= 0) {
          e.cooldown = e.fake ? 2.1 : 2.4;
          e.tpCount = (e.tpCount || 0) + 1;
          var boom = e.tpCount >= (e.nextBoom || 4);
          if (boom) {
            e.tpCount = 0;
            e.nextBoom = 3 + ((Math.random() * 4) | 0);
          }
          veilBlink(state, e, target, boom);
        }
        if (e.burstCd <= 0) {
          e.burstCd = 0.7;
          enemyFire(state, e, target, "bullet", { fake: !!e.fake });
        }
      } else if (kind === "boss_final") {
        var phase = e.bossPhase || 1;
        if (phase === 2) e.stealth = Math.max(0.2, (e.stealth || 0) - dt * 0.15);
        var coreSpd = phase === 1 ? 16 : phase === 2 ? 26 : 46;
        if (phase < 3) {
          moveTowards(e, state.squad.x, state.squad.y, coreSpd, dt);
        } else {
          if (d < 78 || (e.skillT || 0) <= 0) {
            var b3 = G.playfield(state);
            e.x = b3.x0 + 40 + Math.random() * (b3.x1 - b3.x0 - 80);
            e.y = b3.y0 + 40 + Math.random() * (b3.y1 - b3.y0 - 80);
            e.skillT = 6.5;
            G.burst(state, e.x, e.y, "#fff36a", 18, 110);
          } else {
            e.skillT = (e.skillT || 6) - dt;
            moveTowards(e, state.squad.x, state.squad.y, coreSpd, dt);
          }
          e.coreHealT -= dt;
          if (e.coreHealT <= 0) {
            e.coreHealT = 9;
            e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.04);
            G.burst(state, e.x, e.y, "#7cffb0", 10, 50);
          }
          e.coreRayT -= dt;
          if (e.coreRayT <= 0 && target) {
            e.coreRayT = 2.6;
            var base = Math.atan2(target.y - e.y, target.x - e.x);
            for (var rv = -1; rv <= 1; rv++) {
              enemyFireAng(state, e, base + rv * 0.18, "laser", { speed: 520, dmg: 22, r: 4, life: 1.1 });
            }
          }
          e.coreSummonT -= dt;
          if (e.coreSummonT <= 0 && state.enemies.length < 36) {
            e.coreSummonT = 60 + Math.random() * 60;
            var bossPick = G.BOSS_POOL[(Math.random() * G.BOSS_POOL.length) | 0];
            G.game.spawnAt(state, bossPick, e.x + 50, e.y, { noLink: true });
            for (var tr = 0; tr < 3; tr++) {
              var trash = G.ENEMY_POOL[(Math.random() * G.ENEMY_POOL.length) | 0];
              G.game.spawnAt(state, trash, e.x + (Math.random() - 0.5) * 80, e.y + (Math.random() - 0.5) * 80);
            }
            state.floaters.push(G.createFloater(e.x, e.y - 28, "legião", "#fff36a"));
          }
        }
        if (e.cooldown <= 0) {
          e.burstLeft = phase === 3 ? 6 : 4;
          e.cooldown = phase === 3 ? 1.15 : 1.4;
        }
        if (e.burstLeft > 0 && e.burstCd <= 0) {
          enemyFire(state, e, target);
          e.burstLeft--;
          e.burstCd = 0.1;
        }
        if (phase === 3 && e.contactCd <= 0) {
          e.contactCd = 3.2;
          state.warnings.push({ x: state.squad.x, y: state.squad.y, t: 0.85, max: 0.85, r: 76, dmg: 52 });
        }
      }

      if (!e.attached && !(e.ricoLeft > 0) && kind !== "orbit_shield") G.clampPlay(e, state);
    }
    separateBodies(state.enemies, state, true);
  }

  function updateProjectiles(state, dt) {
    if (G.tactics && G.tactics.preProjectiles) G.tactics.preProjectiles(state, dt);
    for (var i = state.projectiles.length - 1; i >= 0; i--) {
      var p = state.projectiles[i];
      if (p.arc || p.orbitBoss) continue;
      if (p.homing) {
        var tgt = null;
        if (p.team === "player") {
          if (p.homeId) tgt = findEnemy(state, p.homeId);
          if (!tgt) {
            var ap = aimPoint(state);
            tgt = { x: ap.x, y: ap.y };
          }
        } else {
          tgt = nearest(state.units, p.x, p.y);
        }
        if (tgt) {
          var hx = tgt.x - p.x;
          var hy = tgt.y - p.y;
          var hl = Math.sqrt(hx * hx + hy * hy) || 1;
          var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 210;
          var steer = p.homeId && !p.homeCursor ? 0.2 : 0.16;
          p.vx = p.vx * (1 - steer) + (hx / hl) * sp * steer;
          p.vy = p.vy * (1 - steer) + (hy / hl) * sp * steer;
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      var b = G.playfield(state);
      if (p.life <= 0 || p.x < b.x0 - 36 || p.y < b.y0 - 36 || p.x > b.x1 + 36 || p.y > b.y1 + 36) {
        if (p.kind === "missile") explode(state, p.x, p.y, p.boomR || 40, p.dmg, p.team);
        state.projectiles.splice(i, 1);
        continue;
      }
      if (p.team === "enemy" && G.tactics && G.tactics.absorbBumper && G.tactics.absorbBumper(state, p)) {
        state.projectiles.splice(i, 1);
        continue;
      }
      var list = p.team === "player" ? state.enemies : state.units;
      var hit = null;
      for (var j = 0; j < list.length; j++) {
        var t = list[j];
        if (t.hp <= 0 || p.hitIds[t.id]) continue;
        var rad = t.def.size + p.r;
        var dx = t.x - p.x;
        var dy = t.y - p.y;
        if (dx * dx + dy * dy <= rad * rad) {
          hit = t;
          break;
        }
      }
      if (!hit) continue;
      if (G.tactics && G.tactics.onBulletHit && G.tactics.onBulletHit(state, p, hit)) {
        state.projectiles.splice(i, 1);
        continue;
      }
      if (p.poison && hit.team === "player") hit.poisonT = 5;
      if (p.fake || p.dmg <= 0) {
        if (p.team === "enemy" && hit.team === "player") applyVeilNuisance(state, hit, p);
        p.hitIds[hit.id] = 1;
        p.hitsLeft--;
        if (p.hitsLeft <= 0) state.projectiles.splice(i, 1);
        continue;
      }
      if (p.kind === "grenade" || p.kind === "missile") explode(state, p.x, p.y, p.kind === "missile" ? (p.boomR || 46) : 38, p.dmg, p.team);
      else {
        hurt(state, hit, p.dmg, p.x, p.y, p.team === "player");
        if (p.kind === "ice") hit.slowT = Math.max(hit.slowT, 1.4);
      }
      p.hitIds[hit.id] = 1;
      p.hitsLeft--;
      if (p.ricochet && p.team === "player" && p.hitsLeft <= 0) {
        var other = nearest(state.enemies, p.x, p.y, hit.id);
        if (other) {
          p.ricochet = false;
          p.hitsLeft = 1;
          var dx2 = other.x - p.x;
          var dy2 = other.y - p.y;
          var len = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
          var sp2 = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          p.vx = (dx2 / len) * sp2;
          p.vy = (dy2 / len) * sp2;
          p.life = 0.7;
          continue;
        }
      }
      if (p.hitsLeft <= 0) state.projectiles.splice(i, 1);
    }
  }

  function updateMines(state, dt) {
    if (!state.mines) state.mines = [];
    for (var i = state.mines.length - 1; i >= 0; i--) {
      var m = state.mines[i];
      m.arm -= dt;
      m.life -= dt;
      if (m.life <= 0) {
        state.mines.splice(i, 1);
        continue;
      }
      if (m.arm > 0) continue;
      for (var j = 0; j < state.enemies.length; j++) {
        var e = state.enemies[j];
        if (e.hp <= 0) continue;
        var dx = e.x - m.x;
        var dy = e.y - m.y;
        if (dx * dx + dy * dy <= m.r * m.r) {
          G.audio.explosion();
          explode(state, m.x, m.y, m.r + 8, m.dmg, "player");
          state.mines.splice(i, 1);
          break;
        }
      }
    }
  }

  function updateWarnings(state, dt) {
    if (!state.warnings) state.warnings = [];
    for (var i = state.warnings.length - 1; i >= 0; i--) {
      var w = state.warnings[i];
      w.t -= dt;
      if (w.t <= 0) {
        explode(state, w.x, w.y, w.r, w.dmg, "enemy");
        G.audio.explosion();
        state.warnings.splice(i, 1);
      }
    }
  }

  function pickupRadius(state) {
    return state.vacuumLoot ? 45 : 35;
  }

  function updateDrops(state, dt) {
    var magnet = 70 + state.run.magnet + (G.save.data.perm.magnet | 0) * 18 + ((state.aura && state.aura.magnet) || 0);
    for (var i = state.drops.length - 1; i >= 0; i--) {
      var d = state.drops[i];
      d.t += dt;
      var dx = state.squad.x - d.x;
      var dy = state.squad.y - d.y;
      var dist2 = dx * dx + dy * dy;
      var mag = d.kind === "unit" ? 0 : d.kind === "hp" ? 40 : magnet;
      if (state.vacuumLoot) mag = 8000;
      if (dist2 < mag * mag) {
        var len = Math.sqrt(dist2) || 1;
        var pull = state.vacuumLoot ? 420 : 260;
        d.x += (dx / len) * pull * dt;
        d.y += (dy / len) * pull * dt;
      }
      if (dist2 < pickupRadius(state) * pickupRadius(state)) {
        if (G.tactics && G.tactics.pickupDrop && G.tactics.pickupDrop(state, d)) {
          state.drops.splice(i, 1);
          continue;
        }
        if (d.kind === "coin") {
          state.run.coins += d.value;
          G.audio.coin();
          state.floaters.push(G.createFloater(d.x, d.y, "+" + d.value, "#ffd24a"));
        } else if (d.kind === "unit" && (state.vacuumLoot || G.soldierCount(state) >= G.maxUnits())) {
          bankDrop(state, d.unitKind || "recruta", d.x, d.y);
        } else {
          if (G.soldierCount(state) < G.maxUnits()) {
            var nu = G.createPlayerUnit(d.x, d.y, d.unitKind || "recruta", state.run, G.save.data.perm);
            state.units.push(nu);
            G.codex.unlockUnit(nu.kind);
            state.floaters.push(G.createFloater(d.x, d.y, "+1", "#7ec8ff"));
          } else {
            bankDrop(state, d.unitKind || "recruta", d.x, d.y);
          }
        }
        state.drops.splice(i, 1);
      }
    }
  }

  function updateFx(state, dt) {
    for (var i = state.particles.length - 1; i >= 0; i--) {
      var p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (var j = state.floaters.length - 1; j >= 0; j--) {
      var f = state.floaters[j];
      f.y -= 28 * dt;
      f.life -= dt;
      if (f.life <= 0) state.floaters.splice(j, 1);
    }
    for (var k = 0; k < state.units.length; k++) {
      if (state.units[k].flash > 0) state.units[k].flash -= dt;
    }
    for (var n = 0; n < state.enemies.length; n++) {
      if (state.enemies[n].flash > 0) state.enemies[n].flash -= dt;
    }
    state.shake *= Math.max(0, 1 - dt * 8);
  }

  function activesOf(state) {
    var groups = {};
    var order = [];
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      u.activeSlot = -1;
      if (u.hp <= 0 || !u.def.active) continue;
      var aid = u.def.active.id;
      if (!groups[aid]) {
        groups[aid] = [];
        order.push(aid);
      }
      groups[aid].push(u);
    }
    var list = [];
    for (var o = 0; o < order.length && list.length < 9; o++) {
      var g = groups[order[o]];
      var cd = 0;
      var dur = 0;
      for (var k = 0; k < g.length; k++) {
        if (g[k].activeCd > cd) cd = g[k].activeCd;
        var d0 = g[k].def.active.dur || 0;
        if (d0 > dur) dur = d0;
      }
      for (var k2 = 0; k2 < g.length; k2++) {
        g[k2].activeCd = cd;
        g[k2].activeSlot = list.length;
        g[k2].stackN = g.length;
      }
      g[0].stackDur = dur;
      list.push(g[0]);
    }
    return list;
  }

  function useActive(state, index) {
    var list = activesOf(state);
    var u = list[index];
    if (!u || u.activeCd > 0) return false;
    var id = u.def.active.id;
    var pack = unitsWithActive(state, id);
    var sm = stackMul(pack.length);
    var cd = u.def.active.cd;
    for (var gj = 0; gj < pack.length; gj++) {
      pack[gj].activeCd = cd;
      pack[gj].activeFlash = 0.45;
    }
    var meta = G.activeMeta(id);
    state.vfx = state.vfx || [];
    state.vfx.push({ id: id, x: u.x, y: u.y, t: 0.55, max: 0.55, color: meta.color });
    var tgt = aimTarget(state, u) || aimGhost(state);
    if (G.tactics && G.tactics.useActive && G.tactics.useActive(state, id, u)) {
      G.audio.wave();
      var stackTxt0 = pack.length > 1 ? " ×" + pack.length : "";
      state.floaters.push(G.createFloater(u.x, u.y - 22, u.def.active.name + stackTxt0, "#ffd24a"));
      return true;
    }
    if (id === "mark") {
      u.marked = 4 * sm;
    } else if (id === "napalm") {
      var hold = u.def.range;
      u.def.range = hold * 1.85 * sm;
      flameAt(state, u, tgt);
      u.def.range = hold;
    } else if (id === "carpet") {
      var nMines = Math.max(6, Math.round(6 * sm));
      for (var m = 0; m < nMines; m++) {
        var ra = (Math.PI * 2 * m) / nMines;
        state.mines = state.mines || [];
        state.mines.push({ x: u.x + Math.cos(ra) * 36, y: u.y + Math.sin(ra) * 36, arm: 0.35, life: 11, r: Math.round(34 * sm), dmg: Math.round(u.def.dmg * dmgMul(state) * sm), team: "player" });
      }
    } else if (id === "storm" || id === "pulse") {
      explode(state, u.x, u.y, Math.round(90 * sm), Math.round((id === "pulse" ? 55 : 32) * dmgMul(state) * sm), "player");
    } else if (id === "strafe") {
      explode(state, u.x, u.y, Math.round(70 * sm), Math.round(28 * dmgMul(state) * sm), "player");
    } else if (id === "calibre") {
      u.marked = 4 * sm;
      fireAt(state, u, tgt);
    } else if (id === "fan") {
      for (var f = 0; f < state.enemies.length; f++) {
        var en = state.enemies[f];
        if (en.hp > 0 && dist(u, en) < 130 * sm) hurt(state, en, Math.round(u.def.dmg * dmgMul(state) * sm), u.x, u.y, true);
      }
    } else if (id === "doubletap") {
      for (var dtap = 0; dtap < pack.length; dtap++) pack[dtap].doubleShotT = 10 * sm;
    } else if (id === "supercharge") {
      state.mines = state.mines || [];
      var charged = 0;
      var chMul = 1.4 * sm;
      for (var sc = 0; sc < state.mines.length; sc++) {
        var mine = state.mines[sc];
        if (mine.team !== "player" || mine.charged) continue;
        mine.charged = true;
        mine.r = (mine.r || 36) * chMul;
        mine.dmg = Math.round((mine.dmg || 20) * chMul);
        charged++;
        G.burst(state, mine.x, mine.y, "#fff3b0", 8, 40);
      }
      if (!charged) state.floaters.push(G.createFloater(u.x, u.y - 10, "sem minas", "#d4c46a"));
    }
    G.audio.wave();
    var stackTxt = pack.length > 1 ? " ×" + pack.length : "";
    state.floaters.push(G.createFloater(u.x, u.y - 22, u.def.active.name + stackTxt, "#ffd24a"));
    return true;
  }

  G.combat = {
    update: function (state, dt) {
      if (!state.mines) state.mines = [];
      if (!state.warnings) state.warnings = [];
      if (state.run.tempDmg == null) state.run.tempDmg = 1;
      if (state.run.tempSpeed == null) state.run.tempSpeed = 1;
      if (state.run.activeFire == null) state.run.activeFire = 0;
      if (state.run.activeDmg == null) state.run.activeDmg = 0;
      if (state.defeat) {
        updateFx(state, dt);
        if (state.vfx) {
          for (var v = 0; v < state.vfx.length; v++) state.vfx[v].t -= dt;
          state.vfx = state.vfx.filter(function (fx) { return fx.t > 0; });
        }
        state.units = state.units.filter(function (u) {
          return u.hp > 0 || u.commander;
        });
        for (var dc = 0; dc < state.units.length; dc++) {
          var cu = state.units[dc];
          if (!cu.commander) continue;
          cu.hp = 0;
          cu.vx = 0;
          cu.vy = 0;
          cu.held = false;
          cu.fallT = (cu.fallT || 0) + dt;
        }
        state.shake *= Math.max(0, 1 - dt * 3.2);
        return;
      }
      updateSquad(state, dt);
      if (G.tactics && G.tactics.update) G.tactics.update(state, dt);
      playerShoot(state, dt);
      updateEnemies(state, dt);
      updateProjectiles(state, dt);
      updateMines(state, dt);
      updateWarnings(state, dt);
      updateDrops(state, dt);
      updateFx(state, dt);
      if (state.vfx) {
        for (var v = 0; v < state.vfx.length; v++) state.vfx[v].t -= dt;
        state.vfx = state.vfx.filter(function (fx) { return fx.t > 0; });
      }
      state.units = state.units.filter(function (u) {
        return u.hp > 0 || u.commander;
      });
      state.enemies = state.enemies.filter(function (e) { return e.hp > 0; });
      activesOf(state);
    },
    dist: dist,
    nearest: nearest,
    hurt: hurt,
    flameAt: flameAt,
    explode: explode,
    dmgMul: dmgMul,
    fireMul: fireMul,
    activesOf: activesOf,
    useActive: useActive,
    aimPoint: aimPoint,
    aimAngle: aimAngle,
    aimTarget: aimTarget,
    aimGhost: aimGhost,
    fireTarget: fireTarget,
    tryDash: tryDash,
    spawnDashBurst: spawnDashBurst,
    pickupRadius: pickupRadius,
    dashCd: function () { return DASH_CD; }
  };
})(window.TFAG = window.TFAG || {});
