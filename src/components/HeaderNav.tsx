"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

const HeaderNav = ({ name, link }: { name: string; link: string }) => {
  const router = useRouter();
  return (
    <>
      <header className="relative w-full flex items-center bg-primary p-4">
        {/* <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[6px] opacity-80 bg-[repeating-linear-gradient(135deg,#ef4444_0,#ef4444_12px,#ffffff_12px,#ffffff_24px,#10b981_24px,#10b981_36px)]" /> */}

        <div className="absolute left-1">
          <Link href={`/${link}`}>
            <ChevronLeft className="w-7 h-7 md:mb-0 text-white md:hover:text-primary-light" />
          </Link>
        </div>
        <div className="w-full text-center text-white">{name}</div>
      </header>
    </>
  );
};

export default HeaderNav;
