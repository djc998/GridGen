export const categories = [
  'Guess the Celebrity',
  'Guess the Movie',
  'Guess the TV Show',
  'Guess the Landmark',
  'Guess the Brand',
  'Guess the Animal',
  'Guess the Food',
  'Guess the Sport',
  'Guess the Car',
  'Guess the Game',
  'Guess the Art',
  'Guess the Music',
] as const

export type Category = typeof categories[number] 