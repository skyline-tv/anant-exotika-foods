import { toTitleCase } from '../../utils/titleCase';

const HamperSelections = ({ selections }) => {
  if (!selections?.length) return null;

  return (
    <ul className="hamper-selections">
      {selections.map((selection) => (
        <li key={`${selection.slotLabel}-${selection.product?._id || selection.product}`}>
          <span>{toTitleCase(selection.slotLabel)}</span>
          <strong>{toTitleCase(selection.name || selection.product?.name)}</strong>
        </li>
      ))}
    </ul>
  );
};

export default HamperSelections;
