type PromptChipsProps = {
  items: readonly string[];
  disabled?: boolean;
  onSelect: (text: string) => void;
};

export function PromptChips({ items, disabled, onSelect }: PromptChipsProps) {
  return (
    <div className="prompt-chips">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          className="prompt-chip"
          disabled={disabled}
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
