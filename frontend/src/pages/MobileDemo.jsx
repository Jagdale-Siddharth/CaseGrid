import { useState } from "react";
import { ExternalLink, Info, QrCode, RefreshCw, Smartphone } from "lucide-react";
import { Card, H, Tag } from "../ui";

export default function MobileDemo() {
  const defaultAppetize = "https://appetize.io/embed/ykacqpc5al7fdtsaqoflpkhefi?device=pixel7&osVersion=13.0&scale=75";
  const [appetizeUrl, setAppetizeUrl] = useState(
    import.meta.env.VITE_APPETIZE_URL || defaultAppetize
  );
  const [inputUrl, setInputUrl] = useState("");

  const handleUpdate = (e) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      setAppetizeUrl(inputUrl.trim());
    }
  };

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

            {/* Screen Area */}
            <div className="relative h-[680px] w-full overflow-hidden rounded-[36px] bg-slate-950">
              {appetizeUrl ? (
                <iframe
                  src={appetizeUrl}
                  title="Appetize Virtual Mobile Simulator"
                  className="h-full w-full border-0"
                  allow="geolocation; camera"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-300">
                  <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand text-onbrand shadow-lg">
                    <Smartphone size={32} />
                  </div>
                  <h3 className="font-display text-xl font-bold text-white">
                    Appetize.io Virtual Phone
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    Upload your built APK to <b>Appetize.io</b>, then paste your embed URL or public key below to stream the interactive phone directly inside this portal.
                  </p>

                  <form onSubmit={handleUpdate} className="mt-6 w-full space-y-2">
                    <input
                      type="url"
                      placeholder="Paste Appetize embed URL"
                      className="field text-xs bg-slate-900 text-white border-slate-700"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary w-full text-xs">
                      Load Virtual Phone
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Bottom Home Indicator */}
            <div className="absolute bottom-3 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-slate-600" />
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
                <b>Passwordless OTP Login</b>: Enter any valid email. Receive the 6-digit OTP in your inbox (or via preview) to verify identity.
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
                <b>Track Grievance</b>: Use the <i>Track Complaint</i> tab on the mobile app to verify real-time status and timeline tracking.
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
                <p className="text-muted mt-0.5">Secure Email OTP (Resend / SMTP)</p>
              </div>
              <div className="rounded-lg bg-raised p-2.5">
                <span className="font-bold text-ink">Data Integrity</span>
                <p className="text-muted mt-0.5">Clean citizen-to-bureau provenance</p>
              </div>
            </div>

            <div className="mt-4 border-t border-line pt-3">
              <a
                href="https://expo.dev/artifacts/eas/LsWb9ZMLO7SYpTgSCYs9dw-hrOmZ428Zv5PNzvErYd4.apk"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary w-full text-center text-xs flex items-center justify-center gap-2"
              >
                <ExternalLink size={14} /> Download Standalone Android APK
              </a>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
