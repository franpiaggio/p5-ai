import { Injectable } from '@nestjs/common';
import type { OpencodeClient } from '@opencode-ai/sdk';
import type { LLMProvider, LLMMessage } from './llm.interface';

const DEFAULT_BASE_URL = 'http://127.0.0.1:4096';

/** Some opencode models treat a flattened "User: ... / Assistant: ..." blob as
 * plain text to continue rather than a chat turn to reply to, and echo the
 * prompt back verbatim before answering. This instruction heads that off. */
const TRANSCRIPT_INSTRUCTION =
  'The user message below is the conversation so far, formatted as "User: ..." / "Assistant: ..." lines and ending with the latest user message. Reply only with your answer to that final message — do not repeat, quote, or echo any part of the transcript, and do not prefix your reply with "Assistant:".';

type ApiErrorLike = { name?: string; data?: { message?: string } } | undefined;

/** Talks to a local `opencode serve` instance instead of a hosted LLM API —
 * lets local dev use opencode's own provider credits. Models are addressed
 * as "providerID/modelID" (opencode's own catalog, e.g. "anthropic/claude-opus-4-6"). */
@Injectable()
export class OpencodeProvider implements LLMProvider {
  private baseUrl(): string {
    return process.env.OPENCODE_BASE_URL || DEFAULT_BASE_URL;
  }

  // Dynamic import: @opencode-ai/sdk ships ESM-only, this backend is CJS.
  private async client(): Promise<OpencodeClient> {
    const { createOpencodeClient } = await import('@opencode-ai/sdk');
    return createOpencodeClient({ baseUrl: this.baseUrl() });
  }

  private splitModel(model: string): { providerID: string; modelID: string } {
    const slash = model.indexOf('/');
    if (slash <= 0 || slash === model.length - 1) {
      throw new Error(
        'opencode model must be in "provider/model" format (e.g. anthropic/claude-opus-4-6) — pick one from the model list.',
      );
    }
    return {
      providerID: model.slice(0, slash),
      modelID: model.slice(slash + 1),
    };
  }

  private describeError(error: ApiErrorLike): string {
    return error?.data?.message || error?.name || 'Unknown opencode error';
  }

  /** Network failures (server not running) surface as a rejected fetch, not
   * a typed API error — give a hint pointing at `opencode serve` either way. */
  private connectionHint(cause: unknown): string {
    const raw = cause instanceof Error ? cause.message : String(cause);
    return `Opencode: could not reach the local server at ${this.baseUrl()} (${raw}). Run "opencode serve" and check OPENCODE_BASE_URL.`;
  }

  /** Awaits an opencode SDK call, turning a rejected fetch into a connection
   * hint. A resolved `{error}` response is passed through for the caller to
   * describe — that's an API-level error, not a connectivity one. */
  private async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      throw new Error(this.connectionHint(error));
    }
  }

  private async createSession(client: OpencodeClient): Promise<string> {
    const created = await this.call(() =>
      client.session.create({ body: { title: 'p5-ai chat' } }),
    );
    if (created.error || !created.data?.id) {
      throw new Error(this.describeError(created.error as ApiErrorLike));
    }
    return created.data.id;
  }

  // No apiKey param: opencode's own server manages provider auth.
  async *stream(messages: LLMMessage[], model: string): AsyncGenerator<string> {
    const client = await this.client();
    const { providerID, modelID } = this.splitModel(model);
    const systemMessage = messages.find((m) => m.role === 'system');

    // opencode sessions carry their own history, but this app resends the
    // full conversation on every request — so each call gets a throwaway
    // session and prior turns are flattened into one prompt.
    const transcript = messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const system = [systemMessage?.content, TRANSCRIPT_INSTRUCTION]
      .filter(Boolean)
      .join('\n\n');

    const sessionID = await this.createSession(client);

    try {
      yield* this.streamSession(
        client,
        sessionID,
        providerID,
        modelID,
        system,
        transcript,
      );
    } finally {
      client.session.delete({ path: { id: sessionID } }).catch(() => {});
    }
  }

  private async *streamSession(
    client: OpencodeClient,
    sessionID: string,
    providerID: string,
    modelID: string,
    system: string | undefined,
    transcript: string,
  ): AsyncGenerator<string> {
    const { stream: events } = await client.event.subscribe();

    // Fired without awaiting the full reply — `promptAsync` returns as soon
    // as the turn starts, and the text streams back as
    // `message.part.updated` events on the subscription above.
    const promptOutcome = this.call(() =>
      client.session.promptAsync({
        path: { id: sessionID },
        body: {
          model: { providerID, modelID },
          system,
          parts: [{ type: 'text', text: transcript }],
        },
      }),
    ).then((res) =>
      res.error
        ? new Error(this.describeError(res.error as ApiErrorLike))
        : null,
    );
    // A rejected promptOutcome (connectivity) would otherwise become an
    // unhandled rejection while we read the event loop below.
    promptOutcome.catch(() => {});

    // Tracks text already yielded per part, so an event without a `delta`
    // (e.g. the first update for a part) can still be turned into one.
    const seenLength = new Map<string, number>();

    for await (const event of events) {
      if (event.type === 'message.part.updated') {
        const part = event.properties.part;
        if (part.type === 'text' && part.sessionID === sessionID) {
          const prevLength = seenLength.get(part.id) ?? 0;
          const delta = event.properties.delta ?? part.text.slice(prevLength);
          if (delta) yield delta;
          seenLength.set(part.id, part.text.length);
        }
        continue;
      }
      if (
        event.type === 'session.error' &&
        (!event.properties.sessionID ||
          event.properties.sessionID === sessionID)
      ) {
        throw new Error(this.describeError(event.properties.error));
      }
      if (
        event.type === 'session.idle' &&
        event.properties.sessionID === sessionID
      ) {
        break;
      }
    }

    const promptError = await promptOutcome;
    if (promptError) throw promptError;
  }

  async listModels(): Promise<string[]> {
    const client = await this.client();
    const result = await this.call(() => client.config.providers());
    if (result.error || !result.data) {
      throw new Error(this.describeError(result.error as ApiErrorLike));
    }
    const models: string[] = [];
    for (const provider of result.data.providers) {
      for (const modelID of Object.keys(provider.models)) {
        models.push(`${provider.id}/${modelID}`);
      }
    }
    return models.sort();
  }
}
