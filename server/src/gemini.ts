import type { BackKind, FlashcardDraft, GroupMode } from './types.js'

const MODEL = 'gemini-2.5-flash'

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

async function geminiJudge(
  userAnswer: string,
  correctAnswer: string,
  frontWord: string,
  mode: GroupMode,
  frontLang: string,
  backLang: string
): Promise<{ correct: boolean; feedback: string }> {
  const key = process.env.GEMINI_API_KEY
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

Reply with ONLY a JSON object, no extra text:
{"correct": true/false, "feedback": "brief explanation"}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })

  if (!res.ok) {
    const err = new Error(`Gemini API ${res.status}`)
    ;(err as unknown as Record<string, number>).status = res.status
    throw err
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) return { correct: false, feedback: 'Could not validate.' }

  const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const parsed = JSON.parse(jsonStr) as { correct: boolean; feedback?: string }
  return {
    correct: Boolean(parsed.correct),
    feedback: parsed.feedback ?? '',
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

  return geminiJudge(userAnswer, correctAnswer, frontWord, mode, frontLang, backLang)
}

export async function generateFlashcards(
  topic: string,
  level: string,
  count: number,
  mode: GroupMode = 'translation',
  frontLang: string = 'English',
  backLang: string = 'Ukrainian',
  preferences?: string
): Promise<FlashcardDraft[]> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')

  const backKind: BackKind = mode === 'definition' ? 'meaning' : 'translation'

  const backDescription = mode === 'definition'
    ? `a clear, concise English definition of the word`
    : `the ${backLang} translation of the word`

  const prompt = `Generate exactly ${count} ${frontLang} vocabulary flashcards about "${topic}" appropriate for ${frontLang} level ${level}.

${preferences ? `User preferences: ${preferences}` : ''}

Each flashcard must have:
- "english": the ${frontLang} word or short phrase
- "back": ${backDescription}
- "pronunciation": phonetic spelling (IPA or simplified), e.g. "/həˈloʊ/"
- "partOfSpeech": part of speech (noun, verb, adjective, adverb, etc.)
- "exampleSentence": a short example sentence using the word in ${frontLang}

Return ONLY a valid JSON array with no extra text, no markdown, no code fences.
Example: [{"english":"hello","back":"${mode === 'definition' ? 'a greeting used when meeting someone' : 'привіт'}","pronunciation":"/həˈloʊ/","partOfSpeech":"interjection","exampleSentence":"Hello, how are you today?"}]`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    const err = new Error(`Gemini API ${res.status}: ${body}`)
    ;(err as unknown as Record<string, number>).status = res.status
    throw err
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('Empty response from Gemini')

  const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const parsed = JSON.parse(jsonStr)

  if (!Array.isArray(parsed)) {
    throw new Error('Gemini did not return an array')
  }

  return parsed.map((item: Record<string, unknown>) => ({
    english: String(item.english ?? ''),
    back: String(item.back ?? ''),
    backKind,
    pronunciation: typeof item.pronunciation === 'string' ? item.pronunciation : undefined,
    partOfSpeech: typeof item.partOfSpeech === 'string' ? item.partOfSpeech : undefined,
    exampleSentence: typeof item.exampleSentence === 'string' ? item.exampleSentence : undefined,
  }))
}

export async function generateFromPdf(
  pdfBuffer: Buffer,
  level: string
): Promise<FlashcardDraft[]> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')

  const prompt = `You are an English learning assistant.

A student uploaded lesson material (PDF).
Your task is to extract useful English vocabulary for their level.

Level: ${level}

Instructions:
- Extract important words and phrases from the content
- Ignore UI text, random noise, or repeated words
- Focus on useful vocabulary for learning
- Avoid very rare or overly complex words beyond the level
- Extract between 5 and 25 words depending on the PDF content

For each word provide a JSON object with:
- "english": the English word or short phrase
- "back": Ukrainian translation
- "pronunciation": phonetic pronunciation (IPA), e.g. "/həˈloʊ/"
- "partOfSpeech": part of speech (noun, verb, adjective, adverb, etc.)
- "exampleSentence": a short example sentence using the word

Return ONLY a valid JSON array with no extra text, no markdown, no code fences.
Example: [{"english":"journey","back":"подорож","pronunciation":"/ˈdʒɜːrni/","partOfSpeech":"noun","exampleSentence":"The journey took three hours."}]`

  const pdfBase64 = pdfBuffer.toString('base64')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBase64,
            },
          },
          { text: prompt },
        ],
      }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    const err = new Error(`Gemini API ${res.status}: ${body}`)
    ;(err as unknown as Record<string, number>).status = res.status
    throw err
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('Empty response from Gemini')

  const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const parsed = JSON.parse(jsonStr)

  if (!Array.isArray(parsed)) {
    throw new Error('Gemini did not return an array')
  }

  return parsed.map((item: Record<string, unknown>) => ({
    english: String(item.english ?? ''),
    back: String(item.back ?? ''),
    backKind: 'translation' as const,
    pronunciation: typeof item.pronunciation === 'string' ? item.pronunciation : undefined,
    partOfSpeech: typeof item.partOfSpeech === 'string' ? item.partOfSpeech : undefined,
    exampleSentence: typeof item.exampleSentence === 'string' ? item.exampleSentence : undefined,
  }))
}
