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
    win: document.getElementById("screen-win"),
    debug: document.getElementById("screen-debug")
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
    mergeSlow: false,
    shake: 0,
    banner: { text: "", t: 0 },
    theme: G.THEMES.field,
    time: 0,
    run: G.upgrades.defaultRun(),
    stageIndex: 0,
    waveIndex: 0,
    bossShown: 1,
    bossShownB: 1,
    camZoom: 1,
    camZoomTo: 1,
    offer: [],
    hoverCard: null,
    paused: false,
    userPaused: false,
    pendingMerge: null,
    archiveMenu: false,
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
    hud.style.opacity = "";
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
      closeArchive();
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
    document.getElementById("over-text").textContent = state.debugFight
      ? "Teste encerrado na fase " + (state.stageIndex + 1) + "."
      : "A linha quebrou na fase " + (state.stageIndex + 1) + ".";
    var rows = [
      ["Fase", (state.stageIndex + 1) + " · " + stage.name],
      ["Onda", (state.waveIndex + 1) + "/" + ((stage.waves && stage.waves.length) || 1)],
      ["Abates", String((state.run && state.run.kills) | 0)],
      ["Moedas", "+" + coins + " pro cofre"]
    ];
    if (intel.arquivo | 0) {
      rows.push(["Arquivos", String(intel.arquivo | 0)]);
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
      if (state.glinderAshDefeat) {
        cmd.ashT = Math.max(cmd.ashT || 0, 1);
        cmd.fallT = 0;
        cmd.burnKill = cmd.burnKill || 3;
      } else {
        cmd.fallT = 0.001;
      }
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
      kind: state.glinderAshDefeat ? "ash" : "fall",
      cmdId: cmd ? cmd.id : 0,
      cx: cmd ? cmd.x : state.squad.x,
      cy: cmd ? cmd.y : state.squad.y,
      look0: { x: state.W / 2, y: state.H / 2 }
    };
    state.camLook = { x: state.W / 2, y: state.H / 2 };
    state.userPaused = false;
    closeArchive();
    closeMerge();
    closePause();
    closeCodexSheet();
    hud.classList.add("defeat-hide");
    state.camZoomTo = state.glinderAshDefeat ? 3.4 : 4.85;
    state.shake = Math.max(state.shake || 0, 6);
    if (cmd) G.burst(state, cmd.x, cmd.y, "#ffe08a", 18, 90);
    if (!state.debugFight) {
      G.save.bank(state.run.coins);
      G.save.noteStage(state.stageIndex + 1);
    }
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
    if (cmd && !d.hit && (cmd.fallT || 0) >= 2.52 && d.kind !== "ash") {
      d.hit = true;
      state.shake = Math.max(state.shake || 0, 8);
      spawnFallDust(cmd);
    }
    if (d.kind === "ash" && d.t >= 2.15) presentDefeatOverlay();
    else if (d.kind !== "ash" && d.t >= 3.45) presentDefeatOverlay();
  }

  function syncIfcaraButton() {
    var btn = document.getElementById("btn-ifcara");
    if (!btn || !G.debug) return;
    btn.classList.toggle("hidden", !G.debug.isOn());
  }

  function refreshMenu() {
    var d = G.save.data;
    document.getElementById("menu-stats").textContent =
      d.name + " · Cofre: " + d.vault + " · Melhor fase: " + (d.bestStage || 0) + "/" + G.STAGES.length;
    renderSlots();
    renderInvasion();
    syncIfcaraButton();
  }

  function renderInvasion() {
    var row = document.getElementById("invasion-row");
    var picks = document.getElementById("invasion-picks");
    if (!row || !picks || !G.invasion) return;
    row.classList.remove("hidden");
    var unlocked = G.invasion.unlocked();
    var sel = G.invasion.selected();
    picks.innerHTML = "";
    function addPick(n, label, locked) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "invasion-pick" + (sel === n ? " active" : "") + (locked ? " locked" : "");
      btn.disabled = !!locked;
      btn.textContent = locked ? "🔒 " + label : label;
      btn.title = locked
        ? "Termina uma run no nível anterior pra abrir."
        : n === 0
          ? "Campanha padrão."
          : "Bichos +" + (n * 50) + "% HP, +" + (n * 25) + "% dano, +" + (n * 10) + "% cadência, +" + (n * 5) + "% velocidade. Bosses +" + (n * 30) + "% HP, +" + (n * 20) + "% dano, +" + (n * 5) + "% cadência, +" + (n * 2) + "% velocidade. +" + (n * 10) + "% de quantidade. Chefes das fases 1–" + n + " entram em segunda barra.";
      btn.onclick = function () {
        if (locked) return;
        G.audio.ui();
        G.invasion.setSelected(n);
        renderInvasion();
      };
      picks.appendChild(btn);
    }
    addPick(0, "Campanha", false);
    for (var i = 1; i <= G.invasion.MAX; i++) addPick(i, String(i), i > unlocked);
    var play = document.getElementById("btn-play");
    if (play) play.textContent = sel > 0 ? "Jogar · Invasão " + sel : "Jogar";
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
    state.paused = !!state.pendingMerge || !!state.archiveMenu || !!state.userPaused;
    syncAimCursor();
  }

  function syncAimCursor() {
    canvas.classList.toggle(
      "aim-hide",
      state.mode === "play" && !state.userPaused && !state.pendingMerge && !state.archiveMenu
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
    if (state.mode !== "play" || state.pendingMerge || state.archiveMenu || state.defeat) return;
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

  function kaskaPortraitKey(form) {
    return form === "p2" ? "chefe_comandante_p2" : "chefe_comandante";
  }

  function setCodexForm(form) {
    codexForm = form;
    var p1 = document.getElementById("codex-form-p1");
    var p2 = document.getElementById("codex-form-p2");
    if (p1) p1.classList.toggle("on", form === "p1");
    if (p2) p2.classList.toggle("on", form === "p2");
  }

  function paintCodexArt(team, key, known) {
    var extra = team === "enemy" && key === "chefe_comandante" ? kaskaPortraitKey(codexForm) : null;
    G.drawPortrait(document.getElementById("codex-art"), team, key, !known, extra);
  }

  function showCodexForms(team, key, known) {
    var box = document.getElementById("codex-forms");
    var show = team === "enemy" && key === "chefe_comandante" && known;
    box.classList.toggle("hidden", !show);
    if (show) setCodexForm(codexForm);
  }

  function kaskaBlurb(form) {
    var edef = G.ENEMY_DEFS.chefe_comandante;
    if (!edef) return "";
    return form === "p2" && edef.blurbP2 ? edef.blurbP2 : edef.blurb;
  }

  function applyKaskaForm(form) {
    if (codexSheet !== "enemy:chefe_comandante") return;
    setCodexForm(form);
    paintCodexArt("enemy", "chefe_comandante", true);
    document.getElementById("codex-blurb").textContent = kaskaBlurb(form);
  }

  function openCodexSheet(team, key, known) {
    var modal = document.getElementById("codex-modal");
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
    codexForm = "p1";
    paintCodexArt(team, key, known);
    showCodexForms(team, key, known);
    codexSheet = team + ":" + key;

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
        blurbEl.textContent = key === "chefe_comandante" ? kaskaBlurb(codexForm) : (edef.blurb || G.enemyKindLabel(edef.kind));
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
    document.getElementById("codex-forms").classList.add("hidden");
    codexSheet = null;
    codexForm = "p1";
  }

  function openMerge(pending) {
    if (!pending || !pending.options || !pending.options.length) return;
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
      ? "Gasta os arquivos e escolhe no que essa unidade vira. Passe o mouse pra ver o dossiê."
      : pending.cost
        ? "O Colosso custa " + pending.cost + " arquivos de guerra. Passe o mouse na carta pra ver o dossiê."
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
        if (!G.merge.confirm(state, kind, pending)) return;
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
      def.role === "warlord" || def.role === "paladin" || def.role === "reaper" || def.role === "colossus" ? "Dano " + def.dmg : def.projectile === "none" ? "suporte" : "Dano " + def.dmg,
      def.role === "warlord" || def.role === "paladin" || def.role === "reaper" || def.role === "colossus" ? "Alcance " + def.range : def.projectile === "none" ? "" : "Alcance " + def.range,
      def.role === "reaper" ? "AoE " + (def.aoe || 60) : def.role === "colossus" ? "AoE " + (def.aoe || 250) : "",
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
    var pending = state.pendingMerge;
    if (pending && pending.fromBank && !pending.consumed) {
      var intel = G.merge.ensureIntel(state.run);
      intel.arquivo = (intel.arquivo | 0) + (pending.cost | 0);
    }
    var reopen = !!(pending && (pending.fromBank || pending.fromBoard) && state.archiveMenu && state.mode === "play" && !state.defeat);
    state.pendingMerge = null;
    document.getElementById("merge-modal").classList.add("hidden");
    document.getElementById("merge-preview").classList.add("empty");
    syncFreeze();
    if (reopen) openArchive();
  }

  var archiveDrag = null;

  function archiveUnitById(id) {
    for (var i = 0; i < state.units.length; i++) {
      if (state.units[i].id === id) return state.units[i];
    }
    return null;
  }

  function setArchiveHint(msg) {
    var el = document.getElementById("archive-board-hint");
    if (el) el.textContent = msg || "Arrasta duas peças iguais uma em cima da outra.";
  }

  function archiveRing(i, n) {
    var angle = -Math.PI / 2 + (i / Math.max(1, n)) * Math.PI * 2;
    var r = 0.32 + Math.max(0, n - 3) * 0.022;
    return { x: 50 + Math.cos(angle) * r * 100, y: 50 + Math.sin(angle) * r * 100 };
  }

  function clearArchiveDrag() {
    if (archiveDrag && archiveDrag.el) {
      archiveDrag.el.classList.remove("lift");
      archiveDrag.el.style.left = archiveDrag.homeX + "%";
      archiveDrag.el.style.top = archiveDrag.homeY + "%";
    }
    archiveDrag = null;
    var board = document.getElementById("archive-board");
    if (!board) return;
    board.querySelectorAll(".archive-piece").forEach(function (el) {
      el.classList.remove("merge-ok", "merge-hover", "lift");
    });
  }

  function archivePieceAt(clientX, clientY, skipId) {
    var board = document.getElementById("archive-board");
    if (!board) return null;
    var best = null;
    var bestD = 40;
    var nodes = board.querySelectorAll(".archive-piece:not(.empty):not(.cmd)");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var id = el.dataset.id | 0;
      if (id === skipId) continue;
      var r = el.getBoundingClientRect();
      var dx = clientX - (r.left + r.width / 2);
      var dy = clientY - (r.top + r.height / 2);
      var d = Math.hypot(dx, dy);
      if (d < bestD) {
        best = el;
        bestD = d;
      }
    }
    return best;
  }

  function renderArchiveBoard() {
    var board = document.getElementById("archive-board");
    if (!board) return;
    clearArchiveDrag();
    board.innerHTML = "";
    var cmd = null;
    var soldiers = [];
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.hp <= 0) continue;
      if (u.commander) cmd = u;
      else soldiers.push(u);
    }
    soldiers.sort(function (a, b) {
      var ga = a.gen | 0;
      var gb = b.gen | 0;
      if (ga !== gb) return ga - gb;
      return (a.id | 0) - (b.id | 0);
    });

    function placePiece(unit, x, y, extraClass) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "archive-piece" + (extraClass ? " " + extraClass : "");
      el.style.left = x + "%";
      el.style.top = y + "%";
      if (unit) {
        el.dataset.id = String(unit.id);
        var art = document.createElement("canvas");
        art.width = 72;
        art.height = 72;
        G.drawPortrait(art, "player", unit.kind, false);
        el.appendChild(art);
        el.title = unit.def.name + (unit.commander ? " · comandante" : " · Nv. " + (unit.gen | 0));
      } else {
        el.title = "vaga";
      }
      board.appendChild(el);
      return el;
    }

    if (cmd) placePiece(cmd, 50, 50, "cmd");
    var cap = G.maxUnits();
    var n = Math.max(soldiers.length, cap);
    var s;
    for (s = 0; s < n; s++) {
      var pos = archiveRing(s, n);
      if (s < soldiers.length) placePiece(soldiers[s], pos.x, pos.y, "");
      else placePiece(null, pos.x, pos.y, "empty");
    }
    setArchiveHint("Arrasta duas peças iguais uma em cima da outra.");
  }

  function onArchiveBoardDown(ev) {
    if (!state.archiveMenu || state.pendingMerge) return;
    var piece = ev.target.closest && ev.target.closest(".archive-piece");
    if (!piece || piece.classList.contains("cmd") || piece.classList.contains("empty")) return;
    var unit = archiveUnitById(piece.dataset.id | 0);
    if (!unit || unit.hp <= 0 || unit.commander) return;
    ev.preventDefault();
    archiveDrag = {
      unit: unit,
      el: piece,
      id: unit.id,
      homeX: parseFloat(piece.style.left) || 50,
      homeY: parseFloat(piece.style.top) || 50,
      pointer: ev.pointerId
    };
    piece.classList.add("lift");
    var board = document.getElementById("archive-board");
    if (!board) return;
    if (board.setPointerCapture) {
      try { board.setPointerCapture(ev.pointerId); } catch (err) {}
    }
    board.querySelectorAll(".archive-piece:not(.empty):not(.cmd)").forEach(function (el) {
      var other = archiveUnitById(el.dataset.id | 0);
      if (!other || other.id === unit.id) return;
      if (
        other.kind === unit.kind &&
        G.merge.canEvolve(unit) &&
        G.merge.canEvolve(other) &&
        G.merge.openOptions(state, unit.def.merge).length
      ) {
        el.classList.add("merge-ok");
      }
    });
    if (!G.merge.canEvolve(unit)) setArchiveHint(unit.def.name + " já está no topo da pirâmide.");
    else if (!G.merge.openOptions(state, unit.def.merge).length) setArchiveHint("Já tem o máximo dessa evolução.");
    else setArchiveHint("Solta em cima de outro " + unit.def.name + " pra merge.");
  }

  function onArchiveBoardMove(ev) {
    if (!archiveDrag) return;
    var board = document.getElementById("archive-board");
    if (!board) return;
    var r = board.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return;
    var x = ((ev.clientX - r.left) / r.width) * 100;
    var y = ((ev.clientY - r.top) / r.height) * 100;
    archiveDrag.el.style.left = Math.max(8, Math.min(92, x)) + "%";
    archiveDrag.el.style.top = Math.max(8, Math.min(92, y)) + "%";
    board.querySelectorAll(".archive-piece.merge-hover").forEach(function (el) {
      el.classList.remove("merge-hover");
    });
    var over = archivePieceAt(ev.clientX, ev.clientY, archiveDrag.id);
    if (over && over.classList.contains("merge-ok")) {
      over.classList.add("merge-hover");
      var other = archiveUnitById(over.dataset.id | 0);
      if (other) {
        var mergeCost = G.merge.pickCost(G.merge.openOptions(state, other.def.merge));
        setArchiveHint(
          mergeCost
            ? "Solta pra fundir dois " + other.def.name + " — Colosso custa " + mergeCost + " arquivos."
            : "Solta pra fundir dois " + other.def.name + "."
        );
      }
    }
  }

  function onArchiveBoardUp(ev) {
    if (!archiveDrag) return;
    var over = archivePieceAt(ev.clientX, ev.clientY, archiveDrag.id);
    var a = archiveDrag.unit;
    var b = over ? archiveUnitById(over.dataset.id | 0) : null;
    var pending = G.merge.pairPending(state, a, b, { fromBoard: true });
    clearArchiveDrag();
    if (pending) {
      G.audio.ui();
      document.getElementById("archive-modal").classList.add("hidden");
      openMerge(pending);
      return;
    }
    if (over && a && b && a.kind === b.kind && G.merge.canEvolve(a)) {
      var opts = G.merge.openOptions(state, a.def.merge);
      var need = G.merge.pickCost(opts);
      var have = G.merge.ensureIntel(state.run).arquivo | 0;
      if (need > have) {
        setArchiveHint("Colosso custa " + need + " arquivos. Faltam " + (need - have) + ".");
        return;
      }
    }
    if (over && a && b && a.kind === b.kind) {
      setArchiveHint("Já tem o máximo dessa evolução, ou esses não sobem mais.");
    } else if (over && a && b) {
      setArchiveHint("Merge só com o mesmo tipo.");
    } else {
      setArchiveHint("Arrasta duas peças iguais uma em cima da outra.");
    }
  }

  function bindArchiveBoard() {
    var board = document.getElementById("archive-board");
    if (!board || board.dataset.bound) return;
    board.dataset.bound = "1";
    board.addEventListener("pointerdown", onArchiveBoardDown);
    board.addEventListener("pointermove", onArchiveBoardMove);
    board.addEventListener("pointerup", onArchiveBoardUp);
    board.addEventListener("pointercancel", onArchiveBoardUp);
  }

  function renderArchiveList() {
    var intel = G.merge.ensureIntel(state.run);
    var n = intel.arquivo | 0;
    document.getElementById("archive-count").textContent = n === 1 ? "1 arquivo" : n + " arquivos";
    var box = document.getElementById("archive-list");
    box.innerHTML = "";

    function addRow(opt) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "archive-row" + (opt.special ? " archive-hire" : "");
      btn.disabled = !opt.ok;
      var art = document.createElement("canvas");
      art.className = "archive-art";
      art.width = 56;
      art.height = 56;
      G.drawPortrait(art, "player", opt.kind, false);
      var meta = document.createElement("span");
      meta.className = "archive-meta";
      var title = document.createElement("b");
      title.textContent = opt.name;
      var sub = document.createElement("small");
      sub.textContent = opt.sub;
      meta.appendChild(title);
      meta.appendChild(sub);
      var price = document.createElement("span");
      price.className = "archive-cost";
      price.textContent = opt.price;
      btn.appendChild(art);
      btn.appendChild(meta);
      btn.appendChild(price);
      if (opt.ok && opt.onclick) btn.onclick = opt.onclick;
      box.appendChild(btn);
    }

    var room = G.soldierCount(state) < G.maxUnits();
    var canHire = n >= 1 && room;
    addRow({
      special: true,
      kind: "recruta",
      name: "Convocar recruta",
      sub: room ? "Nasce ao lado do comandante" : "Esquadrão cheio",
      price: !room ? "cheio" : canHire ? "1 arq." : "faltam " + (1 - n),
      ok: canHire,
      onclick: function () {
        if (!G.tactics.recruitWithArquivo(state)) {
          renderArchiveBoard();
          renderArchiveList();
          return;
        }
        G.audio.ui();
        renderArchiveBoard();
        renderArchiveList();
      }
    });

    var roster = G.merge.listRoster(state);
    if (!roster.length) {
      var empty = document.createElement("p");
      empty.className = "archive-empty";
      empty.textContent = "Ninguém no esquadrão pra promover.";
      box.appendChild(empty);
      return;
    }
    roster.forEach(function (u) {
      var can = G.merge.canEvolve(u) && G.merge.openOptions(state, u.def.merge).length > 0;
      var cost = G.merge.promoteCost(u.gen | 0, G.merge.openOptions(state, u.def.merge));
      var afford = n >= cost;
      addRow({
        kind: u.kind,
        name: u.def.name,
        sub: !G.merge.canEvolve(u)
          ? "Nível " + (u.gen | 0) + " · no topo da pirâmide"
          : !can
            ? "Nível " + (u.gen | 0) + " · já tem o máximo dessa evolução"
            : "Nível " + (u.gen | 0) + " · " + G.unitStatsLine(u.def),
        price: !can ? "—" : afford ? cost + " arq." : "faltam " + (cost - n),
        ok: can && afford,
        onclick: function () {
          var pending = G.merge.beginPromote(state, u);
          if (!pending) {
            renderArchiveList();
            return;
          }
          G.audio.ui();
          document.getElementById("archive-modal").classList.add("hidden");
          openMerge(pending);
        }
      });
    });
  }

  function openArchive() {
    if (state.mode !== "play" || state.defeat || state.userPaused || state.pendingMerge) return;
    state.archiveMenu = true;
    syncFreeze();
    bindArchiveBoard();
    renderArchiveBoard();
    renderArchiveList();
    document.getElementById("archive-modal").classList.remove("hidden");
  }

  function closeArchive() {
    clearArchiveDrag();
    state.archiveMenu = false;
    var modal = document.getElementById("archive-modal");
    if (modal) modal.classList.add("hidden");
    syncFreeze();
  }

  var codexTab = "ally";
  var codexSheet = null;
  var codexForm = "p1";
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
      var next = G.invasion ? G.invasion.noteWin(state.run.invasion | 0) : 0;
      var extra = next && next > (state.run.invasion | 0)
        ? " Nível de Invasão " + next + " liberado."
        : "";
      document.getElementById("win-text").textContent =
        "Você limpou as " + G.STAGES.length + " fases. +" + state.run.coins + " moedas foram pro cofre." + extra;
      G.audio.win();
      showScreen("win");
    }
    refreshMenu();
  }

  function finishDebug() {
    G.audio.ui();
    setDebugStatus("Teste encerrado.");
    renderDebug();
    showScreen("debug");
  }

  function startPlay(opts) {
    opts = opts || {};
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
      G.game.startRun(state, opts);
      state.pointer.live = false;
      state.pointer.x = null;
      state.pointer.y = null;
      showScreen("play");
      overlay.classList.remove("is-fading");
      G.audio.sync(state, 0);
      syncHud();
    }, 380);
  }

  function setDebugStatus(msg) {
    var el = document.getElementById("debug-status");
    if (el) el.textContent = msg || "";
  }

  function renderDebug(skipPicks) {
    if (!G.debug) return;
    var info = G.debug.stageInfo(G.debug.selectedStage);
    var inv = G.debug.clampInvasion(G.debug.selectedInvasion);
    var bits = [
      "Fase " + (G.debug.selectedStage + 1) + " · " + info.name + " · " + info.boss,
      inv > 0 ? "Invasão " + inv : "Campanha"
    ];
    if (G.debug.dmgMul > 1) bits.push("dano " + G.debug.dmgMul + "×");
    if (G.debug.god) bits.push("invulnerável");
    if (G.debug.startArchives) bits.push("1000 arquivos");
    var label = document.getElementById("debug-fight-label");
    if (label) label.textContent = bits.join(" · ");

    if (!skipPicks) {
    function fillPicks(boxId, count, selected, onPick, labelFn, titleFn) {
      var box = document.getElementById(boxId);
      if (!box) return;
      box.innerHTML = "";
      for (var i = 0; i < count; i++) {
        (function (n) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "invasion-pick" + (selected === n ? " active" : "");
          btn.textContent = labelFn ? labelFn(n) : String(n + 1);
          if (titleFn) btn.title = titleFn(n);
          btn.onclick = function () {
            G.audio.ui();
            onPick(n);
            renderDebug();
          };
          box.appendChild(btn);
        })(i);
      }
    }

    fillPicks("debug-stages", G.debug.stageCount(), G.debug.selectedStage, function (n) {
      G.debug.selectedStage = n;
    });
    fillPicks(
      "debug-invasions",
      G.debug.invasionMax() + 1,
      inv,
      function (n) {
        G.debug.selectedInvasion = n;
      },
      function (n) {
        return n === 0 ? "C" : String(n);
      },
      function (n) {
        return n === 0
          ? "Campanha (sem invasão)"
          : "Inimigos +" + (n * 20) + "% de vida, +" + (n * 10) + "% de quantidade. Chefes das fases 1–" + n + " entram em segunda barra.";
      }
    );
    }
    var dmgSlider = document.getElementById("dbg-dmg");
    var dmgVal = document.getElementById("dbg-dmg-val");
    var godBox = document.getElementById("dbg-god");
    var archBox = document.getElementById("dbg-archives");
    if (dmgSlider && dmgSlider.value !== String(G.debug.dmgMul)) dmgSlider.value = String(G.debug.dmgMul);
    if (dmgVal) dmgVal.textContent = G.debug.dmgMul + "×";
    if (godBox) godBox.checked = !!G.debug.god;
    if (archBox) archBox.checked = !!G.debug.startArchives;
  }

  function openDebug() {
    if (!G.debug || !G.debug.isOn()) return;
    setDebugStatus("");
    renderDebug();
    showScreen("debug");
  }

  function leavePlayToMenu() {
    if (state.debugFight) {
      setDebugStatus("Teste encerrado.");
      renderDebug();
      showScreen("debug");
    } else {
      refreshMenu();
      showScreen("menu");
    }
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
    if (state.stageOutro || (G.invasion && G.invasion.cinematic(state))) return;
    if (state.timeLock) return;
    if (ev.button === 2) return;
    ev.preventDefault();
    G.audio.ensure();
    state.pointer.down = true;
    if (state.pointer.touch) {
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
    if (!state.pointer.down || state.mode !== "play" || state.paused || state.stageOutro || (G.invasion && G.invasion.cinematic(state)) || state.timeLock) return;
    ev.preventDefault();
    if (state.pointer.moveSquad) {
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
    if (state.pointer.fireHold && G.tactics) {
      G.tactics.onFireUp(state);
    }
    state.pointer.down = false;
    state.pointer.moveSquad = false;
  }

  function syncHud(dt) {
    dt = dt || 0.016;
    var stage = G.STAGES[state.stageIndex];
    if (!stage) return;
    var hudStage = document.getElementById("hud-stage");
    if (hudStage) {
      hudStage.textContent =
        (state.debugFight ? "Teste · " : "") +
        "Fase " + (state.stageIndex + 1) + " · " + stage.name +
        (state.debugFight && (state.run.invasion | 0) > 0 ? " · Inv " + (state.run.invasion | 0) : "");
    }
    var waveTxt = "Onda " + (state.waveIndex + 1) + "/" + stage.waves.length;
    if (state.debugFight && state.debugOpts) {
      var dmgScale = state.debugOpts.dmgMul | 0;
      if (dmgScale > 1) waveTxt += " · " + dmgScale + "×";
      if (state.debugOpts.god) waveTxt += " · GOD";
    }
    document.getElementById("hud-wave").textContent = waveTxt;
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
    var bossHud = document.getElementById("boss-hud");
    var rowA = document.getElementById("boss-row-a");
    var rowB = document.getElementById("boss-row-b");
    var pips = document.getElementById("souls-pips");
    function livingBoss(e) {
      return e && e.def && e.def.boss && e.hp > 0 && !e.fake && !e.glinderDying && !e.fallen;
    }
    function easeBar(key, frac) {
      var cur = state[key];
      if (cur == null || !isFinite(cur)) cur = frac;
      if (frac < cur) cur = Math.max(frac, cur - dt * 0.55);
      else cur = frac;
      state[key] = cur;
      return cur;
    }
    function paintTrack(fillId, delayId, frac, delayKey, snap) {
      frac = Math.max(0, Math.min(1, frac));
      if (snap) state[delayKey] = frac;
      var fill = document.getElementById(fillId);
      var delay = document.getElementById(delayId);
      if (fill) fill.style.width = frac * 100 + "%";
      if (delay) delay.style.width = easeBar(delayKey, frac) * 100 + "%";
    }
    var queen = null;
    var king = null;
    var boss = null;
    var core = null;
    for (var b = 0; b < state.enemies.length; b++) {
      var be = state.enemies[b];
      if (!livingBoss(be)) continue;
      if (be.type === "chefe_megatanque") queen = be;
      else if (be.type === "chefe_beeking") king = be;
      if (be.type === "chefe_final") core = be;
      else if (!boss || be.maxHp > boss.maxHp) boss = be;
    }
    if (core) boss = core;
    var duo = !!(queen && king);
    if (duo) {
      bossHud.classList.remove("hidden", "p2");
      bossHud.classList.add("duo");
      if (rowB) rowB.classList.remove("hidden");
      if (rowA) {
        rowA.classList.add("queen");
        rowA.classList.remove("king");
      }
      document.getElementById("boss-name").textContent = queen.def.name;
      document.getElementById("boss-title").textContent = queen.enrage ? "Enrage · a colmeia sem rei" : (queen.def.title || "");
      document.getElementById("boss-name-b").textContent = king.def.name;
      document.getElementById("boss-title-b").textContent = king.enrage ? "Fúria do rei" : (king.def.title || "");
      paintTrack("souls-fill", "souls-delay", queen.hp / queen.maxHp, "bossShown", state._hudBossA !== queen);
      paintTrack("souls-fill-b", "souls-delay-b", king.hp / king.maxHp, "bossShownB", state._hudBossB !== king);
      state._hudBossA = queen;
      state._hudBossB = king;
      if (pips) pips.classList.add("hidden");
    } else if (boss) {
      bossHud.classList.remove("hidden", "duo");
      if (rowB) rowB.classList.add("hidden");
      if (rowA) {
        rowA.classList.toggle("queen", boss.type === "chefe_megatanque");
        rowA.classList.toggle("king", boss.type === "chefe_beeking");
      }
      document.getElementById("boss-name").textContent = boss.def.name;
      var title = boss.def.title || "";
      if (boss.type === "chefe_final") {
        var ph = boss.bossPhase || 1;
        title = ph === 1 ? "Camada 1 · a Colmeia protege" : ph === 2 ? "Camada 2 · a Mariposa esconde" : "Camada 3 · núcleo exposto";
      } else if (boss.type === "chefe_megatanque") {
        if (boss.enrage) title = "Enrage · a colmeia sem rei";
      } else if (boss.type === "beeprincess") {
        if (boss.princessHive || state.hiveRealm) title = "Colmeia alienígena";
        else title = (title || "A herdeira da colmeia") + " · herança real";
      } else if (boss.type === "chefe_beeking" && boss.enrage) {
        title = "Fúria do rei";
      }
      document.getElementById("boss-title").textContent = title;
      bossHud.classList.toggle("p2", !!(boss.p2 || boss.invP2));
      var hiveHud = boss.type === "chefe_megatanque" || boss.type === "chefe_beeking";
      var bars = hiveHud ? 1 : Math.max(1, boss.hpBars || 1);
      if (boss.p2 || boss.invP2) bars = 1;
      var per = 1 / bars;
      var frac = Math.max(0, boss.hp / boss.maxHp);
      var barI = Math.max(0, Math.min(bars - 1, Math.floor((frac - 1e-6) / per)));
      var local = bars === 1 ? frac : Math.max(0, Math.min(1, (frac - barI * per) / per));
      paintTrack("souls-fill", "souls-delay", local, "bossShown", state._hudBossA !== boss);
      state._hudBossA = boss;
      state._hudBossB = null;
      if (pips) {
        pips.classList.toggle("hidden", bars < 2);
        if (bars >= 2) {
          var html = "";
          for (var pi = 0; pi < bars; pi++) {
            html += "<span class=\"pip" + (pi <= barI ? " on" : "") + "\"></span>";
          }
          if (pips.innerHTML !== html) pips.innerHTML = html;
        }
      }
    } else {
      bossHud.classList.add("hidden");
      bossHud.classList.remove("p2", "duo");
      if (rowB) rowB.classList.add("hidden");
      if (rowA) rowA.classList.remove("queen", "king");
      state.bossShown = 1;
      state.bossShownB = 1;
      state._hudBossA = null;
      state._hudBossB = null;
      if (pips) pips.classList.add("hidden");
    }
    var bar = document.getElementById("active-bar");
    if (!bar) return;
    bar.innerHTML = "";
    var dashStuck = G.combat.dashLocked && G.combat.dashLocked(state);
    var dashReady = (state.dashCd || 0) <= 0 && !dashStuck;
    var dashMax = state.dashCdMax || G.combat.dashCd();
    var dashFrac = dashStuck ? 0 : dashReady ? 100 : Math.max(0, 1 - (state.dashCd || 0) / dashMax) * 100;
    var dashSlot = document.createElement("button");
    dashSlot.type = "button";
    dashSlot.className = "active-slot" + (dashStuck ? " stuck" : dashReady ? " ready" : " cd");
    dashSlot.style.setProperty("--cd", dashFrac + "%");
    dashSlot.title = dashStuck
      ? "O mel líquido prende o SHIFT. Saia da poça pra voltar a usar o Ímpeto."
      : "Ímpeto — avanço curto na direção do movimento, ou da mira se o esquadrão estiver parado.";
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
    syncBuffTray(state);
  }

  function syncBuffTray(state) {
    var tray = document.getElementById("buff-tray");
    if (!tray) return;
    var list = G.tactics && G.tactics.listStatus ? G.tactics.listStatus(state) : [];
    tray.classList.toggle("hidden", !list.length);
    if (!list.length) {
      tray.innerHTML = "";
      tray.dataset.sig = "";
      return;
    }
    var sig = list.map(function (b) { return b.id; }).join(",");
    if (tray.dataset.sig !== sig) {
      tray.dataset.sig = sig;
      var html = "<div class=\"buff-kicker\">Buffs</div>";
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        html +=
          "<div class=\"buff-icon\" data-id=\"" + b.id + "\" style=\"color:" + b.col + ";border-color:" + b.col + "66\" tabindex=\"0\">" +
          "<span>" + b.icon + "</span>" +
          "<span class=\"buff-cd\"><i></i></span>" +
          "<div class=\"buff-tip\"><b>" + b.name + "</b><p class=\"buff-desc\"></p><span class=\"buff-time\"></span></div>" +
          "</div>";
      }
      tray.innerHTML = html;
    }
    var icons = tray.querySelectorAll(".buff-icon");
    for (var n = 0; n < list.length; n++) {
      var item = list[n];
      var el = icons[n];
      if (!el) continue;
      var frac = Math.max(0, Math.min(1, item.t / (item.max || 1)));
      var bar = el.querySelector(".buff-cd i");
      if (bar) bar.style.width = (frac * 100) + "%";
      var timeEl = el.querySelector(".buff-time");
      if (timeEl) timeEl.textContent = item.t.toFixed(1) + "s";
      var descEl = el.querySelector(".buff-desc");
      if (descEl) descEl.textContent = item.desc;
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
    if (state.hiveRealm && G.stageBgs["img/cenarios/bg-hive-robo.png"]) {
      img = G.stageBgs["img/cenarios/bg-hive-robo.png"];
      state.bgImg = img;
    } else if ((!img || !img.naturalWidth) && G.STAGES[state.stageIndex]) {
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
    if (state.mode !== "play" || state.userPaused || state.pendingMerge || state.archiveMenu || state.defeat) return;
    if (G.invasion && G.invasion.cinematic(state)) return;
    if (state.timeLock && state.timeLock.phase !== "slow") return;
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
        for (var w = 0; w < state.warnings.length; w++) {
          try { G.drawWarning(ctx, state.warnings[w]); } catch (ew) {}
        }
      }
      if (G.tactics && G.tactics.drawGround) G.tactics.drawGround(ctx, state);
      if (G.drawBossWorld) G.drawBossWorld(ctx, state);
      for (var ct = 0; ct < state.enemies.length; ct++) {
        if (state.glinderMaze && state.glinderMaze.phase !== "done") break;
        if (G.drawChargeTelegraph) G.drawChargeTelegraph(ctx, state.enemies[ct]);
      }
      if (state.booms) {
        for (var bm = 0; bm < state.booms.length; bm++) {
          var boom = state.booms[bm];
          var bk = Math.max(0, boom.t / boom.max);
          if (!(boom.max > 0) || !isFinite(bk)) bk = 0;
          var br = (boom.r || 40) * (1.15 - bk * 0.35);
          if (!isFinite(br) || br <= 0) continue;
          br = Math.min(br, 360);
          ctx.save();
          try {
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
          } finally {
          ctx.restore();
          }
        }
      }
      if (state.mines) {
        for (var m = 0; m < state.mines.length; m++) G.drawMine(ctx, state.mines[m]);
      }
      for (var d = 0; d < state.drops.length; d++) G.drawDrop(ctx, state.drops[d]);
      for (var e = 0; e < state.enemies.length; e++) {
        var enDraw = state.enemies[e];
        if (state.glinderMaze && state.glinderMaze.phase !== "done") continue;
        if (enDraw.mazeHide) continue;
        try { G.drawEnemy(ctx, enDraw); } catch (ee) {}
      }
      if (G.drawHiveKingGhosts) G.drawHiveKingGhosts(ctx, state);
      if (G.drawHeirTake) G.drawHeirTake(ctx, state);
      for (var au = 0; au < state.units.length; au++) {
        if (!state.units[au].commander && !state.units[au].stowed) G.drawPlayerUnit(ctx, state.units[au], state.time);
      }
      for (var p = 0; p < state.projectiles.length; p++) {
        try { G.drawProjectile(ctx, state.projectiles[p]); } catch (ep) {}
      }
      if (G.tactics && G.tactics.draw) G.tactics.draw(ctx, state);
      if (G.drawIncomingArrows) G.drawIncomingArrows(ctx, state);
      ctx.restore();
    }
    if (G.drawArenaDark) G.drawArenaDark(ctx, state);
    if ((state.glinderHeat || 0) > 0.04) {
      var hh = Math.min(1, state.glinderHeat);
      ctx.save();
      ctx.fillStyle = "rgba(255, 70, 18, " + (hh * 0.12) + ")";
      ctx.fillRect(0, 0, state.W, state.H);
      var hg = ctx.createRadialGradient(state.W / 2, state.H * 0.2, 20, state.W / 2, state.H / 2, Math.max(state.W, state.H) * 0.7);
      hg.addColorStop(0, "rgba(255, 180, 40, " + (hh * 0.08) + ")");
      hg.addColorStop(1, "rgba(80, 0, 0, " + (hh * 0.16) + ")");
      ctx.fillStyle = hg;
      ctx.fillRect(0, 0, state.W, state.H);
      ctx.restore();
    }
    if ((state.vultoBlind || 0) > 0) {
      ctx.fillStyle = "rgba(12, 4, 8, " + Math.min(0.92, state.vultoBlind * 0.38) + ")";
      ctx.fillRect(0, 0, state.W, state.H);
    }
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
        if (fx.slash || fx.phalanxBeam || fx.warSlash || fx.flameCone || fx.coloBeam || fx.coloSlash || fx.coloSlam || fx.coloBash || fx.coloPunch || fx.scalpelRain) continue;
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

    for (var ai = 0; ai < state.enemies.length; ai++) {
      var ae = state.enemies[ai];
      if (ae.hp <= 0) continue;
      if (ae.vultoAct === "arena" && ae.arenaSx != null) {
        var pbA = G.playfield(state);
        var ar = ae.arenaR || 122;
        ctx.save();
        ctx.beginPath();
        ctx.rect(pbA.x0, pbA.y0, pbA.x1 - pbA.x0, pbA.y1 - pbA.y0);
        ctx.arc(ae.arenaSx, ae.arenaSy, ar, 0, Math.PI * 2, true);
        ctx.clip("evenodd");
        ctx.fillStyle = "rgba(180, 20, 20, 0.32)";
        ctx.fillRect(pbA.x0, pbA.y0, pbA.x1 - pbA.x0, pbA.y1 - pbA.y0);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = "rgba(255, 220, 80, 0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ae.arenaSx, ae.arenaSy, ar, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (ae.veilAct === "sweep") {
        var pbS = G.playfield(state);
        var pad = 42;
        ctx.save();
        ctx.fillStyle = "rgba(140, 190, 255, 0.28)";
        ctx.fillRect(pbS.x0 + pad, pbS.y0 + pad, pbS.x1 - pbS.x0 - pad * 2, pbS.y1 - pbS.y0 - pad * 2);
        ctx.strokeStyle = "rgba(200, 230, 255, 0.7)";
        ctx.setLineDash([10, 8]);
        ctx.strokeRect(pbS.x0 + pad, pbS.y0 + pad, pbS.x1 - pbS.x0 - pad * 2, pbS.y1 - pbS.y0 - pad * 2);
        ctx.setLineDash([]);
        ctx.restore();
      }
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
      } else if (pt.ash) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        var ashA = Math.max(0, pt.life / (pt.max || 1));
        ctx.globalAlpha = ashA * 0.95;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, pt.size * 0.55, pt.size * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 236, 180, " + (0.62 * ashA) + ")";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(0.8, pt.size * 0.36), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (pt.flame) {
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(Math.atan2(pt.vy || 0, pt.vx || 1));
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha *= 0.9;
        ctx.beginPath();
        ctx.ellipse(0, 0, pt.size * 1.8, pt.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pt.napalm ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 240, 180, 0.85)";
        ctx.beginPath();
        ctx.ellipse(pt.size * 0.2, 0, pt.size * (pt.napalm ? 0.95 : 0.7), pt.size * (pt.napalm ? 0.38 : 0.28), 0, 0, Math.PI * 2);
        ctx.fill();
        if (pt.napalm) {
          ctx.fillStyle = "rgba(170, 230, 255, 0.55)";
          ctx.beginPath();
          ctx.ellipse(-pt.size * 0.15, 0, pt.size * 1.1, pt.size * 0.22, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
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
    if (G.invasion && G.invasion.drawCutscene) G.invasion.drawCutscene(ctx, state);
    if (state.timeLock) {
      var lock = state.timeLock;
      var la = 0.42;
      var clockT = 0;
      if (lock.phase === "slow") {
        var pulse = 0.5 + 0.5 * Math.sin((lock.slowT || 0) * 11);
        la = 0.14 + pulse * 0.1;
        var slowSpan = (lock.slowDur || 0.2) + (lock.catchupDur || 0.08);
        clockT = 1 - Math.min(1, (lock.slowT || 0) / slowSpan);
      } else {
        clockT = Math.min(1, lock.t / (lock.aimDur || 2.45));
      }
      ctx.save();
      ctx.fillStyle = "rgba(10, 22, 36, " + la + ")";
      ctx.fillRect(0, 0, state.W, state.H);
      ctx.strokeStyle = lock.phase === "slow" ? "rgba(255, 210, 74, 0.55)" : "rgba(180, 230, 255, 0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.W / 2, 52, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clockT);
      ctx.stroke();
      ctx.restore();
    }
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
    if ((state.glinderNovaT || 0) > 0 && !state.defeat) {
      var nt = state.glinderNovaT;
      var nmax = state.glinderNovaMax || 3;
      var num = Math.max(1, Math.ceil(nt));
      var pulse = 0.7 + Math.sin(state.time * 14) * 0.3;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 72px Segoe UI, sans-serif";
      ctx.strokeStyle = "rgba(20, 0, 0, 0.85)";
      ctx.lineWidth = 8;
      ctx.strokeText(String(num), state.W / 2, 78);
      ctx.fillStyle = num <= 1 ? "#ff3a18" : "#ffd24a";
      ctx.globalAlpha = 0.55 + pulse * 0.45;
      ctx.fillText(String(num), state.W / 2, 78);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(20, 4, 0, 0.55)";
      ctx.fillRect(state.W / 2 - 70, 118, 140, 8);
      ctx.fillStyle = num <= 1 ? "#ff3a18" : "#ff9a2a";
      ctx.fillRect(state.W / 2 - 70, 118, 140 * Math.max(0, Math.min(1, nt / nmax)), 8);
      ctx.restore();
    }
    if (state.glinderMaze && state.glinderMaze.phase === "run" && !state.defeat) {
      var mt = Math.max(0, state.glinderMaze.timer);
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 56px Segoe UI, sans-serif";
      ctx.strokeStyle = "rgba(20, 0, 0, 0.85)";
      ctx.lineWidth = 7;
      ctx.strokeText(mt.toFixed(1), state.W / 2, 72);
      ctx.fillStyle = mt < 8 ? "#ff3a18" : "#ffd24a";
      ctx.fillText(mt.toFixed(1), state.W / 2, 72);
      ctx.font = "bold 15px Segoe UI, sans-serif";
      ctx.fillStyle = "#ffe08a";
      ctx.fillText("ENCONTRE O ESQUADRÃO", state.W / 2, 112);
      ctx.restore();
    }
    if (state.glinderRub && state.glinderRub.close && !state.defeat && !(state.glinderMaze && state.glinderMaze.phase !== "done")) {
      var rub = state.glinderRub;
      var rubY = state.H * 0.5;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (rub.near) {
        ctx.font = "bold 64px Segoe UI, sans-serif";
        ctx.strokeStyle = "rgba(20, 0, 0, 0.8)";
        ctx.lineWidth = 8;
        ctx.strokeText((rub.pct | 0) + "%", state.W / 2, rubY);
        ctx.fillStyle = "#ffd24a";
        ctx.globalAlpha = 0.75 + Math.sin(state.time * 14) * 0.25;
        ctx.fillText((rub.pct | 0) + "%", state.W / 2, rubY);
        ctx.globalAlpha = 1;
        ctx.font = "bold 16px Segoe UI, sans-serif";
        ctx.fillStyle = "#ffe08a";
        ctx.fillText("E  ·  acender", state.W / 2, rubY + 46);
        ctx.fillStyle = "rgba(20, 4, 0, 0.55)";
        ctx.fillRect(state.W / 2 - 80, rubY + 64, 160, 10);
        ctx.fillStyle = "#ff9a2a";
        ctx.fillRect(state.W / 2 - 80, rubY + 64, 160 * Math.max(0, Math.min(1, (rub.pct || 0) / 100)), 10);
      }
      ctx.restore();
    }
    if ((state.glinderSuperT || 0) > 0 && !state.defeat) {
      var st = state.glinderSuperT;
      var smax = state.glinderSuperMax || 2.05;
      var snap = st < 0.42;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = snap ? "bold 34px Segoe UI, sans-serif" : "bold 28px Segoe UI, sans-serif";
      ctx.fillStyle = snap ? "#fff4c4" : "#ffe08a";
      ctx.globalAlpha = snap ? (0.55 + Math.sin(state.time * 28) * 0.45) : (0.7 + Math.sin(state.time * 22) * 0.3);
      ctx.fillText(snap ? "SHIFT  ·  AGORA" : "SHIFT  ·  no estalo", state.W / 2, 70);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(20, 0, 0, 0.55)";
      ctx.fillRect(state.W / 2 - 80, 92, 160, 8);
      ctx.fillStyle = snap ? "#ff3a18" : "#ffd24a";
      ctx.fillRect(state.W / 2 - 80, 92, 160 * Math.max(0, Math.min(1, st / smax)), 8);
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
    if ((state.glinderFlash || 0) > 0) {
      var fa = Math.min(1, state.glinderFlash);
      ctx.fillStyle = "rgba(255, 252, 245, " + fa + ")";
      ctx.fillRect(0, 0, state.W, state.H);
      if (fa > 0.15) {
        var fg = ctx.createRadialGradient(state.W / 2, state.H / 2, 20, state.W / 2, state.H / 2, Math.max(state.W, state.H) * 0.72);
        fg.addColorStop(0, "rgba(255, 255, 255, " + (fa * 0.35) + ")");
        fg.addColorStop(1, "rgba(255, 210, 160, 0)");
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, state.W, state.H);
      }
    }
    if (state.hiveWake) {
      var hw = state.hiveWake;
      var lids = Math.max(0, Math.min(1, hw.lids != null ? hw.lids : 1));
      var black = Math.max(0, Math.min(1, hw.black || 0));
      var flash = Math.max(0, Math.min(1, hw.flash || 0));
      var lidH = (1 - lids) * (state.H * 0.5 + 28);
      if (lids > 0.97 && black < 0.02 && flash < 0.02) {
        if (state._hiveHudFade && !(state.stageOutro && state.stageOutro.phase === "fade")) {
          hud.style.opacity = "";
          state._hiveHudFade = false;
        }
      } else {
      ctx.save();
      ctx.fillStyle = "#010000";
      ctx.fillRect(0, 0, state.W, lidH);
      ctx.fillRect(0, state.H - lidH, state.W, Math.max(0, state.H - (state.H - lidH)));
      if (lidH > 1 && lids < 0.98) {
        ctx.fillStyle = "rgba(48, 10, 12, 0.7)";
        ctx.fillRect(0, Math.max(0, lidH - 4), state.W, 4);
        ctx.fillRect(0, state.H - lidH, state.W, 4);
        var edge = ctx.createLinearGradient(0, lidH - 10, 0, lidH + 14);
        edge.addColorStop(0, "rgba(0, 0, 0, 0.55)");
        edge.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = edge;
        ctx.fillRect(0, lidH - 10, state.W, 24);
        var edge2 = ctx.createLinearGradient(0, state.H - lidH - 14, 0, state.H - lidH + 10);
        edge2.addColorStop(0, "rgba(0, 0, 0, 0)");
        edge2.addColorStop(1, "rgba(0, 0, 0, 0.55)");
        ctx.fillStyle = edge2;
        ctx.fillRect(0, state.H - lidH - 14, state.W, 24);
      }
      var vig = 0.06 + (1 - lids) * 0.48;
      var vg = ctx.createRadialGradient(state.W / 2, state.H / 2, 18, state.W / 2, state.H / 2, Math.max(state.W, state.H) * 0.62);
      vg.addColorStop(0, "rgba(0, 0, 0, 0)");
      vg.addColorStop(0.45, "rgba(4, 0, 0, " + (vig * 0.25) + ")");
      vg.addColorStop(1, "rgba(0, 0, 0, " + vig + ")");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, state.W, state.H);
      if (black > 0.01) {
        ctx.fillStyle = "rgba(0, 0, 0, " + black + ")";
        ctx.fillRect(0, 0, state.W, state.H);
      }
      if (flash > 0.02) {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255, 248, 220, " + (flash * 0.92) + ")";
        ctx.fillRect(0, 0, state.W, state.H);
        var flg = ctx.createRadialGradient(state.W / 2, state.H * 0.42, 12, state.W / 2, state.H * 0.42, Math.max(state.W, state.H) * 0.7);
        flg.addColorStop(0, "rgba(255, 255, 255, " + flash + ")");
        flg.addColorStop(0.4, "rgba(255, 220, 90, " + (flash * 0.55) + ")");
        flg.addColorStop(1, "rgba(255, 170, 40, 0)");
        ctx.fillStyle = flg;
        ctx.fillRect(0, 0, state.W, state.H);
      }
      ctx.restore();
      var cover = Math.max(black, 1 - lids);
      hud.style.opacity = cover > 0.06 ? String(Math.max(0, 1 - cover)) : "";
      state._hiveHudFade = cover > 0.06;
      }
    } else if (state._hiveHudFade && !(state.stageOutro && state.stageOutro.phase === "fade")) {
      hud.style.opacity = "";
      state._hiveHudFade = false;
    }
    if (state.princessBlink) {
      var bt = state.princessBlink.t || 0;
      function blinkPulse(t0, close, hold, open) {
        if (bt < t0) return 0;
        var u = bt - t0;
        if (u < close) return u / close;
        u -= close;
        if (u < hold) return 1;
        u -= hold;
        if (u < open) return 1 - u / open;
        return 0;
      }
      var ba = Math.max(
        blinkPulse(0.5, 0.14, 0.08, 0.22),
        blinkPulse(1.1, 0.16, 0.7, 0.28),
        blinkPulse(2.35, 0.12, 0.16, 0.32),
        blinkPulse(3.15, 0.18, 0.85, 0.7)
      );
      if (ba > 0.02) {
        ctx.fillStyle = "rgba(6, 4, 10, " + (ba * 0.96) + ")";
        ctx.fillRect(0, 0, state.W, state.H);
      }
    }
    if (state.stageOutro && state.stageOutro.phase === "fade") {
      var fo = Math.max(0, Math.min(1, state.stageOutro.t / (state.stageOutro.fadeMax || 1.2)));
      fo = fo * fo * (3 - 2 * fo);
      ctx.fillStyle = "rgba(6, 8, 16, " + fo + ")";
      ctx.fillRect(0, 0, state.W, state.H);
      hud.style.opacity = String(Math.max(0, 1 - fo));
    }
  }

  var last = performance.now();
  function loop(now) {
    try {
      var dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
      last = now;
      state.time += dt;
      if (state.mode === "play") {
        if (state.banner) state.banner.t -= dt;
        if (!state.paused) {
          var result = G.game.update(state, dt);
          if (result === "dead") beginDefeat();
          else if (result === "stageClear") {
            if (state.debugFight) finishDebug();
            else if (state.stageIndex >= G.STAGES.length - 1) finish(true);
            else showCards();
          }
        }
        if (state.defeat) tickDefeat(dt);
        syncHud(dt);
      }
      draw();
    } catch (err) {
      last = now || performance.now();
      if (typeof console !== "undefined" && console.error) console.error("[tfag]", err);
    }
    requestAnimationFrame(loop);
  }

  document.getElementById("btn-play").onclick = function () {
    startPlay();
  };
  document.getElementById("btn-merge-cancel").onclick = function () {
    G.audio.ui();
    closeMerge();
  };
  document.getElementById("btn-archive-close").onclick = function () {
    G.audio.ui();
    closeArchive();
  };
  document.getElementById("archive-modal").onclick = function (ev) {
    if (ev.target.id === "archive-modal") {
      G.audio.ui();
      closeArchive();
    }
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
  document.getElementById("codex-form-p1").onclick = function () {
    G.audio.ui();
    applyKaskaForm("p1");
  };
  document.getElementById("codex-form-p2").onclick = function () {
    G.audio.ui();
    applyKaskaForm("p2");
  };

  document.getElementById("btn-ifcara").onclick = function () {
    G.audio.ui();
    openDebug();
  };
  document.getElementById("btn-debug-back").onclick = function () {
    G.audio.ui();
    refreshMenu();
    showScreen("menu");
  };
  document.getElementById("dbg-units").onclick = function () {
    G.audio.ui();
    setDebugStatus(G.debug.unlockUnits() ? "Compêndio completo: aliados e inimigos." : "Unidades já estavam todas no compêndio.");
    refreshMenu();
  };
  document.getElementById("dbg-upgrades").onclick = function () {
    G.audio.ui();
    setDebugStatus(G.debug.maxUpgrades() ? "Upgrades permanentes no máximo." : "Upgrades já estavam no máximo.");
    refreshMenu();
  };
  document.getElementById("dbg-invasion").onclick = function () {
    G.audio.ui();
    setDebugStatus(G.debug.unlockInvasion() ? "Invasão 1 a 8 liberada." : "Invasão já estava toda liberada.");
    refreshMenu();
  };
  document.getElementById("dbg-all").onclick = function () {
    G.audio.ui();
    setDebugStatus(G.debug.unlockAll() ? "Tudo liberado neste perfil." : "Nada novo pra liberar.");
    refreshMenu();
  };
  document.getElementById("dbg-dmg").addEventListener("input", function () {
    G.debug.dmgMul = G.debug.clampDmgMul(this.value);
    renderDebug(true);
  });
  document.getElementById("dbg-god").onchange = function () {
    G.debug.god = !!this.checked;
    renderDebug();
  };
  document.getElementById("dbg-archives").onchange = function () {
    G.debug.startArchives = !!this.checked;
    renderDebug();
  };
  document.getElementById("dbg-stage").onclick = function () {
    startPlay(G.debug.playOpts());
  };
  document.getElementById("dbg-boss").onclick = function () {
    startPlay(G.debug.playOpts({ lastWave: true }));
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
    if (!state.debugFight) G.save.bank(state.run.coins);
    closePause();
    leavePlayToMenu();
  };
  window.addEventListener("keydown", function (ev) {
    var tag = ((ev.target && ev.target.tagName) || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || (ev.target && ev.target.isContentEditable)) return;
    if (G.debug && !ev.ctrlKey && !ev.altKey && !ev.metaKey && ev.key && /^[a-zA-Z0-9]$/.test(ev.key)) {
      var codeResult = G.debug.noteKey(ev.key);
      if (codeResult === "unlocked") {
        syncIfcaraButton();
        if (state.mode === "menu") {
          G.audio.ui();
          openDebug();
        }
      } else if (codeResult === "open" && state.mode === "menu") {
        G.audio.ui();
        openDebug();
      }
    }
    if (ev.key === "Escape") {
      if (!document.getElementById("codex-modal").classList.contains("hidden")) {
        closeCodexSheet();
        return;
      }
      if (state.mode === "debug") {
        G.audio.ui();
        refreshMenu();
        showScreen("menu");
        return;
      }
      if (state.mode === "play" && state.pendingMerge) {
        G.audio.ui();
        closeMerge();
        return;
      }
      if (state.mode === "play" && state.archiveMenu) {
        G.audio.ui();
        closeArchive();
        return;
      }
      if (state.mode === "play") {
        if (state.userPaused) closePause();
        else openPause();
      }
      return;
    }
    if ((ev.code === "KeyR" || ev.key === "r" || ev.key === "R") && state.mode === "play" && !state.defeat && !state.pendingMerge && !state.userPaused) {
      ev.preventDefault();
      G.audio.ui();
      if (state.archiveMenu) closeArchive();
      else openArchive();
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
      if ((ev.code === "KeyE" || ev.key === "e" || ev.key === "E") && !ev.repeat && !state.paused && !state.defeat) {
        if (G.combat.rubGlinderFire) G.combat.rubGlinderFire(state);
      }
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
    if (state.held) {
      state.held.held = false;
      state.held = null;
      state.mergeHint = null;
    }
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
    leavePlayToMenu();
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
    if (state.userPaused || state.paused || state.stageOutro || (G.invasion && G.invasion.cinematic(state)) || state.timeLock || state.pendingMerge || state.archiveMenu) return;
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
  window.addEventListener("wheel", function (ev) {
    if (ev.ctrlKey || ev.metaKey) ev.preventDefault();
  }, { passive: false, capture: true });
  window.addEventListener("keydown", function (ev) {
    if (!(ev.ctrlKey || ev.metaKey)) return;
    var k = ev.key;
    var c = ev.code;
    if (
      k === "+" || k === "-" || k === "=" || k === "_" || k === "0" ||
      c === "Equal" || c === "Minus" || c === "Digit0" ||
      c === "NumpadAdd" || c === "NumpadSubtract" || c === "Numpad0"
    ) {
      ev.preventDefault();
    }
  }, true);

  function applySaveAudio() {
    G.audio.muted = !!G.save.muted;
    G.audio.setVolume(G.save.volume == null ? 0.8 : G.save.volume);
    G.audio.applyMute();
    syncVolumeUi();
  }

  var unveiled = false;
  function unveil() {
    if (unveiled) return;
    unveiled = true;
    var boot = document.getElementById("boot-veil");
    if (boot) boot.classList.add("done");
    overlay.classList.remove("boot-wait");
  }

  G.save.load();
  applySaveAudio();
  resize();
  refreshMenu();
  overlay.classList.add("boot-wait");
  showScreen("menu");
  requestAnimationFrame(loop);
  if (G.save.sync) {
    G.save.sync().then(function (changed) {
      if (changed) {
        applySaveAudio();
        refreshMenu();
      }
      unveil();
    });
  } else {
    unveil();
  }
  setTimeout(unveil, 1800);
})(window.TFAG = window.TFAG || {});
