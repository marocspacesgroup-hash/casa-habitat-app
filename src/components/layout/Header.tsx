"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { navLinks, ownerNavLink, siteConfig } from "@/config/site";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 bg-navy/95 backdrop-blur border-b border-gold/20 transition-[padding] duration-500 ${
        scrolled ? "py-3" : "py-5"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full border border-gold flex items-center justify-center font-display text-gold text-sm">
            CH
          </span>
          <span className="font-display text-ivory text-[17px] tracking-wide">
            CASA <em className="text-gold not-italic font-normal italic">Habitat</em>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-ivory/85 hover:text-gold transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={ownerNavLink.href}
            className="border border-gold text-gold text-xs uppercase tracking-wider px-5 py-2.5 rounded-sm hover:bg-gold hover:text-navy transition-colors"
          >
            {ownerNavLink.label}
          </Link>
        </nav>

        <button
          className="lg:hidden text-ivory"
          aria-label="Ouvrir le menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-navy border-t border-gold/20 px-6 py-6 flex flex-col gap-5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-ivory/90 text-sm"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={ownerNavLink.href}
            onClick={() => setMobileOpen(false)}
            className="text-gold text-sm font-medium"
          >
            {ownerNavLink.label} →
          </Link>
          <a
            href={`tel:${siteConfig.contact.phones[0]}`}
            className="text-ivory/60 text-xs font-mono"
          >
            {siteConfig.contact.phones[0]}
          </a>
        </div>
      )}
    </header>
  );
}
