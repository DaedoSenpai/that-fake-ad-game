(function (G) {
  var OWNER = "DaedoSenpai";
  var REPO = "that-fake-ad-game";
  var BRANCH = "main";
  var UA = "that-fake-ad-game-updater";

  var modal = document.getElementById("update-modal");
  var titleEl = document.getElementById("update-title");
  var textEl = document.getElementById("update-text");
  var listEl = document.getElementById("update-list");
  var closeBtn = document.getElementById("btn-update-close");
  var applyBtn = document.getElementById("btn-update-apply");
  var checkBtn = document.getElementById("btn-update");
  var hintEl = document.getElementById("update-hint");
  var loaderEl = document.getElementById("update-loader");
  var loaderFill = document.getElementById("update-loader-fill");
  var loaderLabel = document.getElementById("update-loader-label");
  var busy = false;
  var pendingPlan = null;
  var dirHandle = null;
  var loadTimer = null;
  var loadPct = 0;

  function uiClick() {
    if (G.audio && G.audio.ui) G.audio.ui();
  }

  function asList(x) {
    if (!x) return [];
    return Array.isArray(x) ? x : [x];
  }

  function setHint(msg) {
    if (hintEl) hintEl.textContent = msg || "";
  }

  function setLoaderPct(pct, label) {
    loadPct = Math.max(0, Math.min(100, pct));
    if (loaderFill) loaderFill.style.width = loadPct + "%";
    if (label && loaderLabel) loaderLabel.textContent = label;
  }

  function startLoader(label) {
    if (loaderEl) loaderEl.classList.add("is-on");
    if (loaderFill) loaderFill.classList.add("is-run");
    setLoaderPct(4, label || "VERIFICANDO");
    if (loadTimer) clearInterval(loadTimer);
    loadTimer = setInterval(function () {
      if (loadPct >= 90) return;
      setLoaderPct(loadPct + 1.4 + Math.random() * 3.2);
    }, 110);
  }

  function bumpLoader(pct, label) {
    if (loadTimer) {
      clearInterval(loadTimer);
      loadTimer = null;
    }
    if (loaderEl) loaderEl.classList.add("is-on");
    if (loaderFill) loaderFill.classList.add("is-run");
    setLoaderPct(pct, label);
  }

  function stopLoader(ok) {
    if (loadTimer) {
      clearInterval(loadTimer);
      loadTimer = null;
    }
    setLoaderPct(100, ok === false ? "FALHOU" : "PRONTO");
    if (loaderFill) loaderFill.classList.remove("is-run");
    setTimeout(function () {
      if (busy) return;
      if (loaderEl) loaderEl.classList.remove("is-on");
      setLoaderPct(0);
    }, 420);
  }

  function openModal() {
    if (!modal) return;
    modal.classList.remove("hidden");
  }

  function closeModal() {
    if (busy) return;
    if (modal) modal.classList.add("hidden");
  }

  function setBusy(on) {
    busy = !!on;
    if (checkBtn) checkBtn.disabled = busy;
    if (closeBtn) closeBtn.disabled = busy;
    if (applyBtn) applyBtn.disabled = busy || !pendingPlan || !(asList(pendingPlan.download).length || asList(pendingPlan.migrate).length);
  }

  function showStatus(title, text, rows) {
    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text || "";
    if (!listEl) return;
    listEl.innerHTML = (rows || []).map(function (row) {
      return "<li><span>" + row[0] + "</span><b>" + row[1] + "</b></li>";
    }).join("");
  }

  function hasLocalServer() {
    return location.protocol === "http:" && (location.hostname === "127.0.0.1" || location.hostname === "localhost");
  }

  function apiHeaders() {
    return { "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  }

  function githubGet(url) {
    return fetch(url, { headers: apiHeaders(), cache: "no-store" }).then(function (res) {
      if (res.status === 403) throw new Error("O GitHub limitou as consultas. Espera um pouco e tenta de novo.");
      if (res.status === 404) throw new Error("Não achei o repositório público no GitHub.");
      if (!res.ok) throw new Error("Falha ao falar com o GitHub (" + res.status + ").");
      return res.json();
    });
  }

  function apiRoot() {
    if (G.save && G.save.findApi) return G.save.findApi();
    if (hasLocalServer()) return Promise.resolve("");
    return Promise.resolve(null);
  }

  function pingServer() {
    return apiRoot().then(function (base) {
      return base != null;
    });
  }

  function unixPath(p) {
    return String(p || "").replace(/\\/g, "/").replace(/^\/+/, "");
  }

  function skipPath(p) {
    var n = unixPath(p);
    return /(^|\/)\.git(\/|$)/.test(n) || /(^|\/)\.cursor(\/|$)/.test(n) || /(^|\/)data(\/|$)/.test(n);
  }

  function legacyAliases(rel) {
    var n = unixPath(rel);
    var out = [];
    var m = n.match(/^img\/(aliados|inimigos)\/(portrait-.+\.png)$/);
    if (m) out.push("img/" + m[2]);
    var m2 = n.match(/^img\/cenarios\/(bg-.+\.png)$/);
    if (m2) out.push("img/" + m2[1]);
    return out;
  }

  function readLocalAny(root, rel) {
    return readLocalFile(root, rel).then(function (exact) {
      if (exact) return { rel: rel, local: exact, via: "exact" };
      var alts = legacyAliases(rel);
      function tryAlt(i) {
        if (i >= alts.length) return Promise.resolve(null);
        return readLocalFile(root, alts[i]).then(function (found) {
          if (found) return { rel: alts[i], local: found, via: "legacy" };
          return tryAlt(i + 1);
        });
      }
      return tryAlt(0);
    });
  }

  function hexSha(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ("0" + b.toString(16)).slice(-2);
    }).join("");
  }

  function gitBlobSha(bytes) {
    var header = new TextEncoder().encode("blob " + bytes.byteLength + "\0");
    var bin = new Uint8Array(header.length + bytes.byteLength);
    bin.set(header, 0);
    bin.set(new Uint8Array(bytes), header.length);
    return crypto.subtle.digest("SHA-1", bin).then(hexSha);
  }

  function rawUrl(rel) {
    return "https://raw.githubusercontent.com/" + OWNER + "/" + REPO + "/" + BRANCH + "/" +
      unixPath(rel).split("/").map(encodeURIComponent).join("/");
  }

  function ensureDir(root, parts, create) {
    var dir = Promise.resolve(root);
    parts.forEach(function (name) {
      dir = dir.then(function (handle) {
        return handle.getDirectoryHandle(name, { create: !!create });
      });
    });
    return dir;
  }

  function getFileHandle(root, rel, create) {
    var parts = unixPath(rel).split("/");
    var name = parts.pop();
    return ensureDir(root, parts, create).then(function (dir) {
      return dir.getFileHandle(name, { create: !!create });
    });
  }

  function readLocalFile(root, rel) {
    return getFileHandle(root, rel, false).then(function (handle) {
      return handle.getFile();
    }).then(function (file) {
      return file.arrayBuffer().then(function (buf) {
        return { file: file, buf: buf };
      });
    }).catch(function () {
      return null;
    });
  }

  function writeLocalFile(root, rel, buf) {
    return getFileHandle(root, rel, true).then(function (handle) {
      return handle.createWritable();
    }).then(function (writable) {
      return writable.write(buf).then(function () {
        return writable.close();
      });
    });
  }

  function remoteCommitTime(rel) {
    var url = "https://api.github.com/repos/" + OWNER + "/" + REPO +
      "/commits?sha=" + encodeURIComponent(BRANCH) +
      "&path=" + encodeURIComponent(unixPath(rel)) +
      "&per_page=1";
    return githubGet(url).then(function (commits) {
      if (!commits || !commits.length || !commits[0].commit) return null;
      var raw = (commits[0].commit.committer && commits[0].commit.committer.date) ||
        (commits[0].commit.author && commits[0].commit.author.date);
      return raw ? new Date(raw).getTime() : null;
    });
  }

  function buildPlanFromHandle(root) {
    return githubGet("https://api.github.com/repos/" + OWNER + "/" + REPO + "/git/trees/" + BRANCH + "?recursive=1").then(function (tree) {
      if (tree.truncated) throw new Error("A arvore do GitHub veio cortada.");
      var entries = (tree.tree || []).filter(function (entry) {
        return entry.type === "blob" && !skipPath(entry.path);
      });
      var download = [];
      var migrate = [];
      var missing = [];
      var same = 0;
      var i = 0;

      function next() {
        if (i >= entries.length) {
          return {
            ok: true,
            repo: OWNER + "/" + REPO,
            branch: BRANCH,
            same: same,
            download: download,
            migrate: migrate,
            keepLocal: [],
            missing: missing
          };
        }
        var entry = entries[i++];
        var rel = unixPath(entry.path);
        showStatus("Verificando", "Comparando " + i + "/" + entries.length + " · " + rel, []);
        bumpLoader((i / Math.max(1, entries.length)) * 100, "COMPARANDO");
        return readLocalAny(root, rel).then(function (hit) {
          if (!hit) {
            missing.push(rel);
            download.push({ path: rel, reason: "missing" });
            return next();
          }
          return gitBlobSha(hit.local.buf).then(function (sha) {
            if (sha === String(entry.sha || "").toLowerCase()) {
              if (hit.via === "legacy") migrate.push({ path: rel, from: hit.rel });
              else same += 1;
              return next();
            }
            download.push({ path: rel, reason: "newer" });
            return next();
          });
        });
      }

      return next();
    });
  }

  function copyLocalFile(root, fromRel, toRel) {
    return readLocalFile(root, fromRel).then(function (local) {
      if (!local) return Promise.reject(new Error("sumiu: " + fromRel));
      return writeLocalFile(root, toRel, local.buf);
    });
  }

  function copyLocalIfMissing(root, fromRel, toRel) {
    return readLocalFile(root, toRel).then(function (exists) {
      if (exists) return null;
      return copyLocalFile(root, fromRel, toRel);
    });
  }

  function listDirFiles(dir) {
    if (!dir) return Promise.resolve([]);
    return new Promise(function (resolve, reject) {
      var items = [];
      var it = dir.values();
      function step() {
        Promise.resolve(it.next()).then(function (r) {
          if (!r || r.done) return resolve(items);
          items.push(r.value);
          step();
        }).catch(reject);
      }
      step();
    });
  }

  function migrateLegacyTree(root) {
    return root.getDirectoryHandle("img").then(function (imgDir) {
      return listDirFiles(imgDir).then(function (items) {
        var jobs = [];
        items.forEach(function (h) {
          if (h.kind !== "file") return;
          var name = h.name || "";
          if (/^bg-.+\.png$/i.test(name)) jobs.push(copyLocalIfMissing(root, "img/" + name, "img/cenarios/" + name));
          if (/^portrait-.+\.png$/i.test(name)) {
            jobs.push(copyLocalIfMissing(root, "img/" + name, "img/aliados/" + name));
            jobs.push(copyLocalIfMissing(root, "img/" + name, "img/inimigos/" + name));
          }
        });
        return Promise.all(jobs.map(function (p) {
          return p.catch(function () { return null; });
        })).then(function () {
          return jobs.length;
        });
      });
    }).catch(function () {
      return 0;
    });
  }

  function applyPlanToHandle(root, plan) {
    var moved = asList(plan.migrate);
    var files = asList(plan.download).slice();
    var updated = [];
    var migrated = [];
    var failed = [];
    var mi = 0;
    var i = 0;

    function nextMove() {
      if (mi >= moved.length) return nextDownload();
      var item = moved[mi++];
      var dest = unixPath(item.path);
      var from = unixPath(item.from);
      showStatus("Reorganizando", mi + "/" + moved.length + " · " + dest, []);
      bumpLoader((mi / Math.max(1, moved.length + files.length)) * 40, "PASTAS");
      return copyLocalFile(root, from, dest).then(function () {
        migrated.push(dest);
      }).catch(function () {
        files.push({ path: dest, reason: "missing" });
      }).then(nextMove);
    }

    function nextDownload() {
      if (i >= files.length) {
        return migrateLegacyTree(root).then(function () {
          return {
            ok: failed.length === 0,
            updated: updated,
            migrated: migrated,
            failed: failed,
            keepLocal: [],
            same: plan.same || 0
          };
        });
      }
      var rel = unixPath(files[i++].path);
      showStatus("Baixando", i + "/" + files.length + " · " + rel, []);
      bumpLoader(40 + (i / Math.max(1, files.length)) * 60, "BAIXANDO");
      return fetch(rawUrl(rel), { cache: "no-store", headers: { "User-Agent": UA } }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.arrayBuffer();
      }).then(function (buf) {
        return writeLocalFile(root, rel, buf);
      }).then(function () {
        updated.push(rel);
      }).catch(function (err) {
        failed.push({ path: rel, error: err && err.message ? err.message : String(err) });
      }).then(nextDownload);
    }

    return nextMove();
  }

  function pickGameFolder() {
    if (!window.showDirectoryPicker) {
      return Promise.reject(new Error("Este navegador não deixa o site gravar na pasta do jogo."));
    }
    return window.showDirectoryPicker({ mode: "readwrite" }).then(function (handle) {
      dirHandle = handle;
      return handle;
    });
  }

  function serverCheck() {
    return apiRoot().then(function (base) {
      if (base == null) throw new Error("Servidor local não está no ar.");
      return fetch((base || "") + "/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply: false })
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || data.ok === false) throw new Error(data.error || "Não deu pra verificar.");
          return data;
        });
      });
    });
  }

  function serverApply() {
    return apiRoot().then(function (base) {
      if (base == null) throw new Error("Servidor local não está no ar.");
      return fetch((base || "") + "/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply: true })
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "Não deu pra baixar.");
          return data;
        });
      });
    });
  }

  function renderPlan(plan) {
    pendingPlan = plan;
    var download = asList(plan.download);
    var migrate = asList(plan.migrate);
    var keep = asList(plan.keepLocal);
    var rows = [
      ["Iguais", String(plan.same || 0)],
      ["Mais novos no GitHub", String(download.length)],
      ["Imagens da pasta antiga", String(migrate.length)]
    ];
    if (keep.length) rows.push(["Mantidos nesta máquina", String(keep.length)]);
    if (download.length || migrate.length) {
      showStatus("Atualização disponível", "O GitHub tem arquivos novos. Se a sua pasta ainda for a antiga (sem aliados/inimigos/cenarios), eu reorganizo as imagens. O save não mexe.", rows.concat(
        download.slice(0, 6).map(function (item) {
          return ["Baixar", item.path || item];
        }).concat(migrate.slice(0, 4).map(function (item) {
          return ["Mover", (item.from || "") + " → " + (item.path || "")];
        }))
      ));
      if (applyBtn) {
        applyBtn.classList.remove("hidden");
        var n = download.length + migrate.length;
        applyBtn.textContent = n === 1 ? "Atualizar 1 arquivo" : "Atualizar " + n + " arquivos";
      }
      setHint((download.length + migrate.length) + " arquivo(s) pra atualizar.");
    } else {
      showStatus("Tudo atualizado", "Nenhum arquivo do GitHub é mais novo do que o da sua pasta.", rows);
      if (applyBtn) applyBtn.classList.add("hidden");
      setHint("Tudo atualizado.");
    }
    setBusy(false);
    stopLoader();
  }

  function renderApply(result) {
    pendingPlan = null;
    var updated = asList(result.updated);
    var migrated = asList(result.migrated);
    var failed = asList(result.failed);
    var rows = [
      ["Baixados", String(updated.length)],
      ["Imagens reorganizadas", String(migrated.length)],
      ["Falharam", String(failed.length)]
    ];
    updated.slice(0, 6).forEach(function (p) {
      rows.push(["Novo", typeof p === "string" ? p : p.path]);
    });
    migrated.slice(0, 4).forEach(function (p) {
      rows.push(["Pasta", typeof p === "string" ? p : p.path]);
    });
    failed.slice(0, 4).forEach(function (item) {
      rows.push(["Erro", (item.path || "") + " " + (item.error || "")]);
    });
    if (failed.length && !updated.length && !migrated.length) {
      showStatus("Não deu pra atualizar", "O GitHub respondeu, mas a pasta não recebeu os arquivos.", rows);
      setHint("Falha ao baixar.");
    } else {
      showStatus("Atualizado", (updated.length || migrated.length) ? "Pronto. Recarrega pra valer — as imagens antigas também entram nas pastas novas." : "Nada pra baixar.", rows);
      setHint((updated.length || migrated.length) ? "Atualizado. Recarrega a página." : "Tudo atualizado.");
    }
    setBusy(false);
    if (applyBtn && (updated.length || migrated.length) && !(failed.length && !updated.length && !migrated.length)) {
      applyBtn.classList.remove("hidden");
      applyBtn.textContent = "Recarregar agora";
      applyBtn.disabled = false;
      applyBtn.dataset.reload = "1";
    } else if (applyBtn && !updated.length && !migrated.length) {
      applyBtn.classList.add("hidden");
    }
    stopLoader(failed.length && !updated.length && !migrated.length ? false : true);
  }

  function runCheck() {
    if (busy) return;
    uiClick();
    pendingPlan = null;
    if (applyBtn) {
      applyBtn.classList.add("hidden");
      delete applyBtn.dataset.reload;
    }
    openModal();
    showStatus("Verificando", "Batendo os arquivos da sua pasta com o GitHub...", []);
    setBusy(true);
    startLoader("VERIFICANDO");

    pingServer().then(function (ok) {
      if (ok) return serverCheck();
      showStatus("Pasta do jogo", "Escolhe a pasta onde está o index.html pra eu comparar e substituir os arquivos.", []);
      return pickGameFolder().then(buildPlanFromHandle);
    }).then(renderPlan).catch(function (err) {
      pendingPlan = null;
      showStatus("Não deu pra verificar", err && err.message ? err.message : String(err), []);
      setHint("Não deu pra verificar.");
      if (applyBtn) applyBtn.classList.add("hidden");
      setBusy(false);
      stopLoader(false);
    });
  }

  function runApply() {
    if (applyBtn && applyBtn.dataset.reload === "1") {
      location.reload();
      return;
    }
    if (busy || !pendingPlan || !(asList(pendingPlan.download).length || asList(pendingPlan.migrate).length)) return;
    uiClick();
    showStatus("Baixando", "Baixando os arquivos mais novos do GitHub...", []);
    setBusy(true);
    startLoader("BAIXANDO");
    pingServer().then(function (ok) {
      if (ok) return serverApply();
      if (!dirHandle) throw new Error("Escolhe de novo a pasta do jogo.");
      return applyPlanToHandle(dirHandle, pendingPlan);
    }).then(renderApply).catch(function (err) {
      showStatus("Não deu pra baixar", err && err.message ? err.message : String(err), []);
      setHint("Falha ao baixar.");
      setBusy(false);
      stopLoader(false);
    });
  }

  if (checkBtn) checkBtn.onclick = runCheck;
  if (closeBtn) closeBtn.onclick = function () {
    uiClick();
    closeModal();
  };
  if (applyBtn) applyBtn.onclick = runApply;
  if (modal) modal.onclick = function (ev) {
    if (ev.target.id === "update-modal") {
      uiClick();
      closeModal();
    }
  };

  if (hasLocalServer()) setHint("");
  else if (location.protocol === "file:") {
    pingServer().then(function (ok) {
      if (!ok && hintEl && !hintEl.textContent) {
        setHint("Com o Jogar.bat aberto, dá pra baixar atualização direto. Sem ele, o navegador pede a pasta do jogo.");
      }
    });
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    if (!modal || modal.classList.contains("hidden")) return;
    closeModal();
    ev.stopPropagation();
  }, true);
})(window.TFAG = window.TFAG || {});
