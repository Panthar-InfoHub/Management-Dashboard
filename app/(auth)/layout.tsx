import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center w-full max-w-md">
        <div className="mb-8 flex items-center justify-center bg-white p-3 rounded-2xl shadow-sm border border-black/5">
          <Image src="/images/black_logo.webp" alt="Panthar Logo" width={48} height={48} className="object-contain" priority />
        </div>
        {children}
      </div>
    </div>
  );
}
