export function parseJSON<T> (content: string, filename: string): T {
  try {
    return JSON.parse(content)
  } catch (error) {
    throw new Error(
      `Failed to parse JSON "${filename}" with error: ${error}`,
      { cause: error })
  }
}