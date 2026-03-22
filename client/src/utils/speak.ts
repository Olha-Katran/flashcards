const LANG_MAP: Record<string, string> = {
  English: 'en',
  Ukrainian: 'uk',
  Spanish: 'es',
  French: 'fr',
  German: 'de',
  Italian: 'it',
  Portuguese: 'pt',
  Polish: 'pl',
  Japanese: 'ja',
  Chinese: 'zh',
  Korean: 'ko',
  Arabic: 'ar',
  Turkish: 'tr',
  Dutch: 'nl',
  Swedish: 'sv',
}

export function speak(text: string, lang = 'English') {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = LANG_MAP[lang] ?? lang.slice(0, 2).toLowerCase()
  utterance.rate = 0.9
  window.speechSynthesis.speak(utterance)
}
