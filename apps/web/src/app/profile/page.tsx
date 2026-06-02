export default function ProfilePage() {
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
                Samuel Lu
              </div>
            </div>
            <div>
              <span className="block text-xs font-medium text-zinc-500 mb-1">
                Email
              </span>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                samuelbolu@gmail.com
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">
            About
          </h2>
          <p className="text-sm text-zinc-500">
            21-year-old Canadian student at the University of Toronto. Economics
            Major, Statistics Minor. Running a software/app development company.
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">
            Career Direction
          </h2>
          <p className="text-sm text-zinc-500">
            Applied Statistics / Data Science / Biostatistics / Health Data
            Analytics
          </p>
        </section>
      </div>
    </div>
  )
}
