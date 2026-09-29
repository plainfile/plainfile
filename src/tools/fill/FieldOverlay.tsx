import type { FormFieldInfo } from './engine';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface FieldOverlayProps {
  fields: FormFieldInfo[];
  page: number;
  zoom: number;
  values: Record<string, string | boolean>;
  onChange: (name: string, value: string | boolean) => void;
  onFieldFocus?: (name: string) => void;
}

const TAP_SIZE = 44;

function fieldKey(field: FormFieldInfo, suffix?: string): string {
  return suffix ? `${field.name}-${suffix}` : field.name;
}

function renderTextField(
  field: FormFieldInfo,
  value: string | boolean | undefined,
  onChange: (name: string, value: string | boolean) => void,
  onFocus?: (name: string) => void,
): React.ReactNode {
  const textValue = typeof value === 'string' ? value : '';
  return (
    <Input
      type="text"
      maxLength={field.maxLength}
      value={textValue}
      onChange={(event) => onChange(field.name, event.target.value)}
      onFocus={() => onFocus?.(field.name)}
      className="h-full w-full min-h-[44px] border-transparent bg-white/90 px-1 py-0 text-xs shadow-sm focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC] dark:bg-black/90"
      style={{ fontSize: 'inherit' }}
    />
  );
}

function renderCheckbox(
  field: FormFieldInfo,
  value: string | boolean | undefined,
  onChange: (name: string, value: string | boolean) => void,
  onFocus?: (name: string) => void,
): React.ReactNode {
  const checked = value === true;
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Checkbox
        id={fieldKey(field, 'cb')}
        checked={checked}
        onCheckedChange={(state) => onChange(field.name, state === true)}
        onFocus={() => onFocus?.(field.name)}
        className="h-5 w-5 border-foreground/50 bg-white/90 data-[state=checked]:bg-[#0066CC] data-[state=checked]:text-white dark:bg-black/90"
      />
    </div>
  );
}

function renderRadio(
  field: FormFieldInfo,
  value: string | boolean | undefined,
  onChange: (name: string, value: string | boolean) => void,
  onFocus?: (name: string) => void,
): React.ReactNode {
  const selected = typeof value === 'string' ? value : '';
  const options = field.options ?? [];
  return (
    <div className="flex h-full w-full flex-col justify-center gap-0.5 overflow-hidden p-0.5">
      {options.map((option) => {
        const id = fieldKey(field, `radio-${option}`);
        return (
          <Label
            key={option}
            htmlFor={id}
            className="flex min-h-[44px] cursor-pointer items-center gap-1 text-[10px] leading-tight"
          >
            <input
              id={id}
              type="radio"
              name={field.name}
              value={option}
              checked={selected === option}
              onChange={() => onChange(field.name, option)}
              onFocus={() => onFocus?.(field.name)}
              className="h-3 w-3 accent-[#0066CC] focus:ring-2 focus:ring-[#0066CC]"
            />
            <span className="truncate">{option}</span>
          </Label>
        );
      })}
    </div>
  );
}

function renderSelect(
  field: FormFieldInfo,
  value: string | boolean | undefined,
  onChange: (name: string, value: string | boolean) => void,
  onFocus?: (name: string) => void,
): React.ReactNode {
  const stringValue = typeof value === 'string' ? value : '';
  const options = field.options ?? [];
  return (
    <select
      id={fieldKey(field, 'select')}
      value={stringValue}
      onChange={(event) => onChange(field.name, event.target.value)}
      onFocus={() => onFocus?.(field.name)}
      className="h-full w-full min-h-[44px] cursor-pointer appearance-none rounded border border-transparent bg-white/90 px-1 py-0 text-xs shadow-sm focus:border-[#0066CC] focus:outline-none focus:ring-2 focus:ring-[#0066CC] dark:bg-black/90"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function renderField(
  field: FormFieldInfo,
  value: string | boolean | undefined,
  onChange: (name: string, value: string | boolean) => void,
  onFocus?: (name: string) => void,
): React.ReactNode {
  switch (field.type) {
    case 'text':
      return renderTextField(field, value, onChange, onFocus);
    case 'checkbox':
      return renderCheckbox(field, value, onChange, onFocus);
    case 'radio':
      return renderRadio(field, value, onChange, onFocus);
    case 'dropdown':
      return renderSelect(field, value, onChange, onFocus);
    case 'optionlist':
      return renderSelect(field, value, onChange, onFocus);
    default:
      return null;
  }
}

export function FieldOverlay({
  fields,
  page,
  zoom,
  values,
  onChange,
  onFieldFocus,
}: FieldOverlayProps): React.ReactNode {
  const pageFields = fields.filter((field) => field.page === page);

  return (
    <>
      {pageFields.map((field) => {
        const rect = field.rect;
        const widthPx = rect.width * zoom;
        const heightPx = rect.height * zoom;
        const needsHitArea = widthPx < TAP_SIZE || heightPx < TAP_SIZE;

        return (
          <div
            key={field.name}
            id={`field-overlay-${field.name}`}
            className="absolute"
            style={{
              left: rect.x * zoom,
              top: rect.y * zoom,
              width: widthPx,
              height: heightPx,
            }}
          >
            <div
              className="relative h-full w-full"
              style={
                needsHitArea
                  ? {
                      minWidth: TAP_SIZE,
                      minHeight: TAP_SIZE,
                    }
                  : undefined
              }
            >
              {renderField(field, values[field.name], onChange, onFieldFocus)}
            </div>
          </div>
        );
      })}
    </>
  );
}
