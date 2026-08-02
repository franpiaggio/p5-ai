import { Injectable, BadRequestException } from '@nestjs/common';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GroqProvider } from './providers/groq.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { OpencodeProvider } from './providers/opencode.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { UsersService } from '../users/users.service';
import { ChatRequestDto, ImageAttachmentDto } from './dto/chat.dto';
import type {
  LLMMessage,
  LLMProvider,
  ModelInfo,
} from './providers/llm.interface';
import { canAcceptImages, supportsVisionByName } from './model-capabilities';

const SYSTEM_PROMPT_BASE = `You are an expert creative coding assistant specializing in p5.js and generative art.

## RESPONSE FORMAT

You have TWO response formats. Choose based on how much code changes:

### Format A — Full code (for new sketches, major rewrites, or when >40% of code changes)
- Brief explanation (1-3 sentences) before the code
- Complete, runnable p5.js code in a \`\`\`javascript or \`\`\`typescript block
- Use this for: first sketch, starting from scratch, large structural changes
- CRITICAL: a code block replaces the ENTIRE file. It must contain the complete
  file from the first line to the last — every function and variable, including
  the ones you did not change. NEVER put an excerpt or fragment in a code block;
  if you only want to change a few lines, use Format B instead.

### Format B — Search/replace blocks (for small targeted edits)
- Brief explanation (1-3 sentences) before the blocks
- One or more search/replace blocks that patch the existing code:

<<<SEARCH
  background(240, 60, 8);
===
  background(200, 80, 15);
>>>REPLACE

- Each block replaces an exact match of the SEARCH section with the REPLACE section
- Include enough surrounding context lines (2-3) so the match is unambiguous
- You can use multiple blocks in one response for changes in different parts of the file
- Use this for: color changes, value tweaks, adding/removing a few lines, small fixes
- The SEARCH text must match the user's current code EXACTLY (whitespace included)

### Common rules for both formats
- Minimal code comments — only for non-obvious logic
- When fixing bugs, state what changed in one line
- If the request is ambiguous, ask a short clarifying question

## CODE RULES
- Always use global mode with setup() and draw()
- Only vanilla p5.js — no external libraries unless explicitly requested
- Use colorMode(HSB, 360, 100, 100, 100) for richer palettes
- ALWAYS use createCanvas(windowWidth, windowHeight) and include windowResized() { resizeCanvas(windowWidth, windowHeight); } so the sketch fills the viewport and adapts to resize — unless the user explicitly requests a fixed size
- Sketches must be responsive by default — never hardcode pixel dimensions for the canvas

## PERFORMANCE (critical — sketches run on mobile too)
- Target 60fps on mid-range phones: keep draw() under ~8ms
- Limit particle/object counts (200-500 max, not thousands)
- Avoid per-frame allocations: reuse arrays, pre-create objects in setup()
- Use pixelDensity(1) for any pixel manipulation or heavy rendering
- Prefer simple shapes (circle, rect, line) over complex paths when possible
- For noise fields, use a coarse grid (20-40px cells) not per-pixel
- Minimize calls to text(), shadow, and filter() — they are expensive on mobile
- If using WEBGL, keep polygon counts low and avoid post-processing shaders

## VISUAL QUALITY
- NEVER use raw primary colors — use cohesive palettes (analogous, complementary, monochromatic with saturation/brightness variation)
- Background should rarely be pure white or black — use deep tones with hue (e.g. background(240, 60, 8) in HSB)
- Use alpha transparency for depth and visual accumulation
- Use noise() (Perlin) instead of random() for organic, smooth movement
- Vary speeds — not everything should move at the same pace
- Use frameCount as a time variable to animate parameters
- Consider fade trails: background(r, g, b, alpha) with low alpha instead of solid clear
- Vary scales — large elements with small details create visual interest

## INTERACTIVITY (only when relevant or requested)
- mouseX/mouseY: control visual parameters (size, color, speed, angle) via map()
- mouseIsPressed/mousePressed(): generate elements, toggle states, apply forces
- keyPressed(): toggle modes, reset, save frame

## TECHNIQUES (use when appropriate)
- Flow Fields: grid of noise()-generated vectors, particles following with trails
- Particle Systems: classes with pos/vel/acc/life, forces, constellation connections
- Generative Geometry: beginShape()/endShape(), radial patterns, spirals, noise deformation
- Physics: Verlet integration, springs, flocking (boids)
- Pixel Manipulation: loadPixels()/updatePixels(), metaballs, cellular automata (use pixelDensity(1))
- Fractals: recursive trees/shapes with push()/pop(), mouse-controlled recursion depth
- 3D/WEBGL: createCanvas(w, h, WEBGL), noise terrain, custom geometry, orbitControl()

## USEFUL PATTERNS
- Trail effect: background(hue, sat, bri, 3-8) for fade trails
- Noise loop: use cos(t)*r, sin(t)*r as noise coordinates for smooth cycling
- Mouse attraction: force vector from particle to mouse, setMag(), vel.limit()
- Proximity connections: draw lines between nearby points with distance-mapped alpha
- Particle lifecycle: spawn with velocity + decay, remove when life <= 0

## LANGUAGE
- Respond in the same language the user writes in
- Code must ALWAYS be entirely in English: variable names, function names, comments, and string literals used in logic — unless the user explicitly asks otherwise
- Only translate your explanations and conversational text outside code blocks

## RESPONSE INTENT
- If the user asks a question or requests an explanation, respond conversationally — do NOT output a code block unless they explicitly ask for code changes
- Explain concepts, describe what specific parts of the code do, or answer questions in plain text
- Only include a \`\`\`javascript or \`\`\`typescript code block when the user is requesting new code, modifications, or a fix

## CDN Libraries
The user may have CDN libraries loaded (e.g. p5.sound, ml5.js). These are listed when provided. You can reference their APIs in your code. If the user needs a library that isn't loaded, mention they should add it via the Libraries panel.`;

