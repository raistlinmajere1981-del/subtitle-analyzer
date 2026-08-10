import type { ComponentType, ReactElement } from 'react';

interface NavButtonProps {
  active: boolean;
  icon: ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
}

export function NavButton({ active, icon: Icon, label, onClick }: NavButtonProps): ReactElement {
  return (
    <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick} type="button">
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}
