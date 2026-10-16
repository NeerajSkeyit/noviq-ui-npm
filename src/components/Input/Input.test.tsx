import React from "react";
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Input from "./Input";
import { INPUT_TYPE } from "../../constants";

describe("Input", () => {
  it("text: renders label and fires onChange with the raw value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input type="text" label="Name" value="" onChange={onChange} />);
    const field = screen.getByLabelText("Name");
    await user.type(field, "hi");
    expect(onChange).toHaveBeenLastCalledWith("i");
  });

  it("email: fires onChange with the raw string value", () => {
    const onChange = vi.fn();
    render(<Input type="email" label="Email" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    expect(onChange).toHaveBeenCalledWith("a@b.com");
  });

  it("number: fires onChange with the raw string value", () => {
    const onChange = vi.fn();
    render(<Input type="number" label="Age" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Age"), { target: { value: "42" } });
    expect(onChange).toHaveBeenCalledWith("42");
  });

  it("password: toggles visibility and fires onChange with the raw value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<Input type="password" label="Password" value="" onChange={onChange} />);
    const field = container.querySelector('input[type="password"]') as HTMLInputElement;
    expect(field).toBeInTheDocument();
    fireEvent.change(field, { target: { value: "secret" } });
    expect(onChange).toHaveBeenCalledWith("secret");

    await user.click(container.querySelector(".nq-password-toggle") as HTMLElement);
    expect(container.querySelector('input[type="text"]')).toBeInTheDocument();
  });

  it("required: renders an asterisk next to the label", () => {
    render(<Input type="text" label="Name" required value="" onChange={vi.fn()} />);
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("shows helper text when there is no error", () => {
    render(<Input type="text" label="Name" helper="Enter your full name" value="" onChange={vi.fn()} />);
    expect(screen.getByText("Enter your full name")).toBeInTheDocument();
  });

  it("shows error text instead of helper text when both are present", () => {
    render(
      <Input
        type="text"
        label="Name"
        helper="Enter your full name"
        error="Name is required"
        value=""
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.queryByText("Enter your full name")).not.toBeInTheDocument();
  });

  it("checkbox: toggles as a boolean", () => {
    const onChange = vi.fn();
    render(<Input type="checkbox" label="Agree" value={false} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Agree"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("radio: toggles as a boolean", () => {
    const onChange = vi.fn();
    render(<Input type="radio" label="Option A" value={false} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Option A"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("switch: toggles as a boolean", () => {
    const onChange = vi.fn();
    render(<Input type="switch" label="Enabled" value={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("select: fires onChange with the selected option's value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const options = [
      { label: "Apple", value: "apple" },
      { label: "Banana", value: "banana" },
    ];
    render(<Input type="select" label="Fruit" options={options} value="" onChange={onChange} />);
    await user.click(screen.getByText("Select"));
    await user.click(await screen.findByText("Apple"));
    expect(onChange).toHaveBeenCalledWith("apple");
  });

  it("multiSelect: fires onChange with the selected options", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const options = [
      { label: "Apple", value: "apple" },
      { label: "Banana", value: "banana" },
    ];
    render(
      <Input type="multiSelect" label="Fruits" options={options} value={[]} onChange={onChange} />
    );
    await user.click(screen.getByText("Select..."));
    await user.click(await screen.findByText("Apple"));
    expect(onChange).toHaveBeenCalled();
    const [selected] = onChange.mock.calls[0];
    expect(selected).toEqual(expect.arrayContaining([expect.objectContaining({ value: "apple" })]));
  });

  it("file: uploads via the hidden file input", () => {
    const onChange = vi.fn();
    const { container } = render(<Input type="file" label="Attachment" value={null} onChange={onChange} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith(file);
  });

  it("file: accepts a dropped file", () => {
    const onChange = vi.fn();
    const { container } = render(<Input type="file" label="Attachment" value={null} onChange={onChange} />);
    const dropzone = container.querySelector(".nq-dropzone") as HTMLElement;
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith(file);
  });

  it("multipleFile: uploads multiple files and lists them", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Input type="multipleFile" label="Attachments" value={[]} onChange={onChange} />
    );
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      new File(["a"], "a.txt", { type: "text/plain" }),
      new File(["b"], "b.txt", { type: "text/plain" }),
    ];
    fireEvent.change(fileInput, { target: { files } });
    expect(onChange).toHaveBeenCalledWith(files);
  });

  it("multipleFile: removes a file via onRemoveFile", () => {
    const onRemoveFile = vi.fn();
    const files = [new File(["a"], "a.txt", { type: "text/plain" })];
    render(
      <Input
        type="multipleFile"
        label="Attachments"
        value={files}
        onChange={vi.fn()}
        onRemoveFile={onRemoveFile}
      />
    );
    fireEvent.click(screen.getByTitle("Remove"));
    expect(onRemoveFile).toHaveBeenCalledWith(0);
  });

  it("excelUpload: accepts a file", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Input type="excelUpload" label="Import" value={null} onChange={onChange} />
    );
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["a,b,c"], "data.csv", { type: "text/csv" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith(file);
  });

  it("falls back to an error message for an unrecognized type", () => {
    render(<Input type="unknownType" value="" onChange={vi.fn()} />);
    expect(screen.getByTitle("Please confirm input type attribute")).toBeInTheDocument();
  });

  describe("search", () => {
    it("keeps the bare input — no wrapper — when it has no label, helper or error", () => {
      const { container } = render(<Input type="search" value="" onChange={() => {}} />);
      expect(container.querySelector(".nq-form-field")).toBeNull();
      expect(container.querySelector("input.nq-search-input")).toBeInTheDocument();
    });

    it("renders its label, tied to the input", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Input type="search" label="Find employee" value="" onChange={onChange} />);
      await user.type(screen.getByLabelText("Find employee"), "a");
      expect(onChange).toHaveBeenLastCalledWith("a");
    });

    it("marks a required field", () => {
      render(<Input type="search" label="Find" required value="" onChange={() => {}} />);
      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("shows helper text, replaced by the error when there is one", () => {
      const { rerender } = render(
        <Input type="search" label="Find" helper="Name or id" value="" onChange={() => {}} />
      );
      expect(screen.getByText("Name or id")).toBeInTheDocument();

      rerender(
        <Input type="search" label="Find" helper="Name or id" error="Too short" value="" onChange={() => {}} />
      );
      expect(screen.getByText("Too short")).toBeInTheDocument();
      expect(screen.queryByText("Name or id")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Find")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText("Find")).toHaveClass("nq-search-input-error");
    });

    it("honours disabled and maxLength", () => {
      render(<Input type="search" label="Find" disabled maxLength={5} value="" onChange={() => {}} />);
      const field = screen.getByLabelText("Find");
      expect(field).toBeDisabled();
      expect(field).toHaveAttribute("maxlength", "5");
    });
  });

  describe("picker types", () => {
    const triggerOf = () => screen.getAllByRole("combobox").find((el) => el.tagName === "BUTTON")!;

    it("datePicker: is labelled, shows DD/MM/YYYY, and emits YYYY-MM-DD", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Input type="datePicker" label="Join date" value="2024-03-05" onChange={onChange} />);
      expect(screen.getByLabelText("Join date")).toHaveTextContent("05/03/2024");

      await user.click(triggerOf());
      await user.click(screen.getByRole("gridcell", { name: "20/03/2024" }));
      expect(onChange).toHaveBeenCalledWith("2024-03-20");
    });

    it("datePicker: minDate / maxDate disable days", async () => {
      const user = userEvent.setup();
      render(
        <Input type="datePicker" label="D" value="2024-03-15" minDate="2024-03-10" maxDate="2024-03-20" onChange={() => {}} />
      );
      await user.click(triggerOf());
      expect(screen.getByRole("gridcell", { name: "09/03/2024" })).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByRole("gridcell", { name: "10/03/2024" })).not.toHaveAttribute("aria-disabled");
    });

    it("timePicker: emits 24-hour HH:mm and honours hourCycle / minuteStep", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Input type="timePicker" label="Start" value="14:30" hourCycle={12} minuteStep={15} onChange={onChange} />
      );
      expect(screen.getByLabelText("Start")).toHaveTextContent("02:30 PM");

      await user.click(triggerOf());
      const minutes = within(screen.getByRole("listbox", { name: "Minutes" })).getAllByRole("option");
      expect(minutes.map((o) => o.textContent)).toEqual(["00", "15", "30", "45"]);
      await user.click(screen.getByRole("option", { name: "PM" }));
      await user.click(screen.getByRole("option", { name: "05" }));
      expect(onChange).toHaveBeenLastCalledWith("17:30");
    });

    it("monthPicker: shows MM/YYYY and emits YYYY-MM; minDate/maxDate bound the months", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Input type="monthPicker" label="Period" value="2024-03" minDate="2024-02-01" maxDate="2024-09-30" onChange={onChange} />
      );
      expect(screen.getByLabelText("Period")).toHaveTextContent("03/2024");

      await user.click(triggerOf());
      expect(screen.getByRole("gridcell", { name: "January 2024" })).toHaveAttribute("aria-disabled", "true");
      await user.click(screen.getByRole("gridcell", { name: "June 2024" }));
      expect(onChange).toHaveBeenCalledWith("2024-06");
    });

    const VALID_VALUE: [string, string][] = [
      ["datePicker", "2024-03-05"],
      ["timePicker", "09:30"],
      ["monthPicker", "2024-03"],
    ];
    const clearButton = () => screen.queryByRole("button", { name: /^Clear / });

    it.each(VALID_VALUE)("%s: shows the error text and flags the control invalid", (type, value) => {
      render(<Input type={type} label="F" value={value} error="Required" onChange={() => {}} />);
      expect(screen.getByText("Required")).toBeInTheDocument();
      expect(triggerOf()).toHaveAttribute("aria-invalid", "true");
    });

    it.each(VALID_VALUE)("%s: offers a clear button, hidden by hideClearIcon", (type, value) => {
      const { rerender } = render(<Input type={type} label="F" value={value} onChange={() => {}} />);
      expect(clearButton()).toBeInTheDocument();

      rerender(<Input type={type} label="F" value={value} hideClearIcon onChange={() => {}} />);
      expect(clearButton()).not.toBeInTheDocument();
    });

    it.each(["datePicker", "timePicker", "monthPicker"])("%s: respects disabled", async (type) => {
      const user = userEvent.setup();
      render(<Input type={type} label="F" value="" disabled onChange={() => {}} />);
      expect(triggerOf()).toBeDisabled();
      await user.click(triggerOf());
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("leaves the native date / time / month types alone", () => {
      render(
        <div>
          <Input type="date" label="Native date" value="2024-03-05" onChange={() => {}} />
          <Input type="time" label="Native time" value="09:30" onChange={() => {}} />
          <Input type="month" label="Native month" value="2024-03" onChange={() => {}} />
        </div>
      );
      expect((screen.getByLabelText("Native date") as HTMLInputElement).type).toBe("date");
      expect((screen.getByLabelText("Native time") as HTMLInputElement).type).toBe("time");
      expect((screen.getByLabelText("Native month") as HTMLInputElement).type).toBe("month");
    });
  });

  describe("supported types", () => {
    // Per-type values that the field can render without choking; everything else takes "".
    const VALUE: Record<string, unknown> = {
      checkbox: false,
      switch: false,
      radio: "",
      multiSelect: [],
      file: null,
      multipleFile: [],
      excelUpload: null,
    };

    it.each(Object.values(INPUT_TYPE))("every INPUT_TYPE value renders a real field: %s", (type) => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      render(
        <Input
          type={type}
          label="Field"
          value={VALUE[type] ?? ""}
          onChange={() => {}}
          options={[{ label: "A", value: "a" }]}
        />
      );
      expect(screen.queryByText(/Unsupported input type/)).not.toBeInTheDocument();
      expect(error).not.toHaveBeenCalledWith("[noviq-ui]", expect.stringContaining("not a supported field type"));
      error.mockRestore();
    });

    it("no longer declares the field types that never had an implementation", () => {
      for (const dead of ["rowsPerPage", "multiText", "custom", "dateRange", "reactQuill"]) {
        expect(Object.values(INPUT_TYPE)).not.toContain(dead);
      }
    });

    it("an unknown type names itself in the fallback and is reported once in development", () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const { rerender } = render(<Input type="multiText" label="Tags" value="" onChange={() => {}} />);
      expect(screen.getByText("Unsupported input type: multiText")).toBeInTheDocument();

      rerender(<Input type="multiText" label="Tags" value="x" onChange={() => {}} />);
      const reports = error.mock.calls.filter((c) => String(c[1]).includes('type="multiText"'));
      expect(reports).toHaveLength(1);
      expect(String(reports[0][1])).toContain("Supported:");
      error.mockRestore();
    });
  });
});

describe("Input search — error border", () => {
  it("is declared after the base rule, so its colour wins at equal specificity", () => {
    // jsdom does not resolve `var(--nq-danger)`, so the cascade is checked on the stylesheet itself.
    const css = readFileSync(resolve(process.cwd(), "src/components/Input/Input.css"), "utf8");
    const base = css.indexOf(".nq-search-input {");
    const error = css.indexOf(".nq-search-input-error {");
    expect(base).toBeGreaterThan(-1);
    expect(error).toBeGreaterThan(base);
  });
});
