import json,collections,re
rows=json.load(open('rows.json'))
out=[]
for r in rows:
    o={'rank':r['rank'],'pt':r['pt'],'saelthyr':r['saelthyr'],'category':r['category'],'status':r['status']}
    if r.get('notes'): o['notes']=r['notes']
    if r['status']=='sem tradução': o['reason']=r['reason']; o['notes']='usa-se a palavra portuguesa'
    out.append(o)
json.dump(out,open('/workspace/saelthyr-dictionary/lexicon-5000.json','w'),ensure_ascii=False,indent=1)
grp=collections.OrderedDict()
for r in rows:
    if r['status'] not in('novo','composto'): continue
    g=grp.setdefault(r['saelthyr'],{'saelthyr':r['saelthyr'],'pt':[],'category':r['category'],'notes':r.get('notes'),'rank':r['rank']})
    g['pt'].append(r['pt'])
    if r.get('_newadj'):
        a,f=r['_newadj']; grp.setdefault(f,{'saelthyr':f,'pt':[a],'category':'adjetivos','notes':None,'rank':r['rank']})
ents=[]
for g in sorted(grp.values(),key=lambda g:g['rank']):
    e={'saelthyr':g['saelthyr'],'pt':' / '.join(g['pt']),'category':g['category']}
    if g['notes']: e['notes']=g['notes']
    ents.append(e)
cats=[{'id':'substantivos','label':'Substantivos'},{'id':'adjetivos','label':'Adjetivos'},{'id':'adverbios','label':'Advérbios'},{'id':'corpo','label':'Corpo'}]
js='/* Saelthyr — léxico das ~5.000 palavras mais frequentes do português (gerado; ver lexicon-5000.json) */\n(function(){\n  "use strict";\n  if (typeof SAELTHYR === "undefined") return;\n  var NEW_CATS = '+json.dumps(cats,ensure_ascii=False)+';\n  var fi = SAELTHYR.categories.findIndex(function(c){return c.id==="frases";});\n  NEW_CATS.forEach(function(c){ if(!SAELTHYR.categories.some(function(x){return x.id===c.id;})) SAELTHYR.categories.splice(fi<0?SAELTHYR.categories.length:fi++,0,c); });\n  var LEX = [\n'+',\n'.join('    '+json.dumps(e,ensure_ascii=False) for e in ents)+'\n  ];\n  Array.prototype.push.apply(SAELTHYR.entries, LEX);\n})();\n'
open('/workspace/saelthyr-dictionary/lexicon.js','w').write(js)
print(len(ents), collections.Counter(r['status'] for r in rows), collections.Counter(e['category'] for e in ents))
