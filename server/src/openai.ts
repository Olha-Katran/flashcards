import type { BackKind, ContentKind, FlashcardDraft, GroupMode } from './types.js'

const DEFAULT_MODEL = 'gpt-5.4-mini'

const OPENAI_TIMEOUT_MS = 120_000
const OPENAI_TIMEOUT_PDF_MS = 180_000
const OPENAI_MAX_RETRIES = 4
const OPENAI_RETRY_BASE_MS = 800

const EXCLUDE_PROMPT_MAX_ITEMS = 100
const EXCLUDE_PROMPT_MAX_CHARS = 5000

function model(): string {
  const m = process.env.OPENAI_MODEL?.trim()
  return m || DEFAULT_MODEL
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function trimExcludeForPrompt(exclude: string[], maxItems: number, maxChars: number): string[] {
  const uniq = [...new Set(exclude.map((s) => String(s).trim()).filter(Boolean))]
  let list = uniq.slice(-maxItems)
  let joined = list.join(', ')
  while (joined.length > maxChars && list.length > 1) {
    list = list.slice(1)
    joined = list.join(', ')
  }
  return list
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[])
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string | null }
    finish_reason?: string
  }>
}

async function postChatCompletions(
  body: Record<string, unknown>,
  options?: { timeoutMs?: number }
): Promise<ChatCompletionResponse> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set')

  const url = 'https://api.openai.com/v1/chat/completions'
  const timeoutMs = options?.timeoutMs ?? OPENAI_TIMEOUT_MS
  let lastErr: Error = new Error('OpenAI request failed')

  for (let attempt = 0; attempt < OPENAI_MAX_RETRIES; attempt++) {
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
      const transient =
        lastErr.name === 'AbortError' ||
        lastErr.name === 'TimeoutError' ||
        /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(lastErr.message)
      if (!transient || attempt === OPENAI_MAX_RETRIES - 1) throw lastErr
      await sleep(OPENAI_RETRY_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 350))
      continue
    }

    if (res.ok) {
      return (await res.json()) as ChatCompletionResponse
    }

    const bodyText = await res.text()
    const err = new Error(`OpenAI API ${res.status}: ${bodyText}`)
    ;(err as unknown as Record<string, number>).status = res.status
    lastErr = err

    const retriable = res.status === 503 || res.status === 504 || res.status === 500 || res.status === 429
    if (!retriable || attempt === OPENAI_MAX_RETRIES - 1) throw err

    const delay =
      res.status === 429
        ? Math.max(OPENAI_RETRY_BASE_MS * 2 ** attempt, 2500) + Math.floor(Math.random() * 500)
        : OPENAI_RETRY_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 350)
    await sleep(delay)
  }

  throw lastErr
}

function extractChatText(data: ChatCompletionResponse): string {
  const choice = data.choices?.[0]
  if (choice?.finish_reason === 'content_filter') {
    const err = new Error('Generation stopped (content_filter)')
    ;(err as unknown as Record<string, number>).status = 422
    throw err
  }
  const content = choice?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    if (choice?.finish_reason === 'length') {
      const err = new Error('Response truncated (length)')
      ;(err as unknown as Record<string, number>).status = 502
      throw err
    }
    throw new Error('Empty response from OpenAI')
  }
  return content.trim()
}

type ResponsesApiPayload = Record<string, unknown>

async function postResponsesApi(
  body: ResponsesApiPayload,
  options?: { timeoutMs?: number }
): Promise<unknown> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set')

  const url = 'https://api.openai.com/v1/responses'
  const timeoutMs = options?.timeoutMs ?? OPENAI_TIMEOUT_PDF_MS
  let lastErr: Error = new Error('OpenAI request failed')

  for (let attempt = 0; attempt < OPENAI_MAX_RETRIES; attempt++) {
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
      const transient =
        lastErr.name === 'AbortError' ||
        lastErr.name === 'TimeoutError' ||
        /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(lastErr.message)
      if (!transient || attempt === OPENAI_MAX_RETRIES - 1) throw lastErr
      await sleep(OPENAI_RETRY_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 350))
      continue
    }

    if (res.ok) {
      return (await res.json()) as unknown
    }

    const bodyText = await res.text()
    const err = new Error(`OpenAI API ${res.status}: ${bodyText}`)
    ;(err as unknown as Record<string, number>).status = res.status
    lastErr = err

    const retriable = res.status === 503 || res.status === 504 || res.status === 500 || res.status === 429
    if (!retriable || attempt === OPENAI_MAX_RETRIES - 1) throw err

    const delay =
      res.status === 429
        ? Math.max(OPENAI_RETRY_BASE_MS * 2 ** attempt, 2500) + Math.floor(Math.random() * 500)
        : OPENAI_RETRY_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 350)
    await sleep(delay)
  }

  throw lastErr
}

