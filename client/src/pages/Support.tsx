import { SupportContent } from "@/components/SupportContent";

export default function Support() {
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
    <p className="mb-8"><a className="text-sm font-medium text-[var(--rose-700)] underline underline-offset-4" href="/">Voltar ao sistema</a></p>
    <SupportContent />
  </main>;
}