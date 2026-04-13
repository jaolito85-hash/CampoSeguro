# Quick Spec — MVP Mobile Campo Seguro Offline

> Fluxo BMad: Quick Spec (Barry - Quick Flow)
> Data: 2026-04-13
> Referencia: mobile-architecture.md

---

## Objetivo

Entregar um APK funcional que roda Gemma 4 Nano on-device, classifica imagens, responde perguntas sobre riscos naturais e aplica protocolos de seguranca — tudo 100% offline.

---

## Escopo do MVP

### Dentro do escopo

- App Android com 3 telas (analise, historico, protocolos)
- Captura de foto via camera ou galeria
- 7 categorias: planta, cogumelo, cobra, inseto, animal, ferimento, geral
- Gemma 4 Nano 1B rodando on-device via AI Edge SDK
- MediaPipe para classificacao visual basica
- Safety Engine com regras deterministicas (portado do prototipo)
- 10 protocolos offline em PT/ES/EN
- SQLite com dados pre-carregados
- Historico local de consultas
- 4 flags rapidas: mordida, sangramento, falta de ar, ingestao
- Download do modelo na primeira abertura

### Fora do escopo (MVP 2+)

- iOS
- Packs regionais com especies
- Classificadores especializados por categoria
- Geolocalizacao e mapa offline
- Checklist de viagem
- Exportar relatorio
- Monetizacao / loja de packs
- Testes A/B
- Analytics

---

## Stack Tecnica

| Camada | Tecnologia |
|---|---|
| UI | React Native + Expo (bare workflow) + TypeScript |
| Navegacao | Expo Router (file-based) |
| IA texto | Gemma 4 Nano 1B INT4 via Google AI Edge SDK |
| IA visao | MediaPipe Image Classification |
| Banco | expo-sqlite |
| Camera | expo-camera |
| Galeria | expo-image-picker |
| i18n | Objetos TS simples (PT/ES/EN) |

---

## Epicos e Stories

### Epico 1 — Setup e Infraestrutura

**Story 1.1: Criar projeto Expo bare workflow**
- Inicializar projeto com `npx create-expo-app` bare workflow
- Configurar TypeScript, ESLint, Prettier
- Configurar Expo Router com layout de tabs
- **Criterio de aceite:** App abre no emulador com 3 tabs vazias

**Story 1.2: Configurar SQLite**
- Instalar expo-sqlite
- Criar schema (protocols, species, history, settings)
- Seed com 10 protocolos em PT/ES/EN
- **Criterio de aceite:** App abre, cria banco, consulta retorna protocolos

**Story 1.3: Configurar i18n**
- Criar arquivos de traducao PT/ES/EN
- Detectar idioma do dispositivo como padrao
- Seletor manual de idioma em settings
- **Criterio de aceite:** Trocar idioma muda todos os textos da UI

---

### Epico 2 — Native Modules de IA

**Story 2.1: Criar GemmaModule (Android)**
- Native Module em Java/Kotlin que carrega AI Edge SDK
- Metodos: loadModel(), generate(prompt), isReady(), unload()
- Gerenciamento de memoria (descarrega em background)
- **Criterio de aceite:** Chamar generate("Ola") do JS retorna resposta em <10s

**Story 2.2: Criar VisionModule (Android)**
- Native Module com MediaPipe Image Classifier
- Metodo: classifyImage(uri) retorna top-5 labels com confianca
- **Criterio de aceite:** Enviar foto de planta retorna labels relevantes

**Story 2.3: Download do modelo on-demand**
- Tela de primeiro uso: "Baixar modelo de IA (~1.2 GB)"
- Download com progresso, pause/resume, retry em falha
- Verificacao de espaco livre antes do download
- Modelo salvo no armazenamento interno do app
- **Criterio de aceite:** Modelo baixa, app carrega e gera resposta

---

### Epico 3 — Safety Engine

**Story 3.1: Portar Safety Engine para TypeScript**
- Migrar detectSituation() do prototipo
- Migrar criticalRuleResult() — protocolos de emergencia
- Migrar normalizedResult() — regras pos-IA
- Testes unitarios para cada regra critica
- **Criterio de aceite:** Todos os cenarios criticos do prototipo passam nos testes:
  - "mordida de cobra" → emergencia sem chamar modelo
  - "falta de ar" → emergencia
  - Planta com confianca baixa → "incerto" + nao consumir
  - Cogumelo + comida → risco alto

**Story 3.2: Portar Prompt Builder**
- Migrar systemPrompt() e userPrompt()
- Adaptar para formato esperado pelo AI Edge SDK
- **Criterio de aceite:** Prompt gerado segue template de seguranca

---

### Epico 4 — Tela Principal (Analise)

