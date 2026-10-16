import React from "react";
import Button from "../Button/Button";
import { BUTTON_TYPE, BUTTON_VARIANT, type ButtonVariant } from "../../constants";
import { useText } from "../../hooks/useText";

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
  const t = useText();
  return (
    <>
      <Button variant={BUTTON_VARIANT.OUTLINE} type={BUTTON_TYPE.BUTTON} onClick={onCancel} disabled={isSubmitting}>
        {cancelLabel || t("formCancel")}
      </Button>

      {buttons.map((btn) => (
        <Button
          variant={btn.variant || BUTTON_VARIANT.OUTLINE}
          type={BUTTON_TYPE.BUTTON}
          onClick={btn.onClick}
          key={btn.label}
          disabled={isSubmitting}
        >
          {btn.label}
        </Button>
      ))}

      <Button variant={BUTTON_VARIANT.DEFAULT} type={BUTTON_TYPE.BUTTON} onClick={onSubmit} disabled={isSubmitting}>
        {submitLabel || t("formSave")}
      </Button>
    </>
  );
}

export default FormFooter;
