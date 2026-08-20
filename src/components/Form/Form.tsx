import React from "react";
import type { FormikProps } from "formik";
import Input, { type InputProps } from "../Input/Input";
import "./Form.css";

export interface FormFieldConfig
  extends Omit<InputProps, "value" | "onChange" | "error"> {
  /** Key into `formik.values` / `formik.errors` / `formik.touched`. */
  inputKey: string;
  /** How many fields share this row: `1` = alone (100% width), `2` = one of
   * two side by side (50% each), `3` = one of three side by side (~33% each).
   * Fields meant to sit on the same row must use the same `colSpan` value —
   * mismatched values (e.g. a `2` next to a `1`) will wrap instead of
   * filling the row evenly. Defaults to `1`. */
  colSpan?: 1 | 2 | 3;
  hidden?: boolean;
  /** Renders an "info" section header instead of a field when type is "info". */
  title?: string;
  subtitle?: string;
}

export interface FormProps {
  inputList?: FormFieldConfig[];
  formik: FormikProps<Record<string, any>>;
}

function Form({ inputList = [], formik }: FormProps) {
  return (
    <div className="form-container">
      {inputList.map((input, index) => {
        if (input.hidden) return null;

        if (input.type === "info") {
          return (
            <div key={index} className="col-span-1 info-section">
              <div className="info-section-title">{input.title}</div>
              <div className="info-section-subtitle">{input.subtitle}</div>
            </div>
          );
        }

        const { inputKey, colSpan = 1, disabled, ...rest } = input;

        return (
          <div key={index} className={`col-span-${colSpan}`}>
            <Input
              onChange={(value) => {
                if (!disabled) formik.setFieldValue(inputKey, value);
              }}
              value={formik.values?.[inputKey]}
              error={
                formik.touched?.[inputKey]
                  ? (formik.errors?.[inputKey] as string | undefined)
                  : undefined
              }
              disabled={disabled}
              {...rest}
            />
          </div>
        );
      })}
    </div>
  );
}

export default Form;
