(function (G) {
  var KEY = "tfag-save-v2";
  var OLD = "tfag-save-v1";
  var SLOT_COUNT = 3;

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
      rerolls: 0
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
      maxUnits: clamp(p.maxUnits, 5),
      rerolls: clamp(p.rerolls, 2)
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

  function migrateOld() {
    try {
      var raw = localStorage.getItem(OLD);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      var slot = emptySlot(0);
      slot.vault = parsed.vault | 0;
      slot.bestStage = parsed.bestStage | 0;
      slot.perm = normalizePerm(parsed.perm);
      slot.codex = {
        units: (parsed.codex && parsed.codex.units) || {},
        enemies: (parsed.codex && parsed.codex.enemies) || {}
      };
      return { muted: !!parsed.muted, slot: slot };
    } catch (err) {
      return null;
    }
  }

  G.save = {
    data: emptySlot(0),
    index: 0,
    muted: false,
    volume: 0.8,
    slots: [emptySlot(0), emptySlot(1), emptySlot(2)],

    load: function () {
      try {
        var raw = localStorage.getItem(KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          this.index = clamp(parsed.active, SLOT_COUNT - 1);
          this.muted = !!parsed.muted;
          this.volume = clampVol(parsed.volume);
          this.slots = [];
          for (var i = 0; i < SLOT_COUNT; i++) {
            this.slots[i] = normalizeSlot(parsed.slots && parsed.slots[i], i);
          }
        } else {
          var old = migrateOld();
          this.slots = [emptySlot(0), emptySlot(1), emptySlot(2)];
          this.index = 0;
          this.muted = old ? old.muted : false;
          this.volume = old && old.volume != null ? clampVol(old.volume) : 0.8;
          if (old) this.slots[0] = old.slot;
        }
      } catch (err) {
        this.slots = [emptySlot(0), emptySlot(1), emptySlot(2)];
        this.index = 0;
        this.muted = false;
        this.volume = 0.8;
      }
      this.data = this.slots[this.index];
      return this.data;
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
      this.persist();
    },

    persist: function () {
      this.slots[this.index] = this.data;
      localStorage.setItem(
        KEY,
        JSON.stringify({
          active: this.index,
          muted: this.muted,
          volume: this.volume,
          slots: this.slots
        })
      );
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
