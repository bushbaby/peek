'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { insertTrackedItem, updateTrackedItem, deleteTrackedItem, setPaused } from '@peek/db'
import { isValidSelector, validateUrl } from '@peek/checker'

async function getAuthenticatedClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

export async function addTrackedItemAction(formData: FormData) {
  const raw = String(formData.get('url') ?? '')
  await validateUrl(raw)
  const url = new URL(raw).toString()
  const selector = String(formData.get('selector') ?? '').trim()

  if (!selector) throw new Error('CSS selector is required')
  if (!isValidSelector(selector)) throw new Error('Invalid CSS selector')

  const { supabase, user } = await getAuthenticatedClient()
  await insertTrackedItem(supabase, { url, selector, user_id: user.id })
  revalidatePath('/dashboard')
}

export async function updateTrackedItemAction(id: string, formData: FormData) {
  const raw = String(formData.get('url') ?? '')
  await validateUrl(raw)
  const url = new URL(raw).toString()
  const selector = String(formData.get('selector') ?? '').trim()

  if (!selector) throw new Error('CSS selector is required')
  if (!isValidSelector(selector)) throw new Error('Invalid CSS selector')

  const { supabase } = await getAuthenticatedClient()
  await updateTrackedItem(supabase, id, { url, selector })
  revalidatePath('/dashboard')
}

export async function deleteTrackedItemAction(id: string) {
  const { supabase } = await getAuthenticatedClient()
  await deleteTrackedItem(supabase, id)
  revalidatePath('/dashboard')
}

export async function togglePauseAction(id: string, isPaused: boolean) {
  const { supabase } = await getAuthenticatedClient()
  await setPaused(supabase, id, isPaused)
  revalidatePath('/dashboard')
}
