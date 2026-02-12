import { Injectable, BadRequestException } from '@nestjs/common';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GroqProvider } from './providers/groq.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { ChatRequestDto, ImageAttachmentDto } from './dto/chat.dto';
import type { LLMMessage, LLMProvider } from './providers/llm.interface';

const SYSTEM_PROMPT = `You are an expert creative coding assistant specializing in p5.js and generative art.

## RESPONSE FORMAT

You have TWO response formats. Choose based on how much code changes:

### Format A — Full code (for new sketches, major rewrites, or when >40% of code changes)
- Brief explanation (1-3 sentences) before the code
- Complete, runnable p5.js code in a \`\`\`javascript or \`\`\`typescript block
- Use this for: first sketch, starting from scratch, large structural changes

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

The user's current code is provided for context.`;

const DEMO_MODEL = 'llama-3.3-70b-versatile';

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_IMAGES = 12;
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_TEXT_BYTES = 250_000;
const MAX_MESSAGE_TEXT_BYTES = 100_000;

@Injectable()
export class ChatService {
  constructor(
    private openaiProvider: OpenAIProvider,
    private anthropicProvider: AnthropicProvider,
    private groqProvider: GroqProvider,
    private deepseekProvider: DeepSeekProvider,
  ) {}

  private estimateBase64Bytes(base64: string): number {
    const normalized = base64.replace(/\s/g, '');
    return Math.floor((normalized.length * 3) / 4);
  }

  private validateAndCountImages(images: ImageAttachmentDto[] | undefined, context: string): number {
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

    totalBytes += this.validateAndCountImages(request.images, 'current message');

    for (const msg of request.history) {
      totalBytes += this.validateAndCountImages(msg.images, 'history');
      totalCount += msg.images?.length ?? 0;
    }

    if (totalCount > MAX_TOTAL_IMAGES) {
      throw new BadRequestException(`Too many images provided (${totalCount}). Max ${MAX_TOTAL_IMAGES} per request including history.`);
    }

    if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
      throw new BadRequestException(
        `Images exceed maximum combined size of ${MAX_TOTAL_IMAGE_BYTES / 1024 / 1024}MB`,
      );
    }
  }

  private clampHistory(history: ChatRequestDto['history']): ChatRequestDto['history'] {
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
    const history = this.clampHistory(request.history);
    this.enforceImageBudgets({ ...request, history });

    const codeFence = request.language === 'javascript' ? 'javascript' : 'typescript';
    const messages: LLMMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Current p5.js code:\n\`\`\`${codeFence}\n${request.code}\n\`\`\``,
      },
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
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) {
        throw new Error('Demo mode is not configured. Please use your own API key in Settings.');
      }
      yield* this.groqProvider.stream(messages, DEMO_MODEL, groqKey);
      return;
    }

    const providers: Record<string, LLMProvider> = {
      openai: this.openaiProvider,
      anthropic: this.anthropicProvider,
      deepseek: this.deepseekProvider,
    };

    const provider = providers[request.config.provider];
    if (!provider) throw new Error(`Unknown provider: ${request.config.provider}`);

    yield* provider.stream(messages, request.config.model, request.config.apiKey);
  }

  async listModels(provider: string, apiKey: string): Promise<string[]> {
    switch (provider) {
      case 'openai':
        return this.openaiProvider.listModels(apiKey);
      case 'anthropic':
        return this.anthropicProvider.listModels(apiKey);
      case 'deepseek':
        return this.deepseekProvider.listModels(apiKey);
      case 'demo': {
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) return ['llama-3.3-70b-versatile'];
        return this.groqProvider.listModels(groqKey);
      }
      default:
        return [];
    }
  }
}
