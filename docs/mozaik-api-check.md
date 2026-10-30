# Mozaik 4.1.0 API verification

Checked the installed `node_modules/@mozaik-ai/core/dist/index.d.ts` before implementation. Version is pinned exactly in package.json and package-lock.json. No deep imports or undocumented scheduler APIs.

| Used public API | Installed declaration lines | Use |
| --- | --- | --- |
| `ModelMessageItem.rehydrate`, `ModelContext.create`, `addContextItem`, `getItems`, `id` | 32–109 | Official mock output and isolated per-loop context |
| `SituationSpecification`, `SituationContext`, `SemanticEvent.create` | 136–180 | Agent reactions and state-ready events |
| `InferenceInput`, `InferenceOutput`, `InferenceRunner`, `Endpoint` | 281–318 | Controlled inference and model adapters |
| `Agent.getId`, `createAgent`, `createHuman` | 157–170, 420–468 | Four agents and observers |
| `RuntimeState`, `defineRuntime`, `initializeRuntime`, `join`, `sendEvent`, `runLoop`, `getInferenceRunner` | 469–511 | One shared session plus a participant-free holder for the default runner |
| `supportedModels`, endpoint `endpointMapper.toRequest/toResponse` | 302–318, 513 | Registered provider selection and native wire mapping |
| `StructuredOutputFormat` | inference input and exported type | JSON schemas; Zod validates application output again |

The [official custom inference runner example](https://github.com/jigjoy-ai/mozaik-examples/blob/8e063bdf198de830567721a12bb1581c95a5ae78/custom-inference-runner/src/runner.ts) returns `ModelMessageItem.rehydrate`, unknown token usage and a terminal `inference.output` stream event. Our mock follows that pattern and uses local domain recipes. It is not a real language model.

The [official installation documentation](https://docs.jigjoy.ai/docs/installation), [models documentation](https://docs.jigjoy.ai/docs/models), preparation reference, and installed provider implementation identify `GEMINI_API_KEY` and `ANTHROPIC_API_KEY`. Mozaik's registry uses provider `google` for Gemini. Names default to `gemini-3.5-flash-lite` and `claude-haiku-4-5` respectively; model availability at a real account is untested.

Version-specific behavior handled explicitly:

- `runLoop` returns void. We wait for observed `model.answer`, never await its return value. The actual start event is `message_received.started` with `loopId`.
- Each task gets its own `ModelContext`; no concurrent mutable conversation reuse.
- Core 4.1.0 can leave rejected loop promises unhandled. The runner returns an explicit `applicationError` envelope on terminal failure; the workflow records `stopped`, never acceptance.
- Core 4.1.0 also has no valid next transition for empty or reasoning-only inference output. The runner supplies a terminal `ModelMessageItem` plus an internal validation error so the producing agent can correct it. Provider usage is retained. Only runner-recorded failures can stop directly; a model cannot forge an `applicationError` to bypass validation.
- Gemini's bundled mapper omits the output cap. Our Endpoint retains that mapper and supplies `config.maxOutputTokens` using `@google/genai`'s installed `GenerateContentParameters` declaration. `HttpOptions.retryOptions.attempts=1` disables Gemini SDK retries. Anthropic's public client option `maxRetries=0` disables its SDK retries. Every inference attempt is then admitted by our shared policy runner.
- The participant-free holder obtains Mozaik's default runner, including its input validation, through public `getInferenceRunner()`; we do not construct its unexported validator.
- Core's Cloud visitor can export full payloads when it discovers credentials. We blank its two key variables and point `MOZAIK_CREDENTIALS_FILE` at a fresh nonexistent path before loops begin. Local-only tracing is deliberate. Its repeated “telemetry disabled” warning is harmless.

Offline tests exercise both native SDK request/response mappings with intercepted HTTP, including output caps, usage fields and a 429 with exactly one SDK attempt. This is **not a live-provider result**.
