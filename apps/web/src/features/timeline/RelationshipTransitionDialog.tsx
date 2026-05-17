import { useMemo, useState } from "react";
import type { EpisodeKind, RelationshipEpisode } from "../../types";
import type { TransitionOption, TransitionOutcome } from "../../domain/timeline/transitionTypes";
import { getAvailableTransitions, ALL_EPISODE_KINDS } from "../../domain/timeline/transitionEngine";
import { EPISODE_KIND_LABELS } from "../../domain/timeline/timelineTypes";
import { useGraphStore } from "../../store/useGraphStore";
import { TransitionOptionCard, KindButton } from "./TransitionOptionCard";
import { TransitionDatePicker } from "./TransitionDatePicker";
import { TransitionPreview } from "./TransitionPreview";

type Step = "option" | "friend_level" | "date" | "notes";

interface RelationshipTransitionDialogProps {
  threadId: string;
  onClose: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();

function isoYear(year: number): string {
  return `${year}-01-01`;
}

export function RelationshipTransitionDialog({ threadId, onClose }: RelationshipTransitionDialogProps) {
  const thread = useGraphStore((s) => s.threads[threadId]);
  const allEpisodes = useGraphStore((s) => s.episodes);
  const people = useGraphStore((s) => s.people);
  const timelineYear = useGraphStore((s) => s.timelineYear);
  const applyTransition = useGraphStore((s) => s.applyTransition);

  const threadEpisodes = useMemo(
    () => Object.values(allEpisodes).filter((ep) => ep.threadId === threadId),
    [allEpisodes, threadId],
  );

  // Active episode: no endDate, or the most recently started open episode
  const activeEpisode = useMemo<RelationshipEpisode | null>(() => {
    const open = threadEpisodes.filter((ep) => !ep.endDate);
    if (open.length === 0) return null;
    return open.sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  }, [threadEpisodes]);

  const otherPersonName = useMemo(() => {
    if (!thread) return "this person";
    // Use both names together
    const a = people.find((p) => p.id === thread.personAId);
    const b = people.find((p) => p.id === thread.personBId);
    if (a && b) return b.name; // Show the second person's name as "the other"
    return a?.name ?? b?.name ?? "this person";
  }, [people, thread]);

  const contextOptions = useMemo(
    () => (activeEpisode ? getAvailableTransitions(activeEpisode.kind) : []),
    [activeEpisode],
  );

  const defaultYear = Math.floor(timelineYear) < CURRENT_YEAR ? Math.floor(timelineYear) : CURRENT_YEAR;
  const minYear = activeEpisode
    ? parseInt(activeEpisode.startDate.slice(0, 4), 10)
    : CURRENT_YEAR - 50;

  // Dialog state
  const [step, setStep] = useState<Step>("option");
  const [selectedOption, setSelectedOption] = useState<TransitionOption | null>(null);
  const [friendLevel, setFriendLevel] = useState<"friend" | "close_friend">("friend");
  const [transitionYear, setTransitionYear] = useState(defaultYear);
  const [notes, setNotes] = useState("");
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [customStartsKind, setCustomStartsKind] = useState<EpisodeKind | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  if (!thread || !activeEpisode) {
    return (
      <ModalOverlay onClose={onClose}>
        <DialogShell onClose={onClose} title="Change relationship">
          <p style={{ padding: "16px", fontSize: 13, color: "var(--rf-text-secondary, var(--rf-muted))" }}>
            No active relationship episode found for this connection. Use the episode editor to add one.
          </p>
        </DialogShell>
      </ModalOverlay>
    );
  }

  const resolvedStartsKind: EpisodeKind | undefined = (() => {
    if (!selectedOption) return undefined;
    if (customStartsKind) return customStartsKind;
    if (selectedOption.followUp === "friend_level") return friendLevel;
    return selectedOption.startsKind;
  })();

  // --- Step handlers ---
  function handleSelectOption(option: TransitionOption) {
    setSelectedOption(option);
    setCustomStartsKind(undefined);
    setError(null);
  }

  function handleAdvanceFromOption() {
    if (!selectedOption) {
      setError("Please select what happened.");
      return;
    }
    if (selectedOption.followUp === "friend_level") {
      setStep("friend_level");
    } else {
      setStep("date");
    }
    setError(null);
  }

  function handleAdvanceFromFriendLevel() {
    setStep("date");
  }

  function handleAdvanceFromDate() {
    setStep("notes");
    setError(null);
  }

  function handleConfirm() {
    if (!selectedOption || !activeEpisode) return;
    setError(null);

    const outcome: TransitionOutcome = {
      closedEpisodeId: activeEpisode.id,
      transitionDate: isoYear(transitionYear),
      ...(resolvedStartsKind
        ? {
            newEpisode: {
              kind: resolvedStartsKind,
              certainty: "approximate",
              ...(notes.trim() ? { notes: notes.trim() } : {}),
            },
          }
        : {}),
      event: {
        type: "milestone",
        title: selectedOption.label,
      },
    };

    const result = applyTransition(threadId, outcome);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (result.warning) {
      setWarning(result.warning);
    }

    onClose();
  }

  // --- Step content ---
  return (
    <ModalOverlay onClose={onClose}>
      <DialogShell
        onClose={onClose}
        title="Change relationship"
        stepIndicator={
          <StepDots
            steps={["option", "date", "notes"] as Step[]}
            current={step === "friend_level" ? "option" : step}
          />
        }
      >
        {step === "option" && (
          <StepOption
            activeKindLabel={EPISODE_KIND_LABELS[activeEpisode.kind]}
            otherPersonName={otherPersonName}
            options={contextOptions}
            selectedOption={selectedOption}
            onSelect={handleSelectOption}
            showMoreOptions={showMoreOptions}
            onToggleMoreOptions={() => setShowMoreOptions((v) => !v)}
            customStartsKind={customStartsKind}
            onSelectCustomKind={(k) => {
              setCustomStartsKind(k);
              setSelectedOption({
                id: `custom_to_${k}`,
                label: `Transition to ${EPISODE_KIND_LABELS[k]}`,
                description: `The ${EPISODE_KIND_LABELS[activeEpisode.kind].toLowerCase()} relationship ends and a ${EPISODE_KIND_LABELS[k].toLowerCase()} episode begins.`,
                endsKind: activeEpisode.kind,
                startsKind: k,
              });
            }}
            error={error}
            onNext={handleAdvanceFromOption}
          />
        )}

        {step === "friend_level" && (
          <StepFriendLevel
            friendLevel={friendLevel}
            onChange={setFriendLevel}
            onBack={() => setStep("option")}
            onNext={handleAdvanceFromFriendLevel}
          />
        )}

        {step === "date" && (
          <StepDate
            transitionYear={transitionYear}
            minYear={minYear}
            onChange={setTransitionYear}
            onBack={() => setStep(selectedOption?.followUp === "friend_level" ? "friend_level" : "option")}
            onNext={handleAdvanceFromDate}
          />
        )}

        {step === "notes" && selectedOption && (
          <StepNotes
            notes={notes}
            onNotesChange={setNotes}
            option={selectedOption}
            resolvedStartsKind={resolvedStartsKind}
            transitionYear={transitionYear}
            otherPersonName={otherPersonName}
            error={error}
            warning={warning}
            onBack={() => setStep("date")}
            onConfirm={handleConfirm}
          />
        )}
      </DialogShell>
    </ModalOverlay>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
        padding: 16,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

function DialogShell({
  children,
  onClose,
  title,
  stepIndicator,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  stepIndicator?: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 480,
        maxHeight: "85vh",
        overflow: "auto",
        borderRadius: 16,
        background: "var(--rf-bg-surface, #fff)",
        border: "1px solid var(--rf-border-default, rgba(0,0,0,0.1))",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px 12px",
          borderBottom: "1px solid var(--rf-border-default, rgba(0,0,0,0.08))",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 15, color: "var(--rf-text-primary, var(--rf-text))" }}>
          {title}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {stepIndicator}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--rf-text-secondary, var(--rf-muted))",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: "16px 20px 20px", flex: 1 }}>{children}</div>
    </div>
  );
}

