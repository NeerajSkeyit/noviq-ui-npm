import React from "react";
import Button, { type ButtonVariant } from "../Button/Button";

export interface FormFooterButton {
  label: string;
  variant?: ButtonVariant;
  onClick?: () => void;
}

export interface FormFooterProps {
  onSubmit?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  buttons?: FormFooterButton[];
  isSubmitting?: boolean;
}

function FormFooter({
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
  buttons = [],
  isSubmitting = false,
}: FormFooterProps) {
  return (
    <>
      <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
        {cancelLabel || "Cancel"}
      </Button>

      {buttons.map((btn) => (
        <Button
          variant={btn.variant || "outline"}
          type="button"
          onClick={btn.onClick}
          key={btn.label}
          disabled={isSubmitting}
        >
          {btn.label}
        </Button>
      ))}

      <Button variant="default" type="button" onClick={onSubmit} disabled={isSubmitting}>
        {submitLabel || "Save"}
      </Button>
    </>
  );
}

export default FormFooter;
