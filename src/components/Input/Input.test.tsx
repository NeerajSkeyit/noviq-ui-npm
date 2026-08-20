import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Input from "./Input";

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

    await user.click(container.querySelector(".password-toggle") as HTMLElement);
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
    const dropzone = container.querySelector(".dropzone") as HTMLElement;
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
});