/** File-layout rules for the default mode: everything stays in one file. */
const FILE_LAYOUT_SINGLE = `## FILE LAYOUT — SINGLE FILE (this sketch)
This sketch is a SINGLE file (\`sketch.js\`, or \`sketch.ts\` in TypeScript sketches). Keep it that way.
- Put ALL code — classes, helper functions, constants, palettes — in that one file.
- Emit exactly ONE code block per response (or search/replace blocks for that same file).
- NEVER emit \`// filename:\` headers, NEVER use \`[NEW FILE]\`, NEVER propose extra files.
- Do NOT use \`import\` / \`export\`: everything shares one global scope, so a class or function defined anywhere in the file is available everywhere.
- Order inside the file: classes and helpers first, then \`setup()\` / \`draw()\` and the other p5 hooks.
- If the user explicitly asks to split the sketch into several files, keep this reply in one file and tell them to turn on multi-file mode in the Files panel first.`;

/** File-layout rules once the user (or sketch size) has opted into multi-file. */
const FILE_LAYOUT_MULTI = `## FILE LAYOUT — MULTI-FILE (enabled for this sketch)
The sketch may span several JS/TS files. When provided, all files are shown with headers like \`// filename: utils.js\`.

### Targeting files in responses
- To modify a specific file, start the code block with a comment: \`// filename: utils.js\`
- To create a new file, use: \`// filename: particle.js [NEW FILE]\` (full code blocks only — search/replace cannot create files)
- A code block with no filename comment targets the entry file (\`sketch.js\`, or \`sketch.ts\` in TypeScript sketches)
- For search/replace blocks, put \`// filename: utils.js\` on its own line directly ABOVE \`<<<SEARCH\`. ALWAYS include it when the sketch has more than one file. A block without it is applied to the file whose current content contains the SEARCH text.

### Keep the file count as low as possible
- Fewer files is better. Edit the files that already exist instead of adding new ones.
- Only create a file when the user asked for it, or when the entry file has grown genuinely unwieldy (400+ lines) and a whole system can move out cleanly. Never create a file for a handful of lines.
- The entry file (\`sketch.js\` / \`sketch.ts\`) always holds \`setup()\`/\`draw()\`. Helper classes/systems go in their own file (e.g. \`particle.js\`, \`palette.js\`). Match the sketch's existing extension for new files.
- Files run as globals in load order (the entry file last), so a class/function defined in one file is available in the others — no imports needed.
- A routine edit (colors, values, a small fix) never changes the file layout: patch the file that owns that code and nothing else.`;

