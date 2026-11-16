"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Menu,
  Moon,
  Sun,
  X,
  FlaskConical,
  ArrowUpRight,
} from "lucide-react";
import { navigationItems, workspaceItems } from "@/lib/presentation";

export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link
      className={`institution-brand${footer ? " footer-brand" : ""}`}
      href="/"
      aria-label="CardioLens AI home"
    >
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path
          d="M20 3 37 20 20 37 3 20Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M20 10 30 20 20 30 10 20Z" stroke="currentColor" />
        <path d="M20 13v14M13 20h14" stroke="currentColor" strokeWidth="2" />
        <path d="M29 7h4v4" stroke="var(--saffron)" strokeWidth="2.5" />
      </svg>
      <span>
        CardioLens <b>AI</b>
        <small>CARDIOVASCULAR RESEARCH</small>
      </span>
    </Link>
  );
}
export function SiteHeader({
  section,
  ready,
  offline,
}: {
  section: string;
  ready: boolean;
  offline: boolean;
}) {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(
    () => setDark(document.documentElement.dataset.theme === "dark"),
    [],
  );
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    dialog.current?.close();
  }, [open]);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function theme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("cardiolens-theme-v2", next ? "dark" : "light");
    } catch {
      /* Theme still works without storage. */
    }
  }
  return (
    <>
      <a className="skip-link" href="#workspace-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="institution-strip">
          <span>
            <FlaskConical size={13} /> Independent research prototype
          </span>
          <span>For education & research · Not a medical diagnosis</span>
        </div>
        <div className="site-navigation">
          <Brand />
          <nav className="primary-navigation" aria-label="Main navigation">
            {navigationItems.map((item) => (
              <Link
                href={item.href}
                key={item.section}
                aria-current={section === item.section ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="site-actions">
            <button
              className="icon-button"
              onClick={theme}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link href="/predict" className="button primary header-cta">
              Start Assessment <ArrowRight size={15} />
            </Link>
            <button
              ref={trigger}
              className="icon-button navigation-trigger"
              aria-label="Open navigation"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={23} />
            </button>
          </div>
        </div>
      </header>
      {section !== "home" && (
        <div className="workspace-utility">
          <nav aria-label="Workspace tools">
            {workspaceItems.map((item) => (
              <Link
                key={item.section}
                href={item.href}
                aria-current={section === item.section ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span className={`engine ${ready ? "online" : ""}`} role="status">
            <span className="status-dot" />
            {ready
              ? "Research model ready"
              : offline
                ? "Backend offline"
                : "Connecting to model"}
          </span>
        </div>
      )}
      <dialog
        ref={dialog}
        id="mobile-navigation"
        className="navigation-dialog"
        aria-label="Navigation"
        onCancel={close}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="drawer-heading">
          <Brand />
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close navigation"
          >
            <X size={24} />
          </button>
        </div>
        <nav aria-label="Mobile navigation">
          {[...navigationItems, ...workspaceItems].map((item) => (
            <Link
              href={item.href}
              onClick={close}
              key={item.section}
              aria-current={section === item.section ? "page" : undefined}
            >
              {item.label}
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </nav>
        <p className="caption">
          Independent research. No hospital, government, or medical association
          affiliation.
        </p>
      </dialog>
    </>
  );
}
export function SiteFooter() {
  return (
    <footer className="institution-footer">
      <div className="footer-top">
        <div>
          <Brand footer />
          <p>
            Intelligent cardiovascular research & assessment.
            <br />
            Clarity in the data. Context in every result.
          </p>
        </div>
        <nav aria-label="Footer research links">
          <span>Explore the research</span>
          <Link href="/models">Model evaluation</Link>
          <Link href="/insights">Measurement definitions</Link>
          <Link href="/about">Methods & limitations</Link>
        </nav>
        <nav aria-label="Footer workspace links">
          <span>Your workspace</span>
          <Link href="/dashboard">Overview</Link>
          <Link href="/history">Measurement history</Link>
          <Link href="/reports">Assessment reports</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <p>
          Research prototype · Not a medical diagnosis. Clinical findings should
          be interpreted by a qualified clinician. No clinical validation in
          India.
        </p>
        <Link href="/about">
          Privacy & responsible use <ArrowUpRight size={14} />
        </Link>
      </div>
    </footer>
  );
}
