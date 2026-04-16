"use client";

import { useState } from "react";
import {
  Shield,
  Lock,
  Zap,
  Monitor,
  Folder,
  Video,
  Phone,
  ChevronRight,
  ArrowRight,
  Star,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

//  Types 

interface Feature {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
  bg: string;
}

interface ChatMessage {
  name: string;
  msg: string;
  time: string;
  out: boolean;
  color: string;
  initial: string;
}

//  Data 

const NAV_LINKS = ["Features", "Security", "Contact"] as const;

const FEATURES: Feature[] = [
  {
    icon: Lock,
    title: "End-to-End Encryption",
    desc: "Every single message is encrypted using the sender and recipient keys so only the right people can ever read the messages. Not even our servers have access.",
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    icon: Phone,
    title: "Voice to Text",
    desc: "This voice-to-voice message technology can transcribe and translate — all processing that never leaves your hardware.",
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    icon: Video,
    title: "Video Calling",
    desc: "HD video calls with the same military grade encryption as your texts. P2P architecture for stunning conversations.",
    color: "#0891b2",
    bg: "#ecfeff",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    desc: "Optimised protocols ensure your messages arrive instantly, even on high-latency networks in limited data conditions.",
    color: "#d97706",
    bg: "#fffbeb",
  },
  {
    icon: Monitor,
    title: "Multi-Platform",
    desc: "Seamless sync across mobile, desktop, and web. Your secure environment follows you wherever you need to be.",
    color: "#16a34a",
    bg: "#f0fdf4",
  },
  {
    icon: Folder,
    title: "Smart Folders",
    desc: "Organise your secure chats with AI-powered folders that categorise your files, without ever reading your content.",
    color: "#dc2626",
    bg: "#fef2f2",
  },
];

const CHAT_MESSAGES: ChatMessage[] = [
  {
    name: "Alex M.",
    msg: "Hey! Is this end-to-end encrypted?",
    time: "9:41",
    out: false,
    color: "#7c3aed",
    initial: "A",
  },
  {
    name: "Sarah K.",
    msg: "Yes! Zero-knowledge proof",
    time: "9:42",
    out: false,
    color: "#0891b2",
    initial: "S",
  },
  {
    name: "You",
    msg: "Wow, that's incredible security!",
    time: "9:43",
    out: true,
    color: "#16a34a",
    initial: "Y",
  },
];

const AVATARS = [
  { color: "#7c3aed", letter: "A" },
  { color: "#0891b2", letter: "S" },
  { color: "#16a34a", letter: "J" },
  { color: "#dc2626", letter: "M" },
];

const TRUST_LOGOS = ["Google", "Microsoft", "Slack", "Notion", "Linear"];

//  Components 

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
            <Image src="/logo.png" height={75} width={75} className="rounded-2xl" alt="Logo" />
          </div>
          <span className="font-extrabold text-lg text-blue-900 tracking-tight">
            CipherTalk
          </span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex gap-8 items-center">
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href="#"
              className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
            >
              {link}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="outline" size="sm" className="text-slate-600">
            Login
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Get Started
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-slate-500"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden px-6 pb-4 flex flex-col gap-4 bg-white border-t border-slate-100">
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href="#"
              className="text-sm font-medium text-slate-600"
            >
              {link}
            </a>
          ))}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" size="sm" className="flex-1">
              Login
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Get Started
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}

