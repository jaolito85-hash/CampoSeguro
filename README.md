# CampoSeguro

Assistente de campo offline com IA on-device para identificacao de riscos naturais.

## O que faz

- Reconhece plantas, cobras, insetos, cogumelos e ferimentos por foto
- Classifica nivel de risco (baixo, moderado, alto, emergencia)
- Orienta primeiros socorros com protocolos offline
- Funciona 100% sem internet
- Responde em portugues, espanhol e ingles

## Stack

| Camada | Tecnologia |
|---|---|
| App | React Native + Expo (bare workflow) |
| IA texto | Gemma 4 Nano 1B INT4 via Google AI Edge SDK |
| IA visao | MediaPipe Image Classification |
| Banco | SQLite (expo-sqlite) |
| Idiomas | PT / ES / EN |

## Requisitos minimos

- Android 8.0+ (API 26)
- 4 GB RAM
- 3 GB armazenamento livre
- ARMv8 64-bit

## Principio de seguranca

> Quando a IA tiver duvida, o app escolhe a orientacao mais conservadora.
> Regras deterministicas tem prioridade absoluta sobre respostas generativas.

Situacoes criticas (mordida de cobra, falta de ar, sangramento intenso) acionam protocolos offline imediatos — sem esperar resposta do modelo.

## Documentacao

- [Arquitetura](docs/architecture.md)
- [Quick Spec MVP](docs/quick-spec.md)
- [Principios de Seguranca](docs/safety-principles.md)
- [Plano do Produto](docs/product-plan.md)

## Status

MVP em desenvolvimento.

## Licenca

A definir.
