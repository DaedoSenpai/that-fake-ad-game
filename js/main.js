(function (G) {
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var overlay = document.getElementById("overlay");
  var hud = document.getElementById("hud");

  var screens = {
    menu: document.getElementById("screen-menu"),
    how: document.getElementById("screen-how"),
    shop: document.getElementById("screen-shop"),
    cards: document.getElementById("screen-cards"),
    codex: document.getElementById("screen-codex"),
    over: document.getElementById("screen-over"),
    win: document.getElementById("screen-win")
  };

  var state = {
    mode: "menu",
    W: innerWidth,
    H: innerHeight,
    squad: { x: 0, y: 0 },
    units: [],
    enemies: [],
    projectiles: [],
    drops: [],
    particles: [],
    floaters: [],
    mines: [],
    warnings: [],
    history: [],
    pointer: { x: null, y: null, down: false, moveSquad: false, fireHold: false, altHold: false, touch: false, live: false },
    keys: {},
    skillSlot: 0,
    moveDir: { x: 0, y: -1 },
    dashT: 0,
    dashCd: 0,
    dashDir: { x: 0, y: -1 },
    held: null,
    mergeHint: null,
    shake: 0,
    banner: { text: "", t: 0 },
    theme: G.THEMES.field,
    time: 0,
    run: G.upgrades.defaultRun(),
    stageIndex: 0,
    waveIndex: 0,
    bossShown: 1,
    camZoom: 1,
    camZoomTo: 1,
    offer: [],
    hoverCard: null,
    paused: false,
    userPaused: false,
    pendingMerge: null,
    vfx: [],
    codexTab: "ally"
  };

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.W = innerWidth;
    state.H = innerHeight;
    canvas.width = Math.floor(state.W * dpr);
    canvas.height = Math.floor(state.H * dpr);
    canvas.style.width = state.W + "px";
    canvas.style.height = state.H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state.mode !== "play") {
      state.squad.x = state.W / 2;
      state.squad.y = state.H * 0.62;
    } else {
      var field = G.playfield(state);
      state.squad.x = Math.max(field.x0, Math.min(field.x1, state.squad.x));
      state.squad.y = Math.max(field.y0, Math.min(field.y1, state.squad.y));
    }
  }

  function showScreen(name) {
    var fromPlay = state.mode === "play" && name !== "play";
    if (fromPlay) overlay.classList.add("is-fading");
    overlay.classList.toggle("hidden", name === "play");
    overlay.classList.toggle("field-visible", name === "cards");
    overlay.classList.remove("defeat", "lit");
    hud.classList.remove("defeat-hide");
    hud.classList.toggle("hidden", name !== "play");
    if (name !== "over") {
      state.defeat = null;
      state.camLook = null;
    }
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle("hidden", key !== name);
    });
    state.mode = name === "play" ? "play" : name;
    if (name !== "play") {
      state.userPaused = false;
      closeMerge();
      closePause();
      closeCodexSheet();
      G.audio.stopBgm();
    }
    if (fromPlay) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          overlay.classList.remove("is-fading");
        });
      });
    }
    if (name === "play") hud.classList.add("hud-enter");
    else hud.classList.remove("hud-enter");
    syncAimCursor();
  }

  function fillOverResults() {
    var stage = G.STAGES[state.stageIndex] || { name: "—" };
    var coins = (state.run && state.run.coins) | 0;
    var intel = (state.run && state.run.intel) || {};
    document.getElementById("over-text").textContent =
      "A linha quebrou na fase " + (state.stageIndex + 1) + ".";
    var rows = [
      ["Fase", (state.stageIndex + 1) + " · " + stage.name],
      ["Onda", (state.waveIndex + 1) + "/" + ((stage.waves && stage.waves.length) || 1)],
      ["Abates", String((state.run && state.run.kills) | 0)],
      ["Moedas", "+" + coins + " pro cofre"]
    ];
    if ((intel.arquivo | 0) || (intel.confidencial | 0) || (intel.maximo | 0)) {
      rows.push(["Dossiê", (intel.arquivo | 0) + " arq. · " + (intel.confidencial | 0) + " conf."]);
    }
    var list = document.getElementById("over-stats");
    list.innerHTML = rows.map(function (r) {
      return "<li><span>" + r[0] + "</span><b>" + r[1] + "</b></li>";
    }).join("");
  }

  function spawnFallDust(cmd) {
    if (!cmd) return;
    G.burst(state, cmd.x, cmd.y + 10, "#c8a86a", 16, 70);
    G.burst(state, cmd.x, cmd.y + 8, "#5a4830", 10, 46);
    for (var i = 0; i < 12; i++) {
      var a = Math.random() * Math.PI;
      state.particles.push({
        x: cmd.x + (Math.random() - 0.5) * 18,
        y: cmd.y + 12,
        vx: Math.cos(a) * (20 + Math.random() * 50),
        vy: -8 - Math.random() * 28,
        life: 0.45 + Math.random() * 0.35,
        max: 0.7,
        size: 2 + Math.random() * 3.2,
        color: Math.random() > 0.5 ? "#d4b07a" : "#6a5438"
      });
    }
  }

  function beginDefeat() {
    if (state.defeat) return;
    var cmd = null;
    for (var i = 0; i < state.units.length; i++) {
      if (state.units[i].commander) cmd = state.units[i];
    }
    if (cmd) {
      cmd.hp = 0;
      cmd.fallT = 0.001;
      cmd.flash = 0.35;
      cmd.held = false;
      cmd.stowed = false;
      cmd.packed = false;
    }
    state.dashStowing = false;
    state.dashActive = false;
    state.dashT = 0;
    var si = 0;
    var nSold = 0;
    for (var ns = 0; ns < state.units.length; ns++) {
      if (state.units[ns].hp > 0 && !state.units[ns].commander) nSold++;
    }
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.commander) continue;
      u.stowed = false;
      u.packed = false;
      if (u.hp <= 0) continue;
      var ang = -Math.PI / 2 + (si / Math.max(1, nSold)) * Math.PI * 2;
      var rr = 34 + Math.max(0, nSold - 3) * 5;
      u.x = (cmd ? cmd.x : state.squad.x) + Math.cos(ang) * rr;
      u.y = (cmd ? cmd.y : state.squad.y) + Math.sin(ang) * rr;
      si++;
    }
    state.defeat = {
      t: 0,
      overlay: false,
      hit: false,
      cmdId: cmd ? cmd.id : 0,
      cx: cmd ? cmd.x : state.squad.x,
      cy: cmd ? cmd.y : state.squad.y,
      look0: { x: state.W / 2, y: state.H / 2 }
    };
    state.camLook = { x: state.W / 2, y: state.H / 2 };
    state.userPaused = false;
    closeMerge();
    closePause();
    closeCodexSheet();
    hud.classList.add("defeat-hide");
    state.camZoomTo = 4.85;
    state.shake = Math.max(state.shake || 0, 6);
    if (cmd) G.burst(state, cmd.x, cmd.y, "#ffe08a", 18, 90);
    G.save.bank(state.run.coins);
    G.save.noteStage(state.stageIndex + 1);
    fillOverResults();
    G.audio.stopBgm();
    G.audio.over();
    refreshMenu();
  }

  function presentDefeatOverlay() {
    if (!state.defeat || state.defeat.overlay) return;
    state.defeat.overlay = true;
    overlay.classList.remove("hidden", "field-visible");
    overlay.classList.add("defeat");
    overlay.classList.remove("lit");
    hud.classList.add("hidden");
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle("hidden", key !== "over");
    });
    state.mode = "over";
    syncAimCursor();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add("lit");
      });
    });
  }

  function tickDefeat(dt) {
    var d = state.defeat;
    if (!d || d.overlay) return;
    d.t += dt;
    var cmd = null;
    for (var i = 0; i < state.units.length; i++) {
      if (state.units[i].commander) cmd = state.units[i];
    }
    if (cmd) {
      d.cx = cmd.x;
      d.cy = cmd.y;
      var lookK = Math.min(1, d.t / 1.45);
      lookK = 1 - (1 - lookK) * (1 - lookK);
      var ox = (d.look0 && d.look0.x) || state.W / 2;
      var oy = (d.look0 && d.look0.y) || state.H / 2;
      state.camLook = {
        x: ox + (cmd.x - ox) * lookK,
        y: oy + (cmd.y - oy) * lookK
      };
    }
    if (cmd && !d.hit && (cmd.fallT || 0) >= 2.52) {
      d.hit = true;
      state.shake = Math.max(state.shake || 0, 8);
      spawnFallDust(cmd);
    }
    if (d.t >= 3.45) presentDefeatOverlay();
  }

  function refreshMenu() {
    var d = G.save.data;
    document.getElementById("menu-stats").textContent =
      d.name + " · Cofre: " + d.vault + " · Melhor fase: " + (d.bestStage || 0) + "/" + G.STAGES.length;
    renderSlots();
  }

  function renderSlots() {
    var row = document.getElementById("slot-row");
    row.innerHTML = "";
    G.save.slots.forEach(function (slot, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot-card" + (i === G.save.index ? " active" : "");
      var input = document.createElement("input");
      input.value = slot.name;
      input.maxLength = 18;
      input.onclick = function (ev) { ev.stopPropagation(); };
      input.onchange = function () {
        G.save.rename(i, input.value);
        refreshMenu();
      };
      var meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = slot.vault || slot.bestStage ? "Cofre " + slot.vault + " · Fase " + (slot.bestStage || 0) : "Vazio";
      var wipe = document.createElement("button");
      wipe.type = "button";
      wipe.className = "wipe";
      wipe.textContent = "Apagar perfil";
      wipe.onclick = function (ev) {
        ev.stopPropagation();
        if (!window.confirm("Apagar o perfil " + slot.name + "? Cofre, upgrades e compêndio zeram e não tem volta.")) return;
        G.audio.ui();
        G.save.wipe(i);
        refreshMenu();
      };
      btn.appendChild(input);
      btn.appendChild(meta);
      btn.appendChild(wipe);
      btn.onclick = function () {
        G.audio.ui();
        G.save.select(i);
        G.audio.muted = !!G.save.muted;
        G.audio.applyMute();
        refreshMenu();
      };
      row.appendChild(btn);
    });
  }

  function renderShop() {
    var list = document.getElementById("shop-list");
    document.getElementById("shop-vault").textContent = "Cofre: " + G.save.data.vault;
    list.innerHTML = "";
    G.PERM.forEach(function (item) {
      var lv = G.save.data.perm[item.id] | 0;
      var maxed = lv >= item.max;
      var cost = maxed ? 0 : item.cost(lv);
      var btn = document.createElement("button");
      btn.className = "btn shop-item";
      btn.disabled = maxed || G.save.data.vault < cost;
      btn.innerHTML =
        "<strong>" + item.title + "</strong> · " + lv + "/" + item.max +
        "<span class=\"price\">" + (maxed ? "MAX" : cost) + "</span><br>" +
        "<span style=\"font-weight:600;color:#b8c0d4\">" + (maxed ? "Nível máximo." : item.desc(lv)) + "</span>";
      btn.onclick = function () {
        G.audio.ui();
        if (G.upgrades.buy(item)) renderShop();
      };
      list.appendChild(btn);
    });
    var refundBtn = document.getElementById("btn-refund");
    var spent = G.upgrades.spentPerm();
    refundBtn.disabled = spent <= 0;
    refundBtn.textContent = spent ? "Reembolsar build (+" + spent + ")" : "Reembolsar build";
  }

  function stickerFor(id) {
    var map = {
      dmg: "💥", fire: "🔫", hp: "🛡", speed: "👟", magnet: "🧲", drop: "🪖",
      explode: "💣", ricochet: "↗", dual: "🎯", pierce: "⚡", freeze: "❄",
      lifesteal: "🧛", shield: "💠", luck: "🍀", gold: "💰", knockback: "👊",
      minesPlus: "⚠", flame: "🔥", berserk: "☠", regen: "🍞", boom: "✴",
      clone: "👥", ficha: "🎫"
    };
    return map[id] || "★";
  }

  function renderCards() {
    var row = document.getElementById("card-row");
    row.innerHTML = "";
    state.hoverCard = null;
    state.offer.forEach(function (card) {
      var btn = document.createElement("button");
      btn.className = "card";
      btn.innerHTML = "<span class=\"sticker\">" + stickerFor(card.id) + "</span><h3>" + card.title + "</h3><p>" + card.desc + "</p>";
      btn.onmouseenter = function () { state.hoverCard = card; };
      btn.onmouseleave = function () { state.hoverCard = null; };
      btn.onclick = function () {
        G.audio.ui();
        state.hoverCard = null;
        G.upgrades.applyCard(card, state);
        state.stageIndex++;
        if (state.stageIndex >= G.STAGES.length) {
          finish(true);
          return;
        }
        G.game.startStage(state);
        showScreen("play");
        G.audio.sync(state, 0);
      };
      row.appendChild(btn);
    });
    var reroll = document.getElementById("btn-reroll");
    var undo = document.getElementById("btn-undo");
    var n = state.run.rerolls | 0;
    reroll.textContent = n ? "Trocar as 3 cartas (" + n + " ficha" + (n > 1 ? "s" : "") + ")" : "Sem ficha pra trocar";
    reroll.disabled = n <= 0;
    undo.disabled = !(state.history && state.history.length);
  }

  function syncFreeze() {
    state.paused = !!state.pendingMerge || !!state.userPaused;
    syncAimCursor();
  }

  function syncAimCursor() {
    canvas.classList.toggle(
      "aim-hide",
      state.mode === "play" && !state.userPaused && !state.pendingMerge
    );
  }

  function closePause() {
    state.userPaused = false;
    document.getElementById("pause-modal").classList.add("hidden");
    hideInspect();
    syncFreeze();
    G.audio.setPaused(false);
  }

  function openPause() {
    if (state.mode !== "play" || state.pendingMerge || state.defeat) return;
    state.userPaused = true;
    document.getElementById("pause-modal").classList.remove("hidden");
    syncFreeze();
    updateInspect();
    G.audio.setPaused(true);
  }

  function hideInspect() {
    document.getElementById("inspect-tip").classList.add("hidden");
  }

  function updateInspect() {
    var tip = document.getElementById("inspect-tip");
    if (!state.userPaused || state.mode !== "play") {
      tip.classList.add("hidden");
      return;
    }
    var u = G.merge.unitAt(state, state.pointer.x, state.pointer.y);
    var e = !u ? G.merge.enemyAt(state, state.pointer.x, state.pointer.y) : null;
    if (!u && !e) {
      tip.classList.add("hidden");
      return;
    }
    var html = "";
    if (u) {
      document.getElementById("inspect-kicker").textContent = u.commander ? "comandante" : "aliado";
      document.getElementById("inspect-name").textContent = u.def.name;
      if (u.def.blurb) html += "<p>" + u.def.blurb + "</p>";
      var pass = G.unitPassives(u.def);
      if (pass.length) html += "<div class=\"bit\"><strong>Passiva · " + pass[0].name + "</strong><p>" + pass[0].desc + "</p></div>";
      if (u.def.active) {
        var meta = G.activeMeta(u.def.active.id);
        html += "<div class=\"bit\"><strong>Ativa · " + u.def.active.name + "</strong><p>" + (meta.detail || u.def.active.desc) + "</p></div>";
      }
      if (!html) html = "<p>Essa unidade não tem passiva nem ativa.</p>";
    } else {
      document.getElementById("inspect-kicker").textContent = e.def.boss ? "chefe" : "inimigo";
      document.getElementById("inspect-name").textContent = e.def.name;
      if (e.def.blurb) html += "<p>" + e.def.blurb + "</p>";
      var skills = G.enemySkills(e.def);
      if (!skills.length && !e.def.blurb) html = "<p>Esse inimigo não tem skill listada.</p>";
      skills.forEach(function (s) {
        html += "<div class=\"bit\"><strong>" + (s.type === "passive" ? "Passiva" : "Ativa") + " · " + s.name + "</strong><p>" + s.desc + "</p></div>";
      });
    }
    document.getElementById("inspect-body").innerHTML = html;
    var sx = state.pointer.sx != null ? state.pointer.sx : state.pointer.x;
    var sy = state.pointer.sy != null ? state.pointer.sy : state.pointer.y;
    tip.style.left = Math.min(state.W - 292, sx + 16) + "px";
    tip.style.top = Math.min(state.H - 180, sy + 16) + "px";
    tip.classList.remove("hidden");
  }

  function openCodexSheet(team, key, known) {
    var modal = document.getElementById("codex-modal");
    var art = document.getElementById("codex-art");
    var nameEl = document.getElementById("codex-name");
    var blurbEl = document.getElementById("codex-blurb");
    var list = document.getElementById("codex-stats-list");
    var sticker = document.getElementById("codex-sticker");
    var passBox = document.getElementById("codex-passives");
    var actBox = document.getElementById("codex-actives");
    var passList = document.getElementById("codex-passives-list");
    var actList = document.getElementById("codex-actives-list");
    var passKick = document.getElementById("codex-passives-kicker");
    var actKick = document.getElementById("codex-actives-kicker");
    list.innerHTML = "";
    passList.innerHTML = "";
    actList.innerHTML = "";
    G.drawPortrait(art, team, key, !known);

    function addSkill(boxList, icon, title, extra, desc, hint) {
      var card = document.createElement("div");
      card.className = "active-card";
      card.innerHTML =
        "<span class=\"active-icon\">" + icon + "</span><div><h3>" + title + "</h3>" +
        (extra ? "<p>" + extra + "</p>" : "") +
        "<p>" + desc + "</p>" +
        (hint ? "<p>" + hint + "</p>" : "") +
        "</div>";
      boxList.appendChild(card);
    }

    if (team === "player") {
      passKick.textContent = "Passiva";
      actKick.textContent = "Ativa";
      var def = G.UNIT_DEFS[key];
      document.getElementById("codex-kicker").textContent = G.unitTierLabel(def);
      sticker.textContent = known ? G.unitSticker(key) : "?";
      if (!known) {
        nameEl.textContent = "???";
        blurbEl.textContent = "Ainda não entrou no compêndio. Faz o merge pra revelar.";
        passBox.classList.add("hidden");
        actBox.classList.add("hidden");
      } else {
        nameEl.textContent = def.name;
        blurbEl.textContent = def.blurb;
        G.unitStatRows(def).forEach(function (line) {
          var li = document.createElement("li");
          li.textContent = line;
          list.appendChild(li);
        });
        var pass = G.unitPassives(def);
        if (pass.length) {
          passBox.classList.remove("hidden");
          pass.forEach(function (p) {
            addSkill(passList, "🛡", p.name, "", p.desc);
          });
        } else {
          passBox.classList.add("hidden");
        }
        if (def.active) {
          var meta = G.activeMeta(def.active.id);
          actBox.classList.remove("hidden");
          addSkill(
            actList,
            G.activeIconHtml ? G.activeIconHtml(def.active.id) : meta.icon,
            def.active.name,
            "Recarga " + def.active.cd + "s",
            meta.detail || def.active.desc
          );
        } else {
          actBox.classList.add("hidden");
        }
      }
    } else {
      passKick.textContent = "Passiva";
      actKick.textContent = "Ativa";
      var edef = G.ENEMY_DEFS[key];
      document.getElementById("codex-kicker").textContent = edef.boss ? "inimigo · chefe" : "inimigo";
      sticker.textContent = known ? "☠" : "?";
      if (!known) {
        nameEl.textContent = "???";
        blurbEl.textContent = "Ainda não entrou no arquivo. Derruba um pra registrar.";
        passBox.classList.add("hidden");
        actBox.classList.add("hidden");
      } else {
        nameEl.textContent = edef.name + (edef.title ? " — " + edef.title : "");
        blurbEl.textContent = edef.blurb || G.enemyKindLabel(edef.kind);
        G.enemyStatRows(edef).forEach(function (line) {
          var li = document.createElement("li");
          li.textContent = line;
          list.appendChild(li);
        });
        var skills = G.enemySkills(edef);
        var passives = skills.filter(function (s) { return s.type === "passive"; });
        var actives = skills.filter(function (s) { return s.type !== "passive"; });
        if (passives.length) {
          passBox.classList.remove("hidden");
          passives.forEach(function (s) {
            addSkill(passList, s.icon || "🛡", s.name, "", s.desc);
          });
        } else {
          passBox.classList.add("hidden");
        }
        if (actives.length) {
          actBox.classList.remove("hidden");
          actives.forEach(function (s) {
            addSkill(actList, s.icon || "⚔", s.name, "", s.desc);
          });
        } else {
          actBox.classList.add("hidden");
        }
      }
    }
    modal.classList.remove("hidden");
  }

  function closeCodexSheet() {
    document.getElementById("codex-modal").classList.add("hidden");
  }

  function openMerge(pending) {
    state.pendingMerge = pending;
    syncFreeze();
    var intel = pending.fromBank;
    document.querySelector("#merge-modal .kicker").textContent = intel
      ? G.merge.tokenName(pending.token)
      : "dois iguais";
    document.querySelector("#merge-modal h2").innerHTML = intel
      ? "Promover <span id=\"merge-from\"></span>"
      : "Dois <span id=\"merge-from\"></span>";
    document.getElementById("merge-from").textContent = pending.a.def.name;
    document.querySelector("#merge-modal .tagline").textContent = intel
      ? "O comandante usa o dossiê. Escolhe no que essa unidade vira — passe o mouse pra ver o arquivo."
      : "Escolhe o caminho da pirâmide. Passe o mouse na carta pra ver o dossiê.";
    var box = document.getElementById("merge-options");
    box.innerHTML = "";
    pending.options.forEach(function (kind, idx) {
      var def = G.UNIT_DEFS[kind];
      var btn = document.createElement("button");
      btn.className = "merge-pick";
      btn.type = "button";
      var extra = def.active ? def.active.name : G.unitStatsLine(def);
      btn.innerHTML = "<span class=\"sticker\">" + G.unitSticker(kind) + "</span><h3>" + def.name + "</h3><p>" + extra + "</p>";
      btn.onpointerenter = btn.onfocus = function () {
        showMergePreview(kind, btn);
      };
      btn.onclick = function () {
        G.merge.confirm(state, kind, pending);
        closeMerge();
      };
      box.appendChild(btn);
      if (idx === 0) showMergePreview(kind, btn);
    });
    document.getElementById("merge-modal").classList.remove("hidden");
  }

  function showMergePreview(kind, btn) {
    var def = G.UNIT_DEFS[kind];
    var panel = document.getElementById("merge-preview");
    if (!def || !panel) return;
    panel.classList.remove("empty");
    document.querySelectorAll("#merge-options .merge-pick").forEach(function (el) {
      el.classList.toggle("previewing", el === btn);
    });
    G.drawPortrait(document.getElementById("merge-preview-art"), "player", kind, false);
    document.getElementById("merge-preview-kicker").textContent = G.unitTierLabel(def);
    document.getElementById("merge-preview-name").textContent = def.name;
    document.getElementById("merge-preview-blurb").textContent = def.blurb;
    var stats = document.getElementById("merge-preview-stats");
    stats.innerHTML = "";
    var chips = [
      "HP " + def.hp,
      def.role === "warlord" || def.role === "paladin" || def.role === "reaper" ? "Dano " + def.dmg : def.projectile === "none" ? "suporte" : "Dano " + def.dmg,
      def.role === "warlord" || def.role === "paladin" || def.role === "reaper" ? "Alcance " + def.range : def.projectile === "none" ? "" : "Alcance " + def.range,
      def.role === "reaper" ? "AoE " + (def.aoe || 60) : "",
      def.fire ? def.fire.toFixed(2) + "/s" : ""
    ];
    chips.forEach(function (line) {
      if (!line) return;
      var li = document.createElement("li");
      li.textContent = line;
      stats.appendChild(li);
    });
    var skills = document.getElementById("merge-preview-skills");
    skills.innerHTML = "";
    var pass = G.unitPassives(def);
    pass.forEach(function (p) {
      var row = document.createElement("div");
      row.className = "merge-skill";
      row.innerHTML = "<span class=\"ico\">🛡</span><p><b>Passiva · " + p.name + "</b> — " + p.desc + "</p>";
      skills.appendChild(row);
    });
    if (def.active) {
      var meta = G.activeMeta(def.active.id);
      var rowA = document.createElement("div");
      rowA.className = "merge-skill";
      rowA.innerHTML = "<span class=\"ico\">" + (G.activeIconHtml ? G.activeIconHtml(def.active.id) : meta.icon) + "</span><p><b>Ativa · " + def.active.name + "</b> — " + (meta.detail || def.active.desc) + "</p>";
      skills.appendChild(rowA);
    }
    if (!pass.length && !def.active) {
      var empty = document.createElement("p");
      empty.className = "codex-blurb";
      empty.textContent = "Sem passiva nem ativa listada.";
      skills.appendChild(empty);
    }
  }

  function closeMerge() {
    if (state.pendingMerge && state.pendingMerge.fromBank && !state.pendingMerge.consumed) {
      var intel = G.merge.ensureIntel(state.run);
      var token = state.pendingMerge.token || "confidencial";
      intel[token] = (intel[token] | 0) + 1;
    }
    state.pendingMerge = null;
    document.getElementById("merge-modal").classList.add("hidden");
    document.getElementById("merge-preview").classList.add("empty");
    syncFreeze();
  }

  var codexTab = "ally";
  function renderCodex() {
    var c = G.codex.counts();
    document.getElementById("codex-stats").textContent =
      "Aliados " + c.units + "/" + c.unitMax + " · Inimigos " + c.enemies + "/" + c.enemyMax;
    document.getElementById("codex-ally").classList.toggle("primary", codexTab === "ally");
    document.getElementById("codex-enemy").classList.toggle("primary", codexTab === "enemy");
    var grid = document.getElementById("codex-grid");
    grid.innerHTML = "";
    if (codexTab === "ally") {
      G.unitList().forEach(function (kind) {
        var def = G.UNIT_DEFS[kind];
        var known = G.codex.hasUnit(kind);
        var btn = document.createElement("button");
        btn.className = "codex-item" + (known ? "" : " locked");
        btn.textContent = known ? def.name : "???";
        btn.onclick = function () {
          G.audio.ui();
          openCodexSheet("player", kind, known);
        };
        grid.appendChild(btn);
      });
    } else {
      Object.keys(G.ENEMY_DEFS).forEach(function (type) {
        var def = G.ENEMY_DEFS[type];
        if (def.codexHide) return;
        var known = G.codex.hasEnemy(type);
        var btn = document.createElement("button");
        btn.className = "codex-item" + (known ? "" : " locked");
        btn.textContent = known ? def.name : "???";
        btn.onclick = function () {
          G.audio.ui();
          openCodexSheet("enemy", type, known);
        };
        grid.appendChild(btn);
      });
    }
  }

  function recenterSquad() {
    var field = G.playfield(state);
    state.squad.x = (field.x0 + field.x1) / 2;
    state.squad.y = field.y0 + (field.y1 - field.y0) * 0.36;
    state.squad.lx = state.squad.x;
    state.squad.ly = state.squad.y;
    state.camZoom = 1;
    state.camZoomTo = 1;
    var soldiers = [];
    var cmd = null;
    for (var i = 0; i < state.units.length; i++) {
      if (state.units[i].hp <= 0) continue;
      state.units[i].held = false;
      state.units[i].stowed = false;
      state.units[i].packed = false;
      if (state.units[i].commander) cmd = state.units[i];
      else soldiers.push(state.units[i]);
    }
    if (cmd) {
      cmd.x = state.squad.x;
      cmd.y = state.squad.y;
    }
    for (var s = 0; s < soldiers.length; s++) {
      var angle = -Math.PI / 2 + (s / Math.max(1, soldiers.length)) * Math.PI * 2;
      var r = 34 + Math.max(0, soldiers.length - 3) * 5;
      soldiers[s].x = state.squad.x + Math.cos(angle) * r;
      soldiers[s].y = state.squad.y + Math.sin(angle) * r;
    }
  }

  function showCards() {
    recenterSquad();
    state.offer = G.upgrades.pickThree(state);
    renderCards();
    showScreen("cards");
  }

  function finish(win) {
    G.save.bank(state.run.coins);
    G.save.noteStage(state.stageIndex + 1);
    if (win) {
      document.getElementById("win-text").textContent =
        "Você limpou as " + G.STAGES.length + " fases. +" + state.run.coins + " moedas foram pro cofre.";
      G.audio.win();
      showScreen("win");
    }
    refreshMenu();
  }

  function startPlay() {
    if (state.starting) return;
    state.starting = true;
    G.audio.ensure();
    G.audio.ui();
    overlay.classList.add("is-fading");
    setTimeout(function () {
      state.starting = false;
      state.defeat = null;
      state.camLook = null;
      overlay.classList.remove("defeat", "lit");
      hud.classList.remove("defeat-hide");
      G.game.startRun(state);
      state.pointer.live = false;
      state.pointer.x = null;
      state.pointer.y = null;
      showScreen("play");
      overlay.classList.remove("is-fading");
      G.audio.sync(state, 0);
      syncHud();
    }, 380);
  }

  function pointerPos(ev) {
    var t = ev.touches ? ev.touches[0] || ev.changedTouches[0] : ev;
    var sx = t.clientX;
    var sy = t.clientY;
    if (state.mode === "play") {
      var w = G.screenToWorld(state, sx, sy);
      return { x: w.x, y: w.y, sx: sx, sy: sy };
    }
    return { x: sx, y: sy, sx: sx, sy: sy };
  }

  function onDown(ev) {
    if (state.mode !== "play") return;
    var p = pointerPos(ev);
    state.pointer.x = p.x;
    state.pointer.y = p.y;
    state.pointer.sx = p.sx;
    state.pointer.sy = p.sy;
    if (state.mode === "play") state.pointer.live = true;
    state.pointer.touch = !!(ev.touches && ev.touches.length);
    if (state.userPaused) {
      updateInspect();
      return;
    }
    if (state.paused) return;
    if (state.defeat) return;
    if (state.stageOutro) return;
    if (ev.button === 2) return;
    ev.preventDefault();
    G.audio.ensure();
    state.pointer.down = true;
    var target = G.merge.unitAt(state, p.x, p.y);
    var canMerge =
      target &&
      !target.commander &&
      G.merge.canEvolve(target) &&
      state.units.some(function (other) {
        return other.id !== target.id && other.hp > 0 && other.kind === target.kind;
      });
    if (canMerge && G.merge.begin(state, p.x, p.y)) {
      state.pointer.moveSquad = false;
    } else if (state.pointer.touch) {
      state.pointer.moveSquad = true;
      var b = G.playfield(state);
      state.squad.x = Math.max(b.x0, Math.min(b.x1, p.x));
      state.squad.y = Math.max(b.y0, Math.min(b.y1, p.y));
    } else {
      state.pointer.moveSquad = false;
      if (G.tactics) G.tactics.onFireDown(state);
    }
  }

  function onMove(ev) {
    var p = pointerPos(ev);
    state.pointer.x = p.x;
    state.pointer.y = p.y;
    state.pointer.sx = p.sx;
    state.pointer.sy = p.sy;
    if (state.mode === "play") state.pointer.live = true;
    if (state.mode === "play" && state.userPaused) {
      updateInspect();
      return;
    }
    if (!state.pointer.down || state.mode !== "play" || state.paused || state.stageOutro) return;
    ev.preventDefault();
    if (state.held) G.merge.move(state, p.x, p.y);
    else if (state.pointer.moveSquad) {
      var b = G.playfield(state);
      state.squad.x = Math.max(b.x0, Math.min(b.x1, p.x));
      state.squad.y = Math.max(b.y0, Math.min(b.y1, p.y));
    }
  }

  function onUp(ev) {
    if (ev.button === 2) {
      ev.preventDefault();
      if (G.tactics) G.tactics.onAltUp(state);
      return;
    }
    if (state.mode !== "play") {
      state.pointer.down = false;
      return;
    }
    ev.preventDefault();
    if (state.userPaused) {
      if (state.held) {
        state.held.held = false;
        state.held = null;
        state.mergeHint = null;
      }
      state.pointer.down = false;
      state.pointer.moveSquad = false;
      return;
    }
    if (state.held) {
      var pending = G.merge.end(state);
      if (pending) openMerge(pending);
    } else if (state.pointer.fireHold && G.tactics) {
      G.tactics.onFireUp(state);
    }
    state.pointer.down = false;
    state.pointer.moveSquad = false;
  }

  function syncHud(dt) {
    dt = dt || 0.016;
    var stage = G.STAGES[state.stageIndex];
    document.getElementById("hud-stage").textContent = "Fase " + (state.stageIndex + 1) + " · " + stage.name;
    document.getElementById("hud-wave").textContent = "Onda " + (state.waveIndex + 1) + "/" + stage.waves.length;
    document.getElementById("hud-coins").textContent = String(state.run.coins);
    document.getElementById("hud-reserve").textContent = G.merge.intelLine(state.run);
    var hp = 0;
    var max = 0;
    for (var i = 0; i < state.units.length; i++) {
      hp += state.units[i].hp;
      max += state.units[i].maxHp;
    }
    document.getElementById("hp-fill").style.width = (max ? Math.max(0, (hp / max) * 100) : 0) + "%";
    document.getElementById("btn-mute").textContent = G.audio.muted ? "Mudo" : "Som";
    syncVolumeUi();
    var boss = null;
    for (var b = 0; b < state.enemies.length; b++) {
      var be = state.enemies[b];
      if (!be.def.boss || be.hp <= 0 || be.fake) continue;
      if (be.type === "chefe_final") {
        boss = be;
        break;
      }
      if (!boss || be.maxHp > boss.maxHp) boss = be;
    }
    var bossHud = document.getElementById("boss-hud");
    if (boss) {
      bossHud.classList.remove("hidden");
      document.getElementById("boss-name").textContent = boss.def.name;
      var title = boss.def.title || "";
      if (boss.type === "chefe_final") {
        var ph = boss.bossPhase || 1;
        title = ph === 1 ? "Camada 1 · a Colmeia protege" : ph === 2 ? "Camada 2 · a Mariposa esconde" : "Camada 3 · núcleo exposto";
      } else if (boss.type === "chefe_megatanque") {
        var kingHud = false;
        for (var kh = 0; kh < state.enemies.length; kh++) {
          if (state.enemies[kh].type === "chefe_beeking" && state.enemies[kh].hp > 0) kingHud = true;
        }
        if (kingHud) title = (title || "Imperatriz da Colmeia") + " · com o Beeking-08";
        if (boss.enrage) title = "Enrage · a colmeia sem rei";
      } else if (boss.type === "chefe_beeking" && boss.enrage) {
        title = "Fúria do rei";
      }
      document.getElementById("boss-title").textContent = title;
      var pct = Math.max(0, boss.hp / boss.maxHp);
      if (pct < state.bossShown) state.bossShown = Math.max(pct, state.bossShown - dt * 0.55);
      else state.bossShown = pct;
      document.getElementById("souls-fill").style.width = pct * 100 + "%";
      document.getElementById("souls-delay").style.width = state.bossShown * 100 + "%";
    } else {
      bossHud.classList.add("hidden");
      state.bossShown = 1;
    }
    var bar = document.getElementById("active-bar");
    bar.innerHTML = "";
    var dashReady = (state.dashCd || 0) <= 0;
    var dashMax = state.dashCdMax || G.combat.dashCd();
    var dashFrac = dashReady ? 100 : Math.max(0, 1 - (state.dashCd || 0) / dashMax) * 100;
    var dashSlot = document.createElement("button");
    dashSlot.type = "button";
    dashSlot.className = "active-slot" + (dashReady ? " ready" : " cd");
    dashSlot.style.setProperty("--cd", dashFrac + "%");
    dashSlot.title = "Ímpeto — avanço curto na direção do movimento, ou da mira se o esquadrão estiver parado.";
    dashSlot.innerHTML =
      "<span class=\"key\">⇧</span>" +
      "<span class=\"ico\">»</span>" +
      "<span class=\"nm\">Ímpeto</span>";
    dashSlot.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (state.paused) return;
      G.combat.tryDash(state);
      syncHud();
    };
    bar.appendChild(dashSlot);
    var act = G.combat.activesOf(state);
    if (state.skillSlot == null) state.skillSlot = 0;
    if (act.length && state.skillSlot >= act.length) state.skillSlot = act.length - 1;
    for (var s = 0; s < act.length; s++) {
      var slot = document.createElement("button");
      slot.type = "button";
      var aid = act[s].def.active.id;
      var guer = aid === "guerrilla" && G.tactics && G.tactics.guerrillaHud ? G.tactics.guerrillaHud(state) : null;
      var ready = guer ? guer.anyReady : act[s].activeCd <= 0 && !act[s].activeHeld;
      var meta = G.activeMeta(aid);
      var cdMax = act[s].def.active.cd || 1;
      var frac = act[s].activeHeld ? 8 : ready ? 100 : Math.max(0, 1 - act[s].activeCd / cdMax) * 100;
      var n = act[s].stackN || 1;
      var sel = s === (state.skillSlot | 0);
      slot.className = "active-slot" + (guer ? " guerrilla" : "") + (ready ? " ready" : " cd") + (sel ? " selected" : "");
      slot.style.setProperty("--cd", frac + "%");
      slot.title = act[s].def.active.name + " — " + (meta.detail || act[s].def.active.desc);
      if (guer) {
        slot.title += " Recrutas nesta fase: " + guer.recruitsLeft + "/5.";
        function pip(cd, max, ok) {
          var on = cd <= 0 && ok !== false;
          var pf = on ? 100 : Math.max(0, 1 - cd / max) * 100;
          return "<i class=\"" + (on ? "ready" : "cd") + "\" style=\"--cd:" + pf + "%\">";
        }
        slot.innerHTML =
          "<span class=\"key\">" + (s + 1) + "</span>" +
          "<span class=\"ico\">" + (G.activeIconHtml ? G.activeIconHtml(aid) : meta.icon) + "</span>" +
          "<span class=\"nm\">Guerrilha</span>" +
          "<span class=\"g-pips\">" +
            pip(guer.crate, guer.crateMax) + "✚</i>" +
            pip(guer.recruit, guer.recruitMax, guer.recruitsLeft > 0) + "○</i>" +
            pip(guer.strike, guer.strikeMax) + "△</i>" +
          "</span>";
      } else {
        var nm = act[s].def.active.name;
        if (aid === "firemode") {
          var modes = ["Fuzil", "Granada", "Barragem"];
          nm = modes[state.tankFireMode || 0] || "Fuzil";
        }
        slot.innerHTML =
          "<span class=\"key\">" + (s + 1) + "</span>" +
          (n > 1 ? "<span class=\"stack\">×" + n + "</span>" : "") +
          "<span class=\"ico\">" + (G.activeIconHtml ? G.activeIconHtml(aid) : meta.icon) + "</span>" +
          "<span class=\"nm\">" + nm + "</span>";
      }
      slot.onclick = (function (idx) {
        return function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          state.skillSlot = idx;
          G.audio.ui();
          syncHud();
        };
      })(s);
      bar.appendChild(slot);
    }
  }

  function hexRgba(hex, a) {
    var h = String(hex || "#ffffff").replace("#", "");
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    var n = parseInt(h, 16);
    if (isNaN(n)) n = 0xffffff;
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  function drawFavorAuras() {
    var cards = [];
    if (state.hoverCard) {
      if (state.hoverCard.favor) cards.push(state.hoverCard);
    } else {
      var offer = state.offer || [];
      for (var c = 0; c < offer.length; c++) {
        if (offer[c].favor) cards.push(offer[c]);
      }
    }
    if (!cards.length) return;
    var pulse = 0.5 + Math.sin(state.time * 3.2) * 0.22;
    var seen = {};
    for (var u = 0; u < state.units.length; u++) {
      var unit = state.units[u];
      if (unit.hp <= 0 || unit.stowed || seen[unit.id]) continue;
      var match = false;
      for (var k = 0; k < cards.length; k++) {
        var favor = cards[k].favor;
        var auraFavor = { projectile: favor.projectile, kind: favor.kind, role: favor.role };
        if (G.upgrades.matchesFavor(unit, auraFavor, state)) {
          match = true;
          break;
        }
      }
      if (!match) continue;
      seen[unit.id] = true;
      var r = unit.def.size + 16 + pulse * 4;
      ctx.beginPath();
      ctx.arc(unit.x, unit.y, r, 0, Math.PI * 2);
      ctx.fillStyle = hexRgba(unit.def.color, 0.14 + pulse * 0.1);
      ctx.fill();
      ctx.strokeStyle = hexRgba(unit.def.color, 0.42 + pulse * 0.4);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  function defeatWorldAlpha() {
    if (!state.defeat) return 1;
    var k = Math.max(0, Math.min(1, (state.defeat.t - 0.08) / 1.05));
    k = k * k * (3 - 2 * k);
    return 1 - k;
  }

  function drawGround() {
    var worldA = defeatWorldAlpha();
    if (worldA <= 0.02) return;
    ctx.save();
    ctx.globalAlpha *= worldA;
    var b = G.playfield(state);
    var gw = b.x1 - b.x0 + 40;
    var gh = b.y1 - b.y0 + 40;
    var gx = b.x0 - 20;
    var gy = b.y0 - 20;
    var theme = state.theme;
    ctx.fillStyle = theme.ground;
    ctx.fillRect(gx, gy, gw, gh);
    var img = state.bgImg;
    if ((!img || !img.naturalWidth) && G.STAGES[state.stageIndex]) {
      img = G.stageBg(G.STAGES[state.stageIndex]);
      state.bgImg = img;
    }
    if (img && img.naturalWidth) {
      var iw = img.naturalWidth;
      var ih = img.naturalHeight;
      var scale = Math.max(gw / iw, gh / ih);
      var dw = iw * scale;
      var dh = ih * scale;
      ctx.drawImage(img, gx + (gw - dw) / 2, gy + (gh - dh) / 2, dw, dh);
      ctx.fillStyle = "rgba(8, 12, 20, 0.28)";
      ctx.fillRect(gx, gy, gw, gh);
    } else {
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      var step = 48;
      ctx.beginPath();
      for (var x = gx; x < gx + gw; x += step) {
        ctx.moveTo(x, gy);
        ctx.lineTo(x, gy + gh);
      }
      for (var y = gy; y < gy + gh; y += step) {
        ctx.moveTo(gx, y);
        ctx.lineTo(gx + gw, y);
      }
      ctx.stroke();
      ctx.fillStyle = theme.fog;
      ctx.fillRect(gx, gy, gw, gh);
    }
    if ((state.camZoom || 1) < 0.99 && !state.defeat) {
      ctx.strokeStyle = "rgba(255, 243, 106, 0.28)";
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    }
    ctx.restore();
  }

  function drawAim() {
    if (state.mode !== "play" || state.userPaused || state.pendingMerge || state.defeat) return;
    if (!state.pointer.live || state.pointer.x == null) return;
    var p = G.combat.aimPoint(state);
    var snap = G.combat.aimTarget(state);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = snap ? "#ff6b6b" : state.pointer.fireHold ? "#ffb45a" : "#7ec8ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-8, 0);
    ctx.moveTo(8, 0);
    ctx.lineTo(12, 0);
    ctx.moveTo(0, -12);
    ctx.lineTo(0, -8);
    ctx.moveTo(0, 8);
    ctx.lineTo(0, 12);
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (snap) {
      ctx.strokeStyle = "rgba(255,107,107,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(snap.x, snap.y, (snap.def.size || 12) + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (state.dashActive || (state.dashT || 0) > 0) {
      var dir = state.dashDir || { x: 0, y: -1 };
      var packed = 0;
      for (var ds = 0; ds < state.units.length; ds++) {
        if (state.units[ds].stowed) packed++;
      }
      var erx = 26 + packed * 3;
      var ery = 14 + packed * 1.4;
      ctx.save();
      ctx.translate(state.squad.x, state.squad.y);
      ctx.rotate(Math.atan2(dir.y, dir.x));
      ctx.fillStyle = "rgba(180,230,255,0.12)";
      ctx.beginPath();
      ctx.ellipse(0, 0, erx * 0.72, ery * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(180,230,255,0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, erx, ery, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function draw() {
    ctx.save();
    if (state.shake > 0.4) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    G.applyCamera(ctx, state);
    if (state.defeat) {
      ctx.fillStyle = "#07090f";
      ctx.fillRect(-state.W * 2, -state.H * 2, state.W * 5, state.H * 5);
    }
    drawGround();
    drawAim();

    var worldA = defeatWorldAlpha();
    var cmdDraw = null;
    for (var u = 0; u < state.units.length; u++) {
      if (state.units[u].commander) cmdDraw = state.units[u];
    }

    if (worldA > 0.02) {
      ctx.save();
      ctx.globalAlpha = worldA;
      if (state.warnings) {
        for (var w = 0; w < state.warnings.length; w++) G.drawWarning(ctx, state.warnings[w]);
      }
      if (G.drawBossWorld) G.drawBossWorld(ctx, state);
      for (var ct = 0; ct < state.enemies.length; ct++) {
        if (G.drawChargeTelegraph) G.drawChargeTelegraph(ctx, state.enemies[ct]);
      }
      if (state.booms) {
        for (var bm = 0; bm < state.booms.length; bm++) {
          var boom = state.booms[bm];
          var bk = Math.max(0, boom.t / boom.max);
          var br = boom.r * (1.15 - bk * 0.35);
          ctx.save();
          ctx.globalAlpha = Math.min(1, bk * 1.2);
          ctx.strokeStyle = boom.color || "#ffb45a";
          ctx.lineWidth = 5 + (1 - bk) * 10;
          ctx.beginPath();
          ctx.arc(boom.x, boom.y, br, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = boom.color || "#ffb45a";
          ctx.globalAlpha = 0.16 * bk;
          ctx.beginPath();
          ctx.arc(boom.x, boom.y, br * 0.72, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.globalAlpha = 0.55 * bk;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(boom.x, boom.y, br * 0.45, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      if (state.mines) {
        for (var m = 0; m < state.mines.length; m++) G.drawMine(ctx, state.mines[m]);
      }
      for (var d = 0; d < state.drops.length; d++) G.drawDrop(ctx, state.drops[d]);
      for (var e = 0; e < state.enemies.length; e++) G.drawEnemy(ctx, state.enemies[e]);
      for (var au = 0; au < state.units.length; au++) {
        if (!state.units[au].commander && !state.units[au].stowed) G.drawPlayerUnit(ctx, state.units[au], state.time);
      }
      for (var p = 0; p < state.projectiles.length; p++) G.drawProjectile(ctx, state.projectiles[p]);
      if (G.tactics && G.tactics.draw) G.tactics.draw(ctx, state);
      ctx.restore();
    }
    if (G.drawArenaDark) G.drawArenaDark(ctx, state);
    if (cmdDraw) G.drawPlayerUnit(ctx, cmdDraw, state.time);
    if ((state.vultoDark || 0) > 0.15 || (state.vultoBlind || 0) > 0) drawAim();

    if (state.run && state.run.smokeT > 0 && worldA > 0.02) {
      var pb = G.playfield(state);
      ctx.fillStyle = "rgba(190, 200, 214, " + (0.22 * worldA) + ")";
      ctx.fillRect(pb.x0, pb.y0, pb.x1 - pb.x0, pb.y1 - pb.y0);
    }
    if (state.run && (state.run.coilT || 0) > 0 && (state.run.coilHp || 0) > 0 && worldA > 0.02) {
      ctx.strokeStyle = "rgba(168, 246, 255, " + (0.45 * worldA) + ")";
      ctx.lineWidth = 3;
      for (var ch = 0; ch < state.units.length; ch++) {
        if (state.units[ch].hp <= 0 || state.units[ch].stowed) continue;
        ctx.beginPath();
        ctx.arc(state.units[ch].x, state.units[ch].y, state.units[ch].def.size + 16, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (state.run && state.run.tempShield > 0 && worldA > 0.02) {
      ctx.strokeStyle = "rgba(255, 233, 160, " + (0.35 * worldA) + ")";
      ctx.lineWidth = 3;
      for (var sh = 0; sh < state.units.length; sh++) {
        if (state.units[sh].hp <= 0 || state.units[sh].stowed) continue;
        ctx.beginPath();
        ctx.arc(state.units[sh].x, state.units[sh].y, state.units[sh].def.size + 14, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (state.mode === "cards") drawFavorAuras();
    if (state.run && (state.run.tempDmg || 1) > 1 && worldA > 0.02) {
      var pb2 = G.playfield(state);
      ctx.fillStyle = "rgba(255, 120, 40, " + (0.06 * worldA) + ")";
      ctx.fillRect(pb2.x0, pb2.y0, pb2.x1 - pb2.x0, pb2.y1 - pb2.y0);
    }
    if (state.vfx && worldA > 0.02) {
      for (var v = 0; v < state.vfx.length; v++) {
        var fx = state.vfx[v];
        if (fx.slash || fx.phalanxBeam || fx.warSlash) continue;
        var k = Math.max(0, fx.t / fx.max);
        ctx.save();
        ctx.globalAlpha = k;
        if (fx.notice) {
          var hold = fx.t >= 0.4 ? 1 : Math.max(0, fx.t / 0.4);
          ctx.globalAlpha = hold;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = fx.color;
          ctx.font = "13px Segoe UI, sans-serif";
          if (fx.id === "reap" && G.drawScytheIcon) G.drawScytheIcon(ctx, fx.x, fx.y - 12, 13, fx.color || "#c41e3a");
          else ctx.fillText(G.activeMeta(fx.id).icon, fx.x, fx.y - 12);
          ctx.font = "bold 12px Segoe UI, sans-serif";
          ctx.lineJoin = "round";
          ctx.strokeStyle = "rgba(0,0,0,0.78)";
          ctx.lineWidth = 3;
          ctx.strokeText(fx.title || "", fx.x, fx.y + 3);
          ctx.fillText(fx.title || "", fx.x, fx.y + 3);
        } else {
          ctx.strokeStyle = fx.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(fx.x, fx.y, 16 + (1 - k) * 46, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = "13px Segoe UI, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = fx.color;
          if (fx.id === "reap" && G.drawScytheIcon) G.drawScytheIcon(ctx, fx.x, fx.y - 6, 12, fx.color || "#c41e3a");
          else ctx.fillText(G.activeMeta(fx.id).icon, fx.x, fx.y - 6);
        }
        ctx.restore();
      }
    }

    if (state.mergeHint && state.held) {
      ctx.strokeStyle = "#7cff8a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(state.mergeHint.x, state.mergeHint.y, state.mergeHint.def.size + 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (var i = 0; i < state.particles.length; i++) {
      var pt = state.particles[i];
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      if (pt.streak) {
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.ang || 0);
        ctx.globalAlpha *= 0.55;
        ctx.beginPath();
        ctx.ellipse(0, 0, pt.size * 2.6, pt.size * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (pt.cross) {
        var cs = pt.size;
        ctx.fillRect(pt.x - cs * 0.22, pt.y - cs, cs * 0.44, cs * 2);
        ctx.fillRect(pt.x - cs, pt.y - cs * 0.22, cs * 2, cs * 0.44);
      } else {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (var f = 0; f < state.floaters.length; f++) {
      var fl = state.floaters[f];
      ctx.globalAlpha = Math.max(0, fl.life / fl.max);
      ctx.fillStyle = fl.color;
      ctx.font = "bold 16px Segoe UI, sans-serif";
      ctx.fillText(fl.text, fl.x, fl.y);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
    if (state.banner && state.banner.t > 0 && !state.defeat) {
      var ba = Math.min(1, state.banner.t);
      ctx.save();
      ctx.globalAlpha = ba;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 20px Segoe UI, sans-serif";
      var tw = ctx.measureText(state.banner.text).width;
      ctx.fillStyle = "rgba(6, 8, 16, 0.55)";
      ctx.fillRect(state.W / 2 - tw / 2 - 12, state.H / 2 - 16, tw + 24, 32);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
      ctx.lineWidth = 4;
      ctx.strokeText(state.banner.text, state.W / 2, state.H / 2);
      ctx.fillStyle = "#ffd24a";
      ctx.fillText(state.banner.text, state.W / 2, state.H / 2);
      ctx.restore();
    }
    if (state.defeat && !state.defeat.overlay) {
      var vt = Math.max(0, Math.min(1, state.defeat.t / 1.35));
      vt = vt * vt * (3 - 2 * vt);
      var g = ctx.createRadialGradient(
        state.W / 2, state.H / 2, 36,
        state.W / 2, state.H / 2, Math.max(state.W, state.H) * 0.58
      );
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.42, "rgba(4, 6, 12, " + (0.08 + vt * 0.16) + ")");
      g.addColorStop(1, "rgba(4, 6, 12, " + (0.45 + vt * 0.42) + ")");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, state.W, state.H);
    }
  }

  var last = performance.now();
  function loop(now) {
    var dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    state.time += dt;
    if (state.mode === "play") {
      if (state.banner) state.banner.t -= dt;
      if (!state.paused) {
        var result = G.game.update(state, dt);
        if (state.pendingPromote && !state.pendingMerge) {
          openMerge(state.pendingPromote);
          state.pendingPromote = null;
        }
        if (result === "dead") beginDefeat();
        else if (result === "stageClear") {
          if (state.stageIndex >= G.STAGES.length - 1) finish(true);
          else showCards();
        }
      }
      if (state.defeat) tickDefeat(dt);
      syncHud(dt);
    }
    draw();
    requestAnimationFrame(loop);
  }

  document.getElementById("btn-play").onclick = startPlay;
  document.getElementById("btn-merge-cancel").onclick = function () {
    G.audio.ui();
    closeMerge();
  };
  document.getElementById("btn-codex").onclick = function () {
    G.audio.ui();
    renderCodex();
    showScreen("codex");
  };
  document.getElementById("btn-codex-back").onclick = function () {
    G.audio.ui();
    refreshMenu();
    showScreen("menu");
  };
  document.getElementById("codex-ally").onclick = function () {
    G.audio.ui();
    codexTab = "ally";
    renderCodex();
  };
  document.getElementById("codex-enemy").onclick = function () {
    G.audio.ui();
    codexTab = "enemy";
    renderCodex();
  };
  document.getElementById("btn-codex-close").onclick = function () {
    G.audio.ui();
    closeCodexSheet();
  };
  document.getElementById("codex-modal").onclick = function (ev) {
    if (ev.target.id === "codex-modal") closeCodexSheet();
  };
  document.getElementById("pause-modal").onclick = function (ev) {
    if (ev.target.id === "pause-modal") {
      G.audio.ui();
      closePause();
    }
  };
  document.getElementById("btn-pause").onclick = function () {
    G.audio.ui();
    if (state.userPaused) closePause();
    else openPause();
  };
  document.getElementById("btn-resume").onclick = function () {
    G.audio.ui();
    closePause();
  };
  document.getElementById("btn-pause-menu").onclick = function () {
    G.audio.ui();
    G.save.bank(state.run.coins);
    closePause();
    refreshMenu();
    showScreen("menu");
  };
  window.addEventListener("keydown", function (ev) {
    var tag = ((ev.target && ev.target.tagName) || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || (ev.target && ev.target.isContentEditable)) return;
    if (ev.key === "Escape") {
      if (!document.getElementById("codex-modal").classList.contains("hidden")) {
        closeCodexSheet();
        return;
      }
      if (state.mode === "play" && !state.pendingMerge) {
        if (state.userPaused) closePause();
        else openPause();
      }
      return;
    }
    if (state.mode === "play") {
      state.keys[ev.code] = true;
      if (
        ev.code === "KeyW" ||
        ev.code === "KeyA" ||
        ev.code === "KeyS" ||
        ev.code === "KeyD" ||
        ev.code === "ArrowUp" ||
        ev.code === "ArrowDown" ||
        ev.code === "ArrowLeft" ||
        ev.code === "ArrowRight" ||
        ev.key === "Shift" ||
        ev.code === "Space"
      ) {
        ev.preventDefault();
      }
      if (ev.key === "Shift" && !ev.repeat && !state.paused && !state.defeat) G.combat.tryDash(state);
    }
    if (state.mode !== "play" || state.paused) return;
    var n = ev.key === "1" || ev.key === "2" || ev.key === "3" || ev.key === "4" || ev.key === "5" || ev.key === "6" || ev.key === "7" || ev.key === "8" || ev.key === "9"
      ? ev.key.charCodeAt(0) - 49
      : -1;
    if (n >= 0 && n <= 8) {
      var acts = G.combat.activesOf(state);
      if (n < acts.length) {
        state.skillSlot = n;
        G.audio.ui();
        syncHud();
      }
    }
  });
  window.addEventListener("keyup", function (ev) {
    if (state.keys) state.keys[ev.code] = false;
  });
  window.addEventListener("blur", function () {
    state.keys = {};
  });
  document.getElementById("btn-how").onclick = function () {
    G.audio.ui();
    showScreen("how");
  };
  document.getElementById("btn-how-back").onclick = function () {
    G.audio.ui();
    refreshMenu();
    showScreen("menu");
  };
  document.getElementById("btn-shop").onclick = function () {
    G.audio.ui();
    renderShop();
    showScreen("shop");
  };
  document.getElementById("btn-shop-back").onclick = function () {
    G.audio.ui();
    refreshMenu();
    showScreen("menu");
  };
  document.getElementById("btn-refund").onclick = function () {
    G.audio.ui();
    var got = G.upgrades.refundPerm();
    if (got) renderShop();
  };
  document.getElementById("btn-reroll").onclick = function () {
    if ((state.run.rerolls | 0) <= 0) return;
    G.audio.ui();
    state.run.rerolls -= 1;
    state.offer = G.upgrades.pickThree(state);
    renderCards();
  };
  document.getElementById("btn-undo").onclick = function () {
    if (!G.upgrades.undoLast(state)) return;
    G.audio.ui();
    renderCards();
  };
  document.getElementById("btn-over-menu").onclick = document.getElementById("btn-win-menu").onclick = function () {
    G.audio.ui();
    refreshMenu();
    showScreen("menu");
  };
  document.getElementById("btn-mute").onclick = function () {
    G.audio.muted = !G.audio.muted;
    G.save.muted = G.audio.muted;
    G.save.persist();
    G.audio.applyMute();
    syncHud();
  };

  var volSliders = [
    document.getElementById("vol-slider"),
    document.getElementById("vol-slider-menu"),
    document.getElementById("vol-slider-pause")
  ];

  function syncVolumeUi() {
    var pct = Math.round((G.audio.master || 0) * 100);
    volSliders.forEach(function (el) {
      if (el && el.value !== String(pct)) el.value = String(pct);
    });
    var menuPct = document.getElementById("vol-pct-menu");
    var pausePct = document.getElementById("vol-pct-pause");
    if (menuPct) menuPct.textContent = pct + "%";
    if (pausePct) pausePct.textContent = pct + "%";
  }

  function applyVolume(raw, persist) {
    var v = Math.max(0, Math.min(1, (Number(raw) || 0) / 100));
    G.audio.setVolume(v);
    G.save.volume = v;
    if (v > 0.01 && G.audio.muted) {
      G.audio.muted = false;
      G.save.muted = false;
      G.audio.applyMute();
    }
    if (persist) G.save.persist();
    syncVolumeUi();
    document.getElementById("btn-mute").textContent = G.audio.muted ? "Mudo" : "Som";
  }

  volSliders.forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", function () { applyVolume(el.value, false); });
    el.addEventListener("change", function () { applyVolume(el.value, true); });
  });

  function onRightDown(ev) {
    if (ev.button !== 2) return;
    ev.preventDefault();
    if (state.mode !== "play") return;
    var p = pointerPos(ev);
    state.pointer.x = p.x;
    state.pointer.y = p.y;
    state.pointer.sx = p.sx;
    state.pointer.sy = p.sy;
    if (state.mode === "play") state.pointer.live = true;
    if (state.userPaused || state.paused || state.stageOutro || state.pendingMerge) return;
    G.audio.ensure();
    if (G.tactics) G.tactics.onAltDown(state);
  }

  canvas.addEventListener("mousedown", onDown);
  window.addEventListener("mousedown", onRightDown, true);
  document.addEventListener("contextmenu", function (ev) { ev.preventDefault(); }, true);
  document.addEventListener("auxclick", function (ev) {
    if (ev.button === 2) ev.preventDefault();
  }, true);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  canvas.addEventListener("touchstart", onDown, { passive: false });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onUp, { passive: false });
  window.addEventListener("resize", resize);

  G.save.load();
  G.audio.muted = !!G.save.muted;
  G.audio.setVolume(G.save.volume == null ? 0.8 : G.save.volume);
  G.audio.applyMute();
  syncVolumeUi();
  resize();
  refreshMenu();
  overlay.classList.add("boot-wait");
  showScreen("menu");
  requestAnimationFrame(loop);
  setTimeout(function () {
    var boot = document.getElementById("boot-veil");
    if (boot) boot.classList.add("done");
    overlay.classList.remove("boot-wait");
  }, 780);
})(window.TFAG = window.TFAG || {});
