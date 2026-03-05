"use client";

export default function ChatPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8">
      <div className="glass rounded-2xl p-8 max-w-2xl w-full glow">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
          <img src="/logo-wizard.jpg" alt="Tevy" className="w-10 h-10 rounded-full" />
          <div>
            <div className="font-semibold">Tevy</div>
            <div className="text-xs text-[var(--muted)]">Your marketing assistant</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs text-[var(--muted)]">Online</span>
          </div>
        </div>

        <div className="text-center py-12">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-xl font-bold mb-2">Tevy is getting ready...</h2>
          <p className="text-[var(--muted)] text-sm mb-6">
            Analyzing your brand. This will be replaced with the actual OpenClaw webchat embed.
          </p>
          <div className="glass rounded-lg p-4 text-left text-sm">
            <p className="text-[var(--muted)] mb-2">This page will embed:</p>
            <ul className="space-y-1 text-[var(--muted)]">
              <li>• OpenClaw webchat widget connected to your Tevy instance</li>
              <li>• Real-time conversation with your marketing bot</li>
              <li>• File upload for brand guidelines</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