/** The sketch's file layout is decided by the client (see `allowMultiFile`), so
 * the layout rules are swapped into the prompt per request instead of listing
 * both modes and hoping the model picks the right one. */
export function buildSystemPrompt(allowMultiFile: boolean): string {
  const layout = allowMultiFile ? FILE_LAYOUT_MULTI : FILE_LAYOUT_SINGLE;
  return `${SYSTEM_PROMPT_BASE}\n\n${layout}\n\nThe user's current code is provided for context.`;
}

const DEMO_MODEL = 'llama-3.3-70b-versatile';
const DEMO_GEMINI_MODEL = process.env.GEMINI_DEMO_MODEL || 'gemini-2.0-flash';

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_IMAGES = 12;
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_TEXT_BYTES = 250_000;
const MAX_MESSAGE_TEXT_BYTES = 100_000;

const FENCED_JS_BLOCK_REGEX =
  /```(?:javascript|js|jsx|typescript|ts|tsx)\s*\n[\s\S]*?```/g;
const SEARCH_REPLACE_BLOCK_REGEX =
  /(?:^\/\/[ \t]*filename:[ \t]*\S+[ \t]*\n)?<<<SEARCH\n[\s\S]*?\n>>>REPLACE/gm;
const CODE_OMITTED_NOTE =
  '[previous code omitted — the current sketch code above already includes every applied change]';

@Injectable()
export class ChatService {
  constructor(
    private openaiProvider: OpenAIProvider,
    private anthropicProvider: AnthropicProvider,
    private groqProvider: GroqProvider,
    private geminiProvider: GeminiProvider,
    private deepseekProvider: DeepSeekProvider,
    private opencodeProvider: OpencodeProvider,
    private openRouterProvider: OpenRouterProvider,
    private usersService: UsersService,
  ) {}

  /** Ordered free-tier providers behind demo mode. Only those with a configured
   * key are included; the demo stream tries them in turn. */
  private demoCandidates(): {
    provider: LLMProvider;
    model: string;
    apiKey: string;
    label: string;
  }[] {
    const candidates: {
      provider: LLMProvider;
      model: string;
      apiKey: string;
      label: string;
    }[] = [];
    if (process.env.GROQ_API_KEY) {
      candidates.push({
        provider: this.groqProvider,
        model: DEMO_MODEL,
        apiKey: process.env.GROQ_API_KEY,
        label: 'groq',
      });
    }
    if (process.env.GEMINI_API_KEY) {
      candidates.push({
        provider: this.geminiProvider,
        model: DEMO_GEMINI_MODEL,
        apiKey: process.env.GEMINI_API_KEY,
        label: 'gemini',
      });
    }
    return candidates;
  }

