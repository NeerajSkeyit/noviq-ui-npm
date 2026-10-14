import React, { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import Button from "../Button/Button";
import { DropdownMenu, DropdownMenuItem } from "../Dropdown/Dropdown";
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  DEFAULT_EXPORT_FILE_BASE,
  EXPORT_FILE_EXTENSION,
} from "../../constants";

export interface ExportProps {
  exportToExcel: (fileName?: string) => void;
  exportToCSV: (fileName?: string) => void;
  exporting: boolean;
  /** Skip real export entirely and just open this pre-generated report link. Hides the CSV
   * option, matching the source's behavior for server-backed report links. */
  responseSheetUrl?: string;
  /** Base name used to build `${fileNameBase}.xlsx` / `${fileNameBase}.csv`. */
  fileNameBase?: string;
}

function Export({ exportToExcel, exportToCSV, exporting, responseSheetUrl, fileNameBase = DEFAULT_EXPORT_FILE_BASE }: ExportProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (responseSheetUrl) {
    return (
      <Button
        variant={BUTTON_VARIANT.OUTLINE}
        size={BUTTON_SIZE.SM}
        onClick={() => window.open(responseSheetUrl, "_blank")}
      >
        <Download size={16} />
        Export
      </Button>
    );
  }

  return (
    <DropdownMenu
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      trigger={
        <Button
          variant={BUTTON_VARIANT.OUTLINE}
          size={BUTTON_SIZE.SM}
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={exporting}
        >
          <Download size={16} />
          {exporting ? "Exporting..." : "Export"}
          <ChevronDown size={16} />
        </Button>
      }
    >
      <DropdownMenuItem onClick={() => exportToExcel(`${fileNameBase}.${EXPORT_FILE_EXTENSION.EXCEL}`)} disabled={exporting}>
        Export as Excel
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => exportToCSV(`${fileNameBase}.${EXPORT_FILE_EXTENSION.CSV}`)} disabled={exporting}>
        Export as CSV
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

export default Export;
