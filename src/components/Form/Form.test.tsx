import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useFormik } from "formik";
import Form, { type FormFieldConfig } from "./Form";

function Harness({
  inputList,
  initialValues,
  initialErrors,
  initialTouched,
}: {
  inputList: FormFieldConfig[];
  initialValues: Record<string, any>;
  initialErrors?: Record<string, any>;
  initialTouched?: Record<string, any>;
}) {
  const formik = useFormik({
    initialValues,
    initialErrors,
    initialTouched,
    onSubmit: () => {},
  });
  return <Form inputList={inputList} formik={formik} />;
}

describe("Form", () => {
  it("renders a field for each entry in inputList", () => {
    render(
      <Harness
        inputList={[
          { inputKey: "name", type: "text", label: "Name" },
          { inputKey: "email", type: "email", label: "Email" },
        ]}
        initialValues={{ name: "", email: "" }}
      />
    );
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("skips fields marked hidden", () => {
    render(
      <Harness
        inputList={[
          { inputKey: "name", type: "text", label: "Name" },
          { inputKey: "secret", type: "text", label: "Secret", hidden: true },
        ]}
        initialValues={{ name: "", secret: "" }}
      />
    );
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.queryByLabelText("Secret")).not.toBeInTheDocument();
  });

  it("renders an info section header for type=info", () => {
    render(
      <Harness
        inputList={[{ inputKey: "section", type: "info", title: "Section title", subtitle: "Details" }]}
        initialValues={{}}
      />
    );
    expect(screen.getByText("Section title")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("calls formik.setFieldValue when a field changes", () => {
    render(
      <Harness
        inputList={[{ inputKey: "name", type: "text", label: "Name" }]}
        initialValues={{ name: "" }}
      />
    );
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Ada");
  });

  it("does not update the field when disabled", () => {
    render(
      <Harness
        inputList={[{ inputKey: "name", type: "text", label: "Name", disabled: true }]}
        initialValues={{ name: "initial" }}
      />
    );
    const field = screen.getByLabelText("Name") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "changed" } });
    expect(field.value).toBe("initial");
  });

  it("shows the error only once the field is touched", () => {
    render(
      <Harness
        inputList={[{ inputKey: "name", type: "text", label: "Name" }]}
        initialValues={{ name: "" }}
        initialErrors={{ name: "Required" }}
        initialTouched={{ name: true }}
      />
    );
    expect(screen.getByText("Required")).toBeInTheDocument();
  });
});

describe("Form without formik", () => {
  // `Form` only needs { values, errors, touched, setFieldValue } — a plain object is enough, so a
  // consumer on React Hook Form, a reducer, or hand-rolled state doesn't have to install formik.
  function makeController(overrides: Record<string, any> = {}) {
    return {
      values: { name: "Ada" },
      errors: {},
      touched: {},
      setFieldValue: vi.fn(),
      ...overrides,
    };
  }

  it("reads the field value from controller.values", () => {
    render(
      <Form
        inputList={[{ inputKey: "name", type: "text", label: "Name" }]}
        formik={makeController()}
      />
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Ada");
  });

  it("calls controller.setFieldValue(inputKey, value) on change", () => {
    const controller = makeController();
    render(
      <Form
        inputList={[{ inputKey: "name", type: "text", label: "Name" }]}
        formik={controller}
      />
    );
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Grace" } });
    expect(controller.setFieldValue).toHaveBeenCalledWith("name", "Grace");
  });

  it("shows an error only for a touched field", () => {
    const inputList: FormFieldConfig[] = [{ inputKey: "name", type: "text", label: "Name" }];
    const { rerender } = render(
      <Form inputList={inputList} formik={makeController({ errors: { name: "Required" } })} />
    );
    expect(screen.queryByText("Required")).not.toBeInTheDocument();

    rerender(
      <Form
        inputList={inputList}
        formik={makeController({ errors: { name: "Required" }, touched: { name: true } })}
      />
    );
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("works when the controller omits errors and touched entirely", () => {
    render(
      <Form
        inputList={[{ inputKey: "name", type: "text", label: "Name" }]}
        formik={{ values: { name: "" }, setFieldValue: vi.fn() }}
      />
    );
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });
});
