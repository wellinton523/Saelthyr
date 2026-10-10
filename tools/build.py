import json,re,hashlib,random,subprocess,sys,collections,unicodedata
sys.path.insert(0,'.')
from curated import C,ARTICLES
from sets import MODERN,NATIONAL,VULGAR,JUNK
import spacy
nlp=spacy.load('pt_core_news_sm')
C['também']=('ensel','particulas','')
for k in ('mil','cem'): C.pop(k,None)
# --- existing data.js
ex=json.loads(subprocess.check_output(['node','-e','''eval(require("fs").readFileSync("/workspace/saelthyr-dictionary/data.js","utf8").replace("const SAELTHYR","global.S"));console.log(JSON.stringify(S.entries))''']))
EXF={e['saelthyr'].lower() for e in ex}
gloss={}
for e in ex:
    if e['category']=='frases': continue
    for g in re.split(r'\s*/\s*',re.sub(r'\(.*?\)','',e['pt'])):
        g=g.strip().lower()
        if g and g not in gloss: gloss[g]=e
NUM={'0':'zero','1':None,'2':'dois','3':'três','4':'quatro','5':'cinco','6':'seis','7':'sete','8':'oito','9':'nove'}
for k,v in NUM.items():
    if v and k in gloss: gloss[v]=gloss[k]
gloss.pop('passar',None)
L=json.load(open('lem5.json'))
lem=[];SEEN=set()
for w,c,f in L:
    if w in JUNK: continue
    if w.endswith('a') and w[:-1]+'o' in SEEN and w not in ('garota','menina','filha','senhora','irmã','esposa','bruxa','rainha','princesa','tia','avó','prima','amiga'): continue
    SEEN.add(w)
    lem.append((w,f))
    if len(lem)>=5000: break
words=[w for w,_ in lem]; forms=dict(lem)
WS=set(words)
# --- POS
def is_verb(w):
    if not re.search(r'(ar|er|ir|ôr|or)$',w): return False
    if w in ('pôr',): return True
    if re.search(r'(dor|tor|sor|or)$',w) and w not in('pôr','compor','propor','dispor','supor','impor','expor','depor','opor'): return False
    return any(x!=w and x!=w+'es' and x!=w+'s' for x in forms[w]) or w.endswith(('ar','er','ir'))
NOT_VERB=set("lugar mar bar ar par amor senhor favor melhor pior maior menor mulher colher prazer poder? dever? jantar almoço olhar? interior exterior superior inferior anterior posterior militar familiar particular popular regular singular escolar similar mártir elixir lar altar açúcar caráter éter hangar radar polegar celular".replace('?','').split())
def pos(w):
    if w in C: return None
    if w.endswith('mente') and len(w)>7: return 'adv'
    if w in NOT_VERB: pass
    elif is_verb(w): return 'v'
    if w in ADJW: return 'adj'
    if w in NOUNW: return 'n'
    if re.search(r'(oso|vel|ico|ivo|esco|ário|ante|ente|ado|ido)$',w): return 'adj'
    if w.endswith('o') and w[:-1]+'a' in PTSURF and w[:-1]+'as' in PTSURF and w[:-1]+'os' in PTSURF: return 'adj'
    return 'n'