function extractResponsesText(data: unknown): string {
  const d = data as {
    output_text?: string
    output?: Array<{
      type?: string
      role?: string
      content?: Array<{ type?: string; text?: string }>
    }>
  }
  if (typeof d.output_text === 'string' && d.output_text.trim()) {
    return d.output_text.trim()
  }
  for (const item of d.output ?? []) {
    if (item.type !== 'message' || item.role !== 'assistant') continue
    for (const part of item.content ?? []) {
      if (part.type === 'refusal') {
        const err = new Error('Generation stopped (refusal)')
        ;(err as unknown as Record<string, number>).status = 422
        throw err
      }
      if ((part.type === 'output_text' || part.type === 'text') && typeof part.text === 'string' && part.text.trim()) {
        return part.text.trim()
      }
    }
  }
  throw new Error('Empty response from OpenAI (responses)')
}

const JSON_OBJECT_FLASHCARDS_SUFFIX = `

Return a single JSON object with exactly one top-level key "flashcards" whose value is the array described above. No markdown, no code fences, no other top-level keys.`

const JSON_OBJECT_SINGLE_SUFFIX = `

Return a single JSON object with exactly one top-level key "flashcards" whose value is an array containing exactly one flashcard object. No markdown, no code fences, no other top-level keys.`

function parseFlashcardsJson(text: string): Record<string, unknown>[] {
  const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const parsed = JSON.parse(jsonStr) as { flashcards?: unknown }
  const arr = parsed.flashcards
  if (!Array.isArray(arr)) {
    throw new Error('Model did not return a flashcards array')
  }
  if (!arr.every((x) => x !== null && typeof x === 'object')) {
    throw new Error('flashcards must be an array of objects')
  }
  return arr as Record<string, unknown>[]
}

async function openAiJudge(
  userAnswer: string,
  correctAnswer: string,
  frontWord: string,
  mode: GroupMode,
  frontLang: string,
  backLang: string
): Promise<{ correct: boolean; feedback: string }> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { correct: false, feedback: 'AI validation unavailable.' }

  const roleDesc = mode === 'definition'
    ? `a language teacher checking whether a student correctly defined an ${frontLang} word`
    : `a ${backLang} language teacher checking a student's ${frontLang} → ${backLang} translation`

  const expectedLabel = mode === 'definition'
    ? `Expected definition`
    : `Expected ${backLang} translation`

  const prompt = `You are ${roleDesc}.

${frontLang} word: "${frontWord}"
${expectedLabel}: "${correctAnswer}"
Student's answer: "${userAnswer}"

Is the student's answer acceptable? Consider:
- Minor typos or misspellings that still clearly refer to the same word/meaning are ACCEPTABLE
- Valid synonyms or alternative correct ${mode === 'definition' ? 'definitions' : 'translations'} are ACCEPTABLE
- Completely wrong answers are NOT acceptable

Reply with ONLY a JSON object, no extra text, no markdown:
{"correct": true/false, "feedback": "brief explanation"}`

  try {
    const data = await postChatCompletions({
      model: model(),
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 256,
      response_format: { type: 'json_object' },
    })
    const text = extractChatText(data)
    const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    const parsed = JSON.parse(jsonStr) as { correct: boolean; feedback?: string }
    return {
      correct: Boolean(parsed.correct),
      feedback: parsed.feedback ?? '',
    }
  } catch {
    return { correct: false, feedback: 'Could not validate.' }
  }
}

