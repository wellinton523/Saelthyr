import simplemma, re, json, collections, spacy
nlp=spacy.load('pt_core_news_sm')
OV={'uma':'um','umas':'um','uns':'um','pela':'por','pelo':'por','pelas':'por','pelos':'por','dela':'ele','dele':'ele','delas':'ele','deles':'ele',
'sua':'seu','suas':'seu','obrigado':'obrigado','obrigada':'obrigado','dessa':'esse','desse':'esse','disso':'isso','nisso':'isso','nesse':'esse','nessa':'esse',
'neste':'este','nesta':'este','deste':'este','desta':'este','disto':'isto','nisto':'isto','daquele':'aquele','naquele':'aquele','daquela':'aquele','naquela':'aquele','daquilo':'aquilo','naquilo':'aquilo',
'do':'de','da':'de','dos':'de','das':'de','no':'em','na':'em','nos':'nós','nas':'em','num':'em','numa':'em','ao':'a','aos':'a','à':'a','às':'a','pra':'para','pro':'para','pras':'para','pros':'para',
'cara':'cara','caras':'cara','música':'música','músicas':'música','idéia':'ideia','idéias':'ideia','amo':'amar','comigo':'eu','contigo':'você','conosco':'nós','mim':'eu','me':'eu','te':'você','lhe':'ele','lhes':'ele',
'garota':'garota','garotas':'garota','filha':'filha','filhas':'filha','esposa':'esposa','papai':'pai','papa':'papa','mamãe':'mãe','nossos':'nosso','nossas':'nosso','nossa':'nosso','minha':'meu','minhas':'meu','meus':'meu',
'quer':'querer','preciso':'precisar','feito':'fazer','morto':'morto','vivo':'vivo','pais':'pai','gente':'gente','ótimo':'ótimo','desculpa':'desculpar','certeza':'certeza','volta':'volta','primeira':'primeiro','seus':'seu','teu':'teu','tua':'teu',
'dela':'ele','nela':'ele','nele':'ele','vamos':'ir','vá':'ir','espera':'esperar','olha':'olhar','cala':'calar','vem':'vir','vai':'ir','sério':'sério','senhora':'senhora','senhorita':'senhorita','menina':'menina','amiga':'amigo','irmã':'irmã','tia':'tia','avó':'avó','rainha':'rainha','princesa':'princesa',
'pena':'pena','festa':'festa','conta':'conta','ajuda':'ajuda','merda':'merda','droga':'droga','licença':'licença','idiota':'idiota','vida':'vida','seguro':'seguro','legal':'legal','juntos':'junto','tarde':'tarde','sala':'sala','loja':'loja','luta':'luta','escolha':'escolha','fala':'fala','venda':'venda','compra':'compra','prova':'prova','guarda':'guarda','marca':'marca','ordem':'ordem','troca':'troca','busca':'busca','pergunta':'pergunta','resposta':'resposta','dúvida':'dúvida','visita':'visita','chegada':'chegada','saída':'saída','entrada':'entrada','partida':'partida','corrida':'corrida','caça':'caça','pesca':'pesca','dança':'dança','espada':'espada','bruxa':'bruxa','cera':'cera','ama':'amar','achas':'achar','pensas':'pensar'}
freq=collections.Counter(); forms=collections.defaultdict(list)
ok=re.compile(r"^[a-záàâãéêíóôõúüç]+$")
lines=[l.split() for l in open('pt50k.txt')][:40000]
for w,c in lines:
    c=int(c)
    if not ok.match(w): continue
    if w in OV: lem=OV[w]
    else:
        if not simplemma.is_known(w,lang='pt'): continue
        lem=simplemma.lemmatize(w,lang='pt').lower()
        base=w[:-1] if w.endswith('as') else w
        if lem.endswith('ar') and base.endswith('a') and lem==base[:-1]+'ar':
            if nlp(w)[0].pos_ in('NOUN','ADJ','PROPN'): lem=base
    if not ok.match(lem): continue
    freq[lem]+=c; forms[lem].append(w)
items=sorted(freq.items(),key=lambda x:-x[1])
json.dump([[w,c,forms[w][:5]] for w,c in items[:9000]],open('lemmas.json','w'),ensure_ascii=False)
print(len(items)); print(' '.join(w for w,_ in items[:600]))
