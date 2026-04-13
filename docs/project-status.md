# CampoSeguro — Status do Projeto

> Documento de referencia para continuidade do desenvolvimento.
> Data: 2026-04-13

---

## O que e o CampoSeguro

Assistente de campo que identifica riscos naturais (plantas, cobras, insetos, cogumelos, ferimentos) por foto usando IA, orienta primeiros socorros e funciona offline. Disponivel como app Android (APK), web app e via Expo Go.

---

## Stack Tecnica

| Camada | Tecnologia |
|---|---|
| UI | React Native + Expo SDK 54 (managed workflow) + TypeScript |
| Navegacao | Expo Router (file-based, tabs) |
| IA (cloud) | Google Gemini API (2.5-flash principal, fallback para 2.5-pro e 2.5-flash-lite) |
| IA (on-device) | Mocks preparados para Google AI Edge SDK (Gemma) e MediaPipe (futuro) |
| Banco (nativo) | expo-sqlite (API sincrona — openDatabaseSync, runSync, getAllSync) |
| Banco (web) | localStorage (fallback automatico via .web.ts) |
| Camera | expo-camera + expo-image-picker |
| GPS | expo-location |
| Mapas | Leaflet + OpenStreetMap via react-native-webview (sem API key) |
| i18n | Objetos TS simples (PT/ES/EN) |
| Deploy web | Vercel (static export) |
| Build Android | EAS Build (APK e AAB) |

---

## Estrutura de Arquivos

```
CampoSeguro/
├── app/                          # Telas (Expo Router)
│   ├── _layout.tsx               # Root layout — init DB + API key auto
│   ├── navigate.tsx              # Tela de navegacao offline (GPS, bussola, waypoints)
│   └── (tabs)/
│       ├── _layout.tsx           # Tab bar (5 tabs: Analisar, Protocolos, Historico, Viagens, Config)
│       ├── index.tsx             # Tela principal — foto, categoria, flags, analise, resultado, follow-up
│       ├── protocols.tsx         # Lista de protocolos offline com busca e cards expansiveis
│       ├── history.tsx           # Historico de consultas com modal de detalhes
│       ├── trips.tsx             # Preparacao de viagens — criar, listar, ativar, excluir
│       └── settings.tsx          # Configuracao — API key, idioma
├── src/
│   ├── api/
│   │   ├── config.ts             # Gerencia API key (salva no SQLite/localStorage)
│   │   └── gemini.ts             # Cliente Gemini — multi-model fallback, parser robusto
│   ├── components/
│   │   ├── CategoryPicker.tsx    # Seletor de 7 categorias com icones
│   │   ├── FlagChips.tsx         # 4 flags rapidas (mordida, sangramento, falta de ar, ingestao)
│   │   ├── MapWebView.tsx        # Mapa Leaflet/OSM via WebView (posicao, waypoints, trilha)
│   │   ├── ResultCard.tsx        # Card de resultado completo (risco, confianca, acoes, evitar)
│   │   └── RiskMeter.tsx         # Barra visual de nivel de risco (4 niveis, cores)
│   ├── data/
│   │   ├── database.ts           # SQLite nativo (openDatabaseSync, 6 tabelas)
│   │   ├── database.web.ts       # Fallback web com localStorage
│   │   ├── seed.ts               # Seed de 10 protocolos (nativo, runSync)
│   │   ├── seed.web.ts           # Seed web (no-op, dados inline em database.web.ts)
│   │   ├── seed-data.ts          # Dados dos 10 protocolos (compartilhado entre plataformas)
│   │   ├── trips.ts              # CRUD de viagens, waypoints, breadcrumbs (nativo)
│   │   └── trips.web.ts          # Fallback web para trips
│   ├── engine/
│   │   ├── analyzer.ts           # Orquestrador: critical rules → Gemini cloud → offline fallback
│   │   ├── prompt-builder.ts     # System prompt + user prompt com regras de seguranca e contexto
│   │   └── safety-engine.ts      # Regras deterministicas, normalizacao, override de seguranca
│   ├── i18n/
│   │   ├── index.ts              # Hook useI18n() + setLanguage()
│   │   ├── pt.ts                 # Portugues
│   │   ├── es.ts                 # Espanhol
│   │   └── en.ts                 # Ingles
│   ├── native/
│   │   ├── gemma-module.ts       # Mock do Gemma 4 Nano (futuro: Native Module real)
│   │   └── vision-module.ts      # Mock do MediaPipe (futuro: Native Module real)
│   └── types/
│       └── index.ts              # Tipos: RiskLevel, Category, Flag, AnalysisInput/Result, etc.
├── docs/
│   ├── architecture.md           # Arquitetura do sistema
│   ├── quick-spec.md             # Spec do MVP com epicos e stories
│   ├── safety-principles.md     # Principios de seguranca
│   ├── product-plan.md          # Plano do produto
│   └── project-status.md        # ESTE DOCUMENTO
├── assets/                       # Icones e splash screen
├── app.json                      # Config Expo (permissoes, plugins, EAS project ID)
├── eas.json                      # Config EAS Build (preview APK, production AAB)
├── package.json                  # Dependencias
├── tsconfig.json                 # TypeScript config
├── .npmrc                        # legacy-peer-deps=true (resolve conflitos)
└── .gitignore
```

