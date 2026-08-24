(function (G) {
  function tone(ctx, freq, dur, type, gain, slide) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), ctx.currentTime + dur);
    }
    g.gain.setValueAtTime(gain * (G.audio.master || 0), ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  var BGM_SRC = {
    "stage-1": "audio/stage-01.ogg",
    "stage-2": "audio/stage-02.ogg",
    "stage-3": "audio/stage-03.ogg",
    "stage-4": "audio/stage-04.ogg",
    "stage-5": "audio/stage-05.ogg",
    "stage-6": "audio/stage-06.ogg",
    "stage-7": "audio/stage-07.ogg",
    "stage-8": "audio/stage-08.ogg",
    "boss-chefe_invasao": "audio/boss-dusk.ogg",
    "boss-chefe_comandante": "audio/boss-dusk.ogg",
    "boss-chefe_vulto": "audio/boss-veu.ogg",
    "boss-chefe_megatanque": "audio/boss-beemote.ogg",
    "boss-chefe_beeking": "audio/boss-beemote.ogg",
    "boss-chefe_arklan": "audio/boss-cidadela.ogg",
    "boss-chefe_fortaleza": "audio/boss-cidadela.ogg",
    "boss-chefe_espectro": "audio/boss-veu.ogg",
    "boss-chefe_final": "audio/boss-nucleo.ogg",
    "boss-beeprincess": "audio/boss-beeprincess.mp3",
    "boss-formiga_leao": "audio/boss-cidadela.ogg",
    "boss-besouro_bombardeiro": "audio/boss-cidadela.ogg",
    "boss-louva_deus": "audio/boss-cidadela.ogg"
  };

  var BOSS_PRIO = {
    chefe_final: 8,
    beeprincess: 7,
    chefe_espectro: 6,
    chefe_arklan: 6,
    formiga_leao: 5,
    besouro_bombardeiro: 5,
    louva_deus: 5,
    chefe_fortaleza: 4,
    chefe_vulto: 4,
    chefe_megatanque: 3,
    chefe_beeking: 2,
    chefe_comandante: 2,
    chefe_invasao: 1
  };

  function makeDeck() {
    var a = new Audio();
    a.loop = true;
    a.preload = "auto";
    a.volume = 0;
    return a;
  }

  function tryPlay(el) {
    if (!el || !el.src) return;
    var p = el.play();
    if (p && p.catch) p.catch(function () {});
  }

  G.audio = {
    ctx: null,
    muted: false,
    master: 0.8,
    bgmVol: 0.32,
    _a: null,
    _b: null,
    _cur: null,
    _nxt: null,
    _id: "",
    _want: "",
    _fade: 1,
    _cross: false,
    _held: false,

    ensure: function () {
      if (!this.ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
      this._deck();
    },

    play: function (fn) {
      if (this.muted || this.master <= 0.01) return;
      this.ensure();
      if (!this.ctx) return;
      fn(this.ctx);
    },

    shoot: function () {
      this.play(function (ctx) {
        tone(ctx, 720, 0.045, "square", 0.03);
      });
    },

    toss: function () {
      this.play(function (ctx) {
        tone(ctx, 420, 0.12, "square", 0.028, 160);
      });
    },

    thud: function () {
      this.play(function (ctx) {
        tone(ctx, 95, 0.14, "sawtooth", 0.05, 42);
      });
    },

    bark: function () {
      this.play(function (ctx) {
        tone(ctx, 240, 0.09, "square", 0.04, 90);
      });
    },

    horn: function () {
      this.play(function (ctx) {
        tone(ctx, 160, 0.16, "sawtooth", 0.04, 70);
      });
    },

    hit: function () {
      this.play(function (ctx) {
        tone(ctx, 220, 0.06, "sawtooth", 0.04, 80);
      });
    },

    merge: function () {
      this.play(function (ctx) {
        tone(ctx, 420, 0.12, "triangle", 0.06, 880);
      });
    },

    coin: function () {
      this.play(function (ctx) {
        tone(ctx, 980, 0.08, "square", 0.035, 1400);
      });
    },

    explosion: function () {
      this.play(function (ctx) {
        tone(ctx, 140, 0.18, "sawtooth", 0.05, 50);
      });
    },

    ui: function () {
      this.play(function (ctx) {
        tone(ctx, 520, 0.05, "triangle", 0.04);
      });
    },

    wave: function () {
      this.play(function (ctx) {
        tone(ctx, 300, 0.16, "square", 0.04, 500);
      });
    },

    over: function () {
      this.play(function (ctx) {
        tone(ctx, 220, 0.42, "sawtooth", 0.05, 90);
      });
      var self = this;
      setTimeout(function () {
        self.play(function (ctx) {
          tone(ctx, 146, 0.55, "triangle", 0.045, 70);
        });
      }, 180);
      setTimeout(function () {
        self.play(function (ctx) {
          tone(ctx, 98, 0.7, "sine", 0.04, 55);
        });
      }, 420);
    },

    win: function () {
      this.play(function (ctx) {
        tone(ctx, 440, 0.12, "triangle", 0.05, 660);
        setTimeout(function () {
          G.audio.play(function (ctx2) {
            tone(ctx2, 660, 0.18, "triangle", 0.05, 880);
          });
        }, 120);
      });
    },

    desiredId: function (state) {
      if (!state) return "";
      var best = 0;
      var type = "";
      var list = state.enemies || [];
      for (var i = 0; i < list.length; i++) {
        var e = list[i];
        if (!e || e.hp <= 0 || e.fake) continue;
        if (!e.def || !e.def.boss) continue;
        var p = BOSS_PRIO[e.type] || 0;
        if (p > best) {
          best = p;
          type = e.type;
        }
      }
      if (type) return "boss-" + type;
      return "stage-" + ((state.stageIndex | 0) + 1);
    },

    sync: function (state, dt) {
      this._deck();
      this._want = this.desiredId(state);
      if (this._want && this._want !== this._id) this._go(this._want);
      this.tick(dt || 0.016);
    },

    stopBgm: function () {
      this._want = "";
      this._id = "";
      this._cross = false;
      this._fade = 1;
      if (this._a) {
        this._a.pause();
        this._a.volume = 0;
        this._a.removeAttribute("src");
      }
      if (this._b) {
        this._b.pause();
        this._b.volume = 0;
        this._b.removeAttribute("src");
      }
    },

    setPaused: function (held) {
      this._held = !!held;
      this._deck();
      if (this.muted || this._held) {
        if (this._a) this._a.pause();
        if (this._b) this._b.pause();
      } else {
        tryPlay(this._cross ? this._nxt : this._cur);
        if (this._cross) tryPlay(this._cur);
      }
      this._levels();
    },

    setVolume: function (v) {
      v = Number(v);
      if (isNaN(v)) v = 0.8;
      this.master = Math.max(0, Math.min(1, v));
      this._levels();
    },

    applyMute: function () {
      this.setPaused(this._held);
    },

    tick: function (dt) {
      if (!this._cross) {
        this._levels();
        return;
      }
      this._fade += (dt || 0.016) / 0.9;
      if (this._fade >= 1) {
        this._fade = 1;
        this._cross = false;
        this._cur.pause();
        this._cur.volume = 0;
        var swap = this._cur;
        this._cur = this._nxt;
        this._nxt = swap;
      }
      this._levels();
    },

    _deck: function () {
      if (this._a) return;
      this._a = makeDeck();
      this._b = makeDeck();
      this._cur = this._a;
      this._nxt = this._b;
    },

    _go: function (id) {
      var src = BGM_SRC[id];
      if (!src) {
        this._id = id;
        return;
      }
      this._nxt.pause();
      this._nxt.src = src;
      try {
        this._nxt.currentTime = 0;
      } catch (err) {}
      this._nxt.volume = 0;
      if (!this.muted && !this._held) tryPlay(this._nxt);
      this._id = id;
      this._fade = 0;
      this._cross = true;
    },

    _levels: function () {
      var v = this.muted || this._held ? 0 : this.bgmVol * (this.master == null ? 1 : this.master);
      if (!this._cur) return;
      var k = this._fade;
      if (k < 0) k = 0;
      if (k > 1) k = 1;
      if (this._cross) {
        this._cur.volume = v * (1 - k);
        this._nxt.volume = v * k;
      } else {
        this._cur.volume = this._id ? v : 0;
        this._nxt.volume = 0;
      }
    }
  };
})(window.TFAG = window.TFAG || {});