export async function validateAnswer(
  userAnswer: string,
  correctAnswer: string,
  frontWord: string,
  mode: GroupMode = 'translation',
  frontLang: string = 'English',
  backLang: string = 'Ukrainian'
): Promise<{ correct: boolean; feedback: string }> {
  const normUser = normalize(userAnswer)
  const normCorrect = normalize(correctAnswer)

  if (!normUser) {
    return { correct: false, feedback: 'Empty answer.' }
  }

  if (normUser === normCorrect) {
    return { correct: true, feedback: 'Exact match.' }
  }

  const dist = levenshtein(normUser, normCorrect)
  const maxLen = Math.max(normUser.length, normCorrect.length)
  const ratio = dist / maxLen

  if (dist <= 1 && maxLen >= 3) {
    return { correct: true, feedback: 'Close enough — minor typo accepted.' }
  }
  if (dist <= 2 && maxLen >= 6) {
    return { correct: true, feedback: 'Close enough — small misspelling accepted.' }
  }

  if (ratio > 0.6) {
    return { correct: false, feedback: `Expected: ${correctAnswer}` }
  }

  return openAiJudge(userAnswer, correctAnswer, frontWord, mode, frontLang, backLang)
}

export async function generateFlashcards(
  topic: string,
  level: string,
  count: number,
  mode: GroupMode = 'translation',
  frontLang: string = 'English',
  backLang: string = 'Ukrainian',
  preferences?: string,
  exclude: string[] = [],
  contentKind: ContentKind = 'vocabulary'
): Promise<FlashcardDraft[]> {
  const excludePrompt = trimExcludeForPrompt(exclude, EXCLUDE_PROMPT_MAX_ITEMS, EXCLUDE_PROMPT_MAX_CHARS)

  const backKind: BackKind = mode === 'definition' ? 'meaning' : 'translation'

  const backDescription = mode === 'definition'
    ? `a clear, concise English definition of the word or phrase`
    : `the ${backLang} translation of the word or phrase`

  const excludeClause =
    contentKind === 'phrasal_verbs' && excludePrompt.length
      ? `\nDo NOT use any of these phrasal verbs (match loosely, same multi-word item): ${excludePrompt.join(', ')}.`
      : excludePrompt.length
        ? `\nDo NOT use any of these words: ${excludePrompt.join(', ')}. Generate completely different words.`
        : ''

  const prompt =
    contentKind === 'phrasal_verbs'
      ? `Generate exactly ${count} English phrasal verb flashcards for the learner's focus: "${topic}".

Use CEFR English level ${level} (the learner's global level). Items must suit that level.

How to interpret the focus (choose what fits best):
- If it names a theme, situation, or topic (e.g. "negotiations", "travel", "emotions"), pick common, useful phrasal verbs for that context.
- If it is a single common English verb or short particle (e.g. "put", "call", "get", "off"), generate phrasal verbs whose main verb is that word (e.g. put off, call off, get over).

Multi-meaning phrasal verbs (important):
- Some phrasal verbs have two or more clearly different meanings (e.g. "take down": remove a structure; defeat or kill; write something down).
- For those, output **separate flashcards — one per meaning**, not one card mixing several glosses.
- In "english", add a sense number in parentheses after the phrase: "take down (1)", "take down (2)", "take down (3)" — same surface phrase, different numbers for different senses. Use a space before the opening parenthesis.
- Each "back" and "exampleSentence" must match **only** that numbered sense.
- If a phrase has only one common sense in context, use the plain phrase in "english" with **no** parentheses (e.g. "put up with").

${preferences ? `User preferences: ${preferences}` : ''}${excludeClause}

Each flashcard must have:
- "english": the phrasal verb, with optional " (n)" for sense number when splitting meanings as above
- "back": ${backDescription}
- "pronunciation": phonetic spelling for the whole phrase (IPA or simplified)
- "partOfSpeech": always "phrasal verb"
- "exampleSentence": a short natural example for **this** sense only

Shape example for one item: {"english":"put off","back":"${mode === 'definition' ? 'to postpone' : 'відкласти'}","pronunciation":"/pʊt ˈɒf/","partOfSpeech":"phrasal verb","exampleSentence":"They put off the meeting."} — add " (1)", " (2)" to english only when splitting distinct senses of the same surface phrase.${JSON_OBJECT_FLASHCARDS_SUFFIX}`
      : `Generate exactly ${count} ${frontLang} vocabulary flashcards about "${topic}" appropriate for ${frontLang} level ${level}.

${preferences ? `User preferences: ${preferences}` : ''}${excludeClause}

Each flashcard must have:
- "english": the ${frontLang} word or short phrase
- "back": ${backDescription}
- "pronunciation": phonetic spelling (IPA or simplified), e.g. "/həˈloʊ/"
- "partOfSpeech": part of speech (noun, verb, adjective, adverb, etc.)
- "exampleSentence": a short example sentence using the word in ${frontLang}

Example item shape: {"english":"hello","back":"${mode === 'definition' ? 'a greeting used when meeting someone' : 'привіт'}","pronunciation":"/həˈloʊ/","partOfSpeech":"interjection","exampleSentence":"Hello, how are you today?"}${JSON_OBJECT_FLASHCARDS_SUFFIX}`

  const data = await postChatCompletions({
    model: model(),
    messages: [{ role: 'user', content: prompt }],
    max_completion_tokens: 8192,
    response_format: { type: 'json_object' },
  })
  const text = extractChatText(data)
  const parsed = parseFlashcardsJson(text)

  return parsed.map((item) => ({
    english: String(item.english ?? ''),
    back: String(item.back ?? ''),
    backKind,
    pronunciation: typeof item.pronunciation === 'string' ? item.pronunciation : undefined,
    partOfSpeech: typeof item.partOfSpeech === 'string' ? item.partOfSpeech : undefined,
    exampleSentence: typeof item.exampleSentence === 'string' ? item.exampleSentence : undefined,
  }))
}

