interface KPICard {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
}

interface KPICardsGridProps {
  cards: KPICard[];
}

export function KPICardsGrid({ cards }: KPICardsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="border transition-all"
          style={{
            backgroundColor: 'white',
            borderColor: 'var(--color-border-tertiary)',
            borderWidth: '0.5px',
            color: 'var(--foreground)',
            padding: '10px 14px',
            borderRadius: '8px',
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-60 mb-2">
            {card.label}
          </p>
          <p className="text-[20px] font-medium leading-relaxed">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
