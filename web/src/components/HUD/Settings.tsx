/**
 * SETTINGS PANEL — in-app config without editing config.yaml.
 *
 * Covers the controls most users actually want to flip: voice on/off,
 * wake-word capture, persona/agent, permission mode, FLUX preload, panel
 * layout reset, full state wipe. Read-only mirrors of server health are
 * shown for context. Anything that requires a backend restart is flagged.
 */
import { useEffect, useState } from "react";
import { useStore } from "../../lib/store";
import { resetAllLayouts } from "./Floating";

export default function Settings() {
  const health = useStore((s) => s.health);
  const voiceEnabled = useStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useStore((s) => s.setVoiceEnabled);
  const wakeEnabled = useStore((s) => s.wakeEnabled);
  const setWakeEnabled = useStore((s) => s.setWakeEnabled);
  const bargeIn = useStore((s) => s.bargeIn);
  const setBargeIn = useStore((s) => s.setBargeIn);
  const clearChat = useStore((s) => s.clearChat);
  const clearMedia = useStore((s) => s.clearMedia);
  const clearTools = useStore((s) => s.clearTools);
  const setReader = useStore((s) => s.setReader);
  const prevSessionAvailable = useStore((s) => s.prevSessionAvailable);
  const restoreLastSession = useStore((s) => s.restoreLastSession);

  const [agents, setAgents] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((j) => setAgents(j?.agents || []))
      .catch(() => undefined);
  }, []);

  const cleanSlate = async () => {
    if (!confirm("清除所有聊天、媒体和工具历史？后端记忆保留。")) return;
    clearChat();
    clearMedia();
    clearTools();
    setReader(null);
    try { await fetch("/api/cleanslate", { method: "POST" }); } catch { /* noop */ }
  };

  return (
    <div className="holo-panel flex flex-col h-full overflow-hidden">
      <div className="panel-header flex items-center justify-between px-3 py-2 shrink-0">
        <span className="text-display text-[11px] tracking-[0.4em] text-shimmer">设置</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-5 text-mono text-[12px] text-friday-ice/85">
        {prevSessionAvailable && (
          <Section title="会话">
            <div className="text-[10px] text-friday-ice/45 pb-1">
              启动时保留了上一次会话，记忆始终保留。
            </div>
            <ButtonRow label="恢复上次会话" onClick={() => restoreLastSession()} />
          </Section>
        )}

        <Section title="语音">
          <Toggle
            label="FRIDAY 语音播报 (TTS)"
            value={voiceEnabled}
            onChange={setVoiceEnabled}
          />
          <Toggle
            label="监听唤醒词（麦克风常开）"
            value={wakeEnabled}
            onChange={setWakeEnabled}
          />
          <Toggle
            label='说"取消"停止 FRIDAY 说话'
            value={bargeIn}
            onChange={setBargeIn}
          />
        </Section>

        <Section title="显示">
          <ButtonRow
            label="重置面板布局"
            danger={false}
            onClick={() => { if (confirm("重置所有面板位置？")) resetAllLayouts(); }}
          />
        </Section>

        <Section title="系统">
          <KV k="模型"        v={`${health?.model.provider || "—"}/${health?.model.model || "—"}`} />
          <KV k="图像模型"  v={health?.image_model || "—"} />
          <KV k="权限"  v={health?.permission_mode || "—"} />
          <KV k="已加载工具" v={String(health?.tools ?? 0)} />
          <KV k="插件"      v={String(health?.plugins?.length ?? 0)} />
          <KV k="代理"       v={(agents.length ? agents : health?.agents || []).join(", ") || "—"} />
          <div className="pt-1 text-[10px] text-friday-ice/40">
            在 <span className="text-friday-aqua">config.yaml</span> 中修改，需重启后端。
          </div>
        </Section>

        <Section title="数据">
          <ButtonRow label="清除聊天记录" onClick={() => { if (confirm("清除聊天？")) clearChat(); }} />
          <ButtonRow label="清除媒体库"    onClick={() => { if (confirm("清除媒体？")) clearMedia(); }} />
          <ButtonRow label="清除工具历史" onClick={() => { if (confirm("清除工具历史？")) clearTools(); }} />
          <ButtonRow label="全部清除（聊天+媒体+工具+后端会话）" danger onClick={cleanSlate} />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="text-[9px] tracking-[0.35em] text-friday-cyan/70 uppercase">{title}</div>
      <div className="space-y-1.5 rounded-lg border border-friday-cyan/10 bg-friday-glass/40 p-3">
        {children}
      </div>
    </section>
  );
}

function Toggle({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer py-1">
      <span className="text-friday-ice/85">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="relative w-9 h-5 rounded-full transition-colors"
        style={{
          background: value ? "rgba(125,211,252,0.7)" : "rgba(186,230,253,0.15)",
          boxShadow: value ? "0 0 12px rgba(125,211,252,0.6)" : "none",
        }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-friday-ice transition-all"
          style={{ left: value ? 18 : 2 }}
        />
      </button>
    </label>
  );
}

function ButtonRow({
  label, onClick, danger = false,
}: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 rounded-md transition-colors border text-[11px] ${
        danger
          ? "border-friday-danger/30 text-friday-danger hover:bg-friday-danger/10 hover:border-friday-danger/55"
          : "border-friday-cyan/15 text-friday-ice/85 hover:bg-friday-cyan/10 hover:border-friday-cyan/40"
      }`}
    >
      {label}
    </button>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5 text-[11px]">
      <span className="text-friday-ice/45">{k}</span>
      <span className="text-friday-ice/90 truncate max-w-[60%]" title={v}>{v}</span>
    </div>
  );
}
