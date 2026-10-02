# Saelthyr — Dicionário

Dicionário offline da língua construída **Saelthyr** (língua demoníaca de Preirt / lore Zeraph), para RP em Minecraft e referência rápida.

O site é HTML/CSS/JS estático na raiz do repositório: `index.html`, `styles.css`, `data.js` e `app.js`. Não há passo de build.

## Como abrir

### Opção 1 — arquivo local
Abra `index.html` no navegador (duplo clique). Funciona com `file://`.

### Opção 2 — servidor local
No terminal, na raiz deste repositório:

```bash
python3 -m http.server 8080
```

Depois abra: [http://localhost:8080](http://localhost:8080)

### Opção 3 — GitHub Pages
Publique a branch `main` a partir da pasta raiz (`/`). O `index.html` da raiz é a página inicial.

## Arquivos

| Arquivo       | Função                                      |
|---------------|---------------------------------------------|
| `index.html`  | Página principal                            |
| `styles.css`  | Visual ritual (preto / carmesim)            |
| `data.js`     | **Todo** o vocabulário e a gramática        |
| `app.js`      | Busca, filtros e renderização               |

## Como adicionar uma palavra

Edite **somente** `data.js`. Dentro de `SAELTHYR.entries`, acrescente um objeto:

```js
{ saelthyr: "voxra", pt: "eco", category: "natureza", notes: "opcional" },
```

Categorias válidas: `particulas`, `pessoas`, `verbos`, `tempo_lugar`, `natureza`, `emocoes`, `cosmologia`, `racas`, `animais`, `flora`, `criaturas_preirt`, `frases`.

Para uma frase:

```js
{ saelthyr: "Zer halyth hir.", pt: "Eu espero aqui.", category: "frases" },
```

Salve o arquivo e recarregue a página no navegador. Pronto.

## Dicas de RP

- Ordem: sujeito → verbo → objeto
- Negação: prefixo `kel-` no verbo
- Possessivo: `va` entre dono e coisa (`raith va ryn`)
- Plural: `-im`
- Perguntas: `kae` no final
- **Nunca** diga `naryth` em público
