# Grupo As Vilas · Apresentação interativa

Demonstração comercial de um **convite digital interativo** com **confirmação de presença nominal** e **painel para a equipe**, preparada pela Hugarasu Labs para conversa com a gestão do Grupo As Vilas.

É uma demonstração: não há servidor, banco de dados, login nem envio de dados. Cada visitante testa de forma isolada; as respostas ficam só na memória da aba aberta e somem ao recarregar a página.

Endereço de publicação: <https://hugarasulabs.github.io/as-vilas-apresentacao/>

## Telas

| # | Tela | Link direto |
|---|------|-------------|
| 1 | Abertura | `#abertura` |
| 2 | Uma possibilidade | `#possibilidade` |
| 3 | Convite interativo da Anne | `#convite` (ou `#demo`) |
| 4 | Confirmação de presença | `#confirmacao` |
| 5 | Painel demonstrativo da equipe | `#painel` |
| 6 | Conversa com a gestão | `#conversa` |

Exemplo: `https://hugarasulabs.github.io/as-vilas-apresentacao/#convite` abre direto na demonstração.

Navegação: botões **Anterior** e **Próximo**, indicador de progresso no topo (clicável), setas ← → do teclado, deslizar o dedo para os lados no celular e o botão **Reiniciar**, que apaga as respostas simuladas.

## Estrutura

```
index.html            Estrutura das 6 telas
css/styles.css        Visual (identidade do Grupo + tema do convite)
js/config.js          Dados da festa, imagens e regras de exemplo (arquivo a editar)
js/app.js             Navegação, formulário, validação e painel (estado em memória)
assets/marcas/        Imagens de marca
assets/fotos/         Foto da aniversariante (a ser fornecida)
backup/               Cópia da apresentação anterior (não é publicada, ver .gitignore)
.nojekyll             Faz o GitHub Pages servir os arquivos sem processamento
```

Não há etapa de build nem dependências para instalar. A única chamada externa é às fontes do Google Fonts (Cormorant Garamond, Manrope e Bungee). Sem internet, a página usa fontes do sistema.

## Executar localmente

Qualquer servidor estático serve. Na pasta do projeto:

```bash
python -m http.server 8000
```

Depois abra <http://localhost:8000/>. Abrir o `index.html` direto (duplo clique) também funciona.

## Como testar (roteiro manual)

1. Percorra as 6 telas com **Próximo**/**Anterior**, com as setas do teclado e clicando nos números do topo.
2. Na tela 3, toque em **Abrir no mapa** (abre o endereço no Google Maps), no link do Instagram no rodapé do convite e em **Confirmar presença**.
3. Na tela 4, tente **Enviar resposta** vazio e veja as mensagens. Depois:
   - escolha "Sim", informe só o primeiro nome do responsável (o formulário pede o sobrenome);
   - adicione e remova convidados;
   - marque "Criança" sem idade, depois com 20 anos (pede para marcar "Adulto"), depois com 5;
   - repita um nome na mesma resposta (o formulário avisa);
   - envie. Em seguida, use **Simular a resposta de outro convidado** e registre uma ausência.
4. Na tela 5, confira os números, use **Carregar respostas fictícias**, os filtros da lista, **Marcar como conferida** e altere as idades das regras de exemplo.
5. Use **Reiniciar** e confirme que tudo volta ao início, sem respostas.
6. Repita no celular (ou no modo de dispositivo do navegador, com 390 px e 320 px de largura).

## Publicar no GitHub Pages

O repositório já existe: <https://github.com/hugarasulabs/as-vilas-apresentacao>.

```bash
cd as-vilas
git init -b main
git add .
git commit -m "Apresentação interativa Grupo As Vilas"
git remote add origin https://github.com/hugarasulabs/as-vilas-apresentacao.git
git push -u origin main
```

> Se o repositório remoto já tiver commits (por exemplo, um README criado pelo GitHub), rode `git pull origin main --allow-unrelated-histories` antes do `push`.

No GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / pasta `/ (root)` → Save**. Em um ou dois minutos, a página fica disponível em `https://hugarasulabs.github.io/as-vilas-apresentacao/`.

Todos os caminhos são relativos, então funcionam no subdiretório `/as-vilas-apresentacao/`.

## Personalizar (`js/config.js`)

| O quê | Campo |
|-------|-------|
| Foto da Anne | coloque o arquivo em `assets/fotos/` e preencha `festa.foto` (ex.: `'assets/fotos/anne.jpg'`) |
| Data, horário e local | `festa.data`, `festa.horario`, `festa.local`; ao usar dados reais, mude `exemplo` para `false` para remover o selo "Exemplo" |
| Idade que a Anne completa | `festa.idadeCompleta` (`null` não exibe) |
| Convite em vídeo | `festa.videoConvite` (link `https://`) |
| Site/perfil oficial do Grupo | `grupo.siteOficial` (só preencher com endereço validado; enquanto vazio, a chamada aparece sem link) |
| Logotipos das 4 marcas | `grupo.marcas[].logo` (caminho da imagem; vazio usa um selo de texto provisório) |
| Imagem principal do Grupo | `grupo.imagemMarca` |
| Regras de exemplo | `regras.isencaoAbaixoDe`, `regras.lembrancinhaAbaixoDe` |

## Pendências (informações e arquivos reais)

- [ ] Foto da Anne, autorizada pela família.
- [ ] Data e horário reais da festa (unidade e endereço já configurados: Buffet da Vila Alegria, Belo Horizonte).
- [ ] Logotipos oficiais das quatro marcas (hoje são selos de texto provisórios).
- [ ] Arquivo oficial da marca Grupo As Vilas. A imagem atual veio da apresentação anterior e foi recortada; tem cantos pretos ocultos pelo recorte circular.
- [ ] Link do convite em vídeo, se a ideia for mostrar os dois juntos.
- [ ] Regras de isenção e lembrancinha: as atuais são apenas exemplos de uma experiência relatada.

## Privacidade

- Nenhum dado digitado sai do navegador: não há `fetch`, formulários enviados a servidor, cookies, `localStorage` ou `sessionStorage`.
- O formulário usa `autocomplete="off"` para o navegador não memorizar os nomes digitados.
- O botão de mapa abre o Google Maps só com o endereço da festa, nunca com dados de convidados.
- `<meta name="robots" content="noindex">` pede aos buscadores que não indexem a página.
