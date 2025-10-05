export const PERSONA_COLORS: Record<string, string> = {
  'Kai': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  'Espri': 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  'Luna': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  'Namu': 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  'Milo': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  'Eden': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  'Ava': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  'Rho': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  'Noir': 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
};

export const PERSONA_BADGE_COLORS: Record<string, string> = {
  'Kai': 'bg-blue-500 text-white',
  'Espri': 'bg-pink-500 text-white',
  'Luna': 'bg-purple-500 text-white',
  'Namu': 'bg-green-500 text-white',
  'Milo': 'bg-yellow-500 text-white',
  'Eden': 'bg-indigo-500 text-white',
  'Ava': 'bg-rose-500 text-white',
  'Rho': 'bg-cyan-500 text-white',
  'Noir': 'bg-gray-500 text-white',
};

export function getPersonaColor(personaName: string): string {
  return PERSONA_COLORS[personaName] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
}

export function getPersonaBadgeColor(personaName: string): string {
  return PERSONA_BADGE_COLORS[personaName] || 'bg-gray-500 text-white';
}
