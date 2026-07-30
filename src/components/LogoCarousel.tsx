// components/LogoCarousel.jsx
"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const logos = [
  { src: "/logos/bluebells.png", alt: "Logo Bluebells" },
  { src: "/logos/kkbrothers.jpg", alt: "Logo KK" },
  { src: "/logos/tulus.png", alt: "Logo Tulus 2" },
  { src: "/logos/upper-room.png", alt: "Logo Upper Room" },
  { src: "/logos/bijimata.png", alt: "Logo Biji Mata" },
  { src: "/logos/artolite.png", alt: "Logo Artolite" },

  // Add more logos here
];

const LogoCarousel = () => {
  return (
    <div className=" md:w-full py-8 h-fit mt-8">
      <div className="flex relative overflow-hidden h-full before:absolute before:left-0 before:top-0 before:z-10 before:h-full before:w-10 before:bg-gradient-to-r  before:content-[''] after:absolute after:right-0 after:top-0 after:h-full after:w-10 after:bg-gradient-to-l  after:content-['']">
        <motion.div
          transition={{
            duration: 30,
            ease: "linear",
            repeat: Infinity,
          }}
          initial={{ translateX: 0 }}
          animate={{ translateX: "-50%" }}
          className="flex flex-none gap-16 pr-16"
        >
          {[...new Array(2)].fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {logos.map(({ src, alt }) => (
                <Image
                  key={alt}
                  src={src}
                  alt={alt}
                  width={400}
                  height={400}
                  className="h-24 md:h-32 w-auto flex-none grayscale-75 hover:grayscale-0"
                  sizes="(max-width: 640px) 28vw, (max-width: 1024px) 18vw, 12vw"
                  priority
                />
              ))}
            </React.Fragment>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default LogoCarousel;