function StepDots({ steps, current }: { steps: Step[]; current: Step }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {steps.map((s) => (
        <div
          key={s}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: s === current ? "var(--rf-accent)" : "var(--rf-border-default, rgba(0,0,0,0.2))",
            transition: "background 200ms ease",
          }}
        />
      ))}
    </div>
  );
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
      {children}
    </div>
  );
}

function BtnSecondary({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: "1px solid var(--rf-border-default, var(--rf-graph-control-border))",
        background: "transparent",
        color: "var(--rf-text-secondary, var(--rf-muted))",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function BtnPrimary({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 18px",
        borderRadius: 8,
        border: "none",
        background: "var(--rf-accent)",
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: "8px 12px",
        borderRadius: 8,
        background: "var(--rf-cat-romantic-subtle, #fff0f6)",
        border: "1px solid var(--rf-cat-romantic-ui, #e64980)",
        color: "var(--rf-cat-romantic-ui, #c23060)",
        fontSize: 12,
      }}
    >
      {message}
    </div>
  );
}

function InlineWarning({ message }: { message: string }) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: "8px 12px",
        borderRadius: 8,
        background: "var(--rf-cat-work-subtle, #fff9eb)",
        border: "1px solid var(--rf-cat-work-ui, #f08c00)",
        color: "var(--rf-cat-work-text, #d47400)",
        fontSize: 12,
      }}
    >
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — What happened?
// ---------------------------------------------------------------------------

