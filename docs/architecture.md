# Arquitetura Mobile — Campo Seguro Offline

> Documento de arquitetura criado seguindo fluxo BMad (Winston - Architect)
> Data: 2026-04-13
> Versao: 1.0

---

## 1. Visao Geral

Campo Seguro Offline e um app mobile Android-first que roda **100% offline**, combinando IA on-device com regras deterministicas de seguranca para ajudar pessoas em campo a identificar riscos naturais (plantas, cobras, insetos, cogumelos, ferimentos) e receber orientacao de primeiros socorros em portugues, espanhol e ingles.

### Principio central

> A IA e uma camada de apoio. Regras deterministicas de seguranca tem prioridade absoluta sobre qualquer resposta generativa.

---

## 2. Decisoes Arquiteturais (ADRs)

### ADR-001: Framework Mobile — React Native + Expo

**Decisao:** Usar React Native com Expo (bare workflow) para o app mobile.

**Motivos:**
- Prototipo existente ja esta em JavaScript — migracao natural da logica
- Expo bare workflow permite modulos nativos (necessarios para ML on-device)
- Comunidade grande, boa documentacao, suporte a Android e iOS
- expo-sqlite para banco local, expo-camera para captura de fotos
- Possibilidade de expandir para iOS no futuro sem reescrever

**Alternativas rejeitadas:**
- Flutter: boa performance, mas exigiria reescrita total da logica existente
- Android nativo (Kotlin): melhor controle de ML, mas sem portabilidade iOS e curva maior
- PWA: limitacoes de acesso a hardware e armazenamento offline insuficiente

---

### ADR-002: Modelo de Linguagem — Gemma 4 Nano 1B (INT4)

**Decisao:** Usar Gemma 4 Nano 1B com quantizacao INT4 via Google AI Edge SDK.

**Motivos:**
- Gemma 4 e a familia mais recente do Google, com melhor qualidade por parametro
- Variante Nano 1B pesa ~1.2 GB em INT4 — cabe na maioria dos celulares com 4GB+ RAM
- Google AI Edge SDK e o runtime oficial para inferencia on-device em Android
- Suporta GPU delegation (via GPU do celular) para inferencia mais rapida
- INT4 reduz uso de memoria em ~75% vs FP16 com perda minima de qualidade

**Testes do prototipo (referencia):**
| Modelo | Tamanho | RAM | Status |
|---|---|---|---|
| gemma4:e4b | 9.6 GB | 8.1 GiB | Falhou (OOM no desktop) |
| gemma4:e2b | 7.16 GB | ~6 GiB | Falhou no desktop |
| gemma3n:e2b | 5.6 GB | ~4 GiB | Funcional no desktop |
| **gemma-4-nano 1B INT4** | **~1.2 GB** | **~2 GB** | **Target mobile** |

**Fallback:** Se Gemma 4 Nano nao estiver disponivel como release estavel no AI Edge SDK no momento do desenvolvimento, usar Gemma 3 Nano (gemma3n) que ja foi validado. A arquitetura e identica — so muda o arquivo .tflite do modelo.

---

### ADR-003: Visao Computacional — MediaPipe + Classificadores Custom

**Decisao:** Substituir Moondream 1.8B por MediaPipe Vision Tasks + classificadores TFLite especializados.

**Motivos:**
- Moondream 1.8B requer servidor Ollama — inviavel em mobile
- MediaPipe Image Classifier roda nativamente em Android, ~5-15 MB por modelo
- Classificadores especializados por categoria (cobra, planta, inseto) sao mais precisos que um modelo generico para identificacao de especies
- Inferencia em <100ms no celular vs 5-20s do Moondream
- Google mantem MediaPipe com foco em mobile

**Estrategia de classificacao:**
1. **Detector geral** — Identifica se a imagem contem planta, animal, inseto, cogumelo, ferimento
2. **Classificador especializado** — Modelo treinado por categoria com especies regionais
3. **Gemma 4 Nano** — Interpreta resultados, gera explicacao em linguagem natural, aplica contexto

---

### ADR-004: Banco de Dados Local — SQLite via expo-sqlite

**Decisao:** Usar SQLite como banco unico para protocolos, especies, historico e configuracao.

**Motivos:**
- expo-sqlite ja integrado ao ecossistema Expo
- Suporta milhares de registros com busca rapida
- Dados pre-carregados no bundle do app (packs regionais)
- Historico de consultas salvo localmente
- Migracoes simples via SQL

---

### ADR-005: Runtime de IA — Google AI Edge SDK

