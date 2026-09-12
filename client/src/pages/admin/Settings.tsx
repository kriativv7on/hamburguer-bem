import { useEffect, useRef, useState } from "react";
import {
  Clock3,
  ImagePlus,
  Instagram,
  Link2,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  Save,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { api, setAdminPin } from "@/lib/api";
import type { StoreSettings } from "@shared/types";

const inputClass =
  "h-12 w-full rounded-full border border-[#171614]/15 bg-[#ebe5d9] px-5 text-sm text-[#171614] outline-none transition-colors placeholder:text-[#171614]/40 focus:border-[#d96014]";
const labelClass =
  "block text-[10px] font-black uppercase tracking-[0.18em] text-[#171614]/50";

function fileToResizedDataUrl(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem inválida."));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível processar a imagem."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
    };
    reader.readAsDataURL(file);
  });
}

const flamePath =
  "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z";

const FLAME_URL = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="20" fill="#ffffff"/><path d="${flamePath}" fill="#f47721" transform="translate(5 5) scale(2.25)"/></svg>`
)}`;

function roundImage(src: string, size = 88, radius = 26): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Imagem inválida."));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Não foi possível processar a imagem."));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, radius);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, radius);
      ctx.clip();
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      ctx.restore();
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = src;
  });
}

export default function SettingsAdmin() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

  const [qrCenterImg, setQrCenterImg] = useState(FLAME_URL);

  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!settings?.logo) {
      setQrCenterImg(FLAME_URL);
      return;
    }
    let alive = true;
    roundImage(settings.logo)
      .then((rounded) => {
        if (alive) setQrCenterImg(rounded);
      })
      .catch(() => {
        if (alive) setQrCenterImg(FLAME_URL);
      });
    return () => {
      alive = false;
    };
  }, [settings?.logo]);

  useEffect(() => {
    api
      .getAdminSettings()
      .then((settings) => {
        setSettings(settings);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Erro ao carregar configurações.")
      )
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) =>
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      toast.success("Configurações salvas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const onLogoFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      update("logo", dataUrl);
      toast.success("Logo atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar o logo.");
    }
  };

  const downloadQR = () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "cardapio-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const changePin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPinBusy(true);
    try {
      await api.changePin({ currentPin, newPin });
      setAdminPin(newPin);
      setCurrentPin("");
      setNewPin("");
      toast.success("Senha alterada com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao trocar a senha.");
    } finally {
      setPinBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-[#171614]/50">
        <Loader2 size={18} className="animate-spin" /> Carregando configurações...
      </div>
    );
  }

  if (error || !settings) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {error ?? "Nenhum dado encontrado."}
      </p>
    );
  }

  const menuUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d96014]">
          Configurações da hamburgueria
        </p>
        <h1 className="mt-2 font-display text-5xl leading-[0.9] tracking-[0.02em]">
          CONFIGURAÇÕES
        </h1>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-3xl border border-[#171614]/10 bg-white/70 p-5">
            <div className="flex items-center gap-2">
              <Store size={16} className="text-[#d96014]" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#171614]/60">
                Identidade
              </h2>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className={labelClass} htmlFor="set-name">Nome do estabelecimento</label>
                <input
                  id="set-name"
                  className={inputClass}
                  value={settings.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Hambúrguer Bem"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="set-tagline">Slogan / descrição</label>
                <textarea
                  id="set-tagline"
                  rows={2}
                  className={`h-auto min-h-[88px] w-full resize-none rounded-3xl border border-[#171614]/15 bg-[#ebe5d9] px-5 py-4 text-sm text-[#171614] outline-none transition-colors placeholder:text-[#171614]/40 focus:border-[#d96014]`}
                  value={settings.tagline}
                  onChange={(event) => update("tagline", event.target.value)}
                  placeholder="Comida honesta, molho na medida..."
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#171614]/10 bg-white/70 p-5">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-[#d96014]" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#171614]/60">
                Endereço e horário
              </h2>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="set-city">Cidade</label>
                <input
                  id="set-city"
                  className={inputClass}
                  value={settings.city}
                  onChange={(event) => update("city", event.target.value)}
                  placeholder="Nova Iguaçu, RJ"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="set-hours">
                  <span className="inline-flex items-center gap-1.5"><Clock3 size={12} /> Horário de funcionamento</span>
                </label>
                <input
                  id="set-hours"
                  className={inputClass}
                  value={settings.hours}
                  onChange={(event) => update("hours", event.target.value)}
                  placeholder="Ter–Dom · 18h–23h"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="set-address">Endereço</label>
                <input
                  id="set-address"
                  className={inputClass}
                  value={settings.address}
                  onChange={(event) => update("address", event.target.value)}
                  placeholder="Rua, número, bairro"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="set-delivery">Nota de entrega</label>
                <input
                  id="set-delivery"
                  className={inputClass}
                  value={settings.delivery_note}
                  onChange={(event) => update("delivery_note", event.target.value)}
                  placeholder="Entrega local"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#171614]/10 bg-white/70 p-5">
            <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#171614]/60">
              <MessageCircle size={16} className="text-[#d96014]" /> Contatos
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="set-whatsapp">WhatsApp</label>
                <input
                  id="set-whatsapp"
                  className={inputClass}
                  value={settings.whatsapp}
                  onChange={(event) => update("whatsapp", event.target.value)}
                  placeholder="5521999999999"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="set-instagram">Instagram</label>
                <input
                  id="set-instagram"
                  className={inputClass}
                  value={settings.instagram}
                  onChange={(event) => update("instagram", event.target.value)}
                  placeholder="@hamburguerbem"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="set-phone">
                  <span className="inline-flex items-center gap-1.5"><Phone size={12} /> Telefone</span>
                </label>
                <input
                  id="set-phone"
                  className={inputClass}
                  value={settings.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="(21) 99999-0000"
                />
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-4 text-[#171614]/45">
              WhatsApp e Instagram aparecem como botões no rodapé do cardápio. O WhatsApp precisa estar no formato internacional com DDI (ex.: 5521999999999).
            </p>
          </section>

          <section className="rounded-3xl border border-[#171614]/10 bg-white/70 p-5">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-[#d96014]" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#171614]/60">
                Trocar senha do painel
              </h2>
            </div>
            <form onSubmit={changePin} className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="pin-current">Senha atual</label>
                <input
                  id="pin-current"
                  className={inputClass}
                  type="password"
                  inputMode="numeric"
                  value={currentPin}
                  onChange={(event) => setCurrentPin(event.target.value)}
                  placeholder="4 a 8 dígitos"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="pin-new">Nova senha</label>
                <input
                  id="pin-new"
                  className={inputClass}
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(event) => setNewPin(event.target.value)}
                  placeholder="4 a 8 dígitos"
                />
              </div>
              <div className="flex items-end">
                <button
                  disabled={pinBusy}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#171614] px-5 text-[11px] font-black uppercase tracking-[0.13em] text-[#f5f1e8] transition-colors hover:bg-[#2d2b27] active:scale-[0.98] disabled:opacity-60"
                >
                  {pinBusy ? "Salvando..." : "Alterar senha"}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl border border-[#171614]/10 bg-white/70 p-5">
            <div className="flex items-center gap-2">
              <ImagePlus size={16} className="text-[#d96014]" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#171614]/60">
                Logo
              </h2>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-[#171614] text-[#f47721]">
                {settings.logo ? (
                  <img src={settings.logo} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-2xl">B</span>
                )}
              </div>
              <div className="min-w-0 space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#f47721] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#171614] transition-colors hover:bg-[#ff9145]">
                  <ImagePlus size={14} /> Enviar logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => onLogoFile(event.target.files?.[0])}
                  />
                </label>
                {settings.logo && (
                  <button
                    onClick={() => update("logo", "")}
                    className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-red-600 hover:text-red-500"
                  >
                    <Trash2 size={13} /> Remover logo
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#171614]/10 bg-white/70 p-5">
            <div className="flex items-center gap-2">
              <QrCode size={16} className="text-[#d96014]" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#171614]/60">
                QR code do cardápio
              </h2>
            </div>
            <div className="mx-auto mt-4 grid place-items-center">
              <div className="rounded-[24px] bg-[#f47721] p-2 shadow-[0_10px_28px_rgba(244,119,33,0.28)]">
                <div className="overflow-hidden rounded-[18px] bg-white p-1">
                  <QRCodeCanvas
                    ref={qrRef}
                    value={menuUrl || "https://hamburguer-bem-production.up.railway.app"}
                    size={176}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#171614"
                    marginSize={3}
                    imageSettings={{ src: qrCenterImg, height: 48, width: 48, excavate: true }}
                  />
                </div>
              </div>
            </div>
            <p className="mt-3 flex items-center justify-center gap-1.5 break-all text-center text-[11px] text-[#171614]/50">
              <Link2 size={12} className="shrink-0" /> {menuUrl || "URL indisponível"}
            </p>
            <button
              onClick={downloadQR}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#171614] px-5 py-3 text-[11px] font-black uppercase tracking-[0.13em] text-[#f5f1e8] transition-colors hover:bg-[#2d2b27] active:scale-[0.98]"
            >
              Baixar QR code (PNG)
            </button>
          </section>

          <button
            onClick={save}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f47721] px-6 py-4 text-xs font-black uppercase tracking-[0.14em] text-[#171614] shadow-[0_8px_24px_rgba(244,119,33,0.22)] transition-all hover:bg-[#ff9145] active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Salvando..." : "Salvar configurações"}
          </button>
          <p className="text-center text-[10px] leading-4 text-[#171614]/40">
            As mudanças aparecem no cardápio imediatamente após salvar. O QR code aponta para esta URL do cardápio.
          </p>
        </div>
      </div>
    </div>
  );
}