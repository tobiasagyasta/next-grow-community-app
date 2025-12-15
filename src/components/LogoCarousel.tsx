import Image from "next/image";

import { cn } from "@/lib/utils";

type Logo = {
  src: string;
  alt?: string;
};

type LogoCarouselProps = {
  logos: Logo[];
  /**
   * Duration for one complete scroll cycle in seconds.
   * Increase for slower scroll, decrease for faster.
   */
  speedSeconds?: number;
  className?: string;
};

/**
 * Horizontally scrolling logo carousel that spans the full viewport width.
 * Logos are expected to be square (500 x 500 px) and will be scaled down responsively.
 */
const LogoCarousel = ({ logos, speedSeconds = 30, className }: LogoCarouselProps) => {
  if (!logos?.length) return null;

  // Duplicate the logos to create a seamless infinite scroll loop.
  const scrollingLogos = [...logos, ...logos];

  return (
    <div
      className={cn(
        "relative isolate left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen max-w-[100vw] overflow-hidden",
        "bg-gradient-to-b from-white via-slate-50 to-white py-8",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white via-white/70 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white via-white/70 to-transparent" />

      <div
        className="logo-marquee flex min-w-max items-center gap-6 px-6"
        style={{ ["--marquee-duration" as string]: `${speedSeconds}s` }}
      >
        {scrollingLogos.map((logo, index) => (
          <div
            key={`${logo.src}-${index}`}
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/80 p-3 shadow-md ring-1 ring-slate-200 backdrop-blur sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36"
          >
            <Image
              src={logo.src}
              alt={logo.alt ?? "Partner logo"}
              width={500}
              height={500}
              className="h-full w-full object-contain"
              sizes="(max-width: 640px) 28vw, (max-width: 1024px) 18vw, 12vw"
              priority
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogoCarousel;