function ChatPreview() {
  return (
    <div className="w-80 rounded-2xl overflow-hidden border border-slate-200 shadow-2xl shadow-blue-100 animate-[float_4s_ease-in-out_infinite]">
      {/* Header */}
      <div className="bg-blue-600 px-4 py-3 flex items-center gap-2">
        <Lock size={15} className="text-white" />
        <span className="text-white text-sm font-semibold">
          CipherTalk Encrypted
        </span>
        <div className="ml-auto w-2 h-2 rounded-full bg-green-400" />
      </div>

      {/* Messages label */}
      <div className="px-4 py-2 text-xs text-slate-400 border-b border-slate-100 bg-white">
        Messages
      </div>

      {/* Chat list */}
      {CHAT_MESSAGES.map((m, i) => (
        <div
          key={i}
          className={`flex gap-3 px-4 py-3 border-b border-slate-50 ${
            i === 2 ? "bg-blue-50/50" : "bg-white"
          }`}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: m.color }}
          >
            {m.initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-800">
                {m.name}
              </span>
              <span className="text-[10px] text-slate-400">{m.time} AM</span>
            </div>
            <div
              className={`text-xs px-3 py-1.5 rounded-xl inline-block ${
                m.out
                  ? "bg-blue-600 text-white rounded-br-sm ml-auto"
                  : "bg-blue-50 text-blue-800 rounded-bl-sm"
              }`}
            >
              {m.msg}
            </div>
          </div>
        </div>
      ))}

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50">
        <div className="flex-1 bg-white rounded-full px-4 py-2 text-xs text-slate-400 border border-slate-200">
          Type a secure message…
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <ArrowRight size={14} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 py-20 px-6">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-16 right-[8%] w-96 h-96 rounded-full bg-blue-400/10" />
      <div className="pointer-events-none absolute -bottom-20 left-[5%] w-72 h-72 rounded-full bg-violet-400/8" />

      <div className="relative max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left – copy */}
        <div className="flex-1 max-w-lg animate-[fadeUp_0.7s_ease_both]">
          <Badge className="mb-5 bg-blue-100 text-blue-700 hover:bg-blue-100 uppercase tracking-wide text-[11px] font-semibold">
            🔒 World&#39;s Most Secure Platform
          </Badge>

          <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.05] tracking-tight text-slate-900 mb-4">
            Communication
            <br />
            without
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              compromise.
            </span>
          </h1>

          <p className="text-base text-slate-500 leading-relaxed mb-8 max-w-md">
            The world&#39;s most secure messaging platform built for teams who
            value privacy. End-to-end encrypted, zero-knowledge, and beautifully
            simple.
          </p>

          <div className="flex flex-wrap gap-3 mb-8">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 gap-2">
              Get Started for Free <ChevronRight size={16} />
            </Button>
            <Button
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold px-6 gap-2"
            >
              <Phone size={15} /> Contact Us
            </Button>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3">
            <div className="flex">
              {AVATARS.map((a, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                  style={{
                    background: a.color,
                    marginLeft: i ? -8 : 0,
                    zIndex: AVATARS.length - i,
                    position: "relative",
                  }}
                >
                  {a.letter}
                </div>
              ))}
            </div>
            <div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={12}
                    className="fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500">
                1,200+ users trust CipherTalk daily
              </p>
            </div>
          </div>
        </div>

        {/* Right – chat UI */}
        <div className="flex-shrink-0 animate-[fadeUp_0.9s_ease_both]">
          <ChatPreview />
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <div className="bg-white border-y border-slate-100 py-5 px-6">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-8">
        <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest">
          Trusted by teams at
        </span>
        {TRUST_LOGOS.map((l) => (
          <span
            key={l}
            className="text-sm font-bold text-slate-300 tracking-tight"
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function Features() {
  return (
    <section className="py-24 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100 uppercase tracking-wide text-[11px] font-semibold">
            Privacy-first tools
          </Badge>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            Everything you need for
            <br />
            secure collaboration.
          </h2>
          <p className="text-base text-slate-500 max-w-md mx-auto leading-relaxed">
            We&#39;ve built the most robust communication features without
            compromising on your privacy or data integrity.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <Card
              key={i}
              className="border border-slate-200 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-blue-50 hover:border-blue-200 transition-all duration-300 cursor-default"
            >
              <CardContent className="pt-7 pb-7 px-6">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: f.bg }}
                >
                  <f.icon
                    size={20}
                    style={{ color: f.color }}
                    strokeWidth={2}
                  />
                </div>
                <h3 className="text-[15px] font-bold text-slate-800 mb-2">
                  {f.title}
                </h3>
                <p className="text-[13.5px] text-slate-500 leading-relaxed">
                  {f.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 to-blue-900 py-20 px-6">
      <div className="pointer-events-none absolute -top-10 right-[5%] w-72 h-72 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-16 left-[10%] w-56 h-56 rounded-full bg-white/4" />

      <div className="relative max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-10">
        {/* Copy */}
        <div className="max-w-md">
          <h2 className="text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Ready to take control
            <br />
            of your privacy?
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed mb-5">
            Join millions of users who have switched to CipherTalk for a more
            secure, distraction-free communication experience.
          </p>
          <div className="flex flex-wrap gap-4">
            <span className="flex items-center gap-1.5 text-blue-300 text-sm">
              <CheckCircle size={14} className="text-green-400" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5 text-blue-300 text-sm">
              <CheckCircle size={14} className="text-green-400" />
              Free for personal use
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-6 gap-2 shadow-lg">
            Get Started Now <ChevronRight size={16} />
          </Button>
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 font-semibold px-6 backdrop-blur-sm"
          >
            Contact Sales
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const footerLinks = [
    "Features",
    "Security",
    "Pricing",
    "Blog",
    "Contact",
    "Privacy Policy",
    "Terms",
  ];
  return (
    <footer className="bg-slate-900 px-6 pt-12 pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <Shield size={15} className="text-white" />
          </div>
          <span className="font-bold text-base text-white">CipherTalk</span>
        </div>

        <div className="flex flex-wrap gap-6 mb-10">
          {footerLinks.map((l) => (
            <a
              key={l}
              href="#"
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              {l}
            </a>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row justify-between gap-3">
          <span className="text-xs text-slate-500">
            © 2025 CipherTalk. All rights reserved.
          </span>
          <span className="text-xs text-slate-600">
            Built with end-to-end encryption
          </span>
        </div>
      </div>
    </footer>
  );
}

//  Page 

export default function page() {
  return (
    <main>
      <Navbar />
      <Hero />
      <TrustBar />
      <Features />
      <CTA />
      <Footer />
    </main>
  );
}
