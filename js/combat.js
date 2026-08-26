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

  function unitHittable(u) {
    return u && u.hp > 0 && !u.stowed && !u.stolen;
  }

  function nearest(list, x, y, ignoreId) {
    var best = null;
    var bestD = 1e9;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.id === ignoreId || !unitHittable(e)) continue;
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
      if (e.id === ignoreId || !unitHittable(e)) continue;
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
    if (state.debugFight && state.debugOpts) {
      var dmgScale = state.debugOpts.dmgMul | 0;
      if (dmgScale > 1) mul *= dmgScale;
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
    if ((e.drunkT || 0) > 0) {
      e.drunkPhase = (e.drunkPhase || Math.random() * 6) + dt * 9;
      var sway = Math.sin(e.drunkPhase) * 52 * dt;
      var pa = Math.atan2(dy, dx) + Math.PI / 2;
      e.x += Math.cos(pa) * sway;
      e.y += Math.sin(pa) * sway;
    }
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
      if (a.hp <= 0 || a.held || a.stowed) continue;
      for (var j = i + 1; j < list.length; j++) {
        var b = list[j];
        if (b.hp <= 0 || b.held || b.stowed) continue;
        if (a.type === "arklan_spike" || b.type === "arklan_spike") continue;
        if (a.wormAct === "dive" || b.wormAct === "dive") continue;
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        var min = a.def.size + b.def.size + 4;
        if (d >= min) continue;
        var nx = dx / d;
        var ny = dy / d;
        var overlap = min - d;
        if (a.commander && !b.commander) {
          b.x += nx * overlap;
          b.y += ny * overlap;
        } else if (b.commander && !a.commander) {
          a.x -= nx * overlap;
          a.y -= ny * overlap;
        } else {
          var push = overlap / 2;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
      if (clampEach && a.wormAct !== "dive" && a.vultoAct !== "strafe") G.clampPlay(a, state);
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
    if (unit.immortal) {
      unit.flash = 0.06;
      G.burst(state, unit.x, unit.y, "#ffe08a", 3, 28);
      return;
    }
    if (unit.team === "enemy" && (unit.irwinIFrame || 0) > 0) {
      unit.flash = 0.06;
      return;
    }
    if (state.timeLock && unit.team === "player") return;
    if (unit.team === "player" && state.debugFight && state.debugOpts && state.debugOpts.god) {
      unit.flash = 0.06;
      return;
    }
    if (unit.stowed) return;
    if (fromPlayer && unit.stolen) return;
    var trueDmg = opts && opts.trueDmg;
    if (unit.team === "player") {
      if (G.tactics && G.tactics.blockHurt && G.tactics.blockHurt(state, unit, opts)) return;
      if (state.run.smokeT > 0) return;
      if (!trueDmg) {
        amount *= 1 - (state.run.shield || 0) - ((state.aura && state.aura.shield) || 0) - (state.run.tempShield || 0) - ((state.tacticsAura && state.tacticsAura.shield) || 0);
        if ((state.run.coilHp || 0) > 0) {
          var soak = Math.min(amount, state.run.coilHp);
          state.run.coilHp -= soak;
          amount -= soak;
          G.burst(state, unit.x, unit.y, "#a8f6ff", 5, 40);
          if (amount <= 0.05) {
            unit.flash = 0.08;
            return;
          }
        }
        if (unit.commander) amount *= 0.9;
        if (unit.parasite > 0) amount *= 1.15;
        if ((unit.exposedT || 0) > 0) amount *= 1.35;
      }
    } else {
      unit.lastHitT = 0;
      if ((unit.reconMarkT || 0) > 0 && (unit.reconMark || 0) > 0) {
        amount *= 1 + Math.min(15, unit.reconMark) * 0.01;
      }
      if (unit.parked) amount *= 0.4;
      if (unit.type === "chefe_final" && unit.bossPhase === 1 && findEnemy(state, unit.guardianId)) {
        if (unit.contactCd <= 0) {
          unit.contactCd = 0.5;
          state.floaters.push(G.createFloater(unit.x, unit.y - 18, "protegido", "#e05cff"));
        }
        return;
      }
      if (fromPlayer && unit.type === "chefe_megatanque" && unit.kingId) {
        var kingShare = findEnemy(state, unit.kingId);
        if (kingShare && kingShare.hp > 0) {
          var split = amount * 0.2;
          amount *= 0.8;
          kingShare.hp -= split;
          kingShare.flash = 0.1;
          if (kingShare.hp <= 0) {
            kingShare.hp = 0;
            killEnemy(state, kingShare);
          }
        }
      }
    }
    unit.hp -= amount;
    if (unit.team === "enemy" && amount > 0) unit.revealT = 1.8;
    if (!(trueDmg && amount < 2)) {
      unit.flash = 0.12;
      if (unit.team === "player") state.shake = Math.max(state.shake, 6);
      G.burst(state, unit.x, unit.y, unit.team === "player" ? "#7ec8ff" : "#ff6b6b", 6, 70);
      state.floaters.push(G.createFloater(unit.x, unit.y - 12, String(Math.round(amount)), unit.team === "player" ? "#ffd0d0" : "#fff"));
    }
    if (fromPlayer && unit.team === "enemy") {
      if (state.run.freeze) unit.slowT = Math.max(unit.slowT, 0.9);
      var doKnock = state.run.knockback;
      if (doKnock && srcX != null && unit.type !== "arklan_spike") {
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
    if (unit.hp > 0 && unit.team === "enemy" && G.invasion && G.invasion.enterP2) {
      G.invasion.enterP2(state, unit);
    }
    if (unit.hp <= 0) {
      if (unit.team === "enemy" && advanceCorePhase(state, unit)) return;
      unit.hp = 0;
      if (unit.team === "enemy") killEnemy(state, unit);
    }
  }

  function explode(state, x, y, radius, dmg, team, extraColor) {
    var col = extraColor || (team === "player" ? "#ffd24a" : "#ff5a32");
    G.burst(state, x, y, col, 28, 210);
    G.burst(state, x, y, "#fff4d0", 12, 110);
    if (G.boomFx) G.boomFx(state, x, y, radius, col);
    state.shake = Math.max(state.shake || 0, Math.min(16, 5 + radius * 0.07));
    if (dmg <= 0) return;
    var list = team === "player" ? state.enemies : state.units;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t.hp <= 0 || t.stowed || t.stolen) continue;
      if (team === "enemy" && G.tactics && G.tactics.shieldProtects && G.tactics.shieldProtects(state, x, y, t.x, t.y)) continue;
      var dx = t.x - x;
      var dy = t.y - y;
      if (dx * dx + dy * dy <= radius * radius) hurt(state, t, dmg, x, y, team === "player");
    }
    if (team !== "player" && G.tactics && G.tactics.phalanxSmash) {
      var lethal = false;
      for (var bi = 0; bi < state.enemies.length; bi++) {
        var be = state.enemies[bi];
        if (be.hp <= 0 || !be.def || !be.def.boss) continue;
        var bdx = be.x - x;
        var bdy = be.y - y;
        if (bdx * bdx + bdy * bdy <= (radius + 110) * (radius + 110)) {
          lethal = true;
          break;
        }
      }
      G.tactics.phalanxSmash(state, x, y, radius, lethal);
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
      veilBlink(state, veu, null, false);
    } else if (unit.bossPhase === 3) {
      state.banner = { text: "O campo se abre", t: 2.4 };
      state.camZoomTo = 0.68;
      unit.skillT = 6.5;
      unit.coreHealT = 8;
      unit.coreRayT = 2;
      unit.coreSummonT = 70;
      unit.coreAct = "wait";
      unit.coreActT = 1.2;
      unit.coreLastAct = "";
      unit.coreActDid = false;
      unit.burstLeft = 0;
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
    if (G.tactics && G.tactics.onEnemyKilled) G.tactics.onEnemyKilled(state, e);
    var skipLoot = e.noDrop || e.fake || e.type === "larva" || (e.def && (e.def.codexHide || e.def.fake));
    if (!skipLoot) {
      state.run.kills = (state.run.kills || 0) + 1;
      var obs = (e.obsMarkT || 0) > 0;
      var coins = e.def.boss ? 6 + ((Math.random() * 4) | 0) : Math.random() < (obs ? 0.72 : 0.35) ? 2 : 1;
      coins = Math.max(1, Math.round(coins * goldMul(state) * (obs ? 1.6 : 1)));
      state.drops.push(G.createDrop(e.x, e.y, "coin", { value: coins }));
      if (obs && Math.random() < 0.55) {
        state.drops.push(G.createDrop(e.x - 10, e.y + 6, "coin", { value: Math.max(1, Math.round(2 * goldMul(state))) }));
      }
      var extra = Math.random() < (G.save.data.perm.luck | 0) * 0.08 + (state.run.luck || 0) ? 1 : 0;
      var dropKind = extra ? "fuzileiro" : "recruta";
      var nodeChance = (state.run.dropChance + ((state.aura && state.aura.drop) || 0)) * (obs ? 2.4 : 1);
      if (Math.random() < Math.min(0.85, nodeChance)) {
        state.drops.push(G.createDrop(e.x + 10, e.y, "unit", { unitKind: dropKind }));
      }
    }
    if (G.codex && !e.fake && G.codex.unlockEnemy(e.type)) {
      state.floaters.push(G.createFloater(e.x, e.y - 28, "Compêndio: " + e.def.name, "#ffb0b0"));
    }
    if (e.splits) {
      G.game.spawnAt(state, "larva", e.x - 10, e.y, { noDrop: true });
      G.game.spawnAt(state, "larva", e.x + 10, e.y, { noDrop: true });
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
    if (e.type === "chefe_megatanque" || e.type === "chefe_beeking") {
      if (G.invasion) G.invasion.maybePrincess(state);
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
      if (e.invP2) {
        var minibosses = ["formiga_leao", "besouro_bombardeiro", "louva_deus"];
        var mini = minibosses[(Math.random() * minibosses.length) | 0];
        G.game.spawnAt(state, mini, e.x, e.y);
        state.banner = { text: G.ENEMY_DEFS[mini].name, t: 2.2 };
      }
    }
    if (e.type === "chefe_megatanque") {
      var kingLeft = findEnemy(state, e.kingId);
      if (kingLeft && kingLeft.hp > 0) {
        kingLeft.enrage = true;
        kingLeft.kingMode = "knight";
        kingLeft.kingAct = "";
        kingLeft.kingT = 0.4;
        state.banner = { text: "O rei não recua", t: 2.1 };
        state.floaters.push(G.createFloater(kingLeft.x, kingLeft.y - 28, "cavaleiro", "#ffe08a"));
      }
      if (G.invasion) G.invasion.maybePrincess(state);
    }
    if (e.type === "chefe_beeking") {
      var queen = findEnemy(state, e.queenId);
      if (queen && queen.hp > 0) {
        queen.enrage = true;
        queen.miniT = Math.min(queen.miniT || 30, 8);
        queen.colorShift = 1;
        state.banner = { text: "A rainha enlouquece", t: 2.1 };
        state.floaters.push(G.createFloater(queen.x, queen.y - 28, "enrage", "#ff4a3a"));
      }
      if (G.invasion) G.invasion.maybePrincess(state);
    }
    if (e.type === "chefe_arklan") {
      var keepZ = false;
      for (var az = 0; az < state.enemies.length; az++) {
        var ae = state.enemies[az];
        if (ae.hp > 0 && ae.type === "chefe_final" && (ae.bossPhase || 1) >= 3) keepZ = true;
        if (ae.type === "arklan_spike") {
          ae.hp = 0;
          ae.noDrop = true;
        }
      }
      if (!keepZ) state.camZoomTo = 1;
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

  function flameAt(state, u, target, opt) {
    opt = opt || {};
    var ang = Math.atan2(target.y - u.y, target.x - u.x);
    var cone = 0.38;
    var range = u.def.range * (1 + (state.run.flame || 0) * 0.12);
    var dmg = Math.round(u.def.dmg * dmgMul(state));
    var burnMul = opt.burnMul || 1;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0) continue;
      var dx = e.x - u.x;
      var dy = e.y - u.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (Math.max(0, d - bodyR(e)) > range || d < 1) continue;
      var a = Math.atan2(dy, dx);
      var diff = Math.abs(Math.atan2(Math.sin(a - ang), Math.cos(a - ang)));
      if (diff < cone) {
        hurt(state, e, dmg, u.x, u.y, true);
        if (u.kind === "lanca_chamas" || u.kind === "inferno") {
          e.burnT = 5;
          e.burnDps = Math.max(e.burnDps || 0, u.def.dmg * 0.85 * dmgMul(state) * burnMul);
        }
      }
    }
    var napalm = !!opt.napalm;
    var pal = napalm
      ? ["#ffffff", "#fff4c8", "#ffd27a", "#ff4a18", "#7ad8ff"]
      : ["#ff9a2a", "#ffe060"];
    var speed = napalm ? 760 : 640;
    var life = range / speed;
    var count = napalm ? 42 : 18;
    for (var n = 0; n < count; n++) {
      var spread = ang + (Math.random() - 0.5) * cone * 2;
      var sp = speed * (0.72 + Math.random() * 0.38);
      state.particles.push({
        x: u.x + Math.cos(ang) * 12,
        y: u.y + Math.sin(ang) * 12,
        vx: Math.cos(spread) * sp,
        vy: Math.sin(spread) * sp,
        life: life * (0.65 + Math.random() * 0.4),
        max: life,
        size: napalm ? 8 + Math.random() * 10 : 5 + Math.random() * 7,
        color: pal[(Math.random() * pal.length) | 0],
        flame: true,
        napalm: napalm
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
    if ((e.silenceT || 0) > 0) return;
    var speed = extra.speed || (e.def.boss ? 280 : 250);
    var dmg = extra.dmg != null ? extra.dmg : e.def.dmg;
    if (extra.fake) dmg = 0;
    if (e.dmgMul) dmg = Math.round(dmg * e.dmgMul);
    var shotCol = extra.color || "";
    if (!shotCol && e.def && e.def.kind === "boss_veil") {
      shotCol = "#9ad8ff";
    }
    var proj = G.createProjectile({
        x: e.x + (extra.ox || 0) + Math.cos(ang) * (extra.muzzle || 0),
        y: e.y + (extra.oy || 0) + Math.sin(ang) * (extra.muzzle || 0),
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        dmg: dmg,
        team: extra.team || (e.stolen ? "player" : "enemy"),
        kind: kind || "bullet",
        life: extra.life || 1.4,
        r: extra.r || (e.def.boss ? 5 : 3),
        poison: !!extra.poison,
        fake: !!extra.fake,
        color: shotCol,
        hitsLeft: extra.hitsLeft || 1,
        fromBoss: !!(e.def && e.def.boss),
        fromId: e.id,
        homing: !!extra.homing
      });
    if (extra.slashLen) proj.slashLen = extra.slashLen;
    if (extra.exposed) proj.exposed = true;
    state.projectiles.push(proj);
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
    var n = e.invP2 ? 6 : 4;
    for (var k = 0; k < n; k++) {
      G.game.spawnAt(state, "orb_escudo", e.x, e.y, {
        orbitHost: e.id,
        orbitIndex: k,
        noDrop: true
      });
    }
    G.burst(state, e.x, e.y, "#ffd24a", 14, 80);
    return true;
  }

  function readyOrbitShields(state, hostId) {
    var list = [];
    for (var i = 0; i < state.enemies.length; i++) {
      var s = state.enemies[i];
      if (s.hp <= 0 || s.orbitHost !== hostId) continue;
      if ((s.flingT || 0) > 0 || s.flingBack) continue;
      list.push(s);
    }
    return list;
  }

  function startCascaSpin(e) {
    e.spinMode = 1;
    e.spinAcc = 0;
    e.spinShotT = 0;
    e.cascaLast = "spin";
  }

  function pickCascaSkill(state, e, target) {
    var last = e.cascaLast || "";
    var opts = [];
    if (readyOrbitShields(state, e.id).length > 0) opts.push("throw");
    if (e.hp < e.maxHp * 0.5 || (G.invasion && G.invasion.rage(e))) opts.push("charge");
    if (!opts.length) {
      e.skillT = 2.8;
      return;
    }
    var pool = [];
    for (var i = 0; i < opts.length; i++) if (opts[i] !== last) pool.push(opts[i]);
    if (!pool.length) pool = opts;
    var pick = pool[(Math.random() * pool.length) | 0];
    e.cascaLast = pick;
    if (pick === "throw") {
      e.throwWindup = 0.75;
      e.throwWindupMax = 0.75;
      state.warnings.push({
        kind: "mark",
        x: target.x,
        y: target.y,
        t: 0.75,
        max: 0.75,
        r: 52,
        dmg: 0
      });
      state.floaters.push(G.createFloater(e.x, e.y - 28, "escudos", "#ffe08a"));
    } else {
      e.chargeAim = Math.atan2(target.y - e.y, target.x - e.x);
      e.chargeWindup = 0.8;
      e.chargeWindupMax = 0.8;
      state.floaters.push(G.createFloater(e.x, e.y - 28, "investida", "#ff6a3a"));
    }
  }

  function flingCascaShields(state, e, target) {
    var shields = readyOrbitShields(state, e.id);
    if (!shields.length || !target) return;
    var base = Math.atan2(target.y - e.y, target.x - e.x);
    for (var i = 0; i < shields.length; i++) {
      var s = shields[i];
      var spread = (i - (shields.length - 1) / 2) * 0.22;
      var ang = base + spread;
      var sp = 340 + i * 18;
      s.flingT = 0.95;
      s.flingVx = Math.cos(ang) * sp;
      s.flingVy = Math.sin(ang) * sp;
      s.flingBack = false;
      s.flingHit = false;
    }
  }

  function veilBehindPoint(state, e, extraAng, extraGap) {
    var sx = state.squad.x;
    var sy = state.squad.y;
    var vx = state.squad.vx || 0;
    var vy = state.squad.vy || 0;
    var spin = Math.hypot(vx, vy);
    var ang;
    if (spin > 32) {
      ang = Math.atan2(-vy, -vx);
    } else if (state.moveDir && Math.hypot(state.moveDir.x || 0, state.moveDir.y || 0) > 0.12) {
      ang = Math.atan2(-(state.moveDir.y || 0), -(state.moveDir.x || 0));
    } else {
      var rot = 0;
      for (var i = 0; i < state.units.length; i++) {
        if (state.units[i].commander) rot = state.units[i].rot || 0;
      }
      ang = rot + Math.PI;
    }
    ang += extraAng || 0;
    var sold = 0;
    for (var u = 0; u < state.units.length; u++) {
      if (state.units[u].hp > 0 && !state.units[u].commander && !state.units[u].stowed) sold++;
    }
    var gap = 62 + ((e.def && e.def.size) || 30) + Math.max(0, sold - 3) * 6;
    gap += Math.min(42, spin * 0.09) + (extraGap || 0);
    var b = G.playfield(state);
    var m = (e.def && e.def.size) || 30;
    var tries = [0, 0.42, -0.42, 0.85, -0.85, 1.3, -1.3, Math.PI];
    for (var t = 0; t < tries.length; t++) {
      var a = ang + tries[t];
      var x = sx + Math.cos(a) * gap - vx * 0.18;
      var y = sy + Math.sin(a) * gap - vy * 0.18;
      var cx = Math.max(b.x0 + m, Math.min(b.x1 - m, x));
      var cy = Math.max(b.y0 + m, Math.min(b.y1 - m, y));
      if (Math.hypot(cx - sx, cy - sy) >= gap * 0.7) return { x: cx, y: cy };
    }
    return {
      x: Math.max(b.x0 + m, Math.min(b.x1 - m, sx + Math.cos(ang) * gap)),
      y: Math.max(b.y0 + m, Math.min(b.y1 - m, sy + Math.sin(ang) * gap))
    };
  }

  function veilBlink(state, e, target, withBoom) {
    var slotOff = e.fake ? ((e.cloneSlot | 0) * 0.72 - 0.36) : 0;
    var helperGap = e.helperOf ? 118 : 0;
    var p = veilBehindPoint(state, e, slotOff, helperGap);
    e.x = p.x;
    e.y = p.y;
    G.clampPlay(e, state);
    if (withBoom) {
      var fake = !!(e.fake || e.decoy);
      explode(state, e.x, e.y, fake ? 96 : 124, fake ? 22 : 42, "enemy", "#9ad8ff");
      G.audio.explosion();
    } else {
      G.burst(state, e.x, e.y, "#c8a0ff", 16, 90);
    }
    var core = findEnemy(state, e.helperOf);
    if (core && core.bossPhase === 2) {
      var p2 = veilBehindPoint(state, core, slotOff, 132);
      core.x = p2.x;
      core.y = p2.y;
      core.stealth = 0.7;
      G.clampPlay(core, state);
    }
  }

  function spawnVeilClone(state, veu, slot) {
    var p = veilBehindPoint(state, veu, (slot || 0) * 0.7 + 0.5);
    var c = G.game.spawnAt(state, "veu_clone", p.x, p.y, {
      ownerId: veu.id,
      cloneSlot: slot,
      fake: true,
      decoy: true,
      noDrop: true,
      nextBoom: 3 + ((Math.random() * 4) | 0)
    });
    G.burst(state, c.x, c.y, "#9ad8ff", 14, 80);
    state.floaters.push(G.createFloater(c.x, c.y - 18, "clone", "#9ad8ff"));
    return c;
  }

  function applyNestBuff(e) {
    e.def = Object.assign({}, e.def);
    var roll = (Math.random() * 3) | 0;
    e.nestBuff = roll === 0 ? "speed" : roll === 1 ? "dmg" : "fire";
    if (roll === 0) e.def.speed = Math.round(e.def.speed * 1.55);
    else if (roll === 1) e.def.dmg = Math.round(e.def.dmg * 1.45);
    else e.def.fire *= 1.55;
    return e;
  }

  function fuseNestUnits(state, host) {
    var pool = [];
    for (var i = 0; i < state.enemies.length; i++) {
      var n = state.enemies[i];
      if (n.hp <= 0 || n.id === host.id) continue;
      if (n.def.boss || n.fused || n.type.indexOf("chefe") === 0) continue;
      pool.push(n);
    }
    if (pool.length < 2) return;
    var a = pool[(Math.random() * pool.length) | 0];
    var b = a;
    var guard = 0;
    while (b.id === a.id && guard++ < 8) b = pool[(Math.random() * pool.length) | 0];
    if (b.id === a.id) return;
    var mx = (a.x + b.x) / 2;
    var my = (a.y + b.y) / 2;
    var fused = G.game.spawnAt(state, a.type, mx, my, { noDrop: true, fused: true, fuseKind: b.def.kind });
    fused.def = Object.assign({}, fused.def);
    fused.maxHp = Math.round(a.maxHp + b.maxHp * 0.55);
    fused.hp = fused.maxHp;
    fused.def.hp = fused.maxHp;
    fused.def.dmg = Math.round((a.def.dmg + b.def.dmg) * 0.72);
    fused.def.speed = Math.round(Math.max(a.def.speed, b.def.speed) * 1.12);
    fused.def.fire = Math.max(a.def.fire, b.def.fire) * 1.2;
    fused.def.size = Math.min(28, Math.max(a.def.size, b.def.size) + 5);
    fused.fuseShot = (b.def.kind === "cryo") ? "ice" : (b.def.kind === "artillery" ? "bullet" : "bullet");
    fused.fuseCd = 0.4;
    a.hp = 0;
    a.noDrop = true;
    b.hp = 0;
    b.noDrop = true;
    G.burst(state, mx, my, "#c45cff", 22, 140);
    state.floaters.push(G.createFloater(mx, my - 20, "fusão", "#c45cff"));
  }

  function beginCoreAct(e, act, dur) {
    e.coreAct = act;
    e.coreActT = dur;
    e.coreActDid = false;
    if (act === "burst") {
      e.burstLeft = 5;
      e.burstCd = 0.06;
    }
  }

  function pickCoreAct(state, e, d) {
    if (d < 96) {
      e.coreLastAct = "tp";
      beginCoreAct(e, "tp", 0.7);
      return;
    }
    if ((e.coreSummonT || 0) <= 0 && state.enemies.length < 36) {
      e.coreLastAct = "summon";
      beginCoreAct(e, "summon", 0.95);
      return;
    }
    var pool = ["ray", "burst", "boom", "tp"];
    var last = e.coreLastAct;
    var opts = [];
    for (var i = 0; i < pool.length; i++) {
      if (pool[i] !== last) opts.push(pool[i]);
    }
    var next = opts[(Math.random() * opts.length) | 0] || "burst";
    e.coreLastAct = next;
    if (next === "ray") beginCoreAct(e, "ray", 0.95);
    else if (next === "burst") beginCoreAct(e, "burst", 1.2);
    else if (next === "boom") beginCoreAct(e, "boom", 1.4);
    else beginCoreAct(e, "tp", 0.7);
  }

  function coreSummonLegion(state, e) {
    e.coreSummonT = 60 + Math.random() * 60;
    var bossPick = G.BOSS_POOL[(Math.random() * G.BOSS_POOL.length) | 0];
    G.game.spawnAt(state, bossPick, e.x + 50, e.y, { noLink: true });
    for (var tr = 0; tr < 3; tr++) {
      var trash = G.ENEMY_POOL[(Math.random() * G.ENEMY_POOL.length) | 0];
      G.game.spawnAt(state, trash, e.x + (Math.random() - 0.5) * 80, e.y + (Math.random() - 0.5) * 80);
    }
    state.floaters.push(G.createFloater(e.x, e.y - 28, "legião", "#fff36a"));
  }

  function pushZone(state, z) {
    if (!state.zones) state.zones = [];
    if (z.max == null && z.t != null) z.max = z.t;
    state.zones.push(z);
  }

  function warnAt(state, opt) {
    if (!state.warnings) state.warnings = [];
    opt.max = opt.max != null ? opt.max : opt.t;
    state.warnings.push(opt);
  }

  function commanderOf(state) {
    for (var i = 0; i < state.units.length; i++) {
      if (state.units[i].commander && state.units[i].hp > 0) return state.units[i];
    }
    return null;
  }

  function hurtSquadArea(state, x, y, r, dmg, srcX, srcY) {
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || u.stowed) continue;
      if (G.tactics && G.tactics.shieldProtects && G.tactics.shieldProtects(state, x, y, u.x, u.y)) continue;
      var dx = u.x - x;
      var dy = u.y - y;
      if (dx * dx + dy * dy <= r * r) hurt(state, u, dmg, srcX != null ? srcX : x, srcY != null ? srcY : y);
    }
  }

  function hurtLane(state, x, y, ang, len, halfW, dmg) {
    var c = Math.cos(ang);
    var s = Math.sin(ang);
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || u.stowed) continue;
      var rx = u.x - x;
      var ry = u.y - y;
      var along = rx * c + ry * s;
      var side = -rx * s + ry * c;
      if (along > -8 && along < len && Math.abs(side) < halfW + (u.def.size || 10)) {
        hurt(state, u, dmg, x, y);
      }
    }
  }

  function inCone(px, py, ox, oy, ang, range, half) {
    var dx = px - ox;
    var dy = py - oy;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d > range || d < 1) return false;
    var a = Math.atan2(dy, dx);
    var diff = Math.abs(Math.atan2(Math.sin(a - ang), Math.cos(a - ang)));
    return diff < half;
  }

  function hurtCone(state, x, y, ang, range, half, dmg) {
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || u.stowed) continue;
      if (inCone(u.x, u.y, x, y, ang, range, half)) hurt(state, u, dmg, x, y);
    }
  }

  function inBeam(px, py, ox, oy, ang, range, halfW) {
    var dx = px - ox;
    var dy = py - oy;
    var fx = Math.cos(ang);
    var fy = Math.sin(ang);
    var along = dx * fx + dy * fy;
    if (along < -4 || along > range) return false;
    var pxp = dx - fx * along;
    var pyp = dy - fy * along;
    return pxp * pxp + pyp * pyp <= halfW * halfW;
  }

  function hurtBeam(state, x, y, ang, range, halfW, dmg) {
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || u.stowed) continue;
      var hitR = halfW + ((u.def && u.def.size) || 10) * 0.55;
      if (inBeam(u.x, u.y, x, y, ang, range, hitR)) hurt(state, u, dmg, x, y);
    }
  }

  function vultoBeamLen(state) {
    var b = G.playfield(state);
    return Math.hypot(b.x1 - b.x0, b.y1 - b.y0) * 1.08;
  }

  function dropNapalm(state, x0, y0, x1, y1, r, dps) {
    var dx = x1 - x0;
    var dy = y1 - y0;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var n = Math.max(3, Math.round(len / 36));
    for (var i = 0; i <= n; i++) {
      var k = i / n;
      pushZone(state, {
        kind: "napalm",
        x: x0 + dx * k,
        y: y0 + dy * k,
        r: r || 28,
        t: 5,
        max: 5,
        dmg: dps || 16,
        hurtPlayer: true
      });
    }
  }

  function squadPinned(state) {
    for (var i = 0; i < state.enemies.length; i++) {
      var s = state.enemies[i];
      if (s.hp <= 0 || s.type !== "arklan_spike") continue;
      var d = Math.hypot(s.x - state.squad.x, s.y - state.squad.y);
      if (d < (s.def.size || 14) + 20) return true;
    }
    return false;
  }

  function pickPlay(state, pad) {
    var b = G.playfield(state);
    pad = pad || 48;
    return {
      x: b.x0 + pad + Math.random() * Math.max(20, b.x1 - b.x0 - pad * 2),
      y: b.y0 + pad + Math.random() * Math.max(20, b.y1 - b.y0 - pad * 2)
    };
  }

  function startCascaSeq(e) {
    e.seqMode = 1;
    e.seqAcc = 0;
    e.seqShotT = 0;
  }

  function invasaoHost(state, e) {
    if (e && e.ownerId) {
      var h = findEnemy(state, e.ownerId);
      if (h && h.hp > 0 && h.type === "chefe_invasao") return h;
    }
    for (var i = 0; i < state.enemies.length; i++) {
      var b = state.enemies[i];
      if (b.hp > 0 && b.type === "chefe_invasao") return b;
    }
    return null;
  }

  function isInvasaoMinion(state, e) {
    if (!e || e.def.boss || e.type === "chefe_invasao") return false;
    if (e.type === "heal_station" || e.type === "dobrador_luz") return false;
    if (e.rushMinion || e.ownerId) return true;
    if (e.type === "fuzileiro_alien" || e.type === "batedor_alien" || e.type === "pistoleiro_alien") return true;
    if (e.type === "fuzileiro_elite" || e.type === "batedor_elite" || e.type === "pistoleiro_elite") return true;
    if (e.type === "fuzileiro_veterano" || e.type === "infiltrador_alien" || e.type === "medico_alien") return true;
    return !!invasaoHost(state, e);
  }

  function wantHealRetreat(e) {
    if (e.hp <= e.maxHp * 0.35) {
      e.retreatHeal = true;
      return true;
    }
    if (e.retreatHeal && e.hp < e.maxHp * 0.82) return true;
    if (e.retreatHeal) e.justHealed = 2.4;
    e.retreatHeal = false;
    return false;
  }

  function countInvasaoMinions(state) {
    var n = 0;
    for (var i = 0; i < state.enemies.length; i++) {
      var m = state.enemies[i];
      if (m.hp > 0 && isInvasaoMinion(state, m)) n++;
    }
    return n;
  }

  function trySpawnInvasao(state, e, type, x, y, force) {
    var cap = (e && (e.invP2 || e.inv)) ? 10 : 5;
    if (!force && countInvasaoMinions(state) >= cap) return null;
    return G.game.spawnAt(state, type, x, y, { noDrop: true, rushMinion: true, ownerId: e.id });
  }

  function retreatBehindBoss(state, e, boss, dt, spd) {
    var sx = state.squad.x;
    var sy = state.squad.y;
    var away = Math.atan2(boss.y - sy, boss.x - sx);
    var spread = ((e.id % 5) - 2) * 0.38;
    var back = 62 + (e.def.size || 12);
    var tx = boss.x + Math.cos(away + spread) * back;
    var ty = boss.y + Math.sin(away + spread) * back;
    var pf = G.playfield(state);
    var m = (e.def && e.def.size) || 12;
    tx = Math.max(pf.x0 + m + 8, Math.min(pf.x1 - m - 8, tx));
    ty = Math.max(pf.y0 + m + 8, Math.min(pf.y1 - m - 8, ty));
    moveTowards(e, tx, ty, spd * 1.35, dt);
    face(e, sx, sy, dt);
  }

  function countIrwinScouts(state) {
    var n = 0;
    for (var i = 0; i < state.enemies.length; i++) {
      var m = state.enemies[i];
      if (m.hp <= 0) continue;
      if (m.type === "batedor_elite" || m.type === "infiltrador_alien" || m.type === "batedor_alien") n++;
    }
    return n;
  }

  function countTypeAlive(state, type) {
    var n = 0;
    for (var i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].hp > 0 && state.enemies[i].type === type) n++;
    }
    return n;
  }

  function irwinThreat(state, e) {
    var best = null;
    var bestScore = 0;
    function consider(x, y, r, pad, napalm) {
      var d = Math.hypot(e.x - x, e.y - y);
      var reach = r + (pad == null ? 56 : pad);
      if (d > reach) return;
      var score = reach - d;
      if (score > bestScore) {
        bestScore = score;
        best = { x: x, y: y, napalm: !!napalm };
      }
    }
    var zones = state.zones || [];
    for (var z = 0; z < zones.length; z++) {
      var zn = zones[z];
      if (zn.kind === "napalm" || zn.kind === "fire") consider(zn.x, zn.y, zn.r || 36, 118, true);
      else if (zn.kind === "acid") consider(zn.x, zn.y, zn.r || 36, 56, false);
    }
    var warns = state.warnings || [];
    for (var w = 0; w < warns.length; w++) {
      var wn = warns[w];
      if (wn.kind === "acid" || wn.kind === "airstrike") consider(wn.x, wn.y, wn.r || 40, 56, false);
    }
    if (state.bombPending) {
      var bp = state.bombPending;
      var mx = (bp.x0 + bp.x1) / 2;
      var my = (bp.y0 + bp.y1) / 2;
      consider(mx, my, 90, 70, false);
    }
    return best;
  }

  function irwinNapalmAt(state, x, y, pad) {
    pad = pad == null ? 18 : pad;
    var zones = state.zones || [];
    for (var z = 0; z < zones.length; z++) {
      var zn = zones[z];
      if (zn.kind !== "napalm" && zn.kind !== "fire") continue;
      if (Math.hypot(x - zn.x, y - zn.y) < (zn.r || 36) + pad) return true;
    }
    return false;
  }

  function pickIrwinEscape(state, e, threat) {
    var b = G.playfield(state);
    var dur = 0.34;
    var spd = 700;
    var bestAng = threat ? Math.atan2(e.y - threat.y, e.x - threat.x) : 0;
    var bestScore = -1e9;
    for (var i = 0; i < 14; i++) {
      var ang = (Math.PI * 2 * i) / 14;
      var nx = e.x + Math.cos(ang) * spd * dur;
      var ny = e.y + Math.sin(ang) * spd * dur;
      if (nx < b.x0 + 36 || nx > b.x1 - 36 || ny < b.y0 + 36 || ny > b.y1 - 36) continue;
      var nearest = 240;
      var zones = state.zones || [];
      for (var z = 0; z < zones.length; z++) {
        var zn = zones[z];
        if (zn.kind !== "napalm" && zn.kind !== "fire") continue;
        var d = Math.hypot(nx - zn.x, ny - zn.y) - (zn.r || 36);
        if (d < nearest) nearest = d;
      }
      var away = threat ? Math.hypot(nx - threat.x, ny - threat.y) : 80;
      var score = nearest * 1.6 + away;
      if (score > bestScore) {
        bestScore = score;
        bestAng = ang;
      }
    }
    return bestAng;
  }

  function startIrwinDash(state, e, ang, dur, spd, len) {
    e.dashWind = 0.32;
    e.dashWindAng = ang;
    e.dashWindDur = dur;
    e.dashWindSpd = spd;
    e.irwinDashKind = "dash";
    warnAt(state, { kind: "lane", x: e.x, y: e.y, ang: ang, len: len || 170, w: 16, t: 0.32, max: 0.32, r: 16, dmg: 0, color: "#8ad422" });
    G.burst(state, e.x, e.y, "#8ad422", 8, 70);
  }

  function startIrwinDisparada(state, e, threat, longDash) {
    var ang;
    if (threat) ang = Math.atan2(e.y - threat.y, e.x - threat.x);
    else {
      var b = G.playfield(state);
      var cx = (b.x0 + b.x1) / 2;
      var cy = (b.y0 + b.y1) / 2;
      ang = Math.atan2(cy - e.y, cx - e.x);
    }
    e.dashWind = 0.26;
    e.dashWindAng = ang;
    e.dashWindDur = longDash ? 0.5 : 0.3;
    e.dashWindSpd = longDash ? 760 : 680;
    e.irwinDashKind = "disparada";
    e.irwinIFrame = (longDash ? 0.5 : 0.3) + 0.26;
    warnAt(state, { kind: "lane", x: e.x, y: e.y, ang: ang, len: longDash ? 260 : 190, w: 18, t: 0.26, max: 0.26, r: 18, dmg: 0, color: "#ffe08a" });
    G.burst(state, e.x, e.y, "#ffe08a", 14, 110);
    state.floaters.push(G.createFloater(e.x, e.y - 26, "disparada", "#ffe08a"));
  }

  function applyIrwinMorale(state, e, dt) {
    e.moraleT = (e.moraleT == null ? 0 : e.moraleT) - dt;
    e.moralePulse = Math.max(0, (e.moralePulse || 0) - dt);
    if (e.moraleT <= 0) {
      e.moraleT = 4.6;
      e.moralePulse = 0.7;
      state.floaters.push(G.createFloater(e.x, e.y - 28, "moral", "#e8c86a"));
    }
    var auraR = (e.p2 && e.inv) ? 210 : 118;
    for (var i = 0; i < state.enemies.length; i++) {
      var ally = state.enemies[i];
      if (ally.hp <= 0 || ally.id === e.id) continue;
      if (dist(e, ally) < auraR) {
        ally.moraleSpd = 1.22;
        ally.moraleT = 0.4;
        if (G.invasion) G.invasion.heal(ally, ally.maxHp * 0.01 * dt);
        else ally.hp = Math.min(ally.maxHp, ally.hp + ally.maxHp * 0.01 * dt);
      }
    }
  }

  function fireIrwinAirstrike(state, e) {
    var cmd = commanderOf(state) || state.squad;
    var tx = cmd.x;
    var ty = cmd.y;
    var ang = Math.atan2(ty - e.y, tx - e.x);
    if (!isFinite(ang) || Math.hypot(tx - e.x, ty - e.y) < 8) ang = e.rot || 0;
    var z = state.camZoom || 1;
    var lx = state.camLook && state.camLook.x != null ? state.camLook.x : state.W / 2;
    var ly = state.camLook && state.camLook.y != null ? state.camLook.y : state.H / 2;
    var screen = {
      x0: lx - state.W / (2 * z),
      y0: ly - state.H / (2 * z),
      x1: lx + state.W / (2 * z),
      y1: ly + state.H / (2 * z)
    };
    var fx = Math.cos(ang);
    var fy = Math.sin(ang);
    var start = rayExitPlay(screen, tx, ty, -fx, -fy, 2);
    var end = rayExitPlay(screen, tx, ty, fx, fy, 2);
    var x0 = start.x;
    var y0 = start.y;
    var x1 = end.x;
    var y1 = end.y;
    var dx = x1 - x0;
    var dy = y1 - y0;
    var len = Math.hypot(dx, dy) || 1;
    var n = Math.max(14, Math.round(len / 34));
    for (var i = 0; i < n; i++) {
      var k = n <= 1 ? 0.5 : i / (n - 1);
      warnAt(state, {
        kind: "airstrike",
        x: x0 + dx * k,
        y: y0 + dy * k,
        t: 0.42 + i * 0.028,
        max: 0.9,
        r: 48,
        dmg: Math.round(e.def.dmg * 1.8),
        color: "#ffb45a"
      });
    }
    warnAt(state, { kind: "lane", x: x0, y: y0, ang: ang, len: len, w: 30, t: 0.85, max: 0.85, r: 30, dmg: 0, color: "#ffb45a" });
    state.banner = { text: "Bombardeio", t: 1.6 };
    state.floaters.push(G.createFloater(e.x, e.y - 28, "airstrike", "#ffb45a"));
  }

  function spawnHeldTimeShot(state, e, target, ox, oy, angOff) {
    var sx = e.x + (ox || 0);
    var sy = e.y + (oy || 0);
    var base = Math.atan2(target.y - sy, target.x - sx);
    var ang = base + (angOff || 0);
    var aimDist = Math.max(80, Math.hypot(target.x - sx, target.y - sy));
    var p = G.createProjectile({
      x: sx + Math.cos(ang) * 16,
      y: sy + Math.sin(ang) * 16,
      vx: 0,
      vy: 0,
      dmg: Math.round(e.def.dmg * 1.15),
      team: "enemy",
      kind: "timeshot",
      life: 3.2,
      r: 4.2,
      color: "#d8f4ff",
      fromBoss: true,
      fromId: e.id
    });
    p.held = true;
    p.holdAng = ang;
    p.holdSp = 1020;
    p.holdX = sx + Math.cos(ang) * aimDist;
    p.holdY = sy + Math.sin(ang) * aimDist;
    state.projectiles.push(p);
    G.burst(state, p.x, p.y, "#c8e8ff", 3, 36);
  }

  function releaseHeldShots(state) {
    for (var i = 0; i < state.projectiles.length; i++) {
      var p = state.projectiles[i];
      if (!p.held) continue;
      var ang = p.holdAng || 0;
      var sp = p.holdSp || 900;
      p.vx = Math.cos(ang) * sp;
      p.vy = Math.sin(ang) * sp;
      p.held = false;
      p.life = Math.max(p.life, 0.7);
    }
    state.shake = Math.max(state.shake || 0, 10);
    G.audio.explosion();
  }

  function beginTimeLock(state, e) {
    var cmd = commanderOf(state) || state.squad;
    state.timeLock = {
      t: 0,
      bossId: e.id,
      phase: "aim",
      aimDur: 2.45,
      nextShot: 0.08,
      targetId: cmd && cmd.id,
      releaseIn: 0.18
    };
    e.timeStopCd = 18;
    state.banner = { text: "O tempo dobra", t: 1.8 };
    state.pointer.down = false;
    state.pointer.fireHold = false;
    state.dashActive = false;
    state.dashT = 0;
    G.burst(state, e.x, e.y, "#c8e8ff", 22, 130);
    state.shake = Math.max(state.shake || 0, 8);
  }

  function tickTimeLock(state, dt) {
    var lock = state.timeLock;
    if (!lock) return;
    lock.t += dt;
    var e = findEnemy(state, lock.bossId);
    if (!e || e.hp <= 0) {
      releaseHeldShots(state);
      state.timeLock = null;
      return;
    }
    var aliveBender = countTypeAlive(state, "dobrador_luz") > 0;
    if (!aliveBender) {
      releaseHeldShots(state);
      state.timeLock = null;
      state.floaters.push(G.createFloater(e.x, e.y - 24, "prisma caiu", "#c8e8ff"));
      return;
    }
    state.squad.vx = 0;
    state.squad.vy = 0;
    var cmd = commanderOf(state) || { x: state.squad.x, y: state.squad.y };
    if (lock.phase === "aim") {
      var side = Math.sin(lock.t * 3.2) * 90;
      var back = 40;
      var angTo = Math.atan2(cmd.y - e.y, cmd.x - e.x);
      var tx = cmd.x - Math.cos(angTo) * 150 + Math.cos(angTo + Math.PI / 2) * side;
      var ty = cmd.y - Math.sin(angTo) * 150 + Math.sin(angTo + Math.PI / 2) * side;
      moveTowards(e, tx, ty, (e.def.speed || 62) * 1.55, dt);
      G.clampPlay(e, state);
      face(e, cmd.x, cmd.y, dt);
      for (var bi = 0; bi < state.enemies.length; bi++) {
        var bender = state.enemies[bi];
        if (bender.hp <= 0 || bender.type !== "dobrador_luz") continue;
        coverBehindIrwin(state, bender, e, dt);
      }
      if (lock.t >= lock.nextShot && lock.t < lock.aimDur) {
        var px = Math.cos(angTo + Math.PI / 2);
        var py = Math.sin(angTo + Math.PI / 2);
        var fan = 0.58;
        var nFan = 5;
        for (var fi = 0; fi < nFan; fi++) {
          var u = nFan <= 1 ? 0 : fi / (nFan - 1) - 0.5;
          var angOff = u * 2 * fan;
          var origin = u * 128;
          spawnHeldTimeShot(state, e, cmd, px * origin, py * origin, angOff);
        }
        lock.nextShot += 0.12;
      }
      if (lock.t >= lock.aimDur) {
        lock.phase = "release";
        lock.releaseIn = 0.2;
        state.banner = { text: "AGORA", t: 0.85 };
        state.shake = Math.max(state.shake || 0, 6);
      }
    } else {
      lock.releaseIn -= dt;
      e.vx = e.vy = 0;
      if (lock.releaseIn <= 0) {
        releaseHeldShots(state);
        state.timeLock = null;
      }
    }
  }

  function evolveAlien(state, e) {
    var map = {
      fuzileiro_elite: "fuzileiro_veterano",
      pistoleiro_elite: "medico_alien",
      batedor_elite: "infiltrador_alien"
    };
    var next = map[e.type];
    if (!next || !G.ENEMY_DEFS[next]) return;
    var oldDef = e.def;
    var ratio = e.maxHp ? e.hp / e.maxHp : 1;
    e.type = next;
    e.def = G.ENEMY_DEFS[next];
    var scale = oldDef && oldDef.hp ? e.maxHp / oldDef.hp : 1;
    e.maxHp = Math.max(1, Math.round(e.def.hp * scale));
    e.hp = Math.max(1, Math.round(e.maxHp * Math.max(0.35, ratio)));
    e.evolved = true;
    e.flash = 0.45;
    G.burst(state, e.x, e.y, e.def.color || "#ffe08a", 16, 90);
    state.floaters.push(G.createFloater(e.x, e.y - 22, e.def.name, "#ffe08a"));
  }

  function tickInvasao(state, e, target, dt, spd) {
    var d = dist(e, target);
    var prefer = 176;
    var p2 = G.invasion && G.invasion.isP2(e);
    if (G.invasion) G.invasion.enterP2(state, e, "Irwin · segunda barra");
    if (G.invasion && e.inv && G.invasion.tookP2Hook(e)) {
      e.dashCd = 1.2;
      e.disparadaCd = 2.5;
    }
    if (G.invasion && G.invasion.cinematic(state)) return;
    if (state.timeLock) return;

    if (e.p2 && e.inv && !e.irwinAllIn && e.hp <= e.maxHp * 0.5) {
      e.irwinAllIn = true;
      fireIrwinAirstrike(state, e);
      var cmdNow = commanderOf(state) || state.squad;
      var hideAng = cmdNow ? Math.atan2(cmdNow.y - e.y, cmdNow.x - e.x) : 0;
      var bx = e.x - Math.cos(hideAng) * 36;
      var by = e.y - Math.sin(hideAng) * 36;
      warnAt(state, { kind: "mark", x: bx, y: by, t: 0.45, max: 0.45, r: 26, dmg: 0, color: "#c8e8ff" });
      var bender = G.game.spawnAt(state, "dobrador_luz", bx, by, { noDrop: true, ownerId: e.id });
      if (bender) bender.helperOf = e.id;
      e.timeStopCd = 2.8;
      state.banner = { text: "Tudo que ele tem", t: 2.2 };
      G.burst(state, e.x, e.y, "#c8e8ff", 20, 140);
    }

    applyIrwinMorale(state, e, dt);

    if ((e.irwinIFrame || 0) > 0) e.irwinIFrame -= dt;
    if ((e.dashWind || 0) > 0) {
      e.dashWind -= dt;
      e.vx = e.vy = 0;
      if (e.dashWind <= 0) {
        var wa = e.dashWindAng || 0;
        e.vx = Math.cos(wa) * (e.dashWindSpd || 600);
        e.vy = Math.sin(wa) * (e.dashWindSpd || 600);
        e.irwinDashT = e.dashWindDur || 0.28;
        G.burst(state, e.x, e.y, e.irwinDashKind === "disparada" ? "#ffe08a" : "#8ad422", 12, 90);
      }
      return;
    }
    if ((e.irwinDashT || 0) > 0) {
      e.irwinDashT -= dt;
      e.x += (e.vx || 0) * dt;
      e.y += (e.vy || 0) * dt;
      G.clampPlay(e, state);
      if (e.irwinDashT <= 0) e.vx = e.vy = 0;
      return;
    }

    var scouts = countIrwinScouts(state);
    var threat = irwinThreat(state, e);
    e.dodgeCd = Math.max(0, (e.dodgeCd == null ? 0 : e.dodgeCd) - dt);
    if (threat && threat.napalm) {
      e.napalmClearT = 0;
      if (e.napalmDodge == null) e.napalmDodge = Math.random() < 0.5;
    } else {
      e.napalmClearT = (e.napalmClearT || 0) + dt;
      if (e.napalmClearT > 0.55) e.napalmDodge = null;
    }
    if (threat && threat.napalm && e.napalmDodge && e.dodgeCd <= 0) {
      var escape = pickIrwinEscape(state, e, threat);
      if (e.inv && e.p2 && scouts > 0) {
        startIrwinDisparada(state, e, { x: e.x - Math.cos(escape) * 80, y: e.y - Math.sin(escape) * 80 }, scouts === 1);
      } else {
        startIrwinDash(state, e, escape, 0.32, 700, 210);
      }
      e.dodgeCd = 2.6;
      return;
    }

    if (e.inv && e.p2 && scouts > 0) {
      e.disparadaCd = (e.disparadaCd == null ? 4 : e.disparadaCd) - dt;
      if (e.disparadaCd <= 0 && threat && !threat.napalm) {
        var longDash = scouts === 1;
        startIrwinDisparada(state, e, threat, longDash);
        e.disparadaCd = scouts >= 2 ? 10 : 20;
        return;
      }
    }

    e.dashCd = (e.dashCd == null ? 3.2 : e.dashCd) - dt;
    if (e.dashCd <= 0 && target) {
      var da = Math.atan2(target.y - e.y, target.x - e.x);
      var landX = e.x + Math.cos(da) * 170;
      var landY = e.y + Math.sin(da) * 170;
      if (!irwinNapalmAt(state, landX, landY, 28) && !(threat && threat.napalm && e.napalmDodge === false)) {
        startIrwinDash(state, e, da, 0.28, 600, 175);
        e.dashCd = p2 ? 4.4 : 5.2;
        return;
      }
    }

    if (d < prefer - 28) moveTowards(e, e.x * 2 - target.x, e.y * 2 - target.y, spd, dt);
    else if (d > prefer + 24) moveTowards(e, target.x, target.y, spd * 0.85, dt);

    e.spawnWaveT = (e.spawnWaveT == null ? 6 : e.spawnWaveT) - dt;
    if (e.spawnWaveT <= 0) {
      if (p2 && e.inv) {
        var roomP2 = 10 - countInvasaoMinions(state);
        if (roomP2 <= 0) e.spawnWaveT = 1.4;
        else {
          e.spawnWaveT = 3.6 + Math.random() * 1.6;
          var trashP2 = G.ENEMY_POOL[(Math.random() * G.ENEMY_POOL.length) | 0];
          var offP2 = pickPlay(state, 40);
          trySpawnInvasao(state, e, trashP2, offP2.x, offP2.y);
        }
      } else {
        var room = 5 - countInvasaoMinions(state);
        if (room <= 0) {
          e.spawnWaveT = 1.1;
        } else {
          e.spawnWaveT = 2.4 + Math.random() * 2.2;
          var trash = G.ENEMY_POOL[(Math.random() * G.ENEMY_POOL.length) | 0];
          var off = pickPlay(state, 40);
          trySpawnInvasao(state, e, trash, off.x, off.y);
        }
      }
    }
    e.invasaoT -= dt;
    if (e.invasaoT <= 0 && (e.bombT || 0) <= 0) {
      var opts = ["bomb", "bomb", "bomb", "rifles", "shot"];
      if (e.invasaoLast === "rifles") opts = ["bomb", "bomb", "bomb", "shot"];
      var pick = opts[(Math.random() * opts.length) | 0];
      e.invasaoLast = pick;
      if (pick === "bomb") {
        var delay = 0.85;
        var leadX = state.squad.x + (state.squad.vx || 0) * 0.18;
        var leadY = state.squad.y + (state.squad.vy || 0) * 0.18;
        e.bombT = delay;
        var nG = p2 ? 3 : 2;
        var gR = p2 ? 92 : 68;
        warnAt(state, { kind: "acid", x: leadX, y: leadY, t: delay, max: delay, r: gR, dmg: Math.round(e.def.dmg * 2.4), color: "#8ad422" });
        for (var g = 1; g < nG; g++) {
          var ba = Math.random() * Math.PI * 2;
          var ring = (p2 ? 88 : 72) + Math.random() * 28;
          warnAt(state, {
            kind: "acid",
            x: leadX + Math.cos(ba) * ring,
            y: leadY + Math.sin(ba) * ring,
            t: delay,
            max: delay,
            r: p2 ? 84 : 62,
            dmg: Math.round(e.def.dmg * 2.1),
            color: "#8ad422"
          });
        }
        state.floaters.push(G.createFloater(e.x, e.y - 26, p2 ? "3 ácidos" : "ácido", "#8ad422"));
        e.invasaoT = 1.55;
      } else if (pick === "rifles") {
        var spawned = 0;
        if (trySpawnInvasao(state, e, "fuzileiro_alien", e.x + 32, e.y + 8)) spawned++;
        if (trySpawnInvasao(state, e, p2 ? "batedor_alien" : "fuzileiro_alien", e.x - 32, e.y - 8)) spawned++;
        if (spawned) {
          warnAt(state, { kind: "mark", x: e.x + 28, y: e.y, t: 0.4, max: 0.4, r: 22, dmg: 0 });
          warnAt(state, { kind: "mark", x: e.x - 28, y: e.y, t: 0.4, max: 0.4, r: 22, dmg: 0 });
          state.floaters.push(G.createFloater(e.x, e.y - 26, "fuzileiros", "#4aa36a"));
        }
        e.invasaoT = spawned ? 3.4 : 1.2;
      } else {
        e.invasaoT = 1.1;
      }
    }
    if ((e.bombT || 0) > 0) e.bombT -= dt;
    if (e.inv && e.p2 && e.irwinAllIn && countTypeAlive(state, "dobrador_luz") > 0) {
      e.timeStopCd = (e.timeStopCd == null ? 8 : e.timeStopCd) - dt;
      if (e.timeStopCd <= 0 && !state.timeLock) {
        warnAt(state, { kind: "mark", x: e.x, y: e.y, t: 0.85, max: 0.85, r: 58, dmg: 0, color: "#c8e8ff", followId: e.id });
        e.timeStopWind = 0.85;
        e.timeStopCd = 16;
      }
      if ((e.timeStopWind || 0) > 0) {
        e.timeStopWind -= dt;
        if (e.timeStopWind <= 0) {
          beginTimeLock(state, e);
          return;
        }
      }
    }
    if (e.cooldown <= 0 && target) {
      e.cooldown = 1 / Math.max(0.35, e.def.fire);
      var pang = Math.atan2(target.y - e.y, target.x - e.x);
      var px = Math.cos(pang + Math.PI / 2) * 7;
      var py = Math.sin(pang + Math.PI / 2) * 7;
      enemyFireAng(state, e, pang, "bullet", { dmg: e.def.dmg, r: 3.2, speed: 340, ox: px, oy: py, muzzle: 12 });
      enemyFireAng(state, e, pang, "bullet", { dmg: e.def.dmg, r: 3.2, speed: 340, ox: -px, oy: -py, muzzle: 12 });
    }
  }

  function tickAlienRifle(state, e, target, dt, spd) {
    var d = dist(e, target);
    var healed = (e.justHealed || 0) > 0;
    var rifle = e.def.kind === "alien_rifle";
    var prefer = healed && rifle ? 36 : (healed ? 54 : (e.def.kind === "alien_scout" ? 70 : 96));
    var chase = e.def.kind === "alien_scout" ? 1.55 : 1.2;
    if (healed && rifle) {
      moveTowards(e, target.x, target.y, spd * 1.85, dt);
    } else if (d > prefer + 14) {
      moveTowards(e, target.x, target.y, spd * (healed ? 1.55 : chase), dt);
    } else if (d < prefer - 18 && !healed) {
      moveTowards(e, e.x + (e.x - target.x) * 0.15, e.y + (e.y - target.y) * 0.15, spd * 0.55, dt);
    }
    if (e.def.kind === "alien_pistol") {
      var irw = invasaoHost(state, e);
      if (irw && dist(e, irw) < 90) {
        if (G.invasion) G.invasion.heal(irw, irw.maxHp * 0.008 * dt);
        else irw.hp = Math.min(irw.maxHp, irw.hp + irw.maxHp * 0.008 * dt);
      }
    }
    if (d <= e.def.range && e.cooldown <= 0) {
      e.cooldown = 1 / e.def.fire;
      enemyFire(state, e, target, "bullet", { speed: e.def.kind === "alien_scout" ? 340 : 310, r: 3 });
    }
  }

  function tickEliteRifle(state, e, target, dt, spd) {
    var d = dist(e, target);
    var vet = e.def.kind === "alien_veteran";
    if (d > 64) moveTowards(e, target.x, target.y, spd * 1.15, dt);
    else moveTowards(e, e.x + (e.x - target.x) * 0.1, e.y + (e.y - target.y) * 0.1, spd * 0.35, dt);
    e.barrageT = (e.barrageT == null ? 2.2 + (e.id % 5) * 0.35 : e.barrageT) - dt;
    if ((e.barrageWind || 0) > 0) {
      e.barrageWind -= dt;
      e.vx = e.vy = 0;
      if (e.barrageWind <= 0 && target) {
        var n = vet ? 9 : 7;
        var spread = vet ? 0.72 : 0.55;
        enemyFan(state, e, target, n, spread, "bullet", {
          speed: 390,
          r: vet ? 3.4 : 3,
          dmg: e.def.dmg,
          color: "#8ad422",
          hitsLeft: vet ? 2 : 1
        });
        e.barrageT = vet ? 4.4 : 5.1;
      }
      return;
    }
    if (e.barrageT <= 0 && target) {
      var bang = Math.atan2(target.y - e.y, target.x - e.x);
      e.barrageWind = 0.55;
      warnAt(state, {
        kind: "cone",
        x: e.x,
        y: e.y,
        ang: bang,
        spread: vet ? 0.4 : 0.32,
        range: 210,
        t: 0.55,
        max: 0.55,
        r: 24,
        dmg: 0,
        color: "#8ad422"
      });
      state.floaters.push(G.createFloater(e.x, e.y - 20, "barragem", "#8ad422"));
    }
    if (d <= e.def.range && e.cooldown <= 0 && (e.barrageWind || 0) <= 0) {
      e.cooldown = 1 / e.def.fire;
      enemyFire(state, e, target, "bullet", { speed: 330, r: 3.2, color: "#8ad422" });
    }
  }

  function tickEliteScout(state, e, target, dt, spd) {
    var d = dist(e, target);
    var inf = e.def.kind === "alien_infiltrator";
    var prefer = 150;
    if (d < prefer - 24) moveTowards(e, e.x * 2 - target.x, e.y * 2 - target.y, spd, dt);
    else if (d > prefer + 20) moveTowards(e, target.x, target.y, spd * 0.9, dt);
    e.dropCd = (e.dropCd == null ? 1.1 + (e.id % 4) * 0.2 : e.dropCd) - dt;
    if (e.dropCd <= 0 && target) {
      var n = inf ? 2 : 1;
      for (var i = 0; i < n; i++) {
        var ox = (i ? 1 : -1) * (inf ? 22 : 0);
        warnAt(state, {
          kind: "drop",
          x: target.x + ox,
          y: target.y,
          t: inf ? 0.78 : 0.86,
          max: inf ? 0.78 : 0.86,
          r: 20,
          dmg: e.def.dmg,
          color: "#c8ff6a",
          followLag: inf ? 3.1 : 2.15,
          dropShot: true
        });
      }
      e.dropCd = inf ? 3.4 : 4.2;
      state.floaters.push(G.createFloater(e.x, e.y - 20, "queda", "#c8ff6a"));
    }
  }

  function tickEliteMedic(state, e, target, dt, spd) {
    var d = dist(e, target);
    var med = e.def.kind === "alien_field_medic";
    var prefer = 120;
    if (d < prefer - 20) moveTowards(e, e.x * 2 - target.x, e.y * 2 - target.y, spd, dt);
    else if (d > prefer + 24) moveTowards(e, target.x, target.y, spd * 0.85, dt);
    var irw = invasaoHost(state, e);
    if (irw && dist(e, irw) < 110) {
      if (G.invasion) G.invasion.heal(irw, irw.maxHp * (med ? 0.01 : 0.007) * dt);
    }
    for (var i = 0; i < state.enemies.length; i++) {
      var al = state.enemies[i];
      if (al.hp <= 0 || al.id === e.id || al.def.boss) continue;
      if (dist(e, al) < 86) {
        if (G.invasion) G.invasion.heal(al, al.maxHp * 0.006 * dt);
      }
    }
    e.stationT = (e.stationT == null ? 2.4 + (e.id % 3) * 0.5 : e.stationT) - dt;
    var cap = med ? 2 : 1;
    var planted = 0;
    for (var s = 0; s < state.enemies.length; s++) {
      if (state.enemies[s].hp > 0 && state.enemies[s].type === "heal_station" && state.enemies[s].ownerId === e.id) planted++;
    }
    if (e.stationT <= 0 && planted < cap) {
      var spot = pickPlay(state, 50);
      warnAt(state, { kind: "mark", x: spot.x, y: spot.y, t: 0.55, max: 0.55, r: 22, dmg: 0, color: "#7cffb0" });
      e.stationPend = { t: 0.55, x: spot.x, y: spot.y };
      e.stationT = med ? 7.5 : 9.2;
      state.floaters.push(G.createFloater(e.x, e.y - 20, "estação", "#7cffb0"));
    }
    if (e.stationPend) {
      e.stationPend.t -= dt;
      if (e.stationPend.t <= 0) {
        var st = G.game.spawnAt(state, "heal_station", e.stationPend.x, e.stationPend.y, {
          noDrop: true,
          ownerId: e.id,
          healR: med ? 90 : 72
        });
        if (st) {
          st.maxHp = med ? Math.round(st.maxHp * 1.45) : st.maxHp;
          st.hp = st.maxHp;
          st.healR = med ? 90 : 72;
          st.healPct = med ? 0.018 : 0.012;
        }
        e.stationPend = null;
      }
    }
    if (d <= e.def.range && e.cooldown <= 0) {
      e.cooldown = 1 / Math.max(0.4, e.def.fire);
      enemyFire(state, e, target, "bullet", { speed: 300, r: 3, color: "#7cffb0" });
    }
  }

  function tickHealStation(state, e, dt) {
    e.vx = 0;
    e.vy = 0;
    var r = e.healR || 72;
    var pct = e.healPct || 0.012;
    for (var i = 0; i < state.enemies.length; i++) {
      var al = state.enemies[i];
      if (al.hp <= 0 || al.id === e.id) continue;
      if (dist(e, al) < r) {
        if (G.invasion) G.invasion.heal(al, al.maxHp * pct * dt);
        else al.hp = Math.min(al.maxHp, al.hp + al.maxHp * pct * dt);
        al.healGlow = 0.35;
      }
    }
  }

  function coverBehindIrwin(state, e, host, dt) {
    if (!e || e.hp <= 0 || !host || host.hp <= 0) return;
    var cmd = commanderOf(state) || state.squad;
    var ang = cmd ? Math.atan2(cmd.y - host.y, cmd.x - host.x) : (host.rot || 0);
    var cover = 34 + Math.sin((e.phase || 0) * 2.4) * 4;
    var hx = host.x - Math.cos(ang) * cover;
    var hy = host.y - Math.sin(ang) * cover + 6;
    var dHost = Math.hypot(e.x - hx, e.y - hy);
    if (dHost > 48 || (state.timeLock && dHost > 10)) {
      e.x = hx;
      e.y = hy;
    } else {
      moveTowards(e, hx, hy, 280, dt);
    }
    e.rot = ang;
    e.zDraw = 6 + Math.sin((e.phase || 0) * 3.2) * 2;
  }

  function tickLightBender(state, e, target, dt, spd) {
    var host = null;
    if (e.helperOf) host = findEnemy(state, e.helperOf);
    if ((!host || host.hp <= 0) && e.ownerId) host = findEnemy(state, e.ownerId);
    if (!host || host.hp <= 0) {
      for (var i = 0; i < state.enemies.length; i++) {
        var cand = state.enemies[i];
        if (cand.hp > 0 && cand.type === "chefe_invasao") {
          host = cand;
          break;
        }
      }
    }
    if (host && host.hp > 0) coverBehindIrwin(state, e, host, dt);
    else if (target) {
      moveTowards(e, target.x, target.y, spd, dt);
      face(e, target.x, target.y, dt);
    }
  }

  function tickBonfire(state, e, dt) {
    e.phase = (e.phase || 0) + dt;
    e.vx = 0;
    e.vy = 0;
  }

  function tickSentry(state, e, target, dt) {
    e.vx = 0;
    e.vy = 0;
    if (!target) return;
    e.rot = Math.atan2(target.y - e.y, target.x - e.x);
    if (e.cooldown <= 0) {
      e.cooldown = 1 / Math.max(0.4, e.def.fire);
      enemyFire(state, e, target, "bullet", { speed: 300, r: 4, color: "#ffd24a" });
    }
  }

  function tickPrincess(state, e, target, dt, spd) {
    e.skillT = (e.skillT == null ? 1.6 : e.skillT) - dt;
    if ((e.kneelT || 0) > 0) {
      e.kneelT -= dt;
      e.vx = e.vy = 0;
      e.weak = true;
      return;
    }
    e.weak = false;
    var act = e.princessAct || "";
    if (act === "pierce") {
      if ((e.chargeWindup || 0) > 0) {
        e.chargeWindup -= dt;
        if (target) e.rot = Math.atan2(target.y - e.y, target.x - e.x);
        if (e.chargeWindup <= 0) {
          var ang = e.rot || 0;
          var b = G.playfield(state);
          var hit = rayExitPlay(b, e.x, e.y, Math.cos(ang), Math.sin(ang), 28);
          e.pierceTx = hit.x;
          e.pierceTy = hit.y;
          e.vx = Math.cos(ang) * 780;
          e.vy = Math.sin(ang) * 780;
          e.pierceT = Math.max(0.18, hit.dist / 780);
        }
        return;
      }
      e.pierceT = (e.pierceT || 0) - dt;
      e.x += (e.vx || 0) * dt;
      e.y += (e.vy || 0) * dt;
      pushZone(state, { kind: "honey", x: e.x, y: e.y, r: 22, t: 2.4, max: 2.4, dmg: 8, hurtPlayer: true, pin: true });
      if (e.pierceT <= 0) {
        explode(state, e.x, e.y, 78, Math.round(e.def.dmg * 1.4), "enemy", "#ffe08a");
        pushZone(state, { kind: "honey", x: e.x, y: e.y, r: 86, t: 2.8, max: 2.8, dmg: 12, hurtPlayer: true, pin: true });
        state.honeyT = Math.max(state.honeyT || 0, 1.6);
        e.princessAct = "";
        e.skillT = 2.4;
        e.vx = e.vy = 0;
      }
      return;
    }
    if (act === "thrust") {
      e.thrustT = (e.thrustT || 0) - dt;
      if (target) moveTowards(e, target.x, target.y, spd * 1.4, dt);
      if (!e.thrustDid && e.thrustT <= 0.15) {
        e.thrustDid = true;
        var base = target ? Math.atan2(target.y - e.y, target.x - e.x) : 0;
        for (var i = 0; i < 5; i++) {
          var a = base + (i - 2) * 0.55;
          hurtBeam(state, e.x, e.y, a, 160, 14, Math.round(e.def.dmg * 1.15));
        }
      }
      if (e.thrustT <= 0) {
        e.princessAct = "";
        e.skillT = 2.2;
      }
      return;
    }
    if (act === "cavalry") {
      e.princessAct = "";
      e.skillT = 4.5;
      var dest = G.invasion.pickOpposite(state, target || state.squad);
      G.game.spawnAt(state, "abelha_enfermeira", e.x + 24, e.y, { noDrop: true, hostId: e.id, destX: dest.x, destY: dest.y });
      G.game.spawnAt(state, "abelha_arquiteta", dest.x, dest.y, { noDrop: true, hostId: e.id });
      state.banner = { text: "Cavalaria real", t: 1.8 };
      return;
    }
    if (act === "flash") {
      e.flashCuts = e.flashCuts || 0;
      e.flashCd = (e.flashCd || 0) - dt;
      e.stealth = 0.85;
      if (e.flashCd <= 0 && e.flashCuts < 20) {
        e.flashCd = 0.16;
        var b2 = G.playfield(state);
        var a2 = Math.random() * Math.PI * 2;
        var x0 = b2.x0 + 20 + Math.random() * (b2.x1 - b2.x0 - 40);
        var y0 = b2.y0 + 20 + Math.random() * (b2.y1 - b2.y0 - 40);
        var len = 220 + Math.random() * 180;
        warnAt(state, { kind: "lane", x: x0, y: y0, ang: a2, len: len, w: 12, t: 0.28, max: 0.28, r: 12, dmg: Math.round(e.def.dmg * 1.6), color: "#fff36a" });
        e.flashCuts++;
      }
      if (e.flashCuts >= 20 && e.flashCd <= 0) {
        e.princessAct = "";
        e.stealth = 0;
        e.kneelT = 5;
        e.skillT = 6;
        var mid = G.playfield(state);
        e.x = (mid.x0 + mid.x1) / 2;
        e.y = (mid.y0 + mid.y1) / 2;
        state.banner = { text: "A princesa descansa", t: 2.2 };
      }
      return;
    }
    if (target) moveTowards(e, target.x, target.y, spd * 0.7, dt);
    if (e.cooldown <= 0 && target) {
      e.cooldown = 1 / Math.max(0.35, e.def.fire);
      enemyFire(state, e, target, "sting", { speed: 280, r: 4, color: "#ffd24a" });
    }
    if (e.skillT > 0) return;
    var pool = ["pierce", "thrust", "cavalry", "flash"];
    if (e.lastPrincess) {
      var np = [];
      for (var p = 0; p < pool.length; p++) if (pool[p] !== e.lastPrincess) np.push(pool[p]);
      pool = np.length ? np : pool;
    }
    var pick = pool[(Math.random() * pool.length) | 0];
    e.lastPrincess = pick;
    e.princessAct = pick;
    if (pick === "pierce") {
      e.chargeWindup = 0.55;
      e.rot = target ? Math.atan2(target.y - e.y, target.x - e.x) : 0;
      warnAt(state, { kind: "lane", x: e.x, y: e.y, ang: e.rot, len: 340, w: 22, t: 0.55, max: 0.55, r: 20, dmg: 0, color: "#ffe08a" });
      state.floaters.push(G.createFloater(e.x, e.y - 24, "perfuração", "#ffe08a"));
    } else if (pick === "thrust") {
      e.thrustT = 0.85;
      e.thrustDid = false;
      var tb = target ? Math.atan2(target.y - e.y, target.x - e.x) : 0;
      for (var s = 0; s < 5; s++) {
        warnAt(state, { kind: "lane", x: e.x, y: e.y, ang: tb + (s - 2) * 0.55, len: 160, w: 12, t: 0.7, max: 0.7, r: 12, dmg: 0, color: "#fff4c4" });
      }
      state.floaters.push(G.createFloater(e.x, e.y - 24, "estocadas", "#fff4c4"));
    } else if (pick === "flash") {
      e.flashCuts = 0;
      e.flashCd = 0.2;
      e.stealth = 0.7;
      state.banner = { text: "Final Flash", t: 1.6 };
    }
  }

  function tickNurse(state, e, dt, spd) {
    var host = findEnemy(state, e.hostId);
    if (!host || host.hp <= 0) {
      e.hp = 0;
      return;
    }
    var dest = { x: e.destX, y: e.destY };
    moveTowards(e, dest.x, dest.y, spd * 1.2, dt);
    moveTowards(host, dest.x, dest.y, spd * 1.05, dt);
    if (Math.hypot(host.x - dest.x, host.y - dest.y) < 40) {
      if (G.invasion) G.invasion.heal(host, host.maxHp * 0.06 * dt);
      else host.hp = Math.min(host.maxHp, host.hp + host.maxHp * 0.06 * dt);
    }
  }

  function tickArchitect(state, e, dt) {
    var host = findEnemy(state, e.hostId);
    if (!host || host.hp <= 0) {
      e.hp = 0;
      return;
    }
    if (!e.walls) {
      e.walls = true;
      for (var i = 0; i < 3; i++) {
        var ang = -Math.PI / 2 + (i - 1) * 0.55;
        G.game.spawnAt(state, "barreira_colmeia", host.x + Math.cos(ang) * (36 + i * 18), host.y + Math.sin(ang) * (36 + i * 18), { noDrop: true, hostId: host.id, layer: i });
      }
    }
    e.vx = e.vy = 0;
  }

  function tickAntlion(state, e, target, dt, spd) {
    e.skillT = (e.skillT == null ? 2 : e.skillT) - dt;
    if (e.act === "pit") {
      e.pitT = (e.pitT || 0) - dt;
      var pull = 70;
      var dx = e.x - state.squad.x;
      var dy = e.y - state.squad.y;
      var len = Math.hypot(dx, dy) || 1;
      if (len < 160) {
        state.squad.x += (dx / len) * pull * dt;
        state.squad.y += (dy / len) * pull * dt;
        if (len < 36 && e.contactCd <= 0) {
          e.contactCd = 0.35;
          hurt(state, target, Math.round(e.def.dmg * 0.8), e.x, e.y);
        }
      }
      if (e.pitT <= 0) {
        e.act = "";
        e.skillT = 2.2;
      }
      return;
    }
    if (e.act === "bury") {
      e.buryT = (e.buryT || 0) - dt;
      e.buried = true;
      e.stealth = 0.8;
      if (e.buryT <= 0) {
        e.x = state.squad.x;
        e.y = state.squad.y;
        e.buried = false;
        e.stealth = 0;
        explode(state, e.x, e.y, 70, Math.round(e.def.dmg * 1.3), "enemy", "#c4a06a");
        e.act = "";
        e.skillT = 2.4;
      }
      return;
    }
    if (target) moveTowards(e, target.x, target.y, spd, dt);
    if (e.cooldown <= 0 && target && dist(e, target) < 200) {
      e.cooldown = 1.1;
      enemyFire(state, e, target, "bullet", { speed: 240, r: 5, color: "#c4a06a" });
    }
    if (e.skillT > 0) return;
    e.act = Math.random() < 0.5 ? "pit" : "bury";
    if (e.act === "pit") {
      e.pitT = 2.6;
      warnAt(state, { kind: "mark", x: e.x, y: e.y, t: 0.4, max: 0.4, r: 150, dmg: 0, color: "#c4a06a" });
    } else {
      e.buryT = 1.1;
      warnAt(state, { kind: "mark", x: state.squad.x, y: state.squad.y, t: 1.1, max: 1.1, r: 56, dmg: 0, color: "#8a5a28" });
    }
    e.skillT = 3;
  }

  function tickBomber(state, e, target, dt, spd) {
    e.skillT = (e.skillT == null ? 1.8 : e.skillT) - dt;
    if (e.act === "dive") {
      e.diveT = (e.diveT || 0) - dt;
      e.x += (e.vx || 0) * dt;
      e.y += (e.vy || 0) * dt;
      if (e.diveT <= 0) {
        explode(state, e.x, e.y, 80, Math.round(e.def.dmg * 1.5), "enemy", "#ff7a2a");
        e.act = "";
        e.skillT = 2.4;
        e.vx = e.vy = 0;
      }
      return;
    }
    if (target) moveTowards(e, target.x, target.y, spd * 0.8, dt);
    if (e.cooldown <= 0 && target) {
      e.cooldown = 0.9;
      warnAt(state, { kind: "acid", x: target.x, y: target.y, t: 0.7, max: 0.7, r: 42, dmg: Math.round(e.def.dmg * 1.1), color: "#ff7a2a" });
    }
    if (e.skillT > 0) return;
    if (Math.random() < 0.45 && target) {
      e.act = "dive";
      var ang = Math.atan2(target.y - e.y, target.x - e.x);
      e.vx = Math.cos(ang) * 420;
      e.vy = Math.sin(ang) * 420;
      e.diveT = 0.55;
      warnAt(state, { kind: "lane", x: e.x, y: e.y, ang: ang, len: 240, w: 20, t: 0.25, max: 0.25, r: 18, dmg: 0, color: "#ff7a2a" });
    } else {
      for (var i = 0; i < 5; i++) {
        var ox = (i - 2) * 36;
        warnAt(state, { kind: "acid", x: state.squad.x + ox, y: state.squad.y, t: 0.7 + i * 0.08, max: 0.85, r: 34, dmg: Math.round(e.def.dmg), color: "#c45a22" });
      }
      e.skillT = 2.8;
    }
  }

  function tickMantis(state, e, target, dt, spd) {
    e.skillT = (e.skillT == null ? 1.4 : e.skillT) - dt;
    if (e.act === "stealth") {
      e.stealth = 0.92;
      e.hideT = (e.hideT || 0) - dt;
      if (target) moveTowards(e, target.x, target.y, spd * 1.5, dt);
      if (e.hideT <= 0) {
        e.stealth = 0;
        e.act = "";
        explode(state, e.x, e.y, 52, Math.round(e.def.dmg * 1.2), "enemy", "#4a7a32");
        e.skillT = 1.8;
      }
      return;
    }
    if (e.act === "blink") {
      if (target) {
        var a = Math.atan2(target.y - e.y, target.x - e.x) + Math.PI / 2;
        e.x = target.x + Math.cos(a) * 48;
        e.y = target.y + Math.sin(a) * 48;
        hurt(state, target, Math.round(e.def.dmg * 1.35), e.x, e.y);
      }
      e.act = "";
      e.skillT = 1.6;
      return;
    }
    if (target) moveTowards(e, target.x, target.y, spd, dt);
    if (e.cooldown <= 0 && target && dist(e, target) < 90) {
      e.cooldown = 0.7;
      var ang = Math.atan2(target.y - e.y, target.x - e.x);
      for (var f = -1; f <= 1; f++) enemyFireAng(state, e, ang + f * 0.4, "bullet", { speed: 320, r: 4, color: "#8ad46a" });
    }
    if (e.skillT > 0) return;
    e.act = Math.random() < 0.5 ? "stealth" : "blink";
    if (e.act === "stealth") e.hideT = 1.6;
    e.skillT = 2.2;
  }

  function vultoDashSpd() {
    return 2800;
  }

  function rayExitPlay(b, x, y, dx, dy, pad) {
    pad = pad == null ? 22 : pad;
    var t = 1e9;
    if (dx > 0.0001) t = Math.min(t, (b.x1 - pad - x) / dx);
    else if (dx < -0.0001) t = Math.min(t, (b.x0 + pad - x) / dx);
    if (dy > 0.0001) t = Math.min(t, (b.y1 - pad - y) / dy);
    else if (dy < -0.0001) t = Math.min(t, (b.y0 + pad - y) / dy);
    if (!isFinite(t) || t < 12) t = 12;
    return { x: x + dx * t, y: y + dy * t, dist: t };
  }

  function pickVultoDashAng(e, target) {
    if (Math.random() < 0.35 && target) return Math.atan2(target.y - e.y, target.x - e.x);
    return Math.random() * Math.PI * 2;
  }

  function planVultoPath(state, cx, cy, ang, twist) {
    var b = G.playfield(state);
    var dx = Math.cos(ang);
    var dy = Math.sin(ang);
    var start = rayExitPlay(b, cx, cy, -dx, -dy, 16);
    var end = rayExitPlay(b, cx, cy, dx, dy, 16);
    var A = { x: start.x, y: start.y };
    var C = { x: end.x, y: end.y };
    if (!twist) return [A, C];
    var mx = (A.x + C.x) / 2;
    var my = (A.y + C.y) / 2;
    var side = twist.side || 1;
    var amp = twist.amp || 110;
    var B = {
      x: Math.max(b.x0 + 28, Math.min(b.x1 - 28, mx - dy * side * amp)),
      y: Math.max(b.y0 + 28, Math.min(b.y1 - 28, my + dx * side * amp))
    };
    if (twist.double) {
      var D = {
        x: Math.max(b.x0 + 28, Math.min(b.x1 - 28, mx * 0.28 + C.x * 0.72 + dy * side * amp * 0.55)),
        y: Math.max(b.y0 + 28, Math.min(b.y1 - 28, my * 0.28 + C.y * 0.72 - dx * side * amp * 0.55))
      };
      return [A, B, D, C];
    }
    return [A, B, C];
  }

  function warnVultoPath(state, pts, t) {
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i];
      var b = pts[i + 1];
      warnAt(state, {
        kind: "lane",
        x: a.x,
        y: a.y,
        ang: Math.atan2(b.y - a.y, b.x - a.x),
        len: Math.hypot(b.x - a.x, b.y - a.y),
        w: 26,
        t: t,
        max: t,
        r: 26,
        dmg: 0,
        color: "#ff6a18"
      });
    }
  }

  function vultoLaneCenter(e, pass) {
    var lanes = e.strafeLanes || 1;
    var off = (pass - (lanes - 1) / 2) * (e.strafeShift || 40);
    var ang = (e.strafeAngs && e.strafeAngs[pass] != null) ? e.strafeAngs[pass] : (e.strafeAng || 0);
    return {
      x: e.strafeCx + Math.cos(ang + Math.PI / 2) * off,
      y: e.strafeCy + Math.sin(ang + Math.PI / 2) * off
    };
  }

  function setupVultoPass(state, e, pass) {
    var ang = (e.strafeAngs && e.strafeAngs[pass] != null) ? e.strafeAngs[pass] : (e.strafeAng || 0);
    var p = vultoLaneCenter(e, pass);
    var twist = (e.strafeTwist && e.strafeTwist[pass]) || null;
    e.strafeAng = ang;
    e.strafePath = planVultoPath(state, p.x, p.y, ang, twist);
    e.strafeDist = 0;
    e.strafeLen = polyLen(e.strafePath);
    var start = e.strafePath[0];
    e.x = start.x;
    e.y = start.y;
    e.strafeDur = Math.max(0.06, e.strafeLen / vultoDashSpd());
  }

  function tickVulto(state, e, target, dt, spd) {
    state.vultoId = e.id;
    state.vultoDark = Math.min(1, (state.vultoDark || 0) + dt * 0.55);
    var rage = G.invasion ? G.invasion.rage(e) : e.hp <= e.maxHp * 0.5;
    var d = dist(e, target);
    if (G.invasion) G.invasion.enterP2(state, e, "Glinder · segunda barra");
    if (G.invasion && e.inv && G.invasion.tookP2Hook(e)) {
      e.vultoT = Math.min(e.vultoT || 0, 0.4);
    }
    e.vultoT -= dt;
    if (state.vultoBlind > 0) {
      state.vultoBlind -= dt;
      if (state.vultoBlind <= 0) state.vultoBlind = 0;
    }
    if (e.vultoAct === "arena") {
      e.arenaT = (e.arenaT || 0) - dt;
      if ((e.arenaT || 0) <= 0 && !e.arenaDid) {
        e.arenaDid = true;
        var sx = e.arenaSx;
        var sy = e.arenaSy;
        var sr = e.arenaR || (G.invasion && G.invasion.PHALANX_R) || 122;
        var bA = G.playfield(state);
        explode(state, (bA.x0 + bA.x1) / 2, (bA.y0 + bA.y1) / 2, 40, 0, "enemy", "#ff4a2a");
        if (Math.hypot(state.squad.x - sx, state.squad.y - sy) > sr) {
          hurtSquadArea(state, state.squad.x, state.squad.y, 80, Math.round(e.def.dmg * 2.4), e.x, e.y);
        }
        G.burst(state, sx, sy, "#ffd24a", 18, 90);
      }
      if ((e.arenaT || 0) <= -0.25) {
        e.vultoAct = "";
        e.vultoT = 2.6;
      }
      return;
    }
    if (e.vultoAct === "strafe") {
      e.strafeT = (e.strafeT || 0) - dt;
      if ((e.strafeWait || 0) > 0) {
        e.strafeWait -= dt;
        e.rot = e.strafeAng || 0;
        if (e.strafeWait <= 0) e.strafeT = e.strafeDur || 0.2;
      } else {
        var sp = vultoDashSpd();
        var path = e.strafePath || [];
        if (path.length < 2) {
          e.vultoAct = "";
          return;
        }
        e.strafeDist = (e.strafeDist || 0) + sp * dt;
        var pos = pointOnPoly(path, Math.min(e.strafeLen || polyLen(path), e.strafeDist));
        e.x = pos.x;
        e.y = pos.y;
        e.rot = pos.ang;
        e.napalmAcc = (e.napalmAcc || 0) + dt;
        if (e.napalmAcc > 24 / sp) {
          e.napalmAcc = 0;
          pushZone(state, { kind: "napalm", x: e.x, y: e.y, r: 30, t: 5, max: 5, dmg: 18, hurtPlayer: true });
        }
        if (e.strafeDist >= (e.strafeLen || 1) || e.strafeT <= 0) {
          if ((e.strafeLeft || 0) > 1) {
            e.strafeLeft--;
            e.strafePass = (e.strafePass || 0) + 1;
            setupVultoPass(state, e, e.strafePass);
            e.strafeWait = 0.22;
            e.napalmAcc = 0;
          } else {
            e.vultoAct = "";
            e.vultoT = rage ? 2.2 : 3.1;
          }
        }
      }
      return;
    }
    if (e.vultoAct === "cone") {
      e.coneT -= dt;
      e.rot = e.coneAng || e.rot;
      if (e.coneT <= 0 && !e.coneDid) {
        e.coneDid = true;
        var beamLen = e.coneRange || vultoBeamLen(state);
        var beamAng = e.coneAng || 0;
        var beams = e.invP2 ? 5 : 1;
        for (var bi = 0; bi < beams; bi++) {
          var off = beams === 1 ? 0 : (bi - (beams - 1) / 2) * 0.16;
          var bang = beamAng + off;
          if (e.invP2 && target) bang = Math.atan2(target.y - e.y, target.x - e.x) + off;
          hurtBeam(state, e.x, e.y, bang, beamLen, 11, Math.round(e.def.dmg * 1.8));
          enemyFireAng(state, e, bang, "flame", { speed: 520, r: 5, dmg: Math.round(e.def.dmg * 0.55), life: 1.2, homing: !!e.invP2, color: "#ff6a18" });
        }
        var ca = Math.cos(beamAng);
        var sa = Math.sin(beamAng);
        for (var n = 0; n < 36; n++) {
          var along = (n / 35) * beamLen;
          var jitter = (Math.random() - 0.5) * 10;
          state.particles.push({
            x: e.x + ca * along - sa * jitter,
            y: e.y + sa * along + ca * jitter,
            vx: ca * (520 + Math.random() * 220) - sa * jitter * 8,
            vy: sa * (520 + Math.random() * 220) + ca * jitter * 8,
            life: 0.18 + Math.random() * 0.12,
            max: 0.28,
            size: n < 4 ? 8 : 3 + Math.random() * 4,
            color: Math.random() > 0.45 ? "#ff6a18" : "#ffe060"
          });
        }
        e.vultoT = 0.15;
      }
      if (e.coneT <= -0.18) {
        e.vultoAct = "";
        e.vultoT = 2.6;
      }
      return;
    }
    var hover = 168 + Math.sin(e.phase * 1.6) * 28;
    var hx = target.x + Math.cos(e.phase * 0.8) * hover;
    var hy = target.y + Math.sin(e.phase * 0.8) * hover * 0.7;
    moveTowards(e, hx, hy, spd, dt);
    if (e.cooldown <= 0 && d < e.def.range) {
      e.cooldown = 0.85;
      enemyFire(state, e, target, "flame", { speed: 420, r: 5, dmg: Math.round(e.def.dmg * 0.7), color: "#ff6a2a" });
    }
    if (e.vultoT > 0) return;
    var pool = ["strafe", "cone", "dark"];
    if (e.vultoLast) {
      var vp = [];
      for (var vi = 0; vi < pool.length; vi++) if (pool[vi] !== e.vultoLast) vp.push(pool[vi]);
      pool = vp.length ? vp : pool;
    }
    var act = pool[(Math.random() * pool.length) | 0];
    e.vultoLast = act;
    if (act === "strafe") {
      if (e.invP2) {
        e.vultoAct = "arena";
        e.arenaT = 1.25;
        e.arenaDid = false;
        var safe = G.invasion.pickOpposite(state, target || state.squad);
        e.arenaSx = safe.x;
        e.arenaSy = safe.y;
        e.arenaR = G.invasion.PHALANX_R;
        warnAt(state, { kind: "mark", x: safe.x, y: safe.y, t: 1.25, max: 1.25, r: e.arenaR, dmg: 0, color: "#ffe08a" });
        state.banner = { text: "Fica no círculo", t: 1.6 };
        state.floaters.push(G.createFloater(e.x, e.y - 24, "carga total", "#ff6a18"));
        return;
      }
      var lanes = rage ? 3 : 1;
      e.vultoAct = "strafe";
      e.strafeLanes = lanes;
      e.strafeLeft = lanes;
      e.strafePass = 0;
      e.strafeShift = 36;
      e.strafeCx = target.x;
      e.strafeCy = target.y;
      e.strafeAngs = [];
      e.strafeTwist = [];
      for (var ln = 0; ln < lanes; ln++) {
        e.strafeAngs.push(pickVultoDashAng(e, target) + (Math.random() - 0.5) * 0.7);
        e.strafeTwist.push({
          side: Math.random() < 0.5 ? 1 : -1,
          amp: 80 + Math.random() * 150,
          double: Math.random() < 0.6
        });
      }
      e.strafeAng = e.strafeAngs[0];
      setupVultoPass(state, e, 0);
      e.strafeWait = 0.7;
      e.napalmAcc = 0;
      for (var lp = 0; lp < lanes; lp++) {
        var p0 = vultoLaneCenter(e, lp);
        var path0 = planVultoPath(state, p0.x, p0.y, e.strafeAngs[lp], e.strafeTwist[lp]);
        warnVultoPath(state, path0, 0.7);
      }
      state.floaters.push(G.createFloater(e.x, e.y - 24, lanes > 1 ? "três linhas" : "razante", "#ff6a18"));
    } else if (act === "cone") {
      var cAng = Math.atan2(target.y - e.y, target.x - e.x);
      var beamLen = vultoBeamLen(state);
      e.vultoAct = "cone";
      e.coneAng = cAng;
      e.coneRange = beamLen;
      e.coneT = 0.7;
      e.coneDid = false;
      warnAt(state, {
        kind: "lane",
        x: e.x,
        y: e.y,
        ang: cAng,
        len: beamLen,
        w: 9,
        t: 0.7,
        max: 0.7,
        r: 12,
        dmg: 0,
        color: "#ff7a2a"
      });
      state.floaters.push(G.createFloater(e.x, e.y - 24, "laser", "#ff7a2a"));
    } else {
      state.vultoBlind = 5;
      state.banner = { text: "A visão some", t: 1.6 };
      state.floaters.push(G.createFloater(e.x, e.y - 24, "escuridão", "#3a1020"));
      e.vultoT = 5.4;
      if (e.invP2 && G.invasion && !G.invasion.firesAlive(state)) G.invasion.spawnFires(state);
    }
  }

  function tickKing(state, e, target, dt, spd) {
    var queen = findEnemy(state, e.queenId);
    var knight = e.enrage || e.kingMode === "knight" || !queen;
    e.kingT -= dt;
    if ((e.throwLance || 0) > 0) {
      e.throwLance -= dt;
      if (e.throwLance <= 0 && target) {
        var la = Math.atan2(target.y - e.y, target.x - e.x);
        enemyFireAng(state, e, la, "lance", { speed: 380, r: 6, dmg: Math.round(e.def.dmg * 1.35), life: 1.1, color: "#f0d24a" });
      }
    }
    if ((e.chargeWindup || 0) > 0) {
      e.chargeWindup = Math.max(0, e.chargeWindup - dt);
      var wAng = e.chargeAim || 0;
      e.rot = wAng;
      if (e.chargeWindup <= 0) {
        var dashSp = e.kingAct === "dive" ? 0 : (knight ? 640 : 560);
        e.vx = Math.cos(wAng) * dashSp;
        e.vy = Math.sin(wAng) * dashSp;
        e.cascaDashT = e.kingAct === "thrust" ? 0.28 : 0.42;
        if (e.kingAct === "dive") {
          e.diveT = 0.55;
          e.diveZ = 0;
        }
      }
      return;
    }
    if ((e.diveT || 0) > 0) {
      e.diveT -= dt;
      e.diveZ = Math.sin((1 - e.diveT / 0.55) * Math.PI) * 70;
      e.zDraw = e.diveZ;
      if (e.diveT <= 0) {
        e.x = e.diveX != null ? e.diveX : state.squad.x;
        e.y = e.diveY != null ? e.diveY : state.squad.y;
        e.zDraw = 0;
        explode(state, e.x, e.y, 78, Math.round(e.def.dmg * 1.6), "enemy", "#ffe08a");
        G.audio.explosion();
        e.kingT = 1.6;
        e.kingAct = "";
      }
      return;
    }
    if ((e.cascaDashT || 0) > 0) {
      e.cascaDashT -= dt;
      e.x += (e.vx || 0) * dt;
      e.y += (e.vy || 0) * dt;
      e.rot = Math.atan2(e.vy || 0, e.vx || 1);
      G.clampPlay(e, state);
      var dd = dist(e, target);
      if (dd < e.def.size + target.def.size + 8 && e.contactCd <= 0) {
        e.contactCd = 0.18;
        hurt(state, target, Math.round(e.def.dmg * (knight && e.kingAct === "thrust" ? 1.55 : 1.15)), e.x, e.y);
      }
      if (e.cascaDashT <= 0) {
        e.kingT = knight ? 1.15 : 1.45;
        e.kingAct = "";
      }
      return;
    }
    if (knight) {
      var standK = 130 + Math.sin(e.phase * 2) * 24;
      moveTowards(e, target.x + Math.cos(e.phase) * standK, target.y + Math.sin(e.phase) * standK * 0.6, spd * 1.25, dt);
      if (e.kingT > 0) return;
      var kpool = ["thrust", "lance", "dive"];
      if (e.kingLast) {
        var kk = [];
        for (var ki = 0; ki < kpool.length; ki++) if (kpool[ki] !== e.kingLast) kk.push(kpool[ki]);
        kpool = kk.length ? kk : kpool;
      }
      var kact = kpool[(Math.random() * kpool.length) | 0];
      e.kingLast = kact;
      e.kingAct = kact;
      if (kact === "lance") {
        var lang = Math.atan2(target.y - e.y, target.x - e.x);
        warnAt(state, { kind: "lane", x: e.x, y: e.y, ang: lang, len: 340, w: 16, t: 0.4, max: 0.4, r: 16, dmg: 0, color: "#ffe08a" });
        e.kingT = 0.4;
        e.throwLance = 0.4;
        return;
      }
      if (kact === "dive") {
        e.diveX = state.squad.x;
        e.diveY = state.squad.y;
        warnAt(state, { kind: "mark", x: e.diveX, y: e.diveY, t: 0.75, max: 0.75, r: 72, dmg: 0, color: "#ffd24a", followSquad: true });
        e.chargeAim = Math.atan2(e.diveY - e.y, e.diveX - e.x);
        e.chargeWindup = 0.75;
        e.chargeWindupMax = 0.75;
        state.floaters.push(G.createFloater(e.x, e.y - 24, "mergulho", "#ffe08a"));
        return;
      }
      var tAng = Math.atan2(target.y - e.y, target.x - e.x);
      e.chargeAim = tAng;
      e.chargeWindup = 0.55;
      e.chargeWindupMax = 0.55;
      warnAt(state, { kind: "lane", x: e.x, y: e.y, ang: tAng, len: 280, w: 18, t: 0.55, max: 0.55, r: 18, dmg: 0, color: "#ffe08a" });
      state.floaters.push(G.createFloater(e.x, e.y - 24, "estocada", "#ffe08a"));
      return;
    }
    if (queen && queen.hp > 0) {
      if ((e.guardT || 0) > 0) {
        e.guardT -= dt;
        var gx = queen.x + (state.squad.x - queen.x) * 0.35;
        var gy = queen.y + (state.squad.y - queen.y) * 0.35;
        moveTowards(e, gx, gy, spd * 1.4, dt);
        if (G.invasion) G.invasion.heal(queen, queen.maxHp * 0.012 * dt);
        else queen.hp = Math.min(queen.maxHp, queen.hp + queen.maxHp * 0.012 * dt);
        return;
      }
      var hoverK = 150 + Math.sin(e.phase * 2.2) * 30;
      moveTowards(e, target.x + Math.cos(e.phase * 1.1) * hoverK, target.y + Math.sin(e.phase * 1.1) * hoverK * 0.65, spd, dt);
      if (e.kingT > 0) return;
      if (Math.random() < 0.34) {
        e.guardT = 2.2;
        e.kingT = 2.4;
        state.floaters.push(G.createFloater(e.x, e.y - 24, "guarda", "#7cffb0"));
        return;
      }
      var aim = Math.atan2(
        (target.y + (state.squad.vy || 0) * 0.1) - e.y,
        (target.x + (state.squad.vx || 0) * 0.1) - e.x
      );
      e.chargeAim = aim;
      e.chargeWindup = 0.7;
      e.chargeWindupMax = 0.7;
      e.kingAct = "dash";
      warnAt(state, { kind: "lane", x: e.x, y: e.y, ang: aim, len: 520, w: 20, t: 0.7, max: 0.7, r: 20, dmg: 0, color: "#ffe08a" });
      state.floaters.push(G.createFloater(e.x, e.y - 24, "investida", "#ffe08a"));
    }
  }

  function wormJetLen(state) {
    var b = G.playfield(state);
    return Math.hypot(b.x1 - b.x0, b.y1 - b.y0) * 0.78;
  }

  function polyLen(pts) {
    var L = 0;
    for (var i = 0; i < pts.length - 1; i++) L += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    return L;
  }

  function pointOnPoly(pts, dist) {
    var left = dist;
    for (var i = 0; i < pts.length - 1; i++) {
      var d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y) || 1;
      if (left <= d) {
        var f = left / d;
        return {
          x: pts[i].x + (pts[i + 1].x - pts[i].x) * f,
          y: pts[i].y + (pts[i + 1].y - pts[i].y) * f,
          ang: Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x)
        };
      }
      left -= d;
    }
    var last = pts[pts.length - 1];
    var prev = pts[pts.length - 2] || last;
    return { x: last.x, y: last.y, ang: Math.atan2(last.y - prev.y, last.x - prev.x) };
  }

  function planWormDive(state, e, target) {
    var b = G.playfield(state);
    var A = { x: e.x, y: e.y };
    var dx = target.x - A.x;
    var dy = target.y - A.y;
    var len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    var C = rayExitPlay(b, target.x, target.y, dx, dy, -90);
    if (Math.hypot(C.x - A.x, C.y - A.y) < 260) C = rayExitPlay(b, A.x, A.y, dx, dy, -90);
    C.x += dx * 220;
    C.y += dy * 220;
    var mx = (A.x + C.x) / 2;
    var my = (A.y + C.y) / 2;
    var side = Math.random() < 0.5 ? 1 : -1;
    var B = {
      x: Math.max(b.x0 - 40, Math.min(b.x1 + 40, mx + -dy * side * (180 + Math.random() * 140))),
      y: Math.max(b.y0 - 40, Math.min(b.y1 + 40, my + dx * side * (180 + Math.random() * 140)))
    };
    return [A, B, C];
  }

  function warnWormPath(state, pts, t) {
    if (!pts || !pts.length) return;
    var last = pts[pts.length - 1];
    warnAt(state, { kind: "mark", x: last.x, y: last.y, t: t, max: t, r: 28, dmg: 0, color: "#8a6030" });
  }

  function dropWormSeg(e) {
    if (!e.wormSegs) e.wormSegs = [];
    e.wormSegs.push({
      x: e.x,
      y: e.y,
      rot: e.rot || 0,
      r: 40 + Math.min(22, e.wormSegs.length * 0.7),
      sticky: true,
      life: 1.4
    });
  }

  function releaseWormSegs(e) {
    if (!e.wormSegs) return;
    for (var i = 0; i < e.wormSegs.length; i++) {
      e.wormSegs[i].sticky = false;
      e.wormSegs[i].life = 1.35;
    }
  }

  function tickWormSegs(state, e, dt) {
    if (!e.wormSegs) return;
    for (var i = e.wormSegs.length - 1; i >= 0; i--) {
      var seg = e.wormSegs[i];
      if (!seg.sticky) {
        seg.life -= dt;
        if (seg.life <= 0) {
          e.wormSegs.splice(i, 1);
          continue;
        }
      }
      if (e.contactCd <= 0 && Math.hypot(seg.x - state.squad.x, seg.y - state.squad.y) < (seg.r || 28) + 10) {
        e.contactCd = 0.18;
        hurtSquadArea(state, seg.x, seg.y, (seg.r || 28) + 8, Math.round(e.def.dmg * 0.85), e.x, e.y);
      }
    }
  }

  function sandBurst(state, x, y, n) {
    for (var i = 0; i < (n || 16); i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 50 + Math.random() * 140;
      state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30,
        life: 0.35 + Math.random() * 0.25,
        max: 0.55,
        size: 3 + Math.random() * 5,
        color: Math.random() > 0.5 ? "#c4a06a" : "#e8c070"
      });
    }
  }

  function tickWorm(state, e, target, dt) {
    var rage = G.invasion ? G.invasion.rage(e) : e.hp <= e.maxHp * 0.5;
    if (G.invasion) G.invasion.enterP2(state, e, "Arklan · tempestade");
    if (G.invasion && e.inv && G.invasion.tookP2Hook(e)) {
      e.stormT = 0.6;
      e.suckT = 8;
    }
    var p2 = !!(e.invP2);
    tickWormSegs(state, e, dt);
    if (p2) {
      e.stormT = (e.stormT == null ? 3.2 : e.stormT) - dt;
      if (e.stormT <= 0) {
        e.stormT = 4.2;
        var hole = pickPlay(state, 70);
        pushZone(state, { kind: "sandstorm", x: hole.x, y: hole.y, r: 70, t: 4.5, max: 4.5, dmg: 10, hurtPlayer: true, pull: 90 });
      }
      e.suckT = (e.suckT == null ? 11 : e.suckT) - dt;
      if (e.suckT <= 0 && e.wormAct !== "suck") {
        e.suckT = 16;
        e.wormAct = "suck";
        e.suckLeft = 4.5;
        var mid = G.playfield(state);
        e.x = (mid.x0 + mid.x1) / 2;
        e.y = (mid.y0 + mid.y1) / 2;
      }
    }
    if (e.wormAct === "suck") {
      e.suckLeft -= dt;
      var cx = e.x;
      var cy = e.y;
      var dx = cx - state.squad.x;
      var dy = cy - state.squad.y;
      var len = Math.hypot(dx, dy) || 1;
      state.squad.x += (dx / len) * 55 * dt;
      state.squad.y += (dy / len) * 55 * dt;
      if (Math.random() < 0.12) {
        var ang = Math.random() * Math.PI * 2;
        enemyFireAng(state, e, ang, "bullet", { speed: 180, r: 6, color: "#8a5a28", dmg: Math.round(e.def.dmg * 0.55) });
      }
      if (e.suckLeft <= 0) {
        e.wormAct = "";
        e.wormT = 1.2;
      }
      return;
    }
    e.wormlingT = (e.wormlingT == null ? 2.4 : e.wormlingT) - dt;
    if (e.wormlingT <= 0) {
      var worms = 0;
      for (var wi0 = 0; wi0 < state.enemies.length; wi0++) {
        if (state.enemies[wi0].hp > 0 && state.enemies[wi0].type === "minhoca_deserto") worms++;
      }
      e.wormlingT = rage ? 3.2 : 5.0;
      if (worms < 4) {
        var hole = pickPlay(state, 50);
        G.game.spawnAt(state, "minhoca_deserto", hole.x, hole.y, { noDrop: true, buried: true, sandT: 0.7, ownerId: e.id });
        sandBurst(state, hole.x, hole.y, 10);
        state.floaters.push(G.createFloater(hole.x, hole.y - 16, "minhoca", "#c4a06a"));
      }
    }
    if (e.wormAct === "dive") {
      if ((e.diveHold || 0) > 0) {
        e.diveHold -= dt;
        e.buried = true;
        e.stealth = 0.9;
        e.rot = (e.rot || 0) + dt * 8;
        if (e.diveHold <= 0) {
          e.diveDist = 0;
          e.segAcc = 0;
          sandBurst(state, e.x, e.y, 22);
        }
        return;
      }
      e.stealth = 0.55;
      e.buried = true;
      var pts = e.wormPath || [];
      if (pts.length < 3) {
        e.wormAct = "";
        e.buried = false;
        e.stealth = 0;
        return;
      }
      var total = e.diveLen || polyLen(pts);
      var spd = 1020;
      e.diveDist = (e.diveDist || 0) + spd * dt;
      var pos = pointOnPoly(pts, Math.min(total, e.diveDist));
      var moved = Math.hypot(pos.x - e.x, pos.y - e.y);
      e.x = pos.x;
      e.y = pos.y;
      e.rot = pos.ang;
      e.segAcc = (e.segAcc || 0) + moved;
      while (e.segAcc >= 28) {
        e.segAcc -= 28;
        dropWormSeg(e);
      }
      if (p2) {
        e.eyeShotT = (e.eyeShotT || 0) - dt;
        if (e.eyeShotT <= 0 && target && e.wormSegs && e.wormSegs.length) {
          e.eyeShotT = 0.2;
          var seg = e.wormSegs[(Math.random() * e.wormSegs.length) | 0];
          var ea = Math.atan2(target.y - seg.y, target.x - seg.x);
          enemyFireAng(state, e, ea, "bullet", {
            speed: 260,
            r: 4,
            color: "#ffd24a",
            dmg: Math.round(e.def.dmg * 0.45),
            ox: seg.x - e.x,
            oy: seg.y - e.y,
            muzzle: 0
          });
        }
      }
      if (e.contactCd <= 0 && Math.hypot(e.x - state.squad.x, e.y - state.squad.y) < 52) {
        e.contactCd = 0.14;
        hurtSquadArea(state, e.x, e.y, 54, Math.round(e.def.dmg * 0.9), e.x, e.y);
      }
      if (e.diveDist >= total) {
        e.buried = false;
        e.stealth = 0;
        e.wormAct = "";
        e.wormT = rage ? 0.75 : 1.0;
        releaseWormSegs(e);
        explode(state, e.x, e.y, 78, Math.round(e.def.dmg * 1.15), "enemy", "#c4a06a");
        sandBurst(state, e.x, e.y, 28);
        G.audio.explosion();
      }
      return;
    }
    if (e.wormAct === "spin") {
      var cx = (G.playfield(state).x0 + G.playfield(state).x1) / 2;
      var cy = (G.playfield(state).y0 + G.playfield(state).y1) / 2;
      if ((e.spinWind || 0) > 0) {
        e.spinWind -= dt;
        moveTowards(e, cx, cy, 450, dt);
        e.rot = (e.rot || 0) + dt * 4.2;
        if (e.spinWind <= 0 || Math.hypot(e.x - cx, e.y - cy) < 22) {
          e.x = cx;
          e.y = cy;
          e.spinWind = 0;
          e.spinTell = 0.48;
          e.wormSpinAng = -Math.PI / 2;
          e.wormSpinT = 0;
          e.rot = e.wormSpinAng;
        }
        return;
      }
      if ((e.spinTell || 0) > 0) {
        e.spinTell -= dt;
        e.x = cx;
        e.y = cy;
        e.wormSpinAng = -Math.PI / 2;
        e.rot = e.wormSpinAng;
        if (e.spinTell <= 0) {
          e.wormSpinT = 7.4;
          e.wormJetTick = 0;
        }
        return;
      }
      e.x = cx;
      e.y = cy;
      e.wormSpinT -= dt;
      var dir = e.wormSpinDir || 1;
      e.wormSpinAng = (e.wormSpinAng || -Math.PI / 2) + dir * 1.26 * dt;
      e.rot = e.wormSpinAng;
      var jets = e.wormJets || 1;
      var jlen = wormJetLen(state);
      e.wormJetTick = (e.wormJetTick || 0) - dt;
      if (e.wormJetTick <= 0) {
        e.wormJetTick = 0.07;
        for (var j = 0; j < jets; j++) {
          var ja = e.wormSpinAng + (j ? Math.PI : 0);
          hurtLane(state, e.x, e.y, ja, jlen, 40, Math.round(e.def.dmg * 0.55));
        }
      }
      if (e.wormSpinT <= 0) {
        e.wormAct = "";
        e.wormT = 0.9;
      }
      return;
    }
    if (e.wormAct === "spikes") {
      e.spikeWait = (e.spikeWait || 0) - dt;
      if (e.spikeWait <= 0 && !e.spikeDid) {
        e.spikeDid = true;
        var spots = e.spikeSpots || [];
        for (var p = 0; p < spots.length; p++) {
          G.game.spawnAt(state, "arklan_spike", spots[p].x, spots[p].y, { noDrop: true, pinOwner: e.id });
          sandBurst(state, spots[p].x, spots[p].y, 8);
        }
      }
      if (e.spikeWait <= -0.25) {
        e.wormAct = "";
        e.wormT = 1.05;
      }
      return;
    }
    e.buried = false;
    e.stealth = 0;
    moveTowards(e, target.x, target.y, 66, dt);
    e.wormT -= dt;
    if (e.wormT > 0) return;
    var wpool = p2 ? ["dive", "dive", "dive", "spin", "spikes"] : ["dive", "dive", "spin", "spikes"];
    if (e.wormLast) {
      var ww = [];
      for (var wi = 0; wi < wpool.length; wi++) if (wpool[wi] !== e.wormLast) ww.push(wpool[wi]);
      wpool = ww.length ? ww : wpool;
    }
    var wact = wpool[(Math.random() * wpool.length) | 0];
    e.wormLast = wact;
    if (wact === "dive") {
      var path = planWormDive(state, e, target);
      e.wormPath = path;
      e.diveLen = polyLen(path);
      e.wormAct = "dive";
      e.diveDist = 0;
      e.diveHold = p2 ? 0.22 : 0.4;
      e.segAcc = 0;
      e.wormSegs = [];
      e.buried = true;
      warnWormPath(state, path, 0.55);
      sandBurst(state, e.x, e.y, 18);
      return;
    }
    if (wact === "spin") {
      e.wormAct = "spin";
      e.spinWind = 0.48;
      e.spinTell = 0;
      e.wormSpinT = 0;
      e.wormSpinAng = -Math.PI / 2;
      e.wormSpinDir = Math.random() < 0.5 ? -1 : 1;
      e.wormJets = rage ? 2 : 1;
      return;
    }
    var spots = [];
    for (var sp = 0; sp < 5; sp++) {
      var angp = (Math.PI * 2 * sp) / 5 + e.phase;
      var rad = 36 + (sp % 2) * 22;
      spots.push({
        x: state.squad.x + Math.cos(angp) * rad,
        y: state.squad.y + Math.sin(angp) * rad
      });
    }
    e.wormAct = "spikes";
    e.spikeSpots = spots;
    e.spikeWait = 0.55;
    e.spikeDid = false;
    for (var sm = 0; sm < spots.length; sm++) {
      warnAt(state, { kind: "mark", x: spots[sm].x, y: spots[sm].y, t: 0.55, max: 0.55, r: 16, dmg: 0, color: "#6a4a22" });
    }
  }

  function tickSandWorm(state, e, target, dt, spd) {
    e.sandT = (e.sandT == null ? 0.8 : e.sandT) - dt;
    if (e.buried) {
      e.stealth = 0.72;
      moveTowards(e, target.x, target.y, spd * 2.4, dt);
      var close = dist(e, target) < 34;
      if (close || e.sandT <= 0) {
        e.buried = false;
        e.stealth = 0;
        e.sandT = 1.35;
        sandBurst(state, e.x, e.y, 12);
        if (close) {
          hurtSquadArea(state, e.x, e.y, 36, Math.round(e.def.dmg * 1.1), e.x, e.y);
        }
      }
      return;
    }
    chase(state, e, target, spd * 1.15, dt);
    var d = dist(e, target);
    if (e.contactCd <= 0 && d < (e.def.range || 26) + (target.def.size || 10)) {
      e.contactCd = 0.28;
      if (!(G.tactics && G.tactics.skipContact && G.tactics.skipContact(state, e))) {
        hurt(state, target, e.def.dmg, e.x, e.y);
      }
    }
    if (e.sandT <= 0) {
      e.buried = true;
      e.sandT = 0.55 + Math.random() * 0.35;
      sandBurst(state, e.x, e.y, 8);
    }
  }

  function fireMoonWaves(state, e) {
    var n = 10;
    for (var i = 0; i < n; i++) {
      var ang = (Math.PI * 2 * i) / n + e.phase;
      enemyFireAng(state, e, ang, "moonwave", {
        speed: 280,
        r: 12,
        dmg: Math.round(e.def.dmg * (e.fake ? 0.7 : 1.15)),
        life: 1.55,
        color: "#9ad8ff",
        hitsLeft: 3,
        exposed: true
      });
    }
  }

  function fireMoonSlash(state, e, target) {
    var ang = target ? Math.atan2(target.y - e.y, target.x - e.x) : (e.rot || 0);
    e.swordAng = ang;
    var spread = [-0.38, 0, 0.38];
    for (var i = 0; i < spread.length; i++) {
      enemyFireAng(state, e, ang + spread[i], "moonslash", {
        speed: 340,
        r: 18,
        dmg: Math.round(e.def.dmg * 1.35),
        life: 1.7,
        color: "#c8e8ff",
        hitsLeft: 6,
        slashLen: 92,
        exposed: true,
        muzzle: 18
      });
    }
  }

  function spawnMoonBurn(state, x, y) {
    pushZone(state, {
      kind: "moon_burn",
      x: x,
      y: y,
      r: 46,
      t: 5.5,
      max: 5.5,
      dmg: 16,
      hurtPlayer: true
    });
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
    if ((state.run.fluidT || 0) > 0) {
      state.run.fluidT -= dt;
      if (state.run.fluidT <= 0) state.run.tempDmg = 1;
    }
    if ((state.run.coilT || 0) > 0) {
      state.run.coilT -= dt;
      if (state.run.coilT <= 0) state.run.coilHp = 0;
    }
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
  var DASH_BOOST = 3.5;
  var DASH_DUR = 0.34;
  var DASH_CD = 1.05;
  var DASH_SLIDE = 0.22;
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
    if (state.paused || state.userPaused || state.stageOutro || state.defeat || (G.invasion && G.invasion.cinematic(state))) return false;
    if (state.timeLock && state.timeLock.phase !== "release") return false;
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
    state.dashCoast = false;
    state.dashSlideT = 0;
    spawnDashBurst(state, "#7ec8ff");
    return true;
  }

  function squadSpeedMul(state) {
    var speedMul = state.run.speed * (1 + (G.save.data.perm.speed | 0) * 0.06) * (state.run.tempSpeed || 1);
    if (state.aura) speedMul *= 1 + state.aura.speed;
    if (state.aura && state.aura.slowSquad) speedMul *= Math.max(0.55, 1 - state.aura.slowSquad);
    if (G.tactics && G.tactics.speedMul) speedMul *= G.tactics.speedMul(state);
    if ((state.honeyT || 0) > 0) speedMul *= 0.42;
    return speedMul;
  }

  function dashWalkFactor(state) {
    if (state.dashCoast) return DASH_BOOST;
    var max = state.dashTMax || DASH_DUR;
    var p = 1 - Math.max(0, Math.min(1, (state.dashT || 0) / max));
    var peak = DASH_BOOST;
    var bite = peak * 1.16;
    if (p < 0.15) {
      var a = p / 0.15;
      a *= a;
      return 1.2 + (peak - 1.2) * a;
    }
    if (p < 0.52) return peak;
    if (p < 0.66) {
      var b = (p - 0.52) / 0.14;
      b = b * b * (3 - 2 * b);
      return peak + (bite - peak) * b;
    }
    var c = (p - 0.66) / 0.34;
    c = 1 - (1 - c) * (1 - c) * (1 - c);
    return bite + (1 - bite) * c;
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
    var host = null;
    for (var i = 0; i < state.units.length; i++) {
      if (state.units[i].commander && state.units[i].hp > 0) host = state.units[i];
    }
    var hx = host ? host.x : state.squad.x;
    var hy = host ? host.y : state.squad.y;
    var hs = host && host.def ? host.def.size : 14;
    state.particles.push({
      x: hx,
      y: hy,
      vx: -dir.x * 22,
      vy: -dir.y * 22,
      life: 0.24,
      max: 0.24,
      size: Math.max(5.5, hs * 0.72),
      color: (host && host.def && host.def.color) || "#7ec8ff",
      streak: true,
      ang: ang
    });
  }

  function steerSquad(state, dt) {
    if (state.dashCd > 0) state.dashCd = Math.max(0, state.dashCd - dt);
    state.dashStep = null;
    if (state.stageOutro || state.timeLock || (G.invasion && G.invasion.cinematic(state))) {
      state.dashActive = false;
      state.dashT = 0;
      state.dashSlideT = 0;
      return;
    }
    var b = G.playfield(state);
    if (state.pointer && state.pointer.moveSquad && (state.dashT || 0) <= 0) {
      state.dashActive = false;
      state.dashSlideT = 0;
      return;
    }
    var speedMul = squadSpeedMul(state);
    if ((state.honeyPin || 0) > 0) {
      state.honeyPin = Math.max(0, state.honeyPin - dt);
      speedMul *= 0.12;
    }
    if (squadPinned(state)) {
      state.dashT = 0;
      state.dashSlideT = 0;
      state.dashActive = false;
      state.squad.vx = 0;
      state.squad.vy = 0;
      return;
    }
    var walkSp = SQUAD_SPEED * speedMul;
    var vx = 0;
    var vy = 0;
    state.dashStep = null;
    state.dashActive = false;
    if ((state.dashT || 0) > 0) {
      var dir = state.dashDir || { x: 0, y: -1 };
      var sp = walkSp * dashWalkFactor(state);
      vx = dir.x * sp;
      vy = dir.y * sp;
      state.dashActive = true;
      spawnDashTrail(state, dt);
      state.dashT = Math.max(0, state.dashT - dt);
      if (state.dashT <= 0 && !state.dashCoast) {
        var mdEnd = readMoveDir(state);
        if (!mdEnd.moving) {
          state.dashSlideT = DASH_SLIDE;
          state.dashSlideMax = DASH_SLIDE;
          state.dashSlideFrom = walkSp;
        }
      }
    } else if ((state.dashSlideT || 0) > 0) {
      var mdSlide = readMoveDir(state);
      if (mdSlide.moving) {
        vx = mdSlide.x * walkSp;
        vy = mdSlide.y * walkSp;
        state.dashSlideT = 0;
      } else {
        var slideMax = state.dashSlideMax || DASH_SLIDE;
        var u = 1 - Math.max(0, state.dashSlideT) / slideMax;
        u = u * u * (3 - 2 * u);
        var from = state.dashSlideFrom || walkSp;
        var slideSp = from * (1 - u);
        var sdir = state.dashDir || { x: 0, y: -1 };
        vx = sdir.x * slideSp;
        vy = sdir.y * slideSp;
        state.dashSlideT = Math.max(0, state.dashSlideT - dt);
      }
    } else {
      var md = readMoveDir(state);
      if (md.moving) {
        vx = md.x * walkSp;
        vy = md.y * walkSp;
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
    var wasStowing = !!state.dashStowing;
    if (state.dashActive) {
      if (!wasStowing) {
        for (var st = 0; st < soldiers.length; st++) {
          var su = soldiers[st];
          if (su.held) continue;
          if (G.tactics && G.tactics.holdingLeap && G.tactics.holdingLeap(su)) continue;
          G.burst(state, su.x, su.y, su.def.color || "#7ec8ff", 7, 55);
          su.leap = null;
          su.leapZ = 0;
        }
      }
      state.dashStowing = true;
    } else if (wasStowing) {
      state.dashStowing = false;
      state.dashPopT = 0.2;
      G.burst(state, state.squad.x, state.squad.y, "#c8e8ff", 10, 70);
      for (var po = 0; po < soldiers.length; po++) {
        if (!soldiers[po].held) soldiers[po].popT = 0.16;
      }
    }
    if (state.dashPopT > 0) state.dashPopT = Math.max(0, state.dashPopT - dt);

    var si = 0;
    for (var j = 0; j < alive.length; j++) {
      var u = alive[j];
      if (u.activeHeld) {
        /* banner planted: CD does not tick */
      } else if (u.activeCd > 0) u.activeCd -= dt;
      if (u.activeFlash > 0) u.activeFlash -= dt;
      if (u.throwT > 0) u.throwT -= dt;
      if (u.veilFogT > 0) u.veilFogT -= dt;
      if (u.exposedT > 0) u.exposedT -= dt;
      var ox = u.x;
      var oy = u.y;
      if (u.held || u.detached) {
        u.stowed = false;
        u.packed = false;
        if (u.detached) {
          u.vx = (u.x - ox) / Math.max(dt, 0.008);
          u.vy = (u.y - oy) / Math.max(dt, 0.008);
        } else {
          u.vx = 0;
          u.vy = 0;
        }
        continue;
      }
      if (u.popT > 0) u.popT = Math.max(0, u.popT - dt);
      var tx;
      var ty;
      if (u.commander) {
        u.stowed = false;
        u.packed = !!state.dashActive;
        u.x = state.squad.x;
        u.y = state.squad.y;
        u.vx = state.squad.vx || 0;
        u.vy = state.squad.vy || 0;
      } else if (G.tactics && G.tactics.holdingLeap && G.tactics.holdingLeap(u)) {
        u.stowed = false;
        u.packed = false;
        u.vx = (u.x - ox) / Math.max(dt, 0.008);
        u.vy = (u.y - oy) / Math.max(dt, 0.008);
      } else if (state.dashActive) {
        u.stowed = true;
        u.packed = false;
        u.leap = null;
        u.leapZ = 0;
        u.x = state.squad.x;
        u.y = state.squad.y;
        u.vx = state.squad.vx || 0;
        u.vy = state.squad.vy || 0;
        si++;
      } else {
        u.stowed = false;
        u.packed = false;
        var slot = soldierSlot(si, soldiers.length);
        si++;
        if (u.leap) {
          u.vx = (u.x - ox) / Math.max(dt, 0.008);
          u.vy = (u.y - oy) / Math.max(dt, 0.008);
        } else {
          tx = state.squad.x + slot.x;
          ty = state.squad.y + slot.y;
          var pb = G.playfield(state);
          var m = u.def.size || 12;
          tx = Math.max(pb.x0 + m, Math.min(pb.x1 - m, tx));
          ty = Math.max(pb.y0 + m, Math.min(pb.y1 - m, ty));
          var dx = tx - u.x;
          var dy = ty - u.y;
          var spd = u.def.speed * speedMul;
          if (u.veilFogT > 0) spd *= 0.62;
          var follow = Math.max(6.5, spd / 28);
          if (state.dashPopT > 0) follow = Math.max(follow, 14);
          if (state.stageOutro && state.stageOutro.phase === "march") {
            follow = 10;
            face(u, u.x, u.y - 40, dt);
          }
          u.x += dx * Math.min(1, dt * follow);
          u.y += dy * Math.min(1, dt * follow);
          u.vx = (u.x - ox) / Math.max(dt, 0.008);
          u.vy = (u.y - oy) / Math.max(dt, 0.008);
        }
      }
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
    if (cmd) {
      cmd.x = state.squad.x;
      cmd.y = state.squad.y;
    }
    if (state.aura && state.aura.heal > 0 && lowest) {
      lowest.hp = Math.min(lowest.maxHp, lowest.hp + state.aura.heal * dt);
    }
  }

  function playerShoot(state, dt) {
    if (G.tactics && G.tactics.playerShoot) G.tactics.playerShoot(state, dt);
  }

  function nearestHostile(state, from) {
    var best = null;
    var bestD = 1e9;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0 || e.stolen || (from && e.id === from.id)) continue;
      var d = dist(from, e);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function detonateStolen(state, e) {
    if (!e || e.stolenBoom) return;
    e.stolenBoom = true;
    var r = 58 + (e.def.size || 12);
    var dmg = Math.max(52, Math.round((e.maxHp || 40) * 0.4 + (e.def.dmg || 12) * 3.2));
    e.hp = 0;
    e.noDrop = true;
    explode(state, e.x, e.y, r, dmg, "player", "#c86a3a");
    G.audio.explosion();
    state.floaters.push(G.createFloater(e.x, e.y - 16, "boom", "#c86a3a"));
  }

  function updateEnemies(state, dt) {
    if (G.invasion && G.invasion.cinematic(state)) return;
    var units = state.units;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0) continue;
      e.phase += dt;
      e.cooldown -= dt;
      e.burstCd -= dt;
      e.contactCd -= dt;
      e.lastHitT = (e.lastHitT || 0) + dt;
      if (e.revealT > 0) e.revealT = Math.max(0, e.revealT - dt);
      if (e.slowT > 0) e.slowT -= dt;
      if (e.drunkT > 0) e.drunkT -= dt;
      if (e.freezeT > 0) e.freezeT -= dt;
      if (e.silenceT > 0) {
        e.silenceT -= dt;
        e.cooldown += dt;
        e.burstCd += dt;
      }
      if (e.silenceImmuneT > 0) e.silenceImmuneT -= dt;
      if (e.fearImmuneT > 0) {
        e.fearImmuneT -= dt;
        if (e.fearImmuneT <= 0) e.fearUsed = false;
      }
      if (e.obsMarkT > 0) e.obsMarkT -= dt;
    if (e.burnT > 0) {
        e.burnT -= dt;
        if (!e.stolen) {
        hurt(state, e, (e.burnDps || 8) * dt, e.x, e.y, true, { trueDmg: true });
        if (e.burnT <= 0) e.burnDps = 0;
        } else {
          e.burnT = 0;
          e.burnDps = 0;
        }
      }
      if (e.bleedT > 0) {
        e.bleedT -= dt;
        var bleedTick = (e.bleedDps || 6) * dt;
        hurt(state, e, bleedTick, e.x, e.y, true, { trueDmg: true });
        if (G.tactics && G.tactics.healSquad) G.tactics.healSquad(state, bleedTick);
        else {
          for (var hi = 0; hi < state.units.length; hi++) {
            var hu = state.units[hi];
            if (hu.hp <= 0) continue;
            hu.hp = Math.min(hu.maxHp, hu.hp + bleedTick);
          }
        }
        if (e.bleedT <= 0) e.bleedDps = 0;
      }
      if (e.reconMarkT > 0) {
        e.reconMarkT -= dt;
        if (e.reconMarkT <= 0) {
          e.reconMarkT = 0;
          e.reconMark = 0;
          e.reconDarts = [];
        }
      }
      if (!e.stolen && G.tactics && G.tactics.tickConfuse && G.tactics.tickConfuse(state, e, dt)) continue;
      var target;
      if (e.stolen) {
        e.stolenT = (e.stolenT || 0) - dt;
        if (e.stolenT <= 0) {
          detonateStolen(state, e);
          continue;
        }
        target = nearestHostile(state, e);
        if (!target) {
          var sqd = dist(e, state.squad);
          if (sqd > 68) moveTowards(e, state.squad.x, state.squad.y, (e.def.speed || 50) * 0.75, dt);
          continue;
        }
      } else {
        target = nearest(units, e.x, e.y);
        if (G.tactics && G.tactics.enemyTarget) {
          var bait = G.tactics.enemyTarget(state, e);
          if (bait) target = bait;
        }
        if (G.tactics && G.tactics.enemyAim) target = G.tactics.enemyAim(state, e, target);
      }
      if (!target) {
        if (e.def.kind !== "nest") continue;
        target = { x: state.squad.x, y: state.squad.y, def: { size: 12 }, hp: 1, id: -1 };
      }
      var d = dist(e, target);
      if (!(e.spinMode > 0 || e.seqMode > 0 || e.wormAct === "spin" || e.vultoAct === "strafe" || e.buried)) {
        face(e, target.x, target.y, dt);
      }
      var kind = e.def.kind;
      var spd = e.def.speed;
      if ((e.moraleT || 0) > 0) {
        e.moraleT -= dt;
        spd *= e.moraleSpd || 1.22;
      }
      if ((e.eliteDrop || e.type === "fuzileiro_elite" || e.type === "batedor_elite" || e.type === "pistoleiro_elite") && !e.evolved) {
        e.evoT = (e.evoT || 0) + dt;
        if (e.evoT >= 28) evolveAlien(state, e);
      }

      if (isInvasaoMinion(state, e) && !e.stolen) {
        var host = invasaoHost(state, e);
        var eliteKind = kind === "alien_elite_rifle" || kind === "alien_veteran" || kind === "alien_elite_scout" || kind === "alien_infiltrator" || kind === "alien_elite_pistol" || kind === "alien_field_medic";
        if (host && !eliteKind && wantHealRetreat(e)) {
          retreatBehindBoss(state, e, host, dt, spd);
          if (!e.attached && !(e.ricoLeft > 0)) G.clampPlay(e, state);
          continue;
        }
        if ((e.justHealed || 0) > 0) {
          e.justHealed -= dt;
          spd *= 1.5;
        }
      }

      if (kind === "melee") {
        chase(state, e, target, spd, dt);
        if (d < e.def.range + target.def.size && e.contactCd <= 0) {
          e.contactCd = 0.32;
          if (!e.stolen && G.tactics && G.tactics.skipContact && G.tactics.skipContact(state, e)) {
            /* frontal armor */
          } else if (isDecoy(e)) applyVeilNuisance(state, target, e);
          else {
            hurt(state, target, e.def.dmg, e.x, e.y, !!e.stolen);
            G.audio.hit();
          }
        }
      } else if (kind === "ranged" || kind === "cryo") {
        var prefer = e.def.prefer || 160;
        if (e.rushMinion) prefer = 110;
        if (d < prefer - 30) moveTowards(e, e.x * 2 - target.x, e.y * 2 - target.y, spd * (e.rushMinion ? 0.45 : 1), dt);
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
          explode(state, e.x, e.y, 52, e.def.dmg, e.stolen ? "player" : "enemy");
          e.hp = 0;
          G.audio.explosion();
        }
      } else if (kind === "healer") {
        if (e.stolen) {
          var woundedP = null;
          var worstP = 1;
          for (var hpi = 0; hpi < state.units.length; hpi++) {
            var pal = state.units[hpi];
            if (pal.hp <= 0 || pal.stowed) continue;
            var ratioP = pal.hp / pal.maxHp;
            if (ratioP < worstP) {
              worstP = ratioP;
              woundedP = pal;
            }
          }
          if (woundedP && worstP < 0.95) {
            moveTowards(e, woundedP.x, woundedP.y, spd, dt);
            if (dist(e, woundedP) < 55 && e.cooldown <= 0) {
              e.cooldown = 0.8;
              woundedP.hp = Math.min(woundedP.maxHp, woundedP.hp + 10);
              woundedP.healGlow = 0.7;
              if (G.healFx) G.healFx(state, woundedP.x, woundedP.y);
              G.burst(state, woundedP.x, woundedP.y, "#3dff7a", 8, 45);
            }
          } else {
            chase(state, e, target, spd, dt);
          }
        } else {
        var wounded = null;
        var worst = 1;
        for (var h = 0; h < state.enemies.length; h++) {
          var ally = state.enemies[h];
          if (ally.hp <= 0 || ally.id === e.id || ally.def.kind === "healer" || ally.stolen) continue;
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
            if (G.invasion) G.invasion.heal(wounded, 10);
            else wounded.hp = Math.min(wounded.maxHp, wounded.hp + 10);
            wounded.healGlow = 0.7;
            if (G.healFx) G.healFx(state, wounded.x, wounded.y);
            G.burst(state, wounded.x, wounded.y, "#3dff7a", 8, 45);
          }
        } else {
          moveTowards(e, e.x * 2 - target.x, e.y * 2 - target.y, spd, dt);
        }
        }
      } else if (kind === "artillery") {
        var prefA = e.def.prefer || 250;
        if (e.rushMinion) prefA = 160;
        if (d < prefA - 40) moveTowards(e, e.x * 2 - target.x, e.y * 2 - target.y, spd * (e.rushMinion ? 0.4 : 1), dt);
        else if (d > prefA + 40) moveTowards(e, target.x, target.y, spd * 0.6, dt);
        if (e.cooldown <= 0 && (e.silenceT || 0) <= 0) {
          e.cooldown = 1 / e.def.fire;
          state.warnings.push({ x: target.x, y: target.y, t: 0.85, max: 0.85, r: 42, dmg: e.def.dmg, team: e.stolen ? "player" : "enemy" });
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
            else hurt(state, target, e.def.dmg, e.x, e.y, !!e.stolen);
          }
        }
      } else if (kind === "sniper") {
        var prefS = e.def.prefer || 240;
        if (e.rushMinion) prefS = 150;
        if (d < prefS - 40) moveTowards(e, e.x * 2 - target.x, e.y * 2 - target.y, spd * (e.rushMinion ? 0.4 : 1), dt);
        else if (d > prefS + 30) moveTowards(e, target.x, target.y, spd, dt);
        if (e.cooldown <= 0 && d <= e.def.range) {
          e.cooldown = 1 / e.def.fire;
          enemyFire(state, e, target);
        }
      } else if (kind === "nest") {
        if (e.nestCharging) {
          chase(state, e, target, 102, dt);
          var toSquad = Math.hypot(e.x - state.squad.x, e.y - state.squad.y);
          if (d < 36 + (target.def.size || 12) || toSquad < 80) {
            explode(state, e.x, e.y, 68, e.def.dmg || 56, "enemy");
            e.hp = 0;
            G.audio.explosion();
          }
        } else {
          e.spawnT -= dt;
          if (e.spawnT <= 0) {
            e.spawnT = 0.72;
            if ((e.nestStock || 0) > 0) {
              e.nestStock--;
              G.game.spawnAt(state, "larva", e.x + (Math.random() - 0.5) * 28, e.y + (Math.random() - 0.5) * 28, { noDrop: true });
              if (e.nestStock <= 0) e.nestCharging = true;
            } else {
              e.nestCharging = true;
            }
          }
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
        } else if ((e.flingT || 0) > 0) {
          e.flingT -= dt;
          e.x += (e.flingVx || 0) * dt;
          e.y += (e.flingVy || 0) * dt;
          e.rot = Math.atan2(e.flingVy || 0, e.flingVx || 0);
          G.clampPlay(e, state);
          if (!e.flingHit) {
            for (var fu = 0; fu < units.length; fu++) {
              var ut = units[fu];
              if (ut.hp <= 0 || ut.stowed) continue;
              var fd = dist(e, ut);
              if (fd < e.def.size + ut.def.size + 4) {
                e.flingHit = true;
                hurt(state, ut, host.def.dmg, e.x, e.y);
                G.burst(state, e.x, e.y, "#ffe08a", 10, 80);
                e.flingT = 0;
                e.flingBack = true;
                break;
              }
            }
          }
          if (e.flingT <= 0) e.flingBack = true;
        } else if (e.flingBack) {
          var nOrbR = Math.max(1, countOrbitShields(state, e.orbitHost));
          var slotR = e.orbitIndex || 0;
          var oangR = -Math.PI / 2 + (slotR / nOrbR) * Math.PI * 2 + e.phase * 1.35;
          var oradR = host.def.size + 30;
          var hxR = host.x + Math.cos(oangR) * oradR;
          var hyR = host.y + Math.sin(oangR) * oradR;
          var bx = hxR - e.x;
          var by = hyR - e.y;
          var bl = Math.sqrt(bx * bx + by * by);
          if (bl < 10) {
            e.flingBack = false;
            e.x = hxR;
            e.y = hyR;
          } else {
            e.x += (bx / bl) * 280 * dt;
            e.y += (by / bl) * 280 * dt;
          }
          e.rot = oangR;
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
        if (G.invasion) G.invasion.enterP2(state, e, "Kaska perde a carapaça");
        if (G.invasion && e.inv && G.invasion.tookP2Hook(e)) {
          e.shellOff = true;
          e.shieldLockT = 0;
          spawnDuskShields(state, e);
          G.game.spawnAt(state, "kaska_sentry", e.x + 40, e.y, { noDrop: true });
        }
        if (e.invP2) {
          if (G.invasion.countType(state, "kaska_sentry") < 1) {
            e.sentryT = (e.sentryT == null ? 4 : e.sentryT) - dt;
            if (e.sentryT <= 0) {
              e.sentryT = 10;
              G.game.spawnAt(state, "kaska_sentry", e.x + 36, e.y, { noDrop: true });
            }
          }
        }
        if (e.shieldLockT > 0) e.shieldLockT -= dt;
        if (!e.shieldInited) {
          e.shieldInited = true;
          spawnDuskShields(state, e);
        }
        var crossed = Math.floor((1 - e.hp / e.maxHp) / 0.2);
        if (crossed > (e.shieldBand || 0)) {
          e.shieldBand = crossed;
          if (!spawnDuskShields(state, e)) e.shieldPending = true;
        }
        if (e.shieldPending && spawnDuskShields(state, e)) e.shieldPending = false;
        e.skillT -= dt;
        if (e.spinMode > 0) {
          var spinSpd = Math.PI * 2 / 1.25;
          var drot = (e.spinMode === 1 ? spinSpd : -spinSpd) * dt;
          e.rot = (e.rot || 0) + drot;
          e.spinAcc = (e.spinAcc || 0) + Math.abs(drot);
          e.spinShotT = (e.spinShotT || 0) - dt;
          if (e.spinShotT <= 0) {
            e.spinShotT = 0.07;
            enemyFireAng(state, e, e.rot, "bullet");
            enemyFireAng(state, e, e.rot + Math.PI, "bullet", { dmg: Math.round(e.def.dmg * 0.7) });
          }
          if (e.spinAcc >= Math.PI * 2) {
            if (e.spinMode === 1) {
              e.spinMode = 2;
              e.spinAcc = 0;
            } else {
              e.spinMode = 0;
              e.spinAcc = 0;
              e.skillT = 4.2;
              e.cooldown = 1.2;
            }
          }
        } else if ((e.throwWindup || 0) > 0) {
          e.throwWindup -= dt;
          e.rot = Math.atan2(target.y - e.y, target.x - e.x);
          if (e.throwWindup <= 0) {
            flingCascaShields(state, e, target);
            e.skillT = 3.6;
          }
        } else if ((e.chargeWindup || 0) > 0) {
          e.chargeWindup = Math.max(0, e.chargeWindup - dt);
          var cAng = e.chargeAim || Math.atan2(target.y - e.y, target.x - e.x);
          e.rot = cAng;
          e.flash = Math.max(e.flash || 0, 0.1);
          e.x -= Math.cos(cAng) * 40 * dt;
          e.y -= Math.sin(cAng) * 40 * dt;
          G.clampPlay(e, state);
          if (e.chargeWindup <= 0) {
            var cSp = e.invP2 ? 720 : 520;
            var end = rayExitPlay(G.playfield(state), e.x, e.y, Math.cos(cAng), Math.sin(cAng), 20);
            e.vx = Math.cos(cAng) * cSp;
            e.vy = Math.sin(cAng) * cSp;
            e.cascaDashT = e.invP2 ? Math.max(0.35, end.dist / cSp) : 0.48;
          }
        } else if ((e.cascaDashT || 0) > 0) {
          e.cascaDashT -= dt;
          e.x += (e.vx || 0) * dt;
          e.y += (e.vy || 0) * dt;
          e.rot = Math.atan2(e.vy || 0, e.vx || 1);
          G.clampPlay(e, state);
          if (d < e.def.size + target.def.size + 6 && e.contactCd <= 0) {
            e.contactCd = 0.2;
            if (!(G.tactics && G.tactics.skipContact && G.tactics.skipContact(state, e))) {
              hurt(state, target, Math.round(e.def.dmg * 1.25), e.x, e.y);
            }
          }
          if (e.cascaDashT <= 0) e.skillT = 3.2;
        } else if ((e.seqWindup || 0) > 0) {
          e.seqWindup = Math.max(0, e.seqWindup - dt);
          if (target) e.rot = Math.atan2(target.y - e.y, target.x - e.x);
          e.flash = Math.max(e.flash || 0, 0.12);
          if (e.seqWindup <= 0) startCascaSpin(e);
        } else if ((e.seqBurst || 0) > 0) {
          if (target) e.rot = Math.atan2(target.y - e.y, target.x - e.x);
          e.seqBurstT = (e.seqBurstT || 0) - dt;
          if (e.seqBurstT <= 0) {
            e.seqBurst--;
            e.seqBurstT = 0.11;
            enemyFireAng(state, e, e.rot, "bullet", { muzzle: e.def.size * 0.9 });
            enemyFireAng(state, e, e.rot + Math.PI, "bullet", { dmg: Math.round(e.def.dmg * 0.75), muzzle: e.def.size * 0.9 });
          }
        } else if (e.seqMode > 0) {
          var seqSpd = Math.PI * 2 / 0.95;
          var sdrot = seqSpd * dt;
          e.rot = (e.rot || 0) + sdrot;
          e.seqAcc = (e.seqAcc || 0) + sdrot;
          e.seqShotT = (e.seqShotT || 0) - dt;
          if (e.seqShotT <= 0) {
            e.seqShotT = 0.08;
            enemyFireAng(state, e, e.rot, "bullet", { muzzle: e.def.size * 0.9 });
            enemyFireAng(state, e, e.rot + Math.PI, "bullet", { dmg: Math.round(e.def.dmg * 0.75), muzzle: e.def.size * 0.9 });
          }
          if (e.seqAcc >= Math.PI * 2) {
            e.seqMode = 0;
            e.seqAcc = 0;
            e.cooldown = 1.15;
          }
        } else {
          moveTowards(e, state.squad.x, state.squad.y, spd, dt);
          if (e.skillT <= 0 && target) pickCascaSkill(state, e, target);
          if (e.cooldown <= 0 && target && e.spinMode <= 0 && (e.throwWindup || 0) <= 0 && (e.chargeWindup || 0) <= 0) {
            e.cascaVolley = (e.cascaVolley || 0) + 1;
            e.cooldown = 1.25;
            if (e.cascaVolley >= 3) {
              e.cascaVolley = 0;
              e.seqWindup = 0.85;
              e.seqWindupMax = 0.85;
              warnAt(state, {
                kind: "spin",
                x: e.x,
                y: e.y,
                t: 0.85,
                max: 0.85,
                r: (e.def.size || 32) + 42,
                dmg: 0,
                color: "#ffd24a",
                followId: e.id
              });
              state.floaters.push(G.createFloater(e.x, e.y - 28, "giro", "#ffd24a"));
            } else {
              e.seqBurst = 4;
              e.seqBurstT = 0;
            }
          }
        }
      } else if (kind === "boss_charge") {
        e.miniT -= dt;
        if (e.miniT <= 0) {
          e.miniT = e.enrage ? 14 : 30;
          G.game.spawnAt(state, "mini_beemote", e.x + 40, e.y, { noDrop: false });
          if (e.enrage) G.game.spawnAt(state, "mini_beemote", e.x - 36, e.y + 10, { noDrop: false });
          state.floaters.push(G.createFloater(e.x, e.y - 24, e.enrage ? "enxame" : "cria", "#ffb070"));
        }
        if (e.enrage) {
          e.honeyT = (e.honeyT || 4) - dt;
          if (e.honeyT <= 0 && (e.chargeWindup || 0) <= 0 && e.ricoLeft <= 0) {
            e.honeyT = 5.5;
            warnAt(state, { kind: "mark", x: state.squad.x, y: state.squad.y, t: 0.45, max: 0.45, r: 42, dmg: 0, color: "#e8c050", followSquad: true });
            e.honeyShot = 0.45;
            state.floaters.push(G.createFloater(e.x, e.y - 24, "mel", "#e8c050"));
          }
          if ((e.honeyShot || 0) > 0) {
            e.honeyShot -= dt;
            if (e.honeyShot <= 0) {
              enemyFire(state, e, { x: state.squad.x, y: state.squad.y }, "honey", { speed: 240, r: 8, dmg: 4, color: "#e8c050", life: 1.2 });
            }
          }
        }
        var charging = e.ricoLeft > 0 || e.chargeT > 1.35;
        if ((e.chargeWindup || 0) > 0) {
          e.chargeWindup = Math.max(0, e.chargeWindup - dt);
          var wAng = e.chargeAim || 0;
          e.rot = wAng;
          e.flash = Math.max(e.flash || 0, 0.1);
          e.x -= Math.cos(wAng) * 55 * dt;
          e.y -= Math.sin(wAng) * 55 * dt;
          G.clampPlay(e, state);
          if (e.chargeWindup <= 0) {
            var dashSp = e.chargeRico ? 680 + Math.random() * 80 : (e.enrage ? 860 : 780) + Math.random() * 80;
            e.vx = Math.cos(wAng) * dashSp;
            e.vy = Math.sin(wAng) * dashSp;
            if (e.chargeRico) {
              e.ricoLeft = 5;
              e.chargeRico = false;
            }
            e.chargeT = 1.9;
            charging = true;
          }
        } else if (e.ricoLeft > 0) {
          var rsp = Math.sqrt(e.vx * e.vx + e.vy * e.vy) || 1;
          var rwob = Math.sin(e.phase * 22) * 22 + Math.sin(e.phase * 9) * 10;
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
            var spB = Math.sqrt(e.vx * e.vx + e.vy * e.vy) || 700;
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
            ) + (Math.random() - 0.5) * 0.12;
            e.chargeAim = aim;
            e.chargeWindup = e.enrage ? 0.55 : 0.9;
            e.chargeWindupMax = e.chargeWindup;
            e.chargeRico = e.chargeCount >= 5;
            if (e.chargeRico) e.chargeCount = 0;
            e.chargeT = 0.05;
            e.rot = aim;
            state.floaters.push(G.createFloater(e.x, e.y - 36, e.chargeRico ? "ricochete" : "investida", "#ff6a3a"));
          }
          charging = e.ricoLeft > 0 || e.chargeT > 1.35;
          if (e.ricoLeft <= 0 && e.chargeT > 1.35) {
            var dsp = Math.sqrt(e.vx * e.vx + e.vy * e.vy) || 1;
            var dwob = Math.sin(e.phase * 26) * 16;
            e.x += e.vx * dt + (-e.vy / dsp) * dwob * dt;
            e.y += e.vy * dt + (e.vx / dsp) * dwob * dt;
            e.rot = Math.atan2(e.vy, e.vx);
          } else if (e.ricoLeft <= 0 && !charging && (e.chargeWindup || 0) <= 0) {
            var angH = e.phase * 0.9;
            var stand = 145 + Math.sin(e.phase * 1.4) * 36;
            var fig8x = Math.sin(e.phase * 3.2) * 58;
            var fig8y = Math.sin(e.phase * 6.4) * 30;
            var bzX = Math.sin(e.phase * 28) * 20 + Math.cos(e.phase * 17) * 10;
            var bzY = Math.cos(e.phase * 31) * 16;
            var hx = target.x + Math.cos(angH) * stand + fig8x + bzX;
            var hy = target.y + Math.sin(angH) * stand * 0.6 + fig8y + bzY;
            moveTowards(e, hx, hy, spd * 1.65, dt);
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
        if (G.invasion) G.invasion.enterP2(state, e, "Fortilax · ninho aberto");
        if (G.invasion && e.inv && G.invasion.tookP2Hook(e)) {
          e.sentryT = 0.8;
          e.cannonT = 1.4;
          e.tpT = 3;
        }
        if (e.invP2) {
          e.sentryT = (e.sentryT || 2.5) - dt;
          e.cannonT = (e.cannonT || 1.8) - dt;
          e.tpT = (e.tpT || 6) - dt;
          if (e.sentryT <= 0) {
            e.sentryT = 5.5;
            var spot = pickPlay(state, 50);
            G.game.spawnAt(state, "kaska_sentry", spot.x, spot.y, { noDrop: true });
          }
          if (e.cannonT <= 0 && target) {
            e.cannonT = 2.2;
            warnAt(state, { kind: "acid", x: target.x, y: target.y, t: 0.7, max: 0.7, r: 48, dmg: Math.round(e.def.dmg * 1.4), color: "#c45cff" });
            warnAt(state, { kind: "acid", x: target.x + 50, y: target.y, t: 0.85, max: 0.85, r: 36, dmg: Math.round(e.def.dmg), color: "#ff7a2a" });
          }
          e.molotovT = (e.molotovT || 2.6) - dt;
          if (e.molotovT <= 0 && target) {
            e.molotovT = 3.5;
            for (var mv = 0; mv < 3; mv++) {
              var mx = target.x + (Math.random() - 0.5) * 90;
              var my = target.y + (Math.random() - 0.5) * 90;
              warnAt(state, { kind: "acid", x: mx, y: my, t: 0.55 + mv * 0.12, max: 0.7, r: 32, dmg: Math.round(e.def.dmg * 0.9), color: "#ff7a2a" });
              pushZone(state, { kind: "napalm", x: mx, y: my, r: 34, t: 3.4, max: 3.4, dmg: 14, hurtPlayer: true });
            }
          }
          if (e.tpT <= 0) {
            e.tpT = 7;
            var dest = pickPlay(state, 60);
            warnAt(state, { kind: "mark", x: dest.x, y: dest.y, t: 0.35, max: 0.35, r: 40, dmg: 0, color: "#c45cff" });
            e.x = dest.x;
            e.y = dest.y;
          }
        }
        if (e.lastHitT > 4.8) {
          e.parked = true;
          if (G.invasion) G.invasion.heal(e, e.maxHp * 0.005 * dt);
          else e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.005 * dt);
          for (var al = 0; al < state.enemies.length; al++) {
            var ally = state.enemies[al];
            if (ally.hp <= 0 || ally.id === e.id) continue;
            if (dist(e, ally) < 150) {
              if (G.invasion) G.invasion.heal(ally, ally.maxHp * 0.005 * dt);
              else ally.hp = Math.min(ally.maxHp, ally.hp + ally.maxHp * 0.005 * dt);
            }
          }
        } else {
          e.parked = false;
        }
        if (!e.parked) moveTowards(e, state.squad.x, state.squad.y, spd * 0.6, dt);
        e.spawnT -= dt;
        if (e.spawnT <= 0) {
          e.spawnT = 3;
          var any = G.ENEMY_POOL[(Math.random() * G.ENEMY_POOL.length) | 0];
          var spawned = G.game.spawnAt(state, any, e.x + (Math.random() - 0.5) * 70, e.y + (Math.random() - 0.5) * 70, { noDrop: true });
          applyNestBuff(spawned);
          var tag = spawned.nestBuff === "speed" ? "buff vel" : spawned.nestBuff === "dmg" ? "buff dano" : "buff tiro";
          state.floaters.push(G.createFloater(spawned.x, spawned.y - 14, tag, "#ffd24a"));
        }
        e.fuseT = (e.fuseT == null ? 6.5 : e.fuseT) - dt;
        if (e.fuseT <= 0) {
          e.fuseT = 7.5;
          fuseNestUnits(state, e);
        }
        if (e.cooldown <= 0 && d < e.def.range) {
          e.cooldown = 1 / e.def.fire;
          enemyFire(state, e, target);
        }
      } else if (kind === "boss_veil") {
        if (e.type === "chefe_espectro" && !e.fake && e.inv) {
          if (G.invasion) G.invasion.enterP2(state, e, "Moonlight permanente");
          if (G.invasion && G.invasion.tookP2Hook(e)) {
            e.moonLock = true;
            e.moonEnergy = 100;
            e.veilAct = "sword";
            e.swordT = 1.4;
            e.sweepT = 5;
          }
          e.moonEnergy = 100;
        }
        e.stealth = 0.45 + Math.sin(e.phase * 2) * 0.2;
        if (e.type === "chefe_espectro" && !e.fake && !e.helperOf) {
          if (!e.veilClone50 && (e.hp <= e.maxHp * 0.5 || e.p2)) {
            e.veilClone50 = true;
            spawnVeilClone(state, e, 0);
            spawnVeilClone(state, e, 1);
            spawnVeilClone(state, e, 2);
            state.banner = { text: "Trindade lunar", t: 1.8 };
          }
          e.moonEnergy = Math.min(100, (e.moonEnergy || 0) + dt * 7.2);
          e.moonBurnT = (e.moonBurnT == null ? 2.8 : e.moonBurnT) - dt;
          if (e.moonBurnT <= 0) {
            e.moonBurnT = 3.6;
            var spot = pickPlay(state, 70);
            spawnMoonBurn(state, spot.x, spot.y);
            warnAt(state, { kind: "mark", x: spot.x, y: spot.y, t: 0.45, max: 0.45, r: 46, dmg: 0, color: "#9ad8ff" });
          }
        }
        if ((e.tpWindup || 0) > 0) {
          e.tpWindup -= dt;
          if (e.tpDest) {
            e.rot = Math.atan2(e.tpDest.y - e.y, e.tpDest.x - e.x);
          }
          if (e.tpWindup <= 0) {
            var boomOn = !!e.tpBoom;
            if (e.tpDest) {
              e.x = e.tpDest.x;
              e.y = e.tpDest.y;
              G.clampPlay(e, state);
            }
            if (boomOn) {
              var fakeTp = !!(e.fake || e.decoy);
              explode(state, e.x, e.y, fakeTp ? 96 : 124, fakeTp ? 22 : 42, "enemy", "#9ad8ff");
              G.audio.explosion();
            } else {
              G.burst(state, e.x, e.y, "#9ad8ff", 16, 90);
            }
            e.tpDest = null;
            e.tpBoom = false;
          }
        } else if (e.veilAct === "sweep") {
          e.sweepWind = (e.sweepWind || 0) - dt;
          if (e.sweepWind <= 0 && !e.sweepDid) {
            e.sweepDid = true;
            var bS = G.playfield(state);
            var pad = 42;
            var onEdge =
              state.squad.x < bS.x0 + pad ||
              state.squad.x > bS.x1 - pad ||
              state.squad.y < bS.y0 + pad ||
              state.squad.y > bS.y1 - pad;
            if (!onEdge) hurtSquadArea(state, state.squad.x, state.squad.y, 90, Math.round(e.def.dmg * 2.6), e.x, e.y);
            G.burst(state, (bS.x0 + bS.x1) / 2, (bS.y0 + bS.y1) / 2, "#9ad8ff", 36, 180);
            state.shake = Math.max(state.shake || 0, 10);
          }
          if (e.sweepWind <= -0.35) {
            e.veilAct = "sword";
            e.swordT = 1.2;
            e.swordDid = false;
            e.sweepT = 7.5;
          }
        } else if (e.veilAct === "sword") {
          e.swordT = (e.swordT || 0) - dt;
          if (target) e.swordAng = Math.atan2(target.y - e.y, target.x - e.x);
          e.rot = e.swordAng || e.rot;
          if ((e.swordT || 0) <= 0.85 && !e.swordDid) {
            e.swordDid = true;
            fireMoonSlash(state, e, target);
            e.swordVolley = 0.38;
          }
          if ((e.swordVolley || 0) > 0) {
            e.swordVolley -= dt;
            if (e.swordVolley <= 0) fireMoonSlash(state, e, target);
          }
          if ((e.swordT || 0) <= 0) {
            if (e.moonLock) {
              e.sweepT = (e.sweepT == null ? 6 : e.sweepT) - 1.2;
              if (e.sweepT <= 0) {
                e.veilAct = "sweep";
                e.sweepWind = 1.15;
                e.sweepDid = false;
                state.banner = { text: "Fuja pras bordas", t: 1.8 };
                state.floaters.push(G.createFloater(e.x, e.y - 26, "varredura lunar", "#9ad8ff"));
              } else {
                e.swordT = 1.2;
                e.swordDid = false;
                fireMoonWaves(state, e);
              }
            } else {
              e.veilAct = "";
              e.cooldown = 1.8;
              e.moonEnergy = 0;
            }
          }
        } else if (e.veilAct === "moon") {
          var mid = {
            x: (G.playfield(state).x0 + G.playfield(state).x1) / 2,
            y: (G.playfield(state).y0 + G.playfield(state).y1) / 2
          };
          moveTowards(e, mid.x, mid.y, 90, dt);
          e.moonWind = (e.moonWind || 0) - dt;
          if (e.moonWind <= 0 && !e.moonDid) {
            e.moonDid = true;
            fireMoonWaves(state, e);
            e.moonVolley = 0.42;
          }
          if ((e.moonVolley || 0) > 0) {
            e.moonVolley -= dt;
            if (e.moonVolley <= 0) fireMoonWaves(state, e);
          }
          if (e.moonWind <= -0.5) {
            e.veilAct = "";
            e.cooldown = 2.0;
          }
        } else if (e.cooldown <= 0) {
          if (!e.fake && !e.helperOf && (e.moonEnergy || 0) >= 100) {
            e.veilAct = "sword";
            e.swordT = 1.35;
            e.swordDid = false;
            e.moonEnergy = 100;
            warnAt(state, { kind: "mark", x: e.x, y: e.y, t: 0.5, max: 0.5, r: 70, dmg: 0, color: "#9ad8ff" });
            state.floaters.push(G.createFloater(e.x, e.y - 26, "Moonlight Sword", "#9ad8ff"));
            state.banner = { text: "Moonlight Sword", t: 1.6 };
          } else {
            e.cooldown = e.fake ? 1.8 : 2.2;
            e.tpCount = (e.tpCount || 0) + 1;
            var boom = e.tpCount >= (e.nextBoom || 4);
            if (boom) {
              e.tpCount = 0;
              e.nextBoom = 3 + ((Math.random() * 4) | 0);
              var dest = veilBehindPoint(state, e, e.fake ? ((e.cloneSlot | 0) * 0.72 - 0.36) : 0, e.helperOf ? 118 : 0);
              e.tpDest = dest;
              e.tpBoom = true;
              e.tpWindup = 0.72;
              warnAt(state, { kind: "tp", x: dest.x, y: dest.y, t: 0.72, max: 0.72, r: 124, dmg: 0, color: "#9ad8ff" });
              warnAt(state, { kind: "tp", x: e.x, y: e.y, t: 0.72, max: 0.72, r: 70, dmg: 0, color: "#9ad8ff" });
              state.floaters.push(G.createFloater(e.x, e.y - 26, "salto", "#9ad8ff"));
            } else {
              veilBlink(state, e, target, false);
            }
          }
        }
        if (e.burstCd <= 0 && e.veilAct !== "moon" && e.veilAct !== "sword" && (e.tpWindup || 0) <= 0) {
          e.burstCd = e.fake ? 0.55 : 0.62;
          enemyFire(state, e, target, "moonwave", {
            r: e.fake ? 8 : 9,
            speed: 300,
            dmg: Math.round(e.def.dmg * (e.fake ? 0.75 : 1)),
            color: "#9ad8ff",
            exposed: true,
            life: 1.25
          });
        }
      } else if (kind === "boss_invasao") {
        tickInvasao(state, e, target, dt, spd);
      } else if (kind === "alien_rifle" || kind === "alien_scout" || kind === "alien_pistol") {
        tickAlienRifle(state, e, target, dt, spd);
      } else if (kind === "alien_elite_rifle" || kind === "alien_veteran") {
        tickEliteRifle(state, e, target, dt, spd);
      } else if (kind === "alien_elite_scout" || kind === "alien_infiltrator") {
        tickEliteScout(state, e, target, dt, spd);
      } else if (kind === "alien_elite_pistol" || kind === "alien_field_medic") {
        tickEliteMedic(state, e, target, dt, spd);
      } else if (kind === "heal_station") {
        tickHealStation(state, e, dt);
      } else if (kind === "light_bender") {
        tickLightBender(state, e, target, dt, spd);
      } else if (kind === "bonfire") {
        tickBonfire(state, e, dt);
      } else if (kind === "kaska_sentry") {
        tickSentry(state, e, target, dt);
      } else if (kind === "boss_princess") {
        tickPrincess(state, e, target, dt, spd);
      } else if (kind === "bee_nurse") {
        tickNurse(state, e, dt, spd);
      } else if (kind === "bee_architect") {
        tickArchitect(state, e, dt);
      } else if (kind === "hive_wall") {
        e.vx = e.vy = 0;
      } else if (kind === "mini_antlion") {
        tickAntlion(state, e, target, dt, spd);
      } else if (kind === "mini_bomber") {
        tickBomber(state, e, target, dt, spd);
      } else if (kind === "mini_mantis") {
        tickMantis(state, e, target, dt, spd);
      } else if (kind === "boss_vulto") {
        tickVulto(state, e, target, dt, spd);
      } else if (kind === "boss_king") {
        tickKing(state, e, target, dt, spd);
      } else if (kind === "boss_worm") {
        tickWorm(state, e, target, dt);
      } else if (kind === "sand_worm") {
        tickSandWorm(state, e, target, dt, spd);
      } else if (kind === "pin_spike") {
        e.rot = (e.rot || 0) + dt * 0.5;
      } else if (kind === "boss_final") {
        var phase = e.bossPhase || 1;
        if (phase === 2) e.stealth = Math.max(0.2, (e.stealth || 0) - dt * 0.15);
        var coreSpd = phase === 1 ? 16 : phase === 2 ? 26 : 38;
        if (phase < 3) {
          moveTowards(e, state.squad.x, state.squad.y, coreSpd, dt);
          if (e.cooldown <= 0) {
            e.burstLeft = 4;
            e.cooldown = 1.4;
          }
          if (e.burstLeft > 0 && e.burstCd <= 0) {
            enemyFire(state, e, target, "bullet", { r: 5, dmg: e.def.dmg, speed: 280 });
            e.burstLeft--;
            e.burstCd = 0.1;
          }
        } else {
          e.coreHealT -= dt;
          if (e.coreHealT <= 0) {
            e.coreHealT = 9;
            if (G.invasion) G.invasion.heal(e, e.maxHp * 0.04);
            else e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.04);
            G.burst(state, e.x, e.y, "#7cffb0", 10, 50);
          }
          e.coreSummonT -= dt;
          e.coreActT = (e.coreActT || 0) - dt;
          var act = e.coreAct || "wait";
          if (act === "wait") {
            moveTowards(e, state.squad.x, state.squad.y, coreSpd, dt);
            if (e.coreActT <= 0 || d < 90) pickCoreAct(state, e, d);
          } else if (act === "tp") {
            if (!e.coreActDid) {
              e.coreActDid = true;
              var b3 = G.playfield(state);
              e.x = b3.x0 + 40 + Math.random() * (b3.x1 - b3.x0 - 80);
              e.y = b3.y0 + 40 + Math.random() * (b3.y1 - b3.y0 - 80);
              G.burst(state, e.x, e.y, "#fff36a", 28, 150);
              if (G.boomFx) G.boomFx(state, e.x, e.y, 110, "#fff36a");
            }
            if (e.coreActT <= 0) beginCoreAct(e, "wait", 0.95);
          } else if (act === "ray") {
            if (!e.coreActDid && target) {
              e.coreActDid = true;
              var base = Math.atan2(target.y - e.y, target.x - e.x);
              enemyFireAng(state, e, base - 0.2, "laser", { speed: 500, dmg: 26, r: 8, life: 1.35 });
              enemyFireAng(state, e, base + 0.2, "laser", { speed: 500, dmg: 26, r: 8, life: 1.35 });
            }
            if (e.coreActT <= 0) beginCoreAct(e, "wait", 0.8);
          } else if (act === "burst") {
            moveTowards(e, state.squad.x, state.squad.y, coreSpd * 0.45, dt);
            if (e.burstLeft > 0 && e.burstCd <= 0) {
              enemyFire(state, e, target, "bullet", { r: 10, dmg: Math.round(e.def.dmg * 1.15), speed: 320 });
              e.burstLeft--;
              e.burstCd = 0.16;
            }
            if (e.coreActT <= 0) beginCoreAct(e, "wait", 0.75);
          } else if (act === "boom") {
            if (!e.coreActDid) {
              e.coreActDid = true;
              state.warnings.push({ x: state.squad.x, y: state.squad.y, t: 1.1, max: 1.1, r: 132, dmg: 58 });
              var spread = 128;
              for (var wa = 0; wa < 2; wa++) {
                var wang = (Math.PI * 2 * wa) / 2 + e.phase;
                state.warnings.push({
                  x: state.squad.x + Math.cos(wang) * spread,
                  y: state.squad.y + Math.sin(wang) * spread,
                  t: 1.2,
                  max: 1.2,
                  r: 86,
                  dmg: 40
                });
              }
            }
            if (e.coreActT <= 0) beginCoreAct(e, "wait", 0.55);
          } else if (act === "summon") {
            if (!e.coreActDid) {
              e.coreActDid = true;
              coreSummonLegion(state, e);
            }
            if (e.coreActT <= 0) beginCoreAct(e, "wait", 0.85);
          } else {
            beginCoreAct(e, "wait", 0.6);
          }
        }
      }

      if (e.fused && target && (e.fuseCd || 0) <= 0 && d < (e.def.range || 140) + 40) {
        e.fuseCd = 0.85;
        enemyFire(state, e, target, e.fuseShot || "bullet", { r: 4, speed: 280, dmg: Math.round(e.def.dmg * 0.7) });
      } else if (e.fused) {
        e.fuseCd = (e.fuseCd || 0) - dt;
      }

      if (!e.attached && !(e.ricoLeft > 0) && kind !== "orbit_shield" && kind !== "pin_spike" && e.vultoAct !== "strafe" && e.wormAct !== "dive" && !e.buried) G.clampPlay(e, state);
    }
    separateBodies(state.enemies, state, true);
  }

  function updateProjectiles(state, dt) {
    if (G.tactics && G.tactics.preProjectiles) G.tactics.preProjectiles(state, dt);
    for (var i = state.projectiles.length - 1; i >= 0; i--) {
      var p = state.projectiles[i];
      if (p.arc || p.orbitBoss) continue;
      if (p.held) continue;
      if (state.timeLock && p.team === "player") continue;
      if (p.kind === "dropshot" && p.z != null) {
        p.z = Math.max(0, p.z - dt * 320);
        p.life -= dt;
        if (p.z > 0 && p.life > 0) continue;
        explode(state, p.x, p.y, p.boomR || 22, p.dmg, "enemy", "#c8ff6a");
        state.projectiles.splice(i, 1);
        continue;
      }
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
        if (p.kind === "missile") explode(state, p.x, p.y, p.boomR || 72, p.dmg, p.team);
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
        if (!unitHittable(t) || p.hitIds[t.id]) continue;
        var rad = t.def.size + p.r;
        if (p.kind === "moonslash") rad += 16;
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
      if (p.exposed && hit.team === "player") {
        var wasEx = hit.exposedT || 0;
        hit.exposedT = Math.max(wasEx, 4);
        if (wasEx <= 0.2) state.floaters.push(G.createFloater(hit.x, hit.y - 14, "exposto", "#ffe08a"));
      }
      if (p.kind === "honey" && hit.team === "player") {
        state.honeyT = Math.max(state.honeyT || 0, 3.4);
        pushZone(state, { kind: "honey", x: hit.x, y: hit.y, r: 46, t: 4.5, max: 4.5, hurtPlayer: false });
      }
      if (p.fake || p.dmg <= 0) {
        if (p.team === "enemy" && hit.team === "player") applyVeilNuisance(state, hit, p);
        p.hitIds[hit.id] = 1;
        p.hitsLeft--;
        if (p.hitsLeft <= 0) state.projectiles.splice(i, 1);
        continue;
      }
      if (p.kind === "grenade" || p.kind === "missile" || p.kind === "crate") explode(state, p.x, p.y, p.kind === "missile" ? (p.boomR || 72) : (p.boomR || 52), p.dmg, p.team);
      else {
        hurt(state, hit, p.dmg, p.x, p.y, p.team === "player");
        if (p.kind === "ice") hit.slowT = Math.max(hit.slowT, 1.4);
      }
      p.hitIds[hit.id] = 1;
      p.hitsLeft--;
      if ((p.enemyBounce || 0) > 0 && p.team === "player") {
        var next = null;
        var nextD = 150;
        for (var nb = 0; nb < state.enemies.length; nb++) {
          var ne = state.enemies[nb];
          if (ne.hp <= 0 || ne.id === hit.id || p.hitIds[ne.id]) continue;
          var nd = dist(p, ne);
          if (nd < nextD) {
            nextD = nd;
            next = ne;
          }
        }
        if (next) {
          p.enemyBounce--;
          p.dmg = Math.round(p.dmg * (p.bounceMul || 3));
          p.hitsLeft = Math.max(p.hitsLeft, 1);
          var nx = next.x - p.x;
          var ny = next.y - p.y;
          var nl = Math.sqrt(nx * nx + ny * ny) || 1;
          var nsp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 320;
          p.vx = (nx / nl) * nsp;
          p.vy = (ny / nl) * nsp;
          p.life = Math.max(p.life, 0.55);
          continue;
        }
      }
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
      if (m.retiring) {
        m.retireT -= dt;
        if (m.retireT <= 0) state.mines.splice(i, 1);
        continue;
      }
      if (m.life <= 0) {
        if (G.tactics && G.tactics.beginRetire) G.tactics.beginRetire(state, m, 0.5);
        else {
          m.retiring = true;
          m.retireT = 0.5;
          m.retireMax = 0.5;
          G.burst(state, m.x, m.y, "#f0c422", 7, 36);
        }
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
      if (w.followLag) {
        w.x += (state.squad.x - w.x) * Math.min(1, dt * w.followLag);
        w.y += (state.squad.y - w.y) * Math.min(1, dt * w.followLag);
      }
      if (w.followSquad) {
        w.x = state.squad.x;
        w.y = state.squad.y;
      }
      if (w.followId) {
        var fol = findEnemy(state, w.followId);
        if (fol && fol.hp > 0) {
          w.x = fol.x;
          w.y = fol.y;
        }
      }
      w.t -= dt;
      if (w.t > 0) continue;
      if (w.kind === "acid") {
        explode(state, w.x, w.y, w.r, w.dmg, "enemy", w.color || "#8ad422");
        G.audio.explosion();
        pushZone(state, { kind: "acid", x: w.x, y: w.y, r: (w.r || 62) * 0.92, t: 4.2, max: 4.2, dmg: 12, hurtPlayer: true });
        for (var au = 0; au < state.units.length; au++) {
          var uu = state.units[au];
          if (uu.hp <= 0) continue;
          if (Math.hypot(uu.x - w.x, uu.y - w.y) <= (w.r || 62) + 8) uu.poisonT = Math.max(uu.poisonT || 0, 4);
        }
      } else if (w.kind === "mark" || w.kind === "lane" || w.kind === "cone" || w.kind === "tp" || w.kind === "spin") {
        /* telegraph only */
      } else if (w.kind === "drop" || w.dropShot) {
        var drop = G.createProjectile({
          x: w.x,
          y: w.y,
          vx: 0,
          vy: 0,
          dmg: w.dmg || 14,
          team: "enemy",
          kind: "dropshot",
          life: 0.28,
          r: 7,
          color: "#c8ff6a"
        });
        drop.z = 86;
        drop.fallTo = 0;
        drop.fallHit = true;
        drop.boomR = 22;
        state.projectiles.push(drop);
        G.audio.hit();
      } else if (w.kind === "airstrike") {
        explode(state, w.x, w.y, w.r || 48, w.dmg || 24, "enemy", w.color || "#ffb45a");
        G.audio.explosion();
      } else if (w.kind !== "mark") {
        explode(state, w.x, w.y, w.r, w.dmg, w.team || "enemy", w.color);
        G.audio.explosion();
      }
      state.warnings.splice(i, 1);
    }
  }

  function pickupRadius(state) {
    return state.vacuumLoot ? 45 : 35;
  }

  function applyDrop(state, d) {
    if (G.tactics && G.tactics.pickupDrop && G.tactics.pickupDrop(state, d)) return true;
    if (d.kind === "coin") {
      state.run.coins += d.value || 1;
      G.audio.coin();
      state.floaters.push(G.createFloater(d.x, d.y, "+" + (d.value || 1), "#ffd24a"));
      return true;
    }
    if (d.kind === "unit") {
      var kind = d.unitKind || "recruta";
      if (G.codex) G.codex.unlockUnit(kind);
      G.merge.addArquivo(state, d.x, d.y);
      return true;
    }
    return false;
  }

  function updateDrops(state, dt) {
    var magnet = 70 + state.run.magnet + (G.save.data.perm.magnet | 0) * 18 + ((state.aura && state.aura.magnet) || 0);
    for (var i = state.drops.length - 1; i >= 0; i--) {
      var d = state.drops[i];
      d.t += dt;
      if (d.life == null) d.life = 15;
      if (d.maxLife == null) d.maxLife = 15;
      if (!state.vacuumLoot) {
        d.life -= dt;
        if (d.life <= 0) {
          state.drops.splice(i, 1);
          continue;
        }
      }
      var dx = state.squad.x - d.x;
      var dy = state.squad.y - d.y;
      var dist2 = dx * dx + dy * dy;
      var mag = d.kind === "hp" ? 40 : magnet;
      if (state.vacuumLoot) mag = 8000;
      var banner = G.tactics && G.tactics.inBanner && G.tactics.inBanner(state, d.x, d.y);
      if (banner) dist2 = 0;
      if (dist2 < mag * mag && !banner) {
        var len = Math.sqrt(dist2) || 1;
        var pull = state.vacuumLoot ? 420 : 260;
        var step = Math.min(pull * dt, len);
        d.x += (dx / len) * step;
        d.y += (dy / len) * step;
        dx = state.squad.x - d.x;
        dy = state.squad.y - d.y;
        dist2 = dx * dx + dy * dy;
      }
      if (dist2 < pickupRadius(state) * pickupRadius(state) || banner) {
        applyDrop(state, d);
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
      if (state.enemies[n].healGlow > 0) state.enemies[n].healGlow = Math.max(0, state.enemies[n].healGlow - dt);
    }
    if (state.booms) {
      for (var bi = state.booms.length - 1; bi >= 0; bi--) {
        state.booms[bi].t -= dt;
        if (state.booms[bi].t <= 0) state.booms.splice(bi, 1);
      }
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

  function skillNoticePos(state) {
    var sx = state.squad.x;
    var sy = state.squad.y;
    var top = sy;
    var bot = sy;
    for (var i = 0; i < state.units.length; i++) {
      var un = state.units[i];
      if (un.hp <= 0 || un.stowed) continue;
      var s = (un.def && un.def.size) || 12;
      var uy = un.y - s - 10;
      var ly = un.y + s + 16;
      if (uy < top) top = uy;
      if (ly > bot) bot = ly;
    }
    var y = top - 28;
    var b = G.playfield(state);
    if (b) {
      if (y < b.y0 + 22) y = Math.min(b.y1 - 22, bot + 26);
      else y = Math.max(b.y0 + 22, Math.min(b.y1 - 22, y));
      sx = Math.max(b.x0 + 48, Math.min(b.x1 - 48, sx));
    }
    return { x: sx, y: y };
  }

  function pushSkillNotice(state, id, title, color) {
    var pos = skillNoticePos(state);
    state.vfx = state.vfx || [];
    for (var i = state.vfx.length - 1; i >= 0; i--) {
      if (state.vfx[i].notice) state.vfx.splice(i, 1);
    }
    state.vfx.push({
      id: id,
      title: title,
      x: pos.x,
      y: pos.y,
      t: 1.25,
      max: 1.25,
      color: color || "#ffd24a",
      notice: true
    });
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
    var tgt = aimTarget(state, u) || aimGhost(state);
    var handled = G.tactics && G.tactics.useActive && G.tactics.useActive(state, id, u);
    if (!handled) {
      if (id === "mark") {
        u.marked = 4 * sm;
      } else if (id === "napalm") {
        var hold = u.def.range;
        var rMul = u.kind === "lanca_chamas" ? 2 * sm : 1.85 * sm;
        u.def.range = hold * rMul;
        flameAt(state, u, tgt, { burnMul: u.kind === "lanca_chamas" ? 2 * sm : 1, napalm: true });
        var nang = Math.atan2(tgt.y - u.y, tgt.x - u.x);
        if (G.tactics && G.tactics.meltCone) {
          G.tactics.meltCone(state, { chance: 1, unit: u, range: u.def.range, ang: nang });
        }
        var nrange = u.def.range * (1 + (state.run.flame || 0) * 0.12);
        for (var np = 1; np <= 5; np++) {
          var nd = nrange * (np / 5.6);
          pushZone(state, {
            kind: "napalm",
            x: u.x + Math.cos(nang) * nd,
            y: u.y + Math.sin(nang) * nd,
            r: 18 + np * 3,
            t: 2.6,
            max: 2.6,
            dmg: Math.round(u.def.dmg * 0.95 * dmgMul(state)),
            whiteHot: true
          });
        }
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
          if (mine.team !== "player" || mine.charged || mine.retiring) continue;
          mine.charged = true;
          mine.r = (mine.r || 36) * chMul;
          mine.dmg = Math.round((mine.dmg || 20) * chMul);
          charged++;
          G.burst(state, mine.x, mine.y, "#fff3b0", 8, 40);
        }
        if (!charged) state.floaters.push(G.createFloater(u.x, u.y - 10, "sem minas", "#d4c46a"));
      }
    }
    G.audio.wave();
    var stackTxt = pack.length > 1 ? " ×" + pack.length : "";
    var title = u.def.active.name + stackTxt;
    if (id === "firemode") {
      var modes = ["Fuzil", "Granada", "Barragem"];
      title = "Modo de tiro · " + (modes[state.tankFireMode || 0] || "Fuzil");
    }
    pushSkillNotice(state, id, title, meta.color);
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
      if (state.honeyT > 0) state.honeyT = Math.max(0, state.honeyT - dt);
      var hasVulto = false;
      for (var vt = 0; vt < (state.enemies || []).length; vt++) {
        if (state.enemies[vt].hp > 0 && state.enemies[vt].type === "chefe_vulto") hasVulto = true;
      }
      if (!hasVulto) {
        if (G.invasion && G.invasion.firesAlive(state)) {
          state.vultoDark = Math.max(state.vultoDark || 0, 0.85);
        } else {
          state.vultoDark = Math.max(0, (state.vultoDark || 0) - dt * 0.65);
          if (state.vultoBlind > 0) state.vultoBlind = Math.max(0, state.vultoBlind - dt);
        }
      }
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
      if (G.invasion && G.invasion.cinematic(state)) {
        G.invasion.tickCutscene(state, dt);
        updateFx(state, dt);
        if (state.vfx) {
          for (var cv = 0; cv < state.vfx.length; cv++) state.vfx[cv].t -= dt;
          state.vfx = state.vfx.filter(function (fx) { return fx.t > 0; });
        }
        state.shake *= Math.max(0, 1 - dt * 2.4);
        return;
      }
      if (state.timeLock) {
        tickTimeLock(state, dt);
        if (state.timeLock && state.timeLock.phase === "release") updateSquad(state, dt);
        updateProjectiles(state, dt);
        updateWarnings(state, dt);
        updateFx(state, dt);
        if (state.vfx) {
          for (var lv = 0; lv < state.vfx.length; lv++) state.vfx[lv].t -= dt;
          state.vfx = state.vfx.filter(function (fx) { return fx.t > 0; });
        }
        state.shake *= Math.max(0, 1 - dt * 2.2);
        return;
      }
      updateSquad(state, dt);
      if (G.tactics && G.tactics.update) G.tactics.update(state, dt);
      playerShoot(state, dt);
      updateEnemies(state, dt);
      if (G.tactics && G.tactics.shieldPhysics) G.tactics.shieldPhysics(state);
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
    applyDrop: applyDrop,
    dashCd: function () { return DASH_CD; }
  };
})(window.TFAG = window.TFAG || {});
