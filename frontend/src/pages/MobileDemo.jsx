import { Info, QrCode } from "lucide-react";
import { Card, H } from "../ui";
import NativeCitizenApp from "../components/NativeCitizenApp";

export default function MobileDemo() {
  return (
    <>
      <H
        title="Citizen Mobile App (Live Demo)"
        sub="Test the citizen grievance portal in real-time. Any complaint submitted here communicates with the live database and appears on the AICTE Dashboard."
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Cloud Connected
        </span>
      </H>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Left Side: Virtual Phone Container */}
        <div className="flex flex-col items-center">
          <div className="relative mx-auto w-full max-w-[390px] rounded-[48px] border-[12px] border-slate-900 bg-slate-900 p-2 shadow-2xl">
            {/* Top Phone Notch / Dynamic Island */}
            <div className="absolute left-1/2 top-4 z-20 h-5 w-28 -translate-x-1/2 rounded-full bg-black flex items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-slate-800" />
            </div>

            {/* Screen Area: Native Citizen Mobile App Embedded Directly */}
            <div className="relative h-[680px] w-full overflow-hidden rounded-[36px] bg-slate-950 pt-3">
              <NativeCitizenApp />
            </div>

            {/* Bottom Home Indicator */}
            <div className="absolute bottom-3 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-slate-600 pointer-events-none" />
          </div>
        </div>

        {/* Right Side: Evaluation Guide & Architecture */}
        <div className="space-y-4">
          <Card>
            <h3 className="mb-2 font-display text-lg font-extrabold flex items-center gap-2">
              <Info size={18} className="text-brand" /> How Judges Can Test This
            </h3>
            <ol className="list-decimal space-y-2 pl-4 text-sm text-ink/80">
              <li>
                <b>Passwordless OTP Login</b>: Enter any valid email. Receive the 6-digit OTP in your inbox to verify identity.
              </li>
              <li>
                <b>Lodge Grievance</b>: Select an institution (e.g. <i>Sahyadri Institute of Technology</i>), select <i>Infrastructure</i>, and write a description.
              </li>
              <li>
                <b>Verifiable Evidence</b>: Capture a field photo (auto-embeds live GPS coordinates & physical address) and attach a document.
              </li>
              <li>
                <b>Verify Live Intake</b>: Switch to the <b>Cases</b> tab or <b>Dashboard</b> on this portal to see your complaint registered immediately.
              </li>
              <li>
                <b>Track Grievance</b>: Use the <i>Track Any</i> tab on the mobile app to verify real-time status and timeline tracking.
              </li>
            </ol>
          </Card>

          <Card>
            <h3 className="mb-2 font-display text-lg font-extrabold flex items-center gap-2">
              <QrCode size={18} className="text-brand" /> Native Mobile App Highlights
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-raised p-2.5">
                <span className="font-bold text-ink">Tech Stack</span>
                <p className="text-muted mt-0.5">React Native 0.88, Expo SDK 58</p>
              </div>
              <div className="rounded-lg bg-raised p-2.5">
                <span className="font-bold text-ink">Field Evidence</span>
                <p className="text-muted mt-0.5">Device GPS & Reverse Geocoding</p>
              </div>
              <div className="rounded-lg bg-raised p-2.5">
                <span className="font-bold text-ink">Authentication</span>
                <p className="text-muted mt-0.5">Secure Email OTP (Apps Script / Brevo)</p>
              </div>
              <div className="rounded-lg bg-raised p-2.5">
                <span className="font-bold text-ink">Data Integrity</span>
                <p className="text-muted mt-0.5">Clean citizen-to-bureau provenance</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
