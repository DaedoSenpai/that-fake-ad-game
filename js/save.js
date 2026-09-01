(function (G) {
  var KEY = "tfag-save-v2";
  var OLD = "tfag-save-v1";
  var SLOT_COUNT = 3;
  var API_PORTS = [8765, 8766, 8767, 8768, 8769, 8770, 8771, 8772, 8773, 8774, 8775, 8776, 8777, 8778, 8779, 8780];
  var apiBasePromise = null;
  var bridgeFrame = null;
  var bridgeReady = null;
  var pushing = false;
  var pushAgain = false;
  var wipedSlots = {};

  function permDefaults() {
    return {
      extraStart: 0,
      dmg: 0,
      hp: 0,
      earlyTier: 0,
      fireRate: 0,
      speed: 0,
      luck: 0,
      gold: 0,
      regen: 0,
      magnet: 0,
      maxUnits: 0,
      rerolls: 0,
      choque: 0,
      disparo: 0,
      mobilidade: 0,
      startArquivo: 0,
      briefing: 0,
      manualCampo: 0
    };
  }

  function emptySlot(i) {
    return {
      name: "Soldado " + (i + 1),
      vault: 0,
      bestStage: 0,
      perm: permDefaults(),
      invasion: 0,
      maxInvasion: 0,
      codex: { units: {}, enemies: {} }
    };
  }

  function clampVol(v) {
    v = Number(v);
    if (isNaN(v)) return 0.8;
    return Math.max(0, Math.min(1, v));
  }

  function clamp(v, max) {
    return Math.max(0, Math.min(max, v | 0));
  }

  function normalizePerm(p) {
    p = p || {};
    return {
      extraStart: clamp(p.extraStart, 4),
      dmg: clamp(p.dmg, 10),
      hp: clamp(p.hp, 10),
      earlyTier: clamp(p.earlyTier, 4),
      fireRate: clamp(p.fireRate, 8),
      speed: clamp(p.speed, 8),
      luck: clamp(p.luck, 5),
      gold: clamp(p.gold, 5),
      regen: clamp(p.regen, 5),
      magnet: clamp(p.magnet, 5),
      maxUnits: clamp(p.maxUnits, 1),
      rerolls: clamp(p.rerolls, 2),
      choque: clamp(p.choque, 3),
      disparo: clamp(p.disparo, 3),
      mobilidade: clamp(p.mobilidade, 3),
      startArquivo: clamp(p.startArquivo, 1),
      briefing: clamp(p.briefing, 1),
      manualCampo: clamp(p.manualCampo, 1)
    };
  }

  function normalizeSlot(raw, i) {
    var base = emptySlot(i);
    if (!raw) return base;
    return {
      name: (raw.name && String(raw.name).trim()) || base.name,
      vault: raw.vault | 0,
      bestStage: raw.bestStage | 0,
      perm: normalizePerm(raw.perm),
      invasion: clamp(raw.invasion, 8),
      maxInvasion: clamp(raw.maxInvasion, 8),
      codex: {
        units: (raw.codex && raw.codex.units) || {},
        enemies: (raw.codex && raw.codex.enemies) || {}
      }
    };
  }

  function migrateOldRaw(raw) {
    if (!raw) return null;
    try {
      var parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!parsed) return null;
      var slot = emptySlot(0);
      slot.vault = parsed.vault | 0;
      slot.bestStage = parsed.bestStage | 0;
      slot.perm = normalizePerm(parsed.perm);
      slot.codex = {
        units: (parsed.codex && parsed.codex.units) || {},
        enemies: (parsed.codex && parsed.codex.enemies) || {}
      };
      return {
        active: 0,
        muted: !!parsed.muted,
        volume: parsed.volume != null ? clampVol(parsed.volume) : 0.8,
        updatedAt: parsed.updatedAt | 0,
        slots: [slot, emptySlot(1), emptySlot(2)]
      };
    } catch (err) {
      return null;
    }
  }

  function migrateOld() {
    try {
      return migrateOldRaw(localStorage.getItem(OLD));
    } catch (err) {
      return null;
    }
  }

  function isLoopback() {
    return (location.protocol === "http:" || location.protocol === "https:") &&
      (location.hostname === "127.0.0.1" || location.hostname === "localhost");
  }

  function pingApi(base) {
    var url = (base || "") + "/api/ping";
    return fetch(url, { cache: "no-store" }).then(function (res) {
      return res.ok ? res.json() : Promise.reject();
    }).then(function (data) {
      return data && data.updater ? (base || "") : Promise.reject();
    });
  }

  function findApi() {
    if (apiBasePromise) return apiBasePromise;
    apiBasePromise = (isLoopback() ? pingApi("") : Promise.reject()).catch(function () {
      return Promise.all(API_PORTS.map(function (port) {
        return pingApi("http://127.0.0.1:" + port).catch(function () { return null; });
      })).then(function (found) {
        var i;
        for (i = 0; i < found.length; i++) if (found[i] != null) return found[i];
        return null;
      });
    }).then(function (base) {
      return base == null ? null : base;
    }).catch(function () {
      return null;
    });
    return apiBasePromise;
  }

  function parseSaveText(raw) {
    if (!raw) return null;
    try {
      var parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!parsed) return null;
      if (parsed.empty) return null;
      if (parsed.ok && parsed.save === null) return null;
      if (parsed.save && parsed.save.slots) parsed = parsed.save;
      if (!parsed.slots) return migrateOldRaw(parsed);
      return parsed;
    } catch (err) {
      return null;
    }
  }

  function readLocalPayload() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return parseSaveText(raw);
    } catch (err) {}
    return migrateOld();
  }

  function slotScore(s) {
    if (!s) return -1;
    var p = s.perm || {};
    var permSum =
      (p.extraStart | 0) + (p.dmg | 0) + (p.hp | 0) + (p.earlyTier | 0) +
      (p.fireRate | 0) + (p.speed | 0) + (p.luck | 0) + (p.gold | 0) +
      (p.regen | 0) + (p.magnet | 0) + (p.maxUnits | 0) + (p.rerolls | 0) +
      (p.choque | 0) + (p.disparo | 0) + (p.mobilidade | 0) + (p.startArquivo | 0) + (p.briefing | 0) + (p.manualCampo | 0);
    var units = s.codex && s.codex.units ? Object.keys(s.codex.units).length : 0;
    var enemies = s.codex && s.codex.enemies ? Object.keys(s.codex.enemies).length : 0;
    var renamed = s.name && !/^Soldado [123]$/.test(String(s.name).trim()) ? 1 : 0;
    return (s.vault | 0) +
      (s.bestStage | 0) * 80 +
      permSum * 25 +
      (s.maxInvasion | 0) * 120 +
      units * 8 +
      enemies * 4 +
      renamed;
  }

  function payloadScore(p) {
    if (!p || !p.slots) return -1;
    var n = 0;
    var i;
    for (i = 0; i < SLOT_COUNT; i++) n += Math.max(0, slotScore(p.slots[i]));
    return n;
  }

  function mergeCodex(a, b) {
    var out = { units: {}, enemies: {} };
    var packs = [a, b];
    var p, k;
    for (p = 0; p < packs.length; p++) {
      if (!packs[p]) continue;
      if (packs[p].units) {
        for (k in packs[p].units) if (packs[p].units[k]) out.units[k] = true;
      }
      if (packs[p].enemies) {
        for (k in packs[p].enemies) if (packs[p].enemies[k]) out.enemies[k] = true;
      }
    }
    return out;
  }

  function defaultName(i) {
    return "Soldado " + (i + 1);
  }

  function mergeSlot(a, b, i) {
    a = normalizeSlot(a, i);
    b = normalizeSlot(b, i);
    var perm = permDefaults();
    var k;
    for (k in perm) perm[k] = Math.max(a.perm[k] | 0, b.perm[k] | 0);
    var name = a.name;
    if (a.name === defaultName(i) && b.name !== defaultName(i)) name = b.name;
    else if (b.name !== defaultName(i) && slotScore(b) > slotScore(a)) name = b.name;
    var maxInvasion = Math.max(a.maxInvasion | 0, b.maxInvasion | 0);
    var invasion = slotScore(b) > slotScore(a) ? b.invasion | 0 : a.invasion | 0;
    return {
      name: name,
      vault: Math.max(a.vault | 0, b.vault | 0),
      bestStage: Math.max(a.bestStage | 0, b.bestStage | 0),
      perm: normalizePerm(perm),
      invasion: Math.min(invasion, maxInvasion),
      maxInvasion: maxInvasion,
      codex: mergeCodex(a.codex, b.codex)
    };
  }

  function mergePayloads(list) {
    var sources = [];
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i] && list[i].slots) sources.push(list[i]);
    }
    if (!sources.length) return null;
    var bestMeta = sources[0];
    var bestMetaScore = payloadScore(bestMeta);
    for (i = 1; i < sources.length; i++) {
      var score = payloadScore(sources[i]);
      var newer = (sources[i].updatedAt | 0) > (bestMeta.updatedAt | 0);
      if (score > bestMetaScore || (score === bestMetaScore && newer)) {
        bestMeta = sources[i];
        bestMetaScore = score;
      }
    }
    var slots = [];
    for (i = 0; i < SLOT_COUNT; i++) {
      var chosen = sources[0].slots[i];
      var s;
      for (s = 1; s < sources.length; s++) {
        chosen = mergeSlot(chosen, sources[s].slots[i], i);
      }
      slots[i] = normalizeSlot(chosen, i);
    }
    return {
      active: clamp(bestMeta.active, SLOT_COUNT - 1),
      muted: !!bestMeta.muted,
      volume: clampVol(bestMeta.volume),
      updatedAt: bestMeta.updatedAt | 0,
      slots: slots
    };
  }

  function payloadEquals(a, b) {
    try {
      return JSON.stringify({
        active: a && a.active,
        muted: a && a.muted,
        volume: a && a.volume,
        slots: a && a.slots
      }) === JSON.stringify({
        active: b && b.active,
        muted: b && b.muted,
        volume: b && b.volume,
        slots: b && b.slots
      });
    } catch (err) {
      return false;
    }
  }

  function applyPayload(target, parsed) {
    target.index = clamp(parsed.active, SLOT_COUNT - 1);
    target.muted = !!parsed.muted;
    target.volume = clampVol(parsed.volume);
    target.debugUnlocked = false;
    target.slots = [];
    var i;
    for (i = 0; i < SLOT_COUNT; i++) {
      target.slots[i] = normalizeSlot(parsed.slots && parsed.slots[i], i);
    }
    target.data = target.slots[target.index];
  }

  function currentPayload(target) {
    target.slots[target.index] = target.data;
    return {
      active: target.index,
      muted: !!target.muted,
      volume: target.volume,
      updatedAt: Date.now(),
      slots: target.slots
    };
  }

  function fetchDiskSave(base) {
    if (base == null) return Promise.resolve(null);
    return fetch((base || "") + "/api/save", { cache: "no-store" }).then(function (res) {
      return res.ok ? res.json() : null;
    }).then(function (data) {
      return parseSaveText(data);
    }).catch(function () {
      return null;
    });
  }

  function fetchExportSave(base) {
    if (base == null) return Promise.resolve(null);
    return fetch((base || "") + "/api/save-export", { cache: "no-store" }).then(function (res) {
      return res.ok ? res.json() : null;
    }).then(function (data) {
      return parseSaveText(data);
    }).catch(function () {
      return null;
    });
  }

  function fetchScriptSave() {
    if (window.__TFAG_DISK_SAVE) return Promise.resolve(parseSaveText(window.__TFAG_DISK_SAVE));
    return new Promise(function (resolve) {
      var done = false;
      function finish(val) {
        if (done) return;
        done = true;
        resolve(val);
      }
      var s = document.createElement("script");
      s.onload = function () { finish(parseSaveText(window.__TFAG_DISK_SAVE)); };
      s.onerror = function () { finish(null); };
      setTimeout(function () { finish(parseSaveText(window.__TFAG_DISK_SAVE)); }, 900);
      s.src = "data/tfag-save-store.js";
      (document.head || document.documentElement).appendChild(s);
    });
  }

  function postDiskSave(base, payload) {
    if (base == null) return Promise.resolve(false);
    return fetch((base || "") + "/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.ok;
    }).catch(function () {
      return false;
    });
  }

  function ensureBridge(base) {
    if (base == null || isLoopback()) return Promise.resolve(null);
    if (bridgeReady) return bridgeReady;
    bridgeReady = new Promise(function (resolve) {
      var done = false;
      function finish(win) {
        if (done) return;
        done = true;
        resolve(win || null);
      }
      var frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.style.cssText = "position:absolute;width:0;height:0;border:0;visibility:hidden";
      frame.onload = function () {
        bridgeFrame = frame;
        finish(frame.contentWindow);
      };
      frame.onerror = function () { finish(null); };
      setTimeout(function () { finish(bridgeFrame && bridgeFrame.contentWindow); }, 1600);
      frame.src = (base || "") + "/bridge.html";
      document.documentElement.appendChild(frame);
    });
    return bridgeReady;
  }

  function bridgeCall(win, op, extra) {
    if (!win) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var id = "tfag-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      function onMsg(ev) {
        var d = ev.data || {};
        if (d.type !== "tfag-save-bridge" || d.id !== id) return;
        window.removeEventListener("message", onMsg);
        resolve(d);
      }
      window.addEventListener("message", onMsg);
      var msg = { type: "tfag-save-bridge", op: op, id: id };
      if (extra) {
        var k;
        for (k in extra) msg[k] = extra[k];
      }
      try {
        win.postMessage(msg, "*");
      } catch (err) {
        window.removeEventListener("message", onMsg);
        resolve(null);
        return;
      }
      setTimeout(function () {
        window.removeEventListener("message", onMsg);
        resolve(null);
      }, 1200);
    });
  }

  function fetchBridgeSave(base) {
    return ensureBridge(base).then(function (win) {
      return bridgeCall(win, "get");
    }).then(function (d) {
      if (!d) return null;
      return parseSaveText(d.raw) || migrateOldRaw(d.old);
    }).catch(function () {
      return null;
    });
  }

  function postBridgeSave(base, payload) {
    return ensureBridge(base).then(function (win) {
      return bridgeCall(win, "set", { raw: JSON.stringify(payload) });
    }).then(function (d) {
      return !!(d && d.ok);
    }).catch(function () {
      return false;
    });
  }

  G.save = {
    data: emptySlot(0),
    index: 0,
    muted: false,
    volume: 0.8,
    debugUnlocked: false,
    slots: [emptySlot(0), emptySlot(1), emptySlot(2)],

    findApi: findApi,

    load: function () {
      try {
        var parsed = readLocalPayload();
        if (parsed) applyPayload(this, parsed);
        else {
          this.slots = [emptySlot(0), emptySlot(1), emptySlot(2)];
          this.index = 0;
          this.muted = false;
          this.volume = 0.8;
          this.debugUnlocked = false;
        }
      } catch (err) {
        this.slots = [emptySlot(0), emptySlot(1), emptySlot(2)];
        this.index = 0;
        this.muted = false;
        this.volume = 0.8;
        this.debugUnlocked = false;
      }
      this.data = this.slots[this.index];
      return this.data;
    },

    persist: function () {
      var payload = currentPayload(this);
      try {
        localStorage.setItem(KEY, JSON.stringify(payload));
      } catch (err) {}
      this._pushRemote(payload);
    },

    _pushRemote: function (payload) {
      var self = this;
      if (pushing) {
        pushAgain = true;
        return;
      }
      pushing = true;
      findApi().then(function (base) {
        if (base == null) return;
        return postDiskSave(base, payload).then(function () {
          return postBridgeSave(base, payload);
        });
      }).catch(function () {}).then(function () {
        pushing = false;
        if (pushAgain) {
          pushAgain = false;
          self._pushRemote(currentPayload(self));
        }
      });
    },

    sync: function () {
      var self = this;
      var before = currentPayload(this);
      before.updatedAt = 0;
      return findApi().then(function (base) {
        return Promise.all([
          Promise.resolve(readLocalPayload()),
          fetchDiskSave(base),
          fetchExportSave(base),
          fetchBridgeSave(base),
          fetchScriptSave()
        ]);
      }).then(function (sources) {
        sources.push(currentPayload(self));
        var merged = mergePayloads(sources);
        if (!merged) return false;
        var w;
        for (w = 0; w < SLOT_COUNT; w++) {
          if (wipedSlots[w]) merged.slots[w] = emptySlot(w);
        }
        var changed = !payloadEquals(before, merged);
        applyPayload(self, merged);
        self.persist();
        return changed;
      }).catch(function () {
        return false;
      });
    },

    select: function (i) {
      this.index = clamp(i, SLOT_COUNT - 1);
      this.data = this.slots[this.index];
      this.persist();
      return this.data;
    },

    rename: function (i, name) {
      var slot = this.slots[clamp(i, SLOT_COUNT - 1)];
      slot.name = (name && String(name).trim().slice(0, 18)) || slot.name;
      this.persist();
    },

    wipe: function (i) {
      i = Math.max(0, Math.min(2, i | 0));
      this.slots[i] = emptySlot(i);
      if (this.index === i) this.data = this.slots[i];
      wipedSlots[i] = true;
      this.persist();
    },

    bank: function (coins) {
      this.data.vault += Math.max(0, coins | 0);
      this.persist();
    },

    spend: function (cost) {
      if (this.data.vault < cost) return false;
      this.data.vault -= cost;
      this.persist();
      return true;
    },

    noteStage: function (stageNum) {
      if (stageNum > this.data.bestStage) {
        this.data.bestStage = stageNum;
        this.persist();
      }
    }
  };
})(window.TFAG = window.TFAG || {});