**Story 4.1: UI de captura e pergunta**
- Botao de camera (expo-camera) e galeria (expo-image-picker)
- Preview da foto selecionada
- Campo de texto para pergunta
- Seletor de categoria (7 opcoes com icones)
- 4 flags rapidas (mordida, sangramento, falta de ar, ingestao)
- Botao "Analisar"
- **Criterio de aceite:** Usuario consegue tirar foto, digitar pergunta, selecionar categoria e flags

**Story 4.2: Orquestrador de analise**
- Recebe inputs da UI (foto, texto, categoria, flags, idioma)
- Executa fluxo: Safety pre → MediaPipe → Prompt → Gemma → Safety pos
- Retorna resultado estruturado { risco, confianca, identificacao, acao, evitar, fotos }
- Loading state durante inferencia
- **Criterio de aceite:** Fluxo completo funciona end-to-end com foto e pergunta

**Story 4.3: Tela de resultado**
- Risk meter visual (4 niveis com cores)
- Pill de confianca (baixa/media/alta)
- Cards: identificacao provavel, o que fazer, o que nao fazer, fotos recomendadas
- Botao "Salvar no historico"
- **Criterio de aceite:** Resultado renderiza corretamente para todos os niveis de risco

---

### Epico 5 — Telas Secundarias

**Story 5.1: Tela de protocolos offline**
- Lista de protocolos por categoria
- Busca por texto
- Card expandivel com instrucoes completas
- Funciona sem modelo carregado
- **Criterio de aceite:** Usuario encontra e le protocolo de mordida de cobra em <3 toques

**Story 5.2: Tela de historico**
- Lista de consultas anteriores ordenada por data
- Preview com categoria, risco e resumo
- Toque para ver resultado completo
- Botao para limpar historico
- **Criterio de aceite:** Consultas salvas aparecem no historico apos analise

---

### Epico 6 — Modo Degradado

**Story 6.1: App funciona sem modelo carregado**
- Se modelo nao foi baixado: mostrar apenas protocolos offline
- Se modelo falha ao carregar: mostrar Safety Engine + protocolos
- Indicador claro de status do modelo na UI
- **Criterio de aceite:** App e util mesmo sem IA generativa (protocolos + regras deterministicas)

---

## Protocolos Offline do MVP (10)

| # | Protocolo | Risco | Categoria |
|---|---|---|---|
| 1 | Mordida de cobra | emergency | snake |
| 2 | Picada de inseto/escorpiao | high | insect |
| 3 | Planta irritante (contato com pele) | moderate | plant |
| 4 | Ingestao de planta desconhecida | high | plant |
| 5 | Cogumelo desconhecido (ingestao) | high | mushroom |
| 6 | Corte / sangramento | moderate-high | injury |
| 7 | Queimadura | moderate-high | injury |
| 8 | Insolacao / hipertermia | high | general |
| 9 | Desidratacao | moderate | general |
| 10 | Reacao alergica grave | emergency | general |

---

## Criterios de Aceite do MVP

- [ ] App instala e abre em celular Android com 4GB RAM
- [ ] Gemma 4 Nano roda on-device e responde em <10s
- [ ] Foto de cobra retorna resultado com risco alto
- [ ] "Fui mordido por cobra" retorna protocolo de emergencia sem esperar IA
- [ ] Planta com confianca baixa nunca diz "segura para consumo"
- [ ] Funciona 100% sem internet apos download do modelo
- [ ] 3 idiomas funcionam (PT/ES/EN)
- [ ] Historico salva e exibe consultas anteriores
- [ ] Protocolos acessiveis sem modelo carregado
- [ ] App nao crasha com pouca memoria (modo degradado funciona)

---

## Ordem de Implementacao Sugerida

```
Semana 1: Stories 1.1, 1.2, 1.3, 3.1, 3.2
          (setup + safety engine + i18n — tudo testavel sem IA)

Semana 2: Stories 2.1, 2.2, 2.3
          (native modules — parte mais arriscada, atacar cedo)

Semana 3: Stories 4.1, 4.2, 4.3
          (tela principal + orquestrador — integra tudo)

Semana 4: Stories 5.1, 5.2, 6.1
          (telas secundarias + modo degradado + polish)
```

---

## Riscos do MVP

| Risco | Probabilidade | Impacto | Plano B |
|---|---|---|---|
| AI Edge SDK nao suporta Gemma 4 Nano ainda | Media | Alto | Usar Gemma 3 Nano via llama.cpp / executorch |
| React Native Native Module complexo demais | Baixa | Alto | Usar Expo Modules API (wrapper mais simples) |
| Modelo nao cabe em celulares 4GB | Media | Alto | Modo "somente protocolos" como fallback |
| MediaPipe nao classifica bem fauna/flora | Alta | Medio | Usar Gemma multimodal se disponivel |
