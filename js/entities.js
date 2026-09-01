(function (G) {
  var nextId = 1;
  function uid() {
    return nextId++;
  }

  G.MAX_UNITS = 5;

  G.PLAYER_TIERS = [];

  G.ENEMY_DEFS = {
    infantaria: { name: "Formiga-soldado", hp: 34, dmg: 22, range: 24, fire: 0, speed: 58, size: 12, color: "#c45a2a", kind: "melee", blurb: "Linha de frente da colmeia. Fecha e morde." },
    corredor: { name: "Estalador", hp: 10, dmg: 20, range: 22, fire: 0, speed: 128, size: 10, color: "#e8a03a", kind: "melee", blurb: "Rápido demais. Corta quem tenta girar em volta." },
    escudeiro: { name: "Escaravelho", hp: 110, dmg: 30, range: 26, fire: 0, speed: 42, size: 16, color: "#6a3a18", kind: "melee", blurb: "Carapaça pesada. Anda devagar e empurra no contato." },
    atirador: { name: "Cuspe-ácido", hp: 32, dmg: 16, range: 190, fire: 0.7, speed: 52, size: 12, color: "#8ad422", kind: "ranged", prefer: 170, blurb: "Fica atrás e cospe ácido de longe." },
    tanque: { name: "Couraça-viva", hp: 180, dmg: 36, range: 170, fire: 0.4, speed: 38, size: 22, color: "#4a5a48", kind: "ranged", prefer: 140, blurb: "Couraça híbrida. Demora pra cair e atira pesado." },
    drone: { name: "Vespa-sonda", hp: 26, dmg: 14, range: 150, fire: 1.1, speed: 90, size: 11, color: "#f0d24a", kind: "drone", flying: true, blurb: "Vespa aérea. Flanqueia por cima e metralha." },
    kamikaze: { name: "Carrapato-bomba", hp: 30, dmg: 52, range: 26, fire: 0, speed: 110, size: 11, color: "#ff3a2a", kind: "kamikaze", blurb: "O corpo é a bomba. Estoura se encostar." },
    medico: { name: "Simbionte", hp: 40, dmg: 0, range: 70, fire: 0, speed: 62, size: 12, color: "#e8ffe8", kind: "healer", blurb: "Cura o enxame. Prioriza o aliado mais ferido." },
    artilharia: { name: "Besouro-morteiro", hp: 55, dmg: 38, range: 320, fire: 0.28, speed: 28, size: 16, color: "#c46a22", kind: "artillery", prefer: 250, blurb: "Marca o chão e dispara morteiro químico." },
    fragmento: { name: "Cisto", hp: 50, dmg: 24, range: 22, fire: 0, speed: 70, size: 14, color: "#d4783a", kind: "melee", splits: true, blurb: "Ao morrer, parte em duas larvas." },
    larva: { name: "Larva", hp: 14, dmg: 16, range: 16, fire: 0, speed: 100, size: 7, color: "#c8e050", kind: "melee", blurb: "Fraca sozinha. Perigosa em grupo. Não larga nada." },
    sombra: { name: "Mimetídeo", hp: 38, dmg: 32, range: 22, fire: 0, speed: 95, size: 12, color: "#3a2458", kind: "stealth", blurb: "Some de longe. Aparece perto pra matar." },
    sniper: { name: "Percevejo-agulha", hp: 36, dmg: 34, range: 280, fire: 0.32, speed: 36, size: 12, color: "#5a8a2a", kind: "sniper", prefer: 240, blurb: "Poucos tiros. Cada um dói. Longo alcance." },
    ninho: { name: "Ninho-colmeia", hp: 130, dmg: 56, range: 28, fire: 0, speed: 12, size: 20, color: "#8a5a18", kind: "nest", blurb: "Estoca 5 a 7 larvas. Quando esvazia, se joga no esquadrão e explode." },
    parasita: { name: "Sanguessuga", hp: 22, dmg: 12, range: 16, fire: 0, speed: 120, size: 8, color: "#a03070", kind: "parasite", blurb: "Gruda num soldado, suga e deixa ele lento." },
    criomante: { name: "Gafanhoto-gelo", hp: 44, dmg: 14, range: 170, fire: 0.7, speed: 48, size: 13, color: "#7ad8ff", kind: "cryo", prefer: 150, blurb: "Tiro gelado. Atrasa o passo do esquadrão." },
    chefe_invasao: {
      name: "Irwin o Comandante da Invasão",
      title: "Aquele que lidera para a assimilação",
      hp: 620, dmg: 16, range: 190, fire: 0.9, speed: 62, size: 18, color: "#3d8a3a", kind: "boss_invasao", boss: true,
      blurb: "Espelho hostil do comandante. Capa verde, duas pistolas e a bandeira da colmeia."
    },
    fuzileiro_alien: {
      name: "Fuzileiro alienígena",
      hp: 42, dmg: 11, range: 165, fire: 0.95, speed: 108, size: 13, color: "#4aa36a", kind: "alien_rifle",
      blurb: "Soldado do Comandante da Invasão. Avança em formação e recua ferido."
    },
    batedor_alien: {
      name: "Batedor alienígena",
      hp: 36, dmg: 10, range: 130, fire: 1.15, speed: 168, size: 11, color: "#8ad46a", kind: "alien_scout",
      blurb: "Ponta de lança da colmeia. Corre na frente e abre o flanco."
    },
    pistoleiro_alien: {
      name: "Pistoleiro alienígena",
      hp: 40, dmg: 8, range: 110, fire: 1.35, speed: 142, size: 12, color: "#6ad49a", kind: "alien_pistol",
      blurb: "Médico invertido. Pistola rápida e cura o Irwin perto dele."
    },
    fuzileiro_elite: {
      name: "Fuzileiro de elite",
      hp: 108, dmg: 13, range: 180, fire: 1.2, speed: 116, size: 14, color: "#3d9a58", kind: "alien_elite_rifle",
      blurb: "Linha de choque do Irwin. Fecha no esquadrão e abre barragem em leque."
    },
    fuzileiro_veterano: {
      name: "Fuzileiro veterano",
      hp: 168, dmg: 16, range: 195, fire: 1.35, speed: 108, size: 16, color: "#2e7a44", kind: "alien_veteran",
      blurb: "Couraça reforçada. Barragem mais larga e tiro que atravessa."
    },
    pistoleiro_elite: {
      name: "Pistoleiro de campo",
      hp: 92, dmg: 7, range: 105, fire: 1.15, speed: 132, size: 13, color: "#5ee0a4", kind: "alien_elite_pistol",
      blurb: "Planta estações de cura. Tem que quebrar a estação pra parar o sangramento."
    },
    medico_alien: {
      name: "Médico de campanha",
      hp: 138, dmg: 8, range: 115, fire: 1.05, speed: 124, size: 14, color: "#9cffd0", kind: "alien_field_medic",
      blurb: "Estações mais gordas. Cura o grupo inteiro se você deixar ele vivo."
    },
    batedor_elite: {
      name: "Batedor orbital",
      hp: 78, dmg: 15, range: 220, fire: 0.42, speed: 176, size: 12, color: "#c8ff6a", kind: "alien_elite_scout",
      blurb: "Marca o chão e deixa a bala cair de cima. Dash sai, andar puro quase não."
    },
    infiltrador_alien: {
      name: "Infiltrador orbital",
      hp: 112, dmg: 17, range: 240, fire: 0.5, speed: 188, size: 12, color: "#e8ff9a", kind: "alien_infiltrator",
      blurb: "Duas quedas por vez. O rastreio é um pouco mais colado."
    },
    heal_station: {
      name: "Estação de cura",
      hp: 88, dmg: 0, range: 0, fire: 0, speed: 0, size: 16, color: "#7cffb0", kind: "heal_station",
      blurb: "Nódulo vivo. Cura o enxame perto. Quebra pra secar a cura.",
      codexHide: true
    },
    dobrador_luz: {
      name: "Dobrador de Luz",
      title: "Prisma da colmeia",
      hp: 240, dmg: 0, range: 160, fire: 0, speed: 160, size: 20, color: "#c8e8ff", kind: "light_bender", flying: true,
      blurb: "Prisma vivo. Enquanto ele existir, o Irwin pode parar o tempo."
    },
    fogueira: {
      name: "Fogueira do vulto",
      hp: 100, dmg: 0, range: 0, fire: 0, speed: 0, size: 16, color: "#ff7a22", kind: "bonfire",
      blurb: "Queima no canto da arena. Enquanto existir, a escuridão não some."
    },
    kaska_sentry: {
      name: "Sentry-casca",
      hp: 90, dmg: 12, range: 240, fire: 1.4, speed: 0, size: 14, color: "#d4a024", kind: "kaska_sentry",
      blurb: "Escudo fincado. Atira no esquadrão até cair."
    },
    beeprincess: {
      name: "Beeprincess-09",
      title: "A herdeira da colmeia",
      hp: 1960, dmg: 32, range: 110, fire: 0.55, speed: 112, size: 32, color: "#f0c84a", kind: "boss_princess", boss: true, flying: true,
      blurb: "Mais tanque e mais rápida que o rei. Estocadas longas, cetro da mãe e a espada do pai."
    },
    abelha_enfermeira: {
      name: "Abelha enfermeira",
      hp: 120, dmg: 0, range: 80, fire: 0, speed: 90, size: 14, color: "#ffe08a", kind: "bee_nurse", flying: true,
      blurb: "Leva a princesa pro canto oposto e cura ela."
    },
    abelha_arquiteta: {
      name: "Abelha arquiteta",
      hp: 140, dmg: 0, range: 0, fire: 0, speed: 70, size: 15, color: "#c4a06a", kind: "bee_architect", flying: true,
      blurb: "Ergue três camadas de barreira em volta da princesa."
    },
    barreira_colmeia: {
      name: "Barreira da colmeia",
      hp: 160, dmg: 0, range: 0, fire: 0, speed: 0, size: 18, color: "#e8c46a", kind: "hive_wall",
      blurb: "Parede viva. Três camadas. Tem que quebrar pra chegar na princesa.",
      codexHide: true
    },
    formiga_leao: {
      name: "Formiga-leão",
      title: "O poço ambulante",
      hp: 720, dmg: 22, range: 90, fire: 0.5, speed: 48, size: 26, color: "#8a5a28", kind: "mini_antlion", boss: true,
      blurb: "Miniboss do Fortilax. Cava funil, enterra e cospe areia."
    },
    besouro_bombardeiro: {
      name: "Besouro bombardeiro",
      title: "O artilheiro alado",
      hp: 680, dmg: 26, range: 220, fire: 0.55, speed: 62, size: 24, color: "#5a3a18", kind: "mini_bomber", boss: true, flying: true,
      blurb: "Miniboss do Fortilax. Carpet de bombas, mergulho e cluster."
    },
    louva_deus: {
      name: "Louva-deus assassino",
      title: "A lâmina da folha",
      hp: 640, dmg: 34, range: 70, fire: 1.1, speed: 130, size: 20, color: "#4a7a32", kind: "mini_mantis", boss: true,
      blurb: "Miniboss do Fortilax. Some, corta e abre leque de foices."
    },
    chefe_comandante: {
      name: "Kaska O Marechal do Avanço",
      title: "A ponta de lança do enxame",
      hp: 930, dmg: 28, range: 210, fire: 0.9, speed: 48, size: 32, color: "#8a5a28", kind: "boss_burst", boss: true,
      blurb: "Besouro rinoceronte, meio máquina. A casca de placas e os canhões cobrem o mesmo corpo que explode na segunda barra.",
      blurbP2: "A carapaça estilhaçou. Fica magro, o chifre cresce e o núcleo laranja fica à mostra. Mesmo Kaska, sem a armadura."
    },
    chefe_vulto: {
      name: "Glinder, Vulto da Noite",
      title: "Aquela que queima a luz",
      hp: 1120, dmg: 24, range: 240, fire: 0.7, speed: 92, size: 30, color: "#c01818", kind: "boss_vulto", boss: true, flying: true,
      blurb: "Dama-vagalume. Asas de carvão, lanterna viva no abdômen. Apaga a arena e ilumina só o que ela queima."
    },
    chefe_megatanque: {
      name: "Beequeen-07",
      title: "Imperatriz da Colmeia",
      hp: 1350, dmg: 22, range: 210, fire: 0.45, speed: 48, size: 42, color: "#f0b42a", kind: "boss_charge", boss: true, flying: true,
      blurb: "Maga de suporte da corte. Fica atrás, joga tecnomagia de mel e empurra o rei pra cima do esquadrão."
    },
    chefe_beeking: {
      name: "Beeking-08",
      title: "O rei da colmeia",
      hp: 1280, dmg: 42, range: 90, fire: 0.35, speed: 86, size: 40, color: "#e87830", kind: "boss_king", boss: true, flying: true,
      blurb: "Tank da corte. Maior, mais lento, investida real e formação que faz merge."
    },
    chefe_arklan: {
      name: "Arklan",
      title: "Devorador de planetas",
      hp: 1980, dmg: 40, range: 90, fire: 0, speed: 36, size: 74, color: "#c4a06a", kind: "boss_worm", boss: true,
      blurb: "Minhoca de areia colossal. Some debaixo da terra e explode pra fora com a boca aberta."
    },
    arklan_spike: {
      name: "Espinho de areia",
      hp: 55, dmg: 0, range: 0, fire: 0, speed: 0, size: 14, color: "#8a5a28", kind: "pin_spike",
      blurb: "Finca no chão e prende o esquadrão. Atira nele pra se soltar.",
      codexHide: true
    },
    minhoca_deserto: {
      name: "Minhoca do deserto",
      hp: 48, dmg: 14, range: 26, fire: 0, speed: 96, size: 16, color: "#c4a06a", kind: "sand_worm",
      blurb: "Cria menor do Arklan. Some na areia e explode perto do esquadrão.",
      codexHide: true
    },
    chefe_fortaleza: {
      name: "Fortilax o Ninho andarilho",
      title: "Fortaleza com patas",
      hp: 2280, dmg: 32, range: 200, fire: 0.7, speed: 28, size: 44, color: "#c45cff", kind: "boss_spawn", boss: true,
      blurb: "Ninho ambulante. Vomita qualquer bicho da colmeia e se cura se você parar de atirar."
    },
    chefe_espectro: {
      name: "Dusk a Mariposa Lunar",
      title: "A Dama Da Noite",
      hp: 1470, dmg: 26, range: 200, fire: 0.8, speed: 58, size: 40, color: "#c8a0ff", kind: "boss_veil", boss: true, flying: true,
      blurb: "Furtiva. Coleta energia lunar, clona a si mesma e corta com a Moonlight Sword."
    },
    chefe_final: {
      name: "Núcleo do Enxame",
      title: "O cérebro da legião",
      hp: 1900, dmg: 34, range: 230, fire: 0.85, speed: 40, size: 48, color: "#fff36a", kind: "boss_final", boss: true,
      blurb: "O cérebro da legião. Três camadas: Colmeia, Mariposa, núcleo nu."
    },
    mini_beemote: {
      name: "Operária Beemote",
      hp: 140, dmg: 10, range: 170, fire: 0.55, speed: 72, size: 16, color: "#ffc44a", kind: "mini_beemote", flying: true,
      blurb: "Operária da Imperatriz. Ferrão lento que envenena."
    },
    hive_bee: {
      name: "Abelha da corte",
      hp: 55, dmg: 10, range: 70, fire: 0.8, speed: 110, size: 10, color: "#ffc44a", kind: "hive_drone", flying: true,
      blurb: "Abelha pequena da corte. Obedece o grito da rainha e orbita o rei. Duas juntas viram elite."
    },
    elite_bee: {
      name: "Abelha de elite",
      hp: 120, dmg: 16, range: 90, fire: 0.7, speed: 96, size: 14, color: "#e8a028", kind: "hive_elite", flying: true,
      blurb: "Merge de duas abelhas da corte. Mais casca, mais ferrão. Duas elites viram guarda real."
    },
    royal_bee: {
      name: "Guarda real",
      hp: 240, dmg: 24, range: 80, fire: 0.55, speed: 78, size: 18, color: "#ffd24a", kind: "hive_royal", flying: true,
      blurb: "Merge final. Couraça dourada, orbita o rei e não sai do lado dele."
    },
    hive_cell: {
      name: "Célula do favo",
      hp: 90, dmg: 0, range: 0, fire: 0, speed: 0, size: 16, color: "#e8c050", kind: "hive_cell",
      blurb: "Célula do favo central. Quebrar dispara o efeito. Deixar lá, o efeito se repete.",
      codexHide: true
    },
    hive_cocoon: {
      name: "Casulo real",
      hp: 9999, dmg: 0, range: 0, fire: 0, speed: 0, size: 22, color: "#c4a06a", kind: "hive_cocoon",
      blurb: "Fica no alto da arena. Não ataca. Na invasão 4, a princesa sai de dentro.",
      codexHide: true
    },
    hive_pillar: {
      name: "Coluna de favo",
      hp: 9999, dmg: 0, range: 0, fire: 0, speed: 0, size: 18, color: "#d4a024", kind: "hive_pillar",
      blurb: "Obstáculo de quitina. Fica parado. O rei estuna 5s se bater nela na investida, 1s na parede. No máximo 3 no mapa; 30s pra voltar.",
      codexHide: true
    },
    hive_flower: {
      name: "Flor de néctar",
      hp: 9999, dmg: 0, range: 0, fire: 0, speed: 0, size: 14, color: "#ff7ad2", kind: "hive_flower",
      blurb: "Ponto de colheita. As abelhas da rainha vêm aqui no HARVEST.",
      codexHide: true
    },
    orb_escudo: {
      name: "Órbita-casca",
      hp: 95, dmg: 0, range: 0, fire: 0, speed: 0, size: 13, color: "#ffe08a", kind: "orbit_shield", codexHide: true,
      blurb: "Escudo vivo do Marechal. Orbita e toma tiro no lugar dele."
    },
    veu_clone: {
      name: "Mariposa Lunar",
      title: "A Dama Da Noite",
      hp: 280, dmg: 16, range: 200, fire: 0.9, speed: 62, size: 34, color: "#9ad8ff", kind: "boss_veil", boss: true, fake: true, flying: true, codexHide: true,
      blurb: "Clone da Mariposa. Atira luar de verdade pra atrapalhar."
    }
  };

  G.ENEMY_POOL = [
    "infantaria", "corredor", "escudeiro", "atirador", "tanque", "drone", "kamikaze",
    "medico", "artilharia", "fragmento", "sombra", "sniper", "ninho", "parasita", "criomante"
  ];
  G.BOSS_POOL = ["chefe_invasao", "chefe_comandante", "chefe_vulto", "chefe_megatanque", "chefe_fortaleza", "chefe_espectro", "chefe_arklan"];

  (function attachEnemySkills() {
    var E = G.ENEMY_DEFS;
    E.infantaria.passive = { name: "Formação", desc: "Vem em grupo. Mandíbula de quitina, passo de soldado." };
    E.infantaria.active = { name: "Mandíbula", desc: "Morde de perto. Dano de contato." };
    E.corredor.passive = { name: "Patas longas", desc: "Corre mais que o resto do enxame." };
    E.corredor.active = { name: "Estalo", desc: "Fecha a distância rápido e corta quem tenta girar em volta." };
    E.escudeiro.passive = { name: "Carapaça", desc: "Elmo de besouro. Muita vida, passo lento." };
    E.escudeiro.active = { name: "Chifre", desc: "Empurra com o chifre no contato." };
    E.atirador.passive = { name: "Retaguarda", desc: "Fica atrás da linha e cospe de longe." };
    E.atirador.active = { name: "Cuspe ácido", desc: "Projétil corrosivo no aliado mais perto." };
    E.tanque.passive = { name: "Couraça híbrida", desc: "Inseto soldado à máquina. Demora pra cair." };
    E.tanque.active = { name: "Canhão orgânico", desc: "Projétil pesado de médio alcance." };
    E.drone.passive = { name: "Asas de sonda", desc: "Aéreo: ignora o chão e flanqueia." };
    E.drone.active = { name: "Ferrão rápido", desc: "Metralha de cima." };
    E.kamikaze.passive = { name: "Saco de esporos", desc: "Não atira. O corpo é a bomba." };
    E.kamikaze.active = { name: "Explosão", desc: "Estoura ao encostar, em área." };
    E.medico.passive = { name: "Glândula", desc: "Prioriza curar aliado ferido." };
    E.medico.active = { name: "Seiva", desc: "Restaura HP de um inimigo perto." };
    E.artilharia.passive = { name: "Abdômen-morteiro", desc: "Fica atrás e marca o chão antes de atirar." };
    E.artilharia.active = { name: "Morteiro", desc: "Aviso no chão, depois explosão química no esquadrão." };
    E.fragmento.passive = { name: "Instável", desc: "Ao morrer, parte em duas larvas." };
    E.fragmento.active = { name: "Embite", desc: "Dano de contato. A cisão só acontece na morte." };
    E.larva.passive = { name: "Enxame", desc: "Fraca sozinha, perigosa em grupo." };
    E.larva.active = { name: "Mordida", desc: "Dano de contato rápido." };
    E.sombra.passive = { name: "Camuflagem", desc: "Fica apagada longe. Só aparece perto pra matar." };
    E.sombra.active = { name: "Apunhalada", desc: "Fecha rápido e bate forte de perto." };
    E.sniper.passive = { name: "Rostro", desc: "Poucos tiros, cada um dói. Bico de percevejo." };
    E.sniper.active = { name: "Agulha", desc: "Projétil de longo alcance no aliado." };
    E.ninho.passive = { name: "Ninhada", desc: "Nasce com 5 a 7 larvas guardadas. Sem spawn infinito." };
    E.ninho.active = { name: "Esvaziar", desc: "Expelidas as larvas, corre no esquadrão e explode." };
    E.parasita.passive = { name: "Aderência", desc: "Gruda num aliado e suga." };
    E.parasita.active = { name: "Infestação", desc: "Quem está grudado toma mais dano e atira mais devagar." };
    E.criomante.passive = { name: "Frente fria", desc: "Tiro gelado atrasa o passo do esquadrão." };
    E.criomante.active = { name: "Rajada fria", desc: "Cristais de gelo à distância." };
    E.chefe_invasao.passive = { name: "General da colmeia", desc: "Não luta sozinho. Empilha tropa, solta moral no grupo e abre espaço com dash." };
    E.chefe_invasao.skills = [
      { type: "active", name: "Bomba de ácido", desc: "Marca o chão e deixa ácido. Desvia do círculo.", icon: "☢" },
      { type: "active", name: "Fuzileiros", desc: "Chama tropa. Feridos recuam pra se curar; quando voltam, fecham atirando.", icon: "🔫" },
      { type: "active", name: "Aura e moral", desc: "Cura quem fica perto e aumenta a velocidade do grupo.", icon: "✚" },
      { type: "active", name: "Dash", desc: "Avança na faixa marcada. Sai da área antes do impacto.", icon: "»" },
      { type: "active", name: "Disparada", desc: "Na invasão, com batedores vivos, ele usa o dash do batedor pra sair de napalm e área.", icon: "⚡" },
      { type: "active", name: "Ordem de reforço", desc: "Na segunda barra da invasão: elite, estações de cura e quedas orbitais.", icon: "📡" },
      { type: "active", name: "Tudo que tem", desc: "Na metade da segunda barra: bombardeio e o Dobrador de Luz. O tempo para, depois volta em câmera lenta. Dash quando o tempo volta a correr.", icon: "⏱" }
    ];
    E.fuzileiro_alien.passive = { name: "Disciplina", desc: "Fecha no esquadrão. Com a vida baixa, recua." };
    E.fuzileiro_alien.active = { name: "Rajada", desc: "Tiro de fuzil orgânico. Depois de curar, vai pra cima atirando." };
    E.fuzileiro_elite.passive = { name: "Linha de choque", desc: "Persegue o esquadrão sem kiting frouxo." };
    E.fuzileiro_elite.active = { name: "Barragem", desc: "Aviso em leque, depois tiro rápido em leque. Sai da faixa." };
    E.fuzileiro_veterano.passive = { name: "Couraça de campanha", desc: "Mais vida, passo mais pesado." };
    E.fuzileiro_veterano.active = { name: "Barragem pesada", desc: "Leque mais largo. Tiro atravessa um alvo." };
    E.batedor_alien.passive = { name: "Flanco", desc: "Corre na frente do fuzileiro e abre o lado." };
    E.batedor_alien.active = { name: "Disparada", desc: "Fecha rápido no esquadrão." };
    E.batedor_elite.passive = { name: "Marcador orbital", desc: "A marca no chão atrasa. Dash sai; andar puro quase não." };
    E.batedor_elite.active = { name: "Queda", desc: "A bala cai de cima no círculo. O rastreio não é perfeito." };
    E.infiltrador_alien.passive = { name: "Duas quedas", desc: "Marca dois pontos. O rastreio cola um pouco mais." };
    E.infiltrador_alien.active = { name: "Salva orbital", desc: "Duas marcas, duas quedas." };
    E.pistoleiro_alien.passive = { name: "Médico invertido", desc: "Cura o Irwin se estiver perto." };
    E.pistoleiro_alien.active = { name: "Pistola", desc: "Tiro curto e rápido." };
    E.pistoleiro_elite.passive = { name: "Nódulo", desc: "Planta estação de cura. Quebra a estação pra secar." };
    E.pistoleiro_elite.active = { name: "Estação", desc: "Cura o grupo e o Irwin perto do nódulo." };
    E.medico_alien.passive = { name: "Campanha", desc: "Estações mais duras e cura mais forte." };
    E.medico_alien.active = { name: "Posto avançado", desc: "Pode manter duas estações." };
    E.heal_station.passive = { name: "Seiva", desc: "Cura o enxame no raio. Não anda." };
    E.heal_station.active = { name: "Nódulo", desc: "Atira no nódulo até ele cair." };
    E.dobrador_luz.passive = { name: "Prisma", desc: "Enquanto viver, o Irwin pode parar o tempo." };
    E.dobrador_luz.active = { name: "Dobra", desc: "O esquadrão congela. Os tiros ficam no ar e saem em câmera lenta. Dash quando o tempo volta a correr." };
    E.chefe_comandante.passive = { name: "Carrasco da linha", desc: "Escudos orbitam em círculo e protegem ele. Só chama o próximo anel quando o atual morre e passam 10s desprotegido." };
    E.chefe_comandante.skills = [
      { type: "active", name: "Setas crescentes", desc: "Três disparos mirados em formato de seta. Cada um é maior que o anterior. Sai da faixa no chão.", icon: "➤" },
      { type: "active", name: "Giro de espinhos", desc: "Depois das três setas ele gira no eixo, ignora a mira e joga setas pra todos os lados.", icon: "💥" },
      { type: "active", name: "Impalada", desc: "Cinco dashes telegrafados em cima do esquadrão. No fim de cada um ele pula. A área do pulo cresce 10% por vez, até 50% maior no último.", icon: "⚠" },
      { type: "active", name: "Setas triplas", desc: "Na segunda barra as setas saem em leque de três. Três rajadas, cada uma maior.", icon: "➤" },
      { type: "active", name: "Investida com anel", desc: "Três charges rápidas na posição do esquadrão. Enquanto avança, solta um círculo de setas.", icon: "⚠" },
      { type: "active", name: "Queda", desc: "Três pulos saindo da tela, cada um numa área maior. Onde cai, o chão racha e atrasa o passo. Depois do terceiro ele fica parado e toma mais dano.", icon: "🪲" },
      { type: "active", name: "Cacos orbitais", desc: "Os escudos marcam áreas pequenas e atiram pedaços de casca nelas.", icon: "🛡" }
    ];
    E.chefe_vulto.passive = { name: "Apaga-luz", desc: "Na primeira barra ela apaga a arena. Na segunda, o sol negro cresce até estourar." };
    E.chefe_vulto.skills = [
      { type: "active", name: "Brasa", desc: "Bolinhas de fogo. No impacto explodem em área e deixam queimadura por 5s.", icon: "🔥" },
      { type: "active", name: "Laser de fogo", desc: "Para, marca a faixa e dispara 10 lasers na posição travada. Cada um queima. A barricada para o feixe.", icon: "☀" },
      { type: "active", name: "Escuridão", desc: "A luz some. Ache a fogueira e aperte E dez vezes pra acender (10% por toque). No escuro ela só persegue o comandante, e a arena toma 1% da vida máxima por segundo.", icon: "🌑" },
      { type: "active", name: "Inferno", desc: "Cronômetro de 3s. Ela teleporta pro centro e explode. O fogo quebra na barricada e escorre em volta. Fora dali é hit-kill.", icon: "💥" },
      { type: "active", name: "Bola de fogo", desc: "Segunda barra. Bola grande que explode numa área maior que a brasa.", icon: "🔥" },
      { type: "active", name: "Laser duplo", desc: "Dois lasers ao mesmo tempo. Até 20 disparos sem parar. A barricada também segura.", icon: "☀" },
      { type: "active", name: "Labirinto de fogo", desc: "O comandante fica sozinho. Paredes de chama, prisão de fogo nas bordas. Dash não atravessa. 36s pra reunir o esquadrão. Se falhar, ela queima ele até virar cinza.", icon: "🧱" },
      { type: "active", name: "Inferno em cadeia", desc: "3 a 5 explosões. Cada uma destrói a barricada e spawna outra longe.", icon: "💥" },
      { type: "active", name: "Sol negro", desc: "Nasce atrás dela. Não tem vida e não quebra. Puxa o esquadrão e os inimigos. Cada inimigo absorvido aumenta a área dos ataques. Atira brasas e solta onda negra — a barricada cobre os dois e os lasers. SHIFT ainda desvia a onda.", icon: "🌑" },
      { type: "active", name: "Supernova", desc: "No tamanho máximo o sol explode. Cega a arena. Só vive quem acerta o SHIFT no estalo — a janela é apertada pra valer.", icon: "☀" }
    ];
    E.chefe_megatanque.passive = { name: "Hive Link", desc: "Enquanto o rei viver, +50% de defesa. O elo é a faixa entre os dois — ficar no meio quebra a formação." };
    E.chefe_megatanque.skills = [
      { type: "active", name: "Raio âmbar", desc: "Laser de mel e energia no cetro. Queima quem fica na linha e marca o esquadrão — o rei corre mais. Às vezes o feixe deixa lento.", icon: "🔆" },
      { type: "active", name: "Salto real", desc: "Marca as costas do esquadrão por 0,5s e teleporta o rei pra lá. Depois ele carrega a investida.", icon: "✨" },
      { type: "active", name: "Prisma de mel", desc: "Planta um cristal tecnomágico que atira bolas de mel sozinho. Dá pra ler, dá pra desviar, não dá pra ignorar.", icon: "◆" },
      { type: "active", name: "Amparo de âmbar", desc: "Escudo no rei. Ele toma bem menos dano enquanto o brilho durar.", icon: "🛡" },
      { type: "active", name: "Favo real", desc: "Quando alguém da corte chega em 70% de vida, nasce um favo no centro. Cada célula dispara um efeito se quebrar — ou dispara sozinha se ficar lá.", icon: "⬡" },
      { type: "active", name: "Muro de abelhas", desc: "Se ela fica encurralada, chama uma fileira de abelhas que empurra o esquadrão até a borda da arena.", icon: "🐝" },
      { type: "active", name: "Ponta de lança", desc: "As abelhas se fecham em ponta e atravessam a arena inteira. Empurra e fere quem pega na linha.", icon: "➤" },
      { type: "active", name: "Fuga real", desc: "Se o muro não abre espaço, ela teleporta pro canto mais longe. 30s de recarga.", icon: "✨" }
    ];
    E.chefe_beeking.passive = { name: "Hive Link", desc: "Enquanto a rainha viver, +50% de ataque. O elo é a faixa entre os dois." };
    E.chefe_beeking.skills = [
      { type: "active", name: "Royal Charge", desc: "Telegraph curto, a faixa acompanha você. A investida vai em linha reta e acerta pesado. Bater numa coluna estuna 5s; na parede, 1s.", icon: "⚔" },
      { type: "active", name: "Pressão", desc: "Não para. Corre, lança, corpo a corpo. O rei existe pra te encostar na parede.", icon: "🔥" },
      { type: "active", name: "Cavaleiro", desc: "Se a rainha cair, ele encadeia duas investidas. Em cada uma nascem duas ilusões cobrando ao lado pra afunilar. Lança em leque e deixa mais mel no rastro. Stun na coluna ainda reseta o charge.", icon: "🛡" }
    ];
    E.chefe_megatanque.skills.push({ type: "active", name: "Enrage da colmeia", desc: "Se o rei cair, ela para, abre dois raios e varre a arena. Lança, chuva de mel, prisma duplo e leque de bolas no meio.", icon: "😡" });
    E.chefe_arklan.passive = { name: "Planeta abaixo", desc: "A câmera abre. O corpo inteiro aparece quando ele sai da areia." };
    E.chefe_arklan.skills = [
      { type: "active", name: "Mergulho", desc: "Enterra rápido, rasga a areia bem longe e explode do outro lado. O corpo grosso fica no caminho e acerta quem pisar.", icon: "🪱" },
      { type: "active", name: "Espirar e girar", desc: "Vai ao centro. Jatos de areia largos giram no horário ou anti-horário. Em 50% viram dois jatos.", icon: "🌪" },
      { type: "active", name: "Espinhos", desc: "Não ferem: fincam e prendem. Atira nos espinhos pra se mover de novo.", icon: "📌" },
      { type: "active", name: "Ninhada", desc: "Durante a luta spawna minhocas menores pra encher o saco.", icon: "🪱" }
    ];
    E.chefe_fortaleza.passive = { name: "Muralha ambulante", desc: "Anda devagar e vomita reforço. Os minions dela não largam ouro nem reforço." };
    E.chefe_fortaleza.skills = [
      { type: "active", name: "Portão", desc: "A cada 3s invoca qualquer unidade da colmeia — menos chefes — com buff de velocidade, dano ou cadência.", icon: "🏕" },
      { type: "active", name: "Fortificar", desc: "Se ninguém acerta ela por um tempo, estaciona, levanta escudo e cura 0,5%/s nela e nos aliados perto.", icon: "✚" },
      { type: "active", name: "Fusão", desc: "Fundir duas unidades invocadas, misturando as habilidades delas num híbrido mais grosso.", icon: "🧬" },
      { type: "active", name: "Guarnição final", desc: "Ao cair, solta 10 inimigos aleatórios.", icon: "👁" }
    ];
    E.chefe_espectro.passive = { name: "Energia lunar", desc: "A luta inteira ela coleta luar. Em 100% puxa a Moonlight Sword e corta a arena." };
    E.chefe_espectro.skills = [
      { type: "active", name: "Passo atrás", desc: "Teleporta sempre atrás do esquadrão, considerando o movimento pra não nascer no meio deles.", icon: "🌫" },
      { type: "active", name: "Estouro do véu", desc: "A cada 3 a 6 saltos, o teleporte explode em luar. Clones também ferem.", icon: "💥" },
      { type: "active", name: "Trindade", desc: "Ao chegar em 50% de HP invoca 3 clones. Eles atiram luar de verdade.", icon: "👥" },
      { type: "active", name: "Moonlight Sword", desc: "Com a barra cheia, invoca uma espada gigante de luar e dispara slashes largos no esquadrão.", icon: "⚔" },
      { type: "active", name: "Poças de luar", desc: "Áreas de moonlight queimam e deixam o esquadrão exposto.", icon: "🌙" }
    ];
    E.chefe_final.passive = { name: "Três camadas", desc: "Fase 1: a Colmeia protege. Fase 2: a Mariposa esconde. Fase 3: o núcleo exposto." };
    E.chefe_final.skills = [
      { type: "active", name: "Casca da colmeia", desc: "Enquanto a Colmeia viver, o núcleo não toma dano.", icon: "🏕" },
      { type: "active", name: "Véu do núcleo", desc: "Na segunda fase, a Mariposa-Véu ajuda ele a sumir enquanto a rajada continua.", icon: "🌫" },
      { type: "active", name: "Núcleo exposto", desc: "No último estágio ataca uma coisa de cada vez: raios, rajada, artilharia ou teleporte. Cura sozinho e invoca reforços — inclusive chefes a cada 1–2 min.", icon: "👁" },
      { type: "active", name: "Zoom tático", desc: "Na última fase o campo abre e o mapa cresce.", icon: "☄" }
    ];
    E.mini_beemote.passive = { name: "Ferrão", desc: "Tiro envenena. 5% da vida máxima em 5s, dano verdadeiro." };
    E.mini_beemote.active = { name: "Aguilhão", desc: "Projétil lento que aplica veneno." };
    E.hive_bee.passive = { name: "Enxame", desc: "Obedece o comando da rainha ou orbita o rei." };
    E.hive_bee.active = { name: "Merge", desc: "Duas juntas viram abelha de elite." };
    E.elite_bee.passive = { name: "Casca", desc: "Mais vida que a abelha comum." };
    E.elite_bee.active = { name: "Merge real", desc: "Duas elites viram guarda real." };
    E.royal_bee.passive = { name: "Guarda", desc: "Couraça dourada. Não faz merge de novo." };
    E.royal_bee.active = { name: "Ferrão pesado", desc: "Tiro curto e grosso." };
    E.fogueira.passive = { name: "Brasa", desc: "Ilumina o canto. 100 de vida fixa." };
    E.fogueira.active = { name: "Fogueira", desc: "Enquanto existir, a escuridão não some." };
    E.kaska_sentry.passive = { name: "Fincada", desc: "Não anda. Atira no esquadrão." };
    E.kaska_sentry.active = { name: "Rajada", desc: "Tiro de casca dourada." };
    E.beeprincess.passive = { name: "Herdeira", desc: "Surge do casulo quando a rainha e o rei caem. Pega o cetro da mãe e o espadão do pai." };
    E.beeprincess.skills = [
      { type: "active", name: "Charge e estocada", desc: "Charge na faixa dourada larga. Em seguida três estocadas em leque — as linhas ciano. Repete isso 3 vezes.", icon: "⚔" },
      { type: "active", name: "Honey Technomagic", desc: "O cetro invoca abelhas robóticas, dispara um laser ouro-laranja-azul, ou teleporta num feixe dourado.", icon: "👑" },
      { type: "active", name: "Full Honeymoon Slash", desc: "No ninho: absorve no centro. Dez cortes de lua nas metades da arena — cima, baixo, esquerda e direita, em ordem aleatória.", icon: "🌙" },
      { type: "active", name: "Honeyhellish Thrust", desc: "Aura vermelha, depois investidas intangíveis. Se você der Shift no meio do dash, ela pode fintar: some e recarrega de longe atrás de você.", icon: "☄" },
      { type: "active", name: "Final Harvest Honey Flash", desc: "Some. A tela enche de cortes dourado-azul no estilo Judgment Cut. Fique no vão ou no corte que ela já fez.", icon: "✨" }
    ];
    E.formiga_leao.passive = { name: "Funil", desc: "Cava um poço que puxa o esquadrão." };
    E.formiga_leao.skills = [
      { type: "active", name: "Poço", desc: "Funil de areia puxa e fere quem fica no meio.", icon: "🕳" },
      { type: "active", name: "Emboscada", desc: "Enterra e explode pra fora embaixo do esquadrão.", icon: "🪱" },
      { type: "active", name: "Cuspe", desc: "Rajada de areia à distância.", icon: "🌪" }
    ];
    E.besouro_bombardeiro.passive = { name: "Artilharia", desc: "Voa e satura o chão de bombas." };
    E.besouro_bombardeiro.skills = [
      { type: "active", name: "Tapete", desc: "Bombas em linha sob o esquadrão.", icon: "💣" },
      { type: "active", name: "Mergulho", desc: "Cai em cima e explode.", icon: "💥" },
      { type: "active", name: "Cluster", desc: "Um ovo que parte em várias bombas.", icon: "🥚" }
    ];
    E.louva_deus.passive = { name: "Assassino", desc: "Some, corta, some de novo." };
    E.louva_deus.skills = [
      { type: "active", name: "Pulo-corte", desc: "Teleporta no flanco e rasga.", icon: "🗡" },
      { type: "active", name: "Camuflagem", desc: "Fica invisível e persegue.", icon: "🌫" },
      { type: "active", name: "Leque", desc: "Três foices em arco na frente.", icon: "☽" }
    ];
  })();

  G.maxUnits = function () {
    var extra = 0;
    if (G.save && G.save.data && G.save.data.perm) extra = G.save.data.perm.maxUnits | 0;
    return G.MAX_UNITS + (extra > 0 ? 1 : 0);
  };

  G.soldierCount = function (state) {
    var n = 0;
    for (var i = 0; i < state.units.length; i++) {
      if (state.units[i].hp > 0 && !state.units[i].commander) n++;
    }
    return n;
  };

  G.KIND_COPY_CAP = 2;
  G.UNIQUE_KINDS = { missil: 1, inferno: 1, colosso: 1 };

  G.kindCopyCap = function (kind) {
    if (!kind || kind === "recruta" || kind === "comandante") return 99;
    var def = G.UNIT_DEFS && G.UNIT_DEFS[kind];
    if ((def && def.unique) || G.UNIQUE_KINDS[kind]) return 1;
    return G.KIND_COPY_CAP;
  };

  G.countKind = function (state, kind) {
    if (!state || !state.units) return 0;
    var n = 0;
    for (var i = 0; i < state.units.length; i++) {
      if (state.units[i].hp > 0 && state.units[i].kind === kind) n++;
    }
    return n;
  };

  G.canAddKind = function (state, kind) {
    return G.countKind(state, kind) < G.kindCopyCap(kind);
  };

  G.resolutionInfo = function (state) {
    var w = (state && state.W) || (typeof innerWidth !== "undefined" ? innerWidth : 1280);
    var h = (state && state.H) || (typeof innerHeight !== "undefined" ? innerHeight : 720);
    var diag = Math.hypot(w, h);
    var t = (diag - 1400) / 1400;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    return {
      diag: diag,
      t: t,
      spawnInterval: (0.38 - t * 0.24) / 1.3,
      concurrent: Math.round((6 + t * 12) * 1.69 * 1.2),
      waveMul: 2
    };
  };

  G.portraitImgs = {};

  G.loadImg = function (urls) {
    var list = Array.isArray(urls) ? urls.slice() : [urls];
    var img = new Image();
    var i = 0;
    function next() {
      while (i < list.length && !list[i]) i++;
      if (i >= list.length) return;
      img.src = list[i++];
    }
    img.onerror = function () {
      if (i < list.length) next();
    };
    next();
    return img;
  };

  G.portraitUrls = function (k, folder) {
    var name = "portrait-" + k + ".png";
    var urls = [];
    if (folder) urls.push("img/" + folder + "/" + name);
    if (folder !== "aliados") urls.push("img/aliados/" + name);
    if (folder !== "inimigos") urls.push("img/inimigos/" + name);
    urls.push("img/" + name);
    return urls;
  };

  G.stageBgUrls = function (src) {
    var s = String(src || "");
    var urls = [s];
    if (s.indexOf("img/cenarios/") === 0) urls.push(s.replace("img/cenarios/", "img/"));
    else if (/^img\/bg-/.test(s)) urls.push(s.replace("img/", "img/cenarios/"));
    return urls;
  };

  function loadPortrait(k, folder) {
    if (G.portraitImgs[k]) return;
    G.portraitImgs[k] = G.loadImg(G.portraitUrls(k, folder));
  }

  G.preloadPortraits = function () {
    var kinds = (G.unitList && G.unitList()) || ["comandante", "recruta", "fuzileiro", "pistoleiro", "batedor"];
    for (var i = 0; i < kinds.length; i++) loadPortrait(kinds[i], "aliados");
    if (G.ENEMY_DEFS) {
      Object.keys(G.ENEMY_DEFS).forEach(function (k) {
        var d = G.ENEMY_DEFS[k];
        if (d && d.boss && !d.codexHide && !d.fake) loadPortrait(k, "inimigos");
      });
      var extra = ["fuzileiro_alien", "batedor_alien", "pistoleiro_alien", "fogueira", "kaska_sentry", "abelha_enfermeira", "abelha_arquiteta", "chefe_comandante_p2"];
      for (var ei = 0; ei < extra.length; ei++) loadPortrait(extra[ei], "inimigos");
    }
  };

  G.playfield = function (state) {
    var z = state.camZoom || 1;
    var m = 10;
    return {
      x0: state.W / 2 * (1 - 1 / z) + m,
      y0: state.H / 2 * (1 - 1 / z) + m,
      x1: state.W / 2 * (1 + 1 / z) - m,
      y1: state.H / 2 * (1 + 1 / z) - m
    };
  };

  G.screenToWorld = function (state, sx, sy) {
    var z = state.camZoom || 1;
    return {
      x: (sx - state.W / 2) / z + state.W / 2,
      y: (sy - state.H / 2) / z + state.H / 2
    };
  };

  G.applyCamera = function (ctx, state) {
    var z = state.camZoom || 1;
    var lx = state.camLook && state.camLook.x != null ? state.camLook.x : state.W / 2;
    var ly = state.camLook && state.camLook.y != null ? state.camLook.y : state.H / 2;
    ctx.translate(state.W / 2, state.H / 2);
    ctx.scale(z, z);
    ctx.translate(-lx, -ly);
  };

  G.clampPlay = function (e, state) {
    var b = G.playfield(state);
    var m = (e.def && e.def.size) || 12;
    e.x = Math.max(b.x0 + m, Math.min(b.x1 - m, e.x));
    e.y = Math.max(b.y0 + m, Math.min(b.y1 - m, e.y));
  };

  G.drawIncomingArrows = function (ctx, state) {
    if (!state || state.defeat || (state.mode && state.mode !== "play")) return;
    var b = G.playfield(state);
    if (!b) return;
    var inset = 18;
    var bin = 52;
    var reach = 78;
    var groups = {};

    function addMark(x, y, urg) {
      urg = urg == null ? 0.35 : urg;
      if (urg < 0) urg = 0;
      if (urg > 1) urg = 1;
      var left = x - b.x0;
      var right = b.x1 - x;
      var top = y - b.y0;
      var bot = b.y1 - y;
      var outside = x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1;
      var near = Math.min(left, right, top, bot);
      if (!outside && near > reach) return;
      var edge;
      if (outside) {
        if (x < b.x0 && left <= top && left <= bot) edge = "L";
        else if (x > b.x1 && right <= top && right <= bot) edge = "R";
        else if (y < b.y0) edge = "T";
        else if (y > b.y1) edge = "B";
        else if (near === top) edge = "T";
        else if (near === bot) edge = "B";
        else if (near === left) edge = "L";
        else edge = "R";
      } else if (near === top) edge = "T";
      else if (near === bot) edge = "B";
      else if (near === left) edge = "L";
      else edge = "R";
      var ax;
      var ay;
      var ang;
      if (edge === "T") {
        ax = Math.max(b.x0 + 28, Math.min(b.x1 - 28, x));
        ay = b.y0 + inset;
        ang = Math.PI / 2;
      } else if (edge === "B") {
        ax = Math.max(b.x0 + 28, Math.min(b.x1 - 28, x));
        ay = b.y1 - inset;
        ang = -Math.PI / 2;
      } else if (edge === "L") {
        ax = b.x0 + inset;
        ay = Math.max(b.y0 + 28, Math.min(b.y1 - 28, y));
        ang = 0;
      } else {
        ax = b.x1 - inset;
        ay = Math.max(b.y0 + 28, Math.min(b.y1 - 28, y));
        ang = Math.PI;
      }
      var key = edge + ":" + Math.round((edge === "L" || edge === "R" ? ay : ax) / bin);
      var g = groups[key];
      if (!g) {
        groups[key] = { x: ax, y: ay, ang: ang, n: 1, urg: urg };
      } else {
        g.x = (g.x * g.n + ax) / (g.n + 1);
        g.y = (g.y * g.n + ay) / (g.n + 1);
        g.n += 1;
        if (urg > g.urg) g.urg = urg;
      }
    }

    var i;
    var e;
    if (state.enemies) {
      for (i = 0; i < state.enemies.length; i++) {
        e = state.enemies[i];
        if (!e || e.hp <= 0 || e.stolen || !e.edgeWarn) continue;
        var insidePad = Math.min(e.x - b.x0, b.x1 - e.x, e.y - b.y0, b.y1 - e.y);
        if (insidePad > reach) {
          e.edgeWarn = false;
          continue;
        }
        var distOut = 0;
        if (e.x < b.x0) distOut = Math.max(distOut, b.x0 - e.x);
        if (e.x > b.x1) distOut = Math.max(distOut, e.x - b.x1);
        if (e.y < b.y0) distOut = Math.max(distOut, b.y0 - e.y);
        if (e.y > b.y1) distOut = Math.max(distOut, e.y - b.y1);
        var edgeUrg = distOut > 0
          ? 1 - Math.min(1, distOut / 90)
          : 1 - Math.min(1, insidePad / reach);
        addMark(e.x, e.y, Math.max(0.2, edgeUrg));
      }
    }
    var res = G.resolutionInfo ? G.resolutionInfo(state) : null;
    var interval = (res && res.spawnInterval) || 0.28;
    var cap = (res && res.concurrent) || 10;
    var living = 0;
    if (state.enemies) {
      for (i = 0; i < state.enemies.length; i++) {
        e = state.enemies[i];
        if (e && e.hp > 0 && !e.stolen && !e.scenery && !(e.def && e.def.boss)) living++;
      }
    }
    var blocked = living >= cap;
    if (state.spawnQueue) {
      for (i = 0; i < state.spawnQueue.length; i++) {
        e = state.spawnQueue[i];
        if (!e || typeof e === "string" || e.x == null) continue;
        var eta = (state.spawnTimer || 0) + i * interval;
        if (blocked) eta += 0.5 + i * 0.1;
        var timeUrg = 1 - eta / 1.05;
        addMark(e.x, e.y, Math.max(0.08, Math.min(1, timeUrg)));
      }
    }

    var t = state.time || 0;
    var key;
    for (key in groups) {
      if (!Object.prototype.hasOwnProperty.call(groups, key)) continue;
      var g = groups[key];
      var urg = g.urg || 0.3;
      var freq = 6 + urg * urg * 36;
      var blink;
      if (urg > 0.82) {
        blink = ((t * freq) % 1) < (0.42 - urg * 0.12) ? 1 : 0.06;
      } else if (urg > 0.45) {
        blink = Math.sin(t * freq) > 0.15 ? 0.95 : 0.18;
      } else {
        blink = 0.5 + Math.sin(t * freq) * 0.28;
      }
      var s = 11 + Math.min(7, (g.n - 1) * 1.6) + urg * 3;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.ang);
      ctx.globalAlpha = 0.28 + blink * (0.5 + urg * 0.5);
      ctx.shadowColor = "#ff1a1a";
      ctx.shadowBlur = 10 + urg * 16;
      ctx.fillStyle = urg > 0.75 ? "#ff1111" : "#ff2d2d";
      ctx.beginPath();
      ctx.moveTo(s + 2, 0);
      ctx.lineTo(-s * 0.62, s * 0.78);
      ctx.lineTo(-s * 0.18, 0);
      ctx.lineTo(-s * 0.62, -s * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255, 220, 220, 0.95)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    }
  };

  G.createPlayerUnit = function (x, y, kind, run, perm) {
    kind = G.unitKind(kind);
    var def = G.UNIT_DEFS[kind] || G.UNIT_DEFS.recruta;
    var hpMul = (run && run.hp ? run.hp : 1) * (1 + (perm ? perm.hp : 0) * 0.1) * (1 + (perm ? perm.choque : 0) * 0.06);
    var hp = Math.round(def.hp * hpMul);
    return {
      id: uid(),
      team: "player",
      kind: def.kind,
      gen: def.gen,
      commander: def.role === "commander",
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      rot: 0,
      hp: hp,
      maxHp: hp,
      cooldown: 0,
      flash: 0,
      rotor: Math.random() * Math.PI * 2,
      gait: Math.random() * Math.PI * 2,
      wheel: Math.random() * Math.PI * 2,
      held: false,
      parasite: 0,
      activeCd: 0,
      activeSlot: -1,
      activeFlash: 0,
      marked: 0,
      spawnT: def.spawn || 0,
      poisonT: 0,
      def: def
    };
  };

  G.createEnemy = function (type, x, y, scale) {
    var def = G.ENEMY_DEFS[type];
    if (!def) return null;
    var s = type === "larva" ? 1 : scale || 1;
    var hp = Math.round(def.hp * s);
    return {
      id: uid(),
      team: "enemy",
      type: type,
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      hp: hp,
      maxHp: hp,
      cooldown: 0,
      flash: 0,
      phase: Math.random() * Math.PI * 2,
      chargeT: type === "chefe_megatanque" ? 1.25 : 0,
      spawnT: type === "ninho" ? 0.55 : type === "chefe_fortaleza" ? 3 : 2.2,
      nestStock: type === "ninho" ? 5 + ((Math.random() * 3) | 0) : 0,
      nestCharging: false,
      burstLeft: 0,
      burstCd: 0,
      contactCd: 0,
      slowT: 0,
      freezeT: 0,
      stealth: type === "sombra" ? 1 : 0,
      attached: null,
      warnT: 0,
      rot: 0,
      splits: !!def.splits,
      noDrop: type === "larva",
      fake: !!def.fake,
      decoy: !!def.fake,
      orbitHost: 0,
      orbitIndex: 0,
      guardianId: 0,
      helperOf: 0,
      bossPhase: type === "chefe_final" ? 1 : 0,
      lastHitT: 0,
      revealT: 0,
      parked: false,
      spinMode: 0,
      spinT: 0,
      skillT: 2.2,
      shieldBand: 0,
      shieldLockT: 0,
      shieldPending: false,
      shieldInited: false,
      throwWindup: 0,
      cascaDashT: 0,
      cascaLast: "",
      spinAcc: 0,
      chargeCount: 0,
      chargeWindup: 0,
      chargeWindupMax: 0,
      chargeAim: 0,
      chargeRico: false,
      ricoLeft: 0,
      miniT: 30,
      tpCount: 0,
      nextBoom: 3 + ((Math.random() * 4) | 0),
      cloneCd: [0, 0],
      veilRage: false,
      coreHealT: 6,
      coreRayT: 2.4,
      coreSummonT: 75,
      coreAct: "wait",
      coreActT: 1.1,
      coreLastAct: "",
      coreActDid: false,
      seqMode: 0,
      seqAcc: 0,
      cascaVolley: 0,
      seqWindup: 0,
      invasaoAct: "",
      invasaoT: 0.85,
      spawnWaveT: 6,
      kingMode: "",
      kingAct: "",
      kingT: 1.1,
      queenId: 0,
      kingId: 0,
      enrage: false,
      vultoAct: "",
      vultoT: 1.8,
      wormAct: "",
      wormT: 2.2,
      buried: false,
      wormSegs: null,
      pinOwner: 0,
      moonReady: 8,
      def: def
    };
  };

  G.createProjectile = function (opt) {
    return {
      id: uid(),
      x: opt.x,
      y: opt.y,
      vx: opt.vx,
      vy: opt.vy,
      dmg: opt.dmg,
      team: opt.team,
      kind: opt.kind || "bullet",
      life: opt.life || 1.2,
      r: opt.r || 3,
      ricochet: !!opt.ricochet,
      ricoLeft: opt.ricoLeft || 0,
      pierce: !!opt.pierce,
      pierceGrow: opt.pierceGrow || 0,
      homing: !!opt.homing,
      homeId: opt.homeId || 0,
      homeCursor: !!opt.homeCursor,
      poison: !!opt.poison,
      fake: !!opt.fake,
      boomR: opt.boomR || 0,
      hitIds: {},
      hitsLeft: opt.hitsLeft || 1,
      wallBounce: opt.wallBounce || 0,
      bounceMul: opt.bounceMul || 3,
      eraseShots: !!opt.eraseShots,
      stealShots: !!opt.stealShots,
      ownerKind: opt.ownerKind || "",
      fromId: opt.fromId || 0,
      pairId: opt.pairId || 0,
      sticky: !!opt.sticky,
      fromBoss: !!opt.fromBoss,
      burn: !!opt.burn,
      arc: opt.arc || null,
      z: opt.z || 0,
      color: opt.color || ""
    };
  };

  G.createDrop = function (x, y, kind, extra) {
    return {
      id: uid(),
      x: x,
      y: y,
      kind: kind,
      value: extra && extra.value ? extra.value : 1,
      unitKind: extra && extra.unitKind ? extra.unitKind : "recruta",
      t: 0,
      life: extra && extra.life != null ? extra.life : 15,
      maxLife: extra && extra.life != null ? extra.life : 15
    };
  };

  G.createFloater = function (x, y, text, color) {
    return { x: x, y: y, text: text, color: color || "#fff", life: 0.7, max: 0.7 };
  };

  G.boomFx = function (state, x, y, radius, color) {
    if (!state.booms) state.booms = [];
    state.booms.push({
      x: x,
      y: y,
      r: Math.min(Math.max(1, radius || 40), 320),
      t: 0.42,
      max: 0.42,
      color: color || "#ffb45a"
    });
  };

  G.healFx = function (state, x, y) {
    for (var i = 0; i < 6; i++) {
      state.particles.push({
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 12 - 4,
        vx: (Math.random() - 0.5) * 24,
        vy: -28 - Math.random() * 46,
        life: 0.5 + Math.random() * 0.28,
        max: 0.72,
        size: 5 + Math.random() * 4,
        color: "#3dff7a",
        cross: true
      });
    }
  };

  G.burst = function (state, x, y, color, n, speed) {
    n = n || 10;
    speed = speed || 90;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = speed * (0.4 + Math.random());
      state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.25,
        max: 0.6,
        size: 2 + Math.random() * 3,
        color: color
      });
    }
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function teslaBattBar(ctx, u) {
    var batt = u.teslaBatt == null ? 1 : u.teslaBatt;
    var live = batt > 0.02;
    var s = u.def.size;
    var lift = u.held ? 6 : (u.leapZ || 0);
    var h = Math.max(18, s * 1.45);
    var w = 5;
    var bx = u.x + s + 5;
    var by = u.y - lift - h * 0.55;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(bx - 1.2, by - 1.2, w + 2.4, h + 2.4);
    ctx.fillStyle = "#142028";
    ctx.fillRect(bx, by, w, h);
    var fh = h * Math.max(0, Math.min(1, batt));
    ctx.fillStyle = !live ? "#4a5560" : batt < 0.28 ? "#ff8a4a" : "#7af7ff";
    if (live && batt < 1) {
      ctx.shadowColor = batt < 0.28 ? "#ff8a4a" : "#7af7ff";
      ctx.shadowBlur = 6;
    }
    ctx.fillRect(bx, by + h - fh, w, fh);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = live ? "rgba(168,246,255,0.9)" : "rgba(120,140,160,0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - 0.5, by - 0.5, w + 1, h + 1);
    ctx.fillStyle = live ? "#a8f6ff" : "#6a7480";
    ctx.font = "bold 8px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("⚡", bx + w / 2, by - 1);
    ctx.restore();
  }

  function hpBar(ctx, e) {
    if (e.def.boss) return;
    if (e.fallen || e.scenery) return;
    if ((e.stealth || 0) > 0.2 && (e.revealT || 0) <= 0) return;
    var glow = e.healGlow || 0;
    var stolen = !!e.stolen;
    if (e.hp >= e.maxHp * 0.98 && glow <= 0 && !stolen && (e.burnT || 0) <= 0) return;
    var w = Math.max(16, e.def.size * 2);
    var bx = e.x - w / 2;
    var by = e.y - e.def.size - 10;
    ctx.save();
    if (glow > 0) {
      ctx.shadowColor = "#5cff8a";
      ctx.shadowBlur = 8 + glow * 14;
    }
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(bx, by, w, 4);
    ctx.fillStyle = glow > 0 ? "#b8ffc8" : (e.team === "player" || stolen ? "#6cff7a" : "#ff5a5a");
    ctx.fillRect(bx, by, w * Math.max(0, Math.min(1, e.hp / e.maxHp)), 4);
    if ((e.burnT || 0) > 0) {
      var flick = 0.45 + 0.55 * Math.max(0, Math.sin((e.phase || 0) * 16));
      ctx.fillStyle = "rgba(255, 140, 40, " + (0.55 + flick * 0.4) + ")";
      ctx.fillRect(bx, by + 4, w * Math.min(1, e.burnT / 5), 2);
    }
    if (stolen) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(bx, by + 5, w, 3);
      ctx.fillStyle = "#c86a3a";
      ctx.fillRect(bx, by + 5, w * Math.max(0, Math.min(1, (e.stolenT || 0) / (e.stolenMax || 30))), 3);
    }
    if (glow > 0) {
      ctx.strokeStyle = "rgba(92, 255, 138," + Math.min(1, glow) + ")";
      ctx.lineWidth = 1.6;
      ctx.strokeRect(bx - 1, by - 1, w + 2, 6);
    }
    ctx.restore();
  }

  function label(ctx, u) {
    ctx.font = "bold 9px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(u.def.short, 0.5, u.def.size + 3);
    ctx.fillStyle = u.def.accent;
    ctx.fillText(u.def.short, 0, u.def.size + 2);
  }

  function hexParts(hex) {
    hex = String(hex || "#888888").replace("#", "");
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return [parseInt(hex.slice(0, 2), 16) || 0, parseInt(hex.slice(2, 4), 16) || 0, parseInt(hex.slice(4, 6), 16) || 0];
  }

  function liftCol(hex, t) {
    var p = hexParts(hex);
    return "rgb(" + Math.round(p[0] + (255 - p[0]) * t) + "," + Math.round(p[1] + (255 - p[1]) * t) + "," + Math.round(p[2] + (255 - p[2]) * t) + ")";
  }

  function dimCol(hex, t) {
    var p = hexParts(hex);
    return "rgb(" + Math.round(p[0] * t) + "," + Math.round(p[1] * t) + "," + Math.round(p[2] * t) + ")";
  }

  function gleam(ctx, x, y, rx, ry, a) {
    ctx.fillStyle = "rgba(255,255,255," + a + ")";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, -0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  function fillRound(ctx, x, y, w, h, r, color) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
  }

  function soldierLegs(ctx, s, gait, moving, color) {
    var amp = moving ? s * 0.38 : s * 0.07;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (var i = 0; i < 2; i++) {
      var side = i ? 1 : -1;
      var phase = gait + (i ? Math.PI : 0);
      var swing = Math.sin(phase) * amp;
      var lift = moving ? Math.max(0, Math.cos(phase)) * s * 0.15 : 0;
      var y = side * s * 0.2;
      ctx.strokeStyle = dimCol(color, 0.45);
      ctx.lineWidth = Math.max(2.8, s * 0.22);
      ctx.beginPath();
      ctx.moveTo(-s * 0.04, y);
      ctx.lineTo(swing * 0.5, y + side * (s * 0.2 - lift * 0.55));
      ctx.lineTo(swing, y + side * (s * 0.46 - lift * 0.22));
      ctx.stroke();
      oval(ctx, swing + 1, y + side * (s * 0.48 - lift * 0.2), s * 0.16, s * 0.09, "#161018");
    }
  }

  function drawWheel(ctx, x, y, r, ang, rim) {
    oval(ctx, x, y, r, r * 0.42, "#12151c");
    oval(ctx, x, y, r * 0.86, r * 0.34, rim || "#3a4250");
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.42);
    ctx.rotate(ang);
    ctx.strokeStyle = "rgba(220,230,240,0.7)";
    ctx.lineWidth = Math.max(1.1, r * 0.16);
    ctx.lineCap = "round";
    for (var i = 0; i < 4; i++) {
      var a = (Math.PI / 2) * i;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18);
      ctx.lineTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72);
      ctx.stroke();
    }
    ctx.restore();
    oval(ctx, x, y, r * 0.22, r * 0.1, "#8a94a4");
  }

  function drawTreads(ctx, x, y, w, h, scroll) {
    fillRound(ctx, x, y, w, h, 3, "#141820");
    ctx.save();
    roundRect(ctx, x, y, w, h, 3);
    ctx.clip();
    ctx.fillStyle = "#2c3444";
    var gap = 6;
    var off = ((scroll % gap) + gap) % gap;
    for (var i = -1; i < w / gap + 2; i++) {
      ctx.fillRect(x + i * gap + off, y + 1, 3.2, h - 2);
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, 3);
    ctx.stroke();
  }

  function visor(ctx, x, y, w, h, color) {
    fillRound(ctx, x, y, w, h, 2, color);
    gleam(ctx, x + w * 0.35, y + h * 0.28, w * 0.28, h * 0.18, 0.35);
  }

  function barrel(ctx, x, y, len, thick, color) {
    fillRound(ctx, x, y - thick / 2, len, thick, 1.4, color || "#121828");
    fillRound(ctx, x + len - 5, y - thick / 2 - 1, 6, thick + 2, 1, "#2a3448");
  }

  function rotorDisc(ctx, s, ang, span) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#d8f4ff";
    ctx.beginPath();
    ctx.arc(0, 0, span, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.rotate(ang);
    ctx.strokeStyle = "rgba(230,248,255,0.85)";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-span, 0);
    ctx.lineTo(span, 0);
    ctx.moveTo(0, -span);
    ctx.lineTo(0, span);
    ctx.stroke();
    ctx.restore();
  }

  function commanderFallPose(t) {
    t = Math.max(0, t || 0);
    if (t < 0.28) {
      var a = t / 0.28;
      return { rot: -0.16 * (1 - a) + 0.1 * a, sink: 2 + a * 3, squish: 1.05 - a * 0.03, ring: 1 - a };
    }
    if (t < 1.55) {
      var b = (t - 0.28) / 1.27;
      b = b * b * (3 - 2 * b);
      return { rot: 0.1 + b * 0.52, sink: 5 + b * 9, squish: 1.02 - b * 0.06, ring: 0 };
    }
    if (t < 2.55) {
      var c = (t - 1.55) / 1.0;
      var e = 1 - (1 - c) * (1 - c);
      return { rot: 0.62 + e * 0.94, sink: 14 + e * 5, squish: 0.96 - e * 0.08, ring: 0 };
    }
    var d = Math.min(1, (t - 2.55) / 0.7);
    var bounce = Math.sin(d * Math.PI) * 0.07 * (1 - d);
    return { rot: 1.56 - bounce, sink: 19, squish: 0.88 + bounce * 0.35, ring: 0 };
  }

  function drawWarAxe(ctx, s, rot, side) {
    ctx.save();
    ctx.rotate(rot);
    ctx.scale(1, side < 0 ? -1 : 1);
    ctx.strokeStyle = "#3a2410";
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(2.4, s * 0.15);
    ctx.beginPath();
    ctx.moveTo(-s * 0.08, s * 0.18);
    ctx.lineTo(s * 1.18, -s * 0.12);
    ctx.stroke();
    ctx.strokeStyle = "#c9a06a";
    ctx.lineWidth = Math.max(1.1, s * 0.06);
    ctx.beginPath();
    ctx.moveTo(s * 0.05, s * 0.12);
    ctx.lineTo(s * 0.95, -s * 0.08);
    ctx.stroke();
    ctx.translate(s * 1.12, -s * 0.12);
    ctx.rotate(-0.15);
    ctx.fillStyle = "#6a1810";
    ctx.beginPath();
    ctx.moveTo(-2, -s * 0.28);
    ctx.quadraticCurveTo(s * 0.55, -s * 0.08, s * 0.08, s * 0.32);
    ctx.lineTo(-1, s * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c41e3a";
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.22);
    ctx.quadraticCurveTo(s * 0.42, -s * 0.04, 2, s * 0.22);
    ctx.lineTo(1, s * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffe0c4";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(s * 0.06, -s * 0.16);
    ctx.quadraticCurveTo(s * 0.3, -0.02, s * 0.08, s * 0.14);
    ctx.stroke();
    ctx.restore();
  }

  G.drawWarlordEscort = function (ctx, w, time) {
    if (!w) return;
    var dummy = {
      x: w.x,
      y: w.y,
      kind: "warlord",
      def: { size: w.size || 9, color: "#6a3220", accent: "#c41e3a", role: "warlord", flying: false },
      rot: w.rot || 0,
      hp: 1,
      maxHp: 1,
      id: w.id || -700,
      gait: (time || 0) * 2.4 + (w.id || 0),
      vx: w.vx || 0,
      vy: 0,
      leapZ: w.leapZ || 0,
      escort: true
    };
    G.drawPlayerUnit(ctx, dummy, time);
  };

  G.drawPlayerUnit = function (ctx, u, time) {
    if (u.stowed) return;
    var s = u.def.size;
    var lift = u.held ? 6 : (u.leapZ || 0);
    var role = u.def.role;
    var kind = u.kind;
    var timeN = time || 0;
    var idOff = (u.id || 1) * 0.71;
    var fallT = u.fallT || 0;
    var falling = !!(u.commander && fallT > 0 && !(u.ashT > 0.15));
    var pose = falling ? commanderFallPose(fallT) : null;
    if (u.commander && (u.ashT || 0) > 0.78) {
      ctx.save();
      ctx.translate(u.x, u.y + 6);
      ctx.fillStyle = "rgba(12, 8, 6, 0.45)";
      ctx.beginPath();
      ctx.ellipse(2, 8, s * 1.15, s * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a2a18";
      ctx.beginPath();
      ctx.ellipse(0, 2, s * 0.85, s * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6a5438";
      ctx.beginPath();
      ctx.ellipse(-s * 0.12, 0, s * 0.55, s * 0.16, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1008";
      ctx.beginPath();
      ctx.ellipse(s * 0.18, 1, s * 0.22, s * 0.1, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    var spd = Math.hypot(u.vx || 0, u.vy || 0);
    var moving = !u.held && !falling && spd > 24;
    var breath = falling ? 1 : 1 + Math.sin(timeN * 3.3 + idOff) * (u.def.flying ? 0.016 : 0.042);
    var gait = u.gait || 0;
    var wheel = u.wheel || 0;
    var bob = moving && !u.def.flying ? Math.abs(Math.sin(gait * 2)) * s * 0.06 : 0;
    var hover = u.def.flying && !falling ? Math.sin(timeN * 5.2 + idOff) * 2.4 : 0;
    var col = u.def.color;
    var acc = u.def.accent;
    ctx.save();
    ctx.translate(u.x, u.y - lift - bob - hover + (pose ? pose.sink : 0));
    var packS = u.packed ? 1.12 : 1;
    var popS = u.popT > 0 ? 0.42 + 0.58 * (1 - Math.min(1, u.popT / 0.16)) : 1;
    if (packS !== 1 || popS !== 1) ctx.scale(packS * popS, packS * popS);
    if (u.flash > 0) ctx.globalAlpha = 0.65;
    var teslaOff = role === "tesla" && !u.preview && (u.teslaBatt == null ? 1 : u.teslaBatt) <= 0.02;
    if (teslaOff) ctx.globalAlpha *= 0.42;
    if (falling) ctx.globalAlpha *= 0.92;
    ctx.fillStyle = "rgba(0,0,0," + (falling ? 0.42 : 0.32) + ")";
    ctx.beginPath();
    ctx.ellipse(
      falling ? 10 : (u.def.flying ? 4 : 0),
      s * (u.def.flying ? 1.28 : 0.95) + hover,
      s * (falling ? 1.15 : (u.def.flying ? 0.7 : 0.95)),
      s * (falling ? 0.22 : (u.def.flying ? 0.2 : 0.32)),
      falling ? 0.4 : 0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    if (role === "commander" && !(pose && pose.ring < 0.15)) {
      var ringA = pose ? pose.ring : 1;
      ctx.globalAlpha *= ringA;
      ctx.strokeStyle = "rgba(255, 224, 138, 0.4)";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(0, 2, s + 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#ffe08a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 2, s + 8, 0, Math.PI * 2);
      ctx.stroke();
      if (pose) ctx.globalAlpha /= ringA || 1;
    }
    ctx.rotate((u.rot || 0) + (pose ? pose.rot : 0));
    if (pose) ctx.scale(1, pose.squish);

    if (role === "commander") {
      soldierLegs(ctx, s, falling ? 0 : gait, moving, "#2a1a08");
      var cape = falling ? s * 0.22 : Math.sin(timeN * 4.2 + idOff) * s * 0.14;
      ctx.fillStyle = "#3a2208";
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.25);
      ctx.quadraticCurveTo(-s * 1.25 + cape, falling ? s * 0.35 : 0, -s * 0.35, s * 0.7);
      ctx.lineTo(-s * 0.05, s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.scale(breath, breath);
      oval(ctx, 0, 0, s * 0.78, s * 0.92, dimCol(col, falling ? 0.55 : 0.72));
      oval(ctx, 0.6, -0.4, s * 0.68, s * 0.82, falling ? dimCol(col, 0.82) : col);
      gleam(ctx, -s * 0.18, -s * 0.28, s * 0.28, s * 0.16, falling ? 0.06 : 0.2);
      ctx.fillStyle = "#8a1a1a";
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.08);
      ctx.lineTo(s * 0.62, s * 0.12);
      ctx.lineTo(s * 0.55, s * 0.32);
      ctx.lineTo(-s * 0.55, s * 0.1);
      ctx.closePath();
      ctx.fill();
      oval(ctx, 0, -s * 0.52, s * 0.62, s * 0.26, "#2a1a00");
      ctx.fillStyle = "#ffe08a";
      ctx.fillRect(-s * 0.66, -s * 0.48, s * 1.32, 3);
      visor(ctx, s * 0.08, -s * 0.18, s * 0.42, s * 0.28, falling ? "#0a1018" : "#0b1a33");
      ctx.fillStyle = falling ? "#c8a84a" : "#ffe08a";
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.12);
      ctx.lineTo(s * 0.2, s * 0.26);
      ctx.lineTo(-s * 0.2, s * 0.26);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      barrel(ctx, s * 0.35, falling ? s * 0.18 : 0, s * 0.85, 4, "#0b1a33");
      if (!falling) {
        ctx.strokeStyle = "#fff4c4";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, s + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (u.def.flying && (role === "drone")) {
      var arm = s * 0.85;
      for (var d = 0; d < 4; d++) {
        var da = (Math.PI / 2) * d + Math.PI / 4;
        var dx = Math.cos(da) * arm;
        var dy = Math.sin(da) * arm;
        ctx.strokeStyle = dimCol(col, 0.55);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(dx, dy);
        ctx.stroke();
        ctx.save();
        ctx.translate(dx, dy);
        rotorDisc(ctx, s, (u.rotor || 0) + d, s * 0.38);
        ctx.restore();
      }
      ctx.save();
      ctx.scale(breath, breath);
      oval(ctx, 0, 0, s * 0.48, s * 0.38, dimCol(col, 0.7));
      oval(ctx, 0, 0, s * 0.38, s * 0.28, col);
      visor(ctx, s * 0.02, -s * 0.12, s * 0.32, s * 0.22, acc);
      gleam(ctx, -s * 0.1, -s * 0.08, s * 0.14, s * 0.08, 0.28);
      ctx.restore();
    } else if (u.def.flying) {
      rotorDisc(ctx, s, u.rotor || 0, s * 1.48);
      ctx.save();
      ctx.scale(1, breath);
      fillRound(ctx, -s * 0.95, -s * 0.32, s * 1.55, s * 0.64, 7, dimCol(col, 0.62));
      fillRound(ctx, -s * 0.82, -s * 0.24, s * 1.35, s * 0.48, 6, col);
      visor(ctx, s * 0.05, -s * 0.16, s * 0.42, s * 0.3, "#083040");
      gleam(ctx, -s * 0.35, -s * 0.12, s * 0.28, s * 0.1, 0.2);
      if (role === "gunship" || kind === "bombardeiro") {
        fillRound(ctx, -s * 0.2, s * 0.18, s * 0.7, s * 0.16, 2, "#1a2430");
        oval(ctx, s * 0.15, s * 0.28, 3, 3, "#ff7a2a");
      }
      ctx.restore();
      fillRound(ctx, -s * 1.15, -3, s * 0.4, 6, 2, dimCol(col, 0.5));
      barrel(ctx, s * 0.45, 0, s * 0.7, role === "gunship" ? 5 : 3.5, "#0b1a33");
      ctx.save();
      ctx.translate(-s * 1.05, 0);
      ctx.rotate((u.rotor || 0) * 1.8);
      ctx.strokeStyle = "rgba(230,248,255,0.7)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-s * 0.28, 0);
      ctx.lineTo(s * 0.28, 0);
      ctx.stroke();
      ctx.restore();
    } else if (role === "colossus") {
      var CA = u.coloAct;
      var cStyle = CA ? CA.style : "";
      var cPhase = CA ? CA.phase : "";
      var slamUp = cStyle === "slam" && (cPhase === "dash" || cPhase === "rise") ? 1 : 0;
      var slamHit = cStyle === "slam" && (cPhase === "fall" || cPhase === "hold") ? 1 : 0;
      var bashFwd = Math.max(0, Math.min(1, u.coloBashK || 0));
      var punchExt = Math.max(0, Math.min(1, u.coloPunchK || 0));
      var fistGone = (u.coloFistT || 0) > 0.08;
      var glow = !!u.coloGlow;
      var corePulse = glow ? 0.55 + Math.sin(timeN * 14 + idOff) * 0.35 : 0.22 + Math.sin(timeN * 4 + idOff) * 0.08;
      var squat = slamHit ? 0.84 : 1 + Math.sin(gait) * (moving ? 0.02 : 0);
      if (u.coloSquash) squat = Math.min(squat, 1 - u.coloSquash);
      var lean = slamUp * -0.2 + bashFwd * 0.22 + punchExt * 0.1 + (glow ? (u.coloSlashK || 0) * 0.16 : 0);
      ctx.save();
      ctx.scale(1, squat);
      ctx.rotate(lean);
      var legSwing = moving ? Math.sin(gait) * s * 0.12 : 0;
      fillRound(ctx, -s * 0.52, s * 0.22 + legSwing, s * 0.34, s * 0.62, 4, "#1c2838");
      fillRound(ctx, s * 0.18, s * 0.22 - legSwing, s * 0.34, s * 0.62, 4, "#1c2838");
      fillRound(ctx, -s * 0.48, s * 0.55 + legSwing, s * 0.38, s * 0.22, 3, "#2a3848");
      fillRound(ctx, s * 0.14, s * 0.55 - legSwing, s * 0.38, s * 0.22, 3, "#2a3848");
      fillRound(ctx, -s * 0.44, s * 0.72 + legSwing, s * 0.32, s * 0.1, 2, "#0b1520");
      fillRound(ctx, s * 0.18, s * 0.72 - legSwing, s * 0.32, s * 0.1, 2, "#0b1520");
      if (glow) {
        ctx.strokeStyle = "rgba(122, 247, 255, " + (0.25 + corePulse * 0.4) + ")";
        ctx.lineWidth = 2;
        ctx.strokeRect(-s * 0.5, s * 0.28, s * 0.28, s * 0.4);
        ctx.strokeRect(s * 0.22, s * 0.28, s * 0.28, s * 0.4);
      }
      ctx.save();
      ctx.scale(breath, breath);
      fillRound(ctx, -s * 0.78, -s * 0.58, s * 1.56, s * 1.12, 7, "#2a4058");
      fillRound(ctx, -s * 0.62, -s * 0.46, s * 1.24, s * 0.9, 6, col);
      fillRound(ctx, -s * 0.7, -s * 0.22, s * 0.22, s * 0.55, 3, "#1a2838");
      fillRound(ctx, s * 0.48, -s * 0.22, s * 0.22, s * 0.55, 3, "#1a2838");
      gleam(ctx, -s * 0.28, -s * 0.34, s * 0.38, s * 0.12, glow ? 0.35 : 0.16);
      oval(ctx, 0, -s * 0.06, s * 0.22, s * 0.2, glow ? "#e8ffff" : acc);
      ctx.globalAlpha = corePulse;
      ctx.strokeStyle = acc;
      ctx.lineWidth = glow ? 3.2 : 2;
      ctx.beginPath();
      ctx.arc(0, -s * 0.06, s * 0.32 + (glow ? Math.sin(timeN * 10) * 2 : 0), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (glow) {
        ctx.strokeStyle = "rgba(122, 247, 255, 0.55)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-s * 0.42, s * 0.12);
        ctx.lineTo(-s * 0.08, -s * 0.04);
        ctx.lineTo(s * 0.08, -s * 0.04);
        ctx.lineTo(s * 0.42, s * 0.12);
        ctx.stroke();
      }
      fillRound(ctx, -s * 0.28, -s * 0.82, s * 0.56, s * 0.32, 4, "#1a2838");
      fillRound(ctx, -s * 0.22, -s * 0.78, s * 0.44, s * 0.2, 3, dimCol(col, 0.7));
      visor(ctx, -s * 0.14, -s * 0.74, s * 0.36, s * 0.14, glow ? "#e8ffff" : acc);
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, -s * 0.88);
      ctx.lineTo(s * 0.08, -s * 0.88);
      ctx.lineTo(0, -s * 1.05);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.save();
      var shx = -s * 0.95 + bashFwd * s * 1.62;
      var shy = -s * 0.08 + slamUp * -s * 0.55 + slamHit * s * 0.35 + bashFwd * s * 0.02;
      ctx.translate(shx, shy);
      ctx.rotate(-0.2 + bashFwd * 0.48 + slamUp * -0.7 + slamHit * 0.85);
      fillRound(ctx, -s * 0.18, -s * 0.72, s * 0.42, s * 1.48, 5, "#1c2838");
      fillRound(ctx, -s * 0.1, -s * 0.62, s * 0.3, s * 1.28, 4, "#4a6a88");
      ctx.strokeStyle = acc;
      ctx.globalAlpha = 0.7 + bashFwd * 0.3;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(s * 0.04, 0, s * 0.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      gleam(ctx, -s * 0.02, -s * 0.4, s * 0.12, s * 0.2, 0.22);
      if (bashFwd > 0.12) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        var plate = s * (0.5 + bashFwd * 1.45);
        var hw = s * (0.4 + bashFwd * 0.58);
        ctx.globalAlpha = 0.3 + bashFwd * 0.55;
        ctx.fillStyle = "rgba(40, 120, 255, 0.5)";
        ctx.beginPath();
        ctx.moveTo(s * 0.1, -hw * 0.7);
        ctx.lineTo(plate * 0.55, -hw);
        ctx.quadraticCurveTo(plate * 0.95, -hw * 0.5, plate, 0);
        ctx.quadraticCurveTo(plate * 0.95, hw * 0.5, plate * 0.55, hw);
        ctx.lineTo(s * 0.1, hw * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(180, 230, 255, " + (0.45 + bashFwd * 0.55) + ")";
        ctx.lineWidth = 2.6;
        ctx.stroke();
        ctx.strokeStyle = "rgba(232, 246, 255, " + (0.4 + bashFwd * 0.5) + ")";
        ctx.lineWidth = 1.5;
        var hr = s * (0.16 + bashFwd * 0.12);
        var hi;
        ctx.beginPath();
        for (hi = 0; hi < 6; hi++) {
          var ha = -Math.PI / 2 + hi * Math.PI / 3;
          var hx = plate * 0.52 + Math.cos(ha) * hr;
          var hy = Math.sin(ha) * hr;
          if (hi === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      ctx.save();
      var slashK = glow ? Math.max(0, u.coloSlashK || 0) : 0;
      var fxArm = s * 0.55 + (fistGone && !glow ? 0 : punchExt * s * 0.55) + slashK * s * 0.12;
      var fyArm = slamUp * -s * 0.5 + slamHit * s * 0.42 + (fistGone && !glow ? 0 : punchExt * -s * 0.08);
      ctx.translate(fxArm, fyArm);
      ctx.rotate((fistGone && !glow ? 0 : punchExt * -0.12) + slamUp * -0.9 + slamHit * 1.1 - slashK * 0.85);
      fillRound(ctx, 0, -s * 0.16, s * 0.55, s * 0.32, 4, "#1c2838");
      if (glow) {
        fillRound(ctx, s * 0.38, -s * 0.2, s * 0.28, s * 0.4, 4, "#3a5a78");
        fillRound(ctx, s * 0.52, -s * 0.14, s * 0.22, s * 0.28, 3, "#e8f6ff");
        ctx.save();
        ctx.translate(s * 0.72, 0);
        ctx.globalCompositeOperation = "lighter";
        var blade = s * (2.35 + Math.sin(timeN * 16) * 0.06);
        ctx.fillStyle = "rgba(40, 130, 255, 0.35)";
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.12);
        ctx.lineTo(blade, -s * 0.04);
        ctx.lineTo(blade + s * 0.18, 0);
        ctx.lineTo(blade, s * 0.04);
        ctx.lineTo(0, s * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(122, 247, 255, 0.85)";
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.06);
        ctx.lineTo(blade, -s * 0.02);
        ctx.lineTo(blade + s * 0.12, 0);
        ctx.lineTo(blade, s * 0.02);
        ctx.lineTo(0, s * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(s * 0.04, 0);
        ctx.lineTo(blade * 0.98, 0);
        ctx.stroke();
        ctx.strokeStyle = "rgba(180, 240, 255, " + (0.4 + corePulse * 0.5) + ")";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(s * 0.2, -s * 0.05);
        ctx.lineTo(blade * 0.7, -s * 0.09);
        ctx.lineTo(blade * 0.85, 0);
        ctx.stroke();
        ctx.restore();
      } else if (fistGone) {
        fillRound(ctx, s * 0.38, -s * 0.14, s * 0.22, s * 0.28, 4, "#2a3848");
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = acc;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s * 0.62, 0, s * 0.22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        fillRound(ctx, s * 0.38 + punchExt * s * 0.08, -s * 0.28, s * 0.42, s * 0.56, 6, "#3a5a78");
        fillRound(ctx, s * 0.48 + punchExt * s * 0.08, -s * 0.22, s * 0.32, s * 0.44, 5, col);
        oval(ctx, s * 0.78 + punchExt * s * 0.1, 0, s * 0.16, s * 0.16, acc);
        if (punchExt > 0.2) {
          ctx.globalAlpha = 0.45 + punchExt * 0.5;
          ctx.strokeStyle = acc;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(s * 0.78, 0, s * 0.28 + punchExt * 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
      ctx.restore();
    } else if (role === "tank" || role === "minitank") {
      var scr = wheel * 18;
      var punch = Math.max(0, Math.min(1, (u.throwT || 0) / 0.34));
      punch = punch * punch;
      drawTreads(ctx, -s * 1.05, -s * 0.62, s * 2.1, s * 0.28, scr);
      drawTreads(ctx, -s * 1.05, s * 0.34, s * 2.1, s * 0.28, scr);
      ctx.save();
      ctx.translate(-punch * 6, Math.sin(timeN * 2.8 + idOff) * 0.6 - punch * 3);
      ctx.rotate(-punch * 0.2);
      fillRound(ctx, -s * 0.82, -s * 0.38, s * 1.64, s * 0.76, 5, dimCol(col, 0.55));
      fillRound(ctx, -s * 0.7, -s * 0.28, s * 1.4, s * 0.56, 5, col);
      gleam(ctx, -s * 0.28, -s * 0.16, s * 0.32, s * 0.1, 0.16);
      oval(ctx, s * 0.05, -s * 0.04, s * 0.38, s * 0.32, dimCol(col, 0.75));
      visor(ctx, s * 0.02, -s * 0.16, s * 0.36, s * 0.22, acc);
      barrel(ctx, s * 0.28 + punch * s * 0.32, -punch * 2, s * 1.05 + punch * s * 0.38, kind === "tanque" ? 7 : 5, acc);
      ctx.restore();
    } else if (role === "truck" || role === "bunker") {
      drawWheel(ctx, -s * 0.62, -s * 0.52, s * 0.28, wheel, "#4a5568");
      drawWheel(ctx, s * 0.55, -s * 0.52, s * 0.28, wheel, "#4a5568");
      drawWheel(ctx, -s * 0.62, s * 0.52, s * 0.28, wheel, "#4a5568");
      drawWheel(ctx, s * 0.55, s * 0.52, s * 0.28, wheel, "#4a5568");
      ctx.save();
      ctx.translate(0, Math.sin(timeN * 2.5 + idOff) * 0.5);
      fillRound(ctx, -s * 1.05, -s * 0.42, s * 2.1, s * 0.84, 4, "#2a3848");
      fillRound(ctx, -s * 0.55, -s * 0.5, s * 1.15, s * 0.78, 5, col);
      visor(ctx, s * 0.15, -s * 0.28, s * 0.42, s * 0.36, "#c8dce8");
      gleam(ctx, -s * 0.2, -s * 0.22, s * 0.28, s * 0.1, 0.14);
      if (role === "bunker") {
        fillRound(ctx, -s * 0.35, -s * 0.72, s * 0.7, s * 0.28, 3, acc);
      }
      ctx.restore();
    } else if (role === "miner" || role === "engineer") {
      drawWheel(ctx, -s * 0.55, -s * 0.48, s * 0.24, wheel, "#3a3220");
      drawWheel(ctx, s * 0.5, -s * 0.48, s * 0.24, wheel, "#3a3220");
      drawWheel(ctx, -s * 0.55, s * 0.48, s * 0.24, wheel, "#3a3220");
      drawWheel(ctx, s * 0.5, s * 0.48, s * 0.24, wheel, "#3a3220");
      fillRound(ctx, -s * 0.92, -s * 0.34, s * 1.84, s * 0.68, 4, "#2a2208");
      ctx.save();
      ctx.scale(breath, breath);
      oval(ctx, 0, -s * 0.08, s * 0.7, s * 0.58, col);
      visor(ctx, s * 0.08, -s * 0.22, s * 0.32, s * 0.24, "#111");
      gleam(ctx, -s * 0.16, -s * 0.18, s * 0.2, s * 0.08, 0.18);
      ctx.restore();
      fillRound(ctx, s * 0.2, -3, s * 0.85, 5, 1, "#111");
    } else if (role === "tesla" || role === "missile") {
      soldierLegs(ctx, s * 0.92, gait, moving, dimCol(col, 0.4));
      ctx.save();
      ctx.scale(breath, breath);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(s * 1.05, 0);
      ctx.lineTo(-s * 0.62, -s * 0.7);
      ctx.lineTo(-s * 0.28, 0);
      ctx.lineTo(-s * 0.62, s * 0.7);
      ctx.closePath();
      ctx.fill();
      gleam(ctx, -s * 0.1, -s * 0.18, s * 0.22, s * 0.1, 0.2);
      visor(ctx, s * 0.12, -s * 0.16, s * 0.32, s * 0.3, acc);
      if (role === "tesla") {
        if (!teslaOff) {
          ctx.strokeStyle = acc;
          ctx.globalAlpha = 0.55 + Math.sin(timeN * 18) * 0.35;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(-s * 0.15, 0, s * 0.38 + Math.sin(timeN * 12) * 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else {
        fillRound(ctx, -s * 0.55, -s * 0.22, s * 0.55, 5, 2, acc);
        fillRound(ctx, -s * 0.55, s * 0.12, s * 0.55, 5, 2, acc);
      }
      ctx.restore();
    } else if (role === "paladin" || kind === "phalanx") {
      soldierLegs(ctx, s * 1.05, gait, moving, "#2a3038");
      ctx.save();
      ctx.scale(breath, 1 + (breath - 1) * 0.45);
      oval(ctx, -s * 0.08, s * 0.08, s * 0.42, s * 0.55, "#4a2018");
      oval(ctx, 0, 0, s * 0.9, s * 0.82, dimCol(col, 0.52));
      oval(ctx, s * 0.04, -s * 0.06, s * 0.72, s * 0.64, col);
      gleam(ctx, -s * 0.14, -s * 0.22, s * 0.3, s * 0.12, 0.22);
      ctx.fillStyle = acc;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(-s * 0.42, -s * 0.08, s * 0.84, 3);
      ctx.globalAlpha = 1;
      oval(ctx, s * 0.08, -s * 0.08, s * 0.4, s * 0.36, dimCol(col, 0.7));
      fillRound(ctx, s * 0.18, -s * 0.18, s * 0.28, s * 0.12, 1.4, "#121820");
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.72);
      ctx.lineTo(s * 0.1, -s * 0.38);
      ctx.lineTo(-s * 0.1, -s * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(-s * 0.78, 0);
      fillRound(ctx, -s * 0.28, -s * 1.08, s * 0.56, s * 2.16, 5, "#2c3644");
      fillRound(ctx, -s * 0.2, -s * 0.96, s * 0.4, s * 1.92, 4, "#5a6a7a");
      ctx.strokeStyle = acc;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.72);
      ctx.lineTo(-s * 0.12, s * 0.08);
      ctx.lineTo(0, s * 0.72);
      ctx.stroke();
      oval(ctx, 0, 0, s * 0.12, s * 0.12, acc);
      gleam(ctx, -s * 0.08, -s * 0.55, s * 0.16, s * 0.22, 0.28);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = "#3a2810";
      ctx.lineWidth = Math.max(2.6, s * 0.16);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-s * 0.12, s * 0.18);
      ctx.lineTo(s * 1.42, -s * 0.08);
      ctx.stroke();
      ctx.strokeStyle = acc;
      ctx.lineWidth = Math.max(1.2, s * 0.07);
      ctx.beginPath();
      ctx.moveTo(s * 0.08, s * 0.14);
      ctx.lineTo(s * 1.18, -s * 0.05);
      ctx.stroke();
      ctx.translate(s * 1.42, -s * 0.08);
      ctx.rotate(-0.18);
      ctx.fillStyle = "#e8f0ff";
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.12);
      ctx.lineTo(s * 0.52, 0);
      ctx.lineTo(0, s * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(2, -s * 0.06);
      ctx.lineTo(s * 0.32, 0);
      ctx.lineTo(2, s * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (role === "warlord" || kind === "warlord") {
      soldierLegs(ctx, s * 1.02, gait, moving, "#3a2214");
      ctx.save();
      ctx.scale(breath, 1 + (breath - 1) * 0.5);
      oval(ctx, -s * 0.22, s * 0.12, s * 0.38, s * 0.55, "#5a1818");
      oval(ctx, 0, 0, s * 0.86, s * 0.78, dimCol(col, 0.55));
      oval(ctx, s * 0.04, -s * 0.06, s * 0.7, s * 0.62, col);
      gleam(ctx, -s * 0.16, -s * 0.2, s * 0.28, s * 0.12, 0.2);
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, -s * 0.12);
      ctx.lineTo(s * 0.58, s * 0.08);
      ctx.lineTo(s * 0.52, s * 0.26);
      ctx.lineTo(-s * 0.6, s * 0.06);
      ctx.closePath();
      ctx.fill();
      oval(ctx, s * 0.06, -s * 0.06, s * 0.38, s * 0.34, dimCol(col, 0.72));
      fillRound(ctx, s * 0.12, -s * 0.2, s * 0.32, s * 0.14, 1.5, "#1a120c");
      ctx.fillStyle = acc;
      ctx.fillRect(-s * 0.42, -s * 0.48, s * 0.84, 3.2);
      oval(ctx, 0, -s * 0.52, s * 0.48, s * 0.22, "#4a2a18");
      ctx.restore();
      if (u.escort) drawWarAxe(ctx, s, 0.55, 1);
      else {
        drawWarAxe(ctx, s, -0.72, 1);
        drawWarAxe(ctx, s, 0.72, -1);
      }
    } else {
      var vest = dimCol(col, 0.55);
      soldierLegs(ctx, s, gait, moving, vest);
      ctx.save();
      ctx.scale(breath, 1 + (breath - 1) * 0.6);
      oval(ctx, 0, 0, s * 0.78, s * 0.7, vest);
      oval(ctx, s * 0.04, -s * 0.04, s * 0.62, s * 0.55, col);
      gleam(ctx, -s * 0.12, -s * 0.18, s * 0.24, s * 0.1, 0.2);
      oval(ctx, s * 0.1, -s * 0.02, s * 0.34, s * 0.32, dimCol(col, 0.62));
      visor(ctx, s * 0.16, -s * 0.16, s * 0.3, s * 0.28, "#0b1a33");
      if (role === "medic" || role === "surgeon" || role === "chaplain") {
        ctx.fillStyle = role === "chaplain" ? "#c9a227" : "#c02020";
        ctx.fillRect(-2.5, -s * 0.42, 5, 14);
        ctx.fillRect(-7, -s * 0.32, 14, 5);
      }
      if (role === "radio" || kind === "oficial" || kind === "bandeira") {
        ctx.strokeStyle = acc;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, -s * 0.2);
        ctx.quadraticCurveTo(-s * 0.55, -s * 0.85, -s * 0.15, -s * 1.05);
        ctx.stroke();
        oval(ctx, -s * 0.12, -s * 1.05, 2.4, 2.4, acc);
      }
      if (role === "flamer" || role === "inferno") {
        oval(ctx, -s * 0.55, 0, s * 0.28, s * 0.34, "#7a2a10");
        oval(ctx, -s * 0.55, 0, s * 0.16, s * 0.2, "#ffd27a");
      }
      if (kind === "fantasma") {
        ctx.globalAlpha = 0.55 + Math.sin(timeN * 5) * 0.12;
        oval(ctx, 0, 0, s * 0.85, s * 0.75, "rgba(160,144,255,0.25)");
        ctx.globalAlpha = 1;
      }
      if (kind === "ceifador" || role === "reaper") {
        var L = u.leap;
        var hideBlade = L && L.slash && (L.phase === "rip" || (L.phase === "spin" && L.t > L.dur * 0.28));
        if (!hideBlade) {
        var spin = u.scytheSpin || 0;
        if (L && L.slash && L.phase === "out") {
          var lk = Math.min(1, (L.t || 0) / Math.max(0.08, L.dur || 0.34));
          spin += -0.4 + Math.pow(lk, 2.2) * 2.8;
        }
        ctx.save();
        ctx.rotate(spin);
        ctx.strokeStyle = "#1a080c";
        ctx.lineWidth = Math.max(2.1, s * 0.17);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, s * 0.12);
        ctx.lineTo(0, -s * 1.38);
        ctx.stroke();
        ctx.strokeStyle = acc;
        ctx.lineWidth = Math.max(1.3, s * 0.09);
        ctx.beginPath();
        ctx.moveTo(-1.4, -s * 0.15);
        ctx.lineTo(1.4, -s * 0.38);
        ctx.stroke();
        ctx.translate(0, -s * 1.32);
        ctx.shadowColor = "rgba(196, 30, 58, 0.8)";
        ctx.shadowBlur = 8;
        ctx.fillStyle = "#c41e3a";
        ctx.beginPath();
        ctx.moveTo(1.4, 3);
        ctx.quadraticCurveTo(s * 1.22, s * 0.12, s * 0.22, s * 1.05);
        ctx.quadraticCurveTo(s * 0.62, s * 0.38, 2, s * 0.28);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#ffe4ea";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(3, 4);
        ctx.quadraticCurveTo(s * 1.08, s * 0.16, s * 0.28, s * 0.92);
        ctx.stroke();
        ctx.fillStyle = "#6e0b1e";
        ctx.beginPath();
        ctx.arc(0, 4, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        }
      }
      if (kind === "bandeira") {
        ctx.fillStyle = "#6a4a22";
        ctx.fillRect(-2, -s * 1.25, 4, s * 1.4);
        ctx.fillStyle = "#c45a2a";
        ctx.beginPath();
        ctx.moveTo(2, -s * 1.25);
        ctx.lineTo(s * 0.85, -s * 0.95);
        ctx.lineTo(2, -s * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = acc;
        ctx.fillRect(2, -s * 1.18, s * 0.55, 4);
      }
      ctx.restore();
      if (role !== "reaper" && kind !== "bandeira" && kind !== "ceifador") {
      var gunLen = s * (role === "sniper" || role === "observer" ? 1.35 : role === "mg" || role === "grenadier" ? 1.1 : 0.78);
      var gunTh = role === "mg" ? 6 : role === "flamer" || role === "inferno" ? 7 : 3.6;
      if (role === "flamer" || role === "inferno") {
        ctx.fillStyle = acc;
        ctx.beginPath();
        ctx.moveTo(s * 0.2, -5);
        ctx.lineTo(s + 10, 0);
        ctx.lineTo(s * 0.2, 5);
        ctx.closePath();
        ctx.fill();
      } else {
        barrel(ctx, s * 0.28, -2, gunLen, gunTh, "#121828");
        if (role === "dual" || role === "outlaw") barrel(ctx, s * 0.28, 4, gunLen * 0.85, 3.2, "#121828");
      }
      }
      if (role === "scout" || role === "stealth" || role === "assassin") {
        ctx.fillStyle = dimCol(col, 0.4);
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, -s * 0.35);
        ctx.lineTo(-s * 0.85, 0);
        ctx.lineTo(-s * 0.2, s * 0.35);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (u.parasite > 0) {
      ctx.fillStyle = "#b44aff";
      ctx.beginPath();
      ctx.arc(s * 0.5, -s * 0.4, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (u.veilFogT > 0) {
      ctx.strokeStyle = "rgba(200, 160, 255, 0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s + 11, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (u.exposedT > 0) {
      ctx.strokeStyle = "rgba(255, 230, 140, 0.8)";
      ctx.lineWidth = 2.4;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, s + 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    if (u.kind === "tesla") teslaBattBar(ctx, u);
    if (u.preview) return;
    if (!falling) {
      ctx.save();
      ctx.translate(u.x, u.y - lift);
      label(ctx, u);
      ctx.restore();
      hpBar(ctx, u);
      drawActiveMark(ctx, u, time);
    }
  };

  function drawActiveMark(ctx, u, time) {
    time = time || 0;
    var s = u.def.size;
    if (u.marked > 0) {
      ctx.save();
      ctx.strokeStyle = "#ffe08a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(u.x, u.y, s + 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(u.x - 5, u.y - s - 14);
      ctx.lineTo(u.x, u.y - s - 6);
      ctx.lineTo(u.x + 5, u.y - s - 14);
      ctx.closePath();
      ctx.fillStyle = "#ffe08a";
      ctx.fill();
      ctx.restore();
    }
    if (!u.def.active || (u.activeSlot | 0) < 0) return;
    var meta = G.activeMeta(u.def.active.id);
    var ready = u.activeCd <= 0;
    ctx.save();
    ctx.lineWidth = 2.4;
    if (ready) {
      ctx.globalAlpha = 0.5 + Math.sin(time * 7) * 0.35;
      ctx.strokeStyle = meta.color;
      ctx.beginPath();
      ctx.arc(u.x, u.y, s + 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = "rgba(255,210,74,0.22)";
      ctx.beginPath();
      ctx.arc(u.x, u.y, s + 9, 0, Math.PI * 2);
      ctx.stroke();
      var frac = 1 - Math.max(0, u.activeCd) / (u.def.active.cd || 1);
      ctx.strokeStyle = meta.color;
      ctx.beginPath();
      ctx.arc(u.x, u.y, s + 9, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
    }
    if (u.activeFlash > 0) {
      ctx.globalAlpha = Math.min(1, u.activeFlash * 2);
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(u.x, u.y, s + 16 + (0.4 - u.activeFlash) * 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    var bx = u.x + s * 0.85;
    var by = u.y - s - 4;
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.beginPath();
    ctx.arc(bx, by, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ready ? meta.color : "#9aa4b8";
    ctx.font = "bold 8px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String((u.activeSlot | 0) + 1), bx, by + 0.5);
    ctx.font = "9px Segoe UI, sans-serif";
    if (u.def.active.id === "reap" && G.drawScytheIcon) G.drawScytheIcon(ctx, bx, by - 11, 9, ready ? meta.color : "#9aa4b8");
    else ctx.fillText(meta.icon, bx, by - 11);
    ctx.restore();
    drawBurn(ctx, u);
  };

  function oval(ctx, x, y, rx, ry, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function eye(ctx, x, y, r, glow) {
    oval(ctx, x, y, r, r * 0.82, glow || "#1a0808");
    oval(ctx, x - r * 0.28, y - r * 0.28, r * 0.32, r * 0.26, "#fff8d0");
  }

  function mandibles(ctx, s, color) {
    ctx.fillStyle = color || "#2a1008";
    ctx.beginPath();
    ctx.moveTo(s * 0.5, -s * 0.12);
    ctx.quadraticCurveTo(s * 1.15, -s * 0.5, s * 1.28, -s * 0.04);
    ctx.lineTo(s * 0.55, 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.12);
    ctx.quadraticCurveTo(s * 1.15, s * 0.5, s * 1.28, s * 0.04);
    ctx.lineTo(s * 0.55, -0.02);
    ctx.closePath();
    ctx.fill();
  }

  var drawPhase = 0;

  function insectLegs(ctx, s, n, color) {
    var phase = drawPhase;
    ctx.strokeStyle = color || "#2a1408";
    ctx.lineWidth = Math.max(1.4, s * 0.1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    n = n || 3;
    for (var i = 0; i < n; i++) {
      var y = (i - (n - 1) / 2) * s * 0.38;
      var gait = phase * 11 + i * 1.15;
      var swingR = Math.sin(gait) * s * 0.32;
      var liftR = Math.max(0, Math.cos(gait)) * s * 0.16;
      var swingL = Math.sin(gait + Math.PI) * s * 0.32;
      var liftL = Math.max(0, Math.cos(gait + Math.PI)) * s * 0.16;
      ctx.beginPath();
      ctx.moveTo(2, y);
      ctx.lineTo(s * 0.42 + swingR * 0.55, y + s * 0.22 - liftR);
      ctx.lineTo(s * 0.88 + swingR, y + s * 0.52 - liftR * 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-2, y);
      ctx.lineTo(-s * 0.42 + swingL * 0.55, y + s * 0.22 - liftL);
      ctx.lineTo(-s * 0.88 + swingL, y + s * 0.52 - liftL * 0.25);
      ctx.stroke();
    }
  }

  function buzzWings(ctx, s, phase, scale) {
    scale = scale || 1;
    var flap = 0.45 + Math.sin(phase * 48) * 0.45;
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = "rgba(210, 240, 255, 0.7)";
    ctx.beginPath();
    ctx.ellipse(s * 0.08, -s * 0.62, s * 1.05 * scale, s * (0.18 + flap * 0.32) * scale, -0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.08, s * 0.62, s * 1.05 * scale, s * (0.18 + flap * 0.32) * scale, 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function beeBody(ctx, e, s) {
    var ph = e.phase || 0;
    buzzWings(ctx, s, ph, 1);
    insectLegs(ctx, s * 0.7, 3, "#1a0c04");
    var aw = s * 0.78;
    var ah = s * 0.46;
    oval(ctx, -s * 0.55, 0, aw, ah, "#1a0c04");
    oval(ctx, -s * 0.55, 0, aw * 0.9, ah * 0.86, "#ffc44a");
    ctx.fillStyle = "#1a0c04";
    for (var i = 0; i < 3; i++) {
      var x = -s * 0.12 - i * s * 0.28;
      ctx.fillRect(x - 2.4, -ah * 0.84, 5, ah * 1.68);
    }
    ctx.fillStyle = "#c8fff0";
    ctx.beginPath();
    ctx.moveTo(-s * 0.55 - aw + 2, 0);
    ctx.lineTo(-s * 0.55 - aw - s * 0.42, -3);
    ctx.lineTo(-s * 0.55 - aw - s * 0.5, 0);
    ctx.lineTo(-s * 0.55 - aw - s * 0.42, 3);
    ctx.closePath();
    ctx.fill();
    oval(ctx, s * 0.08, 0, s * 0.42, s * 0.36, "#3a2208");
    oval(ctx, s * 0.08, 0, s * 0.3, s * 0.26, "#e8a028");
    oval(ctx, s * 0.62, 0, s * 0.32, s * 0.28, "#2a1808");
    oval(ctx, s * 0.62, 0, s * 0.24, s * 0.2, "#5a3010");
    eye(ctx, s * 0.78, -s * 0.14, s * 0.11, "#1a3040");
    eye(ctx, s * 0.78, s * 0.14, s * 0.11, "#1a3040");
    mandibles(ctx, s * 0.7, "#1a0c04");
    ctx.strokeStyle = "#1a0c04";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(s * 0.7, -s * 0.22);
    ctx.quadraticCurveTo(s * 1.15, -s * 0.7, s * 1.35, -s * 0.85);
    ctx.moveTo(s * 0.7, s * 0.22);
    ctx.quadraticCurveTo(s * 1.15, s * 0.7, s * 1.35, s * 0.85);
    ctx.stroke();
  }

  function hiveWings(ctx, s, ph, scale, fill, vein) {
    var flap = 0.7 + Math.sin(ph * 42) * 0.3;
    var layer, side, rx, ry, ox, oy, ang;
    ctx.save();
    ctx.globalAlpha *= 0.58;
    for (layer = 0; layer < 2; layer++) {
      for (side = -1; side <= 1; side += 2) {
        rx = s * (layer ? 0.7 : 1.08) * scale;
        ry = s * (0.15 + flap * 0.24) * (layer ? 0.72 : 1);
        ox = -s * (layer ? 0.2 : 0.04);
        oy = side * s * (layer ? 0.36 : 0.56) * scale;
        ang = side * (layer ? 0.4 : 0.56);
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.ellipse(ox, oy, rx, ry, ang, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = vein;
        ctx.lineWidth = 1.05;
        ctx.beginPath();
        ctx.ellipse(ox, oy, rx * 0.68, ry * 0.5, ang, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox - Math.cos(ang) * rx * 0.85, oy + Math.sin(ang) * ry * 0.2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawRoyalScepter(ctx, s, glow) {
    ctx.save();
    ctx.rotate(-0.55);
    ctx.strokeStyle = "#3a2208";
    ctx.lineWidth = Math.max(3.4, s * 0.11);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, s * 0.12);
    ctx.lineTo(0, -s * 1.28);
    ctx.stroke();
    ctx.strokeStyle = "#ffe08a";
    ctx.lineWidth = Math.max(1.8, s * 0.055);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.08);
    ctx.lineTo(0, -s * 1.22);
    ctx.stroke();
    oval(ctx, 0, -s * 1.38, s * 0.2, s * 0.2, "#d4a024");
    oval(ctx, 0, -s * 1.38, s * 0.14, s * 0.14, glow ? "#7af7ff" : "#ffe08a");
    oval(ctx, 0, -s * 1.38, s * 0.06, s * 0.06, "#fff6c0");
    ctx.strokeStyle = "rgba(122, 247, 255, 0.7)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, -s * 1.38, s * 0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawRoyalGreatsword(ctx, s, compact) {
    var L = compact ? 1.55 : 1.92;
    ctx.save();
    ctx.rotate(-0.12);
    ctx.fillStyle = "#3a1808";
    ctx.fillRect(-s * 0.06, -s * 0.1, s * 0.28, s * 0.2);
    ctx.fillStyle = "#8a5a18";
    ctx.fillRect(-s * 0.02, -s * 0.06, s * 0.2, s * 0.12);
    ctx.fillStyle = "#c8d4e0";
    ctx.beginPath();
    ctx.moveTo(s * 0.2, -s * 0.14);
    ctx.lineTo(s * L, -s * 0.045);
    ctx.lineTo(s * (L + 0.14), 0);
    ctx.lineTo(s * L, s * 0.045);
    ctx.lineTo(s * 0.2, s * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffe08a";
    ctx.fillRect(s * 0.22, -s * 0.018, s * (L - 0.28), s * 0.036);
    ctx.fillStyle = "#fff8e0";
    ctx.beginPath();
    ctx.moveTo(s * (L + 0.14), 0);
    ctx.lineTo(s * L, -s * 0.03);
    ctx.lineTo(s * L, s * 0.03);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBeequeen(ctx, e, s) {
    var ph = e.phase || 0;
    var rage = !!e.enrage;
    var gold = rage ? "#ff6a3a" : "#f0b42a";
    var goldHi = rage ? "#ffd0a0" : "#ffe08a";
    var plate = rage ? "#c03020" : "#d49020";
    var dark = rage ? "#3a0808" : "#1a0c04";
    var gem = rage ? "#ff6a3a" : "#7af7ff";
    var bob = Math.sin(ph * 4.2) * s * 0.05;
    var i;
    ctx.save();
    ctx.translate(0, bob);
    hiveWings(ctx, s, ph, 1.22, rage ? "rgba(255, 90, 50, 0.55)" : "rgba(255, 210, 74, 0.55)", rage ? "rgba(255, 180, 80, 0.7)" : "rgba(255, 244, 196, 0.75)");

    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(1.5, s * 0.055);
    ctx.lineCap = "round";
    for (i = 0; i < 2; i++) {
      var mid = (i ? 1 : -1) * s * 0.12;
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, s * 0.18);
      ctx.lineTo(-s * 0.42, s * 0.38 + mid);
      ctx.lineTo(-s * 0.22, s * 0.62 + mid * 0.4);
      ctx.stroke();
    }

    oval(ctx, -s * 0.48, s * 0.22, s * 0.52, s * 0.3, dark);
    oval(ctx, -s * 0.48, s * 0.22, s * 0.44, s * 0.24, gold);
    ctx.fillStyle = dark;
    for (i = 0; i < 4; i++) ctx.fillRect(-s * 0.28 - i * s * 0.16, s * 0.02, s * 0.07, s * 0.42);
    ctx.fillStyle = goldHi;
    ctx.beginPath();
    ctx.moveTo(-s * 1.02, s * 0.22);
    ctx.lineTo(-s * 1.22, s * 0.16);
    ctx.lineTo(-s * 1.32, s * 0.22);
    ctx.lineTo(-s * 1.22, s * 0.28);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(2.4, s * 0.1);
    ctx.beginPath();
    ctx.moveTo(s * 0.06, s * 0.32);
    ctx.lineTo(s * 0.16, s * 0.68);
    ctx.lineTo(s * 0.08, s * 1.02);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, s * 0.34);
    ctx.lineTo(-s * 0.2, s * 0.7);
    ctx.lineTo(-s * 0.12, s * 1.06);
    ctx.stroke();
    oval(ctx, s * 0.16, s * 0.64, s * 0.14, s * 0.16, plate);
    oval(ctx, -s * 0.2, s * 0.66, s * 0.13, s * 0.15, plate);
    oval(ctx, s * 0.1, s * 1.0, s * 0.1, s * 0.08, gold);
    oval(ctx, -s * 0.1, s * 1.04, s * 0.1, s * 0.08, gold);

    oval(ctx, -s * 0.02, s * 0.34, s * 0.32, s * 0.22, dark);
    oval(ctx, s * 0.02, s * 0.32, s * 0.28, s * 0.18, plate);

    oval(ctx, s * 0.04, s * 0.04, s * 0.28, s * 0.34, dark);
    oval(ctx, s * 0.08, 0, s * 0.22, s * 0.26, plate);
    oval(ctx, s * 0.18, -s * 0.04, s * 0.16, s * 0.14, gold);
    oval(ctx, s * 0.2, s * 0.1, s * 0.14, s * 0.12, gold);
    oval(ctx, s * 0.1, -s * 0.12, s * 0.07, s * 0.07, gem);
    ctx.strokeStyle = rage ? "rgba(255, 90, 50, 0.75)" : "rgba(122, 247, 255, 0.75)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(s * 0.1, -s * 0.12, s * 0.14 + Math.sin(ph * 6) * 1.4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(2.2, s * 0.09);
    ctx.beginPath();
    ctx.moveTo(s * 0.12, s * 0.02);
    ctx.lineTo(s * 0.42, s * 0.18);
    ctx.lineTo(s * 0.68, s * 0.04);
    ctx.stroke();
    oval(ctx, s * 0.7, s * 0.02, s * 0.09, s * 0.08, dark);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s * 0.7, -0.02);
    ctx.lineTo(s * 0.86, -s * 0.1);
    ctx.moveTo(s * 0.7, s * 0.06);
    ctx.lineTo(s * 0.84, s * 0.16);
    ctx.stroke();
    if (!e.disarmed) {
      ctx.save();
      ctx.translate(s * 0.62, s * 0.04);
      drawRoyalScepter(ctx, s * 0.92, !rage);
      ctx.restore();
    }

    oval(ctx, s * 0.32, -s * 0.28, s * 0.22, s * 0.14, dark);
    oval(ctx, s * 0.5, -s * 0.32, s * 0.22, s * 0.24, dark);
    oval(ctx, s * 0.54, -s * 0.32, s * 0.16, s * 0.18, plate);
    oval(ctx, s * 0.62, -s * 0.4, s * 0.1, s * 0.08, rage ? "#ff8a4a" : "#ffd24a");
    oval(ctx, s * 0.64, -s * 0.24, s * 0.1, s * 0.08, rage ? "#ff8a4a" : "#ffd24a");
    ctx.save();
    ctx.translate(s * 0.58, -s * 0.3);
    mandibles(ctx, s * 0.28, dark);
    ctx.restore();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(s * 0.42, -s * 0.42);
    ctx.quadraticCurveTo(s * 0.22, -s * 0.92, s * 0.12, -s * 1.08);
    ctx.moveTo(s * 0.48, -s * 0.44);
    ctx.quadraticCurveTo(s * 0.7, -s * 0.95, s * 0.62, -s * 1.12);
    ctx.stroke();
    oval(ctx, s * 0.12, -s * 1.08, 2.2, 2.2, gem);
    oval(ctx, s * 0.62, -s * 1.12, 2.2, 2.2, gem);

    ctx.fillStyle = goldHi;
    ctx.beginPath();
    ctx.moveTo(s * 0.38, -s * 0.46);
    ctx.lineTo(s * 0.52, -s * 0.98);
    ctx.lineTo(s * 0.7, -s * 0.44);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(s * 0.28, -s * 0.44);
    ctx.lineTo(s * 0.34, -s * 0.78);
    ctx.lineTo(s * 0.46, -s * 0.44);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.6, -s * 0.44);
    ctx.lineTo(s * 0.72, -s * 0.78);
    ctx.lineTo(s * 0.78, -s * 0.42);
    ctx.closePath();
    ctx.fill();
    oval(ctx, s * 0.52, -s * 0.9, 2.6, 2.6, gem);
    ctx.restore();
  }

  function drawBeeking(ctx, e, s) {
    var ph = e.phase || 0;
    var knight = !!e.enrage;
    var armor = knight ? "#ff6a28" : "#e87830";
    var armorHi = knight ? "#ffd0a0" : "#ffd24a";
    var dark = "#3a1408";
    var stripe = knight ? "#7a1010" : "#4a1808";
    var belly = knight ? "#c03018" : "#e07028";
    var bob = Math.sin(ph * 3.8) * s * 0.04;
    var i;
    ctx.save();
    ctx.translate(0, bob);
    if ((e.kingWardT || 0) > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(122, 247, 255, 0.75)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.15 + Math.sin(ph * 8) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 224, 120, 0.45)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    hiveWings(ctx, s, ph, 1.05, "rgba(255, 160, 50, 0.5)", "rgba(255, 210, 74, 0.7)");

    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(1.6, s * 0.06);
    ctx.lineCap = "round";
    for (i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.06, s * 0.12);
      ctx.lineTo(-s * 0.48, s * 0.28 + i * s * 0.18);
      ctx.lineTo(-s * 0.28, s * 0.55 + i * s * 0.12);
      ctx.stroke();
    }

    oval(ctx, -s * 0.22, s * 0.42, s * 0.48, s * 0.38, stripe);
    oval(ctx, -s * 0.22, s * 0.42, s * 0.4, s * 0.3, belly);
    ctx.fillStyle = stripe;
    for (i = 0; i < 3; i++) ctx.fillRect(-s * 0.42 + i * s * 0.14, s * 0.16, s * 0.08, s * 0.5);

    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(3.2, s * 0.14);
    ctx.beginPath();
    ctx.moveTo(s * 0.08, s * 0.22);
    ctx.lineTo(s * 0.22, s * 0.58);
    ctx.lineTo(s * 0.1, s * 0.92);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.16, s * 0.24);
    ctx.lineTo(-s * 0.3, s * 0.6);
    ctx.lineTo(-s * 0.18, s * 0.96);
    ctx.stroke();
    oval(ctx, s * 0.22, s * 0.54, s * 0.14, s * 0.14, armor);
    oval(ctx, -s * 0.3, s * 0.56, s * 0.13, s * 0.13, armor);
    oval(ctx, s * 0.12, s * 0.9, s * 0.11, s * 0.09, armorHi);
    oval(ctx, -s * 0.16, s * 0.94, s * 0.11, s * 0.09, armorHi);

    oval(ctx, s * 0.02, s * 0.02, s * 0.42, s * 0.4, dark);
    oval(ctx, s * 0.06, 0, s * 0.34, s * 0.32, armor);
    oval(ctx, s * 0.04, s * 0.08, s * 0.2, s * 0.12, armorHi);

    if (!e.disarmed) {
      ctx.save();
      ctx.translate(s * 0.22, s * 0.06);
      drawRoyalGreatsword(ctx, s, false);
      ctx.restore();
    }

    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(3.4, s * 0.13);
    ctx.beginPath();
    ctx.moveTo(s * 0.1, -s * 0.02);
    ctx.lineTo(s * 0.38, s * 0.16);
    ctx.lineTo(s * 0.55, 0.02);
    ctx.stroke();
    oval(ctx, s * 0.56, 0, s * 0.1, s * 0.09, dark);
    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(2.2, s * 0.08);
    ctx.beginPath();
    ctx.moveTo(s * 0.02, s * 0.16);
    ctx.lineTo(s * 0.28, s * 0.28);
    ctx.lineTo(s * 0.4, s * 0.18);
    ctx.stroke();

    oval(ctx, s * 0.42, -s * 0.18, s * 0.2, s * 0.14, dark);
    oval(ctx, s * 0.58, -s * 0.22, s * 0.22, s * 0.22, dark);
    oval(ctx, s * 0.62, -s * 0.22, s * 0.16, s * 0.16, armor);
    oval(ctx, s * 0.7, -s * 0.3, s * 0.08, s * 0.07, "#2a1008");
    oval(ctx, s * 0.72, -s * 0.14, s * 0.08, s * 0.07, "#2a1008");
    ctx.save();
    ctx.translate(s * 0.66, -s * 0.2);
    mandibles(ctx, s * 0.32, dark);
    ctx.restore();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(s * 0.5, -s * 0.32);
    ctx.quadraticCurveTo(s * 0.32, -s * 0.72, s * 0.22, -s * 0.86);
    ctx.moveTo(s * 0.58, -s * 0.34);
    ctx.quadraticCurveTo(s * 0.78, -s * 0.74, s * 0.7, -s * 0.88);
    ctx.stroke();

    oval(ctx, s * 0.58, -s * 0.42, s * 0.22, s * 0.1, "#c47820");
    oval(ctx, s * 0.58, -s * 0.46, s * 0.2, s * 0.09, armorHi);
    ctx.fillStyle = armorHi;
    ctx.beginPath();
    ctx.moveTo(s * 0.42, -s * 0.48);
    ctx.lineTo(s * 0.48, -s * 0.78);
    ctx.lineTo(s * 0.58, -s * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.56, -s * 0.5);
    ctx.lineTo(s * 0.62, -s * 0.88);
    ctx.lineTo(s * 0.7, -s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.66, -s * 0.48);
    ctx.lineTo(s * 0.76, -s * 0.76);
    ctx.lineTo(s * 0.8, -s * 0.46);
    ctx.closePath();
    ctx.fill();
    oval(ctx, s * 0.62, -s * 0.8, 2.2, 2.2, knight ? "#ff6a3a" : "#7af7ff");
    if ((e.kingStun || 0) > 0) {
      var si, sa;
      ctx.save();
      ctx.globalAlpha = 0.95;
      for (si = 0; si < 4; si++) {
        sa = (e.phase || 0) * 7 + si * (Math.PI * 0.5);
        oval(ctx, Math.cos(sa) * s * 0.92, -s * 0.72 + Math.sin(sa * 1.6) * s * 0.12, 3.6, 3.6, si % 2 ? "#fff4c4" : "#ffe08a");
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawHiveSwarmBee(ctx, e, s, tier) {
    var ph = e.phase || 0;
    var robo = !!e.robo;
    var gold = robo ? (tier === 2 ? "#9ad8ff" : tier === 1 ? "#7aa0c8" : "#8ab4d4") : (tier === 2 ? "#ffd24a" : tier === 1 ? "#e8a028" : "#ffc44a");
    var dark = robo ? "#121820" : "#1a0c04";
    var plate = robo ? "#3a4a58" : gold;
    hiveWings(ctx, s, ph, tier === 2 ? 1.15 : 1, robo ? "rgba(140, 210, 255, 0.45)" : "rgba(255, 210, 74, 0.5)", robo ? "rgba(200, 240, 255, 0.65)" : "rgba(255, 244, 196, 0.7)");
    insectLegs(ctx, s * 0.55, 2, dark);
    oval(ctx, -s * 0.35, 0, s * (0.55 + tier * 0.08), s * (0.32 + tier * 0.06), dark);
    oval(ctx, -s * 0.35, 0, s * (0.46 + tier * 0.07), s * (0.26 + tier * 0.05), plate);
    ctx.fillStyle = dark;
    var n = 2 + tier;
    var i;
    for (i = 0; i < n; i++) ctx.fillRect(-s * 0.12 - i * s * 0.16, -s * 0.22, 3 + tier, s * 0.44);
    if (robo) {
      ctx.strokeStyle = "#7af7ff";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-s * 0.42, -s * 0.12, s * 0.22, s * 0.24);
      oval(ctx, -s * 0.28, 0, s * 0.08, s * 0.08, "#7af7ff");
    }
    oval(ctx, s * 0.12, 0, s * 0.28, s * 0.24, robo ? "#1a2834" : "#3a2208");
    oval(ctx, s * 0.12, 0, s * 0.2, s * 0.16, gold);
    oval(ctx, s * 0.42, 0, s * 0.22, s * 0.2, dark);
    oval(ctx, s * 0.48, -s * 0.08, s * 0.08, s * 0.07, robo ? "#7af7ff" : "#2a1008");
    oval(ctx, s * 0.48, s * 0.08, s * 0.08, s * 0.07, robo ? "#7af7ff" : "#2a1008");
    if (tier >= 1) {
      oval(ctx, s * 0.02, -s * 0.18, s * 0.16, s * 0.1, gold);
      oval(ctx, s * 0.02, s * 0.18, s * 0.16, s * 0.1, gold);
    }
    if (tier >= 2) {
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.moveTo(s * 0.22, -s * 0.22);
      ctx.lineTo(s * 0.32, -s * 0.48);
      ctx.lineTo(s * 0.42, -s * 0.2);
      ctx.closePath();
      ctx.fill();
    }
    if (e.mergeGlow) {
      ctx.strokeStyle = "rgba(255, 220, 80, 0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.15, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawHiveHex(ctx, s, fill, edge) {
    ctx.beginPath();
    var i, a;
    for (i = 0; i < 6; i++) {
      a = Math.PI / 6 + (Math.PI / 3) * i;
      if (i) ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s * 0.58);
      else ctx.moveTo(Math.cos(a) * s, Math.sin(a) * s * 0.58);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge || "#ffe08a";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawHiveCell(ctx, e, s) {
    var tone = e.cellKind === "royal" ? "#c03018" : e.cellKind === "drone" ? "#3a7ad4" : "#e8c050";
    var hi = e.cellKind === "royal" ? "#ff6a3a" : e.cellKind === "drone" ? "#7ad8ff" : "#ffe08a";
    ctx.save();
    ctx.translate(0, 4);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 10, s * 1.05, s * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    drawHiveHex(ctx, s * 1.05, tone, hi);
    ctx.translate(0, -s * 0.22);
    drawHiveHex(ctx, s * 0.82, hi, "#fff4c4");
    var k = 1 - Math.max(0, Math.min(1, (e.pulseT || 0) / (e.pulseMax || 8)));
    ctx.strokeStyle = "rgba(255, 244, 196, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
    ctx.stroke();
    ctx.restore();
  }

  function drawHiveCocoon(ctx, e, s) {
    var ph = e.phase || 0;
    var crack = Math.max(0, Math.min(1, e.crackK || 0));
    if (e.opening && !e.crackK) crack = 0.35;
    var burst = !!e.burstOpen;
    var bob = Math.sin(ph * 2.2) * (burst ? 1.2 : 3);
    var split = burst ? s * 0.16 : s * 0.05 * crack;
    ctx.save();
    ctx.translate(0, bob);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(2, s * 0.85, s * 0.7, s * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6a4a18";
    ctx.fillRect(-3, -s * 1.15, 6, s * 0.4);
    oval(ctx, -split, s * 0.08, s * 0.62, s * 0.92, "#5a3a10");
    oval(ctx, split, s * 0.08, s * 0.5, s * 0.78, "#c4a06a");
    ctx.strokeStyle = "#8a5a18";
    ctx.lineWidth = 2;
    var i;
    for (i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(split * 0.4, -s * 0.35 + i * s * 0.28, s * (0.42 - i * 0.04), s * 0.16, 0, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    oval(ctx, -s * 0.12, -s * 0.15, s * 0.12, s * 0.1, "rgba(255, 230, 160, 0.45)");
    if (crack > 0.02 || burst) {
      var glow = burst ? 0.38 : 0.12 + crack * 0.7;
      var pulse = 0.75 + Math.sin(ph * 9) * 0.25;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(255, 220, 90, " + (glow * 0.45 * pulse) + ")";
      ctx.beginPath();
      ctx.ellipse(0, s * 0.08, s * (0.08 + crack * 0.22), s * (0.18 + crack * 0.42), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 248, 210, " + (glow * 0.55 * pulse) + ")";
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.05, s * (0.04 + crack * 0.1), s * (0.22 + crack * 0.28), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = burst ? "rgba(40, 22, 6, 0.9)" : "rgba(30, 16, 4, 0.85)";
      ctx.lineWidth = burst ? 2.4 : 1.4 + crack * 1.4;
      ctx.lineCap = "round";
      var len = burst ? 1 : crack;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.72 * len);
      ctx.lineTo(-s * 0.06, -s * 0.28 * len);
      ctx.lineTo(s * 0.05, s * 0.08 * len);
      ctx.lineTo(-s * 0.04, s * 0.42 * len);
      ctx.lineTo(0, s * 0.78 * len);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.04, -s * 0.4 * len);
      ctx.lineTo(-s * 0.22 * len, -s * 0.08);
      ctx.lineTo(-s * 0.12 * len, s * 0.28 * len);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.03, -s * 0.22 * len);
      ctx.lineTo(s * 0.2 * len, s * 0.04);
      ctx.lineTo(s * 0.1 * len, s * 0.38 * len);
      ctx.stroke();
      ctx.restore();
      if (burst) {
        ctx.fillStyle = "rgba(12, 8, 2, 0.35)";
        ctx.beginPath();
        ctx.ellipse(0, s * 0.1, s * 0.2, s * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawHivePillar(ctx, e, s) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(2, s * 0.55, s * 0.85, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a5a18";
    ctx.fillRect(-s * 0.42, -s * 0.95, s * 0.84, s * 1.35);
    ctx.fillStyle = "#d4a024";
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.95, s * 0.48, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0c84a";
    ctx.beginPath();
    ctx.ellipse(0, -s * 1.05, s * 0.42, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a3a10";
    ctx.lineWidth = 1.6;
    var i;
    for (i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.38, -s * 0.55 + i * s * 0.32);
      ctx.lineTo(s * 0.38, -s * 0.4 + i * s * 0.32);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHiveFlower(ctx, e, s) {
    var ph = e.phase || 0;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, s * 0.55, s * 0.7, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a6a28";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.5);
    ctx.lineTo(0, -s * 0.15);
    ctx.stroke();
    var i, a;
    for (i = 0; i < 6; i++) {
      a = (Math.PI / 3) * i + ph * 0.4;
      oval(ctx, Math.cos(a) * s * 0.38, -s * 0.2 + Math.sin(a) * s * 0.22, s * 0.22, s * 0.14, i % 2 ? "#ff7ad2" : "#ffe08a");
    }
    oval(ctx, 0, -s * 0.2, s * 0.16, s * 0.14, "#f0b42a");
    ctx.restore();
  }

  function kaskaRad(v, fb) {
    v = Number(v);
    if (!isFinite(v) || v <= 0) return fb > 0 ? fb : 2;
    return Math.min(v, 96);
  }

  function kaskaOval(ctx, x, y, rx, ry, fill) {
    rx = kaskaRad(rx, 2);
    ry = kaskaRad(ry, 2);
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawKaskaHorn(ctx, s, len, baseW, shaft, edge) {
    s = kaskaRad(s, 32);
    len = kaskaRad(len, 0.8);
    baseW = kaskaRad(baseW, 6);
    var root = s * 0.72;
    var mid = root + s * len * 0.62;
    var tip = root + s * len;
    ctx.fillStyle = "#3a2210";
    kaskaOval(ctx, root - s * 0.04, 0, s * 0.16, baseW * 1.35, "#3a2210");
    kaskaOval(ctx, root, 0, s * 0.12, baseW * 1.08, "#8a5a18");
    ctx.fillStyle = shaft;
    ctx.beginPath();
    ctx.moveTo(root, -baseW);
    ctx.lineTo(mid, -baseW * 0.28);
    ctx.lineTo(tip, 0);
    ctx.lineTo(mid, baseW * 0.28);
    ctx.lineTo(root, baseW);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.moveTo(root + s * 0.06, -baseW * 0.38);
    ctx.lineTo(mid, -baseW * 0.1);
    ctx.lineTo(tip - s * 0.05, 0);
    ctx.lineTo(mid, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shaft;
    ctx.beginPath();
    ctx.moveTo(root + s * len * 0.28, -baseW * 0.18);
    ctx.lineTo(root + s * len * 0.72, -baseW * 1.22);
    ctx.lineTo(root + s * len * 0.22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(root + s * len * 0.28, baseW * 0.18);
    ctx.lineTo(root + s * len * 0.72, baseW * 1.22);
    ctx.lineTo(root + s * len * 0.22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.moveTo(root + s * len * 0.34, -baseW * 0.08);
    ctx.lineTo(root + s * len * 0.66, -baseW * 0.92);
    ctx.lineTo(root + s * len * 0.3, 0);
    ctx.closePath();
    ctx.fill();
  }

  function drawKaskaLeg(ctx, s, side, y, gait, bare) {
    var swing = Math.sin(gait) * s * 0.2;
    var lift = Math.max(0, Math.cos(gait)) * s * 0.1;
    var x0 = side * s * 0.1;
    var x1 = side * (s * 0.5 + swing * 0.4);
    var y1 = y + s * 0.2 - lift;
    var x2 = side * (s * 0.98 + swing);
    var y2 = y + s * 0.56 - lift * 0.28;
    ctx.strokeStyle = bare ? "#4a2810" : "#2a1810";
    ctx.lineWidth = kaskaRad(s * (bare ? 0.13 : 0.2), 3);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    kaskaOval(ctx, x1, y1, s * 0.09, s * 0.09, bare ? "#8a5020" : "#6a4814");
    kaskaOval(ctx, x1, y1, s * 0.04, s * 0.04, "#c49040");
    ctx.strokeStyle = "#1a0c08";
    ctx.lineWidth = kaskaRad(s * 0.11, 2);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 + side * s * 0.14, y2 + s * 0.12);
    ctx.stroke();
  }

  function drawKaskaCannon(ctx, s, y) {
    kaskaOval(ctx, s * 0.08, y, s * 0.22, s * 0.14, "#3a2410");
    kaskaOval(ctx, s * 0.12, y, s * 0.16, s * 0.1, "#8a5a18");
    ctx.fillStyle = "#1a1008";
    var hw = kaskaRad(s * 0.07, 2);
    var len = kaskaRad(s * 0.55, 8);
    ctx.fillRect(s * 0.18, y - hw, len, hw * 2);
    ctx.fillStyle = "#5a3a10";
    ctx.fillRect(s * 0.18 + len - s * 0.08, y - hw - 1, s * 0.1, hw * 2 + 2);
    kaskaOval(ctx, s * 0.18 + len + s * 0.02, y, s * 0.05, s * 0.05, "#1a0808");
  }

  function drawKaska(ctx, e, s) {
    s = kaskaRad(s, 32);
    var ph = e.phase || 0;
    var bare = !!e.shellOff;
    ctx.save();
    try {
      var i;
      var y;
      var gait;
      for (i = 0; i < 3; i++) {
        y = (i - 1) * s * 0.32;
        gait = ph * 10 + i * 1.15;
        drawKaskaLeg(ctx, s, 1, y, gait, bare);
        drawKaskaLeg(ctx, s, -1, y, gait + Math.PI, bare);
      }
      kaskaOval(ctx, -s * 0.58, 0, s * 0.62, s * 0.4, bare ? "#4a2810" : "#24140c");
      if (!bare) {
        kaskaOval(ctx, -s * 0.22, -s * 0.28, s * 0.98, s * 0.5, "#6a3a14");
        kaskaOval(ctx, -s * 0.22, s * 0.28, s * 0.98, s * 0.5, "#4a2810");
        kaskaOval(ctx, -s * 0.16, -s * 0.22, s * 0.78, s * 0.34, "#8a5424");
        kaskaOval(ctx, -s * 0.16, s * 0.22, s * 0.78, s * 0.34, "#6a3c18");
        ctx.fillStyle = "#2a1408";
        for (i = 0; i < 4; i++) {
          ctx.fillRect(-s * 0.92 + i * s * 0.26, -s * 0.62, s * 0.1, s * 1.24);
        }
        ctx.strokeStyle = "#1a0c06";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(s * 0.22, 0);
        ctx.lineTo(-s * 1.08, 0);
        ctx.stroke();
        ctx.fillStyle = "#a07030";
        for (i = 0; i < 5; i++) {
          kaskaOval(ctx, -s * 0.78 + i * s * 0.28, -s * 0.34, s * 0.045, s * 0.045, "#c49050");
          kaskaOval(ctx, -s * 0.78 + i * s * 0.28, s * 0.34, s * 0.045, s * 0.045, "#c49050");
        }
        kaskaOval(ctx, -s * 0.12, -s * 0.06, s * 0.42, s * 0.1, "rgba(180, 110, 50, 0.35)");
        drawKaskaCannon(ctx, s, -s * 0.52);
        drawKaskaCannon(ctx, s, s * 0.52);
      } else {
        kaskaOval(ctx, -s * 0.18, 0, s * 0.78, s * 0.4, "#5a3014");
        kaskaOval(ctx, -s * 0.12, 0, s * 0.58, s * 0.28, "#a05020");
        ctx.strokeStyle = "#3a1408";
        ctx.lineWidth = 1.8;
        for (i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(-s * 0.72 + i * s * 0.16, -s * 0.2);
          ctx.lineTo(-s * 0.72 + i * s * 0.16, s * 0.2);
          ctx.stroke();
        }
        ctx.fillStyle = "#2a1408";
        ctx.fillRect(-s * 0.4, -s * 0.08, s * 0.7, s * 0.16);
        kaskaOval(ctx, s * 0.22, 0, s * 0.08, s * 0.08, "#ff7a28");
      }
      kaskaOval(ctx, s * 0.24, 0, s * 0.5, s * 0.44, bare ? "#5a3010" : "#4a2810");
      kaskaOval(ctx, s * 0.3, -s * 0.04, s * 0.32, s * 0.22, bare ? "#a05020" : "#8a5020");
      kaskaOval(ctx, s * 0.56, 0, s * 0.36, s * 0.32, bare ? "#4a200c" : "#3a1c0c");
      kaskaOval(ctx, s * 0.6, 0, s * 0.24, s * 0.22, "#1a0c08");
      kaskaOval(ctx, s * 0.7, -s * 0.12, kaskaRad(s * 0.14, 4), kaskaRad(s * 0.11, 3), "#0a0404");
      kaskaOval(ctx, s * 0.66, -s * 0.14, kaskaRad(s * 0.05, 2), kaskaRad(s * 0.04, 2), "#ff7a28");
      kaskaOval(ctx, s * 0.7, s * 0.12, kaskaRad(s * 0.14, 4), kaskaRad(s * 0.11, 3), "#0a0404");
      kaskaOval(ctx, s * 0.66, s * 0.1, kaskaRad(s * 0.05, 2), kaskaRad(s * 0.04, 2), "#ff7a28");
      ctx.fillStyle = "#2a1408";
      ctx.beginPath();
      ctx.moveTo(s * 0.72, -s * 0.1);
      ctx.lineTo(s * 1.12, -s * 0.28);
      ctx.lineTo(s * 1.18, -s * 0.08);
      ctx.lineTo(s * 0.78, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.72, s * 0.1);
      ctx.lineTo(s * 1.12, s * 0.28);
      ctx.lineTo(s * 1.18, s * 0.08);
      ctx.lineTo(s * 0.78, 0);
      ctx.closePath();
      ctx.fill();
      if (bare) drawKaskaHorn(ctx, s, 1.22, s * 0.24, "#c4a040", "#f0d080");
      else drawKaskaHorn(ctx, s, 0.92, s * 0.2, "#c49028", "#e8c070");
    } finally {
      ctx.restore();
    }
  }

  function glinderR(v, fb) {
    v = Number(v);
    if (!isFinite(v) || v <= 0) return fb > 0 ? fb : 2;
    return Math.min(v, 80);
  }

  function glinderOval(ctx, x, y, rx, ry, fill) {
    rx = glinderR(rx, 2);
    ry = glinderR(ry, 2);
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawGlinderWing(ctx, s, side, flap, layer) {
    var sx = flap;
    var sy = flap * (layer ? 1 : 0.9);
    var rootX = s * 0.04;
    var rootY = side * s * 0.08;
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.quadraticCurveTo(-s * 0.12 * sx, side * s * 1.08 * sy, -s * 1.02 * sx, side * s * 0.88 * sy);
    ctx.quadraticCurveTo(-s * 1.52 * sx, side * s * 0.4 * sy, -s * 1.22 * sx, side * s * 0.06 * sy);
    ctx.quadraticCurveTo(-s * 0.52 * sx, side * s * -0.1, rootX - s * 0.06, rootY * 0.35);
    ctx.closePath();
    ctx.fillStyle = layer ? "#241010" : "#120606";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(rootX - s * 0.02, rootY);
    ctx.quadraticCurveTo(-s * 0.18 * sx, side * s * 0.74 * sy, -s * 0.78 * sx, side * s * 0.62 * sy);
    ctx.quadraticCurveTo(-s * 1.02 * sx, side * s * 0.3 * sy, -s * 0.68 * sx, side * s * 0.1 * sy);
    ctx.quadraticCurveTo(-s * 0.28 * sx, side * s * 0.02, rootX, rootY * 0.45);
    ctx.closePath();
    ctx.fillStyle = layer ? "#a01418" : "#6a1010";
    ctx.fill();
    glinderOval(ctx, -s * 0.7 * sx, side * s * 0.44 * sy, s * 0.15, s * 0.13, "#140404");
    glinderOval(ctx, -s * 0.7 * sx, side * s * 0.44 * sy, s * 0.08, s * 0.07, layer ? "#ff3a22" : "#c01818");
    ctx.strokeStyle = layer ? "rgba(255, 106, 24, 0.55)" : "rgba(192, 24, 24, 0.4)";
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.quadraticCurveTo(-s * 0.42 * sx, side * s * 0.55 * sy, -s * 1.18 * sx, side * s * 0.36 * sy);
    ctx.moveTo(rootX - s * 0.04, rootY);
    ctx.quadraticCurveTo(-s * 0.28 * sx, side * s * 0.82 * sy, -s * 0.92 * sx, side * s * 0.78 * sy);
    ctx.stroke();
  }

  function drawGlinder(ctx, e, s) {
    s = glinderR(s, 30);
    var ph = e.phase || 0;
    var dying = !!e.glinderDying;
    var ash = Math.max(0, Math.min(1, e.glinderAsh || 0));
    var flap = 0.84 + Math.sin(ph * (dying ? 18 : 9)) * (dying ? 0.26 : 0.14);
    var bob = Math.sin(ph * 4.4) * s * 0.05;
    var pulse = 0.72 + Math.sin(ph * 7.2) * 0.28;
    var i;
    ctx.save();
    try {
      ctx.globalAlpha *= Math.max(0.05, 1 - ash * 0.94);
      ctx.translate(0, bob);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      glinderOval(ctx, -s * 0.02, s * 0.72, s * (0.36 + pulse * 0.1), s * (0.5 + pulse * 0.1), "rgba(255, 90, 20, 0.28)");
      glinderOval(ctx, -s * 0.02, s * 0.82, s * 0.18, s * 0.26, "rgba(255, 210, 74, 0.32)");
      ctx.restore();

      drawGlinderWing(ctx, s, 1, flap * 0.9, 0);
      drawGlinderWing(ctx, s, -1, flap * 0.94, 0);
      drawGlinderWing(ctx, s, -1, flap, 1);
      ctx.save();
      ctx.globalAlpha *= 0.72;
      drawGlinderWing(ctx, s, 1, flap * 1.02, 1);
      ctx.restore();

      var cape = Math.sin(ph * 3.6) * s * 0.1;
      ctx.fillStyle = "rgba(28, 6, 6, 0.72)";
      ctx.beginPath();
      ctx.moveTo(-s * 0.04, -s * 0.14);
      ctx.quadraticCurveTo(-s * 1.18 + cape, s * 0.14, -s * 0.52, s * 0.88);
      ctx.lineTo(s * 0.06, s * 0.24);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#2a0c0c";
      ctx.lineWidth = glinderR(s * 0.1, 2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(s * 0.06, 0);
      ctx.lineTo(-s * 0.2, s * 0.24);
      ctx.lineTo(-s * 0.4, s * 0.12);
      ctx.stroke();
      glinderOval(ctx, -s * 0.42, s * 0.1, s * 0.07, s * 0.06, "#4a1010");

      glinderOval(ctx, -s * 0.02, s * 0.36, s * 0.2, s * 0.4, "#1a0808");
      glinderOval(ctx, -s * 0.02, s * 0.5, s * 0.17, s * 0.36, "#4a1410");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      glinderOval(ctx, -s * 0.02, s * 0.58, s * 0.13 * pulse, s * 0.3 * pulse, "#ff7a18");
      glinderOval(ctx, -s * 0.02, s * 0.72, s * 0.09 * pulse, s * 0.22 * pulse, "#ffd24a");
      glinderOval(ctx, -s * 0.02, s * 0.86, s * 0.055, s * 0.1, "#fff4c4");
      ctx.restore();
      ctx.strokeStyle = "rgba(26, 8, 4, 0.75)";
      ctx.lineWidth = 1.2;
      for (i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(-s * 0.02, s * 0.32 + i * s * 0.13, glinderR(s * (0.16 - i * 0.018), 2), glinderR(s * 0.07, 2), 0, 0.12, Math.PI - 0.12);
        ctx.stroke();
      }

      ctx.strokeStyle = "#1a0808";
      ctx.lineWidth = glinderR(s * 0.16, 3);
      ctx.beginPath();
      ctx.moveTo(s * 0.04, s * 0.3);
      ctx.lineTo(s * 0.1, s * 0.58);
      ctx.lineTo(s * 0.04, s * 0.92);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, s * 0.32);
      ctx.lineTo(-s * 0.14, s * 0.6);
      ctx.lineTo(-s * 0.08, s * 0.96);
      ctx.stroke();
      ctx.strokeStyle = "#8a1418";
      ctx.lineWidth = glinderR(s * 0.1, 2);
      ctx.beginPath();
      ctx.moveTo(s * 0.1, s * 0.58);
      ctx.lineTo(s * 0.04, s * 0.88);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.14, s * 0.6);
      ctx.lineTo(-s * 0.08, s * 0.92);
      ctx.stroke();
      glinderOval(ctx, s * 0.1, s * 0.56, s * 0.08, s * 0.07, "#4a1010");
      glinderOval(ctx, -s * 0.14, s * 0.58, s * 0.08, s * 0.07, "#4a1010");
      ctx.strokeStyle = "#1a0404";
      ctx.lineWidth = glinderR(s * 0.08, 2);
      ctx.beginPath();
      ctx.moveTo(s * 0.04, s * 0.92);
      ctx.lineTo(s * 0.16, s * 1.02);
      ctx.moveTo(-s * 0.08, s * 0.96);
      ctx.lineTo(s * 0.04, s * 1.06);
      ctx.stroke();

      glinderOval(ctx, -s * 0.04, s * 0.3, s * 0.28, s * 0.2, "#1a0808");
      glinderOval(ctx, s * 0.02, s * 0.28, s * 0.22, s * 0.16, "#4a1010");
      glinderOval(ctx, s * 0.06, s * 0.24, s * 0.12, s * 0.1, "#c01818");

      glinderOval(ctx, s * 0.04, s * 0.04, s * 0.26, s * 0.32, "#2a0c0c");
      glinderOval(ctx, s * 0.08, -s * 0.02, s * 0.2, s * 0.24, "#5a1014");
      glinderOval(ctx, s * 0.16, -s * 0.1, s * 0.13, s * 0.12, "#8a1418");
      glinderOval(ctx, s * 0.1, s * 0.06, s * 0.12, s * 0.1, "#6a1010");
      glinderOval(ctx, s * 0.18, -s * 0.12, s * 0.055, s * 0.045, "#ff6a28");
      glinderOval(ctx, s * 0.12, s * 0.04, s * 0.045, s * 0.035, "#c01818");
      ctx.fillStyle = "#1a0404";
      ctx.fillRect(-s * 0.12, s * 0.14, s * 0.34, s * 0.055);
      ctx.fillStyle = "#c01818";
      ctx.fillRect(-s * 0.1, s * 0.16, s * 0.3, 1.6);

      glinderOval(ctx, s * 0.18, -s * 0.2, s * 0.16, s * 0.1, "#3a0c0c");
      glinderOval(ctx, s * 0.14, -s * 0.18, s * 0.08, s * 0.055, "#8a1818");

      ctx.strokeStyle = "#2a0c0c";
      ctx.lineWidth = glinderR(s * 0.11, 2);
      ctx.beginPath();
      ctx.moveTo(s * 0.12, s * 0.02);
      ctx.lineTo(s * 0.4, s * 0.2);
      ctx.lineTo(s * 0.6, s * 0.08);
      ctx.stroke();
      glinderOval(ctx, s * 0.62, s * 0.06, s * 0.08, s * 0.07, "#4a1010");
      ctx.strokeStyle = "#c01818";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(s * 0.62, s * 0.04);
      ctx.lineTo(s * 0.76, -s * 0.02);
      ctx.moveTo(s * 0.62, s * 0.08);
      ctx.lineTo(s * 0.74, s * 0.16);
      ctx.stroke();

      glinderOval(ctx, s * 0.28, -s * 0.28, s * 0.24, s * 0.16, "#2a0c0c");
      glinderOval(ctx, s * 0.32, -s * 0.3, s * 0.18, s * 0.1, "#5a1414");
      glinderOval(ctx, s * 0.48, -s * 0.2, s * 0.24, s * 0.26, "#1a0808");
      glinderOval(ctx, s * 0.52, -s * 0.2, s * 0.18, s * 0.2, "#3a1010");
      glinderOval(ctx, s * 0.4, -s * 0.36, s * 0.05, s * 0.04, "#c01818");
      glinderOval(ctx, s * 0.4, -s * 0.36, s * 0.022, s * 0.018, "#ff6a28");
      glinderOval(ctx, s * 0.6, -s * 0.3, s * 0.13, s * 0.11, "#140404");
      glinderOval(ctx, s * 0.62, -s * 0.3, s * 0.09, s * 0.08, "#c01818");
      glinderOval(ctx, s * 0.64, -s * 0.31, s * 0.04, s * 0.035, "#ff6a18");
      glinderOval(ctx, s * 0.66, -s * 0.32, s * 0.016, s * 0.014, "#ffe08a");
      glinderOval(ctx, s * 0.6, -s * 0.08, s * 0.13, s * 0.11, "#140404");
      glinderOval(ctx, s * 0.62, -s * 0.08, s * 0.09, s * 0.08, "#c01818");
      glinderOval(ctx, s * 0.64, -s * 0.09, s * 0.04, s * 0.035, "#ff6a18");
      glinderOval(ctx, s * 0.66, -s * 0.1, s * 0.016, s * 0.014, "#ffe08a");
      ctx.fillStyle = "#1a0808";
      ctx.beginPath();
      ctx.moveTo(s * 0.62, -s * 0.16);
      ctx.lineTo(s * 0.82, -s * 0.28);
      ctx.lineTo(s * 0.78, -s * 0.12);
      ctx.lineTo(s * 0.64, -s * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.62, -s * 0.04);
      ctx.lineTo(s * 0.82, s * 0.08);
      ctx.lineTo(s * 0.78, 0);
      ctx.lineTo(s * 0.64, -s * 0.06);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#1a0808";
      ctx.lineWidth = 1.65;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s * 0.34, -s * 0.4);
      ctx.quadraticCurveTo(s * 0.52, -s * 0.88, s * 0.44, -s * 1.08);
      ctx.moveTo(s * 0.28, -s * 0.38);
      ctx.quadraticCurveTo(s * 0.12, -s * 0.82, s * 0.08, -s * 1.02);
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      glinderOval(ctx, s * 0.44, -s * 1.08, s * 0.055, s * 0.05, "#ff6a18");
      glinderOval(ctx, s * 0.08, -s * 1.02, s * 0.05, s * 0.045, "#ff6a18");
      glinderOval(ctx, s * 0.44, -s * 1.08, s * 0.025, s * 0.022, "#ffe08a");
      glinderOval(ctx, s * 0.08, -s * 1.02, s * 0.022, s * 0.02, "#ffe08a");
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (i = 0; i < 5; i++) {
        var sa = ph * 3 + i * 1.26;
        glinderOval(ctx, -s * 0.02 + Math.cos(sa) * s * 0.22, s * 0.7 + Math.sin(sa * 1.4) * s * 0.28, 1.7, 1.7, i % 2 ? "#ffd24a" : "#ff6a18");
      }
      if (dying) {
        var glow = 0.55 + (1 - ash) * 0.5;
        ctx.globalAlpha *= glow;
        glinderOval(ctx, -s * 0.02, s * 0.52, s * (0.28 + ash * 0.22), s * (0.48 + ash * 0.28), "rgba(255, 74, 24, 0.55)");
        glinderOval(ctx, s * 0.62, -s * 0.3, s * (0.1 + ash * 0.08), s * (0.09 + ash * 0.07), "#ffe08a");
        glinderOval(ctx, s * 0.62, -s * 0.08, s * (0.1 + ash * 0.08), s * (0.09 + ash * 0.07), "#ff6a28");
        glinderOval(ctx, s * 0.44, -s * 1.08, s * (0.08 + ash * 0.06), s * 0.07, "#ff4a18");
        glinderOval(ctx, s * 0.08, -s * 1.02, s * (0.07 + ash * 0.05), s * 0.06, "#ff4a18");
      }
      ctx.restore();
    } finally {
      ctx.restore();
    }
  }

  G.drawEnemy = function (ctx, e) {
    if (!e || !e.def) return;
    if (e.hideDraw || (e.stealth || 0) > 0.92) return;
    var s = e.def.size;
    var ph = e.phase || 0;
    var t = e.type;
    drawPhase = ph;
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.flash > 0) ctx.globalAlpha = 0.6;
    if (e.stealth > 0.2) ctx.globalAlpha *= (e.revealT || 0) > 0 ? 0.55 : 0.28;
    var fly = !!(e.def && e.def.flying);
    if (!((e.stealth || 0) > 0.2)) {
      var shA = 0.32;
      if (e.glinderDying) {
        shA *= Math.max(0.08, 1 - (e.glinderAsh || 0) * 0.9) * Math.max(0.12, 1 - (e.zDraw || 0) / 320);
      }
      ctx.fillStyle = "rgba(0,0,0," + shA + ")";
      ctx.beginPath();
      ctx.ellipse(fly ? 5 : 0, s * (fly ? 1.35 : 0.85), s * (fly ? 0.62 : 0.85), s * (fly ? 0.18 : 0.3), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if ((e.chargeWindup || 0) > 0) {
      var glow = 0.25 + (1 - e.chargeWindup / (e.chargeWindupMax || 0.9)) * 0.45;
      ctx.strokeStyle = e.chargeRico ? "rgba(255, 80, 40, " + glow + ")" : "rgba(255, 210, 70, " + glow + ")";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, s + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.kaskaVuln || e.kaskaStep === "stun" || (e.kingStun || 0) > 0) {
      var pulse = 0.45 + Math.sin((e.phase || 0) * 14) * 0.25;
      ctx.strokeStyle = (e.kingStun || 0) > 0
        ? "rgba(255, 224, 138, " + (0.55 + Math.sin((e.phase || 0) * 16) * 0.35) + ")"
        : "rgba(255, 210, 74, " + pulse + ")";
      ctx.lineWidth = (e.kingStun || 0) > 0 ? 6 : 4;
      ctx.beginPath();
      ctx.arc(0, 0, s + ((e.kingStun || 0) > 0 ? 18 : 14), 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.zDraw) {
      var zd = Number(e.zDraw);
      var zCap = e.glinderDying ? 420 : (e.cutKind === "hive_realm" ? 200 : 120);
      if (isFinite(zd) && zd > 0) ctx.translate(0, -Math.min(zd, zCap));
    }
    ctx.rotate(t === "hive_pillar" || t === "hive_flower" || t === "hive_cocoon" || t === "hive_cell" ? 0 : (e.rot || 0));

    if (t === "orb_escudo") {
      oval(ctx, 0, 0, s, s, "#ffe08a");
      ctx.strokeStyle = "#fff4c4";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, s + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(200, 140, 40, 0.7)";
      ctx.lineWidth = 1.4;
      for (var hx = 0; hx < 6; hx++) {
        var ha = (Math.PI / 3) * hx;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ha) * s * 0.3, Math.sin(ha) * s * 0.3);
        ctx.lineTo(Math.cos(ha) * s, Math.sin(ha) * s);
        ctx.stroke();
      }
    } else if (t === "mini_beemote") {
      beeBody(ctx, e, s);
    } else if (t === "hive_bee") {
      drawHiveSwarmBee(ctx, e, s, 0);
    } else if (t === "elite_bee") {
      drawHiveSwarmBee(ctx, e, s, 1);
    } else if (t === "royal_bee") {
      drawHiveSwarmBee(ctx, e, s, 2);
    } else if (t === "hive_cell") {
      drawHiveCell(ctx, e, s);
    } else if (t === "hive_cocoon") {
      drawHiveCocoon(ctx, e, s);
    } else if (t === "hive_pillar") {
      drawHivePillar(ctx, e, s);
    } else if (t === "hive_flower") {
      drawHiveFlower(ctx, e, s);
    } else if (t === "chefe_megatanque") {
      if (e.fallen) {
        ctx.globalAlpha *= 0.7;
        ctx.rotate(Math.PI / 2);
        ctx.scale(1, 0.62);
      }
      drawBeequeen(ctx, e, s);
    } else if (t === "chefe_beeking") {
      if (e.fallen) {
        ctx.globalAlpha *= 0.7;
        ctx.rotate(-Math.PI / 2);
        ctx.scale(1, 0.62);
      }
      drawBeeking(ctx, e, s);
    } else if (t === "chefe_invasao") {
      var p2i = !!(e.p2 || e.invP2);
      var capeS = Math.sin(ph * 4.2) * s * 0.16;
      var radio = e.radioLift || 0;
      if (p2i) {
        ctx.fillStyle = "#102010";
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, -s * 0.38);
        ctx.quadraticCurveTo(-s * 1.7 + capeS, 0.1, -s * 0.55, s * 1.12);
        ctx.lineTo(-s * 0.02, s * 0.32);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#1f5c28";
        ctx.beginPath();
        ctx.moveTo(-s * 0.12, -s * 0.28);
        ctx.quadraticCurveTo(-s * 1.28 + capeS, 0, -s * 0.38, s * 0.92);
        ctx.lineTo(0, s * 0.22);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#e8c86a";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-s * 0.18, -s * 0.2);
        ctx.quadraticCurveTo(-s * 1.22 + capeS, 0, -s * 0.36, s * 0.86);
        ctx.stroke();
        insectLegs(ctx, s * 0.8, 2, "#14240c");
        oval(ctx, 0, 0, s * 0.88, s * 1.02, "#1c4a22");
        oval(ctx, 0.6, -0.5, s * 0.74, s * 0.88, "#3d8a3a");
        oval(ctx, s * 0.02, s * 0.12, s * 0.5, s * 0.28, "#c4a24a");
        oval(ctx, 0, -s * 0.58, s * 0.66, s * 0.28, "#14240c");
        ctx.strokeStyle = "#ffe08a";
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        ctx.moveTo(-s * 0.16, -s * 0.7);
        ctx.quadraticCurveTo(-s * 0.32, -s * 1.22, -s * 0.12, -s * 1.38);
        ctx.moveTo(s * 0.16, -s * 0.7);
        ctx.quadraticCurveTo(s * 0.32, -s * 1.22, s * 0.12, -s * 1.38);
        ctx.moveTo(0, -s * 0.72);
        ctx.lineTo(0, -s * 1.46);
        ctx.stroke();
        oval(ctx, -s * 0.12, -s * 1.38, 2.6, 2.6, "#ffe08a");
        oval(ctx, s * 0.12, -s * 1.38, 2.6, 2.6, "#ffe08a");
        oval(ctx, 0, -s * 1.46, 3.2, 3.2, "#b4ff40");
        visor(ctx, s * 0.08, -s * 0.18, s * 0.46, s * 0.3, "#06150c");
        ctx.fillStyle = "#e8c86a";
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.12);
        ctx.lineTo(s * 0.18, s * 0.26);
        ctx.lineTo(-s * 0.18, s * 0.26);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#14240c";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-s * 0.26, -s * 0.08);
        ctx.lineTo(-s * 0.62, -s * 1.32);
        ctx.stroke();
        ctx.fillStyle = "#245a28";
        ctx.beginPath();
        ctx.moveTo(-s * 0.62, -s * 1.32);
        ctx.lineTo(-s * 0.04, -s * 1.16);
        ctx.lineTo(-s * 0.58, -s * 0.82);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffe08a";
        ctx.fillRect(-s * 0.58, -s * 1.24, s * 0.4, 3.4);
        ctx.fillRect(-s * 0.54, -s * 1.12, s * 0.28, 2);
        barrel(ctx, s * 0.38, -s * 0.24, s * 0.92, 3.6, "#0b1a12");
        barrel(ctx, s * 0.38, s * 0.24, s * 0.92, 3.6, "#0b1a12");
        ctx.fillStyle = "#8ad422";
        ctx.fillRect(s * 0.38 + s * 0.78, -s * 0.28, 5, 8);
        ctx.fillRect(s * 0.38 + s * 0.78, s * 0.2, 5, 8);
        var ry = -s * 0.08 - radio * s * 0.55;
        ctx.fillStyle = "#1a3018";
        ctx.fillRect(s * 0.18, ry - 3, 7, 11);
        ctx.fillStyle = "#b4ff40";
        ctx.fillRect(s * 0.2, ry - 10 - radio * 6, 3, 10);
        oval(ctx, s * 0.21, ry - 12 - radio * 6, 3.4, 3.4, "#ffe08a");
        ctx.strokeStyle = "rgba(232, 200, 106, 0.7)";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, s + 7, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#1a4a1a";
        ctx.beginPath();
        ctx.moveTo(-s * 0.15, -s * 0.3);
        ctx.quadraticCurveTo(-s * 1.35 + capeS, 0, -s * 0.4, s * 0.85);
        ctx.lineTo(-s * 0.05, s * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#2f7a32";
        ctx.beginPath();
        ctx.moveTo(-s * 0.1, -s * 0.22);
        ctx.quadraticCurveTo(-s * 1.05 + capeS, 0, -s * 0.28, s * 0.7);
        ctx.lineTo(0, s * 0.18);
        ctx.closePath();
        ctx.fill();
        insectLegs(ctx, s * 0.72, 2, "#1a3010");
        oval(ctx, 0, 0, s * 0.78, s * 0.92, "#245a28");
        oval(ctx, 0.5, -0.4, s * 0.66, s * 0.8, "#3d8a3a");
        oval(ctx, 0, -s * 0.52, s * 0.58, s * 0.24, "#1a3010");
        ctx.strokeStyle = "#8ad422";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-s * 0.12, -s * 0.62);
        ctx.quadraticCurveTo(-s * 0.22, -s * 1.05, -s * 0.08, -s * 1.18);
        ctx.moveTo(s * 0.12, -s * 0.62);
        ctx.quadraticCurveTo(s * 0.22, -s * 1.05, s * 0.08, -s * 1.18);
        ctx.stroke();
        oval(ctx, -s * 0.08, -s * 1.18, 2.2, 2.2, "#b4ff40");
        oval(ctx, s * 0.08, -s * 1.18, 2.2, 2.2, "#b4ff40");
        visor(ctx, s * 0.08, -s * 0.16, s * 0.4, s * 0.26, "#0a2010");
        ctx.fillStyle = "#8ad422";
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.1);
        ctx.lineTo(s * 0.16, s * 0.22);
        ctx.lineTo(-s * 0.16, s * 0.22);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#1a3010";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-s * 0.22, -s * 0.05);
        ctx.lineTo(-s * 0.55, -s * 1.15);
        ctx.stroke();
        ctx.fillStyle = "#2a6a28";
        ctx.beginPath();
        ctx.moveTo(-s * 0.55, -s * 1.15);
        ctx.lineTo(-s * 0.08, -s * 1.02);
        ctx.lineTo(-s * 0.52, -s * 0.78);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#b4ff40";
        ctx.fillRect(-s * 0.5, -s * 1.08, s * 0.32, 3);
        barrel(ctx, s * 0.32, -s * 0.22, s * 0.78, 3.2, "#0b1a12");
        barrel(ctx, s * 0.32, s * 0.22, s * 0.78, 3.2, "#0b1a12");
        ctx.strokeStyle = "rgba(180, 255, 64, 0.55)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, s + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      if ((e.moralePulse || 0) > 0) {
        ctx.strokeStyle = "rgba(232, 200, 106, " + (0.25 + e.moralePulse * 0.4) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, s + 14, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (t === "fuzileiro_alien" || t === "fuzileiro_elite" || t === "fuzileiro_veterano") {
      var vet = t === "fuzileiro_veterano";
      var eli = t === "fuzileiro_elite" || vet;
      insectLegs(ctx, s * (vet ? 1.08 : 1), 3, "#1a3018");
      oval(ctx, -s * 0.2, 0, s * 0.7, s * 0.48, vet ? "#1a3a22" : "#2a5a30");
      oval(ctx, s * 0.28, 0, s * 0.5, s * 0.42, eli ? "#3d9a58" : "#4aa36a");
      if (eli) {
        ctx.fillStyle = "#c4a24a";
        ctx.fillRect(-s * 0.38, -s * 0.38, 4, s * 0.76);
        oval(ctx, -s * 0.08, -s * 0.42, s * 0.22, s * 0.12, "#1a3018");
        oval(ctx, -s * 0.08, s * 0.42, s * 0.22, s * 0.12, "#1a3018");
      }
      ctx.fillStyle = "#1a3018";
      ctx.fillRect(-s * 0.4, -s * 0.32, 3, s * 0.64);
      eye(ctx, s * 0.42, -s * 0.1, s * 0.1, "#0a2010");
      eye(ctx, s * 0.42, s * 0.1, s * 0.1, "#0a2010");
      mandibles(ctx, s * 0.55, "#143018");
      ctx.fillStyle = "#1a3018";
      ctx.fillRect(s * 0.45, -2.4, s * (eli ? 1.05 : 0.85), eli ? 5.4 : 4.8);
      ctx.fillStyle = eli ? "#ffe08a" : "#8ad422";
      ctx.fillRect(s * (eli ? 1.32 : 1.15), -1.5, s * 0.22, 3);
      if (vet) {
        ctx.strokeStyle = "rgba(232, 200, 106, 0.55)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, s + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (t === "batedor_alien" || t === "batedor_elite" || t === "infiltrador_alien") {
      var inf = t === "infiltrador_alien";
      var sco = t === "batedor_elite" || inf;
      insectLegs(ctx, s * (sco ? 1.2 : 1.12), 3, inf ? "#102010" : "#1a3018");
      oval(ctx, -s * 0.15, 0, s * 0.58, s * 0.32, inf ? "#163018" : "#2a5a30");
      oval(ctx, s * 0.38, 0, s * 0.42, s * 0.34, sco ? "#c8ff6a" : "#8ad46a");
      eye(ctx, s * 0.5, -s * 0.08, s * 0.09, "#0a2010");
      eye(ctx, s * 0.5, s * 0.08, s * 0.09, "#0a2010");
      mandibles(ctx, s * 0.58, "#143018");
      if (sco) {
        ctx.fillStyle = "rgba(200, 255, 120, 0.35)";
        ctx.beginPath();
        ctx.moveTo(-s * 0.55, -s * 0.08);
        ctx.lineTo(-s * 1.05, -s * 0.28);
        ctx.lineTo(-s * 0.55, s * 0.08);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#1a3018";
      ctx.fillRect(s * 0.42, -1.8, s * (sco ? 0.82 : 0.7), 3.6);
      ctx.fillStyle = inf ? "#ffe08a" : "#c8ff6a";
      ctx.fillRect(s * (sco ? 1.08 : 0.95), -1.1, s * 0.18, 2.2);
    } else if (t === "pistoleiro_alien" || t === "pistoleiro_elite" || t === "medico_alien") {
      var med = t === "medico_alien";
      var pel = t === "pistoleiro_elite" || med;
      insectLegs(ctx, s, 2, "#1a3018");
      oval(ctx, -s * 0.12, 0, s * 0.55, s * 0.4, med ? "#1a4a32" : "#2a6a48");
      oval(ctx, s * 0.32, 0, s * 0.4, s * 0.36, pel ? "#5ee0a4" : "#6ad49a");
      eye(ctx, s * 0.44, -s * 0.08, s * 0.09, "#0a2010");
      eye(ctx, s * 0.44, s * 0.08, s * 0.09, "#0a2010");
      ctx.fillStyle = "#e8ffe8";
      ctx.fillRect(-2, -s * 0.42, 4, 10);
      ctx.fillRect(-5, -s * 0.32, 10, 4);
      if (pel) {
        oval(ctx, -s * 0.42, 0, s * 0.28, s * 0.34, "#245a40");
        ctx.fillStyle = "#7cffb0";
        ctx.fillRect(-s * 0.5, -2, 8, 4);
      }
      ctx.fillStyle = "#143018";
      ctx.fillRect(s * 0.38, -s * 0.28, s * 0.55, 3.2);
      ctx.fillRect(s * 0.38, s * 0.08, s * 0.55, 3.2);
      ctx.fillStyle = "#8ad422";
      ctx.fillRect(s * 0.82, -s * 0.26, 4, 2.4);
      ctx.fillRect(s * 0.82, s * 0.1, 4, 2.4);
    } else if (t === "heal_station") {
      var pulseH = 0.85 + Math.sin(ph * 6) * 0.15;
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(0, s * 0.55, s * 0.85, s * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      oval(ctx, 0, s * 0.12, s * 0.72, s * 0.42, "#143828");
      oval(ctx, 0, -s * 0.08, s * 0.58, s * 0.5, "#2a6a48");
      oval(ctx, 0, -s * 0.22, s * 0.42, s * 0.38, "#5ee0a4");
      ctx.globalCompositeOperation = "lighter";
      oval(ctx, 0, -s * 0.28, s * 0.22 * pulseH, s * 0.22 * pulseH, "rgba(180, 255, 200, 0.7)");
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#e8ffe8";
      ctx.fillRect(-2.2, -s * 0.42, 4.4, s * 0.55);
      ctx.fillRect(-s * 0.22, -s * 0.18, s * 0.44, 4.4);
      ctx.strokeStyle = "rgba(124, 255, 176, " + (0.35 + pulseH * 0.4) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s + 6, 0, Math.PI * 2);
      ctx.stroke();
    } else if (t === "dobrador_luz") {
      var bob = Math.sin(ph * 3.2) * 3;
      ctx.translate(0, bob);
      ctx.fillStyle = "rgba(160, 210, 255, 0.22)";
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8ab8d8";
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.05);
      ctx.lineTo(s * 0.72, 0);
      ctx.lineTo(0, s * 0.85);
      ctx.lineTo(-s * 0.72, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e8f6ff";
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.78);
      ctx.lineTo(s * 0.42, 0);
      ctx.lineTo(0, s * 0.58);
      ctx.lineTo(-s * 0.42, 0);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = "lighter";
      oval(ctx, 0, -s * 0.08, s * 0.22, s * 0.28, "rgba(255, 255, 255, 0.85)");
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(200, 240, 255, 0.7)";
      ctx.lineWidth = 1.6;
      for (var sh = 0; sh < 3; sh++) {
        var sa = ph * 1.4 + sh * 2.1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(sa) * s * 0.5, Math.sin(sa) * s * 0.4);
        ctx.lineTo(Math.cos(sa) * s * 1.25, Math.sin(sa) * s * 0.95);
        ctx.stroke();
      }
    } else if (t === "fogueira") {
      ctx.fillStyle = "#3a2010";
      ctx.fillRect(-s * 0.7, s * 0.15, s * 1.4, s * 0.35);
      ctx.fillStyle = e.lit === false && e.glinderCoal ? "#2a1810" : "#5a3010";
      ctx.save();
      ctx.rotate(-0.4);
      ctx.fillRect(-s * 0.8, 0, s * 1.5, 5);
      ctx.restore();
      ctx.save();
      ctx.rotate(0.35);
      ctx.fillRect(-s * 0.75, 2, s * 1.4, 5);
      ctx.restore();
      if (e.glinderCoal && !e.lit) {
        var age = Math.min(1, (e.coalAge || 0) / 18);
        var coal = 0.12 + age * 0.72 + Math.sin(ph * 7) * (0.06 + age * 0.16);
        ctx.globalCompositeOperation = "lighter";
        oval(ctx, 0, -s * 0.08, s * (0.08 + age * 0.12), s * (0.06 + age * 0.1), "rgba(180, 40, 10, " + (0.12 + coal * 0.55) + ")");
        oval(ctx, 2, -s * 0.12, s * (0.04 + age * 0.05), s * (0.03 + age * 0.05), "rgba(255, 90, 30, " + (0.1 + coal * 0.7) + ")");
        ctx.globalCompositeOperation = "source-over";
        var near = !!e.rubNear;
        var bob = Math.sin(ph * 6) * 2.2;
        var promptY = -s * 1.55 + bob;
        ctx.save();
        ctx.rotate(-(e.rot || 0));
        ctx.globalAlpha = near ? 1 : 0.72;
        ctx.fillStyle = "rgba(20, 6, 0, 0.78)";
        ctx.fillRect(-17, promptY - 17, 34, 34);
        ctx.strokeStyle = near ? "#ffe08a" : "#c47820";
        ctx.lineWidth = 2.2;
        ctx.strokeRect(-17, promptY - 17, 34, 34);
        ctx.fillStyle = "#ffe08a";
        ctx.font = "bold 18px Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("E", 0, promptY);
        ctx.restore();
      } else {
        var flick = 0.85 + Math.sin(ph * 14) * 0.2;
        ctx.globalCompositeOperation = "lighter";
        oval(ctx, 0, -s * 0.35 * flick, s * 0.42, s * 0.7 * flick, "rgba(255, 90, 20, 0.75)");
        oval(ctx, 0, -s * 0.5 * flick, s * 0.22, s * 0.45 * flick, "rgba(255, 220, 80, 0.9)");
        ctx.globalCompositeOperation = "source-over";
      }
    } else if (t === "kaska_sentry") {
      ctx.fillStyle = "#5a3010";
      ctx.fillRect(-4, s * 0.2, 8, s * 0.7);
      oval(ctx, 0, -s * 0.1, s * 0.85, s * 0.95, "#c48a20");
      ctx.strokeStyle = "#ffe08a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -s * 0.1, s * 0.72, -0.4, Math.PI + 0.4);
      ctx.stroke();
      oval(ctx, s * 0.15, -s * 0.15, s * 0.22, s * 0.22, "#1a0808");
      ctx.fillStyle = "#3a2010";
      ctx.fillRect(s * 0.2, -s * 0.28, s * 0.85, 5);
      ctx.fillStyle = "#ffd24a";
      ctx.fillRect(s * 0.9, -s * 0.22, 6, 3);
    } else if (t === "beeprincess") {
      if ((e.kneelT || 0) > 0) ctx.translate(0, s * 0.2);
      if (e.princessAct === "thrust") {
        if (e.thrustPhase === "wind") ctx.translate(-s * 0.22, 0);
        else if (e.thrustPhase === "dash") ctx.translate(s * 0.38, 0);
        else if (e.thrustPhase === "stabTell") ctx.translate(-s * 0.08, 0);
        else if (e.thrustPhase === "stab") ctx.translate(s * 0.28 + (e.stabFlash || 0) * 40, 0);
      }
      var capeP = Math.sin(ph * 3.8) * s * 0.14;
      ctx.fillStyle = "#4a2208";
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.12);
      ctx.quadraticCurveTo(-s * 1.55 + capeP, s * 0.08, -s * 0.55, s * 1.22);
      ctx.lineTo(s * 0.12, s * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f0c84a";
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.06);
      ctx.quadraticCurveTo(-s * 1.18 + capeP, s * 0.06, -s * 0.38, s * 0.98);
      ctx.lineTo(s * 0.1, s * 0.12);
      ctx.closePath();
      ctx.fill();
      var flap = 0.55 + Math.sin(ph * 46) * 0.4;
      ctx.save();
      ctx.globalAlpha *= 0.55;
      ctx.fillStyle = "rgba(220, 245, 255, 0.75)";
      ctx.beginPath();
      ctx.ellipse(-s * 0.08, -s * 0.52, s * 0.95, s * (0.16 + flap * 0.22), -0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-s * 0.08, s * 0.52, s * 0.95, s * (0.16 + flap * 0.22), 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-s * 0.28, -s * 0.38, s * 0.62, s * (0.1 + flap * 0.14), -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-s * 0.28, s * 0.38, s * 0.62, s * (0.1 + flap * 0.14), 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "#2a1408";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-s * 0.18, s * 0.55);
      ctx.lineTo(-s * 0.12, s * 0.92);
      ctx.moveTo(-s * 0.02, s * 0.55);
      ctx.lineTo(s * 0.06, s * 0.9);
      ctx.stroke();
      oval(ctx, s * 0.18, -s * 0.02, s * 0.34, s * 0.42, "#d4a024");
      oval(ctx, s * 0.22, -s * 0.16, s * 0.2, s * 0.18, "#ffe08a");
      oval(ctx, s * 0.22, s * 0.14, s * 0.2, s * 0.18, "#ffe08a");
      oval(ctx, s * 0.24, -s * 0.16, s * 0.1, s * 0.08, "rgba(255,244,200,0.55)");
      oval(ctx, s * 0.24, s * 0.14, s * 0.1, s * 0.08, "rgba(255,244,200,0.55)");
      ctx.fillStyle = "#8a5a18";
      ctx.fillRect(s * 0.02, -s * 0.28, s * 0.38, 4);
      oval(ctx, s * 0.12, 0, s * 0.12, s * 0.12, "#7af7ff");
      oval(ctx, -s * 0.12, s * 0.06, s * 0.22, s * 0.2, "#c48a20");
      oval(ctx, -s * 0.22, s * 0.38, s * 0.16, s * 0.32, "#3a2208");
      oval(ctx, -s * 0.08, s * 0.4, s * 0.15, s * 0.3, "#5a3010");
      oval(ctx, -s * 0.2, s * 0.38, s * 0.1, s * 0.24, "#f0b42a");
      oval(ctx, -s * 0.06, s * 0.4, s * 0.09, s * 0.22, "#f0b42a");
      ctx.fillStyle = "#1a0c04";
      ctx.fillRect(-s * 0.28, s * 0.22, 3.2, s * 0.28);
      ctx.fillRect(-s * 0.14, s * 0.24, 3.2, s * 0.26);
      ctx.fillStyle = "#c8fff0";
      ctx.beginPath();
      ctx.moveTo(-s * 0.48, s * 0.02);
      ctx.lineTo(-s * 0.72, -0.5);
      ctx.lineTo(-s * 0.88, s * 0.04);
      ctx.lineTo(-s * 0.72, s * 0.08);
      ctx.closePath();
      ctx.fill();
      oval(ctx, s * 0.58, 0, s * 0.28, s * 0.3, "#3a2208");
      oval(ctx, s * 0.62, 0, s * 0.22, s * 0.24, "#c48a20");
      eye(ctx, s * 0.72, -s * 0.08, s * 0.1, "#fff4c4");
      eye(ctx, s * 0.72, s * 0.08, s * 0.1, "#fff4c4");
      mandibles(ctx, s * 0.78, "#1a0c04");
      ctx.strokeStyle = "#1a0c04";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(s * 0.62, -s * 0.18);
      ctx.quadraticCurveTo(s * 0.95, -s * 0.72, s * 0.72, -s * 0.92);
      ctx.moveTo(s * 0.62, s * 0.18);
      ctx.quadraticCurveTo(s * 0.95, s * 0.72, s * 0.72, s * 0.92);
      ctx.stroke();
      ctx.fillStyle = "#c47820";
      ctx.beginPath();
      ctx.ellipse(s * 0.48, -s * 0.38, s * 0.28, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.ellipse(s * 0.48, -s * 0.42, s * 0.26, s * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      var jewels = [-0.18, 0, 0.18];
      for (var jc = 0; jc < jewels.length; jc++) {
        var jx = s * 0.48 + jewels[jc] * s;
        ctx.fillStyle = "#ffd24a";
        ctx.beginPath();
        ctx.moveTo(jx - s * 0.06, -s * 0.44);
        ctx.lineTo(jx, -s * (jc === 1 ? 0.88 : 0.74));
        ctx.lineTo(jx + s * 0.06, -s * 0.44);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = jc === 1 ? "#7af7ff" : "#ffe08a";
        ctx.beginPath();
        ctx.arc(jx, -s * (jc === 1 ? 0.78 : 0.66), 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
      if (e.heirArmed === false) {
        if ((e.heirSwordK || 0) >= 1) {
          ctx.save();
          ctx.translate(s * 0.38, s * 0.18);
          drawRoyalGreatsword(ctx, s * 0.82, true);
          ctx.restore();
        }
        if ((e.heirScepterK || 0) >= 1) {
          ctx.save();
          ctx.translate(-s * 0.18, s * 0.22);
          drawRoyalScepter(ctx, s * 0.78, true);
          ctx.restore();
        }
      } else {
        var lunge = e.princessAct === "thrust" && e.thrustPhase === "dash";
        var stabbing = e.princessAct === "thrust" && (e.thrustPhase === "stab" || e.thrustPhase === "stabTell");
        ctx.save();
        ctx.translate(lunge ? s * 0.62 : (stabbing ? s * 0.5 : s * 0.38), lunge ? s * 0.06 : s * 0.18);
        if (lunge) ctx.rotate(-0.06);
        if (stabbing && e.thrustPhase === "stab") ctx.rotate(((e.stabAng || e.rot || 0) - (e.thrustAim || 0)) * 0.35);
        drawRoyalGreatsword(ctx, lunge ? s * 1.42 : (stabbing ? s * 1.18 : s * 0.82), !(lunge || stabbing));
        ctx.restore();
        ctx.save();
        ctx.translate(-s * 0.18, s * 0.22);
        drawRoyalScepter(ctx, s * 0.78, true);
        ctx.restore();
      }
    } else if (t === "abelha_enfermeira") {
      buzzWings(ctx, s, ph, 1);
      oval(ctx, 0, 0, s * 0.55, s * 0.4, "#ffe08a");
      ctx.fillStyle = "#c02020";
      ctx.fillRect(-2, -s * 0.35, 4, 10);
      ctx.fillRect(-5, -s * 0.22, 10, 4);
      eye(ctx, s * 0.28, -s * 0.08, 2.4, "#3a2010");
    } else if (t === "abelha_arquiteta") {
      buzzWings(ctx, s, ph, 1);
      oval(ctx, 0, 0, s * 0.58, s * 0.42, "#c4a06a");
      ctx.fillStyle = "#3a2010";
      ctx.beginPath();
      for (var hx = 0; hx < 6; hx++) {
        var ha = (Math.PI / 3) * hx;
        var fn = hx ? ctx.lineTo : ctx.moveTo;
        fn.call(ctx, Math.cos(ha) * s * 0.28, Math.sin(ha) * s * 0.28);
      }
      ctx.closePath();
      ctx.fill();
    } else if (t === "barreira_colmeia") {
      ctx.fillStyle = "#e8c46a";
      ctx.beginPath();
      for (var hw = 0; hw < 6; hw++) {
        var hwa = (Math.PI / 3) * hw;
        var fnw = hw ? ctx.lineTo : ctx.moveTo;
        fnw.call(ctx, Math.cos(hwa) * s, Math.sin(hwa) * s);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#5a3a10";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (t === "formiga_leao") {
      insectLegs(ctx, s * 1.1, 3, "#3a2010");
      oval(ctx, -s * 0.2, 0, s * 0.95, s * 0.7, "#6a3a18");
      oval(ctx, s * 0.45, 0, s * 0.55, s * 0.48, "#8a5a28");
      ctx.fillStyle = "#c4a06a";
      ctx.beginPath();
      ctx.moveTo(s * 0.7, -s * 0.22);
      ctx.lineTo(s * 1.45, -s * 0.55);
      ctx.lineTo(s * 0.85, -s * 0.05);
      ctx.moveTo(s * 0.7, s * 0.22);
      ctx.lineTo(s * 1.45, s * 0.55);
      ctx.lineTo(s * 0.85, s * 0.05);
      ctx.fill();
      eye(ctx, s * 0.55, -s * 0.12, s * 0.12, "#1a0808");
      eye(ctx, s * 0.55, s * 0.12, s * 0.12, "#1a0808");
    } else if (t === "besouro_bombardeiro") {
      insectLegs(ctx, s * 0.7, 2, "#3a2010");
      oval(ctx, -s * 0.15, 0, s * 0.9, s * 0.62, "#3a2410");
      oval(ctx, s * 0.35, 0, s * 0.5, s * 0.45, "#5a3a18");
      ctx.fillStyle = "#c45a22";
      ctx.beginPath();
      ctx.arc(-s * 0.55, 0, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      eye(ctx, s * 0.5, -s * 0.1, s * 0.1, "#ffd24a");
      eye(ctx, s * 0.5, s * 0.1, s * 0.1, "#ffd24a");
    } else if (t === "louva_deus") {
      ctx.strokeStyle = "#2a4a18";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, -s * 0.1);
      ctx.lineTo(-s * 0.55, -s * 0.85);
      ctx.lineTo(s * 0.15, -s * 1.05);
      ctx.moveTo(-s * 0.1, s * 0.1);
      ctx.lineTo(-s * 0.55, s * 0.85);
      ctx.lineTo(s * 0.15, s * 1.05);
      ctx.stroke();
      oval(ctx, 0, 0, s * 0.42, s * 0.7, "#4a7a32");
      oval(ctx, s * 0.35, 0, s * 0.32, s * 0.28, "#6aaa44");
      eye(ctx, s * 0.48, -s * 0.1, s * 0.1, "#1a0808");
      eye(ctx, s * 0.48, s * 0.1, s * 0.1, "#1a0808");
    } else if (t === "chefe_vulto") {
      drawGlinder(ctx, e, s);
    } else if (t === "chefe_arklan") {
      if (e.buried) {
        ctx.fillStyle = "rgba(160, 120, 60, 0.55)";
        ctx.beginPath();
        ctx.ellipse(0, s * 0.2, s * 1.15, s * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#8a6030";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.45 + Math.sin(ph * 10) * 4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        oval(ctx, -s * 0.85, 0, s * 1.15, s * 0.62, "#6a4a22");
        oval(ctx, -s * 0.85, 0, s * 1.0, s * 0.5, "#c4a06a");
        ctx.fillStyle = "#8a6030";
        for (var rg = 0; rg < 5; rg++) ctx.fillRect(-s * 1.55 + rg * s * 0.28, -s * 0.42, 7, s * 0.84);
        oval(ctx, s * 0.35, 0, s * 0.7, s * 0.72, "#5a3818");
        oval(ctx, s * 0.42, 0, s * 0.58, s * 0.58, "#3a2010");
        ctx.fillStyle = "#1a0c08";
        ctx.beginPath();
        ctx.ellipse(s * 0.55, 0, s * 0.42, s * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f0d8a0";
        for (var td = 0; td < 9; td++) {
          var ta = -0.9 + (td / 8) * 1.8;
          ctx.beginPath();
          ctx.moveTo(s * 0.35, Math.sin(ta) * s * 0.38);
          ctx.lineTo(s * 1.15, Math.sin(ta) * s * 0.22);
          ctx.lineTo(s * 0.4, Math.sin(ta) * s * 0.28);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = "#ff6a3a";
        ctx.beginPath();
        ctx.ellipse(s * 0.62, 0, s * 0.18, s * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (t === "minhoca_deserto") {
      if (e.buried) {
        ctx.fillStyle = "rgba(160, 120, 60, 0.5)";
        ctx.beginPath();
        ctx.ellipse(0, s * 0.15, s * 1.05, s * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        oval(ctx, -s * 0.7, 0, s * 0.95, s * 0.48, "#6a4a22");
        oval(ctx, -s * 0.7, 0, s * 0.8, s * 0.38, "#c4a06a");
        oval(ctx, s * 0.28, 0, s * 0.5, s * 0.5, "#5a3818");
        ctx.fillStyle = "#1a0c08";
        ctx.beginPath();
        ctx.ellipse(s * 0.42, 0, s * 0.28, s * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff6a3a";
        ctx.beginPath();
        ctx.ellipse(s * 0.48, 0, s * 0.12, s * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (t === "arklan_spike") {
      ctx.fillStyle = "#5a3414";
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.55);
      ctx.lineTo(s * 0.38, s * 0.55);
      ctx.lineTo(-s * 0.38, s * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c4a06a";
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.45);
      ctx.lineTo(s * 0.16, s * 0.2);
      ctx.lineTo(-s * 0.12, s * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#2a1808";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, -s * 0.4);
      ctx.lineTo(s * 0.12, -s * 0.9);
      ctx.stroke();
      ctx.fillStyle = "#8a5a28";
      ctx.beginPath();
      ctx.ellipse(0, s * 0.52, s * 0.55, s * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (t === "chefe_comandante") {
      drawKaska(ctx, e, s);
    } else if (t === "chefe_fortaleza") {
      ctx.strokeStyle = "#4a1848";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      for (var lg = 0; lg < 4; lg++) {
        var ly = -s * 0.55 + lg * s * 0.38;
        var gaitF = drawPhase * 6 + lg * 0.9;
        var swingF = Math.sin(gaitF) * 10;
        var liftF = Math.max(0, Math.cos(gaitF)) * 8;
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, ly);
        ctx.quadraticCurveTo(-s * 0.9, ly + 18 - liftF, -s * 1.35 + swingF, ly + 28);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * 0.2, ly);
        ctx.quadraticCurveTo(s * 0.9, ly + 18 - Math.max(0, Math.cos(gaitF + Math.PI)) * 8, s * 1.35 + Math.sin(gaitF + Math.PI) * 10, ly + 28);
        ctx.stroke();
      }
      roundRect(ctx, -s * 0.95, -s * 0.85, s * 1.9, s * 1.7, 8);
      ctx.fillStyle = "#6a2468";
      ctx.fill();
      ctx.fillStyle = "#c45cff";
      roundRect(ctx, -s * 0.7, -s * 0.62, s * 1.4, s * 1.25, 6);
      ctx.fill();
      ctx.fillStyle = "#3a1030";
      for (var cell = 0; cell < 8; cell++) {
        var cx = -s * 0.5 + (cell % 4) * s * 0.34;
        var cy = -s * 0.35 + Math.floor(cell / 4) * s * 0.5;
        ctx.beginPath();
        for (var hi = 0; hi < 6; hi++) {
          var ha2 = (Math.PI / 3) * hi;
          var fn = hi ? ctx.lineTo : ctx.moveTo;
          fn.call(ctx, cx + Math.cos(ha2) * 6, cy + Math.sin(ha2) * 6);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#e8a0ff";
      ctx.fillRect(-s * 0.22, -s * 1.25, s * 0.44, s * 0.5);
      oval(ctx, 0, -s * 0.1, s * 0.22, s * 0.22, "#fff");
      oval(ctx, 0, -s * 0.1, s * 0.12, s * 0.12, "#3a1030");
    } else if (t === "chefe_espectro" || t === "veu_clone") {
      ctx.globalAlpha *= 0.82;
      var wing = 0.85 + Math.sin(ph * 8) * 0.12;
      ctx.fillStyle = "#6a48a8";
      ctx.beginPath();
      ctx.ellipse(-s * 0.15, -s * 0.15, s * 1.15 * wing, s * 0.72, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-s * 0.15, s * 0.15, s * 1.15 * wing, s * 0.72, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(232, 210, 255, 0.35)";
      ctx.beginPath();
      ctx.ellipse(-s * 0.2, -s * 0.2, s * 0.7 * wing, s * 0.4, -0.4, 0, Math.PI * 2);
      ctx.fill();
      oval(ctx, s * 0.15, 0, s * 0.42, s * 0.55, "#c8a0ff");
      oval(ctx, s * 0.55, 0, s * 0.32, s * 0.28, "#3a2458");
      eye(ctx, s * 0.68, -s * 0.1, s * 0.12, "#e8d0ff");
      eye(ctx, s * 0.68, s * 0.1, s * 0.12, "#e8d0ff");
      ctx.strokeStyle = "#e8d0ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s * 0.5, -s * 0.22);
      ctx.quadraticCurveTo(s * 0.9, -s * 0.95, s * 0.55, -s * 1.15);
      ctx.moveTo(s * 0.5, s * 0.22);
      ctx.quadraticCurveTo(s * 0.9, s * 0.95, s * 0.55, s * 1.15);
      ctx.stroke();
    } else if (t === "chefe_final") {
      ctx.strokeStyle = "rgba(255, 210, 80, 0.45)";
      ctx.lineWidth = 2;
      for (var ray = 0; ray < 8; ray++) {
        var ra = (Math.PI * 2 * ray) / 8 + ph * 0.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ra) * s * 0.4, Math.sin(ra) * s * 0.4);
        ctx.lineTo(Math.cos(ra) * (s * 1.15 + Math.sin(ph * 5 + ray) * 6), Math.sin(ra) * (s * 1.15 + Math.sin(ph * 5 + ray) * 6));
        ctx.stroke();
      }
      ctx.fillStyle = "#fff36a";
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = (Math.PI / 3) * i - Math.PI / 6;
        var fn = i ? ctx.lineTo : ctx.moveTo;
        fn.call(ctx, Math.cos(a) * s, Math.sin(a) * s);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#3a2010";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
      ctx.fill();
      oval(ctx, 0, 0, s * 0.22, s * 0.22, "#ff6a2a");
      oval(ctx, -s * 0.06, -s * 0.06, s * 0.08, s * 0.08, "#fff");
      ctx.strokeStyle = "#7af7ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.58 + Math.sin(ph * 4) * 3, 0, Math.PI * 2);
      ctx.stroke();
      mandibles(ctx, s * 0.55, "#5a3010");
    } else if (t === "infantaria") {
      insectLegs(ctx, s, 3, "#3a1808");
      oval(ctx, -s * 0.25, 0, s * 0.7, s * 0.42, "#8a3a18");
      ctx.fillStyle = "#5a220c";
      ctx.fillRect(-s * 0.55, -s * 0.32, 4, s * 0.64);
      ctx.fillRect(-s * 0.2, -s * 0.32, 4, s * 0.64);
      oval(ctx, s * 0.45, 0, s * 0.42, s * 0.36, "#c45a2a");
      eye(ctx, s * 0.58, -s * 0.1, s * 0.1);
      eye(ctx, s * 0.58, s * 0.1, s * 0.1);
      mandibles(ctx, s * 0.65, "#2a1008");
    } else if (t === "corredor") {
      insectLegs(ctx, s * 1.15, 3, "#5a3010");
      oval(ctx, -s * 0.15, 0, s * 0.95, s * 0.28, "#c47a20");
      oval(ctx, s * 0.7, 0, s * 0.28, s * 0.22, "#e8a03a");
      eye(ctx, s * 0.82, -s * 0.06, 3);
      eye(ctx, s * 0.82, s * 0.06, 3);
      ctx.fillStyle = "#3a1808";
      ctx.fillRect(s * 0.85, -1.5, s * 0.55, 3);
    } else if (t === "escudeiro") {
      insectLegs(ctx, s, 3, "#2a1808");
      oval(ctx, -s * 0.1, 0, s * 0.7, s * 0.55, "#4a2810");
      ctx.fillStyle = "#c8a060";
      ctx.beginPath();
      ctx.moveTo(s * 0.15, -s * 0.95);
      ctx.quadraticCurveTo(s * 1.15, 0, s * 0.15, s * 0.95);
      ctx.quadraticCurveTo(s * 0.55, 0, s * 0.15, -s * 0.95);
      ctx.fill();
      ctx.fillStyle = "#6a3a18";
      ctx.beginPath();
      ctx.moveTo(s * 0.9, 0);
      ctx.lineTo(s * 1.45, -s * 0.18);
      ctx.lineTo(s * 1.55, 0);
      ctx.lineTo(s * 1.45, s * 0.18);
      ctx.closePath();
      ctx.fill();
      eye(ctx, s * 0.35, -s * 0.18, s * 0.1);
    } else if (t === "atirador") {
      insectLegs(ctx, s * 0.8, 2, "#3a5010");
      oval(ctx, -s * 0.35, 0, s * 0.7, s * 0.5, "#5a8a18");
      oval(ctx, -s * 0.45, 0, s * 0.38, s * 0.38, "#b4ff40");
      oval(ctx, s * 0.4, 0, s * 0.38, s * 0.3, "#8ad422");
      ctx.fillStyle = "#d4ff70";
      ctx.beginPath();
      ctx.moveTo(s * 0.6, -4);
      ctx.lineTo(s * 1.25, 0);
      ctx.lineTo(s * 0.6, 4);
      ctx.closePath();
      ctx.fill();
      eye(ctx, s * 0.52, -s * 0.08, 3.5);
    } else if (t === "tanque") {
      insectLegs(ctx, s * 0.85, 3, "#1a2018");
      roundRect(ctx, -s * 1.05, -s * 0.55, s * 2.1, s * 1.1, 6);
      ctx.fillStyle = "#2a3228";
      ctx.fill();
      roundRect(ctx, -s * 0.7, -s * 0.42, s * 1.4, s * 0.84, 5);
      ctx.fillStyle = "#4a5a48";
      ctx.fill();
      ctx.fillStyle = "#7a8a70";
      ctx.fillRect(-s * 0.55, -s * 0.22, s * 0.35, s * 0.44);
      ctx.fillRect(-s * 0.1, -s * 0.22, s * 0.35, s * 0.44);
      ctx.fillStyle = "#c8d4b0";
      ctx.fillRect(s * 0.25, -5, s * 1.05, 10);
      oval(ctx, s * 0.15, -s * 0.15, 5, 5, "#8ad422");
    } else if (t === "drone") {
      buzzWings(ctx, s, ph, 0.85);
      oval(ctx, 0, 0, s * 0.55, s * 0.38, "#c8a020");
      oval(ctx, s * 0.35, 0, s * 0.32, s * 0.24, "#f0d24a");
      ctx.fillStyle = "#1a0c04";
      ctx.beginPath();
      ctx.moveTo(s * 0.55, 0);
      ctx.lineTo(s * 1.05, -3);
      ctx.lineTo(s * 1.15, 0);
      ctx.lineTo(s * 1.05, 3);
      ctx.closePath();
      ctx.fill();
      eye(ctx, s * 0.48, -s * 0.08, 3.2);
      eye(ctx, s * 0.48, s * 0.08, 3.2);
    } else if (t === "kamikaze") {
      var pulse = 1 + Math.sin(ph * 10) * 0.18;
      ctx.save();
      ctx.globalAlpha = 0.28 + Math.sin(ph * 12) * 0.12;
      ctx.strokeStyle = "#ff6a2a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.55 + Math.sin(ph * 9) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 50, 20, 0.18)";
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.25 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      oval(ctx, 0, 0, s * pulse, s * pulse * 0.85, "#8a1010");
      oval(ctx, 0, 0, s * 0.55 * pulse, s * 0.5 * pulse, "#ff3a2a");
      oval(ctx, 0, 0, s * 0.22, s * 0.22, "#ffe08a");
      insectLegs(ctx, s * 0.7, 2, "#3a0808");
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(4, 4);
      ctx.moveTo(4, -4);
      ctx.lineTo(-4, 4);
      ctx.stroke();
    } else if (t === "medico") {
      insectLegs(ctx, s, 3, "#88aa88");
      oval(ctx, 0, 0, s, s * 0.85, "#d8f0d8");
      oval(ctx, s * 0.15, -s * 0.1, s * 0.28, s * 0.28, "#7cffb0");
      ctx.fillStyle = "#c02020";
      ctx.fillRect(-3, -8, 6, 16);
      ctx.fillRect(-8, -3, 16, 6);
      eye(ctx, s * 0.45, -s * 0.18, 3.5);
    } else if (t === "artilharia") {
      insectLegs(ctx, s * 0.7, 2, "#3a1808");
      oval(ctx, -s * 0.15, 4, s * 0.85, s * 0.5, "#8a4a18");
      ctx.fillStyle = "#3a2010";
      roundRect(ctx, s * 0.05, -s * 1.15, 10, s * 1.05, 3);
      ctx.fill();
      oval(ctx, s * 0.22, -s * 1.15, 8, 6, "#c46a22");
      oval(ctx, -s * 0.35, 2, s * 0.32, s * 0.28, "#5a3010");
    } else if (t === "fragmento") {
      oval(ctx, 0, 0, s, s * 0.85, "#a05020");
      oval(ctx, -4, -2, s * 0.45, s * 0.4, "#d4783a");
      oval(ctx, 6, 3, s * 0.32, s * 0.28, "#ffaa66");
      ctx.strokeStyle = "#3a1808";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.7, 0.2, 2.4);
      ctx.stroke();
    } else if (t === "larva") {
      oval(ctx, -2, 0, s * 1.15, s * 0.7, "#8aaa28");
      oval(ctx, 4, 0, s * 0.55, s * 0.5, "#c8e050");
      ctx.fillStyle = "#5a7018";
      ctx.fillRect(-s * 0.5, -s * 0.5, 2, s);
      ctx.fillRect(-s * 0.1, -s * 0.55, 2, s * 1.1);
      eye(ctx, s * 0.45, -2, 2.4);
    } else if (t === "sombra") {
      ctx.globalAlpha *= 0.85;
      ctx.fillStyle = "#3a2458";
      ctx.beginPath();
      ctx.moveTo(s * 0.9, 0);
      ctx.quadraticCurveTo(s * 0.2, -s * 0.9, -s * 0.9, -s * 0.2);
      ctx.quadraticCurveTo(-s * 0.3, 0, -s * 0.9, s * 0.2);
      ctx.quadraticCurveTo(s * 0.2, s * 0.9, s * 0.9, 0);
      ctx.fill();
      eye(ctx, s * 0.35, -s * 0.12, 3.5, "#e8d0ff");
      eye(ctx, s * 0.35, s * 0.12, 3.5, "#e8d0ff");
    } else if (t === "sniper") {
      insectLegs(ctx, s * 0.65, 2, "#2a3a10");
      oval(ctx, -s * 0.1, 0, s * 0.45, s * 0.7, "#3a5a18");
      oval(ctx, s * 0.25, 0, s * 0.32, s * 0.28, "#5a8a2a");
      ctx.fillStyle = "#1a2010";
      ctx.fillRect(s * 0.35, -2, s * 1.35, 4);
      oval(ctx, s * 1.55, 0, 4, 3, "#8ad422");
      eye(ctx, s * 0.38, -s * 0.12, 3.2);
    } else if (t === "ninho") {
      if (e.nestCharging) {
        ctx.save();
        ctx.globalAlpha = 0.32 + Math.sin(ph * 14) * 0.14;
        ctx.strokeStyle = "#ff6a2a";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, s * 1.7 + Math.sin(ph * 10) * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      oval(ctx, 0, 4, s * 1.05, s * 0.8, "#5a3a10");
      ctx.fillStyle = e.nestCharging ? "#c44a18" : "#8a5a18";
      ctx.beginPath();
      ctx.moveTo(-s, 6);
      ctx.quadraticCurveTo(0, -s * 1.15, s, 6);
      ctx.quadraticCurveTo(0, s * 0.55, -s, 6);
      ctx.fill();
      ctx.fillStyle = "#3a2010";
      for (var hc = 0; hc < 5; hc++) {
        var hx2 = -s * 0.45 + (hc % 3) * s * 0.4;
        var hy2 = -s * 0.15 + Math.floor(hc / 3) * s * 0.4;
        ctx.beginPath();
        for (var h6 = 0; h6 < 6; h6++) {
          var ha3 = (Math.PI / 3) * h6;
          var fn2 = h6 ? ctx.lineTo : ctx.moveTo;
          fn2.call(ctx, hx2 + Math.cos(ha3) * 5, hy2 + Math.sin(ha3) * 5);
        }
        ctx.closePath();
        ctx.fill();
      }
      var stock = e.nestStock | 0;
      for (var ns = 0; ns < stock; ns++) {
        oval(ctx, -s * 0.42 + (ns % 4) * 7, 5 + Math.floor(ns / 4) * 5, 3.2, 2.6, "#c8e050");
      }
    } else if (t === "parasita") {
      oval(ctx, -2, 0, s * 0.85, s * 0.55, "#701848");
      oval(ctx, 5, 1, s * 0.5, s * 0.4, "#a03070");
      ctx.strokeStyle = "#3a0820";
      ctx.lineWidth = 1.5;
      for (var pl = 0; pl < 4; pl++) {
        var pa = -0.8 + pl * 0.55;
        ctx.beginPath();
        ctx.moveTo(s * 0.2, 0);
        ctx.lineTo(Math.cos(pa) * s * 1.1, Math.sin(pa) * s * 0.9);
        ctx.stroke();
      }
      eye(ctx, 6, -2, 2.6, "#ff80c8");
    } else if (t === "criomante") {
      insectLegs(ctx, s, 2, "#4a88aa");
      ctx.fillStyle = "#7ad8ff";
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.85, s * 0.55);
      ctx.lineTo(-s * 0.85, s * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.55);
      ctx.lineTo(s * 0.35, s * 0.15);
      ctx.lineTo(-s * 0.35, s * 0.15);
      ctx.closePath();
      ctx.fill();
      eye(ctx, 0, -s * 0.15, 4, "#104060");
    } else {
      oval(ctx, 0, 0, s, s, e.def.color);
    }
    ctx.restore();
    if (!e.preview && !e.glinderDying) drawEnemyMark(ctx, e);
    if (!e.preview) drawBurn(ctx, e);
    if (e.parked) {
      ctx.save();
      ctx.strokeStyle = "rgba(224, 92, 255, 0.55)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.def.size + 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (!e.preview) hpBar(ctx, e);
  };

  function drawBurn(ctx, e) {
    if ((e.burnT || 0) <= 0) return;
    if ((e.stealth || 0) > 0.2 && (e.revealT || 0) <= 0) return;
    var s = e.def.size;
    var fade = e.burnT < 0.4 ? e.burnT / 0.4 : 1;
    var ph = e.phase || 0;
    var flick = 0.72 + 0.28 * Math.sin(ph * 13.4) * Math.sin(ph * 8.1);
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.32 * fade * flick;
    ctx.fillStyle = "#ff5a14";
    ctx.beginPath();
    ctx.ellipse(0, s * 0.08, s * 1.05, s * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    var n = e.def.boss ? 8 : 5;
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2 + ph * 1.8;
      var wob = Math.sin(ph * (10 + i * 1.6) + i * 1.7);
      var x = Math.cos(ang) * s * 0.38;
      var y = Math.sin(ang) * s * 0.22 - s * 0.28 + wob * s * 0.1;
      var h = s * (0.42 + (i % 3) * 0.16) * flick;
      var w = Math.max(2.4, s * 0.16);
      ctx.globalAlpha = (0.5 + 0.4 * flick) * fade;
      ctx.fillStyle = i % 2 ? "#fff3b0" : "#ff7a22";
      ctx.beginPath();
      ctx.moveTo(x, y + h * 0.18);
      ctx.quadraticCurveTo(x + w, y - h * 0.12, x, y - h);
      ctx.quadraticCurveTo(x - w, y - h * 0.12, x, y + h * 0.18);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEnemyMark(ctx, e) {
    var s = e.def.size;
    var stealth = (e.stealth || 0) > 0.2;
    var revealed = (e.revealT || 0) > 0;
    if (stealth && !revealed) return;
    var pulse = 0.62 + Math.sin((e.phase || 0) * 5.5) * 0.22;
    var decoy = !!(e.decoy || e.fake);
    var stolen = !!e.stolen;
    var col = stolen ? "#7cffb0" : (decoy ? "#d8b0ff" : (e.def.boss ? "#ffe08a" : "#ff6a5a"));
    ctx.save();
    if (!stealth) {
      ctx.globalAlpha = 0.28 * pulse;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + s * 0.92, s * 1.05, s * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = stealth ? 0.95 : (stolen ? 0.95 : (decoy ? 0.9 : 0.62));
    ctx.strokeStyle = col;
    ctx.lineWidth = stealth || decoy || stolen ? 2.2 : 1.7;
    ctx.beginPath();
    ctx.arc(e.x, e.y, s + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = col;
    var py = e.y - s - 9;
    ctx.beginPath();
    ctx.moveTo(e.x, py - 6);
    ctx.lineTo(e.x + 4.5, py);
    ctx.lineTo(e.x, py + 3.5);
    ctx.lineTo(e.x - 4.5, py);
    ctx.closePath();
    ctx.fill();
    if (stolen) {
      ctx.font = "bold 10px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "#ffe8c8";
      ctx.fillText(String(Math.max(0, Math.ceil(e.stolenT || 0))), e.x, py - 8);
    }
    ctx.restore();
  }

  function isDarkShotColor(col) {
    if (!col || col.charAt(0) !== "#") return false;
    var p = hexParts(col);
    return p[0] * 0.299 + p[1] * 0.587 + p[2] * 0.114 < 110;
  }

  function drawDarkShotGlow(ctx, p) {
    if (!isDarkShotColor(p.color)) return;
    var r = Math.max(3.6, (p.r || 3) + 1);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r + 9);
    g.addColorStop(0, "rgba(230, 242, 255, 0.9)");
    g.addColorStop(0.4, "rgba(150, 200, 255, 0.5)");
    g.addColorStop(1, "rgba(120, 180, 255, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = "rgba(240, 248, 255, 0.95)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  G.drawProjectile = function (ctx, p) {
    ctx.save();
    if (p.z) ctx.translate(0, -p.z);
    if (p.blackhole) {
      var spin = ((p.arc && p.arc.t) || 0) * 9;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalCompositeOperation = "lighter";
      var glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
      glow.addColorStop(0, "rgba(255, 236, 210, 0.95)");
      glow.addColorStop(0.22, "rgba(255, 150, 70, 0.72)");
      glow.addColorStop(0.5, "rgba(130, 90, 255, 0.42)");
      glow.addColorStop(1, "rgba(62, 192, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#05020c";
      ctx.beginPath();
      ctx.arc(0, 0, 5.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 224, 170, 0.95)";
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(130, 210, 255, 0.85)";
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 3.4, spin, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
      return;
    }
    if (p.kind === "colo_fist") {
      var fang = Math.atan2(p.vy || 0, p.vx || 1);
      var fr = Math.max(14, (p.r || 16) * 1.35);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(fang);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(122, 247, 255, 0.28)";
      ctx.beginPath();
      ctx.ellipse(-fr * 1.35, 0, fr * 1.8, fr * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(180, 240, 255, 0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-fr * 2.4, 0);
      ctx.lineTo(-fr * 0.2, 0);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      fillRound(ctx, -fr * 0.85, -fr * 0.42, fr * 1.15, fr * 0.84, 4, "#1c2838");
      fillRound(ctx, -fr * 0.2, -fr * 0.58, fr * 1.05, fr * 1.16, 6, "#3a5a78");
      fillRound(ctx, fr * 0.12, -fr * 0.5, fr * 0.78, fr * 1.0, 5, "#e8f6ff");
      ctx.fillStyle = "#7af7ff";
      ctx.beginPath();
      ctx.arc(fr * 0.72, -fr * 0.22, fr * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(fr * 0.72, fr * 0.22, fr * 0.16, 0, Math.PI * 2);
      ctx.fill();
      fillRound(ctx, fr * 0.55, -fr * 0.48, fr * 0.42, fr * 0.18, 3, "#9ad4ff");
      fillRound(ctx, fr * 0.55, -fr * 0.18, fr * 0.48, fr * 0.16, 3, "#9ad4ff");
      fillRound(ctx, fr * 0.55, fr * 0.1, fr * 0.48, fr * 0.16, 3, "#9ad4ff");
      fillRound(ctx, fr * 0.55, fr * 0.36, fr * 0.36, fr * 0.14, 3, "#9ad4ff");
      ctx.strokeStyle = "rgba(122, 247, 255, 0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fr * 0.35, 0, fr * 0.62, -0.9, 0.9);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
      return;
    }
    drawDarkShotGlow(ctx, p);
    if (p.kind === "honeyball") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy || 0, p.vx || 1));
      ctx.globalCompositeOperation = "lighter";
      var hr = Math.max(5, p.r || 11);
      ctx.fillStyle = "rgba(255, 196, 40, 0.38)";
      ctx.beginPath();
      ctx.arc(-hr * 0.18, 0, hr * 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8b018";
      ctx.beginPath();
      ctx.arc(0, 0, hr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 236, 140, 0.95)";
      ctx.beginPath();
      ctx.arc(-hr * 0.22, -hr * 0.16, hr * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c48410";
      ctx.beginPath();
      ctx.ellipse(hr * 0.12, hr * 0.58, hr * 0.26, hr * 0.48, 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.kind === "flame" || p.kind === "fireball") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy || 0, p.vx || 1));
      ctx.globalCompositeOperation = "lighter";
      var fr = Math.max(4.5, p.r || 6);
      if (p.kind === "fireball") {
        ctx.fillStyle = "rgba(255, 60, 10, 0.4)";
        ctx.beginPath();
        ctx.arc(-fr * 0.1, 0, fr * 1.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff4a10";
        ctx.beginPath();
        ctx.arc(0, 0, fr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 230, 120, 0.95)";
        ctx.beginPath();
        ctx.arc(-fr * 0.15, -fr * 0.12, fr * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
      ctx.fillStyle = "rgba(255, 90, 20, 0.45)";
      ctx.beginPath();
      ctx.ellipse(-fr * 0.2, 0, fr * 1.7, fr * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.color || (p.team === "player" ? "rgba(255,160,40,0.95)" : "#ff8a8a");
      ctx.beginPath();
      ctx.moveTo(fr * 1.8, 0);
      ctx.quadraticCurveTo(fr * 0.2, -fr * 0.85, -fr * 1.15, 0);
      ctx.quadraticCurveTo(fr * 0.2, fr * 0.85, fr * 1.8, 0);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 244, 180, 0.9)";
      ctx.beginPath();
      ctx.ellipse(fr * 0.15, 0, fr * 0.7, fr * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      }
    } else if (p.kind === "darkember") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalCompositeOperation = "lighter";
      var er = Math.max(3.5, p.r || 4);
      ctx.fillStyle = "rgba(60, 0, 20, 0.55)";
      ctx.beginPath();
      ctx.arc(0, 0, er * 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4a0810";
      ctx.beginPath();
      ctx.arc(0, 0, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 70, 40, 0.9)";
      ctx.beginPath();
      ctx.arc(-er * 0.2, -er * 0.15, er * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.kind === "missile") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = "rgba(255, 180, 80, 0.45)";
      ctx.beginPath();
      ctx.arc(-10, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8b0ff";
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-10, -5);
      ctx.lineTo(-10, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (p.kind === "laser") {
      ctx.strokeStyle = "#7af7ff";
      ctx.lineWidth = Math.max(3, (p.r || 3) * 0.85);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
      ctx.stroke();
    } else if (p.kind === "ice") {
      ctx.fillStyle = "#b8f0ff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "scalpel") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = "#f4f4f4";
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-6, -2.5);
      ctx.lineTo(-6, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c02020";
      ctx.fillRect(-3, -1.2, 5, 2.4);
      ctx.restore();
    } else if (p.kind === "crate") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(0.35);
      ctx.fillStyle = p.color || "#c48a3a";
      ctx.fillRect(-7, -7, 14, 14);
      ctx.strokeStyle = "#6a3a18";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-7, -7, 14, 14);
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(7, 0);
      ctx.moveTo(0, -7);
      ctx.lineTo(0, 7);
      ctx.stroke();
      ctx.restore();
    } else if (p.kind === "sting") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = p.fake ? "rgba(180, 255, 140, 0.45)" : "#9cff6a";
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-5, -3);
      ctx.lineTo(-5, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (p.kind === "moonwave") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.strokeStyle = "rgba(160, 220, 255, 0.95)";
      ctx.fillStyle = "rgba(120, 190, 255, 0.35)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 16, -1.15, 1.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(4, 0, 11, -1.05, 1.05);
      ctx.fill();
      ctx.strokeStyle = "rgba(230, 250, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-2, 0, 18, -0.9, 0.9);
      ctx.stroke();
      ctx.restore();
    } else if (p.kind === "moonslash") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      var len = p.slashLen || 86;
      var grd = ctx.createLinearGradient(-len * 0.2, 0, len, 0);
      grd.addColorStop(0, "rgba(220, 240, 255, 0.15)");
      grd.addColorStop(0.35, "rgba(160, 210, 255, 0.85)");
      grd.addColorStop(1, "rgba(80, 140, 255, 0.05)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(-8, -((p.r || 14) * 0.35));
      ctx.lineTo(len, -(p.r || 14));
      ctx.lineTo(len + 10, 0);
      ctx.lineTo(len, (p.r || 14));
      ctx.lineTo(-8, (p.r || 14) * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(240, 250, 255, 0.9)";
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
    } else if (p.kind === "lance" || p.kind === "spear") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      if (p.kind === "spear") {
        ctx.strokeStyle = "#4a220c";
        ctx.lineWidth = 4.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(14, 0);
        ctx.stroke();
        ctx.strokeStyle = "#c48a38";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(10, 0);
        ctx.stroke();
        ctx.fillStyle = "#e8e0d0";
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.lineTo(12, -5.5);
        ctx.lineTo(12, 5.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fff8e8";
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.lineTo(18, -1.8);
        ctx.lineTo(18, 1.8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#e87830";
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-28, -6);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-28, 6);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = "#f0d24a";
        ctx.fillRect(-14, -2.2, 28, 4.4);
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(6, -5);
        ctx.lineTo(6, 5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fff4c4";
        ctx.fillRect(-4, -3.2, 6, 6.4);
      }
      ctx.restore();
    } else if (p.kind === "horn") {
      ctx.save();
      try {
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy || 0, p.vx || 1));
        var hr = Number(p.r);
        if (!isFinite(hr) || hr <= 0) hr = 10;
        hr = Math.min(hr, 20);
        ctx.fillStyle = p.color || "#ffd24a";
        ctx.beginPath();
        ctx.moveTo(hr * 2.2, 0);
        ctx.lineTo(-hr * 1.05, -hr * 0.78);
        ctx.lineTo(-hr * 0.28, 0);
        ctx.lineTo(-hr * 1.05, hr * 0.78);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fff6c8";
        ctx.beginPath();
        ctx.moveTo(hr * 1.75, 0);
        ctx.lineTo(-hr * 0.05, -hr * 0.28);
        ctx.lineTo(hr * 0.12, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(60, 28, 0, 0.55)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(hr * 2.05, 0);
        ctx.lineTo(-hr * 0.9, -hr * 0.62);
        ctx.moveTo(hr * 2.05, 0);
        ctx.lineTo(-hr * 0.9, hr * 0.62);
        ctx.stroke();
      } finally {
        ctx.restore();
      }
    } else if (p.kind === "honey") {
      ctx.fillStyle = "rgba(232, 192, 64, 0.85)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 230, 140, 0.7)";
      ctx.beginPath();
      ctx.arc(p.x - 2, p.y - 2, p.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "timeshot" || p.held) {
      if (p.held) {
        var hx = p.holdX != null ? p.holdX : p.x + Math.cos(p.holdAng || 0) * 180;
        var hy = p.holdY != null ? p.holdY : p.y + Math.sin(p.holdAng || 0) * 180;
        ctx.save();
        ctx.strokeStyle = "rgba(180, 230, 255, 0.55)";
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 6]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(180, 230, 255, 0.2)";
        ctx.beginPath();
        ctx.arc(hx, hy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        var sang = p.holdAng != null ? p.holdAng : Math.atan2(p.vy, p.vx);
        ctx.save();
        ctx.strokeStyle = "rgba(180, 230, 255, 0.5)";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - Math.cos(sang) * 26, p.y - Math.sin(sang) * 26);
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(p.x, p.y - (p.z || 0));
      ctx.fillStyle = p.held ? "rgba(200, 240, 255, 0.95)" : "#d8f4ff";
      ctx.beginPath();
      ctx.arc(0, 0, (p.r || 4) + (p.held ? 1.4 : 0), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-1.2, -1.2, (p.r || 4) * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.kind === "dropshot") {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(p.x, p.y - (p.z || 0));
      ctx.fillStyle = p.honeyLand ? "#e8c050" : "#c8ff6a";
      ctx.beginPath();
      ctx.ellipse(0, 0, p.honeyLand ? 6 : 5, p.honeyLand ? 10 : 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff6c0";
      ctx.beginPath();
      ctx.ellipse(-1, -2, 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      if (p.tracer) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.strokeStyle = p.tracerColor || p.color || "rgba(138, 240, 216, 0.85)";
        ctx.lineWidth = 2.6;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(-22, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = p.tracerColor || "#8af0d8";
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-2, -3);
        ctx.lineTo(-2, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = p.color || (p.team === "player" ? "#fff4b0" : (p.fake ? "rgba(255, 138, 138, 0.4)" : "#ff8a8a"));
      if (!p.color && p.kind === "grenade") ctx.fillStyle = "#9cff7a";
      if (!p.color && p.kind === "cannon") ctx.fillStyle = "#ffd24a";
      if (!p.color && p.kind === "healshot") ctx.fillStyle = "#7cffb0";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  G.drawMine = function (ctx, m) {
    ctx.save();
    ctx.translate(m.x, m.y);
    var rk = (G.tactics && G.tactics.retireK) ? G.tactics.retireK(m) : (m.retiring ? 1 - Math.max(0, m.retireT) / Math.max(0.01, m.retireMax || 0.5) : 0);
    if (rk > 0 && G.tactics && G.tactics.applyRetirePose) {
      G.tactics.applyRetirePose(ctx, rk, "pop");
      ctx.globalAlpha *= Math.max(0.1, 1 - rk * 0.82);
    }
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(1, 4, 8, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    var top = m.arm > 0 ? "#8a8a8a" : "#f0c422";
    var rim = m.arm > 0 ? "#4a4a4a" : "#8a6a12";
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.arc(0, 0, 7.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4.5, 0);
    ctx.lineTo(4.5, 0);
    ctx.moveTo(0, -4.5);
    ctx.lineTo(0, 4.5);
    ctx.stroke();
    ctx.fillStyle = m.arm > 0 ? "#555" : "#ff4a2a";
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();
    if (m.arm <= 0 && rk <= 0) {
      ctx.strokeStyle = "rgba(255,80,40,0.4)";
      ctx.beginPath();
      ctx.arc(0, 0, m.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (rk > 0 && G.tactics && G.tactics.drawRetireBits) G.tactics.drawRetireBits(ctx, rk, ["#f0c422", "#ff4a2a", "#fff4d0"]);
    ctx.restore();
  };

  G.drawWarning = function (ctx, w) {
    var wMax = w.max || w.t || 1;
    var k = wMax > 0 ? 1 - w.t / wMax : 0;
    if (!isFinite(k)) k = 0;
    if (k < 0) k = 0;
    else if (k > 1) k = 1;
    var col = w.color || "#ff4646";
    ctx.save();
    try {
    if (w.kind === "glinder_lane" || (w.kind === "lane" && col.indexOf("#ffd") === 0 && w.w >= 14)) {
      var gang = w.ang || 0;
      var glen = w.len || 240;
      var ghw = w.w || 16;
      ctx.translate(w.x, w.y);
      ctx.rotate(gang);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(255, 80, 20, " + (0.22 + k * 0.28) + ")";
      ctx.fillRect(0, -ghw * 1.45, glen, ghw * 2.9);
      ctx.fillStyle = "rgba(255, 160, 40, " + (0.28 + k * 0.32) + ")";
      ctx.fillRect(0, -ghw, glen, ghw * 2);
      ctx.fillStyle = "rgba(255, 244, 180, " + (0.35 + k * 0.4) + ")";
      ctx.fillRect(0, -ghw * 0.28, glen, ghw * 0.56);
      ctx.strokeStyle = "rgba(255, 220, 90, " + (0.65 + k * 0.35) + ")";
      ctx.lineWidth = 2.6;
      ctx.setLineDash([18, 8]);
      ctx.strokeRect(0, -ghw, glen, ghw * 2);
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(glen - 8, 0);
      ctx.stroke();
    } else if (w.kind === "lane" && col.indexOf("#ff6") === 0) {
      var hang = w.ang || 0;
      var hlen = w.len || 240;
      var hhw = w.w || 18;
      ctx.translate(w.x, w.y);
      ctx.rotate(hang);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(80, 0, 0, " + (0.22 + k * 0.28) + ")";
      ctx.fillRect(0, -hhw * 2.1, hlen, hhw * 4.2);
      ctx.fillStyle = "rgba(255, 28, 8, " + (0.22 + k * 0.32) + ")";
      ctx.fillRect(0, -hhw * 1.45, hlen, hhw * 2.9);
      ctx.fillStyle = "rgba(255, 90, 20, " + (0.3 + k * 0.35) + ")";
      ctx.fillRect(0, -hhw * 0.85, hlen, hhw * 1.7);
      ctx.fillStyle = "rgba(255, 230, 140, " + (0.4 + k * 0.5) + ")";
      ctx.fillRect(0, -hhw * 0.22, hlen, hhw * 0.44);
      ctx.strokeStyle = "rgba(255, 60, 20, " + (0.55 + k * 0.4) + ")";
      ctx.lineWidth = 2.4;
      ctx.setLineDash([10, 7]);
      ctx.strokeRect(0, -hhw, hlen, hhw * 2);
      ctx.setLineDash([]);
      var chev, cxp;
      ctx.strokeStyle = "rgba(255, 244, 180, " + (0.35 + k * 0.5) + ")";
      ctx.lineWidth = 1.8;
      for (chev = 0; chev < 7; chev++) {
        cxp = 18 + ((chev / 7 + k * 0.35) % 1) * (hlen - 36);
        ctx.beginPath();
        ctx.moveTo(cxp - 10, -hhw * 0.55);
        ctx.lineTo(cxp + 6, 0);
        ctx.lineTo(cxp - 10, hhw * 0.55);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255, 255, 230, " + (0.45 + k * 0.5) + ")";
      ctx.beginPath();
      ctx.moveTo(hlen - 4, 0);
      ctx.lineTo(hlen - 22, -10);
      ctx.lineTo(hlen - 22, 10);
      ctx.closePath();
      ctx.fill();
    } else if (w.kind === "lane") {
      var ang = w.ang || 0;
      var len = w.len || 240;
      var hw = w.w || 18;
      ctx.translate(w.x, w.y);
      ctx.rotate(ang);
      ctx.fillStyle = "rgba(255, 80, 40, " + (0.1 + k * 0.2) + ")";
      if (col.indexOf("#9ad") === 0 || col.indexOf("#c8") === 0) ctx.fillStyle = "rgba(160, 210, 255, " + (0.1 + k * 0.18) + ")";
      if (col.indexOf("#c4a") === 0 || col.indexOf("#e8c") === 0) ctx.fillStyle = "rgba(220, 180, 80, " + (0.12 + k * 0.16) + ")";
      if (col.indexOf("#ffe") === 0) ctx.fillStyle = "rgba(255, 220, 80, " + (0.12 + k * 0.18) + ")";
      if (col.indexOf("#ffb") === 0) ctx.fillStyle = "rgba(255, 150, 50, " + (0.14 + k * 0.2) + ")";
      if (col.indexOf("#7af") === 0 || col.indexOf("#7cf") === 0) ctx.fillStyle = "rgba(80, 220, 255, " + (0.14 + k * 0.22) + ")";
      if (col.indexOf("#8ad") === 0 || col.indexOf("#3d9") === 0) ctx.fillStyle = "rgba(90, 210, 80, " + (0.12 + k * 0.18) + ")";
      ctx.fillRect(0, -hw, len, hw * 2);
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.45 + k * 0.5;
      ctx.lineWidth = 2.4;
      ctx.setLineDash([14, 8]);
      ctx.strokeRect(0, -hw, len, hw * 2);
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(len - 10, 0);
      ctx.stroke();
    } else if (w.kind === "cone") {
      var cAng = w.ang || 0;
      var range = w.range || 200;
      var half = w.spread || 0.5;
      ctx.translate(w.x, w.y);
      ctx.fillStyle = "rgba(255, 110, 30, " + (0.1 + k * 0.2) + ")";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, range, cAng - half, cAng + half);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.5 + k * 0.45;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([10, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (w.kind === "acid") {
      var ar = w.r || 68;
      ctx.translate(w.x, w.y);
      ctx.fillStyle = "rgba(120, 210, 40, " + (0.12 + k * 0.22) + ")";
      ctx.beginPath();
      ctx.arc(0, 0, ar, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(180, 255, 70, " + (0.55 + k * 0.4) + ")";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, ar, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, ar * (0.28 + k * 0.72), 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(230, 255, 120, 0.95)";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(0, -ar * 0.62);
      ctx.lineTo(0, ar * 0.08);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, ar * 0.28, 3.4, 0, Math.PI * 2);
      ctx.stroke();
      var dropY = -ar * 1.15 + k * ar * 1.15;
      ctx.fillStyle = "#8ad422";
      ctx.beginPath();
      ctx.ellipse(0, dropY, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(210, 255, 90, 0.85)";
      ctx.beginPath();
      ctx.ellipse(-2, dropY - 2, 2.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (w.kind === "honeydrop") {
      var hr = w.r || 40;
      ctx.translate(w.x, w.y);
      ctx.fillStyle = "rgba(232, 180, 48, " + (0.1 + k * 0.2) + ")";
      ctx.beginPath();
      ctx.arc(0, 0, hr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 210, 74, " + (0.5 + k * 0.45) + ")";
      ctx.lineWidth = 2.4;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, hr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255, 210, 90, " + (0.16 + k * 0.22) + ")";
      ctx.beginPath();
      ctx.ellipse(0, 0, hr * 0.92, hr * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      var skyY = -hr * 2.2 + k * hr * 2.2;
      ctx.fillStyle = "#e8c050";
      ctx.beginPath();
      ctx.ellipse(0, skyY, 6, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 244, 196, 0.9)";
      ctx.beginPath();
      ctx.ellipse(-1, skyY - 3, 2.2, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (w.kind === "drop") {
      var dr = w.r || 22;
      ctx.translate(w.x, w.y);
      ctx.fillStyle = "rgba(200, 255, 90, " + (0.1 + k * 0.18) + ")";
      ctx.beginPath();
      ctx.arc(0, 0, dr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(232, 255, 120, " + (0.55 + k * 0.4) + ")";
      ctx.lineWidth = 2.6;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, dr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, dr * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-dr * 0.7, 0);
      ctx.lineTo(dr * 0.7, 0);
      ctx.moveTo(0, -dr * 0.7);
      ctx.lineTo(0, dr * 0.7);
      ctx.stroke();
      var skyY = -dr * 2.4 + k * dr * 2.4;
      ctx.fillStyle = "#c8ff6a";
      ctx.beginPath();
      ctx.ellipse(0, skyY, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 180, 0.9)";
      ctx.beginPath();
      ctx.ellipse(0, skyY - 10, 2.2, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (w.kind === "spin") {
      var sr = Number(w.r);
      if (!isFinite(sr) || sr <= 0) sr = 70;
      sr = Math.min(sr, 160);
      ctx.translate(w.x, w.y);
      ctx.save();
      try {
      ctx.rotate(k * Math.PI * 2.2);
      ctx.strokeStyle = "rgba(255, 210, 74, " + (0.5 + k * 0.45) + ")";
      ctx.fillStyle = "rgba(255, 196, 50, " + (0.08 + k * 0.14) + ")";
      ctx.lineWidth = 3.2;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, sr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, sr * (0.4 + k * 0.6), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
      ctx.stroke();
      ctx.lineWidth = 2.4;
      for (var sa = 0; sa < 4; sa++) {
        var a = (Math.PI / 2) * sa;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(sr - 8, -10);
        ctx.lineTo(sr + 10, 0);
        ctx.lineTo(sr - 8, 10);
        ctx.stroke();
        ctx.restore();
      }
      } finally {
      ctx.restore();
      }
      ctx.fillStyle = "rgba(255, 220, 90, " + (0.75 + k * 0.25) + ")";
      ctx.strokeStyle = "rgba(40, 20, 0, 0.85)";
      ctx.lineWidth = 4;
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText("GIRO", 0, 0);
      ctx.fillText("GIRO", 0, 0);
    } else if (w.kind === "slash") {
      var sang = w.ang || 0;
      var slen = w.len || 180;
      var shw = w.w || 10;
      ctx.translate(w.x, w.y);
      ctx.rotate(sang);
      if (w.jce) {
        ctx.globalCompositeOperation = "lighter";
        var pulse = 0.55 + Math.sin(k * 18) * 0.25;
        ctx.fillStyle = "rgba(255, 220, 90, " + (0.12 + k * 0.22) + ")";
        ctx.fillRect(0, -shw * 1.8, slen, shw * 3.6);
        ctx.fillStyle = "rgba(80, 186, 255, " + (0.16 + k * 0.28) + ")";
        ctx.fillRect(0, -shw * 0.7, slen, shw * 1.4);
        ctx.fillStyle = "rgba(255, 252, 230, " + (0.35 + k * 0.5) + ")";
        ctx.fillRect(0, -1.4, slen, 2.8);
        ctx.strokeStyle = "rgba(122, 247, 255, " + (0.45 + k * 0.4) + ")";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(slen, 0);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 255, 255, " + pulse + ")";
        ctx.fillRect(slen * k * 0.92, -2.2, 14, 4.4);
      } else {
        ctx.fillStyle = w.done
          ? "rgba(255, 210, 74, 0.08)"
          : "rgba(255, 210, 74, " + (0.14 + k * 0.28) + ")";
        ctx.fillRect(0, -shw * 1.35, slen, shw * 2.7);
        ctx.strokeStyle = w.done ? "rgba(255, 220, 120, 0.25)" : "rgba(255, 236, 160, " + (0.7 + k * 0.3) + ")";
        ctx.lineWidth = 2.4;
        ctx.setLineDash(w.done ? [4, 8] : [10, 6]);
        ctx.strokeRect(0, -shw, slen, shw * 2);
        ctx.setLineDash([]);
        if (!w.done) {
          ctx.fillStyle = "rgba(255, 250, 210, " + (0.35 + k * 0.5) + ")";
          ctx.fillRect(slen * k * 0.85, -shw * 0.22, 10, shw * 0.44);
        }
      }
    } else if (w.kind === "half") {
      var hw = w.x1 - w.x0;
      var hh = w.y1 - w.y0;
      var pulse = 0.5 + Math.sin(k * 16) * 0.22;
      var kPulse = 0.5 + Math.sin(k * 22) * 0.22;
      ctx.save();
      ctx.beginPath();
      ctx.rect(w.x0, w.y0, hw, hh);
      ctx.clip();
      ctx.fillStyle = "rgba(18, 8, 4, " + (0.18 + k * 0.16) + ")";
      ctx.fillRect(w.x0, w.y0, hw, hh);
      ctx.globalCompositeOperation = "lighter";
      var hx = (w.x0 + w.x1) / 2;
      var hy = (w.y0 + w.y1) / 2;
      var moonR = Math.min(hw, hh) * 0.42;
      var mg = ctx.createRadialGradient(hx, hy, 8, hx, hy, moonR);
      mg.addColorStop(0, "rgba(255, 248, 210, " + (0.22 + k * 0.28) + ")");
      mg.addColorStop(0.45, "rgba(255, 196, 64, " + (0.16 + k * 0.18) + ")");
      mg.addColorStop(0.78, "rgba(80, 170, 255, " + (0.1 + k * 0.12) + ")");
      mg.addColorStop(1, "rgba(255, 210, 74, 0)");
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(hx, hy, moonR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 236, 150, " + (0.35 + pulse * 0.4) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hx, hy, moonR * (0.55 + k * 0.2), -Math.PI * 0.7, Math.PI * 0.45);
      ctx.stroke();
      ctx.strokeStyle = "rgba(122, 247, 255, " + (0.22 + pulse * 0.3) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy, moonR * 0.78, Math.PI * 0.2, Math.PI * 1.15);
      ctx.stroke();
      var st, sx, sy;
      ctx.fillStyle = "rgba(255, 250, 220, " + (0.35 + kPulse * 0.4) + ")";
      for (st = 0; st < 10; st++) {
        sx = w.x0 + ((st * 97 + k * 40) % hw);
        sy = w.y0 + ((st * 53 + pulse * 30) % hh);
        ctx.beginPath();
        ctx.arc(sx, sy, 1.4 + (st % 3) * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = "rgba(255, 210, 74, " + (0.55 + k * 0.4) + ")";
      ctx.lineWidth = 5;
      ctx.setLineDash([16, 8]);
      ctx.strokeRect(w.x0, w.y0, hw, hh);
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(122, 247, 255, " + (0.4 + pulse * 0.4) + ")";
      ctx.lineWidth = 2.2;
      ctx.strokeRect(w.x0 + 4, w.y0 + 4, hw - 8, hh - 8);
      ctx.strokeStyle = "rgba(255, 252, 230, " + (0.5 + k * 0.5) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (w.axis === "x") {
        ctx.moveTo(w.edge, w.y0);
        ctx.lineTo(w.edge, w.y1);
      } else {
        ctx.moveTo(w.x0, w.edge);
        ctx.lineTo(w.x1, w.edge);
      }
      ctx.stroke();
    } else {
      var wr = Number(w.r);
      if (!isFinite(wr) || wr <= 0) wr = 40;
      wr = Math.min(wr, 980);
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.35 + k * 0.55;
      ctx.fillStyle = "rgba(255,40,40," + 0.12 * k + ")";
      if (w.kind === "tp") ctx.fillStyle = "rgba(200, 160, 255, " + (0.1 + k * 0.16) + ")";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(w.x, w.y, wr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w.x, w.y, wr * Math.max(0.15, k), 0, Math.PI * 2);
      ctx.stroke();
    }
    } finally {
      ctx.restore();
    }
  };

  G.drawChargeTelegraph = function (ctx, e) {
    if (!e || (e.chargeWindup || 0) <= 0) return;
    if (e.kingAct === "dive") return;
    var ang = e.chargeAim || 0;
    var max = e.chargeWindupMax || 0.9;
    var k = 1 - e.chargeWindup / max;
    var s = (e.def && e.def.size) || 42;
    var pulse = 0.55 + Math.sin((e.phase || 0) * 18) * 0.25;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(ang);
    var laneW = s * 1.15;
    var laneL = 980;
    ctx.fillStyle = e.chargeRico
      ? "rgba(255, 90, 40, " + (0.14 + k * 0.2) + ")"
      : "rgba(255, 196, 50, " + (0.12 + k * 0.18) + ")";
    ctx.fillRect(s * 0.4, -laneW, laneL, laneW * 2);
    ctx.strokeStyle = e.chargeRico
      ? "rgba(255, 80, 40, " + (0.7 + k * 0.28) + ")"
      : "rgba(255, 220, 70, " + (0.65 + k * 0.3) + ")";
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 10]);
    ctx.beginPath();
    ctx.moveTo(s * 0.5, -laneW);
    ctx.lineTo(laneL, -laneW);
    ctx.moveTo(s * 0.5, laneW);
    ctx.lineTo(laneL, laneW);
    ctx.stroke();
    ctx.setLineDash([]);
    var t = (e.phase || 0) * 10;
    for (var i = 0; i < 7; i++) {
      var cx = 50 + ((i * 78 + t * 40) % 560);
      ctx.beginPath();
      ctx.moveTo(cx, -14);
      ctx.lineTo(cx + 22, 0);
      ctx.lineTo(cx, 14);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 70, 40, " + pulse + ")";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, s + 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 60, 40, " + (0.35 + k * 0.45) + ")";
    ctx.beginPath();
    ctx.arc(0, 0, 7 + k * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  function glinderCoverGeom(state, cover) {
    var b = G.playfield(state);
    var cx = (b.x0 + b.x1) / 2;
    var cy = (b.y0 + b.y1) / 2;
    var dist = Math.hypot(cover.x - cx, cover.y - cy) || 1;
    var ang = Math.atan2(cover.y - cy, cover.x - cx);
    var half = Math.asin(Math.min(0.92, (cover.r + 18) / dist));
    return { cx: cx, cy: cy, dist: dist, ang: ang, half: half };
  }

  function drawGlinderCover(ctx, state) {
    var c = state.glinderCover;
    if (!c) return;
    var pulse = 0.55 + Math.sin((state.time || 0) * 8) * 0.45;
    var counting = (state.glinderNovaT || 0) > 0;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.fillStyle = "rgba(8, 4, 2, 0.45)";
    ctx.beginPath();
    ctx.ellipse(5, c.r * 0.46, c.r * 1.02, c.r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = counting ? "rgba(180, 80, 30, " + (0.4 + pulse * 0.25) + ")" : "rgba(80, 40, 16, 0.55)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, c.r + 4, 0, Math.PI * 2);
    ctx.stroke();
    var i;
    for (i = 0; i < 7; i++) {
      var y = c.r * 0.28 - i * (c.r * 0.13);
      var w = c.r * (0.86 - i * 0.055);
      var h = c.r * 0.145;
      ctx.fillStyle = i % 2 ? "#6a3a16" : "#3d220e";
      ctx.beginPath();
      ctx.ellipse(0, y, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = i % 2 ? "#9a5830" : "#6a3a18";
      ctx.beginPath();
      ctx.ellipse(-w * 0.22, y - h * 0.32, w * 0.48, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(16, 6, 2, 0.85)";
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.ellipse(0, y, w, h, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (i = 0; i < 6; i++) {
      var pa = -Math.PI / 2 + (i / 6) * Math.PI * 2;
      ctx.fillStyle = i % 2 ? "#4a2a12" : "#2a1608";
      ctx.beginPath();
      ctx.ellipse(Math.cos(pa) * c.r * 0.62, Math.sin(pa) * c.r * 0.22 + c.r * 0.02, 6.5, 11, pa, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#d4a24a";
    ctx.beginPath();
    ctx.ellipse(-c.r * 0.1, -c.r * 0.58, c.r * 0.2, c.r * 0.09, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 230, 140, 0.35)";
    ctx.beginPath();
    ctx.ellipse(-c.r * 0.18, -c.r * 0.62, c.r * 0.08, c.r * 0.04, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (counting) {
      var g = glinderCoverGeom(state, c);
      var nmax = state.glinderNovaMax || 3;
      var grow = 1 - Math.max(0, Math.min(1, (state.glinderNovaT || 0) / nmax));
      ctx.save();
      ctx.globalAlpha = 0.18 + pulse * 0.12;
      ctx.fillStyle = "#ff4a18";
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, 22 + grow * 108, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 90, 30, 0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, 28 + grow * 144, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawGlinderNova(ctx, state) {
    var wave = null;
    var cover = state.glinderCover;
    var i;
    for (i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].type === "chefe_vulto" && state.enemies[i].novaWave) {
        wave = state.enemies[i].novaWave;
        if (state.enemies[i].cover) cover = state.enemies[i].cover;
        break;
      }
    }
    if (!wave) return;
    var cx = wave.x;
    var cy = wave.y;
    var r = wave.r;
    var broken = false;
    var ang = 0;
    var half = 0;
    var dist = 1;
    if (cover) {
      ang = Math.atan2(cover.y - cy, cover.x - cx);
      dist = Math.hypot(cover.x - cx, cover.y - cy) || 1;
      half = Math.asin(Math.min(0.93, (cover.r + 6) / dist));
      broken = r > dist - cover.r;
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    var core = Math.min(1, r / 90);
    ctx.fillStyle = "rgba(255, 80, 16, " + (0.22 + (1 - core) * 0.35) + ")";
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(r * 0.55, 110), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 230, 120, " + (0.16 + (1 - core) * 0.4) + ")";
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(r * 0.22, 48), 0, Math.PI * 2);
    ctx.fill();
    function strokeRing(rad, width, color) {
      if (rad < 8) return;
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.beginPath();
      if (broken) ctx.arc(cx, cy, rad, ang + half, ang - half + Math.PI * 2);
      else ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
    }
    strokeRing(r + 10, 22, "rgba(255, 50, 8, 0.28)");
    strokeRing(r, 16, "rgba(255, 90, 20, 0.72)");
    strokeRing(r * 0.94, 7, "rgba(255, 220, 90, 0.9)");
    strokeRing(r * 0.86, 3, "rgba(255, 250, 210, 0.55)");
    if (cover && r > dist - cover.r * 1.15) {
      var hit = Math.min(1, (r - (dist - cover.r)) / 70);
      var flow = Math.max(0, r - dist);
      ctx.lineWidth = 14;
      ctx.strokeStyle = "rgba(255, 110, 24, 0.85)";
      ctx.beginPath();
      ctx.arc(cover.x, cover.y, cover.r + 8, ang + Math.PI / 2 - 0.15, ang + Math.PI / 2 + 1.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cover.x, cover.y, cover.r + 8, ang - Math.PI / 2 - 1.35, ang - Math.PI / 2 + 0.15);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 70, 18, " + (0.28 + hit * 0.35) + ")";
      ctx.beginPath();
      ctx.arc(cover.x - Math.cos(ang) * cover.r * 0.35, cover.y - Math.sin(ang) * cover.r * 0.35, cover.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      for (i = 0; i < 16; i++) {
        var side = i < 8 ? 1 : -1;
        var k = (i % 8) / 8;
        var spread = 1.05 + k * (1.15 + hit * 0.4);
        var rad = cover.r + 6 + k * (18 + flow * 0.42);
        var px = cover.x + Math.cos(ang + side * spread) * rad;
        var py = cover.y + Math.sin(ang + side * spread) * rad;
        ctx.fillStyle = k < 0.4 ? "rgba(255, 230, 120, 0.8)" : "rgba(255, 90, 20, 0.55)";
        ctx.beginPath();
        ctx.arc(px, py, 4 + k * 9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(255, 160, 40, 0.55)";
      ctx.beginPath();
      ctx.arc(cover.x, cover.y, cover.r + 16 + flow * 0.12, ang + 0.95, ang + 2.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cover.x, cover.y, cover.r + 16 + flow * 0.12, ang - 2.35, ang - 0.95);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGlinderBeams(ctx, state) {
    var beams = state.glinderBeams;
    if (!beams || !beams.length) return;
    var i;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < beams.length; i++) {
      var b = beams[i];
      var k = Math.max(0, b.t / (b.max || 0.28));
      var w = (b.w || 18) * (0.55 + k * 0.7);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.ang || 0);
      ctx.fillStyle = "rgba(255, 50, 10, " + (0.22 * k) + ")";
      ctx.fillRect(0, -w * 1.8, b.len, w * 3.6);
      ctx.fillStyle = "rgba(255, 110, 20, " + (0.45 * k) + ")";
      ctx.fillRect(0, -w, b.len, w * 2);
      ctx.fillStyle = "rgba(255, 200, 60, " + (0.7 * k) + ")";
      ctx.fillRect(0, -w * 0.42, b.len, w * 0.84);
      ctx.fillStyle = "rgba(255, 255, 240, " + (0.95 * k) + ")";
      ctx.fillRect(0, -w * 0.14, b.len, w * 0.28);
      ctx.fillStyle = "rgba(255, 240, 180, " + (0.85 * k) + ")";
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawGlinderFoci(ctx, state) {
    if (state.glinderMaze && state.glinderMaze.phase !== "done") return;
    var foci = state.glinderFoci;
    if (!foci || !foci.length) return;
    var i;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < foci.length; i++) {
      var f = foci[i];
      var flick = 0.75 + Math.sin((state.time || 0) * 11 + i) * 0.25;
      ctx.fillStyle = "rgba(255, 70, 16, " + (0.28 * flick) + ")";
      ctx.beginPath();
      ctx.arc(f.x, f.y, (f.r || 26) * 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 180, 40, " + (0.4 * flick) + ")";
      ctx.beginPath();
      ctx.ellipse(f.x, f.y - 6, 10, 16 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function stampMazeSeg(ctx, w, ox, oy) {
    var x0 = (w.x0 != null ? w.x0 : w.x) - ox;
    var y0 = (w.y0 != null ? w.y0 : w.y) - oy;
    var x1 = (w.x1 != null ? w.x1 : w.x) - ox;
    var y1 = (w.y1 != null ? w.y1 : w.y) - oy;
    var wr = w.r || 15;
    var ang = Math.atan2(y1 - y0, x1 - x0);
    var len = Math.hypot(x1 - x0, y1 - y0) || 1;
    ctx.save();
    ctx.translate(x0, y0);
    ctx.rotate(ang);
    ctx.strokeStyle = "rgba(12, 4, 2, 0.45)";
    ctx.lineWidth = wr * 2.05;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, wr * 0.28);
    ctx.lineTo(len, wr * 0.28);
    ctx.stroke();
    ctx.strokeStyle = "#4a0c08";
    ctx.lineWidth = wr * 1.85;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
    ctx.strokeStyle = "#8a1810";
    ctx.lineWidth = wr * 1.35;
    ctx.stroke();
    ctx.strokeStyle = "#c42810";
    ctx.lineWidth = wr * 0.92;
    ctx.stroke();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(255, 140, 30, 0.55)";
    ctx.lineWidth = wr * 0.42;
    ctx.stroke();
    var s;
    for (s = wr * 0.4; s < len; s += wr * 2.15) {
      ctx.fillStyle = "rgba(255, 190, 50, 0.42)";
      ctx.beginPath();
      ctx.ellipse(s, -wr * 0.38, wr * 0.26, wr * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function mazeEnsureLayer(state, maze) {
    var b = maze.bounds || G.playfield(state);
    var pad = 22;
    var lw = Math.max(1, Math.ceil(b.x1 - b.x0 + pad * 2));
    var lh = Math.max(1, Math.ceil(b.y1 - b.y0 + pad * 2));
    var ox = b.x0 - pad;
    var oy = b.y0 - pad;
    if (!maze.layer || maze.layer.width !== lw || maze.layer.height !== lh || maze.ox !== ox || maze.oy !== oy) {
      maze.layer = document.createElement("canvas");
      maze.layer.width = lw;
      maze.layer.height = lh;
      maze.ox = ox;
      maze.oy = oy;
      maze.stamped = -1;
      maze.stampDone = false;
    }
    return maze.layer.getContext("2d");
  }

  function drawGlinderMaze(ctx, state) {
    var maze = state.glinderMaze;
    if (!maze || maze.phase === "done" || !maze.walls) return;
    var t = maze.t || 0;
    var layerCtx = mazeEnsureLayer(state, maze);
    var i;
    if (!maze.stampDone) {
      for (i = 0; i < maze.walls.length; i++) {
        var w = maze.walls[i];
        var ap = w.appear || 0;
        if (ap > t || ap <= (maze.stamped || -1)) continue;
        stampMazeSeg(layerCtx, w, maze.ox, maze.oy);
      }
      maze.stamped = t;
      if (maze.phase !== "build") maze.stampDone = true;
    }
    var pulse = 0.9 + Math.sin((state.time || 0) * 8) * 0.08;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.drawImage(maze.layer, maze.ox, maze.oy);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "lighter";
    var nFlick = Math.min(22, maze.walls.length);
    for (i = 0; i < nFlick; i++) {
      var fw = maze.walls[(i * 11) % maze.walls.length];
      if ((fw.appear || 0) > t) continue;
      var fk = 0.35 + (Math.sin((state.time || 0) * 11 + i * 1.7) * 0.5 + 0.5) * 0.55;
      var u = (i % 5) / 5;
      var fx = (fw.x0 != null ? fw.x0 : fw.x) + ((fw.x1 != null ? fw.x1 : fw.x) - (fw.x0 != null ? fw.x0 : fw.x)) * u;
      var fy = (fw.y0 != null ? fw.y0 : fw.y) + ((fw.y1 != null ? fw.y1 : fw.y) - (fw.y0 != null ? fw.y0 : fw.y)) * u;
      ctx.fillStyle = "rgba(255, 180, 50, " + (0.28 * fk) + ")";
      ctx.beginPath();
      ctx.ellipse(fx, fy - 8, 7, 13 * fk, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (maze.goal) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 210, 74, " + (0.55 + Math.sin((state.time || 0) * 6) * 0.35) + ")";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(maze.goal.x, maze.goal.y, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffe08a";
      ctx.font = "bold 11px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ESQUADRÃO", maze.goal.x, maze.goal.y - 34);
      ctx.restore();
    }
  }

  function drawGlinderSun(ctx, state) {
    var sun = state.glinderSun;
    if (!sun || sun.dead) return;
    if (state.glinderMaze && state.glinderMaze.phase !== "done") return;
    var ph = (state.time || 0) * 2.2;
    var r = sun.r;
    var sc = 1 + Math.min(1.6, (sun.absorb || 0) * 0.18);
    ctx.save();
    ctx.translate(sun.x, sun.y);
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath();
    ctx.ellipse(6, r * 0.55, r * 1.05, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(90, 8, 12, 0.35)";
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.55 * sc, 0, Math.PI * 2);
    ctx.fill();
    var i;
    for (i = 0; i < 10; i++) {
      var a = ph * 0.7 + i * 0.63;
      var rr = r * (0.7 + (i % 3) * 0.18);
      ctx.strokeStyle = "rgba(255, 50, 20, " + (0.18 + (i % 2) * 0.1) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, rr, a, a + 0.9);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    var g = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.1, 0, 0, r);
    g.addColorStop(0, "#2a080c");
    g.addColorStop(0.45, "#0a0204");
    g.addColorStop(0.78, "#3a0a10");
    g.addColorStop(1, "#120206");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 90, 30, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 210, 80, 0.35)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-r * 0.12, -r * 0.16, r * 0.55, 0.4, 2.4);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 40, 20, 0.55)";
    ctx.beginPath();
    ctx.arc(-r * 0.18, -r * 0.12, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    var contactR = r * 0.72 + 16;
    ctx.strokeStyle = "rgba(255, 50, 20, " + (0.28 + Math.sin(ph * 4) * 0.16) + ")";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, contactR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if ((sun.waveWarn || 0) > 0) {
      var ww = sun.waveWarn / 0.85;
      var warnR = (sun.waveMaxR || 260) * (0.22 + (1 - ww) * 0.78);
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255, 40, 30, " + (0.35 + (1 - ww) * 0.45) + ")";
      ctx.lineWidth = 8;
      ctx.setLineDash([16, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, sun.waveMaxR || 260, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(120, 0, 20, 0.7)";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(0, 0, warnR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }
    if (sun.wave) {
      var cover = state.glinderCover;
      var cdx = 0;
      var cdy = 0;
      var cdist = 1;
      var cang = 0;
      var chalf = 0;
      var broken = false;
      if (cover) {
        cdx = cover.x - sun.x;
        cdy = cover.y - sun.y;
        cdist = Math.hypot(cdx, cdy) || 1;
        cang = Math.atan2(cdy, cdx);
        chalf = Math.asin(Math.min(0.93, (cover.r + 6) / cdist));
        broken = sun.wave.r > cdist - cover.r;
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(80, 0, 20, 0.7)";
      ctx.lineWidth = 14 * sc;
      ctx.beginPath();
      if (broken) ctx.arc(0, 0, sun.wave.r, cang + chalf, cang - chalf + Math.PI * 2);
      else ctx.arc(0, 0, sun.wave.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 40, 30, 0.5)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (broken) ctx.arc(0, 0, sun.wave.r * 0.96, cang + chalf, cang - chalf + Math.PI * 2);
      else ctx.arc(0, 0, sun.wave.r * 0.96, 0, Math.PI * 2);
      ctx.stroke();
      if (cover && broken) {
        ctx.strokeStyle = "rgba(255, 90, 30, 0.75)";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(cdx, cdy, cover.r + 8, cang + Math.PI / 2 - 0.2, cang + Math.PI / 2 + 1.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cdx, cdy, cover.r + 8, cang - Math.PI / 2 - 1.3, cang - Math.PI / 2 + 0.2);
        ctx.stroke();
      }
    }
    if (sun.novaPhase === "warn") {
      var nMax = state.glinderSuperMax || 2.05;
      var nk = 1 - Math.max(0, sun.novaT) / nMax;
      var areaR = (sun.novaR || 420) * (0.18 + nk * 0.82);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(255, 230, 160, " + (0.06 + nk * 0.14) + ")";
      ctx.beginPath();
      ctx.arc(0, 0, areaR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 240, 180, " + (0.45 + nk * 0.5) + ")";
      ctx.lineWidth = 7;
      ctx.setLineDash([18, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, areaR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      var beat = sun.novaT < 0.42 ? 0.55 + Math.sin((state.time || 0) * 28) * 0.45 : 0.35;
      ctx.strokeStyle = "rgba(255, 80, 30, " + beat + ")";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, r + 24 + (1 - nk) * 90, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHiveLink(ctx, state) {
    if (!state.hive || !state.hive.ready) return;
    var q = null;
    var k = null;
    var i, e;
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (e.hp <= 0 || e.fallen) continue;
      if (e.type === "chefe_megatanque") q = e;
      if (e.type === "chefe_beeking") k = e;
    }
    if (!q || !k) return;
    var mx = (q.x + k.x) / 2;
    var my = (q.y + k.y) / 2;
    var link = state.hive.separated ? 0 : state.hive.link;
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = state.hive.separated
      ? "rgba(80, 40, 20, 0.35)"
      : "rgba(255, 210, 74, " + (0.28 + link * 0.45) + ")";
    ctx.lineWidth = 5 + link * 5;
    ctx.setLineDash(state.hive.separated ? [8, 10] : []);
    ctx.beginPath();
    ctx.moveTo(q.x, q.y);
    ctx.lineTo(k.x, k.y);
    ctx.stroke();
    ctx.setLineDash([]);
    var ang = Math.atan2(k.y - q.y, k.x - q.x);
    var len = Math.hypot(k.x - q.x, k.y - q.y) || 1;
    ctx.translate(mx, my);
    ctx.rotate(ang);
    ctx.fillStyle = "rgba(20, 8, 0, 0.55)";
    ctx.fillRect(-36, -8, 72, 16);
    ctx.fillStyle = state.hive.separated ? "rgba(255, 90, 50, 0.85)" : "#ffd24a";
    ctx.fillRect(-34, -6, 68 * Math.max(0.04, link), 12);
    ctx.strokeStyle = "rgba(255, 244, 200, 0.7)";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-36, -8, 72, 16);
    if (!state.hive.separated) {
      ctx.strokeStyle = "rgba(255, 220, 90, 0.35)";
      ctx.setLineDash([10, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-len * 0.42, -48);
      ctx.lineTo(len * 0.42, -48);
      ctx.moveTo(-len * 0.42, 48);
      ctx.lineTo(len * 0.42, 48);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawHiveQueenMagic(ctx, state) {
    var i, e, p;
    if ((state.hiveHexT || 0) > 0 && state.squad) {
      ctx.save();
      ctx.strokeStyle = "rgba(122, 247, 255, 0.7)";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(state.squad.x, state.squad.y, 22 + Math.sin((state.time || 0) * 9) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    if (state.hivePrisms) {
      for (i = 0; i < state.hivePrisms.length; i++) {
        p = state.hivePrisms[i];
        ctx.save();
        ctx.translate(p.x, p.y + Math.sin((p.phase || 0) * 5) * 4);
        ctx.rotate((p.phase || 0) * 0.8);
        ctx.fillStyle = "rgba(122, 247, 255, 0.22)";
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(14, 0);
        ctx.lineTo(0, 16);
        ctx.lineTo(-14, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffe08a";
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 10);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 240, 0.85)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
      }
    }
    if (!state.enemies) return;
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (e.hp <= 0) continue;
      if (e.type === "chefe_megatanque" && e.queenAct === "beam" && (e.laserOn || 0) > 0) {
        var beams = [{ ang: e.laserAng || 0, len: e.laserLen || 520 }];
        if (e.enrage && e.laserAng2 != null) beams.push({ ang: e.laserAng2, len: e.laserLen2 || e.laserLen || 520 });
        var bi, beam, grd, thick, core;
        for (bi = 0; bi < beams.length; bi++) {
          beam = beams[bi];
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(beam.ang);
          thick = e.enrage ? 34 : 24;
          core = e.enrage ? 12 : 8;
          grd = ctx.createLinearGradient(0, 0, beam.len, 0);
          if (e.enrage) {
            grd.addColorStop(0, "rgba(255, 244, 200, 0.95)");
            grd.addColorStop(0.22, "rgba(255, 120, 40, 0.8)");
            grd.addColorStop(0.55, "rgba(255, 210, 74, 0.5)");
            grd.addColorStop(1, "rgba(255, 80, 30, 0.04)");
          } else {
            grd.addColorStop(0, "rgba(255, 244, 180, 0.9)");
            grd.addColorStop(0.35, "rgba(122, 247, 255, 0.55)");
            grd.addColorStop(1, "rgba(255, 210, 74, 0.05)");
          }
          ctx.fillStyle = grd;
          ctx.fillRect(0, -thick / 2, beam.len, thick);
          ctx.fillStyle = e.enrage ? "rgba(255, 255, 240, 0.9)" : "rgba(255, 255, 245, 0.75)";
          ctx.fillRect(0, -core / 2, beam.len, core);
          ctx.restore();
        }
      }
      if ((e.blinkFxT || 0) > 0 && e.blinkFrom) {
        ctx.save();
        ctx.strokeStyle = "rgba(122, 247, 255, 0.75)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(e.blinkFrom.x, e.blinkFrom.y);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawPrincessWorld(ctx, state) {
    var i, e;
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (e.hp <= 0 || e.type !== "beeprincess") continue;
      var act = e.princessAct || "";
      ctx.save();
      if (act === "laser" && (e.laserOn || 0) > 0) {
        var ang = e.laserAng || 0;
        var len = e.laserLen || 520;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(ang);
        ctx.globalCompositeOperation = "lighter";
        var glow = ctx.createLinearGradient(0, 0, len, 0);
        glow.addColorStop(0, "rgba(255, 244, 190, 0.58)");
        glow.addColorStop(0.22, "rgba(255, 130, 36, 0.5)");
        glow.addColorStop(0.5, "rgba(255, 210, 74, 0.32)");
        glow.addColorStop(0.78, "rgba(70, 170, 255, 0.38)");
        glow.addColorStop(1, "rgba(40, 110, 255, 0.03)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, -24, len, 48);
        var grd = ctx.createLinearGradient(0, 0, len, 0);
        grd.addColorStop(0, "rgba(255, 252, 230, 0.98)");
        grd.addColorStop(0.12, "rgba(255, 214, 74, 0.95)");
        grd.addColorStop(0.34, "rgba(255, 118, 32, 0.9)");
        grd.addColorStop(0.55, "rgba(255, 196, 64, 0.72)");
        grd.addColorStop(0.78, "rgba(80, 186, 255, 0.58)");
        grd.addColorStop(1, "rgba(48, 120, 255, 0.05)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, -12, len, 24);
        ctx.fillStyle = "rgba(255, 255, 245, 0.9)";
        ctx.fillRect(0, -3.6, len, 7.2);
        ctx.restore();
      }
      if (act === "thrust") {
        var gi, g;
        if (e.thrustGhosts) {
          for (gi = 0; gi < e.thrustGhosts.length; gi++) {
            g = e.thrustGhosts[gi];
            ctx.save();
            ctx.globalAlpha = Math.max(0.06, (g.a || 0.3) * (gi + 1) / (e.thrustGhosts.length + 1));
            ctx.translate(g.x, g.y);
            ctx.rotate(g.rot || 0);
            ctx.fillStyle = "rgba(255, 180, 50, 0.35)";
            ctx.beginPath();
            ctx.ellipse(18, 0, 22, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
        if (e.thrustPhase === "dash") {
          var tAng = e.thrustAim || e.rot || 0;
          var tLen = e.thrustLen || 260;
          var k = e.thrustDashMax ? 1 - Math.max(0, (e.thrustDash || 0) / e.thrustDashMax) : 1;
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(tAng);
          ctx.globalCompositeOperation = "lighter";
          var sg = ctx.createLinearGradient(0, 0, tLen * 0.55, 0);
          sg.addColorStop(0, "rgba(255, 244, 200, " + (0.55 + k * 0.25) + ")");
          sg.addColorStop(0.35, "rgba(255, 140, 40, 0.45)");
          sg.addColorStop(0.7, "rgba(255, 210, 74, 0.22)");
          sg.addColorStop(1, "rgba(80, 170, 255, 0.04)");
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.moveTo(0, -16);
          ctx.lineTo(tLen * (0.42 + k * 0.2), -5);
          ctx.lineTo(tLen * (0.42 + k * 0.2), 5);
          ctx.lineTo(0, 16);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "rgba(255, 255, 240, 0.75)";
          ctx.fillRect(0, -3, 70 + k * 40, 6);
          ctx.restore();
        }
        if (e.thrustPhase === "stabTell") {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.strokeStyle = "rgba(122, 247, 255, " + (0.45 + Math.sin((e.phase || 0) * 18) * 0.2) + ")";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 36 + Math.sin((e.phase || 0) * 14) * 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        if (e.stabFx) {
          var fi, slash, sk;
          for (fi = 0; fi < e.stabFx.length; fi++) {
            slash = e.stabFx[fi];
            sk = Math.max(0, slash.t / (slash.max || 0.18));
            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.rotate(slash.ang || 0);
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = "rgba(255, 244, 200, " + (0.35 + sk * 0.45) + ")";
            ctx.beginPath();
            ctx.moveTo(8, -18 * sk);
            ctx.lineTo((slash.len || 200) * (0.7 + (1 - sk) * 0.15), -4);
            ctx.lineTo((slash.len || 200) * (0.7 + (1 - sk) * 0.15), 4);
            ctx.lineTo(8, 18 * sk);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "rgba(80, 190, 255, " + (0.25 * sk) + ")";
            ctx.fillRect(10, -3, (slash.len || 200) * 0.55, 6);
            ctx.fillStyle = "rgba(255, 140, 40, " + (0.4 * sk) + ")";
            ctx.fillRect(10, -2, (slash.len || 200) * 0.35, 4);
            ctx.restore();
          }
        }
      }
      if (act === "honeymoon") {
        var mk = 1 - Math.max(0, (e.moonT || 0) / (e.moonMax || 1.55));
        var ph = e.phase || 0;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        var moonG = ctx.createRadialGradient(e.x, e.y, 6, e.x, e.y, 110);
        moonG.addColorStop(0, "rgba(255, 252, 230, 0.72)");
        moonG.addColorStop(0.22, "rgba(255, 214, 90, 0.4)");
        moonG.addColorStop(0.55, "rgba(80, 170, 255, 0.18)");
        moonG.addColorStop(1, "rgba(255, 196, 64, 0)");
        ctx.fillStyle = moonG;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 110, 0, Math.PI * 2);
        ctx.fill();
        var ray, ra;
        ctx.strokeStyle = "rgba(255, 232, 140, " + (0.18 + mk * 0.28) + ")";
        ctx.lineWidth = 2;
        for (ray = 0; ray < 8; ray++) {
          ra = ph * 0.7 + ray * Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(e.x + Math.cos(ra) * 22, e.y + Math.sin(ra) * 22);
          ctx.lineTo(e.x + Math.cos(ra) * (58 + mk * 28), e.y + Math.sin(ra) * (58 + mk * 28));
          ctx.stroke();
        }
        ctx.strokeStyle = "rgba(255, 244, 180, 0.95)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 40 + mk * 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * mk);
        ctx.stroke();
        ctx.strokeStyle = "rgba(122, 247, 255, 0.55)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 52 + mk * 10, -Math.PI / 2 + 0.2, -Math.PI / 2 + 0.2 + Math.PI * 2 * mk);
        ctx.stroke();
        var cr, ca, crr;
        for (cr = 0; cr < 3; cr++) {
          ca = ph * (1.1 + cr * 0.35) + cr * 2.1;
          crr = 34 + cr * 14 + Math.sin(ph * 6 + cr) * 4;
          ctx.save();
          ctx.translate(e.x + Math.cos(ca) * crr, e.y + Math.sin(ca) * crr);
          ctx.rotate(ca + Math.PI / 2);
          ctx.strokeStyle = cr === 1 ? "rgba(122, 247, 255, 0.85)" : "rgba(255, 232, 120, 0.9)";
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.arc(0, 0, 9 + cr, -0.9, 2.4);
          ctx.stroke();
          ctx.restore();
        }
        ctx.strokeStyle = "rgba(255, 210, 74, 0.35)";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 68, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (e.moonFx && (e.moonFx.t || 0) > 0) {
        var mf = e.moonFx;
        var mkk = Math.max(0, mf.t / (mf.max || 0.62));
        var hitK = 1 - mkk;
        var flash = Math.max(0, 1 - hitK * 2.2);
        ctx.save();
        ctx.beginPath();
        ctx.rect(mf.x0, mf.y0, mf.x1 - mf.x0, mf.y1 - mf.y0);
        ctx.clip();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255, 248, 220, " + (0.12 + mkk * 0.38 + flash * 0.22) + ")";
        ctx.fillRect(mf.x0, mf.y0, mf.x1 - mf.x0, mf.y1 - mf.y0);
        var shock = 40 + hitK * 120;
        var scx = (mf.x0 + mf.x1) / 2;
        var scy = (mf.y0 + mf.y1) / 2;
        ctx.strokeStyle = "rgba(255, 244, 180, " + (mkk * 0.55) + ")";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(scx, scy, shock, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(122, 247, 255, " + (mkk * 0.35) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(scx, scy, shock * 0.72, 0, Math.PI * 2);
        ctx.stroke();
        var blade = hitK;
        function moonBlade(off, goldA, cyanA, thick) {
          if (mf.axis === "y") {
            var yy = (mf.side || 1) < 0 ? mf.y0 + (mf.y1 - mf.y0) * blade + off : mf.y1 - (mf.y1 - mf.y0) * blade + off;
            var yg = ctx.createLinearGradient(mf.x0, yy - thick, mf.x0, yy + thick);
            yg.addColorStop(0, "rgba(80, 170, 255, 0)");
            yg.addColorStop(0.28, "rgba(80, 186, 255, " + cyanA + ")");
            yg.addColorStop(0.5, "rgba(255, 255, 255, " + goldA + ")");
            yg.addColorStop(0.72, "rgba(255, 196, 64, " + goldA + ")");
            yg.addColorStop(1, "rgba(80, 170, 255, 0)");
            ctx.fillStyle = yg;
            ctx.fillRect(mf.x0, yy - thick, mf.x1 - mf.x0, thick * 2);
            ctx.fillStyle = "rgba(255, 255, 245, " + (0.55 + mkk * 0.4) + ")";
            ctx.fillRect(mf.x0, yy - 3, mf.x1 - mf.x0, 6);
          } else {
            var xx = (mf.side || 1) < 0 ? mf.x0 + (mf.x1 - mf.x0) * blade + off : mf.x1 - (mf.x1 - mf.x0) * blade + off;
            var xg = ctx.createLinearGradient(xx - thick, mf.y0, xx + thick, mf.y0);
            xg.addColorStop(0, "rgba(80, 170, 255, 0)");
            xg.addColorStop(0.28, "rgba(80, 186, 255, " + cyanA + ")");
            xg.addColorStop(0.5, "rgba(255, 255, 255, " + goldA + ")");
            xg.addColorStop(0.72, "rgba(255, 196, 64, " + goldA + ")");
            xg.addColorStop(1, "rgba(80, 170, 255, 0)");
            ctx.fillStyle = xg;
            ctx.fillRect(xx - thick, mf.y0, thick * 2, mf.y1 - mf.y0);
            ctx.fillStyle = "rgba(255, 255, 245, " + (0.55 + mkk * 0.4) + ")";
            ctx.fillRect(xx - 3, mf.y0, 6, mf.y1 - mf.y0);
          }
        }
        moonBlade(0, 0.95, 0.55, 52);
        moonBlade((mf.side || 1) * -18 * mkk, 0.45, 0.7, 28);
        var spk, spx, spy;
        ctx.fillStyle = "rgba(255, 252, 230, " + (0.4 + mkk * 0.5) + ")";
        for (spk = 0; spk < 12; spk++) {
          if (mf.axis === "y") {
            spx = mf.x0 + (spk / 11) * (mf.x1 - mf.x0);
            spy = (mf.side || 1) < 0 ? mf.y0 + (mf.y1 - mf.y0) * blade : mf.y1 - (mf.y1 - mf.y0) * blade;
          } else {
            spy = mf.y0 + (spk / 11) * (mf.y1 - mf.y0);
            spx = (mf.side || 1) < 0 ? mf.x0 + (mf.x1 - mf.x0) * blade : mf.x1 - (mf.x1 - mf.x0) * blade;
          }
          ctx.beginPath();
          ctx.arc(spx, spy, 2 + mkk * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (act === "hellish" || (e.hellAura || 0) > 0.05) {
        var hp = e.phase || 0;
        var ha = 0.55 + Math.sin(hp * 16) * 0.25;
        var dashing = (e.hellDash || 0) > 0;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        var redG = ctx.createRadialGradient(e.x, e.y, 4, e.x, e.y, dashing ? 120 : 92);
        redG.addColorStop(0, "rgba(255, 244, 200, " + (0.7 + ha * 0.25) + ")");
        redG.addColorStop(0.18, "rgba(255, 80, 20, 0.65)");
        redG.addColorStop(0.42, "rgba(255, 24, 8, 0.38)");
        redG.addColorStop(0.72, "rgba(80, 0, 0, 0.2)");
        redG.addColorStop(1, "rgba(40, 0, 0, 0)");
        ctx.fillStyle = redG;
        ctx.beginPath();
        ctx.arc(e.x, e.y, dashing ? 120 : 92, 0, Math.PI * 2);
        ctx.fill();
        var spike, sa, inner, outer;
        ctx.strokeStyle = "rgba(255, 70, 20, " + (0.45 + ha * 0.4) + ")";
        ctx.lineWidth = 2.4;
        for (spike = 0; spike < 8; spike++) {
          sa = hp * 3.2 + spike * Math.PI / 4;
          inner = 18;
          outer = 44 + Math.sin(hp * 10 + spike) * 8 + (dashing ? 18 : 0);
          ctx.beginPath();
          ctx.moveTo(e.x + Math.cos(sa) * inner, e.y + Math.sin(sa) * inner);
          ctx.lineTo(e.x + Math.cos(sa) * outer, e.y + Math.sin(sa) * outer);
          ctx.stroke();
        }
        ctx.strokeStyle = "rgba(255, 40, 16, " + (0.7 + ha * 0.3) + ")";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 30 + Math.sin(hp * 14) * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 220, 90, 0.55)";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 48 + Math.sin(hp * 11) * 6, hp, hp + Math.PI * 1.4);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 80, 30, 0.4)";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 62, -hp * 1.6, -hp * 1.6 + Math.PI * 1.1);
        ctx.stroke();
        if (dashing) {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(e.rot || 0);
          var bladeG = ctx.createLinearGradient(-90, 0, 70, 0);
          bladeG.addColorStop(0, "rgba(255, 20, 0, 0)");
          bladeG.addColorStop(0.4, "rgba(255, 40, 8, 0.45)");
          bladeG.addColorStop(0.75, "rgba(255, 210, 80, 0.7)");
          bladeG.addColorStop(1, "rgba(255, 255, 240, 0.9)");
          ctx.fillStyle = bladeG;
          ctx.beginPath();
          ctx.moveTo(-80, -16);
          ctx.lineTo(58, -4);
          ctx.lineTo(70, 0);
          ctx.lineTo(58, 4);
          ctx.lineTo(-80, 16);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "rgba(255, 255, 230, 0.85)";
          ctx.fillRect(-40, -2.2, 108, 4.4);
          ctx.restore();
        }
        ctx.restore();
        if (e.hellGhosts) {
          var hgi, hg, ga;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          if (e.hellGhosts.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255, 50, 12, 0.35)";
            ctx.lineWidth = 18;
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            ctx.moveTo(e.hellGhosts[0].x, e.hellGhosts[0].y);
            for (hgi = 1; hgi < e.hellGhosts.length; hgi++) ctx.lineTo(e.hellGhosts[hgi].x, e.hellGhosts[hgi].y);
            ctx.stroke();
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255, 200, 80, 0.4)";
            ctx.lineWidth = 6;
            ctx.moveTo(e.hellGhosts[0].x, e.hellGhosts[0].y);
            for (hgi = 1; hgi < e.hellGhosts.length; hgi++) ctx.lineTo(e.hellGhosts[hgi].x, e.hellGhosts[hgi].y);
            ctx.stroke();
          }
          for (hgi = 0; hgi < e.hellGhosts.length; hgi++) {
            hg = e.hellGhosts[hgi];
            ga = Math.max(0.08, (hgi + 1) / (e.hellGhosts.length + 1));
            ctx.save();
            ctx.globalAlpha = ga * 0.85;
            ctx.translate(hg.x, hg.y);
            ctx.rotate(hg.rot || 0);
            ctx.fillStyle = "rgba(255, 30, 8, 0.7)";
            ctx.beginPath();
            ctx.ellipse(10, 0, 32, 13, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(255, 220, 90, 0.55)";
            ctx.beginPath();
            ctx.ellipse(18, 0, 16, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        }
      }
      if ((e.harvestDim || 0) > 0.02 && act === "harvest") {
        var pb = G.playfield(state);
        ctx.save();
        ctx.fillStyle = "rgba(4, 8, 18, " + (e.harvestDim * 0.38) + ")";
        ctx.fillRect(pb.x0, pb.y0, pb.x1 - pb.x0, pb.y1 - pb.y0);
        ctx.restore();
      }
      if (e.harvestCuts && act === "harvest") {
        var hi, cut, ck;
        for (hi = 0; hi < e.harvestCuts.length; hi++) {
          cut = e.harvestCuts[hi];
          if (cut.done && e.harvestPhase !== "tell") continue;
          ctx.save();
          ctx.translate(cut.x, cut.y);
          ctx.rotate(cut.ang);
          ctx.globalCompositeOperation = "lighter";
          ck = e.harvestPhase === "tell" ? 0.35 + Math.sin((state.time || 0) * 10 + hi) * 0.12 : 0.22;
          ctx.fillStyle = "rgba(255, 220, 90, " + ck + ")";
          ctx.fillRect(0, -3.5, cut.len, 7);
          ctx.fillStyle = "rgba(80, 190, 255, " + (ck * 0.7) + ")";
          ctx.fillRect(0, -1.5, cut.len, 3);
          ctx.restore();
        }
      }
      if (e.harvestFx) {
        var hx, hfx, hk;
        for (hx = 0; hx < e.harvestFx.length; hx++) {
          hfx = e.harvestFx[hx];
          hk = Math.max(0, hfx.t / (hfx.max || 0.32));
          ctx.save();
          ctx.translate(hfx.x, hfx.y);
          ctx.rotate(hfx.ang || 0);
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = "rgba(255, 252, 230, " + (0.55 + hk * 0.45) + ")";
          ctx.beginPath();
          ctx.moveTo(-8, -22 * hk);
          ctx.lineTo((hfx.len || 180) * (0.85 + (1 - hk) * 0.12), -2);
          ctx.lineTo((hfx.len || 180) * (0.85 + (1 - hk) * 0.12), 2);
          ctx.lineTo(-8, 22 * hk);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "rgba(80, 190, 255, " + (0.5 * hk) + ")";
          ctx.fillRect(0, -5, (hfx.len || 180) * 0.9, 10);
          ctx.fillStyle = "rgba(255, 210, 74, " + (0.7 * hk) + ")";
          ctx.fillRect(0, -2.4, (hfx.len || 180), 4.8);
          ctx.fillStyle = "rgba(255, 255, 255, " + hk + ")";
          ctx.fillRect(0, -1, (hfx.len || 180), 2);
          ctx.restore();
        }
      }
      if (e.harvestGhosts) {
        var hgo, ghost, gk;
        for (hgo = 0; hgo < e.harvestGhosts.length; hgo++) {
          ghost = e.harvestGhosts[hgo];
          gk = Math.max(0, ghost.t / (ghost.max || 0.2));
          ctx.save();
          ctx.globalAlpha = gk * 0.55;
          ctx.translate(ghost.x, ghost.y);
          ctx.rotate(ghost.rot || 0);
          ctx.fillStyle = "rgba(255, 230, 140, 0.7)";
          ctx.beginPath();
          ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(80, 190, 255, 0.5)";
          ctx.beginPath();
          ctx.ellipse(8, 0, 10, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      if ((e.harvestFlash || 0) > 0.01) {
        var pb2 = G.playfield(state);
        var fa = Math.min(1, e.harvestFlash * 4);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255, 244, 200, " + (fa * 0.22) + ")";
        ctx.fillRect(pb2.x0, pb2.y0, pb2.x1 - pb2.x0, pb2.y1 - pb2.y0);
        var flg = ctx.createRadialGradient(e.x, e.y, 10, e.x, e.y, 220);
        flg.addColorStop(0, "rgba(255, 255, 255, " + (fa * 0.55) + ")");
        flg.addColorStop(0.4, "rgba(255, 210, 74, " + (fa * 0.28) + ")");
        flg.addColorStop(1, "rgba(40, 120, 255, 0)");
        ctx.fillStyle = flg;
        ctx.fillRect(pb2.x0, pb2.y0, pb2.x1 - pb2.x0, pb2.y1 - pb2.y0);
        ctx.restore();
      }
      if ((e.blinkFxT || 0) > 0 && e.blinkFrom) {
        ctx.strokeStyle = "rgba(255, 220, 90, 0.7)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(e.blinkFrom.x, e.blinkFrom.y);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  G.drawHiveKingGhosts = function (ctx, state) {
    if (!state || !state.enemies) return;
    var i, e, gi, g, s, a, ph, trail;
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (e.hp <= 0 || e.type !== "chefe_beeking" || !e.chargeGhosts) continue;
      s = (e.def && e.def.size) || 22;
      ph = e.phase || 0;
      for (gi = 0; gi < e.chargeGhosts.length; gi++) {
        g = e.chargeGhosts[gi];
        if (!g || !g.alive) continue;
        a = (g.vx || g.vy) ? 0.46 : 0.3;
        a += Math.sin((state.time || 0) * 22 + gi * 2.4) * 0.07;
        if (g.vx || g.vy) {
          trail = 14;
          ctx.save();
          ctx.globalAlpha = a * 0.35;
          ctx.translate(g.x - Math.cos(g.rot || 0) * trail, g.y - Math.sin(g.rot || 0) * trail);
          ctx.rotate(g.rot || 0);
          drawBeeking(ctx, { phase: ph, enrage: true }, s * 0.92);
          ctx.restore();
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0.18, a);
        ctx.translate(g.x, g.y);
        ctx.rotate(g.rot || 0);
        drawBeeking(ctx, { phase: ph, enrage: true }, s);
        ctx.strokeStyle = "rgba(140, 255, 255, 0.9)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, s * 1.08, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = "rgba(255, 224, 120, 0.45)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.72, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  G.drawHeirTake = function (ctx, state) {
    if (!state || !state.enemies) return;
    var princess = null;
    var queen = null;
    var king = null;
    var i, e, k, p, s;
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      if (e.hp <= 0) continue;
      if (e.type === "beeprincess") princess = e;
      if (e.fallen && e.type === "chefe_megatanque") queen = e;
      if (e.fallen && e.type === "chefe_beeking") king = e;
    }
    if (!princess || princess.hideDraw) return;
    s = (princess.def && princess.def.size) || 32;
    function fly(u, ax, ay, bx, by) {
      u = Math.max(0, Math.min(1, u));
      return {
        x: ax + (bx - ax) * u,
        y: ay + (by - ay) * u - Math.sin(u * Math.PI) * 32
      };
    }
    k = princess.heirSwordK || 0;
    if (king && k > 0.02 && k < 0.995) {
      p = fly(k, king.x, king.y, princess.x + 12, princess.y + 8);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(-0.5 + k * 0.55);
      ctx.globalAlpha = 0.45 + k * 0.5;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(255, 230, 140, 0.35)";
      ctx.beginPath();
      ctx.arc(s * 0.5, 0, 10 + k * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      drawRoyalGreatsword(ctx, s * 0.9, false);
      ctx.restore();
    }
    k = princess.heirScepterK || 0;
    if (queen && k > 0.02 && k < 0.995) {
      p = fly(k, queen.x, queen.y, princess.x - 8, princess.y + 8);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(-0.2 + k * 0.35);
      ctx.globalAlpha = 0.45 + k * 0.5;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(122, 247, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(0, -s * 0.6, 8 + k * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      drawRoyalScepter(ctx, s * 0.88, true);
      ctx.restore();
    }
    if ((princess.screamFx || 0) > 0.04) {
      var sk = princess.screamFx;
      ctx.save();
      ctx.translate(princess.x, princess.y - (princess.zDraw || 0));
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255, 244, 196, " + (0.35 + sk * 0.5) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.15 + (1 - sk) * 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 180, 40, " + (sk * 0.4) + ")";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.45 + (1 - sk) * 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  };

  G.drawBossWorld = function (ctx, state) {
    if (!state || !state.enemies) return;
    drawHiveLink(ctx, state);
    drawHiveQueenMagic(ctx, state);
    drawPrincessWorld(ctx, state);
    drawGlinderFoci(ctx, state);
    drawGlinderBeams(ctx, state);
    drawGlinderMaze(ctx, state);
    drawGlinderCover(ctx, state);
    drawGlinderNova(ctx, state);
    drawGlinderSun(ctx, state);
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0) continue;
      if (e.type === "chefe_invasao") {
        var pulse = 0.45 + Math.sin((e.phase || 0) * 5) * 0.2;
        var auraR = (e.invP2 || e.p2) && e.inv ? 204 : 102;
        ctx.save();
        ctx.strokeStyle = "rgba(120, 255, 140, " + (0.28 + pulse * 0.35) + ")";
        ctx.fillStyle = "rgba(80, 220, 120, 0.08)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, auraR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      if (e.type === "heal_station") {
        var hp = 0.4 + Math.sin((e.phase || 0) * 5) * 0.12;
        ctx.save();
        ctx.strokeStyle = "rgba(124, 255, 176, " + (0.22 + hp) + ")";
        ctx.fillStyle = "rgba(80, 220, 140, 0.07)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.healR || 72, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      if (e.type === "chefe_arklan" && e.wormSegs) {
        for (var s = 0; s < e.wormSegs.length; s++) {
          var seg = e.wormSegs[s];
          var k = s / Math.max(1, e.wormSegs.length - 1);
          var fade = seg.sticky ? 1 : Math.max(0, Math.min(1, seg.life / 1.35));
          var sr = (seg.r || 28) * (0.85 + k * 0.35);
          ctx.save();
          ctx.translate(seg.x, seg.y);
          ctx.rotate(seg.rot || 0);
          ctx.globalAlpha = (0.45 + k * 0.5) * fade;
          ctx.fillStyle = "#6a4a22";
          ctx.beginPath();
          ctx.ellipse(0, 0, sr * 1.15, sr * 0.72, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#c4a06a";
          ctx.beginPath();
          ctx.ellipse(0, 0, sr * 0.92, sr * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#8a6030";
          ctx.fillRect(-sr * 0.55, -sr * 0.42, 6, sr * 0.84);
          if (e.invP2) {
            ctx.fillStyle = "#ffd24a";
            ctx.beginPath();
            ctx.arc(sr * 0.25, -sr * 0.18, 3.2, 0, Math.PI * 2);
            ctx.arc(sr * 0.25, sr * 0.18, 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#1a0808";
            ctx.beginPath();
            ctx.arc(sr * 0.32, -sr * 0.18, 1.4, 0, Math.PI * 2);
            ctx.arc(sr * 0.32, sr * 0.18, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
      if (e.type === "chefe_arklan" && e.wormAct === "suck") {
        var suckLeft = e.suckLeft || 0;
        var pulse = 0.35 + Math.sin((state.time || 0) * 7) * 0.12;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.strokeStyle = "rgba(196, 160, 106, " + (0.22 + pulse) + ")";
        ctx.lineWidth = 2;
        for (var sk = 1; sk <= 3; sk++) {
          var rr = 40 + sk * 38 + (1 - Math.min(1, suckLeft / 4.5)) * 18;
          ctx.beginPath();
          ctx.arc(0, 0, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (e.type === "chefe_arklan" && e.wormAct === "spin") {
        var telling = (e.spinTell || 0) > 0;
        var firing = (e.wormSpinT || 0) > 0;
        if (telling || firing) {
          var jets = e.wormJets || 1;
          var jlen = firing
            ? Math.hypot((G.playfield(state).x1 - G.playfield(state).x0), (G.playfield(state).y1 - G.playfield(state).y0)) * 0.78
            : 96;
          for (var j = 0; j < jets; j++) {
            var ja = (e.wormSpinAng || -Math.PI / 2) + (j ? Math.PI : 0);
            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.rotate(ja);
            var grd = ctx.createLinearGradient(0, 0, jlen, 0);
            if (telling) {
              grd.addColorStop(0, "rgba(196, 150, 80, 0.28)");
              grd.addColorStop(1, "rgba(140, 100, 40, 0)");
            } else {
              grd.addColorStop(0, "rgba(232, 192, 96, 0.5)");
              grd.addColorStop(1, "rgba(180, 130, 50, 0.04)");
            }
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.moveTo(22, telling ? -10 : -28);
            ctx.lineTo(jlen, telling ? -18 : -32);
            ctx.lineTo(jlen, telling ? 18 : 32);
            ctx.lineTo(22, telling ? 10 : 28);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
      }
      if (e.type === "chefe_espectro" && !e.fake && ((e.moonEnergy || 0) > 0 || e.veilAct === "sword")) {
        var en = Math.max(0, Math.min(1, (e.moonEnergy || 0) / 100));
        ctx.save();
        ctx.translate(e.x, e.y - (e.def.size || 40) - 18);
        ctx.fillStyle = "rgba(8, 16, 32, 0.7)";
        ctx.fillRect(-22, -5, 44, 7);
        ctx.fillStyle = "#9ad8ff";
        ctx.fillRect(-21, -4, 42 * en, 5);
        ctx.strokeStyle = "rgba(180, 220, 255, 0.8)";
        ctx.strokeRect(-22, -5, 44, 7);
        ctx.restore();
        if (e.veilAct === "sword" || (e.swordT || 0) > 0) {
          var sa = e.swordAng != null ? e.swordAng : (e.rot || 0);
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(sa);
          var pulse = 0.55 + Math.sin((e.phase || 0) * 10) * 0.25;
          var grdS = ctx.createLinearGradient(18, 0, 118, 0);
          grdS.addColorStop(0, "rgba(220, 240, 255, " + pulse + ")");
          grdS.addColorStop(0.5, "rgba(140, 190, 255, 0.85)");
          grdS.addColorStop(1, "rgba(80, 140, 255, 0.05)");
          ctx.fillStyle = grdS;
          ctx.beginPath();
          ctx.moveTo(16, -7);
          ctx.lineTo(122, -16);
          ctx.lineTo(128, 0);
          ctx.lineTo(122, 16);
          ctx.lineTo(16, 7);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "rgba(240, 250, 255, 0.9)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = "#c8e8ff";
          ctx.fillRect(4, -10, 16, 20);
          ctx.restore();
        }
      }
      if (e.nestBuff || e.fused) {
        ctx.save();
        ctx.strokeStyle = e.fused ? "rgba(196, 92, 255, 0.7)" : "rgba(255, 210, 74, 0.55)";
        ctx.lineWidth = e.fused ? 3 : 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, (e.def.size || 12) + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  G.drawArenaDark = function (ctx, state) {
    var dark = state.vultoDark || 0;
    var blind = state.vultoBlind || 0;
    var night = !!state.glinderNight || !!state.glinderNightFade;
    if (dark < 0.02 && blind <= 0) return;
    var b = G.playfield(state);
    var cover = night ? Math.min(0.97, 0.88 * dark + 0.08) : (0.58 * dark + (blind > 0 ? 0.34 : 0));
    var lights = [];
    var ei;
    for (ei = 0; ei < (state.enemies || []).length; ei++) {
      var e = state.enemies[ei];
      if (e.hp <= 0) continue;
      if (e.type === "chefe_vulto") {
        if (e.mazeHide || (state.glinderMaze && state.glinderMaze.phase !== "done")) continue;
        if (night) lights.push({ x: e.x, y: e.y, r: 8 + Math.sin((e.phase || 0) * 9) * 2, glow: "#ff1a12", pin: true });
        else lights.push({ x: e.x, y: e.y, r: 96 + Math.sin((e.phase || 0) * 6) * 12, glow: "#ff6a18" });
      }
      if (e.type === "fogueira") {
        if (night && e.glinderCoal && !e.lit) {
          var age = Math.min(1, (state.glinderNightT || e.coalAge || 0) / 18);
          var pinR = 3.2 + age * 7.6 + Math.sin((e.phase || 0) * 6) * (0.4 + age * 1.6);
          lights.push({ x: e.x, y: e.y, r: pinR, glow: "#ff4a18", pin: true, pinAge: age });
        } else if (!night || e.lit) lights.push({ x: e.x, y: e.y, r: 78 + Math.sin((e.phase || 0) * 8) * 10, glow: "#ff9a2a" });
      }
    }
    if (!night) {
      for (var z = 0; z < (state.zones || []).length; z++) {
        var zn = state.zones[z];
        if (zn.kind === "napalm" || zn.kind === "fire") lights.push({ x: zn.x, y: zn.y, r: (zn.r || 28) * 2.2, glow: "#ff7a22" });
        if (zn.kind === "moon_spot" || zn.kind === "moon_burn") lights.push({ x: zn.x, y: zn.y, r: 130, glow: "#9ad8ff" });
      }
      for (var fw = 0; fw < (state.firewaves || []).length; fw++) {
        var wave = state.firewaves[fw];
        lights.push({ x: wave.x, y: wave.y, r: (wave.r || 40) + 36, glow: "#fff4c8" });
      }
      if (blind <= 0) lights.push({ x: state.squad.x, y: state.squad.y, r: 58, glow: "" });
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x0 - 50, b.y0 - 50, b.x1 - b.x0 + 100, b.y1 - b.y0 + 100);
    for (var L = 0; L < lights.length; L++) {
      ctx.moveTo(lights[L].x + lights[L].r, lights[L].y);
      ctx.arc(lights[L].x, lights[L].y, lights[L].r, 0, Math.PI * 2);
    }
    ctx.fillStyle = "rgba(4, 1, 8, " + Math.min(0.97, cover) + ")";
    ctx.fill("evenodd");
    ctx.restore();
    ctx.save();
    for (var g = 0; g < lights.length; g++) {
      var lt = lights[g];
      if (!lt.glow) continue;
      var rad = ctx.createRadialGradient(lt.x, lt.y, 1, lt.x, lt.y, lt.r);
      if (lt.pin) {
        var pa = lt.pinAge != null ? lt.pinAge : 1;
        rad.addColorStop(0, "rgba(255, 40, 20, " + (0.28 + pa * 0.67) + ")");
        rad.addColorStop(0.45, "rgba(255, 70, 30, " + (0.12 + pa * 0.43) + ")");
        rad.addColorStop(1, "rgba(80, 0, 0, 0)");
      } else {
        rad.addColorStop(0, lt.glow === "#9ad8ff" ? "rgba(140, 210, 255, 0.28)" : "rgba(255, 140, 40, 0.32)");
        rad.addColorStop(1, "rgba(255, 80, 20, 0)");
      }
      ctx.fillStyle = rad;
      ctx.beginPath();
      ctx.arc(lt.x, lt.y, lt.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  G.drawDrop = function (ctx, d) {
    ctx.save();
    var fade = 1;
    if (d.maxLife > 0 && d.life != null) {
      fade = d.life > 3 ? 1 : Math.max(0, d.life / 3);
    }
    ctx.globalAlpha *= fade;
    var bob = Math.sin((d.t || 0) * 6) * 2.4;
    ctx.translate(d.x, d.y + bob);
    if (d.kind === "coin") {
      ctx.save();
      ctx.fillStyle = "rgba(20, 12, 0, 0.35)";
      ctx.beginPath();
      ctx.ellipse(1.5, 6.5, 8, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.scale(1, 0.62);
      var coin = ctx.createRadialGradient(-3, -4, 1, 0, 0, 11);
      coin.addColorStop(0, "#fff4b0");
      coin.addColorStop(0.35, "#ffd24a");
      coin.addColorStop(0.75, "#c48a12");
      coin.addColorStop(1, "#6a4208");
      ctx.fillStyle = coin;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(90, 50, 0, 0.7)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#8a5a00";
      ctx.font = "bold 10px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 1);
      ctx.fillStyle = "rgba(255, 255, 220, 0.45)";
      ctx.beginPath();
      ctx.ellipse(-3, -3.5, 3.2, 1.6, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (d.kind === "hp") {
      ctx.save();
      ctx.fillStyle = "rgba(0, 30, 16, 0.3)";
      ctx.beginPath();
      ctx.ellipse(1, 7, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      var hpG = ctx.createRadialGradient(-2, -3, 1, 0, 0, 10);
      hpG.addColorStop(0, "#d8ffe8");
      hpG.addColorStop(0.45, "#7cffb0");
      hpG.addColorStop(1, "#146038");
      ctx.fillStyle = hpG;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#146038";
      ctx.font = "bold 11px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", 0, 1);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = "rgba(8, 20, 40, 0.35)";
      ctx.beginPath();
      ctx.ellipse(2, 8, 10, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(0, -1);
      ctx.fillStyle = "#1a3a68";
      ctx.beginPath();
      ctx.moveTo(-8, 2);
      ctx.lineTo(-8, 9);
      ctx.lineTo(0, 13);
      ctx.lineTo(8, 9);
      ctx.lineTo(8, 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#3a7ad4";
      ctx.beginPath();
      ctx.moveTo(-8, 2);
      ctx.lineTo(0, -4);
      ctx.lineTo(8, 2);
      ctx.lineTo(0, 7);
      ctx.closePath();
      ctx.fill();
      var lid = ctx.createLinearGradient(-6, -4, 8, 4);
      lid.addColorStop(0, "#9ad0ff");
      lid.addColorStop(0.45, "#4da6ff");
      lid.addColorStop(1, "#1a5aa8");
      ctx.fillStyle = lid;
      ctx.beginPath();
      ctx.moveTo(-8, 2);
      ctx.lineTo(0, -4);
      ctx.lineTo(8, 2);
      ctx.lineTo(0, 6.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(20, 40, 80, 0.65)";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(0, 6.2);
      ctx.moveTo(-8, 2);
      ctx.lineTo(8, 2);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", 0, 1);
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.beginPath();
      ctx.moveTo(-5, 1);
      ctx.lineTo(0, -3);
      ctx.lineTo(-1, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  G.drawPortrait = function (canvas, team, key, locked, portraitKey) {
    var ctx = canvas.getContext("2d");
    var w = canvas.width;
    var h = canvas.height;
    var imgKey = portraitKey || key;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#101828";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,220,120,0.22)";
    ctx.strokeRect(8, 8, w - 16, h - 16);
    if (locked) {
      ctx.fillStyle = "#3a4458";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2 - 6, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#889";
      ctx.font = "bold 36px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", w / 2, h / 2);
      return;
    }
    if (imgKey && G.portraitImgs) {
      G.preloadPortraits();
      var face = G.portraitImgs[imgKey];
      if (face && !(face.complete && face.naturalWidth)) {
        face.onload = function () {
          G.drawPortrait(canvas, team, key, locked, portraitKey);
        };
      }
      if (face && face.complete && face.naturalWidth) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        var pad = 10;
        var dw = w - pad * 2;
        var dh = h - pad * 2;
        var iw = face.naturalWidth;
        var ih = face.naturalHeight;
        var s = Math.max(dw / iw, dh / ih);
        var dw2 = iw * s;
        var dh2 = ih * s;
        ctx.drawImage(face, pad + (dw - dw2) / 2, pad + (dh - dh2) / 2 - 4, dw2, dh2);
        ctx.restore();
        var rim = ctx.createLinearGradient(0, 0, 0, h);
        if (team === "player") {
          rim.addColorStop(0, "rgba(255, 224, 138, 0.18)");
        } else {
          rim.addColorStop(0, "rgba(255, 90, 70, 0.22)");
        }
        rim.addColorStop(0.7, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = rim;
        ctx.fillRect(8, 8, w - 16, h - 16);
        return;
      }
    }
    var dummy;
    if (team === "player") {
      dummy = G.createPlayerUnit(w / 2, h / 2 + 8, key, { hp: 1 }, {});
    } else {
      dummy = G.createEnemy(key, w / 2, h / 2 + 8, 1);
    }
    if (!dummy || !dummy.def) return;
    if (imgKey === "chefe_comandante_p2") dummy.shellOff = true;
    dummy.preview = true;
    dummy.rot = -0.55;
    dummy.hp = dummy.maxHp;
    dummy.gait = 1.18;
    dummy.rotor = 0.95;
    dummy.wheel = 0.7;
    dummy.vx = 70;
    var scale = Math.min(2.8, 52 / Math.max(12, dummy.def.size));
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -h / 2);
    if (team === "player") G.drawPlayerUnit(ctx, dummy, 0.35);
    else G.drawEnemy(ctx, dummy);
    ctx.restore();
  };
})(window.TFAG = window.TFAG || {});
