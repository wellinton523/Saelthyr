# Saelthyr — Dicionário

Dicionário offline da língua construída **Saelthyr** (língua demoníaca de Preirt / lore Zeraph), para RP em Minecraft e referência rápida.

## Como abrir

### Opção 1 — arquivo local
Abra o arquivo no navegador:

```
/workspace/saelthyr-dictionary/index.html
```

Ou dê um duplo clique em `index.html`. Funciona com `file://`.

### Opção 2 — servidor local
No terminal, dentro desta pasta:

```bash
cd /workspace/saelthyr-dictionary
python3 -m http.server 8080
```

Depois abra: [http://localhost:8080](http://localhost:8080)

## Arquivos

| Arquivo       | Função                                      |
|---------------|---------------------------------------------|
| `index.html`  | Página principal                            |
| `styles.css`  | Visual ritual (preto / carmesim)            |
| `data.js`     | **Todo** o vocabulário e a gramática        |
| `app.js`      | Busca, filtros, paginação e renderização    |
| `lexicon.js`  | Léxico gerado (~4.200 entradas das 5.000 palavras mais frequentes do português) |
| `lexicon-5000.json` | Lista completa: rank, pt, saelthyr, categoria, status (existente / novo / composto / sem tradução) |
| `lexicon-sample.md` | 40 frases de exemplo com o léxico novo |
| `user-words.js` | Acrescentar palavras no navegador e publicar no GitHub |
| `words-user.json` | Palavras publicadas por quem usa o site (lista, pode começar vazia) |

## Como adicionar uma palavra

### Pelo site

No **Tradutor**, uma palavra que o léxico não conhece fica com sublinhado pontilhado dourado e a glosa «não está no léxico». Toque nela (ou em «Adicionar ao léxico»).

O formulário pede:

- **Português** — já vem preenchido se você traduzia do português. No sentido Saelthyr → português, o campo preenchido é o Saelthyr.
- **Saelthyr** — com a escrita Cruorthyr ao vivo.
- **Classe** — as categorias que já existem no dicionário.
- **Nota ou exemplo** — opcional.

Antes de gravar, o site confere a palavra com o núcleo (`data.js`), o léxico (`lexicon.js`), o `words-user.json` e as palavras deste navegador. A comparação ignora maiúsculas e acentos, e trata plural (`-im` em Saelthyr, `-s` em português) como a mesma palavra.

- Se a **grafia Saelthyr já existe**, não salva, e mostra o sentido que ela já tem.
- Se o **português já tem tradução**, ou se a grafia **soa parecida** (uma letra de diferença, ou a mesma palavra trocando y/i e ae/e), avisa e deixa **Salvar mesmo assim** ou **Cancelar**.

A palavra fica na hora no `localStorage` deste navegador: entra no Tradutor (a frase é retraduzida), na busca do Dicionário com o selo «adicionada por você» (dá para editar e apagar) e nas consultas da Iniciação.

Na mesma barra há **Exportar JSON** e **Importar JSON**, para copiar as suas palavras sem token.

### Publicar para todo mundo

**Publicar no GitHub** (numa palavra) ou **Publicar todas** grava num arquivo novo, `words-user.json`, no ramo `main` do repositório `wellinton523/Saelthyr`. O `data.js` não é reescrito. A mensagem do commit é `Adicionar palavra: <português> = <saelthyr>`.

O site lê `words-user.json` ao abrir e mistura com o resto do léxico. Se o arquivo ainda não existir, ou se a página for aberta por `file://`, segue sem ele.

Na hora de publicar, a mesma conferência roda de novo contra o `words-user.json` que está no GitHub naquele momento. Se alguém gravou no meio, o site relê o arquivo e tenta uma segunda vez.

O GitHub Pages leva cerca de um minuto para mostrar a palavra a outras pessoas. Até lá ela continua neste navegador.

#### Token de acesso pessoal (fine-grained)

O token fica **somente** no `localStorage` deste navegador. Há o botão **Esquecer token**. Ele não vai para o repositório.

1. No GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Dono do recurso: a conta dona de `wellinton523/Saelthyr`.
3. **Only select repositories**: só o repositório **Saelthyr**.
4. Permissão de repositório: **Contents** = **Read and write** (leitura e escrita). O resto pode ficar em nenhum acesso.
5. Gere o token, copie (ele começa com `github_pat_`).
6. No site: **Token do GitHub**, cole, **Guardar token**.

Sem token, ou com token inválido, a publicação não segue e o aviso explica o motivo (token ausente ou inválido, conflito, falha de rede).

### Editando o arquivo à mão

Edite **somente** `data.js` para o núcleo estável. Dentro de `SAELTHYR.entries`, acrescente um objeto:

```js
{ saelthyr: "voxra", pt: "eco", category: "natureza", notes: "opcional" },
```

Categorias válidas: `particulas`, `substantivos`, `adjetivos`, `adverbios`, `corpo`, `tecnologia`, `calendario`, `pessoas`, `verbos`, `tempo_lugar`, `natureza`, `emocoes`, `cosmologia`, `racas`, `animais`, `flora`, `criaturas_preirt`, `frases`.

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

## Léxico das 5.000 palavras

Gerado a partir da lista de frequência pt_br 50k de hermitdave/FrequencyWords (OpenSubtitles 2018), lematizada com simplemma. Palavras de coisas que não existem em Preirt ficam sem tradução (usa-se a palavra portuguesa). O núcleo continua em `data.js`; o léxico novo está em `lexicon.js`, carregado depois dele.

## Tradutor e Iniciação

- **Tradutor** (`translator.js`): PT ⇄ Saelthyr aproximado, palavra por palavra, usando `data.js`, `lexicon.js` e `words-user.json`, mais as palavras deste navegador. Aplica as regras fáceis (pronomes, `kel-`, `velth`/`nelth`, `X va Y`, plural `-im`, `kae`, sem artigos). Mostra palavra, Cruorthyr e glosa; palavras fora do léxico ficam sublinhadas e podem ser acrescentadas.
- **Iniciação** (`lessons.js` + `learn.js`): caminho de selos em 7 unidades. Véu, Ressonância e Vigília ficam no `localStorage` do navegador, sem conta. Uma resposta também vale se for uma palavra sua com o mesmo sentido.
- Para acrescentar lições, edite `lessons.js`. As palavras precisam existir no `data.js`, no `lexicon.js` ou nas palavras publicadas / deste navegador.

## Testes

Com o Chrome instalado, na pasta do repositório:

```bash
node tests/run-e2e.mjs
```

O script sobe a página, acrescenta uma palavra pelo formulário, confere Tradutor, Dicionário e recarga, e simula a API do GitHub na publicação.