**Decisao:** Usar Google AI Edge Generative API como runtime para Gemma on-device.

**Motivos:**
- Runtime oficial do Google para modelos Gemma em Android
- Suporta quantizacao INT4/INT8 nativamente
- GPU delegation para aceleracao via hardware do celular
- API simples: carregar modelo .tflite, enviar prompt, receber resposta
- Alternativa ao Ollama que nao roda em Android

**Integracao com React Native:**
- Criar um Native Module (Java/Kotlin) que encapsula o AI Edge SDK
- Expor interface simples para JS: `loadModel()`, `generate(prompt)`, `unloadModel()`
- Modelo .tflite empacotado no assets do APK ou baixado no primeiro uso

---

## 3. Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────┐
│                    CAMADA DE INTERFACE                    │
│              React Native + Expo (TypeScript)            │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │  Camera   │ │ Galeria  │ │ Chat/    │ │ Protocolos │ │
│  │  Screen   │ │ Picker   │ │ Triagem  │ │ Offline    │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
├─────────────────────────────────────────────────────────┤
│                  CAMADA DE ORQUESTRACAO                   │
│                    (TypeScript puro)                      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │             Safety Engine (deterministico)         │   │
│  │  - Regras pre/pos IA                              │   │
│  │  - Protocolos de emergencia                       │   │
│  │  - Validacao de confianca                         │   │
│  │  - Override conservador para plantas/cogumelos    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Analisador  │  │  Construtor  │  │  Normalizador │  │
│  │  de Contexto │  │  de Prompts  │  │  de Respostas │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
├─────────────────────────────────────────────────────────┤
│                   CAMADA DE IA ON-DEVICE                  │
│                                                          │
│  ┌──────────────────────┐  ┌─────────────────────────┐  │
│  │  Google AI Edge SDK   │  │  MediaPipe Vision Tasks │  │
│  │  (Native Module)      │  │  (Native Module)        │  │
│  │                       │  │                          │  │
│  │  Gemma 4 Nano 1B     │  │  Classificador Geral    │  │
│  │  INT4 quantizado     │  │  Classificadores         │  │
│  │  ~1.2 GB             │  │  Regionais (~5-15MB)    │  │
│  └──────────────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                  CAMADA DE DADOS LOCAL                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                   SQLite (expo-sqlite)             │   │
│  │                                                    │   │
│  │  Tabelas:                                         │   │
│  │  - protocols (primeiros socorros)                 │   │
│  │  - species (especies perigosas por regiao)        │   │
│  │  - history (consultas do usuario)                 │   │
│  │  - regional_packs (packs baixados)                │   │
│  │  - settings (idioma, regiao, preferencias)        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Fluxo Principal de Analise

```
Usuario tira foto / digita pergunta
            │
            ▼
   ┌─────────────────┐
   │  Safety Engine   │──── Situacao critica? ──── SIM ──▶ Protocolo offline
   │  (pre-analise)   │                                    deterministico
   └────────┬────────┘                                    (cobra, falta de ar,
            │ NAO                                          sangramento intenso)
            ▼
   ┌─────────────────┐
   │  Tem imagem?     │──── SIM ──▶ MediaPipe classifica
   └────────┬────────┘              imagem (~50-100ms)
            │ NAO                         │
            ▼                             ▼
   ┌─────────────────┐         Resultado visual +
   │  Construtor de   │◀────── categoria detectada
   │  Prompts         │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  Gemma 4 Nano    │  Gera resposta em linguagem
   │  (AI Edge SDK)   │  natural com contexto
   └────────┬────────┘  (~2-8s warm)
            │
            ▼
   ┌─────────────────┐
   │  Safety Engine   │  Aplica regras pos-IA:
   │  (pos-analise)   │  - Confianca baixa → "incerto"
   └────────┬────────┘  - Planta/cogumelo → nao consumir
            │            - Eleva risco se necessario
            ▼
   ┌─────────────────┐
   │  Resultado final │  { risco, confianca, acao,
   │  para o usuario  │    evitar, fotos_adicionais }
   └─────────────────┘
```

---

## 5. Estrutura do Projeto React Native