export async function regenerateSingle(
  topic: string,
  level: string,
  mode: GroupMode = 'translation',
  frontLang: string = 'English',
  backLang: string = 'Ukrainian',
  exclude: string[] = [],
  contentKind: ContentKind = 'vocabulary'
): Promise<FlashcardDraft> {
  const excludePrompt = trimExcludeForPrompt(exclude, EXCLUDE_PROMPT_MAX_ITEMS, EXCLUDE_PROMPT_MAX_CHARS)

  const backKind: BackKind = mode === 'definition' ? 'meaning' : 'translation'
  const backDescription = mode === 'definition'
    ? `a clear, concise English definition of the word or phrase`
    : `the ${backLang} translation of the word or phrase`

  const excludeClause =
    contentKind === 'phrasal_verbs' && excludePrompt.length
      ? `\nDo NOT use any of these phrasal verbs: ${excludePrompt.join(', ')}.`
      : excludePrompt.length
        ? `\nDo NOT use any of these words: ${excludePrompt.join(', ')}.`
        : ''

  const prompt =
    contentKind === 'phrasal_verbs'
      ? `Generate exactly 1 English phrasal verb flashcard for the learner's focus: "${topic}".

Use CEFR English level ${level}. The item must suit that level.
Interpret the focus as in batch generation: theme/situation OR base verb (e.g. "put", "call").${excludeClause}

If the chosen phrasal verb has several common meanings, pick **one** sense for this card and use "english" like "take down (1)" or "take down (2)" with a space before the parenthesis, matching that sense in "back" and "exampleSentence". If the phrase is unambiguous or has one dominant sense, use the plain phrase without "(n)".

The flashcard must have:
- "english": the phrasal verb, optionally with " (n)" for one sense of a multi-meaning verb
- "back": ${backDescription}
- "pronunciation": phonetic spelling for the phrase
- "partOfSpeech": "phrasal verb"
- "exampleSentence": a short natural English example for this sense only${JSON_OBJECT_SINGLE_SUFFIX}`
      : `Generate exactly 1 ${frontLang} vocabulary flashcard about "${topic}" appropriate for ${frontLang} level ${level}.${excludeClause}

The flashcard must have:
- "english": the ${frontLang} word or short phrase
- "back": ${backDescription}
- "pronunciation": phonetic spelling (IPA or simplified)
- "partOfSpeech": part of speech
- "exampleSentence": a short example sentence using the word in ${frontLang}${JSON_OBJECT_SINGLE_SUFFIX}`

  const data = await postChatCompletions({
    model: model(),
    messages: [{ role: 'user', content: prompt }],
    max_completion_tokens: 4096,
    response_format: { type: 'json_object' },
  })
  const text = extractChatText(data)
  const arr = parseFlashcardsJson(text)
  const item = arr[0]
  if (!item) {
    throw new Error('Model did not return a flashcard object')
  }

  return {
    english: String(item.english ?? ''),
    back: String(item.back ?? ''),
    backKind,
    pronunciation: typeof item.pronunciation === 'string' ? item.pronunciation : undefined,
    partOfSpeech: typeof item.partOfSpeech === 'string' ? item.partOfSpeech : undefined,
    exampleSentence: typeof item.exampleSentence === 'string' ? item.exampleSentence : undefined,
  }
}

