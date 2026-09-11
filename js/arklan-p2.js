/* Arklan P2 — sentry kit + gullet side-scroller */
(function (G) {

  function api() {
    return G._arklanP2Api || null;
  }

  function cageBox(state) {
    if (state.arklanCage && state.arklanCage.wall > 0.15) return state.arklanCage;
    return G.playfield(state);
  }

  /** Distance from boss to farthest arena corner (+pad) — attacks must cover the cage */
  function cageReach(state, e, pad) {
    var b = cageBox(state);
    var x = e && e.x != null ? e.x : (b.x0 + b.x1) / 2;
    var y = e && e.y != null ? e.y : (b.y0 + b.y1) / 2;
    var d = Math.max(
      Math.hypot(b.x0 - x, b.y0 - y),
      Math.hypot(b.x1 - x, b.y0 - y),
      Math.hypot(b.x1 - x, b.y1 - y),
      Math.hypot(b.x0 - x, b.y1 - y)
    );
    return d + (pad != null ? pad : 48);
  }

  function centerOf(state) {
    var b = cageBox(state);
    return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
  }

  function holdSentry(state, e, dt) {
    var c = centerOf(state);
    e.buried = false;
    e.phased = false;
    e.stealth = 0;
    e.arklanSentry = true;
    e.arklanArmor = true;
    e.arklanMech = 1;
    e.x += (c.x - e.x) * Math.min(1, 4 * dt);
    e.y += (c.y - e.y) * Math.min(1, 4 * dt);
    // Keep desert zoom locked during arena fight (not gullet)
    if (!state.arklanGullet) restoreDesertZoom(state);
    // Face squad slowly — flame overrides rot while spinning
    if (e.wormAct !== "flame") {
      var want = Math.atan2(state.squad.y - e.y, state.squad.x - e.x);
      var cur = e.rot || 0;
      var turn = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
      e.rot = cur + turn * Math.min(1, 2.8 * dt);
    }
    if (G.syncArklanCage) G.syncArklanCage(state);
  }

  function desertZoom(state) {
    return state.desertZoom > 0 ? state.desertZoom : 0.68;
  }

  function restoreDesertZoom(state) {
    state.camZoomTo = desertZoom(state);
  }

  function tickWallEyes(state, e, dt, A) {
    if (!state.arklanEyes) state.arklanEyes = [];
    var eyes = state.arklanEyes;
    var b = cageBox(state);
    // Spawn up to 5 on walls
    e.eyeSpawnT = (e.eyeSpawnT || 0) - dt;
    if (eyes.length < 5 && e.eyeSpawnT <= 0) {
      e.eyeSpawnT = 4.5 + Math.random() * 2.5;
      var side = (Math.random() * 4) | 0;
      var ex, ey, ang;
      if (side === 0) {
        ex = b.x0 + 10 + Math.random() * Math.max(20, b.x1 - b.x0 - 20);
        ey = b.y0 + 8;
        ang = Math.PI / 2;
      } else if (side === 1) {
        ex = b.x1 - 8;
        ey = b.y0 + 10 + Math.random() * Math.max(20, b.y1 - b.y0 - 20);
        ang = Math.PI;
      } else if (side === 2) {
        ex = b.x0 + 10 + Math.random() * Math.max(20, b.x1 - b.x0 - 20);
        ey = b.y1 - 8;
        ang = -Math.PI / 2;
      } else {
        ex = b.x0 + 8;
        ey = b.y0 + 10 + Math.random() * Math.max(20, b.y1 - b.y0 - 20);
        ang = 0;
      }
      eyes.push({
        x: ex,
        y: ey,
        ang: ang,
        blink: Math.random() * Math.PI * 2,
        fireT: 2.2 + Math.random() * 1.8,
        chargeT: 0,
        chargeMax: 0,
        lockedAim: null,
        markX: 0,
        markY: 0,
        tracking: false,
        glow: 0,
        grow: 0,
        id: Math.random()
      });
    }
    for (var i = eyes.length - 1; i >= 0; i--) {
      var eye = eyes[i];
      eye.grow = Math.min(1, (eye.grow || 0) + dt * 1.4);
      eye.blink += dt * 3.2;
      eye.glow = Math.max(0, (eye.glow || 0) - dt * 1.2);
      if (eye.laserBeam) {
        eye.laserBeam.t -= dt;
        if (eye.laserBeam.t <= 0) eye.laserBeam = null;
      }

      if (eye.grow < 0.85) {
        eye.look = Math.atan2(state.squad.y - eye.y, state.squad.x - eye.x);
        continue;
      }

      // —— Charge: lock aim + ground mark for 1s, then fire (no bullet spam) ——
      if ((eye.chargeT || 0) > 0) {
        eye.chargeT -= dt;
        eye.glow = 1;
        eye.look = eye.lockedAim;
        eye.tracking = false;
        if (eye.warnLane) eye.warnLane.t = Math.max(eye.warnLane.t, eye.chargeT);
        if (eye.warnMark) eye.warnMark.t = Math.max(eye.warnMark.t, eye.chargeT);
        if (eye.chargeT <= 0) {
          var fireAim = eye.lockedAim;
          var eyeReach = cageReach(state, eye, 40);
          A.hurtLane(state, eye.x, eye.y, fireAim, eyeReach, 18, Math.round(e.def.dmg * 0.7));
          eye.laserBeam = { ang: fireAim, t: 0.28, len: eyeReach };
          G.burst(state, eye.markX, eye.markY, "#ff6a8a", 14, 80);
          G.burst(state, eye.x + Math.cos(fireAim) * 40, eye.y + Math.sin(fireAim) * 40, "#ff4a2a", 8, 50);
          if (G.audio && G.audio.hit) G.audio.hit();
          eye.chargeT = 0;
          eye.chargeMax = 0;
          eye.lockedAim = null;
          eye.warnLane = null;
          eye.warnMark = null;
          eye.fireT = 2.8 + Math.random() * 1.8;
          eye.glow = 0.6;
        }
        continue;
      }

      eye.look = Math.atan2(state.squad.y - eye.y, state.squad.x - eye.x);
      eye.fireT -= dt;
      if (eye.fireT <= 0) {
        // Lock on current squad position → mark ground → wait 1s → beam
        var CHARGE = 1.0;
        eye.markX = state.squad.x;
        eye.markY = state.squad.y;
        eye.lockedAim = Math.atan2(eye.markY - eye.y, eye.markX - eye.x);
        eye.look = eye.lockedAim;
        eye.chargeMax = CHARGE;
        eye.chargeT = CHARGE;
        eye.glow = 1;
        eye.warnLane = null;
        eye.warnMark = {
          kind: "mark",
          x: eye.markX,
          y: eye.markY,
          t: CHARGE,
          max: CHARGE,
          r: 34,
          dmg: 0,
          color: "#ffd0d8"
        };
        A.warnAt(state, eye.warnMark);
      }
    }
  }

  function fireSentryBullet(state, e, ang) {
    var reach = cageReach(state, e, 80);
    var spd = 480;
    state.projectiles.push(
      G.createProjectile({
        x: e.x + Math.cos(ang) * 42,
        y: e.y + Math.sin(ang) * 42,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        dmg: Math.round(e.def.dmg * 0.7),
        team: "enemy",
        kind: "arklan_bolt",
        life: Math.max(1.8, reach / spd + 0.35),
        r: 7,
        color: "#c8d4e0",
        fromBoss: true,
        fromId: e.id,
        spin: Math.random() * 6
      })
    );
  }

  function fireSentryLaser(state, e, ang, A) {
    var len = cageReach(state, e, 60);
    A.warnAt(state, {
      kind: "lane",
      x: e.x,
      y: e.y,
      ang: ang,
      len: len,
      w: 18,
      t: 0.45,
      max: 0.45,
      r: 18,
      dmg: 0,
      color: "#7af0ff"
    });
    e.laserPending = { ang: ang, t: 0.45, len: len };
  }

  function fireSentryWave(state, e, ang) {
    if (!state.sandwaves) state.sandwaves = [];
    var reach = cageReach(state, e, 40);
    state.sandwaves.push({
      x: e.x,
      y: e.y,
      ang: ang,
      half: 1.05,
      r: 28,
      rMax: reach,
      width: 58,
      t: 1.25,
      max: 1.25,
      dmg: Math.round(e.def.dmg * 0.85),
      hit: {},
      fromId: e.id,
      gritCd: 0,
      arklanWave: true,
      color: "#9ab0c8"
    });
    G.burst(state, e.x, e.y, "#9ab0c8", 12, 70);
    state.shake = Math.max(state.shake || 0, 5);
  }

  function startBasic(state, e, kind, A) {
    var ang = Math.atan2(state.squad.y - e.y, state.squad.x - e.x);
    e.wormAct = kind;
    e.sentryT = 0;
    if (kind === "bolt") {
      e.boltN = 5;
      e.boltGap = 0.12;
      e.boltAng = ang;
      A.warnAt(state, {
        kind: "mark",
        x: state.squad.x,
        y: state.squad.y,
        t: 0.35,
        max: 0.35,
        r: 28,
        dmg: 0,
        color: "#c8d4e0",
        followSquad: true
      });
    } else if (kind === "laser") {
      fireSentryLaser(state, e, ang, A);
      e.sentryT = 0.45;
    } else if (kind === "wave") {
      var reach = cageReach(state, e, 40);
      A.warnAt(state, {
        kind: "cone",
        x: e.x,
        y: e.y,
        ang: ang,
        spread: 1.1,
        range: reach,
        t: 0.5,
        max: 0.5,
        r: 24,
        dmg: 0,
        color: "#9ab0c8"
      });
      e.waveAng = ang;
      e.sentryT = 0.5;
    }
  }

  function startRain(state, e, A) {
    e.wormAct = "rain";
    e.rainT = 2.6;
    e.rainDrop = 0.08;
    var b = cageBox(state);
    e.rainMarks = [];
    for (var i = 0; i < 14; i++) {
      var mx = b.x0 + 40 + Math.random() * Math.max(40, b.x1 - b.x0 - 80);
      var my = b.y0 + 40 + Math.random() * Math.max(40, b.y1 - b.y0 - 80);
      e.rainMarks.push({ x: mx, y: my, t: 0.55 + Math.random() * 0.5 });
      A.warnAt(state, {
        kind: "mark",
        x: mx,
        y: my,
        t: 0.7,
        max: 0.7,
        r: 36,
        dmg: 0,
        color: "#8a9aaa"
      });
    }
    e.mawOpen = 0.35;
  }

  function startFlame(state, e) {
    e.wormAct = "flame";
    e.flameT = 4.2;
    e.flameAng = e.rot || 0;
    e.flameDir = Math.random() < 0.5 ? 1 : -1;
    e.flameTick = 0;
    e.flameLen = cageReach(state, e, 36);
    e.mawOpen = 0.5;
  }

  function startTentacles(state, e, A) {
    e.wormAct = "tentacles";
    e.tentT = 3.8;
    e.tents = [];
    var b = cageBox(state);
    var n = 3 + ((Math.random() * 2) | 0);
    for (var i = 0; i < n; i++) {
      var side = (Math.random() * 4) | 0;
      var tx, ty;
      if (side === 0) {
        tx = b.x0 + 50 + Math.random() * (b.x1 - b.x0 - 100);
        ty = b.y0 + 20;
      } else if (side === 1) {
        tx = b.x1 - 20;
        ty = b.y0 + 50 + Math.random() * (b.y1 - b.y0 - 100);
      } else if (side === 2) {
        tx = b.x0 + 50 + Math.random() * (b.x1 - b.x0 - 100);
        ty = b.y1 - 20;
      } else {
        tx = b.x0 + 20;
        ty = b.y0 + 50 + Math.random() * (b.y1 - b.y0 - 100);
      }
      var delay = 0.35 + i * 0.45;
      e.tents.push({
        x: tx,
        y: ty,
        phase: "rise",
        t: delay,
        slamR: 58,
        grow: 0
      });
      A.warnAt(state, {
        kind: "mark",
        x: tx,
        y: ty,
        t: delay + 0.55,
        max: delay + 0.55,
        r: 58,
        dmg: 0,
        color: "#6a7888"
      });
    }
  }

  function startDevour(state, e, A) {
    e.wormAct = "devourP2";
    e.devourP2T = 3.4;
    e.devourP2Pull = 0;
    e.devourRockT = 0.35;
    e.mawOpen = 0;
    e.devourGlow = 1.2;
    A.warnAt(state, {
      kind: "mark",
      x: e.x,
      y: e.y,
      t: 0.7,
      max: 0.7,
      r: Math.min(140, cageReach(state, e, 0) * 0.35),
      dmg: 0,
      color: "#ff4a2a"
    });
  }

  function pickAct(e) {
    if (e.arklanBroken) return "devourP2";
    var pool = ["bolt", "bolt", "laser", "wave", "rain", "flame", "tentacles", "devourP2"];
    if (e.wormLast) {
      var filtered = [];
      for (var i = 0; i < pool.length; i++) if (pool[i] !== e.wormLast) filtered.push(pool[i]);
      pool = filtered.length ? filtered : pool;
    }
    // After big skills, bias basics
    if ((e.forceBasic || 0) > 0) {
      e.forceBasic -= 1;
      pool = ["bolt", "bolt", "laser", "wave"];
    }
    return pool[(Math.random() * pool.length) | 0];
  }

  function tickWormP2(state, e, target, dt) {
    var A = api();
    if (!A) return;
    holdSentry(state, e, dt);
    tickWallEyes(state, e, dt, A);
    e.devourGlow = Math.max(0, (e.devourGlow || 0) - dt * 0.4);
    e.headFlash = Math.max(0, (e.headFlash || 0) - dt);
    if ((e.mawOpen || 0) > 0 && e.wormAct !== "devourP2" && e.wormAct !== "flame" && e.wormAct !== "rain") {
      e.mawOpen = Math.max(0, e.mawOpen - dt * 1.5);
    }

    // Pending laser fire
    if (e.laserPending) {
      e.laserPending.t -= dt;
      if (e.laserPending.t <= 0) {
        A.hurtLane(state, e.x, e.y, e.laserPending.ang, e.laserPending.len, 18, Math.round(e.def.dmg * 1.15));
        G.burst(state, e.x + Math.cos(e.laserPending.ang) * 80, e.y + Math.sin(e.laserPending.ang) * 80, "#7af0ff", 14, 90);
        if (G.audio && G.audio.explosion) G.audio.hit && G.audio.hit();
        e.laserBeam = { ang: e.laserPending.ang, t: 0.28, len: e.laserPending.len };
        e.laserPending = null;
      }
    }
    if (e.laserBeam) {
      e.laserBeam.t -= dt;
      if (e.laserBeam.t <= 0) e.laserBeam = null;
    }

    if (e.wormAct === "bolt") {
      e.boltGap -= dt;
      if (e.boltGap <= 0 && e.boltN > 0) {
        e.boltGap = 0.11;
        e.boltN -= 1;
        var ang = e.boltAng + (Math.random() - 0.5) * 0.18;
        fireSentryBullet(state, e, ang);
      }
      if (e.boltN <= 0) {
        e.wormAct = "";
        e.wormT = 0.55;
      }
      return;
    }

    if (e.wormAct === "laser") {
      e.sentryT -= dt;
      if (e.sentryT <= 0) {
        e.wormAct = "";
        e.wormT = 0.7;
      }
      return;
    }

    if (e.wormAct === "wave") {
      e.sentryT -= dt;
      if (e.sentryT <= 0 && !e.waveFired) {
        e.waveFired = true;
        fireSentryWave(state, e, e.waveAng || e.rot);
      }
      if (e.sentryT <= -0.15) {
        e.wormAct = "";
        e.waveFired = false;
        e.wormT = 0.65;
      }
      return;
    }

    if (e.wormAct === "rain") {
      e.rainT -= dt;
      e.mawOpen = 0.4 + Math.sin((e.rainT || 0) * 8) * 0.1;
      e.rainDrop -= dt;
      if (e.rainDrop <= 0) {
        e.rainDrop = 0.09;
        var b = cageBox(state);
        var dx = b.x0 + 30 + Math.random() * Math.max(20, b.x1 - b.x0 - 60);
        var dy = b.y0 + 30 + Math.random() * Math.max(20, b.y1 - b.y0 - 60);
        state.projectiles.push(
          G.createProjectile({
            x: dx,
            y: b.y0 - 40,
            vx: (Math.random() - 0.5) * 40,
            vy: 380 + Math.random() * 120,
            dmg: Math.round(e.def.dmg * 0.75),
            team: "enemy",
            kind: "arklan_shard",
            life: 2.5,
            r: 8,
            color: "#a8b8c8",
            fromBoss: true,
            fromId: e.id,
            spin: Math.random() * 8,
            rain: true
          })
        );
      }
      if (e.rainT <= 0) {
        e.wormAct = "";
        e.mawOpen = 0;
        e.wormT = 0.9;
        e.forceBasic = 2;
      }
      return;
    }

    if (e.wormAct === "flame") {
      e.flameT -= dt;
      e.flameAng = (e.flameAng || 0) + e.flameDir * 1.55 * dt;
      e.rot = e.flameAng;
      e.mawOpen = 0.65;
      e.flameTick -= dt;
      var flameLen = e.flameLen || cageReach(state, e, 36);
      if (e.flameTick <= 0) {
        e.flameTick = 0.05;
        A.hurtLane(state, e.x, e.y, e.flameAng, flameLen, 32, Math.round(e.def.dmg * 0.42));
        // sand particles along cone
        for (var f = 0; f < 3; f++) {
          var fa = e.flameAng + (Math.random() - 0.5) * 0.35;
          var fr = 40 + Math.random() * Math.max(80, flameLen * 0.85);
          state.particles.push({
            x: e.x + Math.cos(fa) * fr,
            y: e.y + Math.sin(fa) * fr,
            vx: Math.cos(fa) * (40 + Math.random() * 60),
            vy: Math.sin(fa) * (40 + Math.random() * 60),
            life: 0.25,
            max: 0.4,
            size: 2 + Math.random() * 3,
            color: Math.random() > 0.5 ? "#e8c070" : "#c4a06a",
            sand: true
          });
        }
      }
      if (e.flameT <= 0) {
        e.wormAct = "";
        e.mawOpen = 0;
        e.wormT = 1.0;
        e.forceBasic = 2;
      }
      return;
    }

    if (e.wormAct === "tentacles") {
      e.tentT -= dt;
      var tents = e.tents || [];
      for (var ti = 0; ti < tents.length; ti++) {
        var tent = tents[ti];
        tent.t -= dt;
        if (tent.phase === "rise") {
          tent.grow = Math.min(1, (tent.grow || 0) + dt * 1.8);
          if (tent.t <= 0) {
            tent.phase = "slam";
            tent.t = 0.22;
            tent.grow = 1;
            A.hurtSquadArea
              ? A.hurtSquadArea(state, tent.x, tent.y, tent.slamR, Math.round(e.def.dmg * 1.1), tent.x, tent.y)
              : null;
            // fallback hurt units in radius
            for (var ui = 0; ui < state.units.length; ui++) {
              var u = state.units[ui];
              if (u.hp <= 0 || u.stowed) continue;
              if (Math.hypot(u.x - tent.x, u.y - tent.y) < tent.slamR + 12) {
                A.hurt(state, u, Math.round(e.def.dmg * 1.1), tent.x, tent.y);
              }
            }
            G.burst(state, tent.x, tent.y, "#8a9aaa", 18, 100);
            G.burst(state, tent.x, tent.y, "#c4a06a", 10, 70);
            state.shake = Math.max(state.shake || 0, 10);
            if (G.audio && G.audio.explosion) G.audio.explosion();
            tent.slamFx = 0.45;
          }
        } else if (tent.phase === "slam") {
          tent.slamFx = Math.max(0, (tent.slamFx || 0) - dt);
          if (tent.t <= 0) {
            tent.phase = "hold";
            tent.t = 0.55;
          }
        } else {
          tent.grow = Math.max(0, tent.grow - dt * 1.2);
        }
      }
      if (e.tentT <= 0) {
        e.wormAct = "";
        e.tents = null;
        e.wormT = 1.05;
        e.forceBasic = 2;
      }
      return;
    }

    if (e.wormAct === "devourP2") {
      e.devourP2T -= dt;
      var openK = Math.min(1, (3.4 - e.devourP2T) / 0.55);
      e.mawOpen = openK;
      e.devourGlow = 1.4;
      e.devourP2Pull = Math.min(1, (e.devourP2Pull || 0) + dt * 0.55);
      var pull = 95 + e.devourP2Pull * 220;
      var dx = e.x - state.squad.x;
      var dy = e.y - state.squad.y;
      var dist = Math.hypot(dx, dy) || 1;
      // Stronger pull when broken (player must enter on purpose)
      var mul = e.arklanBroken ? 0.55 : 1;
      state.squad.x += (dx / dist) * pull * mul * dt;
      state.squad.y += (dy / dist) * pull * mul * dt;
      // Debris: big slow pedregulhos (dodgeable)
      e.devourRockT = (e.devourRockT || 0) - dt;
      if (e.devourRockT <= 0) {
        e.devourRockT = 0.55 + Math.random() * 0.25;
        var b2 = cageBox(state);
        var edge = (Math.random() * 4) | 0;
        var sx, sy;
        if (edge === 0) {
          sx = b2.x0 + 20 + Math.random() * Math.max(20, b2.x1 - b2.x0 - 40);
          sy = b2.y0 + 16;
        } else if (edge === 1) {
          sx = b2.x1 - 16;
          sy = b2.y0 + 20 + Math.random() * Math.max(20, b2.y1 - b2.y0 - 40);
        } else if (edge === 2) {
          sx = b2.x0 + 20 + Math.random() * Math.max(20, b2.x1 - b2.x0 - 40);
          sy = b2.y1 - 16;
        } else {
          sx = b2.x0 + 16;
          sy = b2.y0 + 20 + Math.random() * Math.max(20, b2.y1 - b2.y0 - 40);
        }
        var toA = Math.atan2(state.squad.y - sy, state.squad.x - sx);
        // drift slightly toward maw too so they funnel in
        var toM = Math.atan2(e.y - sy, e.x - sx);
        var mix = toA + Math.atan2(Math.sin(toM - toA), Math.cos(toM - toA)) * 0.25;
        var spd = 75 + Math.random() * 45;
        var br = 18 + Math.random() * 12;
        state.projectiles.push(
          G.createProjectile({
            x: sx,
            y: sy,
            vx: Math.cos(mix) * spd,
            vy: Math.sin(mix) * spd,
            dmg: Math.round(e.def.dmg * 0.5),
            team: "enemy",
            kind: "arklan_boulder",
            life: 4.5,
            r: br,
            color: "#8a7060",
            fromBoss: true,
            fromId: e.id,
            spin: Math.random() * 6,
            spinSpd: (Math.random() - 0.5) * 2.2,
            boulder: true
          })
        );
        A.warnAt(state, {
          kind: "mark",
          x: sx,
          y: sy,
          t: 0.35,
          max: 0.35,
          r: br + 8,
          dmg: 0,
          color: "#c4a06a"
        });
      }
      if (dist < 55 + openK * 30) {
        if (e.arklanBroken || e.hp <= 0) {
          startGullet(state, e);
          return;
        }
        // Survived contact without broken — spit damage and end
        for (var hi = 0; hi < state.units.length; hi++) {
          var hu = state.units[hi];
          if (hu.hp <= 0 || hu.stowed) continue;
          A.hurt(state, hu, Math.round(e.def.dmg * 1.4), e.x, e.y, false, { trueDmg: true });
        }
        e.wormAct = "";
        e.mawOpen = 0;
        e.wormT = 1.4;
        sandBurstSafe(state, e.x, e.y, 24);
        return;
      }
      if (e.devourP2T <= 0) {
        e.wormAct = "";
        e.mawOpen = 0;
        e.wormT = e.arklanBroken ? 0.8 : 1.2;
        // If broken, keep trying devour soon
        if (e.arklanBroken) e.wormT = 0.45;
      }
      return;
    }

    e.wormT = (e.wormT || 0) - dt;
    if (e.wormT > 0) return;
    var act = pickAct(e);
    e.wormLast = act;
    if (act === "rain") startRain(state, e, A);
    else if (act === "flame") startFlame(state, e);
    else if (act === "tentacles") startTentacles(state, e, A);
    else if (act === "devourP2") startDevour(state, e, A);
    else startBasic(state, e, act, A);
  }

  function sandBurstSafe(state, x, y, n) {
    if (!state.particles) state.particles = [];
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * (40 + Math.random() * 80),
        vy: Math.sin(a) * (40 + Math.random() * 80) - 20,
        life: 0.35,
        max: 0.55,
        size: 2 + Math.random() * 3,
        color: "#c4a06a",
        sand: true
      });
    }
  }

  function onArklanBroken(state, e) {
    if (e.arklanBroken) return;
    e.arklanBroken = true;
    e.hp = 0;
    e.immortal = true;
    e.flash = 0.8;
    e.wormAct = "";
    e.wormT = 0.6;
    // Don't let stage-clear treat 0 HP as "wave done"
    state.waitingClear = false;
    state.clearTimer = 0;
    state.stageOutro = null;
    state.shake = Math.max(state.shake || 0, 14);
    G.burst(state, e.x, e.y, "#ff6a3a", 24, 140);
    G.burst(state, e.x, e.y, "#c8d4e0", 16, 100);
    state.banner = { text: "", t: 0 };
    if (G.audio && G.audio.explosion) G.audio.explosion();
  }

  function startGullet(state, e) {
    e.mazeHide = true;
    e.immortal = true;
    e.wormAct = "";
    e.mawOpen = 1;
    state.waitingClear = false;
    state.clearTimer = 0;
    state.stageOutro = null;
    state.arklanEyes = [];
    state.projectiles = [];
    state.warnings = [];
    state.sandwaves = [];
    state.arklanGullet = {
      phase: "cin",
      t: 0,
      scroll: 0,
      speed: 110,
      length: 6200,
      valveAt: 4100,
      shots: [],
      foes: [],
      obstacles: [],
      heart: null,
      bossId: e.id,
      spit: null,
      flash: 0
    };
    var g = state.arklanGullet;
    // Readable course — gaps, fewer shooters, not bullet hell
    for (var i = 0; i < 42; i++) {
      var fx = 480 + i * 130 + Math.random() * 40;
      var kinds = ["mite", "tooth", "mite", "spore", "platelet", "mite"];
      var kind = kinds[i % kinds.length];
      var hp =
        kind === "spore" ? 26 :
        kind === "platelet" ? 20 :
        kind === "tooth" ? 16 :
        12 + (i % 4) * 2;
      var rad =
        kind === "spore" ? 20 :
        kind === "platelet" ? 16 :
        kind === "tooth" ? 15 :
        14;
      g.foes.push({
        x: fx,
        y: 110 + Math.random() * (state.H - 220),
        hp: hp,
        maxHp: hp,
        kind: kind,
        t: Math.random() * 4,
        r: rad,
        facing: Math.random() < 0.5 ? -1 : 1,
        shotCd: 0.4 + Math.random() * 1.8
      });
    }
    for (var o = 0; o < 22; o++) {
      var isGear = o % 5 === 0;
      g.obstacles.push({
        x: 400 + o * 220 + Math.random() * 40,
        y: isGear ? state.H * (0.32 + Math.random() * 0.36) : Math.random() < 0.5 ? 70 : state.H - 70,
        w: isGear ? 48 + Math.random() * 22 : 36 + Math.random() * 28,
        h: isGear ? 48 : 70 + Math.random() * 55,
        kind: isGear ? "gear" : "rib"
      });
    }
    for (var v = 0; v < 9; v++) {
      g.foes.push({
        x: 700 + v * 480,
        y: state.H * 0.5 + (v % 2 ? -110 : 110),
        hp: 999,
        maxHp: 999,
        kind: "vent",
        t: Math.random() * 2,
        r: 30,
        vent: true
      });
    }
    state.camLook = null;
    state.camZoomTo = 1;
    state.camZoom = 1;
    state.arklanCage = null;
    state.banner = { text: "", t: 0 };
    // Boarding cinematic timeline — ship sits on flesh floor (hull bottom ~+22)
    var floorY0 = state.H * 0.72;
    g.cin = {
      beat: "swallow",
      beatT: 0,
      cmdX: state.W * 0.5,
      cmdY: -80,
      cmdVx: 0,
      cmdVy: 0,
      bounce: 0,
      wallHits: 0,
      walkX: 0,
      shipX: state.W * 0.7,
      shipY: floorY0 - 20,
      door: 0,
      pilot: 0,
      bang: 0,
      dust: 0,
      shakeN: 0,
      depth: 0,
      softLand: 0,
      squash: 0,
      sparks: [],
      drips: [],
      vessels: [],
      impacts: [],
      seg: 0,
      segT: 0,
      camY: 0,
      fade: 0,
      iris: 0
    };
    // Pre-seed blood vessels along throat walls
    for (var vi = 0; vi < 28; vi++) {
      g.cin.vessels.push({
        side: vi % 2,
        y0: Math.random() * 1400,
        amp: 8 + Math.random() * 18,
        thick: 2 + Math.random() * 3.5,
        phase: Math.random() * Math.PI * 2,
        pulse: 0.6 + Math.random() * 0.8
      });
    }
    if (G.audio && G.audio.explosion) G.audio.explosion();
  }

  function gulletField(state) {
    return { x0: 40, y0: 56, x1: state.W - 40, y1: state.H - 56 };
  }

  function clampGulletCraft(state) {
    var b = gulletField(state);
    state.squad.x = Math.max(b.x0, Math.min(b.x1, state.squad.x));
    state.squad.y = Math.max(b.y0, Math.min(b.y1, state.squad.y));
  }

  function ensureGulletPlane(g) {
    if (!g.plane) {
      g.plane = {
        dashT: 0,
        dashCd: 0,
        dashDx: 1,
        dashDy: 0,
        shieldT: 0,
        shieldCd: 0,
        invuln: 0,
        card: 0,
        charge: 0,
        peaCd: 0,
        bombCd: 0,
        trails: [],
        flash: 0,
        wasShift: false,
        wasSpace: false,
        wasE: false
      };
    }
    return g.plane;
  }

  function gulletHurtCraft(state, dmg, x, y) {
    var g = state.arklanGullet;
    if (!g) return;
    var pl = ensureGulletPlane(g);
    if ((pl.invuln || 0) > 0 || (pl.dashT || 0) > 0) return;
    if ((pl.shieldT || 0) > 0) {
      // Shield eats the hit and converts to card
      pl.card = Math.min(1, (pl.card || 0) + 0.18);
      pl.flash = 0.25;
      G.burst(state, state.squad.x, state.squad.y, "#ff7ad9", 10, 55);
      if (G.audio && G.audio.ui) G.audio.ui();
      return;
    }
    var A = api();
    if (A) {
      for (var u = 0; u < state.units.length; u++) {
        if (state.units[u].hp > 0 && !state.units[u].stowed) {
          A.hurt(state, state.units[u], dmg, x, y);
        }
      }
    }
    pl.invuln = 0.55;
    pl.flash = 0.35;
  }

  function gulletHealSquad(state, amount) {
    var i;
    for (i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (!u || u.hp <= 0 || u.stowed) continue;
      u.hp = Math.min(u.maxHp, u.hp + amount);
      u.flash = Math.max(u.flash || 0, 0.25);
    }
  }

  function spawnParryFx(g, x, y, big) {
    var pl = ensureGulletPlane(g);
    if (!pl.parryFx) pl.parryFx = [];
    pl.parryFx.push({
      x: x,
      y: y,
      life: big ? 0.55 : 0.38,
      max: big ? 0.55 : 0.38,
      big: !!big
    });
    var n = big ? 16 : 10;
    var i;
    for (i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      pl.parryFx.push({
        x: x,
        y: y,
        vx: Math.cos(a) * (90 + Math.random() * 140),
        vy: Math.sin(a) * (90 + Math.random() * 140),
        life: 0.35 + Math.random() * 0.25,
        max: 0.55,
        spark: true,
        col: i % 2 ? "#ff7ad9" : "#ffe08a"
      });
    }
  }

  function tickParryFx(pl, dt) {
    if (!pl.parryFx) return;
    var i;
    for (i = pl.parryFx.length - 1; i >= 0; i--) {
      var fx = pl.parryFx[i];
      fx.life -= dt;
      if (fx.spark) {
        fx.x += (fx.vx || 0) * dt;
        fx.y += (fx.vy || 0) * dt;
        fx.vx *= 0.92;
        fx.vy *= 0.92;
      }
      if (fx.life <= 0) pl.parryFx.splice(i, 1);
    }
  }

  function tryParryShot(state, sh) {
    var g = state.arklanGullet;
    if (!g || !sh || !sh.enemy) return false;
    var pl = ensureGulletPlane(g);
    var dashing = (pl.dashT || 0) > 0;
    var shielding = (pl.shieldT || 0) > 0;
    if (!dashing && !shielding) return false;
    if (!sh.parry && !shielding) return false;
    if (sh.parry || shielding) {
      var wasPink = !!sh.parry;
      pl.card = Math.min(1, (pl.card || 0) + (wasPink ? 0.38 : 0.14));
      pl.flash = 0.4;
      spawnParryFx(g, sh.x, sh.y, wasPink);
      G.burst(state, sh.x, sh.y, "#ff7ad9", wasPink ? 18 : 10, wasPink ? 90 : 55);
      G.burst(state, sh.x, sh.y, "#ffe08a", 8, 50);
      G.burst(state, state.squad.x, state.squad.y, "#7af0ff", 6, 40);
      // Parry restores squad HP — pink hits heal more
      gulletHealSquad(state, wasPink ? 14 : 6);
      state.shake = Math.max(state.shake || 0, wasPink ? 7 : 4);
      if (G.audio && G.audio.ui) G.audio.ui();
      if (wasPink && dashing) {
        g.shots.push({
          x: sh.x,
          y: sh.y,
          vx: 680,
          vy: 0,
          life: 1.25,
          dmg: 48,
          kind: "reflect",
          color: "#ff7ad9"
        });
      }
      return true;
    }
    return false;
  }

  function fireGulletWeapons(state, dt) {
    var g = state.arklanGullet;
    if (!g) return;
    var pl = ensureGulletPlane(g);
    var ptr = state.pointer || {};
    pl.peaCd = Math.max(0, (pl.peaCd || 0) - dt);
    pl.bombCd = Math.max(0, (pl.bombCd || 0) - dt);

    // LMB — peashooter stream (infinite range across the gullet)
    if (ptr.fireHold && pl.peaCd <= 0 && (pl.dashT || 0) <= 0) {
      pl.peaCd = 0.09;
      g.shots.push({
        x: state.squad.x + 28,
        y: state.squad.y + (Math.random() - 0.5) * 4,
        vx: 720,
        vy: (Math.random() - 0.5) * 20,
        life: 8,
        dmg: 15,
        kind: "pea",
        color: "#ffe08a"
      });
      pl.card = Math.min(1, (pl.card || 0) + 0.008);
    }

    // RMB — charge lobber (hold builds, release or auto at full)
    if (ptr.altHold) {
      pl.charge = Math.min(1, (pl.charge || 0) + dt * 0.85);
    } else if ((pl.charge || 0) > 0.15 && pl.bombCd <= 0) {
      var power = pl.charge;
      pl.charge = 0;
      pl.bombCd = 0.35;
      var spread = power > 0.75 ? 3 : power > 0.4 ? 2 : 1;
      var bi;
      for (bi = 0; bi < spread; bi++) {
        var ang = (bi - (spread - 1) * 0.5) * 0.18;
        g.shots.push({
          x: state.squad.x + 22,
          y: state.squad.y,
          vx: Math.cos(ang) * (420 + power * 140),
          vy: Math.sin(ang) * (420 + power * 140),
          life: 8,
          dmg: 28 + Math.floor(power * 32),
          kind: "bomb",
          r: 5 + power * 6,
          color: "#7af0ff"
        });
      }
      pl.card = Math.min(1, (pl.card || 0) + 0.04 + power * 0.08);
      if (G.audio && G.audio.wave) G.audio.wave();
    } else {
      pl.charge = 0;
    }

    // EX card super (E when full)
    var k = state.keys || {};
    var eDown = !!(k.KeyE);
    if (eDown && !pl.wasE && (pl.card || 0) >= 1 && (pl.dashT || 0) <= 0) {
      pl.card = 0;
      var ex;
      for (ex = -2; ex <= 2; ex++) {
        g.shots.push({
          x: state.squad.x + 20,
          y: state.squad.y + ex * 10,
          vx: 780,
          vy: ex * 30,
          life: 8,
          dmg: 42,
          kind: "ex",
          color: "#ff7ad9"
        });
      }
      pl.invuln = Math.max(pl.invuln || 0, 0.35);
      state.shake = Math.max(state.shake || 0, 8);
      G.burst(state, state.squad.x + 30, state.squad.y, "#ff7ad9", 16, 80);
      if (G.audio && G.audio.explosion) G.audio.explosion();
    }
    pl.wasE = eDown;
  }

  /** Cuphead-plane craft: free 2D + dash + energy shield. */
  function steerGulletCraft(state, dt) {
    var g = state.arklanGullet;
    var pl = ensureGulletPlane(g);
    pl.dashCd = Math.max(0, (pl.dashCd || 0) - dt);
    pl.shieldCd = Math.max(0, (pl.shieldCd || 0) - dt);
    pl.invuln = Math.max(0, (pl.invuln || 0) - dt);
    pl.shieldT = Math.max(0, (pl.shieldT || 0) - dt);
    pl.flash = Math.max(0, (pl.flash || 0) - dt);
    if (!pl.trails) pl.trails = [];
    for (var ti = pl.trails.length - 1; ti >= 0; ti--) {
      pl.trails[ti].life -= dt;
      if (pl.trails[ti].life <= 0) pl.trails.splice(ti, 1);
    }
    tickParryFx(pl, dt);

    var k = state.keys || {};
    var vx = 0;
    var vy = 0;
    if (k.KeyA || k.ArrowLeft) vx -= 1;
    if (k.KeyD || k.ArrowRight) vx += 1;
    if (k.KeyW || k.ArrowUp) vy -= 1;
    if (k.KeyS || k.ArrowDown) vy += 1;
    var len = Math.sqrt(vx * vx + vy * vy);
    if (len > 0) {
      vx /= len;
      vy /= len;
    }
    var ptr = state.pointer;
    if (ptr && ptr.moveSquad && ptr.x != null && ptr.y != null) {
      var b = gulletField(state);
      var tx = Math.max(b.x0, Math.min(b.x1, ptr.x));
      var ty = Math.max(b.y0, Math.min(b.y1, ptr.y));
      var dx = tx - state.squad.x;
      var dy = ty - state.squad.y;
      var d = Math.hypot(dx, dy);
      if (d > 4) {
        vx = dx / d;
        vy = dy / d;
      } else {
        vx = 0;
        vy = 0;
      }
    }

    // Shift = dash; Space = energy shield parry
    var shiftDown = !!(k.ShiftLeft || k.ShiftRight);
    var spaceDown = !!k.Space;
    if (shiftDown && !pl.wasShift && pl.dashCd <= 0 && pl.dashT <= 0) {
      var ddx = vx;
      var ddy = vy;
      if (Math.abs(ddx) + Math.abs(ddy) < 0.1) {
        ddx = 1;
        ddy = 0;
      }
      pl.dashDx = ddx;
      pl.dashDy = ddy;
      pl.dashT = 0.22;
      pl.dashCd = 0.85;
      pl.invuln = Math.max(pl.invuln, 0.28);
      G.burst(state, state.squad.x, state.squad.y, "#7af0ff", 8, 50);
      if (G.audio && G.audio.ui) G.audio.ui();
    }
    if (spaceDown && !pl.wasSpace && pl.shieldCd <= 0) {
      pl.shieldT = 0.38;
      pl.shieldCd = 1.15;
      pl.flash = 0.2;
      if (G.audio && G.audio.ui) G.audio.ui();
    }
    pl.wasShift = shiftDown;
    pl.wasSpace = spaceDown;

    var sp = 300;
    if ((pl.dashT || 0) > 0) {
      pl.dashT -= dt;
      sp = 920;
      vx = pl.dashDx;
      vy = pl.dashDy;
      if (Math.random() < 0.7) {
        pl.trails.push({
          x: state.squad.x,
          y: state.squad.y,
          life: 0.22,
          max: 0.22
        });
      }
    }
    state.squad.x += vx * sp * dt;
    state.squad.y += vy * sp * dt;
    clampGulletCraft(state);
  }


  function gulletBossRadius(state, kind) {
    // Giant organs — fill most of the screen; heart a touch smaller than the valve
    var m = Math.min(state.W, state.H);
    var k = kind === "heart" ? 0.5 : 0.54;
    return Math.max(200, Math.min(m * k, state.H * 0.58));
  }

  function makeGulletValve(state, opts) {
    opts = opts || {};
    var R = gulletBossRadius(state, "valve");
    return {
      name: "Válvula",
      title: "Barreira de carne e aço",
      x: state.W * 0.88,
      y: state.H * 0.5,
      hp: 420,
      maxHp: 420,
      r: opts.r != null ? opts.r : R,
      rTarget: R,
      open: opts.open != null ? opts.open : 0.12,
      ang: 0,
      phase: opts.phase || "intro",
      t: 0,
      guard: opts.guard != null ? opts.guard : 2.2,
      petals: 7,
      pulse: 0,
      weakPetal: -1,
      weakT: 0,
      suck: 0,
      enraged: false
    };
  }

  function makeGulletHeart(state, opts) {
    opts = opts || {};
    var R = gulletBossRadius(state, "heart");
    return {
      name: "Coração",
      title: "Núcleo no fundo da goela",
      x: state.W * 0.74,
      y: opts.y != null ? opts.y : state.H * 0.55,
      hp: 380,
      maxHp: 380,
      r: opts.r != null ? opts.r : R,
      rTarget: R,
      phase: opts.phase || "intro",
      t: 0,
      guard: opts.guard != null ? opts.guard : 2.4,
      beat: 0,
      tilt: 0.18,
      enraged: false,
      rise: opts.rise != null ? opts.rise : 0,
      ostia: [
        { a: -0.6, lit: 0, hurt: 0 },
        { a: 0.15, lit: 0, hurt: 0 },
        { a: 0.85, lit: 0, hurt: 0 },
        { a: 2.2, lit: 0, hurt: 0 }
      ],
      tendrils: [],
      mites: [],
      waves: [],
      lasers: [],
      pulseFlash: 0
    };
  }

  function beginValveCin(state, g) {
    g.phase = "valve_cin";
    g.t = 0;
    g.speed = 0;
    g.foes = [];
    g.obstacles = [];
    g.shots = (g.shots || []).filter(function (s) { return !s.enemy; });
    g.hazards = [];
    g.heart = null;
    var R = gulletBossRadius(state, "valve");
    g.valve = makeGulletValve(state, { r: R * 0.12, open: 0.05, phase: "cin", guard: 99 });
    g.bossCin = {
      kind: "valve",
      beat: "squeeze",
      beatT: 0,
      fade: 0,
      titleA: 0,
      drip: 0,
      wall: 0
    };
    state.banner = { text: "", t: 0 };
    state.camLook = { x: state.W * 0.78, y: state.H * 0.5 };
    state.shake = Math.max(state.shake || 0, 6);
    if (G.audio && G.audio.thud) G.audio.thud();
  }

  function beginHeartCin(state, g) {
    var old = g.valve;
    g.phase = "heart_cin";
    g.t = 0;
    g.hazards = [];
    g.shots = [];
    g.valveGhost = old
      ? { x: old.x, y: old.y, r: old.r, open: Math.max(0.2, old.open || 0.2), ang: old.ang || 0, t: 0 }
      : { x: state.W * 0.88, y: state.H * 0.5, r: gulletBossRadius(state, "valve"), open: 0.4, ang: 0, t: 0 };
    g.valve = null;
    var R = gulletBossRadius(state, "heart");
    g.heart = makeGulletHeart(state, {
      r: R * 0.08,
      y: state.H * 0.78,
      rise: 0,
      phase: "cin",
      guard: 99
    });
    g.bossCin = {
      kind: "heart",
      beat: "tear",
      beatT: 0,
      fade: 0,
      titleA: 0,
      rush: 0,
      flash: 0.7
    };
    state.banner = { text: "", t: 0 };
    state.camLook = { x: state.W * 0.7, y: state.H * 0.5 };
    state.shake = Math.max(state.shake || 0, 14);
    if (G.audio && G.audio.explosion) G.audio.explosion();
  }

  function beginHeartPhase(state, g) {
    g.phase = "heart";
    g.t = 0;
    g.valve = null;
    g.valveGhost = null;
    g.bossCin = null;
    g.hazards = [];
    g.heart = makeGulletHeart(state, { phase: "idle", guard: 0.4, rise: 1, y: state.H * 0.5 });
    g.foes = [];
    g.obstacles = [];
    g.shots = [];
    state.camLook = null;
    state.banner = { text: "", t: 0 };
    state.shake = Math.max(state.shake || 0, 8);
    if (G.audio && G.audio.thud) G.audio.thud();
  }

  function tickBossCin(state, g, dt) {
    var c = g.bossCin;
    if (!c) return;
    c.beatT = (c.beatT || 0) + dt;
    c.fade = Math.max(0, (c.fade || 0) - dt * 0.45);
    c.flash = Math.max(0, (c.flash || 0) - dt * 0.55);
    // Keep craft parked left during reveals
    state.squad.x += (state.W * 0.22 - state.squad.x) * Math.min(1, 2.4 * dt);
    state.squad.y += (state.H * 0.5 - state.squad.y) * Math.min(1, 1.6 * dt);
    clampGulletCraft(state);

    if (c.kind === "valve") {
      var v = g.valve;
      if (!v) return;
      if (c.beat === "squeeze") {
        c.wall = Math.min(1, c.beatT / 1.1);
        c.drip = Math.min(1, c.beatT / 0.8);
        state.shake = Math.max(state.shake || 0, 4 + c.wall * 6);
        state.camLook = { x: state.W * (0.55 + c.wall * 0.28), y: state.H * 0.5 };
        g.scroll = (g.scroll || 0) + 40 * dt;
        if (c.beatT > 1.15) {
          c.beat = "rise";
          c.beatT = 0;
          if (G.audio && G.audio.thud) G.audio.thud();
        }
      } else if (c.beat === "rise") {
        var rk = Math.min(1, c.beatT / 2.0);
        var ease = 1 - Math.pow(1 - rk, 2.4);
        v.r = v.rTarget * (0.12 + ease * 0.88);
        v.open = 0.05 + ease * 0.18;
        v.ang += dt * (0.4 + ease * 1.2);
        c.wall = 1;
        state.shake = Math.max(state.shake || 0, 5 + ease * 8);
        state.camLook = { x: v.x - 30, y: v.y };
        if (rk > 0.45 && (c.pulseN || 0) < 1) {
          c.pulseN = 1;
          G.burst(state, v.x - v.r * 0.4, v.y, "#8a2020", 18, 90);
          if (G.audio && G.audio.hit) G.audio.hit();
        }
        if (rk > 0.85 && (c.pulseN || 0) < 2) {
          c.pulseN = 2;
          G.burst(state, v.x - v.r * 0.2, v.y, "#c8d4e0", 14, 70);
          if (G.audio && G.audio.explosion) G.audio.explosion();
        }
        if (c.beatT > 2.15) {
          c.beat = "title";
          c.beatT = 0;
          v.r = v.rTarget;
          state.banner = { text: "A goela se fecha", t: 2.4 };
        }
      } else if (c.beat === "title") {
        c.titleA = Math.min(1, c.beatT / 0.35);
        v.open = 0.22 + Math.sin(c.beatT * 3) * 0.06;
        v.ang += dt * 0.55;
        state.camLook = { x: v.x - 40, y: v.y };
        if (c.beatT > 2.0) {
          g.phase = "valve";
          g.t = 0;
          g.bossCin = null;
          v.phase = "idle";
          v.t = 0;
          v.guard = 0.8;
          v.open = 0.35;
          state.camLook = null;
          state.banner = { text: "", t: 0 };
        }
      }
      return;
    }

    if (c.kind === "heart") {
      var h = g.heart;
      var ghost = g.valveGhost;
      if (ghost) ghost.t = (ghost.t || 0) + dt;
      if (c.beat === "tear") {
        c.flash = Math.max(c.flash || 0, 0.85 - c.beatT * 0.35);
        if (ghost) {
          ghost.open = Math.min(1.15, 0.25 + c.beatT * 0.9);
          ghost.r *= 1 + dt * 0.15;
        }
        state.shake = Math.max(state.shake || 0, 12);
        state.camLook = { x: state.W * 0.8, y: state.H * 0.5 };
        if (c.beatT > 1.0) {
          c.beat = "rush";
          c.beatT = 0;
          g.valveGhost = null;
          c.fade = 1;
          if (G.audio && G.audio.thud) G.audio.thud();
        }
      } else if (c.beat === "rush") {
        c.rush = Math.min(1, c.beatT / 1.35);
        c.fade = Math.max(0.15, 1 - c.beatT * 0.55);
        g.scroll = (g.scroll || 0) + (220 + c.rush * 380) * dt;
        state.shake = Math.max(state.shake || 0, 7 + c.rush * 6);
        state.camLook = { x: state.W * 0.65, y: state.H * 0.5 };
        if (c.beatT > 1.4) {
          c.beat = "rise";
          c.beatT = 0;
          c.fade = 0.35;
          if (G.audio && G.audio.wave) G.audio.wave();
          else if (G.audio && G.audio.thud) G.audio.thud();
        }
      } else if (c.beat === "rise") {
        if (!h) return;
        var hk = Math.min(1, c.beatT / 2.2);
        var he = 1 - Math.pow(1 - hk, 2.6);
        h.r = h.rTarget * (0.08 + he * 0.92);
        h.rise = he;
        h.y = state.H * 0.78 - he * state.H * 0.28;
        h.tilt = 0.2 + Math.sin(c.beatT * 4) * 0.12;
        h.pulseFlash = 0.15 + he * 0.35;
        c.fade = Math.max(0, 0.35 - hk * 0.35);
        state.shake = Math.max(state.shake || 0, 5 + he * 7);
        state.camLook = { x: h.x, y: h.y };
        if (hk > 0.55 && (c.pulseN || 0) < 1) {
          c.pulseN = 1;
          G.burst(state, h.x, h.y, "#6a8a40", 22, 110);
          if (G.audio && G.audio.hit) G.audio.hit();
        }
        if (c.beatT > 2.35) {
          c.beat = "title";
          c.beatT = 0;
          h.r = h.rTarget;
          h.y = state.H * 0.5;
          h.rise = 1;
          state.banner = { text: "O coração", t: 2.4 };
        }
      } else if (c.beat === "title") {
        if (!h) return;
        c.titleA = Math.min(1, c.beatT / 0.35);
        h.tilt = 0.15 + Math.sin(c.beatT * 2.5) * 0.08;
        h.pulseFlash = 0.2 + Math.sin(c.beatT * 6) * 0.1;
        state.camLook = { x: h.x, y: h.y };
        if (c.beatT > 2.0) {
          beginHeartPhase(state, g);
        }
      }
    }
  }


  function pushGulletHazard(g, hz) {
    if (!g.hazards) g.hazards = [];
    g.hazards.push(hz);
  }

  function pickCrushGapAim(state, hz) {
    var py = Math.max(0.18, Math.min(0.82, state.squad.y / state.H));
    var last = hz.gapAim != null ? hz.gapAim : hz.gapY;
    var bite = hz.bite | 0;
    // Safe gap jumps to a different band each chomp — standing still gets crushed
    var bands = [0.2, 0.32, 0.5, 0.68, 0.8];
    var pick;
    var mode = bite % 4;
    if (mode === 0) {
      // Opposite side of the craft
      pick = py < 0.5 ? 0.72 + Math.random() * 0.08 : 0.2 + Math.random() * 0.08;
    } else if (mode === 1) {
      // Extreme top or bottom (away from player)
      pick = py > 0.45 ? 0.2 + Math.random() * 0.06 : 0.78 + Math.random() * 0.06;
    } else if (mode === 2) {
      // Mid band, but not on the player
      pick = 0.5 + (py > 0.5 ? -0.12 : 0.12) + (Math.random() - 0.5) * 0.08;
    } else {
      // Farthest band from both player and last gap
      var bi;
      var best = bands[0];
      var bestScore = -1;
      for (bi = 0; bi < bands.length; bi++) {
        var b = bands[bi];
        var score = Math.abs(b - py) * 1.6 + Math.abs(b - last) + Math.random() * 0.15;
        if (score > bestScore) {
          bestScore = score;
          best = b;
        }
      }
      pick = best;
    }
    // Never land within ~0.1 of the craft — standing still must be unsafe
    if (Math.abs(pick - py) < 0.12) {
      pick = py < 0.5 ? Math.min(0.82, py + 0.28 + Math.random() * 0.12) : Math.max(0.18, py - 0.28 - Math.random() * 0.12);
    }
    return Math.max(0.18, Math.min(0.82, pick));
  }

  function tickGulletHazards(state, g, dt) {
    if (!g.hazards) return;
    var i;
    for (i = g.hazards.length - 1; i >= 0; i--) {
      var hz = g.hazards[i];
      hz.t = (hz.t || 0) + dt;
      hz.life -= dt;
      if (hz.kind === "crush") {
        // Multi-chomp jaws: long telegraph → slam → hold → release → repeat
        hz.biteT = (hz.biteT || 0) + dt;
        var bites = hz.bites || 3;
        var bite = hz.bite | 0;
        var tell = hz.tell || 1.05;
        var slam = hz.slam || 0.22;
        var hold = hz.hold || 0.5;
        var openT = hz.openT || 0.55;
        var cycle = tell + slam + hold + openT;
        var ct = hz.biteT;
        if (hz.gapAim == null) hz.gapAim = pickCrushGapAim(state, hz);
        // Slow drift to the committed gap so the safe lane is readable
        if (!hz.active || ct < tell) {
          hz.gapY += (hz.gapAim - hz.gapY) * Math.min(1, 1.65 * dt);
        } else {
          hz.gapY = hz.gapAim;
        }
        hz.squeeze = 0;
        hz.active = false;
        hz.telling = false;
        if (bite < bites) {
          if (ct < tell) {
            // Stay mostly open early, then slowly show the bite lane
            var tk = ct / tell;
            hz.squeeze = 0.08 + tk * 0.42;
            hz.telling = true;
            // Soft warning pulse in the last third
            if (tk > 0.55) {
              state.shake = Math.max(state.shake || 0, 2 + (tk - 0.55) * 6);
            }
          } else if (ct < tell + slam) {
            hz.squeeze = 0.5 + ((ct - tell) / slam) * 0.5;
            hz.active = true;
            if (!hz.slammed) {
              hz.slammed = true;
              hz.gapY = hz.gapAim;
              state.shake = Math.max(state.shake || 0, 11);
              if (G.audio && G.audio.thud) G.audio.thud();
            }
          } else if (ct < tell + slam + hold) {
            hz.squeeze = 1;
            hz.active = true;
          } else if (ct < cycle) {
            hz.squeeze = 1 - ((ct - tell - slam - hold) / openT);
            hz.slammed = false;
          } else {
            hz.bite = bite + 1;
            hz.biteT = 0;
            hz.slammed = false;
            // Mild tighten — still room to dodge
            hz.gapH = Math.max(0.16, (hz.gapH || 0.22) * 0.94);
            hz.gapAim = pickCrushGapAim(state, hz);
          }
        } else {
          hz.life = Math.min(hz.life, 0.05);
        }
        var gap = hz.gapY;
        var half = hz.gapH * (1.2 - (hz.squeeze || 0) * 0.28);
        // Visual half uses squeeze; damage uses tight gap when active
        hz.visHalf = half;
        var top = gap - (hz.active ? half * 0.9 : half);
        var bot = gap + (hz.active ? half * 0.9 : half);
        var ny = state.squad.y / state.H;
        if (hz.active && (ny < top || ny > bot)) {
          gulletHurtCraft(state, 10, state.squad.x, state.squad.y);
          state.squad.y += (ny < top ? 1 : -1) * 220 * dt;
        }
      } else if (hz.kind === "saw") {
        hz.y += hz.vy * dt;
        if (hz.y < 70 || hz.y > state.H - 70) hz.vy *= -1;
        hz.spin = (hz.spin || 0) + dt * 16;
        // Drift toward player slightly
        hz.x += ((state.squad.x + 40) - hz.x) * Math.min(1, 0.55 * dt);
        if (Math.abs(hz.x - state.squad.x) < 24 && Math.abs(hz.y - state.squad.y) < 30) {
          gulletHurtCraft(state, 12, hz.x, hz.y);
        }
      } else if (hz.kind === "shock") {
        hz.r += hz.vr * dt;
        var d = Math.hypot(state.squad.x - hz.x, state.squad.y - hz.y);
        var band = hz.band || 20;
        if (!hz.hit && Math.abs(d - hz.r) < band) {
          hz.hit = true;
          gulletHurtCraft(state, hz.dmg || 10, state.squad.x, state.squad.y);
        }
      }
      if (hz.life <= 0) g.hazards.splice(i, 1);
    }
  }

  function drawGulletHazards(ctx, g, time, W, H) {
    var list = g.hazards || [];
    var i;
    for (i = 0; i < list.length; i++) {
      var hz = list[i];
      if (hz.kind === "crush") {
        var gap = hz.gapY * H;
        var half = (hz.visHalf != null ? hz.visHalf : hz.gapH) * H;
        var squeeze = Math.max(0.15, Math.min(1, hz.squeeze != null ? hz.squeeze : 0.3));
        var topH = Math.max(36, (gap - half) * squeeze + (1 - squeeze) * 20);
        var botY = gap + half;
        var botH = Math.max(36, (H - botY) * squeeze + (1 - squeeze) * 20);
        // Top wall fake3D
        var tg = ctx.createLinearGradient(0, 0, 0, topH);
        tg.addColorStop(0, "#1a0606");
        tg.addColorStop(0.7, "#5a2018");
        tg.addColorStop(1, "#8a4030");
        ctx.fillStyle = tg;
        ctx.fillRect(0, 0, W, topH);
        ctx.fillStyle = "rgba(255, 160, 140, 0.12)";
        ctx.fillRect(0, topH - 8, W, 8);
        // Teeth along edge
        var tx;
        for (tx = 0; tx < W; tx += 28) {
          ctx.fillStyle = "#e8dcc8";
          ctx.beginPath();
          ctx.moveTo(tx, topH);
          ctx.lineTo(tx + 10, topH + (10 + 18 * squeeze));
          ctx.lineTo(tx + 20, topH);
          ctx.fill();
        }
        var bg = ctx.createLinearGradient(0, H - botH, 0, H);
        bg.addColorStop(0, "#8a4030");
        bg.addColorStop(0.3, "#5a2018");
        bg.addColorStop(1, "#1a0606");
        ctx.fillStyle = bg;
        ctx.fillRect(0, H - botH, W, botH);
        for (tx = 12; tx < W; tx += 28) {
          ctx.fillStyle = "#e8dcc8";
          ctx.beginPath();
          ctx.moveTo(tx, H - botH);
          ctx.lineTo(tx + 10, H - botH - (10 + 18 * squeeze));
          ctx.lineTo(tx + 20, H - botH);
          ctx.fill();
        }
        if ((hz.squeeze || 0) < 0.85 || hz.telling) {
          var aimY = (hz.gapAim != null ? hz.gapAim : hz.gapY) * H;
          var aimHalf = (hz.gapH || 0.22) * H * 1.15;
          var warn = hz.telling ? 0.55 + Math.sin(time * 10) * 0.35 : 0.35;
          // Final bite lane preview (where you MUST be)
          ctx.fillStyle = "rgba(255, 210, 74, " + (0.08 + warn * 0.1) + ")";
          ctx.fillRect(0, aimY - aimHalf, W, aimHalf * 2);
          ctx.strokeStyle = "rgba(255, 210, 74, " + (0.45 + warn * 0.4) + ")";
          ctx.setLineDash([10, 8]);
          ctx.lineWidth = 3;
          ctx.strokeRect(10, aimY - aimHalf, W - 20, aimHalf * 2);
          ctx.setLineDash([]);
          // Danger slabs telegraph
          ctx.fillStyle = "rgba(255, 60, 40, " + (0.1 + warn * 0.12) + ")";
          ctx.fillRect(0, 0, W, Math.max(0, aimY - aimHalf));
          ctx.fillRect(0, aimY + aimHalf, W, Math.max(0, H - (aimY + aimHalf)));
          // Current moving gap outline
          ctx.strokeStyle = "rgba(255, 140, 100, " + (0.35 + Math.sin(time * 14) * 0.2) + ")";
          ctx.setLineDash([6, 5]);
          ctx.lineWidth = 2;
          ctx.strokeRect(16, gap - half, W - 32, half * 2);
          ctx.setLineDash([]);
          // Edge arrows pointing to the safe lane
          if (hz.telling) {
            ctx.fillStyle = "rgba(255, 220, 120, " + (0.5 + Math.sin(time * 12) * 0.3) + ")";
            ctx.beginPath();
            ctx.moveTo(W * 0.12, aimY - 16);
            ctx.lineTo(W * 0.12 + 14, aimY);
            ctx.lineTo(W * 0.12, aimY + 16);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(W * 0.88, aimY - 16);
            ctx.lineTo(W * 0.88 - 14, aimY);
            ctx.lineTo(W * 0.88, aimY + 16);
            ctx.closePath();
            ctx.fill();
          }
        }
      } else if (hz.kind === "saw") {
        ctx.save();
        ctx.translate(hz.x, hz.y);
        ctx.rotate(hz.spin || 0);
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.ellipse(4, 10, 26, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        var sg = ctx.createRadialGradient(-4, -4, 2, 0, 0, 28);
        sg.addColorStop(0, "#c8d4e0");
        sg.addColorStop(0.5, "#6a7888");
        sg.addColorStop(1, "#2a3038");
        ctx.fillStyle = sg;
        ctx.beginPath();
        var tooth;
        for (tooth = 0; tooth < 12; tooth++) {
          var a0 = (tooth / 12) * Math.PI * 2;
          var a1 = a0 + Math.PI / 12;
          ctx.lineTo(Math.cos(a0) * 18, Math.sin(a0) * 18);
          ctx.lineTo(Math.cos(a1) * 28, Math.sin(a1) * 28);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#1a2228";
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (hz.kind === "shock") {
        var sk = Math.max(0, hz.life / (hz.max || 1));
        ctx.strokeStyle = "rgba(255, 140, 80, " + (0.55 * sk) + ")";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(hz.x, hz.y, hz.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 220, 160, " + (0.3 * sk) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hz.x, hz.y, hz.r * 0.85, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function tickValveBoss(state, g, dt) {
    var v = g.valve;
    if (!v) {
      beginHeartPhase(state, g);
      return;
    }
    v.t += dt;
    v.ang += dt * (0.5 + (1 - v.open) * 1.1 + (v.enraged ? 0.4 : 0));
    v.guard = Math.max(0, (v.guard || 0) - dt);
    v.pulse = Math.sin(state.time * 5) * 0.5 + 0.5;
    v.suck = Math.max(0, (v.suck || 0) - dt);
    if (v.weakT > 0) v.weakT -= dt;
    else v.weakPetal = -1;

    state.squad.x = Math.min(state.squad.x, state.W * 0.48);
    // Vacuum pull
    if ((v.suck || 0) > 0) {
      var pull = 260 + (v.enraged ? 120 : 0);
      state.squad.x += pull * dt;
      state.squad.y += (v.y - state.squad.y) * Math.min(1, 3.2 * dt);
      state.shake = Math.max(state.shake || 0, 5);
    }
    clampGulletCraft(state);
    tickGulletHazards(state, g, dt);

    // Shots
    var s;
    for (s = g.shots.length - 1; s >= 0; s--) {
      var sh = g.shots[s];
      sh.x += (sh.vx || 0) * dt;
      sh.y += (sh.vy || 0) * dt;
      sh.life -= dt;
      if (sh.life <= 0 || sh.x < -80 || sh.x > state.W + 120 || sh.y < -80 || sh.y > state.H + 80) {
        g.shots.splice(s, 1);
        continue;
      }
      if (sh.enemy) {
        if (Math.hypot(sh.x - state.squad.x, sh.y - state.squad.y) < (sh.parry ? 22 : 16)) {
          if (tryParryShot(state, sh)) g.shots.splice(s, 1);
          else {
            gulletHurtCraft(state, sh.dmg || 8, sh.x, sh.y);
            g.shots.splice(s, 1);
          }
        }
        continue;
      }
      var hole = Math.max(36, 24 + v.open * (v.r * 0.55));
      var hitCore = v.guard <= 0 && Math.hypot(sh.x - v.x, sh.y - v.y) < hole + 6 + (sh.r || 0);
      // Bonus: hit glowing weak petal
      var weakBonus = 0;
      if ((v.weakPetal | 0) >= 0 && v.open > 0.35) {
        var petals = v.petals || 7;
        var wa = v.ang + (v.weakPetal / petals) * Math.PI * 2;
        var wx = v.x + Math.cos(wa) * (v.r * 0.7);
        var wy = v.y + Math.sin(wa) * (v.r * 0.7);
        if (Math.hypot(sh.x - wx, sh.y - wy) < Math.max(28, v.r * 0.09) + (sh.r || 0)) {
          hitCore = true;
          weakBonus = 1.65;
          G.burst(state, wx, wy, "#ff7ad9", 12, 60);
        }
      }
      if (hitCore) {
        var dmg = sh.dmg * (weakBonus || 1) * (v.enraged ? 1.05 : 1);
        v.hp -= dmg;
        ensureGulletPlane(g).card = Math.min(1, (ensureGulletPlane(g).card || 0) + 0.014);
        G.burst(state, sh.x, sh.y, weakBonus ? "#ff7ad9" : "#c4a060", 8, 48);
        g.shots.splice(s, 1);
      } else if (Math.hypot(sh.x - v.x, sh.y - v.y) < v.r + 12 && v.open < 0.5) {
        sh.vx = -Math.abs(sh.vx || 200) * 0.45;
        sh.vy += (Math.random() - 0.5) * 140;
        sh.life = Math.min(sh.life, 0.35);
      }
    }

    // Only the closed ring bites — hole is hollow on a giant sphincter
    var bodyDist = Math.hypot(state.squad.x - v.x, state.squad.y - v.y);
    var holeR = Math.max(28, 18 + v.open * (v.r * 0.55));
    if (v.open < 0.34 && bodyDist < v.r * 0.98 && bodyDist > holeR * 0.55) {
      gulletHurtCraft(state, 10, v.x, v.y);
      state.squad.x -= 200 * dt;
    }

    // Enrage at half
    if (!v.enraged && v.hp < v.maxHp * 0.5) {
      v.enraged = true;
      v.phase = "enrage";
      v.t = 0;
      v.guard = 1.5;
      state.shake = Math.max(state.shake || 0, 12);
      if (G.audio && G.audio.explosion) G.audio.explosion();
    }

    function pickAttack() {
      var pool = v.enraged
        ? ["crush", "crush", "suck", "saw", "bile", "bile", "weak", "clamp", "spin"]
        : ["crush", "crush", "suck", "spit", "spin", "weak", "clamp", "saw", "bile"];
      return pool[(Math.random() * pool.length) | 0];
    }

    if (v.phase === "intro") {
      v.open = Math.min(0.55, v.t * 0.45);
      state.camLook = { x: v.x - 40, y: v.y };
      if (v.t > 1.15) {
        v.phase = "idle";
        v.t = 0;
        state.camLook = null;
      }
    } else if (v.phase === "enrage") {
      v.open = 0.12 + Math.sin(v.t * 16) * 0.1;
      state.shake = Math.max(state.shake || 0, 7);
      if (v.t % 0.2 < dt) {
        g.shots.push({
          x: v.x - v.r * 0.35,
          y: v.y + (Math.random() - 0.5) * v.r * 0.55,
          vx: -260,
          vy: (Math.random() - 0.5) * 120,
          life: 1.4,
          dmg: 8,
          enemy: true,
          parry: Math.random() < 0.35,
          color: Math.random() < 0.35 ? "#ff7ad9" : "#ff8a40"
        });
      }
      if (v.t > 1.1) {
        v.phase = "idle";
        v.t = 0;
        v.guard = 0;
      }
    } else if (v.phase === "idle") {
      v.open = 0.42 + Math.sin(v.t * 3.2) * 0.12;
      if (v.t > (v.enraged ? 0.22 : 0.38)) {
        v.phase = pickAttack();
        v.t = 0;
        v.guard = v.phase === "clamp" || v.phase === "suck" ? 0.55 : 0.12;
        if (v.phase === "weak") {
          v.weakPetal = (Math.random() * (v.petals || 7)) | 0;
          v.weakT = 1.6;
        }
        if (v.phase === "crush") {
          var crushAim = pickCrushGapAim(state, { bite: 0, gapY: state.squad.y / state.H });
          pushGulletHazard(g, {
            kind: "crush",
            gapY: crushAim,
            gapAim: crushAim,
            gapH: v.enraged ? 0.2 : 0.24,
            life: v.enraged ? 9.5 : 8.5,
            t: 0,
            bite: 0,
            biteT: 0,
            bites: v.enraged ? 3 : 2,
            tell: v.enraged ? 0.9 : 1.15,
            slam: 0.24,
            hold: v.enraged ? 0.45 : 0.55,
            openT: 0.6,
            squeeze: 0.08,
            active: false,
            slammed: false
          });
        }
        if (v.phase === "saw") {
          pushGulletHazard(g, {
            kind: "saw",
            x: state.W * 0.38,
            y: state.H * (0.3 + Math.random() * 0.4),
            vy: v.enraged ? 280 : 210,
            life: 2.6,
            spin: 0
          });
          if (v.enraged) {
            pushGulletHazard(g, {
              kind: "saw",
              x: state.W * 0.5,
              y: state.H * (0.3 + Math.random() * 0.4),
              vy: -260,
              life: 2.6,
              spin: 1
            });
          }
        }
      }
    } else if (v.phase === "suck") {
      if (v.t < 0.55) {
        v.open = 0.82 + Math.sin(v.t * 20) * 0.1;
        v.suck = 0.35;
      } else if (v.t < 0.75) {
        v.open = Math.max(0.05, 0.82 - (v.t - 0.55) * 4);
        v.suck = 0;
        state.shake = Math.max(state.shake || 0, 13);
        if (v.t < 0.58 && G.audio && G.audio.thud) G.audio.thud();
      } else if (v.t < 1.05) {
        v.open = 0.7;
        v.suck = 0.25;
      } else if (v.t < 1.25) {
        v.open = Math.max(0.05, 0.7 - (v.t - 1.05) * 3.5);
        v.suck = 0;
        state.shake = Math.max(state.shake || 0, 11);
      } else {
        v.open = Math.min(0.55, (v.t - 1.25) * 1.4);
      }
      if (v.t > 1.65) {
        v.phase = "idle";
        v.t = 0;
        v.guard = 0;
      }
    } else if (v.phase === "clamp") {
      // Double bite
      if (v.t < 0.22) v.open = Math.max(0.05, 0.6 - v.t * 2.5);
      else if (v.t < 0.45) v.open = 0.05;
      else if (v.t < 0.65) v.open = Math.min(0.7, (v.t - 0.45) * 3);
      else if (v.t < 0.85) v.open = Math.max(0.05, 0.7 - (v.t - 0.65) * 3.2);
      else if (v.t < 1.1) v.open = 0.05;
      else v.open = Math.min(0.55, (v.t - 1.1) * 1.8);
      if ((v.t > 0.2 && v.t < 0.28) || (v.t > 0.82 && v.t < 0.9)) state.shake = Math.max(state.shake || 0, 12);
      if (v.t > 1.35) {
        v.phase = "idle";
        v.t = 0;
        v.guard = 0;
      }
    } else if (v.phase === "spit" || v.phase === "bile") {
      v.open = 0.75 + Math.sin(v.t * 14) * 0.1;
      var rate = v.phase === "bile" ? 0.11 : 0.14;
      if (v.t % rate < dt) {
        var aim = Math.atan2(state.squad.y - v.y, state.squad.x - v.x);
        var fountain = v.phase === "bile";
        var n = fountain ? 4 : 2;
        var bi;
        for (bi = 0; bi < n; bi++) {
          var ang = aim + (bi - (n - 1) * 0.5) * 0.22;
          var pink = fountain || Math.random() < 0.45;
          g.shots.push({
            x: v.x - v.r * (0.28 + Math.random() * 0.08),
            y: v.y + (Math.random() - 0.5) * v.r * 0.35,
            vx: Math.cos(ang) * (pink ? 230 : 280),
            vy: Math.sin(ang) * (pink ? 230 : 280) - (fountain ? 50 : 0),
            life: 2.0,
            dmg: pink ? 7 : 9,
            enemy: true,
            parry: pink,
            color: pink ? "#ff7ad9" : "#8ad422"
          });
        }
      }
      if (v.t > 1.55) {
        v.phase = "idle";
        v.t = 0;
        v.guard = 0;
      }
    } else if (v.phase === "spin") {
      v.open = 0.5;
      if (v.t % 0.22 < dt) {
        var ring;
        for (ring = 0; ring < 8; ring++) {
          var ra = v.ang + (ring / 8) * Math.PI * 2;
          var rrOut = v.r * 0.42;
          g.shots.push({
            x: v.x + Math.cos(ra) * rrOut,
            y: v.y + Math.sin(ra) * rrOut,
            vx: Math.cos(ra) * 210,
            vy: Math.sin(ra) * 210,
            life: 1.7,
            dmg: 8,
            enemy: true,
            parry: ring % 2 === 0,
            color: ring % 2 === 0 ? "#ff7ad9" : "#c4a06a"
          });
        }
      }
      if (v.t > 1.5) {
        v.phase = "idle";
        v.t = 0;
        v.guard = 0;
      }
    } else if (v.phase === "weak") {
      v.open = 0.82;
      v.guard = 0;
      if (v.t % 0.28 < dt) {
        g.shots.push({
          x: v.x - 20,
          y: v.y + (Math.random() - 0.5) * 40,
          vx: -250,
          vy: (state.squad.y - v.y) * 0.45 + (Math.random() - 0.5) * 60,
          life: 1.4,
          dmg: 7,
          enemy: true,
          parry: Math.random() < 0.25,
          color: Math.random() < 0.25 ? "#ff7ad9" : "#ff8a40"
        });
      }
      if (v.t > 1.55) {
        v.phase = "idle";
        v.t = 0;
        v.weakPetal = -1;
      }
    } else if (v.phase === "crush") {
      v.open = 0.3 + Math.sin(v.t * 8) * 0.08;
      // Keep firing while jaws chomp — no dead air
      if (v.t % 0.32 < dt) {
        var pinkC = Math.random() < 0.4;
        g.shots.push({
          x: v.x - v.r * 0.32,
          y: v.y + (Math.random() - 0.5) * v.r * 0.5,
          vx: -220 - Math.random() * 50,
          vy: (Math.random() - 0.5) * 90,
          life: 1.6,
          dmg: 8,
          enemy: true,
          parry: pinkC,
          color: pinkC ? "#ff7ad9" : "#ff8a40"
        });
      }
      var stillCrush = (g.hazards || []).some(function (h) { return h.kind === "crush" && h.life > 0.1; });
      if (!stillCrush && v.t > 0.5) {
        v.phase = "idle";
        v.t = 0;
        v.guard = 0;
      }
      if (v.t > 4.5) {
        v.phase = "idle";
        v.t = 0;
        v.guard = 0;
      }
    } else if (v.phase === "saw") {
      v.open = 0.42 + Math.sin(v.t * 8) * 0.1;
      if (v.t % 0.22 < dt) {
        var pink2 = Math.random() < 0.35;
        g.shots.push({
          x: v.x - v.r * 0.32,
          y: v.y + (Math.random() - 0.5) * v.r * 0.45,
          vx: -250 - Math.random() * 50,
          vy: (Math.random() - 0.5) * 100,
          life: 1.5,
          dmg: 8,
          enemy: true,
          parry: pink2,
          color: pink2 ? "#ff7ad9" : "#a8b8c8"
        });
      }
      if (v.t > 2.2) {
        v.phase = "idle";
        v.t = 0;
        v.guard = 0;
      }
    }

    if (v.hp <= 0) {
      G.burst(state, v.x, v.y, "#8a9aaa", 32, 150);
      G.burst(state, v.x, v.y, "#6a8a40", 20, 120);
      G.burst(state, v.x, v.y, "#ff7ad9", 14, 90);
      state.shake = Math.max(state.shake || 0, 16);
      if (G.audio && G.audio.explosion) G.audio.explosion();
      g.hazards = [];
      g.shots = [];
      beginHeartCin(state, g);
    }
  }

  function tickHeartBoss(state, g, dt) {
    var h = g.heart;
    if (!h) return;
    h.t += dt;
    h.guard = Math.max(0, (h.guard || 0) - dt);
    h.pulseFlash = Math.max(0, (h.pulseFlash || 0) - dt);
    h.suck = Math.max(0, (h.suck || 0) - dt);
    clampGulletCraft(state);
    // Keep craft on the left third — giant heart owns the right
    state.squad.x = Math.min(state.squad.x, state.W * 0.52);
    if ((h.suck || 0) > 0) {
      var pull = 180 + (h.enraged ? 90 : 0);
      state.squad.x += pull * dt;
      state.squad.y += (h.y - state.squad.y) * Math.min(1, 2.4 * dt);
      state.shake = Math.max(state.shake || 0, 4);
    }
    clampGulletCraft(state);
    tickGulletHazards(state, g, dt);

    // Tendrils — orbit then lunge at craft
    var ti;
    for (ti = (h.tendrils || []).length - 1; ti >= 0; ti--) {
      var td = h.tendrils[ti];
      td.t += dt;
      if (td.mode === "lunge") {
        var la = Math.atan2(state.squad.y - h.y, state.squad.x - h.x);
        td.ang += (la - td.ang) * Math.min(1, 3.2 * dt);
        td.len += (td.reach - td.len) * Math.min(1, 4.5 * dt);
      } else if (td.mode === "whip") {
        td.ang += td.spd * dt;
        td.len = td.baseLen + Math.sin(td.t * 9) * td.baseLen * 0.18;
      } else {
        td.ang += td.spd * dt;
      }
      td.x = h.x + Math.cos(td.ang) * td.len;
      td.y = h.y + Math.sin(td.ang) * td.len * 0.78;
      if (Math.hypot(td.x - state.squad.x, td.y - state.squad.y) < 22) {
        gulletHurtCraft(state, 9, td.x, td.y);
      }
      if (td.t > td.life) h.tendrils.splice(ti, 1);
    }
    // Mites — weave then dive
    for (ti = (h.mites || []).length - 1; ti >= 0; ti--) {
      var m = h.mites[ti];
      m.life -= dt;
      if ((m.dive || 0) > 0) {
        m.dive -= dt;
        var mdx = state.squad.x - m.x;
        var mdy = state.squad.y - m.y;
        var md = Math.hypot(mdx, mdy) || 1;
        m.x += (mdx / md) * m.sp * 1.55 * dt;
        m.y += (mdy / md) * m.sp * 1.55 * dt;
      } else {
        m.orbit = (m.orbit || 0) + dt * (m.osp || 2.4);
        var ox = m.ox != null ? m.ox : h.x;
        var oy = m.oy != null ? m.oy : h.y;
        m.x = ox + Math.cos(m.orbit) * (m.rad || 70);
        m.y = oy + Math.sin(m.orbit) * (m.rad || 50) * 0.7;
        if (m.life < 1.4) m.dive = 1.6;
      }
      if (Math.hypot(m.x - state.squad.x, m.y - state.squad.y) < 16) {
        gulletHurtCraft(state, 6, m.x, m.y);
        h.mites.splice(ti, 1);
        continue;
      }
      if (m.life <= 0) h.mites.splice(ti, 1);
    }
    // Lasers — track in telegraph, lock when firing
    for (ti = (h.lasers || []).length - 1; ti >= 0; ti--) {
      var lz = h.lasers[ti];
      lz.t += dt;
      if (lz.t <= lz.tell) {
        if (lz.track) {
          var want = Math.atan2(state.squad.y - lz.y0, state.squad.x - lz.x0);
          var da = want - lz.ang;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          lz.ang += da * Math.min(1, (lz.trackSp || 4) * dt);
        }
      }
      if (lz.t > lz.tell && lz.t < lz.tell + lz.fire) {
        var dist = Math.abs(
          (state.squad.y - lz.y0) * Math.cos(lz.ang) - (state.squad.x - lz.x0) * Math.sin(lz.ang)
        );
        var along = (state.squad.x - lz.x0) * Math.cos(lz.ang) + (state.squad.y - lz.y0) * Math.sin(lz.ang);
        if (along > 0 && along < lz.len && dist < (lz.wide || 16)) {
          gulletHurtCraft(state, 12, state.squad.x, state.squad.y);
        }
      }
      if (lz.t > lz.tell + lz.fire) h.lasers.splice(ti, 1);
    }

    fireGulletWeapons(state, dt);
    var hs;
    for (hs = g.shots.length - 1; hs >= 0; hs--) {
      var shot = g.shots[hs];
      shot.x += (shot.vx || 0) * dt;
      shot.y += (shot.vy || 0) * dt;
      shot.life -= dt;
      if (shot.enemy) {
        if (Math.hypot(shot.x - state.squad.x, shot.y - state.squad.y) < (shot.parry ? 22 : 18)) {
          if (tryParryShot(state, shot)) g.shots.splice(hs, 1);
          else {
            gulletHurtCraft(state, shot.dmg || 10, shot.x, shot.y);
            g.shots.splice(hs, 1);
          }
          continue;
        }
      } else {
        var mi;
        var ate = false;
        for (mi = (h.mites || []).length - 1; mi >= 0; mi--) {
          if (Math.hypot(shot.x - h.mites[mi].x, shot.y - h.mites[mi].y) < 14) {
            G.burst(state, h.mites[mi].x, h.mites[mi].y, "#8ad422", 8, 40);
            ensureGulletPlane(g).card = Math.min(1, (ensureGulletPlane(g).card || 0) + 0.05);
            gulletHealSquad(state, 4);
            h.mites.splice(mi, 1);
            shot.life = 0;
            ate = true;
            break;
          }
        }
        if (ate) {
          g.shots.splice(hs, 1);
          continue;
        }
        var oi;
        var hitOst = false;
        for (oi = 0; oi < (h.ostia || []).length; oi++) {
          var os = h.ostia[oi];
          if ((os.lit || 0) <= 0) continue;
          var ox = h.x + Math.cos(os.a + h.tilt) * (h.r * 0.7);
          var oy = h.y + Math.sin(os.a + h.tilt) * (h.r * 0.55);
          if (Math.hypot(shot.x - ox, shot.y - oy) < Math.max(22, h.r * 0.08) + (shot.r || 0)) {
            h.hp -= shot.dmg * 1.85;
            os.lit = 0;
            os.hurt = 0.4;
            ensureGulletPlane(g).card = Math.min(1, (ensureGulletPlane(g).card || 0) + 0.04);
            G.burst(state, ox, oy, "#a8ff4a", 14, 70);
            G.burst(state, ox, oy, "#ff7ad9", 8, 50);
            hitOst = true;
            g.shots.splice(hs, 1);
            break;
          }
        }
        if (hitOst) continue;
        if (h.guard <= 0 && Math.hypot(shot.x - h.x, shot.y - h.y) < h.r + 8 + (shot.r || 0)) {
          var mul = h.phase === "expose" ? 1.4 : 1;
          h.hp -= shot.dmg * mul;
          ensureGulletPlane(g).card = Math.min(1, (ensureGulletPlane(g).card || 0) + 0.012);
          G.burst(state, shot.x, shot.y, shot.kind === "bomb" || shot.kind === "ex" ? "#7af0ff" : "#c4a060", 8, 50);
          g.shots.splice(hs, 1);
          continue;
        }
      }
      if (shot.life <= 0 || shot.x < -80 || shot.x > state.W + 120 || shot.y < -80 || shot.y > state.H + 80) {
        g.shots.splice(hs, 1);
      }
    }

    if (!h.enraged && h.hp < h.maxHp * 0.5) {
      h.enraged = true;
      h.phase = "rage";
      h.t = 0;
      h.guard = 1.4;
      state.shake = Math.max(state.shake || 0, 16);
      if (G.audio && G.audio.explosion) G.audio.explosion();
    }

    function heartPick() {
      var pool = h.enraged
        ? ["beat", "beat", "suck", "laser", "laser", "slam", "swarm", "tendril", "rain", "spin", "expose", "crush", "veins"]
        : ["beat", "suck", "spin", "tendril", "expose", "swarm", "veins", "laser", "rain", "slam"];
      var next = pool[(Math.random() * pool.length) | 0];
      if (next === h.lastAtk) next = pool[(Math.random() * pool.length) | 0];
      h.lastAtk = next;
      return next;
    }

    function spawnShock(x, y, vr, dmg) {
      pushGulletHazard(g, {
        kind: "shock",
        x: x,
        y: y,
        r: 20,
        vr: vr || 420,
        life: 1.35,
        max: 1.35,
        dmg: dmg || 12,
        hit: false,
        band: 22
      });
    }

    function sprayRing(n, spd, pinkEvery, life) {
      var i;
      for (i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2 + h.t;
        var pink = pinkEvery && i % pinkEvery === 0;
        g.shots.push({
          x: h.x,
          y: h.y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: life || 2.2,
          dmg: pink ? 7 : 9,
          enemy: true,
          parry: pink,
          color: pink ? "#ff7ad9" : "#8ad422"
        });
      }
    }

    if (h.phase === "intro") {
      h.rise = 1;
      h.y = state.H * 0.5;
      h.phase = "idle";
      h.t = 0;
      h.guard = 0;
      state.camLook = null;
    } else if (h.phase === "rage") {
      h.pulseFlash = 0.55;
      h.tilt = Math.sin(h.t * 12) * 0.4;
      h.x = state.W * 0.74 + Math.sin(h.t * 8) * 18;
      if (h.t % 0.18 < dt) sprayRing(6, 210, 2, 1.8);
      if (h.t > 1.15) {
        h.phase = "idle";
        h.t = 0;
        h.guard = 0;
        h.x = state.W * 0.74;
      }
    } else if (h.phase === "idle") {
      h.y = state.H * 0.5 + Math.sin(g.t * 2.1) * 28;
      h.tilt = 0.15 + Math.sin(g.t * 1.4) * 0.12;
      h.x = state.W * 0.74 + Math.sin(g.t * 0.7) * 10;
      // Ambient drip pressure so the arena never goes quiet
      if (h.t % 0.55 < dt && Math.random() < 0.55) {
        g.shots.push({
          x: 40 + Math.random() * (state.W * 0.55),
          y: -10,
          vx: (Math.random() - 0.5) * 40,
          vy: 160 + Math.random() * 80,
          life: 3.2,
          dmg: 6,
          enemy: true,
          parry: Math.random() < 0.3,
          color: Math.random() < 0.3 ? "#ff7ad9" : "#a03028"
        });
      }
      if (h.t > (h.enraged ? 0.14 : 0.26)) {
        h.phase = heartPick();
        h.t = 0;
        if (h.phase === "expose") {
          var oi2;
          for (oi2 = 0; oi2 < h.ostia.length; oi2++) {
            h.ostia[oi2].lit = Math.random() < 0.75 ? 2.2 + Math.random() : 0;
          }
          h.guard = 0;
        }
        if (h.phase === "beat") h.guard = 0.35;
        if (h.phase === "tendril") {
          h.tendrils = [];
          var tn;
          for (tn = 0; tn < (h.enraged ? 6 : 4); tn++) {
            var base = h.r * (0.55 + Math.random() * 0.2);
            h.tendrils.push({
              ang: (tn / 4) * Math.PI * 2 + Math.random() * 0.3,
              len: base,
              baseLen: base,
              reach: Math.max(state.W * 0.55, h.r * 1.35),
              spd: (Math.random() < 0.5 ? -1 : 1) * (2.2 + Math.random()),
              mode: tn % 2 === 0 ? "lunge" : "whip",
              t: 0,
              life: 2.4,
              x: h.x,
              y: h.y
            });
          }
        }
        if (h.phase === "laser") {
          h.lasers = [];
          var ln;
          for (ln = 0; ln < (h.enraged ? 5 : 3); ln++) {
            var lang = Math.atan2(state.squad.y - h.y, state.squad.x - h.x) + (ln - 1) * 0.32;
            h.lasers.push({
              x0: h.x,
              y0: h.y,
              ang: lang,
              len: Math.max(640, state.W * 1.2),
              tell: 0.55,
              fire: 0.42,
              t: 0,
              track: true,
              trackSp: h.enraged ? 5.5 : 4.2,
              wide: 18
            });
          }
          // One horizontal sweep beam
          h.lasers.push({
            x0: state.W + 20,
            y0: state.squad.y,
            ang: Math.PI,
            len: state.W + 80,
            tell: 0.7,
            fire: 0.5,
            t: 0,
            track: true,
            trackSp: 3.2,
            wide: 20
          });
        }
        if (h.phase === "swarm") {
          var sn;
          for (sn = 0; sn < (h.enraged ? 10 : 7); sn++) {
            var sa = Math.random() * Math.PI * 2;
            h.mites.push({
              x: h.x + Math.cos(sa) * h.r * 0.5,
              y: h.y + Math.sin(sa) * h.r * 0.35,
              ox: h.x,
              oy: h.y,
              rad: 55 + Math.random() * 50,
              orbit: sa,
              osp: 2 + Math.random() * 2,
              sp: 160 + Math.random() * 80,
              life: 3.6,
              dive: 0
            });
          }
        }
        if (h.phase === "crush") {
          var crushAim = pickCrushGapAim(state, { bite: 0, gapY: state.squad.y / state.H });
          pushGulletHazard(g, {
            kind: "crush",
            gapY: crushAim,
            gapAim: crushAim,
            gapH: h.enraged ? 0.18 : 0.22,
            life: 8.5,
            t: 0,
            bite: 0,
            biteT: 0,
            bites: h.enraged ? 3 : 2,
            tell: h.enraged ? 0.85 : 1.1,
            slam: 0.24,
            hold: 0.5,
            openT: 0.55,
            squeeze: 0.08,
            active: false,
            slammed: false
          });
        }
      }
    } else if (h.phase === "beat") {
      h.y = state.H * 0.5;
      h.pulseFlash = Math.max(h.pulseFlash, 0.25 + Math.sin(h.t * 20) * 0.15);
      var beatHits = h.enraged
        ? [[0.35, 0.42], [0.65, 0.72], [0.95, 1.02], [1.25, 1.32], [1.55, 1.62]]
        : [[0.38, 0.46], [0.78, 0.86], [1.18, 1.26]];
      var bh;
      for (bh = 0; bh < beatHits.length; bh++) {
        if (h.t > beatHits[bh][0] && h.t < beatHits[bh][1]) {
          spawnShock(h.x, h.y, 480, 12);
          spawnShock(h.x - h.r * 0.45, h.y + (bh % 2 ? 40 : -40), 360, 10);
          sprayRing(h.enraged ? 10 : 8, 200 + bh * 20, 3, 2);
          state.shake = Math.max(state.shake || 0, 11);
          if (G.audio && G.audio.thud) G.audio.thud();
          break;
        }
      }
      if (h.t > (h.enraged ? 1.85 : 1.5)) {
        h.phase = "idle";
        h.t = 0;
      }
    } else if (h.phase === "suck") {
      // Diastole: pull in, then cough a cone of gore
      if (h.t < 0.85) {
        h.suck = 0.4;
        h.pulseFlash = 0.35;
        h.tilt = Math.sin(h.t * 14) * 0.2;
        if (h.t % 0.2 < dt) {
          G.burst(state, h.x - h.r * 0.5, h.y, "#8a2020", 6, 40);
        }
      } else if (h.t < 1.05) {
        h.suck = 0;
        h.pulseFlash = 0.7;
        state.shake = Math.max(state.shake || 0, 14);
        if (h.t < 0.9 && G.audio && G.audio.thud) G.audio.thud();
      } else if (h.t < 1.85) {
        if (h.t % 0.1 < dt) {
          var aim = Math.atan2(state.squad.y - h.y, state.squad.x - h.x);
          var k;
          for (k = -2; k <= 2; k++) {
            var ang = aim + k * 0.16;
            var pink = k === 0 && Math.random() < 0.45;
            g.shots.push({
              x: h.x - h.r * 0.35,
              y: h.y + k * 8,
              vx: Math.cos(ang) * (280 + Math.abs(k) * 20),
              vy: Math.sin(ang) * (280 + Math.abs(k) * 20),
              life: 2.4,
              dmg: pink ? 7 : 10,
              enemy: true,
              parry: pink,
              color: pink ? "#ff7ad9" : "#c03028"
            });
          }
        }
      }
      if (h.t > 2.0) {
        h.phase = "idle";
        h.t = 0;
        h.suck = 0;
      }
    } else if (h.phase === "slam") {
      // Body lunge left then recoil — forces horizontal dodge
      if (h.t < 0.45) {
        h.pulseFlash = 0.4;
        h.x = state.W * 0.74 - (h.t / 0.45) * 18;
        h.guard = 0.8;
      } else if (h.t < 0.75) {
        var sk = (h.t - 0.45) / 0.3;
        h.x = state.W * 0.74 - 18 - sk * state.W * 0.28;
        h.pulseFlash = 0.6;
        state.shake = Math.max(state.shake || 0, 12);
        if (Math.abs(state.squad.x - h.x) < h.r * 0.85 && Math.abs(state.squad.y - h.y) < h.r * 0.7) {
          gulletHurtCraft(state, 14, h.x, h.y);
          state.squad.x -= 240 * dt;
        }
      } else if (h.t < 1.35) {
        var rk = (h.t - 0.75) / 0.6;
        h.x = state.W * 0.46 + rk * (state.W * 0.74 - state.W * 0.46);
        if (h.t % 0.12 < dt) sprayRing(5, 230, 2, 1.6);
      } else {
        h.x = state.W * 0.74;
        h.phase = "idle";
        h.t = 0;
        h.guard = 0;
      }
    } else if (h.phase === "rain") {
      h.y = state.H * 0.42;
      h.tilt = 0.25;
      if (h.t % 0.09 < dt) {
        var rx = 30 + Math.random() * (state.W * 0.62);
        // Bias columns toward craft
        if (Math.random() < 0.45) rx = state.squad.x + (Math.random() - 0.5) * 90;
        var pinkR = Math.random() < 0.35;
        g.shots.push({
          x: rx,
          y: -14,
          vx: (state.squad.x - rx) * 0.15,
          vy: 220 + Math.random() * 120,
          life: 3.5,
          dmg: pinkR ? 7 : 9,
          enemy: true,
          parry: pinkR,
          color: pinkR ? "#ff7ad9" : "#8a2820"
        });
      }
      if (h.enraged && h.t > 0.6 && h.t % 0.55 < dt) {
        spawnShock(state.squad.x + (Math.random() - 0.5) * 80, state.H * 0.35, 300, 10);
      }
      if (h.t > (h.enraged ? 2.1 : 1.7)) {
        h.phase = "idle";
        h.t = 0;
      }
    } else if (h.phase === "spin") {
      h.guard = 0.2;
      h.tilt = h.t * 1.8;
      if (h.t % 0.11 < dt) {
        var ha = h.t * 6.2;
        var arm;
        for (arm = 0; arm < (h.enraged ? 3 : 2); arm++) {
          var aa = ha + arm * (Math.PI * 2 / (h.enraged ? 3 : 2));
          g.shots.push({
            x: h.x + Math.cos(aa) * h.r * 0.35,
            y: h.y + Math.sin(aa) * h.r * 0.28,
            vx: Math.cos(aa) * 260,
            vy: Math.sin(aa) * 260,
            life: 2.3,
            dmg: 8,
            enemy: true,
            parry: arm === 0,
            color: arm === 0 ? "#ff7ad9" : "#a8ff4a"
          });
        }
      }
      if (h.t > 1.55) {
        h.phase = "idle";
        h.t = 0;
      }
    } else if (h.phase === "veins") {
      h.pulseFlash = 0.2;
      if (h.t % 0.16 < dt) {
        var aimV = Math.atan2(state.squad.y - h.y, state.squad.x - h.x);
        var v;
        for (v = -1; v <= 1; v++) {
          g.shots.push({
            x: h.x - h.r * 0.2,
            y: h.y,
            vx: Math.cos(aimV + v * 0.2) * 320,
            vy: Math.sin(aimV + v * 0.2) * 320,
            life: 2.2,
            dmg: 9,
            enemy: true,
            parry: v === 0 && Math.random() < 0.4,
            color: v === 0 ? "#7af0ff" : "#4a8a30"
          });
        }
      }
      if (h.t > 1.5) {
        h.phase = "idle";
        h.t = 0;
      }
    } else if (h.phase === "tendril") {
      h.y = state.H * 0.5 + Math.sin(h.t * 3) * 18;
      // Mid-attack: convert whip arms into lunges
      if (h.t > 0.7 && h.t < 0.75) {
        for (ti = 0; ti < (h.tendrils || []).length; ti++) {
          if (h.tendrils[ti].mode === "whip") h.tendrils[ti].mode = "lunge";
        }
      }
      if (h.t % 0.35 < dt) {
        g.shots.push({
          x: h.x - h.r * 0.3,
          y: h.y + (Math.random() - 0.5) * h.r * 0.4,
          vx: -200 - Math.random() * 80,
          vy: (state.squad.y - h.y) * 0.35,
          life: 2,
          dmg: 7,
          enemy: true,
          parry: Math.random() < 0.4,
          color: Math.random() < 0.4 ? "#ff7ad9" : "#6a3028"
        });
      }
      if (h.t > 2.2) {
        h.phase = "idle";
        h.t = 0;
        h.tendrils = [];
      }
    } else if (h.phase === "laser") {
      h.guard = 0.7;
      h.pulseFlash = 0.15;
      if (h.t > 1.45) {
        h.phase = "idle";
        h.t = 0;
        h.guard = 0;
        h.lasers = [];
      }
    } else if (h.phase === "swarm") {
      if (h.t > 0.5 && h.t % 0.4 < dt && (h.mites || []).length < 14) {
        var sa2 = Math.random() * Math.PI * 2;
        h.mites.push({
          x: h.x,
          y: h.y,
          ox: h.x,
          oy: h.y,
          rad: 40 + Math.random() * 60,
          orbit: sa2,
          osp: 2.5,
          sp: 170,
          life: 2.8,
          dive: 0
        });
      }
      if (h.t > 2.0) {
        h.phase = "idle";
        h.t = 0;
      }
    } else if (h.phase === "crush") {
      h.y = state.H * 0.5;
      h.pulseFlash = 0.2;
      if (h.t % 0.28 < dt) {
        var aimC = Math.atan2(state.squad.y - h.y, state.squad.x - h.x);
        g.shots.push({
          x: h.x - h.r * 0.3,
          y: h.y,
          vx: Math.cos(aimC) * 260,
          vy: Math.sin(aimC) * 260,
          life: 2,
          dmg: 8,
          enemy: true,
          color: "#c4a06a"
        });
      }
      var stillCrush = (g.hazards || []).some(function (hz) { return hz.kind === "crush" && hz.life > 0.1; });
      if (!stillCrush && h.t > 0.6) {
        h.phase = "idle";
        h.t = 0;
      }
      if (h.t > 4.0) {
        h.phase = "idle";
        h.t = 0;
      }
    } else if (h.phase === "expose") {
      h.y = state.H * 0.48 + Math.sin(h.t * 4) * 10;
      h.tilt = Math.sin(h.t * 2.4) * 0.28;
      h.pulseFlash = 0.15;
      var oi3;
      for (oi3 = 0; oi3 < h.ostia.length; oi3++) {
        if (h.ostia[oi3].lit > 0) h.ostia[oi3].lit -= dt;
        if (h.ostia[oi3].hurt > 0) h.ostia[oi3].hurt -= dt;
      }
      // Exposed but still dangerous — rain + soft suck
      if (h.t > 0.35) h.suck = 0.12;
      if (h.t % 0.2 < dt) {
        g.shots.push({
          x: 50 + Math.random() * state.W * 0.5,
          y: -8,
          vx: 0,
          vy: 200 + Math.random() * 60,
          life: 3,
          dmg: 6,
          enemy: true,
          parry: Math.random() < 0.45,
          color: Math.random() < 0.45 ? "#ff7ad9" : "#6a8a40"
        });
      }
      if (h.t > 2.35) {
        h.phase = "idle";
        h.t = 0;
        h.suck = 0;
        for (oi3 = 0; oi3 < h.ostia.length; oi3++) h.ostia[oi3].lit = 0;
      }
    }

    if (h.hp <= 0) {
      beginDeathCin(state, g);
    }
  }

  function beginDeathCin(state, g) {
    g.phase = "death_cin";
    g.t = 0;
    g.hazards = [];
    g.shots = [];
    g.foes = [];
    g.flash = 1;
    g.death = {
      beat: "seize",
      beatT: 0,
      flash: 1,
      fade: 0,
      rush: 0,
      crack: 0,
      iris: 0,
      craftX: state.squad.x,
      craftY: state.squad.y,
      scraps: []
    };
    if (g.heart) {
      g.heart.phase = "dead";
      g.heart.guard = 99;
      g.heart.pulseFlash = 0.9;
    }
    state.banner = { text: "O coração para", t: 2.8 };
    state.camLook = g.heart ? { x: g.heart.x, y: g.heart.y } : null;
    state.shake = Math.max(state.shake || 0, 16);
    if (G.audio && G.audio.explosion) G.audio.explosion();
  }

  function tickDeathCin(state, g, dt) {
    var d = g.death;
    if (!d) {
      startArklanSpit(state, g);
      return;
    }
    d.beatT = (d.beatT || 0) + dt;
    d.flash = Math.max(0, (d.flash || 0) - dt * 0.55);
    d.fade = Math.max(0, Math.min(1, d.fade || 0));
    var h = g.heart;
    var pl = ensureGulletPlane(g);
    pl.invuln = 99;

    function pushScrap(x, y, n) {
      var i;
      for (i = 0; i < (n || 6); i++) {
        var a = Math.random() * Math.PI * 2;
        d.scraps.push({
          x: x,
          y: y,
          vx: Math.cos(a) * (40 + Math.random() * 160),
          vy: Math.sin(a) * (40 + Math.random() * 140) - 40,
          life: 0.5 + Math.random() * 0.7,
          col: Math.random() < 0.4 ? "#c8d4e0" : Math.random() < 0.5 ? "#8a2020" : "#6a8a40"
        });
      }
    }
    var si;
    for (si = d.scraps.length - 1; si >= 0; si--) {
      d.scraps[si].life -= dt;
      d.scraps[si].x += d.scraps[si].vx * dt;
      d.scraps[si].y += d.scraps[si].vy * dt;
      d.scraps[si].vy += 220 * dt;
      if (d.scraps[si].life <= 0) d.scraps.splice(si, 1);
    }

    if (d.beat === "seize") {
      if (h) {
        h.pulseFlash = 0.5 + Math.sin(d.beatT * 18) * 0.4;
        h.tilt = Math.sin(d.beatT * 14) * 0.55;
        h.r = (h.rTarget || h.r) * (1 - d.beatT * 0.08);
        h.x = state.W * 0.74 + Math.sin(d.beatT * 11) * 22;
        h.y = state.H * 0.5 + Math.cos(d.beatT * 9) * 18;
      }
      d.crack = Math.min(1, d.beatT / 1.2);
      state.shake = Math.max(state.shake || 0, 8 + d.crack * 8);
      state.camLook = h ? { x: h.x, y: h.y } : null;
      if (d.beatT % 0.22 < dt) {
        pushScrap(h ? h.x : state.W * 0.7, h ? h.y : state.H * 0.5, 8);
        G.burst(state, h ? h.x : state.W * 0.7, h ? h.y : state.H * 0.5, "#8a2020", 10, 55);
      }
      d.craftX += (state.W * 0.28 - d.craftX) * Math.min(1, 1.5 * dt);
      d.craftY += (state.H * 0.55 - d.craftY) * Math.min(1, 1.5 * dt);
      state.squad.x = d.craftX;
      state.squad.y = d.craftY;
      if (d.beatT > 1.45) {
        d.beat = "convulse";
        d.beatT = 0;
        d.flash = 0.7;
        if (G.audio && G.audio.thud) G.audio.thud();
      }
    } else if (d.beat === "convulse") {
      d.crack = 1;
      if (h) {
        h.pulseFlash = 0.3;
        h.r = Math.max(8, (h.r || 40) * (1 - dt * 0.9));
        h.y += 40 * dt;
        h.tilt = Math.sin(d.beatT * 20) * 0.8;
      }
      g.scroll = (g.scroll || 0) - 180 * dt;
      d.craftX += Math.sin(d.beatT * 22) * 90 * dt;
      d.craftY += Math.cos(d.beatT * 17) * 70 * dt + Math.sin(d.beatT * 5) * 40 * dt;
      d.craftX = Math.max(40, Math.min(state.W - 40, d.craftX));
      d.craftY = Math.max(50, Math.min(state.H - 50, d.craftY));
      state.squad.x = d.craftX;
      state.squad.y = d.craftY;
      state.shake = Math.max(state.shake || 0, 14);
      state.camLook = { x: d.craftX, y: d.craftY };
      if (d.beatT % 0.15 < dt) {
        pushScrap(d.craftX, d.craftY, 5);
        G.burst(state, d.craftX, d.craftY, "#c03028", 6, 35);
      }
      if (d.beatT > 1.55) {
        d.beat = "eject";
        d.beatT = 0;
        d.rush = 0;
        d.flash = 0.9;
        g.heart = null;
        if (G.audio && G.audio.explosion) G.audio.explosion();
      }
    } else if (d.beat === "eject") {
      // Reverse peristalsis — blasted toward the maw (up/back)
      d.rush = Math.min(1, d.beatT / 2.1);
      var rk = d.rush * d.rush;
      g.scroll = (g.scroll || 0) - (320 + rk * 900) * dt;
      d.craftX += (state.W * 0.5 - d.craftX) * Math.min(1, 2.2 * dt);
      d.craftY += (-120 - d.craftY) * Math.min(1, (1.2 + rk * 3) * dt);
      state.squad.x = d.craftX;
      state.squad.y = d.craftY;
      d.fade = Math.max(d.fade, Math.max(0, (d.beatT - 0.9) / 1.2));
      d.iris = Math.min(1, Math.max(0, (d.beatT - 0.4) / 1.4));
      d.flash = Math.max(d.flash, rk * 0.35);
      state.shake = Math.max(state.shake || 0, 10 + rk * 10);
      state.camLook = { x: d.craftX, y: d.craftY };
      if (d.beatT % 0.08 < dt) pushScrap(d.craftX, d.craftY + 30, 4);
      if (d.beatT > 2.35) {
        startArklanSpit(state, g);
      }
    }
  }

  function findGulletBoss(state, bossId) {
    var i;
    for (i = 0; i < (state.enemies || []).length; i++) {
      if (state.enemies[i].id === bossId) return state.enemies[i];
    }
    for (i = 0; i < (state.enemies || []).length; i++) {
      if (state.enemies[i].type === "chefe_arklan") return state.enemies[i];
    }
    return null;
  }

  function startArklanSpit(state, g) {
    var bossId = g && g.bossId;
    var boss = findGulletBoss(state, bossId);
    var c = centerOf(state);
    var bx = boss ? boss.x : c.x;
    var by = boss ? boss.y : c.y;
    // Exit gullet — world spit cinematic takes over
    state.arklanGullet = null;
    state.arklanEyes = [];
    state.camZoomTo = desertZoom(state);
    if (boss) {
      boss.mazeHide = false;
      boss.immortal = true;
      boss.arklanBroken = true;
      boss.hp = Math.max(1, boss.hp || 1);
      boss.mawOpen = 1;
      boss.wormAct = "";
      boss.flash = 0.6;
      boss.devourGlow = 0.8;
    }
    var ui;
    for (ui = 0; ui < state.units.length; ui++) {
      state.units[ui].stowed = true;
    }
    state.arklanSpit = {
      t: 0,
      beat: "gag",
      beatT: 0,
      bossId: bossId,
      bx: bx,
      by: by,
      craftX: bx + Math.cos(boss && boss.rot != null ? boss.rot : -0.4) * 30,
      craftY: by + Math.sin(boss && boss.rot != null ? boss.rot : -0.4) * 30 - 20,
      vx: 0,
      vy: 0,
      rot: 0,
      fade: 0.85,
      sand: 0,
      landed: false
    };
    state.squad.x = bx;
    state.squad.y = by;
    state.camLook = { x: bx, y: by };
    state.banner = { text: "", t: 0 };
    state.shake = Math.max(state.shake || 0, 14);
    if (G.audio && G.audio.thud) G.audio.thud();
  }

  function tickArklanSpit(state, dt) {
    var sp = state.arklanSpit;
    if (!sp) return false;
    sp.t += dt;
    sp.beatT = (sp.beatT || 0) + dt;
    sp.fade = Math.max(0, (sp.fade || 0) - dt * 0.55);
    var boss = findGulletBoss(state, sp.bossId);
    var c = centerOf(state);
    if (boss) {
      sp.bx = boss.x;
      sp.by = boss.y;
      boss.mazeHide = false;
      boss.immortal = true;
      boss.arklanBroken = true;
      boss.hp = Math.max(1, boss.hp);
      boss.vx = 0;
      boss.vy = 0;
    }

    if (sp.beat === "gag") {
      if (boss) {
        boss.mawOpen = 0.55 + Math.sin(sp.beatT * 14) * 0.4;
        boss.devourGlow = 0.6 + Math.sin(sp.beatT * 10) * 0.3;
        boss.flash = Math.max(boss.flash || 0, 0.3);
        boss.rot = (boss.rot || 0) + Math.sin(sp.beatT * 8) * 0.02;
      }
      sp.craftX = sp.bx + Math.sin(sp.beatT * 16) * 12;
      sp.craftY = sp.by - 28 + Math.cos(sp.beatT * 12) * 8;
      state.camLook = { x: sp.bx, y: sp.by - 20 };
      state.camZoomTo = desertZoom(state) + 0.08;
      state.shake = Math.max(state.shake || 0, 8);
      if (sp.beatT % 0.2 < dt) {
        G.burst(state, sp.bx, sp.by - 20, "#8a3020", 8, 40);
        sandBurstSafe(state, sp.bx, sp.by, 4);
      }
      if (sp.beatT > 1.35) {
        sp.beat = "spit";
        sp.beatT = 0;
        var ang = boss && boss.rot != null ? boss.rot : -0.55;
        // Launch toward arena center
        var tx = c.x + (Math.random() - 0.5) * 40;
        var ty = c.y + 60;
        sp.toX = tx;
        sp.toY = ty;
        sp.fromX = sp.craftX;
        sp.fromY = sp.craftY;
        sp.vx = (tx - sp.craftX) * 1.1;
        sp.vy = (ty - sp.craftY) * 1.1 - 420;
        if (boss) boss.mawOpen = 1;
        state.shake = Math.max(state.shake || 0, 18);
        G.burst(state, sp.bx, sp.by - 30, "#ffe08a", 28, 160);
        G.burst(state, sp.bx, sp.by - 30, "#ff4a2a", 22, 140);
        G.burst(state, sp.bx, sp.by - 30, "#c8d4e0", 18, 120);
        sandBurstSafe(state, sp.bx, sp.by, 16);
        if (G.audio && G.audio.explosion) G.audio.explosion();
      }
    } else if (sp.beat === "spit") {
      // Arc flight out of the maw
      var k = Math.min(1, sp.beatT / 1.55);
      var ease = k * k * (3 - 2 * k);
      sp.vy += 520 * dt;
      sp.craftX += sp.vx * dt;
      sp.craftY += sp.vy * dt;
      // Soft pull toward landing so it reads as a spit, not a miss
      sp.craftX += (sp.toX - sp.craftX) * Math.min(1, 1.8 * dt) * ease;
      sp.rot = Math.atan2(sp.vy, sp.vx || 1) * 0.35;
      if (boss) {
        boss.mawOpen = Math.max(0.15, 1 - k * 0.7);
        boss.devourGlow = 0.4 * (1 - k);
      }
      state.squad.x = sp.craftX;
      state.squad.y = sp.craftY;
      state.camLook = { x: sp.craftX, y: sp.craftY };
      state.camZoomTo = desertZoom(state) + 0.06 * (1 - k);
      sp.sand = Math.min(1, k * 1.2);
      if (sp.beatT % 0.06 < dt) {
        G.burst(state, sp.craftX, sp.craftY, "#c4a06a", 3, 22);
        sandBurstSafe(state, sp.craftX, sp.craftY + 8, 2);
      }
      if (k >= 1 || sp.craftY > sp.toY) {
        sp.beat = "land";
        sp.beatT = 0;
        sp.craftX = sp.toX;
        sp.craftY = sp.toY;
        sp.landed = true;
        sp.rot = 0;
        state.squad.x = sp.craftX;
        state.squad.y = sp.craftY;
        state.shake = Math.max(state.shake || 0, 14);
        G.burst(state, sp.craftX, sp.craftY, "#ffe08a", 20, 100);
        G.burst(state, sp.craftX, sp.craftY, "#c4a06a", 16, 80);
        sandBurstSafe(state, sp.craftX, sp.craftY, 18);
        if (G.audio && G.audio.thud) G.audio.thud();
      }
    } else if (sp.beat === "land") {
      sp.craftY = sp.toY + Math.sin(Math.min(1, sp.beatT) * Math.PI) * -6 * (1 - Math.min(1, sp.beatT));
      state.squad.x = sp.craftX;
      state.squad.y = sp.toY;
      state.camLook = { x: (sp.craftX + sp.bx) * 0.5, y: (sp.toY + sp.by) * 0.5 };
      if (boss) {
        boss.mawOpen = Math.max(0, 0.35 - sp.beatT * 0.2);
        boss.flash = Math.max(boss.flash || 0, 0.25);
      }
      if (sp.beatT > 0.85) {
        sp.beat = "die";
        sp.beatT = 0;
        state.banner = { text: "O deserto engole o ferro", t: 3.2 };
        // Unstow squad around landing
        var u;
        for (u = 0; u < state.units.length; u++) {
          state.units[u].stowed = false;
          state.units[u].x = sp.craftX + (Math.random() - 0.5) * 36;
          state.units[u].y = sp.toY + (Math.random() - 0.5) * 36;
        }
        if (G.audio && G.audio.explosion) G.audio.explosion();
      }
    } else if (sp.beat === "die") {
      if (boss) {
        boss.mawOpen = Math.max(0, 0.2 - sp.beatT * 0.15);
        boss.devourGlow = Math.max(0, 0.5 - sp.beatT * 0.35);
        boss.flash = 0.4 + Math.sin(sp.beatT * 10) * 0.3;
        boss.y = sp.by + sp.beatT * 12;
        boss.rot = (boss.rot || 0) + Math.sin(sp.beatT * 6) * 0.04;
        if (sp.beatT % 0.18 < dt) {
          G.burst(state, boss.x, boss.y, "#8a4030", 10, 50);
          G.burst(state, boss.x, boss.y, "#c8d4e0", 6, 35);
          sandBurstSafe(state, boss.x, boss.y, 6);
        }
      }
      state.shake = Math.max(state.shake || 0, 6 + (1 - Math.min(1, sp.beatT / 2)) * 8);
      state.camLook = boss ? { x: boss.x, y: boss.y } : { x: sp.craftX, y: sp.toY };
      if (sp.beatT > 2.2) {
        finishArklanSpit(state);
      }
    }
    return true;
  }

  function finishArklanSpit(state) {
    var sp = state.arklanSpit;
    var boss = findGulletBoss(state, sp && sp.bossId);
    state.arklanSpit = null;
    state.camLook = null;
    state.camZoomTo = desertZoom(state);
    if (sp) {
      state.squad.x = sp.toX || sp.craftX;
      state.squad.y = sp.toY || sp.craftY;
    }
    var u;
    for (u = 0; u < state.units.length; u++) {
      state.units[u].stowed = false;
      if (sp) {
        state.units[u].x = state.squad.x + (Math.random() - 0.5) * 30;
        state.units[u].y = state.squad.y + (Math.random() - 0.5) * 30;
      }
    }
    if (boss) {
      G.burst(state, boss.x, boss.y, "#ffe08a", 36, 200);
      G.burst(state, boss.x, boss.y, "#ff4a2a", 28, 170);
      G.burst(state, boss.x, boss.y, "#c8d4e0", 20, 130);
      sandBurstSafe(state, boss.x, boss.y, 20);
      boss.immortal = false;
      boss.mazeHide = false;
      boss.arklanBroken = false;
      boss.mawOpen = 0;
      boss.devourGlow = 0;
      boss.hp = 0;
      boss.noDrop = false;
      var A = api();
      if (A && A.killEnemy) A.killEnemy(state, boss);
      else boss.hp = 0;
    }
    state.shake = Math.max(state.shake || 0, 16);
    if (!state.banner || state.banner.t <= 0) {
      state.banner = { text: "O deserto engole o ferro", t: 3.0 };
    }
    if (G.audio && G.audio.explosion) G.audio.explosion();
  }


  function tickGullet(state, dt) {
    var g = state.arklanGullet;
    if (!g) return false;
    g.t += dt;
    g.flash = Math.max(0, (g.flash || 0) - dt);

    // —— Boarding cinematic ——
    if (g.phase === "enter" || g.phase === "findShip" || g.phase === "cin") {
      if (!g.cin) {
        g.phase = "cin";
        var floorInit = state.H * 0.72;
        g.cin = {
          beat: "swallow",
          beatT: 0,
          cmdX: state.W * 0.5,
          cmdY: -80,
          cmdVx: 0,
          cmdVy: 0,
          bounce: 0,
          wallHits: 0,
          walkX: 0,
          shipX: state.W * 0.7,
          shipY: floorInit - 20,
          door: 0,
          pilot: 0,
          bang: 0,
          dust: 0,
          shakeN: 0,
          depth: 0,
          softLand: 0,
          squash: 0,
          sparks: [],
          drips: [],
          vessels: [],
          impacts: [],
          seg: 0,
          segT: 0,
          camY: 0,
          fade: 0,
          iris: 0
        };
        for (var vi0 = 0; vi0 < 28; vi0++) {
          g.cin.vessels.push({
            side: vi0 % 2,
            y0: Math.random() * 1400,
            amp: 8 + Math.random() * 18,
            thick: 2 + Math.random() * 3.5,
            phase: Math.random() * Math.PI * 2,
            pulse: 0.6 + Math.random() * 0.8
          });
        }
        g.t = 0;
      }
      g.phase = "cin";
      var c = g.cin;
      c.bang = Math.max(0, (c.bang || 0) - dt);
      c.dust = Math.max(0, (c.dust || 0) - dt);
      c.squash = Math.max(0, (c.squash || 0) - dt * 2.2);
      c.softLand = Math.max(0, (c.softLand || 0) - dt * 0.85);
      if (!c.sparks) c.sparks = [];
      if (!c.drips) c.drips = [];
      if (!c.impacts) c.impacts = [];
      for (var sp = c.sparks.length - 1; sp >= 0; sp--) {
        c.sparks[sp].life -= dt;
        c.sparks[sp].x += (c.sparks[sp].vx || 0) * dt;
        c.sparks[sp].y += (c.sparks[sp].vy || 0) * dt;
        if (c.sparks[sp].life <= 0) c.sparks.splice(sp, 1);
      }
      for (var im = c.impacts.length - 1; im >= 0; im--) {
        c.impacts[im].life -= dt;
        if (c.impacts[im].life <= 0) c.impacts.splice(im, 1);
      }
      var floorY = state.H * 0.72;
      // Keep ship planted on the flesh floor
      c.shipY = floorY - 20;
      var wallL = state.W * 0.24;
      var wallR = state.W * 0.76;

      function sparkBurst(x, y, n) {
        var i;
        for (i = 0; i < (n || 8); i++) {
          var a = Math.random() * Math.PI * 2;
          c.sparks.push({
            x: x,
            y: y,
            vx: Math.cos(a) * (60 + Math.random() * 140),
            vy: Math.sin(a) * (40 + Math.random() * 100) - 40,
            life: 0.25 + Math.random() * 0.35,
            col: Math.random() > 0.5 ? "#ffe08a" : "#ff8a40"
          });
        }
      }

      function bloodBurst(x, y, n) {
        var i;
        for (i = 0; i < (n || 10); i++) {
          c.drips.push({
            x: x + (Math.random() - 0.5) * 18,
            y: y + (Math.random() - 0.5) * 12,
            vy: 40 + Math.random() * 160,
            vx: (Math.random() - 0.5) * 120,
            life: 0.55 + Math.random() * 0.45
          });
        }
      }

      function wallImpact(side, x, y) {
        c.bang = 0.55;
        c.dust = 0.5;
        c.squash = 1;
        c.hitStun = 0.14;
        state.shake = Math.max(state.shake || 0, 12);
        sparkBurst(x, y, 14);
        bloodBurst(x, y, 12);
        c.impacts.push({ side: side, x: x, y: y, life: 0.85, max: 0.85 });
        G.burst(state, x, y, "#8a2020", 8, 50);
        G.burst(state, x, y, "#c4a06a", 5, 35);
        if (G.audio && G.audio.hit) G.audio.hit();
        else if (G.audio && G.audio.thud) G.audio.thud();
      }

      // —— Subtle swallow: fade into the maw, then throat plunge ——
      if (c.beat === "swallow") {
        c.beatT = (c.beatT || 0) + dt;
        c.fade = Math.min(1, c.beatT / 0.85);
        c.iris = Math.max(0, Math.min(1, (c.beatT - 0.55) / 1.1));
        state.shake = Math.max(state.shake || 0, 2 + c.fade * 4);
        if (c.beatT > 1.85) {
          c.beat = "throat";
          c.beatT = 0;
          c.fade = 1;
          c.iris = 1;
          c.seg = 0;
          c.segT = 0;
          c.wallHits = 0;
          c.fromX = state.W * 0.5;
          c.fromY = -70;
          c.toX = wallL + 24;
          c.toY = state.H * 0.36;
          c.cmdX = c.fromX;
          c.cmdY = c.fromY;
          c.cmdVx = (c.toX - c.fromX) / 0.9;
          c.cmdVy = 180;
          c.depth = 0;
          if (G.audio && G.audio.thud) G.audio.thud();
        }
      } else if (c.beat === "throat" || c.beat === "fall") {
        c.beat = "throat";
        c.beatT = (c.beatT || 0) + dt;
        if (c.fromX == null) {
          c.seg = 0;
          c.segT = 0;
          c.fromX = state.W * 0.5;
          c.fromY = -70;
          c.toX = wallL + 24;
          c.toY = state.H * 0.36;
        }
        // Hit-stun: brief freeze so the bounce reads
        if ((c.hitStun || 0) > 0) {
          c.hitStun -= dt;
        } else {
          c.segT = (c.segT || 0) + dt;
          var segDur = c.seg === 0 ? 0.9 : c.seg === 1 ? 1.0 : 1.15;
          var k = Math.min(1, c.segT / segDur);
          var kx = 1 - (1 - k) * (1 - k);
          var ky = k * k;
          // Slight arc on wall-to-wall so it doesn't look like a straight teleport
          var arc = c.seg < 2 ? Math.sin(k * Math.PI) * (-28 - c.seg * 8) : Math.sin(k * Math.PI) * 10;
          var nx = c.fromX + (c.toX - c.fromX) * kx;
          var ny = c.fromY + (c.toY - c.fromY) * ky + arc;
          c.cmdVx = (nx - c.cmdX) / Math.max(0.016, dt);
          c.cmdVy = (ny - c.cmdY) / Math.max(0.016, dt);
          c.cmdX = nx;
          c.cmdY = ny;
          c.depth = Math.min(1, (c.seg + k) / 3);
          c.camY = (c.camY || 0) + (40 + c.depth * 120) * dt;

          if (k >= 1) {
            if (c.seg === 0) {
              c.cmdX = wallL + 24;
              c.cmdY = c.toY;
              wallImpact("L", c.cmdX - 6, c.cmdY);
              c.wallHits = 1;
              c.seg = 1;
              c.segT = 0;
              c.fromX = c.cmdX;
              c.fromY = c.cmdY;
              c.toX = wallR - 24;
              c.toY = state.H * 0.52;
            } else if (c.seg === 1) {
              c.cmdX = wallR - 24;
              c.cmdY = c.toY;
              wallImpact("R", c.cmdX + 6, c.cmdY);
              c.wallHits = 2;
              c.seg = 2;
              c.segT = 0;
              c.fromX = c.cmdX;
              c.fromY = c.cmdY;
              c.toX = state.W * 0.42;
              c.toY = floorY - 8;
              c.floorRise = 0;
            } else {
              c.cmdX = c.toX;
              c.cmdY = floorY;
              c.cmdVy = 0;
              c.cmdVx = 0;
              c.floorRise = 1;
              c.squash = 1;
              c.softLand = 1;
              c.dust = 0.75;
              c.bang = 0.55;
              c.prone = 1;
              state.shake = Math.max(state.shake || 0, 10);
              sparkBurst(c.cmdX, c.cmdY, 8);
              bloodBurst(c.cmdX, c.cmdY, 10);
              G.burst(state, c.cmdX, c.cmdY, "#8a4030", 12, 45);
              if (G.audio && G.audio.thud) G.audio.thud();
              else if (G.audio && G.audio.hit) G.audio.hit();
              c.beat = "land";
              c.beatT = 0;
            }
          }
          // Last plunge: chamber floor rises to meet the faller
          if (c.seg === 2) {
            c.floorRise = Math.min(1, Math.pow(Math.min(1, c.segT / Math.max(0.01, segDur)), 0.85));
          }
        }
        // Blood drips scrolling past during fall
        if (Math.random() < 0.55) {
          c.drips.push({
            x: wallL + 10 + Math.random() * (wallR - wallL - 20),
            y: c.cmdY - 160 - Math.random() * 240,
            vy: 90 + Math.random() * 140,
            vx: (Math.random() - 0.5) * 30,
            life: 0.9
          });
        }
        for (var dr = c.drips.length - 1; dr >= 0; dr--) {
          c.drips[dr].x += (c.drips[dr].vx || 0) * dt;
          c.drips[dr].y += c.drips[dr].vy * dt;
          c.drips[dr].life -= dt;
          if (c.drips[dr].life <= 0) c.drips.splice(dr, 1);
        }
      } else if (c.beat === "land") {
        // Prone impact settle
        c.beatT = (c.beatT || 0) + dt;
        c.floorRise = 1;
        c.prone = Math.max(0.55, 1 - c.beatT * 0.35);
        c.cmdY = floorY + 4 + Math.sin(Math.min(1, c.beatT) * Math.PI) * -4 * (1 - Math.min(1, c.beatT));
        c.cmdRot = Math.PI * 0.5 * (0.85 + Math.sin(c.beatT * 3) * 0.04);
        if (c.beatT > 1.15) {
          c.beat = "daze";
          c.beatT = 0;
        }
      } else if (c.beat === "daze") {
        // Lying there, trying to make sense of it
        c.beatT = (c.beatT || 0) + dt;
        c.prone = 0.7;
        c.cmdY = floorY + 6;
        c.cmdRot = Math.PI * 0.42 + Math.sin(c.beatT * 1.2) * 0.12;
        c.lookT = Math.sin(c.beatT * 1.6);
        c.cmdX += Math.sin(c.beatT * 2.2) * 3 * dt;
        if (c.beatT > 2.0) {
          c.beat = "rise";
          c.beatT = 0;
        }
      } else if (c.beat === "rise") {
        // Slow push-up → knees → feet
        c.beatT = (c.beatT || 0) + dt;
        var rkUp = Math.min(1, c.beatT / 1.85);
        rkUp = rkUp * rkUp * (3 - 2 * rkUp);
        c.prone = Math.max(0, 0.7 * (1 - rkUp));
        c.cmdRot = Math.PI * 0.42 * (1 - rkUp);
        c.cmdY = floorY + 6 * (1 - rkUp) - Math.sin(rkUp * Math.PI) * 5;
        c.lookT = Math.sin(c.beatT * 2) * (1 - rkUp);
        if (c.beatT > 1.85) {
          c.beat = "stagger";
          c.beatT = 0;
          c.cmdRot = 0;
          c.prone = 0;
        }
      } else if (c.beat === "stagger") {
        c.beatT = (c.beatT || 0) + dt;
        c.cmdX += Math.sin(c.beatT * 9) * 10 * dt;
        c.cmdY = floorY + Math.abs(Math.sin(c.beatT * 6)) * 2;
        c.cmdRot = Math.sin(c.beatT * 5) * 0.1;
        c.lookT = Math.sin(c.beatT * 2.4);
        if (c.beatT > 1.35) {
          c.beat = "walk";
          c.beatT = 0;
          c.walkFrom = c.cmdX;
          c.walkTo = state.W * 0.48;
          c.cmdRot = 0;
          c.lookT = 0;
        }
      } else if (c.beat === "walk") {
        c.beatT = (c.beatT || 0) + dt;
        var wk = Math.min(1, c.beatT / 1.35);
        wk = wk * wk * (3 - 2 * wk);
        c.cmdX = c.walkFrom + (c.walkTo - c.walkFrom) * wk;
        c.cmdY = floorY + Math.abs(Math.sin(c.beatT * 10)) * 3;
        if (c.beatT > 1.35) {
          c.beat = "spot";
          c.beatT = 0;
          c.bang = 0.9;
          if (G.audio && G.audio.ui) G.audio.ui();
        }
      } else if (c.beat === "spot") {
        c.beatT = (c.beatT || 0) + dt;
        if (c.beatT > 1.6) {
          c.beat = "run";
          c.beatT = 0;
          c.walkFrom = c.cmdX;
          c.walkTo = c.shipX - 54;
        }
      } else if (c.beat === "run") {
        c.beatT = (c.beatT || 0) + dt;
        var rk = Math.min(1, c.beatT / 1.1);
        rk = rk * rk * (3 - 2 * rk);
        c.cmdX = c.walkFrom + (c.walkTo - c.walkFrom) * rk;
        c.cmdY = floorY + Math.abs(Math.sin(c.beatT * 14)) * 4;
        if (c.beatT > 1.1) {
          c.beat = "door";
          c.beatT = 0;
          c.door = 0;
          if (G.audio && G.audio.ui) G.audio.ui();
        }
      } else if (c.beat === "door") {
        c.beatT = (c.beatT || 0) + dt;
        c.door = Math.min(1, c.beatT / 0.85);
        if (c.beatT > 1.05) {
          c.beat = "board";
          c.beatT = 0;
          c.walkFrom = c.cmdX;
          c.walkTo = c.shipX - 8;
        }
      } else if (c.beat === "board") {
        c.beatT = (c.beatT || 0) + dt;
        var bk = Math.min(1, c.beatT / 0.7);
        c.cmdX = c.walkFrom + (c.walkTo - c.walkFrom) * bk;
        c.cmdAlpha = 1 - bk * 0.85;
        if (c.beatT > 0.7) {
          c.beat = "pilot";
          c.beatT = 0;
          c.pilot = 0;
          c.cmdAlpha = 0;
          if (G.audio && G.audio.wave) G.audio.wave();
        }
      } else if (c.beat === "pilot") {
        c.beatT = (c.beatT || 0) + dt;
        c.pilot = Math.min(1, c.beatT / 1.8);
        if (c.beatT > 0.4 && c.shakeN < 1) {
          c.shakeN = 1;
          state.shake = Math.max(state.shake || 0, 6);
        }
        if (c.beatT > 1.1 && c.shakeN < 2) {
          c.shakeN = 2;
          state.shake = Math.max(state.shake || 0, 10);
          if (G.audio && G.audio.explosion) G.audio.explosion();
        }
        if (c.beatT > 2.2) {
          g.phase = "scroll";
          g.t = 0;
          g.speed = 108;
          g.length = 6200;
          g.valveAt = 4100;
          g.valve = null;
          state.squad.x = Math.min(state.W * 0.28, c.shipX - 40);
          state.squad.y = c.shipY;
          g.cin = null;
          ensureGulletPlane(g);
          g.plane.card = 0;
          g.plane.charge = 0;
        }
      }
      return true;
    }

    if (g.phase === "scroll") {
      g.scroll += g.speed * dt;
      steerGulletCraft(state, dt);
      fireGulletWeapons(state, dt);
      for (var s = g.shots.length - 1; s >= 0; s--) {
        var sh = g.shots[s];
        sh.x += (sh.vx || 0) * dt;
        sh.y += (sh.vy || 0) * dt;
        sh.life -= dt;
        if (sh.life <= 0 || sh.x > state.W + 120 || sh.x < -80 || sh.y < -80 || sh.y > state.H + 80) {
          g.shots.splice(s, 1);
          continue;
        }
        if (sh.enemy) {
          if (Math.hypot(sh.x - state.squad.x, sh.y - state.squad.y) < (sh.parry ? 20 : 16)) {
            if (tryParryShot(state, sh)) {
              g.shots.splice(s, 1);
            } else {
              gulletHurtCraft(state, sh.dmg || 7, sh.x, sh.y);
              g.shots.splice(s, 1);
            }
          }
          continue;
        }
        for (var f = 0; f < g.foes.length; f++) {
          var foe = g.foes[f];
          if (foe.hp <= 0 || foe.vent) continue;
          var wx = foe.x - g.scroll;
          if (Math.hypot(wx - sh.x, foe.y - sh.y) < foe.r + 8 + (sh.r || 0)) {
            foe.hp -= sh.dmg;
            sh.life = 0;
            var plHit = ensureGulletPlane(g);
            plHit.card = Math.min(1, (plHit.card || 0) + (sh.kind === "ex" ? 0.02 : 0.012));
            G.burst(state, sh.x, sh.y, sh.color || "#ffe08a", sh.kind === "bomb" ? 10 : 6, sh.kind === "bomb" ? 55 : 40);
            break;
          }
        }
      }
      for (var fi = g.foes.length - 1; fi >= 0; fi--) {
        var fo = g.foes[fi];
        fo.t += dt;
        var fx = fo.x - g.scroll;
        if (!fo.vent) {
          fo.facing = fx > state.squad.x ? -1 : 1;
        }
        if (fo.kind === "mite") fo.y += Math.sin(fo.t * 2.6) * 36 * dt;
        if (fo.kind === "platelet") {
          fo.y += Math.sin(fo.t * 3.8) * 50 * dt;
          fo.x -= 8 * dt;
        }
        if (fo.kind === "tooth" && fx < state.W * 0.75 && fx > 60) {
          fo.y += (state.squad.y - fo.y) * Math.min(1, 0.35 * dt);
        }
        if (fo.kind === "spore") {
          fo.y += Math.sin(fo.t * 1.8) * 18 * dt;
        }
        // Infinite range — aim at craft from off-screen; shots travel the whole tunnel
        if (fx > -280 && fx < state.W + 160) {
          var aimA = Math.atan2(state.squad.y - fo.y, state.squad.x - fx);
          if (fo.kind === "spore" && (fo.shotCd || 0) <= 0) {
            fo.shotCd = 0.85 + Math.random() * 0.45;
            g.shots.push({
              x: fx,
              y: fo.y,
              vx: Math.cos(aimA) * 220,
              vy: Math.sin(aimA) * 220,
              life: 4.5,
              dmg: 8,
              enemy: true,
              parry: true,
              color: "#ff7ad9"
            });
          }
          if (fo.kind === "mite" && (fo.shotCd || 0) <= 0) {
            fo.shotCd = 1.1 + Math.random() * 0.6;
            g.shots.push({
              x: fx,
              y: fo.y,
              vx: Math.cos(aimA) * 240,
              vy: Math.sin(aimA) * 240,
              life: 4.2,
              dmg: 6,
              enemy: true,
              color: "#ff8a40"
            });
          }
          if (fo.kind === "tooth" && (fo.shotCd || 0) <= 0) {
            fo.shotCd = 1.35 + Math.random() * 0.5;
            g.shots.push({
              x: fx,
              y: fo.y,
              vx: Math.cos(aimA) * 260,
              vy: Math.sin(aimA) * 260,
              life: 4.0,
              dmg: 7,
              enemy: true,
              color: "#c4a06a"
            });
          }
          if (fo.kind === "platelet" && (fo.shotCd || 0) <= 0) {
            fo.shotCd = 1.5 + Math.random() * 0.7;
            var p;
            for (p = -1; p <= 1; p++) {
              var pang = aimA + p * 0.18;
              g.shots.push({
                x: fx,
                y: fo.y,
                vx: Math.cos(pang) * 200,
                vy: Math.sin(pang) * 200,
                life: 4.0,
                dmg: 6,
                enemy: true,
                parry: p === 0 && Math.random() < 0.35,
                color: p === 0 ? "#ff7ad9" : "#e8a060"
              });
            }
          }
          if ((fo.shotCd || 0) > 0) fo.shotCd -= dt;
        }
        if (fo.kind === "vent") {
          if (fx < -80) {
            g.foes.splice(fi, 1);
            continue;
          }
          if (Math.sin(fo.t * 3.2) > 0.72 && Math.hypot(fx - state.squad.x, fo.y - state.squad.y) < fo.r + 18) {
            gulletHurtCraft(state, 5, fx, fo.y);
          }
          continue;
        }
        if (fo.hp <= 0) {
          var burstCol =
            fo.kind === "spore" ? "#8ad422" :
            fo.kind === "platelet" ? "#c06070" :
            fo.kind === "tooth" ? "#e8dcc8" :
            "#ff8a40";
          G.burst(state, fx, fo.y, burstCol, 14, 70);
          G.burst(state, fx, fo.y, "#a8b8c8", 6, 40);
          g.foes.splice(fi, 1);
          continue;
        }
        if (fx < -80) {
          g.foes.splice(fi, 1);
          continue;
        }
        if (Math.hypot(fx - state.squad.x, fo.y - state.squad.y) < fo.r + 12) {
          gulletHurtCraft(state, 10, fx, fo.y);
          fo.hp = 0;
        }
      }
      for (var ri = 0; ri < g.obstacles.length; ri++) {
        var rib = g.obstacles[ri];
        var rx = rib.x - g.scroll;
        if (rx > -60 && rx < state.W + 60) {
          var nearY = rib.y < state.H / 2 ? state.squad.y < rib.y + rib.h : state.squad.y > rib.y - rib.h;
          if (nearY && Math.abs(rx - state.squad.x) < rib.w * 0.5 + 12) {
            gulletHurtCraft(state, 6, rx, rib.y);
            state.squad.y += rib.y < state.H / 2 ? 90 * dt : -90 * dt;
          }
        }
      }
      // Approach valve — cinematic reveal before the fight
      if (!g.valve && g.scroll >= (g.valveAt || 4100)) {
        beginValveCin(state, g);
      }
      if (g.scroll >= g.length && !g.valve) {
        beginHeartPhase(state, g);
      }
      return true;
    }

    if (g.phase === "valve_cin" || g.phase === "heart_cin") {
      tickBossCin(state, g, dt);
      return true;
    }

    if (g.phase === "valve") {
      steerGulletCraft(state, dt);
      fireGulletWeapons(state, dt);
      tickValveBoss(state, g, dt);
      return true;
    }

    if (g.phase === "heart") {
      steerGulletCraft(state, dt);
      tickHeartBoss(state, g, dt);
      return true;
    }

    if (g.phase === "death_cin" || g.phase === "outro") {
      tickDeathCin(state, g, dt);
      return true;
    }
    return true;
  }

  function finishGullet(state) {
    // Fallback — prefer the spit cinematic path
    var g = state.arklanGullet;
    if (g && !state.arklanSpit) {
      startArklanSpit(state, g);
      return;
    }
    if (state.arklanSpit) {
      finishArklanSpit(state);
      return;
    }
    state.arklanGullet = null;
    state.arklanEyes = [];
    state.camZoomTo = desertZoom(state);
  }

  G.arklanP2 = {
    tick: tickWormP2,
    tickGullet: tickGullet,
    tickSpit: tickArklanSpit,
    onBroken: onArklanBroken,
    restoreZoom: restoreDesertZoom,
    desertZoom: desertZoom,
    startGullet: startGullet,
    drawWorld: drawArklanP2World,
    drawGullet: drawArklanGullet,
    drawSpit: drawArklanSpit
  };

  function drawWallEye(ctx, eye, time) {
    var g = eye.grow || 0;
    if (g < 0.05) return;
    var blink = Math.sin(eye.blink || 0);
    var lid = blink > 0.82 ? Math.min(1, (blink - 0.82) / 0.18) : 0;
    var charging = (eye.chargeT || 0) > 0;
    var chargeK = charging && eye.chargeMax ? 1 - eye.chargeT / eye.chargeMax : 0;
    ctx.save();
    ctx.translate(eye.x, eye.y);
    ctx.rotate(eye.ang || 0);
    ctx.globalAlpha = g;
    // flesh mound on wall
    ctx.fillStyle = "#4a3028";
    ctx.beginPath();
    ctx.ellipse(0, 0, 16 * g, 12 * g, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6a4840";
    ctx.beginPath();
    ctx.ellipse(0, 0, 12 * g, 9 * g, 0, 0, Math.PI * 2);
    ctx.fill();
    // metal ring
    ctx.strokeStyle = charging ? "#ff8aa0" : "#a8b8c8";
    ctx.lineWidth = 2.2 + chargeK * 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11 * g, 8.5 * g, 0, 0, Math.PI * 2);
    ctx.stroke();
    // charge aura
    if (charging) {
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255, 80, 120, " + (0.35 + chargeK * 0.5) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, (14 + chargeK * 6) * g, (11 + chargeK * 4) * g, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }
    // sclera
    ctx.fillStyle = charging ? "#ffe0e8" : "#f2e8dc";
    ctx.beginPath();
    ctx.ellipse(0, 0, 8 * g, 6.2 * g * (1 - lid * 0.92), 0, 0, Math.PI * 2);
    ctx.fill();
    if (lid < 0.85) {
      var look = eye.look != null ? eye.look - (eye.ang || 0) : 0;
      var px = Math.cos(look) * 2.5 * g;
      var py = Math.sin(look) * 1.8 * g;
      ctx.fillStyle = "#1a0808";
      ctx.beginPath();
      ctx.arc(px, py, 3.2 * g, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = charging ? "#ff2040" : "#ff4a6a";
      ctx.beginPath();
      ctx.arc(px + 0.6, py - 0.4, (1.4 + chargeK * 1.2) * g, 0, Math.PI * 2);
      ctx.fill();
      if (charging) {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255, 180, 200, " + (0.4 + chargeK * 0.5) + ")";
        ctx.beginPath();
        ctx.arc(px, py, (2 + chargeK * 3) * g, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(px + 1.2, py - 1.2, 0.9 * g, 0, Math.PI * 2);
      ctx.fill();
    }
    // flesh lid
    if (lid > 0.05) {
      ctx.fillStyle = "#5a3830";
      ctx.beginPath();
      ctx.ellipse(0, -2 * g, 9 * g, 6.5 * g * lid, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 2 * g, 9 * g, 6.5 * g * lid, 0, 0, Math.PI);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTentacle(ctx, tent, time) {
    var grow = tent.grow || 0;
    if (grow < 0.02) return;
    var slam = tent.slamFx || 0;
    ctx.save();
    ctx.translate(tent.x, tent.y);
    // shadow / impact ring
    ctx.fillStyle = "rgba(20, 16, 12, " + (0.25 + grow * 0.25) + ")";
    ctx.beginPath();
    ctx.ellipse(0, 8, 28 * grow, 12 * grow, 0, 0, Math.PI * 2);
    ctx.fill();
    if (slam > 0) {
      ctx.strokeStyle = "rgba(200, 220, 240, " + slam + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, tent.slamR * (1.05 - slam * 0.4), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(180, 200, 220, " + (slam * 0.2) + ")";
      ctx.beginPath();
      ctx.arc(0, 0, tent.slamR * (0.7 + (1 - slam) * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
      // segmented robotic arm rising from edge
    var segs = 5;
    var h = 90 * grow * (tent.phase === "rise" ? 0.55 + grow * 0.45 : 1);
    for (var i = 0; i < segs; i++) {
      var k = i / (segs - 1);
      var yy = -h * k;
      var wob = Math.sin(time * 6 + i) * (4 + (1 - grow) * 8);
      var rw = 14 - i * 1.6;
      ctx.fillStyle = i % 2 ? "#6a7888" : "#3a4550";
      ctx.beginPath();
      ctx.rect(-rw + wob * 0.15, yy - 10, rw * 2, 18);
      ctx.fill();
      ctx.strokeStyle = "#c8d4e0";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "#7af0ff";
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.arc(wob * 0.1, yy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
    // claw tip
    ctx.fillStyle = "#d0dde8";
    ctx.beginPath();
    ctx.moveTo(-16, -h - 4);
    ctx.lineTo(0, -h - 28 - slam * 10);
    ctx.lineTo(16, -h - 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ff6a3a";
    ctx.beginPath();
    ctx.arc(0, -h - 8, 4 + slam * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawArklanSpit(ctx, state) {
    var sp = state.arklanSpit;
    if (!sp) return;
    var time = state.time || 0;
    // After landing, squad sprites take over
    if (sp.beat === "die") {
      if ((sp.fade || 0) > 0.02) {
        ctx.fillStyle = "rgba(18, 4, 4, " + Math.min(0.92, sp.fade) + ")";
        ctx.fillRect(0, 0, state.W, state.H);
      }
      return;
    }
    // Sand plume under craft
    if ((sp.sand || 0) > 0.05 || sp.beat === "land" || sp.beat === "spit") {
      ctx.fillStyle = "rgba(180, 140, 80, " + (0.2 + (sp.sand || 0.3) * 0.35) + ")";
      ctx.beginPath();
      ctx.ellipse(sp.craftX + 4, sp.craftY + 16, 28 + (sp.sand || 0) * 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Flying scrap fighter
    ctx.save();
    ctx.translate(sp.craftX, sp.craftY);
    ctx.rotate(sp.rot || 0);
    if (sp.beat === "gag") ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#4a5560";
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-16, -18);
    ctx.lineTo(8, -8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-16, 18);
    ctx.lineTo(8, 8);
    ctx.closePath();
    ctx.fill();
    var hg = ctx.createLinearGradient(-20, 0, 28, 0);
    hg.addColorStop(0, "#2a3038");
    hg.addColorStop(0.5, "#6a7888");
    hg.addColorStop(1, "#d0dde8");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(8, -10);
    ctx.lineTo(-20, -6);
    ctx.lineTo(-24, 0);
    ctx.lineTo(-20, 6);
    ctx.lineTo(8, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7af0ff";
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    ctx.ellipse(10, 0, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    // Thruster flare while spat
    if (sp.beat === "spit" || sp.beat === "gag") {
      var thr = 14 + Math.sin(time * 30) * 6;
      ctx.fillStyle = "rgba(255, 140, 40, 0.85)";
      ctx.beginPath();
      ctx.moveTo(-24, -5);
      ctx.lineTo(-24 - thr, 0);
      ctx.lineTo(-24, 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Fade from gullet
    if ((sp.fade || 0) > 0.02) {
      ctx.fillStyle = "rgba(18, 4, 4, " + Math.min(0.92, sp.fade) + ")";
      ctx.fillRect(0, 0, state.W, state.H);
    }
  }

  function drawArklanP2World(ctx, state) {
    if (!state) return;
    if (state.arklanSpit) drawArklanSpit(ctx, state);
    var eyes = state.arklanEyes;
    var time = state.time || 0;
    if (eyes && eyes.length) {
      for (var i = 0; i < eyes.length; i++) {
        drawWallEye(ctx, eyes[i], time);
        var ey = eyes[i];
        // Soft telegraph — pale preview, NOT the actual beam
        if ((ey.chargeT || 0) > 0 && ey.lockedAim != null) {
          var ck = ey.chargeMax ? 1 - ey.chargeT / ey.chargeMax : 0.5;
          var elen = cageReach(state, ey, 40);
          var pulse = 0.65 + Math.sin(time * 9) * 0.35;
          ctx.save();
          ctx.translate(ey.x, ey.y);
          ctx.rotate(ey.lockedAim);
          // thin ghost lane
          ctx.fillStyle = "rgba(255, 190, 200, " + (0.06 + ck * 0.08 * pulse) + ")";
          ctx.fillRect(0, -7, elen, 14);
          ctx.setLineDash([6, 8]);
          ctx.strokeStyle = "rgba(255, 210, 220, " + (0.28 + ck * 0.22) + ")";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(elen, 0);
          ctx.stroke();
          // faint edge guides
          ctx.strokeStyle = "rgba(255, 170, 180, " + (0.16 + ck * 0.14) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, -8);
          ctx.lineTo(elen, -8);
          ctx.moveTo(0, 8);
          ctx.lineTo(elen, 8);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
          // Soft ground mark
          var mx = ey.markX != null ? ey.markX : ey.x + Math.cos(ey.lockedAim) * 120;
          var my = ey.markY != null ? ey.markY : ey.y + Math.sin(ey.lockedAim) * 120;
          var mr = 28 + ck * 10;
          ctx.save();
          ctx.translate(mx, my);
          ctx.fillStyle = "rgba(255, 200, 210, " + (0.08 + ck * 0.1 * pulse) + ")";
          ctx.beginPath();
          ctx.arc(0, 0, mr, 0, Math.PI * 2);
          ctx.fill();
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = "rgba(255, 160, 175, " + (0.35 + ck * 0.25) + ")";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, mr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = "rgba(255, 230, 235, " + (0.3 + pulse * 0.2) + ")";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-mr * 0.45, 0);
          ctx.lineTo(mr * 0.45, 0);
          ctx.moveTo(0, -mr * 0.45);
          ctx.lineTo(0, mr * 0.45);
          ctx.stroke();
          ctx.restore();
        }
        if (ey.laserBeam && ey.laserBeam.t > 0) {
          ctx.save();
          ctx.translate(ey.x, ey.y);
          ctx.rotate(ey.laserBeam.ang);
          ctx.globalCompositeOperation = "lighter";
          var ba = Math.min(1, ey.laserBeam.t / 0.22);
          var bg = ctx.createLinearGradient(0, 0, ey.laserBeam.len || 400, 0);
          bg.addColorStop(0, "rgba(255, 120, 140, " + (0.9 * ba) + ")");
          bg.addColorStop(0.5, "rgba(255, 40, 60, " + (0.55 * ba) + ")");
          bg.addColorStop(1, "rgba(180, 0, 20, 0)");
          ctx.fillStyle = bg;
          ctx.fillRect(0, -8, ey.laserBeam.len || 400, 16);
          ctx.fillStyle = "rgba(255, 255, 230, " + (0.7 * ba) + ")";
          ctx.fillRect(0, -2.5, ey.laserBeam.len || 400, 5);
          ctx.restore();
        }
      }
    }
    for (var ei = 0; ei < (state.enemies || []).length; ei++) {
      var e = state.enemies[ei];
      if (e.type !== "chefe_arklan") continue;
      if (e.hp <= 0 && !e.arklanBroken) continue;
      if (e.tents) {
        for (var t = 0; t < e.tents.length; t++) drawTentacle(ctx, e.tents[t], time);
      }
      if (e.laserBeam && e.laserBeam.t > 0) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.laserBeam.ang);
        ctx.globalCompositeOperation = "lighter";
        var len = e.laserBeam.len || 500;
        var a = Math.min(1, e.laserBeam.t / 0.28);
        var grd = ctx.createLinearGradient(0, 0, len, 0);
        grd.addColorStop(0, "rgba(180, 255, 255, " + (0.85 * a) + ")");
        grd.addColorStop(0.4, "rgba(80, 220, 255, " + (0.55 * a) + ")");
        grd.addColorStop(1, "rgba(40, 120, 255, 0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, -10, len, 20);
        ctx.fillStyle = "rgba(255, 255, 255, " + (0.7 * a) + ")";
        ctx.fillRect(0, -3, len, 6);
        ctx.restore();
      }
      if (e.wormAct === "flame") {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.flameAng || e.rot || 0);
        ctx.globalCompositeOperation = "lighter";
        var fLen = e.flameLen || 320;
        var fg = ctx.createLinearGradient(20, 0, fLen, 0);
        fg.addColorStop(0, "rgba(255, 200, 80, 0.55)");
        fg.addColorStop(0.45, "rgba(210, 150, 60, 0.35)");
        fg.addColorStop(1, "rgba(180, 120, 40, 0)");
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(24, -20);
        ctx.lineTo(fLen, -52);
        ctx.lineTo(fLen, 52);
        ctx.lineTo(24, 20);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function gulletOval(ctx, x, y, rx, ry, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function gulletEye(ctx, x, y, r, col) {
    gulletOval(ctx, x, y, r, r * 0.85, col || "#1a0808");
    gulletOval(ctx, x + r * 0.25, y - r * 0.2, r * 0.35, r * 0.3, "#ffe08a");
  }

  /** Parasitic sand-mite larva (mini desert worm vibe) */
  function drawGulletMite(ctx, fo, time) {
    var s = fo.r;
    var gait = time * 8 + (fo.t || 0) * 3;
    ctx.save();
    ctx.scale(fo.facing || -1, 1);
    ctx.rotate(Math.sin(gait) * 0.12);
    // shadow
    gulletOval(ctx, 2, s * 0.55, s * 1.1, s * 0.28, "rgba(20, 8, 4, 0.35)");
    // body segments
    for (var seg = 3; seg >= 0; seg--) {
      var bx = -s * 0.85 + seg * s * 0.42;
      var by = Math.sin(gait + seg * 0.7) * 2.2;
      var shell = ctx.createRadialGradient(bx - 2, by - 3, 1, bx, by, s * 0.55);
      shell.addColorStop(0, seg === 3 ? "#e8c090" : "#d4a06a");
      shell.addColorStop(0.55, "#8a5a28");
      shell.addColorStop(1, "#3a2010");
      gulletOval(ctx, bx, by, s * (0.42 + seg * 0.04), s * 0.38, shell);
      ctx.strokeStyle = "rgba(60, 32, 12, 0.45)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(bx, by, s * (0.4 + seg * 0.04), s * 0.36, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // head
    gulletOval(ctx, s * 0.55, 0, s * 0.48, s * 0.42, "#5a3418");
    gulletOval(ctx, s * 0.62, 0, s * 0.28, s * 0.32, "#1a0808");
    // mandibles
    ctx.fillStyle = "#c4a06a";
    ctx.beginPath();
    ctx.moveTo(s * 0.7, -s * 0.18);
    ctx.lineTo(s * 1.35, -s * 0.42);
    ctx.lineTo(s * 0.85, -s * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.7, s * 0.18);
    ctx.lineTo(s * 1.35, s * 0.42);
    ctx.lineTo(s * 0.85, s * 0.02);
    ctx.closePath();
    ctx.fill();
    gulletEye(ctx, s * 0.48, -s * 0.14, s * 0.11, "#2a1008");
    gulletEye(ctx, s * 0.48, s * 0.14, s * 0.11, "#2a1008");
    // tiny legs
    ctx.strokeStyle = "#3a2010";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (var lg = 0; lg < 3; lg++) {
      var lx = -s * 0.5 + lg * s * 0.35;
      var swing = Math.sin(gait + lg) * 4;
      ctx.beginPath();
      ctx.moveTo(lx, s * 0.2);
      ctx.lineTo(lx - 4 + swing, s * 0.7);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Mobile enamel fang — bone + metal root */
  function drawGulletTooth(ctx, fo, time) {
    var s = fo.r;
    var bob = Math.sin(time * 6 + fo.t) * 2;
    ctx.save();
    ctx.translate(0, bob);
    ctx.rotate(-0.15 + Math.sin(time * 3) * 0.08);
    // root / metal socket
    var root = ctx.createLinearGradient(0, s * 0.4, 0, s * 1.1);
    root.addColorStop(0, "#8a9aaa");
    root.addColorStop(1, "#2a3038");
    gulletOval(ctx, 0, s * 0.55, s * 0.55, s * 0.35, root);
    ctx.fillStyle = "#c8d4e0";
    for (var rv = -1; rv <= 1; rv++) {
      ctx.beginPath();
      ctx.arc(rv * s * 0.22, s * 0.5, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // enamel blade
    var enamel = ctx.createLinearGradient(-s * 0.3, -s, s * 0.3, s * 0.4);
    enamel.addColorStop(0, "#fff8e8");
    enamel.addColorStop(0.45, "#e8dcc8");
    enamel.addColorStop(1, "#a89070");
    ctx.fillStyle = enamel;
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.35);
    ctx.lineTo(s * 0.55, s * 0.35);
    ctx.quadraticCurveTo(0, s * 0.55, -s * 0.55, s * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(60, 40, 20, 0.4)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // crack highlight
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-s * 0.05, -s * 0.9);
    ctx.lineTo(s * 0.12, -s * 0.2);
    ctx.stroke();
    // blood rim
    ctx.strokeStyle = "rgba(160, 40, 30, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, s * 0.15);
    ctx.quadraticCurveTo(0, s * 0.35, s * 0.4, s * 0.15);
    ctx.stroke();
    ctx.restore();
  }

  /** Acid cyst / bile spore sac */
  function drawGulletSpore(ctx, fo, time) {
    var s = fo.r;
    var pulse = 1 + Math.sin(time * 5 + fo.t) * 0.06;
    ctx.save();
    ctx.scale(pulse, pulse);
    // drip aura
    ctx.fillStyle = "rgba(100, 200, 60, 0.18)";
    ctx.beginPath();
    ctx.arc(0, 0, s * 1.35, 0, Math.PI * 2);
    ctx.fill();
    var body = ctx.createRadialGradient(-s * 0.25, -s * 0.3, 2, 0, 0, s * 1.1);
    body.addColorStop(0, "#c4ff80");
    body.addColorStop(0.35, "#6aaa44");
    body.addColorStop(0.75, "#3a6020");
    body.addColorStop(1, "#1a2a10");
    gulletOval(ctx, 0, 0, s, s * 0.92, body);
    // membrane veins
    ctx.strokeStyle = "rgba(40, 80, 20, 0.55)";
    ctx.lineWidth = 1.3;
    for (var v = 0; v < 5; v++) {
      var va = (v / 5) * Math.PI * 2 + time * 0.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(
        Math.cos(va + 0.4) * s * 0.45,
        Math.sin(va + 0.4) * s * 0.45,
        Math.cos(va) * s * 0.85,
        Math.sin(va) * s * 0.85
      );
      ctx.stroke();
    }
    // nucleus
    gulletOval(ctx, s * 0.15, -s * 0.1, s * 0.32, s * 0.28, "#1a3010");
    gulletOval(ctx, s * 0.2, -s * 0.14, s * 0.14, s * 0.12, "#ffe08a");
    // hanging drips
    ctx.fillStyle = "#8ad422";
    for (var d = 0; d < 3; d++) {
      var dx = -s * 0.35 + d * s * 0.35;
      var dy = s * 0.7 + Math.sin(time * 4 + d) * 3;
      gulletOval(ctx, dx, dy, 3.5, 5 + (d % 2) * 2, "#8ad422");
    }
    // wart bumps
    gulletOval(ctx, -s * 0.45, s * 0.2, s * 0.18, s * 0.15, "#5a8a30");
    gulletOval(ctx, s * 0.5, s * 0.25, s * 0.14, s * 0.12, "#5a8a30");
    ctx.restore();
  }

  /** Scrap platelet crab — armored blood-cell with legs */
  function drawGulletPlatelet(ctx, fo, time) {
    var s = fo.r;
    var spin = time * 2.2 + fo.t;
    ctx.save();
    ctx.rotate(Math.sin(spin) * 0.2);
    // legs
    ctx.strokeStyle = "#5a3038";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    for (var L = 0; L < 6; L++) {
      var la = (L / 6) * Math.PI * 2 + spin * 0.3;
      var reach = s * (1.15 + Math.sin(spin * 3 + L) * 0.12);
      ctx.beginPath();
      ctx.moveTo(Math.cos(la) * s * 0.4, Math.sin(la) * s * 0.25);
      ctx.lineTo(Math.cos(la) * reach, Math.sin(la) * reach * 0.7);
      ctx.stroke();
      gulletOval(ctx, Math.cos(la) * reach, Math.sin(la) * reach * 0.7, 2.5, 2.5, "#8a4050");
    }
    // disk shell
    var disk = ctx.createRadialGradient(-s * 0.2, -s * 0.2, 2, 0, 0, s * 1.2);
    disk.addColorStop(0, "#e08090");
    disk.addColorStop(0.4, "#a04050");
    disk.addColorStop(1, "#3a1018");
    gulletOval(ctx, 0, 0, s * 1.25, s * 0.72, disk);
    // metal plates
    ctx.strokeStyle = "rgba(200, 210, 220, 0.55)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 1.05, s * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#a8b8c8";
    for (var p = 0; p < 4; p++) {
      var pa = (p / 4) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.arc(Math.cos(pa) * s * 0.55, Math.sin(pa) * s * 0.28, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    gulletEye(ctx, s * 0.35, -s * 0.08, s * 0.14, "#1a0808");
    gulletEye(ctx, s * 0.35, s * 0.12, s * 0.12, "#1a0808");
    // mouth slit
    ctx.strokeStyle = "#2a0808";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s * 0.7, -s * 0.08);
    ctx.lineTo(s * 0.95, 0);
    ctx.lineTo(s * 0.7, s * 0.1);
    ctx.stroke();
    ctx.restore();
  }

  /** Bile / pressure vent — hazard fixture */
  function drawGulletVent(ctx, fo, time) {
    var s = fo.r;
    var pulse = 0.5 + Math.sin(fo.t * 4.5) * 0.5;
    ctx.save();
    // metal housing
    var housing = ctx.createLinearGradient(-s, 0, s, 0);
    housing.addColorStop(0, "#2a3038");
    housing.addColorStop(0.5, "#6a7888");
    housing.addColorStop(1, "#1a2028");
    gulletOval(ctx, 0, 0, s * 1.05, s * 0.85, housing);
    ctx.strokeStyle = "#c8d4e0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.95, s * 0.75, 0, 0, Math.PI * 2);
    ctx.stroke();
    // bolts
    ctx.fillStyle = "#a8b8c8";
    for (var b = 0; b < 6; b++) {
      var ba = (b / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(ba) * s * 0.78, Math.sin(ba) * s * 0.58, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // grate
    ctx.strokeStyle = "#1a2228";
    ctx.lineWidth = 2;
    for (var gi = -2; gi <= 2; gi++) {
      ctx.beginPath();
      ctx.moveTo(gi * 7, -s * 0.45);
      ctx.lineTo(gi * 7, s * 0.45);
      ctx.stroke();
    }
    // toxic plume
    ctx.globalCompositeOperation = "lighter";
    var plume = ctx.createRadialGradient(0, 0, 4, 0, 0, s * (1.1 + pulse * 0.45));
    plume.addColorStop(0, "rgba(180, 255, 120, " + (0.35 + pulse * 0.35) + ")");
    plume.addColorStop(0.5, "rgba(80, 200, 80, " + (0.2 + pulse * 0.2) + ")");
    plume.addColorStop(1, "rgba(40, 120, 40, 0)");
    ctx.fillStyle = plume;
    ctx.beginPath();
    ctx.arc(0, 0, s * (1.1 + pulse * 0.45), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    // core glow
    gulletOval(ctx, 0, 0, 6 + pulse * 4, 5 + pulse * 3, pulse > 0.55 ? "#c4ff80" : "#2a5030");
    ctx.restore();
  }

  function drawGulletObstacle(ctx, rib, ox, time, H) {
    if (rib.kind === "gear") {
      ctx.save();
      ctx.translate(ox, rib.y);
      ctx.rotate(time * 1.2);
      var r = rib.w * 0.5;
      // hub
      var gear = ctx.createRadialGradient(-4, -4, 2, 0, 0, r);
      gear.addColorStop(0, "#a8b8c8");
      gear.addColorStop(0.5, "#5a6878");
      gear.addColorStop(1, "#2a3038");
      ctx.fillStyle = gear;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // teeth
      for (var toothG = 0; toothG < 10; toothG++) {
        var ga = (toothG / 10) * Math.PI * 2;
        ctx.save();
        ctx.rotate(ga);
        ctx.fillStyle = toothG % 2 ? "#7a8a9a" : "#4a5560";
        ctx.fillRect(r * 0.4, -6, r * 0.55, 12);
        ctx.restore();
      }
      ctx.strokeStyle = "#e8f0f8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      gulletOval(ctx, 0, 0, 5, 5, "#1a2228");
      // flesh crust on gear
      ctx.fillStyle = "rgba(120, 50, 40, 0.4)";
      ctx.beginPath();
      ctx.arc(r * 0.2, r * 0.15, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      var fromTop = rib.y < H / 2;
      var top = fromTop ? 48 : rib.y - rib.h;
      var hh = rib.h;
      // bone/flesh column
      var col = ctx.createLinearGradient(ox - rib.w * 0.5, 0, ox + rib.w * 0.5, 0);
      col.addColorStop(0, "#3a1810");
      col.addColorStop(0.35, "#6a3030");
      col.addColorStop(0.5, "#8a5048");
      col.addColorStop(0.65, "#6a3030");
      col.addColorStop(1, "#2a100c");
      ctx.fillStyle = col;
      ctx.beginPath();
      if (fromTop) {
        ctx.moveTo(ox - rib.w * 0.45, top);
        ctx.lineTo(ox - rib.w * 0.35, top + hh);
        ctx.lineTo(ox + rib.w * 0.35, top + hh);
        ctx.lineTo(ox + rib.w * 0.45, top);
      } else {
        ctx.moveTo(ox - rib.w * 0.35, top);
        ctx.lineTo(ox - rib.w * 0.45, top + hh);
        ctx.lineTo(ox + rib.w * 0.45, top + hh);
        ctx.lineTo(ox + rib.w * 0.35, top);
      }
      ctx.closePath();
      ctx.fill();
      // metal rebar
      ctx.fillStyle = "#a8b8c8";
      ctx.fillRect(ox - 3.5, top, 7, hh);
      ctx.fillStyle = "#e8f0f8";
      ctx.fillRect(ox - 1.5, top, 3, hh);
      // cartilage ridges
      ctx.strokeStyle = "rgba(200, 160, 140, 0.35)";
      ctx.lineWidth = 2;
      for (var ridge = 0; ridge < 4; ridge++) {
        var ry = top + hh * (0.2 + ridge * 0.2);
        ctx.beginPath();
        ctx.moveTo(ox - rib.w * 0.3, ry);
        ctx.lineTo(ox + rib.w * 0.3, ry);
        ctx.stroke();
      }
    }
  }

  function drawGulletFoe(ctx, fo, time) {
    if (fo.kind === "spore") drawGulletSpore(ctx, fo, time);
    else if (fo.kind === "tooth") drawGulletTooth(ctx, fo, time);
    else if (fo.kind === "platelet") drawGulletPlatelet(ctx, fo, time);
    else if (fo.kind === "vent") drawGulletVent(ctx, fo, time);
    else drawGulletMite(ctx, fo, time);
  }

  function drawGulletShip(ctx, x, y, door, pilot, lit) {
    ctx.save();
    ctx.translate(x, y);
    // Wedged into flesh — slight tilt
    ctx.rotate(-0.12);
    // hull
    var hg = ctx.createLinearGradient(-70, 0, 80, 0);
    hg.addColorStop(0, "#2a3038");
    hg.addColorStop(0.4, "#5a6878");
    hg.addColorStop(1, "#c8d4e0");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(78, 0);
    ctx.lineTo(20, -28);
    ctx.lineTo(-55, -22);
    ctx.lineTo(-72, 0);
    ctx.lineTo(-55, 22);
    ctx.lineTo(20, 28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#e8f0f8";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // flesh pinch marks
    ctx.strokeStyle = "rgba(120, 40, 30, 0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-40, -24);
    ctx.quadraticCurveTo(-20, -38, 10, -30);
    ctx.stroke();
    // door panel (slides up)
    var doorH = 22 * (1 - Math.max(0, Math.min(1, door || 0)));
    ctx.fillStyle = "#1a2228";
    ctx.fillRect(-18, -doorH, 22, doorH * 2);
    ctx.strokeStyle = "#7af0ff";
    ctx.globalAlpha = 0.35 + (door || 0) * 0.4;
    ctx.strokeRect(-18, -22, 22, 44);
    ctx.globalAlpha = 1;
    // cockpit
    var cock = lit || (pilot || 0) > 0.15;
    ctx.fillStyle = cock ? "#7af0ff" : "#3a4550";
    ctx.globalCompositeOperation = cock ? "lighter" : "source-over";
    ctx.beginPath();
    ctx.ellipse(38, 0, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    if ((pilot || 0) > 0.3) {
      ctx.fillStyle = "rgba(255, 220, 120, " + (0.2 + pilot * 0.5) + ")";
      ctx.beginPath();
      ctx.arc(38, 0, 6 + pilot * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    // thruster warmup
    if ((pilot || 0) > 0.55) {
      ctx.fillStyle = "rgba(255, 140, 40, " + ((pilot - 0.55) * 1.5) + ")";
      ctx.beginPath();
      ctx.moveTo(-72, -10);
      ctx.lineTo(-72 - pilot * 36, 0);
      ctx.lineTo(-72, 10);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGulletCinematic(ctx, state, g, time) {
    var c = g.cin;
    var W = state.W;
    var H = state.H;
    if (!c) return;
    var floorY = H * 0.72;
    var wallL = W * 0.24;
    var wallR = W * 0.76;
    var inSwallow = c.beat === "swallow";
    var inThroat = c.beat === "throat" || c.beat === "fall" || inSwallow;
    var onFloor = !inThroat;
    var depth = Math.min(1, c.depth || (inThroat ? 0.55 : 1));
    var scrollY = (c.camY || 0) + time * 55;
    var tunnelOpen = inSwallow ? Math.max(0.08, c.iris || 0) : 1;
    // Keep ship planted even if init was old
    if (onFloor) c.shipY = floorY - 20;

    // —— Deep mucosal void ——
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#080202");
    bg.addColorStop(0.25, "#1a0608");
    bg.addColorStop(0.55, "#3a1010");
    bg.addColorStop(0.8, "#2a0c0c");
    bg.addColorStop(1, "#100404");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Distant throat vanishing point (depth tunnel)
    var vanishY = H * 0.15 - (1 - tunnelOpen) * 40;
    var layers = 16;
    var li;
    for (li = layers; li >= 0; li--) {
      var lk = li / layers;
      var persp = Math.pow(lk, 1.35);
      var cy = vanishY + (H * 0.92 - vanishY) * persp + ((scrollY * (0.15 + lk * 0.4)) % 90);
      var hw = (28 + persp * (W * 0.38)) * (0.55 + tunnelOpen * 0.45);
      var hh = (18 + persp * (H * 0.42)) * (0.55 + tunnelOpen * 0.45);
      var flesh = ctx.createRadialGradient(W / 2, cy, hw * 0.15, W / 2, cy, hw);
      var dark = 0.15 + lk * 0.55;
      flesh.addColorStop(0, "rgba(" + Math.floor(80 + lk * 40) + ", " + Math.floor(18 + lk * 10) + ", " + Math.floor(22 + lk * 8) + ", " + (0.35 * tunnelOpen) + ")");
      flesh.addColorStop(0.55, "rgba(" + Math.floor(50 + lk * 30) + ", 12, 14, " + (0.55 * tunnelOpen) + ")");
      flesh.addColorStop(1, "rgba(8, 2, 2, " + (0.75 * tunnelOpen) + ")");
      ctx.fillStyle = flesh;
      ctx.beginPath();
      ctx.ellipse(W / 2, cy, hw, hh, 0, 0, Math.PI * 2);
      ctx.fill();
      // ring cartilage
      ctx.strokeStyle = "rgba(120, 50, 45, " + ((0.12 + lk * 0.2) * tunnelOpen) + ")";
      ctx.lineWidth = 3 + persp * 6;
      ctx.beginPath();
      ctx.ellipse(W / 2, cy, hw * 0.92, hh * 0.9, 0, 0, Math.PI * 2);
      ctx.stroke();
      // metal scrap flecks deeper in
      if (li % 3 === 0) {
        ctx.strokeStyle = "rgba(100, 120, 140, " + (0.08 * tunnelOpen) + ")";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(W / 2, cy, hw * 0.7, hh * 0.65, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Soft tissue side walls (organic, not flat slabs)
    function drawFleshWall(left) {
      var x0 = left ? 0 : wallR;
      var x1 = left ? wallL : W;
      var mid = left ? wallL : wallR;
      var grd = ctx.createLinearGradient(x0, 0, x1, 0);
      if (left) {
        grd.addColorStop(0, "#120404");
        grd.addColorStop(0.45, "#4a1814");
        grd.addColorStop(0.85, "#6a2820");
        grd.addColorStop(1, "#3a1010");
      } else {
        grd.addColorStop(0, "#3a1010");
        grd.addColorStop(0.15, "#6a2820");
        grd.addColorStop(0.55, "#4a1814");
        grd.addColorStop(1, "#120404");
      }
      ctx.fillStyle = grd;
      ctx.beginPath();
      if (left) {
        ctx.moveTo(0, 0);
        ctx.lineTo(wallL + Math.sin(time * 1.5) * 4, 0);
        for (var wy = 0; wy <= H; wy += 24) {
          ctx.lineTo(wallL + Math.sin(wy * 0.04 + scrollY * 0.02 + time) * 10 + Math.sin(wy * 0.11) * 6, wy);
        }
        ctx.lineTo(0, H);
      } else {
        ctx.moveTo(W, 0);
        ctx.lineTo(wallR + Math.sin(time * 1.5 + 1) * 4, 0);
        for (var wy2 = 0; wy2 <= H; wy2 += 24) {
          ctx.lineTo(wallR - Math.sin(wy2 * 0.04 + scrollY * 0.02 + time + 1) * 10 - Math.sin(wy2 * 0.11) * 6, wy2);
        }
        ctx.lineTo(W, H);
      }
      ctx.closePath();
      ctx.fill();

      // Mucosal sheen
      ctx.strokeStyle = "rgba(255, 180, 160, 0.1)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (var sh = 0; sh < 5; sh++) {
        var sy0 = ((scrollY * 0.4 + sh * 140) % (H + 100)) - 40;
        var sx0 = mid + (left ? -14 : 14);
        ctx.moveTo(sx0, sy0);
        ctx.quadraticCurveTo(sx0 + (left ? -18 : 18), sy0 + 40, sx0, sy0 + 90);
      }
      ctx.stroke();
    }
    drawFleshWall(true);
    drawFleshWall(false);

    // Wall impact dents / blood spatters (reads as real hits)
    var impacts = c.impacts || [];
    var v;
    for (v = 0; v < impacts.length; v++) {
      var hit = impacts[v];
      var hk = Math.max(0, hit.life / (hit.max || 0.85));
      ctx.save();
      ctx.translate(hit.x, hit.y);
      ctx.globalAlpha = hk;
      ctx.fillStyle = "rgba(90, 20, 20, 0.55)";
      ctx.beginPath();
      ctx.ellipse(hit.side === "L" ? 8 : -8, 0, 18 + (1 - hk) * 10, 28 + (1 - hk) * 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(180, 30, 40, " + (0.45 * hk) + ")";
      ctx.beginPath();
      ctx.ellipse(hit.side === "L" ? 4 : -4, 4, 10, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 120, 100, " + (0.35 * hk) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + (1 - hk) * 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Blood vessels (branching along walls)
    var vessels = c.vessels || [];
    for (v = 0; v < vessels.length; v++) {
      var vs = vessels[v];
      var baseX = vs.side === 0 ? wallL - 6 : wallR + 6;
      var vy = ((vs.y0 - scrollY * 0.7) % (H + 200)) - 80;
      var pulse = 0.55 + Math.sin(time * vs.pulse + vs.phase) * 0.45;
      ctx.strokeStyle = "rgba(" + Math.floor(140 + pulse * 80) + ", 20, 30, " + (0.35 + pulse * 0.35) + ")";
      ctx.lineWidth = vs.thick * (0.8 + pulse * 0.4);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(baseX, vy);
      var seg;
      for (seg = 1; seg <= 6; seg++) {
        var t = seg / 6;
        var ox = Math.sin(vs.phase + seg * 0.9 + time * 0.5) * vs.amp * (vs.side === 0 ? -1 : 1);
        ctx.lineTo(baseX + ox, vy + seg * 28);
      }
      ctx.stroke();
      // capillary branches
      ctx.lineWidth = Math.max(1, vs.thick * 0.45);
      ctx.strokeStyle = "rgba(180, 40, 50, " + (0.25 + pulse * 0.2) + ")";
      ctx.beginPath();
      ctx.moveTo(baseX + (vs.side === 0 ? -8 : 8), vy + 50);
      ctx.quadraticCurveTo(
        baseX + (vs.side === 0 ? -28 : 28),
        vy + 70,
        baseX + (vs.side === 0 ? -12 : 12),
        vy + 95
      );
      ctx.stroke();
    }

    // Blood droplets / spatters scrolling
    for (v = 0; v < 18; v++) {
      var bx = wallL + 20 + ((v * 97) % Math.max(20, wallR - wallL - 40));
      var by = ((v * 73 - scrollY * 0.9) % (H + 60)) - 20;
      ctx.fillStyle = "rgba(120, 10, 20, 0.45)";
      ctx.beginPath();
      ctx.ellipse(bx, by, 2 + (v % 3), 3 + (v % 2) * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tissue folds / uvula-like pendants from top during throat
    if (inThroat) {
      for (v = 0; v < 5; v++) {
        var px = wallL + 30 + v * ((wallR - wallL - 60) / 4);
        var pend = 30 + Math.sin(time * 2 + v) * 8 + (1 - tunnelOpen) * 20;
        var pg = ctx.createLinearGradient(px, 0, px, pend);
        pg.addColorStop(0, "#5a2018");
        pg.addColorStop(1, "#2a0a0a");
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.moveTo(px - 10, 0);
        ctx.quadraticCurveTo(px - 14, pend * 0.5, px, pend);
        ctx.quadraticCurveTo(px + 14, pend * 0.5, px + 10, 0);
        ctx.fill();
      }
    }

    // Warm light from maw entrance (above)
    var topLight = ctx.createRadialGradient(W / 2, -30, 8, W / 2, H * 0.35, H * 0.7);
    topLight.addColorStop(0, "rgba(255, 90, 50, " + (0.22 * (1 - depth * 0.4) * tunnelOpen) + ")");
    topLight.addColorStop(0.35, "rgba(160, 30, 30, " + (0.1 * tunnelOpen) + ")");
    topLight.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topLight;
    ctx.fillRect(0, 0, W, H);

    // Soft floor chamber — rises during final plunge so it doesn't pop in
    var floorRise = Math.max(c.floorRise || 0, c.softLand || 0, onFloor ? 1 : 0);
    var floorA = floorRise;
    var floorDrawY = floorY + (1 - floorRise) * (H * 0.42);
    if (floorA > 0.02) {
      ctx.globalAlpha = Math.min(1, 0.25 + floorA * 0.75);
      var flesh = ctx.createLinearGradient(0, floorDrawY, 0, H);
      flesh.addColorStop(0, "#6a3028");
      flesh.addColorStop(0.35, "#3a1814");
      flesh.addColorStop(1, "#140606");
      ctx.fillStyle = flesh;
      ctx.beginPath();
      ctx.moveTo(0, floorDrawY + 8);
      for (var fx = 0; fx <= W; fx += 24) {
        ctx.lineTo(fx, floorDrawY + 8 + Math.sin(fx * 0.05 + time * 2) * 5 + (c.softLand || 0) * Math.sin(fx * 0.08) * 10);
      }
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.fill();
      // vessels on floor
      ctx.strokeStyle = "rgba(160, 30, 40, " + (0.2 + floorA * 0.2) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W * 0.2, floorDrawY + 30);
      ctx.quadraticCurveTo(W * 0.4, floorDrawY + 50, W * 0.55, floorDrawY + 28);
      ctx.quadraticCurveTo(W * 0.7, floorDrawY + 60, W * 0.85, floorDrawY + 40);
      ctx.stroke();
      if ((c.softLand || 0) > 0.05) {
        ctx.fillStyle = "rgba(255, 100, 80, " + (0.14 * c.softLand) + ")";
        ctx.beginPath();
        ctx.ellipse(c.cmdX, floorY + 14, 55 + c.softLand * 35, 14 + c.softLand * 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (floorRise > 0.55 && (onFloor || (c.softLand || 0) > 0.15 || (c.seg === 2 && floorRise > 0.7))) {
        // Flesh cradle under the ship so it isn't floating in void
        var shipAlpha = Math.min(1, (floorRise - 0.55) / 0.35);
        ctx.globalAlpha = shipAlpha;
        ctx.fillStyle = "#3a1810";
        ctx.beginPath();
        ctx.ellipse(c.shipX + 10, floorY + 10, 78, 22, -0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#5a2820";
        ctx.beginPath();
        ctx.ellipse(c.shipX + 6, floorY + 4, 62, 14, -0.1, 0, Math.PI * 2);
        ctx.fill();
        var lamp = ctx.createRadialGradient(c.shipX + 30, c.shipY - 10, 4, c.shipX + 30, c.shipY - 10, 100);
        lamp.addColorStop(0, "rgba(255, 200, 120, 0.22)");
        lamp.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = lamp;
        ctx.fillRect(c.shipX - 90, c.shipY - 90, 220, 180);
        drawGulletShip(ctx, c.shipX, c.shipY, c.door, c.pilot, c.beat === "pilot" || (c.pilot || 0) > 0.1);
        ctx.globalAlpha = 1;
      }
    }

    // Drips
    var d;
    for (d = 0; d < (c.drips || []).length; d++) {
      var dr = c.drips[d];
      ctx.fillStyle = "rgba(160, 20, 30, " + Math.min(0.75, dr.life) + ")";
      ctx.beginPath();
      ctx.ellipse(dr.x, dr.y, 2.8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sparks
    for (d = 0; d < (c.sparks || []).length; d++) {
      var sk = c.sparks[d];
      ctx.fillStyle = sk.col || "#ffe08a";
      ctx.globalAlpha = Math.min(1, sk.life * 3);
      ctx.beginPath();
      ctx.arc(sk.x, sk.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if ((c.dust || 0) > 0) {
      for (d = 0; d < 12; d++) {
        ctx.fillStyle = "rgba(160, 60, 50, " + (c.dust * 0.4) + ")";
        ctx.beginPath();
        ctx.arc(c.cmdX + (d - 6) * 7, (onFloor ? floorY : c.cmdY) + 4 - (1 - c.dust) * 18, 2.5 + (d % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Commander (hidden during early swallow fade)
    var showCmd = (c.cmdAlpha == null || c.cmdAlpha > 0.05) && c.beat !== "pilot";
    if (inSwallow && (c.iris || 0) < 0.35) showCmd = false;
    if (showCmd) {
      ctx.save();
      ctx.globalAlpha = (c.cmdAlpha != null ? c.cmdAlpha : 1) * (inSwallow ? Math.min(1, (c.iris || 0) * 1.5) : 1);
      ctx.translate(c.cmdX, c.cmdY);
      var sq = c.squash || 0;
      if (sq > 0) ctx.scale(1 + sq * 0.35, 1 - sq * 0.4);
      if (c.beat === "throat" || c.beat === "fall") {
        var tumble = Math.atan2(c.cmdVy || 1, c.cmdVx || 0.01) + Math.PI / 2;
        ctx.rotate(tumble * 0.35 + Math.sin(time * 10) * 0.15);
        ctx.fillStyle = "rgba(255, 210, 74, 0.12)";
        ctx.beginPath();
        ctx.ellipse(0, -20, 9, 26, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (c.beat === "land" || c.beat === "daze" || c.beat === "rise") {
        ctx.rotate(c.cmdRot || Math.PI * 0.45);
        if ((c.prone || 0) > 0.2) ctx.scale(1 + c.prone * 0.15, 1 - c.prone * 0.25);
      } else if (c.beat === "stagger") {
        ctx.rotate((c.cmdRot || 0) + Math.sin(time * 10) * 0.06);
      } else if (c.beat === "spot") {
        ctx.rotate(-0.08);
      } else if (c.beat === "run") {
        ctx.rotate(0.12 + Math.sin(time * 18) * 0.06);
      }
      if (G.drawPlayerUnit) {
        try {
          var liveCmd = null;
          var ui;
          for (ui = 0; ui < (state.units || []).length; ui++) {
            if (state.units[ui] && state.units[ui].commander) {
              liveCmd = state.units[ui];
              break;
            }
          }
          var cmdDef = (liveCmd && liveCmd.def) || (G.UNIT_DEFS && G.UNIT_DEFS.comandante) || {
            size: 15, color: "#ffd24a", accent: "#fff4c4", short: "CMD", role: "commander"
          };
          G.drawPlayerUnit(ctx, {
            x: 0, y: 0, rot: 0, hp: 1, maxHp: 1, flash: 0, time: time,
            commander: true, def: cmdDef
          }, time);
        } catch (e1) {
          ctx.fillStyle = "#ffd24a";
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (c.beat === "daze" || c.beat === "rise" || c.beat === "stagger") {
        var look = c.lookT || 0;
        ctx.fillStyle = "rgba(255, 230, 160, " + (0.35 + Math.abs(look) * 0.25) + ")";
        ctx.beginPath();
        ctx.arc(10 + look * 6, -14, 3.2, 0, Math.PI * 2);
        ctx.fill();
        if (c.beat === "daze" && Math.sin(time * 3) > 0.2) {
          ctx.fillStyle = "rgba(255, 220, 120, 0.7)";
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("?", 18 + look * 4, -28);
        }
      }
      if (c.beat === "spot") {
        ctx.fillStyle = "#ffd24a";
        ctx.beginPath();
        ctx.ellipse(10, -16, 4, 3, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (c.beat === "walk" || c.beat === "run" || c.beat === "spot") {
        ctx.fillStyle = "#c4a06a";
        for (var sqi = 0; sqi < 3; sqi++) {
          ctx.beginPath();
          ctx.arc(-16 - sqi * 13, 10 + (sqi % 2) * 5, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    if (c.beat === "spot") {
      var ska = Math.min(1, (c.beatT || 0) / 0.25);
      ctx.save();
      ctx.translate(c.cmdX + 22, c.cmdY - 40);
      ctx.globalAlpha = ska;
      ctx.fillStyle = "#ffe08a";
      for (var spi = 0; spi < 3; spi++) {
        var sa = -Math.PI / 2 + (spi - 1) * 0.55;
        var sr = 10 + Math.sin(time * 14 + spi) * 3;
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = "rgba(255, 224, 138, 0.35)";
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(c.cmdX + 10, c.cmdY - 10);
      ctx.lineTo(c.shipX - 40, c.shipY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (c.beat === "pilot") {
      drawGulletShip(ctx, c.shipX, c.shipY, 1, c.pilot, true);
      ctx.fillStyle = "rgba(122, 240, 255, " + (c.pilot * 0.12) + ")";
      ctx.fillRect(0, 0, W, H);
      if (c.pilot > 0.35) {
        var hudA = (c.pilot - 0.35) * 1.2;
        ctx.strokeStyle = "rgba(122, 240, 255, " + Math.min(1, hudA) + ")";
        ctx.lineWidth = 2;
        ctx.strokeRect(W * 0.22, H * 0.16, W * 0.56, H * 0.1);
        for (var hb = 0; hb < 5; hb++) {
          ctx.fillStyle = "rgba(255, 220, 120, " + (0.35 + Math.sin(time * 10 + hb) * 0.35) + ")";
          ctx.fillRect(W * 0.26 + hb * (W * 0.1), H * 0.19, W * 0.08, 10);
        }
      }
      if (c.pilot > 0.75) {
        ctx.fillStyle = "rgba(255, 255, 255, " + ((c.pilot - 0.75) * 2.5) + ")";
        ctx.fillRect(0, 0, W, H);
      }
    }

    // Depth vignette
    var vig = ctx.createRadialGradient(W / 2, H * 0.4, H * 0.1, W / 2, H / 2, Math.max(W, H) * 0.75);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0, " + (0.4 + depth * 0.35) + ")");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // Swallow transition overlays
    if (inSwallow) {
      var fade = c.fade || 0;
      var iris = c.iris || 0;
      var ir = Math.max(8, Math.min(W, H) * 0.55 * Math.max(0.02, iris));
      ctx.save();
      // Even-odd iris: dark world with circular maw opening
      ctx.fillStyle = "rgba(6, 0, 0, " + (0.94 - iris * 0.55) + ")";
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(W / 2, H * 0.42, ir, 0, Math.PI * 2);
      ctx.fill("evenodd");
      // Fleshy rim of the mouth
      ctx.strokeStyle = "rgba(140, 30, 30, " + (0.65 * (1 - iris * 0.4)) + ")";
      ctx.lineWidth = 22 * (1 - iris * 0.5);
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.42, ir, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 100, 80, " + (0.2 * (1 - iris)) + ")";
      ctx.lineWidth = 6;
      ctx.stroke();
      // Early swallow: red wash
      if (fade > 0 && iris < 0.5) {
        ctx.fillStyle = "rgba(90, 0, 0, " + (0.4 * fade * (1 - iris * 2)) + ")";
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    }

    if ((c.bang || 0) > 0) {
      ctx.fillStyle = "rgba(255, 120, 100, " + (c.bang * 0.1) + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }


  function drawBossCinOverlay(ctx, state, g, time, W, H) {
    var c = g.bossCin;
    if (!c) return;
    var wall = c.wall || 0;
    var fade = c.fade || 0;
    var flash = c.flash || 0;
    var titleA = c.titleA || 0;
    if (c.kind === "valve" && wall > 0.02) {
      var squeeze = wall * wall;
      ctx.fillStyle = "rgba(18, 4, 4, " + (0.35 + squeeze * 0.45) + ")";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W * (0.18 + squeeze * 0.12), 0);
      ctx.quadraticCurveTo(W * (0.08 + squeeze * 0.1), H * 0.5, W * (0.18 + squeeze * 0.12), H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(W, 0);
      ctx.lineTo(W * (0.62 - squeeze * 0.05), 0);
      ctx.quadraticCurveTo(W * (0.78 - squeeze * 0.08), H * 0.5, W * (0.62 - squeeze * 0.05), H);
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      // Teeth from the closing throat
      var ti;
      ctx.fillStyle = "rgba(200, 170, 140, " + (0.35 + squeeze * 0.4) + ")";
      for (ti = 0; ti < 10; ti++) {
        var ty = (ti / 9) * H;
        ctx.beginPath();
        ctx.moveTo(W * (0.55 - squeeze * 0.08), ty);
        ctx.lineTo(W * (0.48 - squeeze * 0.1), ty + 14);
        ctx.lineTo(W * (0.55 - squeeze * 0.08), ty + 28);
        ctx.fill();
      }
    }
    if (c.kind === "heart" && (c.beat === "rush" || fade > 0.05)) {
      var rush = c.rush || 0;
      var ri;
      for (ri = 0; ri < 8; ri++) {
        var rx = ((ri * 90 - (g.scroll || 0) * 0.8) % (W + 90)) - 40;
        ctx.strokeStyle = "rgba(100, 30, 24, " + (0.25 + rush * 0.35) + ")";
        ctx.lineWidth = 22 + rush * 18;
        ctx.beginPath();
        ctx.ellipse(rx, H / 2, 24 + rush * 30, H * (0.38 + rush * 0.08), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (fade > 0.02) {
      ctx.fillStyle = "rgba(8, 2, 2, " + Math.min(0.92, fade) + ")";
      ctx.fillRect(0, 0, W, H);
    }
    if (flash > 0.02) {
      ctx.fillStyle = "rgba(255, 200, 160, " + Math.min(0.75, flash) + ")";
      ctx.fillRect(0, 0, W, H);
    }
    if (titleA > 0.02 && state.banner && state.banner.text) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, titleA) * Math.min(1, state.banner.t || 1);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 34px Segoe UI, sans-serif";
      var label = state.banner.text;
      var tw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(6, 4, 8, 0.55)";
      ctx.fillRect(W / 2 - tw / 2 - 18, H * 0.18 - 22, tw + 36, 44);
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = 5;
      ctx.strokeText(label, W / 2, H * 0.18);
      ctx.fillStyle = "#ffd24a";
      ctx.fillText(label, W / 2, H * 0.18);
      ctx.restore();
    }
  }

  function drawGulletValve(ctx, v, time, W, H) {
    var open = Math.max(0.05, Math.min(1, v.open != null ? v.open : 0.4));
    var petals = v.petals || 7;
    var ang = v.ang || 0;
    ctx.fillStyle = "rgba(8, 2, 2, 0.45)";
    ctx.beginPath();
    ctx.ellipse(v.x + 8, v.y + v.r * 0.85, v.r * 0.95, v.r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(v.x, v.y);
    var layer;
    for (layer = 3; layer >= 0; layer--) {
      var lk = layer / 3;
      var z = 0.72 + lk * 0.28;
      var rr = v.r * (0.78 + lk * 0.28);
      ctx.save();
      ctx.scale(z, z * (0.88 + lk * 0.08));
      ctx.rotate(ang * (0.3 + lk * 0.25));
      var ring = ctx.createRadialGradient(0, 0, rr * 0.35, 0, 0, rr);
      ring.addColorStop(0, "rgba(40, 12, 10, " + (0.15 + lk * 0.2) + ")");
      ring.addColorStop(0.45, "rgba(" + Math.floor(70 + lk * 30) + ", " + Math.floor(28 + lk * 8) + ", 24, 0.85)");
      ring.addColorStop(1, "rgba(10, 4, 4, 0.95)");
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.arc(0, 0, rr * (0.28 + open * 0.42), 0, Math.PI * 2, true);
      ctx.fill("evenodd");
      var p;
      for (p = 0; p < petals; p++) {
        var pa = (p / petals) * Math.PI * 2;
        var wedge = Math.PI / petals;
        ctx.save();
        ctx.rotate(pa);
        var isWeak = layer === 0 && (v.weakPetal | 0) === p && (v.weakT || 0) > 0;
        var plate = ctx.createLinearGradient(0, 0, rr, 0);
        if (isWeak) {
          plate.addColorStop(0, "#4a2038");
          plate.addColorStop(0.45, "#ff7ad9");
          plate.addColorStop(1, "#ffe0f4");
        } else {
          plate.addColorStop(0, "#2a3038");
          plate.addColorStop(0.4, "#6a7888");
          plate.addColorStop(1, "#c8d4e0");
        }
        ctx.fillStyle = plate;
        ctx.beginPath();
        ctx.moveTo(rr * (0.3 + open * 0.35), 0);
        ctx.arc(0, 0, rr * 0.92, -wedge * 0.42, wedge * 0.42);
        ctx.closePath();
        ctx.fill();
        if (isWeak) {
          ctx.strokeStyle = "rgba(255, 122, 217, " + (0.55 + Math.sin(time * 14) * 0.35) + ")";
          ctx.lineWidth = 3;
          ctx.stroke();
        } else {
          ctx.strokeStyle = "rgba(20, 24, 28, 0.55)";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        ctx.fillStyle = isWeak ? "#fff0ff" : "#e8dcc8";
        ctx.beginPath();
        ctx.moveTo(rr * 0.88, 0);
        ctx.lineTo(rr * 0.72, -6);
        ctx.lineTo(rr * 0.72, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      if (layer === 0) {
        var hole = rr * (0.22 + open * 0.48);
        var throat = ctx.createRadialGradient(-hole * 0.2, -hole * 0.15, 2, 0, 0, hole);
        throat.addColorStop(0, "#1a0808");
        throat.addColorStop(0.5, "#4a1010");
        throat.addColorStop(1, "#0a0202");
        ctx.fillStyle = throat;
        ctx.beginPath();
        ctx.ellipse(0, 0, hole, hole * 0.82, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 180, 160, 0.25)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, hole * 0.95, hole * 0.78, 0, -0.8, 0.6);
        ctx.stroke();
        if ((v.guard || 0) > 0) {
          ctx.strokeStyle = "rgba(140, 180, 120, " + Math.min(0.7, v.guard) + ")";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, rr + 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    ctx.strokeStyle = "rgba(120, 40, 35, 0.55)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-v.r * 0.2, -v.r * 1.05);
    ctx.quadraticCurveTo(-v.r * 1.3, -v.r * 0.4, -v.r * 1.15, v.r * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(v.r * 0.15, -v.r * 1.0);
    ctx.quadraticCurveTo(v.r * 1.25, -v.r * 0.2, v.r * 1.1, v.r * 0.7);
    ctx.stroke();
    ctx.strokeStyle = "rgba(80, 100, 120, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-v.r * 0.2, -v.r * 1.05);
    ctx.quadraticCurveTo(-v.r * 1.3, -v.r * 0.4, -v.r * 1.15, v.r * 0.6);
    ctx.stroke();
    if ((v.suck || 0) > 0) {
      ctx.globalCompositeOperation = "lighter";
      var wi;
      for (wi = 0; wi < 8; wi++) {
        var wa = -Math.PI + (wi / 8) * Math.PI * 0.9 + time * 3;
        ctx.strokeStyle = "rgba(180, 220, 255, 0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-v.r * 1.6, Math.sin(wa) * 40);
        ctx.quadraticCurveTo(-v.r * 0.8, Math.sin(wa + 1) * 20, -v.r * 0.25, 0);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    }
    if (v.enraged) {
      ctx.strokeStyle = "rgba(255, 80, 40, " + (0.25 + Math.sin(time * 10) * 0.15) + ")";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, v.r + 18, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGulletHeart(ctx, h, time, W, H) {
    var beat = 1 + Math.sin(time * 5.2) * 0.05;
    var tilt = h.tilt != null ? h.tilt : 0.2;
    ctx.fillStyle = "rgba(6, 2, 2, 0.5)";
    ctx.beginPath();
    ctx.ellipse(h.x + 10, h.y + h.r * 0.95, h.r * 1.05, h.r * 0.32, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(-tilt * 0.35);
    ctx.scale(beat, beat * 0.92);
    if ((h.guard || 0) > 0) {
      ctx.strokeStyle = "rgba(100, 140, 110, 0.5)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 4, h.r + 18, (h.r + 18) * 0.78, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    function lobe(ox, oy, rx, ry, rot, col0, col1) {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(rot);
      var g = ctx.createRadialGradient(-rx * 0.35, -ry * 0.4, 2, 0, 0, rx);
      g.addColorStop(0, col0);
      g.addColorStop(0.55, col1);
      g.addColorStop(1, "#060804");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 220, 180, 0.12)";
      ctx.beginPath();
      ctx.ellipse(-rx * 0.25, -ry * 0.35, rx * 0.35, ry * 0.22, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    lobe(-18, 8, h.r * 0.55, h.r * 0.42, -0.5, "#2a3a18", "#121808");
    lobe(22, 10, h.r * 0.5, h.r * 0.4, 0.55, "#243214", "#0e1408");
    lobe(0, 4, h.r * 0.92, h.r * 0.72, 0.08, "#4a6a32", "#1a2810");
    lobe(-6, -6, h.r * 0.62, h.r * 0.5, -0.15, "#6a8a48", "#2a3c18");
    ctx.save();
    ctx.rotate(0.1);
    var strap;
    for (strap = 0; strap < 3; strap++) {
      var sy = -h.r * 0.35 + strap * h.r * 0.32;
      var sg = ctx.createLinearGradient(-h.r, sy, h.r, sy);
      sg.addColorStop(0, "rgba(30, 36, 42, 0)");
      sg.addColorStop(0.2, "#3a4550");
      sg.addColorStop(0.5, "#a8b8c8");
      sg.addColorStop(0.8, "#3a4550");
      sg.addColorStop(1, "rgba(30, 36, 42, 0)");
      ctx.fillStyle = sg;
      ctx.fillRect(-h.r * 0.95, sy - 5, h.r * 1.9, 10);
      ctx.fillStyle = "#1a2228";
      ctx.fillRect(-h.r * 0.2 + strap * 8, sy - 3, 6, 6);
    }
    ctx.restore();
    var tube;
    for (tube = 0; tube < 3; tube++) {
      var tx = -16 + tube * 16;
      var tw = 7 - tube * 0.8;
      var tg = ctx.createLinearGradient(tx, -h.r * 0.2, tx, -h.r * 1.35);
      tg.addColorStop(0, "#5a3028");
      tg.addColorStop(0.5, "#3a1814");
      tg.addColorStop(1, "#1a0808");
      ctx.strokeStyle = tg;
      ctx.lineWidth = tw;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tx, -h.r * 0.25);
      ctx.bezierCurveTo(tx - 8, -h.r * 0.6, tx + 10, -h.r * 0.95, tx + (tube - 1) * 12, -h.r * 1.35);
      ctx.stroke();
      ctx.strokeStyle = "rgba(160, 80, 70, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = "#8a9aaa";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(tx, -h.r * 0.45 - tube * 4, tw * 0.9, tw * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(10, 6, 4, 0.7)";
    ctx.lineWidth = 2;
    var os;
    for (os = 0; os < 4; os++) {
      var oy = -h.r * 0.15 + os * h.r * 0.22;
      ctx.beginPath();
      ctx.ellipse(h.r * 0.35, oy, 5, 2.5, 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 200, 170, 0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-h.r * 0.15, -h.r * 0.1, h.r * 0.55, h.r * 0.35, -0.3, -1, 1.2);
    ctx.stroke();
    ctx.globalCompositeOperation = "lighter";
    var pulse = 0.55 + Math.sin(time * 7) * 0.35;
    ctx.fillStyle = "rgba(160, 220, 60, " + (0.2 * pulse) + ")";
    ctx.beginPath();
    ctx.ellipse(2, 6, 16 + pulse * 4, 11 + pulse * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 80, 60, " + (0.12 * pulse) + ")";
    ctx.beginPath();
    ctx.ellipse(-8, 0, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#4a5560";
    ctx.beginPath();
    ctx.arc(h.r * 0.15, -h.r * 0.05, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d0dde8";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#1a2228";
    ctx.beginPath();
    ctx.arc(h.r * 0.15, -h.r * 0.05, 3, 0, Math.PI * 2);
    ctx.fill();
    var oi;
    for (oi = 0; oi < (h.ostia || []).length; oi++) {
      var os = h.ostia[oi];
      var ox = Math.cos(os.a) * (h.r * 0.7);
      var oy = Math.sin(os.a) * (h.r * 0.55);
      if ((os.lit || 0) > 0 || (os.hurt || 0) > 0) {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = (os.hurt || 0) > 0
          ? "rgba(255, 220, 100, 0.7)"
          : "rgba(168, 255, 74, " + (0.35 + Math.sin(time * 12) * 0.25) + ")";
        ctx.beginPath();
        ctx.ellipse(ox, oy, 9, 6, os.a, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 122, 217, 0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(ox, oy, 12, 8, os.a, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      }
    }
    if ((h.pulseFlash || 0) > 0) {
      ctx.fillStyle = "rgba(255, 120, 80, " + (h.pulseFlash * 0.35) + ")";
      ctx.beginPath();
      ctx.ellipse(0, 4, h.r * 1.1, h.r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    var td;
    for (td = 0; td < (h.tendrils || []).length; td++) {
      var ten = h.tendrils[td];
      ctx.strokeStyle = "rgba(90, 40, 50, 0.85)";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.quadraticCurveTo(
        h.x + Math.cos(ten.ang + 0.5) * ten.len * 0.5,
        h.y + Math.sin(ten.ang + 0.5) * ten.len * 0.4,
        ten.x || h.x,
        ten.y || h.y
      );
      ctx.stroke();
      ctx.strokeStyle = "rgba(180, 60, 70, 0.45)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#3a1810";
      ctx.beginPath();
      ctx.arc(ten.x || h.x, ten.y || h.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a8ff4a";
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.arc(ten.x || h.x, ten.y || h.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
    for (td = 0; td < (h.mites || []).length; td++) {
      var mite = h.mites[td];
      ctx.save();
      ctx.translate(mite.x, mite.y);
      ctx.fillStyle = "rgba(20,8,4,0.35)";
      ctx.beginPath();
      ctx.ellipse(2, 5, 9, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5a3418";
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.arc(4, -1, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (td = 0; td < (h.lasers || []).length; td++) {
      var lz = h.lasers[td];
      var firing = lz.t > lz.tell && lz.t < lz.tell + lz.fire;
      var telling = lz.t <= lz.tell;
      ctx.save();
      ctx.translate(lz.x0, lz.y0);
      ctx.rotate(lz.ang);
      if (telling) {
        ctx.strokeStyle = "rgba(122, 240, 255, " + (0.25 + Math.sin(time * 18) * 0.15) + ")";
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(lz.len, 0);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (firing) {
        ctx.globalCompositeOperation = "lighter";
        var lg = ctx.createLinearGradient(0, 0, lz.len, 0);
        lg.addColorStop(0, "rgba(200, 255, 255, 0.9)");
        lg.addColorStop(0.5, "rgba(122, 240, 255, 0.55)");
        lg.addColorStop(1, "rgba(122, 240, 255, 0)");
        ctx.fillStyle = lg;
        ctx.fillRect(0, -10, lz.len, 20);
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.fillRect(0, -3, lz.len, 6);
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.restore();
    }
  }

  function drawArklanGullet(ctx, state) {
    var g = state.arklanGullet;
    if (!g) return;
    var W = state.W;
    var H = state.H;
    var time = state.time || 0;
    ctx.save();
    // organic tunnel background
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#1a0808");
    bg.addColorStop(0.5, "#3a1410");
    bg.addColorStop(1, "#120606");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // peristalsis rings scrolling
    var scroll = g.scroll || 0;
    for (var r = 0; r < 12; r++) {
      var rx = ((r * 140 - (scroll * 0.6) % 140) + W) % (W + 140) - 40;
      ctx.strokeStyle = "rgba(120, 40, 30, " + (0.35 + Math.sin(time * 2 + r) * 0.1) + ")";
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.ellipse(rx, H / 2, 30, H * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(80, 100, 120, 0.25)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(rx, H / 2, 22, H * 0.36, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // floor/ceiling flesh
    ctx.fillStyle = "#2a0c0a";
    ctx.fillRect(0, 0, W, 48);
    ctx.fillRect(0, H - 48, W, 48);
    ctx.fillStyle = "#4a2018";
    for (var tooth = 0; tooth < 18; tooth++) {
      var tx = tooth * 70 - (scroll * 0.4) % 70;
      ctx.beginPath();
      ctx.moveTo(tx, 48);
      ctx.lineTo(tx + 18, 72);
      ctx.lineTo(tx + 36, 48);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tx + 20, H - 48);
      ctx.lineTo(tx + 38, H - 72);
      ctx.lineTo(tx + 56, H - 48);
      ctx.fill();
    }

    if (g.phase === "cin" || g.phase === "enter" || g.phase === "findShip") {
      drawGulletCinematic(ctx, state, g, time);
      ctx.restore();
      return;
    }

    // obstacles
    for (var o = 0; o < (g.obstacles || []).length; o++) {
      var rib = g.obstacles[o];
      var ox = rib.x - scroll;
      if (ox < -80 || ox > W + 80) continue;
      drawGulletObstacle(ctx, rib, ox, time, H);
    }

    // foes
    for (var f = 0; f < (g.foes || []).length; f++) {
      var fo = g.foes[f];
      if (fo.hp <= 0) continue;
      var fx = fo.x - scroll;
      if (fx < -80 || fx > W + 80) continue;
      ctx.save();
      ctx.translate(fx, fo.y);
      drawGulletFoe(ctx, fo, time);
      if (!fo.vent) {
        var barW = Math.max(22, fo.r * 1.4);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(-barW * 0.5, -fo.r - 14, barW, 4);
        ctx.fillStyle = "#ff6a3a";
        ctx.fillRect(-barW * 0.5, -fo.r - 14, barW * Math.max(0, fo.hp / fo.maxHp), 4);
      }
      ctx.restore();
    }

    // shots
    for (var s = 0; s < (g.shots || []).length; s++) {
      var sh = g.shots[s];
      ctx.save();
      ctx.translate(sh.x, sh.y);
      if (sh.enemy) {
        if (sh.parry) {
          // Cuphead-style pink parry orb
          var pulse = 0.75 + Math.sin(time * 14 + sh.x * 0.05) * 0.25;
          ctx.fillStyle = "rgba(255, 120, 210, " + (0.25 * pulse) + ")";
          ctx.beginPath();
          ctx.arc(0, 0, 12 * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ff7ad9";
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffe0f4";
          ctx.beginPath();
          ctx.arc(-1.5, -1.5, 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (sh.color === "#8ad422") {
          ctx.fillStyle = "rgba(140, 220, 60, 0.35)";
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#8ad422";
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.rotate(Math.atan2(sh.vy || 0, sh.vx || -1));
          ctx.fillStyle = sh.color || "#ff8a40";
          ctx.beginPath();
          ctx.moveTo(8, 0);
          ctx.lineTo(-4, -4);
          ctx.lineTo(-2, 0);
          ctx.lineTo(-4, 4);
          ctx.closePath();
          ctx.fill();
        }
      } else if (sh.kind === "bomb") {
        var br = sh.r || 7;
        ctx.fillStyle = "rgba(122, 240, 255, 0.25)";
        ctx.beginPath();
        ctx.arc(0, 0, br + 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#7af0ff";
        ctx.beginPath();
        ctx.arc(0, 0, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#e8ffff";
        ctx.beginPath();
        ctx.arc(-br * 0.25, -br * 0.25, br * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (sh.kind === "ex" || sh.kind === "reflect") {
        ctx.fillStyle = "rgba(255, 122, 217, 0.35)";
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff7ad9";
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-6, -7);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-6, 7);
        ctx.closePath();
        ctx.fill();
      } else {
        // peashooter
        ctx.fillStyle = "#ffe08a";
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 240, 160, 0.5)";
        ctx.beginPath();
        ctx.ellipse(-5, 0, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    var pl = g.plane || ensureGulletPlane(g);

    // Hazards (crush walls / saws / shockwaves) — 2D arena props
    if (g.phase === "valve" || g.phase === "heart") {
      drawGulletHazards(ctx, g, time, W, H);
    }
    // Valve ghost during heart tear cin
    if (g.phase === "heart_cin" && g.valveGhost) {
      var vg = g.valveGhost;
      drawGulletValve(ctx, {
        x: vg.x,
        y: vg.y,
        r: vg.r,
        open: vg.open,
        ang: vg.ang || 0,
        petals: 7,
        weakPetal: -1,
        weakT: 0,
        guard: 0,
        pulse: 0.5
      }, time, W, H);
    }
    // Valve behind the craft (+ reveal cin)
    if ((g.phase === "valve" || g.phase === "miniboss" || g.phase === "valve_cin") && g.valve) {
      drawGulletValve(ctx, g.valve, time, W, H);
    }
    // Heart behind craft during arena (+ reveal cin)
    if ((g.phase === "heart" || g.phase === "heart_cin" || g.phase === "death_cin") && g.heart) {
      drawGulletHeart(ctx, g.heart, time, W, H);
    }
    // Boss cinematic overlays (walls / fade / title)
    if ((g.phase === "valve_cin" || g.phase === "heart_cin") && g.bossCin) {
      drawBossCinOverlay(ctx, state, g, time, W, H);
    }

    // Dash afterimages
    for (var tr = 0; tr < (pl.trails || []).length; tr++) {
      var trail = pl.trails[tr];
      ctx.globalAlpha = Math.max(0, trail.life / (trail.max || 0.22)) * 0.35;
      ctx.fillStyle = "#7af0ff";
      ctx.beginPath();
      ctx.moveTo(trail.x + 18, trail.y);
      ctx.lineTo(trail.x - 12, trail.y - 10);
      ctx.lineTo(trail.x - 8, trail.y);
      ctx.lineTo(trail.x - 12, trail.y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Plane craft — cuphead-ish scrap fighter
    ctx.save();
    ctx.translate(state.squad.x, state.squad.y);
    if ((pl.flash || 0) > 0) ctx.globalAlpha = 0.55 + Math.sin(time * 40) * 0.35;
    // Wings
    ctx.fillStyle = "#4a5560";
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-18, -22);
    ctx.lineTo(8, -10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-18, 22);
    ctx.lineTo(8, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#c8d4e0";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Fuselage
    var hg = ctx.createLinearGradient(-22, 0, 30, 0);
    hg.addColorStop(0, "#2a3038");
    hg.addColorStop(0.45, "#6a7888");
    hg.addColorStop(1, "#d0dde8");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(8, -11);
    ctx.lineTo(-22, -7);
    ctx.lineTo(-28, 0);
    ctx.lineTo(-22, 7);
    ctx.lineTo(8, 11);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#e8f0f8";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Rivets / plate seams
    ctx.strokeStyle = "rgba(20, 24, 30, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(-10, 6);
    ctx.moveTo(2, -8);
    ctx.lineTo(2, 8);
    ctx.stroke();
    // Cockpit
    ctx.fillStyle = "#7af0ff";
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    ctx.ellipse(10, 0, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#1a2838";
    ctx.beginPath();
    ctx.arc(9, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Prop / spinner
    ctx.strokeStyle = "rgba(255, 220, 140, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, -10 - Math.sin(time * 40) * 2);
    ctx.lineTo(30, 10 + Math.sin(time * 40) * 2);
    ctx.stroke();
    // Thruster
    var thr = 18 + Math.sin(time * 30) * 6 + ((pl.dashT || 0) > 0 ? 14 : 0);
    ctx.fillStyle = (pl.dashT || 0) > 0 ? "rgba(122, 240, 255, 0.9)" : "rgba(255, 140, 40, 0.8)";
    ctx.beginPath();
    ctx.moveTo(-28, -6);
    ctx.lineTo(-28 - thr, 0);
    ctx.lineTo(-28, 6);
    ctx.fill();
    // Energy shield
    if ((pl.shieldT || 0) > 0) {
      var sk = pl.shieldT / 0.38;
      ctx.strokeStyle = "rgba(255, 122, 217, " + (0.45 + sk * 0.4) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 26 + Math.sin(time * 20) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(122, 240, 255, " + (0.25 * sk) + ")";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Charge telegraph on craft
    if ((pl.charge || 0) > 0.05) {
      ctx.strokeStyle = "rgba(122, 240, 255, " + (0.3 + pl.charge * 0.5) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(18, 0, 8 + pl.charge * 10, 0, Math.PI * 2 * pl.charge);
      ctx.stroke();
    }
    ctx.restore();

    // Plane HUD — card + hints
    if (g.phase === "scroll" || g.phase === "heart" || g.phase === "valve") {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(14, H - 52, 150, 36);
      ctx.strokeStyle = "rgba(255, 122, 217, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(14, H - 52, 150, 36);
      ctx.fillStyle = "#ff7ad9";
      ctx.fillRect(20, H - 36, 138 * Math.max(0, Math.min(1, pl.card || 0)), 10);
      ctx.fillStyle = "#ffe0f4";
      ctx.font = "600 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText((pl.card || 0) >= 1 ? "EX pronto · E" : "Carta EX", 20, H - 40);
      ctx.fillStyle = "rgba(200, 220, 240, 0.55)";
      ctx.font = "10px sans-serif";
      ctx.fillText("Shift dash · Espaço escudo · Esq/Dir tiro", 14, H - 10);
    }

    // Parry FX rings / sparks
    if (pl.parryFx && pl.parryFx.length) {
      var pfi;
      for (pfi = 0; pfi < pl.parryFx.length; pfi++) {
        var pfx = pl.parryFx[pfi];
        var pk = Math.max(0, pfx.life / (pfx.max || 0.4));
        if (pfx.spark) {
          ctx.globalAlpha = pk;
          ctx.fillStyle = pfx.col || "#ff7ad9";
          ctx.beginPath();
          ctx.arc(pfx.x, pfx.y, 2.5 + pk * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          var rad = (pfx.big ? 28 : 18) + (1 - pk) * (pfx.big ? 55 : 36);
          ctx.strokeStyle = "rgba(255, 122, 217, " + (0.75 * pk) + ")";
          ctx.lineWidth = 3 + pk * 3;
          ctx.beginPath();
          ctx.arc(pfx.x, pfx.y, rad, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = "rgba(255, 224, 138, " + (0.45 * pk) + ")";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pfx.x, pfx.y, rad * 0.65, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "rgba(255, 255, 255, " + (0.2 * pk) + ")";
          ctx.beginPath();
          ctx.arc(pfx.x, pfx.y, 6 * pk, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // —— Valve/heart already drawn behind craft ——

    if (g.phase === "death_cin" && g.death) {
      var dth = g.death;
      var sci;
      for (sci = 0; sci < (dth.scraps || []).length; sci++) {
        var sc = dth.scraps[sci];
        ctx.globalAlpha = Math.max(0, Math.min(1, sc.life * 2));
        ctx.fillStyle = sc.col || "#c8d4e0";
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, 2 + (sc.life || 0) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if ((dth.crack || 0) > 0.05 && g.heart) {
        ctx.strokeStyle = "rgba(255, 200, 160, " + (0.25 + dth.crack * 0.45) + ")";
        ctx.lineWidth = 2;
        var cr;
        for (cr = 0; cr < 5; cr++) {
          var ca = cr * 1.1 + dth.beatT * 2;
          ctx.beginPath();
          ctx.moveTo(g.heart.x, g.heart.y);
          ctx.lineTo(
            g.heart.x + Math.cos(ca) * g.heart.r * (0.5 + dth.crack),
            g.heart.y + Math.sin(ca) * g.heart.r * (0.4 + dth.crack * 0.6)
          );
          ctx.stroke();
        }
      }
      if (dth.beat === "eject") {
        var rush = dth.rush || 0;
        var ri;
        for (ri = 0; ri < 10; ri++) {
          var ry = ((ri * 70 + (g.t || 0) * 400) % (H + 80)) - 40;
          ctx.strokeStyle = "rgba(120, 40, 30, " + (0.2 + rush * 0.4) + ")";
          ctx.lineWidth = 16 + rush * 20;
          ctx.beginPath();
          ctx.ellipse(W / 2, ry, W * (0.28 + rush * 0.2), 18 + rush * 10, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      if ((dth.flash || 0) > 0.02) {
        ctx.fillStyle = "rgba(255, 210, 170, " + Math.min(0.85, dth.flash) + ")";
        ctx.fillRect(0, 0, W, H);
      }
      if ((dth.fade || 0) > 0.02) {
        ctx.fillStyle = "rgba(12, 4, 4, " + Math.min(0.96, dth.fade) + ")";
        ctx.fillRect(0, 0, W, H);
      }
      if ((dth.iris || 0) > 0.02) {
        var ir = dth.iris;
        ctx.fillStyle = "rgba(6, 2, 2, 0.92)";
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.ellipse(W / 2, H * (0.35 - ir * 0.5), W * (0.55 - ir * 0.35), H * (0.4 - ir * 0.25), 0, 0, Math.PI * 2, true);
        ctx.fill("evenodd");
      }
    } else if (g.phase === "outro") {
      ctx.fillStyle = "rgba(255, 220, 160, " + Math.min(0.95, g.flash || 0.5) + ")";
      ctx.fillRect(0, 0, W, H);
    }

    // vignette
    var vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.75);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
})(window.TFAG = window.TFAG || {});
