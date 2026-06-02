import { requireSession } from '@/lib/session'

export default async function ProfilePage() {
  const session = await requireSession()
  const { name, email } = session.user

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">Profile</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Manage your personal information and preferences.
      </p>

      <div className="space-y-6">
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">
            Personal Info
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="block text-xs font-medium text-zinc-500 mb-1">
                Name
              </span>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                {name}
              </div>
            </div>
            <div>
              <span className="block text-xs font-medium text-zinc-500 mb-1">
                Email
              </span>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                {email}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