export async function generateFromPdf(
  pdfBuffer: Buffer,
  level: string
): Promise<FlashcardDraft[]> {
  const prompt = `You are an English learning assistant.

A student uploaded lesson material (PDF).
Your task is to extract useful English vocabulary for their level.

Level: ${level}

Instructions:
- Extract important words and phrases from the content
- Ignore UI text, random noise, or repeated words
- Focus on useful vocabulary for learning
- Avoid very rare or overly complex words beyond the level
- Extract between 10 and 30 words depending on the PDF content

For each word provide a JSON object with:
- "english": the English word or short phrase
- "back": Ukrainian translation
- "pronunciation": phonetic pronunciation (IPA), e.g. "/həˈloʊ/"
- "partOfSpeech": part of speech (noun, verb, adjective, adverb, etc.)
- "exampleSentence": a short example sentence using the word

Example item: {"english":"journey","back":"подорож","pronunciation":"/ˈdʒɜːrni/","partOfSpeech":"noun","exampleSentence":"The journey took three hours."}${JSON_OBJECT_FLASHCARDS_SUFFIX}`

  const pdfBase64 = pdfBuffer.toString('base64')
  const fileData = `data:application/pdf;base64,${pdfBase64}`

  const raw = await postResponsesApi(
    {
      model: model(),
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_file',
              filename: 'lesson.pdf',
              file_data: fileData,
            },
            {
              type: 'input_text',
              text: prompt,
            },
          ],
        },
      ],
      text: {
        format: { type: 'json_object' },
      },
      max_output_tokens: 8192,
    },
    { timeoutMs: OPENAI_TIMEOUT_PDF_MS }
  )

  const text = extractResponsesText(raw)
  const parsed = parseFlashcardsJson(text)

  return parsed.map((item) => ({
    english: String(item.english ?? ''),
    back: String(item.back ?? ''),
    backKind: 'translation' as const,
    pronunciation: typeof item.pronunciation === 'string' ? item.pronunciation : undefined,
    partOfSpeech: typeof item.partOfSpeech === 'string' ? item.partOfSpeech : undefined,
    exampleSentence: typeof item.exampleSentence === 'string' ? item.exampleSentence : undefined,
  }))
}

export async function generateFromImage(
  imageBuffer: Buffer,
  mimeType: string,
  level: string
): Promise<FlashcardDraft[]> {
  const prompt = `You are an English learning assistant.

A student uploaded an image (photo/screenshot).
Your task is to extract useful English vocabulary from any readable text in the image (OCR).

Level: ${level}

Instructions:
- Extract important words and short phrases from the image text
- Ignore UI text, random noise, timestamps, usernames, or repeated words
- Focus on useful vocabulary for learning
- Avoid very rare or overly complex words beyond the level
- Extract between 10 and 30 items depending on the image content

For each item provide a JSON object with:
- "english": the English word or short phrase
- "back": Ukrainian translation
- "pronunciation": phonetic pronunciation (IPA), e.g. "/həˈloʊ/"
- "partOfSpeech": part of speech (noun, verb, adjective, adverb, etc.)
- "exampleSentence": a short example sentence using the word

Example item: {"english":"journey","back":"подорож","pronunciation":"/ˈdʒɜːrni/","partOfSpeech":"noun","exampleSentence":"The journey took three hours."}${JSON_OBJECT_FLASHCARDS_SUFFIX}`

  const imageBase64 = imageBuffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${imageBase64}`

  const data = await postChatCompletions({
    model: model(),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    max_completion_tokens: 8192,
    response_format: { type: 'json_object' },
  })

  const text = extractChatText(data)
  const parsed = parseFlashcardsJson(text)

  return parsed.map((item) => ({
    english: String(item.english ?? ''),
    back: String(item.back ?? ''),
    backKind: 'translation' as const,
    pronunciation: typeof item.pronunciation === 'string' ? item.pronunciation : undefined,
    partOfSpeech: typeof item.partOfSpeech === 'string' ? item.partOfSpeech : undefined,
    exampleSentence: typeof item.exampleSentence === 'string' ? item.exampleSentence : undefined,
  }))
}