---

## Fluxo de Analise (como funciona)

```
Usuario: foto + pergunta + categoria + flags
            │
            ▼
    ┌─ REGRAS CRITICAS ──────────────────────────┐
    │ Mordida de cobra? → EMERGENCIA imediata     │
    │ Falta de ar?      → EMERGENCIA imediata     │
    │ Desmaio/convulsao?→ EMERGENCIA imediata     │
    │ (bypass completo da IA, resposta instantanea)│
    └─────────┬──────────────────────────────────┘
              │ nao
              ▼
    ┌─ GEMINI CLOUD ─────────────────────────────┐
    │ Tenta 3 modelos em sequencia:               │
    │   1. gemini-2.5-flash (rapido)              │
    │   2. gemini-2.5-pro (preciso)               │
    │   3. gemini-2.5-flash-lite (fallback)       │
    │ Envia: foto + prompt + regras de seguranca  │
    │ Recebe: JSON com risco, confianca, acoes    │
    └─────────┬──────────────────────────────────┘
              │ sucesso           │ falha (offline/erro)
              ▼                   ▼
    ┌─ SAFETY ENGINE ─┐  ┌─ FALLBACK OFFLINE ────┐
    │ Valida resposta  │  │ Resultado conservador  │
    │ Ajusta risco     │  │ "Trate como desconhecido"│
    │ Forca cautela    │  │ + orientacoes seguras  │
    │ Adiciona avisos  │  └───────────────────────┘
    └────────┬────────┘
             ▼
    ┌─ RESULTADO ─────────────────────────────────┐
    │ RiskMeter (baixo/moderado/alto/emergencia)   │
    │ Identificacao provavel                       │
    │ O que fazer agora                            │
    │ O que NAO fazer                              │
    │ Informacoes adicionais                       │
    │ [+ Adicionar informacoes] → re-analise       │
    │ [Salvar no historico]                        │
    │ [Marcar perigo no mapa] (se viagem ativa)    │
    └─────────────────────────────────────────────┘
```

---

## Banco de Dados (6 tabelas)

| Tabela | Uso |
|---|---|
| `protocols` | 10 protocolos offline em PT/ES/EN (seed automatico) |
| `history` | Historico de consultas com resultado JSON, coordenadas |
| `settings` | Chave-valor (API key, preferencias) |
| `trips` | Viagens salvas (nome, coordenadas, mapa, notas de emergencia) |
| `waypoints` | Pontos de referencia por viagem (inicio, agua, perigo, acampamento) |
| `breadcrumbs` | Rastro GPS gravado (coordenadas + altitude a cada 15s) |

**Importante:** Toda a camada de banco usa API sincrona do expo-sqlite (`openDatabaseSync`, `runSync`, `getAllSync`, `getFirstSync`, `execSync`). A API async (`prepareAsync`) causa `NullPointerException` no Expo Go.

---

## Funcionalidades Implementadas

### Analise por IA (tela Analisar)
- [x] Captura de foto via camera ou galeria
- [x] 7 categorias com icones (planta, cogumelo, cobra, inseto, animal, ferimento, geral)
- [x] 4 flags rapidas (mordida, sangramento, falta de ar, ingestao)
- [x] Analise via Gemini API com fallback multi-modelo
- [x] Regras criticas que bypassam a IA (emergencias)
- [x] Safety Engine pos-IA com regras deterministicas
- [x] Resultado visual com RiskMeter, acoes, avisos
- [x] Follow-up: adicionar informacoes + nova foto para re-analise
- [x] Salvamento no historico com coordenadas GPS
- [x] Integracao com viagens: oferta marcar perigo no mapa

### Protocolos Offline (tela Protocolos)
- [x] 10 protocolos de emergencia em PT/ES/EN
- [x] Busca por texto
- [x] Cards expansiveis com instrucoes completas
- [x] Funciona 100% sem internet e sem modelo de IA

### Historico (tela Historico)
- [x] Lista de consultas anteriores ordenada por data
- [x] Preview com categoria, risco e resumo
- [x] Modal para ver resultado completo
- [x] Limpar historico com confirmacao

### Viagens e Navegacao Offline (tela Viagens + tela Navegar)
- [x] Criar viagem (nome, descricao, notas de emergencia)
- [x] GPS automatico ao criar (salva coordenadas)
- [x] Lista de viagens com mini-mapa Leaflet/OSM
- [x] Ativar viagem para navegacao
- [x] Mapa visual interativo (Leaflet + OpenStreetMap via WebView)
- [x] Posicao ao vivo no mapa (ponto azul + circulo de precisao)
- [x] Waypoints coloridos no mapa por tipo (perigo, agua, acampamento, etc.)
- [x] Trilha percorrida desenhada no mapa (polyline azul)
- [x] Duas abas: Mapa e Detalhes
- [x] Navegacao offline: GPS ao vivo, bussola, altitude, velocidade
- [x] Distancia e direcao ao destino (overlay no mapa)
- [x] Gravar rastro (breadcrumbs a cada 15s)
- [x] Marcar waypoints (inicio, acampamento, agua, perigo, saida)
- [x] Distancia e direcao para cada waypoint (aba Detalhes)
- [x] Botao SOS com coordenadas exatas + numeros de emergencia

