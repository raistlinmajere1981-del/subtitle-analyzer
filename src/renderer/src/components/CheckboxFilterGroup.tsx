import type { ComponentType, ReactElement } from 'react';

interface CheckboxFilterGroupProps {
  icon: ComponentType<{ size?: number }>;
  label: string;
  options: Array<[string, string]>;
  values: string[];
  onToggle: (value: string) => void;
}

export function CheckboxFilterGroup({ icon: Icon, label, options, values, onToggle }: CheckboxFilterGroupProps): ReactElement {
  return (
    <fieldset className="filter-group">
      <legend>
        <Icon size={15} />
        <span>{label}</span>
        <small>{values.length === 0 ? 'Tum' : values.length}</small>
      </legend>
      <div className="filter-options">
        {options.map(([optionValue, optionLabel]) => (
          <label className="filter-option" key={optionValue}>
            <input checked={values.includes(optionValue)} onChange={() => onToggle(optionValue)} type="checkbox" />
            <span>{optionLabel}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
