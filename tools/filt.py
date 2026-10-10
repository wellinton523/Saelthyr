import json,re
L=json.load(open('lemmas.json'))
surf=set(l.split()[0] for l in open('pt50k.txt'))
EN=set("the you and to of is it in that me my what this for be on are was not no so oh uh ah ai hey ok okay yeah wow hum hmm eh ei ha hã huh ui opa ué bah s t d m n x y k w mr mrs sir baby man yes god love shit fuck go get just all can like your we he she they his her him with do don".split())
NAMES=set("jesus cristo deus maria josé john jack michael paris york londres frank sam ben joe max charlie david peter harry tom tony nick mike paul george james robert chris kate anna sarah emily jim bob bill steve eddie danny lucas mark ryan alex jake matt kevin dean simon victor leo hank larry ray carl billy johnny walter henry jimmy ted roger luke adam mary brasil américa amerika eua china frança inglaterra alemanha méxico rússia japão califórnia texas chicago washington hollywood natal".split())
out=[];drop=[]
for w,c,f in L:
    if w in EN or w in NAMES or len(w)<2 and w not in('e','o','a','é'): drop.append(w);continue
    if w.endswith('r') and w not in surf: drop.append(w);continue
    out.append([w,c,f])
json.dump(out[:5600],open('lem5.json','w'),ensure_ascii=False)
print(len(out)); print('DROP',drop[:200])
open('list.txt','w').write('\n'.join(f"{i+1} {w}" for i,(w,c,f) in enumerate(out[:5300])))
