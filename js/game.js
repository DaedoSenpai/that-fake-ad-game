(function (G) {
  G.THEMES = {
    field: { ground: "#24361f", grid: "#314a2b", fog: "rgba(40,70,30,0.18)" },
    city: { ground: "#1d2230", grid: "#2a3144", fog: "rgba(20,30,50,0.22)" },
    desert: { ground: "#4a3a22", grid: "#5c4a2c", fog: "rgba(90,70,30,0.16)" },
    night: { ground: "#101628", grid: "#182036", fog: "rgba(10,16,40,0.28)" }
  };

  G.STAGES = [
    {
      name: "Campo aberto",
      theme: "field",
      bg: "img/bg-01-campo.png",
      waves: [
        [{ type: "infantaria", n: 3 }],
        [{ type: "infantaria", n: 4 }, { type: "corredor", n: 2 }],
        [{ type: "infantaria", n: 5 }, { type: "corredor", n: 3 }, { type: "kamikaze", n: 1 }],
        [{ type: "chefe_invasao", n: 1 }, { type: "infantaria", n: 2 }]
      ]
    },
    {
      name: "Linha de frente",
      theme: "field",
      bg: "img/bg-02-linha.png",
      waves: [
        [{ type: "infantaria", n: 5 }, { type: "atirador", n: 1 }],
        [{ type: "corredor", n: 5 }, { type: "escudeiro", n: 1 }, { type: "medico", n: 1 }],
        [{ type: "infantaria", n: 4 }, { type: "atirador", n: 2 }, { type: "kamikaze", n: 2 }],
        [{ type: "chefe_comandante", n: 1 }, { type: "infantaria", n: 3 }]
      ]
    },
    {
      name: "Ruínas da cidade",
      theme: "city",
      bg: "img/bg-03-ruinas.png",
      waves: [
        [{ type: "infantaria", n: 5 }, { type: "escudeiro", n: 1 }, { type: "sombra", n: 2 }],
        [{ type: "atirador", n: 3 }, { type: "corredor", n: 4 }, { type: "fragmento", n: 2 }],
        [{ type: "ninho", n: 1 }, { type: "infantaria", n: 4 }, { type: "drone", n: 2 }],
        [{ type: "tanque", n: 1 }, { type: "atirador", n: 2 }, { type: "parasita", n: 2 }, { type: "corredor", n: 3 }],
        [{ type: "chefe_vulto", n: 1 }, { type: "sombra", n: 2 }]
      ]
    },
    {
      name: "Avenida sitiada",
      theme: "city",
      bg: "img/bg-04-avenida.png",
      waves: [
        [{ type: "drone", n: 4 }, { type: "kamikaze", n: 3 }, { type: "sombra", n: 2 }],
        [{ type: "escudeiro", n: 3 }, { type: "medico", n: 1 }, { type: "artilharia", n: 1 }],
        [{ type: "tanque", n: 1 }, { type: "fragmento", n: 3 }, { type: "sniper", n: 1 }],
        [{ type: "chefe_megatanque", n: 1 }, { type: "infantaria", n: 3 }, { type: "parasita", n: 2 }]
      ]
    },
    {
      name: "Deserto",
      theme: "desert",
      bg: "img/bg-05-deserto.png",
      waves: [
        [{ type: "corredor", n: 7 }, { type: "criomante", n: 2 }],
        [{ type: "tanque", n: 1 }, { type: "ninho", n: 1 }, { type: "drone", n: 3 }],
        [{ type: "artilharia", n: 2 }, { type: "escudeiro", n: 2 }, { type: "kamikaze", n: 3 }],
        [{ type: "sniper", n: 2 }, { type: "fragmento", n: 3 }, { type: "medico", n: 1 }],
        [{ type: "chefe_arklan", n: 1 }]
      ]
    },
    {
      name: "Dunas escaldantes",
      theme: "desert",
      bg: "img/bg-06-dunas.png",
      waves: [
        [{ type: "drone", n: 5 }, { type: "sombra", n: 3 }, { type: "criomante", n: 2 }],
        [{ type: "tanque", n: 2 }, { type: "artilharia", n: 2 }, { type: "parasita", n: 3 }],
        [{ type: "ninho", n: 2 }, { type: "corredor", n: 6 }, { type: "kamikaze", n: 3 }],
        [{ type: "chefe_fortaleza", n: 1 }, { type: "drone", n: 3 }, { type: "medico", n: 1 }]
      ]
    },
    {
      name: "Base noturna",
      theme: "night",
      bg: "img/bg-07-base.png",
      waves: [
        [{ type: "sombra", n: 5 }, { type: "sniper", n: 2 }],
        [{ type: "ninho", n: 1 }, { type: "parasita", n: 4 }, { type: "criomante", n: 2 }],
        [{ type: "tanque", n: 2 }, { type: "artilharia", n: 2 }, { type: "escudeiro", n: 3 }],
        [{ type: "fragmento", n: 4 }, { type: "kamikaze", n: 4 }, { type: "drone", n: 3 }],
        [{ type: "chefe_espectro", n: 1 }, { type: "sombra", n: 3 }]
      ]
    },
    {
      name: "Núcleo inimigo",
      theme: "night",
      bg: "img/bg-08-nucleo.png",
      waves: [
        [{ type: "escudeiro", n: 3 }, { type: "sniper", n: 2 }, { type: "artilharia", n: 2 }, { type: "medico", n: 1 }],
        [{ type: "ninho", n: 2 }, { type: "tanque", n: 1 }, { type: "kamikaze", n: 5 }, { type: "parasita", n: 3 }],
        [{ type: "chefe_final", n: 1 }, { type: "sombra", n: 2 }, { type: "criomante", n: 2 }]
      ]
    }
  ];

  function edgePoint(state) {
    var b = G.playfield(state);
    var side = (Math.random() * 4) | 0;
    if (side === 0) return { x: b.x0 + Math.random() * (b.x1 - b.x0), y: b.y0 - 22 };
    if (side === 1) return { x: b.x0 + Math.random() * (b.x1 - b.x0), y: b.y1 + 22 };
    if (side === 2) return { x: b.x0 - 22, y: b.y0 + Math.random() * (b.y1 - b.y0) };
    return { x: b.x1 + 22, y: b.y0 + Math.random() * (b.y1 - b.y0) };
  }

  function spawnTypeOf(item) {
    return typeof item === "string" ? item : (item && item.type) || "";
  }

  function spawnPosOf(state, item) {
    if (item && typeof item === "object" && item.x != null && item.y != null) {
      return { x: item.x, y: item.y };
    }
    return edgePoint(state);
  }

  function queueSpawn(state, type) {
    var p = edgePoint(state);
    state.spawnQueue.push({ type: type, x: p.x, y: p.y });
  }

  function scaleFor(stageIndex) {
    return 1 + stageIndex * 0.16;
  }

  function queueWave(state) {
    var stage = G.STAGES[state.stageIndex];
    var wave = stage.waves[state.waveIndex];
    state.spawnQueue = [];
    for (var i = 0; i < wave.length; i++) {
      var pack = wave[i];
      var n = pack.n;
      if (pack.type.indexOf("chefe") !== 0) {
        n = Math.max(n + 2, Math.round(n * 1.7));
        n = Math.max(1, Math.round(n * ((G.resolutionInfo(state).waveMul) || 2)));
        if (G.invasion) n = Math.max(1, Math.round(n * G.invasion.spawnMul((state.run && state.run.invasion) | 0)));
        n = Math.max(1, Math.round(n * 1.3));
      }
      for (var k = 0; k < n; k++) {
        queueSpawn(state, pack.type);
      }
    }
    state.spawnTimer = 0.15;
    state.banner = { text: "Onda " + (state.waveIndex + 1), t: 1.4 };
    G.audio.wave();
  }

  G.stageBgs = {};

  G.preloadStageBgs = function () {
    for (var i = 0; i < G.STAGES.length; i++) {
      var src = G.STAGES[i].bg;
      if (!src || G.stageBgs[src]) continue;
      var img = new Image();
      img.src = src;
      G.stageBgs[src] = img;
    }
  };

  G.stageBg = function (stage) {
    if (!stage || !stage.bg) return null;
    var img = G.stageBgs[stage.bg];
    if (img && img.complete && img.naturalWidth) return img;
    return img || null;
  };

  G.game = {
    spawnAt: function (state, type, x, y, extra) {
      var e = G.createEnemy(type, x, y, scaleFor(state.stageIndex));
      if (G.invasion) G.invasion.stamp(state, e);
      if (extra) {
        Object.keys(extra).forEach(function (k) {
          e[k] = extra[k];
        });
      }
      state.enemies.push(e);
      if (type === "chefe_final" && !(extra && extra.noLink)) {
        var cit = G.createEnemy("chefe_fortaleza", e.x + 88, e.y, scaleFor(state.stageIndex));
        cit.guardianFor = e.id;
        e.guardianId = cit.id;
        e.bossPhase = 1;
        state.enemies.push(cit);
        state.banner = { text: "Camada 1 · A Colmeia protege o núcleo", t: 2.2 };
      }
      if (type === "chefe_megatanque" && !(extra && extra.noLink)) {
        var king = G.createEnemy("chefe_beeking", e.x - 70, e.y + 20, scaleFor(state.stageIndex));
        king.queenId = e.id;
        e.kingId = king.id;
        state.enemies.push(king);
        state.banner = { text: "A rainha e o rei", t: 2.0 };
      }
      if (type === "chefe_arklan" && !(extra && extra.noLink)) {
        state.camZoomTo = 0.68;
        state.banner = { text: "A areia se abre", t: 2.2 };
      }
      return e;
    },

    startRun: function (state, opts) {
      opts = opts || {};
      var perm = G.save.data.perm;
      state.run = G.upgrades.defaultRun();
      state.run.invasion = (G.save.data && G.save.data.invasion) | 0;
      state.history = [];
      state.debugFight = !!opts.debug;
      state.debugOpts = state.debugFight
        ? {
            lastWave: !!opts.lastWave,
            bossType: opts.bossType || "",
            dmgMul: Math.max(1, opts.dmgMul | 0),
            god: !!opts.god,
            startArchives: !!opts.startArchives
          }
        : null;
      if (state.debugFight && opts.invasion != null) {
        var inv = opts.invasion | 0;
        var invMax = (G.invasion && G.invasion.MAX) || 8;
        if (inv < 0) inv = 0;
        if (inv > invMax) inv = invMax;
        state.run.invasion = inv;
      }
      var maxStage = Math.max(0, G.STAGES.length - 1);
      state.stageIndex = Math.max(0, Math.min(maxStage, opts.stageIndex | 0));
      state.units = [];
      state.enemies = [];
      state.projectiles = [];
      state.drops = [];
      state.particles = [];
      state.floaters = [];
      state.mines = [];
      state.warnings = [];
      state.booms = [];
      state.held = null;
      state.mergeHint = null;
      state.shake = 0;
      state.defeat = null;
      state.camLook = null;
      state.bossShown = 1;
      state.camZoom = 1;
      state.camZoomTo = 1;
      var field = G.playfield(state);
      state.squad.x = (field.x0 + field.x1) / 2;
      state.squad.y = (field.y0 + field.y1) / 2;
      var count = Math.min(G.maxUnits(), 1 + (perm.extraStart | 0));
      var firstKind = G.unitKind(perm.earlyTier | 0);
      G.codex.unlockUnit("recruta");
      G.codex.unlockUnit("comandante");
      G.codex.unlockUnit(firstKind);
      state.run.rerolls = perm.rerolls | 0;
      state.run.reserve = [];
      state.run.intel = {
        arquivo: state.debugFight && state.debugOpts && state.debugOpts.startArchives ? 1000 : 0
      };
      state.paused = false;
      state.userPaused = false;
      state.pendingMerge = null;
      state.archiveMenu = false;
      state.vfx = [];
      state.firewaves = [];
      state.cmdOrders = { crate: 0, recruit: 0, strike: 0 };
      state.cmdRecruitUsed = 0;
      state.guerrillaDraw = null;
      state.guerrillaMenu = null;
      state.cmdStrikes = [];
      state.units.push(G.createPlayerUnit(state.squad.x, state.squad.y, "comandante", state.run, perm));
      for (var i = 0; i < count; i++) {
        var a = (i / count) * Math.PI * 2;
        var spawnKind = i === 0 ? firstKind : "recruta";
        state.units.push(
          G.createPlayerUnit(state.squad.x + Math.cos(a) * 16, state.squad.y + Math.sin(a) * 16, spawnKind, state.run, perm)
        );
      }
      G.game.startStage(state);
    },

    startStage: function (state) {
      var stage = G.STAGES[state.stageIndex];
      var wave = 0;
      if (state.debugFight && state.debugOpts && state.debugOpts.lastWave && stage && stage.waves) {
        wave = Math.max(0, stage.waves.length - 1);
      }
      state.waveIndex = wave;
      state.enemies = [];
      state.projectiles = [];
      state.drops = [];
      state.mines = [];
      state.warnings = [];
      state.spawnQueue = [];
      state.waitingClear = false;
      state.clearTimer = 0;
      state.stageOutro = null;
      state.vacuumLoot = false;
      state.bumperHp = 5;
      state.bumperCd = 0;
      state.bumperRegenT = 0;
      state.booms = [];
      var field = G.playfield(state);
      state.squad.x = (field.x0 + field.x1) / 2;
      state.squad.y = (field.y0 + field.y1) / 2;
      state.squad.lx = state.squad.x;
      state.squad.ly = state.squad.y;
      state.zones = [];
      state.firewaves = [];
      state.minions = [];
      state.drones = [];
      state.deploys = [];
      state.stickies = [];
      state.mouseHist = [];
      state.atmCharge = 0;
      state.girSpin = 0;
      state.tankBarrageUsed = false;
      state.hook = null;
      state.bombLine = null;
      state.bombPending = null;
      state.cmdMark = null;
      state.cmdRecruitUsed = 0;
      state.guerrillaDraw = null;
      state.guerrillaMenu = null;
      state.cmdStrikes = [];
      state.keys = state.keys || {};
      for (var r = 0; r < state.units.length; r++) {
        if (state.units[r].hp <= 0) continue;
        state.units[r].x = state.squad.x;
        state.units[r].y = state.squad.y;
        state.units[r].held = false;
      }
      state.theme = G.THEMES[stage.theme];
      state.bgImg = G.stageBg(stage);
      state.camZoom = 1;
      state.camZoomTo = 1;
      var customBoss = state.debugFight && state.debugOpts && state.debugOpts.bossType;
      var bannerName = customBoss && G.ENEMY_DEFS[customBoss]
        ? G.ENEMY_DEFS[customBoss].name
        : stage.name;
      state.banner = { text: bannerName, t: 1.8 };
      for (var h = 0; h < state.units.length; h++) {
        var u = state.units[h];
        u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.22));
      }
      if (!state.debugFight) G.save.noteStage(state.stageIndex + 1);
      if (customBoss) {
        state.spawnQueue = [];
        queueSpawn(state, customBoss);
        state.spawnTimer = 0.15;
        G.audio.wave();
      } else {
        queueWave(state);
      }
    },

    update: function (state, dt) {
      if (state.camZoomTo && Math.abs((state.camZoom || 1) - state.camZoomTo) > 0.002) {
        var z = state.camZoom || 1;
        var rate = state.defeat ? 1.05 : 1.6;
        z += (state.camZoomTo - z) * Math.min(1, dt * rate);
        state.camZoom = z;
        if (!state.defeat && !(state.stageOutro && state.stageOutro.phase === "march")) G.clampPlay(state.squad, state);
      } else if (state.camZoomTo) {
        state.camZoom = state.camZoomTo;
      }
      if (!state.defeat && state.spawnQueue.length) {
        var res = G.resolutionInfo(state);
        var nextType = spawnTypeOf(state.spawnQueue[0]);
        var nextBoss = nextType.indexOf("chefe") === 0;
        var living = 0;
        if (!nextBoss) {
          for (var le = 0; le < state.enemies.length; le++) {
            if (state.enemies[le].hp > 0 && !state.enemies[le].stolen && !(state.enemies[le].def && state.enemies[le].def.boss)) living++;
          }
        }
        if (!nextBoss && living >= res.concurrent) {
          /* espera: monitor menor segura menos bicho na tela */
        } else {
          state.spawnTimer -= dt;
          if (state.spawnTimer <= 0) {
            var item = state.spawnQueue.shift();
            var type = spawnTypeOf(item);
            var p = spawnPosOf(state, item);
            G.game.spawnAt(state, type, p.x, p.y, { edgeWarn: true });
            state.spawnTimer = type.indexOf("chefe") === 0 ? 0.55 : res.spawnInterval;
          }
        }
      }

      G.combat.update(state, dt);
      if (!state.defeat) G.audio.sync(state, dt);
      if (state.defeat) return "play";

      if (!state.spawnQueue.length && !state.waitingClear && !state.stageOutro) {
        var hostilesLeft = 0;
        for (var he = 0; he < state.enemies.length; he++) {
          if (state.enemies[he].hp > 0 && !state.enemies[he].stolen) hostilesLeft++;
        }
        if (hostilesLeft === 0) {
        state.waitingClear = true;
        state.clearTimer = 0.7;
        }
      }
      if (state.waitingClear) {
        state.clearTimer -= dt;
        if (state.clearTimer <= 0) {
          state.waitingClear = false;
          var stage = G.STAGES[state.stageIndex];
          if (state.waveIndex < stage.waves.length - 1) {
            state.waveIndex++;
            queueWave(state);
          } else {
            if (state.pendingMerge || state.archiveMenu) {
              state.waitingClear = true;
              state.clearTimer = 0.25;
              return "play";
            }
            state.stageOutro = { phase: "loot", t: 0 };
            state.vacuumLoot = true;
            state.guerrillaMenu = null;
            state.held = null;
            state.mergeHint = null;
            if (state.drops) {
              for (var vi = 0; vi < state.drops.length; vi++) {
                state.drops[vi].life = Math.max(state.drops[vi].life || 0, 6);
              }
            }
          }
        }
      }

      if (state.stageOutro) {
        var outro = state.stageOutro;
        outro.t += dt;
        if (outro.phase === "loot") {
          if (!state.drops.length) {
            outro.phase = "wait";
            outro.t = 0;
            state.vacuumLoot = false;
          } else if (outro.t > 3.4) {
            for (var v = state.drops.length - 1; v >= 0; v--) {
              if (G.combat && G.combat.applyDrop) G.combat.applyDrop(state, state.drops[v]);
            }
            state.drops = [];
            outro.phase = "wait";
            outro.t = 0;
            state.vacuumLoot = false;
          }
        } else if (outro.phase === "wait") {
          if (outro.t >= 0.7) {
            outro.phase = "march";
            outro.t = 0;
            var z = state.camZoom || 1;
            outro.exitY = (0 - state.H / 2) / z + state.H / 2 - 120;
            outro.step = 460;
          }
        } else if (outro.phase === "march") {
          var step = (outro.step || 460) * dt;
          state.squad.y -= step;
          for (var ui = 0; ui < state.units.length; ui++) state.units[ui].y -= step;
          if (state.minions) {
            for (var mi = 0; mi < state.minions.length; mi++) state.minions[mi].y -= step;
          }
          if (state.deploys) {
            for (var di = 0; di < state.deploys.length; di++) state.deploys[di].y -= step;
          }
          if (state.squad.y <= outro.exitY) {
            state.stageOutro = null;
            state.vacuumLoot = false;
            return "stageClear";
          }
        }
      }

      var cmdAlive = false;
      for (var c = 0; c < state.units.length; c++) {
        if (state.units[c].commander && state.units[c].hp > 0) cmdAlive = true;
      }
      if (!cmdAlive || state.units.length === 0) return "dead";
      return "play";
    }
  };

  G.preloadStageBgs();
  G.preloadPortraits();
})(window.TFAG = window.TFAG || {});
