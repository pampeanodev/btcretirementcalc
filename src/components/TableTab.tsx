import { Table, TableProps } from "antd";
import Summary from "./Summary";
import { useTranslation } from "react-i18next";
import { AnnualTrackingData, CalculationResult } from "../models/CalculationResult";
import { toUsd } from "../constants";

const TableTab = ({
  startingBitcoinPrice,
  bitcoinPriceAtRetirementAge,
  retirementAge,
  savingsBitcoin,
  annualRetirementBudget,
  dataSet,
}: CalculationResult) => {
  const [t] = useTranslation();
  const columns: TableProps<AnnualTrackingData>["columns"] = [
    {
      title: t("table.year"),
      dataIndex: "key",
      width: "5rem",
      key: "key",
    },
    {
      title: t("table.age"),
      dataIndex: "age",
      width: "4rem",
      key: "age",
    },
    {
      title: t("table.bitcoin-price"),
      dataIndex: "bitcoinPrice",
      key: "bitcoinPrice",
      width: "8rem",
      render: (n: number) => <span>{toUsd(n)}</span>,
    },
    {
      title: t("table.accumulated-savings"),
      dataIndex: "savingsFiat",
      key: "savingsFiat",
      width: "8rem",
      render: (n: number) => (n === 0 ? <>{t("table.not-relevant")}</> : <span>{toUsd(n)}</span>),
    },
    {
      title: t("table.accumulated-savings-btc"),
      dataIndex: "savingsBtc",
      key: "savingsBtc",
      width: "8rem",
      render: (n: number) => <>{n.toFixed(8)}</>,
    },
    {
      title: t("table.you-bought"),
      dataIndex: "bitcoinBought",
      width: "8rem",
      key: "bitcoinBought",
      render: (n: number) => <span>{n.toFixed(8)}</span>,
    },
    {
      title: t("table.indexed-budget"),
      dataIndex: "annualRetirementBudget",
      width: "8rem",
      key: "annualRetirementBudget",
      render: (n: number) => <span>{toUsd(n)}</span>,
    },
  ];
  return (
    <div>
      <Summary
        bitcoinPrice={startingBitcoinPrice}
        retirementAge={retirementAge}
        totalSavings={savingsBitcoin}
        bitcoinPriceAtRetirement={bitcoinPriceAtRetirementAge}
        annualBudget={annualRetirementBudget}
      ></Summary>
      <Table
        style={{ padding: "1rem" }}
        dataSource={dataSet}
        columns={columns}
        pagination={false}
        scroll={{ y: 250 }}
      ></Table>
    </div>
  );
};

export default TableTab;