ADJW=set('verde azul feliz doce forte triste alegre leve breve simples livre jovem pobre comum ruim fácil difícil útil inútil cruel fiel enorme firme nobre quente frio real normal igual especial natural total final legal mortal fatal principal geral central local social leal letal brutal ideal formal fiel genial gentil hábil frágil sutil vil infeliz capaz veloz feroz atroz audaz sagaz precoce suave grave doente grande importante diferente inteligente presente urgente estranho falso cego surdo mudo vazio cheio limpo sujo seco molhado escuro claro preto branco vermelho amarelo roxo cinza marrom gordo magro alto baixo largo estreito longo curto velho novo bonito feio rico caro barato duro mole quieto bravo louco maluco bobo tolo burro esperto sábio sério justo injusto puro raro'.split())
NOUNW=set('soldado passado mercado estado lado resultado cuidado chamado pecado prado reinado conde machado dado bocado legado ente parente dente gente mente pente serpente semente continente presidente cliente agente tenente sargento animal sinal jornal metal hospital capital local final canal rival cristal general festival tribunal arsenal ritual ideal casal pedal mal moral total'.split())-ADJW|{'local','final','capital','ideal','total','moral','general'} if False else set('soldado passado mercado estado lado resultado cuidado chamado pecado prado reinado machado dado bocado legado parente dente gente mente pente serpente semente continente presidente cliente agente tenente sargento animal sinal jornal metal hospital canal rival cristal general festival tribunal arsenal ritual casal pedal'.split())
# --- generator
ON=['k','th','s','v','r','n','m','l','d','g','h','dr','kr','thr','sk','sh','z','br','gr','vr','t','f','y','kh'][:-1]
VO=['a','ae','e','y','o','y','ae','a']
CO=['r','l','n','th','s','k','rn','rth','m','sk','lth','v','d']
BAD=re.compile(r'(cu|fuk|fuc|puta|merd|pint|bost|cac|shit|fag|nig|porn|sex|ass|cum|dick|cock|tit|pau|rola|xot|bund|cona|pica|anus|rape|kill|die$|god|piss|slut|whor|nazi|gay|kkk|^sod|teta|mama|papa|caga|mija)')
used=set(EXF)
for v in C.values(): used.add(v[0].lower())
def rng(w,salt): return random.Random(int(hashlib.md5((w+salt).encode()).hexdigest(),16))
def syl(r,coda=True):
    s=r.choice(ON)+r.choice(VO)
    if coda: s+=r.choice(CO)
    return s
def ok(f):
    if f in used or BAD.search(f): return False
    if re.search(r'(.)\1\1|yy|aeae|eae|aea|ee|oo|hh|thth|[aeiouy]{3}',f.replace('ae','A')) : return False
    if re.search(r'(.)\1\1',f) or 'yy' in f or 'aeae' in f: return False
    if re.search(r'[^a-z]',f): return False
    # avoid PT/EN real words? check against pt list and simple English
    if f in WS or f in PTSURF: return False
    return 3<=len(f)<=MAXL[0]
