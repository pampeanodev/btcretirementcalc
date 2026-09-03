import { useState, type ReactNode } from "react";
import { Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectionPoint, ProjectionView } from "../../../models/ProjectionView";
import { toUsd } from "../../../constants";

interface Column {
  key: string;
  title: string;
  /** Rendered cell. Mono is applied here, per column, rather than table-wide. */
  render: (p: ProjectionPoint) => ReactNode;
}

const TableTab = ({ view }: { view: ProjectionView }) => {
  const [t] = useTranslation();

  const columns: Column[] = [
    { key: "year", title: t("table.year"), render: (p) => p.year },
    { key: "age", title: t("table.age"), render: (p) => p.age },
    {
      key: "bitcoinPrice",
      title: t("table.bitcoin-price"),
      render: (p) => <span className="font-mono">{toUsd(p.bitcoinPrice)}</span>,
    },
    {
      key: "savingsFiatReal",
      title: "Savings (today)",
      render: (p) => <span className="font-mono">{toUsd(p.savingsFiatReal)}</span>,
    },
    {
      key: "savingsFiat",
      title: "Savings (nominal)",
      // The nominal figure sits in the next column over, never on another
      // screen: a discounted number the reader cannot trace back to the money
      // the projection actually produced is the discounting happening silently.
      render: (p) => <span className="font-mono text-ink-muted">{toUsd(p.savingsFiat)}</span>,
    },
    {
      key: "savingsBitcoin",
      title: t("table.accumulated-savings-btc"),
      render: (p) => <span className="font-mono">{p.savingsBitcoin.toFixed(8)}</span>,
    },
    {
      key: "bitcoinFlow",
      title: t("table.you-bought"),
      render: (p) => <span className="font-mono">{p.bitcoinFlow.toFixed(8)}</span>,
    },
  ];

  const [shownKeys, setShownKeys] = useState(columns.map((c) => c.key));
  // Filtering `columns` rather than mapping `shownKeys` keeps the column order
  // the table's own, so re-checking a column puts it back where it was.
  const shown = columns.filter((c) => shownKeys.includes(c.key));

  const toggle = (key: string, on: boolean) =>
    setShownKeys((keys) => (on ? [...keys, key] : keys.filter((k) => k !== key)));

  return (
    <div className="space-y-2">
      <Table
        containerClassName="max-h-[260px] rounded-md border"
        className="border-separate border-spacing-0"
      >
        <TableHeader>
          <TableRow>
            {shown.map((c) => (
              <TableHead
                key={c.key}
                className="sticky top-0 z-10 border-b bg-background whitespace-nowrap"
              >
                {c.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.points.map((p) => (
            <TableRow key={p.key}>
              {shown.map((c) => (
                <TableCell key={c.key} className="border-b whitespace-nowrap">
                  {c.render(p)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="icon" aria-label="Choose columns">
                <Settings2 />
              </Button>
            }
          />
          <PopoverContent align="end" className="w-56">
            <p className="mb-2 text-sm font-medium">{t("table.config.title")}</p>
            <div className="flex flex-col gap-2">
              {columns.map((c) => (
                <div key={c.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`col-${c.key}`}
                    checked={shownKeys.includes(c.key)}
                    onCheckedChange={(on) => toggle(c.key, Boolean(on))}
                  />
                  <Label htmlFor={`col-${c.key}`} className="text-sm font-normal">
                    {c.title}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default TableTab;
