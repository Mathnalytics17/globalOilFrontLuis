export default function AuthShell({ title, subtitle, children, footer, wide = false }) {
  return (
    <main className="min-h-screen bg-[#111214] text-white">
      <header className="flex h-16 items-center border-b border-white/[0.06] px-5 sm:px-8">
        <img src="/logo-global-oil.png" alt="Global Oil" className="h-8 w-auto" />
      </header>
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-10">
        <section className={`w-full ${wide ? 'max-w-5xl' : 'max-w-md'} rounded-xl border border-white/[0.08] bg-[#191b1e] p-6 sm:p-7`}>
          <div className="mb-6 border-b border-white/[0.06] pb-5">
            <h1 className="m-0 text-2xl font-semibold tracking-[-0.03em] text-[#f3f4f6]">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm leading-6 text-[#858b94]">{subtitle}</p> : null}
          </div>
          {children}
          {footer ? <div className="mt-6 border-t border-white/[0.06] pt-5 text-sm text-[#858b94]">{footer}</div> : null}
        </section>
      </div>
    </main>
  );
}
