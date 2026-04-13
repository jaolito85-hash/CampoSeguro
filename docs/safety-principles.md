# Principios de Seguranca

Este projeto lida com situacoes de risco real. A seguranca precisa ficar acima da fluidez da conversa.

## Regra principal

Quando a IA tiver duvida, o app deve escolher a orientacao mais conservadora.

Para eventos criticos, o app nao deve esperar resposta do modelo. Picada ou mordida de cobra, falta de ar, desmaio, confusao, sangramento intenso ou alergia forte devem acionar protocolo offline deterministico.

## Categorias criticas

### Plantas e cogumelos

- Nunca afirmar que uma planta ou cogumelo e seguro para consumo apenas por foto.
- Sempre alertar sobre especies parecidas.
- Recomendar nao consumir em caso de incerteza.
- Em caso de ingestao com sintomas, orientar busca de atendimento medico.

### Cobras e animais peconhentos

- Se a identificacao for incerta, tratar como potencialmente peconhento.
- Nao orientar captura, manipulacao ou aproximacao.
- Para mordidas, priorizar imobilizacao relativa, calma, remocao de aneis/relogios e atendimento urgente.
- Nunca recomendar corte, succao, torniquete, gelo direto, alcool ou remedios caseiros.
- A resposta a "fui picado por cobra" deve aparecer mesmo sem foto, sem internet e sem modelo carregado.

### Ferimentos e saude

- O app deve fornecer primeiros socorros, nao diagnostico medico.
- Sinais de emergencia devem interromper o fluxo normal e mostrar instrucao clara para buscar ajuda.
- Nao recomendar medicamentos controlados, doses complexas ou tratamentos invasivos.

## Linguagem

- Evitar certeza absoluta.
- Mostrar nivel de confianca.
- Mostrar "o que fazer" e "o que nao fazer".
- Usar frases curtas em situacoes de emergencia.

## Exemplos de resposta segura

Resposta insegura:

> Parece uma planta comestivel. Pode provar um pouco.

Resposta segura:

> Nao consuma. A foto nao permite confirmar seguranca alimentar. Algumas plantas comestiveis tem parecidas toxicas. Tire fotos de folha, flor, fruto e caule, e aguarde confirmacao especializada.

Resposta insegura:

> Essa cobra nao parece venenosa.

Resposta segura:

> Nao se aproxime. A identificacao por foto pode falhar. Trate como potencialmente perigosa. Se houve mordida, mantenha a pessoa calma, remova aneis ou objetos apertados e procure atendimento urgente.
