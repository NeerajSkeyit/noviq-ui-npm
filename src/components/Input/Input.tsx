import React, { useEffect, useId, useRef, useState } from "react";
import ReactSelect, { type StylesConfig } from "react-select";
import { Eye, EyeOff, FileText, Trash2, Upload, X } from "lucide-react";
import Label from "../Label/Label";
import Switch from "../Switch/Switch";
import { BUTTON_TYPE, INPUT_TYPE } from "../../constants";
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
  minDate?: string;
  maxDate?: string;
  maxLength?: number;
  autoFocus?: boolean;
  hideClearIcon?: boolean;
  /** Called with the removed file's index, for `multipleFile`. */
  onRemoveFile?: (index: number) => void;
}

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
    <div className="form-field">
      {label && (
        <Label htmlFor={htmlFor} className="form-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </Label>
      )}
      {children}
      {helper && !error && <p className="helper-text">{helper}</p>}
      {error && <p className="error-text">{error}</p>}
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
      border: `1px solid ${error ? "var(--danger)" : "var(--border-color)"}`,
      boxShadow: "none",
      padding: "0",
      opacity: state.isDisabled ? 0.5 : 1,
      backgroundColor: state.isDisabled ? "var(--secondary-background)" : "var(--light)",
      "&:hover": {
        border: `1px solid ${error ? "var(--danger)" : "var(--border-color)"}`,
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
    menuPortal: (base) => ({ ...base, zIndex: 1300 }),
    option: (base, state) => ({
      ...base,
      fontSize: "14px",
      padding: "6px 12px",
      borderRadius: "4px",
      backgroundColor: state.isSelected
        ? "var(--border-color)"
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
      color: "var(--primary)",
      padding: "1px 3px",
      fontWeight: 500,
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "var(--primary)",
      ":hover": { backgroundColor: "transparent", color: "var(--danger)" },
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
  noOptionsMessage = () => "No Options",
  disabled = false,
  minDate = "",
  maxDate = "",
  maxLength,
  autoFocus = false,
  hideClearIcon = false,
  onRemoveFile,
}: InputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const uniqueInputId = `${type}-${useId()}`;
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
        <div className="password-wrap">
          <input
            type={isPasswordVisible ? "text" : "password"}
            id={uniqueInputId}
            className={`input-field ${error ? "input-field-error" : ""}`}
            placeholder="••••••••"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            autoFocus={autoFocus}
            name={fieldName(label)}
          />
          <span
            className="password-toggle"
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
          placeholder={placeholder || "abc@email.com"}
          disabled={disabled}
          className={`input-field ${error ? "input-field-error" : ""}`}
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
          className={`input-field ${error ? "input-field-error" : ""}`}
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
          className={`input-field ${error ? "input-field-error" : ""}`}
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
          className={`input-field ${error ? "input-field-error" : ""}`}
          min={minDate}
          max={maxDate}
          disabled={disabled}
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
          placeholder={placeholder || "Enter Text"}
          disabled={disabled}
          className={`input-field ${error ? "input-field-error" : ""}`}
          maxLength={maxLength}
          autoFocus={autoFocus}
        />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.TEXTAREA) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <textarea
          className={`input-field textarea ${error ? "input-field-error" : ""}`}
          spellCheck
          rows={3}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Text Area"}
          disabled={disabled}
          autoFocus={autoFocus}
        />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.SEARCH) {
    return (
      <input
        type="text"
        id={uniqueInputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="search-input"
        placeholder={placeholder || "Search"}
        name={fieldName(label)}
        autoFocus={autoFocus}
      />
    );
  } else if (type === INPUT_TYPE.SELECT) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <ReactSelect
          options={options}
          placeholder={placeholder || "Select"}
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
      <div className="check-field">
        <input
          id={uniqueInputId}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="checkbox-input"
          name={fieldName(label)}
          autoFocus={autoFocus}
        />
        {label && <label htmlFor={uniqueInputId}>{label}</label>}
        {error && <div className="error-text">{error}</div>}
      </div>
    );
  } else if (type === INPUT_TYPE.RADIO) {
    return (
      <div className="check-field">
        <input
          id={uniqueInputId}
          type="radio"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="radio-input"
        />
        {label && (
          <label htmlFor={uniqueInputId} className="radio-input-label">
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
          className={`input-field ${error ? "input-field-error" : ""}`}
          maxLength={maxLength}
          autoFocus={autoFocus}
        />
      </InputContainer>
    );
  } else if (type === INPUT_TYPE.COLOR) {
    return (
      <InputContainer htmlFor={uniqueInputId} label={label} required={required} helper={helper} error={error}>
        <input
          type="color"
          id={uniqueInputId}
          className="color-input"
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
      <div className="upload-section">
        {label && (
          <label className="upload-label">
            {label}
            {required && <span className="required-mark">*</span>}
          </label>
        )}

        <div
          className={`dropzone ${dragActive ? "dropzone-active" : ""}`}
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
              <div className="upload-icon">
                <Upload size={32} />
              </div>
              <p>
                Drag and drop a file here, or <b className="browse">browse</b>
              </p>
              <span>{helper || accept}</span>
            </>
          ) : isImageFile && filePreviewUrl ? (
            <>
              <img src={filePreviewUrl} alt={displayName} className="file-preview-img" />
              <p className="file-name" title={rawName}>
                {displayName}
              </p>
            </>
          ) : (
            <>
              <div className="upload-icon">
                <Upload size={32} />
              </div>
              <p className="file-name" title={rawName}>
                {displayName}
              </p>
              <span>File selected</span>
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

        {error && <p className="error-text">{error}</p>}
      </div>
    );
  } else if (type === INPUT_TYPE.MULTIPLE_FILE) {
    const files: any[] = Array.isArray(value) ? value : [];

    return (
      <div className="upload-section">
        {label && (
          <label className="upload-label">
            {label}
            {required && <span className="required-mark">*</span>}
          </label>
        )}

        <div
          className={`dropzone ${dragActive ? "dropzone-active" : ""}`}
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
              <div className="upload-icon">
                <Upload size={32} />
              </div>
              <p>
                Drag and drop files here, or <b className="browse">browse</b>
              </p>
              <span>{helper || accept}</span>
            </>
          ) : (
            <>
              <div className="upload-icon">
                <Upload size={32} />
              </div>
              <p className="file-name">
                {files.length} file{files.length > 1 ? "s" : ""} selected
              </p>
              <span>{helper || accept}</span>
            </>
          )}
        </div>

        {files.length > 0 && (
          <div className="file-list">
            {files.map((item, index) => {
              const itemName = item instanceof File ? item.name : item?.name;
              const itemUrl = item instanceof File ? null : item?.url;
              return (
                <div key={index} className="file-row">
                  <div className="file-row-icon">
                    <FileText size={16} />
                  </div>
                  <span className="file-row-name" title={itemName || "Attachment"}>
                    {itemName || "Attachment"}
                  </span>
                  {(item instanceof File || itemUrl) && (
                    <button
                      type={BUTTON_TYPE.BUTTON}
                      className="file-row-button"
                      title="View"
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
                      className="file-row-button file-row-delete"
                      title="Remove"
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

        {error && <p className="error-text">{error}</p>}
      </div>
    );
  } else if (type === INPUT_TYPE.EXCEL_UPLOAD) {
    return (
      <div className="upload-section">
        {label && <label className="upload-label">{label}</label>}

        <div
          className={`dropzone ${disabled ? "dropzone-disabled" : ""}`}
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

          <div className="upload-icon">
            <Upload size={32} />
          </div>

          {value ? (
            <p className="file-name">{value.name}</p>
          ) : (
            <p>{placeholder || "Click to upload excel file"}</p>
          )}

          <span>{helper || "CSV, XLSX, XLS"}</span>
        </div>

        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  return (
    <div title="Please confirm input type attribute">Worng input type provided</div>
  );
}

export default Input;
