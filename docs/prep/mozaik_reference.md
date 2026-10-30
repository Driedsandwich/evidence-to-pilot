# Mozaik 4.1.0 実装用リファレンス／2026年9月大会の受賞作調査

調査日：2026年10月30日（日本時間）。目的は大会前の調査資料であり、応募プロジェクトの実装ではない。公開資料の閲覧、依存パッケージの取得、独立した scratch フォルダでの API 検証だけを行った。アカウント作成、主催者への連絡、有料モデルの呼び出しは行っていない。

**先に押さえること**：4.1.0 の `runLoop` は `void`。結果はイベントで受け取る。開始イベントは docs の `context_update.*` ではなく **`message_received.*`**。同一 agent の複数 loop も重なるので、可変 `ModelContext` の使い回しに注意する。以下の TypeScript スニペットはすべて実際にコンパイルした。モデル呼び出しは mock で検証し、実 Anthropic／Gemini の応答品質・課金・API 受理は検証していない。

## 第1部：大会中の coding agent 向け Mozaik 4.1.0 リファレンス

### 1. 参照版と検証の範囲

| 対象 | 固定した版・読み方 |
|---|---|
| core | [v4.1.0](https://github.com/jigjoy-ai/mozaik/tree/v4.1.0)、実体 commit `349db8006a3b701d5d697b9395f8bb1f6ac4de71`（2026-10-02）。既定ブランチの最新版とは区別した。 |
| npm | `@mozaik-ai/core@4.1.0`。npm の `gitHead` は上記 commit と一致。公開 `.d.ts` と実行 bundle でも検証。 |
| docs | [公式 docs](https://docs.jigjoy.ai/docs) の調査日現在の内容。バージョン固定 URL ではないため、食い違いは 4.1.0 のコードを優先。 |
| examples | [公式 examples の固定 commit](https://github.com/jigjoy-ai/mozaik-examples/tree/8e063bdf198de830567721a12bb1581c95a5ae78)（2026-10-29）。各例の core 依存は `4.1.0`。 |
| 検証環境 | Linux、Node.js `22.23.4`、TypeScript `5.9.3`、`@types/node` `22.20.5`。`strict: true`、`skipLibCheck: false`。 |

npm tarball integrity：`sha512-tMH/07veyjvof40zsOhYZAWk0PU/RCI9EXf+kJPtEe0vBs7ldKqj0awkCvIIXWAB4oi0ex0mK27NZ2LqMyTTdQ==`。

以下の `.ts` ブロックは、見出しのファイル名で**同じ scratch ディレクトリ**に保存する相互依存のある小例である。単独コピペを前提とする断片ではない。`error-probe.ts` は失敗の再現専用で、通常の実行例から import しない。インストールとコンパイルに用いた設定は次のとおり。

```sh
npm install --ignore-scripts --save-exact @mozaik-ai/core@4.1.0 typescript@5.9.3 @types/node@22.20.5
npx tsc -p tsconfig.json
node dist/demo.js
```

```json
{"compilerOptions":{"target":"ES2022","module":"NodeNext","moduleResolution":"NodeNext","strict":true,"skipLibCheck":false,"outDir":"dist","types":["node"]},"include":["*.ts"]}
```

検証用 `package.json` は上記 dependencies だけで、`type: "module"` は指定していない。`.js` の相対 import は TypeScript が対応する `.ts` に解決する。実モデルのキーは不要。検証時は Cloud キーも空にし、`MOZAIK_CREDENTIALS_FILE` を存在しない scratch 内のパスに向けた。Cloud 未設定の警告は出たが、Cloud 接続は行っていない。

### 2. 正確な公開シグネチャ

下表は 4.1.0 の source と npm の `dist/index.d.ts` を照合したもの。`RuntimeService`、`GenerativeModel`、`Memory`、`FunctionTool`、`InferenceInputValidator` は型の説明に登場するが、**すべてがパッケージ直下から named import できるわけではない**。公開 export は [src/index.ts](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/index.ts) を確認する。

| API | シグネチャ／型 |
|---|---|
| runtime factory | `defineRuntime<TRuntimeState extends RuntimeState>()`。下記8関数を持つオブジェクトを返す。 |
| 初期化 | `initializeRuntime(config: { state: TRuntimeState; inferenceRunnerConfig?: InferenceRunnerConfig }): RuntimeService<TRuntimeState>` |
| runtime 解決 | `resolveRuntime(): RuntimeService<TRuntimeState>` |
| participant 解決 | `resolveParticipant(id: string): Participant` |
| 加入／離脱 | `join(participant: Participant): void` / `leave(participant: Participant): void` |
| メッセージ | `sendMessage(message: string, senderId: string): void` |
| 任意イベント | `sendEvent(event: SemanticEvent, senderId: string): void` |
| loop 開始 | `runLoop(agentId: string, message: string, inferenceInput: InferenceInput, interceptionHandler?: InterceptionHandler): void` |
| runner 設定 | `InferenceRunnerConfig = { supportedModels?: GenerativeModel[]; runner?: InferenceRunner }` |
| agent | `createAgent({ name, capabilities, instruction, tools, handlers }: { name: string; capabilities: readonly string[]; instruction: string; tools: Tool[]; handlers: SituationHandler[] }): Agent` |
| human／observer | `createHuman({ name, capabilities, handlers }: { name: string; capabilities: readonly string[]; handlers: SituationHandler[] }): Human` |
| handler | `SituationHandler` は `readonly specification: SituationSpecification` と `readonly processor: SituationProcessor` を持つ。 |
| 条件 | `abstract SituationSpecification<TEvent extends SemanticEvent = SemanticEvent>` の `isSatisfiedBy(situationContext: SituationContext<TEvent>): boolean`。`and(other: SituationSpecification<TEvent>): SituationSpecification<TEvent>`、`or(other: SituationSpecification<TEvent>): SituationSpecification<TEvent>`、`not(): SituationSpecification<TEvent>`。 |
| processor | `apply(context: SituationContext): void \| Promise<void>` |
| situation context | `SituationContext<TEvent extends SemanticEvent = SemanticEvent> = { readonly event: TEvent; readonly participant: Participant }` |
| event | `new SemanticEvent<TType extends string = string, TPayload = unknown>(type: TType, producerId: string, occurredAt: Date, payload: TPayload)` |
| event factory | `SemanticEvent.create<TType extends string = string, TPayload = unknown>(type: TType, producerId: string, payload: TPayload): SemanticEvent<TType, TPayload>` |
| tool | `Tool = FunctionTool`。フィールドは `type: 'function'; name: string; description: string; parameters: Record<string, any>; strict: boolean; invoke: (args: any) => Promise<any>`。 |
| inference 入力 | `InferenceInput = { model: string; maxOutputTokens?: number; reasoningEffort?: string; tools?: Tool[]; streaming?: boolean; structuredOutput?: StructuredOutputFormat; context: ModelContext }` |
| JSON schema | `StructuredOutputFormat = { name?: string; schema: Record<string, any>; strict?: boolean }` |
| inference 出力 | `InferenceOutput = { items: (FunctionCallItem \| ReasoningItem \| ModelMessageItem)[]; tokenUsage: TokenUsage \| undefined; rowResponse: any }` |
| runner | `run(request: InferenceInput): Promise<InferenceOutput>` / `stream(request: InferenceInput): AsyncGenerator<SemanticEvent>` |
| default runner | `new DefaultInferenceRunner(supportedModels: GenerativeModel[], requestValidator: InferenceInputValidator)`。第2引数は必須。 |
| interception | `isSatisfiedBy(transition: ExecutableTransition): boolean` / `handle(transition: ExecutableTransition): Promise<ExecutableTransition>` |

返り値の型を公開 API から導出するなら `ReturnType<typeof defineRuntime<AppState>>`、モデル要素の型なら `(typeof supportedModels)[number]` を使える。`rowResponse` は誤記に見えても**実際のプロパティ名**であり、`rawResponse` へ直さない。docs では `unknown` と書かれているが 4.1.0 の型は `any`。

根拠：[runtime factory](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/define-runtime.ts)、[createAgent](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/application/use-cases/create-agent.ts)、[inference types](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/application/states/inference.ts)、[situation types](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/domain/agentic-environment/situation/situation-handler.ts)、[event](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/domain/agentic-environment/semantic-event/event.ts)、[tool](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/domain/generative-model/tool.ts)。

### 3. runtime・共有状態・tool

`RuntimeState` は abstract class なので継承して使う。既存の participant registry にアプリのデータを追加する。初期化は **`defineRuntime()` が作る各 closure につき一度**であり、プロセス全体に一つしか runtime を作れないという意味ではない。`initializeRuntime` より前の利用と、同じ closure の二重初期化は例外になる。[公式 runtime docs](https://docs.jigjoy.ai/docs/runtime)、[RuntimeState 実装](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/domain/agentic-environment/runtime-state.ts)。

`join`、`sendMessage`、`runLoop` などは package root の直接 export ではなく、`defineRuntime()` の返す関数である。同じ runtime の関数群をアプリ内で共有し、agent ごとに別々の runtime を作ってしまわない。

共有状態は通常の可変オブジェクトで、更新を自動通知する proxy や transaction ではない。状態変更を他 agent に知らせるなら明示的にイベントを出す。単一 event loop でも、`await` をまたぐ read-modify-write には競合が起こるため、予算枠の予約などは最初の `await` より前に行う。[公式 shared-state 例](https://github.com/jigjoy-ai/mozaik-examples/blob/8e063bdf198de830567721a12bb1581c95a5ae78/shared-state/src/runtime.ts)。

tool は `createAgent.tools` と `runLoop` の `InferenceInput.tools` の両方へ渡す。登録しただけでは loop に自動で渡らない。JSON Schema は provider 向けであり、この例でも `invoke` 内の入力チェックを別途実装している。[公式 tools docs](https://docs.jigjoy.ai/docs/tools)。

**検証スニペット：`runtime.ts`**

```ts
import { defineRuntime, RuntimeState, type Tool } from '@mozaik-ai/core';

export class AppState extends RuntimeState {
  notes: string[] = [];
}
export const rt = defineRuntime<AppState>();
export const noteTool: Tool = {
  type: 'function', name: 'add_note', description: '共有ノートへ追記する',
  parameters: {
    type: 'object', properties: { text: { type: 'string' } },
    required: ['text'], additionalProperties: false,
  },
  strict: true,
  invoke: async ({ text }: { text: string }) => {
    if (typeof text !== 'string') throw new Error('text must be a string');
    rt.resolveRuntime().state.notes.push(text);
    return { saved: true };
  },
};
```

### 4. モデルを使わない mock runner

公式 [custom-inference-runner/src/runner.ts](https://github.com/jigjoy-ai/mozaik-examples/blob/8e063bdf198de830567721a12bb1581c95a5ae78/custom-inference-runner/src/runner.ts) は `ModelMessageItem.rehydrate({ text })` で返信を作り、stream の最後に `inference.output` を出す。以下はその公開 API に基づく検証用の小例で、遅延と tool call、架空の usage を加えた。

`stream()` が最終 `inference.output` を返さないと、loop は `Inference output not found` で失敗する。ここで設定するトークン数は検証用の値であり、実モデルの計測ではない。[streaming state 実装](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/application/states/inference-streaming.ts)。

**検証スニペット：`mock.ts`**

```ts
import {
  FunctionCallItem, FunctionCallOutputItem, ModelMessageItem, SemanticEvent,
  TokenUsage, InputTokenDetails, OutputTokenDetails,
  type InferenceInput, type InferenceOutput, type InferenceRunner,
} from '@mozaik-ai/core';

export class MockRunner implements InferenceRunner {
  active = 0;
  peak = 0;
  async run(input: InferenceInput): Promise<InferenceOutput> {
    this.peak = Math.max(this.peak, ++this.active);
    try {
      await new Promise(resolve => setTimeout(resolve, 20));
      const useTool = input.tools?.length && !input.context.getItems()
        .some(item => item instanceof FunctionCallOutputItem);
      return {
        items: [useTool
          ? FunctionCallItem.rehydrate({ callId: crypto.randomUUID(),
              name: input.tools![0].name, args: JSON.stringify({ text: 'mock note' }) })
          : ModelMessageItem.rehydrate({ text: JSON.stringify({ ok: true }) })],
        tokenUsage: new TokenUsage(10, 5, 15,
          new InputTokenDetails(0), new OutputTokenDetails(0)),
        rowResponse: { mock: true, model: input.model },
      };
    } finally { this.active--; }
  }
  async *stream(input: InferenceInput): AsyncGenerator<SemanticEvent> {
    yield SemanticEvent.create('inference.output', input.model, await this.run(input));
  }
}
```

### 5. instructions・situation handler・loop 起動・structured output

`createAgent` は instruction を `DeveloperMessageItem` として agent memory に入れる。直列の会話なら `agent.getMemory().getContext()` を渡せる。**同じ agent の loop を並行させる場合は、新しい `ModelContext` を毎回作る**。`addContextItem(s)` は元の配列を変更して `this` を返すので、同じ memory を使うと別 loop の入力や tool 結果が混ざる。この小例は各依頼の独立性を優先し、過去の会話履歴は引き継がない。[Agent 実装](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/domain/agentic-environment/participant/agent.ts)、[ModelContext 実装](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/domain/model-context/model-context.ts)。

条件を満たす participant は各自 `runLoop` を開始する。`sendMessage` は宛先指定ではなく broadcast である。自己反応や意図しない無限会話は `event.type`、`producerId`、依頼 ID などで制限する。`processor.apply` の Promise を runtime は await しない。[公式 situation handlers](https://docs.jigjoy.ai/docs/situation-handlers)。

structured output は別の item 型ではなく、`model.answer` の `answer: ModelMessageItem` の **`answer.content.text`** に JSON が入る。`JSON.parse` に加え、実用途ではアプリ側の schema 検証も行う。mock 成功は provider による schema 強制を証明しない。[公式 structured output](https://docs.jigjoy.ai/docs/structured-output)、[公式 schema 例](https://github.com/jigjoy-ai/mozaik-examples/blob/8e063bdf198de830567721a12bb1581c95a5ae78/structured-output/src/schema.ts)。

**検証スニペット：`agents.ts`**

```ts
import {
  Agent, createAgent, ModelContext, DeveloperMessageItem, SituationSpecification,
  type SituationContext, type SituationHandler, type StructuredOutputFormat,
} from '@mozaik-ai/core';
import { rt, noteTool } from './runtime.js';

export const resultSchema: StructuredOutputFormat = {
  name: 'result', strict: true,
  schema: { type: 'object', properties: { ok: { type: 'boolean' } },
    required: ['ok'], additionalProperties: false },
};
class OnRequest extends SituationSpecification {
  isSatisfiedBy({ event, participant }: SituationContext): boolean {
    return ['message.sent', 'task.requested'].includes(event.type)
      && event.producerId !== participant.getId();
  }
}
export const handler: SituationHandler = {
  specification: new OnRequest(),
  processor: { apply({ event, participant }) {
    if (!(participant instanceof Agent)) return;
    const message = (event.payload as { message: string }).message;
    // 同じ agent の複数 loop も重なるため、可変 context は loop ごとに新規作成する。
    const context = ModelContext.create().addContextItem(
      DeveloperMessageItem.create(participant.getDeveloperMessage()));
    rt.runLoop(participant.getId(), message, {
      model: participant.getManifest().name === 'A'
        ? 'claude-sonnet-4-6' : 'gemini-3.5-flash',
      context, tools: participant.getTools(), structuredOutput: resultSchema,
    });
  } },
};
export const agents = ['A', 'B'].map(name => createAgent({
  name, capabilities: ['inference'], instruction: 'ノートを1件追記し、JSONで回答する。',
  tools: [noteTool], handlers: [handler],
}));
```

### 6. observer：loop 別の時刻・モデル・usage

observer 専用 factory はない。`createHuman` に観測用 handler を与えればよい。4.1.0 の loop visitor は**すべての loop イベントの payload に `loopId` を追加**する。`producerId` だけで集計すると同じ agent の同時 loop を取り違える。[EventPublisherLoopVisitor](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/domain/agentic-environment/loop/event-publisher-visitor.ts)。

| イベント | 4.1.0 の payload（各行に `loopId: string` が追加される） |
|---|---|
| `message_received.started` | `{ content: string, input: InferenceInput }` |
| `message_received.completed` | `InferenceInput` |
| `inference.started` | `InferenceInput`。ここでモデル名を記録する。 |
| `inference.stream` | 内側の provider event のプロパティが展開されたもの。provider により形は異なる。 |
| `inference.completed` | `InferenceOutput`。ここで usage を記録する。 |
| `function_call.started` | `{ call: FunctionCallItem, inferenceInput: InferenceInput }` |
| `function_call.completed` | `FunctionCallOutputItem` のプロパティ。`loopId` 追加時に spread されるため payload 自体の `instanceof` 判定に依存しない。 |
| `model.answer` | `{ answer: ModelMessageItem }` |
| `interception.started` / `interception.finished` | pending／確定後の transition |

`TokenUsage` の実フィールドは `inputTokens`、`outputTokens`、`totalTokens`、`inputTokenDetails.cached_tokens`、`outputTokenDetails.reasoning_tokens`。`tokenUsage` が `undefined` なら **不明**として残す。token 数は金額ではなく、キャッシュ・思考 token の内訳を再加算すると二重計上し得る。[TokenUsage 実装](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/domain/generative-model/token-usage.ts)。

以下は ISO 時刻と monotonic な経過時間を両方記録し、tool の前後に発生する複数推論を `spans` に残す。`model.answer` までの時間を測っており、汎用的な loop 完了イベントを想定していない。失敗・中断・回答なしの loop は `answeredAt` がないまま残るため、実装時は期限監視と失敗記録も必要になる。

**検証スニペット：`trace.ts`**

```ts
import {
  createHuman, SituationSpecification,
  type SituationContext, type InferenceInput, type InferenceOutput,
  type ModelMessageItem,
} from '@mozaik-ai/core';

type Span = { model: string; startedMs: number; endedMs?: number;
  usage?: InferenceOutput['tokenUsage'] };
export type LoopTrace = { agentId: string; startedAt: string; startedMs: number;
  answeredAt?: string; elapsedMs?: number; spans: Span[]; answer?: unknown };
export const loops = new Map<string, LoopTrace>();
export const events: { type: string; loopId: string; at: string }[] = [];

class LoopEvents extends SituationSpecification {
  isSatisfiedBy({ event }: SituationContext): boolean {
    return typeof (event.payload as { loopId?: unknown } | null)?.loopId === 'string';
  }
}
export const observer = createHuman({ name: 'Trace', capabilities: [], handlers: [{
  specification: new LoopEvents(),
  processor: { apply({ event }) {
    const p = event.payload as { loopId: string };
    events.push({ type: event.type, loopId: p.loopId, at: event.occurredAt.toISOString() });
    const now = performance.now();
    if (event.type === 'message_received.started') {
      loops.set(p.loopId, { agentId: event.producerId,
        startedAt: event.occurredAt.toISOString(), startedMs: now, spans: [] });
    }
    const row = loops.get(p.loopId);
    if (!row) return;
    if (event.type === 'inference.started') {
      row.spans.push({ model: (event.payload as InferenceInput).model, startedMs: now });
    }
    if (event.type === 'inference.completed') {
      const span = row.spans.at(-1);
      if (span) {
        span.endedMs = now;
        span.usage = (event.payload as InferenceOutput).tokenUsage;
      }
    }
    if (event.type === 'model.answer') {
      row.answeredAt = event.occurredAt.toISOString();
      row.elapsedMs = now - row.startedMs;
      const { answer } = event.payload as { answer: ModelMessageItem };
      try { row.answer = JSON.parse(answer.content.text); }
      catch { row.answer = { parseError: true, text: answer.content.text }; }
    }
  } },
}] });
```

### 7. 2 agents を加入させ、message と任意 event を送る

`sendEvent(event, senderId)` は sender の加入を検査するが、event 自身の `producerId` を上書きしたり、sender と同一か検査したりしない。通常は以下のように両者を一致させる。[send-event 実装](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/application/use-cases/send-event.ts)。

ここでは一つの入力が A と B を起動する。すぐ次の event も送るため、計4 loop が重なる。`Promise.all([runLoop(...), runLoop(...)])` では完了を待てない。例の待機は observer の回答記録を期限付きで監視している。

**検証スニペット：`demo.ts`**

```ts
import assert from 'node:assert/strict';
import { createHuman, SemanticEvent } from '@mozaik-ai/core';
import { AppState, rt } from './runtime.js';
import { agents } from './agents.js';
import { MockRunner } from './mock.js';
import { observer, loops, events } from './trace.js';

async function main() {
  const mock = new MockRunner();
  rt.initializeRuntime({ state: new AppState(), inferenceRunnerConfig: { runner: mock } });
  const human = createHuman({ name: 'User', capabilities: [], handlers: [] });
  rt.join(observer); // 入力を送る前に登録する。
  rt.join(human);
  agents.forEach(rt.join);
  rt.sendMessage('最初の依頼', human.getId());
  rt.sendEvent(SemanticEvent.create('task.requested', human.getId(),
    { message: '別の依頼' }), human.getId());
  // runLoop 自体は await できない。検証では回答イベントを期限付きで待つ。
  const deadline = performance.now() + 2000;
  while ([...loops.values()].filter(row => row.answeredAt).length < 4) {
    if (performance.now() > deadline) throw new Error('answer timeout');
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.equal(loops.size, 4);
  assert.ok(mock.peak >= 2);
  assert.equal(rt.resolveRuntime().state.notes.length, 4);
  for (const row of loops.values()) {
    assert.deepEqual(row.answer, { ok: true });
    assert.equal(row.spans.length, 2); // tool 前後の推論
    assert.equal(row.spans.reduce((n, s) => n + (s.usage?.totalTokens ?? 0), 0), 30);
  }
  assert.ok(events.every(e => !e.type.startsWith('context_update.')));
  console.log(JSON.stringify({ peak: mock.peak, loops: [...loops.values()] }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
```

**実測結果（mock）**：`peak = 4`、agent 数2、loop 数4、共有ノート4件。各 loop は推論2回、合成 usage は input 20／output 10／total 30。初回の実測では loop 所要時間は約66.8〜76.6 ms。これは 20 ms の mock 遅延を含むテスト値であり、実 LLM の性能値ではない。同じ agent の2 loop も干渉せず完了した。

### 8. Anthropic と Gemini のモデル選択

モデルは `createAgent` の設定項目ではなく **`InferenceInput.model`** で選ぶ。標準 runner は `supportedModels` の `specification.name` と完全一致する要素を探し、その endpoint を使う。名前に `anthropic/` や `google/` を自動付加しない。[標準 runner](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/application/services/inference-runner.ts)、[登録一覧](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/application/services/models.ts)。

| adapter | 4.1.0 に登録されている model 文字列 | キー |
|---|---|---|
| `AnthropicMessages` | `claude-haiku-4-5`, `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-opus-4-8`, `claude-sonnet-5`, `claude-sonnet-5-5`, `claude-opus-5-5`, `claude-fable-5-1` | `ANTHROPIC_API_KEY` |
| `GeminiGenerateContent` | `gemini-3.5-flash`, `gemini-3.1-pro-preview`, `gemini-3.5-flash-lite`, `gemini-3.8-flash` | `GEMINI_API_KEY` |

これは **Mozaik 4.1.0 の登録値**であり、各アカウントからの提供状況や provider の現在の仕様を保証する一覧ではない。今回、実 API の受理は試していない。すべての上記登録仕様は streaming・function calling・structured output を true としている。`reasoningEffort` の許容値はモデルごとに違うため、`supportedModels` の対応 specification から読む。

docs の Models ページは Anthropic を4モデル、Gemini を2モデルしか掲載しておらず、この版の全登録一覧にはなっていない。また docs の provider 表記は `gemini` だが、実際の Gemini specification の `provider` は **`google`**。フィルタ時に注意する。[公式 Models](https://docs.jigjoy.ai/docs/models)、[Gemini specification](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/infrastructure/providers/gemini/models/gemini-3-5-flash.ts)。

各 endpoint の constructor は `constructor(endpointMapper: InferenceEndpointMapper = ..., config: { baseURL?: string; apiKey?: string } = {})`。connection config は**第2引数**。通常は環境変数だけでよい。`.env` を使う公式例は `import "dotenv/config"` を明示している。ファイルを置くだけで provider 用環境変数がすべて読み込まれるとは考えない。[Anthropic endpoint](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/infrastructure/providers/anthropic/endpoints/anthropic-messages.ts)、[Gemini endpoint](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/infrastructure/providers/gemini/endpoints/gemini-generate-content.ts)、[installation docs](https://docs.jigjoy.ai/docs/installation)。

**検証スニペット：`models.ts`**

```ts
import {
  supportedModels, AnthropicMessages, GeminiGenerateContent, ModelContext,
  DeveloperMessageItem, UserMessageItem, type InferenceInput,
} from '@mozaik-ai/core';
import { resultSchema } from './agents.js';

export function requestFor(model: string): InferenceInput {
  if (!supportedModels.some(m => m.specification.name === model)) {
    throw new Error(`Unknown bundled model: ${model}`);
  }
  return { model, maxOutputTokens: 256, structuredOutput: resultSchema,
    context: ModelContext.create().addContextItems([
      DeveloperMessageItem.create('JSONで応答する。'), UserMessageItem.create('確認して。'),
    ]) };
}
export const anthropic = requestFor('claude-sonnet-4-6');
export const gemini = requestFor('gemini-3.5-flash');
// 明示的な接続設定も可能。mapper を省略するため第1引数は undefined。
export const endpoints = [
  new AnthropicMessages(undefined, { apiKey: process.env.ANTHROPIC_API_KEY }),
  new GeminiGenerateContent(undefined, { apiKey: process.env.GEMINI_API_KEY }),
];
export const nativeRequests = [
  endpoints[0].endpointMapper.toRequest(anthropic),
  endpoints[1].endpointMapper.toRequest(gemini),
]; // wire 形式への変換のみ。ネットワーク呼び出しは行わない。
```

**変換まで検証済み**：Anthropic は JSON Schema を `output_config.format`、Gemini は `config.responseMimeType = "application/json"` と `config.responseSchema` に変換した。共通の `strict` / `name` がすべての provider へ同じ wire field として渡るわけではない。

**予算に関わる実装差**：この入力の `maxOutputTokens: 256` は Anthropic では `max_tokens: 256` になるが、Gemini mapper では送られない。型が受理しても出力 token 上限として機能しないため、Gemini の費用上限をこの設定だけに依存させない。[Anthropic mapper](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/infrastructure/providers/anthropic/endpoints/anthropic-messages-mapper.ts)、[Gemini mapper](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/infrastructure/providers/gemini/endpoints/gemini-generate-content-mapper.ts)。

### 9. 標準 runner を包む retry・予算・時間計測

公式 custom runner 例は **標準 runner を置換する mock** である。独自 runner を指定すると runtime はそちらを使い、併記した `supportedModels` を自動注入も検証もしない。標準のモデル解決・入力検証・provider 変換を残すには、標準 runner に委譲する wrapper を作る。[defineRuntime 実装](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/define-runtime.ts)。

`DefaultInferenceRunner` の constructor は validator を要求するが、`InferenceInputValidator` は package root の export にない。内部の `src/...` へ deep import したり、`any` で validator を偽装したりせず、別の小さな runtime を一度初期化し、公開メソッド `getInferenceRunner(): InferenceRunner` から標準実装を取得できる。この holder には participant を加入させず、loop も開始しない。後掲 `default-wrapper.ts` がその例。

次の `PolicyRunner` は **呼び出し試行数の予算**を同期的に予約し、429／5xx を限定再試行し、各試行のモデル・時刻・所要時間・返った usage を残す。stream は部分出力の二重配信を避けるため自動再試行しない。

**検証スニペット：`policy.ts`**

```ts
import { type InferenceInput, type InferenceOutput, type InferenceRunner,
  type SemanticEvent } from '@mozaik-ai/core';

type Attempt = { contextId: string; model: string; attempt: number;
  startedAt: string; ms: number; usage?: InferenceOutput['tokenUsage']; error?: string };
export class PolicyRunner implements InferenceRunner {
  readonly attempts: Attempt[] = [];
  private used = 0;
  private readonly deadline: number;
  constructor(private readonly inner: InferenceRunner, private readonly budget: number,
    durationMs: number, private readonly retries = 1) {
    this.deadline = performance.now() + durationMs;
  }
  private reserve(): void {
    if (performance.now() >= this.deadline) throw new Error('admission deadline');
    if (this.used >= this.budget) throw new Error('attempt budget exhausted');
    ++this.used; // await より前に予約。同じ runner を使う全 loop で共有する。
  }
  async run(input: InferenceInput): Promise<InferenceOutput> {
    for (let attempt = 1; ; attempt++) {
      this.reserve();
      const row: Attempt = { contextId: input.context.id, model: input.model,
        attempt, startedAt: new Date().toISOString(), ms: 0 };
      const start = performance.now();
      this.attempts.push(row);
      try {
        const output = await this.inner.run(input);
        row.usage = output.tokenUsage;
        return output;
      } catch (error) {
        row.error = String(error);
        const status = (error as { status?: number } | null)?.status;
        if (attempt > this.retries ||
            !(status === 429 || (typeof status === 'number' && status >= 500 && status < 600))) {
          throw error;
        }
      } finally { row.ms = performance.now() - start; }
      await new Promise(resolve => setTimeout(resolve, 25 * 2 ** (attempt - 1)));
    }
  }
  async *stream(input: InferenceInput): AsyncGenerator<SemanticEvent> {
    this.reserve();
    const row: Attempt = { contextId: input.context.id, model: input.model,
      attempt: 1, startedAt: new Date().toISOString(), ms: 0 };
    const start = performance.now();
    this.attempts.push(row);
    try {
      for await (const event of this.inner.stream(input)) {
        if (event.type === 'inference.output') {
          row.usage = (event.payload as InferenceOutput).tokenUsage;
        }
        yield event;
      }
    } catch (error) { row.error = String(error); throw error; }
    finally { row.ms = performance.now() - start; }
  }
}
```

**検証スニペット：`default-wrapper.ts`**

```ts
import { defineRuntime, RuntimeState, supportedModels, DefaultInferenceRunner }
  from '@mozaik-ai/core';
import { PolicyRunner } from './policy.js';

// 公開 API から validator 設定済みの標準 runner を得る。
class EmptyState extends RuntimeState {}
const holder = defineRuntime<EmptyState>();
const base = holder.initializeRuntime({ state: new EmptyState(),
  inferenceRunnerConfig: { supportedModels } }).getInferenceRunner();
if (!(base instanceof DefaultInferenceRunner)) throw new Error('unexpected runner');
export const wrapped = new PolicyRunner(base, 20, 60_000, 1);
export const configured = defineRuntime<EmptyState>();
configured.initializeRuntime({ state: new EmptyState(),
  inferenceRunnerConfig: { runner: wrapped } });
```

この例の制御範囲は明確に区別する。

- `budget = 20` は wrapper から inner runner を呼ぶ回数の上限。初回、retry、tool 後の追加推論、stream 開始を消費する。provider SDK 内部の再試行は数えられず、HTTP リクエスト数や請求額の厳密な上限ではない。
- `durationMs = 60_000` は wrapper 作成からの**新規試行の受付期限**。4.1.0 の `InferenceInput`／`InferenceRunner` に AbortSignal はないため、進行中の推論を60秒で止めるものではない。`Promise.race` で待機を止めても provider 実行は止まらない。
- `row.usage` は成功応答で返された使用量。失敗した試行にも費用が発生する可能性があり、不明な usage を0円と見なさない。金額を推定する場合はモデルごとの料金・cache 条件・思考 token の扱いを別途持つ。ここでは架空の単価を置いていない。
- loop の `inference.started`〜`inference.completed` は retry と backoff を含む全体時間。wrapper の `attempts` は個々の inner 呼び出し時間。loop の started payload の `context.id` と `attempts.contextId` を対応させると、retry を同じ loop に帰属できる（本例のように context を loop ごとに分けること）。
- **この wrapper は最終失敗を再 throw する**。そのまま runtime 内で失敗すると次節の未処理 rejection になる。`default-wrapper.ts` は組み込み・初期化を検証した例であり、障害を正常回答に変換する境界は含まない。大会実装では runner の最終失敗をアプリの失敗イベントと明示的な失敗出力に変換する、または worker process を監視する等の方針を決める。失敗を成功回答として記録しない。

**検証済み**：429 を1回返してから成功する runner で retry／attempt log／usage を検証。予算2枠を使い切ると次回を拒否。残り1枠に2件同時投入して成功は1件だけ。受付期限0で拒否。非429／5xxは再試行なし。stream の terminal output・usage も検証。実 `DefaultInferenceRunner` に mock endpoint を渡し、wrapper 経由でモデル解決と validation を通って成功することも確認した。実 provider への委譲成功は未検証。

### 10. 4.1.0 の落とし穴と docs／実装の差

| 項目 | 4.1.0 で確認した挙動と実装への影響 |
|---|---|
| `runLoop` の戻り値 | `undefined`。`await` も `Promise.all` も loop の終了を待たない。結果は observer の `model.answer` などから受け取る。 |
| loop 内の推論・stream・interception 例外 | `agentLoop.run(...)` の Promise を返さず catch もしていない。呼び出し側の `try/catch` では拾えず、Node の設定次第でプロセス終了になる。自動 `loop.error` イベントもない。 |
| tool 内の例外 | `JSON.parse(call.args)` と `invoke` は標準 tool runner が catch し、`Error calling tool: ...` という tool output に変換。loop 全体の失敗とは異なる。 |
| 未知の tool 名 | error tool output を context に追加して再推論するが、`function_call.started` に対応する `function_call.completed` は発行されない。tool の in-flight カウンタが完了イベントだけに依存すると残る。 |
| handler の例外 | fan-out は同期。同期 handler が throw すると後続 participant への配信も中断。async processor の rejection も runtime は回収しない。「遅い listener は他を block しない」という docs は、同期 CPU 処理や同期 throw まで無害という意味ではない。 |
| 再入可能な publish | handler 内で次の event を即 publish できる。別 participant が元 event より先に派生 event を観測し得る。単純なログ順序を全員共通の因果順と見なさない。 |
| 開始 state／event | docs の `context_update` / `context_update.started` / `.completed` に対し、コードは `message_received` / `message_received.started` / `.completed`。interception の state 判定も実装名を使う。 |
| `loopId` | docs 表では明示が限定的だが、4.1.0 の loop visitor は各 payload に追加する。9月の旧版 README の「`model.answer` に loop id がない」を転記しない。 |
| 重複 join | state の registry 追加は no-op。しかし `participant.joined` は再度発行される。docs の「joining an id already present is a no-op」はイベントまで含めると不正確。 |
| state と context | shared state には自動 transaction がない。context は in-place 更新。別 agent でも同じ context オブジェクトを渡せば分離されない。 |
| 複数 tool call | transition rule は `find` で最初の function call を選ぶ。単一推論に複数 tool calls が返ってもすべてを実行する設計ではない。1回に1 call を出す前提を含めて確認する。 |
| interception の停止 | 公開 `handle` は `Promise<ExecutableTransition>`。`idle` を返す停止 API ではない。古い版の例や cast で `idle` を渡さない。 |
| model 情報 | docs の一覧は4.1.0より少ない。Gemini specification の provider は `google`。登録されていることと provider が現在受理することは別。 |
| 出力 token 上限 | Gemini mapper が `maxOutputTokens` を転送しないことを再現。標準 validator のルールにも token 数・context 長の上限チェックは含まれていない。specification の数値だけで予算や長さが保証されるとは考えない。 |
| `rowResponse` | source／`.d.ts` は `any`、docs は `unknown`。名前は双方 `rowResponse`。 |

根拠：[run-loop](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/application/use-cases/run-loop.ts)、[AgentLoop](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/domain/agentic-environment/loop/agent-loop.ts)、[tool runner](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/application/services/function-call.ts)、[function-call state](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/application/states/function-call.ts)、[EventProcessor](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/domain/agentic-environment/semantic-event/event-processor.ts)、[RuntimeService](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/application/services/runtime.ts)、[transition rules](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/domain/agentic-environment/loop/transition-rule.ts)、[interception](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/domain/agentic-environment/loop/interception.ts)、[validator](https://github.com/jigjoy-ai/mozaik/blob/v4.1.0/src/domain/generative-model/request-validation/inference-request-validator.ts)。比較対象：[runtime docs](https://docs.jigjoy.ai/docs/runtime)、[loop docs](https://docs.jigjoy.ai/docs/agent-loop)、[event docs](https://docs.jigjoy.ai/docs/semantic-events)、[interception docs](https://docs.jigjoy.ai/docs/interception)。

次は失敗の再現専用。**コンパイル成功、実行は意図どおり exit 1**。`node --unhandled-rejections=strict dist/error-probe.js` で `returned: undefined` の後に `deliberate inference failure` が出て、`outer catch reached` と `survived` は出なかった。

**検証スニペット：`error-probe.ts`**

```ts
import { defineRuntime, RuntimeState, createAgent, ModelContext, type InferenceRunner }
  from '@mozaik-ai/core';
class State extends RuntimeState {}
const rt = defineRuntime<State>();
const runner: InferenceRunner = {
  async run() { throw new Error('deliberate inference failure'); },
  async *stream() { throw new Error('deliberate stream failure'); },
};
rt.initializeRuntime({ state: new State(), inferenceRunnerConfig: { runner } });
const a = createAgent({ name: 'failure probe', capabilities: [], instruction: '', tools: [], handlers: [] });
rt.join(a);
try {
  const result = rt.runLoop(a.getId(), 'x', { model: 'mock', context: ModelContext.create() });
  console.log('returned:', result);
} catch { console.log('outer catch reached'); }
setTimeout(() => console.log('survived'), 100);
```

### 11. 検証記録

全9個の `.ts` 掲載ブロックは scratch の検証済みファイルからそのまま埋め込んだ。下表の hash は各ファイルの SHA-256 の先頭16桁。

完成した Markdown から9ブロックと `tsconfig.json` を別フォルダへ抽出し、再コンパイル成功・`demo.js` の exit 0・peak 4／4 loop を確認した。

| ファイル | コンパイル | 実行確認 | SHA-256（先頭） |
|---|---|---|---|
| `runtime.ts` | 成功 | 初期化・共有ノート4件・tool invoke | `b3088ff6a213ba88` |
| `mock.ts` | 成功 | 通常／stream・tool call・合成 usage | `cb9a16f5bd4f9173` |
| `agents.ts` | 成功 | 2 agents／4同時 loop・JSON出力設定 | `d3dbd7c06c147781` |
| `trace.ts` | 成功 | loopId・時刻・model・各推論のusage・回答 | `547a8e7ae9bedfb2` |
| `demo.ts` | 成功 | exit 0、peak 4、各loop 2推論／30 tokens | `3d4c0b81a395c17c` |
| `models.ts` | 成功 | adapterのnative request変換。実APIは未実行 | `7c04e4f83d0e13a9` |
| `policy.ts` | 成功 | retry・同時予算予約・受付期限・stream・標準runner委譲 | `875bd4a31288523e` |
| `default-wrapper.ts` | 成功 | 標準runner取得・wrapper注入・未登録model拒否。実APIは未実行 | `bd8726d2a745f505` |
| `error-probe.ts` | 成功 | 期待したexit 1、外側catchでは捕捉できないことを再現 | `9f66a423a5a00c31` |

追加の検証 harness（掲載例から分離）では、未初期化・二重初期化・未加入 sender の例外、重複 join の再通知、sender と producerId が異なる event のそのまま配信、stream payload の loopId、未知 tool の completed 欠落、tool 内例外の出力化、同期 handler 例外による後続配信中断も確認した。

公式 `custom-inference-runner` の `src` 一式も取得した固定 commit のまま TypeScript でコンパイルし、標準例の mock で実行した。exit 0、`Mock reply (no provider called).` の出力を確認した。他の公式例は参照・API照合に使用したが、実 provider での実行確認はしていない。

検証 scratch：`(pre-event scratch folder)`。詳細 harness は `checks.ts` と `edge-checks.ts`、stdout/stderr も同フォルダに保存した。本 Markdown だけで掲載例を復元できる。プロジェクト本体には変更を加えていない。

## 第2部：2026年9月大会の受賞作と並行性の説明

### 12. 対象大会・証拠の扱い

9月版は **Build with Mozaik**、制作週末は9月5〜6日、受賞発表は9月13日。[公式 winners](https://build.jigjoy.ai/winners)。NTP Novi Sad の案内からリンクされている前回ギャラリーは [9月版 gallery](https://jigjoy.ai/editions/build-2026/gallery)（同内容の [build ドメイン版](https://build.jigjoy.ai/editions/build-2026/gallery) も確認）。現在の `/gallery` は10月版なので混同しない。

受賞は公式 winners で確認した。作品ページには **AI generated** の表示があるため、その説明を作者 README や審査員の発言と同一視しない。取得できた README は GitHub の履歴から **9月13日23:59:59 UTC以前の最後の README 更新 commit**を選んだ。これは締切時提出物の完全な復元ではなく、発表日までに公開されていた README の参照である。作品自体をインストール・実行したり、作者の測定を追試したりはしていない。

公開 winners ページには各作品の詳細な採点・講評は見当たらなかった。リンクされた [受賞発表動画](https://www.youtube.com/watch?v=gHghmMbUTd0) の内容も取得できなかった。したがって以下の「評価されたと考えられる点」は、受賞順位と公開された機能・検証の提示方法を根拠にした**本調査の推測**であり、審査員の引用ではない。引用は短い原文と参照 URL のみを添え、発言を創作しない。

### 13. 上位5作品

| 順位 | 作品 | 公式の賞 |
|---|---|---|
| 1 | Separation | $500、Mozaik Cloud Premium 6か月、daily.dev Plus 12か月 |
| 2 | Metamorph | $300、同上 |
| 3 | Watchtower | $200、同上 |
| 4 | Butterfly | Mozaik Cloud Premium 6か月、daily.dev Plus 12か月 |
| 5 | Hive | 同上 |

順位・賞の出典：[公式 winners](https://build.jigjoy.ai/winners)。

#### 1位：Separation — 並行して形成中の判断を修正する航空管制シミュレーション

**何を作ったか。** 複数の管制 agent が同じ航空機に異なる権限を持つ環境で、個々には安全でも組み合わせると危険になる指示を扱う。Mozaik interception の airlock で未確定の tool call を保持し、peer の異議を受けて高度指示を4000から7000 ftへ狭める。実航空管制への適用を検証した製品ではなく、制御されたシミュレーションである。[作品ページ](https://build.jigjoy.ai/gallery/separation-c7ef86)。

**README の並行性説明。** 同時に開いている2 turn の途中に異議が届いたことを `inflight: 2` と scheduler の状態で示す。記録済み実モデル run の deterministic replay と、3条件×200 seed＝600 run の ablation を分けて提示。作者報告では危険100 seedの separation loss が、逐次相当／commit時検査のみで各100、interlock有効で0。safe seed を変更しない点も示している。測定結果は作者の検証報告として扱う。[9月 README](https://github.com/OoJae/separation/blob/efd4b587ead074fe3b1621fa1d1f3673a44c9d2e/README.md)。

> “A narrowing, not a refusal.” — [README](https://github.com/OoJae/separation/blob/efd4b587ead074fe3b1621fa1d1f3673a44c9d2e/README.md)

**評価されたと考えられる点（推測）。** 並行性が結果を変える理由を具体的な失敗場面で示し、単なる高速化を超えて途中の相互作用を証明したこと。比較条件と再生可能な証拠があり、審査時に確認しやすい。

#### 2位：Metamorph — framework 移行を行う agent CLI

**何を作ったか。** codebase を shadow workspace に複製し、Mapper、Worker、Reviewer、PackageManager などで移行する CLI。原本への適用は review 後の新規 Git branch 操作に分離し、ダッシュボードで進捗を見る。[9月 README](https://github.com/yohanvillarp/metamorph/blob/ef3ce81da5d94ef3d89558beacc31fdb6dcfaa4a/README.md)。

**README の並行性説明。** 9月版 README は役割分担と Mozaik による agent 群を説明する一方、同時実行数や時間的 overlap の証明までは詳述していない。より具体的な情報は**ギャラリー側**にあり、Worker／Reviewer はそれぞれ最大3件、event bus と共有 migration plan で連携し、Coordinator の監視後に Integration を開始すると説明される。Reporter は install/build と同時に動くとの記載もある。この細部を README に書かれていたこととして扱わない。[作品ページ](https://build.jigjoy.ai/gallery/metamorph-602b9d)。

> “Shadow Workspace” — [README](https://github.com/yohanvillarp/metamorph/blob/ef3ce81da5d94ef3d89558beacc31fdb6dcfaa4a/README.md)

**評価されたと考えられる点（推測）。** 開発者の具体的な作業に結びつき、複数ファイルの並行処理、review、build、差分確認までの流れを見せたこと。README が使い方と適用前の確認手順を明確にしている点も伝わりやすい。

#### 3位：Watchtower — Solana の監視・分析・人間承認

**何を作ったか。** Jupiter／Pump.fun の websocket watcher が chain event を発行し、Risk Analyst、Correlator、Briefer、Responder が分析・関連付け・要約・対応提案を行う。人間承認の guardrail は Responder の tool call だけを待たせる。作者は protective action の実行はシミュレーションであり、実際の署名・送金は行わないと明記している。[作品ページ](https://build.jigjoy.ai/gallery/watchtower-225889)、[README](https://github.com/shrooms08/watchtower/blob/fc914b05404612c6589730b48db2c60149f3dfce/README.md)。

**README の並行性説明。** 同一 Analyst の複数 loop も重なり、作者の `pnpm proof`／`pnpm live` で peak 3 を報告。peak が1なら proof を失敗させる。fresh context、eventId による回答相関、予算予約、回答の routing marker も説明する。旧版4.0.0の「model.answerにloop idがない」という説明は、そのまま4.1.0の指針にしない。[9月 README](https://github.com/shrooms08/watchtower/blob/fc914b05404612c6589730b48db2c60149f3dfce/README.md)。

> “Measured, not asserted.” — [README](https://github.com/shrooms08/watchtower/blob/fc914b05404612c6589730b48db2c60149f3dfce/README.md)

**評価されたと考えられる点（推測）。** 実ストリーム、計測可能な overlap、操作可能な承認画面が一つにつながっている。成功条件だけでなく、誤判定や実行が模擬である限界を説明した点も検証しやすい。

#### 4位：Butterfly — 一つの介入から展開が変わる強盗劇

**何を作ったか。** Mastermind、Detective、Insider、Driver の4 agent が同じ世界を違う目的・部分情報で見るシミュレーション。ユーザーの一つの介入に各 agent が反応し、tool が共有状態を更新して次の event を生む。特定の raid／vault action は interception で人間が止められる。[作品ページ](https://build.jigjoy.ai/gallery/butterfly-a2a414)。

**README の並行性説明。** broadcast から4つの loop が独立に開始され、各 agent の開始／終了時刻を UI の bar と headless `npm run prove-concurrency` で表示する。Observer は推論しない participant、frontend は event stream の表示担当と区別する。shared state と役割ごとの可視情報、他 loop を進めたまま一つを保留する仕組みも説明している。[9月 README](https://github.com/ZolekaCoder/Butterfly/blob/4829cab4162371cc3a8c077a74d57e9177cc1336/README.md)。

> “real wall-clock start/end timestamps per agent” — [README](https://github.com/ZolekaCoder/Butterfly/blob/4829cab4162371cc3a8c077a74d57e9177cc1336/README.md)

**評価されたと考えられる点（推測）。** 競合する目的と因果の変化が観客にも理解しやすく、並行実行を画面と検証コマンドの両方で確認できる点。

#### 5位：Hive — 同じ会話で複数 agent が働く Windows デスクトップ

**何を作ったか。** ギャラリーの説明では、Scout が検索、Hive が執筆、Pulse が進捗を監視し、Critic が draft に反応、Sentry が tool を検査する。共有の会話 room と運用 timeline に途中出力と overlap を表示する。[作品ページ](https://build.jigjoy.ai/gallery/hive-1271cd)。

**README の確認状況。** 作品ページの [HiveSOURCE](https://github.com/samkomedved319-dev/HiveSOURCE) は調査時404。説明にある [Hive-Desktop](https://github.com/samkomedved319-dev/Hive-Desktop) も404で、README を直接確認できなかった。以下は README の引用ではなく、公式ギャラリーの説明である。同じ入力で同時に始まるのは Scout／Hive／Pulse、Critic と Sentry はそれぞれ回答／tool による event 駆動と区別されている。

> “Scout, Hive, and Pulse are concurrent.” — [作品ページ](https://build.jigjoy.ai/gallery/hive-1271cd)

**評価されたと考えられる点（推測）。** ユーザーの会話に複数 agent の役割が統合され、その進行状況が一つの UI で分かる点。ただし README 不通のため、実装・計測方法の評価は他4作より不確か。

### 14. Hyperskill Premium 受賞作も含める

公式 winners は上位5作とは別に5件の Hyperskill Premium（各6か月）を掲載する。Separation と Metamorph は重複受賞。追加の3作品は以下。[公式 winners](https://build.jigjoy.ai/winners)。

#### BountyProof

公開ソフトウェア bounty の証拠 snapshot を、availability・payment・eligibility の3 agent が並行にレビューする。2件の findings がそろうと critic が動き、遅い3件目で revision が変われば stale review を破棄して再実行する。README は deterministic replay と実 LLM を明確に分け、信頼できる live review は未完成と明記。受賞の確認は更新前の README ではなく winners に基づく。[作品ページ](https://build.jigjoy.ai/gallery/bountyproof-94cfcf)、[9月 README](https://github.com/chowol0309/bountyproof/blob/3dcab548e3f5153c4da726b8568d2e6987b4842f/README.md)。

> “the stale review is discarded and a new one runs” — [README](https://github.com/chowol0309/bountyproof/blob/3dcab548e3f5153c4da726b8568d2e6987b4842f/README.md)

評価された可能性（推測）は、遅れて到着する情報により結果をやり直す協調を再現可能に示し、引用の検証と未確定事項を隠さない点。

#### Zero-Capital Economic Agent Swarm

元手不要の機会を Scanner が探索し、Market がデータを取得し、Evaluator が評価、Writer が共有 board から計画をまとめる。参照できた README は同一 broadcast から3 worker が開始し、`all.answered` を待って Writer が動く構成、board の読み書きと時刻ログを説明。Observer を含む「5 agents」という数え方と、実際の同時推論主体の数を分けて読む。[作品ページ](https://build.jigjoy.ai/gallery/zero-capital-economic-agent-swarm-2cc82b)、[README表示を含む GitHub ページ](https://github.com/renigat7-cpu/zero-capital-agent-swarm)。

> “All three agents started within 55ms of each other” — [README表示](https://github.com/renigat7-cpu/zero-capital-agent-swarm)

この README は検索サービスが保持する GitHub ページから読めた一方、調査時の GitHub API では404だったため、commit 固定・現状の追認はできなかった。4.0.0-beta.1、`AgenticEnvironment`、dummy key 等の古い記述もあり、4.1.0 の実装資料として流用しない。無資金で収益が得られることを検証したものでもない。評価された可能性（推測）は、役割ごとの独立処理と共有 board の統合を、時刻付きで説明した点。

#### Concurrent Agent-Based Simulation Environment（README 名：Table）

囚人のジレンマ、chicken、共有 pot などのゲームや自由記述シナリオで agent を動かし、固定した仕様から利得・教科書上の結果を示す。README は scoring の根拠、会話ごとの child process、実行制限を説明する一方、ラウンド内並行性の細部は**ギャラリー側**が説明する。一つの broadcast が参加者を起動し、回答カウントの barrier で次の round を開始する。round 内は同時、round 間は逐次という範囲が明示されている。[作品ページ](https://build.jigjoy.ai/gallery/concurrent-agent-based-simulation-environment-d36dab)、[9月 README](https://github.com/dexterfire861/concurrent-agents/blob/dee3be67fc1e5381d7705a9cfd3d6aa284805723/README.md)。

> “The table is not the grader.” — [README](https://github.com/dexterfire861/concurrent-agents/blob/dee3be67fc1e5381d7705a9cfd3d6aa284805723/README.md)

評価された可能性（推測）は、同時選択が意味を持つゲーム理論の題材と、agent の会話から独立した採点基準を組み合わせた点。README の「runtime は一度しか初期化できないため child process」という説明を、4.1.0 のプロセス全体の制約とは解釈しない。

### 15. 受賞作から読み取れる提出説明の要点（推測）

受賞作の資料で繰り返し現れるのは、①誰と誰が同時に動くか、②何を共有するか、③途中の event が他者の判断をどう変えるか、④重なりをどのログ・画面・テストで確認できるか、の4点。単に agent 名を列挙する説明より、Separation の未確定判断の修正、Watchtower の peak 計測、Butterfly の時刻付き表示のように、並行性と結果の関係が確認できる資料が目立つ。

これは9月審査員の公式採点基準を復元したものではない。10月大会の公式案内も実際の同時実行と連携を重視すると述べるが、9月の採点理由と同一視しない。[NTP Novi Sad 大会案内](https://jigjoy.ai/hackathon-2026)。

本資料の範囲では、**並行実行の証拠、共有状態と event の具体的な流れ、実 API／replay／mock の区別、失敗時の挙動**を README に短く書けるようにしておくことが、当日の coding agent に渡す有用な準備になる。

