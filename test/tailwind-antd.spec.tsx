import { beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Popover, Slider, Table } from "antd";
import { initI18n } from "./test-utils";

beforeAll(async () => {
  await initI18n();
});

describe("antd under Tailwind", () => {
  it("renders a Table with its rows", () => {
    render(
      <Table
        dataSource={[{ key: 1, age: 43 }]}
        columns={[{ title: "Age", dataIndex: "age", key: "age" }]}
        pagination={false}
      />,
    );

    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("43")).toBeInTheDocument();
  });

  it("renders a Slider with its handle", () => {
    const { container } = render(<Slider min={0} max={100} defaultValue={20} />);

    expect(container.querySelector(".ant-slider-handle")).not.toBeNull();
  });

  it("opens a Popover", async () => {
    const user = userEvent.setup();
    render(
      <Popover content={<span>panel body</span>} title="panel" trigger="click">
        <button>open</button>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "open" }));

    expect(await screen.findByText("panel body")).toBeInTheDocument();
  });
});
