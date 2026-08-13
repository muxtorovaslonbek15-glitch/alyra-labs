import Image from "next/image";
import Link from "next/link";

type Size = "sm" | "md" | "lg" | "hero";

const SIZES: Record<
  Size,
  { mark: number; text: string; gap: string }
> = {
  sm: { mark: 28, text: "text-lg", gap: "gap-2" },
  md: { mark: 36, text: "text-2xl", gap: "gap-2.5" },
  lg: { mark: 48, text: "text-3xl", gap: "gap-3" },
  hero: { mark: 72, text: "text-5xl sm:text-7xl md:text-8xl", gap: "gap-4 sm:gap-5" },
};

type Props = {
  size?: Size;
  href?: string | null;
  /** Show wordmark next to the angel mark */
  showWordmark?: boolean;
  /** Light wordmark for dark surfaces (mark already includes black plate) */
  onDark?: boolean;
  className?: string;
  wordmarkClassName?: string;
};

export function AlyraMark({
  size = "md",
  href = "/lab",
  showWordmark = true,
  onDark = false,
  className = "",
  wordmarkClassName = "",
}: Props) {
  const s = SIZES[size];
  const content = (
    <span
      className={`inline-flex min-w-0 items-center ${s.gap} ${className}`}
    >
      <Image
        src="/alyra-logo.png"
        alt=""
        width={s.mark}
        height={s.mark}
        className="h-auto w-auto shrink-0 rounded-sm"
        priority={size === "hero"}
      />
      {showWordmark ? (
        <span
          className={`font-display font-semibold leading-display tracking-display ${s.text} ${
            onDark ? "text-white" : "text-lab-ink"
          } ${wordmarkClassName}`}
        >
          Alyra Labs
        </span>
      ) : (
        <span className="sr-only">Alyra Labs</span>
      )}
    </span>
  );

  if (href === null) return content;
  return (
    <Link href={href} className="min-w-0 transition hover:opacity-90">
      {content}
    </Link>
  );
}
