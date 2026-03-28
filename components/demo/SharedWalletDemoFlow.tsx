"use client";

import { useCallback, useMemo, useState } from "react";
import {
  App,
  Button,
  Checkbox,
  Input,
  InputNumber,
  Modal,
} from "antd";
import {
  CheckCircleFilled,
  FileProtectOutlined,
  KeyOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  WalletOutlined,
} from "@ant-design/icons";

type Partner = {
  id: string;
  name: string;
  role: "Đối tác" | "Trọng tài";
  initials: string;
};

const MOCK_PARTNERS: Partner[] = [
  { id: "p1", name: "Công ty Alpha", role: "Đối tác", initials: "CA" },
  { id: "p2", name: "Studio Beta", role: "Đối tác", initials: "SB" },
  { id: "p3", name: "Luật sư Minh An", role: "Trọng tài", initials: "MA" },
  { id: "p4", name: "Quỹ Gamma", role: "Đối tác", initials: "QG" },
];

const NFT_TERMS = [
  "Cam kết đóng góp theo tỷ lệ chuyên môn đã thỏa thuận.",
  "Ưu tiên thanh toán nợ vận hành trước khi chia lợi nhuận.",
  "Mọi thay đổi điều khoản cần chữ ký đa số bên tham gia.",
];

function mockValidateWallet(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^0x[a-fA-F0-9]{40}$/.test(v)) return true;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,88}$/.test(v)) return true;
  if (v.length >= 26 && /^[a-zA-Z0-9]+$/.test(v)) return true;
  return false;
}

/** 6 ký tự / bên — ghép theo STT tạo mật khẩu mở ví (6 × số bên). */
const SECRET_SEGMENT_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function randomSegmentSixChars(): string {
  return Array.from({ length: 6 }, () => {
    const i = Math.floor(Math.random() * SECRET_SEGMENT_CHARS.length);
    return SECRET_SEGMENT_CHARS[i]!;
  }).join("");
}

function buildVaultPassword(
  rows: { stt: number; segment: string }[]
): string {
  return [...rows]
    .sort((a, b) => a.stt - b.stt)
    .map((r) => r.segment)
    .join("");
}

function randomEthAddress(): string {
  const hex = Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return `0x${hex}`;
}

function StepDot({
  n,
  active,
  done,
}: {
  n: number;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[2.5rem]">
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all",
          done
            ? "bg-primary text-white shadow-[0_0_0_4px_var(--sidebar-item-active-bg)]"
            : active
              ? "bg-[var(--sidebar-item-active-bg)] text-primary ring-2 ring-primary"
              : "bg-[var(--border)] text-foreground/50",
        ].join(" ")}
      >
        {done ? <CheckCircleFilled className="text-lg" /> : n}
      </div>
    </div>
  );
}