```
campo-seguro-mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── (tabs)/
│   │   ├── index.tsx             # Tela principal (camera + pergunta)
│   │   ├── history.tsx           # Historico de consultas
│   │   └── protocols.tsx         # Protocolos offline
│   ├── result.tsx                # Tela de resultado da analise
│   └── _layout.tsx               # Layout com navegacao
│
├── src/
│   ├── engine/
│   │   ├── safety-engine.ts      # Regras deterministicas (portado do prototipo)
│   │   ├── prompt-builder.ts     # Construcao de prompts para Gemma
│   │   ├── result-normalizer.ts  # Normalizacao e validacao de respostas
│   │   └── analyzer.ts           # Orquestrador principal
│   │
│   ├── native/
│   │   ├── gemma-module.ts       # Interface JS para AI Edge SDK
│   │   └── vision-module.ts      # Interface JS para MediaPipe
│   │
│   ├── data/
│   │   ├── database.ts           # Setup e migracoes SQLite
│   │   ├── protocols.ts          # CRUD de protocolos
│   │   ├── species.ts            # CRUD de especies
│   │   └── history.ts            # CRUD de historico
│   │
│   ├── i18n/
│   │   ├── pt.ts                 # Strings em portugues
│   │   ├── es.ts                 # Strings em espanhol
│   │   └── en.ts                 # Strings em ingles
│   │
│   ├── components/
│   │   ├── RiskMeter.tsx         # Indicador visual de risco
│   │   ├── ResultCard.tsx        # Card com resultado da analise
│   │   ├── CategoryPicker.tsx    # Seletor de categoria
│   │   ├── FlagChips.tsx         # Flags rapidas (mordida, sangramento...)
│   │   └── ProtocolCard.tsx      # Card de protocolo offline
│   │
│   └── types/
│       └── index.ts              # Tipos compartilhados
│
├── android/
│   └── app/src/main/java/.../
│       ├── GemmaModule.java      # Native Module: AI Edge SDK
│       └── VisionModule.java     # Native Module: MediaPipe
│
├── assets/
│   ├── models/                   # Modelos .tflite (ou download on-demand)
│   ├── db/                       # SQLite pre-populado
│   └── images/                   # Icones e assets visuais
│
├── app.json                      # Config Expo
├── package.json
├── tsconfig.json
└── README.md
```

---

## 6. Native Modules (Android)

### GemmaModule — Interface com AI Edge SDK

```
Responsabilidades:
- Carregar modelo Gemma .tflite na inicializacao do app
- Expor metodo generate(prompt, options) para JS
- Gerenciar memoria (descarregar modelo quando app vai para background)
- Reportar status do modelo (carregando, pronto, erro, sem memoria)

Interface JS:
  loadModel(): Promise<void>
  generate(prompt: string, options?: { temperature?: number, maxTokens?: number }): Promise<string>
  isReady(): boolean
  getModelInfo(): { name: string, sizeBytes: number, quantization: string }
  unload(): Promise<void>
```

### VisionModule — Interface com MediaPipe

```
Responsabilidades:
- Classificar imagens usando modelos TFLite especializados
- Retornar top-N categorias com score de confianca
- Suportar troca de modelo por categoria

Interface JS:
  classifyImage(imageUri: string, category?: string): Promise<Classification[]>
  detectObjects(imageUri: string): Promise<Detection[]>

Tipos:
  Classification { label: string, confidence: number }
  Detection { label: string, confidence: number, boundingBox: Rect }
```

---

## 7. Esquema do Banco SQLite