function StepOption({
  activeKindLabel,
  otherPersonName,
  options,
  selectedOption,
  onSelect,
  showMoreOptions,
  onToggleMoreOptions,
  customStartsKind,
  onSelectCustomKind,
  error,
  onNext,
}: {
  activeKindLabel: string;
  otherPersonName: string;
  options: TransitionOption[];
  selectedOption: TransitionOption | null;
  onSelect: (option: TransitionOption) => void;
  showMoreOptions: boolean;
  onToggleMoreOptions: () => void;
  customStartsKind: EpisodeKind | undefined;
  onSelectCustomKind: (kind: EpisodeKind) => void;
  error: string | null;
  onNext: () => void;
}) {
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--rf-text-secondary, var(--rf-muted))", marginBottom: 14, marginTop: 0 }}>
        Current relationship with <strong style={{ color: "var(--rf-text-primary, var(--rf-text))" }}>{otherPersonName}</strong>:{" "}
        <strong style={{ color: "var(--rf-text-primary, var(--rf-text))" }}>{activeKindLabel}</strong>
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map((opt) => (
          <TransitionOptionCard
            key={opt.id}
            option={opt}
            selected={selectedOption?.id === opt.id && !customStartsKind}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* More options */}
      <button
        type="button"
        onClick={onToggleMoreOptions}
        style={{
          marginTop: 12,
          fontSize: 12,
          color: "var(--rf-accent)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          textDecoration: "underline",
          textDecorationStyle: "dotted",
        }}
      >
        {showMoreOptions ? "Fewer options" : "More options"}
      </button>

      {showMoreOptions && (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {ALL_EPISODE_KINDS.map((kind) => (
            <KindButton
              key={kind}
              kind={kind}
              selected={customStartsKind === kind}
              onSelect={onSelectCustomKind}
            />
          ))}
        </div>
      )}

      {error && <InlineError message={error} />}

      <ActionRow>
        <BtnPrimary onClick={onNext}>Next →</BtnPrimary>
      </ActionRow>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Friend level follow-up
// ---------------------------------------------------------------------------

function StepFriendLevel({
  friendLevel,
  onChange,
  onBack,
  onNext,
}: {
  friendLevel: "friend" | "close_friend";
  onChange: (level: "friend" | "close_friend") => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--rf-text-secondary, var(--rf-muted))", marginBottom: 14, marginTop: 0 }}>
        What kind of friendship continued?
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(["friend", "close_friend"] as const).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            aria-pressed={friendLevel === level}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              padding: "10px 14px",
              borderRadius: 10,
              border:
                friendLevel === level
                  ? "2px solid var(--rf-accent)"
                  : "1px solid var(--rf-border-default, var(--rf-graph-control-border))",
              background: "transparent",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--rf-text-primary, var(--rf-text))" }}>
              {EPISODE_KIND_LABELS[level]}
            </span>
            <span style={{ fontSize: 12, color: "var(--rf-text-secondary, var(--rf-muted))" }}>
              {level === "friend" ? "A regular friendship going forward." : "A deeper, ongoing close friendship."}
            </span>
          </button>
        ))}
      </div>
      <ActionRow>
        <BtnSecondary onClick={onBack}>← Back</BtnSecondary>
        <BtnPrimary onClick={onNext}>Next →</BtnPrimary>
      </ActionRow>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — When?
// ---------------------------------------------------------------------------

function StepDate({
  transitionYear,
  minYear,
  onChange,
  onBack,
  onNext,
}: {
  transitionYear: number;
  minYear: number;
  onChange: (year: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--rf-text-secondary, var(--rf-muted))", marginBottom: 14, marginTop: 0 }}>
        When did this happen?
      </p>
      <TransitionDatePicker
        value={transitionYear}
        min={minYear}
        max={CURRENT_YEAR + 1}
        onChange={onChange}
      />
      <ActionRow>
        <BtnSecondary onClick={onBack}>← Back</BtnSecondary>
        <BtnPrimary onClick={onNext}>Next →</BtnPrimary>
      </ActionRow>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Notes + confirm
// ---------------------------------------------------------------------------

function StepNotes({
  notes,
  onNotesChange,
  option,
  resolvedStartsKind,
  transitionYear,
  otherPersonName,
  error,
  warning,
  onBack,
  onConfirm,
}: {
  notes: string;
  onNotesChange: (v: string) => void;
  option: TransitionOption;
  resolvedStartsKind: EpisodeKind | undefined;
  transitionYear: number;
  otherPersonName: string;
  error: string | null;
  warning: string | null;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--rf-text-secondary, var(--rf-muted))", marginBottom: 14, marginTop: 0 }}>
        Any notes? <span style={{ opacity: 0.6 }}>(optional)</span>
      </p>

      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="E.g. We grew apart after moving cities"
        rows={3}
        style={{
          width: "100%",
          padding: "8px 10px",
          fontSize: 13,
          borderRadius: 8,
          border: "1px solid var(--rf-border-default, var(--rf-graph-control-border))",
          background: "var(--rf-bg-subtle, transparent)",
          color: "var(--rf-text-primary, var(--rf-text))",
          resize: "vertical",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />

      <div style={{ marginTop: 14 }}>
        <TransitionPreview
          option={option}
          resolvedStartsKind={resolvedStartsKind}
          transitionYear={transitionYear}
          otherPersonName={otherPersonName}
        />
      </div>

      {warning && <InlineWarning message={warning} />}
      {error && <InlineError message={error} />}

      <ActionRow>
        <BtnSecondary onClick={onBack}>← Back</BtnSecondary>
        <BtnPrimary onClick={onConfirm}>Confirm</BtnPrimary>
      </ActionRow>
    </div>
  );
}