function TermsNftCard({
  title,
  onOpen,
  compact,
}: {
  title: string;
  onOpen: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "pricing-card-gold relative overflow-hidden rounded-2xl border-2 p-5 shadow-lg",
        compact ? "max-w-md" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="pricing-card-glow pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl opacity-60"
        aria-hidden
      />
      <div className="relative flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--pricing-select-bg)] border border-[var(--pricing-select-border)]">
          <SafetyCertificateOutlined className="text-2xl text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">
            NFT điều khoản
          </p>
          <h3 className="mt-1 font-semibold text-foreground">{title}</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-foreground/75">
            {NFT_TERMS.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <Button
            type="primary"
            className="mt-4 !rounded-xl !font-semibold"
            icon={<FileProtectOutlined />}
            onClick={onOpen}
          >
            Xem &amp; tương tác
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SharedWalletDemoFlow() {
  const { message } = App.useApp();
  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [wallets, setWallets] = useState<Record<string, string>>({});
  const [validated, setValidated] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, number | null>>({});
  const [walletCreated, setWalletCreated] = useState(false);
  const [sharedAddress, setSharedAddress] = useState<string | null>(null);
  const [partySecrets, setPartySecrets] = useState<
    { id: string; name: string; stt: number; segment: string }[]
  >([]);
  const [termsOpen, setTermsOpen] = useState(false);
  const [nftStep5Open, setNftStep5Open] = useState(false);

  const selectedPartners = useMemo(
    () => MOCK_PARTNERS.filter((p) => selectedIds.includes(p.id)),
    [selectedIds]
  );

  const vaultPasswordDemo = useMemo(
    () => buildVaultPassword(partySecrets),
    [partySecrets]
  );

  const togglePartner = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
    setValidated({});
    setWalletCreated(false);
    setSharedAddress(null);
    setPartySecrets([]);
  }, []);

  const resetFlow = useCallback(() => {
    setStep(1);
    setSelectedIds([]);
    setWallets({});
    setValidated({});
    setAmounts({});
    setWalletCreated(false);
    setSharedAddress(null);
    setPartySecrets([]);
    message.info("Đã reset luồng demo.");
  }, [message]);

  const goStep2 = () => {
    if (selectedIds.length === 0) {
      message.error("Vui lòng chọn ít nhất một đối tác hoặc trọng tài.");
      return;
    }
    setStep(2);
    setValidated({});
  };

  const validateAllWallets = () => {
    const next: Record<string, boolean> = {};
    let ok = true;
    for (const p of selectedPartners) {
      const val = wallets[p.id] ?? "";
      next[p.id] = mockValidateWallet(val);
      if (!next[p.id]) ok = false;
    }
    setValidated(next);
    if (ok) {
      message.success("Địa chỉ ví hợp lệ.");
      setStep(3);
    } else {
      message.error("Một hoặc nhiều địa chỉ chưa hợp lệ. Thử ví dụ: 0x + 40 ký tự hex.");
    }
  };

  const confirmAmounts = () => {
    for (const p of selectedPartners) {
      const a = amounts[p.id];
      if (a == null || a <= 0) {
        message.error("Nhập tổng mức đầu tư hợp lệ cho mọi bên.");
        return;
      }
    }
    message.success("Đã xác nhận mức đóng góp.");
    setStep(4);
  };

  const createWallet = () => {
    const rows = selectedPartners.map((p, i) => ({
      id: p.id,
      name: p.name,
      stt: i + 1,
      segment: randomSegmentSixChars(),
    }));
    setPartySecrets(rows);
    setSharedAddress(randomEthAddress());
    setWalletCreated(true);
    message.success("Ví chung demo đã được gửi tới các bên.");
  };

  const finishToStep5 = () => {
    if (!walletCreated) {
      message.warning('Nhấn "Tạo ví" trước khi tiếp tục.');
      return;
    }
    setStep(5);
    message.success("Góp tiền thành công (demo).");
  };

  const stepDone = (s: number) => step > s;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-40 dark:opacity-25"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, var(--pricing-base-glow), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, var(--pricing-gold-glow), transparent)",
        }}
      />

      <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <header className="mb-10 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            Demo
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Góp tiền ví chung
          </h1>
          <p className="mt-3 text-foreground/65 max-w-xl mx-auto text-[15px] leading-relaxed">
            Luồng mô phỏng: chọn bên tham gia, xác thực ví, xác nhận vốn, tạo ví
            công ty và nhận NFT cam kết (dữ liệu mock, chỉ giao diện).
          </p>
        </header>

        {/* Stepper */}
        <div className="mb-10 flex items-center justify-center gap-0 md:gap-1">
          {[1, 2, 3, 4, 5].map((n, i) => (
            <div key={n} className="flex items-center">
              <StepDot n={n} active={step === n} done={stepDone(n)} />
              {i < 4 && (
                <div
                  className={[
                    "mx-1 h-0.5 w-6 md:w-10 rounded-full transition-colors",
                    step > n ? "bg-primary" : "bg-border",
                  ].join(" ")}
                />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-border bg-[var(--pricing-select-bg)] p-6 md:p-8 shadow-sm backdrop-blur-sm">
          {/* Step 1 */}
          {step === 1 && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <WalletOutlined className="text-primary" />
                Chọn đối tác / trọng tài
              </h2>
              <p className="text-sm text-foreground/65">
                Chọn một hoặc nhiều bên, sau đó tạo ví chung.
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {MOCK_PARTNERS.map((p) => {
                  const checked = selectedIds.includes(p.id);
                  return (
                    <li key={p.id}>
                      <label
                        className={[
                          "flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition-all",
                          checked
                            ? "border-primary bg-[var(--sidebar-item-active-bg)] shadow-md"
                            : "border-border bg-background hover:bg-[var(--sidebar-item-hover-bg)]",
                        ].join(" ")}
                      >
                        <Checkbox
                          checked={checked}
                          onChange={(e) =>
                            togglePartner(p.id, e.target.checked)
                          }
                        />
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-primary"
                          style={{
                            background: "var(--sidebar-item-active-bg)",
                          }}
                        >
                          {p.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{p.name}</p>
                          <span
                            className={[
                              "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                              p.role === "Trọng tài"
                                ? "bg-[var(--pricing-silver-bg)] text-foreground border border-[var(--pricing-silver-border)]"
                                : "bg-[var(--pricing-base-bg)] text-foreground border border-[var(--pricing-base-border)]",
                            ].join(" ")}
                          >
                            {p.role}
                          </span>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  type="primary"
                  size="large"
                  className="!rounded-xl !h-11 !px-8 !font-semibold"
                  onClick={goStep2}
                >
                  Tạo ví chung
                </Button>
              </div>
            </section>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <QrcodeOutlined className="text-primary" />
                Địa chỉ ví từng bên
              </h2>
              <p className="text-sm text-foreground/65">
                Dán địa chỉ hoặc nội dung quét được. Nhấn &quot;Xác thực&quot; khi đã
                nhập đủ.
              </p>
              <div className="space-y-4">
                {selectedPartners.map((p) => {
                  const v = validated[p.id];
                  const hasInput = (wallets[p.id] ?? "").trim().length > 0;
                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-border bg-background p-4"
                    >
                      <p className="text-sm font-semibold mb-2">{p.name}</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          size="large"
                          placeholder="0x… hoặc địa chỉ ví / chuỗi QR"
                          value={wallets[p.id] ?? ""}
                          onChange={(e) => {
                            setWallets((w) => ({
                              ...w,
                              [p.id]: e.target.value,
                            }));
                            setValidated((val) => ({
                              ...val,
                              [p.id]: false,
                            }));
                          }}
                          className="!rounded-xl flex-1 font-mono text-sm"
                          status={
                            hasInput && v === false ? "error" : undefined
                          }
                          suffix={
                            v ? (
                              <CheckCircleFilled className="text-lg text-green-600 dark:text-green-400" />
                            ) : null
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="large" className="!rounded-xl" onClick={() => setStep(1)}>
                  Quay lại
                </Button>
                <Button
                  type="primary"
                  size="large"
                  className="!rounded-xl !font-semibold"
                  onClick={validateAllWallets}
                >
                  Xác thực
                </Button>
              </div>
            </section>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold">Xác nhận số tiền góp</h2>
              <p className="text-sm text-foreground/65">
                Nhập tổng mức đầu tư (VND, demo) cho từng bên.
              </p>
              <div className="space-y-3">
                {selectedPartners.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-2xl border border-border bg-background p-4"
                  >
                    <span className="sm:w-48 font-medium shrink-0">{p.name}</span>
                    <InputNumber
                      size="large"
                      min={0}
                      className="!w-full sm:!w-64 !rounded-xl"
                      placeholder="Số tiền (VND)"
                      value={amounts[p.id] ?? null}
                      onChange={(n) =>
                        setAmounts((a) => ({ ...a, [p.id]: n }))
                      }
                    />
                  </div>
                ))}
              </div>
              <TermsNftCard
                title="Cam kết chuyên môn &amp; thứ tự ưu tiên"
                onOpen={() => setTermsOpen(true)}
              />
              <div className="flex flex-wrap gap-3">
                <Button size="large" className="!rounded-xl" onClick={() => setStep(2)}>
                  Quay lại
                </Button>
                <Button
                  type="primary"
                  size="large"
                  className="!rounded-xl !font-semibold"
                  onClick={confirmAmounts}
                >
                  Xác nhận đã đóng góp
                </Button>
              </div>
            </section>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold">Ví công ty &amp; mã gửi bên</h2>
              <div className="rounded-2xl border border-primary/25 bg-[var(--sidebar-item-active-bg)] p-4 md:p-5 space-y-3">
                <div className="flex gap-3">
                  <KeyOutlined className="mt-0.5 text-lg text-primary shrink-0" />
                  <div className="space-y-2 text-sm text-foreground/80 leading-relaxed">
                    <p className="font-semibold text-foreground">
                      Mỗi công ty / bên chỉ nhận đúng{" "}
                      <span className="text-primary">6 ký tự</span> của riêng
                      mình (kèm STT).
                    </p>
                    <ul className="list-disc pl-4 space-y-1.5 text-foreground/75">
                      <li>
                        Mật khẩu mở ví đầy đủ = ghép các đoạn 6 ký tự theo{" "}
                        <strong>đúng thứ tự STT</strong> (1 → 2 → 3 …).
                      </li>
                      <li>
                        Với <strong>{selectedPartners.length}</strong> bên: mật
                        khẩu dài{" "}
                        <strong>{selectedPartners.length * 6} ký tự</strong>
                        {selectedPartners.length === 2
                          ? " (ví dụ 2 công ty → 12 ký tự như bạn mô tả)."
                          : "."}{" "}
                        Sai thứ tự hoặc thiếu một đoạn thì không mở được ví.
                      </li>
                      <li>
                        Thực tế mỗi bên chỉ biết đoạn của mình; chỉ khi phối hợp
                        theo thứ tự đã thỏa thuận mới có chuỗi đầy đủ.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <p className="text-sm text-foreground/65">
                Nhấn &quot;Tạo ví&quot; để hệ thống sinh đoạn 6 ký tự cho từng bên và hiển
                thị ví chung demo.
              </p>
              <div className="overflow-x-auto rounded-2xl border border-border bg-background">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-[var(--sidebar-item-hover-bg)]">
                      <th className="px-4 py-3 text-left font-semibold">STT</th>
                      <th className="px-4 py-3 text-left font-semibold">Bên</th>
                      <th className="px-4 py-3 text-left font-semibold">
                        6 ký tự gửi riêng
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPartners.map((p) => {
                      const row = partySecrets.find((c) => c.id === p.id);
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-4 py-3 font-mono font-semibold text-primary">
                            {walletCreated && row ? row.stt : "—"}
                          </td>
                          <td className="px-4 py-3">{p.name}</td>
                          <td className="px-4 py-3 font-mono text-base tracking-wide">
                            {walletCreated && row ? row.segment : "••••••"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Button
                type="primary"
                size="large"
                className="!rounded-xl !font-semibold !mb-4"
                onClick={createWallet}
              >
                Tạo ví
              </Button>
              {walletCreated && sharedAddress && (
                <div className="space-y-4">
                  <div className="rounded-2xl border-2 border-primary/30 bg-[var(--sidebar-item-active-bg)] p-5">
                    <p className="text-xs font-semibold uppercase text-primary">
                      Ví chung (demo)
                    </p>
                    <p className="mt-2 break-all font-mono text-sm md:text-base">
                      {sharedAddress}
                    </p>
                  </div>
                  {partySecrets.length > 0 && (
                    <div className="rounded-2xl border border-border bg-background p-5 space-y-4">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <KeyOutlined className="text-primary" />
                        Mật khẩu mở ví (chỉ đúng khi ghép theo STT)
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {[...partySecrets]
                          .sort((a, b) => a.stt - b.stt)
                          .map((r, idx, arr) => (
                            <span key={r.id} className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-[var(--sidebar-item-active-bg)] px-3 py-2 font-mono font-semibold tracking-wider">
                                <span className="text-xs font-sans text-foreground/55">
                                  STT {r.stt}
                                </span>
                                {r.segment}
                              </span>
                              {idx < arr.length - 1 ? (
                                <span className="text-foreground/40 font-bold">
                                  +
                                </span>
                              ) : null}
                            </span>
                          ))}
                        <span className="text-foreground/45 w-full sm:w-auto sm:ml-1 pt-1 sm:pt-0">
                          = {partySecrets.length * 6} ký tự
                        </span>
                      </div>
                      <p className="break-all rounded-xl border border-dashed border-border bg-[var(--pricing-select-bg)] px-4 py-3 font-mono text-sm md:text-base tracking-wide">
                        {vaultPasswordDemo}
                      </p>
                      <p className="text-xs text-foreground/55">
                        Demo hiển thị full chuỗi để bạn minh họa; sản phẩm thật chỉ lưu từng đoạn trên kênh riêng của từng bên.
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button size="large" className="!rounded-xl" onClick={() => setStep(3)}>
                  Quay lại
                </Button>
                <Button
                  type="primary"
                  size="large"
                  className="!rounded-xl !font-semibold"
                  onClick={finishToStep5}
                  disabled={!walletCreated}
                >
                  Hoàn tất &amp; xem NFT
                </Button>
              </div>
            </section>
          )}

          {/* Step 5 */}
          {step === 5 && (
            <section className="space-y-8">
              <div className="rounded-2xl border-2 border-primary/40 bg-[var(--pricing-gold-bg)] dark:bg-[var(--sidebar-item-active-bg)] p-6 text-center">
                <CheckCircleFilled className="text-4xl text-primary mb-3" />
                <h2 className="text-2xl font-bold">Góp tiền thành công</h2>
                <p className="mt-2 text-sm text-foreground/70">
                  Đây là màn hình xác nhận cuối luồng demo.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 md:items-start">
                <div>
                  <p className="text-sm font-semibold text-foreground/80 mb-3">
                    NFT cam kết
                  </p>
                  <button
                    type="button"
                    onClick={() => setNftStep5Open(true)}
                    className="text-left w-full rounded-2xl border-2 border-border bg-background p-4 transition-all hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--sidebar-item-active-bg)]">
                        <SafetyCertificateOutlined className="text-3xl text-primary" />
                      </div>
                      <div>
                        <p className="font-bold">
                          Hợp đồng #
                          {vaultPasswordDemo
                            ? `${vaultPasswordDemo.slice(0, 6)}…`
                            : "------"}
                        </p>
                        <p className="text-xs text-foreground/60 mt-1">
                          Nhấn để xem điều khoản
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <Button
                size="large"
                icon={<ReloadOutlined />}
                className="!rounded-xl"
                onClick={resetFlow}
              >
                Demo lại từ đầu
              </Button>
            </section>
          )}
        </div>
      </div>

      <Modal
        title="Điều khoản NFT (demo)"
        open={termsOpen}
        onCancel={() => setTermsOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setTermsOpen(false)}>
            Đã hiểu
          </Button>,
        ]}
      >
        <ul className="list-disc pl-5 space-y-2 text-foreground/85">
          {NFT_TERMS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Modal>

      <Modal
        title="NFT — Tương tác"
        open={nftStep5Open}
        onCancel={() => setNftStep5Open(false)}
        footer={null}
        width={520}
      >
        <TermsNftCard
          title="Bản ghi cam kết đã ký (mô phỏng)"
          onOpen={() => message.success("Tương tác demo: đã mở chi tiết.")}
          compact
        />
      </Modal>
    </div>
  );
}