```sql
-- Protocolos de primeiros socorros
CREATE TABLE protocols (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,        -- snake_bite, plant_ingestion, insect_sting...
  risk_level TEXT NOT NULL,      -- low, moderate, high, emergency
  title_pt TEXT NOT NULL,
  title_es TEXT,
  title_en TEXT,
  do_now_pt TEXT NOT NULL,       -- JSON array
  do_now_es TEXT,
  do_now_en TEXT,
  avoid_pt TEXT NOT NULL,        -- JSON array
  avoid_es TEXT,
  avoid_en TEXT,
  version INTEGER DEFAULT 1
);

-- Especies perigosas por regiao
CREATE TABLE species (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,        -- plant, snake, insect, mushroom, animal
  name_scientific TEXT,
  name_common_pt TEXT,
  name_common_es TEXT,
  name_common_en TEXT,
  risk_level TEXT NOT NULL,
  region TEXT NOT NULL,          -- brazil_southeast, brazil_north, etc.
  description_pt TEXT,
  visual_signs_pt TEXT,          -- JSON array de sinais visuais
  lookalikes TEXT,               -- JSON array de especies parecidas
  pack_id TEXT,
  FOREIGN KEY (pack_id) REFERENCES regional_packs(id)
);

-- Historico de consultas do usuario
CREATE TABLE history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  category TEXT,
  question TEXT,
  image_uri TEXT,
  result_json TEXT,              -- Resposta completa serializada
  risk_level TEXT,
  latitude REAL,
  longitude REAL
);

-- Packs regionais baixados
CREATE TABLE regional_packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  version INTEGER NOT NULL,
  species_count INTEGER,
  downloaded_at TEXT
);

-- Configuracoes do usuario
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

---

## 8. Requisitos de Hardware

### Minimo (funcional)
- Android 8.0+ (API 26)
- 4 GB RAM
- 3 GB armazenamento livre (modelo + app + dados)
- Processador ARMv8 (64-bit)

### Recomendado (experiencia fluida)
- Android 10+
- 6 GB RAM
- GPU Adreno 610+ ou Mali-G57+ (para GPU delegation)
- 5 GB armazenamento livre

### Estimativa de tamanho do app
| Componente | Tamanho |
|---|---|
| APK base (React Native + Expo) | ~25 MB |
| Gemma 4 Nano INT4 | ~1.2 GB |
| MediaPipe + classificadores | ~50 MB |
| SQLite pre-populado (pack Brasil) | ~10 MB |
| **Total estimado** | **~1.3 GB** |

**Estrategia de download:** O APK inicial pesa ~25 MB. Na primeira abertura, o app baixa o modelo Gemma e o pack regional selecionado. Isso evita um APK de 1.3 GB na Play Store.

---

## 9. Performance Esperada

| Operacao | Tempo estimado | Condicao |
|---|---|---|
| Abertura do app (modelo ja carregado) | <2s | Warm start |
| Carregamento do modelo Gemma | 5-15s | Cold start |
| Classificacao de imagem (MediaPipe) | 50-100ms | Qualquer |
| Resposta do Gemma (texto curto) | 2-5s | GPU delegation |
| Resposta do Gemma (texto longo) | 5-10s | GPU delegation |
| Protocolo offline (deterministico) | <50ms | Qualquer |
| Busca no SQLite | <10ms | Qualquer |

---

## 10. Seguranca e Privacidade

- **Zero dados enviados para servidores** — tudo roda no dispositivo
- **Sem telemetria** — nenhuma metrica coletada sem consentimento
- **Fotos ficam no dispositivo** — nao sao enviadas a nenhum servidor
- **Historico local** — usuario pode apagar a qualquer momento
- **Sem login necessario** — app funciona sem conta
- **Modelo on-device** — inferencia local, sem API calls

---

## 11. Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|---|---|---|
| Gemma 4 Nano nao disponivel no AI Edge SDK | Alto | Fallback para Gemma 3 Nano (ja validado) |
| Celular com <4GB RAM nao roda modelo | Medio | Modo "somente protocolos" sem IA generativa |
| Classificador visual erra especie | Alto | Safety Engine nunca confirma seguranca; sempre conservador |
| Modelo alucina resposta perigosa | Critico | Regras deterministicas pos-IA sempre aplicadas |
| Modelo .tflite muito grande para download | Medio | Download em background, com progresso e retry |
| GPU delegation falha em celulares antigos | Baixo | Fallback para CPU (mais lento, mas funcional) |

---

## 12. Migracoes do Prototipo

### O que migra diretamente (JS → TS)
- Safety Engine (`detectSituation`, `criticalRuleResult`, `normalizedResult`)
- Prompt builder (`systemPrompt`, `userPrompt`)
- Result normalizer (regras de confianca, override conservador)
- Strings i18n (PT/ES/EN)
- Protocolos offline (JSON → SQLite seed)

### O que muda completamente
- Runtime de IA: Ollama → Google AI Edge SDK (native module)
- Visao: Moondream → MediaPipe (native module)
- Server HTTP → chamadas locais diretas (sem rede)
- HTML/CSS → React Native components
- JSON files → SQLite

### O que e novo
- Camera nativa
- Geolocalizacao offline
- Historico persistente
- Download de packs regionais
- Modo "somente protocolos" (sem modelo carregado)

---

## 13. Proximos Passos

1. **Quick-spec do MVP mobile** — definir escopo minimo, stories e criterios de aceite
2. **Setup do projeto** — criar repo, configurar Expo bare workflow, estrutura de pastas
3. **Native Module: GemmaModule** — integrar AI Edge SDK com Gemma Nano
4. **Portar Safety Engine** — migrar logica JS para TypeScript
5. **UI basica** — tela principal com camera, pergunta e resultado
6. **Testes on-device** — validar performance em celulares reais (4GB, 6GB, 8GB RAM)
