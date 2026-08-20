import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { useFormik } from "formik";
import {
  Button,
  Drawer,
  Modal,
  ScrollArea,
  Input,
  Label,
  Switch,
  FormFooter,
  Form,
  Table,
  FILTER_TYPE,
} from "../src/index";
import type {
  DrawerSide,
  DrawerSize,
  FormFieldConfig,
  TableColumn,
  TableQueryParams,
  TableQueryResult,
  FilterConfig,
} from "../src/index";

interface Employee {
  id: number;
  name: string;
  department: string;
  status: string;
  joinDate: string;
  salary: number;
}

const DEPARTMENTS = ["Engineering", "Design", "Sales", "Support"];
const STATUSES = ["active", "inactive", "pending"];

const preFetchedEmployees: Employee[] = Array.from({ length: 5 }).map((_, i) => ({
  id: i + 1,
  name: ["Alice Chen", "Bob Kumar", "Charlie Lopez", "Dana Smith", "Evan Reyes"][i],
  department: DEPARTMENTS[i % DEPARTMENTS.length],
  status: STATUSES[i % STATUSES.length],
  joinDate: `2023-0${(i % 9) + 1}-15`,
  salary: 50000 + i * 5000,
}));

const mockDatabase: Employee[] = Array.from({ length: 47 }).map((_, i) => ({
  id: i + 1,
  name: `Employee ${i + 1}`,
  department: DEPARTMENTS[i % DEPARTMENTS.length],
  status: STATUSES[i % STATUSES.length],
  joinDate: `2022-${String((i % 12) + 1).padStart(2, "0")}-10`,
  salary: 40000 + (i % 10) * 4000,
}));

function mockFetchEmployees(params: TableQueryParams): Promise<TableQueryResult<Employee>> {
  const search = (params.search as string)?.toLowerCase() ?? "";
  const department = params.department as string | undefined;
  const joinDateFrom = params.joinDateFrom as string | undefined;
  const joinDateTo = params.joinDateTo as string | undefined;

  const filtered = mockDatabase.filter((row) => {
    if (search && !row.name.toLowerCase().includes(search) && !row.department.toLowerCase().includes(search)) {
      return false;
    }
    if (department && !department.split(",").includes(row.department)) return false;
    if (joinDateFrom && row.joinDate < joinDateFrom) return false;
    if (joinDateTo && row.joinDate > joinDateTo) return false;
    return true;
  });
  const start = (params.page_no - 1) * params.rows_per_page;
  const page = filtered.slice(start, start + params.rows_per_page);

  return new Promise((resolve) => {
    setTimeout(() => resolve({ result: page, totalCount: filtered.length }), 400);
  });
}

const employeeFilterConfigs: FilterConfig[] = [
  {
    id: "department",
    label: "Department",
    type: FILTER_TYPE.SELECT,
    options: DEPARTMENTS.map((d) => ({ value: d, label: d })),
  },
  { id: "joinDate", label: "Join date", type: FILTER_TYPE.DATE_RANGE },
];

const employeeColumns: TableColumn<Employee>[] = [
  { id: "name", heading: "Name", accessorKey: "name", sortable: true, sticky: "left", width: 160 },
  { id: "department", heading: "Department", accessorKey: "department", sortable: true },
  { id: "status", heading: "Status", accessorKey: "status", type: "status" },
  { id: "joinDate", heading: "Join date", accessorKey: "joinDate", type: "date", sortable: true },
  {
    id: "salary",
    heading: "Salary",
    accessorKey: "salary",
    type: "currency",
    align: "right",
    sortable: true,
  },
];

