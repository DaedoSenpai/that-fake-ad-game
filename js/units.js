(function (G) {
  function u(def) {
    def.kind = def.kind;
    def.merge = def.merge || [];
    if (def.range > 0) def.range += 100;
    return def;
  }

  G.EARLY_KINDS = ["recruta", "fuzileiro", "metralhador", "sniper", "anti_material"];

  G.UNIT_DEFS = {
    recruta: u({
      kind: "recruta", name: "Recruta", short: "REC", gen: 0,
      hp: 46, dmg: 9, range: 140, fire: 0.85, speed: 152, size: 12,
      color: "#9ad4ff", accent: "#d7f1ff", projectile: "bullet", role: "recruit",
      blurb: "A base do esquadrão. Tiro reto, sem especialidade.",
      merge: ["fuzileiro", "pistoleiro", "batedor"]
    }),
    fuzileiro: u({
      kind: "fuzileiro", name: "Fuzileiro", short: "FUZ", gen: 1,
      hp: 64, dmg: 15, range: 200, fire: 0.95, speed: 150, size: 13,
      color: "#4aa3ff", accent: "#b8dcff", projectile: "bullet", role: "rifle",
      blurb: "Fuzil da linha de frente. Preciso. Enquanto atira, o grupo perde velocidade.",
      active: { id: "suppress", name: "Fogo de supressão", cd: 15, desc: "Por 5s os tiros empurram os inimigos." },
      merge: ["sniper", "metralhador", "caminhao"]
    }),
    pistoleiro: u({
      kind: "pistoleiro", name: "Pistoleiro", short: "PST", gen: 1,
      hp: 58, dmg: 8, range: 110, fire: 1.4, speed: 156, size: 12,
      color: "#7cffb0", accent: "#d4ffe8", projectile: "bullet", role: "pistol",
      blurb: "Medico de combate com pistola rápida. Acertar o alvo pode soltar nodes de vida no chão.",
      merge: ["medico", "dualista", "engenheiro"]
    }),
    batedor: u({
      kind: "batedor", name: "Batedor", short: "BAT", gen: 1,
      hp: 50, dmg: 11, range: 130, fire: 1.1, speed: 190, size: 11,
      color: "#ffe08a", accent: "#fff4c8", projectile: "bullet", role: "scout",
      blurb: "Ponta de lança. O mais rápido das unidades iniciais.",
      active: { id: "dash", name: "Disparada", cd: 6, desc: "Avança o dobro da distância na direção do movimento. Inimigos no caminho tomam dano. Invencível durante o avanço." },
      merge: ["infiltrador", "mensageiro", "droneiro", "ponta_lanca"]
    }),
    sniper: u({
      kind: "sniper", name: "Sniper", short: "SNP", gen: 2,
      hp: 70, dmg: 34, range: 310, fire: 0.42, speed: 132, size: 13,
      color: "#5ad0ff", accent: "#c8f4ff", projectile: "bullet", role: "sniper",
      infiniteRange: true,
      blurb: "Um atirador de elite, quanto mais longe a distancia percorrida pela bala mais dano causa.",
      active: { id: "mark", name: "Tiro marcado", cd: 11, desc: "O próximo tiro causa 4× o dano." },
      merge: ["anti_material", "observador", "designado"]
    }),
    metralhador: u({
      kind: "metralhador", name: "Metralhador", short: "MET", gen: 2,
      hp: 95, dmg: 7, range: 165, fire: 2.8, speed: 134, size: 16,
      color: "#2f7dff", accent: "#8ec2ff", projectile: "bullet", role: "mg",
      blurb: "Unidade com metralhadora automatica. Cinco tiros em leque. O coice empurra o esquadrão pra trás.",
      active: { id: "focus_fire", name: "Foco absoluto", cd: 12, desc: "Por 8s o leque vira uma linha reta concentrada." },
      merge: ["lanca_chamas", "canhoneiro", "giratoria"]
    }),
    caminhao: u({
      kind: "caminhao", name: "Caminhão de comando", short: "CAM", gen: 2,
      hp: 160, dmg: 0, range: 0, fire: 0, speed: 110, size: 22,
      color: "#6a8aaa", accent: "#c8dce8", projectile: "none", role: "truck",
      blurb: "Para-choque com campo magnético. Aguenta tiros e colisões e se regenera com o tempo.",
      merge: ["minitanque", "quartel", "oficina"]
    }),
    medico: u({
      kind: "medico", name: "Médico de campo", short: "MED", gen: 2,
      hp: 80, dmg: 6, range: 100, fire: 1.2, speed: 148, size: 13,
      color: "#e8fff0", accent: "#ffffff", projectile: "bullet", role: "medic",
      blurb: "Arremessa uma cápsula de cura na mira. A poça verde cura quem fica nela.",
      active: { id: "kit", name: "Kit de emergência", cd: 13, desc: "Cápsula extra na mira. Também tira sanguessuga do grupo." },
      merge: ["cirurgiao", "capelao", "socorrista"]
    }),
    dualista: u({
      kind: "dualista", name: "Dualista", short: "DUA", gen: 2,
      hp: 72, dmg: 12, range: 125, fire: 2.1, speed: 160, size: 13,
      color: "#ffb070", accent: "#ffe0c0", projectile: "bullet", role: "dual",
      blurb: "Dois revolvers calibre .38. Drena vida se os dois tiros acertarem o mesmo alvo.",
      lifesteal: true,
      active: { id: "doubletap", name: "Canos quentes", cd: 14, desc: "Por 10s, duplica a quantidade de tiros." },
      merge: ["fora_da_lei", "revolver", "saqueador"]
    }),
    engenheiro: u({
      kind: "engenheiro", name: "Engenheiro", short: "ENG", gen: 2,
      hp: 88, dmg: 22, range: 140, fire: 0.55, speed: 128, size: 15,
      color: "#d4c46a", accent: "#fff3b0", projectile: "mine", role: "engineer",
      blurb: "Planta minas no cursor do mouse.",
      active: { id: "supercharge", name: "Supercarga", cd: 13, desc: "As minas no chão incham: aumentando a area de efeito e o dano." },
      merge: ["mineiro", "tesla", "torreta"]
    }),
    infiltrador: u({
      kind: "infiltrador", name: "Infiltrador", short: "INF", gen: 2,
      hp: 60, dmg: 16, range: 120, fire: 1.3, speed: 198, size: 12,
      color: "#8a7cff", accent: "#ddd6ff", projectile: "bullet", role: "stealth",
      blurb: "Agente especializado em infiltração. Pistola rápida e silenciada.",
      active: { id: "smoke", name: "Cortina", cd: 10, dur: 3.2, desc: "Joga uma bomba de fumaça na mira. Inimigos dentro se perdem por 3s, correm pra longe e se machucam entre si." },
      merge: ["assassino", "sabotador", "fantasma"]
    }),
    mensageiro: u({
      kind: "mensageiro", name: "Mensageiro", short: "MEN", gen: 2,
      hp: 70, dmg: 9, range: 90, fire: 0.85, speed: 175, size: 13,
      color: "#ffd36a", accent: "#fff0c4", projectile: "bullet", role: "courier",
      blurb: "Deixa um rastro. Andar nele dobra a velocidade.",
      merge: ["radio", "oficial", "bandeira"]
    }),
    droneiro: u({
      kind: "droneiro", name: "Droneiro", short: "DRN", gen: 2,
      hp: 68, dmg: 10, range: 180, fire: 1.5, speed: 170, size: 14,
      color: "#7af0ff", accent: "#e8ffff", projectile: "bullet", flying: true, role: "drone",
      blurb: "O drone orbita a mira e dispara a partir dela.",
      active: { id: "rocket", name: "Míssil do drone", cd: 11, desc: "O drone dispara um míssil teleguiado na mira. Explode em área com dano dobrado." },
      merge: ["helicoptero", "bombardeiro", "recon"]
    }),
    ponta_lanca: u({
      kind: "ponta_lanca", name: "Ponta de lança", short: "PDL", gen: 2,
      hp: 82, dmg: 20, range: 90, fire: 1.15, speed: 205, size: 12,
      color: "#ff9a3a", accent: "#ffe0b0", projectile: "bullet", role: "spear",
      blurb: "Se joga em cima do inimigo e esmaga no impacto.",
      active: { id: "spear_dash", name: "Investida", cd: 8, desc: "O Ponta de lança avança até a mira, atravessa inimigos e volta pro grupo. Invulnerável no avanço e na volta." },
      merge: ["ceifador", "phalanx", "warlord"]
    }),
    ceifador: u({
      kind: "ceifador", name: "Ceifador", short: "CEI", gen: 3,
      hp: 118, dmg: 34, range: 200, fire: 0.85, speed: 212, size: 13,
      aoe: 60,
      color: "#8e1230", accent: "#e11d48", projectile: "none", role: "reaper",
      blurb: "Ceifador do comapo de batalha, com sua foice desfere grandes ataques.",
      active: { id: "reap", name: "Ceifa", cd: 20, desc: "Avança até a mira, gira e rasga em um circulo. Causa o dano do básico +10." },
      merge: []
    }),
    phalanx: u({
      kind: "phalanx", name: "Phalanx", short: "PHX", gen: 3,
      hp: 210, dmg: 26, range: 90, fire: 0.9, speed: 128, size: 16,
      color: "#c4a45a", accent: "#fff0c4", projectile: "none", role: "paladin",
      blurb: "Tanque de lança e escudo-torre. Salta no inimigo e dispara um feixe de energia além do impacto.",
      active: { id: "phalanx_wall", name: "Falange", cd: 20, desc: "Dispara um anel de soldados no campo de batalha. Dois modos: se o esquadrão entra, o anel protege o jogador. Se cai em cima do bicho, vira Termópilas e espetam o centro. Dura 15s; a recarga de 20s só começa quando acaba." },
      merge: []
    }),
    warlord: u({
      kind: "warlord", name: "Warlord", short: "WRL", gen: 3,
      hp: 128, dmg: 8, range: 90, fire: 2.05, speed: 222, size: 15,
      color: "#7a3a22", accent: "#c41e3a", projectile: "none", role: "warlord",
      blurb: "Senhor da guerra com dois machados e dois guerreiros. Cortes fracos e rapidíssimos. Cada abate aumenta a cadência.",
      merge: []
    }),
    anti_material: u({
      kind: "anti_material", name: "Antimaterial", short: "ATM", gen: 3,
      hp: 90, dmg: 92, range: 340, fire: 0.34, speed: 118, size: 15,
      color: "#3ec0ff", accent: "#b8f0ff", projectile: "cannon", role: "sniper",
      infiniteRange: true,
      blurb: "Rifle de precisão com munição de anti-materia, o disparo é tão poderoso que destroi qualquer projetil inimigo no caminho.",
      active: { id: "blackhole", name: "Buraco negro", cd: 14, desc: "Granada de com massa quase infinita cria um buraco negro que puxa inimigos ao centro e causa dano." },
      merge: []
    }),
    observador: u({
      kind: "observador", name: "Observador", short: "OBS", gen: 3,
      hp: 75, dmg: 22, range: 300, fire: 0.7, speed: 150, size: 13,
      color: "#80e0ff", accent: "#e8ffff", projectile: "bullet", role: "observer",
      infiniteRange: true,
      blurb: "Atirador de Suporte para o grupo, ele facilita o acerto de tiros para o esquadrão.",
      active: { id: "flare", name: "Marcação", cd: 8, desc: "Marca em área no inimigo, criando uma zona que segue ele pela duração, aumentando todo o dano causado." },
      merge: []
    }),
    lanca_chamas: u({
      kind: "lanca_chamas", name: "Lança-chamas", short: "CHM", gen: 3,
      hp: 135, dmg: 11, range: 330, fire: 2.35, speed: 135, size: 17,
      color: "#ff7a2a", accent: "#ffd27a", projectile: "flame", role: "flamer",
      blurb: "Cone de fogo. 10% de chance de derreter cada bala física.",
      active: { id: "napalm", name: "Napalm", cd: 12, desc: "Jato branco-quente: dobro de alcance, queimadura forte e derrete todas as balas no cone." },
      merge: ["inferno"]
    }),
    canhoneiro: u({
      kind: "canhoneiro", name: "Canhoneiro", short: "CAN", gen: 3,
      hp: 120, dmg: 88, range: 250, fire: 0.48, speed: 118, size: 18,
      color: "#6aa84a", accent: "#d4ffb0", projectile: "grenade", role: "grenadier",
      blurb: "Dispara granadas em arco, causando grande explosão no impacto.",
      merge: ["missil"]
    }),
    minitanque: u({
      kind: "minitanque", name: "Mini-tanque", short: "MTK", gen: 3,
      hp: 260, dmg: 22, range: 200, fire: 0.95, speed: 85, size: 22,
      color: "#3a6ad8", accent: "#9ad4ff", projectile: "bullet", role: "minitank",
      blurb: "Mini Canhão lento com grande poder de destruição.",
      active: { id: "firemode", name: "Modo de tiro", cd: 0.8, desc: "Alterna entre fuzil preciso e granadas que explodem no contato." },
      merge: ["tanque"]
    }),
    quartel: u({
      kind: "quartel", name: "Quartel móvel", short: "QRT", gen: 3,
      hp: 240, dmg: 0, range: 0, fire: 0, speed: 96, size: 24,
      color: "#7a90a8", accent: "#e0e8f0", projectile: "none", role: "bunker",
      blurb: "Solta iscas kamikaze na mira. Elas tomam o tiro no lugar do grupo e se sobreviverem o suficiente são promovidas por seus meritos.",
      spawn: 25,
      merge: []
    }),
    cirurgiao: u({
      kind: "cirurgiao", name: "Cirurgião", short: "CIR", gen: 3,
      hp: 95, dmg: 12, range: 150, fire: 1.15, speed: 142, size: 14,
      color: "#ffffff", accent: "#ffd0d0", projectile: "bullet", role: "surgeon",
      blurb: "Medico especializado em cura no campo de batalha, todo dano causado é curado na hora.",
      merge: []
    }),
    capelao: u({
      kind: "capelao", name: "Capelão", short: "CAP", gen: 3,
      hp: 110, dmg: 7, range: 110, fire: 0.9, speed: 138, size: 15,
      color: "#f0e0a0", accent: "#fff8d8", projectile: "bullet", role: "chaplain",
      blurb: "Medico devoto a mediça e a fé, além de curar também protege o grupo com uma âncora sagrada.",
      active: { id: "bless", name: "Âncora sagrada", cd: 10, desc: "Invoca uma ancora sagrada na mira por 9s. Perto dela o esquadrão toma 35% menos dano de todas as fontes." },
      merge: []
    }),
    fora_da_lei: u({
      kind: "fora_da_lei", name: "Fora-da-lei", short: "FDL", gen: 3,
      hp: 90, dmg: 18, range: 900, fire: 2.4, speed: 168, size: 14,
      color: "#ff8a4a", accent: "#ffd0b0", projectile: "bullet", role: "outlaw",
      blurb: "Fora da lei com uma calibre doze, causa grande dano de perto e quase nada a distancia",
      lifesteal: true,
      active: { id: "fan", name: "Leque de chumbo", cd: 11, desc: "Fere todo inimigo perto da unidade com uma chuva de balas." },
      merge: []
    }),
    mineiro: u({
      kind: "mineiro", name: "Mineiro", short: "MIN", gen: 3,
      hp: 130, dmg: 40, range: 150, fire: 0.42, speed: 116, size: 17,
      color: "#f0c422", accent: "#fff0a8", projectile: "mine", role: "miner",
      blurb: "Especialista em minas e explosivos.",
      active: { id: "carpet", name: "Tapete de minas", cd: 12, desc: "Planta minas em anel na mira, ou em linha no chão." },
      merge: []
    }),
    tesla: u({
      kind: "tesla", name: "Tesla", short: "TSL", gen: 3,
      hp: 130, dmg: 26, range: 300, fire: 0.9, speed: 124, size: 16,
      color: "#a8f6ff", accent: "#ffffff", projectile: "tesla", role: "tesla",
      blurb: "Especialista em Eletricidade, dispara feixes continuo de energia até o cursor do mouse, eletrificando inimigos no caminho.",
      active: { id: "coil", name: "Bobina", cd: 8, desc: "Planta uma bobina na mira, até 300 de alcance. O feixe da Tesla carrega a bateria da bobina. Ela zapa inimigos proximos enquanto tiver carga. Duas bobinas no alcance se alimentam e demoram o dobro pra esvaziar. Máximo 2; ao replantar, a mais velha muda de lugar." },
      merge: []
    }),
    assassino: u({
      kind: "assassino", name: "Assassino", short: "ASN", gen: 3,
      hp: 65, dmg: 35, range: 100, fire: 1.6, speed: 225, size: 12,
      color: "#6a50c8", accent: "#ddd0ff", projectile: "bullet", role: "assassin",
      blurb: "Pistola curta e uma faca de combate. O mais veloz do esquadrão.",
      active: { id: "execute_dash", name: "Execução", cd: 9, desc: "Solta do esquadrão, fica invulnerável e teleporta no inimigo mais perto. Se matar, pula pro próximo até falhar." },
      merge: []
    }),
    radio: u({
      kind: "radio", name: "Rádio", short: "RAD", gen: 3,
      hp: 110, dmg: 18, range: 150, fire: 0.7, speed: 160, size: 15,
      color: "#ffcc66", accent: "#fff3cc", projectile: "grenade", role: "radio",
      blurb: "Joga caixotes que esmagam no impacto.",
      active: { id: "crate", name: "Suprimento", cd: 9, desc: "Caixa cai de paraquedas na mira. Ao abrir, sai ao acaso: cão ou megafone (imortais por 15s) ou gerador de escudo (30 hits)." },
      merge: []
    }),
    helicoptero: u({
      kind: "helicoptero", name: "Helicóptero", short: "HEL", gen: 3,
      hp: 175, dmg: 17, range: 230, fire: 1.75, speed: 195, size: 22,
      color: "#3ef0ff", accent: "#e8ffff", projectile: "bullet", flying: true, role: "heli",
      blurb: "Dois drones pequenos orbitam a mira e atiram de lá.",
      active: { id: "strafe", name: "Passagem rasa", cd: 12, desc: "Explosão em anel embaixo de cada drone pequeno perto do cursor." },
      merge: ["gunship"]
    }),
    designado: u({
      kind: "designado", name: "Atirador designado", short: "DES", gen: 3,
      hp: 82, dmg: 20, range: 310, fire: 1, speed: 136, size: 14,
      color: "#4ec8e8", accent: "#d0f4ff", projectile: "bullet", role: "sniper",
      infiniteRange: true,
      blurb: "Atirador especializado em fogo de supressão continuo, utiliza uma sniper semi automatica calibre .50, atirando um cadencia semelhante a uma metralhadora automatica.",
      merge: []
    }),
    giratoria: u({
      kind: "giratoria", name: "Giratória", short: "GIR", gen: 3,
      hp: 130, dmg: 6, range: 155, fire: 4.4, speed: 118, size: 18,
      color: "#1a6aff", accent: "#9ec4ff", projectile: "bullet", role: "mg",
      blurb: "Precisa aquecer antes de começar a atirar. possui a maior velocidade de disparo do jogo.",
      merge: []
    }),
    oficina: u({
      kind: "oficina", name: "Oficina móvel", short: "OFI", gen: 3,
      hp: 190, dmg: 0, range: 0, fire: 0, speed: 104, size: 22,
      color: "#7a9aaa", accent: "#d8ece8", projectile: "none", role: "truck",
      blurb: "Joga sucata, fluido e bobina no chão. Cada um dá um efeito diferente.",
      merge: []
    }),
    socorrista: u({
      kind: "socorrista", name: "Socorrista", short: "SOC", gen: 3,
      hp: 92, dmg: 8, range: 110, fire: 1.35, speed: 162, size: 13,
      color: "#b8ffd4", accent: "#ffffff", projectile: "bullet", role: "medic",
      blurb: "Apoio de resgate com gancho. Pistola curta.",
      active: { id: "hook", name: "Gancho", cd: 7, desc: "Gancho global na mira. Ao puxar, o esquadrão fica invulnerável." },
      merge: []
    }),
    revolver: u({
      kind: "revolver", name: "Cano longo", short: "REV", gen: 3,
      hp: 88, dmg: 22, range: 145, fire: 1.15, speed: 158, size: 13,
      color: "#e8a060", accent: "#ffe8c8", projectile: "bullet", role: "dual",
      blurb: "Tiro lento que perfura e ricocheteia. Se ricochetear em inimigos próximos o dano é triplicado.",
      active: { id: "fan", name: "Tambor cheio", cd: 12, desc: "Fere todo inimigo perto da unidade." },
      merge: []
    }),
    saqueador: u({
      kind: "saqueador", name: "Saqueador", short: "SAQ", gen: 3,
      hp: 110, dmg: 16, range: 120, fire: 1.8, speed: 150, size: 15,
      color: "#c86a3a", accent: "#ffd0a8", projectile: "bullet", role: "outlaw",
      blurb: "Fraco no corpo a corpo. Acertar bala inimiga no ar apaga elas e cura o grupo.",
      active: { id: "hijack", name: "Traição", cd: 14, desc: "Rouba o inimigo na mira. Ele luta do nosso lado por 30s e depois explode. Não funciona em chefes e subchefes." },
      merge: []
    }),
    torreta: u({
      kind: "torreta", name: "Torreta", short: "TOR", gen: 3,
      hp: 140, dmg: 26, range: 200, fire: 0.9, speed: 96, size: 18,
      color: "#c8b45a", accent: "#fff3b0", projectile: "cannon", role: "minitank",
      blurb: "Canhão pesado e automatico. Atira continuamente em uma direção.",
      active: { id: "deploy", name: "Instalar", cd: 8, desc: "Menu radial: metralhadora, lança-chamas ou jolt. A torreta arremessa a sentry na mira." },
      merge: []
    }),
    sabotador: u({
      kind: "sabotador", name: "Sabotador", short: "SAB", gen: 3,
      hp: 70, dmg: 20, range: 115, fire: 1.2, speed: 188, size: 12,
      color: "#6a70c8", accent: "#d0d4ff", projectile: "mine", role: "stealth",
      blurb: "Gruda explosivo no inimigo. Fica armado até detonar.",
      active: { id: "detonate", name: "Detonação", cd: 1.2, desc: "Detona todos os explosivos grudados nos inimigos." },
      merge: []
    }),
    fantasma: u({
      kind: "fantasma", name: "Fantasma", short: "FAN", gen: 3,
      hp: 60, dmg: 24, range: 100, fire: 1.5, speed: 215, size: 11,
      color: "#a090ff", accent: "#f0ecff", projectile: "bullet", role: "assassin",
      blurb: "Tiro causa medo. Assombração revivida com metodos proibidos.",
      active: { id: "haunt", name: "Assombração", cd: 12, dur: 3, desc: "Por 3s o esquadrão fica imune a tudo. Passar por cima de inimigos causa medo: eles fogem e se batem." },
      merge: []
    }),
    oficial: u({
      kind: "oficial", name: "Oficial", short: "OFC", gen: 3,
      hp: 95, dmg: 10, range: 130, fire: 1.0, speed: 160, size: 14,
      color: "#f0c84a", accent: "#fff4c8", projectile: "bullet", role: "courier",
      blurb: "Comando de campo e segundo no comando após o comandante. Possui uma pistola curta e um sinalizador que ajuda os aliados a causarem mais estrago.",
      active: { id: "order", name: "Sinalizador", cd: 10, desc: "Afeta o campo inteiro por 8s: +25% de dano e +35% de cadência. Aura vermelha e fumaça." },
      merge: []
    }),
    bandeira: u({
      kind: "bandeira", name: "Porta-estandarte", short: "EST", gen: 3,
      hp: 135, dmg: 6, range: 90, fire: 0.7, speed: 148, size: 15,
      color: "#e8d080", accent: "#fff8d0", projectile: "bullet", role: "radio",
      swordDmg: 52, swordRange: 150, swordFire: 0.9,
      blurb: "Estandarte do esquadrão. Corre até o inimigo e o espetá com a bandeira, fornecendo um buff de moral para todo o esquadrão.",
      active: { id: "standard", name: "Estandarte", cd: 12, desc: "Finca um estandarte na mira por 15s. Enquanto ele durar e o grupo estiver dentro fornece +40% de dano, cadência e velocidade. Loot dentro é puxado sozinho." },
      merge: []
    }),
    bombardeiro: u({
      kind: "bombardeiro", name: "Bombardeiro", short: "BMB", gen: 3,
      hp: 155, dmg: 28, range: 210, fire: 0.55, speed: 168, size: 20,
      color: "#5ad0c8", accent: "#d8ffff", projectile: "grenade", flying: true, role: "heli",
      blurb: "Um drone gordinho orbita a mira e dispara de lá.",
      active: { id: "airstrike", name: "Bombardeio", cd: 10, desc: "Segura e desenha uma linha. Explosões caem no caminho." },
      merge: []
    }),
    recon: u({
      kind: "recon", name: "Reconhecimento", short: "RCN", gen: 3,
      hp: 78, dmg: 12, range: 220, fire: 1.4, speed: 186, size: 14,
      color: "#8af0d8", accent: "#f0ffff", projectile: "bullet", flying: true, role: "drone",
      blurb: "Recon aéreo. O drone atira balas tracejantes que marcam o alvo: alvos marcados tomam mais dano.",
      merge: []
    }),
    inferno: u({
      kind: "inferno", name: "Inferno", short: "NFR", gen: 4,
      hp: 180, dmg: 15, range: 135, fire: 2.7, speed: 130, size: 19,
      color: "#ff4a18", accent: "#ffe08a", projectile: "flame", role: "inferno",
      blurb: "Piromaniaco veterno que só está em atividade por ser altamente eficiente. Quem morre queimado deixa uma poça de fogo no chão.",
      active: { id: "firewave", name: "Maré de fogo", cd: 12, desc: "Onda de fogo branco sai do Inferno e varre o mapa inteiro." },
      merge: []
    }),
    missil: u({
      kind: "missil", name: "Míssil", short: "MIS", gen: 4,
      hp: 150, dmg: 36, range: 250, fire: 0.55, speed: 120, size: 18,
      color: "#c46bff", accent: "#f0c8ff", projectile: "missile", role: "missile",
      blurb: "Saraivada de cinco misseis. Mira parada no chefe orbita. Em movimento, espalha.",
      active: { id: "salvo", name: "Salva", cd: 13, desc: "Dispara 6 mísseis teleguiados na mira." },
      merge: []
    }),
    tanque: u({
      kind: "tanque", name: "Tanque", short: "TAN", gen: 4,
      hp: 340, dmg: 28, range: 205, fire: 0.95, speed: 92, size: 26,
      color: "#1c64d8", accent: "#7ad0ff", projectile: "bullet", role: "tank",
      blurb: "Tanque de guerra com o que há de mais avançado em armamento e blindagem.",
      active: { id: "firemode", name: "Modo de tiro", cd: 0.8, desc: "Fuzil, granada de contato ou barragem (1× por fase)." },
      merge: ["colosso"]
    }),
    gunship: u({
      kind: "gunship", name: "Canhoneira", short: "GUN", gen: 4,
      hp: 200, dmg: 22, range: 250, fire: 2.0, speed: 176, size: 24,
      color: "#2ad8ff", accent: "#f0ffff", projectile: "bullet", flying: true, role: "gunship",
      blurb: "Canhoneira. Metralhadora teleguiada na mira.",
      active: { id: "carpetbomb", name: "Tapete de bombas", cd: 1, desc: "Bombas caem sem parar sob a mira." },
      merge: ["colosso"]
    }),
    colosso: u({
      kind: "colosso", name: "Colosso", short: "COL", gen: 5,
      hp: 650, dmg: 65, range: 260, fire: 1.05, speed: 115, size: 32,
      color: "#e8f6ff", accent: "#7af7ff", projectile: "laser", role: "colossus",
      blurb: "Gundam de combate, construido para destruir Kaijus.",
      active: { id: "pulse", name: "Pulso", cd: 14, desc: "Onda de choque em volta do Colosso. Empurra e fere." },
      merge: []
    }),
    comandante: u({
      kind: "comandante", name: "Comandante", short: "CMD", gen: 0,
      hp: 150, dmg: 12, range: 170, fire: 0.85, speed: 150, size: 15,
      color: "#ffd24a", accent: "#fff4c4", projectile: "bullet", role: "commander",
      blurb: "Líder do esquadrão e esperança da humanidade. A pistola laser marca o alvo e orienta onde deve ser disparado. Inimigos derrotados se transforam em reforço que vira arquivo de guerra quando o esquadrão pega. R gasta arquivos: 1 convoca um recruta, o resto promove o esquadrão. Não ocupa vaga — se ele cair, a operação acaba.",
      active: { id: "guerrilla", name: "Comandos de guerrilha", cd: 0, desc: "Segura o direito: menu radial. Cima: aura em volta do comandante, cura 2% da vida máxima por segundo durante 5s. Direita: airstrike. Esquerda: recruta perto do comandante (máx. 2 por fase). Solta na fatia. Recua pro centro pra cancelar." },
      merge: []
    })
  };

  (function bumpUnitRange() {
    Object.keys(G.UNIT_DEFS).forEach(function (k) {
      var d = G.UNIT_DEFS[k];
      if (d.infiniteRange) {
        d.range = 9999;
        return;
      }
      if (!d.range) return;
      var sniper = d.role === "sniper" || k === "observador";
      d.range += sniper ? 200 : 100;
    });
  })();

  G.unitKind = function (kindOrGen) {
    if (typeof kindOrGen === "number") {
      return G.EARLY_KINDS[Math.max(0, Math.min(G.EARLY_KINDS.length - 1, kindOrGen | 0))];
    }
    return G.UNIT_DEFS[kindOrGen] ? kindOrGen : "recruta";
  };

  G.unitList = function () {
    return Object.keys(G.UNIT_DEFS);
  };

  G.unitStatsLine = function (def) {
    if (def.role === "warlord") return def.hp + " HP · " + def.dmg + " corte · alcance " + def.range;
    if (def.role === "paladin") return def.hp + " HP · " + def.dmg + " impacto · alcance " + def.range;
    if (def.role === "reaper") return def.hp + " HP · " + def.dmg + " corte · alcance " + def.range + " · aoe " + (def.aoe || 60);
    if (def.projectile === "none") return def.hp + " HP · suporte · não atira";
    if (def.infiniteRange) return def.hp + " HP · " + def.dmg + " dano · alcance ∞";
    return def.hp + " HP · " + def.dmg + " dano · " + def.range + " alcance";
  };

  G.unitSticker = function (kind) {
    var map = {
      recruta: "🪖", fuzileiro: "🔫", pistoleiro: "🩺", batedor: "👟",
      sniper: "🎯", metralhador: "🌪", caminhao: "🚚", medico: "✚",
      dualista: "🔫", engenheiro: "🔧", infiltrador: "🕶", mensageiro: "📨",
      droneiro: "🛸", ponta_lanca: "⚔", ceifador: "☽", phalanx: "🛡", warlord: "🪓", anti_material: "🔭", observador: "👁", lanca_chamas: "🔥",
      canhoneiro: "💣", minitanque: "🛡", quartel: "🏕", cirurgiao: "🏥",
      capelao: "✝", fora_da_lei: "🤠", mineiro: "⚠", tesla: "⚡",
      assassino: "🗡", radio: "📡", helicoptero: "🚁", inferno: "🌋",
      missil: "🚀", tanque: "🚜", colosso: "🦾", gunship: "✈", comandante: "⭐",
      designado: "🎯", giratoria: "🌀", oficina: "🔧", socorrista: "🚑",
      revolver: "🔫", saqueador: "💰", torreta: "🗼", sabotador: "💣",
      fantasma: "👻", oficial: "🎖", bandeira: "🚩", bombardeiro: "💣", recon: "📡"
    };
    return map[kind] || "★";
  };

  G.ACTIVE_META = {
    dash: { icon: "💨", color: "#ffe08a", detail: "Avança o dobro da distância. Inimigos no caminho tomam dano de contato. Invencível durante o avanço." },
    spear_dash: { icon: "🗡", color: "#ff9a3a", detail: "Só o Ponta de lança avança até a mira, atravessa inimigos e volta pro grupo. Invulnerável no avanço e na volta." },
    phalanx_wall: { icon: "🛡", color: "#c4a45a", detail: "Avança até a mira e forma um círculo de paladinos por 15s. Cada um aguenta 2 hits; se cair, abre brecha. Boss acerta em cheio e hit-killa os soldados. A recarga de 20s só começa quando acaba." },
    reap: {
      icon: "☽",
      iconHtml: '<svg class="scythe-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 21.2 L12.1 3.6" fill="none" stroke="#3a1420" stroke-width="2.35" stroke-linecap="round"/><path d="M12.2 3.4 C18.4 2.6 22.2 7.2 21.4 13.6 C18.6 8.4 15.2 6.2 12.2 6.8 Z" fill="#c41e3a" stroke="#ff6b81" stroke-width="1.05" stroke-linejoin="round"/><path d="M12.4 4.2 C16.8 4 19.6 7.2 19.2 11.4" fill="none" stroke="#ffe4ea" stroke-width="1.1" stroke-linecap="round"/></svg>',
      color: "#c41e3a",
      detail: "Avança até a mira, gira e rasga um círculo de 400. Causa o dano do básico +10."
    },
    suppress: { icon: "🛢", color: "#4aa3ff", detail: "Por 5s os tiros empurram os inimigos." },
    focus_fire: { icon: "◎", color: "#2f7dff", detail: "Por 8s o leque vira uma linha reta concentrada." },
    blackhole: { icon: "🕳", color: "#3ec0ff", detail: "Granada de 300px que puxa inimigos ao centro e causa dano." },
    hijack: { icon: "💰", color: "#c86a3a", detail: "Rouba o inimigo na mira. Ele luta do nosso lado por 30s e depois explode. Não funciona em chefes e subchefes." },
    mark: { icon: "🎯", color: "#7ad8ff", detail: "O próximo tiro causa 4× o dano." },
    order: { icon: "📣", color: "#ffb070", detail: "Afeta o campo inteiro por 8s: +25% de dano e +35% de cadência." },
    kit: { icon: "✚", color: "#7cffb0", detail: "Cápsula extra na mira. Também tira sanguessuga do grupo." },
    napalm: { icon: "🔥", color: "#fff4c8", detail: "Jato branco-quente. Dobra o alcance, queima mais e apaga todas as balas no cone." },
    firewave: { icon: "🌋", color: "#fff4c8", detail: "Onda de fogo branco explode do Inferno e corre em círculo até as beiradas. Queima tudo no caminho e derrete bala física." },
    smoke: { icon: "🌫", color: "#c8d0dc", detail: "Fumaça 30% maior. Inimigos dentro entram em fúria e atacam o mais próximo." },
    bless: { icon: "✝", color: "#ffe9a0", detail: "Âncora na mira por 9s. Perto dela o esquadrão toma 35% menos dano." },
    carpet: { icon: "⚠", color: "#f0c422", detail: "Segura e desenha minas no chão." },
    storm: { icon: "⚡", color: "#a8f6ff", detail: "Choque em volta da Tesla." },
    coil: { icon: "⚡", color: "#a8f6ff", detail: "Planta uma bobina. O feixe da Tesla carrega a bateria. Sem carga, ela desliga. Duas no alcance se alimentam e duram o dobro." },
    pulse: { icon: "💥", color: "#7af7ff", detail: "Onda de choque em volta do Colosso. Empurra e fere." },
    strafe: { icon: "✈", color: "#3ef0ff", detail: "Explosão em anel embaixo de cada drone pequeno perto do cursor." },
    salvo: { icon: "🚀", color: "#c46bff", detail: "Seis mísseis teleguiados na mira." },
    firemode: { icon: "🔄", color: "#9ad4ff", detail: "Alterna o modo de tiro do tanque." },
    fan: { icon: "🔫", color: "#ff8a4a", detail: "Fere todo inimigo perto da unidade." },
    ram: { icon: "🛡", color: "#7ad0ff", detail: "Avança na mira, apaga projéteis no caminho e recarrega o canhão. Invencível durante o avanço." },
    flare: { icon: "✨", color: "#ffe08a", detail: "A marcação em área segue o inimigo pela duração. Abater marcados solta mais ouro e reforços." },
    doubletap: { icon: "🔫", color: "#ffb070", detail: "Por 10s, dispara dois tiros de uma vez." },
    supercharge: { icon: "⚡", color: "#d4c46a", detail: "As minas no chão incham: mais área e mais dano." },
    rocket: { icon: "🚀", color: "#7af0ff", detail: "Míssil teleguiado na mira. Explode em área grande com dano dobrado." },
    execute_dash: { icon: "🗡", color: "#c8a0ff", detail: "Solta do esquadrão, fica invulnerável e teleporta no mais perto. Se matar, continua até falhar." },
    haunt: { icon: "👻", color: "#a090ff", detail: "Por 3s o esquadrão fica imune a tudo. Passar por cima de inimigos causa medo: eles fogem e se batem." },
    crate: { icon: "📦", color: "#ffcc66", detail: "Caixa cai de paraquedas na mira. Ao abrir, sai ao acaso: cão mecânico (late, imortal por 15s), gerador de escudo (30 hits) ou megafone sônico (imortal por 15s, dano e confusão)." },
    hook: { icon: "🪝", color: "#7cffb0", detail: "Gancho global. Ao puxar, o esquadrão fica invulnerável." },
    deploy: { icon: "🗼", color: "#c8b45a", detail: "Menu radial: metralhadora, lança-chamas ou jolt. A torreta arremessa a sentry na mira, no máximo a 200px do centro do esquadrão." },
    detonate: { icon: "💥", color: "#ff6b6b", detail: "Detona todos os explosivos grudados nos inimigos." },
    magnet: { icon: "🚩", color: "#e8d080", detail: "Finca um estandarte na mira por 15s. +40% de dano, cadência e velocidade. Loot dentro é coletado sozinho. O cooldown só começa quando ele cai." },
    standard: { icon: "🚩", color: "#e8d080", detail: "Finca um estandarte na mira por 15s. +40% de dano, cadência e velocidade. Loot dentro é coletado sozinho. O cooldown só começa quando ele cai." },
    airstrike: { icon: "💣", color: "#5ad0c8", detail: "Desenha uma linha. Explosões caem no caminho." },
    carpetbomb: { icon: "✈", color: "#2ad8ff", detail: "Bombas caem sem parar sob a mira." },
    archive: { icon: "⭐", color: "#ffd24a", detail: "O esquadrão pega o reforço caído e vira arquivo. R abre a lista: 1 arquivo convoca um recruta, 2 promovem nível 0, 4 o nível 1, 8 o nível 2, e dobra depois." },
    guerrilla: { icon: "◎", color: "#ffd24a", detail: "Segura o direito e abre um menu radial no clique. Cima: aura em volta do comandante — cura 2% da vida máxima por segundo durante 5s (15s de recarga). Direita: airstrike com fogo no chão (20s). Esquerda: recruta nasce perto do comandante — máx. 2 por fase (30s). Solta na fatia pra disparar no centro do menu; volta pro centro pra cancelar." }
  };

  G.activeMeta = function (id) {
    return G.ACTIVE_META[id] || { icon: "★", color: "#ffd24a", detail: "" };
  };

  G.activeIconHtml = function (id) {
    var m = G.activeMeta(id);
    return m.iconHtml || m.icon || "★";
  };

  G.drawScytheIcon = function (ctx, x, y, size, color) {
    var s = size || 16;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.42);
    ctx.strokeStyle = "#2a1018";
    ctx.lineWidth = Math.max(1.7, s * 0.13);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, s * 0.44);
    ctx.lineTo(0, -s * 0.4);
    ctx.stroke();
    ctx.fillStyle = color || "#c41e3a";
    ctx.beginPath();
    ctx.moveTo(1.2, -s * 0.38);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.22, s * 0.06, s * 0.22);
    ctx.quadraticCurveTo(s * 0.26, -s * 0.08, 1.2, -s * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffe4ea";
    ctx.lineWidth = Math.max(1, s * 0.07);
    ctx.beginPath();
    ctx.moveTo(2, -s * 0.34);
    ctx.quadraticCurveTo(s * 0.38, -s * 0.18, s * 0.1, s * 0.1);
    ctx.stroke();
    ctx.restore();
  };

  function projLabel(p) {
    var map = {
      none: "não atira",
      scythe: "foice",
      bullet: "bala",
      flame: "chamas",
      mine: "minas",
      tesla: "arco elétrico",
      cannon: "canhão",
      grenade: "granada",
      crate: "caixote",
      missile: "míssil",
      laser: "laser"
    };
    return map[p] || p || "bala";
  }

  G.auraLines = function (aura) {
    if (!aura) return [];
    var rows = [];
    if (aura.heal) rows.push("Aura: cura " + aura.heal + " HP/s no aliado mais ferido");
    if (aura.dmg) rows.push("Aura: +" + Math.round(aura.dmg * 100) + "% de dano pra quem está perto");
    if (aura.speed) rows.push("Aura: +" + Math.round(aura.speed * 100) + "% de velocidade no esquadrão");
    if (aura.fire) rows.push("Aura: +" + Math.round(aura.fire * 100) + "% de cadência no esquadrão");
    if (aura.shield) rows.push("Aura: -" + Math.round(aura.shield * 100) + "% de dano recebido");
    if (aura.range) rows.push("Aura: +" + Math.round(aura.range * 100) + "% de alcance no esquadrão");
    if (aura.magnet) rows.push("Aura: puxa loot +" + aura.magnet + " de distância");
    if (aura.drop) rows.push("Aura: +" + Math.round(aura.drop * 100) + "% de chance de reforço");
    if (aura.slowSquad) rows.push("Aura: o resto do esquadrão fica " + Math.round(aura.slowSquad * 100) + "% mais lento");
    if (aura.regen) rows.push("Aura: regenera " + (aura.regen * 100).toFixed(1) + "% do HP por segundo");
    return rows;
  };

  G.unitTierLabel = function (def) {
    if (!def) return "aliado";
    if (def.role === "commander") return "comandante";
    if (def.gen === 0) return "aliado · base";
    return "aliado · nível " + def.gen;
  };

  G.unitStatRows = function (def) {
    var rows = [
      G.unitTierLabel(def) + (def.role === "commander" ? " · não ocupa o limite" : ""),
      "HP " + def.hp,
      def.role === "warlord" ? "Dano " + def.dmg + " (machado)" : def.role === "paladin" ? "Dano " + def.dmg + " (lança)" : def.role === "reaper" ? "Dano " + def.dmg + " (círculo)" : def.projectile === "none" ? "Dano — (suporte)" : "Dano " + def.dmg,
      def.role === "warlord" || def.role === "paladin" || def.role === "reaper" ? "Alcance " + def.range : def.projectile === "none" ? "Alcance —" : (def.infiniteRange ? "Alcance ∞" : "Alcance " + def.range),
      def.role === "reaper" ? "AoE " + (def.aoe || 60) : null,
      def.fire ? "Cadência " + def.fire.toFixed(2) + "/s" : "Cadência —",
      "Velocidade " + def.speed,
      def.role === "warlord" ? "Arma: machados gêmeos" : def.role === "paladin" ? "Arma: lança" : def.role === "reaper" ? "Arma: foice" : "Arma: " + projLabel(def.projectile)
    ];
    rows = rows.filter(function (line) { return !!line; });
    if (def.flying) rows.push("Aérea");
    G.auraLines(def.aura).forEach(function (line) { rows.push(line); });
    if (def.merge && def.merge.length) {
      rows.push("Vira: " + def.merge.map(function (k) { return G.UNIT_DEFS[k].name; }).join(", "));
    } else if (def.role !== "commander") {
      rows.push("Fim da linha — não evolui mais");
    }
    return rows;
  };

  var UNIT_PASSIVES = {
    recruta: { id: "linefire", name: "Tiro reto", desc: "Atira em linha reta na mira." },
    fuzileiro: { id: "focus", name: "Modo foco", desc: "Cadência alta e tiro preciso na mira. Enquanto atira, o esquadrão fica 30% mais lento." },
    pistoleiro: { id: "hitheal", name: "Kit no acerto", desc: "Acerto pode soltar um kit de vida no chão. O esquadrão se cura ao passar." },
    batedor: { id: "scoutgun", name: "Passo leve", desc: "O mais rápido do começo. A disparada atravessa inimigos e causa dano de contato." },
    sniper: { id: "rangedmg", name: "Punição de perto", desc: "Alcance infinito. A bala atravessa a tela na linha da mira. Dano sobe com a distância; de perto, fraqueja." },
    metralhador: { id: "recoil", name: "Coice", desc: "Cinco tiros em leque na mira. O recuo empurra o esquadrão pro lado oposto." },
    caminhao: { id: "bumper", name: "Bolha de comando", desc: "Escudo em volta do grupo. Segura o esquadrão dentro, empurra inimigo. Contato físico e projétil gastam o escudo. Recarrega 1 ponto a cada 5s e volta inteiro em 10s se quebrar. Passa pra todos os merges." },
    medico: { id: "biotic", name: "Cápsula biótica", desc: "Arremessa cápsulas na mira. A poça verde cura rápido quem ficar parado nela." },
    dualista: { id: "twinhit", name: "Canos gêmeos", desc: "Dois tiros paralelos. Só drena vida se os dois acertarem o mesmo alvo." },
    engenheiro: { id: "lobmine", name: "Mina em arco", desc: "Lança minas em arco até a mira. Armam na hora, raio 20% maior." },
    infiltrador: { id: "sidearm", name: "Pistola rápida", desc: "Tiro curto e rápido na mira. A cortina deixa o enxame em fúria, atacando o mais próximo." },
    mensageiro: { id: "trail", name: "Esteira", desc: "Rastro de energia no caminho. Andar nela dobra a velocidade. Dano sobe com a velocidade. Passa pra linha de merge." },
    droneiro: { id: "orbit", name: "Drone orbital", desc: "O drone orbita a mira e dispara em quem chega perto." },
    ponta_lanca: { id: "dive", name: "Salto", desc: "Se joga no inimigo mais próximo. Invulnerável no avanço e na volta." },
    phalanx: { id: "lance", name: "Investida de lança", desc: "Salta no inimigo mais perto. No impacto, dispara um feixe de energia uns pixels além. A ativa vira guarda se o jogador entra, ou Termópilas se cair no bicho." },
    warlord: { id: "warpack", name: "Tríade de guerra", desc: "Dois guerreiros cortam em linha e na horizontal; o Warlord fecha com dois slashes nas diagonais. Invulnerável no ataque e na volta. Cada abate: +10% de cadência. Todos os stacks compartilham o mesmo timer de 5s (renova no abate), até +100%." },
    ceifador: { id: "reapdash", name: "Foice", desc: "Avança no inimigo mais perto em 200px e corta em círculo com a foice." },
    anti_material: { id: "blackshot", name: "Munição negra", desc: "Alcance infinito. Tiro preto que perfura e consome balas. A cada 7 tiros, ganha Tiro marcado." },
    observador: { id: "spotgun", name: "Tiro de designação", desc: "Alcance infinito. Bala precisa na mira." },
    lanca_chamas: { id: "melt", name: "Queima", desc: "Cone de fogo. Aplica queimadura por 5s. 10% de chance de derreter cada bala física." },
    canhoneiro: { id: "arcnade", name: "Bola preta", desc: "Arremessa uma bola preta. No impacto, solta bolinhas com 25% do dano." },
    minitanque: { id: "frontarmor", name: "Bolha de comando", desc: "Mantém o escudo do caminhão. Ativa alterna fuzil e granada." },
    quartel: { id: "bait", name: "Recruta de elite", desc: "A cada 25s solta um recruta. Inimigos focam nele. Se viver o bastante, vira elite de fuzileiro, dualista ou batedor." },
    cirurgiao: { id: "scalpel", name: "Bisturi", desc: "Arremessa bisturis. Causam sangramento (+30%); o dano por segundo cura o esquadrão." },
    capelao: { id: "sidearm", name: "Tiro abençoado", desc: "Pistola de apoio. Cada acerto pode curar uma unidade do grupo." },
    fora_da_lei: { id: "spread", name: "Cano aberto", desc: "Escopeta bem aberta, alcance 1000. Só rende colado no alvo." },
    mineiro: { id: "fieldmine", name: "Campo minado", desc: "Joga 3 minas perto da mira." },
    tesla: { id: "saber", name: "Jolt", desc: "Raio até a mira. Bateria ao lado da Tesla: enche ao atirar e desliga quando esvazia. Bobinas zapam com carga; duas no alcance se alimentam e demoram o dobro pra acabar." },
    assassino: { id: "silence", name: "Tiro silenciador", desc: "Acerto impede inimigos que atiram de atirar. Chefes só sofrem 5 vezes, depois 1 min de imunidade." },
    radio: { id: "crateshot", name: "Caixote", desc: "Arremessa caixotes que explodem no impacto. Esteira e dano por velocidade da linha do Mensageiro." },
    helicoptero: { id: "delay", name: "Par de drones", desc: "Dois drones pequenos orbitam a mira e atiram a partir dela." },
    inferno: { id: "scorch", name: "Terra queimada", desc: "O cone queima o inimigo. Quem morre queimado deixa uma poça de fogo no chão por 5s." },
    missil: { id: "swarm", name: "Saraivada", desc: "Cinco mísseis na mira. Mira parada no chefe: orbitam. Mira em movimento: espalham e estouram." },
    tanque: { id: "heavycannon", name: "Couraça pesada", desc: "Escudo duas vezes mais forte. Três modos de tiro, incluindo barragem na tela." },
    gunship: { id: "lockgun", name: "Metralhadora teleguiada", desc: "As balas seguem a mira." },
    colosso: { id: "sword", name: "Espada de laser", desc: "Laser contínuo até a mira. Tiro inimigo ou nave fraca que cruzar a linha some. Mantém o escudo da linha do caminhão." },
    comandante: { id: "archive", name: "Arquivo de guerra", desc: "O esquadrão pega o reforço caído e vira arquivo. R gasta: 1 arquivo convoca um recruta, 2 promovem nível 0, 4 o nível 1, 8 o nível 2, e dobra depois." },
    designado: { id: "marksman", name: "Fuzil longo", desc: "Alcance infinito. Atira como fuzileiro, com cadência maior." },
    giratoria: { id: "spinup", name: "Aquecimento", desc: "Precisa aquecer. Depois o cano não para, mas o esquadrão fica bem mais lento." },
    oficina: { id: "scrap", name: "Carrinho de sucata", desc: "Carrinho rápido que atropela inimigos, coleta moedas e explode após 5s." },
    socorrista: { id: "sidearm", name: "Pistola de apoio", desc: "Tiro curto na mira." },
    revolver: { id: "bankshot", name: "Ricochete", desc: "Perfura e ricocheteia em inimigos próximos. No rebote, dano triplo." },
    saqueador: { id: "steal", name: "Roubo aéreo", desc: "Se o tiro acertar uma bala inimiga no ar, apaga ela e cura o esquadrão." },
    torreta: { id: "cannon", name: "Canhão automático", desc: "Atira sozinha no inimigo mais próximo, na formação ou instalada no chão." },
    sabotador: { id: "sticky", name: "Carga grudenta", desc: "Gruda explosivos visíveis nos inimigos. Eles ficam armados até detonarem." },
    fantasma: { id: "fearshot", name: "Susto", desc: "Tiro causa medo por 0,5s. No mesmo alvo de novo, ele fica imune por 1 min." },
    oficial: { id: "sidearm", name: "Pistola de comando", desc: "Tiro de comando na mira. Esteira e dano por velocidade da linha do Mensageiro." },
    bandeira: { id: "bannerblade", name: "Estandarte vivo", desc: "Corre no inimigo, espetá com a bandeira e solta um buff aleatório. Esteira da linha do Mensageiro." },
    bombardeiro: { id: "linebomb", name: "Drone gordinho", desc: "Um drone pesado orbita a mira. A ativa desenha uma linha de explosões." },
    recon: { id: "graze", name: "Tracejante", desc: "Balas coloridas visíveis que grudam no alvo. Marcados tomam mais dano." }
  };
  Object.keys(UNIT_PASSIVES).forEach(function (k) {
    if (G.UNIT_DEFS[k]) G.UNIT_DEFS[k].passive = UNIT_PASSIVES[k];
  });

  G.unitPassives = function (def) {
    return def.passive ? [def.passive] : [];
  };

  G.unitActives = function (def) {
    return def.active ? [def.active] : [];
  };

  G.enemyKindLabel = function (kind) {
    var map = {
      melee: "Corpo a corpo",
      ranged: "À distância",
      drone: "Aéreo",
      kamikaze: "Suicida",
      healer: "Curandeiro",
      artillery: "Artilharia",
      stealth: "Furtivo",
      sniper: "Atirador de elite",
      nest: "Ninho",
      parasite: "Parasita",
      cryo: "Gelo",
      orbit_shield: "Escudo orbital",
      mini_beemote: "Operária da colmeia",
      alien_rifle: "Fuzileiro da invasão",
      pin_spike: "Espinho de areia",
      boss_burst: "Chefe · rajada",
      boss_charge: "Chefe · investida",
      boss_spawn: "Chefe · invocação",
      boss_veil: "Chefe · véu",
      boss_final: "Chefe final",
      boss_invasao: "Chefe · invasão",
      boss_vulto: "Chefe · vagalume",
      boss_king: "Chefe · rei",
      boss_worm: "Chefe · devorador"
    };
    return map[kind] || "Combate";
  };

  G.enemyStatRows = function (def) {
    var rows = [
      G.enemyKindLabel(def.kind),
      "HP " + def.hp,
      def.dmg ? "Dano " + def.dmg : "Dano —",
      "Alcance " + def.range,
      "Velocidade " + def.speed
    ];
    if (def.fire) rows.push("Cadência " + def.fire.toFixed(2) + "/s");
    if (def.flying) rows.push("Aéreo");
    if (def.splits) rows.push("Ao morrer, parte em duas larvas");
    if (def.boss) rows.push("Chefe de fase");
    return rows;
  };

  G.enemySkills = function (def) {
    var list = [];
    if (def.passive) list.push({ type: "passive", name: def.passive.name, desc: def.passive.desc, icon: "🛡" });
    if (def.active) list.push({ type: "active", name: def.active.name, desc: def.active.desc, icon: "⚔" });
    if (def.skills) {
      for (var i = 0; i < def.skills.length; i++) list.push(def.skills[i]);
    }
    return list;
  };
})(window.TFAG = window.TFAG || {});
