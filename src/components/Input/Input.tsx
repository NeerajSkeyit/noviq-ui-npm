import React, { useEffect, useId, useRef, useState } from "react";
import ReactSelect, { type StylesConfig } from "react-select";
import { Eye, EyeOff, FileText, Trash2, Upload } from "../Icon/Icon";
import Label from "../Label/Label";
import Switch from "../Switch/Switch";
import DatePicker from "../DatePicker/DatePicker";
import MonthPicker from "../MonthPicker/MonthPicker";
import TimePicker from "../TimePicker/TimePicker";
import { useSelectEscapeGuard } from "../../hooks/useSelectEscapeGuard";
import { useText } from "../../hooks/useText";
import { richText } from "../../utils/richText";
import { devError } from "../../utils/devWarn";
import { BUTTON_TYPE, INPUT_TYPE, Z_INDEX, type HourCycle } from "../../constants";
import "./Input.css";

export interface InputOption {
  label: string;
  value: string;
}

export interface InputProps {
  /** Which field variant to render. */
  type?: string;
  /** Current value — shape depends on `type` (string, boolean, File, File[], InputOption[]...). */
  value?: any;
  /** Called with the new raw value (not an event). */
  onChange?: (value: any) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  label?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  /** Options for `select` / `multiSelect`. */
  options?: InputOption[];
  placeholder?: string;
  /** `accept` attribute for `file` / `multipleFile` / `excelUpload`. */
  accept?: string;
  noOptionsMessage?: () => string;
  disabled?: boolean;
  /** Earliest value, for `date`, `month`, `datePicker` and `monthPicker`. */
  minDate?: string;
  /** Latest value, for `date`, `month`, `datePicker` and `monthPicker`. */
  maxDate?: string;
  /** `timePicker` only: 24-hour (default) or 12-hour with AM/PM. The value stays 24-hour `"HH:mm"`. */
  hourCycle?: HourCycle;
  /** `timePicker` only: minute column granularity. Defaults to 1 (every minute 00–59). */
  minuteStep?: number;
  maxLength?: number;
  autoFocus?: boolean;
  hideClearIcon?: boolean;
  /** Called with the removed file's index, for `multipleFile`. */
  onRemoveFile?: (index: number) => void;
}

/** Types already reported, so a list of fields doesn't log the same mistake once per row. */
const reportedUnsupportedTypes = new Set<string>();

function fieldName(label?: string) {
  return label?.replace("*", "").trim();
}

function InputContainer({
  htmlFor,
  label,
  required,
  helper,
  error,
  children,
}: {
  htmlFor?: string;
  label?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="nq-form-field">
      {label && (
        <Label htmlFor={htmlFor} className="nq-form-label">
          {label}
          {required && <span className="nq-required-mark">*</span>}
        </Label>
      )}
      {children}
      {helper && !error && <p className="nq-helper-text">{helper}</p>}
      {error && <p className="nq-error-text">{error}</p>}
    </div>
  );
}

const tick = (isSelected?: boolean) => ({
  alignItems: "center",
  display: "flex",
  ":before": {
    borderRadius: 10,
    content: isSelected ? '"✓"' : '" "',
    display: "block",
    marginRight: 8,
    height: 24,
    width: 10,
  },
});

function customSelectStyles(error?: string): StylesConfig<InputOption, boolean> {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: "40px",
      borderRadius: "4px",
      border: `1px solid ${error ? "var(--nq-danger)" : "var(--nq-border-color)"}`,
      boxShadow: "none",
      padding: "0",
      opacity: state.isDisabled ? 0.5 : 1,
      backgroundColor: state.isDisabled ? "var(--nq-secondary-background)" : "var(--nq-light)",
      "&:hover": {
        border: `1px solid ${error ? "var(--nq-danger)" : "var(--nq-border-color)"}`,
      },
      ...(state.isFocused && { outline: "none" }),
    }),
    valueContainer: (base) => ({ ...base, padding: "0 8px" }),
    input: (base) => ({ ...base, margin: 0, padding: 0 }),
    placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: "14px" }),
    singleValue: (base) => ({ ...base, fontSize: "14px", color: "#111827" }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: "0 8px",
      color: "#6b7280",
      "&:hover": { color: "#374151" },
    }),
    menu: (base) => ({ ...base, borderRadius: "4px", overflow: "hidden" }),
    menuList: (base) => ({ ...base, padding: "6px" }),
    menuPortal: (base) => ({ ...base, zIndex: Z_INDEX.POPOVER }),
    option: (base, state) => ({
      ...base,
      fontSize: "14px",
      padding: "6px 12px",
      borderRadius: "4px",
      backgroundColor: state.isSelected
        ? "var(--nq-border-color)"
        : state.isFocused
          ? "#f3f4f6"
          : "#fff",
      color: "#111827",
      cursor: "pointer",
      ...tick(state.isSelected),
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "rgba(2, 105, 155, 0.1)",
      borderRadius: "4px",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "var(--nq-primary)",
      padding: "1px 3px",
      fontWeight: 500,
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "var(--nq-primary)",
      ":hover": { backgroundColor: "transparent", color: "var(--nq-danger)" },
    }),
  };
}

