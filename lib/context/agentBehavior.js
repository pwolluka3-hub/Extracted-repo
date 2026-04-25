export function normalizeIncomingMessage(content, hasFiles) {
  const normalized = (content || '').trim();
  if (normalized) return normalized;
  if (hasFiles) return 'Please analyze the attached files.';
  return '';
}

export function detectExplicitMediaIntent(message) {
  const lowerMessage = message.toLowerCase();
  const mediaCreationVerbPattern = /\b(create|generate|make|produce|render|design|draw|animate|shoot|film|craft)\b/;
  const imagePattern = /\b(image|photo|picture|poster|thumbnail|artwork|illustration)\b/;
  const videoPattern = /\b(video|reel|clip|animation|cinematic|short film)\b/;
  const questionLeadPattern = /^(how|what|why|when|where|which|can|could|should|would|is|are|do|does|did)\b/;

  const hasImageKeyword = imagePattern.test(lowerMessage);
  const hasVideoKeyword = videoPattern.test(lowerMessage);
  const hasMediaCreationVerb = mediaCreationVerbPattern.test(lowerMessage);
  const isQuestionLike = questionLeadPattern.test(lowerMessage);

  if ((hasImageKeyword || hasVideoKeyword) && isQuestionLike && !hasMediaCreationVerb) {
    return 'answer_question';
  }

  if (hasImageKeyword && hasMediaCreationVerb) {
    return 'create_image';
  }

  if (hasVideoKeyword && hasMediaCreationVerb) {
    return 'make_video';
  }

  return null;
}

export function buildFallbackChatMessages(request, errorMessage) {
  return [
    {
      role: 'system',
      content: 'You are Nexus Agent. A tool request failed, but you must still be useful. Give a concise, direct response that helps the user move forward immediately.',
    },
    {
      role: 'user',
      content: `Request: ${request}\n\nTool error: ${errorMessage}\n\nProvide the best actionable response now.`,
    },
  ];
}
