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
    if (!u || u.hp <= 0 || u.stowed || u.stolen) return false;
    if (u.fallen || u.phased) return false;
    if (u.scenery && u.immortal) return false;
    return true;
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
        if (a.type === "hive_pillar" || b.type === "hive_pillar") continue;
        if (a.type === "hive_cell" || b.type === "hive_cell") continue;
        if (a.type === "hive_cocoon" || b.type === "hive_cocoon") continue;
        if (a.type === "hive_flower" || b.type === "hive_flower") continue;
        if (a.fallen || b.fallen) continue;
        if (a.phased || b.phased) continue;
        if (a.kingAct === "charge" || b.kingAct === "charge") continue;
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
      if (clampEach && a.wormAct !== "dive" && a.vultoAct !== "strafe" && a.princessAct !== "thrust" && a.princessAct !== "hellish" && !kaskaAirborne(a)) G.clampPlay(a, state);
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
    if (unit.type === "fogueira" && unit.glinderCoal) {
      unit.flash = 0.06;
      return;
    }
    if (unit.immortal) {
      unit.flash = 0.06;
      G.burst(state, unit.x, unit.y, "#ffe08a", 3, 28);
      return;
    }
    if (unit.team === "enemy" && (unit.irwinIFrame || 0) > 0) {
      unit.flash = 0.06;
      return;
    }
    if (state.timeLock && unit.team === "player") {
      if (state.timeLock.phase !== "slow") return;
      if (state.dashActive || (state.dashT || 0) > 0) return;
    }
    if (unit.team === "player" && state.debugFight && state.debugOpts && state.debugOpts.god) {
      unit.flash = 0.06;
      return;
    }
    if (unit.team === "player" && (state.dashActive || (state.dashT || 0) > 0) && !(opts && opts.ignoreDash)) {
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
        if ((state.royalMarkT || 0) > 0) amount *= 1.28;
        if ((unit.exposedT || 0) > 0) amount *= 1.35;
      }
    } else {
      unit.lastHitT = 0;
      if (fromPlayer && !trueDmg && unit.type === "beeprincess" && unit.princessAct === "honeymoon") {
        if (G.invasion) G.invasion.heal(unit, amount);
        else unit.hp = Math.min(unit.maxHp, unit.hp + amount);
        unit.healGlow = 0.28;
        unit.flash = 0.08;
        G.burst(state, unit.x, unit.y, "#ffe08a", 8, 50);
        return;
      }
      if ((unit.reconMarkT || 0) > 0 && (unit.reconMark || 0) > 0) {
        amount *= 1 + Math.min(15, unit.reconMark) * 0.01;
      }
      if (unit.parked) amount *= 0.4;
      if (unit.kaskaVuln || unit.kaskaStep === "stun") amount *= 1.35;
      if (unit.type === "chefe_final" && unit.bossPhase === 1 && findEnemy(state, unit.guardianId)) {
        if (unit.contactCd <= 0) {
          unit.contactCd = 0.5;
          state.floaters.push(G.createFloater(unit.x, unit.y - 18, "protegido", "#e05cff"));
        }
        return;
      }
      if (fromPlayer && unit.type === "chefe_megatanque" && hiveLinked(state)) {
        amount *= 0.5;
      }
      if (fromPlayer && unit.type === "chefe_beeking" && (unit.kingWardT || 0) > 0) {
        amount *= 0.58;
      }
      if (unit.kingStun || unit.hiveVuln) amount *= 1.35;
    }
    unit.hp -= amount;
    if (unit.team === "enemy" && unit.hp <= 0 && G.invasion && !unit.p2 && G.invasion.barCount(unit) >= 2) {
      unit.hp = 1;
    }
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
      if (doKnock && srcX != null && unit.type !== "arklan_spike" && !unit.scenery) {
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
      if (unit.type === "chefe_vulto" && !unit.glinderDying) {
        startGlinderDeath(state, unit);
        return;
      }
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
    if (e.type === "hive_cell") {
      hiveTriggerCell(state, e, true);
    }
    if (e.type === "chefe_megatanque" || e.type === "chefe_beeking") {
      if (G.invasion && G.invasion.enraged(state, 3)) {
        e.hp = 1;
        e.fallen = true;
        e.immortal = true;
        e.scenery = true;
        e.noDrop = true;
        e.queenAct = "";
        e.kingAct = "";
        e.vx = e.vy = 0;
        hiveKingClearGhosts(e);
      }
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
      if (kingLeft && kingLeft.hp > 0 && !kingLeft.fallen) {
        kingLeft.enrage = true;
        kingLeft.kingMode = "knight";
        kingLeft.kingAct = "";
        kingLeft.chargeWindup = 0;
        kingLeft.chargeChain = 0;
        hiveKingClearGhosts(kingLeft);
        kingLeft.chargeCd = Math.max(kingLeft.chargeCd || 0, 1.15);
        kingLeft.kingT = 0.4;
        state.banner = { text: "O rei não recua", t: 2.1 };
        state.floaters.push(G.createFloater(kingLeft.x, kingLeft.y - 28, "cavaleiro", "#ffe08a"));
      }
      if (G.invasion) G.invasion.maybePrincess(state);
    }
    if (e.type === "chefe_beeking") {
      var queen = findEnemy(state, e.queenId);
      if (queen && queen.hp > 0 && !queen.fallen) {
        queen.enrage = true;
        queen.miniT = Math.min(queen.miniT || 30, 8);
        queen.colorShift = 1;
        queen.skillT = 0.35;
        queen.queenAct = "";
        queen.laserOn = 0;
        queen.laserSweeping = false;
        queen.lastQueen = "";
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
        var alreadyBurning = (e.burnT || 0) > 0.2;
        var hit = alreadyBurning ? Math.max(1, Math.round(dmg * 0.45)) : dmg;
        hurt(state, e, hit, u.x, u.y, true);
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
        homing: !!extra.homing,
        boomR: extra.boomR || 0,
        burn: !!extra.burn
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
    var n = (e.p2 || e.invP2 || e.shellOff) ? 6 : 4;
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
      if (glinderCoverHidesPoint(state, x, y, u.x, u.y)) continue;
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

  var KASKA_ARROW_R = [8, 13, 18];

  function kaskaNum(v, fb) {
    var n = Number(v);
    return isFinite(n) ? n : fb;
  }

  function kaskaHornR(v) {
    var r = kaskaNum(v, 10);
    if (!(r > 0)) r = 10;
    return Math.min(r, 20);
  }

  function kaskaWarn(state, opt) {
    var t = kaskaNum(opt.t, 0.4);
    if (!(t > 0)) t = 0.4;
    opt.t = t;
    opt.max = t;
    if (opt.r != null) {
      var r = kaskaNum(opt.r, 40);
      if (!(r > 0)) r = 40;
      var rCap = opt.rCap != null ? kaskaNum(opt.rCap, 160) : 160;
      if (!(rCap > 0) || !isFinite(rCap)) rCap = 160;
      rCap = Math.min(rCap, 320);
      opt.r = Math.min(r, rCap);
    }
    if (opt.len != null) {
      var len = kaskaNum(opt.len, 200);
      if (!(len > 0)) len = 200;
      opt.len = Math.min(len, 720);
    }
    if (opt.w != null) {
      var ww = kaskaNum(opt.w, 16);
      if (!(ww > 0)) ww = 16;
      opt.w = Math.min(ww, 40);
    }
    if (!isFinite(opt.x) || !isFinite(opt.y)) return;
    warnAt(state, opt);
  }

  function kaskaIsP2(e) {
    return !!(e && (e.p2 || e.shellOff));
  }

  function kaskaAirborne(e) {
    var s = e && e.kaskaStep;
    return s === "dive_up" || s === "dive_air" || s === "dive_fall";
  }

  function kaskaFireTriple(state, e, ang, r, extra) {
    extra = extra || {};
    kaskaFireHorn(state, e, ang - 0.24, r, extra);
    kaskaFireHorn(state, e, ang, r, extra);
    kaskaFireHorn(state, e, ang + 0.24, r, extra);
  }

  function kaskaFireRing(state, e, n, r, dmgMul) {
    n = n || 8;
    if (n > 12) n = 12;
    var i;
    var off = ((e.kaskaSpinRing || 0) % 2) * (Math.PI / n);
    for (i = 0; i < n; i++) {
      kaskaFireHorn(state, e, off + i * Math.PI * 2 / n, r || 9, { dmg: Math.round(e.def.dmg * (dmgMul || 0.7)) });
    }
    e.kaskaSpinRing = (e.kaskaSpinRing || 0) + 1;
  }

  function kaskaFireHorn(state, e, ang, r, extra) {
    extra = extra || {};
    extra.r = kaskaHornR(r);
    extra.speed = extra.speed || 305;
    extra.life = extra.life || 2.4;
    extra.muzzle = extra.muzzle != null ? extra.muzzle : (e.def.size || 32) * 0.95;
    extra.color = extra.color || "#ffd24a";
    enemyFireAng(state, e, ang, "horn", extra);
  }

  function kaskaLaneLen(e, target) {
    if (!target) return 220;
    var d = dist(e, target);
    if (!isFinite(d)) d = 220;
    return Math.min(420, Math.max(120, d + 40));
  }

  function kaskaStartArrow(state, e, target) {
    var ang = target ? Math.atan2(target.y - e.y, target.x - e.x) : e.rot || 0;
    if (!isFinite(ang)) ang = e.rot || 0;
    e.rot = ang;
    e.kaskaStep = "arrow_warn";
    e.kaskaT = 0.4;
    kaskaWarn(state, {
      kind: "lane",
      x: e.x,
      y: e.y,
      ang: ang,
      len: kaskaLaneLen(e, target),
      w: 14 + (e.kaskaArrowI || 0) * 4,
      t: 0.4,
      dmg: 0,
      color: "#ffd24a",
      followId: e.id
    });
  }

  function kaskaStartDash(state, e, target) {
    var tx = target ? target.x : e.x + Math.cos(e.rot || 0) * 140;
    var ty = target ? target.y : e.y + Math.sin(e.rot || 0) * 140;
    if (!isFinite(tx) || !isFinite(ty)) {
      tx = e.x;
      ty = e.y;
    }
    e.kaskaDashTx = tx;
    e.kaskaDashTy = ty;
    var ang = Math.atan2(ty - e.y, tx - e.x);
    if (!isFinite(ang)) ang = e.rot || 0;
    e.kaskaDashAng = ang;
    e.rot = ang;
    e.kaskaStep = "dash_warn";
    e.kaskaT = 0.34;
    var len = Math.hypot(tx - e.x, ty - e.y);
    if (!isFinite(len) || len < 36) len = 36;
    kaskaWarn(state, {
      kind: "lane",
      x: e.x,
      y: e.y,
      ang: ang,
      len: len,
      w: 18,
      t: 0.34,
      dmg: 0,
      color: "#ff6a3a"
    });
    if ((e.kaskaDashI || 0) === 0) {
      state.floaters.push(G.createFloater(e.x, e.y - 28, "investida", "#ff6a3a"));
    }
  }

  function kaskaFinishDash(e, state, target) {
    e.vx = 0;
    e.vy = 0;
    e.zDraw = 0;
    e.kaskaDashI = (e.kaskaDashI || 0) + 1;
    var maxD = kaskaIsP2(e) ? 3 : 5;
    if (e.kaskaDashI >= maxD) {
      if (kaskaIsP2(e) && state) {
        e.kaskaDiveI = 0;
        kaskaStartDive(state, e, target);
      } else {
        e.kaskaStep = "idle";
        e.kaskaT = 0.7;
        e.kaskaArrowI = 0;
      }
    } else {
      e.kaskaStep = "dash_gap";
      e.kaskaT = kaskaIsP2(e) ? 0.22 : 0.16;
    }
  }

  function kaskaHopR(e) {
    var i = e && e.kaskaDashI ? e.kaskaDashI : 0;
    if (i < 0) i = 0;
    if (i > 4) i = 4;
    var r = 78 * (1.1 + i * 0.1);
    if (!isFinite(r) || r <= 0) r = 78;
    return Math.min(r, 120);
  }

  function kaskaStartHop(state, e) {
    e.vx = 0;
    e.vy = 0;
    e.kaskaStep = "hop";
    e.kaskaT = 0.36;
    e.kaskaHopMax = 0.36;
    e.zDraw = 0;
    var r = kaskaHopR(e);
    kaskaWarn(state, {
      kind: "mark",
      x: e.x,
      y: e.y,
      t: 0.36,
      r: r,
      rCap: 120,
      dmg: 0,
      color: "#ffb45a",
      followId: e.id
    });
  }

  function kaskaStomp(state, e) {
    var r = kaskaHopR(e);
    if (!isFinite(r) || r <= 0) r = 72;
    r = Math.min(r, 120);
    var x = e.x;
    var y = e.y;
    if (!isFinite(x) || !isFinite(y)) return;
    e.zDraw = 0;
    explode(state, x, y, r, Math.round(e.def.dmg * 1.15), "enemy", "#c49028");
    if (G.audio && G.audio.thud) G.audio.thud();
    else if (G.audio && G.audio.explosion) G.audio.explosion();
  }

  function kaskaDiveR(i) {
    var n = i || 0;
    if (n < 0) n = 0;
    if (n > 2) n = 2;
    var r = 176;
    var k;
    for (k = 0; k < n; k++) r *= 1.25;
    if (!isFinite(r) || r <= 0) r = 176;
    return Math.min(r, 256);
  }

  function kaskaStartDive(state, e, target) {
    var tx = target ? target.x : (state.squad ? state.squad.x : e.x);
    var ty = target ? target.y : (state.squad ? state.squad.y : e.y);
    if (!isFinite(tx) || !isFinite(ty)) {
      tx = (state.W || 1280) / 2;
      ty = (state.H || 720) / 2;
    }
    if (e.kaskaDiveI == null) e.kaskaDiveI = 0;
    var r = kaskaDiveR(e.kaskaDiveI);
    e.kaskaDiveTx = tx;
    e.kaskaDiveTy = ty;
    e.kaskaDiveR = r;
    e.kaskaStep = "dive_up";
    e.kaskaT = 0.58;
    e.kaskaHopMax = 0.58;
    e.vx = 0;
    e.vy = 0;
    kaskaWarn(state, {
      kind: "mark",
      x: tx,
      y: ty,
      t: 1.42,
      r: r,
      rCap: 256,
      dmg: 0,
      color: "#ffb45a"
    });
    if ((e.kaskaDiveI || 0) === 0) {
      state.floaters.push(G.createFloater(e.x, e.y - 28, "queda", "#ffb45a"));
    }
  }

  function kaskaDiveImpact(state, e, target) {
    var x = isFinite(e.kaskaDiveTx) ? e.kaskaDiveTx : e.x;
    var y = isFinite(e.kaskaDiveTy) ? e.kaskaDiveTy : e.y;
    var r = e.kaskaDiveR;
    if (!isFinite(r) || r <= 0) r = 160;
    r = Math.min(r, 256);
    e.x = x;
    e.y = y;
    e.zDraw = 0;
    G.clampPlay(e, state);
    explode(state, x, y, r, Math.round(e.def.dmg * (1.25 + (e.kaskaDiveI || 0) * 0.12)), "enemy", "#c49028");
    if (G.audio && G.audio.explosion) G.audio.explosion();
    else if (G.audio && G.audio.thud) G.audio.thud();
    pushZone(state, {
      kind: "crack",
      x: x,
      y: y,
      r: r,
      t: 4.2,
      max: 4.2,
      seed: (e.id || 1) * 0.37 + (e.kaskaDiveI || 0) * 1.7
    });
    e.kaskaDiveI = (e.kaskaDiveI || 0) + 1;
    if (e.kaskaDiveI < 3) {
      e.kaskaStep = "dive_gap";
      e.kaskaT = 0.2;
    } else {
      e.kaskaStep = "stun";
      e.kaskaT = 2.5;
      e.kaskaVuln = true;
      e.kaskaArrowI = 0;
      e.kaskaDashI = 0;
      e.kaskaDiveI = 0;
      e.vx = 0;
      e.vy = 0;
      state.floaters.push(G.createFloater(e.x, e.y - 36, "exposto", "#ffd24a"));
    }
  }

  function tickKaskaP1(state, e, target, spd, dt, d) {
    if (!e.kaskaP1) {
      e.kaskaP1 = true;
      e.kaskaStep = "idle";
      e.kaskaT = 0.4;
      e.kaskaArrowI = 0;
      e.kaskaDashI = 0;
      e.spinMode = 0;
      e.throwWindup = 0;
      e.chargeWindup = 0;
      e.cascaDashT = 0;
      e.seqWindup = 0;
      e.seqBurst = 0;
      e.seqMode = 0;
    }
    e.kaskaT = (e.kaskaT || 0) - dt;
    var step = e.kaskaStep || "idle";
    if (step === "idle") {
      moveTowards(e, state.squad.x, state.squad.y, spd, dt);
      if (target) e.rot = Math.atan2(target.y - e.y, target.x - e.x);
      if (e.kaskaT <= 0) kaskaStartArrow(state, e, target);
      return;
    }
    if (step === "arrow_warn") {
      if (target) e.rot = Math.atan2(target.y - e.y, target.x - e.x);
      e.flash = Math.max(e.flash || 0, 0.1);
      if (e.kaskaT <= 0) {
        var shot = e.kaskaArrowI || 0;
        var rr = KASKA_ARROW_R[Math.min(2, shot)] || 10;
        var extra = { dmg: Math.round(e.def.dmg * (1 + shot * 0.12)) };
        if (kaskaIsP2(e)) kaskaFireTriple(state, e, e.rot, rr, extra);
        else kaskaFireHorn(state, e, e.rot, rr, extra);
        if (G.audio && G.audio.horn) G.audio.horn();
        else if (G.audio && G.audio.shoot) G.audio.shoot();
        e.kaskaArrowI = shot + 1;
        if (e.kaskaArrowI >= 3) {
          if (kaskaIsP2(e)) {
            e.kaskaDashI = 0;
            kaskaStartDash(state, e, target);
          } else {
            e.kaskaStep = "spin_warn";
            e.kaskaT = 0.75;
            kaskaWarn(state, {
              kind: "spin",
              x: e.x,
              y: e.y,
              t: 0.75,
              r: (e.def.size || 32) + 48,
              dmg: 0,
              color: "#ffd24a",
              followId: e.id
            });
            state.floaters.push(G.createFloater(e.x, e.y - 28, "giro", "#ffd24a"));
          }
        } else {
          e.kaskaStep = "arrow_gap";
          e.kaskaT = kaskaIsP2(e) ? 0.26 : 0.2;
        }
      }
      return;
    }
    if (step === "arrow_gap") {
      if (target) e.rot = Math.atan2(target.y - e.y, target.x - e.x);
      moveTowards(e, state.squad.x, state.squad.y, spd * 0.45, dt);
      if (e.kaskaT <= 0) kaskaStartArrow(state, e, target);
      return;
    }
    if (step === "spin_warn") {
      e.flash = Math.max(e.flash || 0, 0.12);
      if (e.kaskaT <= 0) {
        e.kaskaStep = "spin";
        e.kaskaT = 1.7;
        e.kaskaSpinShotT = 0;
        e.kaskaSpinRing = 0;
      }
      return;
    }
    if (step === "spin") {
      e.rot = (e.rot || 0) + Math.PI * 2 * 1.4 * dt;
      e.kaskaSpinShotT = (e.kaskaSpinShotT || 0) - dt;
      if (e.kaskaSpinShotT <= 0) {
        e.kaskaSpinShotT = 0.15;
        e.kaskaSpinRing = (e.kaskaSpinRing || 0) + 1;
        var off = ((e.kaskaSpinRing % 2) * Math.PI) / 8;
        var si;
        for (si = 0; si < 8; si++) {
          kaskaFireHorn(state, e, e.rot + off + si * (Math.PI / 4), 10, { dmg: Math.round(e.def.dmg * 0.78) });
        }
      }
      if (e.kaskaT <= 0) {
        e.kaskaDashI = 0;
        kaskaStartDash(state, e, target);
      }
      return;
    }
    if (step === "dash_warn") {
      e.rot = e.kaskaDashAng || 0;
      e.flash = Math.max(e.flash || 0, 0.14);
      if (e.kaskaT <= 0) {
        var tx = e.kaskaDashTx;
        var ty = e.kaskaDashTy;
        if (!isFinite(tx) || !isFinite(ty)) {
          tx = e.x + Math.cos(e.kaskaDashAng || 0) * 120;
          ty = e.y + Math.sin(e.kaskaDashAng || 0) * 120;
        }
        var dx = tx - e.x;
        var dy = ty - e.y;
        var distDash = Math.hypot(dx, dy);
        if (!isFinite(distDash) || distDash < 12) distDash = 12;
        var dsp = 840;
        var dashT = distDash / dsp;
        if (dashT > 0.57) {
          dsp = distDash / 0.57;
          if (dsp > 1020) dsp = 1020;
          dashT = distDash / dsp;
        }
        if (!isFinite(dashT) || dashT < 0.08) dashT = 0.08;
        if (dashT > 0.77) dashT = 0.77;
        e.vx = (dx / distDash) * dsp;
        e.vy = (dy / distDash) * dsp;
        e.kaskaStep = "dash";
        e.kaskaT = dashT;
        if (kaskaIsP2(e)) {
          e.kaskaRingT = 0;
          kaskaFireRing(state, e, 8, 9, 0.72);
        }
      }
      return;
    }
    if (step === "dash") {
      var stepLen = Math.hypot(e.vx || 0, e.vy || 0) * dt;
      e.x += (e.vx || 0) * dt;
      e.y += (e.vy || 0) * dt;
      e.rot = Math.atan2(e.vy || 0, e.vx || 1);
      var leftX = (e.kaskaDashTx != null ? e.kaskaDashTx : e.x) - e.x;
      var leftY = (e.kaskaDashTy != null ? e.kaskaDashTy : e.y) - e.y;
      var left = Math.hypot(leftX, leftY);
      if (!isFinite(left) || left <= 14 || left <= stepLen) {
        if (isFinite(e.kaskaDashTx) && isFinite(e.kaskaDashTy)) {
          e.x = e.kaskaDashTx;
          e.y = e.kaskaDashTy;
        }
        G.clampPlay(e, state);
        if (target && dist(e, target) < e.def.size + target.def.size + 12 && e.contactCd <= 0) {
          e.contactCd = 0.22;
          if (!(G.tactics && G.tactics.skipContact && G.tactics.skipContact(state, e))) {
            hurt(state, target, Math.round(e.def.dmg * 1.2), e.x, e.y);
          }
        }
        if (kaskaIsP2(e)) kaskaFinishDash(e, state, target);
        else kaskaStartHop(state, e);
        return;
      }
      G.clampPlay(e, state);
      if (kaskaIsP2(e)) {
        e.kaskaRingT = (e.kaskaRingT || 0) - dt;
        if (e.kaskaRingT <= 0) {
          e.kaskaRingT = 0.22;
          kaskaFireRing(state, e, 8, 9, 0.72);
        }
      }
      if (target && d < e.def.size + target.def.size + 12 && e.contactCd <= 0) {
        e.contactCd = 0.22;
        if (!(G.tactics && G.tactics.skipContact && G.tactics.skipContact(state, e))) {
          hurt(state, target, Math.round(e.def.dmg * 1.2), e.x, e.y);
        }
      }
      if (e.kaskaT <= 0) {
        if (kaskaIsP2(e)) kaskaFinishDash(e, state, target);
        else kaskaStartHop(state, e);
      }
      return;
    }
    if (step === "hop") {
      var hopMax = e.kaskaHopMax || 0.36;
      if (!(hopMax > 0) || !isFinite(hopMax)) hopMax = 0.36;
      var hk = 1 - e.kaskaT / hopMax;
      if (!isFinite(hk)) hk = 1;
      if (hk < 0) hk = 0;
      else if (hk > 1) hk = 1;
      var hopZ = Math.sin(hk * Math.PI) * 54;
      if (!isFinite(hopZ) || hopZ < 0) hopZ = 0;
      e.zDraw = Math.min(hopZ, 72);
      e.flash = Math.max(e.flash || 0, 0.1);
      if (e.kaskaT <= 0) {
        kaskaStomp(state, e);
        kaskaFinishDash(e, state, target);
      }
      return;
    }
    if (step === "dive_up") {
      var upMax = e.kaskaHopMax || 0.58;
      if (!(upMax > 0) || !isFinite(upMax)) upMax = 0.58;
      var uk = 1 - e.kaskaT / upMax;
      if (!isFinite(uk)) uk = 1;
      if (uk < 0) uk = 0;
      else if (uk > 1) uk = 1;
      var upZ = uk * 96;
      if (!isFinite(upZ) || upZ < 0) upZ = 0;
      e.zDraw = Math.min(upZ, 120);
      e.y -= 160 * dt;
      e.rot += dt * 8;
      if (e.kaskaT <= 0) {
        e.kaskaStep = "dive_air";
        e.kaskaT = 0.4;
        e.zDraw = 110;
      }
      return;
    }
    if (step === "dive_air") {
      e.zDraw = 110;
      e.y = -70;
      if (e.kaskaT <= 0) {
        var fx = isFinite(e.kaskaDiveTx) ? e.kaskaDiveTx : e.x;
        var fy = isFinite(e.kaskaDiveTy) ? e.kaskaDiveTy : e.y;
        e.x = fx;
        e.y = fy;
        e.kaskaStep = "dive_fall";
        e.kaskaT = 0.42;
        e.kaskaHopMax = 0.42;
        e.zDraw = 92;
        if (G.audio && G.audio.thud) G.audio.thud();
      }
      return;
    }
    if (step === "dive_fall") {
      var fallMax = e.kaskaHopMax || 0.42;
      if (!(fallMax > 0) || !isFinite(fallMax)) fallMax = 0.42;
      var fk = 1 - e.kaskaT / fallMax;
      if (!isFinite(fk)) fk = 1;
      if (fk < 0) fk = 0;
      else if (fk > 1) fk = 1;
      var fallZ = 92 * (1 - fk * fk);
      if (!isFinite(fallZ) || fallZ < 0) fallZ = 0;
      e.zDraw = Math.min(fallZ, 120);
      if (isFinite(e.kaskaDiveTx)) e.x = e.kaskaDiveTx;
      if (isFinite(e.kaskaDiveTy)) e.y = e.kaskaDiveTy;
      if (e.kaskaT <= 0) kaskaDiveImpact(state, e, target);
      return;
    }
    if (step === "dive_gap") {
      e.zDraw = 0;
      if (e.kaskaT <= 0) kaskaStartDive(state, e, target);
      return;
    }
    if (step === "dash_gap") {
      if (e.kaskaT <= 0) kaskaStartDash(state, e, target);
      return;
    }
    if (step === "stun") {
      e.vx = 0;
      e.vy = 0;
      e.zDraw = 0;
      e.kaskaVuln = true;
      e.flash = Math.max(e.flash || 0, 0.08);
      if (e.kaskaT <= 0) {
        e.kaskaVuln = false;
        e.kaskaStep = "idle";
        e.kaskaT = 0.45;
      }
      return;
    }
    e.kaskaStep = "idle";
    e.kaskaT = 0.2;
    e.kaskaVuln = false;
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

  function shotHitsTimeGap(sx, sy, ang, aimDist, lock) {
    if (!lock || lock.gapR == null) return false;
    var gx = lock.gapX;
    var gy = lock.gapY;
    var r = lock.gapR;
    var x1 = sx + Math.cos(ang) * aimDist;
    var y1 = sy + Math.sin(ang) * aimDist;
    if (Math.hypot(x1 - gx, y1 - gy) < r + 10) return true;
    var dx = x1 - sx;
    var dy = y1 - sy;
    var len2 = dx * dx + dy * dy || 1;
    var t = ((gx - sx) * dx + (gy - sy) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(sx + dx * t - gx, sy + dy * t - gy) < r + 8;
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

  var TIMELOCK_AIM_DUR = 2.45;
  var TIMELOCK_SLOW_DUR = 0.2;
  var TIMELOCK_CATCHUP_DUR = 0.08;
  var TIMELOCK_SLOW_SCALE = 0.48;

  function setTimeShotSpeed(state, scale) {
    for (var i = 0; i < state.projectiles.length; i++) {
      var p = state.projectiles[i];
      if (!p.held && p.kind !== "timeshot") continue;
      var ang = p.holdAng != null ? p.holdAng : Math.atan2(p.vy, p.vx);
      var sp = (p.holdSp || 900) * scale;
      p.vx = Math.cos(ang) * sp;
      p.vy = Math.sin(ang) * sp;
      if (p.held) {
        p.held = false;
        p.life = Math.max(p.life, 0.7);
      }
    }
  }

  function finishTimeLock(state) {
    var wasAim = state.timeLock && state.timeLock.phase === "aim";
    setTimeShotSpeed(state, 1);
    if (wasAim) {
      state.shake = Math.max(state.shake || 0, 10);
      G.audio.explosion();
    }
    state.timeLock = null;
  }

  function timeLockSlowScale(lock) {
    var t = lock.slowT || 0;
    var slowDur = lock.slowDur || TIMELOCK_SLOW_DUR;
    var catchDur = lock.catchupDur || TIMELOCK_CATCHUP_DUR;
    var base = lock.slowScale || TIMELOCK_SLOW_SCALE;
    if (t <= slowDur) return base;
    var u = Math.min(1, (t - slowDur) / Math.max(0.01, catchDur));
    u = u * u * (3 - 2 * u);
    return base + (1 - base) * u;
  }

  function beginTimeLock(state, e) {
    var cmd = commanderOf(state) || state.squad;
    var ang = Math.atan2(cmd.y - e.y, cmd.x - e.x);
    var gapSign = Math.random() < 0.5 ? 1 : -1;
    var px = Math.cos(ang + Math.PI / 2) * gapSign;
    var py = Math.sin(ang + Math.PI / 2) * gapSign;
    var gapX = cmd.x + px * 86;
    var gapY = cmd.y + py * 86;
    var b = G.playfield(state);
    gapX = Math.max(b.x0 + 36, Math.min(b.x1 - 36, gapX));
    gapY = Math.max(b.y0 + 36, Math.min(b.y1 - 36, gapY));
    if (Math.hypot(gapX - cmd.x, gapY - cmd.y) < 48) {
      gapSign = -gapSign;
      px = -px;
      py = -py;
      gapX = Math.max(b.x0 + 36, Math.min(b.x1 - 36, cmd.x + px * 86));
      gapY = Math.max(b.y0 + 36, Math.min(b.y1 - 36, cmd.y + py * 86));
    }
    state.timeLock = {
      t: 0,
      bossId: e.id,
      phase: "aim",
      aimDur: TIMELOCK_AIM_DUR,
      nextShot: 0.08,
      targetId: cmd && cmd.id,
      slowT: 0,
      slowDur: TIMELOCK_SLOW_DUR,
      catchupDur: TIMELOCK_CATCHUP_DUR,
      slowScale: TIMELOCK_SLOW_SCALE,
      gapSign: gapSign,
      gapX: gapX,
      gapY: gapY,
      gapR: 60
    };
    e.timeStopCd = 18;
    state.banner = { text: "O tempo congela...", t: 1.8 };
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
      finishTimeLock(state);
      return;
    }
    var aliveBender = countTypeAlive(state, "dobrador_luz") > 0;
    if (!aliveBender) {
      finishTimeLock(state);
      state.floaters.push(G.createFloater(e.x, e.y - 24, "prisma caiu", "#c8e8ff"));
      return;
    }
    if (lock.phase === "aim") {
      state.squad.vx = 0;
      state.squad.vy = 0;
    }
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
        var fan = 0.7;
        var nFan = 7;
        var fired = 0;
        for (var fi = 0; fi < nFan; fi++) {
          var u = nFan <= 1 ? 0 : fi / (nFan - 1) - 0.5;
          var angOff = u * 2 * fan;
          var origin = u * 110;
          var sx = e.x + px * origin;
          var sy = e.y + py * origin;
          var base = Math.atan2(cmd.y - sy, cmd.x - sx);
          var angShot = base + angOff;
          var aimDist = Math.max(80, Math.hypot(cmd.x - sx, cmd.y - sy));
          if (shotHitsTimeGap(sx, sy, angShot, aimDist, lock)) continue;
          var hx = sx + Math.cos(angShot) * aimDist;
          var hy = sy + Math.sin(angShot) * aimDist;
          var gdx = lock.gapX - cmd.x;
          var gdy = lock.gapY - cmd.y;
          var onGapSide = (hx - cmd.x) * gdx + (hy - cmd.y) * gdy > 0;
          if (onGapSide && Math.hypot(hx - cmd.x, hy - cmd.y) > 22) continue;
          spawnHeldTimeShot(state, e, cmd, px * origin, py * origin, angOff);
          fired++;
        }
        if (fired < 3) {
          var cover = -(lock.gapSign || 1);
          spawnHeldTimeShot(state, e, cmd, px * cover * 48, py * cover * 48, cover * 0.38);
          spawnHeldTimeShot(state, e, cmd, px * cover * 78, py * cover * 78, cover * 0.55);
        }
        lock.nextShot += 0.12;
      }
      if (lock.t >= lock.aimDur) {
        lock.phase = "slow";
        lock.slowT = 0;
        state.banner = { text: "O tempo volta a correr...", t: 0.7 };
        state.shake = Math.max(state.shake || 0, 7);
        state.dashCd = 0;
        state.dashActive = false;
        state.dashT = 0;
        G.audio.explosion();
        setTimeShotSpeed(state, lock.slowScale || TIMELOCK_SLOW_SCALE);
      }
    } else {
      lock.slowT = (lock.slowT || 0) + dt;
      e.vx = e.vy = 0;
      setTimeShotSpeed(state, timeLockSlowScale(lock));
      if (lock.slowT >= (lock.slowDur || TIMELOCK_SLOW_DUR) + (lock.catchupDur || TIMELOCK_CATCHUP_DUR)) {
        setTimeShotSpeed(state, 1);
        state.timeLock = null;
        state.shake = Math.max(state.shake || 0, 5);
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
    if (G.invasion) G.invasion.enterP2(state, e, "O comandante decide levar a sério");
    if (G.invasion && e.inv && G.invasion.tookP2Hook(e)) {
      e.dashCd = 1.2;
      e.disparadaCd = 2.5;
      e.airstrikeCd = 3.2;
    }
    if (G.invasion && G.invasion.cinematic(state)) return;
    if (state.timeLock) return;

    if (e.p2 && e.inv && !e.irwinAllIn && e.hp <= e.maxHp * 0.5) {
      e.irwinAllIn = true;
      fireIrwinAirstrike(state, e);
      e.airstrikeCd = 5.4;
      var cmdNow = commanderOf(state) || state.squad;
      var hideAng = cmdNow ? Math.atan2(cmdNow.y - e.y, cmdNow.x - e.x) : 0;
      var bx = e.x - Math.cos(hideAng) * 36;
      var by = e.y - Math.sin(hideAng) * 36;
      warnAt(state, { kind: "mark", x: bx, y: by, t: 0.45, max: 0.45, r: 26, dmg: 0, color: "#c8e8ff" });
      var bender = G.game.spawnAt(state, "dobrador_luz", bx, by, { noDrop: true, ownerId: e.id });
      if (bender) bender.helperOf = e.id;
      e.timeStopCd = 2.8;
      state.banner = { text: "Irwin solta tudo que tem guardado.", t: 2.2 };
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

    if (e.inv && e.p2 && (e.timeStopWind || 0) <= 0) {
      e.airstrikeCd = (e.airstrikeCd == null ? 3.2 : e.airstrikeCd) - dt;
      if (e.airstrikeCd <= 0) {
        fireIrwinAirstrike(state, e);
        e.airstrikeCd = e.irwinAllIn ? 5.6 : 7.4;
      }
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

  function princessMark(state) {
    state.royalMarkT = Math.max(state.royalMarkT || 0, 4.2);
  }

  function princessCountRobo(state) {
    var n = 0;
    var i;
    for (i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].hp > 0 && state.enemies[i].robo) n++;
    }
    return n;
  }

  function princessSpawnRobo(state, n, x, y, hostId) {
    var i, bee;
    for (i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / Math.max(1, n);
      bee = G.game.spawnAt(state, "hive_bee", x + Math.cos(a) * 26, y + Math.sin(a) * 26, { noDrop: true, noLink: true });
      if (!bee) continue;
      bee.robo = true;
      bee.noDrop = true;
      bee.maxHp = Math.round(bee.maxHp * 1.85);
      bee.hp = bee.maxHp;
      bee.hiveCmd = "orbit";
      bee.hiveHost = hostId;
      bee.orbitAng = a;
      bee.mergeT = 0;
    }
  }

  function princessThrustLen() {
    return 286;
  }

  function princessStabLen() {
    return 208;
  }

  function princessStabOff(i) {
    return (i - 1) * 0.4;
  }

  function princessAimAt(state, e, target) {
    if (!target) return e.rot || 0;
    return Math.atan2(
      (target.y + (state.squad.vy || 0) * 0.1) - e.y,
      (target.x + (state.squad.vx || 0) * 0.1) - e.x
    );
  }

  function princessHellRay(state, e) {
    var ang = e.hellAim || 0;
    return rayExitPlay(G.playfield(state), e.x, e.y, Math.cos(ang), Math.sin(ang), 20);
  }

  function princessWarnHell(state, e, t) {
    var hit = princessHellRay(state, e);
    e.hellLen = hit.dist || 420;
    e.hellTo = { x: hit.x, y: hit.y };
    warnAt(state, { kind: "lane", x: e.x, y: e.y, ang: e.hellAim || 0, len: e.hellLen, w: 18, t: t, max: t, r: 18, dmg: 0, color: "#ff6a3a" });
  }

  function princessStartHellDash(state, e) {
    var hit = princessHellRay(state, e);
    var len = Math.max(48, hit.dist || e.hellLen || 420);
    var sp = 1760;
    e.hellLen = len;
    e.hellTo = { x: hit.x, y: hit.y };
    e.vx = Math.cos(e.hellAim || 0) * sp;
    e.vy = Math.sin(e.hellAim || 0) * sp;
    e.hellDash = len / sp;
    e.hellGhosts = [];
    e.hellReacted = false;
  }

  function playerDashFresh(state) {
    var max = state.dashTMax || 0.34;
    var t = state.dashT || 0;
    return t > 0 && (max - t) < 0.055;
  }

  function princessHellFeintPos(state, e, target) {
    var from = target || state.squad;
    var ang = Math.atan2(from.y - e.y, from.x - e.x);
    var b = G.playfield(state);
    var far = rayExitPlay(b, from.x, from.y, Math.cos(ang), Math.sin(ang), 52);
    var dist = Math.max(170, Math.min((far.dist || 220) * 0.78, 250));
    var x = from.x + Math.cos(ang) * dist;
    var y = from.y + Math.sin(ang) * dist;
    if (Math.hypot(x - from.x, y - from.y) < 150) {
      x = far.x;
      y = far.y;
    }
    return {
      x: Math.max(b.x0 + 48, Math.min(b.x1 - 48, x)),
      y: Math.max(b.y0 + 48, Math.min(b.y1 - 48, y))
    };
  }

  function princessDoHellFeint(state, e, target) {
    var pos = princessHellFeintPos(state, e, target);
    princessClearWarn(state, "lane");
    princessBlinkTo(state, e, pos.x, pos.y);
    e.hellAim = target ? Math.atan2(target.y - e.y, target.x - e.x) : (e.rot || 0);
    e.rot = e.hellAim;
    e.hellDash = 0;
    e.vx = e.vy = 0;
    e.hellTo = null;
    e.hellGhosts = [];
    e.hellWind = 0.28;
    princessWarnHell(state, e, 0.28);
    if (G.audio && G.audio.thud) G.audio.thud();
  }

  function princessQueueChaseThrust(state, e, target) {
    if (!target) return;
    var ang = Math.atan2(target.y - e.y, target.x - e.x);
    var closeX = target.x - Math.cos(ang) * 68;
    var closeY = target.y - Math.sin(ang) * 68;
    e.chaseTpCd = 10;
    e.thrustAfterBlink = true;
    e.princessAct = "blink";
    e.blinkT = 0.26;
    e.blinkDid = false;
    e.blinkTo = { x: closeX, y: closeY };
    warnAt(state, { kind: "tp", x: closeX, y: closeY, t: 0.26, max: 0.26, r: 28, dmg: 0, color: "#ffe08a" });
  }

  function princessWarnCharge(state, e, t) {
    var hit = rayExitPlay(G.playfield(state), e.x, e.y, Math.cos(e.thrustAim || 0), Math.sin(e.thrustAim || 0), 22);
    e.thrustLen = Math.min(princessThrustLen(), hit.dist || princessThrustLen());
    warnAt(state, {
      kind: "lane",
      x: e.x,
      y: e.y,
      ang: e.thrustAim || 0,
      len: e.thrustLen,
      w: 22,
      t: t,
      max: t,
      r: 22,
      dmg: 0,
      color: "#ffd24a",
      followId: e.id,
      followRot: true
    });
  }

  function princessWarnStabs(state, e, t) {
    var i, off;
    var len = princessStabLen();
    for (i = 0; i < 3; i++) {
      off = princessStabOff(i);
      warnAt(state, {
        kind: "lane",
        x: e.x,
        y: e.y,
        ang: (e.thrustAim || 0) + off,
        angOff: off,
        len: len,
        w: 15,
        t: t,
        max: t,
        r: 15,
        dmg: 0,
        color: "#7af7ff",
        followId: e.id,
        followRot: true
      });
    }
  }

  function princessStartThrust(state, e, target) {
    e.princessAct = "thrust";
    e.thrustLeft = 3;
    e.thrustPhase = "wind";
    e.thrustWind = 0.34;
    e.thrustWindMax = 0.34;
    e.thrustDash = 0;
    e.thrustHit = false;
    e.thrustGhosts = [];
    e.stabFx = [];
    e.thrustAim = princessAimAt(state, e, target);
    e.rot = e.thrustAim;
    princessWarnCharge(state, e, e.thrustWind);
  }

  function princessBlinkTo(state, e, x, y) {
    var b = G.playfield(state);
    e.blinkFrom = { x: e.x, y: e.y };
    e.blinkFxT = 0.28;
    e.x = Math.max(b.x0 + 36, Math.min(b.x1 - 36, x));
    e.y = Math.max(b.y0 + 36, Math.min(b.y1 - 36, y));
    G.burst(state, e.blinkFrom.x, e.blinkFrom.y, "#ffe08a", 10, 70);
    G.burst(state, e.x, e.y, "#7af7ff", 10, 70);
  }

  function princessHalfBox(state, axis, side) {
    var b = G.playfield(state);
    var midX = (b.x0 + b.x1) / 2;
    var midY = (b.y0 + b.y1) / 2;
    if (axis === "x") {
      return side < 0
        ? { x0: b.x0, y0: b.y0, x1: midX, y1: b.y1, edge: midX, axis: "x", side: side }
        : { x0: midX, y0: b.y0, x1: b.x1, y1: b.y1, edge: midX, axis: "x", side: side };
    }
    return side < 0
      ? { x0: b.x0, y0: b.y0, x1: b.x1, y1: midY, edge: midY, axis: "y", side: side }
      : { x0: b.x0, y0: midY, x1: b.x1, y1: b.y1, edge: midY, axis: "y", side: side };
  }

  function princessInBox(px, py, box) {
    return px >= box.x0 && px <= box.x1 && py >= box.y0 && py <= box.y1;
  }

  function princessClearWarn(state, kind) {
    var i;
    for (i = (state.warnings || []).length - 1; i >= 0; i--) {
      if (state.warnings[i].kind === kind) state.warnings.splice(i, 1);
    }
  }

  function princessMoonDir(last) {
    var dirs = [
      { axis: "y", side: -1 },
      { axis: "y", side: 1 },
      { axis: "x", side: -1 },
      { axis: "x", side: 1 }
    ];
    var i, pool = [];
    for (i = 0; i < dirs.length; i++) {
      if (last && dirs[i].axis === last.axis && dirs[i].side === last.side) continue;
      pool.push(dirs[i]);
    }
    return pool[(Math.random() * pool.length) | 0];
  }

  function princessMoonWarn(state, e, dur) {
    princessClearWarn(state, "half");
    var dir = princessMoonDir(e.moonLast);
    e.moonLast = dir;
    e.moonBox = princessHalfBox(state, dir.axis, dir.side);
    var box = e.moonBox;
    warnAt(state, {
      kind: "half",
      x: (box.x0 + box.x1) / 2,
      y: (box.y0 + box.y1) / 2,
      x0: box.x0,
      y0: box.y0,
      x1: box.x1,
      y1: box.y1,
      edge: box.edge,
      axis: box.axis,
      side: dir.side,
      t: dur,
      max: dur,
      r: 40,
      dmg: 0,
      color: "#ffe08a"
    });
  }

  function princessMoonSlash(state, e) {
    var box = e.moonBox;
    if (!box) return;
    var cx = (box.x0 + box.x1) / 2;
    var cy = (box.y0 + box.y1) / 2;
    e.moonFx = {
      t: 0.62,
      max: 0.62,
      x0: box.x0,
      y0: box.y0,
      x1: box.x1,
      y1: box.y1,
      axis: box.axis,
      side: box.side
    };
    var si, sa, sl;
    for (si = 0; si < 18; si++) {
      sa = Math.random() * Math.PI * 2;
      sl = 40 + Math.random() * 160;
      G.burst(state, cx + Math.cos(sa) * sl * 0.35, cy + Math.sin(sa) * sl * 0.35, si % 2 ? "#7af7ff" : "#ffe08a", 3, 90);
    }
    if (princessInBox(state.squad.x, state.squad.y, box)) {
      hurtSquadArea(state, cx, cy, Math.max(box.x1 - box.x0, box.y1 - box.y0), Math.round(e.def.dmg * 1.85), e.x, e.y);
    }
    state.shake = Math.max(state.shake || 0, 16);
    if (G.boomFx) G.boomFx(state, cx, cy, 170, "#ffe08a");
    G.burst(state, cx, cy, "#fff6c0", 28, 220);
    G.burst(state, cx, cy, "#ffe08a", 22, 180);
    G.burst(state, cx, cy, "#7af7ff", 14, 140);
    if (G.audio && G.audio.explosion) G.audio.explosion();
    if (G.audio && G.audio.thud) G.audio.thud();
  }

  function tickPrincess(state, e, target, dt, spd) {
    if (e.introLock) {
      e.vx = e.vy = 0;
      return;
    }
    if ((e.blinkFxT || 0) > 0) e.blinkFxT -= dt;
    e.chaseTpCd = Math.max(0, (e.chaseTpCd || 0) - dt);
    e.phased = false;
    e.hideDraw = false;
    e.skillT = (e.skillT == null ? 1.4 : e.skillT) - dt;
    var hive = !!e.princessHive;
    if (hive) {
      e.roboSpawnT = (e.roboSpawnT == null ? 2.4 : e.roboSpawnT) - dt;
      if (e.roboSpawnT <= 0) {
        e.roboSpawnT = 3.4;
        if (princessCountRobo(state) < 8) princessSpawnRobo(state, 2, e.x, e.y, e.id);
      }
    }
    if (!hive && !e.hiveQueued && e.hp / e.maxHp <= 0.5) {
      e.hiveQueued = true;
      if (G.invasion && G.invasion.startHiveRealm) G.invasion.startHiveRealm(state, e);
      return;
    }
    var act = e.princessAct || "";
    if (act !== "hellish") e.hellAura = 0;
    if (act !== "harvest") {
      e.harvestFlash = Math.max(0, (e.harvestFlash || 0) - dt);
      if (e.harvestFx) {
        for (var hfi = e.harvestFx.length - 1; hfi >= 0; hfi--) {
          e.harvestFx[hfi].t -= dt;
          if (e.harvestFx[hfi].t <= 0) e.harvestFx.splice(hfi, 1);
        }
      }
      if (e.harvestGhosts) {
        for (var hgi = e.harvestGhosts.length - 1; hgi >= 0; hgi--) {
          e.harvestGhosts[hgi].t -= dt;
          if (e.harvestGhosts[hgi].t <= 0) e.harvestGhosts.splice(hgi, 1);
        }
      }
    }
    if (act === "thrust") {
      var aim = e.thrustAim || e.rot || 0;
      var tlen = e.thrustLen || princessThrustLen();
      var fx, fxi;
      if (e.stabFx) {
        for (fxi = e.stabFx.length - 1; fxi >= 0; fxi--) {
          fx = e.stabFx[fxi];
          fx.t -= dt;
          if (fx.t <= 0) e.stabFx.splice(fxi, 1);
        }
      }
      if (e.thrustPhase === "wind") {
        e.thrustWind = (e.thrustWind || 0) - dt;
        e.vx = e.vy = 0;
        if (target) e.thrustAim = princessAimAt(state, e, target);
        e.rot = e.thrustAim || 0;
        aim = e.thrustAim || 0;
        e.x -= Math.cos(aim) * 52 * dt;
        e.y -= Math.sin(aim) * 52 * dt;
        var hitW = rayExitPlay(G.playfield(state), e.x, e.y, Math.cos(aim), Math.sin(aim), 22);
        e.thrustLen = Math.min(princessThrustLen(), hitW.dist || princessThrustLen());
        if (e.thrustWind <= 0) {
          var sp = hive ? 1080 : 980;
          tlen = e.thrustLen || princessThrustLen();
          e.vx = Math.cos(aim) * sp;
          e.vy = Math.sin(aim) * sp;
          e.thrustPhase = "dash";
          e.thrustDash = Math.min(0.26, tlen / sp);
          e.thrustDashMax = e.thrustDash;
          e.thrustFrom = { x: e.x, y: e.y };
          e.thrustHit = false;
          e.thrustGhosts = [];
          G.burst(state, e.x, e.y, "#ffe08a", 12, 70);
          G.burst(state, e.x, e.y, "#ff8a3a", 8, 50);
          if (G.audio && G.audio.thud) G.audio.thud();
          else if (G.audio && G.audio.hit) G.audio.hit();
        }
        return;
      }
      if (e.thrustPhase === "dash") {
        e.thrustDash = (e.thrustDash || 0) - dt;
        e.x += (e.vx || 0) * dt;
        e.y += (e.vy || 0) * dt;
        e.rot = Math.atan2(e.vy || 0, e.vx || 1);
        var ghosts = e.thrustGhosts || [];
        ghosts.push({ x: e.x, y: e.y, rot: e.rot, a: 0.55 });
        if (ghosts.length > 6) ghosts.shift();
        e.thrustGhosts = ghosts;
        var bT = G.playfield(state);
        var ms = e.def.size || 32;
        if (e.x < bT.x0 + ms) { e.x = bT.x0 + ms; e.thrustDash = 0; }
        if (e.x > bT.x1 - ms) { e.x = bT.x1 - ms; e.thrustDash = 0; }
        if (e.y < bT.y0 + ms) { e.y = bT.y0 + ms; e.thrustDash = 0; }
        if (e.y > bT.y1 - ms) { e.y = bT.y1 - ms; e.thrustDash = 0; }
        if (!e.thrustHit && e.thrustFrom) {
          var gone = Math.hypot(e.x - e.thrustFrom.x, e.y - e.thrustFrom.y) + 78;
          if (inBeam(state.squad.x, state.squad.y, e.thrustFrom.x, e.thrustFrom.y, aim, gone, 24)) {
            e.thrustHit = true;
            hurtBeam(state, e.thrustFrom.x, e.thrustFrom.y, aim, gone, 22, Math.round(e.def.dmg * 1.7));
            princessMark(state);
            state.shake = Math.max(state.shake || 0, 10);
            G.burst(state, state.squad.x, state.squad.y, "#fff4c4", 14, 80);
          }
        }
        if (e.thrustDash <= 0) {
          e.vx = e.vy = 0;
          e.thrustPhase = "stabTell";
          e.stabTell = 0.32;
          e.stabTellMax = 0.32;
          e.thrustAim = target ? princessAimAt(state, e, target) : (e.rot || 0);
          e.rot = e.thrustAim;
          princessWarnStabs(state, e, 0.32);
          G.burst(state, e.x, e.y, "#7af7ff", 8, 40);
        }
        return;
      }
      if (e.thrustPhase === "stabTell") {
        e.stabTell = (e.stabTell || 0) - dt;
        e.vx = e.vy = 0;
        if (target) e.thrustAim = princessAimAt(state, e, target);
        e.rot = e.thrustAim || 0;
        if (e.stabTell <= 0) {
          e.thrustPhase = "stab";
          e.stabLeft = 3;
          e.stabCd = 0.02;
          e.stabN = 0;
        }
        return;
      }
      if (e.thrustPhase === "stab") {
        e.vx = e.vy = 0;
        e.stabCd = (e.stabCd || 0) - dt;
        e.stabFlash = Math.max(0, (e.stabFlash || 0) - dt);
        if (e.stabCd <= 0 && (e.stabLeft || 0) > 0) {
          var si = e.stabN || 0;
          var sang = (e.thrustAim || 0) + princessStabOff(si);
          e.stabN = si + 1;
          e.stabLeft--;
          e.stabCd = 0.13;
          e.stabAng = sang;
          e.stabFlash = 0.16;
          e.rot = sang;
          var slen = princessStabLen();
          hurtBeam(state, e.x, e.y, sang, slen, 18, Math.round(e.def.dmg * 1.55));
          if (inBeam(state.squad.x, state.squad.y, e.x, e.y, sang, slen, 22)) {
            princessMark(state);
            state.shake = Math.max(state.shake || 0, 8);
          }
          e.stabFx = e.stabFx || [];
          e.stabFx.push({ ang: sang, t: 0.18, max: 0.18, len: slen });
          G.burst(state, e.x + Math.cos(sang) * 70, e.y + Math.sin(sang) * 70, "#fff4c4", 10, 55);
          G.burst(state, e.x + Math.cos(sang) * 70, e.y + Math.sin(sang) * 70, "#7af7ff", 6, 40);
          if (G.audio && G.audio.hit) G.audio.hit();
        }
        if ((e.stabLeft || 0) <= 0 && e.stabCd <= 0 && (e.stabFlash || 0) <= 0) {
          e.thrustLeft = (e.thrustLeft || 1) - 1;
          e.thrustGhosts = [];
          if ((e.thrustLeft || 0) > 0) {
            e.thrustPhase = "wind";
            e.thrustWind = 0.24;
            e.thrustWindMax = 0.24;
            e.thrustAim = target ? princessAimAt(state, e, target) : aim;
            e.rot = e.thrustAim;
            princessWarnCharge(state, e, 0.24);
          } else {
            e.princessAct = "";
            e.thrustPhase = "";
            e.stabFx = [];
            e.skillT = hive ? 1.25 : 0.85;
          }
        }
        return;
      }
      e.princessAct = "";
      e.skillT = hive ? 1.25 : 0.85;
      return;
    }
    if (act === "spawn") {
      e.spawnT = (e.spawnT || 0) - dt;
      e.vx = e.vy = 0;
      if (!e.spawnDid && e.spawnT <= 0.2) {
        e.spawnDid = true;
        princessSpawnRobo(state, hive ? 5 : 4, e.x, e.y, e.id);
      }
      if (e.spawnT <= 0) {
        e.princessAct = "";
        e.skillT = hive ? 1.7 : 2.1;
      }
      return;
    }
    if (act === "laser") {
      e.laserT = (e.laserT || 0) - dt;
      e.vx = e.vy = 0;
      if (target && (e.laserOn || 0) <= 0) e.laserAng = Math.atan2(target.y - e.y, target.x - e.x);
      e.rot = e.laserAng || 0;
      if (!e.laserOn && e.laserT <= e.laserBeam) {
        e.laserOn = e.laserBeam;
        var bL = G.playfield(state);
        var hitL = rayExitPlay(bL, e.x, e.y, Math.cos(e.laserAng), Math.sin(e.laserAng), 20);
        e.laserLen = hitL.dist || 520;
      }
      if ((e.laserOn || 0) > 0) {
        e.laserOn -= dt;
        e.laserHitCd = (e.laserHitCd || 0) - dt;
        if (e.laserHitCd <= 0) {
          e.laserHitCd = 0.1;
          hurtBeam(state, e.x, e.y, e.laserAng, e.laserLen || 520, 20, Math.round(e.def.dmg * 0.62));
        }
      }
      if (e.laserT <= 0) {
        e.princessAct = "";
        e.laserOn = 0;
        e.skillT = hive ? 1.45 : 1.85;
      }
      return;
    }
    if (act === "blink") {
      e.blinkT = (e.blinkT || 0) - dt;
      e.vx = e.vy = 0;
      if (!e.blinkDid && e.blinkT <= 0.05) {
        e.blinkDid = true;
        var tx, ty;
        if (e.blinkTo) {
          tx = e.blinkTo.x;
          ty = e.blinkTo.y;
          e.blinkTo = null;
        } else if (Math.random() < 0.7 && target) {
          var ba = Math.atan2(target.y - e.y, target.x - e.x);
          tx = target.x - Math.cos(ba) * 58;
          ty = target.y - Math.sin(ba) * 58;
        } else {
          var far = pickPlay(state, 50);
          tx = far.x;
          ty = far.y;
        }
        princessBlinkTo(state, e, tx, ty);
        if (target) e.rot = Math.atan2(target.y - e.y, target.x - e.x);
      }
      if (e.blinkT <= 0) {
        if (e.thrustAfterBlink) {
          e.thrustAfterBlink = false;
          princessStartThrust(state, e, target);
          return;
        }
        if (!hive && target && Math.random() < 0.62) {
          princessStartThrust(state, e, target);
          return;
        }
        e.princessAct = "";
        e.skillT = hive ? 0.65 : 0.5;
      }
      return;
    }
    if (act === "honeymoon") {
      e.vx = e.vy = 0;
      var mid = G.playfield(state);
      e.x += (((mid.x0 + mid.x1) / 2) - e.x) * Math.min(1, dt * 3.2);
      e.y += (((mid.y0 + mid.y1) / 2) - e.y) * Math.min(1, dt * 3.2);
      if (Math.random() < 0.55) {
        var ma = Math.random() * Math.PI * 2;
        var mr = 28 + Math.random() * 46;
        state.particles.push({
          x: e.x + Math.cos(ma) * mr,
          y: e.y + Math.sin(ma) * mr,
          vx: Math.cos(ma) * (12 + Math.random() * 28),
          vy: Math.sin(ma) * (12 + Math.random() * 28) - 18,
          life: 0.38 + Math.random() * 0.28,
          max: 0.7,
          size: 1.8 + Math.random() * 2.4,
          color: Math.random() < 0.55 ? "#ffe08a" : "#7af7ff"
        });
      }
      if (e.moonFx) {
        e.moonFx.t -= dt;
        if (e.moonFx.t <= 0) e.moonFx = null;
      }
      e.moonT = (e.moonT || 0) - dt;
      if (e.moonT <= 0) {
        if (e.moonPhase === "tell") {
          princessMoonSlash(state, e);
          e.moonLeft = (e.moonLeft || 1) - 1;
          if (e.moonLeft > 0) {
            var nextDur = 0.88;
            e.moonPhase = "tell";
            e.moonT = nextDur;
            e.moonMax = nextDur;
            princessMoonWarn(state, e, nextDur);
          } else {
            e.moonPhase = "end";
            e.moonT = 0.38;
          }
        } else {
          e.princessAct = "";
          e.moonFx = null;
          e.skillT = 1.45;
        }
      }
      return;
    }
    if (act === "hellish") {
      e.phased = true;
      e.hellAura = 1;
      var emberN = (e.hellDash || 0) > 0 ? 3 : 1;
      var emi;
      for (emi = 0; emi < emberN; emi++) {
        if (Math.random() > 0.72 && emberN === 1) continue;
        state.particles.push({
          x: e.x + (Math.random() - 0.5) * ((e.hellDash || 0) > 0 ? 28 : 52),
          y: e.y + (Math.random() - 0.5) * ((e.hellDash || 0) > 0 ? 22 : 40),
          vx: (Math.random() - 0.5) * 70 - (e.vx || 0) * 0.12,
          vy: -50 - Math.random() * 90 - (e.vy || 0) * 0.12,
          life: 0.28 + Math.random() * 0.22,
          max: 0.55,
          size: 2.2 + Math.random() * 3.2,
          color: Math.random() < 0.35 ? "#fff4c4" : (Math.random() < 0.5 ? "#ff3a18" : "#ffb45a")
        });
      }
      if ((e.hellWind || 0) > 0) {
        e.hellWind = (e.hellWind || 0) - dt;
        e.vx = e.vy = 0;
        if (target) e.rot = e.hellAim || Math.atan2(target.y - e.y, target.x - e.x);
        if (e.hellWind <= 0) princessStartHellDash(state, e);
        return;
      }
      if ((e.hellDash || 0) > 0) {
        if (!e.hellReacted && playerDashFresh(state)) {
          e.hellReacted = true;
          if (Math.random() < 0.5) {
            princessDoHellFeint(state, e, target);
            return;
          }
        }
        e.hellDash -= dt;
        e.x += (e.vx || 0) * dt;
        e.y += (e.vy || 0) * dt;
        e.rot = Math.atan2(e.vy || 0, e.vx || 1);
        var hg = e.hellGhosts || [];
        hg.push({ x: e.x, y: e.y, rot: e.rot, a: 0.7 });
        if (hg.length > 14) hg.shift();
        e.hellGhosts = hg;
        if (target && Math.hypot(target.x - e.x, target.y - e.y) < e.def.size + 16 && e.contactCd <= 0) {
          e.contactCd = 0.16;
          hurt(state, target, Math.round(e.def.dmg * 1.15), e.x, e.y);
          princessMark(state);
        }
        if (e.hellDash <= 0) {
          if (e.hellTo) {
            e.x = e.hellTo.x;
            e.y = e.hellTo.y;
          }
          G.clampPlay(e, state);
          e.vx = e.vy = 0;
          e.hellLeft = (e.hellLeft || 1) - 1;
          if (e.hellLeft > 0) {
            e.hellAim = target ? Math.atan2(target.y - e.y, target.x - e.x) : 0;
            e.hellWind = 0.24;
            princessWarnHell(state, e, 0.24);
          } else {
            e.princessAct = "";
            e.phased = false;
            e.hellAura = 0;
            e.hellGhosts = [];
            e.skillT = 1.3;
          }
        }
        return;
      }
      return;
    }
    if (act === "harvest") {
      e.harvestT = (e.harvestT || 0) - dt;
      e.phased = true;
      e.harvestFlash = Math.max(0, (e.harvestFlash || 0) - dt);
      if (e.harvestFx) {
        var fi;
        for (fi = e.harvestFx.length - 1; fi >= 0; fi--) {
          e.harvestFx[fi].t -= dt;
          if (e.harvestFx[fi].t <= 0) e.harvestFx.splice(fi, 1);
        }
      }
      if (e.harvestGhosts) {
        var gi;
        for (gi = e.harvestGhosts.length - 1; gi >= 0; gi--) {
          e.harvestGhosts[gi].t -= dt;
          if (e.harvestGhosts[gi].t <= 0) e.harvestGhosts.splice(gi, 1);
        }
      }
      if (e.harvestPhase === "tell") {
        e.hideDraw = true;
        e.stealth = 1;
        e.vx = e.vy = 0;
        e.harvestDim = Math.min(1, (e.harvestDim || 0) + dt * 2.2);
        if (e.harvestT <= 0) {
          e.harvestPhase = "cut";
          e.harvestI = 0;
          e.harvestCd = 0;
          e.harvestFlash = 0.18;
          state.shake = Math.max(state.shake || 0, 10);
          if (G.audio && G.audio.horn) G.audio.horn();
        }
        return;
      }
      e.hideDraw = true;
      e.stealth = 1;
      e.harvestCd = (e.harvestCd || 0) - dt;
      if (e.harvestCd <= 0 && e.harvestCuts && e.harvestI < e.harvestCuts.length) {
        var cut = e.harvestCuts[e.harvestI];
        e.harvestI++;
        e.harvestCd = 0.012;
        princessBlinkTo(state, e, cut.x, cut.y);
        e.rot = cut.ang;
        hurtBeam(state, cut.x, cut.y, cut.ang, cut.len, 12, Math.round(e.def.dmg * 1.55));
        cut.done = true;
        e.harvestFx = e.harvestFx || [];
        e.harvestFx.push({ x: cut.x, y: cut.y, ang: cut.ang, len: cut.len, t: 0.32, max: 0.32 });
        e.harvestGhosts = e.harvestGhosts || [];
        e.harvestGhosts.push({ x: cut.x, y: cut.y, rot: cut.ang, t: 0.2, max: 0.2 });
        e.harvestFlash = 0.08;
        G.burst(state, cut.x + Math.cos(cut.ang) * cut.len * 0.45, cut.y + Math.sin(cut.ang) * cut.len * 0.45, "#ffe08a", 8, 70);
        G.burst(state, cut.x + Math.cos(cut.ang) * cut.len * 0.45, cut.y + Math.sin(cut.ang) * cut.len * 0.45, "#7af7ff", 6, 55);
        if ((e.harvestI % 4) === 0 && G.audio && G.audio.hit) G.audio.hit();
        if ((e.harvestI % 6) === 0) state.shake = Math.max(state.shake || 0, 8);
      }
      if (e.harvestCuts && e.harvestI >= e.harvestCuts.length) {
        e.princessAct = "";
        e.phased = false;
        e.hideDraw = false;
        e.stealth = 0;
        e.harvestCuts = null;
        e.harvestPhase = "";
        e.harvestDim = 0;
        e.harvestFlash = 0.28;
        princessClearWarn(state, "slash");
        state.shake = Math.max(state.shake || 0, 18);
        if (G.boomFx) G.boomFx(state, e.x, e.y, 200, "#7af7ff");
        G.burst(state, e.x, e.y, "#fff6c0", 28, 200);
        G.burst(state, e.x, e.y, "#7af7ff", 22, 170);
        if (G.audio && G.audio.explosion) G.audio.explosion();
        e.skillT = 1.9;
      }
      return;
    }
    e.phased = false;
    if (target) {
      moveTowards(e, target.x, target.y, spd * 1.42, dt);
      e.rot = Math.atan2(target.y - e.y, target.x - e.x);
      if (Math.hypot(target.x - e.x, target.y - e.y) < e.def.size + target.def.size + 8 && e.contactCd <= 0) {
        e.contactCd = 0.22;
        hurt(state, target, Math.round(e.def.dmg * 0.95), e.x, e.y);
      }
    }
    if (e.skillT > 0) return;
    var distT = target ? Math.hypot(target.x - e.x, target.y - e.y) : 999;
    if (target && (e.chaseTpCd || 0) <= 0 && distT > 300) {
      princessQueueChaseThrust(state, e, target);
      return;
    }
    var pool = hive
      ? ["laser", "spawn", "blink", "honeymoon", "honeymoon", "hellish", "hellish", "harvest", "thrust"]
      : ["thrust", "laser", "blink", "spawn", "thrust"];
    if (e.lastPrincess) {
      var np = [];
      var p;
      for (p = 0; p < pool.length; p++) if (pool[p] !== e.lastPrincess) np.push(pool[p]);
      pool = np.length ? np : pool;
    }
    var pick = pool[(Math.random() * pool.length) | 0];
    e.lastPrincess = pick;
    if (pick === "thrust") {
      princessStartThrust(state, e, target);
      return;
    }
    e.princessAct = pick;
    if (pick === "spawn") {
      e.spawnT = 0.85;
      e.spawnDid = false;
      warnAt(state, { kind: "mark", x: e.x, y: e.y, t: 0.85, max: 0.85, r: e.def.size + 40, dmg: 0, color: "#7ad8ff", followId: e.id });
    } else if (pick === "laser") {
      e.laserT = 1.45;
      e.laserBeam = 0.7;
      e.laserOn = 0;
      e.laserAng = target ? Math.atan2(target.y - e.y, target.x - e.x) : 0;
      var b0 = G.playfield(state);
      var hit0 = rayExitPlay(b0, e.x, e.y, Math.cos(e.laserAng), Math.sin(e.laserAng), 20);
      e.laserLen = hit0.dist || 520;
      warnAt(state, { kind: "lane", x: e.x, y: e.y, ang: e.laserAng, len: e.laserLen, w: 22, t: 0.75, max: 0.75, r: 22, dmg: 0, color: "#ffd24a", followId: e.id, followRot: true });
    } else if (pick === "blink") {
      e.blinkT = 0.45;
      e.blinkDid = false;
      var markX = target ? target.x : e.x;
      var markY = target ? target.y : e.y;
      warnAt(state, { kind: "tp", x: markX, y: markY, t: 0.45, max: 0.45, r: 28, dmg: 0, color: "#ffe08a" });
    } else if (pick === "honeymoon") {
      e.moonLeft = 10;
      e.moonPhase = "tell";
      e.moonLast = null;
      e.moonFx = null;
      e.moonT = 1.55;
      e.moonMax = 1.55;
      princessMoonWarn(state, e, 1.55);
    } else if (pick === "hellish") {
      e.hellLeft = 5;
      e.hellReacted = false;
      e.hellAim = target ? Math.atan2(target.y - e.y, target.x - e.x) : 0;
      e.hellWind = 0.55;
      e.hellDash = 0;
      e.hellAura = 1;
      e.hellGhosts = [];
      princessWarnHell(state, e, 0.55);
    } else if (pick === "harvest") {
      var b2 = G.playfield(state);
      var cuts = [];
      var attempts = 0;
      var angC, xC, yC, lenC;
      var safeA = Math.random() * Math.PI * 2;
      var safeX = (b2.x0 + b2.x1) / 2 + Math.cos(safeA) * 70;
      var safeY = (b2.y0 + b2.y1) / 2 + Math.sin(safeA) * 50;
      while (cuts.length < 128 && attempts < 480) {
        attempts++;
        angC = Math.random() * Math.PI * 2;
        xC = b2.x0 + 24 + Math.random() * (b2.x1 - b2.x0 - 48);
        yC = b2.y0 + 24 + Math.random() * (b2.y1 - b2.y0 - 48);
        if (Math.hypot(xC - safeX, yC - safeY) < 52) continue;
        lenC = 130 + Math.random() * 150;
        cuts.push({ x: xC, y: yC, ang: angC, len: lenC, done: false });
        warnAt(state, { kind: "slash", x: xC, y: yC, ang: angC, len: lenC, w: 5, t: 2.15, max: 2.15, r: 5, dmg: 0, color: "#ffe08a", jce: true });
      }
      e.harvestCuts = cuts;
      e.harvestPhase = "tell";
      e.harvestT = 2.15;
      e.harvestI = 0;
      e.harvestFx = [];
      e.harvestGhosts = [];
      e.harvestFlash = 0;
      e.harvestDim = 0;
      e.hideDraw = true;
      e.stealth = 1;
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

  function burnUnit(u, sec, dps) {
    if (!u || u.hp <= 0 || u.stowed) return;
    u.burnT = Math.max(u.burnT || 0, sec || 5);
    u.burnDps = Math.max(u.burnDps || 0, dps || 8);
  }

  function burnSquadArea(state, x, y, r, dps) {
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || u.stowed) continue;
      var dx = u.x - x;
      var dy = u.y - y;
      if (dx * dx + dy * dy <= r * r) burnUnit(u, 5, dps);
    }
  }

  function burnSquadBeam(state, x, y, ang, range, halfW, dps) {
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || u.stowed) continue;
      if (glinderCoverHidesPoint(state, x, y, u.x, u.y)) continue;
      var hitR = halfW + ((u.def && u.def.size) || 10) * 0.55;
      if (inBeam(u.x, u.y, x, y, ang, range, hitR)) burnUnit(u, 5, dps);
    }
  }

  function lightGlinderFire(state, e) {
    if (!e || e.lit) return;
    e.lit = true;
    e.glinderCoal = true;
    e.rub = 1;
    e.rubPct = 100;
    G.burst(state, e.x, e.y, "#ffd24a", 22, 120);
    G.burst(state, e.x, e.y, "#ff6a18", 16, 90);
    state.floaters.push(G.createFloater(e.x, e.y - 22, "acesa", "#ffd24a"));
    state.banner = { text: "A luz volta", t: 1.8 };
    state.glinderNight = false;
    state.glinderNightFade = true;
    state.glinderRub = null;
  }

  function endGlinderNight(state, e) {
    state.glinderNight = false;
    state.glinderNightFade = false;
    state.vultoDark = 0;
    state.glinderNightT = 0;
    state.glinderRub = null;
    clearGlinderFires(state);
    if (e && e.vultoAct === "dark") {
      e.vultoAct = "";
      e.vultoT = Math.max(e.vultoT || 0, 0.35);
    }
  }

  function glinderCoalOf(state) {
    var i;
    for (i = 0; i < (state.enemies || []).length; i++) {
      var f = state.enemies[i];
      if (f.hp > 0 && f.glinderCoal && !f.lit) return f;
    }
    return null;
  }

  function tickGlinderRub(state, dt) {
    state.glinderRub = null;
    if (!state.glinderNight) return;
    var coal = glinderCoalOf(state);
    if (!coal) return;
    var cmd = commanderOf(state);
    var px = cmd ? cmd.x : state.squad.x;
    var py = cmd ? cmd.y : state.squad.y;
    var d = Math.hypot(px - coal.x, py - coal.y);
    var near = d < 54;
    coal.rubPct = Math.max(0, Math.min(100, coal.rubPct || 0));
    coal.rubNear = near;
    state.glinderRub = {
      x: coal.x,
      y: coal.y,
      d: d,
      near: near,
      close: d < 78,
      progress: (coal.rubPct || 0) / 100,
      pct: coal.rubPct || 0
    };
  }

  function rubGlinderFire(state) {
    if (!state || !state.glinderNight || state.defeat) return false;
    if (state.paused || (G.invasion && G.invasion.cinematic(state))) return false;
    var coal = glinderCoalOf(state);
    if (!coal) return false;
    var cmd = commanderOf(state);
    var px = cmd ? cmd.x : state.squad.x;
    var py = cmd ? cmd.y : state.squad.y;
    if (Math.hypot(px - coal.x, py - coal.y) > 54) return false;
    coal.rubPct = Math.min(100, (coal.rubPct || 0) + 10);
    coal.rub = coal.rubPct / 100;
    G.burst(state, coal.x, coal.y - 6, "#ff9a2a", 6, 40);
    G.burst(state, coal.x + (Math.random() - 0.5) * 10, coal.y - 8, "#ffe08a", 4, 28);
    if (G.audio && G.audio.hit) G.audio.hit();
    if (coal.rubPct >= 100) {
      lightGlinderFire(state, coal);
      if (G.audio && G.audio.explosion) G.audio.explosion();
    }
    return true;
  }

  function tickGlinderBeams(state, dt) {
    if (!state.glinderBeams || !state.glinderBeams.length) return;
    var i;
    for (i = state.glinderBeams.length - 1; i >= 0; i--) {
      state.glinderBeams[i].t -= dt;
      if (state.glinderBeams[i].t <= 0) state.glinderBeams.splice(i, 1);
    }
  }

  function clearGlinderFires(state) {
    for (var i = 0; i < (state.enemies || []).length; i++) {
      var f = state.enemies[i];
      if (f.glinderCoal) {
        f.hp = 0;
        f.noDrop = true;
      }
    }
  }

  function spawnGlinderCoal(state, e) {
    clearGlinderFires(state);
    var b = G.playfield(state);
    var pad = 58;
    var corners = [
      { x: b.x0 + pad, y: b.y0 + pad },
      { x: b.x1 - pad, y: b.y0 + pad },
      { x: b.x0 + pad, y: b.y1 - pad },
      { x: b.x1 - pad, y: b.y1 - pad }
    ];
    var best = corners[0];
    var bestD = -1;
    var sx = (e && e.x) || state.squad.x;
    var sy = (e && e.y) || state.squad.y;
    for (var i = 0; i < corners.length; i++) {
      var d1 = Math.hypot(corners[i].x - state.squad.x, corners[i].y - state.squad.y);
      var d2 = Math.hypot(corners[i].x - sx, corners[i].y - sy);
      var score = Math.min(d1, d2);
      if (score > bestD) {
        bestD = score;
        best = corners[i];
      }
    }
    G.game.spawnAt(state, "fogueira", best.x, best.y, {
      noDrop: true,
      glinderCoal: true,
      lit: false,
      immortal: true
    });
    state.banner = { text: "Ache a fogueira · aperte E", t: 2.4 };
  }

  function glinderCoverOf(state, e) {
    return (e && e.cover) || state.glinderCover || null;
  }

  function glinderCoverHidesPoint(state, ox, oy, px, py, e) {
    var c = glinderCoverOf(state, e);
    if (!c) return false;
    if (Math.hypot(px - c.x, py - c.y) < (c.r || 54) + 24) return true;
    var fx = c.x - ox;
    var fy = c.y - oy;
    var coverDist = Math.hypot(fx, fy) || 1;
    var pDist = Math.hypot(px - ox, py - oy);
    if (pDist + 8 < coverDist) return false;
    var coverAng = Math.atan2(fy, fx);
    var pAng = Math.atan2(py - oy, px - ox);
    var half = Math.asin(Math.min(0.95, ((c.r || 54) + 18) / coverDist));
    var diff = Math.abs(Math.atan2(Math.sin(pAng - coverAng), Math.cos(pAng - coverAng)));
    return diff < half * 1.2;
  }

  function glinderCoverSafeFrom(state, ox, oy, e) {
    return glinderCoverHidesPoint(state, ox, oy, state.squad.x, state.squad.y, e);
  }

  function glinderCoverClipRange(state, ox, oy, ang, range) {
    var c = state.glinderCover;
    if (!c) return range;
    var r = (c.r || 54) + 8;
    var fx = Math.cos(ang);
    var fy = Math.sin(ang);
    var dx = ox - c.x;
    var dy = oy - c.y;
    var b = dx * fx + dy * fy;
    var disc = b * b - (dx * dx + dy * dy - r * r);
    if (disc < 0) return range;
    var t = -b - Math.sqrt(disc);
    if (t < 4) t = -b + Math.sqrt(disc);
    if (!(t > 4) || t >= range) return range;
    return t;
  }

  function glinderCoverSafe(state, e) {
    var b = G.playfield(state);
    return glinderCoverSafeFrom(state, (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, e);
  }

  function glinderCoverBlocksShot(state, p) {
    if (!p || p.kind !== "darkember") return false;
    var c = state.glinderCover;
    if (!c) return false;
    var dx = p.x - c.x;
    var dy = p.y - c.y;
    var rad = (c.r || 54) + (p.r || 4) + 6;
    return dx * dx + dy * dy <= rad * rad;
  }

  function fireGlinderLaser(state, e, target, dual) {
    if (!target) return;
    var ang = Math.atan2(target.y - e.y, target.x - e.x);
    var beamLen = vultoBeamLen(state);
    e.rot = ang;
    var dmg = Math.round(e.def.dmg * 0.85);
    function beamFrom(ox, oy, bang) {
      var hitLen = glinderCoverClipRange(state, ox, oy, bang, beamLen);
      var blocked = hitLen < beamLen - 2;
      hurtBeam(state, ox, oy, bang, hitLen, 14, dmg);
      burnSquadBeam(state, ox, oy, bang, hitLen, 16, Math.max(6, e.def.dmg * 0.28));
      var ca = Math.cos(bang);
      var sa = Math.sin(bang);
      if (!state.glinderBeams) state.glinderBeams = [];
      state.glinderBeams.push({
        x: ox,
        y: oy,
        ang: bang,
        len: hitLen,
        t: 0.28,
        max: 0.28,
        w: 18
      });
      var sparks = blocked ? 22 : 36;
      for (var n = 0; n < sparks; n++) {
        var along = (n / Math.max(1, sparks - 1)) * hitLen;
        var jitter = (Math.random() - 0.5) * 14;
        state.particles.push({
          x: ox + ca * along - sa * jitter,
          y: oy + sa * along + ca * jitter,
          vx: ca * (280 + Math.random() * 220) - sa * jitter * 8,
          vy: sa * (280 + Math.random() * 220) + ca * jitter * 8,
          life: 0.18 + Math.random() * 0.16,
          max: 0.34,
          size: n < 4 ? 10 : 3.2 + Math.random() * 5,
          color: n < 6 ? "#fff4c4" : (Math.random() > 0.35 ? "#ff6a18" : "#ffe060")
        });
      }
      if (blocked) {
        var ix = ox + ca * hitLen;
        var iy = oy + sa * hitLen;
        G.burst(state, ix, iy, "#ff6a18", 10, 55);
        G.burst(state, ix, iy, "#ffe08a", 6, 38);
      }
    }
    if (dual) {
      var px = Math.cos(ang + Math.PI / 2) * 16;
      var py = Math.sin(ang + Math.PI / 2) * 16;
      beamFrom(e.x + px, e.y + py, ang);
      beamFrom(e.x - px, e.y - py, ang);
    } else {
      beamFrom(e.x, e.y, ang);
    }
    if (G.audio && G.audio.laser) G.audio.laser();
    else if (G.audio && G.audio.shoot) G.audio.shoot();
  }

  function lockGlinderLaser(e, target) {
    if (!target) return;
    e.laserAimX = target.x;
    e.laserAimY = target.y;
  }

  function warnGlinderLaser(state, e, dual, dur) {
    if (e.laserAimX == null) return;
    var ang = Math.atan2(e.laserAimY - e.y, e.laserAimX - e.x);
    var beamLen = vultoBeamLen(state);
    var wait = Math.max(0.12, dur || 0.4);
    function lane(ox, oy) {
      warnAt(state, {
        kind: "glinder_lane",
        x: ox,
        y: oy,
        ang: ang,
        len: glinderCoverClipRange(state, ox, oy, ang, beamLen),
        w: 16,
        t: wait,
        max: wait,
        r: 10,
        dmg: 0,
        color: "#ffd24a"
      });
    }
    e.rot = ang;
    if (dual) {
      var px = Math.cos(ang + Math.PI / 2) * 16;
      var py = Math.sin(ang + Math.PI / 2) * 16;
      lane(e.x + px, e.y + py);
      lane(e.x - px, e.y - py);
    } else {
      lane(e.x, e.y);
    }
  }

  function beginGlinderLaser(state, e, target, dual, count) {
    e.vultoAct = "laser";
    e.laserLeft = count;
    e.vx = e.vy = 0;
    lockGlinderLaser(e, target || state.squad);
    e.laserWait = dual ? 0.95 : 0.9;
    warnGlinderLaser(state, e, !!dual, e.laserWait);
    state.floaters.push(G.createFloater(e.x, e.y - 24, dual ? "laser duplo" : "laser", "#ff7a2a"));
  }

  function tickGlinderLaser(state, e, target, dt, dual) {
    e.vx = e.vy = 0;
    e.laserWait = (e.laserWait || 0) - dt;
    if (e.laserAimX != null) e.rot = Math.atan2(e.laserAimY - e.y, e.laserAimX - e.x);
    else if (target) e.rot = Math.atan2(target.y - e.y, target.x - e.x);
    if (e.laserWait <= 0 && (e.laserLeft || 0) > 0) {
      var aim = e.laserAimX != null ? { x: e.laserAimX, y: e.laserAimY } : (target || state.squad);
      fireGlinderLaser(state, e, aim, !!dual);
      e.laserLeft--;
      if ((e.laserLeft || 0) > 0) {
        lockGlinderLaser(e, target || state.squad);
        e.laserWait = dual ? 0.58 : 0.62;
        warnGlinderLaser(state, e, !!dual, e.laserWait);
      }
    }
    if ((e.laserLeft || 0) <= 0 && e.laserWait <= 0) {
      e.vultoAct = "";
      e.vultoT = dual ? 1.55 : 1.85;
    }
  }

  function tickGlinderFlash(state, dt) {
    if (state.glinderFlashMax) {
      state.glinderFlashT = (state.glinderFlashT || 0) + dt;
      var t = state.glinderFlashT;
      var fadeIn = 0.16;
      var hold = 0.45;
      var fadeOut = 2.55;
      if (t < fadeIn) state.glinderFlash = t / fadeIn;
      else if (t < fadeIn + hold) state.glinderFlash = 1;
      else state.glinderFlash = Math.max(0, 1 - (t - fadeIn - hold) / fadeOut);
      if (t >= fadeIn + hold + fadeOut) {
        state.glinderFlash = 0;
        state.glinderFlashT = 0;
        state.glinderFlashMax = 0;
      }
      return;
    }
    if (state.glinderFlash) state.glinderFlash = Math.max(0, state.glinderFlash - dt * 1.8);
  }

  function startGlinderFlash(state) {
    state.glinderFlashT = 0;
    state.glinderFlashMax = 3.16;
    state.glinderFlash = 0.05;
    if (G.audio && G.audio.tinnitus) G.audio.tinnitus();
  }

  function glinderToNovaCenter(state, e) {
    var b = G.playfield(state);
    var cx = (b.x0 + b.x1) / 2;
    var cy = (b.y0 + b.y1) / 2;
    if (!e) return;
    var dx = (e.x || 0) - cx;
    var dy = (e.y || 0) - cy;
    if (dx * dx + dy * dy > 64) {
      G.burst(state, e.x, e.y, "#ff6a18", 12, 80);
      G.burst(state, cx, cy, "#ff4a18", 18, 110);
    }
    e.x = cx;
    e.y = cy;
    e.vx = e.vy = 0;
  }

  function spawnGlinderCover(state, e, avoid) {
    var b = G.playfield(state);
    var cx = (b.x0 + b.x1) / 2;
    var cy = (b.y0 + b.y1) / 2;
    var sdx = state.squad.x - cx;
    var sdy = state.squad.y - cy;
    var pang = (sdx * sdx + sdy * sdy < 1600) ? Math.random() * Math.PI * 2 : Math.atan2(sdy, sdx);
    var reach = Math.min((b.x1 - b.x0), (b.y1 - b.y0)) * 0.3;
    var best = null;
    var bestScore = -1;
    var tries;
    for (tries = 0; tries < 10; tries++) {
      var ang = pang + (tries % 2 ? 1 : -1) * (0.35 + tries * 0.31 + Math.random() * 0.2);
      var x = cx + Math.cos(ang) * reach;
      var y = cy + Math.sin(ang) * reach;
      x = Math.max(b.x0 + 70, Math.min(b.x1 - 70, x));
      y = Math.max(b.y0 + 70, Math.min(b.y1 - 70, y));
      var nearSquad = Math.hypot(x - state.squad.x, y - state.squad.y);
      var away = avoid ? Math.hypot(x - avoid.x, y - avoid.y) : 220;
      var score = Math.min(220, nearSquad) + away * 1.4;
      if (away < 160) score -= 400;
      if (score > bestScore) {
        bestScore = score;
        best = { x: x, y: y, r: 54 };
      }
    }
    e.cover = best || { x: cx + 80, y: cy, r: 54 };
    state.glinderCover = e.cover;
  }

  function glinderNovaBurst(state, e) {
    glinderToNovaCenter(state, e);
    var b = G.playfield(state);
    var cx = (b.x0 + b.x1) / 2;
    var cy = (b.y0 + b.y1) / 2;
    var maxR = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) * 0.72;
    e.novaWave = { x: cx, y: cy, r: 12, maxR: maxR, t: 0.85, max: 0.85 };
    state.shake = Math.max(state.shake || 0, 16);
    G.burst(state, cx, cy, "#ff6a18", 36, 220);
    G.burst(state, cx, cy, "#fff4c4", 22, 160);
    if (G.audio && G.audio.explosion) G.audio.explosion();
    if (!glinderCoverSafe(state, e)) {
      for (var i = 0; i < state.units.length; i++) {
        var u = state.units[i];
        if (u.hp <= 0 || u.stowed) continue;
        hurt(state, u, u.maxHp * 8, cx, cy, false, { trueDmg: true, ignoreDash: true });
      }
    } else {
      state.floaters.push(G.createFloater(state.squad.x, state.squad.y - 26, "abrigado", "#ffe08a"));
    }
  }

  function glinderP2(e) {
    return !!(e && (e.p2 || e.invP2));
  }

  function spawnGlinderSun(state, e) {
    var b = G.playfield(state);
    var cx = (b.x0 + b.x1) / 2;
    var cy = (b.y0 + b.y1) / 2;
    var behind = Math.atan2(cy - (e && e.y || cy), cx - (e && e.x || cx));
    if (e) behind = Math.atan2(e.y - cy, e.x - cx) + Math.PI;
    var dist = Math.min((b.x1 - b.x0), (b.y1 - b.y0)) * 0.22;
    var x = (e ? e.x : cx) + Math.cos(behind) * 70;
    var y = (e ? e.y : cy) + Math.sin(behind) * 70;
    x = Math.max(b.x0 + 50, Math.min(b.x1 - 50, x));
    y = Math.max(b.y0 + 50, Math.min(b.y1 - 50, y));
    if (Math.hypot(x - cx, y - cy) < 40) {
      x = cx - dist;
      y = cy;
    }
    state.glinderSun = {
      x: x,
      y: y,
      r: 28,
      absorb: 0,
      maxR: 86,
      shotT: 1.1,
      waveT: 4.2,
      wave: null,
      novaT: 0,
      novaPhase: "",
      eaten: {}
    };
    G.burst(state, x, y, "#1a0808", 18, 80);
    G.burst(state, x, y, "#ff4a18", 10, 60);
  }

  function sunScale(sun) {
    return 1 + Math.min(1.8, (sun.absorb || 0) * 0.22);
  }

  function tickGlinderFoci(state, dt) {
    var foci = state.glinderFoci;
    if (!foci || !foci.length) return;
    if (state.glinderMaze && state.glinderMaze.phase !== "done") return;
    var i;
    for (i = foci.length - 1; i >= 0; i--) {
      var f = foci[i];
      f.t -= dt;
      if (f.t <= 0) {
        foci.splice(i, 1);
        continue;
      }
      var u;
      for (u = 0; u < state.units.length; u++) {
        var un = state.units[u];
        if (un.hp <= 0 || un.stowed) continue;
        if (Math.hypot(un.x - f.x, un.y - f.y) < (f.r || 26) + (un.def.size || 12) * 0.4) {
          hurt(state, un, 11 * dt, f.x, f.y, false, { trueDmg: true });
          burnUnit(un, 5, 6);
        }
      }
    }
  }

  function tickGlinderSun(state, dt) {
    var sun = state.glinderSun;
    if (!sun || sun.dead) return;
    if (state.glinderMaze && state.glinderMaze.phase !== "done") return;
    if (state.glinderBurn) return;
    sun.r = Math.min(sun.maxR, sun.r + dt * 1.15 + (sun.absorb || 0) * dt * 0.35);
    var scale = sunScale(sun);
    var pullR = sun.r * 4.2 * scale;
    var pull = 38 * scale;
    var i;
    var sx = sun.x;
    var sy = sun.y;
    var dx = sx - state.squad.x;
    var dy = sy - state.squad.y;
    var d = Math.hypot(dx, dy) || 1;
    var hidden = glinderCoverSafeFrom(state, sx, sy);
    if (d < pullR && !hidden) {
      var pk = (1 - d / pullR) * pull * dt;
      state.squad.x += (dx / d) * pk;
      state.squad.y += (dy / d) * pk;
    }
    if (d < sun.r * 0.72 + 16 && !hidden) {
      for (i = 0; i < state.units.length; i++) {
        var u = state.units[i];
        if (u.hp <= 0 || u.stowed) continue;
        hurt(state, u, 16 * dt * scale, sx, sy, false, { trueDmg: true });
      }
    }
    for (i = 0; i < (state.enemies || []).length; i++) {
      var en = state.enemies[i];
      if (en.hp <= 0 || en.scenery || en.type === "chefe_vulto" || en.glinderCoal || en.type === "fogueira") continue;
      var ex = sx - en.x;
      var ey = sy - en.y;
      var ed = Math.hypot(ex, ey) || 1;
      if (ed < pullR * 1.15) {
        var ep = (1 - ed / (pullR * 1.15)) * 70 * dt;
        en.x += (ex / ed) * ep;
        en.y += (ey / ed) * ep;
      }
      if (ed < sun.r * 0.85 + (en.def.size || 12) && !sun.eaten[en.id]) {
        sun.eaten[en.id] = 1;
        sun.absorb = (sun.absorb || 0) + 1;
        en.hp = 0;
        en.noDrop = true;
        G.burst(state, en.x, en.y, "#3a1020", 12, 70);
        sun.r = Math.min(sun.maxR, sun.r + 6);
      }
    }
    if (sun.wave) {
      sun.wave.t -= dt;
      var wk = 1 - Math.max(0, sun.wave.t) / (sun.wave.max || 0.7);
      sun.wave.r = 18 + wk * (sun.wave.maxR || 280);
      var band = 18 * scale;
      var wr = sun.wave.r;
      var dashing = !!(state.dashActive || (state.dashT || 0) > 0);
      var waveHid = glinderCoverSafeFrom(state, sx, sy);
      if (waveHid) {
        if (!sun.waveCovered) {
          sun.waveCovered = true;
          state.floaters.push(G.createFloater(state.squad.x, state.squad.y - 26, "abrigado", "#ffe08a"));
        }
      } else if (!dashing) {
        for (i = 0; i < state.units.length; i++) {
          var wu = state.units[i];
          if (wu.hp <= 0 || wu.stowed) continue;
          var wd = Math.hypot(wu.x - sx, wu.y - sy);
          if (Math.abs(wd - wr) < band + (wu.def.size || 12)) {
            hurt(state, wu, Math.round(18 * scale), sx, sy, false);
            burnUnit(wu, 5, 8);
          }
        }
      }
      if (sun.wave.t <= 0) {
        sun.wave = null;
        sun.waveCovered = false;
      }
    }
    if (sun.novaPhase === "warn") {
      sun.novaT -= dt;
      state.glinderSuperT = sun.novaT;
      if (sun.novaT <= 0) {
        sun.novaPhase = "boom";
        var fresh = !!(state.dashActive && (state.dashT || 0) > 0.17 && (state.dashT || 0) < 0.31);
        startGlinderFlash(state);
        state.shake = Math.max(state.shake || 0, 22);
        G.burst(state, sx, sy, "#fff4c4", 48, 280);
        G.burst(state, sx, sy, "#1a0408", 32, 200);
        if (G.audio && G.audio.explosion) G.audio.explosion();
        if (!fresh) {
          for (i = 0; i < state.units.length; i++) {
            var su = state.units[i];
            if (su.hp <= 0 || su.stowed) continue;
            hurt(state, su, su.maxHp * 8, sx, sy, false, { trueDmg: true, ignoreDash: true });
          }
        } else {
          state.floaters.push(G.createFloater(state.squad.x, state.squad.y - 28, "no fio", "#ffe08a"));
          state.vultoBlind = Math.max(state.vultoBlind || 0, 2.8);
        }
        sun.dead = true;
        sun.novaPhase = "done";
        state.glinderSuperT = 0;
        state.glinderSun = sun;
      }
      return;
    }
    if (sun.r >= sun.maxR - 0.4 || (sun.absorb || 0) >= 8) {
      if (!sun.novaPhase) {
        var b = G.playfield(state);
        var coverR = Math.hypot(Math.max(sx - b.x0, b.x1 - sx), Math.max(sy - b.y0, b.y1 - sy)) + 40;
        sun.novaPhase = "warn";
        sun.novaT = 2.05;
        sun.novaR = coverR;
        state.glinderSuperT = 2.05;
        state.glinderSuperMax = 2.05;
        state.banner = { text: "SUPERNOVA · SHIFT no estalo", t: 2.1 };
        warnAt(state, { kind: "mark", x: sx, y: sy, t: 2.05, max: 2.05, r: coverR, dmg: 0, color: "#fff4c4", followSquad: false });
      }
      return;
    }
    sun.shotT -= dt;
    sun.waveT -= dt;
    if ((sun.waveWarn || 0) > 0) {
      sun.waveWarn -= dt;
      if (sun.waveWarn <= 0) {
        sun.wave = { r: 16, maxR: sun.waveMaxR || (260 + scale * 40), t: 0.72, max: 0.72 };
        state.banner = { text: "Onda negra · SHIFT", t: 1.1 };
      }
    } else if (sun.waveT <= 0) {
      sun.waveT = 5.4;
      sun.waveMaxR = 260 + scale * 40;
      sun.waveWarn = 0.85;
      warnAt(state, { kind: "mark", x: sx, y: sy, t: 0.85, max: 0.85, r: sun.waveMaxR, dmg: 0, color: "#ff3a18", followSquad: false });
      state.banner = { text: "Onda carregando", t: 0.85 };
    }
    if ((sun.shotWarn || 0) > 0) {
      sun.shotWarn -= dt;
      if (sun.shotWarn <= 0 && sun.shotPending) {
        var pending = sun.shotPending;
        var si;
        for (si = 0; si < pending.n; si++) {
          var sa = pending.base + (si - (pending.n - 1) / 2) * (0.18 * scale);
          state.projectiles.push(G.createProjectile({
            x: sx + Math.cos(sa) * sun.r * 0.4,
            y: sy + Math.sin(sa) * sun.r * 0.4,
            vx: Math.cos(sa) * 210,
            vy: Math.sin(sa) * 210,
            dmg: Math.round(10 * scale),
            team: "enemy",
            kind: "darkember",
            life: 1.6,
            r: 4 + scale,
            burn: true,
            color: "#4a1020",
            fromBoss: true
          }));
        }
        sun.shotPending = null;
      }
    } else if (sun.shotT <= 0) {
      sun.shotT = Math.max(0.42, 1.05 - (sun.absorb || 0) * 0.06);
      var n = 3 + Math.min(4, sun.absorb | 0);
      var base = Math.atan2(state.squad.y - sy, state.squad.x - sx);
      sun.shotWarn = 0.42;
      sun.shotPending = { n: n, base: base };
      var siw;
      for (siw = 0; siw < n; siw++) {
        var wa = base + (siw - (n - 1) / 2) * (0.18 * scale);
        warnAt(state, {
          kind: "lane",
          x: sx,
          y: sy,
          ang: wa,
          len: 220 + scale * 30,
          w: 9,
          t: 0.42,
          max: 0.42,
          r: 8,
          dmg: 0,
          color: "#ff4a18"
        });
      }
    }
  }

  function mazeHit(state, x, y, rad) {
    var maze = state.glinderMaze;
    if (!maze || !maze.walls) return null;
    var t = maze.t || 0;
    var building = maze.phase === "build";
    var best = null;
    var bestD = 1e9;
    var i;
    for (i = 0; i < maze.walls.length; i++) {
      var w = maze.walls[i];
      if (building && (w.appear || 0) > t) continue;
      var x0 = w.x0 != null ? w.x0 : w.x;
      var y0 = w.y0 != null ? w.y0 : w.y;
      var x1 = w.x1 != null ? w.x1 : w.x;
      var y1 = w.y1 != null ? w.y1 : w.y;
      var hitR = w.hitR != null ? w.hitR : 9;
      var thick = hitR + rad;
      var dx = x1 - x0;
      var dy = y1 - y0;
      var px;
      var py;
      var d;
      if (Math.abs(dx) >= Math.abs(dy)) {
        var xa = Math.min(x0, x1);
        var xb = Math.max(x0, x1);
        if (x < xa || x > xb) continue;
        d = Math.abs(y - y0);
        if (d >= thick) continue;
        px = x;
        py = y0;
      } else {
        var ya = Math.min(y0, y1);
        var yb = Math.max(y0, y1);
        if (y < ya || y > yb) continue;
        d = Math.abs(x - x0);
        if (d >= thick) continue;
        px = x0;
        py = y;
      }
      if (d * d < bestD) {
        bestD = d * d;
        best = { x: px, y: py, r: hitR };
      }
    }
    return best;
  }

  function resolveMazeMove(state, ox, oy) {
    var maze = state.glinderMaze;
    if (!maze || maze.phase !== "run") return;
    var nx = state.squad.x;
    var ny = state.squad.y;
    var steps = (state.dashActive || (state.dashT || 0) > 0) ? 14 : 8;
    var i;
    var hit = null;
    for (i = 1; i <= steps; i++) {
      var k = i / steps;
      var x = ox + (nx - ox) * k;
      var y = oy + (ny - oy) * k;
      hit = mazeHit(state, x, y, 11);
      if (hit) {
        state.squad.x = x;
        state.squad.y = y;
        break;
      }
    }
    if (!hit) return;
    var dx = state.squad.x - hit.x;
    var dy = state.squad.y - hit.y;
    var d = Math.hypot(dx, dy) || 1;
    var rad = (hit.r || 9) + 11;
    state.squad.x = hit.x + (dx / d) * rad;
    state.squad.y = hit.y + (dy / d) * rad;
    if (state.dashActive || (state.dashT || 0) > 0) {
      state.dashActive = false;
      state.dashT = 0;
      state.dashSlideT = 0;
    }
    var cmd = commanderOf(state);
    if (cmd) {
      hurt(state, cmd, 22, hit.x, hit.y, false, { trueDmg: true, ignoreDash: true });
      burnUnit(cmd, 5, 10);
    }
  }

  function addMazeWallSeg(walls, x0, y0, x1, y1, appear, rad) {
    walls.push({
      x0: x0,
      y0: y0,
      x1: x1,
      y1: y1,
      x: (x0 + x1) * 0.5,
      y: (y0 + y1) * 0.5,
      r: rad || 15,
      hitR: 8,
      appear: appear || 0
    });
  }

  function mazeShuffle(arr) {
    var i;
    for (i = arr.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function buildGlinderMaze(state) {
    var b = G.playfield(state);
    var pad = 8;
    var minCell = 92;
    var availW = Math.max(40, b.x1 - b.x0 - pad * 2);
    var availH = Math.max(40, b.y1 - b.y0 - pad * 2);
    var cols = Math.max(4, Math.floor(availW / minCell));
    var rows = Math.max(3, Math.floor(availH / minCell));
    var cellW = availW / cols;
    var cellH = availH / rows;
    var wallR = 15;
    var ox = b.x0 + (b.x1 - b.x0 - availW) * 0.5;
    var oy = b.y0 + (b.y1 - b.y0 - availH) * 0.5;
    var grid = [];
    var r;
    var c;
    for (r = 0; r < rows; r++) {
      grid[r] = [];
      for (c = 0; c < cols; c++) grid[r][c] = { n: 1, e: 1, s: 1, w: 1, vis: 0 };
    }
    var corners = [
      { r: 0, c: 0 },
      { r: 0, c: cols - 1 },
      { r: rows - 1, c: 0 },
      { r: rows - 1, c: cols - 1 }
    ];
    var start = corners[(Math.random() * corners.length) | 0];
    var sr = start.r;
    var sc = start.c;
    var frontier = [{ r: sr, c: sc }];
    grid[sr][sc].vis = 1;
    function nbs(rr, cc) {
      var d = [];
      if (rr > 0) d.push({ r: rr - 1, c: cc, a: "n", b: "s" });
      if (cc < cols - 1) d.push({ r: rr, c: cc + 1, a: "e", b: "w" });
      if (rr < rows - 1) d.push({ r: rr + 1, c: cc, a: "s", b: "n" });
      if (cc > 0) d.push({ r: rr, c: cc - 1, a: "w", b: "e" });
      return d;
    }
    while (frontier.length) {
      var idx = Math.random() < 0.56 ? frontier.length - 1 : ((Math.random() * frontier.length) | 0);
      var cur = frontier[idx];
      var dirs = nbs(cur.r, cur.c).filter(function (d) { return !grid[d.r][d.c].vis; });
      if (!dirs.length) {
        frontier.splice(idx, 1);
        continue;
      }
      mazeShuffle(dirs);
      var pick = dirs[0];
      grid[cur.r][cur.c][pick.a] = 0;
      grid[pick.r][pick.c][pick.b] = 0;
      grid[pick.r][pick.c].vis = 1;
      frontier.push({ r: pick.r, c: pick.c });
    }
    var dist = [];
    for (r = 0; r < rows; r++) {
      dist[r] = [];
      for (c = 0; c < cols; c++) dist[r][c] = -1;
    }
    var q = [{ r: sr, c: sc }];
    dist[sr][sc] = 0;
    var far = { r: sr, c: sc, d: 0 };
    while (q.length) {
      var node = q.shift();
      var cell = grid[node.r][node.c];
      var walk = [];
      if (!cell.n) walk.push({ r: node.r - 1, c: node.c });
      if (!cell.s) walk.push({ r: node.r + 1, c: node.c });
      if (!cell.e) walk.push({ r: node.r, c: node.c + 1 });
      if (!cell.w) walk.push({ r: node.r, c: node.c - 1 });
      var wi;
      for (wi = 0; wi < walk.length; wi++) {
        var n = walk[wi];
        if (n.r < 0 || n.c < 0 || n.r >= rows || n.c >= cols) continue;
        if (dist[n.r][n.c] >= 0) continue;
        dist[n.r][n.c] = dist[node.r][node.c] + 1;
        if (dist[n.r][n.c] > far.d) far = { r: n.r, c: n.c, d: dist[n.r][n.c] };
        q.push(n);
      }
    }
    var er = far.r;
    var ec = far.c;
    function openOuter(rr, cc) {
      if (cc === 0) grid[rr][cc].w = 0;
      if (cc === cols - 1) grid[rr][cc].e = 0;
      if (rr === 0) grid[rr][cc].n = 0;
      if (rr === rows - 1) grid[rr][cc].s = 0;
    }
    openOuter(sr, sc);
    openOuter(er, ec);
    var walls = [];
    var appear = 0;
    function cellX(cc) { return ox + (cc + 0.5) * cellW; }
    function cellY(rr) { return oy + (rr + 0.5) * cellH; }
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var cell = grid[r][c];
        var x = cellX(c);
        var y = cellY(r);
        var hw = cellW / 2;
        var hh = cellH / 2;
        if (cell.n) {
          addMazeWallSeg(walls, x - hw, y - hh, x + hw, y - hh, appear, wallR);
          appear += 0.006;
        }
        if (cell.w) {
          addMazeWallSeg(walls, x - hw, y - hh, x - hw, y + hh, appear, wallR);
          appear += 0.006;
        }
        if (r === rows - 1 && cell.s) {
          addMazeWallSeg(walls, x - hw, y + hh, x + hw, y + hh, appear, wallR);
          appear += 0.006;
        }
        if (c === cols - 1 && cell.e) {
          addMazeWallSeg(walls, x + hw, y - hh, x + hw, y + hh, appear, wallR);
          appear += 0.006;
        }
      }
    }
    return {
      phase: "build",
      t: 0,
      buildDur: Math.min(2.6, 0.7 + appear * 0.08),
      timer: 36,
      timerMax: 36,
      walls: walls,
      start: { x: cellX(sc), y: cellY(sr) },
      goal: { x: cellX(ec), y: cellY(er) },
      cols: cols,
      rows: rows,
      cellW: cellW,
      cellH: cellH,
      bounds: { x0: ox, y0: oy, x1: ox + availW, y1: oy + availH },
      prisonR: 0,
      stamped: -1
    };
  }

  function spawnGlinderPrison(state) {
    state.glinderFoci = [];
  }

  function startGlinderMaze(state, e) {
    var maze = buildGlinderMaze(state);
    state.glinderMaze = maze;
    e.vultoAct = "maze";
    e.mazeUsed = true;
    e.immortal = true;
    e.mazeHide = true;
    e.vx = e.vy = 0;
    e.zDraw = 0;
    e.x = -500;
    e.y = -500;
    e.cover = null;
    state.glinderCover = null;
    spawnGlinderPrison(state);
    state.projectiles = [];
    state.warnings = [];
    state.squad.x = maze.start.x;
    state.squad.y = maze.start.y;
    state.dashT = 0;
    state.dashActive = false;
    state.banner = { text: "Atravesse o labirinto · 36s", t: 2.2 };
  }

  function endGlinderMaze(state, e, ok) {
    var maze = state.glinderMaze;
    if (!maze) return;
    maze.phase = "done";
    maze.walls = [];
    maze.layer = null;
    if (e) {
      e.vultoAct = "";
      e.vultoT = 2.1;
      e.immortal = false;
      e.zDraw = 0;
      e.mazeHide = false;
      var b = G.playfield(state);
      e.x = (b.x0 + b.x1) / 2;
      e.y = (b.y0 + b.y1) / 2;
    }
    if (ok) {
      state.banner = { text: "O esquadrão se reúne", t: 1.8 };
      G.burst(state, state.squad.x, state.squad.y, "#ffe08a", 18, 90);
    }
  }

  function startGlinderBurn(state, e) {
    var cmd = commanderOf(state);
    if (!cmd) return;
    state.glinderBurn = {
      t: 0,
      max: 4.15,
      phase: "fly",
      cmdId: cmd.id,
      fromX: e ? e.x : cmd.x,
      fromY: e ? e.y : cmd.y
    };
    if (e) {
      e.immortal = true;
      e.vultoAct = "burn";
    }
    cmd.hp = Math.max(1, cmd.hp);
    cmd.burnT = 8;
    cmd.burnDps = 0;
    state.dashT = 0;
    state.dashActive = false;
    state.banner = { text: "Ela te pega", t: 1.6 };
  }

  function tickGlinderBurn(state, dt) {
    var burn = state.glinderBurn;
    if (!burn) return false;
    burn.t += dt;
    var cmd = null;
    var e = null;
    var i;
    for (i = 0; i < state.units.length; i++) {
      if (state.units[i].id === burn.cmdId || state.units[i].commander) cmd = state.units[i];
    }
    for (i = 0; i < (state.enemies || []).length; i++) {
      if (state.enemies[i].type === "chefe_vulto") e = state.enemies[i];
    }
    if (!cmd) {
      state.glinderAshDefeat = true;
      return false;
    }
    cmd.stowed = false;
    cmd.held = false;
    if (burn.t < 0.85 && e) {
      var k = burn.t / 0.85;
      k = k * k * (3 - 2 * k);
      e.x = burn.fromX + (cmd.x - burn.fromX) * k;
      e.y = burn.fromY + (cmd.y - 18 - burn.fromY) * k;
      e.zDraw = 20 + k * 16;
      e.rot = Math.atan2(cmd.y - e.y, cmd.x - e.x);
      state.camLook = { x: e.x, y: e.y };
      state.camZoomTo = 1.4 + k * 0.8;
    } else if (burn.t < 2.35) {
      burn.phase = "grab";
      if (e) {
        e.x = cmd.x;
        e.y = cmd.y - 22;
        e.zDraw = 36;
        cmd.x = e.x;
        cmd.y = e.y + 10;
        cmd.burnKill = burn.t;
        cmd.leapZ = 18;
      }
      state.squad.x = cmd.x;
      state.squad.y = cmd.y;
      state.camLook = { x: cmd.x, y: cmd.y - 20 };
      state.camZoomTo = 2.4;
      state.shake = Math.max(state.shake || 0, 8);
      if ((burn.spark || 0) <= 0) {
        burn.spark = 0.08;
        G.burst(state, cmd.x, cmd.y, "#ff6a18", 8, 70);
        G.burst(state, cmd.x, cmd.y, "#1a0808", 6, 40);
      }
      burn.spark = (burn.spark || 0) - dt;
    } else if (burn.t < 3.35) {
      burn.phase = "ash";
      cmd.burnKill = burn.t;
      cmd.ashT = (burn.t - 2.35) / 1.0;
      cmd.leapZ = 4 * (1 - cmd.ashT);
      if (e) {
        e.zDraw = 24;
        e.y = cmd.y - 16;
      }
      state.camZoomTo = 3.1;
      if (cmd.ashT > 0.45 && !burn.ashed) {
        burn.ashed = true;
        G.burst(state, cmd.x, cmd.y, "#6a5438", 22, 50);
        G.burst(state, cmd.x, cmd.y, "#1a0808", 14, 40);
      }
    } else {
      cmd.hp = 0;
      cmd.ashT = 1;
      state.glinderAshDefeat = true;
      if (e) {
        e.immortal = false;
        e.zDraw = 0;
      }
      return false;
    }
    return true;
  }

  function spawnGlinderAsh(state, x, y, n, lift) {
    var i;
    for (i = 0; i < n; i++) {
      var drift = (Math.random() - 0.5) * 1.15;
      var up = -(55 + Math.random() * (lift ? 130 : 70));
      var pick = Math.random();
      var col = pick < 0.22 ? "#ffe08a" : pick < 0.58 ? "#ff4a28" : "#c01818";
      var life = 0.85 + Math.random() * 1.15;
      state.particles.push({
        x: x + (Math.random() - 0.5) * 38,
        y: y + (Math.random() - 0.5) * 26,
        vx: drift * (22 + Math.random() * 48),
        vy: up,
        life: life,
        max: life,
        size: 1.6 + Math.random() * 3.8,
        color: col,
        ash: true
      });
    }
  }

  function startGlinderDeath(state, e) {
    if (!e || e.glinderDying) return;
    if (state.glinderMaze && state.glinderMaze.phase !== "done") {
      endGlinderMaze(state, e, true);
    }
    endGlinderNight(state, e);
    e.glinderDying = true;
    e.immortal = true;
    e.hp = Math.max(1, e.hp);
    e.vx = 0;
    e.vy = 0;
    e.vultoAct = "death";
    e.mazeHide = false;
    e.glinderAsh = 0;
    e.cover = null;
    state.glinderCover = null;
    state.glinderNovaT = 0;
    e.novaWave = null;
    e.novaDid = true;
    if (state.glinderSun) state.glinderSun.dead = true;
    state.glinderSun = null;
    state.glinderBeams = [];
    state.glinderFoci = [];
    state.glinderDeath = {
      t: 0,
      max: 5.2,
      id: e.id,
      x: e.x,
      y: e.y,
      spark: 0
    };
    state.dashT = 0;
    state.dashActive = false;
    state.projectiles = [];
    state.warnings = [];
    state.shake = Math.max(state.shake || 0, 12);
    if (G.audio && G.audio.explosion) G.audio.explosion();
    G.burst(state, e.x, e.y, "#ff4a18", 24, 130);
    G.burst(state, e.x, e.y, "#ffe08a", 14, 90);
    spawnGlinderAsh(state, e.x, e.y, 16, false);
  }

  function tickGlinderDeath(state, dt) {
    var death = state.glinderDeath;
    if (!death) return false;
    death.t += dt;
    var e = null;
    var i;
    for (i = 0; i < (state.enemies || []).length; i++) {
      if (state.enemies[i].id === death.id || state.enemies[i].type === "chefe_vulto") {
        e = state.enemies[i];
        break;
      }
    }
    if (!e) {
      state.glinderDeath = null;
      return false;
    }
    e.glinderDying = true;
    e.immortal = true;
    e.hp = Math.max(1, e.hp);
    e.vx = 0;
    e.vy = 0;
    e.vultoAct = "death";
    e.mazeHide = false;
    e.phase = (e.phase || 0) + dt * (2.4 + Math.min(3.2, death.t * 1.4));
    var k = Math.max(0, Math.min(1, death.t / death.max));
    var rise = k < 0.46 ? k / 0.46 : 1;
    rise = rise * rise * (3 - 2 * rise);
    var crumble = Math.max(0, Math.min(1, (death.t - 2.15) / 1.55));
    e.glinderAsh = crumble;
    e.zDraw = 16 + rise * 240 + crumble * 150;
    e.x = death.x + Math.sin(death.t * 2.1) * (10 + rise * 18);
    e.y = death.y;
    e.rot = Math.sin(death.t * 1.8) * 0.18 * (1 - crumble * 0.4);
    var spriteY = e.y - (e.zDraw || 0);
    state.camLook = { x: e.x, y: spriteY + 28 };
    state.camZoomTo = 1.12 + rise * 0.22 - crumble * 0.16;
    state.glinderHeat = Math.max(0.08, 0.38 + rise * 0.32 - crumble * 0.48);
    if (crumble > 0.12 && !death.broke) {
      death.broke = true;
      spawnGlinderAsh(state, e.x, spriteY, 24, true);
      G.burst(state, e.x, spriteY, "#ff4a28", 14, 48);
      G.burst(state, e.x, spriteY, "#ffe08a", 8, 36);
      state.shake = Math.max(state.shake || 0, 10);
    }
    death.spark = (death.spark || 0) - dt;
    var ashN = death.t < 0.45 ? 4 : crumble > 0.15 ? 9 : 5;
    if (death.spark <= 0) {
      death.spark = crumble > 0.2 ? 0.038 : 0.07;
      spawnGlinderAsh(state, e.x, spriteY, ashN, true);
      if (crumble > 0.35) G.burst(state, e.x, spriteY, "#ff4a28", 3, 28);
    }
    if (death.t >= death.max) {
      spawnGlinderAsh(state, e.x, spriteY, 32, true);
      G.burst(state, e.x, spriteY, "#ff6a28", 16, 64);
      G.burst(state, e.x, spriteY, "#ffe08a", 10, 46);
      e.x = death.x;
      e.y = death.y;
      e.zDraw = 0;
      e.glinderAsh = 1;
      e.mazeHide = true;
      e.immortal = false;
      e.hp = 0;
      state.glinderDeath = null;
      state.camLook = null;
      state.camZoomTo = 1;
      state.glinderHeat = 0;
      killEnemy(state, e);
      state.enemies = state.enemies.filter(function (en) { return en.hp > 0; });
      return false;
    }
    return true;
  }

  function tickGlinderMaze(state, e, dt) {
    var maze = state.glinderMaze;
    if (!maze || maze.phase === "done") return;
    maze.t = (maze.t || 0) + dt;
    if (maze.phase === "build") {
      if (e) {
        e.vx = e.vy = 0;
        e.zDraw = 0;
        e.mazeHide = true;
      }
      if (maze.t >= maze.buildDur) {
        maze.phase = "run";
        maze.timer = maze.timerMax || 36;
        state.banner = { text: "Corre pro esquadrão", t: 1.6 };
      }
      return;
    }
    if (maze.phase === "run") {
      maze.timer -= dt;
      if (e) {
        e.vx = e.vy = 0;
        e.zDraw = 0;
        e.mazeHide = true;
        e.x = -500;
        e.y = -500;
      }
      var cmd = commanderOf(state);
      var gx = maze.goal.x;
      var gy = maze.goal.y;
      var ghw = (maze.cellW || 92) * 0.48;
      var ghh = (maze.cellH || 92) * 0.48;
      var px = state.squad.x;
      var py = state.squad.y;
      if (Math.abs(px - gx) <= ghw && Math.abs(py - gy) <= ghh) {
        endGlinderMaze(state, e, true);
        return;
      }
      if (cmd && Math.hypot(cmd.x - gx, cmd.y - gy) < 52) {
        endGlinderMaze(state, e, true);
        return;
      }
      var raw = null;
      var ui;
      for (ui = 0; ui < state.units.length; ui++) {
        if (state.units[ui].commander) raw = state.units[ui];
      }
      if (raw && raw.hp <= 0) {
        raw.hp = 1;
        endGlinderMaze(state, e, false);
        startGlinderBurn(state, e);
        return;
      }
      if (maze.timer <= 0) {
        endGlinderMaze(state, e, false);
        startGlinderBurn(state, e);
      }
    }
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

  function tickVultoP2(state, e, target, dt, spd) {
    if (state.glinderNight || state.glinderNightFade || (state.vultoDark || 0) > 0.04) {
      endGlinderNight(state, e);
    }
    e.mazeCd = Math.max(0, (e.mazeCd || 0) - dt);
    e.novaCd = Math.max(0, (e.novaCd || 0) - dt);
    e.vultoT = (e.vultoT || 0) - dt;
    if (e.novaWave) {
      e.novaWave.t -= dt;
      var wk = 1 - Math.max(0, e.novaWave.t) / (e.novaWave.max || 0.85);
      e.novaWave.r = 16 + wk * (e.novaWave.maxR || 420);
      if (e.novaWave.t <= 0) e.novaWave = null;
    }
    if (state.glinderMaze && state.glinderMaze.phase !== "done") {
      tickGlinderMaze(state, e, dt);
      return;
    }
    if (e.vultoAct === "laser") {
      tickGlinderLaser(state, e, target, dt, true);
      return;
    }
    if (e.vultoAct === "nova") {
      e.vx = e.vy = 0;
      e.novaT = (e.novaT || 0) - dt;
      state.glinderNovaT = e.novaT;
      if (e.novaT <= 0 && !e.novaDid) {
        var prev = e.cover ? { x: e.cover.x, y: e.cover.y } : null;
        glinderNovaBurst(state, e);
        e.novaLeft = (e.novaLeft || 1) - 1;
        if (e.novaLeft > 0) {
          spawnGlinderCover(state, e, prev);
          glinderToNovaCenter(state, e);
          e.novaT = 4;
          state.glinderNovaT = 4;
          state.glinderNovaMax = 4;
        } else {
          e.novaDid = true;
          state.glinderNovaT = 0;
        }
      }
      if (e.novaDid && (!e.novaWave || e.novaWave.t <= 0)) {
        e.vultoAct = "";
        if (!(state.glinderSun && !state.glinderSun.dead)) {
          e.cover = null;
          state.glinderCover = null;
        }
        e.vultoT = 2.6;
        e.novaCd = 11;
      }
      return;
    }
    var hover = 150 + Math.sin(e.phase * 1.7) * 26;
    var hx = target.x + Math.cos(e.phase * 0.85) * hover;
    var hy = target.y + Math.sin(e.phase * 0.85) * hover * 0.7;
    moveTowards(e, hx, hy, spd * 1.08, dt);
    var d = dist(e, target);
    if (e.cooldown <= 0 && d < e.def.range + 30) {
      e.cooldown = 0.92;
      enemyFire(state, e, target, "fireball", {
        speed: 240,
        r: 13,
        dmg: Math.round(e.def.dmg * 0.95),
        color: "#ff4a10",
        boomR: 78,
        burn: true,
        life: 1.85
      });
    }
    if (e.vultoT > 0) return;
    var pool = ["laser", "laser", "laser", "nova"];
    if (!e.mazeUsed && (e.mazeCd || 0) <= 0) pool.push("maze", "maze");
    if (e.vultoLast) {
      var vp = [];
      for (var vi = 0; vi < pool.length; vi++) if (pool[vi] !== e.vultoLast) vp.push(pool[vi]);
      pool = vp.length ? vp : pool;
    }
    if ((e.novaCd || 0) > 0) pool = pool.filter(function (a) { return a !== "nova"; });
    if (!pool.length) pool = ["laser"];
    var act = pool[(Math.random() * pool.length) | 0];
    e.vultoLast = act;
    if (act === "laser") {
      beginGlinderLaser(state, e, target, true, 20);
    } else if (act === "maze") {
      startGlinderMaze(state, e);
    } else {
      e.vultoAct = "nova";
      e.novaT = 4;
      e.novaDid = false;
      e.novaLeft = 3 + ((Math.random() * 3) | 0);
      e.novaCd = 11;
      spawnGlinderCover(state, e);
      glinderToNovaCenter(state, e);
      state.glinderNovaT = 4;
      state.glinderNovaMax = 4;
      state.banner = { text: "Inferno em cadeia · " + e.novaLeft, t: 1.7 };
      state.floaters.push(G.createFloater(e.x, e.y - 24, "inferno", "#ff4a18"));
    }
  }

  function tickVulto(state, e, target, dt, spd) {
    state.vultoId = e.id;
    if (!e.glinderKit) {
      e.glinderKit = 1;
      e.darkCd = 5;
      e.novaCd = 8;
      e.vultoT = Math.max(e.vultoT || 0, 1.15);
    }
    if (G.invasion) G.invasion.enterP2(state, e, "Glinder · a lua queima");
    if (G.invasion && G.invasion.tookP2Hook(e)) {
      endGlinderNight(state, e);
      e.vultoT = 1.25;
      e.mazeCd = 8;
      e.novaCd = 5;
    }
    if (glinderP2(e)) {
      tickVultoP2(state, e, target, dt, spd);
      return;
    }
    e.vultoT = (e.vultoT || 0) - dt;
    e.darkCd = Math.max(0, (e.darkCd || 0) - dt);
    e.novaCd = Math.max(0, (e.novaCd || 0) - dt);
    if (e.novaWave) {
      e.novaWave.t -= dt;
      var wk = 1 - Math.max(0, e.novaWave.t) / (e.novaWave.max || 0.85);
      e.novaWave.r = 16 + wk * (e.novaWave.maxR || 420);
      if (e.novaWave.t <= 0) e.novaWave = null;
    }
    if (!state.glinderNight && !state.glinderNightFade) {
      state.vultoDark = Math.max(0, (state.vultoDark || 0) - dt * 0.7);
    }
    if (state.glinderNight) {
      state.vultoDark = Math.min(1, (state.vultoDark || 0) + dt * 0.62);
      state.glinderNightT = (state.glinderNightT || 0) + dt;
      var ni;
      for (ni = 0; ni < (state.enemies || []).length; ni++) {
        if (state.enemies[ni].glinderCoal) state.enemies[ni].coalAge = state.glinderNightT;
      }
    } else if (state.glinderNightFade) {
      state.vultoDark = Math.max(0, (state.vultoDark || 0) - dt * 0.48);
      if (state.vultoDark <= 0.02) {
        state.glinderNightFade = false;
        state.vultoDark = 0;
        clearGlinderFires(state);
        e.vultoAct = "";
        e.vultoT = 2.2;
      }
    }

    if (e.vultoAct === "laser") {
      tickGlinderLaser(state, e, target, dt, false);
      return;
    }

    if (e.vultoAct === "dark") {
      var hunt = commanderOf(state) || (state.squad && { x: state.squad.x, y: state.squad.y, def: { size: 12 } });
      if (state.glinderNight && hunt) {
        var rush = Math.min(1, (state.glinderNightT || 0) / 12);
        moveTowards(e, hunt.x, hunt.y, spd * (1.35 + rush * 2.15), dt);
        e.rot = Math.atan2(hunt.y - e.y, hunt.x - e.x);
        if ((state.vultoDark || 0) > 0.42) {
          var touchR = (e.def.size || 30) + 18;
          if (Math.hypot(e.x - state.squad.x, e.y - state.squad.y) < touchR) {
            e.contactCd = (e.contactCd || 0) - dt;
            if (e.contactCd <= 0) {
              e.contactCd = 0.42;
              hurtSquadArea(state, e.x, e.y, touchR, Math.round(e.def.dmg * 0.9), e.x, e.y);
            }
          }
          for (var ni = 0; ni < state.units.length; ni++) {
            var nu = state.units[ni];
            if (nu.hp <= 0 || nu.stowed) continue;
            hurt(state, nu, nu.maxHp * 0.01 * dt, e.x, e.y, false, { trueDmg: true });
          }
        }
      }
      if (!state.glinderNight && !state.glinderNightFade) {
        e.vultoAct = "";
        e.vultoT = 2.2;
      }
      return;
    }

    if (e.vultoAct === "nova") {
      e.vx = e.vy = 0;
      e.novaT = (e.novaT || 0) - dt;
      state.glinderNovaT = e.novaT;
      if (e.novaT <= 0 && !e.novaDid) {
        e.novaDid = true;
        glinderNovaBurst(state, e);
        state.glinderNovaT = 0;
      }
      if (e.novaDid && (!e.novaWave || e.novaWave.t <= 0)) {
        e.vultoAct = "";
        e.cover = null;
        state.glinderCover = null;
        e.vultoT = 3.4;
        e.novaCd = 8;
      }
      return;
    }

    if (state.glinderNight || state.glinderNightFade) return;

    var hover = 168 + Math.sin(e.phase * 1.6) * 28;
    var hx = target.x + Math.cos(e.phase * 0.8) * hover;
    var hy = target.y + Math.sin(e.phase * 0.8) * hover * 0.7;
    moveTowards(e, hx, hy, spd, dt);
    var d = dist(e, target);
    if (e.cooldown <= 0 && d < e.def.range) {
      e.cooldown = 1.05;
      enemyFire(state, e, target, "flame", {
        speed: 260,
        r: 8,
        dmg: Math.round(e.def.dmg * 0.75),
        color: "#ff6a18",
        boomR: 46,
        burn: true,
        life: 1.7
      });
    }
    if (e.vultoT > 0) return;
    var pool = ["laser", "laser", "laser", "dark", "nova"];
    if (e.vultoLast) {
      var vp = [];
      for (var vi = 0; vi < pool.length; vi++) if (pool[vi] !== e.vultoLast) vp.push(pool[vi]);
      pool = vp.length ? vp : pool;
    }
    if ((e.darkCd || 0) > 0) {
      pool = pool.filter(function (a) { return a !== "dark"; });
    }
    if ((e.novaCd || 0) > 0) {
      pool = pool.filter(function (a) { return a !== "nova"; });
    }
    if (!pool.length) pool = ["laser"];
    var act = pool[(Math.random() * pool.length) | 0];
    e.vultoLast = act;
    if (act === "laser") {
      beginGlinderLaser(state, e, target, false, 10);
    } else if (act === "dark") {
      e.vultoAct = "dark";
      e.darkCd = 14;
      e.nightDmgT = 1;
      e.contactCd = 0.2;
      state.glinderNight = true;
      state.glinderNightFade = false;
      state.glinderNightT = 0;
      spawnGlinderCoal(state, e);
      state.floaters.push(G.createFloater(e.x, e.y - 24, "escuridão", "#3a1020"));
    } else {
      e.vultoAct = "nova";
      e.novaT = 3;
      e.novaDid = false;
      e.novaCd = 8;
      spawnGlinderCover(state, e);
      glinderToNovaCenter(state, e);
      state.glinderNovaT = 3;
      state.glinderNovaMax = 3;
      state.banner = { text: "Inferno", t: 1.6 };
      state.floaters.push(G.createFloater(e.x, e.y - 24, "inferno", "#ff4a18"));
    }
  }

  function hiveQueenOf(state) {
    for (var i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].hp > 0 && !state.enemies[i].fallen && state.enemies[i].type === "chefe_megatanque") return state.enemies[i];
    }
    return null;
  }

  function hiveKingOf(state) {
    for (var i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].hp > 0 && !state.enemies[i].fallen && state.enemies[i].type === "chefe_beeking") return state.enemies[i];
    }
    return null;
  }

  function hiveLinked(state) {
    return !!(hiveQueenOf(state) && hiveKingOf(state) && state.hive && !state.hive.separated);
  }

  function hiveAtk(state, e) {
    if (e && e.type === "chefe_beeking" && hiveLinked(state)) return 1.5;
    return 1;
  }

  function hivePointOnSeg(ax, ay, bx, by, px, py) {
    var abx = bx - ax;
    var aby = by - ay;
    var t = ((px - ax) * abx + (py - ay) * aby) / ((abx * abx + aby * aby) || 1);
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    var x = ax + abx * t;
    var y = ay + aby * t;
    return { x: x, y: y, t: t, d: Math.hypot(px - x, py - y) };
  }

  function hiveSpawnProp(state, type, x, y, extra) {
    extra = extra || {};
    extra.noDrop = true;
    extra.noLink = true;
    var p = G.game.spawnAt(state, type, x, y, extra);
    if (!p) return null;
    p.immortal = type !== "hive_cell";
    p.noDrop = true;
    p.scenery = true;
    return p;
  }

  function hivePinCocoon(state, e) {
    if (!e || e.type !== "hive_cocoon") return;
    var b = G.playfield(state);
    e.x = (b.x0 + b.x1) / 2;
    e.y = b.y0 + 36;
    e.rot = 0;
    e.vx = e.vy = 0;
  }

  function hiveEnsure(state) {
    var q = hiveQueenOf(state);
    if (!q) return null;
    if (state.hive && state.hive.ready) return state.hive;
    var b = G.playfield(state);
    var hx = (b.x0 + b.x1) / 2;
    var hy = (b.y0 + b.y1) / 2;
    var hive = {
      ready: true,
      link: 1,
      betweenT: 0,
      separated: false,
      sepT: 0,
      combDid: false,
      rain: 0,
      cmd: 0
    };
    state.hive = hive;
    state.hivePrisms = [];
    state.hiveHexT = 0;
    var cocoon = hiveSpawnProp(state, "hive_cocoon", hx, b.y0 + 36);
    if (cocoon) hivePinCocoon(state, cocoon);
    var flowers = [
      { x: b.x0 + 70, y: hy - 40 },
      { x: b.x1 - 70, y: hy - 40 },
      { x: b.x0 + 90, y: b.y1 - 70 },
      { x: b.x1 - 90, y: b.y1 - 70 }
    ];
    var fi;
    for (fi = 0; fi < flowers.length; fi++) hiveSpawnProp(state, "hive_flower", flowers[fi].x, flowers[fi].y);
    var pillars = [
      { x: b.x0 + 120, y: b.y0 + 130 },
      { x: b.x1 - 120, y: b.y0 + 130 },
      { x: hx, y: b.y1 - 95 }
    ];
    hive.pillarSlots = [];
    var pi, col;
    for (pi = 0; pi < pillars.length; pi++) {
      col = hiveSpawnProp(state, "hive_pillar", pillars[pi].x, pillars[pi].y);
      if (col) {
        col.rot = 0;
        col.pillarSlot = pi;
      }
      hive.pillarSlots.push({ x: pillars[pi].x, y: pillars[pi].y, cd: 0 });
    }
    return hive;
  }

  function hiveLandHoney(state, x, y, r) {
    pushZone(state, {
      kind: "honey",
      hive: true,
      x: x,
      y: y,
      r: r || 40,
      t: 1,
      max: 1,
      ripe: 0.22,
      liquid: false,
      hurtPlayer: false
    });
  }

  function hiveSpawnBees(state, n, x, y, cmd, hostId) {
    var i, bee;
    for (i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n;
      bee = G.game.spawnAt(state, "hive_bee", x + Math.cos(a) * 28, y + Math.sin(a) * 28, { noDrop: true, noLink: true });
      if (!bee) continue;
      bee.noDrop = true;
      bee.hiveCmd = cmd;
      bee.hiveHost = hostId;
      bee.mergeT = 0;
      bee.orbitAng = a;
    }
  }

  function hiveTriggerCell(state, e, destroyed) {
    var q = hiveQueenOf(state);
    var kind = e.cellKind || "honey";
    if (kind === "honey") {
      if (q) {
        if (G.invasion) G.invasion.heal(q, q.maxHp * 0.06);
        else q.hp = Math.min(q.maxHp, q.hp + q.maxHp * 0.06);
        G.burst(state, e.x, e.y, "#ffe08a", 12, 70);
      }
    } else if (kind === "royal") {
      explode(state, e.x, e.y, 70, 18, "enemy", "#ff6a3a");
      var s = 0;
      for (s = 0; s < 6; s++) {
        warnAt(state, {
          kind: "airstrike",
          x: state.squad.x + Math.cos((Math.PI * 2 * s) / 6) * 40,
          y: state.squad.y + Math.sin((Math.PI * 2 * s) / 6) * 40,
          t: 0.5 + s * 0.08,
          max: 0.58,
          r: 24,
          dmg: 12,
          color: "#ff6a3a",
          followLag: 3.4
        });
      }
    } else {
      hiveSpawnBees(state, 4, e.x, e.y, "attack", 0);
    }
    if (destroyed) G.burst(state, e.x, e.y, e.def.color, 10, 50);
  }

  function hiveSpawnComb(state) {
    if (!state.hive || state.hive.combDid) return;
    state.hive.combDid = true;
    var b = G.playfield(state);
    var cx = (b.x0 + b.x1) / 2;
    var cy = (b.y0 + b.y1) / 2;
    var kinds = ["honey", "royal", "drone", "honey", "royal", "drone", "honey"];
    var i, cell, ang, rad;
    for (i = 0; i < 7; i++) {
      if (i === 0) {
        ang = 0;
        rad = 0;
      } else {
        ang = ((i - 1) * Math.PI) / 3;
        rad = 44;
      }
      cell = hiveSpawnProp(state, "hive_cell", cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad);
      if (!cell) continue;
      cell.immortal = false;
      cell.cellKind = kinds[i];
      cell.pulseT = 7 + i * 0.4;
      cell.pulseMax = 8;
      cell.hp = cell.def.hp;
    }
    warnAt(state, { kind: "mark", x: cx, y: cy, t: 0.8, max: 0.8, r: 90, dmg: 0, color: "#ffe08a" });
  }

  function hiveMergePair(state, a, b) {
    var next = a.type === "hive_bee" ? "elite_bee" : a.type === "elite_bee" ? "royal_bee" : "";
    if (!next) return;
    var x = (a.x + b.x) / 2;
    var y = (a.y + b.y) / 2;
    a.hp = 0;
    b.hp = 0;
    a.noDrop = true;
    b.noDrop = true;
    var n = G.game.spawnAt(state, next, x, y, { noDrop: true, noLink: true });
    if (!n) return;
    n.noDrop = true;
    n.hiveCmd = a.hiveCmd || "orbit";
    n.hiveHost = a.hiveHost;
    n.orbitAng = a.orbitAng || 0;
    n.mergeT = 0;
    G.burst(state, x, y, "#ffe08a", 16, 80);
  }

  function tickHiveWorld(state, dt) {
    var q = hiveQueenOf(state);
    if (!q) {
      hiveBlockSquad(state);
      return;
    }
    var hive = hiveEnsure(state);
    if (!hive) return;
    var k = hiveKingOf(state);
    var i, e;
    if (q.hp / q.maxHp <= 0.7 || (k && k.hp / k.maxHp <= 0.7)) hiveSpawnComb(state);
    if (k && !hive.separated) {
      var hit = hivePointOnSeg(q.x, q.y, k.x, k.y, state.squad.x, state.squad.y);
      var thick = 50;
      if (hit.d < thick && hit.t > 0.06 && hit.t < 0.94) {
        hive.betweenT += dt;
        hive.link = Math.max(0, hive.link - dt * 0.34);
      } else {
        hive.betweenT = Math.max(0, hive.betweenT - dt * 0.6);
      }
      if (hive.link <= 0) {
        hive.separated = true;
        hive.sepT = 8;
        q.hiveVuln = 2.2;
        k.hiveVuln = 2.2;
        q.queenAct = "";
        G.burst(state, (q.x + k.x) / 2, (q.y + k.y) / 2, "#ffe08a", 22, 120);
        state.shake = Math.max(state.shake || 0, 10);
      }
    } else if (hive.separated) {
      hive.sepT -= dt;
      if (hive.sepT <= 0 && q && k) {
        hive.separated = false;
        hive.link = 1;
        hive.betweenT = 0;
      }
    }
    if (!k) {
      hive.separated = true;
      hive.link = 0;
    }
    if ((state.hiveHexT || 0) > 0) state.hiveHexT = Math.max(0, state.hiveHexT - dt);
    hiveTickPrisms(state, dt);
    hiveTickPillars(state, dt);
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (e.hp <= 0 || e.type !== "hive_cell") continue;
      e.pulseT = (e.pulseT == null ? 8 : e.pulseT) - dt;
      if (e.pulseT <= 0.9 && !e.pulseTold) {
        e.pulseTold = true;
        var pc = e.cellKind === "royal" ? "#ff6a3a" : e.cellKind === "drone" ? "#7ad8ff" : "#ffe08a";
        warnAt(state, { kind: "mark", x: e.x, y: e.y, t: 0.85, max: 0.85, r: 22, dmg: 0, color: pc });
      }
      if (e.pulseT <= 0) {
        hiveTriggerCell(state, e, false);
        e.pulseT = e.pulseMax || 8;
        e.pulseTold = false;
      }
    }
    var a, b, ai, bi;
    for (ai = 0; ai < state.enemies.length; ai++) {
      a = state.enemies[ai];
      if (a.hp <= 0 || (a.type !== "hive_bee" && a.type !== "elite_bee")) continue;
      if (a.hiveCmd !== "orbit") continue;
      a.mergeGlow = false;
      for (bi = ai + 1; bi < state.enemies.length; bi++) {
        b = state.enemies[bi];
        if (b.hp <= 0 || b.type !== a.type || b.hiveCmd !== "orbit") continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) < 28) {
          a.mergeT = (a.mergeT || 0) + dt;
          b.mergeT = (b.mergeT || 0) + dt;
          a.mergeGlow = true;
          b.mergeGlow = true;
          if (a.mergeT > 2.2) {
            hiveMergePair(state, a, b);
            break;
          }
        }
      }
      if (!a.mergeGlow) a.mergeT = Math.max(0, (a.mergeT || 0) - dt);
    }
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (e.hp <= 0 || e.type !== "hive_cocoon") continue;
      hivePinCocoon(state, e);
      e.phase = (e.phase || 0) + dt;
      e.zDraw = 10 + Math.sin(e.phase * 2.1) * 6;
    }
    hiveBlockSquad(state);
  }

  function hiveBlockSquad(state) {
    var sx = state.squad.x;
    var sy = state.squad.y;
    var i, e, dx, dy, d, min, nx, ny;
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (e.hp <= 0) continue;
      if (e.type !== "hive_pillar" && e.type !== "hive_cocoon" && e.hiveCmd !== "beewall") continue;
      dx = sx - e.x;
      dy = sy - e.y;
      d = Math.hypot(dx, dy) || 0.001;
      min = (e.def.size || 18) + 14;
      if (d >= min) continue;
      nx = dx / d;
      ny = dy / d;
      state.squad.x = e.x + nx * min;
      state.squad.y = e.y + ny * min;
      sx = state.squad.x;
      sy = state.squad.y;
    }
    G.clampPlay(state.squad, state);
  }

  function hiveNearestPuddle(state, x, y) {
    var zones = state.zones || [];
    var best = null;
    var bestD = 1e9;
    var i, z, d;
    for (i = 0; i < zones.length; i++) {
      z = zones[i];
      if (z.kind !== "honey" || !z.hive) continue;
      d = Math.hypot(z.x - x, z.y - y);
      if (d < bestD) {
        bestD = d;
        best = z;
      }
    }
    return best;
  }

  function hiveCountPrisms(state) {
    var n = 0;
    var i;
    if (!state.hivePrisms) return 0;
    for (i = 0; i < state.hivePrisms.length; i++) {
      if (state.hivePrisms[i].t > 0) n++;
    }
    return n;
  }

  function hivePlantPrism(state, x, y) {
    var b = G.playfield(state);
    if (!state.hivePrisms) state.hivePrisms = [];
    state.hivePrisms.push({
      x: Math.max(b.x0 + 36, Math.min(b.x1 - 36, x)),
      y: Math.max(b.y0 + 36, Math.min(b.y1 - 36, y)),
      t: 7.4,
      cd: 0.35,
      phase: 0
    });
  }

  function hiveTickPrisms(state, dt) {
    if (!state.hivePrisms) return;
    var q = hiveQueenOf(state);
    var i;
    var p;
    var ang;
    for (i = state.hivePrisms.length - 1; i >= 0; i--) {
      p = state.hivePrisms[i];
      p.t -= dt;
      p.phase = (p.phase || 0) + dt;
      p.cd = (p.cd || 0) - dt;
      if (p.t <= 0) {
        G.burst(state, p.x, p.y, "#7af7ff", 10, 50);
        state.hivePrisms.splice(i, 1);
        continue;
      }
      if (!q || p.cd > 0) continue;
      p.cd = 0.92;
      ang = Math.atan2(state.squad.y - p.y, state.squad.x - p.x);
      enemyFireAng(state, q, ang, "honeyball", {
        ox: p.x - q.x,
        oy: p.y - q.y,
        speed: 220,
        r: 8,
        dmg: Math.round(q.def.dmg * 0.58),
        life: 1.55,
        muzzle: 0
      });
    }
  }

  function hiveBlinkKing(state, king, x, y) {
    var b = G.playfield(state);
    var fx = king.x;
    var fy = king.y;
    king.x = Math.max(b.x0 + 40, Math.min(b.x1 - 40, x));
    king.y = Math.max(b.y0 + 40, Math.min(b.y1 - 40, y));
    king.blinkFrom = { x: fx, y: fy };
    king.blinkFxT = 0.32;
    G.burst(state, fx, fy, "#ffe08a", 14, 80);
    G.burst(state, king.x, king.y, "#7af7ff", 16, 90);
    state.shake = Math.max(state.shake || 0, 7);
  }

  function hiveTickPillars(state, dt) {
    var hive = state.hive;
    if (!hive) return;
    var b, hx, i, slot, col, alive, en, living, best, bestD, d, used;
    if (!hive.pillarSlots || !hive.pillarSlots.length) {
      b = G.playfield(state);
      hx = (b.x0 + b.x1) / 2;
      hive.pillarSlots = [
        { x: b.x0 + 120, y: b.y0 + 130, cd: 0 },
        { x: b.x1 - 120, y: b.y0 + 130, cd: 0 },
        { x: hx, y: b.y1 - 95, cd: 0 }
      ];
    }
    living = [];
    used = {};
    for (en = 0; en < state.enemies.length; en++) {
      col = state.enemies[en];
      if (col.hp > 0 && col.type === "hive_pillar") living.push(col);
    }
    for (i = 0; i < living.length; i++) {
      col = living[i];
      if (col.pillarSlot != null && hive.pillarSlots[col.pillarSlot] && !used[col.pillarSlot]) {
        used[col.pillarSlot] = true;
        continue;
      }
      best = -1;
      bestD = 1e9;
      for (en = 0; en < hive.pillarSlots.length; en++) {
        if (used[en]) continue;
        d = Math.hypot(hive.pillarSlots[en].x - col.x, hive.pillarSlots[en].y - col.y);
        if (d < bestD) {
          bestD = d;
          best = en;
        }
      }
      if (best >= 0) {
        col.pillarSlot = best;
        used[best] = true;
      } else {
        col.hp = 0;
        col.noDrop = true;
      }
    }
    living = 0;
    for (i = 0; i < hive.pillarSlots.length; i++) {
      slot = hive.pillarSlots[i];
      alive = false;
      for (en = 0; en < state.enemies.length; en++) {
        col = state.enemies[en];
        if (col.hp > 0 && col.type === "hive_pillar" && col.pillarSlot === i) {
          alive = true;
          col.x = slot.x;
          col.y = slot.y;
          col.rot = 0;
          col.vx = col.vy = 0;
          living++;
          break;
        }
      }
      if (alive) continue;
      if (slot.cd <= 0) slot.cd = 30;
      slot.cd -= dt;
      if (slot.cd > 0 || living >= 3) continue;
      col = hiveSpawnProp(state, "hive_pillar", slot.x, slot.y);
      if (col) {
        col.rot = 0;
        col.pillarSlot = i;
        living++;
        G.burst(state, slot.x, slot.y, "#d4a024", 8, 40);
      }
      slot.cd = 0;
    }
  }

  function hiveDownPillar(state, p) {
    var hive = state.hive;
    var i;
    if (!hive || !hive.pillarSlots) return;
    i = p.pillarSlot;
    if (i == null || !hive.pillarSlots[i]) {
      for (i = 0; i < hive.pillarSlots.length; i++) {
        if (Math.hypot(hive.pillarSlots[i].x - p.x, hive.pillarSlots[i].y - p.y) < 28) break;
      }
    }
    if (hive.pillarSlots[i]) hive.pillarSlots[i].cd = 30;
  }

  function hiveQueenFleeDest(state, e, from) {
    var b = G.playfield(state);
    var pad = 52;
    var fx = from.x;
    var fy = from.y;
    var dx = e.x - fx;
    var dy = e.y - fy;
    var d = Math.hypot(dx, dy) || 1;
    var nx = dx / d;
    var ny = dy / d;
    var hx = e.x + nx * 260;
    var hy = e.y + ny * 260;
    hx = Math.max(b.x0 + pad, Math.min(b.x1 - pad, hx));
    hy = Math.max(b.y0 + pad, Math.min(b.y1 - pad, hy));
    if (Math.hypot(hx - fx, hy - fy) < d + 10) {
      var px = -ny;
      var py = nx;
      var a1x = Math.max(b.x0 + pad, Math.min(b.x1 - pad, e.x + px * 240));
      var a1y = Math.max(b.y0 + pad, Math.min(b.y1 - pad, e.y + py * 240));
      var a2x = Math.max(b.x0 + pad, Math.min(b.x1 - pad, e.x - px * 240));
      var a2y = Math.max(b.y0 + pad, Math.min(b.y1 - pad, e.y - py * 240));
      if (Math.hypot(a1x - fx, a1y - fy) >= Math.hypot(a2x - fx, a2y - fy)) {
        hx = a1x;
        hy = a1y;
      } else {
        hx = a2x;
        hy = a2y;
      }
    }
    return { x: hx, y: hy, d: d };
  }

  function hiveQueenCornered(state, e) {
    var b = G.playfield(state);
    var from = state.squad;
    var pad = 86;
    var nearL = e.x <= b.x0 + pad;
    var nearR = e.x >= b.x1 - pad;
    var nearT = e.y <= b.y0 + pad;
    var nearB = e.y >= b.y1 - pad;
    var dest;
    if ((nearL || nearR) && (nearT || nearB)) return true;
    if (!(nearL || nearR || nearT || nearB)) return false;
    if (!from) return true;
    dest = hiveQueenFleeDest(state, e, from);
    return Math.hypot(dest.x - e.x, dest.y - e.y) < 48;
  }

  function hiveQueenFarCorner(state, e) {
    var b = G.playfield(state);
    var pad = 50;
    var corners = [
      { x: b.x0 + pad, y: b.y0 + pad },
      { x: b.x1 - pad, y: b.y0 + pad },
      { x: b.x0 + pad, y: b.y1 - pad },
      { x: b.x1 - pad, y: b.y1 - pad }
    ];
    var best = corners[0];
    var bestD = -1;
    var i, d;
    for (i = 0; i < corners.length; i++) {
      d = Math.hypot(corners[i].x - e.x, corners[i].y - e.y);
      if (d > bestD) {
        bestD = d;
        best = corners[i];
      }
    }
    return best;
  }

  function hiveClearBeeForm(state, hostId, cmd) {
    var i, bee;
    for (i = 0; i < state.enemies.length; i++) {
      bee = state.enemies[i];
      if (bee.hp <= 0) continue;
      if (bee.hiveCmd !== "beewall" && bee.hiveCmd !== "beespear") continue;
      if (cmd && bee.hiveCmd !== cmd) continue;
      if (hostId && bee.hiveHost !== hostId) continue;
      bee.hp = 0;
      bee.noDrop = true;
    }
  }

  function hiveClearBeeWall(state, hostId) {
    hiveClearBeeForm(state, hostId, "beewall");
  }

  function hiveSpearSlot(slot) {
    if (slot <= 0) return { along: 0, across: 0 };
    if (slot <= 2) return { along: -20, across: slot === 1 ? -15 : 15 };
    return { along: -44, across: (slot - 4) * 18 };
  }

  function hivePlaceBeeSpear(e, bee) {
    var o = hiveSpearSlot(bee.wallSlot | 0);
    bee.x = (e.spearX || e.x) + (e.spearNx || 0) * o.along + (e.spearPx || 0) * o.across;
    bee.y = (e.spearY || e.y) + (e.spearNy || 0) * o.along + (e.spearPy || 0) * o.across;
    bee.rot = Math.atan2(e.spearNy || 0, e.spearNx || 1);
    bee.vx = bee.vy = 0;
  }

  function hiveQueenAimSpear(e, from) {
    var dx = from.x - e.x;
    var dy = from.y - e.y;
    var d = Math.hypot(dx, dy) || 1;
    e.spearNx = dx / d;
    e.spearNy = dy / d;
    e.spearPx = -e.spearNy;
    e.spearPy = e.spearNx;
  }

  function hiveQueenStartBeeSpear(state, e) {
    var from = state.squad;
    var n = 6;
    var i, bee;
    if (!from) return;
    hiveQueenAimSpear(e, from);
    e.queenAct = "beespear";
    e.spearWind = e.enrage ? 0.14 : 0.26;
    e.spearT = 8;
    e.spearHit = false;
    e.laserOn = 0;
    e.immortal = false;
    e.zDraw = 8;
    e.spearX = e.x + e.spearNx * 46;
    e.spearY = e.y + e.spearNy * 46;
    hiveClearBeeForm(state, e.id, "beespear");
    for (i = 0; i < n; i++) {
      bee = G.game.spawnAt(state, "hive_bee", e.spearX, e.spearY, { noDrop: true, noLink: true });
      if (!bee) continue;
      bee.noDrop = true;
      bee.hiveCmd = "beespear";
      bee.hiveHost = e.id;
      bee.wallSlot = i;
      bee.immortal = true;
      bee.scenery = true;
      hivePlaceBeeSpear(e, bee);
    }
    var sang = Math.atan2(e.spearNy, e.spearNx);
    var shit = rayExitPlay(G.playfield(state), e.spearX, e.spearY, e.spearNx, e.spearNy, 8);
    warnAt(state, {
      kind: "lane",
      x: e.spearX,
      y: e.spearY,
      ang: sang,
      len: shit.dist || 720,
      w: 22,
      t: e.spearWind,
      max: e.spearWind,
      r: 22,
      dmg: 0,
      color: "#ffb030",
      hiveSpear: true
    });
    state.banner = { text: "Ponta de lança", t: 1.15 };
    state.floaters.push(G.createFloater(e.x, e.y - 28, "lança", "#ffb030"));
    G.burst(state, e.spearX, e.spearY, "#ffc44a", 12, 70);
  }

  function hiveKingCanWarp(king) {
    if (!king || king.hp <= 0 || king.fallen) return false;
    if ((king.kingStun || 0) > 0) return false;
    if ((king.chargeCd || 0) > 0.25) return false;
    if (king.kingAct === "charge" || (king.chargeWindup || 0) > 0) return false;
    return true;
  }

  function hiveKingGhostOff() {
    return 58;
  }

  function hiveKingGhostSpread() {
    return 0.2;
  }

  function hiveKingClearGhosts(e) {
    if (e) e.chargeGhosts = [];
  }

  function hiveKingPlaceGhosts(state, e) {
    if (!e || !e.enrage) {
      hiveKingClearGhosts(e);
      return;
    }
    var aim = e.chargeAim || e.rot || 0;
    var off = hiveKingGhostOff();
    var spread = hiveKingGhostSpread();
    var px = -Math.sin(aim);
    var py = Math.cos(aim);
    var b = G.playfield(state);
    if (!e.chargeGhosts || e.chargeGhosts.length !== 2) {
      e.chargeGhosts = [
        { side: -1, hit: false, alive: true },
        { side: 1, hit: false, alive: true }
      ];
    }
    var i, g, side;
    for (i = 0; i < e.chargeGhosts.length; i++) {
      g = e.chargeGhosts[i];
      side = g.side;
      g.x = e.x + px * off * side;
      g.y = e.y + py * off * side;
      g.x = Math.max(b.x0 + 18, Math.min(b.x1 - 18, g.x));
      g.y = Math.max(b.y0 + 18, Math.min(b.y1 - 18, g.y));
      g.rot = aim - side * spread;
      g.vx = 0;
      g.vy = 0;
      g.alive = true;
      g.hit = false;
    }
  }

  function hiveKingLaunchGhosts(e, sp) {
    var i, g;
    if (!e || !e.chargeGhosts) return;
    for (i = 0; i < e.chargeGhosts.length; i++) {
      g = e.chargeGhosts[i];
      g.vx = Math.cos(g.rot || 0) * sp;
      g.vy = Math.sin(g.rot || 0) * sp;
      g.hit = false;
      g.alive = true;
    }
  }

  function hiveKingTickGhosts(state, e, target, dt, mul) {
    var ghosts = e.chargeGhosts;
    if (!ghosts || !ghosts.length) return;
    var b = G.playfield(state);
    var ms = ((e.def && e.def.size) || 22) * 0.92;
    var i, g, hitEdge;
    for (i = 0; i < ghosts.length; i++) {
      g = ghosts[i];
      if (!g.alive) continue;
      if (g.vx || g.vy) {
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.rot = Math.atan2(g.vy, g.vx || 1);
      }
      hitEdge = g.x < b.x0 + ms || g.x > b.x1 - ms || g.y < b.y0 + ms || g.y > b.y1 - ms;
      if (hitEdge) {
        g.alive = false;
        G.burst(state, g.x, g.y, "#7af7ff", 10, 50);
        continue;
      }
      if (target && !g.hit && Math.hypot(target.x - g.x, target.y - g.y) < ms + (target.def.size || 12) + 14) {
        g.hit = true;
        hurt(state, target, Math.round(e.def.dmg * 1.65 * mul), g.x, g.y);
        state.shake = Math.max(state.shake || 0, 6);
        G.burst(state, g.x, g.y, "#ffe08a", 8, 40);
      }
    }
  }

  function hiveKingChargeWarn(state, e, t, color) {
    var aim = e.chargeAim || e.rot || 0;
    var b = G.playfield(state);
    var hit = rayExitPlay(b, e.x, e.y, Math.cos(aim), Math.sin(aim), 24);
    warnAt(state, {
      kind: "lane",
      x: e.x,
      y: e.y,
      ang: aim,
      len: hit.dist || 520,
      w: e.enrage ? 32 : 30,
      t: t,
      max: t,
      r: 30,
      dmg: 0,
      color: color || "#ffb030",
      followId: e.id,
      followRot: true
    });
    if (!e.enrage) return;
    var side, off, spread, gx, gy, ghit, pang, px, py;
    off = hiveKingGhostOff();
    spread = hiveKingGhostSpread();
    px = -Math.sin(aim);
    py = Math.cos(aim);
    for (side = -1; side <= 1; side += 2) {
      gx = e.x + px * off * side;
      gy = e.y + py * off * side;
      pang = aim - side * spread;
      ghit = rayExitPlay(b, gx, gy, Math.cos(pang), Math.sin(pang), 24);
      warnAt(state, {
        kind: "lane",
        x: gx,
        y: gy,
        ang: pang,
        angOff: -side * spread,
        followOff: off * side,
        len: ghit.dist || 520,
        w: 22,
        t: t,
        max: t,
        r: 22,
        dmg: 0,
        color: "#7af7ff",
        followId: e.id,
        followRot: true
      });
    }
  }

  function hiveQueenStartBeeWall(state, e) {
    var from = state.squad;
    var dx, dy, d;
    if (!from) {
      hiveQueenStartEscape(state, e);
      return;
    }
    dx = from.x - e.x;
    dy = from.y - e.y;
    d = Math.hypot(dx, dy) || 1;
    var n = 9;
    var i, bee, t;
    e.queenAct = "beewall";
    e.wallT = 8;
    e.beeWallCd = 8;
    e.laserOn = 0;
    e.immortal = false;
    e.zDraw = 6;
    e.wallNx = dx / d;
    e.wallNy = dy / d;
    e.wallPx = -e.wallNy;
    e.wallPy = e.wallNx;
    e.wallX = e.x + e.wallNx * 38;
    e.wallY = e.y + e.wallNy * 38;
    hiveClearBeeWall(state, e.id);
    for (i = 0; i < n; i++) {
      t = n <= 1 ? 0 : (i - (n - 1) / 2) / ((n - 1) / 2);
      bee = G.game.spawnAt(state, "hive_bee", e.wallX + e.wallPx * t * 80, e.wallY + e.wallPy * t * 80, { noDrop: true, noLink: true });
      if (!bee) continue;
      bee.noDrop = true;
      bee.hiveCmd = "beewall";
      bee.hiveHost = e.id;
      bee.wallSlot = i;
      bee.wallN = n;
      bee.immortal = true;
      bee.scenery = true;
    }
    state.banner = { text: "Muro de abelhas", t: 1.3 };
    state.floaters.push(G.createFloater(e.x, e.y - 28, "muro de abelhas", "#ffe08a"));
    G.burst(state, e.wallX, e.wallY, "#ffc44a", 16, 80);
  }

  function hiveQueenStartEscape(state, e) {
    var dest = hiveQueenFarCorner(state, e);
    e.queenAct = "escape";
    e.escapeT = 0.45;
    e.escapeDid = false;
    e.escapeX = dest.x;
    e.escapeY = dest.y;
    e.escapeTpCd = 30;
    e.laserOn = 0;
    e.immortal = false;
    e.zDraw = 10;
    e.vx = e.vy = 0;
    warnAt(state, { kind: "tp", x: dest.x, y: dest.y, t: 0.45, max: 0.45, r: 34, dmg: 0, color: "#7af7ff" });
    state.banner = { text: "Fuga real", t: 1.4 };
    state.floaters.push(G.createFloater(e.x, e.y - 28, "fuga", "#7af7ff"));
  }

  function hiveQueenMaybePanic(state, e, dt) {
    var act = e.queenAct || "";
    if (act === "beewall" || act === "escape" || act === "beespear" || act === "beam") return;
    if (hiveQueenCornered(state, e)) e.corneredT = (e.corneredT || 0) + dt;
    else e.corneredT = Math.max(0, (e.corneredT || 0) - dt * 1.2);
    if ((e.corneredT || 0) < 0.2) return;
    if ((e.beeWallCd || 0) <= 0) {
      hiveQueenStartBeeWall(state, e);
      e.corneredT = 0;
      return;
    }
    if ((e.escapeTpCd || 0) <= 0) {
      hiveQueenStartEscape(state, e);
      e.corneredT = 0;
    }
  }

  function hiveQueenRetreat(state, e, target, dt, spd, mul) {
    var from = state.squad || target;
    if (!from) return;
    var dest = hiveQueenFleeDest(state, e, from);
    var d = dest.d;
    mul = mul || 1;
    if (d < 210) mul = Math.max(mul, 1);
    var run = d < 240 ? Math.max(spd * 4.2, 200) : spd * 1.45;
    moveTowards(e, dest.x, dest.y, run * mul, dt);
    e.rot = Math.atan2(from.y - e.y, from.x - e.x);
  }

  function tickQueenHive(state, e, target, dt, spd) {
    hiveEnsure(state);
    e.skillT = (e.skillT == null ? 1.15 : e.skillT) - dt;
    if ((e.hiveVuln || 0) > 0) e.hiveVuln -= dt;
    if ((e.escapeTpCd || 0) > 0) e.escapeTpCd -= dt;
    if ((e.beeWallCd || 0) > 0) e.beeWallCd -= dt;
    if ((e.blinkFxT || 0) > 0) e.blinkFxT -= dt;
    hiveQueenMaybePanic(state, e, dt);
    var act = e.queenAct || "";
    var b = G.playfield(state);
    var topY = b.y0 + 52;
    var midX = (b.x0 + b.x1) / 2;
    e.immortal = act === "rain" || act === "protect";
    var king = hiveKingOf(state);
    if (act === "beewall") {
      e.zDraw = 6;
      e.vx = e.vy = 0;
      e.wallT = (e.wallT || 0) - dt;
      e.wallX = (e.wallX || e.x) + (e.wallNx || 0) * 220 * dt;
      e.wallY = (e.wallY || e.y) + (e.wallNy || 0) * 220 * dt;
      var span = 82;
      var bi, bee, t, n, along, thru, push;
      n = 9;
      for (bi = 0; bi < state.enemies.length; bi++) {
        bee = state.enemies[bi];
        if (bee.hp <= 0 || bee.hiveCmd !== "beewall" || bee.hiveHost !== e.id) continue;
        n = bee.wallN || n;
        t = n <= 1 ? 0 : ((bee.wallSlot || 0) - (n - 1) / 2) / ((n - 1) / 2);
        bee.x = e.wallX + (e.wallPx || 0) * t * span;
        bee.y = e.wallY + (e.wallPy || 0) * t * span;
        bee.rot = Math.atan2(e.wallNy || 0, e.wallNx || 1);
        bee.vx = bee.vy = 0;
      }
      along = (state.squad.x - e.wallX) * (e.wallPx || 0) + (state.squad.y - e.wallY) * (e.wallPy || 0);
      thru = (state.squad.x - e.wallX) * (e.wallNx || 0) + (state.squad.y - e.wallY) * (e.wallNy || 0);
      if (Math.abs(along) < span + 20 && thru > -22 && thru < 30) {
        push = 400 * dt;
        state.squad.x += (e.wallNx || 0) * push;
        state.squad.y += (e.wallNy || 0) * push;
        G.clampPlay(state.squad, state);
      }
      if (target) e.rot = Math.atan2(target.y - e.y, target.x - e.x);
      if (e.wallT <= 0 || e.wallX < b.x0 - 28 || e.wallX > b.x1 + 28 || e.wallY < b.y0 - 28 || e.wallY > b.y1 + 28) {
        hiveClearBeeWall(state, e.id);
        e.queenAct = "";
        e.skillT = 0.25;
        e.zDraw = 0;
        if (hiveQueenCornered(state, e) && (e.escapeTpCd || 0) <= 0) hiveQueenStartEscape(state, e);
      }
      return;
    }
    if (act === "beespear") {
      e.zDraw = 8;
      e.vx = e.vy = 0;
      if (target) e.rot = Math.atan2(target.y - e.y, target.x - e.x);
      if ((e.spearWind || 0) > 0) {
        e.spearWind -= dt;
        if (target) hiveQueenAimSpear(e, target);
        e.spearX = e.x + (e.spearNx || 0) * 46;
        e.spearY = e.y + (e.spearNy || 0) * 46;
        var sw, shitW;
        shitW = rayExitPlay(b, e.spearX, e.spearY, e.spearNx || 1, e.spearNy || 0, 8);
        for (sw = 0; sw < (state.warnings || []).length; sw++) {
          if (state.warnings[sw].hiveSpear) {
            state.warnings[sw].x = e.spearX;
            state.warnings[sw].y = e.spearY;
            state.warnings[sw].ang = Math.atan2(e.spearNy || 0, e.spearNx || 1);
            state.warnings[sw].len = shitW.dist || 720;
          }
        }
      } else {
        var sp = e.enrage ? 780 : 640;
        e.spearX = (e.spearX || e.x) + (e.spearNx || 0) * sp * dt;
        e.spearY = (e.spearY || e.y) + (e.spearNy || 0) * sp * dt;
      }
      var si, sbee, hitR, knock;
      for (si = 0; si < state.enemies.length; si++) {
        sbee = state.enemies[si];
        if (sbee.hp <= 0 || sbee.hiveCmd !== "beespear" || sbee.hiveHost !== e.id) continue;
        hivePlaceBeeSpear(e, sbee);
        if ((e.spearWind || 0) > 0) continue;
        hitR = (sbee.def.size || 10) + (state.squad.def && state.squad.def.size ? state.squad.def.size : 12) + 10;
        if (Math.hypot(state.squad.x - sbee.x, state.squad.y - sbee.y) < hitR) {
          if ((e.spearHitCd || 0) <= 0) {
            e.spearHitCd = 0.1;
            hurt(state, state.squad, Math.round(e.def.dmg * (e.enrage ? 0.85 : 0.68)), sbee.x, sbee.y);
            state.shake = Math.max(state.shake || 0, 7);
          }
          knock = (e.enrage ? 520 : 420) * dt;
          state.squad.x += (e.spearNx || 0) * knock;
          state.squad.y += (e.spearNy || 0) * knock;
          G.clampPlay(state.squad, state);
        }
      }
      if ((e.spearHitCd || 0) > 0) e.spearHitCd -= dt;
      if ((e.spearWind || 0) <= 0 && (e.spearX < b.x0 - 36 || e.spearX > b.x1 + 36 || e.spearY < b.y0 - 36 || e.spearY > b.y1 + 36)) {
        hiveClearBeeForm(state, e.id, "beespear");
        e.queenAct = "";
        e.skillT = e.enrage ? 1.05 : 1.65;
        e.zDraw = 0;
      }
      return;
    }
    if (act === "escape") {
      e.zDraw = 10;
      e.vx = e.vy = 0;
      e.escapeT = (e.escapeT || 0) - dt;
      if (target) e.rot = Math.atan2(target.y - e.y, target.x - e.x);
      if (!e.escapeDid && e.escapeT <= 0.08) {
        e.escapeDid = true;
        princessBlinkTo(state, e, e.escapeX, e.escapeY);
        G.burst(state, e.x, e.y, "#ffe08a", 18, 90);
        state.shake = Math.max(state.shake || 0, 6);
      }
      if (e.escapeT <= 0) {
        e.queenAct = "";
        e.skillT = e.enrage ? 1.2 : 1.6;
        e.zDraw = 0;
      }
      return;
    }
    if (act === "beam") {
      e.zDraw = 10;
      e.laserT = (e.laserT || 0) - dt;
      if (e.enrage) e.vx = e.vy = 0;
      else if (target) hiveQueenRetreat(state, e, target, dt, spd, 0.42);
      if (target && !e.laserSweeping) {
        if (e.laserLockX == null) {
          e.laserLockX = target.x;
          e.laserLockY = target.y;
        }
        var lag = (e.laserOn || 0) > 0 ? (e.enrage ? 2.8 : 1.55) : (e.enrage ? 6.2 : 4.2);
        e.laserLockX += (target.x - e.laserLockX) * Math.min(1, dt * lag);
        e.laserLockY += (target.y - e.laserLockY) * Math.min(1, dt * lag);
        e.laserAng = Math.atan2(e.laserLockY - e.y, e.laserLockX - e.x);
      }
      if (!e.laserOn && e.laserT <= (e.laserBeam || 0.85)) {
        e.laserOn = e.laserBeam || 0.85;
        if (e.enrage) {
          e.laserSweeping = true;
          e.laserSweepMid = e.laserAng || 0;
          e.laserSweep = 1.22;
          e.laserFork = 0.38;
          e.laserHoneyCd = 0;
          state.floaters.push(G.createFloater(e.x, e.y - 30, "varredura", "#ff8a3a"));
          state.shake = Math.max(state.shake || 0, 6);
        }
      }
      if ((e.laserOn || 0) > 0) {
        e.laserOn -= dt;
        if (e.enrage && e.laserSweeping) {
          var maxOn = e.laserBeam || 1.25;
          var k = 1 - Math.max(0, e.laserOn) / maxOn;
          if (k < 0) k = 0;
          if (k > 1) k = 1;
          e.laserSweepAng = e.laserSweepMid - e.laserSweep * 0.5 + e.laserSweep * k;
          e.laserAng = e.laserSweepAng - e.laserFork;
          e.laserAng2 = e.laserSweepAng + e.laserFork;
        }
        e.rot = e.enrage && e.laserSweepAng != null ? e.laserSweepAng : (e.laserAng || 0);
        var angs = e.enrage && e.laserAng2 != null ? [e.laserAng, e.laserAng2] : [e.laserAng];
        var ai, ang, hitL, wide, dmgL;
        wide = e.enrage ? 28 : 17;
        dmgL = Math.round(e.def.dmg * (e.enrage ? 0.95 : 0.62));
        e.laserHitCd = (e.laserHitCd || 0) - dt;
        e.laserHoneyCd = (e.laserHoneyCd || 0) - dt;
        for (ai = 0; ai < angs.length; ai++) {
          ang = angs[ai] || 0;
          hitL = rayExitPlay(b, e.x, e.y, Math.cos(ang), Math.sin(ang), 18);
          if (ai === 0) e.laserLen = hitL.dist || 520;
          else e.laserLen2 = hitL.dist || 520;
          if (e.laserHitCd <= 0) {
            hurtBeam(state, e.x, e.y, ang, hitL.dist || 520, wide, dmgL);
            if (inBeam(state.squad.x, state.squad.y, e.x, e.y, ang, hitL.dist || 520, e.enrage ? 32 : 22)) {
              state.hiveHexT = Math.max(state.hiveHexT || 0, e.enrage ? 3.4 : 2.5);
              if (e.enrage) state.honeyT = Math.max(state.honeyT || 0, 0.7);
              else if (!e.laserSlowTried) {
                e.laserSlowTried = true;
                if (Math.random() < 0.32) state.honeyT = Math.max(state.honeyT || 0, 0.5);
              }
            }
          }
          if (e.enrage && e.laserHoneyCd <= 0) {
            hiveLandHoney(state, e.x + Math.cos(ang) * 90, e.y + Math.sin(ang) * 90, 20);
            hiveLandHoney(state, e.x + Math.cos(ang) * 190, e.y + Math.sin(ang) * 190, 18);
          }
        }
        if (e.laserHitCd <= 0) e.laserHitCd = e.enrage ? 0.08 : 0.09;
        if (e.enrage && e.laserHoneyCd <= 0) e.laserHoneyCd = 0.2;
      } else {
        e.rot = e.laserAng || 0;
      }
      if (e.laserT <= 0) {
        e.queenAct = "";
        e.laserOn = 0;
        e.laserSweeping = false;
        e.laserAng2 = null;
        e.skillT = e.enrage ? 1.15 : 2.05;
        e.zDraw = 0;
      }
      return;
    }
    if (act === "warp") {
      e.zDraw = 8;
      e.warpT = (e.warpT || 0) - dt;
      if (target) hiveQueenRetreat(state, e, target, dt, spd, 0.85);
      var waNow = king ? Math.atan2(state.squad.y - king.y, state.squad.x - king.x) : 0;
      var destX = state.squad.x - Math.cos(waNow) * 62;
      var destY = state.squad.y - Math.sin(waNow) * 62;
      if (e.warpX == null) e.warpX = destX;
      if (e.warpY == null) e.warpY = destY;
      e.warpX += (destX - e.warpX) * Math.min(1, dt * 3.1);
      e.warpY += (destY - e.warpY) * Math.min(1, dt * 3.1);
      var wi;
      for (wi = 0; wi < (state.warnings || []).length; wi++) {
        if (state.warnings[wi].kind === "tp" && state.warnings[wi].hiveWarp) {
          state.warnings[wi].x = e.warpX;
          state.warnings[wi].y = e.warpY;
        }
      }
      if (king && king.hp > 0) e.rot = Math.atan2(king.y - e.y, king.x - e.x);
      if (!e.warpDid && e.warpT <= 0) {
        e.warpDid = true;
        if (hiveKingCanWarp(king)) {
          hiveBlinkKing(state, king, e.warpX, e.warpY);
          var waim = Math.atan2(state.squad.y - king.y, state.squad.x - king.x);
          king.chargeAim = waim;
          king.rot = waim;
          king.chargeWindup = 0.5;
          king.chargeWindupMax = 0.5;
          king.chargeChain = king.enrage ? 1 : 0;
          king.kingAct = "windup";
          hiveKingChargeWarn(state, king, 0.5);
        }
      }
      if (e.warpT <= 0 && e.warpDid) {
        e.queenAct = "";
        e.skillT = e.enrage ? 1.7 : 2.2;
        e.zDraw = 0;
      }
      return;
    }
    if (act === "prism") {
      e.zDraw = 8;
      e.prismT = (e.prismT || 0) - dt;
      if (target) hiveQueenRetreat(state, e, target, dt, spd, 0.4);
      if (!e.prismDid && e.prismT <= 0.05) {
        e.prismDid = true;
        hivePlantPrism(state, e.prismX, e.prismY);
        G.burst(state, e.prismX, e.prismY, "#7af7ff", 12, 60);
        if (e.enrage) {
          hivePlantPrism(state, e.prismX + 36, e.prismY - 28);
        }
      }
      if (e.prismT <= 0) {
        e.queenAct = "";
        e.skillT = e.enrage ? 1.8 : 2.3;
        e.zDraw = 0;
      }
      return;
    }
    if (act === "ward") {
      e.zDraw = 8;
      e.wardT = (e.wardT || 0) - dt;
      if (target) hiveQueenRetreat(state, e, target, dt, spd, 0.85);
      if (king && king.hp > 0) e.rot = Math.atan2(king.y - e.y, king.x - e.x);
      if (!e.wardDid && e.wardT <= 0.08) {
        e.wardDid = true;
        if (king && king.hp > 0) {
          king.kingWardT = 5.2;
          G.burst(state, king.x, king.y, "#7af7ff", 18, 80);
          state.floaters.push(G.createFloater(king.x, king.y - 28, "amparo", "#7af7ff"));
        }
      }
      if (e.wardT <= 0) {
        e.queenAct = "";
        e.skillT = e.enrage ? 1.9 : 2.4;
        e.zDraw = 0;
      }
      return;
    }
    if (act === "rain") {
      e.zDraw = 36 + Math.sin((e.phase || 0) * 6) * 6;
      e.vx = e.vy = 0;
      moveTowards(e, midX, topY, spd * 1.8, dt);
      e.rainT = (e.rainT || 0) - dt;
      e.dropCd = (e.dropCd || 0) - dt;
      if (e.dropCd <= 0 && e.dropsLeft > 0) {
        e.dropCd = 0.28;
        e.dropsLeft--;
        var tx = state.squad.x + (Math.random() - 0.5) * 160;
        var ty = state.squad.y + (Math.random() - 0.5) * 120;
        tx = Math.max(b.x0 + 40, Math.min(b.x1 - 40, tx));
        ty = Math.max(b.y0 + 80, Math.min(b.y1 - 40, ty));
        warnAt(state, { kind: "honeydrop", x: tx, y: ty, t: 0.55, max: 0.55, r: 40, dmg: 0, color: "#e8c050" });
      }
      if (e.rainT <= 0) {
        e.queenAct = "push";
        e.pushT = 4.6;
        e.zDraw = 8;
      }
      return;
    }
    if (act === "push") {
      e.zDraw = 6;
      e.pushT = (e.pushT || 0) - dt;
      var pud = hiveNearestPuddle(state, state.squad.x, state.squad.y);
      var aimX = pud ? pud.x : state.squad.x;
      var aimY = pud ? pud.y : state.squad.y;
      moveTowards(e, state.squad.x + (state.squad.x - aimX) * 0.15, state.squad.y + (state.squad.y - aimY) * 0.15, spd * 1.7, dt);
      var dd = Math.hypot(state.squad.x - e.x, state.squad.y - e.y);
      if (dd < e.def.size + 28) {
        var nx = state.squad.x - e.x;
        var ny = state.squad.y - e.y;
        var nl = Math.hypot(nx, ny) || 1;
        var push = 220 * dt;
        if (pud) {
          nx = pud.x - state.squad.x;
          ny = pud.y - state.squad.y;
          nl = Math.hypot(nx, ny) || 1;
        }
        state.squad.x += (nx / nl) * push;
        state.squad.y += (ny / nl) * push;
        G.clampPlay(state.squad, state);
      }
      if (e.pushT <= 0) {
        e.queenAct = "";
        e.skillT = e.enrage ? 2.4 : 3.4;
        e.zDraw = 0;
      }
      return;
    }
    if (act === "cmd") {
      e.vx = e.vy = 0;
      e.cmdT = (e.cmdT || 0) - dt;
      if (!e.cmdDid && e.cmdT <= 0.05) {
        e.cmdDid = true;
        hiveSpawnBees(state, 8, e.x, e.y, e.cmdKind, e.id);
      }
      if (e.cmdT <= 0) {
        if (e.cmdKind === "protect") {
          e.queenAct = "protect";
          e.protectT = 6.2;
        } else {
          e.queenAct = "";
          e.skillT = e.enrage ? 2.6 : 3.8;
        }
      }
      return;
    }
    if (act === "protect") {
      e.protectT = (e.protectT || 0) - dt;
      e.vx = e.vy = 0;
      var ring = e.def.size + 46;
      var dx = state.squad.x - e.x;
      var dy = state.squad.y - e.y;
      var d = Math.hypot(dx, dy) || 1;
      if (d < ring + 18) {
        state.squad.x = e.x + (dx / d) * (ring + 20);
        state.squad.y = e.y + (dy / d) * (ring + 20);
        G.clampPlay(state.squad, state);
      }
      if (e.protectT <= 0) {
        e.queenAct = "";
        e.skillT = 3.2;
        e.immortal = false;
      }
      return;
    }
    e.immortal = false;
    e.zDraw = 4 + Math.sin((e.phase || 0) * 3.2) * 3;
    if (target) {
      hiveQueenRetreat(state, e, target, dt, spd, e.enrage ? 1.12 : 1);
      if (e.cooldown <= 0 && dist(e, target) < e.def.range + 140) {
        e.cooldown = e.enrage ? 0.62 : 0.95;
        var ball = {
          speed: e.enrage ? 290 : 250,
          r: 12,
          dmg: Math.round(e.def.dmg * (e.enrage ? 0.82 : 1.05)),
          color: "#f0c040",
          muzzle: e.def.size * 0.85,
          life: 1.85
        };
        if (e.enrage) enemyFan(state, e, target, 3, 0.46, "honeyball", ball);
        else enemyFire(state, e, target, "honeyball", ball);
      }
    }
    if (e.skillT > 0) return;
    var pool = e.enrage ? ["beam", "beam", "spear", "prism", "rain"] : ["beam", "beam", "prism", "spear"];
    if (king && king.hp > 0 && !king.fallen && hiveKingCanWarp(king)) {
      pool.push("warp", "warp");
      if ((king.kingWardT || 0) <= 0.4) pool.push("ward");
    }
    if (hiveCountPrisms(state) >= (e.enrage ? 3 : 2)) {
      var np = [];
      var pi;
      for (pi = 0; pi < pool.length; pi++) if (pool[pi] !== "prism") np.push(pool[pi]);
      if (np.length) pool = np;
    }
    if (e.lastQueen) {
      var filtered = [];
      var fi;
      for (fi = 0; fi < pool.length; fi++) if (pool[fi] !== e.lastQueen) filtered.push(pool[fi]);
      if (filtered.length) pool = filtered;
    }
    var pick = pool[(Math.random() * pool.length) | 0] || "beam";
    e.lastQueen = pick;
    if (pick === "beam") {
      e.queenAct = "beam";
      e.laserT = e.enrage ? 2.1 : 1.4;
      e.laserBeam = e.enrage ? 1.28 : 0.88;
      e.laserOn = 0;
      e.laserHitCd = 0;
      e.laserSlowTried = false;
      e.laserSweeping = false;
      e.laserAng2 = null;
      e.laserAng = target ? Math.atan2(target.y - e.y, target.x - e.x) : 0;
      e.laserLockX = target ? target.x : e.x;
      e.laserLockY = target ? target.y : e.y;
      e.rot = e.laserAng;
      var hit0 = rayExitPlay(b, e.x, e.y, Math.cos(e.laserAng), Math.sin(e.laserAng), 18);
      e.laserLen = hit0.dist || 520;
      warnAt(state, {
        kind: "lane",
        x: e.x,
        y: e.y,
        ang: e.laserAng,
        len: e.laserLen,
        w: e.enrage ? 38 : 16,
        t: e.laserT - e.laserBeam,
        max: e.laserT - e.laserBeam,
        r: e.enrage ? 28 : 16,
        dmg: 0,
        color: e.enrage ? "#ff8a3a" : "#7af7ff",
        followId: e.id,
        followRot: true
      });
      if (e.enrage) state.floaters.push(G.createFloater(e.x, e.y - 28, "raio âmbar", "#ff8a3a"));
    } else if (pick === "warp") {
      e.queenAct = "warp";
      e.warpT = 0.5;
      e.warpDid = false;
      var wa = king ? Math.atan2(state.squad.y - king.y, state.squad.x - king.x) : 0;
      e.warpX = state.squad.x - Math.cos(wa) * 62;
      e.warpY = state.squad.y - Math.sin(wa) * 62;
      warnAt(state, { kind: "tp", x: e.warpX, y: e.warpY, t: 0.5, max: 0.5, r: 32, dmg: 0, color: "#7af7ff", hiveWarp: true });
    } else if (pick === "prism") {
      e.queenAct = "prism";
      e.prismT = 0.72;
      e.prismDid = false;
      var pang = (e.phase || 0) * 1.7;
      e.prismX = state.squad.x + Math.cos(pang) * 92;
      e.prismY = state.squad.y + Math.sin(pang) * 92;
      warnAt(state, { kind: "mark", x: e.prismX, y: e.prismY, t: 0.72, max: 0.72, r: 22, dmg: 0, color: "#7af7ff" });
    } else if (pick === "spear") {
      hiveQueenStartBeeSpear(state, e);
    } else if (pick === "rain") {
      e.queenAct = "rain";
      e.rainT = 2.6;
      e.dropsLeft = 8;
      e.dropCd = 0.08;
    } else {
      e.queenAct = "ward";
      e.wardT = 0.7;
      e.wardDid = false;
      if (king) warnAt(state, { kind: "mark", x: king.x, y: king.y, t: 0.7, max: 0.7, r: king.def.size + 28, dmg: 0, color: "#7af7ff", followId: king.id });
    }
  }

  function tickKingHive(state, e, target, dt, spd) {
    hiveEnsure(state);
    if ((e.hiveVuln || 0) > 0) e.hiveVuln -= dt;
    if ((e.kingWardT || 0) > 0) e.kingWardT -= dt;
    if ((e.blinkFxT || 0) > 0) e.blinkFxT -= dt;
    if ((e.kingStun || 0) > 0) {
      e.kingStun -= dt;
      e.immortal = false;
      e.vx = e.vy = 0;
      e.flash = Math.max(e.flash || 0, 0.16);
      e.zDraw = 0;
      e.rot += Math.sin((e.phase || 0) * 22) * 0.04;
      e.chargeWindup = 0;
      if (e.kingAct === "charge" || e.kingAct === "windup") e.kingAct = "";
      hiveKingClearGhosts(e);
      return;
    }
    if ((e.chargeCd || 0) > 0) e.chargeCd -= dt;
    var act = e.kingAct || "";
    var mul = hiveAtk(state, e);
    var hexed = (state.hiveHexT || 0) > 0;
    if ((e.chargeWindup || 0) > 0) {
      e.chargeWindup = Math.max(0, e.chargeWindup - dt);
      e.vx = e.vy = 0;
      if (target) {
        e.chargeAim = Math.atan2(
          (target.y + (state.squad.vy || 0) * 0.1) - e.y,
          (target.x + (state.squad.vx || 0) * 0.1) - e.x
        );
      }
      e.rot = e.chargeAim || 0;
      if (e.enrage) hiveKingPlaceGhosts(state, e);
      if (e.chargeWindup <= 0) {
        var sp = (e.enrage ? 1240 : 1020) * (hexed ? 1.12 : 1);
        e.vx = Math.cos(e.chargeAim) * sp;
        e.vy = Math.sin(e.chargeAim) * sp;
        e.kingAct = "charge";
        e.chargeT = 0.78;
        e.chargeHit = false;
        e.immortal = true;
        if (e.enrage) {
          hiveKingLaunchGhosts(e, sp);
          G.burst(state, e.x, e.y, "#7af7ff", 10, 40);
        }
      }
      return;
    }
    if (act === "charge") {
      e.immortal = true;
      e.chargeT = (e.chargeT || 0) - dt;
      var b = G.playfield(state);
      var ms = e.def.size;
      e.x += (e.vx || 0) * dt;
      e.y += (e.vy || 0) * dt;
      e.rot = Math.atan2(e.vy || 0, e.vx || 1);
      e.trailT = (e.trailT || 0) - dt;
      if (e.trailT <= 0) {
        e.trailT = e.enrage ? 0.1 : 0.18;
        hiveLandHoney(state, e.x, e.y, e.enrage ? 26 : 20);
      }
      var hitWall = false;
      var hitPillar = false;
      if (e.x < b.x0 + ms) { e.x = b.x0 + ms; hitWall = true; }
      if (e.x > b.x1 - ms) { e.x = b.x1 - ms; hitWall = true; }
      if (e.y < b.y0 + ms) { e.y = b.y0 + ms; hitWall = true; }
      if (e.y > b.y1 - ms) { e.y = b.y1 - ms; hitWall = true; }
      var pi, p;
      for (pi = 0; pi < state.enemies.length; pi++) {
        p = state.enemies[pi];
        if (p.hp <= 0) continue;
        if (p.type === "hive_pillar" && Math.hypot(p.x - e.x, p.y - e.y) < ms + p.def.size) {
          hitWall = true;
          hitPillar = true;
          hiveDownPillar(state, p);
          p.hp = 0;
          p.noDrop = true;
          G.burst(state, p.x, p.y, "#d4a024", 22, 110);
        }
        if ((p.type === "hive_bee" || p.type === "elite_bee") && Math.hypot(p.x - e.x, p.y - e.y) < ms + p.def.size) {
          p.hp = 0;
          p.noDrop = true;
          G.burst(state, p.x, p.y, "#ffc44a", 8, 40);
        }
      }
      if (target && !e.chargeHit && Math.hypot(target.x - e.x, target.y - e.y) < ms + (target.def.size || 12) + 18) {
        e.chargeHit = true;
        hurt(state, target, Math.round(e.def.dmg * 2.25 * mul), e.x, e.y);
        state.shake = Math.max(state.shake || 0, 9);
      }
      hiveKingTickGhosts(state, e, target, dt, mul);
      if (hitWall || e.chargeT <= 0) {
        e.immortal = false;
        e.kingAct = "";
        e.vx = e.vy = 0;
        hiveKingClearGhosts(e);
        if (hitWall) {
          e.kingStun = hitPillar ? 5 : 1;
          e.hiveVuln = hitPillar ? 5 : 1;
          e.chargeChain = 0;
          e.chargeCd = e.enrage ? 2.4 : 3.2;
          G.burst(state, e.x, e.y, "#ffe08a", hitPillar ? 28 : 18, hitPillar ? 140 : 90);
          state.shake = Math.max(state.shake || 0, hitPillar ? 14 : 8);
          if (hitPillar) {
            state.banner = { text: "O rei bateu na coluna", t: 1.8 };
            state.floaters.push(G.createFloater(e.x, e.y - 36, "atordoado", "#ffe08a"));
            if (G.audio && G.audio.thud) G.audio.thud();
            else if (G.audio && G.audio.hit) G.audio.hit();
          }
        } else if (e.enrage && (e.chargeChain || 0) > 0) {
          e.chargeChain--;
          e.chargeCd = 0;
          e.chargeAim = target
            ? Math.atan2(target.y - e.y, target.x - e.x)
            : e.chargeAim;
          e.chargeWindup = 0.22;
          e.chargeWindupMax = 0.22;
          e.kingAct = "windup";
          hiveKingChargeWarn(state, e, 0.22, "#ff6a28");
        } else {
          e.chargeCd = e.enrage ? 2.4 : 3.2;
          e.chargeChain = 0;
        }
      }
      return;
    }
    e.immortal = false;
    if (e.chargeCd == null) e.chargeCd = 1.6;
    if (target) {
      var chase = spd * (e.enrage ? 2.18 : 1.68) * (hexed ? 1.28 : 1);
      moveTowards(e, target.x, target.y, chase, dt);
      e.rot = Math.atan2(target.y - e.y, target.x - e.x);
      var kd = Math.hypot(target.x - e.x, target.y - e.y);
      if (e.cooldown <= 0 && kd > 44 && kd < (e.enrage ? 320 : 280)) {
        e.cooldown = e.enrage ? 0.7 : 1.02;
        var spearShot = {
          speed: e.enrage ? 430 : 380,
          r: 8,
          dmg: Math.round(e.def.dmg * (e.enrage ? 0.55 : 0.62) * mul),
          muzzle: e.def.size * 0.75,
          life: 1.55
        };
        if (e.enrage) enemyFan(state, e, target, 3, 0.4, "spear", spearShot);
        else enemyFire(state, e, target, "spear", spearShot);
      }
      if (kd < e.def.size + target.def.size + 8 && e.contactCd <= 0) {
        e.contactCd = e.enrage ? 0.2 : 0.26;
        if (!(G.tactics && G.tactics.skipContact && G.tactics.skipContact(state, e))) {
          hurt(state, target, Math.round(e.def.dmg * 1.2 * mul), e.x, e.y);
        }
      }
    }
    if ((e.chargeCd || 0) > 0) return;
    var aim = target
      ? Math.atan2(
          (target.y + (state.squad.vy || 0) * 0.1) - e.y,
          (target.x + (state.squad.vx || 0) * 0.1) - e.x
        )
      : 0;
    e.chargeAim = aim;
    e.chargeWindup = e.enrage ? 0.28 : 0.4;
    e.chargeWindupMax = e.chargeWindup;
    e.chargeChain = e.enrage ? 1 : 0;
    e.kingAct = "windup";
    hiveKingChargeWarn(state, e, e.chargeWindup);
  }

  function tickHiveBee(state, e, target, dt, spd) {
    var host = findEnemy(state, e.hiveHost);
    var cmd = e.hiveCmd || "";
    e.zDraw = 5 + Math.sin((e.phase || 0) * 9) * 2;
    if (cmd === "beewall") {
      if (!host || host.hp <= 0 || host.queenAct !== "beewall") {
        e.hp = 0;
        e.noDrop = true;
        return;
      }
      e.immortal = true;
      e.vx = e.vy = 0;
      e.zDraw = 8;
      return;
    }
    if (cmd === "beespear") {
      if (!host || host.hp <= 0 || host.queenAct !== "beespear") {
        e.hp = 0;
        e.noDrop = true;
        return;
      }
      e.immortal = true;
      e.vx = e.vy = 0;
      e.zDraw = 10;
      return;
    }
    if (cmd === "protect") {
      if (!host || host.hp <= 0 || host.queenAct !== "protect") {
        e.hiveCmd = "attack";
        e.immortal = false;
        return;
      }
      e.immortal = true;
      e.orbitAng = (e.orbitAng || 0) + dt * 2.4;
      var rr = host.def.size + 42;
      e.x = host.x + Math.cos(e.orbitAng) * rr;
      e.y = host.y + Math.sin(e.orbitAng) * rr;
      e.vx = e.vy = 0;
      return;
    }
    if (cmd === "harvest") {
      var flower = null;
      var fi, f, best = 1e9;
      for (fi = 0; fi < state.enemies.length; fi++) {
        f = state.enemies[fi];
        if (f.hp > 0 && f.type === "hive_flower") {
          var fd = Math.hypot(f.x - e.x, f.y - e.y);
          if (fd < best) { best = fd; flower = f; }
        }
      }
      if (!e.harvested && flower) {
        moveTowards(e, flower.x, flower.y, spd * 1.2, dt);
        if (Math.hypot(flower.x - e.x, flower.y - e.y) < 18) {
          e.harvested = true;
          e.carryT = 0.4;
        }
        return;
      }
      var q = host && host.hp > 0 ? host : hiveQueenOf(state);
      if (q) {
        moveTowards(e, q.x, q.y, spd * 1.15, dt);
        if (Math.hypot(q.x - e.x, q.y - e.y) < q.def.size + 16) {
          if (G.invasion) G.invasion.heal(q, q.maxHp * 0.012);
          else q.hp = Math.min(q.maxHp, q.hp + q.maxHp * 0.012);
          e.hp = 0;
          e.noDrop = true;
          G.burst(state, q.x, q.y, "#7cffb0", 8, 40);
        }
      }
      return;
    }
    if (cmd === "orbit") {
      if (!host || host.hp <= 0) {
        e.hiveCmd = "attack";
        return;
      }
      e.orbitAng = (e.orbitAng || 0) + dt * (e.type === "royal_bee" ? 1.4 : 2.1);
      var orad = host.def.size + 34 + (e.type === "royal_bee" ? 14 : e.type === "elite_bee" ? 8 : 0);
      var tx = host.x + Math.cos(e.orbitAng) * orad;
      var ty = host.y + Math.sin(e.orbitAng) * orad;
      moveTowards(e, tx, ty, spd * 1.35, dt);
      if (target && e.cooldown <= 0 && Math.hypot(target.x - e.x, target.y - e.y) < e.def.range) {
        e.cooldown = 1 / Math.max(0.35, e.def.fire);
        enemyFire(state, e, target, "sting", { speed: 240, r: 3, color: e.def.color });
      }
      return;
    }
    if (target) {
      moveTowards(e, target.x, target.y, spd * (cmd === "attack" ? 1.55 : 1.1), dt);
      if (Math.hypot(target.x - e.x, target.y - e.y) < e.def.size + target.def.size + 6) {
        hurt(state, target, Math.round(e.def.dmg * (cmd === "attack" ? 1.4 : 1)), e.x, e.y);
        if (cmd === "attack") {
          explode(state, e.x, e.y, 28, Math.round(e.def.dmg * 0.8), "enemy", "#ffc44a");
          e.hp = 0;
          e.noDrop = true;
        } else if (e.contactCd <= 0) {
          e.contactCd = 0.25;
        }
      }
    }
  }

  function tickKing(state, e, target, dt, spd) {
    tickKingHive(state, e, target, dt, spd);
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
  var DASH_CD = 0.45;
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
    if (state.glinderBurn || (state.glinderMaze && state.glinderMaze.phase === "build")) return false;
    if (state.timeLock && state.timeLock.phase !== "slow") return false;
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
    if (state.stageOutro || (state.timeLock && state.timeLock.phase !== "slow") || (G.invasion && G.invasion.cinematic(state)) || (state.glinderMaze && state.glinderMaze.phase === "build") || state.glinderBurn || state.glinderDeath) {
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
    if (state.glinderMaze && state.glinderMaze.phase === "run") resolveMazeMove(state, ox, oy);
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
      } else if (state.glinderMaze && state.glinderMaze.phase !== "done") {
        u.stowed = true;
        u.packed = false;
        u.x = state.glinderMaze.goal.x;
        u.y = state.glinderMaze.goal.y;
        u.vx = 0;
        u.vy = 0;
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
      if (u.burnT > 0) {
        u.burnT -= dt;
        hurt(state, u, (u.burnDps || 8) * dt, u.x, u.y, false, { trueDmg: true });
        if (u.burnT <= 0) u.burnDps = 0;
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
    if (state.glinderMaze && state.glinderMaze.phase !== "done") return;
    if (state.glinderBurn) return;
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
      if (e.fallen) {
        e.vx = e.vy = 0;
        continue;
      }
      if (state.glinderMaze && state.glinderMaze.phase !== "done" && e.type !== "chefe_vulto") {
        e.vx = 0;
        e.vy = 0;
        continue;
      }
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
      if (e.type === "chefe_vulto" && (state.glinderNight || e.vultoAct === "dark")) {
        var huntCmd = commanderOf(state);
        if (huntCmd) target = huntCmd;
        else target = { x: state.squad.x, y: state.squad.y, def: { size: 12 }, hp: 1, id: -1 };
      }
      if (!target) {
        if (e.def.kind !== "nest") continue;
        target = { x: state.squad.x, y: state.squad.y, def: { size: 12 }, hp: 1, id: -1 };
      }
      var d = dist(e, target);
      if (!(e.type === "hive_pillar" || e.type === "hive_flower" || e.type === "hive_cocoon" || e.type === "hive_cell" || (e.kingStun || 0) > 0 || e.spinMode > 0 || e.seqMode > 0 || e.wormAct === "spin" || e.vultoAct === "strafe" || e.vultoAct === "laser" || e.vultoAct === "nova" || e.vultoAct === "maze" || e.vultoAct === "burn" || e.buried || e.kaskaStep === "spin" || e.kaskaStep === "spin_warn" || e.kaskaStep === "dash" || e.kaskaStep === "dash_warn" || e.kaskaStep === "hop" || e.kaskaStep === "stun" || kaskaAirborne(e) || e.kingAct === "charge" || e.kingAct === "windup" || e.queenAct === "beam" || e.queenAct === "warp" || e.queenAct === "ward" || e.queenAct === "beewall" || e.queenAct === "escape" || e.queenAct === "beespear" || e.princessAct === "thrust" || e.princessAct === "laser")) {
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
          if (host.type === "chefe_comandante" && kaskaIsP2(host) && target && !kaskaAirborne(host)) {
            e.shardT = (e.shardT || (0.35 + (e.orbitIndex || 0) * 0.22)) - dt;
            if (e.shardT <= 0) {
              e.shardT = 1.55;
              var sx = target.x + (Math.random() - 0.5) * 64;
              var sy = target.y + (Math.random() - 0.5) * 64;
              if (!isFinite(sx)) sx = target.x;
              if (!isFinite(sy)) sy = target.y;
              kaskaWarn(state, {
                kind: "airstrike",
                x: sx,
                y: sy,
                t: 0.48,
                r: 24,
                dmg: Math.round((host.def.dmg || 28) * 0.55),
                color: "#c48a20"
              });
            }
          }
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
        if (G.invasion && G.invasion.tookP2Hook(e)) {
          e.shellOff = true;
          e.shieldLockT = 0;
          e.kaskaStep = "idle";
          e.kaskaT = 0.55;
          e.kaskaArrowI = 0;
          e.kaskaDashI = 0;
          e.kaskaDiveI = 0;
          e.zDraw = 0;
          spawnDuskShields(state, e);
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
        tickKaskaP1(state, e, target, spd, dt, d);
      } else if (kind === "boss_charge") {
        tickQueenHive(state, e, target, dt, spd);
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
        if (e.type === "chefe_espectro" && !e.fake && !e.helperOf && e.inv) {
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
      } else if (kind === "hive_drone" || kind === "hive_elite" || kind === "hive_royal") {
        tickHiveBee(state, e, target, dt, spd);
      } else if (kind === "hive_cell" || kind === "hive_cocoon" || kind === "hive_pillar" || kind === "hive_flower") {
        e.vx = e.vy = 0;
        if (kind === "hive_pillar") e.rot = 0;
        if (kind === "hive_cocoon") hivePinCocoon(state, e);
        if (kind === "hive_cocoon" || kind === "hive_flower") e.phase = (e.phase || 0) + dt;
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

      if (!e.attached && !(e.ricoLeft > 0) && kind !== "orbit_shield" && kind !== "pin_spike" && kind !== "hive_cell" && kind !== "hive_cocoon" && kind !== "hive_pillar" && kind !== "hive_flower" && e.vultoAct !== "strafe" && e.vultoAct !== "maze" && e.vultoAct !== "burn" && e.wormAct !== "dive" && e.kingAct !== "charge" && e.princessAct !== "thrust" && e.princessAct !== "hellish" && !e.buried && !kaskaAirborne(e)) G.clampPlay(e, state);
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
      if (state.timeLock && p.kind !== "timeshot") continue;
      if (p.kind === "dropshot" && p.z != null) {
        p.z = Math.max(0, p.z - dt * 320);
        p.life -= dt;
        if (p.z > 0 && p.life > 0) continue;
        if (p.honeyLand) {
          hiveLandHoney(state, p.x, p.y, 40);
          G.burst(state, p.x, p.y, "#e8c050", 8, 40);
        } else {
          explode(state, p.x, p.y, p.boomR || 22, p.dmg, "enemy", "#c8ff6a");
        }
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
      if (glinderCoverBlocksShot(state, p)) {
        G.burst(state, p.x, p.y, "#ff6a18", 6, 36);
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
        if (p.kind === "horn") {
          var hr = Number(p.r);
          if (!isFinite(hr) || hr <= 0) hr = 10;
          rad = t.def.size + Math.min(hr, 20);
        }
        if (p.kind === "moonslash") rad += 16;
        var dx = t.x - p.x;
        var dy = t.y - p.y;
        if (dx * dx + dy * dy <= rad * rad) {
          hit = t;
          break;
        }
      }
      if (!hit) continue;
      if (hit.immortal && hit.type === "chefe_beeking" && hit.kingAct === "charge" && p.team === "player") {
        G.burst(state, p.x, p.y, "#ffe08a", 6, 36);
        state.projectiles.splice(i, 1);
        continue;
      }
      if (hit.immortal && (hit.type === "hive_cocoon" || hit.type === "hive_pillar" || hit.type === "hive_flower" || hit.hiveCmd === "protect")) {
        state.projectiles.splice(i, 1);
        continue;
      }
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
      if (p.kind === "honeyball" && hit.team === "player") {
        state.honeyT = Math.max(state.honeyT || 0, 0.4);
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
      else if (p.team === "enemy" && ((p.boomR || 0) > 0 || p.kind === "ember")) {
        var boomR = p.boomR || 42;
        explode(state, p.x, p.y, boomR, p.dmg, "enemy", "#ff6a18");
        burnSquadArea(state, p.x, p.y, boomR + 10, Math.max(6, p.dmg * 0.32));
      } else {
        hurt(state, hit, p.dmg, p.x, p.y, p.team === "player");
        if (p.kind === "ice") hit.slowT = Math.max(hit.slowT, 1.4);
        if ((p.kind === "flame" || p.burn) && hit.team === "player") burnUnit(hit, 5, Math.max(6, p.dmg * 0.32));
      }
      p.hitIds[hit.id] = 1;
      p.hitsLeft--;
      if ((p.enemyBounce || 0) > 0 && p.team === "player") {
        var next = null;
        var nextD = p.bounceRange > 0 ? p.bounceRange : 150;
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
          if (p.kind === "colo_fist") {
            p.hitIds = {};
            p.hitIds[hit.id] = 1;
            p.fistAng = Math.atan2(p.vy, p.vx);
            if (p.coloRico != null) {
              p.coloRico--;
              if (p.coloRico <= 0) {
                p.wallBounce = 0;
                p.enemyBounce = 0;
              }
            }
          }
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
          var fang = w.followRot ? (fol.rot || 0) : 0;
          w.x = fol.x;
          w.y = fol.y;
          if (w.followOff) {
            w.x += -Math.sin(fang) * w.followOff;
            w.y += Math.cos(fang) * w.followOff;
          }
          if (w.followRot) w.ang = fang + (w.angOff || 0);
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
      } else if (w.kind === "mark" || w.kind === "lane" || w.kind === "cone" || w.kind === "tp" || w.kind === "spin" || w.kind === "slash" || w.kind === "half") {
        /* telegraph only */
      } else if (w.kind === "honeydrop") {
        var drop = G.createProjectile({
          x: w.x,
          y: w.y,
          vx: 0,
          vy: 0,
          dmg: 0,
          team: "enemy",
          kind: "dropshot",
          life: 0.45,
          r: 8,
          color: "#e8c050"
        });
        drop.z = 92;
        drop.honeyLand = true;
        drop.boomR = 0;
        state.projectiles.push(drop);
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
      if (p.ash) {
        p.vy -= 28 * dt;
        p.vx *= Math.max(0.2, 1 - dt * 0.55);
      }
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
      if (state.royalMarkT > 0) state.royalMarkT = Math.max(0, state.royalMarkT - dt);
      var hasVulto = false;
      for (var vt = 0; vt < (state.enemies || []).length; vt++) {
        if (state.enemies[vt].hp > 0 && state.enemies[vt].type === "chefe_vulto") hasVulto = true;
      }
      if (!hasVulto) {
        if (state.glinderNight || state.glinderNightFade || state.glinderCover || (state.glinderNovaT || 0) > 0 || state.glinderSun || state.glinderMaze) {
          state.glinderNight = false;
          state.glinderNightFade = false;
          state.glinderCover = null;
          state.glinderNovaT = 0;
          state.glinderSun = null;
          state.glinderMaze = null;
          state.glinderFoci = [];
          state.glinderBeams = [];
          state.glinderHeat = Math.max(0, (state.glinderHeat || 0) - dt * 0.8);
          clearGlinderFires(state);
        }
        if (G.invasion && G.invasion.firesAlive(state)) {
          state.vultoDark = Math.max(state.vultoDark || 0, 0.85);
        } else {
          state.vultoDark = Math.max(0, (state.vultoDark || 0) - dt * 0.65);
          if (state.vultoBlind > 0) state.vultoBlind = Math.max(0, state.vultoBlind - dt);
        }
      }
      if (state.defeat) {
        updateFx(state, dt);
        tickGlinderFlash(state, dt);
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
      if (state.glinderBurn) {
        tickGlinderBurn(state, dt);
        tickGlinderFoci(state, dt);
        updateFx(state, dt);
        if (state.vfx) {
          for (var bv = 0; bv < state.vfx.length; bv++) state.vfx[bv].t -= dt;
          state.vfx = state.vfx.filter(function (fx) { return fx.t > 0; });
        }
        state.shake *= Math.max(0, 1 - dt * 2.2);
        tickGlinderFlash(state, dt);
        return;
      }
      if (state.glinderDeath) {
        tickGlinderDeath(state, dt);
        updateFx(state, dt);
        if (state.vfx) {
          for (var dv = 0; dv < state.vfx.length; dv++) state.vfx[dv].t -= dt;
          state.vfx = state.vfx.filter(function (fx) { return fx.t > 0; });
        }
        state.shake *= Math.max(0, 1 - dt * 2.4);
        tickGlinderFlash(state, dt);
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
        if (state.timeLock && state.timeLock.phase === "slow") updateSquad(state, dt);
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
      if (state.glinderMaze && state.glinderMaze.phase === "build") {
        var ge = null;
        for (var gi = 0; gi < (state.enemies || []).length; gi++) {
          if (state.enemies[gi].type === "chefe_vulto") ge = state.enemies[gi];
        }
        tickGlinderMaze(state, ge, dt);
        updateFx(state, dt);
        tickGlinderFlash(state, dt);
        return;
      }
      if (G.tactics && G.tactics.update) G.tactics.update(state, dt);
      playerShoot(state, dt);
      tickHiveWorld(state, dt);
      updateEnemies(state, dt);
      tickGlinderSun(state, dt);
      tickGlinderFoci(state, dt);
      if ((state.glinderHeat || 0) > 0.32 && !glinderP2({ p2: !!(state.glinderSun) })) {
        state.glinderHeat = Math.max(0, state.glinderHeat - dt * 0.25);
      } else if (state.glinderSun && !state.glinderSun.dead) {
        state.glinderHeat = Math.min(0.55, (state.glinderHeat || 0.3) + dt * 0.04);
      }
      if (state.vultoBlind > 0) state.vultoBlind = Math.max(0, state.vultoBlind - dt);
      tickGlinderFlash(state, dt);
      tickGlinderBeams(state, dt);
      tickGlinderRub(state, dt);
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
    ensureHive: hiveEnsure,
    spawnDashBurst: spawnDashBurst,
    pickupRadius: pickupRadius,
    applyDrop: applyDrop,
    spawnGlinderSun: spawnGlinderSun,
    endGlinderNight: endGlinderNight,
    rubGlinderFire: rubGlinderFire,
    dashCd: function () { return DASH_CD; }
  };
})(window.TFAG = window.TFAG || {});
