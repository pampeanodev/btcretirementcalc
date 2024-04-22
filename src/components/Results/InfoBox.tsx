import "./InfoBox.scss";
interface InfoBoxProps {
  type: string;
  label: string;
  value: string | number;
}

const InfoBox = ({ type, label, value }: InfoBoxProps) => {
  return (
    <div className={`infobox infobox-${type}`}>
      <span>{label}</span>
      <span style={{ fontWeight: "800" }}>{value}</span>
    </div>
  );
};

export default InfoBox;