### Configuracao (tela Config)
- [x] Seletor de idioma (PT/ES/EN)
- [x] Configuracao de API key do Gemini
- [x] Status da IA (cloud ativa vs modo offline)
- [x] API key auto-configurada na primeira abertura

### i18n
- [x] Portugues, Espanhol, Ingles
- [x] Todas as strings de UI traduzidas
- [x] Protocolos e respostas da Safety Engine em 3 idiomas

---

## Deploy e Distribuicao

| Canal | URL/Comando | Status |
|---|---|---|
| **Web (Vercel)** | https://dist-iota-sandy.vercel.app | Ativo |
| **Android APK** | EAS Build, profile "preview" | Ativo |
| **Expo Go (dev)** | `npx expo start` ou `npx expo start --tunnel` | Dev |
| **Google Play** | `eas build --profile production --platform android` | Futuro |
| **iOS (TestFlight)** | Requer Apple Developer ($99/ano) | Futuro |

### Comandos de build

```bash
# Dev (Expo Go)
npx expo start
npx expo start --tunnel  # para acesso remoto

# Web
npx expo export --platform web
cd dist && npx vercel --prod --yes

# Android APK
eas build --profile preview --platform android

# Android AAB (Google Play)
eas build --profile production --platform android
```

---

## API Key do Gemini

- Chave atual: `AIzaSyC8YdNXFgp4ydeMvSNGiJs5Sp8zN860Fxk`
- Auto-configurada no primeiro uso (ver `app/_layout.tsx`)
- Salva no SQLite/localStorage (nao em arquivo)
- Free tier: ~1500 req/dia (flash), ~50 req/dia (pro)
- Criar nova em: https://aistudio.google.com/apikey

---

## Problemas Conhecidos e Solucoes

| Problema | Solucao |
|---|---|
| `NativeDatabase.prepareAsync NullPointerException` | Usar API sincrona (openDatabaseSync, runSync, etc.) |
| Gemini retorna JSON com aspas duplas `""key` | Parser com `cleanJsonText()` corrige automaticamente |
| Gemini retorna JSON truncado | Parser com `repairTruncatedJson()` fecha brackets abertos |
| Gemini retorna JSON com markdown fences | Parser remove ````json` automaticamente |
| `gemini-2.0-flash` descontinuado | Removido da lista de modelos |
| Modelo 503 (sobrecarga) | Fallback automatico para proximo modelo |
| react vs react-dom versoes diferentes | Ambos fixados em 19.1.0 |
| expo-sqlite nao funciona na web | Arquivos `.web.ts` com fallback localStorage |
| npm peer dependency conflicts | `.npmrc` com `legacy-peer-deps=true` |
| Ngrok tunnel instavel | Alternativa: localtunnel (`lt --port 8081`) |
| `react-native-maps` trava no Expo Go | Substituido por Leaflet + OSM via react-native-webview (MapWebView) |
| WebView do mapa piscando | HTML fixo com useMemo, atualizacoes so via injectJavaScript |

---

## O que falta para o MVP completo (conforme quick-spec.md)

### Prioridade alta
- [ ] Testes unitarios para o Safety Engine (Story 3.1)
- [ ] Modo degradado explicito: indicador claro quando sem IA (Story 6.1)
- [ ] Download do modelo on-demand para uso on-device (Story 2.3)

### Prioridade media
- [ ] Native Module real do Gemma via AI Edge SDK (Story 2.1)
- [ ] Native Module real do MediaPipe para visao (Story 2.2)
- [ ] Checklist de kit de primeiros socorros
- [ ] Modo emergencia com botao vermelho na tela inicial

### Prioridade baixa (pos-MVP)
- [ ] iOS via TestFlight (requer Apple Developer)
- [ ] Publicacao no Google Play
- [ ] Packs regionais com especies locais
- [ ] Geolocalizacao com mapa offline real (tile caching)
- [ ] Exportar relatorio
- [ ] Analytics

---

## Contas e Acessos

| Servico | Conta | Uso |
|---|---|---|
| Expo / EAS | @jaolito | Build, deploy, OTA updates |
| Vercel | jaolito85-1253s-projects | Hosting web |
| Google AI Studio | (chave AIzaSyC8...) | API Gemini |
| GitHub | jaolito85-hash | Repositorio |

---

## Para continuar o desenvolvimento

1. Clonar o repo e rodar `npm install --legacy-peer-deps`
2. Rodar `npx expo start` para dev
3. API key ja esta auto-configurada
4. Para build: `eas build --profile preview --platform android`
5. Para web: `npx expo export --platform web && cd dist && npx vercel --prod --yes`