PTSURF=set(l.split()[0] for l in open('pt50k.txt'))
MAXL=[11]
def gen(w,kind,rank,root=None):
    for i in range(400):
        MAXL[0]=(7 if rank<1000 else 9 if rank<3000 else 10)+(i//100)
        r=rng(w,str(i)); long_=rank>1800 or i>60
        if root is None:
            base=syl(r) if not long_ or r.random()<.4 else syl(r,False)+syl(r)
            if base[-1] in 'aeyo': base+=r.choice(['r','l','n','th'])
        else: base=root
        if kind=='v': f=base+r.choice(['eth','eth','eth','yth'])
        elif kind=='adj': f=base+r.choice(['ath','ath','ys','aen','yth'])
        elif kind=='agent': f=base+r.choice(['or','yr'])
        elif kind=='act': f=base+r.choice(['el','en','ael'])
        else: f=base+r.choice(['yr','ael','el','ryn','en','yn','oth','ar'])
        f=f.replace('htheth','theth')
        if ok(f): used.add(f); return f
        if root is not None and i>3: root=None
    raise Exception(w)
# root of a verb form: strip -eth/-yth/-ath/-th
def vroot(f): return re.sub(r'(eth|yth|ath|th)$','',f) or f
# --- process
rows=[]; vforms={}
order=sorted(range(len(words)),key=lambda i:(0 if words[i] in C else 1, 2 if words[i].endswith('mente') and len(words[i])>7 else (0 if is_verb(words[i]) else 1), i))
res={}
def deriv_verb(w):
    stems=[]
    for suf,rep in [('ação',['ar']),('ição',['ir','er']),('são',['der','dir','ter']),('amento',['ar']),('imento',['er','ir']),('ada',['ar']),('ida',['er','ir']),('ador',['ar']),('edor',['er']),('idor',['ir']),('adora',['ar']),('edora',['er']),('ado',['ar']),('ido',['er','ir']),('ura',['ar']),('ância',['ar']),('ência',['er','ir']),('vel',['ar','er','ir']),('o',['ar']),('a',['ar']),('e',['ar','er','ir'])]:
        if w.endswith(suf):
            st=w[:-len(suf)]
            if suf=='vel' and st.endswith(('á','í','ê')): st=st[:-1]
            for rp in rep:
                v=st+rp
                if v in res and res[v][2]=='v': return v,suf
    return None,None
def strip(x): return ''.join(c for c in unicodedata.normalize('NFD',x) if unicodedata.category(c)!='Mn')
NA={strip(w):w for w in words}
NODERIV=set('acordo conta caso jantar parte volta ponto passe lance porto torno face tira prato copa caça falta pena compra corte'.split())
status_ct=collections.Counter()
for i in order:
    w=words[i]; rank=i+1
    rec={'rank':rank,'pt':w}
    if w in ARTICLES:
        rec.update(saelthyr=None,category='particulas',status='sem tradução',reason='não existe artigo')
    elif w in VULGAR:
        rec.update(saelthyr=None,category='substantivos',status='sem tradução',reason='vulgarismo/gíria sexual — fica fora do dicionário')
    elif w in NATIONAL:
        rec.update(saelthyr=None,category='substantivos',status='sem tradução',reason='não existe em Preirt (nacionalidade/religião do mundo real)')
    elif w in MODERN and w not in gloss:
        rec.update(saelthyr=None,category='tecnologia',status='sem tradução',reason='não existe em Preirt')
    elif w in C:
        f,cat,note=C[w]
        st='existente' if f.lower() in EXF else ('composto' if ' ' in f or note.startswith('composto') else 'novo')
        if st=='novo' and note.startswith('de '): st='novo'
        rec.update(saelthyr=f,category=cat,status=st)
        if note: rec['notes']=note
        res[w]=(f,cat,'v' if cat=='verbos' else 'x')
    elif w in gloss:
        e=gloss[w]; rec.update(saelthyr=e['saelthyr'],category=e['category'],status='existente'); res[w]=(e['saelthyr'],e['category'],'v' if e['category']=='verbos' else 'x')
    else:
        p=pos(w)
        if p=='v':
            f=gen(w,'v',rank); rec.update(saelthyr=f,category='verbos',status='novo'); res[w]=(f,'verbos','v')
        elif p=='adv':
            a=w[:-5]; a2=a[:-1]+'o' if a.endswith('a') else a
            a2=NA.get(strip(a2),a2); a=NA.get(strip(a),a)
            base=res.get(a2) or res.get(a)
            if base:
                rec.update(saelthyr='yn faeth '+base[0],category='adverbios',status='composto',notes=f'composto: yn faeth (em modo) + {base[0]} ({a2})')
            else:
                f=gen(a2,'adj',rank); res[a2]=(f,'adjetivos','x')
                rec.update(saelthyr='yn faeth '+f,category='adverbios',status='composto',notes=f'composto: yn faeth (em modo) + {f} (adjetivo novo "{a2}")')
                rec['_newadj']=(a2,f)
            res[w]=(rec['saelthyr'],'adverbios','x')
        else:
            v,suf=deriv_verb(w) if w not in NODERIV else (None,None); cat='adjetivos' if p=='adj' else 'substantivos'
            if v:
                vf=res[v][0]; root=vroot(vf.split()[0]) if ' ' not in vf else None
                kind='adj' if p=='adj' or suf in('ado','ido','vel') else ('agent' if 'dor' in suf else 'act')
                if kind=='agent': cat='pessoas'
                f=gen(w,kind,rank,root) if root else gen(w,kind if kind!='act' else 'n',rank)
                existing_root=vf.lower() in EXF
                rec.update(saelthyr=f,category=cat,status='composto' if existing_root and f.startswith(root or '#') else 'novo')
                if f.startswith(root or '#'): rec['notes']=f'de {vf} ({v})' + (' — raiz existente + sufixo' if existing_root else '')
            else:
                f=gen(w,'adj' if p=='adj' else 'n',rank); rec.update(saelthyr=f,category=cat,status='novo')
            res[w]=(rec['saelthyr'],cat,'x')
    rows.append(rec)
rows.sort(key=lambda r:r['rank'])
json.dump(rows,open('rows.json','w'),ensure_ascii=False,indent=0)
print(collections.Counter(r['status'] for r in rows))
