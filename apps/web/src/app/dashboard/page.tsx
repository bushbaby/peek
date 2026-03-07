import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllTrackedItems } from '@peek/db'
import { DashboardClient } from '@/components/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const items = await getAllTrackedItems(supabase)

  return <DashboardClient items={items} userEmail={user.email ?? ''} userId={user.id} />
}
