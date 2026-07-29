import { randomBytes } from 'node:crypto'
import { mkdir, open, rename, unlink } from 'node:fs/promises'
import path from 'node:path'

export const TEMP_SUFFIX = '.broodmothertmp'

/**
 * Temp file, fsync, rename. The editor saves on a 500ms debounce, so a crash lands
 * mid-save often and a half-written note is lost work.
 */
export async function atomicWrite(
  target: string,
  data: string | Uint8Array,
): Promise<void> {
  const dir = path.dirname(target)
  await mkdir(dir, { recursive: true })
  const temp = path.join(
    dir,
    `.${path.basename(target)}.${randomBytes(6).toString('hex')}${TEMP_SUFFIX}`,
  )

  const handle = await open(temp, 'wx', 0o644)
  try {
    await handle.writeFile(data)
    await handle.sync()
  } catch (error) {
    await handle.close()
    await unlink(temp).catch(() => {})
    throw error
  }
  await handle.close()

  try {
    await rename(temp, target)
  } catch (error) {
    await unlink(temp).catch(() => {})
    throw error
  }
}
