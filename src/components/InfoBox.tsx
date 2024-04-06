interface InfoBoxProps {
  type: string;
  msg: string;
}

const InfoBox = ({ type, msg }: InfoBoxProps) => {
  return <div className={`alert alert-${type}`}>{msg}</div>;
};

export default InfoBox;
