/** Shorten raw model IDs into human-friendly labels. */
export function formatModelName(model: string): string {
  // Anthropic old format: claude-3-5-sonnet-20241022 → Sonnet 3.5, claude-3-haiku-20240307 → Haiku 3
  const claudeOld = model.match(/^claude-(\d+)-(\d+)-(\w+)/);
  if (claudeOld) {
    const name = claudeOld[3].charAt(0).toUpperCase() + claudeOld[3].slice(1);
    return `${name} ${claudeOld[1]}.${claudeOld[2]}`;
  }
  const claudeOld2 = model.match(/^claude-(\d+)-(\w+)/);
  if (claudeOld2) {
    const name = claudeOld2[2].charAt(0).toUpperCase() + claudeOld2[2].slice(1);
    return `${name} ${claudeOld2[1]}`;
  }

  // Anthropic new format: claude-sonnet-4-20250514 → Sonnet 4, claude-opus-4-20250514 → Opus 4
  const claudeNew = model.match(/^claude-(\w+)-(\d+(?:\.\d+)?)/);
  if (claudeNew) {
    const name = claudeNew[1].charAt(0).toUpperCase() + claudeNew[1].slice(1);
    return `${name} ${claudeNew[2]}`;
  }

  // OpenAI: gpt-4o → GPT-4o, gpt-4o-mini → GPT-4o Mini, gpt-4-turbo → GPT-4 Turbo
  if (model.startsWith('gpt-')) {
    const rest = model.slice(4);
    const parts = rest.split('-');
    const base = parts[0];
    const suffix = parts.slice(1).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    return `GPT-${base}${suffix ? ` ${suffix}` : ''}`;
  }

  // OpenAI reasoning: o3-mini → o3 Mini
  if (model.startsWith('o')) {
    const match = model.match(/^(o\d+)(?:-(.+))?$/);
    if (match) {
      const suffix = match[2] ? ` ${match[2].charAt(0).toUpperCase() + match[2].slice(1)}` : '';
      return `${match[1]}${suffix}`;
    }
  }

  // DeepSeek: deepseek-chat → DeepSeek Chat, deepseek-reasoner → DeepSeek Reasoner
  if (model.startsWith('deepseek-')) {
    const rest = model.slice(9);
    return `DeepSeek ${rest.charAt(0).toUpperCase() + rest.slice(1)}`;
  }

  // Fallback: return as-is
  return model;
}