  /** Stream demo mode through the free-tier chain, falling back to the next
   * provider when one fails *before* producing any output (e.g. rate limit or
   * misconfiguration). Once tokens have started flowing a mid-stream failure is
   * surfaced as-is — we can't cleanly switch providers mid-response. */
  private async *streamDemo(messages: LLMMessage[]): AsyncGenerator<string> {
    const candidates = this.demoCandidates();
    if (!candidates.length) {
      throw new Error(
        'Demo mode is not configured. Please use your own API key in Settings.',
      );
    }

    let lastError: unknown;
    for (const candidate of candidates) {
      const iterator = candidate.provider
        .stream(messages, candidate.model, candidate.apiKey)
        [Symbol.asyncIterator]();
      let yielded = false;
      try {
        while (true) {
          const next = await iterator.next();
          if (next.done) return;
          yielded = true;
          yield next.value;
        }
      } catch (error) {
        lastError = error;
        // Already streaming — can't fall back without duplicating output.
        if (yielded) throw error;
        // Otherwise try the next free provider.
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Demo mode is temporarily unavailable. Please try again.');
  }

  async resolveApiKey(
    provider: string,
    bodyApiKey?: string,
    userId?: string,
  ): Promise<string> {
    // opencode manages provider auth on its own server — no key to resolve here.
    if (provider === 'demo' || provider === 'opencode') return '';
    if (bodyApiKey) return bodyApiKey;
    if (userId) {
      const key = await this.usersService.getProviderKey(userId, provider);
      if (key) return key;
    }
    throw new BadRequestException(
      'API key is required. Provide it in the request body or store it in your account settings.',
    );
  }

  private estimateBase64Bytes(base64: string): number {
    const normalized = base64.replace(/\s/g, '');
    return Math.floor((normalized.length * 3) / 4);
  }

  private validateAndCountImages(
    images: ImageAttachmentDto[] | undefined,
    context: string,
  ): number {
    if (!images?.length) return 0;

    let totalBytes = 0;

    for (const img of images) {
      const estimated = this.estimateBase64Bytes(img.base64);
      totalBytes += estimated;

      if (estimated > MAX_IMAGE_BYTES) {
        throw new BadRequestException(
          `Image in ${context} exceeds maximum size of ${MAX_IMAGE_BYTES / 1024 / 1024}MB`,
        );
      }

      let buf: Buffer;
      try {
        buf = Buffer.from(img.base64, 'base64');
      } catch {
        throw new BadRequestException('Invalid base64 image data');
      }

      if (buf.length > MAX_IMAGE_BYTES) {
        throw new BadRequestException(
          `Image in ${context} exceeds maximum size of ${MAX_IMAGE_BYTES / 1024 / 1024}MB`,
        );
      }

      if (img.mimeType === 'image/png') {
        const valid = PNG_MAGIC.every((b, i) => buf[i] === b);
        if (!valid) {
          throw new BadRequestException(
            'Image content does not match declared PNG type',
          );
        }
      } else if (img.mimeType === 'image/jpeg') {
        const valid = JPEG_MAGIC.every((b, i) => buf[i] === b);
        if (!valid) {
          throw new BadRequestException(
            'Image content does not match declared JPEG type',
          );
        }
      }
    }

    return totalBytes;
  }

  private enforceImageBudgets(request: ChatRequestDto): void {
    let totalBytes = 0;
    let totalCount = request.images?.length ?? 0;

    totalBytes += this.validateAndCountImages(
      request.images,
      'current message',
    );

    for (const msg of request.history) {
      totalBytes += this.validateAndCountImages(msg.images, 'history');
      totalCount += msg.images?.length ?? 0;
    }

    if (totalCount > MAX_TOTAL_IMAGES) {
      throw new BadRequestException(
        `Too many images provided (${totalCount}). Max ${MAX_TOTAL_IMAGES} per request including history.`,
      );
    }

    if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
      throw new BadRequestException(
        `Images exceed maximum combined size of ${MAX_TOTAL_IMAGE_BYTES / 1024 / 1024}MB`,
      );
    }
  }

  /** Replace code suggestions inside older assistant messages with a short note.
   * Their full code duplicates the current-code context (and each other), easily
   * multiplying input tokens several times over. The newest assistant message is
   * kept intact so follow-ups like "apply what you just suggested" keep their
   * referent. User messages are never touched. */
  private stripHistoryCode(
    history: ChatRequestDto['history'],
  ): ChatRequestDto['history'] {
    if (!history?.length) return history ?? [];

    let lastAssistant = -1;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'assistant') {
        lastAssistant = i;
        break;
      }
    }