function Input({
  type = INPUT_TYPE.TEXT,
  value = "",
  onChange = () => {},
  onKeyDown,
  label = "",
  required = false,
  helper = "",
  error,
  options = [],
  placeholder = "",
  accept,
  noOptionsMessage: noOptionsMessageProp,
  disabled = false,
  minDate = "",
  maxDate = "",
  hourCycle,
  minuteStep,
  maxLength,
  autoFocus = false,
  hideClearIcon = false,
  onRemoveFile,
}: InputProps) {
  const t = useText();
  const noOptionsMessage = noOptionsMessageProp ?? (() => t("inputNoOptions"));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const uniqueInputId = `${type}-${useId()}`;
  const selectEscapeGuard = useSelectEscapeGuard();
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (type !== INPUT_TYPE.FILE) return;
    if (value instanceof File) {
      const objectUrl = URL.createObjectURL(value);
      setFilePreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setFilePreviewUrl(value?.name || null);
  }, [type, value]);

  if (type === INPUT_TYPE.PASSWORD) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <div className="nq-password-wrap">
          <input
            type={isPasswordVisible ? "text" : "password"}
            id={uniqueInputId}
            className={`nq-input-field ${error ? "nq-input-field-error" : ""}`}
            placeholder="••••••••"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            autoFocus={autoFocus}
            name={fieldName(label)}
          />
          <span
            className="nq-password-toggle"
            onClick={() => setIsPasswordVisible((prev) => !prev)}
          >
            {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </span>
        </div>
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.EMAIL) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <input
          type="email"
          id={uniqueInputId}
          value={value || ""}
          name={fieldName(label)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || t("inputEmailPlaceholder")}
          disabled={disabled}
          className={`nq-input-field ${error ? "nq-input-field-error" : ""}`}
          maxLength={maxLength}
          autoFocus={autoFocus}
        />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.DATE) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <input
          type="date"
          id={uniqueInputId}
          className={`nq-input-field ${error ? "nq-input-field-error" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={minDate}
          max={maxDate}
          disabled={disabled}
        />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.TIME) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <input
          type="time"
          id={uniqueInputId}
          className={`nq-input-field ${error ? "nq-input-field-error" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.MONTH) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <input
          type="month"
          id={uniqueInputId}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className={`nq-input-field ${error ? "nq-input-field-error" : ""}`}
          min={minDate}
          max={maxDate}
          disabled={disabled}
        />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.DATE_PICKER) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <DatePicker
          id={uniqueInputId}
          value={value || ""}
          onChange={onChange}
          minDate={minDate || undefined}
          maxDate={maxDate || undefined}
          placeholder={placeholder || undefined}
          disabled={disabled}
          error={!!error}
          clearable={!hideClearIcon}
        />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.TIME_PICKER) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <TimePicker
          id={uniqueInputId}
          value={value || ""}
          onChange={onChange}
          hourCycle={hourCycle}
          minuteStep={minuteStep}
          placeholder={placeholder || undefined}
          disabled={disabled}
          error={!!error}
          clearable={!hideClearIcon}
        />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.MONTH_PICKER) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <MonthPicker
          id={uniqueInputId}
          value={value || ""}
          onChange={onChange}
          minMonth={minDate || undefined}
          maxMonth={maxDate || undefined}
          placeholder={placeholder || undefined}
          disabled={disabled}
          error={!!error}
          clearable={!hideClearIcon}
        />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.TEXT) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <input
          type="text"
          id={uniqueInputId}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder || t("inputTextPlaceholder")}
          disabled={disabled}
          className={`nq-input-field ${error ? "nq-input-field-error" : ""}`}
          maxLength={maxLength}
          autoFocus={autoFocus}
        />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.TEXTAREA) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <textarea
          className={`nq-input-field nq-textarea ${error ? "nq-input-field-error" : ""}`}
          spellCheck
          rows={3}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || t("inputTextAreaPlaceholder")}
          disabled={disabled}
          autoFocus={autoFocus}
        />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.SEARCH) {
    const searchInput = (
      <input
        type="text"
        id={uniqueInputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`nq-search-input ${error ? "nq-search-input-error" : ""}`}
        placeholder={placeholder || t("inputSearchPlaceholder")}
        name={fieldName(label)}
        autoFocus={autoFocus}
        disabled={disabled}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
      />
    );
    // A bare search field (no label, helper or error) keeps its markup exactly as it was, so a
    // toolbar search box doesn't pick up the form field's bottom margin.
    return label || helper || error ? (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        {searchInput}
      </InputContainer>
    ) : (
      searchInput
    );
  } else if (type === INPUT_TYPE.SELECT) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <ReactSelect
          {...selectEscapeGuard}
          options={options}
          placeholder={placeholder || t("inputSelectPlaceholder")}
          name={fieldName(label)}
          value={options?.filter((item) => item.value === value)}
          onChange={(e) => onChange((e as InputOption | null)?.value || "")}
          isSearchable
          isClearable={!hideClearIcon}
          noOptionsMessage={noOptionsMessage}
          isDisabled={disabled}
          menuPlacement="auto"
          menuPosition="fixed"
          menuPortalTarget={document.body}
          styles={customSelectStyles(error)}
          autoFocus={autoFocus}
        />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.MULTI_SELECT) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <ReactSelect
          {...selectEscapeGuard}
          options={options}
          name={fieldName(label)}
          value={value}
          onChange={onChange}
          isSearchable
          isMulti
          isClearable
          noOptionsMessage={noOptionsMessage}
          isDisabled={disabled}
          menuPlacement="bottom"
          menuPosition="fixed"
          menuPortalTarget={document.body}
          styles={customSelectStyles(error)}
          autoFocus={autoFocus}
        />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.CHECKBOX) {
    return (
      <div className="nq-check-field">
        <input
          id={uniqueInputId}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="nq-checkbox-input"
          name={fieldName(label)}
          autoFocus={autoFocus}
        />
        {label && <label htmlFor={uniqueInputId}>{label}</label>}
        {error && <div className="nq-error-text">{error}</div>}
      </div>
    );
  } else if (type === INPUT_TYPE.RADIO) {
    return (
      <div className="nq-check-field">
        <input
          id={uniqueInputId}
          type="radio"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="nq-radio-input"
        />
        {label && (
          <label htmlFor={uniqueInputId} className="nq-radio-input-label">
            {label}
          </label>
        )}
      </div>
    );
  } else if (type === INPUT_TYPE.SWITCH) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <Switch checked={Boolean(value)} onChange={onChange} disabled={disabled} />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.NUMBER) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <input
          id={uniqueInputId}
          type="number"
          value={value || ""}
          name={fieldName(label)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`nq-input-field ${error ? "nq-input-field-error" : ""}`}
          maxLength={maxLength}
          autoFocus={autoFocus}
          onWheel={(e) => e.currentTarget.blur()}
        />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.COLOR) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <input
          type="color"
          id={uniqueInputId}
          className="nq-color-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.FILE) {
    const rawName = value instanceof File ? value.name : value?.name || "";
    const displayName = (() => {
      try {
        const url = new URL(rawName);
        return decodeURIComponent(url.pathname.split("/").pop() || rawName);
      } catch {
        return rawName.split("?")[0].split("/").pop() || rawName;
      }
    })();
    const isImageFile =
      value instanceof File
        ? value.type?.startsWith("image/")
        : /\.(jpe?g|png|gif|webp|svg)$/i.test(displayName);

    return (
      <div className="nq-upload-section">
        {label && (
          <label className="nq-upload-label">
            {label}
            {required && <span className="nq-required-mark">*</span>}
          </label>
        )}

        <div
          className={`nq-dropzone ${dragActive ? "nq-dropzone-active" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files?.[0]) onChange(e.dataTransfer.files[0]);
          }}
        >
          {!value ? (
            <>
              <div className="nq-upload-icon">
                <Upload size={32} />
              </div>
              <p>
                {richText(t, "inputDropFile", { browse: <b className="nq-browse">{t("inputBrowse")}</b> })}
              </p>
              <span>{helper || accept}</span>
            </>
          ) : isImageFile && filePreviewUrl ? (
            <>
              <img src={filePreviewUrl} alt={displayName} className="nq-file-preview-img" />
              <p className="nq-file-name" title={rawName}>
                {displayName}
              </p>
            </>
          ) : (
            <>
              <div className="nq-upload-icon">
                <Upload size={32} />
              </div>
              <p className="nq-file-name" title={rawName}>
                {displayName}
              </p>
              <span>{t("inputFileSelected")}</span>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept={accept}
          onChange={(e) => {
            if (e.target.files?.[0]) onChange(e.target.files[0]);
            e.target.value = "";
          }}
        />

        {error && <p className="nq-error-text">{error}</p>}
      </div>
    );
  } else if (type === INPUT_TYPE.MULTIPLE_FILE) {
    const files: any[] = Array.isArray(value) ? value : [];

    return (
      <div className="nq-upload-section">
        {label && (
          <label className="nq-upload-label">
            {label}
            {required && <span className="nq-required-mark">*</span>}
          </label>
        )}

        <div
          className={`nq-dropzone ${dragActive ? "nq-dropzone-active" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files?.length) {
              onChange(Array.from(e.dataTransfer.files));
            }
          }}
        >
          {files.length === 0 ? (
            <>
              <div className="nq-upload-icon">
                <Upload size={32} />
              </div>
              <p>
                {richText(t, "inputDropFiles", { browse: <b className="nq-browse">{t("inputBrowse")}</b> })}
              </p>
              <span>{helper || accept}</span>
            </>
          ) : (
            <>
              <div className="nq-upload-icon">
                <Upload size={32} />
              </div>
              <p className="nq-file-name">
                {t(files.length === 1 ? "inputFilesSelectedOne" : "inputFilesSelected", {
                  count: files.length,
                })}
              </p>
              <span>{helper || accept}</span>
            </>
          )}
        </div>

        {files.length > 0 && (
          <div className="nq-file-list">
            {files.map((item, index) => {
              const itemName = item instanceof File ? item.name : item?.name;
              const itemUrl = item instanceof File ? null : item?.url;
              return (
                <div key={index} className="nq-file-row">
                  <div className="nq-file-row-icon">
                    <FileText size={16} />
                  </div>
                  <span className="nq-file-row-name" title={itemName || t("inputAttachment")}>
                    {itemName || t("inputAttachment")}
                  </span>
                  {(item instanceof File || itemUrl) && (
                    <button
                      type={BUTTON_TYPE.BUTTON}
                      className="nq-file-row-button"
                      title={t("inputView")}
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = item instanceof File ? URL.createObjectURL(item) : itemUrl;
                        window.open(url, "_blank");
                      }}
                    >
                      <Eye size={14} />
                    </button>
                  )}
                  {onRemoveFile && (
                    <button
                      type={BUTTON_TYPE.BUTTON}
                      className="nq-file-row-button nq-file-row-delete"
                      title={t("inputRemove")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile(index);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          accept={accept}
          onChange={(e) => {
            onChange(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />

        {error && <p className="nq-error-text">{error}</p>}
      </div>
    );
  } else if (type === INPUT_TYPE.EXCEL_UPLOAD) {
    return (
      <div className="nq-upload-section">
        {label && <label className="nq-upload-label">{label}</label>}

        <div
          className={`nq-dropzone ${disabled ? "nq-dropzone-disabled" : ""}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept={accept || ".csv,.xlsx,.xls"}
            onChange={(e) => {
              if (e.target.files?.[0]) onChange(e.target.files[0]);
            }}
            disabled={disabled}
          />

          <div className="nq-upload-icon">
            <Upload size={32} />
          </div>

          {value ? (
            <p className="nq-file-name">{value.name}</p>
          ) : (
            <p>{placeholder || t("inputExcelPlaceholder")}</p>
          )}

          <span>{helper || t("inputExcelHelper")}</span>
        </div>

        {error && <p className="nq-error-text">{error}</p>}
      </div>
    );
  }

  // Unknown `type`. Say so once per type in development rather than failing silently.
  if (!reportedUnsupportedTypes.has(type)) {
    reportedUnsupportedTypes.add(type);
    devError(
      `<Input type="${type}"> is not a supported field type. Supported: ${Object.values(INPUT_TYPE).join(", ")}.`
    );
  }

  return (
    <div title="Please confirm input type attribute" data-unsupported-input-type={type}>
      {`Unsupported input type: ${type}`}
    </div>
  );
}

export default Input;
