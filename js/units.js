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
      blurb: "Recruta novato, sem experiência de combate, mas com potencial pra virar qualquer coisa.",
      basic: "Tiro básico.",
      merge: ["fuzileiro", "pistoleiro", "batedor", "psiquico"]
    }),
    psiquico: u({
      kind: "psiquico", name: "Psíquico", short: "PSI", gen: 1,
      hp: 58, dmg: 12, range: 185, fire: 1.0, speed: 148, size: 12,
      color: "#b08cff", accent: "#f0e8ff", projectile: "bullet", role: "psychic",
      blurb: "Soldado que nasceu com o dom de ser telepata.",
      basic: "Munição teleguiada leve: curva no inimigo mais perto da mira.",
      active: { id: "psych_slam", name: "Martelo mental", cd: 12, desc: "Dispositivo de energia cinética. Ao acertar o chão, levanta e bate os inimigos no alcance: atordoa e causa dano." },
      merge: ["escolhido"]
    }),
    escolhido: u({
      kind: "escolhido", name: "Escolhido", short: "ESC", gen: 2,
      hp: 78, dmg: 15, range: 205, fire: 1.2, speed: 152, size: 13,
      color: "#d4c090", accent: "#ffe8a8", projectile: "laser", role: "chosen",
      blurb: "Guerreiro espacial. Desde o nascimento se sentiu especial, conectado a uma força maior.",
      basic: "Tiros laser rápidos.",
      active: { id: "stormtrooper", name: "Stormtrooper", cd: 14, desc: "Por 10s dispara 5× mais rápido, mas a precisão fica completamente aleatória." },
      merge: ["jedi"]
    }),
    jedi: u({
      kind: "jedi", name: "Jedi", short: "JED", gen: 3,
      hp: 165, dmg: 36, range: 115, fire: 1.05, speed: 168, size: 14,
      color: "#8a6a3a", accent: "#7affc8", projectile: "none", role: "jedi",
      blurb: "Escolhido pela Força. Jedi em treinamento.",
      basic: "Salta no inimigo mais perto e corta em arco, causando dano em área.",
      active: { id: "saber_throw", name: "Sabre bumerangue", cd: 11, desc: "Arremessa o sabre até a mira. Corta na ida e na volta." },
      extraActive: { id: "force_pull", name: "Force Pull", cd: 10, desc: "Puxa os inimigos pro centro do cast, deixa lentos por um instante e causa um pouco de dano." },
      merge: ["mestre"]
    }),
    mestre: u({
      kind: "mestre", name: "Mestre", short: "MST", gen: 4,
      hp: 230, dmg: 48, range: 130, fire: 1.15, speed: 172, size: 15,
      color: "#5a3a78", accent: "#e8b0ff", projectile: "none", role: "jedi",
      unique: true,
      blurb: "Mestre Jedi. Treinado pela Força — e virou a mesma.",
      basic: "Golpe em arco. Pode emendar num combo: pula rápido pro próximo inimigo.",
      active: { id: "force_menu", name: "Arsenal da Força", cd: 0, desc: "Segura o direito: menu radial com Empurrão, Puxão, lançamento de sabre e giro da Força." },
      merge: []
    }),
    fuzileiro: u({
      kind: "fuzileiro", name: "Fuzileiro", short: "FUZ", gen: 1,
      hp: 64, dmg: 15, range: 200, fire: 0.95, speed: 150, size: 13,
      color: "#4aa3ff", accent: "#b8dcff", projectile: "bullet", role: "rifle",
      blurb: "Fuzileiro experiente das linhas de frente.",
      basic: "Tiro automático com boa precisão.",
      active: { id: "suppress", name: "Fogo de supressão", cd: 15, desc: "Por 5s os tiros empurram os inimigos." },
      merge: ["sniper", "metralhador", "caminhao"]
    }),
    pistoleiro: u({
      kind: "pistoleiro", name: "Pistoleiro", short: "PST", gen: 1,
      hp: 58, dmg: 8, range: 110, fire: 1.4, speed: 156, size: 12,
      color: "#7cffb0", accent: "#d4ffe8", projectile: "bullet", role: "pistol",
      blurb: "Médico de combate.",
      basic: "Tiro curto e bem rápido na mira.",
      merge: ["medico", "dualista", "engenheiro"]
    }),
    batedor: u({
      kind: "batedor", name: "Batedor", short: "BAT", gen: 1,
      hp: 50, dmg: 11, range: 130, fire: 1.1, speed: 190, size: 11,
      color: "#ffe08a", accent: "#fff4c8", projectile: "bullet", role: "scout",
      blurb: "Unidade extremamente rápida.",
      basic: "Tiro curto e rápido.",
      active: { id: "dash", name: "Disparada", cd: 6, desc: "Avança o dobro da distância na direção do movimento. Dano no contato. Invulnerável até o destino." },
      merge: ["infiltrador", "mensageiro", "droneiro", "ponta_lanca"]
    }),
    sniper: u({
      kind: "sniper", name: "Sniper", short: "SNP", gen: 2,
      hp: 70, dmg: 34, range: 310, fire: 0.42, speed: 132, size: 13,
      color: "#5ad0ff", accent: "#c8f4ff", projectile: "bullet", role: "sniper",
      infiniteRange: true,
      blurb: "Franco-atirador de elite.",
      basic: "Munição .50 com grande poder destrutivo.",
      active: { id: "mark", name: "Tiro marcado", cd: 11, desc: "O próximo tiro causa 4× o dano." },
      merge: ["anti_material", "observador", "designado"]
    }),
    metralhador: u({
      kind: "metralhador", name: "Metralhador", short: "MET", gen: 2,
      hp: 95, dmg: 7, range: 165, fire: 2.8, speed: 134, size: 16,
      color: "#2f7dff", accent: "#8ec2ff", projectile: "bullet", role: "mg",
      blurb: "Veterano de várias guerras. Trocou o rifle semiautomático por um fuzil experimental que dispara mais de um projétil por vez.",
      basic: "5 tiros em leque à frente.",
      active: { id: "focus_fire", name: "Foco absoluto", cd: 12, desc: "Por 8s os 5 tiros se fundem num único ponto concentrado." },
      merge: ["lanca_chamas", "canhoneiro", "giratoria"]
    }),
    caminhao: u({
      kind: "caminhao", name: "Caminhão de comando", short: "CAM", gen: 2,
      hp: 160, dmg: 0, range: 0, fire: 0, speed: 110, size: 22,
      color: "#6a8aaa", accent: "#c8dce8", projectile: "none", role: "truck",
      blurb: "Caminhão usado como base móvel.",
      merge: ["minitanque", "quartel", "oficina"]
    }),
    medico: u({
      kind: "medico", name: "Médico de campo", short: "MED", gen: 2,
      hp: 80, dmg: 6, range: 100, fire: 1.2, speed: 148, size: 13,
      color: "#e8fff0", accent: "#ffffff", projectile: "bullet", role: "medic",
      blurb: "Médico e boticário, capaz de criar misturas curativas.",
      basic: "Arremessa frascos curativos: poças no chão. Aliados curam, inimigos ficam lentos.",
      active: { id: "kit", name: "Kit de emergência", cd: 13, desc: "3 nodes de cura em cima do esquadrão. Inimigo em cima da poça também dropa um node na hora." },
      merge: ["cirurgiao", "capelao", "socorrista"]
    }),
    dualista: u({
      kind: "dualista", name: "Dualista", short: "DUA", gen: 2,
      hp: 72, dmg: 12, range: 125, fire: 2.1, speed: 160, size: 13,
      color: "#ffb070", accent: "#ffe0c0", projectile: "bullet", role: "dual",
      blurb: "Duelista experiente, com treino farmacêutico e munição especial que drena energia dos inimigos.",
      basic: "Dois tiros paralelos.",
      active: { id: "doubletap", name: "Canos quentes", cd: 14, desc: "Por 10s, duplica a quantidade de tiros." },
      merge: ["fora_da_lei", "revolver", "saqueador"]
    }),
    engenheiro: u({
      kind: "engenheiro", name: "Engenheiro", short: "ENG", gen: 2,
      hp: 88, dmg: 22, range: 140, fire: 0.55, speed: 128, size: 15,
      color: "#d4c46a", accent: "#fff3b0", projectile: "mine", role: "engineer",
      blurb: "Engenheiro militar.",
      basic: "Minas terrestres que explodem no contato.",
      active: { id: "supercharge", name: "Supercarga", cd: 13, desc: "As minas no chão ganham pernas de inseto e correm sozinhas atrás do inimigo." },
      merge: ["mineiro", "tesla", "torreta"]
    }),
    infiltrador: u({
      kind: "infiltrador", name: "Infiltrador", short: "INF", gen: 2,
      hp: 60, dmg: 16, range: 120, fire: 1.3, speed: 198, size: 12,
      color: "#8a7cff", accent: "#ddd6ff", projectile: "bullet", role: "stealth",
      blurb: "Infiltrador experiente das forças especiais da Terra.",
      basic: "Projéteis silenciosos e quase invisíveis.",
      active: { id: "smoke", name: "Cortina", cd: 10, dur: 3.2, desc: "Granada de fumaça. Inimigos dentro se perdem e se ferem entre si. Quando acaba, fogem de medo por 1s." },
      merge: ["assassino", "sabotador", "fantasma"]
    }),
    mensageiro: u({
      kind: "mensageiro", name: "Mensageiro", short: "MEN", gen: 2,
      hp: 70, dmg: 9, range: 90, fire: 0.85, speed: 175, size: 13,
      color: "#ffd36a", accent: "#fff0c4", projectile: "bullet", role: "courier",
      blurb: "A unidade mais veloz do exército da Terra.",
      basic: "SMG de cadência alta e dano baixo.",
      merge: ["radio", "oficial", "bandeira"]
    }),
    droneiro: u({
      kind: "droneiro", name: "Droneiro", short: "DRN", gen: 2,
      hp: 68, dmg: 10, range: 180, fire: 1.5, speed: 170, size: 14,
      color: "#7af0ff", accent: "#e8ffff", projectile: "bullet", flying: true, role: "drone",
      blurb: "Drone de combate altamente tecnológico.",
      basic: "Fica no esquadrão. Um drone armado orbita a mira e atira. Se o droneiro viver, o drone é imortal.",
      active: { id: "rocket", name: "Míssil do drone", cd: 11, desc: "O drone dispara um míssil teleguiado. Dano em área." },
      merge: ["helicoptero", "bombardeiro", "recon"]
    }),
    ponta_lanca: u({
      kind: "ponta_lanca", name: "Ponta de lança", short: "PDL", gen: 2,
      hp: 82, dmg: 20, range: 90, fire: 1.15, speed: 205, size: 12,
      color: "#ff9a3a", accent: "#ffe0b0", projectile: "bullet", role: "spear",
      blurb: "A ponta de lança do exército da Terra. Destemido e meio inconsequente.",
      basic: "Salto no inimigo mais perto. Esmaga no impacto.",
      active: { id: "spear_dash", name: "Impalar", cd: 8, desc: "Se joga num inimigo, impala e volta pro esquadrão." },
      merge: ["ceifador", "phalanx", "warlord"]
    }),
    ceifador: u({
      kind: "ceifador", name: "Ceifador", short: "CEI", gen: 3,
      hp: 118, dmg: 34, range: 200, fire: 0.85, speed: 212, size: 13,
      aoe: 60,
      color: "#8e1230", accent: "#e11d48", projectile: "none", role: "reaper",
      blurb: "O ceifador do campo. Com a foice, ceifa a vida e absorve a essência.",
      basic: "Avança no inimigo mais perto e causa dano em área no contato.",
      active: { id: "reap", name: "Ceifa", cd: 20, desc: "Avança até a mira e canaliza um corte circular enorme. Cada inimigo morto nela: +0,1% de dano da ativa, até +100%." },
      merge: []
    }),
    phalanx: u({
      kind: "phalanx", name: "Phalanx", short: "PHX", gen: 3,
      hp: 210, dmg: 26, range: 90, fire: 0.9, speed: 128, size: 16,
      color: "#c4a45a", accent: "#fff0c4", projectile: "none", role: "paladin",
      blurb: "Soldado de elite da Terra, com lança de energia e um escudo gigante.",
      basic: "Salta no inimigo mais perto. No impacto, dispara um feixe de luz dourada.",
      active: { id: "phalanx_wall", name: "Falange", cd: 20, desc: "Anel de soldados na mira por 15s. Se o esquadrão entra, protege o jogador. Se cai no bicho, vira Termópilas e espetam o centro. A recarga só começa quando acaba." },
      merge: []
    }),
    warlord: u({
      kind: "warlord", name: "Warlord", short: "WRL", gen: 3,
      hp: 128, dmg: 8, range: 90, fire: 2.05, speed: 222, size: 15,
      color: "#7a3a22", accent: "#c41e3a", projectile: "none", role: "warlord",
      blurb: "Guerreiros selvagens, criados com o único propósito de matar.",
      basic: "Dois guerreiros cortam em linha e na horizontal; o Warlord fecha com dois slashes nas diagonais. Invulnerável no ataque e na volta.",
      active: { id: "blood_rift", name: "Rasgo de Sangue", cd: 15, desc: "Os guerreiros juntam força. Stacks deixam de dar cadência e viram 200% em ataque: golpes em X devastadores." },
      merge: []
    }),
    anti_material: u({
      kind: "anti_material", name: "Antimaterial", short: "ATM", gen: 3,
      hp: 90, dmg: 92, range: 340, fire: 0.34, speed: 118, size: 15,
      color: "#3ec0ff", accent: "#b8f0ff", projectile: "cannon", role: "sniper",
      infiniteRange: true,
      blurb: "Especialista em disparos a longa distância com uma sniper antimaterial.",
      basic: "Tiro preto que perfura e consome projéteis no caminho.",
      active: { id: "blackhole", name: "Buraco negro", cd: 14, desc: "Granada de massa minúscula. No impacto, singularidade: puxa e fere inimigos próximos." },
      merge: []
    }),
    observador: u({
      kind: "observador", name: "Observador", short: "OBS", gen: 3,
      hp: 75, dmg: 22, range: 300, fire: 0.7, speed: 150, size: 13,
      color: "#80e0ff", accent: "#e8ffff", projectile: "bullet", role: "observer",
      infiniteRange: true,
      blurb: "Franco-atirador focado em suporte operacional.",
      basic: "Munição tracejante magnética: o disparo curva no inimigo mais perto da mira.",
      active: { id: "flare", name: "Marcação", cd: 8, desc: "Marca o inimigo na mira. Enquanto durar, todos os tiros do esquadrão viram teleguiados nele." },
      merge: []
    }),
    lanca_chamas: u({
      kind: "lanca_chamas", name: "Lança-chamas", short: "CHM", gen: 3,
      hp: 135, dmg: 11, range: 330, fire: 2.35, speed: 135, size: 17,
      color: "#ff7a2a", accent: "#ffd27a", projectile: "flame", role: "flamer",
      blurb: "Piromante do esquadrão de defesa da Terra. Incinera os corpos dos inimigos.",
      basic: "Jato de fogo em cone. Aplica queimadura por 5s.",
      active: { id: "napalm", name: "Fósforo branco", cd: 12, desc: "Labareda em linha reta de fósforo branco. Queimaduras severas e poças de fogo no chão." },
      merge: ["inferno"]
    }),
    canhoneiro: u({
      kind: "canhoneiro", name: "Canhoneiro", short: "CAN", gen: 3,
      hp: 120, dmg: 88, range: 250, fire: 0.48, speed: 118, size: 18,
      color: "#6aa84a", accent: "#d4ffb0", projectile: "grenade", role: "grenadier",
      blurb: "Soldado com um lança-granadas poderoso.",
      basic: "Arremessa uma granada grande. No impacto vira 6 bolinhas; cada uma vira mais 6.",
      merge: ["missil"]
    }),
    minitanque: u({
      kind: "minitanque", name: "Mini-tanque", short: "MTK", gen: 3,
      hp: 260, dmg: 22, range: 200, fire: 0.95, speed: 85, size: 22,
      color: "#3a6ad8", accent: "#9ad4ff", projectile: "bullet", role: "minitank",
      blurb: "Pequeno tanque de combate, geralmente junto da linha de frente e dos fuzileiros.",
      basic: "Tiros de .50 e lança-granadas menores.",
      active: { id: "firemode", name: "Modo de tiro", cd: 0.8, desc: "Alterna fuzil de boa cadência e granadas de área pequena no contato." },
      merge: ["tanque"]
    }),
    quartel: u({
      kind: "quartel", name: "Quartel móvel", short: "QRT", gen: 3,
      hp: 240, dmg: 0, range: 0, fire: 0, speed: 96, size: 24,
      color: "#7a90a8", accent: "#e0e8f0", projectile: "none", role: "bunker",
      blurb: "Quartel móvel especializado em deploy de soldados no campo.",
      spawn: 20,
      merge: []
    }),
    cirurgiao: u({
      kind: "cirurgiao", name: "Cirurgião", short: "CIR", gen: 3,
      hp: 95, dmg: 12, range: 150, fire: 1.15, speed: 142, size: 14,
      color: "#ffffff", accent: "#ffd0d0", projectile: "bullet", role: "surgeon",
      blurb: "Médico de combate veterano.",
      basic: "Arremessa bisturis que sangram: do leve ao moderado, conforme quantos acertam.",
      active: { id: "scalpel_rain", name: "Chuva de bisturis", cd: 15, desc: "Bomba de lâminas na mira. Sangramento severo e cura o esquadrão com o dano causado." },
      merge: []
    }),
    capelao: u({
      kind: "capelao", name: "Capelão", short: "CAP", gen: 3,
      hp: 110, dmg: 7, range: 110, fire: 0.9, speed: 138, size: 15,
      color: "#f0e0a0", accent: "#fff8d8", projectile: "bullet", role: "chaplain",
      blurb: "Médico da fé. Dedicou a vida à cura pela fé, não pela medicina.",
      basic: "Pistola básica. 30% de chance de curar um aliado no acerto.",
      active: { id: "bless", name: "Âncora sagrada", cd: 10, desc: "Cruz sacra no campo. Aliados dentro tomam 35% menos dano." },
      merge: []
    }),
    fora_da_lei: u({
      kind: "fora_da_lei", name: "Fora-da-lei", short: "FDL", gen: 3,
      hp: 180, dmg: 36, range: 1800, fire: 2.4, speed: 168, size: 14,
      color: "#ff8a4a", accent: "#ffd0b0", projectile: "bullet", role: "outlaw",
      blurb: "Criminoso conhecido, convencido a lutar pela Terra por dinheiro.",
      basic: "Calibre doze: cada disparo libera 10 pellets de pouco alcance.",
      active: { id: "double_shotgun", name: "Double Shotgun", cd: 11, desc: "Puxa uma segunda shotgun por 5s." },
      merge: []
    }),
    mineiro: u({
      kind: "mineiro", name: "Mineiro", short: "MIN", gen: 3,
      hp: 130, dmg: 40, range: 150, fire: 0.42, speed: 116, size: 17,
      color: "#f0c422", accent: "#fff0a8", projectile: "mine", role: "miner",
      blurb: "Demolição industrial militar. Anos explodindo minas de ouro e carvão.",
      basic: "Joga 3 minas juntas.",
      active: { id: "carpet", name: "Tapete de minas", cd: 12, desc: "Segura e desenha com minas. Plantam no fim do traço, até 30 na linha." },
      merge: []
    }),
    tesla: u({
      kind: "tesla", name: "Tesla", short: "TSL", gen: 3,
      hp: 130, dmg: 26, range: 300, fire: 0.9, speed: 124, size: 16,
      color: "#a8f6ff", accent: "#ffffff", projectile: "tesla", role: "tesla",
      blurb: "Físico aficionado por eletricidade. O exército liberou baterias gigantes de uso restrito — e isso o convenceu a salvar a Terra.",
      basic: "Feixe até o cursor. Quica entre inimigos.",
      active: { id: "coil", name: "Bobina", cd: 8, desc: "Planta uma bobina. Precisa carregar pra disparar raios. Duas bobinas energizadas lado a lado: mais dano e bateria mais longa." },
      merge: []
    }),
    assassino: u({
      kind: "assassino", name: "Assassino", short: "ASN", gen: 3,
      hp: 65, dmg: 35, range: 100, fire: 1.6, speed: 225, size: 12,
      color: "#6a50c8", accent: "#ddd0ff", projectile: "bullet", role: "assassin",
      blurb: "Um dos assassinos mais perigosos da Terra. Cooperou em troca de carta branca pra matar alienígenas.",
      basic: "Pistola que interrompe o alvo 0,5s (sem skill nem tiro à distância) e faca de sangramento corpo a corpo.",
      active: { id: "execute_dash", name: "Execução", cd: 9, desc: "Solta do grupo, fica invulnerável e teleporta no inimigo com menos vida. Se matar: +2% de dano e pula pro próximo. Termina ao falhar." },
      merge: []
    }),
    radio: u({
      kind: "radio", name: "Rádio", short: "RAD", gen: 3,
      hp: 110, dmg: 18, range: 150, fire: 0.7, speed: 160, size: 15,
      color: "#ffcc66", accent: "#fff3cc", projectile: "grenade", role: "radio",
      blurb: "Suporte pelo rádio. Nunca gostou das linhas de frente.",
      basic: "Arremessa caixotes explosivos. Tem a velocidade do mensageiro e o dano sobe com a velocidade.",
      active: { id: "crate", name: "Suprimento", cd: 9, desc: "Airdrop na mira. Sai cão de combate, megafone desorientante ou gerador de nodes (5 arquivos em 15s)." },
      merge: []
    }),
    helicoptero: u({
      kind: "helicoptero", name: "Helicóptero", short: "HEL", gen: 3,
      hp: 175, dmg: 17, range: 230, fire: 1.75, speed: 195, size: 22,
      color: "#3ef0ff", accent: "#e8ffff", projectile: "bullet", flying: true, role: "heli",
      blurb: "Dois mini-helicópteros de alta tecnologia. Pequenos e letais.",
      basic: "Os dois drones atiram a partir da mira.",
      active: { id: "strafe", name: "Passagem rasa", cd: 12, desc: "Explosão em anel embaixo de cada drone pequeno perto do cursor." },
      merge: ["gunship"]
    }),
    designado: u({
      kind: "designado", name: "Atirador designado", short: "DES", gen: 3,
      hp: 82, dmg: 20, range: 310, fire: 1, speed: 136, size: 14,
      color: "#4ec8e8", accent: "#d0f4ff", projectile: "bullet", role: "sniper",
      infiniteRange: true,
      blurb: "Franco-atirador veterano de curta e média distância. PSG1 semiautomática com cadência de rifle de assalto.",
      basic: "Projétil .50 com cadência de rifle automático.",
      merge: []
    }),
    giratoria: u({
      kind: "giratoria", name: "Giratória", short: "GIR", gen: 3,
      hp: 130, dmg: 6, range: 155, fire: 4.4, speed: 118, size: 18,
      color: "#1a6aff", accent: "#9ec4ff", projectile: "bullet", role: "mg",
      blurb: "Soldado forte que carrega uma gatling automática altamente poderosa.",
      basic: "Projéteis extremamente velozes.",
      merge: []
    }),
    oficina: u({
      kind: "oficina", name: "Oficina móvel", short: "OFI", gen: 3,
      hp: 190, dmg: 0, range: 0, fire: 0, speed: 104, size: 22,
      color: "#7a9aaa", accent: "#d8ece8", projectile: "none", role: "truck",
      blurb: "Quartel móvel especializado em coleta de recursos e disrupção.",
      merge: []
    }),
    socorrista: u({
      kind: "socorrista", name: "Socorrista", short: "SOC", gen: 3,
      hp: 92, dmg: 8, range: 110, fire: 1.35, speed: 162, size: 13,
      color: "#b8ffd4", accent: "#ffffff", projectile: "bullet", role: "medic",
      blurb: "Médico veterano especializado em resgates no campo.",
      basic: "Pistola automática de alta cadência.",
      active: { id: "hook", name: "Gancho", cd: 7, desc: "Gruda nas bordas ou no cenário. No trajeto o esquadrão fica invulnerável. No fim: +5% de cura por segundo por 5s." },
      merge: []
    }),
    revolver: u({
      kind: "revolver", name: "Cano longo", short: "REV", gen: 3,
      hp: 88, dmg: 22, range: 145, fire: 1.15, speed: 158, size: 13,
      color: "#e8a060", accent: "#ffe8c8", projectile: "bullet", role: "dual",
      blurb: "Atirador que descobriu um jeito místico de fazer as balas dobrarem.",
      basic: "Até 3 ricochetes. Cada alvo novo: +1× de dano.",
      active: { id: "fan", name: "Tambor cheio", cd: 12, desc: "6 balas em 6 inimigos diferentes. Se o alvo morrer, o ricochete atualiza e pode pular de novo." },
      merge: []
    }),
    saqueador: u({
      kind: "saqueador", name: "Saqueador", short: "SAQ", gen: 3,
      hp: 110, dmg: 16, range: 120, fire: 1.8, speed: 150, size: 15,
      color: "#c86a3a", accent: "#ffd0a8", projectile: "bullet", role: "outlaw",
      blurb: "Ladrão experiente sentenciado à morte. Aceitou defender a Terra por liberdade.",
      basic: "Não tem arma própria: rouba de inimigos caídos com projétil ou arma à distância. Quem perde a arma fica parado, incrédulo.",
      active: { id: "pilantragem", name: "Pilantragem", cd: 14, desc: "Mistura todas as armas do cofre numa aberração. Dispara tudo com as propriedades originais por 10s. Depois o cofre esvazia." },
      merge: []
    }),
    torreta: u({
      kind: "torreta", name: "Torreta", short: "TOR", gen: 3,
      hp: 140, dmg: 26, range: 200, fire: 0.9, speed: 96, size: 18,
      color: "#c8b45a", accent: "#fff3b0", projectile: "cannon", role: "minitank",
      blurb: "Engenheiro especializado em torretas.",
      basic: "Canhão automático no ombro. Atira no inimigo mais perto.",
      active: { id: "deploy", name: "Instalar", cd: 8, desc: "Menu radial: lança-chamas (10 sucata, 360°, queima), metralhadora (10, cadência alta), Tesla Coil (12, raios que quicam) ou Shield Generator (15, escudo de 20 no grupo). 15s, menos o escudo." },
      merge: []
    }),
    sabotador: u({
      kind: "sabotador", name: "Sabotador", short: "SAB", gen: 3,
      hp: 70, dmg: 40, range: 115, fire: 1.2, speed: 188, size: 12,
      color: "#6a70c8", accent: "#d0d4ff", projectile: "mine", role: "stealth",
      blurb: "Especialista em disrupção e explosivos.",
      basic: "C4 que gruda no alvo e explode após 5s.",
      merge: []
    }),
    fantasma: u({
      kind: "fantasma", name: "Fantasma", short: "FAN", gen: 3,
      hp: 60, dmg: 24, range: 100, fire: 1.5, speed: 215, size: 11,
      color: "#a090ff", accent: "#f0ecff", projectile: "bullet", role: "assassin",
      blurb: "Fantasma de um general que lutou contra forças extraplanares e voltou pra defender o planeta.",
      basic: "Tiro causa medo 0,5s: fogem dele e empurram quem encostar.",
      active: { id: "haunt", name: "Assombração", cd: 12, dur: 3, desc: "Por 3s o esquadrão fica imune. Passar por cima causa medo. Aspecto macabro: tiros ganham medo por 10s." },
      merge: []
    }),
    oficial: u({
      kind: "oficial", name: "Oficial", short: "OFC", gen: 3,
      hp: 95, dmg: 10, range: 130, fire: 1.0, speed: 160, size: 14,
      color: "#f0c84a", accent: "#fff4c8", projectile: "bullet", role: "courier",
      blurb: "Segundo no comando, abaixo só do comandante.",
      basic: "Pistola simples.",
      active: { id: "order", name: "Sinalizador", cd: 10, desc: "Afeta o campo inteiro por 8s: +25% de dano e +35% de cadência. Aura vermelha e fumaça." },
      merge: []
    }),
    bandeira: u({
      kind: "bandeira", name: "Porta-estandarte", short: "EST", gen: 3,
      hp: 135, dmg: 6, range: 90, fire: 0.7, speed: 148, size: 15,
      color: "#e8d080", accent: "#fff8d0", projectile: "bullet", role: "radio",
      swordDmg: 52, swordRange: 150, swordFire: 0.9,
      blurb: "Porta-estandarte da Terra. Carrega a bandeira do planeta com bravura.",
      basic: "Salto no inimigo, estocando com as bandeiras.",
      active: { id: "standard", name: "Estandarte", cd: 12, desc: "Finca na mira por 15s. Dentro: +40% dano, cadência e velocidade. Loot é puxado sozinho. A recarga só começa quando acaba." },
      merge: []
    }),
    bombardeiro: u({
      kind: "bombardeiro", name: "Bombardeiro", short: "BMB", gen: 3,
      hp: 155, dmg: 28, range: 210, fire: 0.55, speed: 168, size: 20,
      color: "#5ad0c8", accent: "#d8ffff", projectile: "grenade", flying: true, role: "heli",
      blurb: "Drone grande especializado em drop de bombas.",
      basic: "Bombas teleguiadas pequenas no cursor.",
      active: { id: "airstrike", name: "Bombardeio", cd: 10, desc: "Segura e desenha uma linha. O drone joga bombas lentamente no traço." },
      merge: []
    }),
    recon: u({
      kind: "recon", name: "Reconhecimento", short: "RCN", gen: 3,
      hp: 78, dmg: 12, range: 220, fire: 1.4, speed: 186, size: 14,
      color: "#8af0d8", accent: "#f0ffff", projectile: "bullet", flying: true, role: "drone",
      blurb: "Drone de reconhecimento furtivo, com balas tracejantes.",
      basic: "Munição colorida que gruda no alvo: +5% de dano recebido por projétil, 5s, stacks ilimitados.",
      merge: []
    }),
    inferno: u({
      kind: "inferno", name: "Inferno", short: "NFR", gen: 4,
      hp: 180, dmg: 15, range: 135, fire: 2.7, speed: 130, size: 19,
      color: "#ff4a18", accent: "#ffe08a", projectile: "flame", role: "inferno",
      unique: true,
      blurb: "Piromaníaco especializado em causar o caos. O exército só o mantém porque os métodos são extremamente eficientes.",
      basic: "Cone de fogo, mais forte que o lança-chamas.",
      active: { id: "firewave", name: "Maré de fogo", cd: 12, desc: "Onda de fogo branco varre o mapa. Derrete projéteis inimigos e aplica queimadura em todos na tela." },
      merge: []
    }),
    missil: u({
      kind: "missil", name: "Míssil", short: "MIS", gen: 4,
      hp: 150, dmg: 36, range: 250, fire: 0.55, speed: 120, size: 18,
      color: "#c46bff", accent: "#f0c8ff", projectile: "missile", role: "missile",
      unique: true,
      blurb: "Soldado com uma RPG teleguiada.",
      basic: "Mísseis teleguiados. A cada 5 disparos, solta 5 de uma vez que perseguem inimigos.",
      active: { id: "salvo", name: "Salva", cd: 13, desc: "12 mísseis teleguiados que perseguem inimigos aleatórios no mapa." },
      merge: []
    }),
    tanque: u({
      kind: "tanque", name: "Tanque", short: "TAN", gen: 4,
      hp: 340, dmg: 28, range: 205, fire: 0.95, speed: 92, size: 26,
      color: "#1c64d8", accent: "#7ad0ff", projectile: "bullet", role: "tank",
      blurb: "Tanque de guerra pesado e altamente tecnológico.",
      basic: "Fuzil, granada e uma barragem poderosa.",
      active: { id: "firemode", name: "Modo de tiro", cd: 0.8, desc: "Cicla fuzil, granadeira e barragem. A barragem recarrega a cada 30s e causa dano massivo no mapa inteiro." },
      merge: ["colosso"]
    }),
    gunship: u({
      kind: "gunship", name: "Canhoneira", short: "GUN", gen: 4,
      hp: 200, dmg: 22, range: 250, fire: 2.0, speed: 176, size: 24,
      color: "#2ad8ff", accent: "#f0ffff", projectile: "bullet", flying: true, role: "gunship",
      blurb: "Drone secreto, usado em operações de invasão rápida.",
      basic: "3 projéteis por vez, todos no cursor.",
      active: { id: "runic_ammo", name: "Munição Rúnica", cd: 15, desc: "Por 10s cada disparo ganha um efeito aleatório: sangramento, lentidão, veneno, queimadura, eletrocutado, bounce, perfuração, lifesteal ou explosão." },
      merge: ["colosso"]
    }),
    colosso: u({
      kind: "colosso", name: "Colosso", short: "COL", gen: 5,
      hp: 325, dmg: 32, range: 180, fire: 0.425, speed: 115, size: 32,
      aoe: 250,
      color: "#e8f6ff", accent: "#7af7ff", projectile: "none", role: "colossus",
      unique: true,
      blurb: "Meca de combate monstruoso, construído pra lutar contra kaijus e alienígenas.",
      basic: "Cicla três golpes no inimigo mais perto: slam, investida de escudo e rocket punch que ricocheteia.",
      active: { id: "energy_blade", name: "Lâmina de energia", cd: 30, dur: 10, desc: "Por 10s os golpes básicos viram slashes de energia: dano, perfuração e alcance infinitos." },
      merge: []
    }),
    comandante: u({
      kind: "comandante", name: "Comandante", short: "CMD", gen: 0,
      hp: 150, dmg: 12, range: 170, fire: 0.85, speed: 150, size: 15,
      color: "#ffd24a", accent: "#fff4c4", projectile: "bullet", role: "commander",
      blurb: "Líder. Se for abatido, a missão fracassa.",
      basic: "Pistola com mira laser.",
      active: { id: "guerrilla", name: "Comandos de guerrilha", cd: 0, desc: "Segura o direito: menu radial de ordens de guerrilha." },
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
      var list = (G.upgrades && G.upgrades.earlyKinds) ? G.upgrades.earlyKinds() : G.EARLY_KINDS;
      return list[Math.max(0, Math.min(list.length - 1, kindOrGen | 0))];
    }
    return G.UNIT_DEFS[kindOrGen] ? kindOrGen : "recruta";
  };

  G.unitList = function () {
    return Object.keys(G.UNIT_DEFS);
  };

  G.unitStatsLine = function (def) {
    if (def.role === "warlord") return def.hp + " HP · " + def.dmg + " corte · alcance " + def.range;
    if (def.role === "paladin") return def.hp + " HP · " + def.dmg + " impacto · alcance " + def.range;
    if (def.role === "jedi") return def.hp + " HP · " + def.dmg + " sabre · alcance " + def.range;
    if (def.role === "reaper") return def.hp + " HP · " + def.dmg + " corte · alcance " + def.range + " · aoe " + (def.aoe || 60);
    if (def.role === "colossus") return def.hp + " HP · " + def.dmg + " impacto · aoe " + (def.aoe || 250);
    if (def.projectile === "none") return def.hp + " HP · suporte · não atira";
    if (def.infiniteRange) return def.hp + " HP · " + def.dmg + " dano · alcance ∞";
    return def.hp + " HP · " + def.dmg + " dano · " + def.range + " alcance";
  };

  G.unitSticker = function (kind) {
    var map = {
      recruta: "🪖", fuzileiro: "🔫", pistoleiro: "🩺", batedor: "👟", psiquico: "🧠",
      escolhido: "✦", jedi: "⚔", mestre: "✴",
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
    dash: { icon: "💨", color: "#ffe08a", detail: "Avança o dobro da distância na direção do movimento. Dano no contato. Invulnerável até o destino." },
    spear_dash: { icon: "🗡", color: "#ff9a3a", detail: "Se joga num inimigo, impala e volta pro esquadrão." },
    phalanx_wall: { icon: "🛡", color: "#c4a45a", detail: "Anel de soldados na mira por 15s. Se o esquadrão entra, protege. Se cai no bicho, vira Termópilas. A recarga só começa quando acaba." },
    reap: {
      icon: "☽",
      iconHtml: '<svg class="scythe-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 21.2 L12.1 3.6" fill="none" stroke="#3a1420" stroke-width="2.35" stroke-linecap="round"/><path d="M12.2 3.4 C18.4 2.6 22.2 7.2 21.4 13.6 C18.6 8.4 15.2 6.2 12.2 6.8 Z" fill="#c41e3a" stroke="#ff6b81" stroke-width="1.05" stroke-linejoin="round"/><path d="M12.4 4.2 C16.8 4 19.6 7.2 19.2 11.4" fill="none" stroke="#ffe4ea" stroke-width="1.1" stroke-linecap="round"/></svg>',
      color: "#c41e3a",
      detail: "Avança até a mira e canaliza um corte circular enorme. Cada inimigo morto nela: +0,1% de dano da ativa, até +100%."
    },
    suppress: { icon: "🛢", color: "#4aa3ff", detail: "Por 5s os tiros empurram os inimigos." },
    focus_fire: { icon: "◎", color: "#2f7dff", detail: "Por 8s o leque vira uma linha reta concentrada." },
    blackhole: { icon: "🕳", color: "#3ec0ff", detail: "Granada de 300px que puxa inimigos ao centro e causa dano." },
    hijack: { icon: "💰", color: "#c86a3a", detail: "Rouba o inimigo na mira. Ele luta do nosso lado por 30s e depois explode. Não funciona em chefes e subchefes." },
    pilantragem: { icon: "💰", color: "#c86a3a", detail: "Mistura todas as armas do cofre numa aberração. Dispara tudo com as propriedades originais por 10s. Depois o cofre esvazia." },
    mark: { icon: "🎯", color: "#7ad8ff", detail: "O próximo tiro causa 4× o dano." },
    order: { icon: "📣", color: "#ffb070", detail: "Afeta o campo inteiro por 8s: +25% de dano e +35% de cadência." },
    kit: { icon: "✚", color: "#7cffb0", detail: "Três nodes de cura caem em cima do esquadrão. Inimigos em cima das poças também dropam um node na hora." },
    napalm: { icon: "🔥", color: "#fff4c8", detail: "Labareda em linha reta de fósforo branco. Queimaduras severas e poças de fogo no chão." },
    firewave: { icon: "🌋", color: "#fff4c8", detail: "Onda de fogo branco varre o mapa. Derrete projéteis inimigos e aplica queimadura em todos na tela." },
    smoke: { icon: "🌫", color: "#c8d0dc", detail: "Granada de fumaça. Inimigos dentro se perdem e se ferem entre si. Quando acaba, fogem de medo por 1s." },
    bless: { icon: "✝", color: "#ffe9a0", detail: "Cruz sacra no campo. Aliados dentro tomam 35% menos dano." },
    carpet: { icon: "⚠", color: "#f0c422", detail: "Segura e desenha com minas. Plantam no fim do traço, até 30 na linha." },
    storm: { icon: "⚡", color: "#a8f6ff", detail: "Choque em volta da Tesla." },
    coil: { icon: "⚡", color: "#a8f6ff", detail: "Planta uma bobina. Precisa carregar pra disparar raios. Duas bobinas energizadas lado a lado: mais dano e bateria mais longa." },
    pulse: { icon: "💥", color: "#7af7ff", detail: "Onda de choque em volta do Colosso. Empurra e fere." },
    energy_blade: { icon: "⚔", color: "#7af7ff", detail: "Por 10s os golpes básicos viram slashes de energia: dano, perfuração e alcance infinitos." },
    overcharge: { icon: "⚔", color: "#7af7ff", detail: "Por 10s os golpes básicos viram slashes de energia: dano, perfuração e alcance infinitos." },
    scalpel_rain: { icon: "💉", color: "#ffd0d0", detail: "Chuva de bisturis na mira. Dano em área, sangramento, e o dano causado cura o esquadrão na hora." },
    bucknade: { icon: "💣", color: "#ff8a4a", detail: "Puxa uma segunda shotgun por 5s." },
    double_shotgun: { icon: "🔫", color: "#ff8a4a", detail: "Puxa uma segunda shotgun por 5s." },
    strafe: { icon: "✈", color: "#3ef0ff", detail: "Explosão em anel embaixo de cada drone pequeno perto do cursor." },
    salvo: { icon: "🚀", color: "#c46bff", detail: "12 mísseis teleguiados que perseguem inimigos aleatórios no mapa." },
    firemode: { icon: "🔄", color: "#9ad4ff", detail: "Cicla fuzil, granadeira e barragem. A barragem recarrega a cada 30s." },
    fan: { icon: "🔫", color: "#ff8a4a", detail: "6 balas em 6 inimigos diferentes. Se o alvo morrer, o ricochete atualiza." },
    ram: { icon: "🛡", color: "#7ad0ff", detail: "Avança na mira, apaga projéteis no caminho e recarrega o canhão. Invencível durante o avanço." },
    flare: { icon: "✨", color: "#ffe08a", detail: "Marca o inimigo na mira. Enquanto durar, todos os tiros do esquadrão viram teleguiados nele." },
    doubletap: { icon: "🔫", color: "#ffb070", detail: "Por 10s, duplica a quantidade de tiros." },
    supercharge: { icon: "⚡", color: "#d4c46a", detail: "As minas no chão ganham pernas de inseto e correm sozinhas atrás do inimigo." },
    rocket: { icon: "🚀", color: "#7af0ff", detail: "Míssil teleguiado. Explode em área." },
    execute_dash: { icon: "🗡", color: "#c8a0ff", detail: "Solta do grupo, fica invulnerável e teleporta no inimigo com menos vida. Se matar: +2% de dano e pula pro próximo. Termina ao falhar." },
    haunt: { icon: "👻", color: "#a090ff", detail: "Por 3s o esquadrão fica imune. Passar por cima causa medo. Aspecto macabro: tiros ganham medo por 10s." },
    crate: { icon: "📦", color: "#ffcc66", detail: "Airdrop na mira. Sai cão de combate, megafone desorientante ou gerador de nodes (5 arquivos em 15s)." },
    hook: { icon: "🪝", color: "#7cffb0", detail: "Gruda nas bordas ou no cenário. No trajeto o esquadrão fica invulnerável. No fim: +5% de cura por segundo por 5s." },
    deploy: { icon: "🗼", color: "#c8b45a", detail: "Menu radial: lança-chamas (10 sucata), metralhadora (10), Tesla Coil (12) ou Shield Generator (15, escudo de 20 no grupo)." },
    detonate: { icon: "💥", color: "#ff6b6b", detail: "Detona todos os explosivos grudados nos inimigos." },
    magnet: { icon: "🚩", color: "#e8d080", detail: "Finca um estandarte na mira por 15s. +40% de dano, cadência e velocidade. Loot dentro é coletado sozinho. O cooldown só começa quando ele cai." },
    standard: { icon: "🚩", color: "#e8d080", detail: "Finca um estandarte na mira por 15s. +40% de dano, cadência e velocidade. Loot dentro é coletado sozinho. O cooldown só começa quando ele cai." },
    airstrike: { icon: "💣", color: "#5ad0c8", detail: "Desenha uma linha. O drone joga bombas lentamente no traço." },
    carpetbomb: { icon: "✈", color: "#2ad8ff", detail: "Por 10s cada disparo ganha um efeito rúnico aleatório." },
    runic_ammo: { icon: "✦", color: "#2ad8ff", detail: "Por 10s cada disparo ganha um efeito aleatório: sangramento, lentidão, veneno, queimadura, eletrocutado, bounce, perfuração, lifesteal ou explosão." },
    archive: { icon: "⭐", color: "#ffd24a", detail: "O esquadrão pega o reforço caído e vira arquivo. R abre a lista: 1 arquivo convoca um recruta, 2 promovem nível 0, 4 o nível 1, 8 o nível 2, e dobra depois. Colosso custa 100." },
    guerrilla: { icon: "◎", color: "#ffd24a", detail: "Segura o direito: menu radial. Cima, direita e esquerda têm recarga própria. O QG (aba Comando) troca cada fatia entre A e B. Centro cancela." },
    psych_slam: { icon: "🔮", color: "#b08cff", detail: "Dispositivo na mira. Levanta inimigos próximos e esmaga no chão: pouco dano, atordoa por ~1,4s. Chefes levam stun curto." },
    stormtrooper: { icon: "💥", color: "#d4c090", detail: "Por 10s dispara 5× mais rápido, mas a precisão fica completamente aleatória." },
    saber_throw: { icon: "⚔", color: "#7affc8", detail: "Arremessa o sabre até a mira. Corta na ida e na volta." },
    force_pull: { icon: "🌀", color: "#7affc8", detail: "Puxa os inimigos pro centro do cast, deixa lentos por um instante e causa um pouco de dano." },
    force_menu: { icon: "◎", color: "#e8b0ff", detail: "Segura o direito: menu radial. Empurrão, puxão, lançamento de sabre e giro da Força." },
    blood_rift: { icon: "🩸", color: "#c41e3a", detail: "Stacks deixam de dar cadência e convertem 200% em ataque: golpes em X devastadores." }
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
      laser: "laser",
      saber: "sabre"
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
    if (def.gen <= 0) return "aliado · recruta";
    return "aliado · tier " + def.gen;
  };

  G.unitStatRows = function (def) {
    var rows = [
      G.unitTierLabel(def) + (def.role === "commander" ? " · não ocupa o limite" : ""),
      "HP " + def.hp,
      def.role === "warlord" ? "Dano " + def.dmg + " (machado)" : def.role === "paladin" ? "Dano " + def.dmg + " (lança)" : def.role === "jedi" ? "Dano " + def.dmg + " (sabre)" : def.role === "reaper" ? "Dano " + def.dmg + " (círculo)" : def.role === "colossus" ? "Dano " + def.dmg + " (melee)" : def.projectile === "none" ? "Dano — (suporte)" : "Dano " + def.dmg,
      def.role === "warlord" || def.role === "paladin" || def.role === "jedi" || def.role === "reaper" || def.role === "colossus" ? "Alcance " + def.range : def.projectile === "none" ? "Alcance —" : (def.infiniteRange ? "Alcance ∞" : "Alcance " + def.range),
      def.role === "reaper" ? "AoE " + (def.aoe || 60) : def.role === "colossus" ? "AoE " + (def.aoe || 250) : null,
      def.fire ? "Cadência " + def.fire.toFixed(2) + "/s" : "Cadência —",
      "Velocidade " + def.speed,
      def.role === "warlord" ? "Arma: machados gêmeos" : def.role === "paladin" ? "Arma: lança" : def.role === "jedi" ? "Arma: sabre de energia" : def.role === "reaper" ? "Arma: foice" : def.role === "colossus" ? "Arma: punho, escudo e slam" : "Arma: " + projLabel(def.projectile)
    ];
    rows = rows.filter(function (line) { return !!line; });
    if (def.flying) rows.push("Aérea");
    if (def.unique) rows.push("Único no esquadrão — só 1");
    G.auraLines(def.aura).forEach(function (line) { rows.push(line); });
    if (def.merge && def.merge.length) {
      rows.push("Vira: " + def.merge.map(function (k) { return G.UNIT_DEFS[k].name; }).join(", "));
    } else if (def.role !== "commander") {
      rows.push("Fim da linha — não evolui mais");
    }
    return rows;
  };

  var UNIT_PASSIVES = {
    fuzileiro: { id: "focus", name: "Modo foco", desc: "Enquanto atira, o esquadrão fica 30% mais lento." },
    pistoleiro: { id: "hitheal", name: "Kit no acerto", desc: "Acerto pode soltar kit de vida no chão. O esquadrão se cura ao pegar." },
    batedor: { id: "scoutgun", name: "Passo leve", desc: "A disparada atravessa inimigos e causa dano de contato." },
    jedi: { id: "deflect", name: "Deflexão", desc: "50% de chance de defletir qualquer projétil que encoste nele, negando o dano." },
    mestre: { id: "deflect", name: "Deflexão", desc: "Sempre deflete qualquer projétil que encoste nele, negando o dano." },
    sniper: { id: "rangedmg", name: "Punição de perto", desc: "Quanto mais longe o projétil for, mais dano ele causa." },
    metralhador: { id: "recoil", name: "Coice", desc: "O recuo empurra o esquadrão pro lado oposto." },
    caminhao: { id: "bumper", name: "Bolha de comando", desc: "Escudo magnético de 7 pontos: bloqueia disparos e encontrões. Recarrega 1 a cada 5s; se quebrar, volta inteiro em 10s." },
    medico: { id: "toxin", name: "Frasco tóxico", desc: "Se acertar um inimigo em cima da poça, ele pode soltar um node de vida." },
    dualista: { id: "twinhit", name: "Canos gêmeos", desc: "Se os dois projéteis acertam o mesmo alvo, o dano vira vida pro dualista." },
    engenheiro: { id: "lobmine", name: "Mina em arco", desc: "A explosão deixa o inimigo lento." },
    infiltrador: { id: "lowprofile", name: "Low Profile", desc: "Raramente puxa agro. O foco fica com o resto do esquadrão." },
    mensageiro: { id: "trail", name: "Esteira", desc: "Rastro no chão: +30% de velocidade. O dano do grupo sobe com a velocidade." },
    phalanx: { id: "bastion", name: "Bastião", desc: "15% de chance de negar o dano de um aliado: spawna um Phalanx menor e ataca de volta." },
    warlord: { id: "warpack", name: "Tríade de guerra", desc: "Cada abate: +10% de cadência. Stacks compartilham timer de 5s (renova no abate), até +100%." },
    ceifador: { id: "reapdash", name: "Foice", desc: "Cada alvo que o ceifador elimina: +0,1% de dano, stackando infinito." },
    anti_material: { id: "blackshot", name: "Munição negra", desc: "A cada tiro ganha uma carga. Em 7, o próximo disparo causa 4× mais dano." },
    observador: { id: "spotgun", name: "Tiro teleguiado", desc: "Os projéteis curvam no inimigo mais perto da mira." },
    lanca_chamas: { id: "melt", name: "Queima", desc: "10% de chance de derreter cada bala física no cone." },
    canhoneiro: { id: "arcnade", name: "Bola preta", desc: "Os disparos se fracionam no impacto." },
    minitanque: { id: "frontarmor", name: "Bolha de comando", desc: "Escudo magnético de 10 pontos, no mesmo esquema do caminhão." },
    quartel: { id: "bait", name: "Recruta de elite", desc: "A cada 20s solta um fuzileiro, pistoleiro ou batedor. Se sobreviverem 30s, sobem pra patente alta." },
    cirurgiao: { id: "scalpel", name: "Bisturi", desc: "O sangramento cura o grupo em 10% do dano causado." },
    capelao: { id: "sidearm", name: "Tiro abençoado", desc: "Cura ao causar dano. Vida cheia vira escudo, até 30% da vida máxima do esquadrão." },
    fora_da_lei: { id: "spread", name: "Cano aberto", desc: "Cada abate: +10% de alcance, até 10 stacks." },
    mineiro: { id: "fieldmine", name: "Campo minado", desc: "Cada mina detonada gera de 1 a 5 de ouro." },
    tesla: { id: "saber", name: "Jolt", desc: "Segurar o básico enche a bateria. Cheia, ganha uma granada de bateria com chain lightning." },
    assassino: { id: "silence", name: "Tiro silenciador", desc: "Acertos impedem chefes de usar skills, no máximo 5 vezes. Depois só volta em 1 min." },
    radio: { id: "crateshot", name: "Caixote", desc: "A cada 20s cai uma caixa com ouro e um arquivo de guerra." },
    inferno: { id: "scorch", name: "Terra queimada", desc: "Morte por queimadura deixa uma poça de fogo no chão." },
    missil: { id: "swarm", name: "Saraivada", desc: "Andando: 1 míssil. Parado: 3." },
    tanque: { id: "heavycannon", name: "Couraça pesada", desc: "Escudo magnético de 12 pontos." },
    colosso: { id: "melee", name: "Tríade do Colosso", desc: "Os três golpes + escudo que absorve 15 pontos de dano." },
    comandante: { id: "archive", name: "Arquivo de guerra", desc: "Inimigos abatidos dropam arquivos de guerra. R gasta pra convocar unidades." },
    giratoria: { id: "spinup", name: "Aquecimento", desc: "Cadência começa comum. Cada segundo segurando o gatilho: +2%, até +50%." },
    oficina: { id: "scrap", name: "Carrinho de sucata", desc: "A cada 5s solta um carrinho que atropela e pega ouro. Explode ao pegar tudo ou aos 10s." },
    socorrista: { id: "sidearm", name: "Pistola de apoio", desc: "A cada 10 inimigos derrotados, pulso de cura baseado na vida máxima do último alvo." },
    revolver: { id: "bankshot", name: "Ricochete", desc: "Os disparos têm penetração e ricochete." },
    saqueador: { id: "steal", name: "Roubo aéreo", desc: "Guarda as armas num cofre pessoal, até 6." },
    torreta: { id: "cannon", name: "Canhão automático", desc: "Cada inimigo abatido enquanto essa unidade estiver viva tem chance de dropar sucata." },
    fantasma: { id: "fearshot", name: "Susto", desc: "Completamente incorpóreo: nada acerta." },
    oficial: { id: "sidearm", name: "Pistola de comando", desc: "Mesma esteira do mensageiro: +30% de velocidade e dano com a velocidade." },
    bandeira: { id: "bannerblade", name: "Estandarte vivo", desc: "Ao causar dano, gera um buff aleatório no esquadrão." }
  };
  Object.keys(UNIT_PASSIVES).forEach(function (k) {
    if (G.UNIT_DEFS[k]) G.UNIT_DEFS[k].passive = UNIT_PASSIVES[k];
  });

  G.unitBasic = function (def) {
    if (!def || !def.basic) return "";
    var t = String(def.basic).replace(/^\s+|\s+$/g, "");
    if (!t || t === "—" || t === "-") return "";
    return t;
  };

  G.unitPassives = function (def) {
    if (def && def.passives && def.passives.length) return def.passives;
    return def && def.passive ? [def.passive] : [];
  };

  G.unitActives = function (def) {
    var list = [];
    if (def && def.active) list.push(def.active);
    if (def && def.extraActive) list.push(def.extraActive);
    return list;
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
      hive_drone: "Abelha da corte",
      hive_elite: "Abelha de elite",
      hive_royal: "Guarda real",
      hive_cell: "Célula do favo",
      hive_cocoon: "Casulo real",
      hive_pillar: "Coluna de favo",
      hive_flower: "Flor de néctar",
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
      boss_princess: "Chefe · princesa",
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
