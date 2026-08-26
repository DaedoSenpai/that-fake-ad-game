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
      hp: 1680, dmg: 28, range: 180, fire: 0.7, speed: 96, size: 28, color: "#f0c84a", kind: "boss_princess", boss: true, flying: true,
      blurb: "Nobre guerreira. Rapier, cetro, coroa e capa. Entra quando a rainha e o rei caem."
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
      hp: 930, dmg: 28, range: 210, fire: 0.9, speed: 48, size: 32, color: "#d4a024", kind: "boss_burst", boss: true,
      blurb: "Chefe da linha. Escudos orbitam e ele gira atirando pelas duas pontas do corpo."
    },
    chefe_vulto: {
      name: "Glinder o Vulto da Noite",
      title: "Aquela que queima a luz",
      hp: 1120, dmg: 24, range: 240, fire: 0.7, speed: 92, size: 26, color: "#c01818", kind: "boss_vulto", boss: true, flying: true,
      blurb: "Vagalume vermelho e preto. Apaga a arena e ilumina só o que ele queima."
    },
    chefe_megatanque: {
      name: "Beequeen-07",
      title: "Imperatriz da Colmeia",
      hp: 1350, dmg: 46, range: 160, fire: 0.45, speed: 52, size: 42, color: "#f0b42a", kind: "boss_charge", boss: true, flying: true,
      blurb: "Imperatriz voadora. Ferrão venenoso e mergulho que atropela."
    },
    chefe_beeking: {
      name: "Beeking-08",
      title: "O rei da colmeia",
      hp: 780, dmg: 30, range: 110, fire: 0.35, speed: 118, size: 30, color: "#e87830", kind: "boss_king", boss: true, flying: true,
      blurb: "Abelha coroada. Protege a rainha, cura ela e investe com a lança."
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
    E.chefe_invasao.passive = { name: "Espelho da resistência", desc: "Copia o comandante: dispara com duas pistolas, manda tropa pra cima e cura quem fica na aura." };
    E.chefe_invasao.skills = [
      { type: "active", name: "Bomba de ácido", desc: "Solta duas: uma no esquadrão e outra perto, pra cercar. Depois do atraso, ácido no chão.", icon: "☢" },
      { type: "active", name: "Fuzileiros", desc: "Mantém até 5 soldados no campo, spawnando de novo quando alguém cai. Feridos recuam, curados voltam pra cima.", icon: "🔫" },
      { type: "active", name: "Aura verde", desc: "Cura o enxame perto dele enquanto a luta rola.", icon: "✚" },
      { type: "active", name: "Reforço contínuo", desc: "A luta inteira chama inimigos até o cap de 5 soldados.", icon: "👁" }
    ];
    E.fuzileiro_alien.passive = { name: "Disciplina", desc: "Fecha no esquadrão. Com a vida baixa, recua." };
    E.fuzileiro_alien.active = { name: "Rajada", desc: "Tiro de fuzil orgânico." };
    E.chefe_comandante.passive = { name: "Carrasco da linha", desc: "Escudos orbitam nele. Só chama o próximo anel quando o atual morre e passam 10s desprotegido." };
    E.chefe_comandante.skills = [
      { type: "active", name: "Giro de fogo", desc: "A cada 3 sequências de tiro ele gira 360° atirando pelas duas pontas, nos dois sentidos. Tem aviso no chão antes de girar.", icon: "💥" },
      { type: "active", name: "Tiros sequenciais", desc: "Rajada pela frente e por trás, sem girar o corpo. Só entra no giro na terceira sequência.", icon: "🔫" },
      { type: "active", name: "Escudos arremessados", desc: "Joga os escudos orbitais em cima do esquadrão. Depois eles voltam pra órbita.", icon: "🛡" },
      { type: "active", name: "Guarda orbital", desc: "A cada 20% de HP chama um anel de escudos. Não chama outro enquanto algum estiver vivo. Quando o anel cai, fica 10s sem proteção.", icon: "🛡" },
      { type: "active", name: "Investida", desc: "Abaixo de 50% de HP, aponta e avança no esquadrão.", icon: "⚠" }
    ];
    E.chefe_vulto.passive = { name: "Apaga-luz", desc: "A arena escurece. Só as chamas dele devolvem a visão." };
    E.chefe_vulto.skills = [
      { type: "active", name: "Razante de napalm", desc: "Vem de qualquer direção — e de direções diferentes ao mesmo tempo. O caminho pode ser torto. Deixa o chão queimando. Em 50% de vida cobre três linhas.", icon: "✈" },
      { type: "active", name: "Laser de fogo", desc: "Aviso fino no chão, depois um tiro de chama bem estreito que atravessa a arena quase inteira.", icon: "🔥" },
      { type: "active", name: "Escuridão", desc: "Por 5s a arena quase some. Só as chamas dele devolvem um pouco de visão. Não causa dano.", icon: "🌑" }
    ];
    E.chefe_megatanque.passive = { name: "Rainha de choque", desc: "Voa como abelha: oito, zumbido, ferrão. Atropela quem fica na frente. Não atira no meio da carga." };
    E.chefe_megatanque.skills = [
      { type: "active", name: "Leque tóxico", desc: "Três ferrões em leque. Cada um envenena (5% da vida máxima em 5s, dano verdadeiro).", icon: "🦂" },
      { type: "active", name: "Investida", desc: "Para, aponta a faixa e mergulha. Durante a investida ela só atropela — não atira.", icon: "🐝" },
      { type: "active", name: "Ricochete", desc: "A cada 5 investidas, bate nas paredes 5 vezes com o rumo torto.", icon: "💥" },
      { type: "active", name: "Cria tóxica", desc: "A cada 30s invoca uma operária. Os ferrões também envenenam.", icon: "🐝" }
    ];
    E.chefe_beeking.passive = { name: "Guarda real", desc: "20% do dano na rainha passa pra ele. Cura ela e se joga na frente." };
    E.chefe_beeking.skills = [
      { type: "active", name: "Investida da lança", desc: "Marca o chão e dá dash no esquadrão.", icon: "⚔" },
      { type: "active", name: "Escudo vivo", desc: "Fica na frente da rainha e devolve um pouco de vida.", icon: "🛡" },
      { type: "active", name: "Fúria do rei", desc: "Se a rainha cair primeiro, ele luta como cavaleiro: estocada, lança e mergulho.", icon: "👑" }
    ];
    E.chefe_megatanque.skills.push({ type: "active", name: "Enrage da colmeia", desc: "Se o rei cair, ela fica vermelha, cobra mais rápido, chama mais abelhas e joga mel pra atrasar o passo.", icon: "😡" });
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
    E.batedor_alien.passive = { name: "Flanco", desc: "Corre na frente do fuzileiro e abre o lado." };
    E.batedor_alien.active = { name: "Disparada", desc: "Fecha rápido no esquadrão." };
    E.pistoleiro_alien.passive = { name: "Médico invertido", desc: "Cura o Irwin se estiver perto." };
    E.pistoleiro_alien.active = { name: "Pistola", desc: "Tiro curto e rápido." };
    E.fogueira.passive = { name: "Brasa", desc: "Ilumina o canto. 100 de vida fixa." };
    E.fogueira.active = { name: "Fogueira", desc: "Enquanto existir, a escuridão não some." };
    E.kaska_sentry.passive = { name: "Fincada", desc: "Não anda. Atira no esquadrão." };
    E.kaska_sentry.active = { name: "Rajada", desc: "Tiro de casca dourada." };
    E.beeprincess.passive = { name: "Herdeira", desc: "Entra quando a rainha e o rei caem. Rapier, cetro, coroa e capa." };
    E.beeprincess.skills = [
      { type: "active", name: "Perfuração real", desc: "Charge rápido. Deixa mel no caminho e um AoE de mel no fim que prende.", icon: "👑" },
      { type: "active", name: "Combo de estocadas", desc: "Aproxima e corta em várias direções. Os slashes avisam no chão.", icon: "⚔" },
      { type: "active", name: "Cavalaria real", desc: "Enfermeira leva ela pro canto oposto e cura. Arquiteta ergue 3 barreiras.", icon: "🐝" },
      { type: "active", name: "Final Flash", desc: "20 cortes na arena. Depois ela ajoelha 5s no centro, fraca.", icon: "✨" }
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
    return G.MAX_UNITS + (G.save.data.perm.maxUnits | 0);
  };

  G.soldierCount = function (state) {
    var n = 0;
    for (var i = 0; i < state.units.length; i++) {
      if (state.units[i].hp > 0 && !state.units[i].commander) n++;
    }
    return n;
  };

  G.KIND_COPY_CAP = 2;

  G.kindCopyCap = function (kind) {
    if (!kind || kind === "recruta" || kind === "comandante") return 99;
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
      spawnInterval: 0.38 - t * 0.24,
      concurrent: Math.round(6 + t * 12),
      waveMul: 2
    };
  };

  G.portraitImgs = {};

  G.preloadPortraits = function () {
    var kinds = (G.unitList && G.unitList()) || ["comandante", "recruta", "fuzileiro", "pistoleiro", "batedor"];
    if (G.ENEMY_DEFS) {
      Object.keys(G.ENEMY_DEFS).forEach(function (k) {
        var d = G.ENEMY_DEFS[k];
        if (d && d.boss && !d.codexHide && !d.fake) kinds.push(k);
      });
      var extra = ["fuzileiro_alien", "batedor_alien", "pistoleiro_alien", "fogueira", "kaska_sentry", "abelha_enfermeira", "abelha_arquiteta"];
      for (var ei = 0; ei < extra.length; ei++) kinds.push(extra[ei]);
    }
    for (var i = 0; i < kinds.length; i++) {
      var k = kinds[i];
      if (G.portraitImgs[k]) continue;
      var img = new Image();
      img.src = "img/portrait-" + k + ".png";
      G.portraitImgs[k] = img;
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

  G.createPlayerUnit = function (x, y, kind, run, perm) {
    kind = G.unitKind(kind);
    var def = G.UNIT_DEFS[kind] || G.UNIT_DEFS.recruta;
    var hpMul = (run && run.hp ? run.hp : 1) * (1 + (perm ? perm.hp : 0) * 0.1);
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
      pierce: !!opt.pierce,
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
      r: radius || 40,
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
    if ((e.stealth || 0) > 0.2 && (e.revealT || 0) <= 0) return;
    var glow = e.healGlow || 0;
    var stolen = !!e.stolen;
    if (e.hp >= e.maxHp * 0.98 && glow <= 0 && !stolen) return;
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
    var falling = !!(u.commander && fallT > 0);
    var pose = falling ? commanderFallPose(fallT) : null;
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
      var piston = Math.sin(gait) * s * 0.06;
      fillRound(ctx, -s * 0.55, s * 0.35 + piston, s * 0.28, s * 0.42, 3, "#2a3848");
      fillRound(ctx, s * 0.22, s * 0.35 - piston, s * 0.28, s * 0.42, 3, "#2a3848");
      ctx.save();
      ctx.scale(breath, breath);
      fillRound(ctx, -s * 0.9, -s * 0.72, s * 1.8, s * 1.35, 8, "#4a6a88");
      fillRound(ctx, -s * 0.62, -s * 0.48, s * 1.2, s * 0.95, 7, col);
      gleam(ctx, -s * 0.28, -s * 0.32, s * 0.4, s * 0.16, 0.18);
      oval(ctx, s * 0.12, -s * 0.04, s * 0.28, s * 0.24, acc);
      ctx.strokeStyle = acc;
      ctx.globalAlpha = 0.55 + Math.sin(timeN * 6 + idOff) * 0.25;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s * 0.12, -s * 0.04, s * 0.36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
      barrel(ctx, s * 0.55, 0, s * 0.95, 7, "#0b1a33");
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
  }

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

  function beeBody(ctx, e, s, queen) {
    var ph = e.phase || 0;
    var king = e.type === "chefe_beeking";
    var rage = !!e.enrage && queen;
    var knight = king && !!e.enrage;
    buzzWings(ctx, s, ph, queen || king ? 1.35 : 1);
    insectLegs(ctx, s * 0.7, 3, rage ? "#3a0808" : king ? "#3a1408" : "#1a0c04");
    var aw = queen ? s * 1.05 : king ? s * 0.92 : s * 0.78;
    var ah = queen ? s * 0.62 : king ? s * 0.54 : s * 0.46;
    var stripe = rage ? "#7a1010" : king ? "#4a1808" : "#1a0c04";
    var abdomen = rage ? "#ff4a32" : queen ? "#f0b42a" : king ? (knight ? "#ff6a28" : "#e07028") : "#ffc44a";
    if (king) {
      ctx.save();
      ctx.translate(s * 0.02, s * 0.78);
      ctx.rotate(0.18);
      ctx.fillStyle = "#5a2a0c";
      ctx.beginPath();
      ctx.ellipse(0, 4, s * 0.62, s * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = knight ? "#c03018" : "#c45a22";
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.56, s * 0.56, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffd24a";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.56, s * 0.56, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 210, 74, 0.55)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.38, s * 0.38, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.28);
      ctx.lineTo(s * 0.16, s * 0.06);
      ctx.lineTo(0, s * 0.22);
      ctx.lineTo(-s * 0.16, s * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    oval(ctx, -s * 0.55, 0, aw, ah, stripe);
    oval(ctx, -s * 0.55, 0, aw * 0.9, ah * 0.86, abdomen);
    ctx.fillStyle = stripe;
    var stripes = queen ? 5 : king ? 4 : 3;
    for (var i = 0; i < stripes; i++) {
      var x = -s * 0.12 - i * (queen ? s * 0.26 : s * 0.28);
      ctx.fillRect(x - (queen ? 3.5 : 2.4), -ah * 0.84, queen ? 7 : 5, ah * 1.68);
    }
    ctx.fillStyle = rage ? "#ffd0a0" : king ? "#ffb060" : "#c8fff0";
    ctx.beginPath();
    ctx.moveTo(-s * 0.55 - aw + 2, 0);
    ctx.lineTo(-s * 0.55 - aw - s * 0.42, -3);
    ctx.lineTo(-s * 0.55 - aw - s * (queen ? 0.7 : 0.5), 0);
    ctx.lineTo(-s * 0.55 - aw - s * 0.42, 3);
    ctx.closePath();
    ctx.fill();
    oval(ctx, s * 0.08, 0, s * (queen ? 0.55 : 0.42), s * (queen ? 0.48 : 0.36), rage ? "#4a1010" : king ? "#5a220c" : "#3a2208");
    oval(ctx, s * 0.08, 0, s * (queen ? 0.42 : 0.3), s * (queen ? 0.36 : 0.26), rage ? "#c03020" : queen ? "#d49020" : king ? "#e87830" : "#e8a028");
    if (queen) {
      oval(ctx, s * 0.08, 0, s * 0.16, s * 0.16, rage ? "#ff6a3a" : "#7af7ff");
      ctx.strokeStyle = rage ? "rgba(255, 90, 50, 0.8)" : "rgba(122, 247, 255, 0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s * 0.08, 0, s * 0.28 + Math.sin(ph * 6) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    oval(ctx, s * 0.62, 0, s * (queen ? 0.42 : 0.32), s * (queen ? 0.36 : 0.28), king ? "#3a1408" : "#2a1808");
    oval(ctx, s * 0.62, 0, s * (queen ? 0.32 : 0.24), s * (queen ? 0.28 : 0.2), rage ? "#8a2010" : king ? "#a44818" : "#5a3010");
    eye(ctx, s * 0.78, -s * 0.14, s * (queen ? 0.16 : 0.11), rage ? "#3a0000" : king ? "#2a1008" : "#1a3040");
    eye(ctx, s * 0.78, s * 0.14, s * (queen ? 0.16 : 0.11), rage ? "#3a0000" : king ? "#2a1008" : "#1a3040");
    mandibles(ctx, s * (queen ? 0.85 : 0.7), king ? "#3a1408" : "#1a0c04");
    ctx.strokeStyle = king ? "#3a1408" : "#1a0c04";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(s * 0.7, -s * 0.22);
    ctx.quadraticCurveTo(s * 1.15, -s * 0.7, s * 1.35, -s * 0.85);
    ctx.moveTo(s * 0.7, s * 0.22);
    ctx.quadraticCurveTo(s * 1.15, s * 0.7, s * 1.35, s * 0.85);
    ctx.stroke();
    if (queen) {
      ctx.fillStyle = rage ? "#ff6a3a" : "#ffe08a";
      ctx.beginPath();
      ctx.moveTo(s * 0.35, -s * 0.42);
      ctx.lineTo(s * 0.55, -s * 0.92);
      ctx.lineTo(s * 0.72, -s * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rage ? "#ff8a4a" : "#7af7ff";
      ctx.fillRect(-s * 0.15, -3, s * 0.7, 6);
    }
    if (king) {
      ctx.strokeStyle = "#4a220c";
      ctx.lineWidth = 5.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s * 0.22, s * 0.1);
      ctx.lineTo(s * 2.05, 0);
      ctx.stroke();
      ctx.strokeStyle = "#8a4a18";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(s * 0.22, s * 0.1);
      ctx.lineTo(s * 2.02, 0);
      ctx.stroke();
      ctx.fillStyle = "#d8c090";
      ctx.beginPath();
      ctx.moveTo(s * 2.28, 0);
      ctx.lineTo(s * 1.88, -s * 0.16);
      ctx.lineTo(s * 1.88, s * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff4c4";
      ctx.beginPath();
      ctx.moveTo(s * 2.28, 0);
      ctx.lineTo(s * 2.02, -s * 0.07);
      ctx.lineTo(s * 2.02, s * 0.07);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffd24a";
      ctx.fillRect(s * 0.48, -s * 0.12, s * 0.16, s * 0.28);
      ctx.fillStyle = "#6a2a0c";
      ctx.fillRect(s * 0.38, -s * 0.08, s * 0.12, s * 0.2);
      ctx.fillStyle = "#c47820";
      ctx.beginPath();
      ctx.ellipse(s * 0.58, -s * 0.52, s * 0.34, s * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.ellipse(s * 0.58, -s * 0.56, s * 0.32, s * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      var pts = [-0.28, 0, 0.28];
      for (var c = 0; c < pts.length; c++) {
        var cx = s * 0.58 + pts[c] * s * 0.85;
        ctx.fillStyle = "#ffd24a";
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.08, -s * 0.58);
        ctx.lineTo(cx, -s * (c === 1 ? 1.12 : 0.96));
        ctx.lineTo(cx + s * 0.08, -s * 0.58);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = c === 1 ? "#ff6a3a" : "#7af7ff";
        ctx.beginPath();
        ctx.arc(cx, -s * (c === 1 ? 1.0 : 0.86), 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  G.drawEnemy = function (ctx, e) {
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
      ctx.fillStyle = "rgba(0,0,0,0.32)";
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
    if (e.zDraw) ctx.translate(0, -e.zDraw);
    ctx.rotate(e.rot || 0);

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
    } else if (t === "chefe_megatanque" || t === "mini_beemote" || t === "chefe_beeking") {
      beeBody(ctx, e, s, t === "chefe_megatanque");
    } else if (t === "chefe_invasao") {
      var capeS = Math.sin(ph * 4.2) * s * 0.16;
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
    } else if (t === "fuzileiro_alien") {
      insectLegs(ctx, s, 3, "#1a3018");
      oval(ctx, -s * 0.2, 0, s * 0.7, s * 0.48, "#2a5a30");
      oval(ctx, s * 0.28, 0, s * 0.5, s * 0.42, "#4aa36a");
      ctx.fillStyle = "#1a3018";
      ctx.fillRect(-s * 0.4, -s * 0.32, 3, s * 0.64);
      eye(ctx, s * 0.42, -s * 0.1, s * 0.1, "#0a2010");
      eye(ctx, s * 0.42, s * 0.1, s * 0.1, "#0a2010");
      mandibles(ctx, s * 0.55, "#143018");
      ctx.fillStyle = "#1a3018";
      ctx.fillRect(s * 0.45, -2.4, s * 0.85, 4.8);
      ctx.fillStyle = "#8ad422";
      ctx.fillRect(s * 1.15, -1.5, s * 0.22, 3);
    } else if (t === "batedor_alien") {
      insectLegs(ctx, s * 1.12, 3, "#1a3018");
      oval(ctx, -s * 0.15, 0, s * 0.58, s * 0.32, "#2a5a30");
      oval(ctx, s * 0.38, 0, s * 0.42, s * 0.34, "#8ad46a");
      eye(ctx, s * 0.5, -s * 0.08, s * 0.09, "#0a2010");
      eye(ctx, s * 0.5, s * 0.08, s * 0.09, "#0a2010");
      mandibles(ctx, s * 0.58, "#143018");
      ctx.fillStyle = "#1a3018";
      ctx.fillRect(s * 0.42, -1.8, s * 0.7, 3.6);
      ctx.fillStyle = "#c8ff6a";
      ctx.fillRect(s * 0.95, -1.1, s * 0.18, 2.2);
    } else if (t === "pistoleiro_alien") {
      insectLegs(ctx, s, 2, "#1a3018");
      oval(ctx, -s * 0.12, 0, s * 0.55, s * 0.4, "#2a6a48");
      oval(ctx, s * 0.32, 0, s * 0.4, s * 0.36, "#6ad49a");
      eye(ctx, s * 0.44, -s * 0.08, s * 0.09, "#0a2010");
      eye(ctx, s * 0.44, s * 0.08, s * 0.09, "#0a2010");
      ctx.fillStyle = "#e8ffe8";
      ctx.fillRect(-2, -s * 0.42, 4, 10);
      ctx.fillRect(-5, -s * 0.32, 10, 4);
      ctx.fillStyle = "#143018";
      ctx.fillRect(s * 0.38, -s * 0.28, s * 0.55, 3.2);
      ctx.fillRect(s * 0.38, s * 0.08, s * 0.55, 3.2);
      ctx.fillStyle = "#8ad422";
      ctx.fillRect(s * 0.82, -s * 0.26, 4, 2.4);
      ctx.fillRect(s * 0.82, s * 0.1, 4, 2.4);
    } else if (t === "fogueira") {
      ctx.fillStyle = "#3a2010";
      ctx.fillRect(-s * 0.7, s * 0.15, s * 1.4, s * 0.35);
      ctx.fillStyle = "#5a3010";
      ctx.save();
      ctx.rotate(-0.4);
      ctx.fillRect(-s * 0.8, 0, s * 1.5, 5);
      ctx.restore();
      ctx.save();
      ctx.rotate(0.35);
      ctx.fillRect(-s * 0.75, 2, s * 1.4, 5);
      ctx.restore();
      var flick = 0.85 + Math.sin(ph * 14) * 0.2;
      ctx.globalCompositeOperation = "lighter";
      oval(ctx, 0, -s * 0.35 * flick, s * 0.42, s * 0.7 * flick, "rgba(255, 90, 20, 0.75)");
      oval(ctx, 0, -s * 0.5 * flick, s * 0.22, s * 0.45 * flick, "rgba(255, 220, 80, 0.9)");
      ctx.globalCompositeOperation = "source-over";
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
      ctx.strokeStyle = "#3a2010";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(s * 0.32, s * 0.22);
      ctx.lineTo(s * 0.85, s * 0.42);
      ctx.stroke();
      ctx.strokeStyle = "#c8d8e8";
      ctx.lineWidth = 1.7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s * 0.42, s * 0.12);
      ctx.lineTo(s * 1.72, 0);
      ctx.stroke();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(s * 0.5, s * 0.1);
      ctx.lineTo(s * 1.62, 0.02);
      ctx.stroke();
      ctx.strokeStyle = "#d4a024";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s * 0.46, s * 0.12, 4.2, 0.4, Math.PI * 1.6);
      ctx.stroke();
      ctx.fillStyle = "#e8f0ff";
      ctx.beginPath();
      ctx.moveTo(s * 1.86, 0);
      ctx.lineTo(s * 1.68, -2.2);
      ctx.lineTo(s * 1.68, 2.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#8a5a18";
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, s * 0.28);
      ctx.lineTo(-s * 0.55, -s * 0.62);
      ctx.stroke();
      oval(ctx, -s * 0.62, -s * 0.7, 5.6, 5.6, "#ffe08a");
      oval(ctx, -s * 0.62, -s * 0.7, 2.6, 2.6, "#7af7ff");
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
      var flap = 0.7 + Math.sin(ph * 14) * 0.28;
      ctx.fillStyle = "#1a0808";
      ctx.beginPath();
      ctx.ellipse(-s * 0.15, -s * 0.08, s * 1.25 * flap, s * 0.55, -0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-s * 0.15, s * 0.08, s * 1.25 * flap, s * 0.55, 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c01818";
      ctx.beginPath();
      ctx.ellipse(-s * 0.2, -s * 0.12, s * 0.72 * flap, s * 0.28, -0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-s * 0.2, s * 0.12, s * 0.72 * flap, s * 0.28, 0.45, 0, Math.PI * 2);
      ctx.fill();
      oval(ctx, s * 0.1, 0, s * 0.48, s * 0.38, "#2a0c0c");
      oval(ctx, s * 0.42, 0, s * 0.34, s * 0.3, "#c01818");
      oval(ctx, s * 0.55, 0, s * 0.18, s * 0.22, "#ffd24a");
      ctx.globalAlpha *= 0.85;
      ctx.fillStyle = "rgba(255, 180, 40, 0.55)";
      ctx.beginPath();
      ctx.arc(s * 0.58, 0, s * 0.32 + Math.sin(ph * 8) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      eye(ctx, s * 0.52, -s * 0.1, s * 0.1, "#1a0808");
      eye(ctx, s * 0.52, s * 0.1, s * 0.1, "#1a0808");
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
      insectLegs(ctx, s, 3, "#3a2208");
      oval(ctx, -s * 0.35, 0, s * 0.95, s * 0.7, "#3a2208");
      if (e.shellOff) {
        oval(ctx, -s * 0.35, 0, s * 0.72, s * 0.48, "#5a3010");
        oval(ctx, -s * 0.28, 0, s * 0.58, s * 0.38, "#8a4a18");
      } else {
        oval(ctx, -s * 0.35, 0, s * 0.82, s * 0.58, "#c48a20");
        ctx.fillStyle = "#5a3010";
        for (var sg = 0; sg < 4; sg++) ctx.fillRect(-s * 0.9 + sg * s * 0.28, -s * 0.5, 5, s);
      }
      oval(ctx, s * 0.35, 0, s * 0.55, s * 0.5, "#8a5a18");
      oval(ctx, s * 0.85, 0, s * 0.42, s * 0.38, "#d4a024");
      eye(ctx, s * 1.02, -s * 0.12, s * 0.14, "#1a0808");
      eye(ctx, s * 1.02, s * 0.12, s * 0.14, "#1a0808");
      mandibles(ctx, s * 0.9, "#2a1408");
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.moveTo(s * 0.55, -s * 0.4);
      ctx.lineTo(s * 0.72, -s * 0.95);
      ctx.lineTo(s * 0.95, -s * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#3a2010";
      ctx.fillRect(s * 0.15, -s * 0.72, s * 0.7, 7);
      ctx.fillStyle = "#ffd24a";
      ctx.fillRect(s * 0.55, -4, s * 0.95, 8);
      ctx.fillStyle = "#c48a20";
      ctx.fillRect(-s * 1.35, -3.5, s * 0.7, 7);
      ctx.fillStyle = "#ffd24a";
      ctx.fillRect(-s * 1.55, -2.5, s * 0.32, 5);
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
    if (!e.preview) drawEnemyMark(ctx, e);
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
    drawDarkShotGlow(ctx, p);
    if (p.kind === "flame") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy || 0, p.vx || 1));
      ctx.globalCompositeOperation = "lighter";
      var fr = Math.max(4.5, p.r || 6);
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
    } else if (p.kind === "lance") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
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
      ctx.restore();
    } else if (p.kind === "honey") {
      ctx.fillStyle = "rgba(232, 192, 64, 0.85)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 230, 140, 0.7)";
      ctx.beginPath();
      ctx.arc(p.x - 2, p.y - 2, p.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
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
    var k = 1 - w.t / (w.max || w.t || 1);
    var col = w.color || "#ff4646";
    ctx.save();
    if (w.kind === "lane") {
      var ang = w.ang || 0;
      var len = w.len || 240;
      var hw = w.w || 18;
      ctx.translate(w.x, w.y);
      ctx.rotate(ang);
      ctx.fillStyle = "rgba(255, 80, 40, " + (0.1 + k * 0.2) + ")";
      if (col.indexOf("#9ad") === 0 || col.indexOf("#c8") === 0) ctx.fillStyle = "rgba(160, 210, 255, " + (0.1 + k * 0.18) + ")";
      if (col.indexOf("#c4a") === 0 || col.indexOf("#e8c") === 0) ctx.fillStyle = "rgba(220, 180, 80, " + (0.12 + k * 0.16) + ")";
      if (col.indexOf("#ffe") === 0) ctx.fillStyle = "rgba(255, 220, 80, " + (0.12 + k * 0.18) + ")";
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
    } else if (w.kind === "spin") {
      var sr = w.r || 70;
      ctx.translate(w.x, w.y);
      ctx.save();
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
      ctx.restore();
      ctx.fillStyle = "rgba(255, 220, 90, " + (0.75 + k * 0.25) + ")";
      ctx.strokeStyle = "rgba(40, 20, 0, 0.85)";
      ctx.lineWidth = 4;
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText("GIRO", 0, 0);
      ctx.fillText("GIRO", 0, 0);
    } else {
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.35 + k * 0.55;
      ctx.fillStyle = "rgba(255,40,40," + 0.12 * k + ")";
      if (w.kind === "tp") ctx.fillStyle = "rgba(200, 160, 255, " + (0.1 + k * 0.16) + ")";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r * Math.max(0.15, k), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
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

  G.drawBossWorld = function (ctx, state) {
    if (!state || !state.enemies) return;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0) continue;
      if (e.type === "chefe_invasao") {
        var pulse = 0.45 + Math.sin((e.phase || 0) * 5) * 0.2;
        ctx.save();
        ctx.strokeStyle = "rgba(120, 255, 140, " + (0.28 + pulse * 0.35) + ")";
        ctx.fillStyle = "rgba(80, 220, 120, 0.08)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 102, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
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
    if (dark < 0.02 && blind <= 0) return;
    var b = G.playfield(state);
    var cover = 0.58 * dark + (blind > 0 ? 0.34 : 0);
    var lights = [];
    var ei;
    for (ei = 0; ei < (state.enemies || []).length; ei++) {
      var e = state.enemies[ei];
      if (e.hp <= 0) continue;
      if (e.type === "chefe_vulto") lights.push({ x: e.x, y: e.y, r: 96 + Math.sin((e.phase || 0) * 6) * 12, glow: "#ff6a18" });
      if (e.type === "fogueira") lights.push({ x: e.x, y: e.y, r: 78 + Math.sin((e.phase || 0) * 8) * 10, glow: "#ff9a2a" });
    }
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
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x0 - 50, b.y0 - 50, b.x1 - b.x0 + 100, b.y1 - b.y0 + 100);
    for (var L = 0; L < lights.length; L++) {
      ctx.moveTo(lights[L].x + lights[L].r, lights[L].y);
      ctx.arc(lights[L].x, lights[L].y, lights[L].r, 0, Math.PI * 2);
    }
    ctx.fillStyle = "rgba(4, 1, 8, " + Math.min(0.93, cover) + ")";
    ctx.fill("evenodd");
    ctx.restore();
    ctx.save();
    for (var g = 0; g < lights.length; g++) {
      var lt = lights[g];
      if (!lt.glow) continue;
      var rad = ctx.createRadialGradient(lt.x, lt.y, 2, lt.x, lt.y, lt.r);
      rad.addColorStop(0, lt.glow === "#9ad8ff" ? "rgba(140, 210, 255, 0.28)" : "rgba(255, 140, 40, 0.32)");
      rad.addColorStop(1, "rgba(255, 80, 20, 0)");
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

  G.drawPortrait = function (canvas, team, key, locked) {
    var ctx = canvas.getContext("2d");
    var w = canvas.width;
    var h = canvas.height;
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
    if (key && G.portraitImgs) {
      G.preloadPortraits();
      var face = G.portraitImgs[key];
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