function Playground() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSide, setDrawerSide] = useState<DrawerSide>("right");
  const [drawerSize, setDrawerSize] = useState<DrawerSize>("md");
  const [drawerCloseOnOutside, setDrawerCloseOnOutside] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalCloseOnOutside, setModalCloseOnOutside] = useState(true);

  const [textValue, setTextValue] = useState("");
  const [fruit, setFruit] = useState("");
  const [fruits, setFruits] = useState<{ label: string; value: string }[]>([]);
  const [agree, setAgree] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);

  const fruitOptions = [
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Cherry", value: "cherry" },
  ];

  const formFields: FormFieldConfig[] = [
    { inputKey: "section", type: "info", title: "Profile", subtitle: "Basic details", colSpan: 3 },
    { inputKey: "firstName", type: "text", label: "First name", required: true, colSpan: 2 },
    { inputKey: "lastName", type: "text", label: "Last name", required: true, colSpan: 2 },
    { inputKey: "bio", type: "textArea", label: "Bio", colSpan: 3 },
    { inputKey: "role", type: "select", label: "Role", options: fruitOptions, colSpan: 2 },
    { inputKey: "subscribed", type: "switch", label: "Subscribed", colSpan: 2 },
  ];

  const formik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      bio: "",
      role: "",
      subscribed: false,
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.firstName) errors.firstName = "First name is required";
      if (!values.lastName) errors.lastName = "Last name is required";
      return errors;
    },
    onSubmit: (values) => {
      alert(`Submitted: ${JSON.stringify(values, null, 2)}`);
    },
  });

  return (
    <div style={{ padding: 32, fontFamily: "sans-serif", maxWidth: 960 }}>
      {/* Table's export feature uses react-hot-toast for loading/success/error feedback;
          consumers must mount their own <Toaster/> (documented in README.md). */}
      <Toaster position="top-right" />
      <h1>noviq-ui playground</h1>

      <section style={{ marginBottom: 40 }}>
        <h2>Button</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="default">Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="icon button">
            ✕
          </Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2>ScrollArea</h2>
        <ScrollArea style={{ height: 100, border: "1px solid #ccc", borderRadius: 6 }}>
          <div style={{ padding: 12 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <p key={i}>Scrollable line {i + 1}</p>
            ))}
          </div>
        </ScrollArea>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2>Drawer</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {(["right", "left", "top", "bottom"] as DrawerSide[]).map((side) => (
            <Button
              key={side}
              variant={drawerSide === side ? "default" : "outline"}
              onClick={() => setDrawerSide(side)}
            >
              side: {side}
            </Button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {(["sm", "md", "lg"] as DrawerSize[]).map((size) => (
            <Button
              key={size}
              variant={drawerSize === size ? "default" : "outline"}
              onClick={() => setDrawerSize(size)}
            >
              size: {size}
            </Button>
          ))}
        </div>
        <label style={{ display: "block", marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={drawerCloseOnOutside}
            onChange={(e) => setDrawerCloseOnOutside(e.target.checked)}
          />{" "}
          closeOnOutside
        </label>
        <Button onClick={() => setDrawerOpen(true)}>Open Drawer</Button>
        <Drawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Example Drawer"
          subtitle="Ported from noviq-hrms-ui"
          side={drawerSide}
          size={drawerSize}
          closeOnOutside={drawerCloseOnOutside}
          footer={
            <>
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDrawerOpen(false)}>Save</Button>
            </>
          }
        >
          <p>This is the drawer body content.</p>
          <Input type="text" label="Name" value={textValue} onChange={setTextValue} />
        </Drawer>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2>Modal</h2>
        <label style={{ display: "block", marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={modalCloseOnOutside}
            onChange={(e) => setModalCloseOnOutside(e.target.checked)}
          />{" "}
          closeOnOutside
        </label>
        <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Example Modal"
          subtitle="Ported from noviq-hrms-ui"
          closeOnOutside={modalCloseOnOutside}
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setModalOpen(false)}>Confirm</Button>
            </>
          }
        >
          <p>This is the modal body content.</p>
        </Modal>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2>Input field types</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 700 }}>
          <Input type="text" label="Text" required helper="A helper hint" value={textValue} onChange={setTextValue} />
          <Input type="email" label="Email" value="" onChange={() => {}} />
          <Input type="password" label="Password" value="" onChange={() => {}} />
          <Input type="number" label="Number" value="" onChange={() => {}} />
          <Input type="textArea" label="Notes" value="" onChange={() => {}} />
          <Input type="date" label="Date" value="" onChange={() => {}} />
          <Input type="time" label="Time" value="" onChange={() => {}} />
          <Input type="month" label="Month" value="" onChange={() => {}} />
          <Input type="color" label="Color" value="#02699b" onChange={() => {}} />
          <Input
            type="select"
            label="Favorite fruit"
            options={fruitOptions}
            value={fruit}
            onChange={setFruit}
          />
          <Input
            type="multiSelect"
            label="Fruits"
            options={fruitOptions}
            value={fruits}
            onChange={setFruits}
          />
          <Input type="checkbox" label="I agree" value={agree} onChange={setAgree} />
          <Input type="radio" label="Option A" value={agree} onChange={setAgree} />
          <Input type="switch" label="Notifications" value={notifyEnabled} onChange={setNotifyEnabled} />
        </div>
        <div style={{ maxWidth: 700, marginTop: 16 }}>
          <Input
            type="file"
            label="Attachment"
            value={attachment}
            onChange={setAttachment}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <Label>Standalone Label</Label>{" "}
          <Switch checked={notifyEnabled} onChange={setNotifyEnabled} />
        </div>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2>Table (preFetchedData)</h2>
        <Table columns={employeeColumns} preFetchedData={preFetchedEmployees} isPaginationHidden />
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2>Table (row selection, row actions, bulk actions)</h2>
        <p style={{ color: "#6b6b6b", fontSize: 13, marginTop: -8 }}>
          Auto-injected checkbox column (left) and actions column (right, one plain "View"
          button + a "Reject" reason popover). Select rows to reveal the bulk "Delete selected"
          bar.
        </p>
        <Table
          columns={employeeColumns}
          preFetchedData={preFetchedEmployees}
          isPaginationHidden
          getRowId={(row) => String(row.id)}
          onRowSelectionChange={(ids) => console.log("selected ids", ids)}
          isRowActionsWithoutDropdown
          rowActions={(row) => [
            {
              label: "View",
              type: "button",
              onClick: ({ row: r }) => alert(`Viewing ${r.name}`),
            },
            {
              label: "Reject",
              variant: "reject",
              onConfirm: ({ row: r, reason }) => alert(`Rejected ${r.name}: ${reason}`),
            },
          ]}
          bulkActions={[
            {
              id: "delete",
              label: "Delete selected",
              variant: "destructive",
              onClick: (ids) => alert(`Deleting: ${ids.join(", ")}`),
            },
          ]}
        />
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2>Table (apiFunction, mock server, column management, filters, export)</h2>
        <p style={{ color: "#6b6b6b", fontSize: 13, marginTop: -8 }}>
          Has a stable <code>id</code> — hide/show, reorder, and pin columns via "Columns", then
          reload the page to confirm the settings persisted to localStorage. "Name" starts pinned
          left. Use "Filters" to filter by department (multi-select) and/or a join-date range —
          both are applied server-side by the mock <code>apiFunction</code>. Use "Export" to
          download all 47 matching rows (not just the current page of 10) as Excel or CSV.
        </p>
        <Table
          id="playground-employees"
          columns={employeeColumns}
          apiFunction={mockFetchEmployees}
          searchPlaceholder="Search employees..."
          actions={[{ id: "add", label: "Add Employee", onClick: () => alert("Add Employee clicked") }]}
          filterConfigs={employeeFilterConfigs}
          exportFileName="employees"
        />
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2>Form + Formik</h2>
        <form
          onSubmit={formik.handleSubmit}
          style={{ maxWidth: 700, border: "1px solid #e0e5eb", borderRadius: 8, padding: 16 }}
        >
          <Form inputList={formFields} formik={formik} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <FormFooter
              onCancel={() => formik.resetForm()}
              onSubmit={formik.submitForm}
              submitLabel="Submit"
            />
          </div>
        </form>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Playground />);
