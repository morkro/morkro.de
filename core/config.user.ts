/**
 * User configuration
 */

export const BASE_URL = process.env.BASE_URL ?? 'https://morkro.de'

export const CUSTOM_DATA_MAPPING = {
  'pkg': './package.json',
} as const

export const COLLECTIONS = {
  POSTS: {
    sortBy: 'date',
  },
} as const