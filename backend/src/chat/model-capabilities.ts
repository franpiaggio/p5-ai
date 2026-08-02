/**
 * Per-model vision (image input) capability.
 *
 * OpenAI and Anthropic don't expose vision in their `/models` API, so we detect
 * it from the model-name family (the regexes track their current multimodal
 * families). OpenRouter *does* report it live (`architecture.input_modalities`),
 * so its models carry an explicit flag and skip this heuristic — the name-based
 * OpenRouter branch here is only a fallback for when that metadata is missing.
 *
 * NOTE: keep this in sync with the frontend mirror in
 * `frontend/src/utils/modelCapabilities.ts`.
 */

function isOpenAIVision(id: string): boolean {
  // Non-chat / non-vision endpoints.
  if (
    /audio|realtime|transcribe|tts|whisper|embedding|moderation|dall-e|image|search/.test(
      id,
    )
  ) {
    return false;
  }
  // Reasoning minis without image input.
  if (/o1-mini|o1-preview|o3-mini/.test(id)) return false;
  return /gpt-4o|gpt-4\.1|gpt-4-turbo|gpt-4-vision|chatgpt-4o|(^|\/)o1|(^|\/)o3|(^|\/)o4|gpt-5/.test(
    id,
  );
}

function isAnthropicVision(id: string): boolean {
  // Claude 3.5 Haiku is the one modern Claude that doesn't accept images.
  if (/claude-3[._-]5-haiku/.test(id)) return false;
  return /claude-(3|4|opus-4|sonnet-4|haiku-4)/.test(id);
}

/** Fallback name heuristic for OpenRouter when live modalities aren't available. */
function isOpenRouterVisionByName(id: string): boolean {
  return /gpt-4o|gpt-4\.1|gpt-4-turbo|chatgpt-4o|(^|\/)o3|(^|\/)o4|gpt-5|claude-3|claude-4|claude-opus-4|claude-sonnet-4|gemini|pixtral|llava|llama-4|scout|maverick|-vl\b|vision|qwen.*vl|internvl|grok-4|grok.*vision/.test(
    id,
  );
}

/** Whether a model accepts image input, inferred from its id. */
export function supportsVisionByName(
  provider: string,
  modelId: string,
): boolean {
  const id = modelId.toLowerCase();
  switch (provider) {
    case 'openai':
      return isOpenAIVision(id);
    case 'anthropic':
      return isAnthropicVision(id);
    case 'openrouter':
      return isOpenRouterVisionByName(id);
    default:
      // demo (Groq), groq, gemini, deepseek, opencode: text-only in this app.
      return false;
  }
}

/** Providers whose `stream()` actually forwards image content to the API. */
export function providerForwardsImages(provider: string): boolean {
  return (
    provider === 'openai' ||
    provider === 'anthropic' ||
    provider === 'openrouter'
  );
}

/**
 * Whether a *new* image attachment may be sent to (provider, model). Used as a
 * server-side guard so images are never silently dropped: providers that don't
 * forward images reject them, and OpenAI/Anthropic reject non-vision models.
 * OpenRouter is trusted (it validates per-model and errors clearly if the chosen
 * model can't take images).
 */
export function canAcceptImages(provider: string, modelId: string): boolean {
  if (!providerForwardsImages(provider)) return false;
  if (provider === 'openrouter') return true;
  return supportsVisionByName(provider, modelId);
}
