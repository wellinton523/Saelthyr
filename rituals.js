/* Saelthyr — Rituais & Encantamentos (textos fixos; não "corrigir" a redação) */
const SAELTHYR_RITUALS = [
  { id: "encantamentos-curtos", title: "Encantamentos curtos", category: "Encantamentos",
    lines: [
      { sael: "Fyr, vaereth!", pt: "Fogo, começa! — acende uma chama ou solta uma bola de fogo." },
      { sael: "Nythel, korveth!", pt: "Noite, prende! — faz sombras prenderem o alvo." },
      { sael: "Cruorath va zer, thumeth.", pt: "Meu sangue, pulsa. — magia de sangue pra se fortalecer." },
      { sael: "Sael, maereth.", pt: "Alma, volta. — cura ou traz a alma de volta ao corpo." },
      { sael: "Hushyr.", pt: "Silêncio. — cala ou anula a magia do inimigo." },
      { sael: "Zer gueth sael.", pt: "Eu guio a alma. — a assinatura do Zeraph, pra guiar ou puxar almas." },
      { sael: "Skeldra, skethyr!", pt: "Espada, corta! — um golpe de lâmina de mana." },
      { sael: "Sevath, draeleth.", pt: "Pacto, se estabelece. — sela um pacto na hora." }
    ],
    notes: ["Regra: sempre um substantivo da força mais um verbo de comando."] },

  { id: "sevath-va-cruorath", title: "Sevath va Cruorath", subtitle: "Pacto de Sangue", category: "Pactos",
    lines: [
      { step: "1. Abertura — o demônio desenha a linha central no chão com sangue e diz:", sael: "Preirt essyr hushyr.", pt: "Preirt está em silêncio." },
      { step: "2. Chamado — quem pede o pacto se ajoelha:", sael: "Zer gueth sael va zer yn raith va ryn.", pt: "Eu guio minha alma para o teu caminho." },
      { step: "3. Oferta — uma gota de sangue cai na linha:", sael: "Cruorath va zer essyr sevath.", pt: "Meu sangue é o pacto." },
      { step: "4. Resposta do demônio:", sael: "Zer naereth sael va ryn. Sevath nelth essyr vyrel.", pt: "Eu conheço tua alma. O pacto vai viver." },
      { step: "5. Selo — os dois falam juntos:", sael: "Kel-dyreth sevath. Naeth.", pt: "Não se fala do pacto. Nunca." },
      { step: "6. Fechamento:", sael: "Faren va hushyr.", pt: "" }
    ],
    notes: ["No passo 2 usa-se yn (em) no lugar de “para”."] },

  { id: "cantico-do-sevath", title: "Cântico do Sevath", category: "Cânticos",
    lines: [
      { step: "Refrão (todos):", sael: "Sael, sael, zer gueth sael.", pt: "Alma, alma, eu guio a alma." },
      { sael: "Cruorath, sevath, vyrel.", pt: "Sangue, pacto, vida." },
      { step: "Verso 1 (quem invoca):", sael: "Preirt essyr hushyr,", pt: "Preirt está em silêncio," },
      { sael: "nythel essyr hushyr,", pt: "a noite está em silêncio," },
      { sael: "zer dyreth yn hushyr.", pt: "eu falo no silêncio." },
      { step: "Refrão", sael: "Sael, sael, zer gueth sael. Cruorath, sevath, vyrel.", pt: "Alma, alma, eu guio a alma. Sangue, pacto, vida." },
      { step: "Verso 2:", sael: "Cruorath va zer, fyr va ryn,", pt: "Meu sangue, teu fogo," },
      { sael: "sevath nelth essyr naeth faren.", pt: "o pacto nunca vai ser adeus." },
      { step: "Refrão", sael: "Sael, sael, zer gueth sael. Cruorath, sevath, vyrel.", pt: "Alma, alma, eu guio a alma. Sangue, pacto, vida." },
      { step: "Verso 3 (o demônio responde):", sael: "Zer naereth sael va ryn,", pt: "Eu conheço tua alma," },
      { sael: "sael va ryn essyr va zer.", pt: "tua alma é minha." },
      { step: "Fechamento (sussurrado):", sael: "Sevath... sevath... hushyr.", pt: "Pacto... pacto... silêncio." }
    ],
    notes: ["Entoar em ritmo lento, arrastando a última sílaba de cada linha (sae-el, hu-shyr)."] },

  { id: "rito-pacto-sangue", title: "Pacto de sangue", category: "Ritos longos",
    lines: [
      { sael: "Cruorath va zer, cruorath va ryn,", pt: "Meu sangue, teu sangue," },
      { sael: "kresketh yn sevath, yrael kel-skethyr.", pt: "se unem no pacto, para sempre sem se cortar." },
      { sael: "Zer delyth, ryn grysyth; ryn delyth, zer grysyth.", pt: "Eu dou, tu recebes; tu dás, eu recebo." },
      { sael: "Sevath draeleth. Preirt essyr hushyr.", pt: "O pacto se estabelece. Preirt está em silêncio." }
    ] },

  { id: "rito-familiar", title: "Familiar", subtitle: "Ligar uma criatura à alma do mago", category: "Ritos longos",
    lines: [
      { sael: "Zer orneth ryn, kylor va sael va zer.", pt: "Eu te chamo, companheiro da minha alma." },
      { sael: "Hyrel va ryn essyr yn kyrn va zer.", pt: "Teu nome está na minha mão." },
      { sael: "Zer vyth qyr ryn vyth; zer dyreth qyr ryn dyreth.", pt: "Eu vejo o que tu vês; eu falo o que tu falas." },
      { sael: "Sael kresketh sael. Yrael.", pt: "Alma se une a alma. Para sempre." }
    ],
    notes: ["Usa kylor va sael (“companheiro da alma”), porque fynyr é o adjetivo “familiar”, não a criatura."] },

  { id: "rito-protecao", title: "Proteção", subtitle: "Escudo sobre uma casa ou pessoa", category: "Ritos longos",
    lines: [
      { sael: "Scythel va aellyr, essyr soveth draeth va zerim.", pt: "Escudo de luz, fica sobre a nossa casa." },
      { sael: "Neth kel-naereth raith; nythel kel-naereth porveth.", pt: "A morte não conhece o caminho; a noite não conhece a porta." },
      { sael: "Zer raneth, zer sereth, zer kel-dwaeth hushyr.", pt: "Eu guardo, eu protejo, eu não fico em silêncio." },
      { sael: "Shyrnryn draeleth.", pt: "A proteção se estabelece." }
    ] },

  { id: "rito-adocao", title: "Adoção", subtitle: "Receber uma criança na família", category: "Ritos longos",
    lines: [
      { sael: "Kael, ryn kel-nyreth yn draeth va zer,", pt: "Criança, tu não nasceste na minha casa," },
      { sael: "qed sy, sael va ryn nyreth yn thumel va zer.", pt: "mas mesmo assim tua alma nasceu no meu coração." },
      { sael: "Zer dresketh ryn. Hyrel thaenyr va ryn essyr va draethryn va zer.", pt: "Eu te adoto. Teu novo nome é da minha família." },
      { sael: "Ryn essyr syrel va zer. Yrael.", pt: "Tu és meu filho. Para sempre." }
    ],
    notes: ["Troque syrel por saelyra se for uma menina."] },

  { id: "protecao-demonio", title: "Proteção do demônio", subtitle: "O demônio jura guardar alguém", category: "Ritos do demônio",
    lines: [
      { sael: "Ryn, zer naereth sael va ryn.", pt: "Tu, eu conheço tua alma." },
      { sael: "Zer essyr scythel va ryn, zer essyr nythel soveth ryn.", pt: "Eu sou teu escudo, eu sou a noite sobre ti." },
      { sael: "Neth kel-vyth ryn; skeldra kel-skethyr ryn.", pt: "A morte não te vê; a espada não te corta." },
      { sael: "Qel ryn orneth hyrel va zer, zer nelth essyr yn kyrn va ryn.", pt: "Quando tu chamares meu nome, eu vou estar na tua mão." },
      { sael: "Cruorath va zer sereth cruorath va ryn.", pt: "Meu sangue protege teu sangue." },
      { sael: "Zer raneth ryn. Yrael.", pt: "Eu te guardo. Para sempre." },
      { step: "Resposta da pessoa (aceita a proteção):", sael: "Zer orneth hyrel va ryn.", pt: "Eu chamo o teu nome." }
    ] },

  { id: "protecao-absoluta", title: "Proteção absoluta", category: "Ritos absolutos",
    lines: [
      { sael: "Zer, Zeraph Erebonys, orneth hyrel va ryn: [hyrel].", pt: "Eu, Zeraph Erebonys, chamo o teu nome: [nome]." },
      { sael: "Zer essyr scythel va ryn, zer essyr nythel soveth ryn.", pt: "Eu sou teu escudo, eu sou a noite sobre ti." },
      { sael: "Neth kel-vyth ryn, skeldra kel-skethyr ryn, fyr kel-naereth kydryn va ryn.", pt: "A morte não te vê, a espada não te corta, o fogo não conhece teu corpo." },
      { sael: "Qel ryn orneth \"Zeraph Erebonys\", zer nelth essyr yn kyrn va ryn.", pt: "Quando chamares “Zeraph Erebonys”, vou estar na tua mão." },
      { sael: "Qed sy orvyn kel-essyr, zer nelth raneth ryn.", pt: "Mesmo se o mundo deixar de existir, vou te guardar." },
      { sael: "Hyrel va zer essyr sevath. Yrael. Naeth faren.", pt: "Meu nome é o pacto. Para sempre. Nunca adeus." }
    ],
    notes: ["Onde aparece [hyrel], entra o nome da pessoa."] },

  { id: "pacto-sangue-absoluto", title: "Pacto de sangue absoluto", category: "Ritos absolutos",
    lines: [
      { sael: "Zer, Zeraph Erebonys, delyth cruorath va zer.", pt: "Eu, Zeraph Erebonys, dou o meu sangue." },
      { sael: "Ryn, [hyrel], delyth cruorath va ryn.", pt: "Tu, [nome], dás o teu sangue." },
      { sael: "Cruorath kresketh cruorath, sael kresketh sael, hyrel kresketh hyrel.", pt: "Sangue se une a sangue, alma a alma, nome a nome." },
      { sael: "Qel ryn neth, zer gueth sael va ryn; qel zer skethyr, ryn thumeth.", pt: "Quando morreres, eu guio tua alma; quando eu for cortado, tu pulsas." },
      { sael: "Sevath kel-skethyr, kel-maereth, kel-naeth.", pt: "O pacto não se corta, não volta atrás, não acaba." },
      { sael: "Zeraph Erebonys va [hyrel]. [hyrel] va Zeraph Erebonys. Yrael.", pt: "Zeraph Erebonys de [nome]. [Nome] de Zeraph Erebonys. Para sempre." }
    ],
    notes: ["kel-naeth (não acaba) junta a negação com “nunca” pra dar força poética; ao pé da letra seria “não nunca”. Versão mais limpa: yrael essyr (é para sempre)."] },

  { id: "adocao-absoluta", title: "Adoção absoluta", category: "Ritos absolutos",
    lines: [
      { sael: "Kael, [hyrel], ryn kel-nyreth yn draeth va zer,", pt: "Criança, [nome], tu não nasceste na minha casa," },
      { sael: "qed sy, sael va ryn nyreth yn thumel va zer.", pt: "mas mesmo assim tua alma nasceu no meu coração." },
      { sael: "Zer, Zeraph Erebonys, dresketh ryn yn cruorath, yn sael, yn hyrel.", pt: "Eu, Zeraph Erebonys, te adoto pelo sangue, pela alma e pelo nome." },
      { sael: "Hyrel va ryn nelth essyr [hyrel] Erebonys.", pt: "Teu nome vai ser [nome] Erebonys." },
      { sael: "Draethryn va zer essyr draethryn va ryn. Neth kel-skethyr zerim.", pt: "Minha família é tua família. A morte não nos separa." },
      { sael: "Ryn essyr syrel va zer. Yrael.", pt: "Tu és meu filho. Para sempre." }
    ],
    notes: ["A criança ganha o sobrenome Erebonys — é isso que torna o rito absoluto.", "Troque syrel por saelyra se for uma filha."] }
];
