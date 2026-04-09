export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type EnglishLevel = (typeof LEVELS)[number]

export const LANGUAGES = [
  'English', 'Ukrainian', 'Spanish', 'French', 'German',
  'Italian', 'Portuguese', 'Polish', 'Japanese', 'Chinese',
  'Korean', 'Arabic', 'Turkish', 'Dutch', 'Swedish',
] as const

export const SHARED_TOPICS = [
  'physical world', 'animals', 'weather', 'body', 'appearance',
  'character', 'feelings', 'family and friends', 'around the home',
  'money', 'health', 'clothes', 'food', 'shopping', 'cooking',
  'transport', 'jobs', 'career', 'business', 'finance',
  'sport', 'books', 'films', 'music',
] as const