    return history.map((msg, i) => {
      if (msg.role !== 'assistant' || i === lastAssistant) return msg;
      const content = msg.content
        .replace(FENCED_JS_BLOCK_REGEX, CODE_OMITTED_NOTE)
        .replace(SEARCH_REPLACE_BLOCK_REGEX, CODE_OMITTED_NOTE);
      return content === msg.content ? msg : { ...msg, content };
    });
  }

  private clampHistory(
    history: ChatRequestDto['history'],
  ): ChatRequestDto['history'] {
    if (!history?.length) return [];

    const capped = history.slice(-MAX_HISTORY_MESSAGES);
    const kept: typeof capped = [];
    let textBytes = 0;

    for (let i = capped.length - 1; i >= 0; i--) {
      const msg = capped[i];
      const content = msg.content.slice(0, MAX_MESSAGE_TEXT_BYTES);
      const contentBytes = Buffer.byteLength(content, 'utf8');

      if (contentBytes > MAX_MESSAGE_TEXT_BYTES) {
        throw new BadRequestException('Message content is too large');
      }

      if (textBytes + contentBytes > MAX_HISTORY_TEXT_BYTES) {
        continue;
      }

      kept.push({ ...msg, content });
      textBytes += contentBytes;
    }

    return kept.reverse();
  }

  async *streamChat(request: ChatRequestDto): AsyncGenerator<string> {
    const history = this.clampHistory(this.stripHistoryCode(request.history));
    this.enforceImageBudgets({ ...request, history });

    // Never silently drop an attached image: reject up front if the chosen
    // model/provider can't take image input. (The client hides the attach
    // button for these, so this only fires if the model changed after
    // attaching.) Only the current turn's images are guarded — stale history
    // images are dropped by the text-only providers themselves.
    if (
      request.images?.length &&
      !canAcceptImages(request.config.provider, request.config.model)
    ) {
      throw new BadRequestException(
        "This model doesn't support image input. Remove the image or switch to a vision-capable model.",
      );
    }

    const codeFence =
      request.language === 'javascript' ? 'javascript' : 'typescript';

    // Build code context. A one-file sketch is shown as plain code — the
    // `// filename:` headers are multi-file syntax and repeating them for a
    // lone sketch.js invites the model to answer with more files.
    const files = request.files ?? [];
    const isMultiFile = files.length > 1;
    const codeBody = isMultiFile
      ? files.map((f) => `// filename: ${f.name}\n${f.content}`).join('\n\n')
      : (files[0]?.content ?? request.code);
    const codeBlock = `\`\`\`${codeFence}\n${codeBody}\n\`\`\``;
    let codeContext = isMultiFile
      ? `Current p5.js sketch files:\n${codeBlock}`
      : `Current p5.js code (single file — ${files[0]?.name ?? 'sketch.js'}):\n${codeBlock}`;

    if (request.libraries && request.libraries.length > 0) {
      const libList = request.libraries
        .map((l) => `- ${l.name} (${l.url})`)
        .join('\n');
      codeContext += `\n\nLoaded CDN libraries:\n${libList}`;
    }

    const messages: LLMMessage[] = [
      { role: 'system', content: buildSystemPrompt(!!request.allowMultiFile) },
      { role: 'user', content: codeContext },
    ];

    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: msg.content,
        ...(msg.images?.length ? { images: msg.images } : {}),
      });
    }

    messages.push({
      role: 'user',
      content: request.message,
      ...(request.images?.length ? { images: request.images } : {}),
    });

    if (request.config.provider === 'demo') {
      yield* this.streamDemo(messages);
      return;
    }

    const providers: Record<string, LLMProvider> = {
      openai: this.openaiProvider,
      anthropic: this.anthropicProvider,
      deepseek: this.deepseekProvider,
      opencode: this.opencodeProvider,
      openrouter: this.openRouterProvider,
    };

    const provider = providers[request.config.provider];
    if (!provider)
      throw new Error(`Unknown provider: ${request.config.provider}`);

    yield* provider.stream(
      messages,
      request.config.model,
      request.config.apiKey!,
      // A full-rewrite response is a near-copy of the current code — providers
      // that support speculative decoding (OpenAI Predicted Outputs) use this.
      { prediction: codeBlock },
    );
  }

  async listModels(provider: string, apiKey: string): Promise<ModelInfo[]> {
    const raw = await this.rawListModels(provider, apiKey);
    // Fill in vision for providers that don't report it (everyone but
    // OpenRouter) from the model-name heuristic, so every model carries an
    // explicit flag the client can gate the image button on.
    return raw.map((m) => ({
      id: m.id,
      vision: m.vision ?? supportsVisionByName(provider, m.id),
    }));
  }

  private async rawListModels(
    provider: string,
    apiKey: string,
  ): Promise<ModelInfo[]> {
    switch (provider) {
      case 'openai':
        return this.openaiProvider.listModels(apiKey);
      case 'anthropic':
        return this.anthropicProvider.listModels(apiKey);
      case 'deepseek':
        return this.deepseekProvider.listModels(apiKey);
      case 'opencode':
        return this.opencodeProvider.listModels();
      case 'openrouter':
        return this.openRouterProvider.listModels(apiKey);
      case 'demo': {
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey) return this.groqProvider.listModels(groqKey);
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) return this.geminiProvider.listModels(geminiKey);
        return [{ id: DEMO_MODEL }];
      }
      default:
        return [];
    }
  }
}
