(function (G) {
  function unitAt(state, x, y) {
    var best = null;
    var bestD = 22;
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0) continue;
      var d = Math.hypot(u.x - x, u.y - y);
      var hit = Math.max(16, u.def.size + 8);
      if (d < hit && d < bestD + u.def.size) {
        best = u;
        bestD = d;
      }
    }
    return best;
  }

  function partnerAt(state, held, x, y) {
    var best = null;
    var bestD = 28;
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || u.id === held.id) continue;
      if (u.kind !== held.kind) continue;
      var d = Math.hypot(u.x - x, u.y - y);
      if (d < Math.max(22, u.def.size + 10) && d < bestD) {
        best = u;
        bestD = d;
      }
    }
    return best;
  }

  function canEvolve(u) {
    return u && !u.commander && u.def.merge && u.def.merge.length;
  }

  function enemyAt(state, x, y) {
    var best = null;
    var bestD = 28;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0) continue;
      var d = Math.hypot(e.x - x, e.y - y);
      if (d < e.def.size + 10 && d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  function emptyIntel() {
    return { arquivo: 0, confidencial: 0, maximo: 0 };
  }

  function ensureIntel(run) {
    if (!run.intel) run.intel = emptyIntel();
    if (run.reserve && run.reserve.length) {
      run.intel.arquivo += run.reserve.length;
      run.reserve = [];
    }
    return run.intel;
  }

  function compact(state, x, y) {
    var intel = ensureIntel(state.run);
    var px = x != null ? x : state.squad.x;
    var py = y != null ? y : state.squad.y;
    var fused = false;
    while (intel.arquivo >= 2) {
      intel.arquivo -= 2;
      intel.confidencial += 1;
      fused = true;
      state.floaters.push(G.createFloater(px, py - 12, "Informação confidencial", "#b8e0ff"));
    }
    while (intel.confidencial >= 2) {
      intel.confidencial -= 2;
      intel.maximo += 1;
      fused = true;
      state.floaters.push(G.createFloater(px, py - 28, "Segurança máxima", "#ffd24a"));
    }
    return fused;
  }

  function pickUnit(state, pred) {
    var best = null;
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0 || u.commander || !canEvolve(u)) continue;
      if (!pred(u.gen | 0)) continue;
      if (!best || (u.gen | 0) < (best.gen | 0)) best = u;
    }
    return best;
  }

  G.merge = {
    unitAt: unitAt,
    canEvolve: canEvolve,
    enemyAt: enemyAt,
    ensureIntel: ensureIntel,

    addArquivo: function (state, x, y) {
      var intel = ensureIntel(state.run);
      intel.arquivo += 1;
      if (!compact(state, x, y)) {
        state.floaters.push(G.createFloater(x, y - 8, "Arquivo de guerra", "#ffd24a"));
      }
    },

    intelLine: function (run) {
      var intel = ensureIntel(run);
      return "Arq " + intel.arquivo + " · Conf " + intel.confidencial + " · Máx " + intel.maximo;
    },

    tokenName: function (token) {
      if (token === "maximo") return "segurança máxima";
      if (token === "confidencial") return "informação confidencial";
      return "arquivo de guerra";
    },

    begin: function (state, x, y) {
      var u = unitAt(state, x, y);
      if (!u || u.commander || !canEvolve(u)) return false;
      u.held = true;
      state.held = u;
      return true;
    },

    move: function (state, x, y) {
      if (!state.held) return;
      var dx = x - state.held.x;
      var dy = y - state.held.y;
      if (dx * dx + dy * dy > 4) {
        var want = Math.atan2(dy, dx);
        var dlt = Math.atan2(Math.sin(want - (state.held.rot || 0)), Math.cos(want - (state.held.rot || 0)));
        state.held.rot = (state.held.rot || 0) + dlt * 0.5;
      }
      state.held.x = x;
      state.held.y = y;
      var p = partnerAt(state, state.held, x, y);
      state.mergeHint = p && canEvolve(state.held) ? p : null;
    },

    end: function (state) {
      var held = state.held;
      if (!held) return null;
      held.held = false;
      var p = state.mergeHint;
      state.held = null;
      state.mergeHint = null;
      if (!p || p.hp <= 0 || p.kind !== held.kind || !canEvolve(held)) return null;
      return {
        a: held,
        b: p,
        x: (held.x + p.x) / 2,
        y: (held.y + p.y) / 2,
        options: held.def.merge.slice()
      };
    },

    confirm: function (state, pick, pending) {
      pending.consumed = true;
      pending.a.hp = 0;
      if (pending.b) pending.b.hp = 0;
      var nu = G.createPlayerUnit(pending.x, pending.y, pick, state.run, G.save.data.perm);
      state.units.push(nu);
      G.audio.merge();
      G.burst(state, pending.x, pending.y, "#ffd24a", 18, 120);
      var tag = pending.fromBank ? "PROMOÇÃO! " : "MERGE! ";
      state.floaters.push(G.createFloater(pending.x, pending.y - 18, tag + nu.def.name, "#ffd24a"));
      state.shake = Math.max(state.shake, 5);
      if (G.codex.unlockUnit(pick)) {
        state.floaters.push(G.createFloater(pending.x, pending.y - 34, "Compêndio: " + nu.def.name, "#ffe08a"));
      }
      return nu;
    },

    tryReservePromote: function (state) {
      if (state.pendingMerge) return null;
      compact(state);
      var intel = ensureIntel(state.run);
      var u = null;
      var token = null;
      if (intel.maximo > 0) {
        u = pickUnit(state, function (gen) { return gen === 2; });
        if (u) token = "maximo";
      }
      if (!u && intel.confidencial > 0) {
        u = pickUnit(state, function (gen) { return gen <= 1; });
        if (u) token = "confidencial";
      }
      if (!u) return null;
      intel[token] -= 1;
      return {
        a: u,
        b: null,
        fromBank: true,
        token: token,
        x: u.x,
        y: u.y,
        options: u.def.merge.slice()
      };
    }
  };
})(window.TFAG = window.TFAG || {});
