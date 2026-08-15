export default function SectionHead({
  eyebrow,
  title,
  emphasis,
  description,
  onDark = false,
}: {
  eyebrow: string;
  title: string;
  emphasis?: string;
  description?: string;
  onDark?: boolean;
}) {
  return (
    <div className="max-w-xl mb-14">
      <span
        className={`eyebrow inline-block px-3 py-1.5 rounded-sm mb-5 ${
          onDark ? "bg-gold text-navy" : "bg-navy text-gold-bright"
        }`}
      >
        {eyebrow}
      </span>
      <h2
        className={`font-display text-[clamp(26px,3.2vw,38px)] ${
          onDark ? "text-ivory" : "text-ink"
        }`}
      >
        {title} {emphasis && <em className="text-gold not-italic italic">{emphasis}</em>}
      </h2>
      {description && (
        <p className={`mt-4 ${onDark ? "text-ivory/70" : "text-ink-soft"}`}>
          {description}
        </p>
      )}
    </div>
  );
}
