import React from "react";
import { ArrowLeft } from "lucide-react";
import Button from "../Button/Button";
import FormFooter from "../FormFooter/FormFooter";
import { BUTTON_SIZE, BUTTON_TYPE, BUTTON_VARIANT } from "../../constants";
import "./FullPageSection.css";

export interface FullPageSectionProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  /** Called by the back arrow (and by Cancel when no `onCancel` is given). Defaults to
   * `window.history.back()` — pass your own to navigate with your router. */
  onBack?: () => void;
  /** Called by the default footer's Cancel button. Defaults to `onBack`. */
  onCancel?: () => void;
  /** Called by the default footer's submit button. */
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  /** Disables the default footer's buttons and shows `loadingLabel` on the submit button. */
  loading?: boolean;
  /** Submit button text while `loading`. Defaults to "Saving...". */
  loadingLabel?: string;
  /** Replaces the default Cancel/Submit footer entirely. */
  footer?: React.ReactNode;
}

/**
 * A full-page layout for a single-step form that has too many fields for a Drawer or Modal: a
 * back arrow + title header, the form inside a card, and a sticky footer. Not a multi-step wizard.
 */
function FullPageSection({
  title,
  subtitle,
  children,
  onBack,
  onCancel,
  onSubmit,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  loading = false,
  loadingLabel = "Saving...",
  footer,
}: FullPageSectionProps) {
  const handleBack = onBack ?? (() => window.history.back());

  return (
    <div className="full-page-section">
      <div className="full-page-section-main">
        <div className="full-page-section-content">
          <div className="full-page-section-card">
            <div className="full-page-section-header">
              <Button
                type={BUTTON_TYPE.BUTTON}
                variant={BUTTON_VARIANT.GHOST}
                size={BUTTON_SIZE.ICON}
                onClick={handleBack}
                aria-label="Back"
              >
                <ArrowLeft size={18} aria-hidden />
              </Button>
              <div>
                <h1 className="full-page-section-title">{title}</h1>
                {subtitle && <p className="full-page-section-subtitle">{subtitle}</p>}
              </div>
            </div>

            {children}
          </div>
        </div>

        <div className="full-page-section-footer">
          {footer ?? (
            <FormFooter
              onCancel={onCancel ?? handleBack}
              onSubmit={onSubmit}
              cancelLabel={cancelLabel}
              submitLabel={loading ? loadingLabel : submitLabel}
              isSubmitting={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default FullPageSection;
